import os

target = r"E:\My"

print(f"=== DEEP INSPECTION OF {target} ===")

if os.path.exists(target):
    for root, dirs, files in os.walk(target):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                mtime = os.path.getmtime(fp)
                print(f"{fp:<85} | {sz} bytes")
            except Exception as e:
                print(f"Error reading {fp}: {e}")
else:
    print(f"[!] Path {target} does not exist.")
