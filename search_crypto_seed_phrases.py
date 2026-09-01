import os
import re
import sys

print("=== DEEP SCAN FOR BINANCE WALLET / SEED PHRASE / PASS.TXT ===")

search_roots = [
    "E:\\",
    r"C:\Users\Kashan Khan\Desktop",
    r"C:\Users\Kashan Khan\Documents",
    r"C:\Users\Kashan Khan\Downloads",
    r"C:\Users\Kashan Khan\Pictures",
    r"C:\Users\Kashan Khan\Videos",
    r"C:\Users\Kashan Khan\AppData\Local\Temp",
    r"C:\Users\Kashan Khan\AppData\Roaming",
    r"C:\Users\Kashan Khan\.gemini",
    r"C:\$Recycle.Bin",
    r"E:\$Recycle.Bin"
]

skip_dirs = {"node_modules", ".git", ".venv", "venv", "__pycache__", "dist", "build", "resources", "AndroidDevTools", "locales", "Packages"}

crypto_keywords = ["binance", "seed", "mnemonic", "secret phrase", "recovery phrase", "wallet", "trust", "metamask", "private key", "pass.txt"]

found_matches = []

# Standard BIP-39 12-word regex pattern
bip39_pattern = re.compile(r'\b(?:[a-z]{3,12}\s+){11,23}[a-z]{3,12}\b', re.IGNORECASE)

for root_dir in search_roots:
    if not os.path.exists(root_dir):
        continue
    print(f"\n[+] Searching: {root_dir}")
    try:
        for root, dirs, files in os.walk(root_dir, topdown=True):
            dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
            for f in files:
                f_lower = f.lower()
                fp = os.path.join(root, f)
                
                # Check 1: Filename match
                if "pass" in f_lower or "seed" in f_lower or "wallet" in f_lower or "phrase" in f_lower or "crypto" in f_lower or "binance" in f_lower or f_lower.endswith(".txt") or f_lower.endswith(".bak") or f_lower.endswith(".json") or f_lower.endswith(".env"):
                    try:
                        sz = os.path.getsize(fp)
                        if 1 <= sz <= 2000000: # Files under 2 MB
                            with open(fp, "r", encoding="utf-8", errors="ignore") as file:
                                text = file.read()
                                text_lower = text.lower()
                                
                                # Check for crypto keywords or 12/24 word patterns
                                if any(kw in text_lower for kw in crypto_keywords) or bip39_pattern.search(text):
                                    # Ignore common npm/package code
                                    if "licence" in text_lower or "copyright" in text_lower and "binance" not in text_lower:
                                        continue
                                    found_matches.append((fp, sz))
                                    print(f"    ⭐ SEED/WALLET MATCH FOUND: {fp:<80} | {sz} bytes")
                    except Exception:
                        pass
    except Exception as e:
        print(f"    Error scanning {root_dir}: {e}")

print("\n" + "="*80)
print(f"CRYPTO SEED PHRASE SCAN COMPLETE. Total potential files found: {len(found_matches)}")
print("="*80)

for fp, sz in found_matches:
    print(f"\nFile: {fp}")
    try:
        with open(fp, "r", encoding="utf-8", errors="ignore") as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            print("--- CONTENT PREVIEW ---")
            for line in lines[:15]:
                print("  ", line)
            print("--- END PREVIEW ---")
    except Exception as e:
        print("Error reading file:", e)
