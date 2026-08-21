import os

user = r"C:\Users\Kashan Khan"
rec_dir = os.path.join(user, ".gemini", "antigravity", "browser_recordings")
scratch_dir = os.path.join(user, ".gemini", "antigravity", "scratch")
dl_dir = os.path.join(user, "Downloads")

freed = 0
deleted = 0

print("=== CLEANING GEMINI RECORDINGS, SCRATCH & DOWNLOADS ===")

for target in [rec_dir, scratch_dir]:
    if not os.path.exists(target):
        continue
    print(f"\n[+] Cleaning: {target}")
    for root, dirs, files in os.walk(target, topdown=False):
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

if os.path.exists(dl_dir):
    print(f"\n[+] Cleaning installer setups in: {dl_dir}")
    for f in os.listdir(dl_dir):
        fp = os.path.join(dl_dir, f)
        if os.path.isfile(fp):
            ext = os.path.splitext(f)[1].lower()
            if ext in [".exe", ".msi", ".iso", ".rar", ".zip", ".dmg", ".tar", ".gz"] or f.startswith("ZoomInstaller"):
                try:
                    sz = os.path.getsize(fp)
                    os.remove(fp)
                    freed += sz
                    deleted += 1
                    print(f"    -> Deleted setup file: {f} ({sz / (1024**2):.1f} MB)")
                except Exception:
                    pass

print(f"\nReclaimed Total: {freed / (1024**3):.2f} GB ({freed / (1024**2):.1f} MB) [{deleted} files deleted]")
