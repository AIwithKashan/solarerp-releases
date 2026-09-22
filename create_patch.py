import os
import zipfile

APP_DIR = r"E:\Solar Shop Mangement Software\SolarERP\resources\app"
PATCH_FILE = r"E:\Solar Shop Mangement Software\SolarERP\dist\SolarERP-Patch.zip"

def create_patch():
    print("Creating patch.zip...")
    with zipfile.ZipFile(PATCH_FILE, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(APP_DIR):
            if 'node_modules' in root or '.git' in root or '.vscode' in root:
                continue
            for file in files:
                if file == 'dev.db' or file == 'backup-config.json':
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, APP_DIR)
                # Ensure forward slashes for zip format
                zip_path = f"resources/app/{rel_path}".replace('\\\\', '/').replace('\\', '/')
                zipf.write(file_path, zip_path)
    size = os.path.getsize(PATCH_FILE) / (1024 * 1024)
    print(f"Patch created: {PATCH_FILE} ({size:.2f} MB)")

if __name__ == '__main__':
    create_patch()
