import os
import subprocess

print("=== ATTEMPTING HIBERNATION DISABLE ===")
try:
    res = subprocess.run(["powercfg", "/hibernate", "off"], capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    print("STDERR:", res.stderr)
    print("RETURNCODE:", res.returncode)
except Exception as e:
    print("EXCEPTION:", e)
