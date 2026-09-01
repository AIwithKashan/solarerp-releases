import os

print("=== TARGETED USER SEARCH FOR pass.txt / PASSWORD FILES ===")

search_roots = [
    "E:\\",
    r"C:\Users\Kashan Khan\Desktop",
    r"C:\Users\Kashan Khan\Documents",
    r"C:\Users\Kashan Khan\Downloads",
    r"C:\Users\Kashan Khan\AppData\Local\Temp",
    r"C:\Users\Kashan Khan\.gemini",
    r"C:\$Recycle.Bin",
    "E:\\$Recycle.Bin"
]

skip_dirs = ["node_modules", ".git", ".venv", "venv", "__pycache__", "AppData\\Local\\Programs", "AppData\\Local\\Packages"]

user_matches = []

for root_dir in search_roots:
    if not os.path.exists(root_dir):
        continue
    print(f"\n[+] Searching root: {root_dir}")
    for root, dirs, files in os.walk(root_dir, topdown=True):
        # Modify dirs in-place to skip node_modules etc
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
        for f in files:
            f_lower = f.lower()
            if "pass" in f_lower:
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                    mtime = os.path.getmtime(fp)
                    user_matches.append((fp, sz, mtime))
                    print(f"    ⭐ MATCH: {fp} ({sz} bytes)")
                except Exception as e:
                    print(f"    ⭐ MATCH (error size): {fp} - {e}")

print("\n" + "="*70)
print(f"TARGETED USER SEARCH COMPLETE. Total user files found: {len(user_matches)}")
print("="*70)

for fp, sz, mtime in user_matches:
    print(f"\nFile: {fp}")
    print(f"Size: {sz} bytes")
