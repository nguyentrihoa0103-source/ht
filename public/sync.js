#!/usr/bin/env node

/**
 * ==============================================================================
 * LEESIN COMIC - ĐỒNG BỘ DỮ LIỆU ẢNH TỪ LAZYTEAM.SITE SANG LEESINCOMIC.COM
 * File: scripts/sync_images_from_lazyteam.cjs
 *
 * MỤC ĐÍCH:
 * Script độc lập cào và chuẩn hoá toàn bộ dữ liệu ảnh các chương từ lazyteam.site
 * sang leesincomic.com (data_store.json, SQL và tuỳ chọn tải ảnh về máy).
 *
 * ĐẶC TÍNH:
 * - Độc lập 100%, KHÔNG can thiệp vào bất kỳ file nào trong src/ hay public/api.php.
 * - Tự động đối chiếu slug, tìm comic & chapter tương ứng trên lazyteam.site.
 * - Trích xuất danh sách link ảnh từ data-src / data-original trong content_view_chap.
 * - Chuẩn hoá toàn bộ link: chuyển đổi các đường dẫn /uploads/ hoặc lazyteam.site
 *   sang https://leesincomic.com/uploads/ và CDN https://tachserver.site.
 * - Lọc bỏ toàn bộ ảnh load spinner (loadx-min.gif, load.gif), logo, icon quảng cáo.
 * - Hỗ trợ lưu trực tiếp vào data_store.json, xuất file SQL cho MySQL, và tuỳ chọn
 *   tải file ảnh vật lý về thư mục public/uploads/ nếu muốn tự lưu trữ.
 *
 * CÁCH SỬ DỤNG:
 *   node scripts/sync_images_from_lazyteam.cjs --help
 *   node scripts/sync_images_from_lazyteam.cjs --slug tac-gia-xx
 *   node scripts/sync_images_from_lazyteam.cjs --limit 5
 *   node scripts/sync_images_from_lazyteam.cjs --missing-only
 *   node scripts/sync_images_from_lazyteam.cjs --export-sql
 *   node scripts/sync_images_from_lazyteam.cjs --download
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');
const PUBLIC_DATA_STORE_PATH = path.join(ROOT_DIR, 'public', 'data_store.json');
const DEFAULT_SQL_EXPORT_PATH = path.join(ROOT_DIR, 'public', 'sql_parts', 'lazyteam_synced_chapters.sql');

const SOURCE_BASE_URL = 'https://lazyteam.site';
const TARGET_DOMAIN = 'leesincomic.com';
const TARGET_CDN = 'https://tachserver.site';

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
  'Referer': `${SOURCE_BASE_URL}/`,
  'Connection': 'keep-alive',
};

// =============================================================================
// CLI ARGUMENT PARSER
// =============================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    slug: null,              // Chỉ xử lý 1 truyện theo slug
    limit: null,             // Giới hạn số truyện cần xử lý
    start: 0,                // Bắt đầu từ vị trí index
    missingOnly: true,       // Mặc định: chỉ cào chapter chưa có ảnh
    force: false,            // Ghi đè cả chapter đã có ảnh
    exportSql: true,         // Xuất file SQL update
    sqlPath: DEFAULT_SQL_EXPORT_PATH,
    downloadFiles: false,    // Tải file ảnh vật lý về public/uploads/
    downloadDir: path.join(ROOT_DIR, 'public', 'uploads', 'chapters'),
    concurrency: 3,          // Số chapter cào đồng thời
    delayMs: 250,            // Độ trễ giữa các request (ms)
    timeoutMs: 15000,        // Timeout request (ms)
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--slug' || arg === '-s') {
      options.slug = args[++i];
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--start') {
      options.start = parseInt(args[++i], 10);
    } else if (arg === '--all') {
      options.missingOnly = false;
    } else if (arg === '--missing-only') {
      options.missingOnly = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
      options.missingOnly = false;
    } else if (arg === '--export-sql') {
      options.exportSql = true;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.sqlPath = path.resolve(args[++i]);
      }
    } else if (arg === '--no-sql') {
      options.exportSql = false;
    } else if (arg === '--download' || arg === '--download-files') {
      options.downloadFiles = true;
    } else if (arg === '--download-dir') {
      options.downloadDir = path.resolve(args[++i]);
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = Math.max(1, parseInt(args[++i], 10) || 3);
    } else if (arg === '--delay' || arg === '-d') {
      options.delayMs = Math.max(0, parseInt(args[++i], 10) || 200);
    } else if (arg === '--timeout') {
      options.timeoutMs = Math.max(1000, parseInt(args[++i], 10) || 15000);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
===============================================================================
📖 LEESIN COMIC - ĐỒNG BỘ DỮ LIỆU ẢNH TỪ LAZYTEAM.SITE SANG LEESINCOMIC.COM
===============================================================================

LỆNH CƠ BẢN:
  node scripts/sync_images_from_lazyteam.cjs [tuỳ_chọn]

CÁC TUỲ CHỌN:
  --slug, -s <comic-slug>   Xử lý duy nhất 1 truyện theo slug.
                            Ví dụ: --slug tac-gia-xx
                                   --slug nhiem-vu-hongsil

  --limit, -l <number>      Giới hạn số lượng truyện cần xử lý trong phiên chạy.
                            Ví dụ: --limit 10

  --start <number>          Bỏ qua N truyện đầu tiên (dùng để chạy tiếp dở dang).
                            Ví dụ: --start 50 --limit 50

  --missing-only            (Mặc định) Chỉ cào và bù ảnh cho các chapter CHƯA CÓ ẢNH.
                            Giúp tiết kiệm băng thông và chạy nhanh nhất.

  --all                     Xử lý tất cả các truyện không lọc.

  --force, -f               Cào lại và GHI ĐÈ toàn bộ ảnh kể cả chapter đã có ảnh.

  --export-sql [duong_dan]  Xuất câu lệnh SQL (INSERT ... ON DUPLICATE KEY UPDATE)
                            ra file để nạp trực tiếp vào MySQL.
                            Mặc định: public/sql_parts/lazyteam_synced_chapters.sql

  --no-sql                  Không xuất file SQL.

  --download                Tải các file ảnh thực tế về đĩa cứng server
                            (thư mục public/uploads/chapters/) và đổi link sang cục bộ.

  --concurrency, -c <num>   Số chapter cào đồng thời (mặc định: 3, tối đa: 10).

  --delay, -d <ms>          Thời gian nghỉ giữa các lượt request ms (mặc định: 250ms).

  --help, -h                Hiển thị hướng dẫn này.

VÍ DỤ TIÊU BIỂU:
  1. Thử nghiệm cào ảnh cho 1 truyện:
     node scripts/sync_images_from_lazyteam.cjs --slug tac-gia-xx

  2. Cào bù ảnh cho 10 truyện còn thiếu ảnh:
     node scripts/sync_images_from_lazyteam.cjs --limit 10

  3. Cào toàn bộ chapter còn thiếu ảnh và tạo file SQL nạp MySQL:
     node scripts/sync_images_from_lazyteam.cjs --missing-only --export-sql

  4. Cào 1 truyện và tải toàn bộ ảnh về máy:
     node scripts/sync_images_from_lazyteam.cjs --slug tac-gia-xx --download
===============================================================================
`);
}

// =============================================================================
// HTTP NETWORK HELPERS
// =============================================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(targetUrl, timeoutMs = 15000, retries = 2) {
  return new Promise((resolve) => {
    let urlObj;
    try {
      urlObj = new URL(targetUrl);
    } catch (e) {
      resolve({ ok: false, status: 0, text: '', error: 'Invalid URL' });
      return;
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: REQUEST_HEADERS,
      timeout: timeoutMs,
    };

    const req = client.request(reqOptions, (res) => {
      // Hỗ trợ redirect (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, targetUrl).toString();
        }
        res.resume();
        fetchUrl(redirectUrl, timeoutMs, retries).then(resolve);
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: data,
          headers: res.headers,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) {
        sleep(500).then(() => fetchUrl(targetUrl, timeoutMs, retries - 1).then(resolve));
      } else {
        resolve({ ok: false, status: 408, text: '', error: 'Timeout' });
      }
    });

    req.on('error', (err) => {
      if (retries > 0) {
        sleep(500).then(() => fetchUrl(targetUrl, timeoutMs, retries - 1).then(resolve));
      } else {
        resolve({ ok: false, status: 0, text: '', error: err.message });
      }
    });

    req.end();
  });
}

function downloadBinaryFile(fileUrl, destPath, timeoutMs = 25000) {
  return new Promise((resolve) => {
    let urlObj;
    try {
      urlObj = new URL(fileUrl);
    } catch {
      resolve(false);
      return;
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.get(fileUrl, { headers: REQUEST_HEADERS, timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redir = res.headers.location;
        if (!redir.startsWith('http')) redir = new URL(redir, fileUrl).toString();
        res.resume();
        downloadBinaryFile(redir, destPath, timeoutMs).then(resolve);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        resolve(false);
        return;
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });

      fileStream.on('error', () => {
        try { fs.unlinkSync(destPath); } catch {}
        resolve(false);
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// =============================================================================
// URL & TEXT NORMALIZERS
// =============================================================================
function cleanSlug(str) {
  if (!str) return '';
  return str.toLowerCase().trim()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Trích xuất số thứ tự chapter chính xác từ href và title
 * Ví dụ:
 *  - /truyen-tranh/nhiem-vu-hongsil/54-4.html -> 54.4
 *  - /truyen-tranh/tac-gia-xx/chap-41--end.html -> 41
 *  - NHIỆM VỤ HONGSIL 54.4 -> 54.4
 *  - Chap 1 -> 1
 */
