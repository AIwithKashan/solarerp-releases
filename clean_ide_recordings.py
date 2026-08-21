import os

ide_rec_dir = r"C:\Users\Kashan Khan\.gemini\antigravity-ide\browser_recordings"

freed = 0
deleted = 0

print("=== CLEANING IDE BROWSER RECORDINGS ===")
if os.path.exists(ide_rec_dir):
    for root, dirs, files in os.walk(ide_rec_dir, topdown=False):
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

gb = freed / (1024**3)
mb = freed / (1024**2)
print(f"Reclaimed {gb:.2f} GB ({mb:.1f} MB) [{deleted} recording files deleted]")
