import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")

targets = [
    ("System Temp", os.path.join(local_appdata, "Temp")),
    ("Windows Temp", r"C:\Windows\Temp"),
    ("Gradle Caches", os.path.join(user, ".gradle", "caches")),
    ("Gradle Dists", os.path.join(user, ".gradle", "wrapper", "dists")),
    ("NPM Cache", os.path.join(local_appdata, "npm-cache")),
    ("PIP Cache", os.path.join(local_appdata, "pip", "cache")),
    ("Yarn Cache", os.path.join(local_appdata, "Yarn", "Cache")),
    ("CapCut Cache", os.path.join(local_appdata, "CapCut", "Cache")),
    ("CapCut User Data", os.path.join(local_appdata, "CapCut", "User Data")),
    ("Chrome User Data", os.path.join(local_appdata, "Google", "Chrome", "User Data", "Default")),
    ("Edge User Data", os.path.join(local_appdata, "Microsoft", "Edge", "User Data", "Default")),
    ("UWP Packages", os.path.join(local_appdata, "Packages")),
    ("Downloads Folder", os.path.join(user, "Downloads")),
    ("Android SDK Caches", os.path.join(local_appdata, "Android", "Sdk")),
]

print("=== C: DRIVE STORAGE AUDIT FOR 10-12 GB TARGET ===")

def get_dir_size(path):
    total = 0
    file_count = 0
    if not os.path.exists(path):
        return 0, 0
    for root, dirs, files in os.walk(path):
        for f in files:
            try:
                fp = os.path.join(root, f)
                total += os.path.getsize(fp)
                file_count += 1
            except Exception:
                pass
    return total, file_count

for name, path in targets:
    sz, count = get_dir_size(path)
    gb = sz / (1024**3)
    mb = sz / (1024**2)
    if gb >= 0.1:
        print(f"{name:<25} | {gb:.2f} GB ({mb:.1f} MB) | {count} files")
    else:
        print(f"{name:<25} | {mb:.1f} MB | {count} files")
