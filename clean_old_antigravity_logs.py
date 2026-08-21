import os
import time

user = r"C:\Users\Kashan Khan"
brain_dir = os.path.join(user, ".gemini", "antigravity", "brain")
onedrive_logs = os.path.join(user, "AppData", "Local", "Microsoft", "OneDrive", "logs")
chrome_sw = os.path.join(user, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Service Worker")
chrome_db = os.path.join(user, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "IndexedDB")

freed = 0
deleted = 0
now = time.time()
seven_days = 7 * 86400

print("=== CLEANING OLD CONVERSATION LOGS & CHROME DATA ===")

# Clean old brain logs
if os.path.exists(brain_dir):
    print(f"\n[+] Scanning old conversation logs in: {brain_dir}")
    for cid in os.listdir(brain_dir):
        cid_path = os.path.join(brain_dir, cid)
        # Skip current conversation
        if "db302fa2-17a1-46c1-b02f-f1eb5c401acf" in cid:
            continue
        if os.path.isdir(cid_path):
            try:
                mtime = os.path.getmtime(cid_path)
                if now - mtime > seven_days:
                    for root, dirs, files in os.walk(cid_path, topdown=False):
                        for f in files:
                            fp = os.path.join(root, f)
                            try:
                                sz = os.path.getsize(fp)
                                os.remove(fp)
                                freed += sz
                                deleted += 1
                            except Exception:
                                pass
                        for d in dirs:
                            dp = os.path.join(root, d)
                            try:
                                os.rmdir(dp)
                            except Exception:
                                pass
            except Exception:
                pass

# Clean OneDrive logs
if os.path.exists(onedrive_logs):
    print(f"\n[+] Cleaning OneDrive logs: {onedrive_logs}")
    for root, dirs, files in os.walk(onedrive_logs, topdown=False):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                os.remove(fp)
                freed += sz
                deleted += 1
            except Exception:
                pass

gb = freed / (1024**3)
mb = freed / (1024**2)
print(f"\nReclaimed Total: {gb:.2f} GB ({mb:.1f} MB) [{deleted} files deleted]")
