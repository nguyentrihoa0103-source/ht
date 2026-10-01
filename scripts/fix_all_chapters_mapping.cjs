const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');

if (!fs.existsSync(DATA_STORE_PATH)) {
  console.error('data_store.json not found!');
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
const comics = store.comics || [];

function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function parseChaptersFromHtml(html) {
  const regex = /<div class="chap_name">\s*<a href="([^"]+)" title="([^"]*)">([\s\S]*?)<\/a><\/div>(?:\s*<div class="chap_update">\s*([^<]+)\s*<\/div>)?/gi;
  let match;
  const rawList = [];
  while ((match = regex.exec(html)) !== null) {
    const rawUrl = match[1].trim();
    const url = rawUrl.startsWith('http') ? rawUrl : `https://leesincomic.com${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`;
    const rawText = match[3].replace(/<[^>]+>/g, '').trim().replace(/^Free\s*/i, '').trim().replace(/\s+/g, ' ');
    const updateTime = match[4] ? match[4].trim() : '';
    rawList.push({ url, link: rawUrl, rawText, updateTime });
  }

  // Deduplicate identical URLs
  const seenUrls = new Set();
  const deduped = [];
  for (const item of rawList) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      deduped.push(item);
    }
  }

  return deduped;
}

async function scrapeChapterImages(url) {
  try {
    const html = await fetchUrl(url, 10000);
    if (!html) return [];
    const imgs = [...html.matchAll(/data-src="([^"]+)"/gi)]
      .map((m) => m[1])
      .filter((u) => u.includes('tachserver') || u.includes('/cdn') || u.includes('uploads'));
    return imgs;
  } catch {
    return [];
  }
}

