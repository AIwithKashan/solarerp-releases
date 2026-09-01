import os

print("=== SEARCHING ALL TXT / DOCUMENT FILES ON E:\\ DRIVE ===")

skip_dirs = {"node_modules", ".git", ".venv", "venv", "__pycache__", "dist", "build", "resources"}

txt_files = []

for root, dirs, files in os.walk("E:\\", topdown=True):
    dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
    for f in files:
        f_lower = f.lower()
        if f_lower.endswith(".txt") or f_lower.endswith(".doc") or f_lower.endswith(".docx") or f_lower.endswith(".json") or f_lower.endswith(".bak") or f_lower.endswith(".log") or "pass" in f_lower:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                mtime = os.path.getmtime(fp)
                txt_files.append((fp, sz, mtime))
            except Exception:
                pass

print(f"\nTotal text/document files found on E:\\: {len(txt_files)}")
print("-" * 80)

for fp, sz, mtime in sorted(txt_files, key=lambda x: x[0]):
    print(f"{fp:<85} | {sz} bytes")