function extractChapterNumber(href, rawTitle) {
  const cleanTitle = (rawTitle || '').replace(/<[^>]+>/g, '').trim();

  // 1. Phân đoạn số có phần thập phân: ví dụ 54-4.html -> 54.4
  const subHref = href.match(/\/([0-9]+)-([0-9]+)\.html/i);
  if (subHref) {
    return parseFloat(`${subHref[1]}.${subHref[2]}`);
  }

  // 2. Tìm số thập phân trong title (54.4, 1.5, 0.5)
  const titleDot = cleanTitle.match(/(?:chap(?:ter)?|chương|\b)\s*([0-9]+\.[0-9]+)/i) ||
                   cleanTitle.match(/([0-9]+\.[0-9]+)/);
  if (titleDot) {
    return parseFloat(titleDot[1]);
  }

  // 3. Tìm số nguyên trong title (Chap 41, Chương 2, hoặc 1)
  const titleMatch = cleanTitle.match(/(?:chap(?:ter)?|chương)\s*([0-9]+)/i) ||
                     cleanTitle.match(/\b([0-9]+)\b/);
  if (titleMatch) {
    return parseFloat(titleMatch[1]);
  }

  // 4. Tìm số từ href (chap-41.html, /1.html, /1-.html)
  const hrefMatch = href.match(/\/chap-([0-9]+(?:\.[0-9]+)?)/i) ||
                    href.match(/\/([0-9]+(?:\.[0-9]+)?)/);
  if (hrefMatch) {
    return parseFloat(hrefMatch[1]);
  }

  return null;
}

