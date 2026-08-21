import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
system_root = r"C:\Windows"
program_data = r"C:\ProgramData"

targets = [
    os.path.join(local_appdata, "Temp"),
    os.path.join(system_root, "Temp"),
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(appdata, "npm-cache"),
    os.path.join(local_appdata, "pnpm-cache"),
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(local_appdata, "Yarn", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "GPUCache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(user, ".gemini", "antigravity-backup"),
    os.path.join(local_appdata, "CrashDumps"),
    os.path.join(program_data, "Microsoft", "Windows", "WER"),
    os.path.join(local_appdata, "CapCut", "Cache"),
    os.path.join(local_appdata, "Tabbit"),
    os.path.join(appdata, "Telegram Desktop", "tdata", "user_data", "media_cache"),
    os.path.join(local_appdata, "ms-playwright"),
    os.path.join(local_appdata, "ms-playwright-go"),
    os.path.join(system_root, "SoftwareDistribution", "Download"),
    os.path.join(user, "Downloads"),
    r"C:\$Recycle.Bin"
]

print("=== FAST TARGET AUDIT ===")
tot_all = 0
files_all = 0

for t in targets:
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
    if sz > 10 * 1024 * 1024:  # > 10 MB
        print(f"{t:<75} | {cnt:<6} files | {sz/(1024**3):.2f} GB ({sz/(1024**2):.1f} MB)")
        tot_all += sz
        files_all += cnt

print("-" * 75)
print(f"TOTAL RECLAIMABLE STORAGE IN AUDITED TARGETS: {tot_all/(1024**3):.2f} GB ({files_all} files)")
