import socket
import threading
import argparse
import os
import json
import hashlib
import time

# =========================================================
# Shared Utility Functions with Bandwidth Throttling
# =========================================================

def send_full(sock, payload: bytes, send_rate_kbps: int):
    """Sends length-prefixed data with bandwidth throttling."""
    
    # KBps to Bytes per second (Bps)
    rate_bps = send_rate_kbps * 1024 
    
    size = len(payload).to_bytes(4, "big")
    sock.sendall(size) # Send header without throttling

    chunk_size = 4096 
    total_sent = 0
    start_time = time.time()
    
    while total_sent < len(payload):
        chunk = payload[total_sent : total_sent + chunk_size]
        
        # Wait until the required time has passed to match the rate
        if rate_bps > 0:
            time_to_wait = (total_sent / rate_bps) - (time.time() - start_time)
            if time_to_wait > 0:
                time.sleep(time_to_wait)
        
        # Send the chunk
        sock.sendall(chunk)
        total_sent += len(chunk)


def recv_full(sock, recv_rate_kbps: int) -> bytes:
    """Receives length-prefixed data with bandwidth throttling."""
    
    # KBps to Bytes per second (Bps)
    rate_bps = recv_rate_kbps * 1024 
    
    size_data = sock.recv(4)
    if not size_data:
        return b""
    size = int.from_bytes(size_data, "big")

    data = b""
    chunk_size = 4096
    start_time = time.time()

    while len(data) < size:
        # Wait until the required time has passed to match the rate
        if rate_bps > 0:
            time_to_wait = (len(data) / rate_bps) - (time.time() - start_time)
            if time_to_wait > 0:
                time.sleep(time_to_wait)
        
        # Determine max read amount
        max_read = min(chunk_size, size - len(data))
        packet = sock.recv(max_read)
        
        if not packet:
            break
        data += packet
    return data


