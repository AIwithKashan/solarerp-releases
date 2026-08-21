import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")

extra_targets = [
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "IndexedDB"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "IndexedDB"),
    os.path.join(user, "Downloads", "download"),
    os.path.join(local_appdata, "D3DSCache")
]

print("=== CLEANING EXTRA CACHES ===")
freed = 0
deleted = 0

for target in extra_targets:
    if "omniroute" in target.lower() or ".omniroute" in target.lower():
        continue
    if not os.path.exists(target):
        continue
    print(f"\n[+] Cleaning: {target}")
    cat_freed = 0
    cat_deleted = 0
    for root, dirs, files in os.walk(target, topdown=False):
        for f in files:
            fp = os.path.join(root, f)
            if "omniroute" in fp.lower() or ".omniroute" in fp.lower():
                continue
            try:
                sz = os.path.getsize(fp)
                os.remove(fp)
                cat_freed += sz
                cat_deleted += 1
            except Exception:
                pass
        for d in dirs:
            dp = os.path.join(root, d)
            if "omniroute" in dp.lower() or ".omniroute" in dp.lower():
                continue
            try:
                os.rmdir(dp)
            except Exception:
                pass
    mb = cat_freed / (1024**2)
    gb = cat_freed / (1024**3)
    print(f"    -> Reclaimed {gb:.2f} GB ({mb:.1f} MB) [{cat_deleted} files deleted]")
    freed += cat_freed
    deleted += cat_deleted

print(f"\nReclaimed Total: {freed / (1024**3):.2f} GB ({freed / (1024**2):.1f} MB) [{deleted} files deleted]")
