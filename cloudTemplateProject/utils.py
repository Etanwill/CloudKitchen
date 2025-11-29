# utils.py
import bcrypt
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# Ensure params.py exists and contains valid email/app_password
from params import from_email, app_password 

# Dictionary to temporarily store generated OTPs (login -> otp_code)
otp_store = {}

def hash_password(password):
    """Hashes a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), 
                         bcrypt.gensalt()).decode('utf-8')

def generate_otp():
    """Generates a random 6-digit OTP code."""
    return str(random.randint(100000, 999999))

def store_otp(login, otp):
    """Stores OTP associated with the user login."""
    otp_store[login] = otp

def verify_otp(login, otp_code):
    """Checks the provided OTP against the stored one."""
    stored_otp = otp_store.get(login)
    
    if stored_otp and stored_otp == otp_code:
        # OTP consumed successfully, remove it
        del otp_store[login]
        return True
    return False

def send_otp(to_email, login) -> str:
    # 1. Generate and Store OTP
    otp = generate_otp()
    store_otp(login, otp)

    # 2. Email Setup
    subject = "Your OTP Code for the Cloud Security Simulator"
    body = f"Your OTP code is: {otp}"

    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))

    try:
        # 3. Connect and Send Email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            print(f"Starting TLS session on smtp.gmail.com:587 .........", end='')
            server.starttls()
            print('[OK]')
            print(f"Login to the server with {from_email} .........", end='')
            server.login(from_email, app_password)
            print('[OK]')
            print(f"Sending OTP data to {to_email} .........", end='')
            server.send_message(msg)
            print('[OK]')
            print(f"OTP data sent to {to_email} successfully!")
            return f"OTP data sent to your email: {to_email} successfully!"
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Return a concise error name to the client
        return f"Failed to send OTP email: {e.__class__.__name__}" 

if __name__ == '__main__':
    # --- Setup Logic: RUN THIS ONCE to create 'credentials' file ---
    print("--- Running Password Setup ---")
    
    # Example users: Ensure the email here is one you can access!
    credentials_raw = {
        "userA": ("password123", "etan.john@ictuniversity.edu.cm"),
        "userB": ("securepass456", "another_user@example.com")
    }

    # Open 'credentials' file in WRITE mode ('w') to create/overwrite it
    with open('credentials', 'w') as file: 
        for username, (password, email) in credentials_raw.items():
            hashed_pwd = hash_password(password)
            # Format: username,email,hashed_password
            file.write(f'{username},{email},{hashed_pwd}\n')
            
    print("Created 'credentials' file with hashed passwords. You can now run the server.")