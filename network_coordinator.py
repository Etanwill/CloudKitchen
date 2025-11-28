# coordinator.py

import socket
import threading
import json

# node_id -> {"host": str, "port": int, "max_storage_mb": int, "send_rate_kbps": int, "recv_rate_kbps": int}
connected_nodes = {} 


# ---------------------------------------------------------
# Length-Prefixed Send & Receive
# ---------------------------------------------------------
def send_full(sock, payload: bytes):
    size = len(payload).to_bytes(4, "big")
    sock.sendall(size + payload)


def recv_full(sock) -> bytes:
    size_data = sock.recv(4)
    if not size_data:
        return b""
    size = int.from_bytes(size_data, "big")

    data = b""
    while len(data) < size:
        packet = sock.recv(4096)
        if not packet:
            break
        data += packet
    return data


# ---------------------------------------------------------
# Broadcast Updated Peer List
# ---------------------------------------------------------
def broadcast_peers(exclude_node_id=None):
    # Only broadcast connection info, not the resource limits
    peer_list_to_send = {
        k: (v["host"], v["port"]) for k, v in connected_nodes.items()
    }
    
    payload = b"[PEER_UPDATE]" + json.dumps(peer_list_to_send).encode()

    for node_id, info in connected_nodes.items():
        if node_id == exclude_node_id:
            continue
        host = info["host"]
        port = info["port"]
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((host, port))
            send_full(s, payload)
            s.close()
        except Exception:
            # Simple error handling for failed peer connection
            pass


# ---------------------------------------------------------
# Client Handler
# ---------------------------------------------------------
def client_handler(conn, addr):
    data = recv_full(conn)
    if not data:
        conn.close()
        return

    if data.startswith(b"[REGISTER]"):
        try:
            # node_info contains node_id, host, port, max_storage_mb, send_rate_kbps, recv_rate_kbps
            node_info = json.loads(data.replace(b"[REGISTER]", b""))
            node_id = node_info["node_id"]
            
            connected_nodes[node_id] = node_info
            
            print(f"[+] Node registered: {node_id} - {node_info['host']}:{node_info['port']}")
            print(f"    - Storage Limit: {node_info['max_storage_mb']}MB")
            print(f"    - Bandwidth: {node_info['send_rate_kbps']}/{node_info['recv_rate_kbps']} KBps (Up/Down)\n")

            # 1. Send the full peer list (connection info only) to the new node
            peer_list_to_send = {
                k: (v["host"], v["port"]) for k, v in connected_nodes.items()
            }
            response = b"[PEER_LIST]" + json.dumps(peer_list_to_send).encode()
            send_full(conn, response)
            
            # 2. Notify all *other* nodes about the new peer
            broadcast_peers(exclude_node_id=node_id)
        
        except Exception as e:
            print(f"[-] Error processing registration: {e}")

    conn.close()


# ---------------------------------------------------------
# Main Server
# ---------------------------------------------------------
def start_server(host="127.0.0.1", port=9000):
    print("========================================")
    print(f" Main Network Coordinator running at {host}:{port}")
    print("========================================\n")

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind((host, port))
    s.listen()

    while True:
        conn, addr = s.accept()
        threading.Thread(target=client_handler, args=(conn, addr)).start()


if __name__ == "__main__":
    start_server()