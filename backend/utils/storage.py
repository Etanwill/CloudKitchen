import os
import secrets
import magic
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
from flask import current_app

def allowed_file(filename):
    """Check if file extension is allowed"""
    if '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in current_app.config['ALLOWED_EXTENSIONS']

def get_mime_type(file_path):
    """Get MIME type of file"""
    try:
        mime = magic.Magic(mime=True)
        return mime.from_file(file_path)
    except:
        # Fallback to extension-based detection
        import mimetypes
        return mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

def generate_unique_filename(filename, user_id):
    """Generate a unique filename to avoid collisions"""
    base, ext = os.path.splitext(filename)
    timestamp = int(datetime.now().timestamp())
    random_str = secrets.token_hex(4)
    return f"{user_id}_{timestamp}_{random_str}{ext}"

def create_user_upload_dir(user_id):
    """Create user's upload directory if it doesn't exist"""
    user_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(user_id))
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    return user_dir

def get_file_preview(file_path, mime_type):
    """Generate preview for supported file types"""
    preview_data = None
    
    try:
        if mime_type.startswith('image/'):
            # Generate thumbnail for images
            with Image.open(file_path) as img:
                img.thumbnail((200, 200))
                # Convert to base64 for preview
                import io
                import base64
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                preview_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
                preview_data = f"data:image/png;base64,{preview_data}"
    
    except Exception as e:
        print(f"Preview generation failed: {e}")
    
    return preview_data

def calculate_folder_size(folder_id, user_id):
    """Calculate total size of a folder including all children"""
    from models.file import File
    
    total_size = 0
    folder = File.query.filter_by(id=folder_id, user_id=user_id, is_folder=True).first()
    
    if folder:
        # Recursively calculate size of all files in folder
        def calculate_subfolder_size(subfolder_id):
            nonlocal total_size
            items = File.query.filter_by(parent_id=subfolder_id, user_id=user_id, is_trashed=False).all()
            for item in items:
                if item.is_folder:
                    calculate_subfolder_size(item.id)
                else:
                    total_size += item.size
        
        calculate_subfolder_size(folder_id)
    
    return total_size