import os

print("=== MASTER STORAGE AUDIT (> 50 MB) ===")

def audit(base_path):
    if not os.path.exists(base_path):
        return
    try:
        for item in os.listdir(base_path):
            dp = os.path.join(base_path, item)
            if os.path.isdir(dp):
                tot = 0
                cnt = 0
                for root, dirs, files in os.walk(dp):
                    for f in files:
                        try:
                            tot += os.path.getsize(os.path.join(root, f))
                            cnt += 1
                        except Exception:
                            pass
                mb = tot / (1024**2)
                gb = tot / (1024**3)
                if mb >= 50:  # >= 50 MB
                    print(f"{dp:<75} | {cnt:<6} files | {gb:.2f} GB ({mb:.1f} MB)")
    except Exception:
        pass

print("\n--- APPDATA LOCAL ---")
audit(r"C:\Users\Kashan Khan\AppData\Local")

print("\n--- APPDATA ROAMING ---")
audit(r"C:\Users\Kashan Khan\AppData\Roaming")

print("\n--- USER PROFILE ---")
audit(r"C:\Users\Kashan Khan")

print("\n--- PROGRAMDATA ---")
audit(r"C:\ProgramData")

print("\n--- WINDOWS ---")
audit(r"C:\Windows")
