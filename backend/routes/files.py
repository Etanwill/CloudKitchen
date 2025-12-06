from flask import Blueprint, request, jsonify, send_file, send_from_directory, current_app
from models.user import User, db
from models.file import File
from utils.storage import allowed_file, get_mime_type, generate_unique_filename, create_user_upload_dir
import os
from datetime import datetime
from werkzeug.utils import secure_filename
import secrets

files_bp = Blueprint('files', __name__)

@files_bp.route('/api/files/upload', methods=['POST'])
def upload_file():
    """Upload a file"""
    if 'user_id' not in request.form:
        return jsonify({'error': 'User ID is required'}), 400
    
    user_id = request.form['user_id']
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get parent folder ID (optional)
    parent_id = request.form.get('parent_id')
    if parent_id:
        parent = File.query.filter_by(id=parent_id, user_id=user_id, is_folder=True).first()
        if not parent:
            return jsonify({'error': 'Parent folder not found'}), 404
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    # Check storage space
    if not user.has_storage_space(file_size):
        return jsonify({'error': 'Insufficient storage space'}), 400
    
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Secure filename and generate unique name
    original_filename = secure_filename(file.filename)
    unique_filename = generate_unique_filename(original_filename, user_id)
    
    # Create user upload directory
    user_dir = create_user_upload_dir(user_id)
    filepath = os.path.join(user_dir, unique_filename)
    
    # Save file
    try:
        file.save(filepath)
        
        # Get MIME type
        mime_type = get_mime_type(filepath)
        
        # Create file record
        new_file = File(
            filename=unique_filename,
            original_filename=original_filename,
            filepath=filepath,
            size=file_size,
            mime_type=mime_type,
            user_id=user_id,
            parent_id=parent_id
        )
        
        db.session.add(new_file)
        user.update_storage_used()
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file': new_file.to_dict()
        }), 201
        
    except Exception as e:
        # Clean up file if database operation failed
        if os.path.exists(filepath):
            os.remove(filepath)
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@files_bp.route('/api/files/create-folder', methods=['POST'])
def create_folder():
    """Create a new folder"""
    data = request.get_json()
    
    if 'user_id' not in data or 'name' not in data:
        return jsonify({'error': 'User ID and folder name are required'}), 400
    
    user_id = data['user_id']
    folder_name = data['name'].strip()
    parent_id = data.get('parent_id')
    
    # Validate folder name
    if not folder_name:
        return jsonify({'error': 'Folder name cannot be empty'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if parent exists
    if parent_id:
        parent = File.query.filter_by(id=parent_id, user_id=user_id, is_folder=True).first()
        if not parent:
            return jsonify({'error': 'Parent folder not found'}), 404
    
    # Check if folder with same name already exists in same location
    existing = File.query.filter_by(
        original_filename=folder_name,
        parent_id=parent_id,
        user_id=user_id,
        is_folder=True,
        is_trashed=False
    ).first()
    
    if existing:
        return jsonify({'error': 'A folder with this name already exists'}), 409
    
    # Create folder record
    folder = File(
        filename=folder_name,  # For folders, filename = original_filename
        original_filename=folder_name,
        filepath='',  # Folders don't have physical filepath
        size=0,
        is_folder=True,
        user_id=user_id,
        parent_id=parent_id,
        mime_type='inode/directory'
    )
    
    db.session.add(folder)
    db.session.commit()
    
    return jsonify({
        'message': 'Folder created successfully',
        'folder': folder.to_dict()
    }), 201

@files_bp.route('/api/files/list', methods=['GET'])
def list_files():
    """List files and folders for a user"""
    user_id = request.args.get('user_id')
    parent_id = request.args.get('parent_id')
    show_trashed = request.args.get('trashed', 'false').lower() == 'true'
    file_type = request.args.get('type')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Build query
    query = File.query.filter_by(user_id=user_id)
    
    # Filter by parent (None for root level)
    if parent_id:
        query = query.filter_by(parent_id=parent_id)
    else:
        query = query.filter_by(parent_id=None)
    
    # Filter by trashed status
    query = query.filter_by(is_trashed=show_trashed)
    
    # Filter by file type if specified
    if file_type and not show_trashed:
        query = query.filter_by(file_type=file_type, is_folder=False)
    
    # Get files and folders
    items = query.order_by(File.is_folder.desc(), File.created_at.desc()).all()
    
    return jsonify({
        'items': [item.to_dict() for item in items],
        'storage_info': user.get_storage_info()
    }), 200

@files_bp.route('/api/files/download/<int:file_id>', methods=['GET'])
def download_file(file_id):
    """Download a file"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    file = File.query.filter_by(id=file_id, user_id=user_id, is_folder=False).first()
    
    if not file:
        return jsonify({'error': 'File not found'}), 404
    
    if not os.path.exists(file.filepath):
        return jsonify({'error': 'File does not exist on server'}), 404
    
    return send_file(
        file.filepath,
        as_attachment=True,
        download_name=file.original_filename,
        mimetype=file.mime_type
    )

@files_bp.route('/api/files/delete/<int:file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file or folder (move to trash)"""
    user_id = request.args.get('user_id')
    permanent = request.args.get('permanent', 'false').lower() == 'true'
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    file = File.query.filter_by(id=file_id, user_id=user_id).first()
    
    if not file:
        return jsonify({'error': 'File not found'}), 404
    
    try:
        if permanent:
            # Permanent deletion
            if not file.is_folder:
                # Delete physical file
                if os.path.exists(file.filepath):
                    os.remove(file.filepath)
            db.session.delete(file)
        else:
            # Move to trash
            file.move_to_trash()
        
        # Update user storage
        user = User.query.get(user_id)
        user.update_storage_used()
        
        db.session.commit()
        
        action = "permanently deleted" if permanent else "moved to trash"
        return jsonify({
            'message': f'File {action} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@files_bp.route('/api/files/restore/<int:file_id>', methods=['POST'])
def restore_file(file_id):
    """Restore a file from trash"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    file = File.query.filter_by(id=file_id, user_id=user_id, is_trashed=True).first()
    
    if not file:
        return jsonify({'error': 'File not found in trash'}), 404
    
    try:
        file.restore_from_trash()
        
        # Update user storage
        user = User.query.get(user_id)
        user.update_storage_used()
        
        db.session.commit()
        
        return jsonify({
            'message': 'File restored successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@files_bp.route('/api/files/move', methods=['POST'])
def move_file():
    """Move file or folder to another location"""
    data = request.get_json()
    
    if 'user_id' not in data or 'file_id' not in data:
        return jsonify({'error': 'User ID and file ID are required'}), 400
    
    user_id = data['user_id']
    file_id = data['file_id']
    target_parent_id = data.get('target_parent_id')  # None for root
    
    file = File.query.filter_by(id=file_id, user_id=user_id, is_trashed=False).first()
    
    if not file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check if moving to a valid location
    if target_parent_id:
        target_parent = File.query.filter_by(
            id=target_parent_id,
            user_id=user_id,
            is_folder=True,
            is_trashed=False
        ).first()
        
        if not target_parent:
            return jsonify({'error': 'Target folder not found'}), 404
        
        # Prevent moving folder into itself or its descendants
        if file.is_folder:
            # Check for circular reference
            current_parent = target_parent
            while current_parent:
                if current_parent.id == file_id:
                    return jsonify({'error': 'Cannot move folder into itself or its subfolders'}), 400
                current_parent = current_parent.parent
    
    # Check for duplicate name in target location
    existing = File.query.filter_by(
        original_filename=file.original_filename,
        parent_id=target_parent_id,
        user_id=user_id,
        is_folder=file.is_folder,
        is_trashed=False
    ).first()
    
    if existing and existing.id != file_id:
        return jsonify({'error': 'A file/folder with this name already exists in the target location'}), 409
    
    # Move file
    try:
        file.parent_id = target_parent_id
        file.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'File moved successfully',
            'file': file.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@files_bp.route('/api/files/rename/<int:file_id>', methods=['PUT'])
def rename_file(file_id):
    """Rename a file or folder"""
    data = request.get_json()
    
    if 'user_id' not in data or 'new_name' not in data:
        return jsonify({'error': 'User ID and new name are required'}), 400
    
    user_id = data['user_id']
    new_name = data['new_name'].strip()
    
    if not new_name:
        return jsonify({'error': 'New name cannot be empty'}), 400
    
    file = File.query.filter_by(id=file_id, user_id=user_id, is_trashed=False).first()
    
    if not file:
        return jsonify({'error': 'File not found'}), 404
    
    # Check for duplicate name in same location
    existing = File.query.filter_by(
        original_filename=new_name,
        parent_id=file.parent_id,
        user_id=user_id,
        is_folder=file.is_folder,
        is_trashed=False
    ).first()
    
    if existing and existing.id != file_id:
        return jsonify({'error': 'A file/folder with this name already exists in this location'}), 409
    
    try:
        file.original_filename = new_name
        if not file.is_folder:
            # For files, keep the stored filename but update display name
            file.filename = new_name  # In production, you might want to keep the stored filename
        file.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'File renamed successfully',
            'file': file.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@files_bp.route('/api/files/search', methods=['GET'])
def search_files():
    """Search files and folders"""
    user_id = request.args.get('user_id')
    query = request.args.get('q', '').strip()
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Search in files (excluding trashed items)
    files = File.query.filter(
        File.user_id == user_id,
        File.is_trashed == False,
        File.original_filename.ilike(f'%{query}%')
    ).order_by(File.created_at.desc()).all()
    
    return jsonify({
        'results': [file.to_dict() for file in files],
        'count': len(files)
    }), 200

@files_bp.route('/api/files/recent', methods=['GET'])
def get_recent_files():
    """Get recently accessed files"""
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 20))
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get recent files (non-folders, non-trashed)
    recent_files = File.query.filter_by(
        user_id=user_id,
        is_folder=False,
        is_trashed=False
    ).order_by(File.updated_at.desc()).limit(limit).all()
    
    return jsonify({
        'files': [file.to_dict() for file in recent_files]
    }), 200