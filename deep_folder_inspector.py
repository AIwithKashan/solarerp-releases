import os

targets = [
    r"C:\Users\Kashan Khan\.local",
    r"C:\Users\Kashan Khan\.gemini",
    r"C:\Users\Kashan Khan\AppData\Local\Google",
    r"C:\Users\Kashan Khan\AppData\Local\Microsoft",
    r"C:\Users\Kashan Khan\AppData\Local\Python"
]

print("=== DEEP FOLDER INSPECTION (> 20 MB) ===")

for t in targets:
    if not os.path.exists(t):
        continue
    print(f"\n--- INSPECTING: {t} ---")
    try:
        for item in os.listdir(t):
            ip = os.path.join(t, item)
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
                if mb >= 20:  # >= 20 MB
                    print(f"{ip:<75} | {cnt:<6} files | {gb:.2f} GB ({mb:.1f} MB)")
    except Exception as e:
        print(f"Error inspecting {t}: {e}")
