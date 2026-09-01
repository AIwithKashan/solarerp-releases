import os
import sqlite3
import shutil

out_file = r"C:\Users\Kashan Khan\Desktop\SAVED_ACCOUNTS_AND_LOGINS.txt"

appdata_local = r"C:\Users\Kashan Khan\AppData\Local"
chrome_db = os.path.join(appdata_local, "Google", "Chrome", "User Data", "Default", "Login Data")
edge_db = os.path.join(appdata_local, "Microsoft", "Edge", "User Data", "Default", "Login Data")

temp_db = os.path.join(appdata_local, "Temp", "temp_pass_db.db")

all_accounts = []

for db_name, db_path in [("Chrome", chrome_db), ("Edge", edge_db)]:
    if os.path.exists(db_path):
        try:
            shutil.copy2(db_path, temp_db)
            conn = sqlite3.connect(temp_db)
            cursor = conn.cursor()
            cursor.execute("SELECT origin_url, username_value FROM logins WHERE username_value != ''")
            for url, user in cursor.fetchall():
                all_accounts.append((db_name, url, user))
            conn.close()
            if os.path.exists(temp_db):
                os.remove(temp_db)
        except Exception as e:
            pass

with open(out_file, "w", encoding="utf-8") as f:
    f.write("=======================================================================\n")
    f.write("        SUMMARY OF SAVED LOGINS & ACCOUNTS (CHROME & EDGE)             \n")
    f.write("=======================================================================\n\n")
    f.write(f"Total Saved Accounts Found: {len(all_accounts)}\n\n")
    f.write(f"{'Browser':<10} | {'Website / App Origin':<75} | {'Username / Email'}\n")
    f.write("-" * 120 + "\n")
    
    for browser, url, user in sorted(all_accounts, key=lambda x: x[1]):
        f.write(f"{browser:<10} | {url:<75} | {user}\n")

print(f"[+] Successfully wrote {len(all_accounts)} saved login entries to Desktop: {out_file}")
