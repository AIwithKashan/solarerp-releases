import os

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
program_data = r"C:\ProgramData"

targets = [local_appdata, appdata, user, program_data]

print("=== DETAILED SUBFOLDER SIZE REPORT (> 50 MB) ===")

for base in targets:
    if not os.path.exists(base):
        continue
    print(f"\n--- BASE: {base} ---")
    try:
        for item in os.listdir(base):
            ip = os.path.join(base, item)
            if os.path.isdir(ip):
                tot = 0
                cnt = 0
                for root, dirs, files in os.walk(ip):
                    for f in files:
                        try:
                            tot += os.path.getsize(os.path.join(root, f))
                            cnt += 1
                        except Exception:
                            pass
                mb = tot / (1024**2)
                gb = tot / (1024**3)
                if mb >= 50:  # >= 50 MB
                    print(f"{ip:<75} | {cnt:<6} files | {gb:.2f} GB ({mb:.1f} MB)")
    except Exception as e:
        print(f"Error scanning {base}: {e}")
