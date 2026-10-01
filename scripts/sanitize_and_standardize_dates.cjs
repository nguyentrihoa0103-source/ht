const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');
const ALT_SRC_PATH = path.join(ROOT_DIR, 'src', 'data', 'initialDataStore.json');
const PUBLIC_STORE_PATH = path.join(ROOT_DIR, 'public', 'data_store.json');

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));

// Anchor time when leesincomic was crawled (2026-09-24 12:00:00 UTC)
const ANCHOR_CRAWL = new Date('2026-09-24T12:00:00.000Z').getTime();

function standardizeDate(str) {
  if (!str) return null;
  const s = str.trim();
  if (!s) return null;

  // Relative Vietnamese string from crawl
  if (s.includes('trước') || s.includes('hôm') || s.includes('vừa') || s.includes('vua')) {
    const sec = s.match(/(\d+)\s*(?:giây|s)\s*trước/);
    if (sec) return new Date(ANCHOR_CRAWL - parseInt(sec[1], 10) * 1000).toISOString();
    const min = s.match(/(\d+)\s*(?:phút|m|min)\s*trước/);
    if (min) return new Date(ANCHOR_CRAWL - parseInt(min[1], 10) * 60 * 1000).toISOString();
    const hr = s.match(/(\d+)\s*(?:giờ|tiếng|h)\s*trước/);
    if (hr) return new Date(ANCHOR_CRAWL - parseInt(hr[1], 10) * 3600 * 1000).toISOString();
    const day = s.match(/(\d+)\s*ngày\s*trước/);
    if (day) return new Date(ANCHOR_CRAWL - parseInt(day[1], 10) * 86400 * 1000).toISOString();
    if (s.includes('hôm qua')) return new Date(ANCHOR_CRAWL - 86400 * 1000).toISOString();
    if (s.includes('hôm nay')) return new Date(ANCHOR_CRAWL - 3600 * 1000).toISOString();
    if (s.includes('vừa xong') || s.includes('vua xong')) return new Date(ANCHOR_CRAWL - 30 * 1000).toISOString();
  }

  // DD/MM/YYYY or DD-MM-YYYY format
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10) - 1;
    const y = parseInt(dmy[3], 10);
    const hr = dmy[4] ? parseInt(dmy[4], 10) : 12;
    const min = dmy[5] ? parseInt(dmy[5], 10) : 0;
    const sec = dmy[6] ? parseInt(dmy[6], 10) : 0;
    // Interpret as Vietnam UTC+7 (12:00 VN = 05:00 UTC)
    return new Date(Date.UTC(y, m, d, Math.max(0, hr - 7), min, sec)).toISOString();
  }

  // ISO or standard date string
  const p = Date.parse(s);
  if (!isNaN(p)) {
    const dt = new Date(p);
    // Detect inverted MM/DD/YYYY: In 2026, months 10, 11, 12 do not exist yet (current date is Sept 30, 2026)
    if (dt.getUTCFullYear() === 2026 && dt.getUTCMonth() > 8) {
      const day = dt.getUTCDate();
      const month = dt.getUTCMonth(); // 9 = Oct, 10 = Nov, 11 = Dec
      if (day <= 12) {
        // Swap month and day: e.g. 2026-12-09 -> month: 8 (Sep), day: 12 -> 2026-09-12
        return new Date(Date.UTC(2026, day - 1, month + 1, 12, 0, 0)).toISOString();
      } else {
        // Was from previous year 2025
        return new Date(Date.UTC(2025, month, day, 12, 0, 0)).toISOString();
      }
    }
    return dt.toISOString();
  }

  return s;
}

// 1. Remove fake test comic
const originalLen = store.comics.length;
store.comics = store.comics.filter(c => c.id !== 'comic-1790695277063' && !c.title.toLowerCase().includes('test truyện'));
console.log(`Filtered comics: ${originalLen} -> ${store.comics.length}`);

// 2. Standardize all chapters and comic updatedAt
store.comics.forEach(c => {
  if (Array.isArray(c.chapters) && c.chapters.length > 0) {
    c.chapters.forEach(ch => {
      ch.createdAt = standardizeDate(ch.createdAt) || '2026-09-20T10:00:00.000Z';
    });

    // Sort chapters by chapterNumber ascending
    c.chapters.sort((a, b) => {
      const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseFloat(String(a.chapterNumber)) || 0;
      const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseFloat(String(b.chapterNumber)) || 0;
      return numA - numB;
    });

    const latestChap = c.chapters[c.chapters.length - 1];
    c.updatedAt = latestChap.createdAt || standardizeDate(c.updatedAt) || '2026-09-20T10:00:00.000Z';
  } else {
    c.updatedAt = standardizeDate(c.updatedAt) || '2026-09-20T10:00:00.000Z';
  }
});

// 3. Sort comics so newest updated comic comes first
store.comics.sort((a, b) => {
  const tA = new Date(a.updatedAt || 0).getTime();
  const tB = new Date(b.updatedAt || 0).getTime();
  return tB - tA;
});

// Save updated data_store.json
const jsonStr = JSON.stringify(store, null, 2);
fs.writeFileSync(DATA_STORE_PATH, jsonStr, 'utf8');
fs.writeFileSync(ALT_SRC_PATH, jsonStr, 'utf8');
fs.writeFileSync(PUBLIC_STORE_PATH, jsonStr, 'utf8');
console.log('Saved sanitized data to data_store.json, initialDataStore.json, public/data_store.json');

console.log('Top 15 newest comics after fix:');
store.comics.slice(0, 15).forEach((c, idx) => {
  const last = c.chapters ? c.chapters[c.chapters.length - 1] : null;
  console.log(`${idx + 1}. "${c.title}" - Chap ${last?.chapterNumber} (${c.updatedAt})`);
});
