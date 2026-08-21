import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")

items = [
    r"C:\hiberfil.sys",
    r"C:\pagefile.sys",
    r"C:\swapfile.sys",
    os.path.join(user, ".gradle"),
    os.path.join(user, ".gemini"),
    os.path.join(user, ".local"),
    os.path.join(local_appdata, "npm-cache"),
    os.path.join(local_appdata, "Temp"),
    r"C:\Windows\Temp",
    r"C:\Windows\SoftwareDistribution\Download",
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Code Cache"),
    os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default", "Service Worker"),
    os.path.join(user, "Downloads")
]

print("=== STORAGE DELTA CHECK ===")
tot = 0
for i in items:
    if not os.path.exists(i):
        continue
    if os.path.isfile(i):
        try:
            sz = os.path.getsize(i)
            print(f"{i:<75} | {sz/(1024**3):.2f} GB ({sz/(1024**2):.1f} MB)")
            tot += sz
        except Exception as e:
            print(f"{i:<75} | Error: {e}")
    else:
        dir_sz = 0
        cnt = 0
        for root, dirs, files in os.walk(i):
            for f in files:
                try:
                    dir_sz += os.path.getsize(os.path.join(root, f))
                    cnt += 1
                except Exception:
                    pass
        print(f"{i:<75} | {cnt:<6} files | {dir_sz/(1024**3):.2f} GB ({dir_sz/(1024**2):.1f} MB)")
        tot += dir_sz

print("-" * 75)
print(f"TOTAL INSTANTLY RECLAIMABLE IN CHECKED ITEMS: {tot/(1024**3):.2f} GB ({tot/(1024**2):.1f} MB)")
