from flask import Blueprint, request, jsonify, session
from models.user import User, db
from utils.auth_utils import send_otp_email, validate_email_address, init_mail
from datetime import datetime
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        
        # Validate email format
        is_valid, message = validate_email_address(email)
        if not is_valid:
            return jsonify({'error': 'Invalid email address'}), 400
        
        # Check if user exists or create new user
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email)
            db.session.add(user)
        
        # Generate and save OTP
        otp = user.generate_otp()
        db.session.commit()
        
        # Send OTP email
        success, message = send_otp_email(email, otp)
        if not success:
            return jsonify({'error': message}), 500
        
        # Store email in session for verification
        session['email_for_verification'] = email
        session['otp_attempts'] = 0
        
        return jsonify({
            'message': 'OTP sent successfully',
            'email': email
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and login user"""
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'otp' not in data:
            return jsonify({'error': 'Email and OTP are required'}), 400
        
        email = data['email'].strip().lower()
        otp = data['otp'].strip()
        
        # Validate OTP format (6 digits)
        if not re.match(r'^\d{6}$', otp):
            return jsonify({'error': 'OTP must be 6 digits'}), 400
        
        # Check OTP attempts
        otp_attempts = session.get('otp_attempts', 0)
        if otp_attempts >= 5:
            return jsonify({'error': 'Too many OTP attempts. Please request a new OTP.'}), 429
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify OTP
        is_valid, message = user.verify_otp(otp)
        if not is_valid:
            session['otp_attempts'] = otp_attempts + 1
            return jsonify({'error': message}), 400
        
        # Update last login and commit
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create session
        session['user_id'] = user.id
        session['email'] = user.email
        session['is_authenticated'] = True
        session.permanent = True
        
        # Clear OTP attempts
        session.pop('otp_attempts', None)
        session.pop('email_for_verification', None)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': str(user.id)  # Simple token for demo
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current user information"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200

@auth_bp.route('/api/auth/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session and session.get('is_authenticated'):
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'authenticated': True,
                'user': user.to_dict()
            }), 200
    
    return jsonify({'authenticated': False}), 200