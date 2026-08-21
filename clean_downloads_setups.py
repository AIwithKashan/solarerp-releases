import os

dl_dir = r"C:\Users\Kashan Khan\Downloads"
freed = 0
deleted = 0

print("=== CLEANING DOWNLOADS SETUP INSTALLERS ===")
if os.path.exists(dl_dir):
    for f in os.listdir(dl_dir):
        fp = os.path.join(dl_dir, f)
        if os.path.isfile(fp):
            ext = os.path.splitext(f)[1].lower()
            if ext in [".exe", ".msi", ".iso", ".dmg", ".tar", ".gz"] or f.endswith(".zip"):
                try:
                    sz = os.path.getsize(fp)
                    os.remove(fp)
                    freed += sz
                    deleted += 1
                    print(f"    -> Deleted installer/zip: {f} ({sz / (1024**2):.1f} MB)")
                except Exception:
                    pass

print(f"\nReclaimed Total: {freed / (1024**3):.2f} GB ({freed / (1024**2):.1f} MB) [{deleted} files deleted]")
