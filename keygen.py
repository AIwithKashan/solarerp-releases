import sys
import hmac
import hashlib
import os
import secrets

SECRET_SALT = b'AIwithKashan_SolarERP_Secret_2026'

DURATION_MAP = {
    '1': ('1M', '1 Minute (Testing)'),
    '2': ('1H', '1 Hour (Live Demo)'),
    '3': ('1D', '1 Day (24-Hour Pass)'),
    '4': ('7D', '7 Days (Trial Week)'),
    '5': ('30D', '30 Days (1 Month Subscription)'),
    '6': ('180D', '180 Days (6 Months License)'),
    '7': ('365D', '365 Days (1 Year Annual License)'),
    '8': ('LIFE', 'Lifetime Unlimited Access (Full Purchase)'),
}

def generate_key(hwid: str, type_code: str = 'LIFE', custom_nonce: str = None) -> str:
    code = type_code.upper().strip()
    nonce = (custom_nonce or secrets.token_hex(2)).upper().strip()
    message = f"{hwid.strip().upper()}_{code}_{nonce}".encode('utf-8')
    h = hmac.new(SECRET_SALT, message, hashlib.sha256).hexdigest().upper()
    return f"KEY-{code}-{nonce}-{h[:4]}-{h[4:8]}"

def main():
    print("=" * 60)
    print("  SolarERP Master License Key Generator (CLI)")
    print("  AIwithKashan | Helpline: 0334-1911680")
    print("=" * 60)

    if len(sys.argv) >= 2:
        hwid = sys.argv[1].strip().upper()
        type_code = sys.argv[2].strip().upper() if len(sys.argv) >= 3 else 'LIFE'
    else:
        hwid = input("\nEnter Client Hardware ID (e.g. HWID-F1A6-916F-E041): ").strip().upper()
        if not hwid:
            print("Error: HWID cannot be empty.")
            return

        print("\nSelect License Duration:")
        for k, v in DURATION_MAP.items():
            print(f"  [{k}] {v[1]}")
        choice = input("\nSelect Option [1-8] (Default: 8 - Lifetime): ").strip() or '8'
        type_code = DURATION_MAP.get(choice, ('LIFE', 'Lifetime'))[0]

    key = generate_key(hwid, type_code)

    print("\n" + "-" * 60)
    print(f"  Hardware ID:     {hwid}")
    print(f"  License Type:    {type_code}")
    print(f"  ACTIVATION KEY:  {key}")
    print("-" * 60)
    print("\n[NOTE] This key is single-use and cryptographically tied to this HWID.")

if __name__ == '__main__':
    main()
