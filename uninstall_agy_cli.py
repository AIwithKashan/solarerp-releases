import os
import shutil
import winreg
import ctypes

user = r"C:\Users\Kashan Khan"
agy_dir = os.path.join(user, "AppData", "Local", "agy")
agy_bin = os.path.join(agy_dir, "bin")

print("=== UNINSTALLING ANTIGRAVITY CLI (agy) ===")

# 1. Remove Files
if os.path.exists(agy_dir):
    print(f"[+] Deleting directory: {agy_dir}")
    try:
        shutil.rmtree(agy_dir, ignore_errors=True)
        print("    -> Successfully deleted agy directory.")
    except Exception as e:
        print(f"    -> Error deleting directory: {e}")
else:
    print(f"[!] {agy_dir} not found.")

# 2. Clean User PATH Registry
print("\n[+] Cleaning User PATH environment variable in Windows Registry...")
try:
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_READ | winreg.KEY_WRITE) as key:
        current_path, _ = winreg.QueryValueEx(key, "Path")
        entries = current_path.split(";")
        new_entries = [e for e in entries if e.strip() and not e.strip().lower().startswith(agy_dir.lower())]
        new_path = ";".join(new_entries)
        if new_path != current_path:
            winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
            print("    -> Successfully removed agy from User PATH.")
        else:
            print("    -> agy was not found in User PATH.")
            
    # Broadcast Environment change
    HWND_BROADCAST = 0xFFFF
    WM_SETTINGCHANGE = 0x001A
    SMTO_ABORTIFHUNG = 0x0002
    result = ctypes.c_long()
    ctypes.windll.user32.SendMessageTimeoutW(
        HWND_BROADCAST,
        WM_SETTINGCHANGE,
        0,
        "Environment",
        SMTO_ABORTIFHUNG,
        5000,
        ctypes.byref(result)
    )
    print("    -> Environment change broadcast sent system-wide.")
except Exception as e:
    print(f"    -> Registry PATH update error: {e}")

print("\nANTIGRAVITY CLI UNINSTALLATION COMPLETE!")
