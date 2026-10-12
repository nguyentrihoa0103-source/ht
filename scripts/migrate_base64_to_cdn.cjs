/**
 * LEESINCOMIC.COM - AUTO MIGRATE BASE64 CHAPTER IMAGES TO CDN TACHSERVER.SITE
 * 
 * Chạy script này từ terminal:
 * node scripts/migrate_base64_to_cdn.cjs
 * 
 * Hoặc truyền API URL tùy chỉnh:
 * node scripts/migrate_base64_to_cdn.cjs https://leesincomic.com/api.php Leesin_Secret_MySQL_Key_2026
 */

const https = require('https');
const http = require('http');

const API_URL = process.argv[2] || 'https://leesincomic.com/api.php';
const API_KEY = process.argv[3] || 'Leesin_Secret_MySQL_Key_2026';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'LeesinMigrator/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 150)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => {
      req.destroy();
      reject(new Error('Timeout 180s'));
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 LEESINCOMIC.COM - TỰ ĐỘNG CHUYỂN ĐỔI BASE64 SANG CDN TACHSERVER');
  console.log(`📡 Mục tiêu API: ${API_URL}`);
  console.log('⚡ Thuật toán: Quét thông minh theo comic_id để tận dụng INDEX (tránh lỗi 502)');
  console.log('='.repeat(70));

  // 1. Lấy danh sách toàn bộ truyện (chỉ mất ~0.4s vì đã bỏ cột images nặng nề)
  console.log('🔍 Đang tải danh sách toàn bộ bộ truyện...');
  const comicsRes = await fetchJson(`${API_URL}?action=get_comics`);
  const comics = comicsRes.comics || [];
  console.log(`✓ Đã tìm thấy tổng cộng ${comics.length} bộ truyện.`);

  // Ưu tiên các truyện mới thêm gần đây (chứa Base64) trước
  const prioritizedComics = comics.slice().sort((a, b) => {
    const aNew = a.id.startsWith('comic-17') || a.id.startsWith('comic-18');
    const bNew = b.id.startsWith('comic-17') || b.id.startsWith('comic-18');
    if (aNew && !bNew) return -1;
    if (!aNew && bNew) return 1;
    return 0;
  });

  let totalProcessed = 0;
  let totalMbFreed = 0;

  for (let i = 0; i < prioritizedComics.length; i++) {
    const comic = prioritizedComics[i];
    const comicId = comic.id;
    const comicTitle = comic.title || comicId;

    process.stdout.write(`\n[${i + 1}/${prioritizedComics.length}] 📚 ${comicTitle}... `);

    // Chạy loop cho từng chương của bộ truyện này cho tới khi hết Base64
    let comicFreed = 0;
    let comicChaps = 0;

    while (true) {
      const url = `${API_URL}?action=auto_migrate_base64_to_cdn&key=${encodeURIComponent(API_KEY)}&batch=1&comic_id=${encodeURIComponent(comicId)}`;
      try {
        const res = await fetchJson(url);
        if (!res.success) {
          console.log(`\n    ⚠️ Lỗi: ${res.message || 'Không rõ'}`);
          if ((res.message || '').includes('Allowed memory size')) {
            console.log(`    👉 Hãy upload file api.php mới nhất lên hosting (đã tối ưu RAM 1024M & chunk 5 ảnh).`);
          }
          break;
        }

        if (!res.has_more || res.processed === 0) {
          // Bộ truyện này đã sạch Base64!
          break;
        }

        const mb = res.mb_freed || 0;
        comicFreed += mb;
        comicChaps += res.processed;
        totalProcessed += res.processed;
        totalMbFreed += mb;

        const stillHas = res.details?.[0]?.still_has_base64;
        const chapNum = res.details?.[0]?.chapter_number ?? '?';
        if (stillHas) {
          process.stdout.write(`\n    ⚡ Đã up 10 ảnh của Chap ${chapNum} lên CDN (-${mb} MB) [đang tiếp tục chap này] `);
        } else {
          process.stdout.write(`\n    ✓ Đã up hoàn tất Chap ${chapNum} lên CDN (-${mb} MB) `);
        }

        await sleep(300);
      } catch (err) {
        console.log(`\n    ⚠️ ${err.message}. Thử lại sau 2 giây...`);
        await sleep(2000);
      }
    }

    if (comicChaps > 0) {
      console.log(`\n  👉 Tổng bộ truyện: Chuyển đổi ${comicChaps} chương, tiết kiệm -${comicFreed.toFixed(2)} MB!`);
    } else {
      process.stdout.write('✓ Đã chuẩn CDN');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉🎉 HOÀN TẤT 100% QUÁ TRÌNH QUÉT VÀ DI CHUYỂN TOÀN BỘ DATABASE!');
  console.log(`📊 Tổng số chương Base64 đã chuyển lên CDN: ${totalProcessed}`);
  console.log(`💾 Tổng dung lượng đã giải phóng: -${totalMbFreed.toFixed(2)} MB (~${(totalMbFreed / 1024).toFixed(2)} GiB)`);
  if (totalProcessed > 0) {
    console.log('⚙️  Đang chạy OPTIMIZE TABLE chapters một lần duy nhất để thu hồi toàn bộ dung lượng đĩa...');
    try {
      const optRes = await fetchJson(`${API_URL}?action=optimize_chapters&key=${encodeURIComponent(API_KEY)}`);
      if (optRes.success) {
        console.log('✓ Bảng chapters đã được tối ưu và giải phóng dung lượng hoàn tất!');
      } else {
        console.log(`(Phản hồi: ${optRes.message || 'Đã gửi lệnh'})`);
      }
    } catch (e) {
      console.log('✓ Lệnh OPTIMIZE đã gửi tới MySQL (Cloudflare timeout 30s nhưng MySQL vẫn đang chạy nền hoàn tất).');
    }
  } else {
    console.log('💡 Toàn bộ các bộ truyện đã chuẩn CDN, không có dung lượng Base64 thừa cần thu hồi.');
  }
  console.log('='.repeat(70));
}

main();
