from datetime import datetime
from .user import db
import os

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    size = db.Column(db.BigInteger, nullable=False)  # in bytes
    file_type = db.Column(db.String(100))
    mime_type = db.Column(db.String(100))
    
    # Folder support
    parent_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=True)
    is_folder = db.Column(db.Boolean, default=False)
    
    # Trash support
    is_trashed = db.Column(db.Boolean, default=False)
    trashed_at = db.Column(db.DateTime, nullable=True)
    
    # File metadata
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship for folders
    children = db.relationship('File',
                              backref=db.backref('parent', remote_side=[id]),
                              lazy=True,
                              cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.is_folder:
            self._set_file_type()
    
    def _set_file_type(self):
        """Set file type based on extension"""
        if self.original_filename:
            ext = os.path.splitext(self.original_filename)[1].lower().replace('.', '')
            
            # Categorize file types
            image_ext = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'}
            doc_ext = {'pdf', 'doc', 'docx', 'txt', 'rtf'}
            sheet_ext = {'xls', 'xlsx', 'csv'}
            presentation_ext = {'ppt', 'pptx'}
            video_ext = {'mp4', 'avi', 'mov', 'wmv', 'flv'}
            audio_ext = {'mp3', 'wav', 'aac', 'flac'}
            
            if ext in image_ext:
                self.file_type = 'image'
            elif ext in doc_ext:
                self.file_type = 'document'
            elif ext in sheet_ext:
                self.file_type = 'spreadsheet'
            elif ext in presentation_ext:
                self.file_type = 'presentation'
            elif ext in video_ext:
                self.file_type = 'video'
            elif ext in audio_ext:
                self.file_type = 'audio'
            else:
                self.file_type = 'other'
    
    def move_to_trash(self):
        """Move file to trash"""
        self.is_trashed = True
        self.trashed_at = datetime.utcnow()
        
        # Also move children to trash if it's a folder
        if self.is_folder:
            for child in self.children:
                child.move_to_trash()
    
    def restore_from_trash(self):
        """Restore file from trash"""
        self.is_trashed = False
        self.trashed_at = None
        
        # Also restore children if it's a folder
        if self.is_folder:
            for child in self.children:
                child.restore_from_trash()
    
    def get_file_icon(self):
        """Get appropriate icon for file type"""
        icons = {
            'image': 'image',
            'document': 'description',
            'spreadsheet': 'grid_on',
            'presentation': 'slideshow',
            'video': 'videocam',
            'audio': 'audiotrack',
            'folder': 'folder',
            'other': 'insert_drive_file'
        }
        return icons.get(self.file_type if not self.is_folder else 'folder', 'insert_drive_file')
    
    def to_dict(self):
        """Convert file object to dictionary"""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'size': self.size,
            'size_readable': self._bytes_to_readable(self.size),
            'file_type': self.file_type,
            'mime_type': self.mime_type,
            'is_folder': self.is_folder,
            'parent_id': self.parent_id,
            'is_trashed': self.is_trashed,
            'trashed_at': self.trashed_at.isoformat() if self.trashed_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'icon': self.get_file_icon(),
            'download_url': f'/api/files/download/{self.id}' if not self.is_folder else None,
            'preview_url': f'/api/files/preview/{self.id}' if not self.is_folder else None
        }
    
    @staticmethod
    def _bytes_to_readable(size_bytes):
        """Convert bytes to human readable format"""
        if size_bytes == 0:
            return "0 Bytes"
        
        size_names = ["Bytes", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        return f"{size_bytes:.2f} {size_names[i]}"