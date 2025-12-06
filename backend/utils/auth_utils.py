import os
import secrets
from datetime import datetime, timedelta  # Add timedelta here
from flask import current_app
from flask_mail import Mail, Message
from email_validator import validate_email, EmailNotValidError

mail = Mail()

def init_mail(app):
    """Initialize Flask-Mail only if in email mode"""
    if app.config.get('OTP_MODE') == 'email':
        mail.init_app(app)

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def send_otp_email(email, otp):
    """Send OTP email to user - Console mode for development"""
    print("\n" + "="*60)
    print("📧 CLOUD DRIVE OTP LOGIN")
    print("="*60)
    print(f"📧 Email: {email}")
    print(f"🔑 OTP Code: {otp}")
    print(f"⏰ Valid for: 10 minutes")
    print(f"🕒 Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⏳ Expires at: {(datetime.now() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    print("💡 Copy this OTP and paste it in the login form")
    print("="*60 + "\n")
    
    return True, "OTP generated successfully"

def validate_email_address(email):
    """Validate email address format"""
    try:
        # Validate and normalize email
        valid = validate_email(email)
        return True, valid.email
    except EmailNotValidError as e:
        return False, str(e)