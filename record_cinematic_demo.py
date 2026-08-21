import time
import os
import shutil
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"C:\Users\Kashan Khan\Desktop"
TEMP_VIDEO_DIR = r"C:\Users\Kashan Khan\Desktop\temp_video"

os.makedirs(TEMP_VIDEO_DIR, exist_ok=True)

def record_demo():
    print("Starting Cinematic Video Recording of SolarERP...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=TEMP_VIDEO_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )
        
        page = context.new_page()
        
        # 1. Dashboard Landing
        print("[1/8] Dashboard Landing...")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 300, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # 2. Accounts Module
        print("[2/8] Accounts Ledger...")
        page.goto("http://localhost:3000/accounts", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(1000)
        
        # 3. Products Catalog
        print("[3/8] Products Catalog...")
        page.goto("http://localhost:3000/products", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 300, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # 4. Purchases Management
        print("[4/8] Purchases Management...")
        page.goto("http://localhost:3000/purchases", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 300, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # 5. Sales Management
        print("[5/8] Sales Management...")
        page.goto("http://localhost:3000/sales", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 350, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(1000)
        
        # 6. Vouchers Portal
        print("[6/8] Vouchers Portal...")
        page.goto("http://localhost:3000/vouchers", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 300, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # 7. Reports Hub - Multi-Tab Showcase
        print("[7/8] Reports Hub...")
        page.goto("http://localhost:3000/reports", wait_until="networkidle")
        page.wait_for_timeout(2000)
        
        # Daily Cash Report
        page.goto("http://localhost:3000/reports/daily-cash", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 400, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # Profit & Loss Report
        page.goto("http://localhost:3000/reports/profit-loss", wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.evaluate("window.scrollTo({top: 350, behavior: 'smooth'})")
        page.wait_for_timeout(1500)
        
        # 8. Settings & Business Info
        print("[8/8] Settings & Company Profile...")
        page.goto("http://localhost:3000/settings", wait_until="networkidle")
        page.wait_for_timeout(2000)
        
        # Back to Dashboard
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(2000)
        
        context.close()
        browser.close()
        print("Cinematic Walkthrough Video Recording Completed!")

if __name__ == "__main__":
    record_demo()
    
    # Copy video to Desktop
    files = [os.path.join(TEMP_VIDEO_DIR, f) for f in os.listdir(TEMP_VIDEO_DIR) if f.endswith(".webm")]
    if files:
        src = files[0]
        dest_webm = os.path.join(OUTPUT_DIR, "SolarERP_Cinematic_Demo.webm")
        shutil.copyfile(src, dest_webm)
        print(f"🎉 Saved Video File: {dest_webm}")
