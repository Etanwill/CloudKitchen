# client.py
import sys
import grpc
import cloudsecurity_pb2
import cloudsecurity_pb2_grpc
import time

def run_client():
    if len(sys.argv) < 3:
        print("Usage: python client.py <login> <password>")
        sys.exit(1)
        
    login = sys.argv[1]
    password = sys.argv[2]
    
    # Establish gRPC connection
    with grpc.insecure_channel('localhost:51234') as channel:
        stub = cloudsecurity_pb2_grpc.UserServiceStub(channel)
        
        # --- Stage 1: Login (Password Check & OTP Request) ---
        print(f"\n--- Stage 1: Attempting login for {login} ---")
        try:
            response = stub.login(cloudsecurity_pb2.Request(login=login, password=password), timeout=10)
        except grpc.RpcError as e:
            print(f"Connection Error: Could not reach server at localhost:51234. Is the server running? Details: {e.details()}")
            return
            
        print(f"Server Response: {response.result}")

        if "successfully" not in response.result:
            print("Login failed or OTP email delivery failed. Exiting.")
            return

        # --- Stage 2: OTP Verification ---
        print("\n--- Stage 2: OTP Verification ---")
        otp_code = input(">> Please enter the 6-digit OTP sent to your email: ").strip()
        
        try:
            # Call the verify_otp RPC
            response = stub.verify_otp(cloudsecurity_pb2.OTPRequest(login=login, otp_code=otp_code), timeout=10)
        except grpc.RpcError as e:
            print(f"Verification Error: {e.details()}")
            return
            
        print(f"\nFinal Result: {response.result}")


if __name__ == '__main__':
    run_client()