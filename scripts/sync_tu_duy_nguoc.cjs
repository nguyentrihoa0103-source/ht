const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://leesincomic.com/'
};

function extractImages(html) {
  const matches = [...html.matchAll(/(?:data-src|data-original)=["']([^"']+)["']/gi)].map(m => m[1]);
  const clean = matches
    .map(i => i.trim())
    .filter(i => i.length > 5 && !i.includes('.gif') && !i.includes('logo.png') && !i.includes('user.png') && !i.includes('no-images.jpg'))
    .map(i => i.startsWith('//') ? 'https:' + i : (i.startsWith('/') ? 'https://leesincomic.com' + i : i))
    .map(i => i.replace('tachserver.online', 'tachserver.site'));
  return [...new Set(clean)];
}

async function syncComic(slug) {
  const dbFile = path.resolve('data_store.json');
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const comic = db.comics.find(c => c.slug === slug);
  if (!comic) {
    console.log('Comic not found:', slug);
    return;
  }

  console.log(`Processing comic "${comic.title}" (${comic.slug}), chapters: ${comic.chapters.length}`);

  // Fetch comic detail page to get all exact chapter links
  const comicUrl = `https://leesincomic.com/truyen-tranh/${comic.slug}.html`;
  console.log('Fetching comic detail page:', comicUrl);
  const resp = await fetch(comicUrl, { headers: HEADERS });
  if (!resp.ok) {
    console.log('Failed to fetch comic detail page, status:', resp.status);
    return;
  }

  const comicHtml = await resp.text();
  const chapMatches = [...comicHtml.matchAll(/<div class=["']chap_name["']>\s*<a[^>]+href=["']([^"']+)["'][^>]*title=["']?([^"'>]*)["']?[^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({
    href: m[1],
    title: (m[2] || m[3] || '').replace(/<[^>]+>/g, '').trim()
  }));

  console.log(`Found ${chapMatches.length} chapters on leesincomic.com detail page`);

  // Map chapter number to link
  const linkByNumber = new Map();
  for (const item of chapMatches) {
    // Extract chapter number from href or title
    const mNum = item.href.match(/\/chap-([0-9]+(?:\.[0-9]+)?)/i) || item.title.match(/chap(?:ter)?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (mNum) {
      const num = parseFloat(mNum[1]);
      if (!linkByNumber.has(num)) {
        linkByNumber.set(num, item.href);
      }
    }
  }

  let updatedCount = 0;
  for (const ch of comic.chapters) {
    const hasImages = ch.images && Array.isArray(ch.images) && ch.images.length > 0;
    if (hasImages) continue;

    const chapNum = ch.chapterNumber;
    let targetLink = linkByNumber.get(chapNum);

    if (!targetLink) {
      // Find using fuzzy match
      const numStr = String(chapNum);
      const dashStr = numStr.replace('.', '-');
      const found = chapMatches.find(item => {
        const h = item.href;
        return h.endsWith(`/chap-${numStr}.html`) ||
          h.endsWith(`/${numStr}.html`) ||
          h.endsWith(`/chap-${dashStr}.html`) ||
          h.includes(`/chap-${dashStr}-`) ||
          h.includes(`/chap-${numStr}-`);
      });
      if (found) {
        targetLink = found.href;
      }
    }

    if (!targetLink && ch.link) {
      targetLink = ch.link;
    }

    if (!targetLink) {
      targetLink = `/truyen-tranh/${comic.slug}/chap-${chapNum}.html`;
    }

    const fullUrl = targetLink.startsWith('http')
      ? targetLink
      : `https://leesincomic.com${targetLink.startsWith('/') ? targetLink : '/' + targetLink}`;

    console.log(`Crawling Chap ${chapNum} -> ${fullUrl}`);
    try {
      const chResp = await fetch(fullUrl, { headers: HEADERS });
      if (!chResp.ok) {
        console.log(`  Failed (${chResp.status})`);
        continue;
      }
      const chHtml = await chResp.text();
      const imgs = extractImages(chHtml);
      if (imgs.length > 0) {
        ch.images = imgs;
        ch.link = fullUrl;
        updatedCount++;
        console.log(`  -> SUCCESS! Found ${imgs.length} images`);
      } else {
        console.log(`  -> 0 images found in HTML`);
      }
    } catch (err) {
      console.log(`  -> Error:`, err.message);
    }
  }

  console.log(`Updated ${updatedCount} chapters for "${comic.title}"!`);

  // Save to database files
  fs.writeFileSync('data_store.json', JSON.stringify(db, null, 2), 'utf8');
  if (fs.existsSync('src/data/initialDataStore.json')) {
    fs.writeFileSync('src/data/initialDataStore.json', JSON.stringify(db, null, 2), 'utf8');
  }
  if (fs.existsSync('public/data_store.json')) {
    fs.writeFileSync('public/data_store.json', JSON.stringify(db, null, 2), 'utf8');
  }
  console.log('Database files updated successfully!');
}

async function run() {
  await syncComic('tu-duy-nguoc-bl');
}

run();
