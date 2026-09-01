import os
import re

print("=== INSPECTING RECOVERED PHOTOREC FILES IN D:\\Windows 10\\recup_dir.1 ===")

target_dir = r"D:\Windows 10\recup_dir.1"
out_file = r"C:\Users\Kashan Khan\Desktop\RECOVERED_BINANCE_PHRASE.txt"

if not os.path.exists(target_dir):
    print(f"[!] Path {target_dir} not found directly. Searching D:\\ for any recup_dir...")
    search_base = r"D:\\"
    found_dirs = []
    if os.path.exists(search_base):
        for root, dirs, files in os.walk(search_base):
            for d in dirs:
                if "recup" in d.lower():
                    found_dirs.append(os.path.join(root, d))
    print(f"Found {len(found_dirs)} recup directories: {found_dirs}")
    if found_dirs:
        target_dir = found_dirs[0]

matching_files = []

if os.path.exists(target_dir):
    print(f"\n[+] Scanning all text files in: {target_dir}")
    for root, dirs, files in os.walk(target_dir):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                if 1 <= sz <= 2000000: # Files under 2 MB
                    with open(fp, "r", encoding="utf-8", errors="ignore") as file:
                        content = file.read()
                        content_lower = content.lower()
                        
                        # Check for passwords / seed phrase keywords
                        if any(kw in content_lower for kw in ["binance", "pass", "seed", "mnemonic", "phrase", "wallet", "secret", "private"]):
                            matching_files.append((fp, sz, content))
                            print(f"    ⭐ MATCH FOUND: {fp} ({sz} bytes)")
            except Exception as e:
                pass

print("\n" + "="*80)
print(f"RECUP SCAN COMPLETE. Total matching files: {len(matching_files)}")
print("="*80)

with open(out_file, "w", encoding="utf-8") as out:
    out.write("=== RECOVERED PASSWORD / SEED PHRASE TEXT FILES FROM D:\\Windows 10\\recup_dir.1 ===\n\n")
    for fp, sz, content in matching_files:
        out.write(f"File: {fp} ({sz} bytes)\n")
        out.write("-" * 60 + "\n")
        out.write(content + "\n\n")

print(f"\nWrote all matching file contents to Desktop: {out_file}")
