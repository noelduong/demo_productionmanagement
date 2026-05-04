#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chuyển địa chỉ tiếng Việt thành tọa độ (lat/lng)
Sử dụng Nominatim (OpenStreetMap) - MIỄN PHÍ, không cần API key

Cách dùng:
    python geocode.py "161D/104/23G lạc long quân, phường bình thới, hồ chí minh"
"""

import urllib.request
import urllib.parse
import json
import sys
import ssl


def geocode_address(address: str):
    """Gọi Nominatim API để lấy tọa độ từ địa chỉ."""
    encoded = urllib.parse.quote(address)
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded}&limit=1&countrycodes=vn"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Polomanor-Geocoder/1.0 (contact@polomanor.vn)",
            "Accept-Language": "vi",
        }
    )

    # Tạo SSL context an toàn
    ctx = ssl.create_default_context()

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.reason}")
        print(f"   Có thể API đã chặn yêu cầu. Hãy thử mở file test-geocode.html trong trình duyệt.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        sys.exit(1)

    if not data:
        print("❌ Không tìm thấy tọa độ cho địa chỉ này.")
        sys.exit(1)

    result = data[0]
    return {
        "address": result["display_name"],
        "lat": float(result["lat"]),
        "lon": float(result["lon"]),
    }


def main():
    address = sys.argv[1] if len(sys.argv) > 1 else "161D/104/23G lạc long quân, phường bình thới, hồ chí minh"

    print("=" * 50)
    print("  GEOCODING - Chuyển địa chỉ → Tọa độ")
    print("=" * 50)
    print()
    print(f"Địa chỉ cần tìm:\n  \"{address}\"")
    print()
    print("Đang gửi yêu cầu đến Nominatim (OpenStreetMap)...")
    print()

    result = geocode_address(address)

    print("✅ TÌM THẤY TỌA ĐỘ!\n")
    print("-" * 46)
    print(f"  Vĩ độ  (Latitude) :  {result['lat']:.6f}")
    print(f"  Kinh độ (Longitude): {result['lon']:.6f}")
    print("-" * 46)
    print()
    print(f"Địa chỉ đầy đủ:\n  {result['address']}\n")
    print("Google Maps URL:")
    print(f"  https://www.google.com/maps?q={result['lat']},{result['lon']}\n")
    print("OpenStreetMap URL:")
    print(f"  https://www.openstreetmap.org/?mlat={result['lat']}&mlon={result['lon']}#map=18/{result['lat']}/{result['lon']}\n")


if __name__ == "__main__":
    main()

