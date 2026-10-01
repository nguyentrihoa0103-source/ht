const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_STORE_PATH = path.resolve(__dirname, '..', 'data_store.json');
const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));

const missingSlugs = [
  'hoa-ben-luoi-kiem',
  'chi-can-mot-nguoi-chong-la-du',
  'su-sung-ai-cua-than-linh',
  've-nhung-dieu-chua-tung-xay-ra',
  'kuma-tuyet-doi-khong-bi-thoi-mien-dau!',
  'haikyuu!!--shinchan-ya-de-doujinshi-'
];

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', ch => data += ch);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      console.warn('Error fetching', url, err.message);
      resolve('');
    });
  });
}

function cleanSlug(title, rawSlug) {
  let s = rawSlug || title || '';
  return s.toLowerCase().trim()
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

async function scrapeComic(rawSlug) {
  console.log(`\nFetching comic: ${rawSlug}...`);
  const url = `https://leesincomic.com/truyen-tranh/${encodeURIComponent(rawSlug)}.html`;
  const html = await fetchHtml(url);
  if (!html) return null;

  const h1Match = html.match(/<h1>([^<]+)<\/h1>/i);
  const title = h1Match ? h1Match[1].trim() : rawSlug;

  const coverMatch = html.match(/<div class=\"box_info_left\">[\s\S]*?<img src=\"([^\"]+)\"/i) ||
                     html.match(/<meta property=\"og:image\" content=\"([^\"]+)\"/i);
  const coverImage = coverMatch ? coverMatch[1].trim() : '';

  const summaryMatch = html.match(/<meta property=\"og:description\" content='([^']*)'/i) ||
                       html.match(/<meta property=\"og:description\" content=\"([^\"]*)\"/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : `${title} - Đọc truyện tranh online tại Leesin Comic.`;

  const otherNamesMatch = html.match(/Tên Khác:\s*([^<]+)/i);
  const otherNames = otherNamesMatch ? [otherNamesMatch[1].trim()] : [];

  const teamMatch = html.match(/<a href=\"\/nhom-dich-[^\"]+\"[^>]*>([^<]+)<\/a>/i);
  const teamName = teamMatch ? teamMatch[1].trim() : 'Leesin Comic';
  const teamSlug = cleanSlug(teamName);
  const teamId = `team-${teamSlug}`;

  const genreSection = (html.match(/<ul class=\"list-tag-story[^\"]*\">[\s\S]*?<\/ul>/gi) || [])[0] || '';
  const genreList = [...genreSection.matchAll(/<a [^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());
  if (genreList.length === 0) genreList.push('Manhwa');

  const viewsMatch = html.match(/Lượt xem:\s*([0-9.,]+)/i);
  const views = viewsMatch ? parseInt(viewsMatch[1].replace(/[^0-9]/g, '')) || 500 : 500;

  const followsMatch = html.match(/Lượt theo dõi:\s*([0-9.,]+)/i);
  const follows = followsMatch ? parseInt(followsMatch[1].replace(/[^0-9]/g, '')) || 50 : 50;

  const isHot = html.includes('hot_icon') || views > 10000;
  const isTrending = views > 5000;

  const standardSlug = cleanSlug(title, rawSlug);
  const comicId = `comic-${standardSlug}`;

  // Extract chapters
  const rawChaps = [...html.matchAll(/<div class=\"chap_name\">\s*<a href=\"([^\"]+)\" title=\"([^\"]+)\">[\s\S]*?Chap\s*([0-9.]+)/gi)].map(m => ({
    url: m[1].startsWith('http') ? m[1] : `https://leesincomic.com${m[1]}`,
    title: m[2].trim(),
    chapNum: parseFloat(m[3]) || 1
  }));

  // Reverse so chapter 1 is first
  rawChaps.reverse();

  console.log(`Found ${rawChaps.length} chapters for "${title}". Scraping chapter images...`);

  const chapters = [];
  for (let i = 0; i < rawChaps.length; i++) {
    const rc = rawChaps[i];
    const chapHtml = await fetchHtml(rc.url);
    const dataSrc = [...chapHtml.matchAll(/data-src=\"([^\"]+)\"/gi)].map(m => m[1].trim()).filter(Boolean);
    const cdnImages = dataSrc.length > 0 ? dataSrc : [...chapHtml.matchAll(/https:\/\/(?:tachserver\.site|tachserver\.online|leesincomic\.com)[^\"]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0].trim());

    chapters.push({
      id: `chap-${comicId}-${rc.chapNum}`,
      comicId,
      comicTitle: title,
      chapterNumber: rc.chapNum,
      title: rc.title || `Chap ${rc.chapNum}`,
      isPasswordProtected: false,
      password: '',
      scheduledDate: '',
      views: Math.max(10, Math.round(views / Math.max(1, rawChaps.length))),
      images: cdnImages,
      teamId,
      teamName,
      createdAt: 'Vừa xong'
    });

    if ((i + 1) % 10 === 0 || i === rawChaps.length - 1) {
      console.log(`  Scraped ${i + 1}/${rawChaps.length} chapters for "${title}"`);
    }
  }

  return {
    id: comicId,
    title,
    slug: standardSlug,
    otherNames,
    coverImage: coverImage || 'https://tachserver.site/cdn3/uploads/minh_hoa/default.jpg',
    bannerImage: coverImage || 'https://tachserver.site/cdn3/uploads/minh_hoa/default.jpg',
    authors: [teamName || 'Leesin Comic'],
    status: 'Đang tiến hành',
    genres: genreList,
    summary,
    teamId,
    teamName,
    views,
    dayViews: Math.round(views * 0.05),
    weekViews: Math.round(views * 0.2),
    monthViews: views,
    likes: Math.round(views * 0.1),
    follows,
    rating: 5.0,
    ratingCount: Math.max(1, Math.round(follows / 5)),
    updatedAt: 'Vừa xong',
    isHot,
    isTrending,
    seo: {
      metaTitle: `${title} - Đọc Truyện Tranh Online | Leesin Comic`,
      metaDescription: summary.slice(0, 160),
      metaKeywords: genreList.join(', '),
      canonicalUrl: `https://leesincomic.com/truyen/${standardSlug}`
    },
    chapters
  };
}

(async () => {
  const existingSlugs = new Set(store.comics.map(c => c.slug.toLowerCase()));
  const existingTitles = new Set(store.comics.map(c => c.title.toLowerCase().trim()));

  let addedCount = 0;
  for (const slug of missingSlugs) {
    const comic = await scrapeComic(slug);
    if (!comic) continue;

    if (!existingSlugs.has(comic.slug.toLowerCase()) && !existingTitles.has(comic.title.toLowerCase())) {
      store.comics.push(comic);
      existingSlugs.add(comic.slug.toLowerCase());
      existingTitles.add(comic.title.toLowerCase());
      addedCount++;
      console.log(`==> ADDED: "${comic.title}" (${comic.chapters.length} chapters)`);
    } else {
      console.log(`==> Already exists: "${comic.title}"`);
    }
  }

  console.log(`\nDone. Added ${addedCount} new comics. Total comics in store: ${store.comics.length}`);
  fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
})();
