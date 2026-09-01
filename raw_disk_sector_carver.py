import ctypes
from ctypes import wintypes
import os
import re

GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

CreateFileW = ctypes.windll.kernel32.CreateFileW
CreateFileW.argtypes = [
    wintypes.LPCWSTR,
    wintypes.DWORD,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    wintypes.DWORD,
    wintypes.HANDLE
]
CreateFileW.restype = wintypes.HANDLE

ReadFile = ctypes.windll.kernel32.ReadFile
ReadFile.argtypes = [
    wintypes.HANDLE,
    wintypes.LPVOID,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    wintypes.LPVOID
]
ReadFile.restype = wintypes.BOOL

CloseHandle = ctypes.windll.kernel32.CloseHandle
CloseHandle.argtypes = [wintypes.HANDLE]

print("=== AUTOMATIC RAW SECTOR PASSWORDS RECOVERY ON E: DRIVE ===")

target_drive = r"\\.\E:"
out_file = r"C:\Users\Kashan Khan\Desktop\RECOVERED_PASSWORDS.txt"

handle = CreateFileW(
    target_drive,
    GENERIC_READ,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    None,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    None
)

INVALID_HANDLE_VALUE = wintypes.HANDLE(-1).value

if handle == INVALID_HANDLE_VALUE or handle == -1:
    err = ctypes.GetLastError()
    print(f"[!] Unable to open raw E: drive (Win32 Error Code: {err}). Admin rights required.")
else:
    print(f"[+] Successfully opened raw E: drive handle ({handle})!")
    buffer_size = 1024 * 1024 # 1 MB chunk
    buf = ctypes.create_string_buffer(buffer_size)
    bytes_read = wintypes.DWORD(0)
    
    found_lines = set()
    chunk_count = 0
    max_chunks = 2000 # Scan up to 2 GB of raw disk sectors
    
    keywords = [b"password", b"pass:", b"passwd", b"email:", b"login:", b"username:", b"gmail", b"hotmail", b"yahoo", b"facebook", b"instagram", b"twitter", b"admin", b"user:"]

    with open(out_file, "w", encoding="utf-8", errors="ignore") as out:
        out.write("=== RECOVERED PASSWORDS & TEXT LINES FROM RAW DISK SECTORS (E:) ===\n\n")
        
        while chunk_count < max_chunks:
            res = ReadFile(handle, buf, buffer_size, ctypes.byref(bytes_read), None)
            if not res or bytes_read.value == 0:
                print("    Reached end of drive or unreadable sector.")
                break
            
            raw_data = buf.raw[:bytes_read.value]
            chunk_count += 1
            if chunk_count % 100 == 0:
                print(f"    Scanned {chunk_count * 1} MB of raw disk sectors...")
            
            # Check for keyword matches in raw sector data
            raw_lower = raw_data.lower()
            if any(kw in raw_lower for kw in keywords):
                # Extract printable ASCII/UTF-8 strings
                lines = re.findall(rb'[\x20-\x7E\r\n]{6,}', raw_data)
                for line in lines:
                    line_lower = line.lower()
                    if any(kw in line_lower for kw in keywords):
                        try:
                            decoded = line.decode('utf-8', errors='ignore').strip()
                            if len(decoded) >= 6 and decoded not in found_lines:
                                found_lines.add(decoded)
                                out.write(decoded + "\n")
                        except Exception:
                            pass

    CloseHandle(handle)
    print("\n" + "="*80)
    print(f"RAW SECTOR CARVING COMPLETE! Found {len(found_lines)} matching password text lines.")
    print(f"Saved directly to Desktop: {out_file}")
    print("="*80)
