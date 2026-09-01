import subprocess
import os

target_dirs = [
    r"C:\Program Files (x86)\Microsoft",
    r"C:\Users\Kashan Khan\AppData\Local\Programs",
    r"C:\Users\Kashan Khan\AppData\Local\Python",
    r"C:\Program Files\Google",
    r"C:\Program Files\Android",
    r"C:\Users\Kashan Khan\AppData\Local\CapCut"
]

print("=== MASSIVE LZX SYSTEM COMPRESSION FOR 10-12 GB TARGET ===")

for d in target_dirs:
    if os.path.exists(d):
        print(f"\n[+] Executing LZX Compression on: {d}")
        try:
            cmd = ["compact.exe", "/c", "/s:" + d, "/i", "/q", "/exe:lzx"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            print(f"    -> Successfully compressed {d}")
        except Exception as e:
            print(f"    -> Note: {e}")

print("\nALL TARGET FOLDERS COMPRESSED WITH LZX!")
