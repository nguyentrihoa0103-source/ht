const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
const comics = store.comics || [];
const teams = store.teams || [];

const crawledTeams = fs.existsSync(path.join(ROOT_DIR, 'leesin_teams_crawled.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'leesin_teams_crawled.json'), 'utf8'))
  : [];

function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve('');
    });
  });
}

function getHashFactor(str) {
  let h = 0;
  for (let k = 0; k < str.length; k++) {
    h = (Math.imul(31, h) + str.charCodeAt(k)) | 0;
  }
  const norm = ((Math.abs(h) % 1000) / 1000) * 0.12 - 0.06;
  return 1 + norm;
}

function distributeChapterViews(c) {
  const chapters = c.chapters || [];
  const N = chapters.length;
  if (N === 0) return;
  if (N === 1) {
    chapters[0].views = Math.max(1, c.views || 100);
    return;
  }

  let totalViews = typeof c.views === 'number' && !isNaN(c.views) ? c.views : 500;
  if (totalViews < N * 15) {
    totalViews = Math.max(totalViews, N * 25);
    c.views = totalViews;
  }

  const weights = [];
  for (let i = 1; i <= N; i++) {
    let base = 1 / Math.pow(i, 0.32);
    let recency = 1;
    if (N >= 5) {
      if (i === N) recency = 0.72;
      else if (i === N - 1) recency = 0.82;
      else if (i === N - 2) recency = 0.9;
    }
    const hash = getHashFactor((c.slug || c.id || 'comic') + '-' + i);
    weights.push(base * recency * hash);
  }

  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const allocated = weights.map((w) => Math.max(1, Math.round(totalViews * (w / sumWeights))));

  let currentSum = allocated.reduce((a, b) => a + b, 0);
  let diff = totalViews - currentSum;

  let idx = 0;
  while (diff !== 0 && idx < N) {
    const step = diff > 0 ? 1 : -1;
    if (allocated[idx] + step >= 1) {
      allocated[idx] += step;
      diff -= step;
    }
    idx = (idx + 1) % N;
  }

  chapters.forEach((ch, i) => {
    ch.views = allocated[i];
  });
}

// Map href to comic
const hrefToComicMap = new Map();
for (const ct of crawledTeams) {
  // Update team official views
  const teamInStore = teams.find(
    (t) => t.name.toLowerCase().trim() === ct.name.toLowerCase().trim() ||
           (ct.href && t.id && t.id.includes(ct.href.replace(/[^0-9]/g, '')))
  );
  if (teamInStore && ct.officialViews > 0) {
    teamInStore.totalViews = Math.max(teamInStore.totalViews || 0, ct.officialViews);
  }

  for (const href of ct.comics) {
    const rawSlug = href.replace('/truyen-tranh/', '').replace('.html', '');
    const cleanRawSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]/g, '');

    const found = comics.find((c) => {
      const cSlugClean = (c.slug || '').replace(/^comic-/, '').replace(/[^a-z0-9]/g, '');
      return cSlugClean === cleanRawSlug || c.slug === rawSlug;
    });

    if (found) {
      hrefToComicMap.set(href, found);
    }
  }
}

console.log(`Mapped ${hrefToComicMap.size} exact comic URLs from team listings.`);

