const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
const comics = store.comics || [];

console.log(`Starting sanitization of ${comics.length} comics...`);

function cleanSlug(title, rawSlug) {
  let s = rawSlug || title || '';
  try {
    s = decodeURIComponent(s);
  } catch (e) {}
  s = s.replace(/^comic-/, '');
  return s
    .toLowerCase()
    .trim()
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

// 1. Assign clean, unique slugs and IDs to all comics
const usedComicSlugs = new Set();
const usedComicIds = new Set();

comics.forEach((c, idx) => {
  let baseSlug = cleanSlug(c.title, c.slug);
  if (!baseSlug) baseSlug = `comic-${idx + 1}`;

  let finalSlug = baseSlug;
  let counter = 2;
  while (usedComicSlugs.has(finalSlug)) {
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  usedComicSlugs.add(finalSlug);

  c.slug = finalSlug;
  c.id = `comic-${finalSlug}`;

  // Make sure otherNames, authors, genres are arrays
  if (!Array.isArray(c.otherNames)) c.otherNames = [];
  if (!Array.isArray(c.authors)) c.authors = c.authors ? [c.authors] : [];
  if (!Array.isArray(c.genres) || c.genres.length === 0) c.genres = ['Manhwa'];
  if (!c.status) c.status = 'Đang tiến hành';
  if (typeof c.views !== 'number') c.views = parseInt(c.views) || 500;
  if (typeof c.likes !== 'number') c.likes = parseInt(c.likes) || 50;
  if (typeof c.follows !== 'number') c.follows = parseInt(c.follows) || 30;

  // SEO metadata
  if (!c.seo || typeof c.seo !== 'object') {
    c.seo = {
      metaTitle: `${c.title} - Đọc Truyện Tranh Online | Leesin Comic`,
      metaDesc: c.summary ? c.summary.substring(0, 160) : `Đọc truyện tranh ${c.title} online tại Leesin Comic`,
      focusKeyword: c.title,
      schemaType: 'Book',
      score: 85
    };
  }
});

console.log(`Assigned clean slugs to ${comics.length} comics. All slugs unique: ${usedComicSlugs.size === comics.length}`);

// 2. Fix all chapter IDs across all comics to ensure 100% uniqueness
const globalChapIds = new Set();
let totalChapters = 0;
let modifiedChapIds = 0;

comics.forEach((c) => {
  if (!Array.isArray(c.chapters)) {
    c.chapters = [];
    return;
  }

  c.chapters.forEach((ch, chIdx) => {
    totalChapters++;
    const chapNum = typeof ch.chapterNumber === 'number' && !isNaN(ch.chapterNumber) ? ch.chapterNumber : (chIdx + 1);
    ch.chapterNumber = chapNum;
    if (!ch.title) ch.title = `Chương ${chapNum}`;

    let baseChapId = `chap-${c.slug}-${chapNum}-${chIdx + 1}`;
    let finalChapId = baseChapId;
    let chapCounter = 2;
    while (globalChapIds.has(finalChapId)) {
      finalChapId = `${baseChapId}-${chapCounter}`;
      chapCounter++;
      modifiedChapIds++;
    }
    globalChapIds.add(finalChapId);
    ch.id = finalChapId;
    ch.comicId = c.id;
    ch.comicTitle = c.title;
    if (!ch.teamId && c.teamId) ch.teamId = c.teamId;
    if (!ch.teamName && c.teamName) ch.teamName = c.teamName;
    if (!Array.isArray(ch.images)) ch.images = [];
  });
});

console.log(`Processed ${totalChapters} chapters across ${comics.length} comics.`);
console.log(`Global unique chapter IDs: ${globalChapIds.size} / ${totalChapters}`);

// Save back to data_store.json
fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
console.log(`Saved sanitized store to ${DATA_STORE_PATH}`);