async function processComic(comic) {
  // Generate candidate slugs on leesincomic.com
  const candidateSlugs = [comic.slug];
  const noPheromone = comic.slug.replace(/-pheromone$/, '');
  if (noPheromone !== comic.slug) candidateSlugs.push(noPheromone);
  const noShortie = comic.slug.replace(/-nha-shortie-squad-trong$/, '').replace(/-shortie-squad.*$/, '');
  if (noShortie !== comic.slug) candidateSlugs.push(noShortie);
  
  if (comic.coverImage) {
    const mCover = comic.coverImage.match(/\/minh_hoa\/(.+)-\d{8,12}\.[a-zA-Z0-9]+$/);
    if (mCover && mCover[1]) candidateSlugs.push(mCover[1]);
  }

  let liveChaps = [];
  for (const cs of candidateSlugs) {
    const comicUrl = `https://leesincomic.com/truyen-tranh/${encodeURIComponent(cs)}.html`;
    const html = await fetchUrl(comicUrl);
    if (html && html.length > 500) {
      const parsed = parseChaptersFromHtml(html);
      if (parsed.length > 0) {
        liveChaps = parsed;
        break;
      }
    }
  }

  if (liveChaps.length === 0) {
    // If live site doesn't have it, just sanitize existing chapters to fix duplicates
    sanitizeExistingChapters(comic);
    return;
  }

  console.log(`Processing "${comic.title}" (${comic.slug}): ${liveChaps.length} unique chapters from leesincomic.com`);

  const isAnthology =
    comic.slug.includes('tuyen-tap') ||
    comic.slug.includes('tong-hop') ||
    comic.slug.includes('oneshot') ||
    comic.title.toLowerCase().includes('tuyển tập') ||
    comic.title.toLowerCase().includes('tổng hợp');

  // liveChaps is ordered from newest at [0] to oldest at [liveChaps.length - 1]
  const chronological = [...liveChaps].reverse();

  let hasStandardNums = true;
  for (const ch of chronological) {
    const numMatch = ch.rawText.match(/(?:Chap(?:ter)?\.?\s*|#\s*)([0-9.]+)/i) || ch.rawText.match(/^([0-9.]+)$/);
    if (!numMatch && isAnthology) {
      hasStandardNums = false;
      break;
    }
  }

  // Pre-index existing chapter images
  const existingImagesByLink = new Map();
  for (const oldCh of (comic.chapters || [])) {
    if (oldCh.images && oldCh.images.length > 0) {
      if (oldCh.link) existingImagesByLink.set(oldCh.link, oldCh.images);
      const cleanTitle = (oldCh.title || '').replace(/^Chương\s+[0-9.]+:\s*/i, '').trim().toLowerCase();
      if (cleanTitle) existingImagesByLink.set(cleanTitle, oldCh.images);
    }
  }

  const newChapters = [];
  const usedNumbers = new Set();

  for (let i = 0; i < chronological.length; i++) {
    const live = chronological[i];
    let chapNum;

    if (!hasStandardNums || isAnthology) {
      chapNum = i + 1;
    } else {
      const numMatch =
        live.rawText.match(/(?:Chap(?:ter)?\.?\s*|#\s*)([0-9.]+)/i) ||
        live.rawText.match(/^([0-9.]+)/) ||
        live.url.match(/[\/-]([0-9.]+)\.html/i);

      let parsedNum = numMatch ? parseFloat(numMatch[1]) : (i + 1);
      if (isNaN(parsedNum) || usedNumbers.has(parsedNum)) {
        parsedNum = i + 1;
      }
      chapNum = parsedNum;
    }

    usedNumbers.add(chapNum);

    let displayTitle = live.rawText;
    if (!displayTitle || displayTitle.length < 2) {
      displayTitle = `Chương ${chapNum}`;
    }

    let images = existingImagesByLink.get(live.link) || existingImagesByLink.get(displayTitle.toLowerCase()) || [];

    newChapters.push({
      id: `chap-${comic.slug}-${chapNum}`,
      comicId: comic.id,
      comicTitle: comic.title,
      chapterNumber: chapNum,
      title: displayTitle,
      createdAt: live.updateTime || new Date().toISOString(),
      views: Math.max(15, Math.round((comic.views || 500) / chronological.length)),
      isPasswordProtected: false,
      images: images,
      link: live.link,
      teamId: comic.teamId || 'team-lessin-comic',
      teamName: comic.teamName || 'Lessin Comic',
    });
  }

  // Scrape images for any chapter with empty images
  const needImages = newChapters.filter((ch) => !ch.images || ch.images.length === 0);
  if (needImages.length > 0) {
    const CONCURRENCY = 15;
    let imgIdx = 0;
    async function imgWorker() {
      while (imgIdx < needImages.length) {
        const cur = imgIdx++;
        const target = needImages[cur];
        const fullUrl = target.link.startsWith('http') ? target.link : `https://leesincomic.com${target.link.startsWith('/') ? target.link : '/' + target.link}`;
        const scraped = await scrapeChapterImages(fullUrl);
        if (scraped.length > 0) {
          target.images = scraped;
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => imgWorker()));
  }

  newChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  comic.chapters = newChapters;
}

function sanitizeExistingChapters(comic) {
  if (!comic.chapters || comic.chapters.length === 0) return;
  const seenNumbers = new Set();
  const dedupedChapters = [];

  for (let i = 0; i < comic.chapters.length; i++) {
    const ch = comic.chapters[i];
    let num = typeof ch.chapterNumber === 'number' && !isNaN(ch.chapterNumber) ? ch.chapterNumber : (i + 1);
    if (seenNumbers.has(num)) {
      // Find next free sequential or decimal
      num = i + 1;
      if (seenNumbers.has(num)) {
        num = Math.max(...seenNumbers) + 1;
      }
    }
    seenNumbers.add(num);
    ch.chapterNumber = num;
    ch.id = `chap-${comic.slug}-${num}`;
    dedupedChapters.push(ch);
  }

  dedupedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  comic.chapters = dedupedChapters;
}

async function main() {
  console.log('Sanitizing all comics chapters across the database...');

  // 1. First process all comics that still have duplicate numbers
  for (let i = 0; i < comics.length; i++) {
    const c = comics[i];
    const chaps = c.chapters || [];
    const numSet = new Set(chaps.map((ch) => ch.chapterNumber));
    if (numSet.size < chaps.length || c.slug === 'tuyen-tap-truyen-ngan-bl-manhwa') {
      await processComic(c);
    }
  }

  // 2. Final check to guarantee 0 duplicates across all 642 comics
  let remainingDups = 0;
  for (const c of comics) {
    const chaps = c.chapters || [];
    const numSet = new Set();
    let hasDup = false;
    for (const ch of chaps) {
      if (numSet.has(ch.chapterNumber)) {
        hasDup = true;
      }
      numSet.add(ch.chapterNumber);
    }
    if (hasDup) {
      sanitizeExistingChapters(c);
      remainingDups++;
    }
  }

  console.log(`Sanitization complete! Repaired remaining dups in ${remainingDups} comics.`);

  // Save to data_store.json
  fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('Saved data_store.json successfully!');

  // Run build_full_initial_data.cjs to sync all SQL, initialData.ts, etc.
  console.log('Regenerating all SQL and initial data files...');
  require('./build_full_initial_data.cjs');
  console.log('All files regenerated successfully!');
}

main().catch(console.error);
