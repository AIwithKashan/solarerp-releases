import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
system_root = r"C:\Windows"
program_data = r"C:\ProgramData"

targets = [
    # Temp Folders
    os.path.join(local_appdata, "Temp"),
    os.path.join(user, "AppData", "Local", "Temp"),
    os.path.join(system_root, "Temp"),
    
    # Antigravity Temp Recordings & Scratch Logs (EXCLUDING OMNIROUTE)
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(user, ".gemini", "antigravity-backup"),
    os.path.join(user, ".gemini", "antigravity", "logs"),

    # Crash Dumps & Error Reports
    os.path.join(local_appdata, "CrashDumps"),
    os.path.join(program_data, "Microsoft", "Windows", "WER"),
    os.path.join(local_appdata, "Microsoft", "Windows", "WER"),

    # Playwright Browser Engines
    os.path.join(local_appdata, "ms-playwright"),
    os.path.join(local_appdata, "ms-playwright-go"),

    # Browser Caches
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),

    # Dev & Package Caches (EXCLUDING OMNIROUTE)
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(appdata, "npm-cache"),
    os.path.join(local_appdata, "Yarn", "Cache"),

    # App Caches
    os.path.join(local_appdata, "CapCut", "Cache"),
    os.path.join(local_appdata, "Tabbit"),
    os.path.join(appdata, "Telegram Desktop", "tdata", "user_data", "media_cache"),

    # Windows Update Download Cache
    os.path.join(system_root, "SoftwareDistribution", "Download"),

    # Recycle Bin
    r"C:\$Recycle.Bin"
]

print("=== DEEP FAST C DRIVE AUDIT ===")
total_found = 0
file_found_cnt = 0

for t in targets:
    # Explicit Safety Protection for OmniRoute
    if "omniroute" in t.lower() or ".omniroute" in t.lower():
        continue
    if not os.path.exists(t):
        continue
    sz = 0
    cnt = 0
    for root, dirs, files in os.walk(t):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz += os.path.getsize(fp)
                cnt += 1
            except Exception:
                pass
    if sz > 1 * 1024 * 1024:  # > 1 MB
        gb = sz / (1024**3)
        mb = sz / (1024**2)
        print(f"{t:<75} | {cnt:<6} files | {gb:.2f} GB ({mb:.1f} MB)")
        total_found += sz
        file_found_cnt += cnt

print("-" * 75)
print(f"TOTAL RECLAIMABLE USELESS STORAGE FOUND: {total_found / (1024**3):.2f} GB ({file_found_cnt} files)")