async function main() {
  const allHrefs = [...hrefToComicMap.keys()];
  const CONCURRENCY = 15;
  let hrefIdx = 0;
  let newChaptersAdded = 0;
  let totalViewsIncreased = 0;
  let comicsChecked = 0;

  async function worker() {
    while (hrefIdx < allHrefs.length) {
      const idx = hrefIdx++;
      const href = allHrefs[idx];
      const comic = hrefToComicMap.get(href);
      if (!comic) continue;

      const url = `https://leesincomic.com${href}`;
      try {
        const html = await fetchUrl(url, 15000);
        if (!html || html.length < 500) continue;
        comicsChecked++;

        // Views
        const viewsMatch = html.match(/Lượt xem:\s*([0-9.,]+)/i);
        if (viewsMatch) {
          const liveViews = parseInt(viewsMatch[1].replace(/[^0-9]/g, '')) || 0;
          if (liveViews > (comic.views || 0)) {
            totalViewsIncreased += liveViews - (comic.views || 0);
            comic.views = liveViews;
          }
        }

        // Follows
        const followsMatch = html.match(/Lượt theo dõi:\s*([0-9.,]+)/i);
        if (followsMatch) {
          const liveFollows = parseInt(followsMatch[1].replace(/[^0-9]/g, '')) || 0;
          if (liveFollows > (comic.follows || 0)) {
            comic.follows = liveFollows;
          }
        }

        // Chapters
        // Support both /chap-X.html and /X.html and oneshot
        const chapMatches = [
          ...html.matchAll(/<div class="chap_name">\s*<a href="([^"]+)" title="([^"]*)">[\s\S]*?(?:Chap\s*([0-9.]+)|([0-9.]+)|(oneshot))/gi)
        ];

        if (chapMatches.length > 0) {
          const liveChaps = chapMatches.map((m) => {
            const chapUrl = m[1].startsWith('http') ? m[1] : `https://leesincomic.com${m[1]}`;
            const title = m[2] ? m[2].trim() : `Chương ${m[3] || m[4] || 1}`;
            const num = parseFloat(m[3] || m[4]) || (m[5] ? 1 : 1);
            return { url: chapUrl, title, num };
          });

          // Check if any numbers are missing from comic.chapters
          const existingNums = new Set((comic.chapters || []).map((ch) => ch.chapterNumber));
          const missing = liveChaps.filter((lc) => !existingNums.has(lc.num));

          if (missing.length > 0) {
            console.log(`[+${missing.length} chaps] "${comic.title}" (local has ${comic.chapters.length}, live has ${liveChaps.length})`);
            missing.sort((a, b) => a.num - b.num);

            for (const mc of missing) {
              const chapHtml = await fetchUrl(mc.url, 12000);
              const dataSrcMatches = [...chapHtml.matchAll(/data-src="([^"]+)"/gi)]
                .map((m) => m[1])
                .filter((u) => u.includes('tachserver') || u.includes('/cdn') || u.includes('uploads'));

              const images = dataSrcMatches.length > 0 ? dataSrcMatches : [];
              const chapId = `chap-${comic.slug}-${mc.num}`;

              comic.chapters.push({
                id: chapId,
                comicId: comic.id,
                comicTitle: comic.title,
                chapterNumber: mc.num,
                title: mc.title.startsWith('Chương') ? mc.title : `Chương ${mc.num}: ${mc.title}`,
                createdAt: new Date().toLocaleDateString('vi-VN'),
                views: 50,
                isPasswordProtected: false,
                images: images,
                teamId: comic.teamId,
                teamName: comic.teamName,
              });

              newChaptersAdded++;
            }

            comic.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
            comic.updatedAt = new Date().toISOString();
          }
        }

        distributeChapterViews(comic);

        if (comicsChecked % 50 === 0) {
          console.log(`Checked ${comicsChecked}/${allHrefs.length} comics... (+${newChaptersAdded} chaps, +${totalViewsIncreased} views)`);
        }
      } catch (err) {
        // Skip on error
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\nSync complete!`);
  console.log(`New chapters added: ${newChaptersAdded}`);
  console.log(`Total views increased: ${totalViewsIncreased}`);

  // Re-calculate each team's total views from their comics
  teams.forEach((t) => {
    const teamComics = comics.filter(
      (c) => c.teamId === t.id || (c.teamName && t.name && c.teamName.toLowerCase().trim() === t.name.toLowerCase().trim())
    );
    const comicsViews = teamComics.reduce((s, c) => s + (c.views || 0), 0);
    t.totalViews = Math.max(t.totalViews || 0, comicsViews);
  });

  // Save to data_store.json
  fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('Saved data_store.json');

  // Rebuild all initial data files
  require('./build_full_initial_data.cjs');
}

main().catch(console.error);
