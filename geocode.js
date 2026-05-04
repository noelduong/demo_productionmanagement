/**
 * Geocode a Vietnamese address to latitude/longitude coordinates
 * Uses Nominatim (OpenStreetMap) - FREE, no API key required
 *
 * Usage: node geocode.js "161D/104/23G lạc long quân, phường bình thới, hồ chí minh"
 */

const https = require('https');

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    // Build the Nominatim API URL
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=vn`;

    const options = {
      headers: {
        'User-Agent': 'Polomanor-Geocoder/1.0 (contact@example.com)'
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Debug raw response if parse fails
        if (data.trim().startsWith('Access') || data.trim().startsWith('<!')) {
          reject(new Error('Nominatim API chặn yêu cầu (có thể do rate limit). Đang thử API dự phòng...'));
          return;
        }
        try {
          const results = JSON.parse(data);
          if (results && results.length > 0) {
            const result = results[0];
            resolve({
              address: result.display_name,
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              boundingBox: result.boundingbox
            });
          } else {
            reject(new Error('Không tìm thấy tọa độ cho địa chỉ này.'));
          }
        } catch (err) {
          console.log('Raw response:', data.substring(0, 200));
          reject(new Error('Lỗi parse phản hồi từ server: ' + err.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('Lỗi kết nối: ' + err.message));
    });
  });
}

// Main execution
async function main() {
  // Lấy địa chỉ từ command line arguments, hoặc dùng mặc định
  const inputAddress = process.argv[2] || '161D/104/23G lạc long quân, phường bình thới, hồ chí minh';

  console.log('============================================');
  console.log('  GEOCODING - Chuyển địa chỉ → Tọa độ');
  console.log('============================================\n');
  console.log('Địa chỉ cần tìm:');
  console.log('  "' + inputAddress + '"\n');
  console.log('Đang gửi yêu cầu đến Nominatim (OpenStreetMap)...\n');

  try {
    const result = await geocodeAddress(inputAddress);

    console.log('✅ TÌM THẤY TỌA ĐỘ!\n');
    console.log('---------------------------------------------');
    console.log('  Vĩ độ (Latitude) : ' + result.latitude);
    console.log('  Kinh độ (Longitude): ' + result.longitude);
    console.log('---------------------------------------------\n');
    console.log('Địa chỉ đầy đủ từ Nominatim:');
    console.log('  ' + result.address + '\n');
    console.log('Google Maps URL:');
    console.log('  https://www.google.com/maps?q=' + result.latitude + ',' + result.longitude + '\n');
    console.log('OpenStreetMap URL:');
    console.log('  https://www.openstreetmap.org/?mlat=' + result.latitude + '&mlon=' + result.longitude + '#map=18/' + result.latitude + '/' + result.longitude + '\n');

  } catch (err) {
    console.error('❌ LỖI: ' + err.message + '\n');
    process.exit(1);
  }
}

main();

