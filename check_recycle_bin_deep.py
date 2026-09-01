import os

recycle_paths = [r"C:\$Recycle.Bin", r"E:\$Recycle.Bin"]

print("=== DEEP RECYCLE BIN INSPECTION ===")

for rb in recycle_paths:
    if not os.path.exists(rb):
        print(f"[!] Path not found: {rb}")
        continue
    print(f"\n[+] Inspecting Recycle Bin: {rb}")
    try:
        for root, dirs, files in os.walk(rb):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                    print(f"    Recycle Bin File: {fp:<80} | {sz} bytes")
                    if sz < 10000: # Small text file check
                        with open(fp, "r", encoding="utf-8", errors="ignore") as tf:
                            lines = [line.strip() for line in tf.readlines() if line.strip()][:5]
                            print(f"      Snippet: {lines}")
                except Exception as e:
                    print(f"    Recycle Bin File (error): {fp} - {e}")
    except Exception as e:
        print(f"    Error reading {rb}: {e}")
