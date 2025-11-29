# server.py
import grpc
from concurrent import futures
import cloudsecurity_pb2
import cloudsecurity_pb2_grpc
import bcrypt
import os
from utils import send_otp, verify_otp 

# --- Global Data Stores ---
CREDENTIALS = {} # login -> hashed_pwd
EMAILS = {}      # login -> email

# Load credentials once at startup
def load_credentials():
    global CREDENTIALS, EMAILS
    file_path = 'credentials'
    try:
        with open(file_path, 'r') as file:
            for line in file:
                # Ensure the line has 3 parts (username, email, hash)
                parts = line.strip().split(',')
                if len(parts) == 3:
                    username, email, password_hash = parts
                    CREDENTIALS[username] = password_hash
                    EMAILS[username] = email
        if not CREDENTIALS:
            print("WARNING: 'credentials' file is empty.")
        print(f"Loaded {len(CREDENTIALS)} users from credentials file.")
    except FileNotFoundError:
        print("CRITICAL: 'credentials' file not found. Run utils.py to create it.")
        # Use os._exit(1) for immediate termination if a critical file is missing
        os._exit(1) 

class UserServiceSkeleton(cloudsecurity_pb2_grpc.UserServiceServicer):
    
    def login(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'\n[LOGIN] Incoming request: {request.login}')
        
        login = request.login
        pwd = request.password
        
        hashed_pwd = CREDENTIALS.get(login)
        email = EMAILS.get(login)
        
        # 1. Check if user exists and password is correct
        if (hashed_pwd and 
            bcrypt.checkpw(pwd.encode('utf-8'), hashed_pwd.encode('utf-8'))):
            # 2. Password correct, send OTP
            result = send_otp(email, login)
        else:
            # Prevent timing attacks by giving a generic unauthorized message
            result = "Unauthorized: Invalid username or password."
            
        return cloudsecurity_pb2.Response(result=result)

    def verify_otp(self, request, context) -> cloudsecurity_pb2.Response:
        print(f'\n[OTP] Incoming verification request for: {request.login}')
        
        # 3. Verify the OTP using the utility function
        if verify_otp(request.login, request.otp_code):
            result = "Authentication SUCCESSFUL. Welcome!"
        else:
            result = "Authentication FAILED. Invalid OTP."
            
        return cloudsecurity_pb2.Response(result=result)

def run_server():
    load_credentials() # Load users before starting the server
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    cloudsecurity_pb2_grpc.add_UserServiceServicer_to_server(UserServiceSkeleton(), server)
    server.add_insecure_port('[::]:51234')
    
    print('Starting Server on port 51234 ............', end='')
    server.start()
    print('[OK]')
    server.wait_for_termination() # Keep the main thread alive

if __name__ == '__main__':
    run_server()