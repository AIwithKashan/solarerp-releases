import os
import shutil
import subprocess

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
program_data = r"C:\ProgramData"
system_root = r"C:\Windows"

# Protected tools whitelist
PROTECTED_KEYWORDS = ["omniroute", ".omniroute", "claude", ".claude", "@anthropic-ai"]

def is_protected(path_str):
    p_lower = path_str.lower()
    return any(k in p_lower for k in PROTECTED_KEYWORDS)

target_folders = [
    os.path.join(local_appdata, "Temp"),
    os.path.join(system_root, "Temp"),
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(appdata, "npm-cache"),
    os.path.join(local_appdata, "pnpm-cache"),
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(local_appdata, "Yarn", "Cache"),
    os.path.join(user, ".gradle", "caches"),
    os.path.join(user, ".gradle", "daemon"),
    os.path.join(user, ".gradle", "wrapper", "dists"),
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(user, ".gemini", "antigravity-ide", "browser_recordings"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "IndexedDB"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "IndexedDB"),
    os.path.join(local_appdata, "Microsoft", "OneDrive", "logs"),
    os.path.join(local_appdata, "CrashDumps"),
    os.path.join(program_data, "Microsoft", "Windows", "WER"),
    os.path.join(local_appdata, "CapCut", "Cache"),
    os.path.join(local_appdata, "CapCut", "User Data", "Cache"),
    os.path.join(local_appdata, "Tabbit"),
    os.path.join(appdata, "Telegram Desktop", "tdata", "user_data", "media_cache"),
    os.path.join(system_root, "SoftwareDistribution", "Download"),
    r"C:\$Recycle.Bin",
    r"C:\LJP1100_P1560_P1600_Full_Solution"
]

print("============================================================")
print("  MASTER C DRIVE CLEANER V6 - 10-12 GB TARGET (PROTECTED)   ")
print("============================================================")

total_freed = 0
total_deleted = 0
locked_count = 0

for target in target_folders:
    if is_protected(target):
        print(f"[!] PROTECTED TARGET SKIPPED: {target}")
        continue
    if not os.path.exists(target):
        continue

    print(f"\n[+] Cleaning target: {target}")
    cat_freed = 0
    cat_deleted = 0

    for root, dirs, files in os.walk(target, topdown=False):
        for f in files:
            fp = os.path.join(root, f)
            if is_protected(fp):
                continue
            try:
                sz = os.path.getsize(fp)
                os.remove(fp)
                cat_freed += sz
                cat_deleted += 1
            except Exception:
                locked_count += 1
        for d in dirs:
            dp = os.path.join(root, d)
            if is_protected(dp):
                continue
            try:
                os.rmdir(dp)
            except Exception:
                pass

    gb = cat_freed / (1024**3)
    mb = cat_freed / (1024**2)
    print(f"    -> Reclaimed {gb:.2f} GB ({mb:.1f} MB) [{cat_deleted} files deleted]")
    total_freed += cat_freed
    total_deleted += cat_deleted

# Package Caches
pkg_dir = os.path.join(local_appdata, "Packages")
if os.path.exists(pkg_dir):
    print("\n[+] Cleaning UWP App Package Caches...")
    pkg_freed = 0
    pkg_deleted = 0
    for pkg in os.listdir(pkg_dir):
        pkg_path = os.path.join(pkg_dir, pkg)
        if not os.path.isdir(pkg_path):
            continue
        for sub in ["LocalState\\Cache", "LocalState\\TempState", "AC\\INetCache", "AC\\Temp", "LocalCache"]:
            target_sub = os.path.join(pkg_path, sub)
            if os.path.exists(target_sub):
                for root, dirs, files in os.walk(target_sub, topdown=False):
                    for f in files:
                        fp = os.path.join(root, f)
                        if is_protected(fp):
                            continue
                        try:
                            sz = os.path.getsize(fp)
                            os.remove(fp)
                            pkg_freed += sz
                            pkg_deleted += 1
                        except Exception:
                            pass
                    for d in dirs:
                        dp = os.path.join(root, d)
                        if is_protected(dp):
                            continue
                        try:
                            os.rmdir(dp)
                        except Exception:
                            pass
    print(f"    -> Reclaimed {pkg_freed / (1024**2):.1f} MB [{pkg_deleted} files deleted]")
    total_freed += pkg_freed
    total_deleted += pkg_deleted

# Local node_modules (STRICT EXCLUSION: omniroute & claude)
local_mod = os.path.join(user, ".local", "node_modules")
if os.path.exists(local_mod):
    print("\n[+] Cleaning non-protected modules in .local...")
    mod_freed = 0
    mod_deleted = 0
    for item in os.listdir(local_mod):
        if is_protected(item):
            print(f"    [!] PROTECTED PACKAGE SKIPPED: {item}")
            continue
        item_path = os.path.join(local_mod, item)
        for root, dirs, files in os.walk(item_path, topdown=False):
            for f in files:
                fp = os.path.join(root, f)
                if is_protected(fp):
                    continue
                try:
                    sz = os.path.getsize(fp)
                    os.remove(fp)
                    mod_freed += sz
                    mod_deleted += 1
                except Exception:
                    pass
            for d in dirs:
                dp = os.path.join(root, d)
                if is_protected(dp):
                    continue
                try:
                    os.rmdir(dp)
                except Exception:
                    pass
    print(f"    -> Reclaimed {mod_freed / (1024**2):.1f} MB [{mod_deleted} files deleted]")
    total_freed += mod_freed
    total_deleted += mod_deleted

print("\n" + "="*60)
print("MASTER SAFE C DRIVE CLEANUP V6 COMPLETE!")
print(f"Total Storage Freed: {total_freed / (1024**3):.2f} GB ({total_freed / (1024**2):.1f} MB)")
print(f"Total Files Deleted: {total_deleted}")
print(f"Locked/In-Use Files Skipped: {locked_count}")
print("="*60)
