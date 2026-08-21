import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
packages_dir = os.path.join(local_appdata, "Packages")
local_modules = os.path.join(user, ".local", "node_modules")

freed = 0
deleted = 0

print("=== CLEANING APP PACKAGES & LOCAL NODE MODULES (OMNIROUTE PROTECTED) ===")

# 1. App Packages Cache
if os.path.exists(packages_dir):
    for pkg in os.listdir(packages_dir):
        pkg_path = os.path.join(packages_dir, pkg)
        if not os.path.isdir(pkg_path):
            continue
        for sub in ["LocalState\\Cache", "LocalState\\TempState", "AC\\INetCache", "AC\\Temp", "LocalCache"]:
            target_sub = os.path.join(pkg_path, sub)
            if os.path.exists(target_sub):
                for root, dirs, files in os.walk(target_sub, topdown=False):
                    for f in files:
                        fp = os.path.join(root, f)
                        if "omniroute" in fp.lower() or ".omniroute" in fp.lower():
                            continue
                        try:
                            sz = os.path.getsize(fp)
                            os.remove(fp)
                            freed += sz
                            deleted += 1
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

# 2. Local Node Modules (excluding omniroute)
if os.path.exists(local_modules):
    for item in os.listdir(local_modules):
        if "omniroute" in item.lower() or ".omniroute" in item.lower():
            print(f"[!] PROTECTED PACKAGE SKIPPED: {item}")
            continue
        item_path = os.path.join(local_modules, item)
        for root, dirs, files in os.walk(item_path, topdown=False):
            for f in files:
                fp = os.path.join(root, f)
                if "omniroute" in fp.lower() or ".omniroute" in fp.lower():
                    continue
                try:
                    sz = os.path.getsize(fp)
                    os.remove(fp)
                    freed += sz
                    deleted += 1
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

gb = freed / (1024**3)
mb = freed / (1024**2)
print(f"\nReclaimed Total: {gb:.2f} GB ({mb:.1f} MB) [{deleted} files deleted]")
