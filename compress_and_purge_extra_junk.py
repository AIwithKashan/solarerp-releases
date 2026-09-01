import os
import shutil
import subprocess

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")

# 1. Purge unwanted extra temp caches
purge_targets = [
    os.path.join(local_appdata, "StreamingVideoProvider"),
    os.path.join(local_appdata, "antigravity-updater"),
]

print("=== PURGING EXTRA TEMP CACHES ===")

total_freed = 0
for target in purge_targets:
    if os.path.exists(target):
        print(f"[+] Purging target: {target}")
        cat_freed = 0
        cat_deleted = 0
        for root, dirs, files in os.walk(target, topdown=False):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                    os.remove(fp)
                    cat_freed += sz
                    cat_deleted += 1
                except Exception:
                    pass
            for d in dirs:
                try:
                    os.rmdir(os.path.join(root, d))
                except Exception:
                    pass
        print(f"    -> Reclaimed {cat_freed / (1024**2):.1f} MB [{cat_deleted} files deleted]")
        total_freed += cat_freed

# 2. LZX Binary Compression on large AppData & Program directories
lzx_targets = [
    os.path.join(local_appdata, "Google"),
    os.path.join(local_appdata, "Microsoft"),
    os.path.join(local_appdata, "ms-playwright"),
    r"C:\Program Files\Git",
    r"C:\Program Files\Java",
    r"C:\Program Files\Eclipse Adoptium"
]

print("\n=== EXECUTING LZX SYSTEM COMPRESSION PASS ===")

for d in lzx_targets:
    if os.path.exists(d):
        print(f"[+] Executing LZX Compression on: {d}")
        try:
            cmd = ["compact.exe", "/c", "/s:" + d, "/i", "/q", "/exe:lzx"]
            subprocess.run(cmd, capture_output=True, text=True)
            print(f"    -> Successfully compressed {d}")
        except Exception as e:
            print(f"    -> Note: {e}")

print("\nEXTRA CLEANUP & COMPRESSION PASS COMPLETE!")
