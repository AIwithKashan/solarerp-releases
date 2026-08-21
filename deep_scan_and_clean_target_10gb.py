import os
import time

user = r"C:\Users\Kashan Khan"
local_appdata = os.path.join(user, "AppData", "Local")
appdata = os.path.join(user, "AppData", "Roaming")
program_data = r"C:\ProgramData"
system_root = r"C:\Windows"

print("============================================================")
print("  DEEP SCAN & STORAGE PURGE FOR 7-10 GB TARGET (OMNI SAFE)  ")
print("============================================================")

now = time.time()
three_days = 3 * 86400

freed = 0
deleted = 0

# 1. Clean old conversation brain logs (> 3 days old, skipping current conversation)
brain_dir = os.path.join(user, ".gemini", "antigravity", "brain")
if os.path.exists(brain_dir):
    print(f"\n[+] Purging old conversation scratch logs in: {brain_dir}")
    for cid in os.listdir(brain_dir):
        if "db302fa2-17a1-46c1-b02f-f1eb5c401acf" in cid:
            continue
        cid_path = os.path.join(brain_dir, cid)
        if os.path.isdir(cid_path):
            try:
                mtime = os.path.getmtime(cid_path)
                if now - mtime > three_days:
                    for root, dirs, files in os.walk(cid_path, topdown=False):
                        for f in files:
                            fp = os.path.join(root, f)
                            try:
                                sz = os.path.getsize(fp)
                                os.remove(fp)
                                freed += sz
                                deleted += 1
                            except Exception:
                                pass
                        for d in dirs:
                            dp = os.path.join(root, d)
                            try:
                                os.rmdir(dp)
                            except Exception:
                                pass
            except Exception:
                pass

# 2. Clean browser profiles cache & media cache
chrome_profile = os.path.join(local_appdata, "Google", "Chrome", "User Data")
if os.path.exists(chrome_profile):
    print(f"\n[+] Purging Chrome Deep Caches: {chrome_profile}")
    for sub in ["Default\\Service Worker\\CacheStorage", "Default\\Service Worker\\ScriptCache", "Default\\GPUCache", "ShaderCache", "GrShaderCache"]:
        target_sub = os.path.join(chrome_profile, sub)
        if os.path.exists(target_sub):
            for root, dirs, files in os.walk(target_sub, topdown=False):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        os.remove(fp)
                        freed += sz
                        deleted += 1
                    except Exception:
                        pass
                for d in dirs:
                    dp = os.path.join(root, d)
                    try:
                        os.rmdir(dp)
                    except Exception:
                        pass

# 3. Clean Edge Deep Caches
edge_profile = os.path.join(local_appdata, "Microsoft", "Edge", "User Data")
if os.path.exists(edge_profile):
    print(f"\n[+] Purging Edge Deep Caches: {edge_profile}")
    for sub in ["Default\\Service Worker\\CacheStorage", "Default\\Service Worker\\ScriptCache", "Default\\GPUCache", "ShaderCache", "GrShaderCache"]:
        target_sub = os.path.join(edge_profile, sub)
        if os.path.exists(target_sub):
            for root, dirs, files in os.walk(target_sub, topdown=False):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        os.remove(fp)
                        freed += sz
                        deleted += 1
                    except Exception:
                        pass
                for d in dirs:
                    dp = os.path.join(root, d)
                    try:
                        os.rmdir(dp)
                    except Exception:
                        pass

# 4. Clean CapCut Cache
capcut_cache = os.path.join(local_appdata, "CapCut", "User Data", "Cache")
if os.path.exists(capcut_cache):
    print(f"\n[+] Purging CapCut effect/media cache: {capcut_cache}")
    for root, dirs, files in os.walk(capcut_cache, topdown=False):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                os.remove(fp)
                freed += sz
                deleted += 1
            except Exception:
                pass
        for d in dirs:
            dp = os.path.join(root, d)
            try:
                os.rmdir(dp)
            except Exception:
                pass

# 5. Clean OneDrive logs & cache
onedrive_cache = os.path.join(local_appdata, "Microsoft", "OneDrive")
if os.path.exists(onedrive_cache):
    for sub in ["logs", "setup\\logs"]:
        target_sub = os.path.join(onedrive_cache, sub)
        if os.path.exists(target_sub):
            for root, dirs, files in os.walk(target_sub, topdown=False):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        os.remove(fp)
                        freed += sz
                        deleted += 1
                    except Exception:
                        pass
                for d in dirs:
                    dp = os.path.join(root, d)
                    try:
                        os.rmdir(dp)
                    except Exception:
                        pass

gb = freed / (1024**3)
mb = freed / (1024**2)
print("\n" + "="*60)
print(f"DEEP PURGE COMPLETE!")
print(f"Total Storage Freed: {gb:.2f} GB ({mb:.1f} MB)")
print(f"Total Files Deleted: {deleted}")
print("="*60)
