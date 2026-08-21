import os
import shutil

user = r"C:\Users\Kashan Khan"
local_modules = os.path.join(user, ".local", "node_modules")
hp_driver_temp = r"C:\LJP1100_P1560_P1600_Full_Solution"

freed = 0
deleted = 0

print("=== CLEANING ROOT INSTALLER TEMPS & NON-OMNIROUTE MODULES ===")

# 1. Clean extracted printer installer temp on C:\
if os.path.exists(hp_driver_temp):
    print(f"\n[+] Cleaning extracted printer setup temp: {hp_driver_temp}")
    for root, dirs, files in os.walk(hp_driver_temp, topdown=False):
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
    try:
        shutil.rmtree(hp_driver_temp, ignore_errors=True)
    except Exception:
        pass

# 2. Clean non-omniroute modules in .local
if os.path.exists(local_modules):
    for item in os.listdir(local_modules):
        if "omniroute" in item.lower() or ".omniroute" in item.lower():
            print(f"[!] PROTECTED PACKAGE SKIPPED: {item}")
            continue
        item_path = os.path.join(local_modules, item)
        print(f"[+] Cleaning non-omniroute local module: {item_path}")
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
