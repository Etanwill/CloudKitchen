import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///clouddrive.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File upload settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024 * 1024))  # 5GB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', './uploads')
    ALLOWED_EXTENSIONS = eval(os.environ.get('ALLOWED_EXTENSIONS', 'set()'))
    
    # Email settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # Storage settings
    DEFAULT_STORAGE_LIMIT = int(os.environ.get('DEFAULT_STORAGE_LIMIT', 5 * 1024 * 1024 * 1024))  # 5GB
    
    @staticmethod
    def init_app(app):
        # Create uploads directory if it doesn't exist
        if not os.path.exists(Config.UPLOAD_FOLDER):
            os.makedirs(Config.UPLOAD_FOLDER)

config = Config()