import os
import sys

print("=== SEARCHING FOR PASSWORD CONTENT & TEXT FILES ===")

target_dirs = [
    r"E:\My",
    "E:\\",
    r"C:\Users\Kashan Khan\Desktop",
    r"C:\Users\Kashan Khan\Documents",
    r"C:\Users\Kashan Khan\Downloads",
    r"C:\Users\Kashan Khan\AppData\Local\Temp",
    r"C:\$Recycle.Bin"
]

skip_dirs = {"node_modules", ".git", ".venv", "venv", "__pycache__", "dist", "build", "resources", "AndroidDevTools", "locales", "dist", "out"}

matching_files = []

for base in target_dirs:
    if not os.path.exists(base):
        continue
    print(f"\n[+] Searching: {base}")
    for root, dirs, files in os.walk(base, topdown=True):
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
        for f in files:
            f_lower = f.lower()
            fp = os.path.join(root, f)
            
            # Check 1: Filename match
            if any(k in f_lower for k in ["pass", "pwd", "secret", "cred", "login", "acc", "note"]) and (f_lower.endswith(".txt") or f_lower.endswith(".bak") or f_lower.endswith(".json") or f_lower.endswith(".doc") or f_lower.endswith(".docx") or f_lower.endswith(".log") or f_lower.endswith(".csv")):
                try:
                    sz = os.path.getsize(fp)
                    matching_files.append((fp, sz, "Name Match"))
                    print(f"    ⭐ FILENAME MATCH: {fp} ({sz} bytes)")
                except Exception:
                    pass
            # Check 2: Small text files content match
            elif f_lower.endswith(".txt") or f_lower.endswith(".log") or f_lower.endswith(".bak"):
                try:
                    sz = os.path.getsize(fp)
                    if 1 <= sz <= 500000: # Small text file <= 500 KB
                        with open(fp, "r", encoding="utf-8", errors="ignore") as tf:
                            content = tf.read().lower()
                            if any(w in content for w in ["password", "pass:", "passwd", "pwd=", "p@ss"]):
                                matching_files.append((fp, sz, "Content Match"))
                                print(f"    🔍 CONTENT MATCH: {fp} ({sz} bytes)")
                except Exception:
                    pass

print("\n" + "="*80)
print(f"PASSWORD CONTENT SEARCH COMPLETE. Total files found: {len(matching_files)}")
print("="*80)

for fp, sz, reason in matching_files:
    print(f"[{reason}] {fp:<80} | {sz} bytes")
