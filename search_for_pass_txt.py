import os
import sys

print("=== DEEP SEARCH FOR pass.txt / PASSWORD FILES ===")

search_locations = [
    "E:\\",
    r"C:\Users\Kashan Khan\Desktop",
    r"C:\Users\Kashan Khan\Documents",
    r"C:\Users\Kashan Khan\Downloads",
    r"C:\Users\Kashan Khan\AppData\Local\Temp",
    r"C:\Users\Kashan Khan\.gemini",
    r"C:\$Recycle.Bin",
    "E:\\$Recycle.Bin"
]

found_files = []

for loc in search_locations:
    if not os.path.exists(loc):
        print(f"[!] Location not found or empty: {loc}")
        continue
    print(f"\n[+] Searching in: {loc}")
    try:
        for root, dirs, files in os.walk(loc, topdown=True):
            for f in files:
                f_lower = f.lower()
                if "pass" in f_lower:
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        mtime = os.path.getmtime(fp)
                        found_files.append((fp, sz, mtime))
                        print(f"    FOUND MATCH: {fp} ({sz} bytes)")
                    except Exception as e:
                        print(f"    FOUND MATCH (error reading size): {fp} - {e}")
    except Exception as e:
        print(f"    Error scanning {loc}: {e}")

print("\n" + "="*70)
print(f"SEARCH COMPLETE. Total matching files found: {len(found_files)}")
print("="*70)

for fp, sz, mtime in found_files:
    print(f"- File: {fp}")
    print(f"  Size: {sz} bytes")