/**
 * Chuẩn hoá link ảnh từ lazyteam.site sang leesincomic.com & tachserver.site
 */
function normalizeImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();

  // Bỏ qua load spinner, placeholder, logo, icon
  if (
    url.includes('loadx-min.gif') ||
    url.includes('load.gif') ||
    url.includes('loading.gif') ||
    url.includes('logo.png') ||
    url.includes('user.png') ||
    url.includes('no-images.jpg') ||
    url.endsWith('.svg') ||
    url.startsWith('data:')
  ) {
    return null;
  }

  // Xử lý link tương đối hoặc protocol-relative
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }

  // Chuyển link lazyteam.site/uploads hoặc /uploads sang https://leesincomic.com/uploads
  if (url.startsWith('/uploads/')) {
    url = `https://${TARGET_DOMAIN}${url}`;
  } else if (url.includes('lazyteam.site/uploads/')) {
    url = url.replace(/https?:\/\/(?:www\.)?lazyteam\.site\/uploads\//g, `https://${TARGET_DOMAIN}/uploads/`);
  } else if (url.includes('lazyteam.site/')) {
    url = url.replace(/https?:\/\/(?:www\.)?lazyteam\.site\//g, `https://${TARGET_DOMAIN}/`);
  }

  // Chuẩn hoá tachserver.online sang tachserver.site
  if (url.includes('tachserver.online')) {
    url = url.replace('tachserver.online', 'tachserver.site');
  }

  // Đảm bảo là URL hợp lệ
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${TARGET_DOMAIN}/${url.replace(/^\/+/, '')}`;
  }

  return url;
}

/**
 * Trích xuất danh sách link ảnh từ HTML của 1 chapter trên lazyteam.site
 */
function extractChapterImagesFromHtml(html) {
  if (!html) return [];

  // Tìm trong khối content_view_chap hoặc content_view
  let searchBlock = html;
  const contentMatch = html.match(/<div class=["']content_view_chap["']>([\s\S]*?)<\/div>/i) ||
                       html.match(/<div class=["']content_view["']>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    searchBlock = contentMatch[1];
  }

  const rawUrls = [];

  // 1. Trích xuất data-src
  const dataSrcMatches = searchBlock.matchAll(/data-src=["']([^"']+)["']/gi);
  for (const m of dataSrcMatches) {
    rawUrls.push(m[1]);
  }

  // 2. Trích xuất data-original
  const dataOrigMatches = searchBlock.matchAll(/data-original=["']([^"']+)["']/gi);
  for (const m of dataOrigMatches) {
    rawUrls.push(m[1]);
  }

  // 3. Fallback: trích xuất src từ thẻ img
  if (rawUrls.length === 0) {
    const srcMatches = searchBlock.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const m of srcMatches) {
      rawUrls.push(m[1]);
    }
  }

  // Chuẩn hoá và lọc
  const cleanedList = [];
  const seenUrls = new Set();

  for (const raw of rawUrls) {
    const normalized = normalizeImageUrl(raw);
    if (normalized && !seenUrls.has(normalized)) {
      seenUrls.add(normalized);
      cleanedList.push(normalized);
    }
  }

  return cleanedList;
}

// =============================================================================
// MAIN CRAWLER & SYNCHRONIZER
// =============================================================================
async function syncSingleChapter(comic, chapObj, scrapedUrl, options) {
  const result = await fetchUrl(scrapedUrl, options.timeoutMs);
  if (!result.ok || !result.text) {
    return { ok: false, count: 0, error: `HTTP ${result.status}` };
  }

  const images = extractChapterImagesFromHtml(result.text);
  if (images.length === 0) {
    return { ok: false, count: 0, error: 'No images found' };
  }

  // Tuỳ chọn tải file ảnh vật lý về đĩa
  if (options.downloadFiles) {
    const downloadedUrls = [];
    const comicFolder = cleanSlug(comic.slug || comic.id);
    const chapFolder = `chap-${chapObj.chapterNumber}`;

    for (let idx = 0; idx < images.length; idx++) {
      const imgUrl = images[idx];
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const fileName = `${String(idx + 1).padStart(3, '0')}${ext}`;
      const destFile = path.join(options.downloadDir, comicFolder, chapFolder, fileName);
      const relativeLocalPath = `/uploads/chapters/${comicFolder}/${chapFolder}/${fileName}`;

      const downloaded = await downloadBinaryFile(imgUrl, destFile);
      if (downloaded) {
        downloadedUrls.push(relativeLocalPath);
      } else {
        // Giữ link gốc nếu tải lỗi
        downloadedUrls.push(imgUrl);
      }
    }
    chapObj.images = downloadedUrls;
  } else {
    chapObj.images = images;
  }

  chapObj.updatedAt = new Date().toISOString();
  return { ok: true, count: chapObj.images.length };
}

async function processComic(comic, options, stats) {
  const comicTitle = comic.title || comic.slug;
  const slug = comic.slug;

  console.log(`\n------------------------------------------------------------`);
  console.log(`📚 Đang xử lý truyện: [${comicTitle}] (slug: ${slug})`);

  // Kiểm tra số chapter cần bổ sung ảnh
  const totalChapters = comic.chapters ? comic.chapters.length : 0;
  const emptyChapters = (comic.chapters || []).filter(
    (ch) => !ch.images || ch.images.length === 0
  );

  console.log(`   Tổng số chương: ${totalChapters} | Số chương chưa có ảnh: ${emptyChapters.length}`);

  if (options.missingOnly && emptyChapters.length === 0) {
    console.log(`   ⏭️  Đã đầy đủ ảnh toàn bộ ${totalChapters} chương. Bỏ qua!`);
    stats.comicsSkipped++;
    return;
  }

  // Danh sách chapter trên local cần cào ảnh
  const targetChapters = options.force
    ? comic.chapters
    : (comic.chapters || []).filter((ch) => !ch.images || ch.images.length === 0);

  let updatedInComic = 0;
  let totalImagesInComic = 0;

  // Luôn lấy danh sách chapter từ trang chi tiết trên lazyteam.site để có link chuẩn nhất
  let scrapedChapters = [];
  let comicPathSlug = slug;
  const sampleLink = (comic.chapters || []).find((ch) => ch.link)?.link;
  if (sampleLink) {
    const matchSlugInLink = sampleLink.match(/\/truyen-tranh\/([^/]+)\//);
    if (matchSlugInLink) {
      comicPathSlug = matchSlugInLink[1];
    }
  }

  // Thử tải danh sách chapter từ trang chi tiết của lazyteam
  let pageResult = await fetchUrl(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}.html`, options.timeoutMs);
  if ((!pageResult.ok || !pageResult.text) && comicPathSlug !== slug) {
    pageResult = await fetchUrl(`${SOURCE_BASE_URL}/truyen-tranh/${encodeURIComponent(slug)}.html`, options.timeoutMs);
  }

  if (pageResult.ok && pageResult.text) {
    const chapRegex = /<div class=["']chap_name["']>\s*<a[^>]+href=["']([^"']+)["'][^>]*title=["']?([^"'>]*)["']?[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = chapRegex.exec(pageResult.text)) !== null) {
      const rawHref = m[1].trim();
      const fullHref = rawHref.startsWith('http') ? rawHref : `${SOURCE_BASE_URL}${rawHref.startsWith('/') ? rawHref : '/' + rawHref}`;
      const rawTitle = m[2] || m[3] || '';
      const chapNum = extractChapterNumber(rawHref, rawTitle);
      scrapedChapters.push({
        url: fullHref,
        href: rawHref,
        rawTitle: rawTitle.replace(/<[^>]+>/g, '').trim(),
        chapNum,
      });
    }
  }

  for (let i = 0; i < targetChapters.length; i++) {
    const chap = targetChapters[i];
    const chapNum = chap.chapterNumber;
    const numStr = String(chapNum);
    const numHyphen = numStr.replace('.', '-');

    // Thu thập danh sách các URL tiềm năng (Candidates) theo thứ tự ưu tiên
    const candidateUrls = [];

    // 1. Khớp từ danh sách chapter cào được trên trang chi tiết lazyteam
    if (scrapedChapters.length > 0) {
      // 1.1 Khớp chính xác theo số chapNum
      for (const sc of scrapedChapters) {
        if (sc.chapNum === chapNum) {
          candidateUrls.push(sc.url);
        }
      }

      // 1.2 Khớp theo đuôi file (ví dụ: /12.html, /chap-12.html, /ngoai-truyen-1-2.html)
      for (const sc of scrapedChapters) {
        if (
          sc.href.endsWith(`/${numStr}.html`) ||
          sc.href.endsWith(`/chap-${numStr}.html`) ||
          sc.href.endsWith(`/${numHyphen}.html`) ||
          sc.href.includes(`-${numHyphen}.html`) ||
          sc.href.includes(`/${numHyphen}.html`)
        ) {
          candidateUrls.push(sc.url);
        }
      }

      // 1.3 Khớp theo tiêu đề chapter
      for (const sc of scrapedChapters) {
        if (
          sc.rawTitle.includes(`Chap ${numStr} `) ||
          sc.rawTitle.endsWith(`Chap ${numStr}`) ||
          sc.rawTitle.endsWith(` ${numStr}`) ||
          sc.rawTitle.includes(` ${numStr} `)
        ) {
          candidateUrls.push(sc.url);
        }
      }
    }

    // 2. Thử các định dạng URL chuẩn theo quy luật của lazyteam
    candidateUrls.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/${numStr}.html`);
    candidateUrls.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/chap-${numStr}.html`);
    if (numStr !== numHyphen) {
      candidateUrls.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/ngoai-truyen-${numHyphen}.html`);
      candidateUrls.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/chap-${numHyphen}.html`);
      candidateUrls.push(`${SOURCE_BASE_URL}/truyen-tranh/${comicPathSlug}/${numHyphen}.html`);
    }

    // 3. Sử dụng link có sẵn trong chap.link (chuyển sang lazyteam)
    if (chap.link) {
      const baseLink = chap.link.startsWith('http')
        ? chap.link.replace(/https?:\/\/(?:www\.)?(?:leesincomic\.com|lazyteam\.site)/, SOURCE_BASE_URL)
        : `${SOURCE_BASE_URL}${chap.link.startsWith('/') ? chap.link : '/' + chap.link}`;
      candidateUrls.push(baseLink);

      // Nếu chap.link có dạng /chap-12.html, thêm biến thể /12.html và ngược lại
      if (baseLink.includes('/chap-')) {
        candidateUrls.push(baseLink.replace('/chap-', '/'));
      } else {
        const lastSlash = baseLink.lastIndexOf('/');
        if (lastSlash !== -1) {
          candidateUrls.push(`${baseLink.slice(0, lastSlash)}/chap-${baseLink.slice(lastSlash + 1)}`);
        }
      }
    }

    // Lọc trùng lặp candidateUrls
    const uniqueCandidates = [...new Set(candidateUrls)];

    process.stdout.write(`   ⏳ Cào Chap ${chapNum} (${i + 1}/${targetChapters.length})... `);

    let foundSuccess = false;
    let lastError = 'No images found';

    for (const testUrl of uniqueCandidates) {
      const syncRes = await syncSingleChapter(comic, chap, testUrl, options);
      if (syncRes.ok && syncRes.count > 0) {
        console.log(`✅ Lấy thành công ${syncRes.count} ảnh.`);
        updatedInComic++;
        totalImagesInComic += syncRes.count;
        stats.chaptersUpdated++;
        stats.totalImagesSynced += syncRes.count;
        foundSuccess = true;
        // Lưu lại link hoạt động để dùng lần sau
        chap.link = testUrl.replace(SOURCE_BASE_URL, '');
        break;
      } else {
        lastError = syncRes.error || 'No images found';
      }
    }

    if (!foundSuccess) {
      console.log(`❌ Lỗi: ${lastError}`);
      stats.chaptersFailed++;
    }

    if (options.delayMs > 0 && i < targetChapters.length - 1) {
      await sleep(options.delayMs);
    }
  }

  if (updatedInComic > 0) {
    stats.comicsUpdated++;
    comic.updatedAt = new Date().toISOString();
    console.log(`   🎉 Đã cập nhật thành công ${updatedInComic} chương (${totalImagesInComic} ảnh) cho truyện "${comicTitle}".`);
  } else {
    console.log(`   ℹ️  Không có chương nào được cập nhật cho truyện "${comicTitle}".`);
  }
}

