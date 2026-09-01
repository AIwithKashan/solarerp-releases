import os
import sqlite3
import shutil

print("=== CHECKING BROWSER & APP SAVED LOGINS ===")

appdata_local = r"C:\Users\Kashan Khan\AppData\Local"
appdata_roaming = r"C:\Users\Kashan Khan\AppData\Roaming"

login_db_paths = [
    os.path.join(appdata_local, "Google", "Chrome", "User Data", "Default", "Login Data"),
    os.path.join(appdata_local, "Microsoft", "Edge", "User Data", "Default", "Login Data"),
    os.path.join(appdata_local, "BraveSoftware", "Brave-Browser", "User Data", "Default", "Login Data"),
]

temp_db = os.path.join(appdata_local, "Temp", "temp_login_db.db")

for db in login_db_paths:
    if os.path.exists(db):
        print(f"\n[+] Found Browser Login Database: {db}")
        try:
            shutil.copy2(db, temp_db)
            conn = sqlite3.connect(temp_db)
            cursor = conn.cursor()
            cursor.execute("SELECT origin_url, username_value FROM logins WHERE username_value != ''")
            rows = cursor.fetchall()
            print(f"    Found {len(rows)} saved login accounts:")
            for url, user in rows[:20]:
                print(f"      • URL: {url:<50} | User: {user}")
            conn.close()
            os.remove(temp_db)
        except Exception as e:
            print(f"    Error reading DB: {e}")

# Check VS Code / IDE workspace storage for text files or notes
ide_storage = os.path.join(appdata_roaming, "Antigravity IDE", "User", "workspaceStorage")
if os.path.exists(ide_storage):
    print(f"\n[+] Checking IDE Workspace Storage: {ide_storage}")
    for root, dirs, files in os.walk(ide_storage):
        for f in files:
            if f.endswith(".json") or f.endswith(".txt"):
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                    if 1 <= sz <= 100000:
                        with open(fp, "r", encoding="utf-8", errors="ignore") as tf:
                            txt = tf.read().lower()
                            if "pass" in txt:
                                print(f"    ⭐ Match in IDE Cache: {fp}")
                except Exception:
                    pass
