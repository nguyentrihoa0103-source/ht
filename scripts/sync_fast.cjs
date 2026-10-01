#!/usr/bin/env node
/**
 * LEESIN COMIC - ĐỒNG BỘ ẢNH CHUẨN TỪ LAZYTEAM.SITE SANG MYSQL / DATA_STORE
 * Chạy cực nhanh, tự động dò link chuẩn (hỗ trợ cả /12.html, /chap-12.html, ngoại truyện)
 * Usage:
 *   node scripts/sync_fast.cjs --missing-only
 *   node scripts/sync_fast.cjs --slug boredom-alert
 *   node scripts/sync_fast.cjs --limit 10
 */

const fs = require('fs');
const path = require('path');

const DATA_STORE_PATH = path.resolve(__dirname, '../data_store.json');
const SQL_OUTPUT_PATH = path.resolve(__dirname, '../public/sql_parts/lazyteam_synced_chapters.sql');
const SOURCE_BASE_URL = 'https://lazyteam.site';

// Đọc tham số dòng lệnh
const args = process.argv.slice(2);
const isMissingOnly = args.includes('--missing-only');
const slugArg = args.find((a, i) => args[i - 1] === '--slug' || a.startsWith('--slug='))?.replace('--slug=', '');
const limitArg = parseInt(args.find((a, i) => args[i - 1] === '--limit' || a.startsWith('--limit='))?.replace('--limit=', '') || '0', 10);

async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://lazyteam.site/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function extractImagesFromHtml(html) {
  if (!html) return [];
  const images = [];
  const seen = new Set();
  
  // Quét thẻ ảnh trong content_view_chap hoặc ảnh truyện
  const regex = /(?:data-src|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let src = m[1].trim();
    if (!src || src.startsWith('data:') || src.includes('/skin/') || src.includes('logo') || src.includes('loadx-min.gif') || src.includes('user.png')) {
      continue;
    }
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = SOURCE_BASE_URL + src;
    
    if (src.includes('uploads/minh_hoa') || src.includes('tachserver.site') || src.includes('.webp') || src.includes('.jpg') || src.includes('.png')) {
      if (!seen.has(src)) {
        seen.add(src);
        images.push(src);
      }
    }
  }
  return images;
}

