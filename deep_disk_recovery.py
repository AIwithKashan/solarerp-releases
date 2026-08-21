import os
import shutil

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
program_data = r"C:\ProgramData"
system_root = r"C:\Windows"

target_dirs = [
    # Package Cache in ProgramData
    os.path.join(program_data, "Package Cache"),
    
    # Antigravity Temp Data
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(user, ".gemini", "antigravity-backup"),
    
    # Python & PIP Caches
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(local_appdata, "Python", "cache"),
    os.path.join(local_appdata, "pypoetry", "Cache"),
    
    # UWP App Packages Cache
    os.path.join(local_appdata, "Packages", "Clipchamp.Clipchamp_yxz26nhyzhsrt", "LocalState"),
    os.path.join(local_appdata, "Packages", "Clipchamp.Clipchamp_yxz26nhyzhsrt", "AC"),
    
    # Browser Caches
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "IndexedDB"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "File System"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "IndexedDB"),

    # Downloads Subdirectories & Installers
    os.path.join(user, "Downloads", "download")
]

print("=== DEEP DISK RECOVERY PASS ===")
total_freed = 0
total_files = 0

for target in target_dirs:
    # Explicit Safety Protection: Never touch OmniRoute
    if "omniroute" in target.lower() or ".omniroute" in target.lower():
        print(f"[!] PROTECTED DIRECTORY SKIPPED: {target}")
        continue
    if not os.path.exists(target):
        continue
    print(f"\n[+] Cleaning target: {target}")
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

    gb = cat_freed / (1024**3)
    mb = cat_freed / (1024**2)
    print(f"    -> Reclaimed {gb:.2f} GB ({mb:.1f} MB) [{cat_deleted} files deleted]")
    total_freed += cat_freed
    total_files += cat_deleted

print("\n" + "="*60)
print(f"DEEP RECOVERY PASS COMPLETE!")
print(f"Total Storage Freed: {total_freed / (1024**3):.2f} GB ({total_freed / (1024**2):.1f} MB)")
print(f"Total Files Deleted: {total_files}")
print("="*60)
