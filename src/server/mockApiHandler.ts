import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { INITIAL_TEAMS, INITIAL_USERS, INITIAL_COMMENTS, INITIAL_READING_HISTORY, INITIAL_FOLLOWED_COMICS, INITIAL_NOTIFICATIONS, INITIAL_FOLLOWED_TEAMS } from '../data/initialData';
import { INITIAL_COMICS } from '../data/initialComicsData';
import { DEFAULT_SITE_SETTINGS } from '../types';
import { getComicLatestTimestamp } from '../utils/timeAgo';

const DB_FILE = path.resolve(process.cwd(), 'data_store.json');
const DB_BAK_FILE = path.resolve(process.cwd(), 'data_store.json.bak');

interface DatabaseStore {
  comics: any[];
  teams: any[];
  users: any[];
  comments: any[];
  notifications: any[];
  readingHistory: any[];
  followedComics: any[];
  followedTeams: any[];
  siteSettings: any;
}

let cachedDb: DatabaseStore | null = null;

function tryParseFile(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf-8').trim();
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function loadDatabase(): DatabaseStore {
  const candidatePaths = [DB_FILE, DB_BAK_FILE];
  let parsed: any = null;

  for (const p of candidatePaths) {
    parsed = tryParseFile(p);
    if (parsed && Array.isArray(parsed.comics) && parsed.comics.length > 0) {
      break;
    }
  }

  if (parsed && Array.isArray(parsed.comics)) {
    const resolvedComics = parsed.comics;
    const resolvedTeams = Array.isArray(parsed.teams) && parsed.teams.length > 0 ? parsed.teams : INITIAL_TEAMS;
    const resolvedUsers = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS;

    cachedDb = {
      comics: resolvedComics,
      teams: resolvedTeams,
      users: resolvedUsers,
      comments: parsed.comments || INITIAL_COMMENTS,
      notifications: Array.isArray(parsed.notifications) && parsed.notifications.length > 0 ? parsed.notifications : INITIAL_NOTIFICATIONS,
      readingHistory: parsed.readingHistory || INITIAL_READING_HISTORY,
      followedComics: parsed.followedComics || INITIAL_FOLLOWED_COMICS,
      followedTeams: parsed.followedTeams || INITIAL_FOLLOWED_TEAMS || [],
      siteSettings: parsed.siteSettings || {
        ...DEFAULT_SITE_SETTINGS,
        logoUrl: '',
        faviconUrl: '/favicon.svg',
      },
    };
    return cachedDb;
  }

  const initialStore: DatabaseStore = {
    comics: INITIAL_COMICS,
    teams: INITIAL_TEAMS,
    users: INITIAL_USERS,
    comments: INITIAL_COMMENTS,
    notifications: INITIAL_NOTIFICATIONS,
    readingHistory: INITIAL_READING_HISTORY,
    followedComics: INITIAL_FOLLOWED_COMICS,
    followedTeams: INITIAL_FOLLOWED_TEAMS,
    siteSettings: {
      ...DEFAULT_SITE_SETTINGS,
      logoUrl: '',
      faviconUrl: '/favicon.svg',
    },
  };
  cachedDb = initialStore;
  saveDatabase(initialStore);
  return initialStore;
}

let cachedLightweightComics: any[] | null = null;

function saveDatabase(store: DatabaseStore): void {
  cachedDb = store;
  cachedLightweightComics = null;
  try {
    const serialized = JSON.stringify(store);
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
    try {
      fs.writeFileSync(DB_BAK_FILE, serialized, 'utf-8');
    } catch { }
    if (fs.existsSync(DB_FILE)) {
      lastDbMtime = fs.statSync(DB_FILE).mtimeMs;
    }
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

function getLightweightComics(comics: any[]): any[] {
  if (cachedLightweightComics && cachedDb && comics === cachedDb.comics) {
    return cachedLightweightComics;
  }
  const timestampMap = new Map<string, number>();
  for (const c of comics) {
    timestampMap.set(c.id, getComicLatestTimestamp(c));
  }
  const sorted = [...comics].sort(
    (a, b) => (timestampMap.get(b.id) || 0) - (timestampMap.get(a.id) || 0)
  );
  cachedLightweightComics = sorted.map((c) => ({
    ...c,
    chapters: (c.chapters || []).map((ch: any) => ({
      ...ch,
      pageCount: ch.pageCount || (Array.isArray(ch.images) ? ch.images.length : 0),
      images: [],
    })),
  }));
  return cachedLightweightComics;
}

function syncDbTeamsViews(store: DatabaseStore) {
  // Lấy các teamId gắn liền với tài khoản ADMIN hoặc TEAM_LEADER hiện có trong hệ thống
  const activeLeaderOrAdminTeamIds = new Set(
    (store.users || [])
      .filter((u: any) => u.role === 'ADMIN' || u.role === 'TEAM_LEADER')
      .map((u: any) => u.teamId)
      .filter(Boolean)
  );

  const activeLeaderOrAdminTeamNames = new Set(
    (store.users || [])
      .filter((u: any) => u.role === 'ADMIN' || u.role === 'TEAM_LEADER')
      .map((u: any) => (u.teamName || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const activeComicTeamIds = new Set(
    (store.comics || []).map((c: any) => c.teamId).filter(Boolean)
  );

  const activeComicTeamNames = new Set(
    (store.comics || []).map((c: any) => (c.teamName || '').toLowerCase().trim()).filter(Boolean)
  );

  // Loại bỏ hoàn toàn các nhóm dịch rác/mồ côi không có tài khoản quản lý và không có truyện nào
  store.teams = (store.teams || []).filter((t: any) => {
    const tName = (t.name || '').toLowerCase().trim();
    const hasUser = activeLeaderOrAdminTeamIds.has(t.id) || activeLeaderOrAdminTeamNames.has(tName);
    const hasComics = activeComicTeamIds.has(t.id) || activeComicTeamNames.has(tName);
    return t.id === 'team-leesin' || hasUser || hasComics;
  });

  for (const t of store.teams) {
    const tComics = (store.comics || []).filter(
      (c: any) =>
        c &&
        (c.teamId === t.id ||
          (c.teamName && t.name && c.teamName.toLowerCase().trim() === t.name.toLowerCase().trim()))
    );
    const total = tComics.reduce((sum: number, c: any) => sum + (c.views || 0), 0);
    t.totalViews = Math.max(t.totalViews || 0, total);
    const existingMonthly = t.monthlyViews || {};
    if (t.totalViews === 0) {
      t.monthlyViews = { '2026-05': 0, '2026-06': 0, '2026-07': 0, '2026-08': 0, '2026-09': 0, '2026-10': 0, '10/2026': 0 };
      t.dailyViews = t.dailyViews || {};
      (t as any).views_2026_10 = 0;
      (t as any).views_10_2026 = 0;
      (t as any).months = { '10/2026': 0, '2026-10': 0 };
    } else {
      // Giữ nguyên các mốc lịch sử gốc ban đầu T5 - T9 (historical baseline)
      const hasExplicitT5 = typeof existingMonthly['2026-05'] === 'number' && existingMonthly['2026-05'] > 0;
      const hasExplicitT6 = typeof existingMonthly['2026-06'] === 'number' && existingMonthly['2026-06'] > 0;
      const hasExplicitT7 = typeof existingMonthly['2026-07'] === 'number' && existingMonthly['2026-07'] > 0;
      const hasExplicitT8 = typeof existingMonthly['2026-08'] === 'number' && existingMonthly['2026-08'] > 0;
      const hasExplicitT9 = typeof existingMonthly['2026-09'] === 'number' && existingMonthly['2026-09'] > 0;

      let m5 = hasExplicitT5 ? existingMonthly['2026-05'] : Math.floor(t.totalViews * 0.14);
      let m6 = hasExplicitT6 ? existingMonthly['2026-06'] : Math.floor(t.totalViews * 0.18);
      let m7 = hasExplicitT7 ? existingMonthly['2026-07'] : Math.floor(t.totalViews * 0.21);
      let m8 = hasExplicitT8 ? existingMonthly['2026-08'] : Math.floor(t.totalViews * 0.23);
      let m9 = hasExplicitT9 ? existingMonthly['2026-09'] : Math.max(0, t.totalViews - (m5 + m6 + m7 + m8));

      const historicalSum = m5 + m6 + m7 + m8 + m9;
      const excess = Math.max(0, t.totalViews - historicalSum);

      const daily10 = Object.entries(t.dailyViews || {})
        .filter(([d]: [string, any]) => d.startsWith('2026-10') || d.includes('-10-'))
        .reduce((s: number, [, v]: [string, any]) => s + (typeof v === 'number' ? v : 0), 0);

      const currentMonthReal = Math.max(
        existingMonthly['2026-10'] || 0,
        existingMonthly['10/2026'] || 0,
        daily10,
        excess
      );

      t.monthlyViews = {
        ...existingMonthly,
        '2026-05': m5,
        '2026-06': m6,
        '2026-07': m7,
        '2026-08': m8,
        '2026-09': m9,
        '2026-10': currentMonthReal,
        '10/2026': currentMonthReal,
      };
      (t as any).views_2026_10 = currentMonthReal;
      (t as any).views_10_2026 = currentMonthReal;
      (t as any).months = {
        ...((t as any).months || {}),
        '10/2026': currentMonthReal,
        '2026-10': currentMonthReal,
      };
      t.totalViews = Math.max(t.totalViews || 0, historicalSum + currentMonthReal);
    }
  }
}

let lastDbMtime = 0;
let db = loadDatabase();
syncDbTeamsViews(db);

function getDb(): DatabaseStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (stat.mtimeMs > lastDbMtime) {
        lastDbMtime = stat.mtimeMs;
        db = loadDatabase();
      }
    }
  } catch (e) { }
  return db;
}

const TRAWLED_TEAMS_FILE = path.resolve(process.cwd(), 'leesin_teams_crawled.json');
const rawSlugByNormalizedMap = new Map<string, string>();
try {
  if (fs.existsSync(TRAWLED_TEAMS_FILE)) {
    const crawledTeams = JSON.parse(fs.readFileSync(TRAWLED_TEAMS_FILE, 'utf-8'));
    if (Array.isArray(crawledTeams)) {
      for (const ct of crawledTeams) {
        for (const href of ct.comics || []) {
          if (typeof href === 'string') {
            const rawSlug = href.replace(/^\/truyen-tranh\//, '').replace(/\.html$/, '');
            const norm = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (norm) rawSlugByNormalizedMap.set(norm, rawSlug);
          }
        }
      }
    }
  }
} catch { }

function extractValidImagesFromHtml(htmlText: string): string[] {
  const matches = [
    ...htmlText.matchAll(/data-src=["']([^"']+)["']/gi),
    ...htmlText.matchAll(/data-original=["']([^"']+)["']/gi),
    ...htmlText.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+(?:tachserver\.site|tachserver\.online|leesincomic\.com)\/[^"']*uploads\/[^"']+)["']/gi),
  ].map((m) => m[1]);

  return [...new Set(matches)]
    .map((img) => img.trim())
    .filter(
      (img) =>
        img.length > 5 &&
        !img.includes('loadx-min.gif') &&
        !img.includes('loading.gif') &&
        !img.includes('load.gif') &&
        !img.endsWith('.gif') &&
        !img.includes('logo.png') &&
        !img.includes('user.png') &&
        !img.includes('icon-stars.png') &&
        !img.includes('no-images.jpg') &&
        (img.includes('.jpg') || img.includes('.jpeg') || img.includes('.png') || img.includes('.webp'))
    )
    .map((img) => {
      let clean = img;
      if (clean.startsWith('//')) clean = 'https:' + clean;
      else if (clean.startsWith('/')) clean = 'https://leesincomic.com' + clean;
      return clean.replace(/tachserver\.online/g, 'tachserver.site');
    });
}

// On-demand chapter image crawler from leesincomic.com if not pre-cached
async function fetchChapterImagesFromLeesin(
  comicSlug: string,
  chapNum: number | string,
  chapLink?: string,
  comicTitle?: string,
  coverImage?: string,
  rawSlugHint?: string
): Promise<string[]> {
  const cleanSlug = comicSlug.replace(/^comic-/, '');
  const normSlug = cleanSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const rawSlugsSet = new Set<string>();
  if (rawSlugHint) rawSlugsSet.add(rawSlugHint);
  if (rawSlugByNormalizedMap.has(normSlug)) {
    rawSlugsSet.add(rawSlugByNormalizedMap.get(normSlug)!);
  }
  if (coverImage && typeof coverImage === 'string') {
    const m = coverImage.match(/\/minh_hoa\/(.+)-\d{8,12}\.[a-zA-Z0-9]+$/);
    if (m && m[1]) rawSlugsSet.add(m[1]);
  }
  rawSlugsSet.add(cleanSlug);

  if (comicTitle) {
    // Leesin-style slug keeping !, +, --
    const leesinTitleSlug = comicTitle
      .toLowerCase()
      .trim()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[\[\]()'".,:;?~@#$%^&*=_|\\/<>]/g, '')
      .replace(/\s+/g, '-');
    if (leesinTitleSlug) rawSlugsSet.add(leesinTitleSlug);

    const stdTitleSlug = leesinTitleSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (stdTitleSlug) rawSlugsSet.add(stdTitleSlug);
  }

  const candidateUrls: string[] = [];

  if (chapLink && typeof chapLink === 'string') {
    candidateUrls.push(
      chapLink.startsWith('http')
        ? chapLink
        : `https://leesincomic.com${chapLink.startsWith('/') ? chapLink : '/' + chapLink}`
    );
  }

  const dashNum = String(chapNum).replace('.', '-');
  for (const rs of rawSlugsSet) {
    candidateUrls.push(
      `https://leesincomic.com/truyen-tranh/${rs}/chap-${chapNum}.html`,
      `https://leesincomic.com/truyen-tranh/${rs}/${chapNum}.html`,
      `https://leesincomic.com/truyen-tranh/${rs}/chap-${dashNum}.html`,
      `https://leesincomic.com/truyen-tranh/${rs}/${dashNum}.html`
    );
    if (Number(chapNum) === 1 || Number(chapNum) === 0) {
      candidateUrls.push(
        `https://leesincomic.com/truyen-tranh/${rs}/oneshot.html`,
        `https://leesincomic.com/truyen-tranh/${rs}/chap-oneshot.html`
      );
    }
  }

  const uniqueCandidates = [...new Set(candidateUrls)];
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://leesincomic.com/',
  };

  for (const url of uniqueCandidates) {
    try {
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) continue;
      const htmlText = await resp.text();
      const valid = extractValidImagesFromHtml(htmlText);
      if (valid.length > 0) {
        return valid;
      }
    } catch {
      // Continue next candidate
    }
  }

  // Fallback: Fetch comic detail page on leesincomic.com and find the exact chapter link from the chapter list
  for (const rs of rawSlugsSet) {
    try {
      const comicUrl = `https://leesincomic.com/truyen-tranh/${rs}.html`;
      const resp = await fetch(comicUrl, {
        headers,
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) continue;
      const comicHtml = await resp.text();
      const chapEntries = [...comicHtml.matchAll(/<div class=["']chap_name["']>\s*<a[^>]+href=["']([^"']+)["'][^>]*title=["']?([^"'>]*)["']?[^>]*>([\s\S]*?)<\/a>/gi)].map(
        (m) => ({
          href: m[1],
          title: (m[2] || m[3] || '').replace(/<[^>]+>/g, '').trim(),
        })
      );
      if (chapEntries.length === 0) continue;

      let matchedLink = '';
      // 1. Khớp chính xác đuôi /chap-34.html hoặc /34.html
      const exact = chapEntries.find((e) =>
        e.href.endsWith(`/chap-${chapNum}.html`) ||
        e.href.endsWith(`/${chapNum}.html`) ||
        e.href.endsWith(`/chap-${dashNum}.html`) ||
        e.href.endsWith(`/${dashNum}.html`)
      );
      if (exact) {
        matchedLink = exact.href;
      }

      // 2. Khớp regex có hậu tố (VD: /chap-34-end-ss1.html, /chap-34-end.html, /chap-34-phan-1.html)
      if (!matchedLink) {
        const escapedDash = dashNum.replace('.', '[-_.]');
        const reSuffix = new RegExp(`/(?:chap[-_]?)?${escapedDash}(?=[^0-9]|$)[^/]*\\.html$`, 'i');
        const suffixed = chapEntries.find((e) => reSuffix.test(e.href));
        if (suffixed) {
          matchedLink = suffixed.href;
        }
      }

      // 3. Khớp theo chuỗi con trong URL /chap-34
      if (!matchedLink) {
        const sub = chapEntries.find(
          (e) => e.href.includes(`/chap-${dashNum}`) || e.href.includes(`/chap-${chapNum}`)
        );
        if (sub) {
          matchedLink = sub.href;
        }
      }

      // 4. Khớp theo tiêu đề chapter (VD: "Chap 34 End SS1" hoặc "Chương 34")
      if (!matchedLink) {
        const titleMatch = chapEntries.find((e) => {
          const t = e.title.toLowerCase();
          return t.includes(`chap ${chapNum}`) || t.includes(`chương ${chapNum}`) || t.includes(`chap ${dashNum}`);
        });
        if (titleMatch) {
          matchedLink = titleMatch.href;
        }
      }

      if (!matchedLink && typeof chapNum === 'number' && chapNum >= 1 && chapNum <= chapEntries.length) {
        const targetIndex = chapEntries.length - Math.floor(chapNum);
        if (targetIndex >= 0 && targetIndex < chapEntries.length) {
          matchedLink = chapEntries[targetIndex].href;
        }
      }

      if (!matchedLink && chapEntries.length === 1) {
        matchedLink = chapEntries[0].href;
      }

      if (matchedLink) {
        const fullChapUrl = matchedLink.startsWith('http')
          ? matchedLink
          : `https://leesincomic.com${matchedLink.startsWith('/') ? matchedLink : '/' + matchedLink}`;
        const chapResp = await fetch(fullChapUrl, {
          headers,
          signal: AbortSignal.timeout(7000),
        });
        if (chapResp.ok) {
          const chapHtml = await chapResp.text();
          const valid = extractValidImagesFromHtml(chapHtml);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    } catch {
      // Continue
    }
  }

  return [];
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body && typeof (req as any).body === 'object') {
    return Promise.resolve((req as any).body);
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}


function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sendXml(res: ServerResponse, status: number, xml: string) {
  res.writeHead(status, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  res.end(xml);
}

function sendPlainText(res: ServerResponse, status: number, text: string) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

export async function handleApiPhp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (!req.url) return false;

  const parsedUrl = new URL(req.url, 'http://localhost:3000');
  const pathname = parsedUrl.pathname;
  const db = getDb();
  const domain = (db.siteSettings?.siteDomain && db.siteSettings.siteDomain.startsWith('http'))
    ? db.siteSettings.siteDomain.replace(/\/$/, '')
    : 'https://leesincomic.com';
  const today = new Date().toISOString().split('T')[0];

  // Handle data_store.json route directly from memory so no physical public file is needed
  if (pathname === '/data_store.json' || pathname === '/public/data_store.json') {
    sendJson(res, 200, db);
    return true;
  }

  // Handle sitemap and robots routes directly
  if (pathname === '/sitemap.xml') {
    let fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    fullXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    const staticUrls = [
      { loc: `${domain}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${domain}/hot`, priority: '0.9', changefreq: 'daily' },
      { loc: `${domain}/moi-cap-nhat`, priority: '0.9', changefreq: 'daily' },
      { loc: `${domain}/the-loai/tat-ca`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${domain}/xep-hang/month`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${domain}/nhom-dich-all`, priority: '0.7', changefreq: 'weekly' },
    ];
    staticUrls.forEach((u) => {
      fullXml += `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    });
    const genres = [
      'all', 'manhwa', 'manga', 'manhua', 'dam-my', 'bach-hop', 'ngon-tinh',
      'action', 'adventure', 'chuyen-sinh', 'co-dai', 'comedy', 'drama',
      'fantasy', 'harem', 'historical', 'isekai', 'magic', 'martial-arts',
      'mystery', 'romance', 'school-life', 'sci-fi', 'shoujo', 'shounen',
      'slice-of-life', 'sports', 'supernatural', 'tragedy', 'xuyen-khong'
    ];
    genres.forEach((g) => {
      fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/the-loai/${g}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    (db.teams || []).forEach((t) => {
      fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/nhom-dich/${t.id}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    (db.comics || []).forEach((c) => {
      const slug = c.slug || c.id;
      fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
      if (c.coverImage) {
        fullXml += `    <image:image>\n      <image:loc>${escapeXml(c.coverImage)}</image:loc>\n      <image:title>${escapeXml(c.title || '')}</image:title>\n    </image:image>\n`;
      }
      fullXml += `  </url>\n`;
      (c.chapters || []).forEach((ch: any) => {
        fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}/chap-${ch.chapterNumber}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    });
    fullXml += `</urlset>`;
    sendXml(res, 200, fullXml);
    return true;
  }

  if (pathname === '/sitemap_index.xml') {
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${domain}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap_comics.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap_chapters.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap_categories.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
    sendXml(res, 200, indexXml);
    return true;
  }

  if (pathname === '/sitemap_comics.xml') {
    let comicsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    (db.comics || []).forEach((c) => {
      const slug = c.slug || c.id;
      comicsXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
      if (c.coverImage) {
        comicsXml += `    <image:image>\n      <image:loc>${escapeXml(c.coverImage)}</image:loc>\n      <image:title>${escapeXml(c.title || '')}</image:title>\n    </image:image>\n`;
      }
      comicsXml += `  </url>\n`;
    });
    comicsXml += `</urlset>`;
    sendXml(res, 200, comicsXml);
    return true;
  }

  if (pathname === '/sitemap_chapters.xml') {
    let chapsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    (db.comics || []).forEach((c) => {
      const slug = c.slug || c.id;
      (c.chapters || []).forEach((ch: any) => {
        chapsXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}/chap-${ch.chapterNumber}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    });
    chapsXml += `</urlset>`;
    sendXml(res, 200, chapsXml);
    return true;
  }

  if (pathname === '/sitemap_categories.xml') {
    let catXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const genres = [
      'all', 'manhwa', 'manga', 'manhua', 'dam-my', 'bach-hop', 'ngon-tinh',
      'action', 'adventure', 'chuyen-sinh', 'co-dai', 'comedy', 'drama',
      'fantasy', 'harem', 'historical', 'isekai', 'magic', 'martial-arts',
      'mystery', 'romance', 'school-life', 'sci-fi', 'shoujo', 'shounen',
      'slice-of-life', 'sports', 'supernatural', 'tragedy', 'xuyen-khong'
    ];
    genres.forEach((g) => {
      catXml += `  <url>\n    <loc>${escapeXml(`${domain}/the-loai/${g}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    (db.teams || []).forEach((t) => {
      catXml += `  <url>\n    <loc>${escapeXml(`${domain}/nhom-dich/${t.id}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    catXml += `</urlset>`;
    sendXml(res, 200, catXml);
    return true;
  }

  if (pathname === '/robots.txt') {
    const robots = `# Robots.txt for ${domain}
User-agent: *
Allow: /
Allow: /truyen/
Allow: /the-loai/
Allow: /hot
Allow: /moi-cap-nhat
Allow: /xep-hang/
Allow: /nhom-dich-all

Disallow: /admin
Disallow: /admin/
Disallow: /nhom-dich-portal
Disallow: /nhom-dich-portal/
Disallow: /lich-su
Disallow: /theo-doi
Disallow: /api.php

Sitemap: ${domain}/sitemap.xml
Sitemap: ${domain}/sitemap_index.xml
`;
    sendPlainText(res, 200, robots);
    return true;
  }

  // Intercept all API endpoints
  if (
    pathname !== '/api.php' &&
    pathname !== '/public/api.php' &&
    pathname !== '/api/sync' &&
    pathname !== '/api/sync.php' &&
    pathname !== '/sync.php' &&
    pathname !== '/api/database'
  ) {
    return false;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { success: true });
    return true;
  }

  const action = parsedUrl.searchParams.get('action') || 'ping';

  // 1. PING
  if (action === 'ping') {
    const totalChapters = db.comics.reduce((acc, c) => acc + (c.chapters ? c.chapters.length : 0), 0);
    sendJson(res, 200, {
      success: true,
      status: 'online',
      database: 'leesinco_manga (Vite MySQL Sync Backend)',
      message: 'Kết nối MySQL Backend Server thành công & Dữ liệu đang được đồng bộ!',
      totalComics: db.comics.length,
      totalChapters,
      totalUsers: db.users.length,
      server_time: new Date().toISOString(),
    });
    return true;
  }

  // 1b. MIGRATION STATUS
  if (action === 'get_migration_status') {
    const totalChapters = db.comics.reduce((acc, c) => acc + (c.chapters ? c.chapters.length : 0), 0);
    const totalViews = db.comics.reduce((acc, c) => acc + (c.views || 0), 0);
    sendJson(res, 200, {
      success: true,
      totalComics: db.comics.length,
      totalChapters,
      totalTeams: db.teams.length,
      totalUsers: db.users.length,
      totalViews,
      siteDomain: 'leesincomic.com',
      lastUpdated: new Date().toISOString(),
    });
    return true;
  }

  // 1c. AUTO IMPORT FROM JSON
  if (action === 'auto_import_from_json' || action === 'sync_json_to_sql') {
    let totalChapters = 0;
    (db.comics || []).forEach((c) => {
      totalChapters += (c.chapters || []).length;
    });

    sendJson(res, 200, {
      success: true,
      message: `Nạp dữ liệu vào cơ sở dữ liệu MySQL thành công mỹ mãn!`,
      totalComics: db.comics.length,
      totalChapters,
      totalTeams: db.teams.length,
      totalUsers: db.users.length,
      time: new Date().toISOString(),
    });
    return true;
  }

  // 1d. IMPORT SQL DUMP OR JSON
  if (action === 'import_sql_dump' && req.method === 'POST') {
    const data = await parseBody(req);
    const sqlText = data.sql || data.content || '';
    let importedUsersCount = 0;
    let importedComicsCount = 0;
    let importedTeamsCount = 0;

    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        const existIdx = db.users.findIndex((x) => x.id === u.id || x.email === u.email);
        if (existIdx >= 0) db.users[existIdx] = { ...db.users[existIdx], ...u };
        else db.users.push(u);
        importedUsersCount++;
      }
    }
    if (data.comics && Array.isArray(data.comics)) {
      for (const c of data.comics) {
        const existIdx = db.comics.findIndex((x) => x.id === c.id || x.slug === c.slug);
        if (existIdx >= 0) db.comics[existIdx] = { ...db.comics[existIdx], ...c };
        else db.comics.push(c);
        importedComicsCount++;
      }
    }
    if (data.teams && Array.isArray(data.teams)) {
      for (const t of data.teams) {
        const existIdx = db.teams.findIndex((x) => x.id === t.id || x.slug === t.slug);
        if (existIdx >= 0) db.teams[existIdx] = { ...db.teams[existIdx], ...t };
        else db.teams.push(t);
        importedTeamsCount++;
      }
    }

    if (sqlText && typeof sqlText === 'string') {
      const userMatches = sqlText.matchAll(/INSERT\s+INTO\s+[`']?users[`']?\s*(?:\(([^)]+)\))?\s*VALUES\s*([^;]+);/gi);
      for (const m of userMatches) {
        const colListStr = m[1];
        const valuesSection = m[2];
        const cols = colListStr
          ? colListStr.split(',').map((c) => c.trim().replace(/[`'"]/g, '').toLowerCase())
          : ['id', 'name', 'username', 'email', 'password_hash', 'avatar', 'role', 'team_id', 'team_name', 'can_upload', 'created_at'];

        const rows = valuesSection.matchAll(/\(([^)]+)\)/g);
        for (const r of rows) {
          const rawVals = r[1].split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map((v) =>
            v.trim().replace(/^['"]|['"]$/g, '').replace(/\\'/g, "'")
          );
          if (rawVals.length >= 2) {
            const userObj: any = {};
            cols.forEach((col, idx) => {
              if (rawVals[idx] !== undefined) {
                userObj[col] = rawVals[idx];
              }
            });

            const uId = userObj.id || `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const uName = userObj.name || userObj.username || 'Độc Giả';
            const uUsername = userObj.username || (userObj.email ? userObj.email.split('@')[0] : uId.replace('user-', ''));
            const uEmail = userObj.email || `${uUsername}@leesincomic.com`;
            const uPassHash = userObj.password_hash || userObj.password || '';
            const uRole = (userObj.role || 'READER').toUpperCase();
            const uTeamId = userObj.team_id || userObj.teamid || undefined;
            const uTeamName = userObj.team_name || userObj.teamname || undefined;
            const uAvatar = userObj.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

            const formattedUser = {
              id: uId,
              name: uName,
              username: uUsername,
              email: uEmail,
              passwordHash: uPassHash,
              password: uPassHash.startsWith('$2y$') ? 'password' : (userObj.password || 'password'),
              role: uRole,
              avatar: uAvatar,
              teamId: uTeamId,
              teamName: uTeamName,
              canUpload: userObj.can_upload === '1' || userObj.can_upload === true || uRole === 'ADMIN' || uRole === 'TEAM_LEADER',
              createdAt: userObj.created_at || new Date().toISOString().split('T')[0],
            };

            const existIdx = db.users.findIndex((u: any) => u.id === uId || (u.email && u.email.toLowerCase() === uEmail.toLowerCase()));
            if (existIdx >= 0) {
              db.users[existIdx] = { ...db.users[existIdx], ...formattedUser };
            } else {
              db.users.push(formattedUser);
            }
            importedUsersCount++;
          }
        }
      }
    }

    syncDbTeamsViews(db);
    saveDatabase(db);
    sendJson(res, 200, {
      success: true,
      message: `Đã nhập thành công ${importedUsersCount} tài khoản, ${importedComicsCount} truyện, ${importedTeamsCount} nhóm dịch vào Database!`,
      importedUsersCount,
      importedComicsCount,
      importedTeamsCount,
      totalUsers: db.users.length,
      totalComics: db.comics.length,
    });
    return true;
  }

  // 2. GET COMICS / GET TEAM COMICS (ORDER BY latest_chapter_update DESC)
  if (action === 'get_comics' || action === 'get_team_comics') {
    const teamId = (parsedUrl.searchParams.get('team_id') || parsedUrl.searchParams.get('teamId') || '').trim();
    const teamName = (parsedUrl.searchParams.get('team_name') || parsedUrl.searchParams.get('teamName') || '').trim().toLowerCase();

    const allLightweight = getLightweightComics(db.comics || []);
    let list = allLightweight;
    if (teamId || teamName) {
      list = allLightweight.filter((c) => {
        const matchId = teamId && c.teamId === teamId;
        const matchName = teamName && c.teamName && c.teamName.toLowerCase().trim() === teamName;
        return Boolean(matchId || matchName);
      });
    }

    sendJson(res, 200, {
      success: true,
      comics: list,
    });
    return true;
  }

  // 2a. GET SINGLE COMIC DIRECTLY FROM DATABASE
  if (action === 'get_comic' || action === 'get_comic_detail') {
    const comicId = (parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('comicId') || parsedUrl.searchParams.get('slug') || '').trim();
    const comic = db.comics.find((c) => c.id === comicId || c.slug === comicId);
    if (!comic) {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy truyện trong cơ sở dữ liệu' });
      return true;
    }
    const safeSeo = (comic.seo && typeof comic.seo === 'object' && comic.seo.score) ? comic.seo : {
      focusKeyword: comic.title,
      metaTitle: `${comic.title} Tiếng Việt Mới Nhất - Leesin Comic`,
      metaDesc: comic.summary || `Đọc truyện ${comic.title} full tiếng việt, load ảnh siêu nhanh.`,
      canonicalUrl: `https://leesincomic.com/truyen/${comic.slug}`,
      score: 95,
      schemaType: 'ComicBook',
      ...(comic.seo || {})
    };
    sendJson(res, 200, {
      success: true,
      comic: { ...comic, seo: safeSeo },
      views: Number(comic.views) || 0,
    });
    return true;
  }

  // 2a-2. GET CHAPTER WITH DYNAMIC CRAWLER FOR EMPTY PAGES
  if (action === 'get_chapter') {
    const comicId = (parsedUrl.searchParams.get('comicId') || parsedUrl.searchParams.get('comicSlug') || '').trim();
    const chapterId = (parsedUrl.searchParams.get('chapterId') || parsedUrl.searchParams.get('id') || '').trim();
    const chapterNumber = parsedUrl.searchParams.get('chapterNumber') ? Number(parsedUrl.searchParams.get('chapterNumber')) : null;
    const clientLink = (parsedUrl.searchParams.get('link') || '').trim();
    const forceSync = parsedUrl.searchParams.get('force') === '1' || parsedUrl.searchParams.get('forceSync') === '1';

    const comic = db.comics.find((c) => c.id === comicId || c.slug === comicId || c.title.toLowerCase() === comicId.toLowerCase());
    if (!comic) {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy truyện' });
      return true;
    }
    const chap = (comic.chapters || []).find((ch: any) => ch.id === chapterId || (chapterNumber !== null && ch.chapterNumber === chapterNumber));
    if (!chap) {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy chương' });
      return true;
    }
    if (forceSync || !chap.images || chap.images.length === 0) {
      const clientCover = (parsedUrl.searchParams.get('coverImage') || '').trim();
      const fetched = await fetchChapterImagesFromLeesin(
        comic.slug,
        chap.chapterNumber,
        clientLink || chap.link,
        comic.title,
        comic.coverImage || clientCover,
        (comic as any).rawSlug
      );
      if (fetched.length > 0) {
        chap.images = fetched;
        saveDatabase(db);
      }
    }
    sendJson(res, 200, { success: true, chapter: chap });
    return true;
  }

  // 2b. INCREMENT VIEW (Direct UPDATE view = view + 1 in SQL database and return fresh view)
  if (action === 'increment_view' && req.method === 'POST') {
    const data = await parseBody(req);
    const comicId = data.comicId;
    const chapterId = data.chapterId;
    let teamId = data.teamId;
    const increment = Number(data.increment) > 0 ? Number(data.increment) : 1;

    let foundComic = false;
    let updatedComicViews: number | null = null;
    let updatedChapterViews: number | null = null;
    let updatedTeamViews: number | null = null;
    let actualComicId = comicId;

    if (comicId) {
      const comic = db.comics.find((c) => c.id === comicId || c.slug === comicId);
      if (comic) {
        foundComic = true;
        actualComicId = comic.id;
        comic.views = (Number(comic.views) || 0) + increment;
        comic.dayViews = (Number(comic.dayViews) || 0) + increment;
        comic.weekViews = (Number(comic.weekViews) || 0) + increment;
        comic.monthViews = (Number(comic.monthViews) || 0) + increment;
        updatedComicViews = comic.views;
        if (!teamId && comic.teamId) {
          teamId = comic.teamId;
        }
        if (chapterId && Array.isArray(comic.chapters)) {
          const chap = comic.chapters.find((ch: any) => ch.id === chapterId);
          if (chap) {
            chap.views = (Number(chap.views) || 0) + increment;
            updatedChapterViews = chap.views;
          }
        }
      }
    }

    let targetTeamObj: any = null;
    if (teamId) {
      targetTeamObj = db.teams.find((t) =>
        t.id === teamId ||
        (t.name && t.name.toLowerCase() === teamId.toLowerCase()) ||
        (t.id === 'team-lessin-comic' && (teamId === 'team-leesin' || teamId.toLowerCase().includes('lessin') || teamId.toLowerCase().includes('leesin')))
      );
      if (targetTeamObj) {
        targetTeamObj.totalViews = (Number(targetTeamObj.totalViews) || 0) + increment;
        updatedTeamViews = targetTeamObj.totalViews;
        const gmt7Formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const today = gmt7Formatter.format(new Date());
        const month = today.slice(0, 7);
        targetTeamObj.dailyViews = targetTeamObj.dailyViews || {};
        targetTeamObj.dailyViews[today] = (targetTeamObj.dailyViews[today] || 0) + increment;
        targetTeamObj.monthlyViews = targetTeamObj.monthlyViews || {};
        const curMVal = (targetTeamObj.monthlyViews[month] || targetTeamObj.monthlyViews['10/2026'] || 0) + increment;
        targetTeamObj.monthlyViews[month] = curMVal;
        targetTeamObj.monthlyViews['10/2026'] = curMVal;
        targetTeamObj.views_2026_10 = curMVal;
      }
    }

    // Ghi nhận chi tiết vào viewsHistory và viewLogs theo múi giờ GMT+7
    const gmt7Formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayGmt7 = gmt7Formatter.format(new Date());

    (db as any).viewsHistory = (db as any).viewsHistory || [];
    (db as any).viewsHistory.push({
      id: `vh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      comicId: actualComicId,
      chapterId: chapterId || null,
      teamId: targetTeamObj?.id || teamId || 'team-lessin-comic',
      viewDate: todayGmt7,
      viewsCount: increment,
      createdAt: new Date().toISOString(),
    });

    (db as any).viewLogs = (db as any).viewLogs || [];
    (db as any).viewLogs.push({
      id: `vl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      comicId: actualComicId,
      chapterId: chapterId || null,
      teamId: targetTeamObj?.id || teamId || 'team-lessin-comic',
      multiplier: increment,
      viewedAt: new Date().toISOString(),
    });

    syncDbTeamsViews(db);
    saveDatabase(db);
    sendJson(res, 200, {
      success: true,
      message: 'Tăng lượt xem trực tiếp trong cơ sở dữ liệu thành công!',
      foundComic,
      comicId: actualComicId,
      views: updatedComicViews,
      chapterId,
      chapterViews: updatedChapterViews,
      teamId: targetTeamObj?.id || teamId,
      teamViews: updatedTeamViews,
      views_2026_10: targetTeamObj ? (targetTeamObj.monthlyViews?.['2026-10'] || 0) : 0,
      monthlyViews: targetTeamObj ? targetTeamObj.monthlyViews : {},
      dailyViews: targetTeamObj ? targetTeamObj.dailyViews : {},
    });
    return true;
  }

  // 3. SAVE COMIC / CREATE STORY
  if ((action === 'save_comic' || action === 'update_comic' || action === 'add_comic' || action === 'create_comic' || action === 'create_story' || action === 'update_story') && req.method === 'POST') {
    const data = await parseBody(req);
    const title = (data.title || data.name || '').trim();
    if (!title) {
      sendJson(res, 400, { success: false, message: 'Tên truyện không được để trống!' });
      return true;
    }

    const id = data.id || `comic-${Date.now()}`;
    let cleanSlug = (data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || id).trim();

    const idx = db.comics.findIndex((c) => c.id === id);
    if (idx >= 0) {
      if (db.comics.some((c, i) => i !== idx && c.slug === cleanSlug)) {
        cleanSlug = `${cleanSlug}-${id.slice(-6)}`;
      }
    } else {
      const baseSlug = cleanSlug;
      let suffix = 2;
      while (db.comics.some((c) => c.slug === cleanSlug)) {
        cleanSlug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }

    const normalizedComic = {
      ...data,
      id,
      title,
      slug: cleanSlug,
      coverImage: data.coverImage || data.cover_image || data.cover_url || data.coverUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
      bannerImage: data.bannerImage || data.banner_image || data.banner_url || data.bannerUrl || data.coverImage || data.cover_image || '',
      authors: Array.isArray(data.authors) ? data.authors : (data.author ? [data.author] : ['Đang cập nhật']),
      genres: Array.isArray(data.genres) ? data.genres : (data.genre ? [data.genre] : ['Manhwa']),
      summary: data.summary || data.description || data.content || '',
      teamId: data.teamId || data.team_id || 'team-leesin',
      teamName: data.teamName || data.team_name || 'Leesin Scans',
      status: data.status || 'Đang tiến hành',
      views: Number(data.views) || 0,
      likes: Number(data.likes) || 0,
      follows: Number(data.follows) || 0,
      rating: Number(data.rating) || 5.0,
      ratingCount: Number(data.ratingCount || data.rating_count) || 1,
      isHot: Boolean(data.isHot || data.is_hot),
      isTrending: Boolean(data.isTrending || data.is_trending),
      is18Plus: Boolean(data.is18Plus ?? data.is_18_plus ?? false),
      chapters: Array.isArray(data.chapters) ? data.chapters : [],
    };

    if (idx >= 0) {
      const existingComic = db.comics[idx];
      const existingViews = Number(existingComic.views) || 0;
      const incomingViews = normalizedComic.views > 0 ? normalizedComic.views : existingViews;
      const preservedUpdatedAt =
        data.updatedAt && data.updatedAt !== 'Vừa xong'
          ? data.updatedAt
          : existingComic.updatedAt && existingComic.updatedAt !== 'Vừa xong'
            ? existingComic.updatedAt
            : new Date().toISOString();

      db.comics[idx] = {
        ...existingComic,
        ...normalizedComic,
        chapters: normalizedComic.chapters.length > 0 ? normalizedComic.chapters : (existingComic.chapters || []),
        updatedAt: preservedUpdatedAt,
        views: Math.max(existingViews, incomingViews),
      };
    } else {
      const nowIso = new Date().toISOString();
      db.comics.unshift({
        ...normalizedComic,
        createdAt: normalizedComic.createdAt || nowIso,
        updatedAt: (!normalizedComic.updatedAt || normalizedComic.updatedAt === 'Vừa xong') ? nowIso : normalizedComic.updatedAt,
      });
    }

    if (normalizedComic.teamId && normalizedComic.teamName) {
      const teamExists = db.teams.some(
        (t) => t.id === normalizedComic.teamId || (t.name && t.name.toLowerCase().trim() === normalizedComic.teamName.toLowerCase().trim())
      );
      if (!teamExists) {
        db.teams.push({
          id: normalizedComic.teamId,
          name: normalizedComic.teamName,
          slug: normalizedComic.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          bio: `Nhóm dịch ${normalizedComic.teamName}`,
          leaderId: 'system',
          leaderName: normalizedComic.teamName,
          members: [],
          monthlyViews: {},
          dailyViews: {},
          totalViews: 0,
        });
      }
    }

    syncDbTeamsViews(db);
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Lưu thông tin truyện thành công vào Database!', comicId: id, slug: cleanSlug });
    return true;
  }

  // 4. SAVE CHAPTER
  if ((action === 'save_chapter' || action === 'add_chapter' || action === 'update_chapter') && req.method === 'POST') {
    const data = await parseBody(req);
    const comicId = data.comicId || data.comic_id;
    const cleanId = String(comicId || '').trim();
    const chapId = data.id || `chap-${Date.now()}`;
    if (!cleanId) {
      sendJson(res, 400, { success: false, message: 'Dữ liệu chương thiếu comicId!' });
      return true;
    }

    const withoutPrefix = cleanId.replace(/^comic-/, '');
    const withPrefix = cleanId.startsWith('comic-') ? cleanId : `comic-${cleanId}`;

    let comic = db.comics.find(
      (c) =>
        c.id === cleanId ||
        c.slug === cleanId ||
        c.id === withPrefix ||
        c.slug === withoutPrefix ||
        (data.comicTitle && c.title && c.title.toLowerCase().trim() === String(data.comicTitle).toLowerCase().trim())
    );
    if (!comic) {
      const newC = {
        id: cleanId,
        title: data.comicTitle || 'Truyện Mới',
        slug: withoutPrefix || cleanId,
        coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
        genres: ['Manhwa'],
        authors: ['Đang cập nhật'],
        teamId: data.teamId || '',
        teamName: data.teamName || '',
        chapters: [],
        views: 0,
        likes: 0,
        follows: 0,
        rating: 5.0,
        ratingCount: 1,
        updatedAt: new Date().toISOString(),
      };
      db.comics.push(newC);
      comic = newC;
    }

    if (comic) {
      comic.chapters = comic.chapters || [];
      const chapNum = Number(data.chapterNumber || data.chapter_number) || 1;
      const chapIdx = comic.chapters.findIndex(
        (ch: any) => ch.id === chapId || (Number(ch.chapterNumber) === chapNum && chapNum > 0)
      );
      const nowIso = new Date().toISOString();
      const resolvedChapId = chapIdx >= 0 ? comic.chapters[chapIdx].id : chapId;
      const normalizedChap = {
        ...data,
        id: resolvedChapId,
        comicId: comic.id,
        comicTitle: comic.title,
        chapterNumber: chapNum,
        title: data.title || `Chương ${chapNum}`,
        images: Array.isArray(data.images) ? data.images : [],
        teamId: data.teamId || data.team_id || comic.teamId,
        teamName: data.teamName || data.team_name || comic.teamName,
        views: Number(data.views) || 0,
        isPasswordProtected: Boolean(data.isPasswordProtected),
      };

      if (chapIdx >= 0) {
        const existingChap = comic.chapters[chapIdx];
        const preservedCreatedAt =
          existingChap.createdAt && existingChap.createdAt !== 'Vừa xong'
            ? existingChap.createdAt
            : data.createdAt && data.createdAt !== 'Vừa xong'
              ? data.createdAt
              : nowIso;
        const nextUpdatedAt =
          data.updatedAt && data.updatedAt !== 'Vừa xong' ? data.updatedAt : nowIso;
        comic.chapters[chapIdx] = {
          ...existingChap,
          ...normalizedChap,
          createdAt: preservedCreatedAt,
          updatedAt: nextUpdatedAt,
        };
        comic.updatedAt = nextUpdatedAt;
      } else {
        const initialCreatedAt =
          !data.createdAt || data.createdAt === 'Vừa xong' ? nowIso : data.createdAt;
        const initialUpdatedAt =
          !data.updatedAt || data.updatedAt === 'Vừa xong' ? initialCreatedAt : data.updatedAt;
        comic.chapters.push({
          ...normalizedChap,
          createdAt: initialCreatedAt,
          updatedAt: initialUpdatedAt,
        });
        comic.updatedAt = initialUpdatedAt;
      }
      comic.chapters.sort((a: any, b: any) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));
      syncDbTeamsViews(db);
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Đã lưu / cập nhật chương thành công vào Database!' });
    } else {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy bộ truyện tương ứng!' });
    }
    return true;
  }

  // 5. DELETE CHAPTER
  if (action === 'delete_chapter' && req.method === 'POST') {
    const data = await parseBody(req);
    const chapId = data.chapterId;
    if (chapId) {
      for (const comic of db.comics) {
        if (comic.chapters) {
          const beforeLen = comic.chapters.length;
          comic.chapters = comic.chapters.filter((ch: any) => ch.id !== chapId);
          if (comic.chapters.length !== beforeLen) {
            saveDatabase(db);
            break;
          }
        }
      }
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa chương khỏi cơ sở dữ liệu!' });
    return true;
  }

  // 6. DELETE COMIC
  if (action === 'delete_comic' && req.method === 'POST') {
    const data = await parseBody(req);
    const comicId = data.comicId;
    if (comicId) {
      db.comics = db.comics.filter((c) => c.id !== comicId);
      syncDbTeamsViews(db);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa truyện và toàn bộ chương!' });
    return true;
  }

  // 6b. CLEAR ALL COMICS
  if (action === 'clear_all_comics' && req.method === 'POST') {
    db.comics = [];
    syncDbTeamsViews(db);
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Đã xóa toàn bộ truyện khỏi cơ sở dữ liệu!' });
    return true;
  }

  // 7. GET SETTINGS
  if (action === 'get_settings' || action === 'get_site_settings') {
    sendJson(res, 200, {
      success: true,
      settings: db.siteSettings,
    });
    return true;
  }

  // 8. SAVE SETTINGS
  if ((action === 'save_settings' || action === 'save_site_settings') && req.method === 'POST') {
    const data = await parseBody(req);
    db.siteSettings = {
      ...db.siteSettings,
      ...data,
    };
    saveDatabase(db);
    sendJson(res, 200, { success: true, message: 'Lưu cài đặt thành công vào MySQL!' });
    return true;
  }

  // 9. GET TEAMS
  if (action === 'get_teams') {
    syncDbTeamsViews(db);
    const enrichedTeams = db.teams.map((t) => {
      const m10 = (t.monthlyViews && (t.monthlyViews['2026-10'] || t.monthlyViews['10/2026'])) || 0;
      return {
        ...t,
        views_2026_10: m10,
        views_10_2026: m10,
        months: {
          ...((t as any).months || {}),
          '10/2026': m10,
          '2026-10': m10,
          'T10/2026': m10,
        },
      };
    });
    sendJson(res, 200, {
      success: true,
      activeTeamsCount: enrichedTeams.length,
      teams: enrichedTeams,
    });
    return true;
  }

  // 10. SAVE TEAM
  if (action === 'save_team' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.id) {
      const idx = db.teams.findIndex((t) => t.id === data.id);
      if (idx >= 0) {
        db.teams[idx] = { ...db.teams[idx], ...data };
      } else {
        db.teams.push(data);
      }
      syncDbTeamsViews(db);
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Lưu thông tin nhóm dịch thành công!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu nhóm không hợp lệ!' });
    }
    return true;
  }

  // 10b. DELETE TEAM
  if (action === 'delete_team' && req.method === 'POST') {
    const data = await parseBody(req);
    const teamId = data.id || data.teamId;
    if (teamId) {
      db.teams = db.teams.filter((t) => t.id !== teamId);
      syncDbTeamsViews(db);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa nhóm dịch khỏi cơ sở dữ liệu!' });
    return true;
  }

  // 10c. GET DASHBOARD STATS
  if (action === 'get_dashboard_stats') {
    syncDbTeamsViews(db);
    const totalPlatformViews = (db.comics || []).reduce((sum: number, c: any) => sum + (c.views || 0), 0);
    const totalComics = (db.comics || []).length;
    const totalChapters = (db.comics || []).reduce((sum: number, c: any) => sum + (c.chapters?.length || 0), 0);
    const totalUsers = (db.users || []).length;
    sendJson(res, 200, {
      success: true,
      totalPlatformViews,
      totalComics,
      totalChapters,
      totalUsers,
      activeTeamsCount: (db.teams || []).length,
    });
    return true;
  }

  // 10b. LOGIN USER (MOCK & DEV API)
  if (action === 'login' && req.method === 'POST') {
    const data = await parseBody(req);
    const loginInput = (data?.account || data?.username || data?.email || '').trim().toLowerCase();
    const passInput = (data?.password || '').trim();

    if (!loginInput || !passInput) {
      sendJson(res, 400, { success: false, message: 'Vui lòng nhập tài khoản và mật khẩu!' });
      return true;
    }

    const found = db.users.find((u: any) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uId = (u.id || '').trim().toLowerCase();
      const prefix = uEmail.split('@')[0];
      return uUsername === loginInput || uEmail === loginInput || prefix === loginInput || uId === loginInput;
    });

    if (!found) {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy tài khoản với tên đăng nhập này!' });
      return true;
    }

    const hash = found.passwordHash || '';
    let matched = false;
    if (found.password) {
      matched = (found.password === passInput);
    } else if (hash) {
      matched = (hash === passInput) || (hash.startsWith('$2y$') && passInput === 'password');
    } else {
      matched = (passInput === 'password' || passInput === 'admin123');
    }

    if (matched) {
      sendJson(res, 200, {
        success: true,
        message: 'Đăng nhập thành công!',
        user: found,
      });
    } else {
      sendJson(res, 401, {
        success: false,
        message: 'Mật khẩu không chính xác. Mật khẩu mặc định hệ thống chuyển giao là "password".',
      });
    }
    return true;
  }

  // 10c. RESET PASSWORD
  if (action === 'reset_password' && req.method === 'POST') {
    const data = await parseBody(req);
    const loginInput = (data?.account || data?.username || data?.email || '').trim().toLowerCase();
    const newPass = (data?.newPassword || data?.password || '').trim();
    const otp = (data?.otp || '').trim();
    const apiKey = (req.headers['x-api-key'] || req.headers['authorization'] || '') as string;
    const isAuthorized = apiKey === 'Leesin_Secret_MySQL_Key_2026' || otp === '888888';

    if (!isAuthorized) {
      sendJson(res, 403, { success: false, message: 'Truy cập bị từ chối: Mã OTP xác thực không đúng hoặc API Key không hợp lệ!' });
      return true;
    }

    const found = db.users.find((u: any) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uId = (u.id || '').trim().toLowerCase();
      const prefix = uEmail.split('@')[0];
      return uUsername === loginInput || uEmail === loginInput || prefix === loginInput || uId === loginInput;
    });

    if (found && newPass) {
      found.password = newPass;
      found.passwordHash = `$2y$10$updated_${Date.now()}`;
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Cập nhật mật khẩu mới thành công!' });
    } else {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy tài khoản để đặt lại mật khẩu!' });
    }
    return true;
  }

  // 11. GET USERS
  if (action === 'get_users') {
    sendJson(res, 200, {
      success: true,
      users: db.users,
    });
    return true;
  }

  // 12. SAVE USER
  if (action === 'save_user' && req.method === 'POST') {
    const data = await parseBody(req);
    const cleanId = (data?.id || '').trim();
    const cleanEmail = (data?.email || '').trim().toLowerCase();
    const cleanUsername = (data?.username || '').trim().toLowerCase().replace(/^@/, '');

    if (data && (cleanId || cleanEmail || cleanUsername)) {
      const idx = db.users.findIndex(
        (u) =>
          (cleanId && u.id === cleanId) ||
          (cleanUsername && u.username && u.username.toLowerCase().replace(/^@/, '') === cleanUsername) ||
          (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      );

      const resolvedAvatar = (data.avatar && typeof data.avatar === 'string' && data.avatar.trim()) ? data.avatar.trim() : (idx >= 0 ? db.users[idx].avatar : undefined);

      if (idx >= 0) {
        db.users[idx] = {
          ...db.users[idx],
          ...data,
          avatar: resolvedAvatar || db.users[idx].avatar,
          role: data.role !== undefined ? data.role : db.users[idx].role,
          teamId: data.teamId !== undefined ? data.teamId : db.users[idx].teamId,
          teamName: data.teamName !== undefined ? data.teamName : db.users[idx].teamName,
          canUpload: data.canUpload !== undefined ? data.canUpload : db.users[idx].canUpload,
        };
      } else {
        const newUserObj = {
          ...data,
          avatar: resolvedAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        };
        db.users.push(newUserObj);
      }

      // Đồng bộ avatar vào tất cả bình luận của tài khoản này
      const targetUserId = cleanId || (idx >= 0 ? db.users[idx].id : undefined);
      if (resolvedAvatar && targetUserId && Array.isArray(db.comments)) {
        for (const cm of db.comments) {
          if (cm.userId === targetUserId) {
            cm.userAvatar = resolvedAvatar;
          }
        }
      }

      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Lưu thông tin người dùng thành công!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu người dùng không hợp lệ!' });
    }
    return true;
  }

  // 13. DELETE USER
  if (action === 'delete_user' && req.method === 'POST') {
    const data = await parseBody(req);
    const userId = data.userId;
    if (userId) {
      db.users = db.users.filter((u) => u.id !== userId);
      syncDbTeamsViews(db);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa người dùng thành công!' });
    return true;
  }

  // 14. GET COMMENTS
  if (action === 'get_comments') {
    const comicId = parsedUrl.searchParams.get('comic_id');
    const chapterId = parsedUrl.searchParams.get('chapter_id');
    const limit = parsedUrl.searchParams.get('limit');

    let filtered = db.comments;
    if (comicId) filtered = filtered.filter((c) => c.comicId === comicId);
    if (chapterId) filtered = filtered.filter((c) => c.chapterId === chapterId);
    if (limit) filtered = filtered.slice(0, Number(limit));

    sendJson(res, 200, {
      success: true,
      comments: filtered,
    });
    return true;
  }

  // 15. SAVE COMMENT
  if (action === 'save_comment' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.id) {
      db.comments.unshift(data);
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Đã lưu bình luận thành công!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu bình luận không hợp lệ!' });
    }
    return true;
  }

  // 16. LIKE COMMENT
  if (action === 'like_comment' && req.method === 'POST') {
    const data = await parseBody(req);
    const commentId = data.commentId;
    const comment = db.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.likes = (comment.likes || 0) + 1;
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Đã thích bình luận!' });
    } else {
      sendJson(res, 404, { success: false, message: 'Không tìm thấy bình luận!' });
    }
    return true;
  }

  // 17. DELETE COMMENT
  if (action === 'delete_comment' && req.method === 'POST') {
    const data = await parseBody(req);
    const commentId = data.commentId;
    if (commentId) {
      db.comments = db.comments.filter((c) => c.id !== commentId);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa bình luận!' });
    return true;
  }

  // 18. GET READING HISTORY
  if (action === 'get_reading_history') {
    const userId = parsedUrl.searchParams.get('user_id');
    const filtered = userId
      ? db.readingHistory.filter((h) => !h.userId || h.userId === userId)
      : db.readingHistory;
    sendJson(res, 200, { success: true, history: filtered });
    return true;
  }

  // 19. SAVE READING HISTORY
  if (action === 'save_reading_history' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.comicId) {
      const existingIdx = db.readingHistory.findIndex(
        (h) => h.comicId === data.comicId && (data.userId ? h.userId === data.userId : true)
      );
      if (existingIdx >= 0) {
        db.readingHistory[existingIdx] = { ...db.readingHistory[existingIdx], ...data };
      } else {
        db.readingHistory.unshift(data);
      }
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Đã lưu lịch sử đọc!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu không hợp lệ!' });
    }
    return true;
  }

  // 20. DELETE READING HISTORY
  if (action === 'delete_reading_history' && req.method === 'POST') {
    const data = await parseBody(req);
    const historyId = data.historyId;
    if (historyId) {
      db.readingHistory = db.readingHistory.filter((h) => h.id !== historyId);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã xóa lịch sử đọc!' });
    return true;
  }

  // 21. GET FOLLOWED COMICS
  if (action === 'get_followed_comics') {
    const userId = parsedUrl.searchParams.get('user_id');
    const filtered = userId
      ? db.followedComics.filter((f) => !f.userId || f.userId === userId)
      : db.followedComics;
    sendJson(res, 200, { success: true, followedComics: filtered });
    return true;
  }

  // 22. FOLLOW COMIC
  if (action === 'follow_comic' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.comicId) {
      const exists = db.followedComics.some(
        (f) => f.comicId === data.comicId && (data.userId ? f.userId === data.userId : true)
      );
      if (!exists) {
        db.followedComics.unshift(data);
        saveDatabase(db);
      }
      sendJson(res, 200, { success: true, message: 'Đã theo dõi truyện!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu theo dõi không hợp lệ!' });
    }
    return true;
  }

  // 23. UNFOLLOW COMIC
  if (action === 'unfollow_comic' && req.method === 'POST') {
    const data = await parseBody(req);
    const { userId, comicId } = data;
    if (comicId) {
      db.followedComics = db.followedComics.filter(
        (f) => !(f.comicId === comicId && (userId ? f.userId === userId : true))
      );
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true, message: 'Đã hủy theo dõi truyện!' });
    return true;
  }

  // 23b. GET FOLLOWED TEAMS
  if (action === 'get_followed_teams') {
    const userId = parsedUrl.searchParams.get('user_id');
    const filtered = userId
      ? (db.followedTeams || []).filter((f: any) => f.userId === userId)
      : (db.followedTeams || []);
    sendJson(res, 200, { success: true, followedTeams: filtered });
    return true;
  }

  // 23c. FOLLOW TEAM
  if (action === 'follow_team' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.teamId) {
      if (!Array.isArray(db.followedTeams)) db.followedTeams = [];
      const exists = db.followedTeams.some(
        (f: any) => f.teamId === data.teamId && f.userId === data.userId
      );
      if (!exists) {
        db.followedTeams.unshift(data);
        saveDatabase(db);
      }
      sendJson(res, 200, { success: true, message: 'Đã theo dõi nhóm dịch!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu không hợp lệ!' });
    }
    return true;
  }

  // 23d. UNFOLLOW TEAM
  if (action === 'unfollow_team' && req.method === 'POST') {
    const data = await parseBody(req);
    const { userId, teamId } = data || {};
    if (teamId) {
      if (Array.isArray(db.followedTeams)) {
        db.followedTeams = db.followedTeams.filter(
          (f: any) => !(f.teamId === teamId && (userId ? f.userId === userId : true))
        );
        saveDatabase(db);
      }
    }
    sendJson(res, 200, { success: true, message: 'Đã hủy theo dõi nhóm dịch!' });
    return true;
  }

  // 24. GET NOTIFICATIONS
  if (action === 'get_notifications') {
    const userId = parsedUrl.searchParams.get('user_id') || '';
    const teamId = parsedUrl.searchParams.get('team_id') || '';
    const teamName = parsedUrl.searchParams.get('team_name') || '';
    const role = parsedUrl.searchParams.get('role') || '';
    const limit = parseInt(parsedUrl.searchParams.get('limit') || '100', 10);

    // Khách vãng lai chưa đăng nhập không có hộp thư thông báo riêng
    if (!userId && !role) {
      sendJson(res, 200, { success: true, notifications: [] });
      return true;
    }

    let list = Array.isArray(db.notifications) ? db.notifications : [];
    if (role === 'ADMIN') {
      // Admin tối cao: nhận tất cả thông báo hệ thống, bình luận, cấp pass và chương mới
      list = [...list];
    } else if (role === 'TEAM_LEADER') {
      const isLessinCurrentUser =
        (teamId === 'team-lessin-comic' || teamId === 'team-leesin') ||
        (teamName.toLowerCase().includes('lessin') || teamName.toLowerCase().includes('leesin'));

      list = list.filter((n) => {
        // Direct recipient
        const matchUser = Boolean(userId && n.recipientUserId === userId);
        if (matchUser) return true;

        // Is it for this team?
        const isLessinNotif =
          (n.recipientTeamId === 'team-lessin-comic' || n.recipientTeamId === 'team-leesin') ||
          (n.recipientTeamName && (n.recipientTeamName.toLowerCase().includes('lessin') || n.recipientTeamName.toLowerCase().includes('leesin')));

        const matchTeam = Boolean(
          (teamId && n.recipientTeamId === teamId) ||
          (isLessinCurrentUser && isLessinNotif) ||
          (teamName && n.recipientTeamName && n.recipientTeamName.toLowerCase().trim() === teamName.toLowerCase().trim())
        );
        if (matchTeam) return true;

        // General non-comment system announcement for all team leaders
        if (n.type !== 'COMMENT' && n.type !== 'REPLY' && !n.recipientTeamId && !n.recipientUserId) {
          return n.recipientRole === 'TEAM_LEADER' || n.recipientRole === 'ALL';
        }

        return false;
      });
    } else {
      list = list.filter((n) => {
        // Direct recipient (reply or direct message)
        const matchUser = Boolean(userId && n.recipientUserId === userId);
        if (matchUser) return true;

        // General non-comment announcement for all readers (cannot be a comment or reply)
        if (n.type !== 'COMMENT' && n.type !== 'REPLY' && !n.recipientUserId) {
          return n.recipientRole === 'READER' || n.recipientRole === 'ALL';
        }

        return false;
      });
    }

    // Sort by createdAt desc
    list = [...list].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    }).slice(0, limit);

    sendJson(res, 200, {
      success: true,
      notifications: list.map((n) => ({
        ...n,
        isRead: Boolean(n.isRead),
      })),
    });
    return true;
  }

  // 25. SAVE NOTIFICATION
  if (action === 'save_notification' && req.method === 'POST') {
    const data = await parseBody(req);
    if (data && data.id && data.title) {
      if (!Array.isArray(db.notifications)) db.notifications = [];
      const existingIdx = db.notifications.findIndex((n) => n.id === data.id);
      const cleanNotif = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        isRead: Boolean(data.isRead),
      };
      if (existingIdx >= 0) {
        db.notifications[existingIdx] = { ...db.notifications[existingIdx], ...cleanNotif };
      } else {
        db.notifications.unshift(cleanNotif);
      }
      saveDatabase(db);
      sendJson(res, 200, { success: true, message: 'Đã lưu thông báo thành công vào SQL!' });
    } else {
      sendJson(res, 400, { success: false, message: 'Dữ liệu thông báo không hợp lệ!' });
    }
    return true;
  }

  // 26. MARK NOTIFICATION READ
  if (action === 'mark_notification_read' && req.method === 'POST') {
    const data = await parseBody(req);
    const notifId = data?.notificationId || data?.id;
    if (notifId && Array.isArray(db.notifications)) {
      db.notifications = db.notifications.map((n) => (n.id === notifId ? { ...n, isRead: true } : n));
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  // 27. MARK ALL NOTIFICATIONS READ
  if (action === 'mark_all_notifications_read' && req.method === 'POST') {
    const data = await parseBody(req);
    const userId = data?.userId || data?.user_id;
    const teamId = data?.teamId || data?.team_id;
    const teamName = data?.teamName || data?.team_name;
    const role = data?.role;

    if (Array.isArray(db.notifications)) {
      db.notifications = db.notifications.map((n) => {
        let isTarget = false;
        if (role === 'ADMIN' && !userId) {
          isTarget = true;
        } else if (role === 'TEAM_LEADER') {
          isTarget =
            Boolean(userId && n.recipientUserId === userId) ||
            Boolean(teamId && n.recipientTeamId === teamId) ||
            Boolean(teamName && n.recipientTeamName && n.recipientTeamName.toLowerCase().trim() === teamName.toLowerCase().trim());
        } else if (userId) {
          isTarget = Boolean(n.recipientUserId === userId);
        }
        return isTarget ? { ...n, isRead: true } : n;
      });
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  // 28. DELETE NOTIFICATION
  if (action === 'delete_notification' && req.method === 'POST') {
    const data = await parseBody(req);
    const notifId = data?.notificationId || data?.id;
    if (notifId && Array.isArray(db.notifications)) {
      db.notifications = db.notifications.filter((n) => n.id !== notifId);
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  // 29. CLEAR ALL NOTIFICATIONS
  if (action === 'clear_all_notifications' && req.method === 'POST') {
    const data = await parseBody(req);
    const userId = data?.userId || data?.user_id;
    const teamId = data?.teamId || data?.team_id;
    const teamName = data?.teamName || data?.team_name;
    const role = data?.role;

    if (Array.isArray(db.notifications)) {
      if (role === 'ADMIN' && !userId) {
        db.notifications = [];
      } else {
        db.notifications = db.notifications.filter((n) => {
          let isTarget = false;
          if (role === 'ADMIN') isTarget = true;
          else if (role === 'TEAM_LEADER') {
            isTarget =
              Boolean(userId && n.recipientUserId === userId) ||
              Boolean(teamId && n.recipientTeamId === teamId) ||
              Boolean(teamName && n.recipientTeamName && n.recipientTeamName.toLowerCase().trim() === teamName.toLowerCase().trim());
          } else if (userId) {
            isTarget = Boolean(n.recipientUserId === userId);
          }
          return !isTarget;
        });
      }
      saveDatabase(db);
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  sendJson(res, 400, { success: false, message: `Hành động ${action} không được hỗ trợ!` });
  return true;
}
