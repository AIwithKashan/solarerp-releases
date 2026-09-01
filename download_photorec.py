import urllib.request
import zipfile
import os

url = "https://www.cgsecurity.org/testdisk-7.2.win.zip"
zip_path = r"C:\Users\Kashan Khan\AppData\Local\Temp\testdisk.zip"
extract_dir = r"C:\Users\Kashan Khan\AppData\Local\Temp\testdisk_tool"

print("[+] Downloading PhotoRec / TestDisk portable tool...")
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response, open(zip_path, 'wb') as out_file:
        out_file.write(response.read())
    print("[+] Download complete! Extracting archive...")
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    print("[+] Extraction complete!")
    
    for root, dirs, files in os.walk(extract_dir):
        for f in files:
            if f.endswith(".exe"):
                print("    EXECUTABLE:", os.path.join(root, f))
except Exception as e:
    print("[!] Error:", e)
