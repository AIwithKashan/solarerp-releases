import os
import shutil

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
system_root = r"C:\Windows"
program_data = r"C:\ProgramData"

whitelisted_junk_targets = [
    # Temp Directories
    os.path.join(local_appdata, "Temp"),
    os.path.join(user, "AppData", "Local", "Temp"),
    os.path.join(system_root, "Temp"),

    # Package Manager Caches
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(appdata, "npm-cache"),
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(local_appdata, "pypoetry", "Cache"),
    os.path.join(local_appdata, "Yarn", "Cache"),
    os.path.join(local_appdata, "pnpm-cache"),

    # Google Chrome Caches
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "File System"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Blob Storage"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "ShaderCache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "GrShaderCache"),

    # Microsoft Edge Caches
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "ShaderCache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "GrShaderCache"),

    # VS Code & IDE Caches
    os.path.join(local_appdata, "Code", "Cache"),
    os.path.join(local_appdata, "Code", "CachedData"),
    os.path.join(local_appdata, "Code", "GPUCache"),
    os.path.join(local_appdata, "Microsoft", "TypeScript"),

    # Antigravity Temp Recordings & Scratch Logs (EXCLUDING OMNIROUTE)
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(user, ".gemini", "antigravity-backup"),
    os.path.join(user, ".gemini", "antigravity", "logs"),

    # Crash Dumps & Windows Error Reports
    os.path.join(local_appdata, "CrashDumps"),
    os.path.join(program_data, "Microsoft", "Windows", "WER"),
    os.path.join(local_appdata, "Microsoft", "Windows", "WER"),

    # Application Caches
    os.path.join(local_appdata, "CapCut", "Cache"),
    os.path.join(local_appdata, "Tabbit"),
    os.path.join(appdata, "Telegram Desktop", "tdata", "user_data", "media_cache"),
    os.path.join(appdata, "Telegram Desktop", "tdata", "user_data", "temp"),
    os.path.join(local_appdata, "D3DSCache"),
    os.path.join(local_appdata, "NVIDIA", "DXCache"),
    os.path.join(local_appdata, "NVIDIA", "GLCache"),

    # Playwright Test Browser Downloads
    os.path.join(local_appdata, "ms-playwright"),
    os.path.join(local_appdata, "ms-playwright-go"),

    # Windows Update Download Cache
    os.path.join(system_root, "SoftwareDistribution", "Download"),

    # Recycle Bin
    r"C:\$Recycle.Bin"
]

print("="*60)
print("  SAFE C DRIVE CLEANER V2 - STRICT OMNIROUTE PROTECTION")
print("="*60)

total_freed = 0
total_deleted_files = 0
skipped_files = 0

for target in whitelisted_junk_targets:
    # Explicit Safety Rule: Never touch OmniRoute
    if "omniroute" in target.lower() or ".omniroute" in target.lower():
        print(f"[!] PROTECTED DIRECTORY SKIPPED: {target}")
        continue

    if not os.path.exists(target):
        continue

    print(f"\n[+] Cleaning target: {target}")
    cat_freed = 0
    cat_deleted = 0

    if os.path.isfile(target):
        try:
            sz = os.path.getsize(target)
            os.remove(target)
            cat_freed += sz
            cat_deleted += 1
        except Exception:
            skipped_files += 1
    else:
        try:
            for root, dirs, files in os.walk(target, topdown=False):
                for f in files:
                    fp = os.path.join(root, f)
                    # Double check protection for omniroute
                    if "omniroute" in fp.lower() or ".omniroute" in fp.lower():
                        continue
                    try:
                        sz = os.path.getsize(fp)
                        os.remove(fp)
                        cat_freed += sz
                        cat_deleted += 1
                    except (PermissionError, FileNotFoundError, OSError):
                        skipped_files += 1

                for d in dirs:
                    dp = os.path.join(root, d)
                    if "omniroute" in dp.lower() or ".omniroute" in dp.lower():
                        continue
                    try:
                        os.rmdir(dp)
                    except (PermissionError, FileNotFoundError, OSError):
                        pass
        except Exception as e:
            print(f"    Note: {e}")

    gb = cat_freed / (1024**3)
    mb = cat_freed / (1024**2)
    print(f"    -> Reclaimed {gb:.2f} GB ({mb:.1f} MB) [{cat_deleted} files deleted]")
    total_freed += cat_freed
    total_deleted_files += cat_deleted

print("\n" + "="*60)
print(f"SAFE C DRIVE CLEANUP V2 COMPLETE!")
print(f"Total Storage Freed: {total_freed / (1024**3):.2f} GB ({total_freed / (1024**2):.1f} MB)")
print(f"Total Files Deleted: {total_deleted_files}")
if skipped_files > 0:
    print(f"Files Skipped (Currently Open/Locked): {skipped_files}")
print("="*60)
