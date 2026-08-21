import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
program_data = r"C:\ProgramData"
system_root = r"C:\Windows"

targets = [
    r"C:\hiberfil.sys",
    r"C:\pagefile.sys",
    r"C:\swapfile.sys",
    os.path.join(local_appdata, "Temp"),
    os.path.join(system_root, "Temp"),
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(appdata, "npm-cache"),
    os.path.join(local_appdata, "pip", "cache"),
    os.path.join(user, ".gradle"),
    os.path.join(user, ".gemini", "antigravity-ide", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "browser_recordings"),
    os.path.join(user, ".gemini", "antigravity", "scratch"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "IndexedDB"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default", "Service Worker"),
    os.path.join(local_appdata, "Microsoft", "OneDrive", "logs"),
    os.path.join(local_appdata, "Packages"),
    os.path.join(system_root, "SoftwareDistribution", "Download"),
    r"C:\$Recycle.Bin",
    os.path.join(user, "Downloads")
]

print("=== CURRENT JUNK & CACHE AUDIT ===")
tot_all = 0
files_all = 0

for t in targets:
    if not os.path.exists(t):
        continue
    if os.path.isfile(t):
        try:
            sz = os.path.getsize(t)
            print(f"{t:<75} | 1 file | {sz/(1024**3):.2f} GB ({sz/(1024**2):.1f} MB)")
            tot_all += sz
            files_all += 1
        except Exception:
            pass
    else:
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
        if sz > 5 * 1024 * 1024:  # > 5 MB
            print(f"{t:<75} | {cnt:<6} files | {sz/(1024**3):.2f} GB ({sz/(1024**2):.1f} MB)")
            tot_all += sz
            files_all += cnt

print("-" * 75)
print(f"TOTAL RECLAIMABLE STORAGE IN AUDITED TARGETS: {tot_all/(1024**3):.2f} GB ({tot_all/(1024**2):.1f} MB)")