# =========================================================
# STORAGE NODE CLASS
# =========================================================
class StorageNode:
    def __init__(self, node_id, host, port, storage_dir, max_storage_mb, send_rate_kbps, recv_rate_kbps):
        self.node_id = node_id
        self.host = host
        self.port = port
        self.storage_dir = storage_dir
        
        # Resource properties
        self.max_storage_bytes = max_storage_mb * 1024 * 1024
        self.send_rate_kbps = send_rate_kbps
        self.recv_rate_kbps = recv_rate_kbps
        
        self.local_files = {}   # file_id → filename
        self.peers = {}         # node_id -> (host, port)

        os.makedirs(self.storage_dir, exist_ok=True)

        threading.Thread(target=self.start_server, daemon=True).start()
        self.register_to_network()
        self.cli_loop()
    
    # --- Resource Accounting ---
    def get_current_storage_size(self):
        """Calculates the current size of the storage directory."""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(self.storage_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
        return total_size

    # ---------------------------------------------------------
    # Register with Coordinator
    # ---------------------------------------------------------
    def register_to_network(self, net_host="127.0.0.1", net_port=9000):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((net_host, net_port))

            payload = {
                "node_id": self.node_id,
                "host": self.host,
                "port": self.port,
                "max_storage_mb": self.max_storage_bytes // (1024 * 1024),
                "send_rate_kbps": self.send_rate_kbps,
                "recv_rate_kbps": self.recv_rate_kbps,
            }

            # Use the global send_full, passing this node's send rate
            send_full(s, b"[REGISTER]" + json.dumps(payload).encode(), self.send_rate_kbps)
            
            # Use the global recv_full, passing this node's receive rate
            response = recv_full(s, self.recv_rate_kbps) 

            if response.startswith(b"[PEER_LIST]"):
                peers = json.loads(response.replace(b"[PEER_LIST]", b""))
                self.peers = peers
                print("\n🔗 Connected to Main Network. Current peers:")
                for pid, info in peers.items():
                    print(f" - {pid}: {info[0]}:{info[1]}")
        except Exception as e:
            print("❌ Could not register with Main Network:", e)
        finally:
            if 's' in locals() and s:
                 s.close()

    # ---------------------------------------------------------
    # Server
    # ---------------------------------------------------------
    def start_server(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) # Good practice for servers
        s.bind((self.host, self.port))
        s.listen()

        print(f"Server listening on {self.host}:{self.port}")
        print(f"Local Storage: {self.get_current_storage_size() // (1024 * 1024)}MB / {self.max_storage_bytes // (1024 * 1024)}MB")

        while True:
            conn, addr = s.accept()
            # Pass the connection and the node's receive rate to the handler
            threading.Thread(target=self.handle_connection, args=(conn, self.recv_rate_kbps)).start()

    # ---------------------------------------------------------
    # Message Handling
    # ---------------------------------------------------------
    def handle_connection(self, conn, recv_rate_kbps):
        # Use the global recv_full with the node's receive rate
        data = recv_full(conn, recv_rate_kbps)
        if not data:
            conn.close()
            return

        if data.startswith(b"[PEER_UPDATE]"):
            peers = json.loads(data.replace(b"[PEER_UPDATE]", b""))
            self.peers = peers

            print("\n🔄 Peer list updated:")
            for pid, info in peers.items():
                print(f" - {pid}: {info[0]}:{info[1]}")
            conn.close()
            return

        if data.startswith(b"[FILE_TRANSFER]"):
            header_raw, file_data = data.split(b"<DATA>", 1)
            header = json.loads(header_raw.replace(b"[FILE_TRANSFER]", b""))

            file_id = header["file_id"]
            filename = header["filename"]
            
            # --- STORAGE LIMIT CHECK ---
            current_size = self.get_current_storage_size()
            file_size = len(file_data)
            
            if current_size + file_size > self.max_storage_bytes:
                print(f"\n❌ REJECTED: Storage limit exceeded for file '{filename}'.")
                conn.close()
                return

            save_path = os.path.join(self.storage_dir, filename)
            with open(save_path, "wb") as f:
                f.write(file_data)

            self.local_files[file_id] = filename
            
            current_size_mb = (self.get_current_storage_size() // (1024 * 1024))
            max_size_mb = self.max_storage_bytes // (1024 * 1024)
            print(f"\n📥 Received file '{filename}' (id={file_id}). Storage: {current_size_mb}MB / {max_size_mb}MB")
            conn.close()
            return

        conn.close()

    # ---------------------------------------------------------
    # Add Local File (CLI Command)
    # ---------------------------------------------------------
    def add_file(self, filename, filepath):
        if not os.path.exists(filepath):
            print("❌ File not found.")
            return

        file_id = hashlib.md5(filename.encode()).hexdigest()
        
        # --- STORAGE LIMIT CHECK FOR LOCAL FILE ---
        file_size = os.path.getsize(filepath)
        current_size = self.get_current_storage_size()
        
        if current_size + file_size > self.max_storage_bytes:
            current_size_mb = (current_size // (1024 * 1024))
            max_size_mb = self.max_storage_bytes // (1024 * 1024)
            print(f"❌ Cannot add file. Exceeds storage limit. Current: {current_size_mb}MB, Max: {max_size_mb}MB")
            return
            
        dest = os.path.join(self.storage_dir, filename)

        try:
            # Copy file contents
            with open(filepath, "rb") as src, open(dest, "wb") as out:
                out.write(src.read())
        except Exception as e:
            print(f"❌ Error copying file: {e}")
            return


        self.local_files[file_id] = filename
        print(f"✔ Added {filename} as file id {file_id}")

    # ---------------------------------------------------------
    # Send File to Another Peer (CLI Command)
    # ---------------------------------------------------------
    def send_file(self, peer_addr, file_id):
        if file_id not in self.local_files:
            print("❌ File id not found.")
            return

        try:
            host, port = peer_addr.split(":")
            port = int(port)
        except ValueError:
            print("❌ Invalid peer address format. Use host:port")
            return

        filename = self.local_files[file_id]
        file_path = os.path.join(self.storage_dir, filename)

        with open(file_path, "rb") as f:
            file_data = f.read()

        payload = (
            b"[FILE_TRANSFER]"
            + json.dumps({"file_id": file_id, "filename": filename}).encode()
            + b"<DATA>"
            + file_data
        )

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((host, port))
            
            # Use the global send_full with the node's send rate
            send_full(s, payload, self.send_rate_kbps)
            s.close()

            print(f"📤 Sent file '{filename}' to {peer_addr} at ~{self.send_rate_kbps} KB/s")
        except Exception as e:
            print("❌ Error sending file:", e)

    # ---------------------------------------------------------
    # CLI
    # ---------------------------------------------------------
    def cli_loop(self):
        print("\n============================================================")
        print("Storage node CLI")
        print("============================================================\n")

        while True:
            cmd = input(f"{self.node_id}> ").strip().split()

            if not cmd:
                continue

            if cmd[0] == "addfile" and len(cmd) >= 3:
                filename = cmd[1]
                filepath = " ".join(cmd[2:])   # allow paths with spaces
                self.add_file(filename, filepath)

            elif cmd[0] == "localfiles":
                print(self.local_files)

            elif cmd[0] == "storage":
                current = self.get_current_storage_size() // (1024 * 1024)
                max_storage = self.max_storage_bytes // (1024 * 1024)
                print(f"Current Storage: {current}MB / {max_storage}MB")

            elif cmd[0] == "send" and len(cmd) == 3:
                self.send_file(cmd[1], cmd[2])

            elif cmd[0] == "peers":
                print(self.peers)

            elif cmd[0] == "quit":
                print("Exiting...")
                break

            else:
                print("Unknown command. Available: addfile <name> <path>, localfiles, storage, send <host:port> <file_id>, peers, quit")


# ---------------------------------------------------------
# Entry Point
# ---------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", required=True, help="Unique ID for the node (e.g., node1)")
    parser.add_argument("--host", default="127.0.0.1", help="Host IP to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, required=True, help="Port to listen on (e.g., 9001)")
    
    # New Resource Arguments - THESE MUST BE PRESENT
    parser.add_argument("--storage", type=int, default=100, help="Maximum storage in MB (default: 100)")
    parser.add_argument("--sendrate", type=int, default=500, help="Send rate in KBps (Kilobytes per second) (default: 500)")
    parser.add_argument("--recvrate", type=int, default=500, help="Receive rate in KBps (Kilobytes per second) (default: 500)")

    args = parser.parse_args()

    storage_dir = f"storage/{args.node}"
    StorageNode(
        args.node, 
        args.host, 
        args.port, 
        storage_dir,
        args.storage,
        args.sendrate,
        args.recvrate
    )