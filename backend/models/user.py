from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    otp_secret = db.Column(db.String(32))
    otp_expiry = db.Column(db.DateTime)
    is_verified = db.Column(db.Boolean, default=False)
    storage_limit = db.Column(db.BigInteger, default=5 * 1024 * 1024 * 1024)  # 5GB default
    storage_used = db.Column(db.BigInteger, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationship with files
    files = db.relationship('File', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, email):
        self.email = email
        self.generate_otp()
    
    def generate_otp(self):
        """Generate a 6-digit OTP valid for 10 minutes"""
        self.otp_secret = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        self.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
        return self.otp_secret
    
    def verify_otp(self, otp):
        """Verify OTP and mark user as verified if correct"""
        if datetime.utcnow() > self.otp_expiry:
            return False, "OTP has expired"
        
        if self.otp_secret != otp:
            return False, "Invalid OTP"
        
        self.is_verified = True
        self.last_login = datetime.utcnow()
        return True, "OTP verified successfully"
    
    def update_storage_used(self):
        """Update storage used by summing all file sizes"""
        from .file import File
        total_size = db.session.query(db.func.sum(File.size)).filter(
            File.user_id == self.id,
            File.is_trashed == False
        ).scalar() or 0
        self.storage_used = total_size
        return self.storage_used
    
    def has_storage_space(self, file_size):
        """Check if user has enough storage space for new file"""
        self.update_storage_used()
        return (self.storage_used + file_size) <= self.storage_limit
    
    def get_storage_info(self):
        """Get storage information in human readable format"""
        self.update_storage_used()
        return {
            'used': self.storage_used,
            'limit': self.storage_limit,
            'used_percentage': (self.storage_used / self.storage_limit * 100) if self.storage_limit > 0 else 0,
            'used_readable': self._bytes_to_readable(self.storage_used),
            'limit_readable': self._bytes_to_readable(self.storage_limit),
            'remaining': self.storage_limit - self.storage_used,
            'remaining_readable': self._bytes_to_readable(self.storage_limit - self.storage_used)
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
    
    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'storage_info': self.get_storage_info(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }