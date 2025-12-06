from flask import Flask, session
from flask_cors import CORS
from config import config
from models.user import db
from routes.auth import auth_bp
from routes.files import files_bp
from utils.auth_utils import init_mail
import os

def create_app(config_class=config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
    init_mail(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(files_bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
        config.init_app(app)
    
    # Session configuration
    app.permanent_session_lifetime = 3600  # 1 hour
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'service': 'Cloud Drive API'}
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return {'error': 'File too large'}, 413
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)