// =============================================================================
// SQL EXPORT GENERATOR
// =============================================================================
function generateSqlStatements(comics) {
  const sqlLines = [];
  sqlLines.push('-- ==============================================================');
  sqlLines.push('-- LEESIN COMIC - ĐỒNG BỘ ẢNH CHƯƠNG TỪ LAZYTEAM.SITE');
  sqlLines.push(`-- Ngày tạo: ${new Date().toISOString()}`);
  sqlLines.push('-- ==============================================================\n');
  sqlLines.push('SET FOREIGN_KEY_CHECKS=0;');
  sqlLines.push('SET AUTOCOMMIT=0;');
  sqlLines.push('START TRANSACTION;\n');

  let count = 0;
  for (const c of comics) {
    for (const ch of c.chapters || []) {
      if (ch.images && ch.images.length > 0) {
        const idSafe = (ch.id || '').replace(/'/g, "\\'");
        const imagesJson = JSON.stringify(ch.images).replace(/'/g, "\\'");
        sqlLines.push(`UPDATE \`chapters\` SET \`images\` = '${imagesJson}' WHERE \`id\` = '${idSafe}';`);
        count++;
      }
    }
  }

  sqlLines.push('\nCOMMIT;');
  sqlLines.push('SET FOREIGN_KEY_CHECKS=1;\n');

  return { sql: sqlLines.join('\n'), count };
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║         LEESIN COMIC - BỘ ĐỒNG BỘ ẢNH TỪ LAZYTEAM.SITE            ║
║     (Cào ảnh, chuẩn hoá link và bù chương cho leesincomic.com)    ║
╚═══════════════════════════════════════════════════════════════════╝`);

  // 1. Kiểm tra và nạp file data_store.json
  if (!fs.existsSync(DATA_STORE_PATH)) {
    console.error(`❌ Không tìm thấy file dữ liệu: ${DATA_STORE_PATH}`);
    process.exit(1);
  }

  console.log(`📂 Đang tải dữ liệu từ ${DATA_STORE_PATH}...`);
  const rawData = fs.readFileSync(DATA_STORE_PATH, 'utf8');
  let store;
  try {
    store = JSON.parse(rawData);
  } catch (err) {
    console.error(`❌ Lỗi định dạng JSON trong file ${DATA_STORE_PATH}:`, err.message);
    process.exit(1);
  }

  const allComics = store.comics || [];
  console.log(`✅ Đã nạp ${allComics.length} bộ truyện.`);

  // 2. Lọc danh sách truyện cần xử lý
  let comicsToProcess = [];
  if (options.slug) {
    const targetSlug = cleanSlug(options.slug);
    const found = allComics.find((c) => cleanSlug(c.slug) === targetSlug || cleanSlug(c.id) === targetSlug);
    if (!found) {
      console.error(`❌ Không tìm thấy truyện có slug "${options.slug}" trong data_store.json!`);
      process.exit(1);
    }
    comicsToProcess = [found];
  } else {
    comicsToProcess = allComics;
    if (options.start > 0) {
      comicsToProcess = comicsToProcess.slice(options.start);
    }
    if (options.limit && options.limit > 0) {
      comicsToProcess = comicsToProcess.slice(0, options.limit);
    }
  }

  console.log(`🎯 Số lượng truyện sẽ được xử lý: ${comicsToProcess.length}`);
  console.log(`⚙️  Chế độ: ${options.missingOnly ? 'Chỉ bù chương chưa có ảnh' : 'Tất cả chương'}`);
  console.log(`💾 Xuất SQL: ${options.exportSql ? 'BẬT (' + options.sqlPath + ')' : 'TẮT'}`);
  console.log(`📦 Tải ảnh về máy: ${options.downloadFiles ? 'BẬT (' + options.downloadDir + ')' : 'TẮT'}`);

  const startTime = Date.now();
  const stats = {
    comicsProcessed: 0,
    comicsUpdated: 0,
    comicsSkipped: 0,
    comicNotFound: 0,
    chaptersUpdated: 0,
    chaptersFailed: 0,
    totalImagesSynced: 0,
  };

  // 3. Thực thi cào và đồng bộ từng truyện
  for (let i = 0; i < comicsToProcess.length; i++) {
    const comic = comicsToProcess[i];
    stats.comicsProcessed++;
    console.log(`\n[${i + 1}/${comicsToProcess.length}] Tiến trình tổng thể...`);
    await processComic(comic, options, stats);

    // Lưu checkpoint sau mỗi 5 truyện nếu xử lý hàng loạt
    if ((i + 1) % 5 === 0 || i === comicsToProcess.length - 1) {
      if (stats.chaptersUpdated > 0) {
        console.log(`\n💾 Đang lưu dữ liệu cập nhật vào data_store.json...`);
        try {
          fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
          if (fs.existsSync(PUBLIC_DATA_STORE_PATH)) {
            fs.writeFileSync(PUBLIC_DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
          }
          console.log(`✅ Đã lưu checkpoint thành công.`);
        } catch (e) {
          console.error(`⚠️ Lỗi khi lưu checkpoint:`, e.message);
        }
      }
    }
  }

  // 4. Xuất file SQL nếu được yêu cầu
  if (options.exportSql && stats.chaptersUpdated > 0) {
    console.log(`\n📄 Đang tạo file SQL cập nhật MySQL...`);
    try {
      const { sql, count } = generateSqlStatements(allComics);
      fs.mkdirSync(path.dirname(options.sqlPath), { recursive: true });
      fs.writeFileSync(options.sqlPath, sql, 'utf8');
      console.log(`✅ Đã xuất ${count} câu lệnh cập nhật vào file: ${options.sqlPath}`);
    } catch (e) {
      console.error(`⚠️ Không thể xuất file SQL:`, e.message);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // 5. In bảng tổng kết
  console.log(`
═══════════════════════════════════════════════════════════════════
🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU TỪ LAZYTEAM.SITE SANG LEESINCOMIC.COM!
═══════════════════════════════════════════════════════════════════
- Thời gian thực thi:      ${durationSec} giây
- Số truyện đã duyệt:      ${stats.comicsProcessed}
- Số truyện được cập nhật: ${stats.comicsUpdated}
- Số truyện bỏ qua:        ${stats.comicsSkipped}
- Số truyện không tìm thấy: ${stats.comicNotFound}
- Số chương nạp thêm ảnh:  ${stats.chaptersUpdated}
- Tổng số link ảnh đồng bộ: ${stats.totalImagesSynced}
- File dữ liệu:            ${DATA_STORE_PATH}
${options.exportSql ? `- File SQL xuất ra:       ${options.sqlPath}` : ''}
═══════════════════════════════════════════════════════════════════
`);
}

main().catch((err) => {
  console.error('Fatal error in sync script:', err);
  process.exit(1);
});
