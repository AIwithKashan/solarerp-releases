import os

rb_paths = [r"C:\$Recycle.Bin", r"E:\$Recycle.Bin"]

print("=== DEEP RECYCLE BIN DELETED FILE PAYLOAD SEARCH ($R / $I) ===")

found_payloads = []

for rb in rb_paths:
    if not os.path.exists(rb):
        continue
    print(f"\n[+] Searching Recycle Bin root: {rb}")
    try:
        for root, dirs, files in os.walk(rb):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                    # Windows Recycle Bin deleted payloads start with $R
                    if f.startswith("$R") or f.startswith("$I") or f.endswith(".txt"):
                        found_payloads.append((fp, sz))
                        print(f"    ⭐ RECYCLE PAYLOAD: {fp:<80} | {sz} bytes")
                except Exception as e:
                    pass
    except Exception as e:
        print(f"    Error scanning {rb}: {e}")

print("\n" + "="*80)
print(f"TOTAL RECYCLE BIN PAYLOADS FOUND: {len(found_payloads)}")
print("="*80)

for fp, sz in found_payloads:
    print(f"\nAnalyzing: {fp} ({sz} bytes)")
    try:
        with open(fp, "r", encoding="utf-8", errors="ignore") as file:
            text = file.read()
            print("--- FIRST 500 CHARACTERS ---")
            print(text[:500])
            print("--- END PREVIEW ---")
    except Exception as e:
        print("    Error reading content:", e)
