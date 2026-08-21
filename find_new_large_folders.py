import os

print("=== DEEP FIND NEW LARGE FOLDERS (> 100 MB) ===")

def check_dir(base_path):
    if not os.path.exists(base_path):
        return
    try:
        for d in os.listdir(base_path):
            dp = os.path.join(base_path, d)
            if "omniroute" in d.lower():
                continue
            if os.path.isdir(dp):
                tot = 0
                cnt = 0
                for root, dirs, files in os.walk(dp):
                    for f in files:
                        p = os.path.join(root, f)
                        if "omniroute" in p.lower():
                            continue
                        try:
                            tot += os.path.getsize(p)
                            cnt += 1
                        except Exception:
                            pass
                mb = tot / (1024**2)
                gb = tot / (1024**3)
                if mb >= 100:  # >= 100 MB
                    print(f"{dp:<70} | {cnt:<6} files | {gb:.2f} GB ({mb:.1f} MB)")
    except Exception:
        pass

print("\n--- C:\\Users\\Kashan Khan\\AppData\\Local ---")
check_dir(r"C:\Users\Kashan Khan\AppData\Local")

print("\n--- C:\\Users\\Kashan Khan\\AppData\\Roaming ---")
check_dir(r"C:\Users\Kashan Khan\AppData\Roaming")

print("\n--- C:\\Users\\Kashan Khan ---")
check_dir(r"C:\Users\Kashan Khan")

print("\n--- C:\\ProgramData ---")
check_dir(r"C:\ProgramData")

print("\n--- C:\\Windows ---")
check_dir(r"C:\Windows")
