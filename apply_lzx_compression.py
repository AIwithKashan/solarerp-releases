import subprocess
import os

target_dirs = [
    r"C:\Program Files (x86)\Microsoft",
    r"C:\Program Files\Google",
    r"C:\Program Files\obs-studio",
    r"C:\Users\Kashan Khan\AppData\Local\Programs"
]

print("=== EXECUTING LZX BINARY COMPRESSION ===")
for d in target_dirs:
    if os.path.exists(d):
        print(f"\n[+] Compressing binaries in: {d}")
        try:
            cmd = ["compact.exe", "/c", "/s:" + d, "/i", "/q", "/exe:lzx"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            print(f"    -> Compression pass finished for {d}")
        except Exception as e:
            print(f"    -> Note: {e}")

print("\nLZX Binary Compression Complete!")
