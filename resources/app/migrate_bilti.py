import sqlite3

dbs = [
    r"D:\SolarERP_Data\dev.db",
    r"E:\Solar Shop Mangement Software\SolarERP\resources\app\server\prisma\dev.db"
]

for db_path in dbs:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute("PRAGMA table_info(Purchase);")
        cols = [c[1] for c in cur.fetchall()]
        if 'bilti_no' not in cols:
            cur.execute("ALTER TABLE Purchase ADD COLUMN bilti_no TEXT;")
            print(f"[OK] Added bilti_no to Purchase in {db_path}")
        else:
            print(f"[EXISTS] bilti_no in Purchase in {db_path}")

        cur.execute("PRAGMA table_info(SaleItem);")
        cols = [c[1] for c in cur.fetchall()]
        if 'bilti_no' not in cols:
            cur.execute("ALTER TABLE SaleItem ADD COLUMN bilti_no TEXT;")
            print(f"[OK] Added bilti_no to SaleItem in {db_path}")
        else:
            print(f"[EXISTS] bilti_no in SaleItem in {db_path}")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error on {db_path}: {e}")