function extractNumber(str) {
  if (!str) return null;
  const m = str.match(/(?:chap(?:ter)?|chương|\/|^)\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

// Helper tự động cập nhật trực tiếp vào MySQL nếu có lệnh mysql trên hệ thống
function tryExecuteMysql(sqlLine) {
  try {
    const { execSync } = require('child_process');
    const escaped = sqlLine.trim().replace(/"/g, '\\"');
    execSync(`mysql -u leesinco_user -p'LeesinComic@2026' -h localhost leesinco_manga -e "${escaped}"`, { stdio: 'ignore' });
  } catch {}
}

function saveStoreCheckpoints(store) {
  const data = JSON.stringify(store, null, 2);
  try { fs.writeFileSync(DATA_STORE_PATH, data, 'utf8'); } catch {}
  
  // Lưu cả vào dist/data_store.json nếu website đang chạy từ thư mục dist
  const distPath = path.resolve(__dirname, '../dist/data_store.json');
  try {
    if (fs.existsSync(path.dirname(distPath))) {
      fs.writeFileSync(distPath, data, 'utf8');
    }
  } catch {}
}

async function main() {
  console.log(`\n============================================================`);
  console.log(`🚀 BẮT ĐẦU ĐỒNG BỘ ẢNH TỪ LAZYTEAM.SITE (BẢN TỐI ƯU SIÊU TỐC)`);
  console.log(`============================================================`);

  if (!fs.existsSync(DATA_STORE_PATH)) {
    console.error(`❌ Không tìm thấy file data_store.json tại: ${DATA_STORE_PATH}`);
    process.exit(1);
  }

  const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
  let comics = store.comics || [];

  if (slugArg) {
    comics = comics.filter(c => c.slug === slugArg);
  }
  if (limitArg > 0) {
    comics = comics.slice(0, limitArg);
  }

  console.log(`📂 Tổng số truyện sẽ duyệt: ${comics.length}`);

  let totalUpdatedComics = 0;
  let totalUpdatedChapters = 0;
  let totalSyncedImages = 0;

  // Đảm bảo thư mục lưu SQL tồn tại
  const sqlDir = path.dirname(SQL_OUTPUT_PATH);
  if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir, { recursive: true });

  for (let idx = 0; idx < comics.length; idx++) {
    const comic = comics[idx];
    const slug = comic.slug;
    const chapters = comic.chapters || [];
    
    // Tìm các chapter chưa có ảnh
    const missingChaps = chapters.filter(ch => !ch.images || ch.images.length === 0);
    
    if (isMissingOnly && missingChaps.length === 0) {
      continue;
    }

    const targetChaps = isMissingOnly ? missingChaps : chapters;
    console.log(`\n[${idx + 1}/${comics.length}] 📚 "${comic.title}" (${targetChaps.length} chương cần lấy ảnh)`);

    // 1. Tải trang chi tiết Lazyteam để lấy danh sách link chương chuẩn thực tế
    let comicPathSlug = slug;
    const sample = chapters.find(ch => ch.link)?.link;
    if (sample) {
      const matchSlug = sample.match(/\/truyen-tranh\/([^/]+)\//);
      if (matchSlug) comicPathSlug = matchSlug[1];
    }

    let detailHtml = await fetchHtml(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}.html`);
    if (!detailHtml && comicPathSlug !== slug) {
      detailHtml = await fetchHtml(`${SOURCE_BASE_URL}/truyen-tranh/${encodeURIComponent(slug)}.html`);
    }

    const scrapedList = [];
    if (detailHtml) {
      const chapRegex = /<div class=["']chap_name["']>\s*<a[^>]+href=["']([^"']+)["'][^>]*title=["']?([^"'>]*)["']?[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = chapRegex.exec(detailHtml)) !== null) {
        const rawHref = m[1].trim();
        const fullHref = rawHref.startsWith('http') ? rawHref : `${SOURCE_BASE_URL}${rawHref.startsWith('/') ? rawHref : '/' + rawHref}`;
        const rawTitle = (m[2] || m[3] || '').replace(/<[^>]+>/g, '').trim();
        const num = extractNumber(rawHref) || extractNumber(rawTitle);
        scrapedList.push({ href: rawHref, url: fullHref, title: rawTitle, num });
      }
    }

    let comicUpdated = 0;

    for (let cIdx = 0; cIdx < targetChaps.length; cIdx++) {
      const chap = targetChaps[cIdx];
      const chapNum = chap.chapterNumber;
      const numStr = String(chapNum);
      const numHyphen = numStr.replace('.', '-');

      // Tạo các link ứng viên
      const candidates = [];

      // Ưu tiên 1: Link từ trang chi tiết cào được
      for (const sc of scrapedList) {
        if (sc.num === chapNum || sc.href.endsWith(`/${numStr}.html`) || sc.href.endsWith(`/chap-${numStr}.html`) || sc.href.includes(`-${numHyphen}.html`) || sc.href.includes(`/${numHyphen}.html`)) {
          candidates.push(sc.url);
        }
      }

      // Ưu tiên 2: Link có sẵn trong chap.link
      if (chap.link) {
        let b = chap.link.startsWith('http') ? chap.link.replace(/https?:\/\/(?:www\.)?(?:leesincomic\.com|lazyteam\.site)/, SOURCE_BASE_URL) : `${SOURCE_BASE_URL}${chap.link.startsWith('/') ? chap.link : '/' + chap.link}`;
        candidates.push(b);
        if (b.includes('/chap-')) candidates.push(b.replace('/chap-', '/'));
      }

      // Ưu tiên 3: Quy luật URL thông dụng của Lazyteam
      candidates.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/${numStr}.html`);
      candidates.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/chap-${numStr}.html`);
      if (numStr !== numHyphen) {
        candidates.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/ngoai-truyen-${numHyphen}.html`);
        candidates.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/${numHyphen}.html`);
      }

      const uniqueUrls = [...new Set(candidates)];
      let foundImages = [];
      let successUrl = null;

      for (const u of uniqueUrls) {
        const html = await fetchHtml(u);
        const imgs = extractImagesFromHtml(html);
        if (imgs.length > 0) {
          foundImages = imgs;
          successUrl = u;
          break;
        }
      }

      if (foundImages.length > 0) {
        chap.images = foundImages;
        chap.link = successUrl.replace(SOURCE_BASE_URL, '');
        comicUpdated++;
        totalUpdatedChapters++;
        totalSyncedImages += foundImages.length;
        console.log(`   ✅ Chap ${chapNum}: Lấy thành công ${foundImages.length} ảnh (${cIdx + 1}/${targetChaps.length})`);
        
        // Ghi nối tiếp câu lệnh SQL vào file để có thể nạp ngay
        const sqlSafeImages = JSON.stringify(foundImages).replace(/'/g, "\\'");
        const sqlSafeId = String(chap.id).replace(/'/g, "\\'");
        const sqlLine = `UPDATE \`chapters\` SET \`images\` = '${sqlSafeImages}' WHERE \`id\` = '${sqlSafeId}';\n`;
        fs.appendFileSync(SQL_OUTPUT_PATH, sqlLine, 'utf8');
        // Tự động đẩy thẳng vào MySQL trên VPS (nếu lệnh mysql có sẵn)
        tryExecuteMysql(sqlLine);
      } else {
        console.log(`   ❌ Chap ${chapNum}: Không tìm thấy ảnh`);
      }

      // Nghỉ 150ms để không bị Cloudflare chặn
      await new Promise(r => setTimeout(r, 150));
    }

    if (comicUpdated > 0) {
      totalUpdatedComics++;
      // Lưu checkpoint vào data_store.json và dist/data_store.json
      saveStoreCheckpoints(store);
    }
  }

  console.log(`\n============================================================`);
  console.log(`🎉 HOÀN TẤT ĐỒNG BỘ!`);
  console.log(`- Số truyện cập nhật: ${totalUpdatedComics}`);
  console.log(`- Số chương nạp ảnh:  ${totalUpdatedChapters}`);
  console.log(`- Tổng số link ảnh:   ${totalSyncedImages}`);
  console.log(`- File SQL đã xuất:   ${SQL_OUTPUT_PATH}`);
  console.log(`============================================================\n`);
}

main().catch(err => console.error('Lỗi thực thi:', err));
