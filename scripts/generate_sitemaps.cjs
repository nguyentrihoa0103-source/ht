const fs = require('fs');
const path = require('path');

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function run() {
  const dbFile = path.resolve(__dirname, '../data_store.json');
  if (!fs.existsSync(dbFile)) {
    console.error('data_store.json not found!');
    return;
  }

  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const comics = Array.isArray(db.comics) ? db.comics : [];
  const teams = Array.isArray(db.teams) ? db.teams : [];
  const domain = (db.siteSettings?.siteDomain && db.siteSettings.siteDomain.startsWith('http'))
    ? db.siteSettings.siteDomain.replace(/\/$/, '')
    : 'https://leesincomic.com';

  const today = new Date().toISOString().split('T')[0];
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log(`Generating comprehensive sitemaps for domain ${domain} with ${comics.length} comics...`);

  // 1. Full sitemap.xml
  let fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  fullXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static URLs
  const staticUrls = [
    { loc: `${domain}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${domain}/hot`, priority: '0.9', changefreq: 'daily' },
    { loc: `${domain}/moi-cap-nhat`, priority: '0.9', changefreq: 'daily' },
    { loc: `${domain}/the-loai/tat-ca`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${domain}/xep-hang/month`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${domain}/nhom-dich-all`, priority: '0.7', changefreq: 'weekly' },
  ];

  staticUrls.forEach(u => {
    fullXml += `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
  });

  // Genres
  const genres = [
    'all', 'manhwa', 'manga', 'manhua', 'dam-my', 'bach-hop', 'ngon-tinh',
    'action', 'adventure', 'chuyen-sinh', 'co-dai', 'comedy', 'drama',
    'fantasy', 'harem', 'historical', 'isekai', 'magic', 'martial-arts',
    'mystery', 'romance', 'school-life', 'sci-fi', 'shoujo', 'shounen',
    'slice-of-life', 'sports', 'supernatural', 'tragedy', 'xuyen-khong'
  ];
  genres.forEach(g => {
    fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/the-loai/${g}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });

  // Teams
  teams.forEach(t => {
    fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/nhom-dich/${t.id}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });

  // Comics and Chapters
  let totalChapters = 0;
  comics.forEach(c => {
    const slug = c.slug || c.id;
    fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
    if (c.coverImage) {
      fullXml += `    <image:image>\n      <image:loc>${escapeXml(c.coverImage)}</image:loc>\n      <image:title>${escapeXml(c.title || '')}</image:title>\n    </image:image>\n`;
    }
    fullXml += `  </url>\n`;

    (c.chapters || []).forEach(ch => {
      totalChapters++;
      fullXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}/chap-${ch.chapterNumber}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
  });

  fullXml += `</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), fullXml, 'utf8');

  // 2. sitemap_index.xml
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
  fs.writeFileSync(path.join(publicDir, 'sitemap_index.xml'), indexXml, 'utf8');

  // 3. sitemap_comics.xml
  let comicsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  comics.forEach(c => {
    const slug = c.slug || c.id;
    comicsXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
    if (c.coverImage) {
      comicsXml += `    <image:image>\n      <image:loc>${escapeXml(c.coverImage)}</image:loc>\n      <image:title>${escapeXml(c.title || '')}</image:title>\n    </image:image>\n`;
    }
    comicsXml += `  </url>\n`;
  });
  comicsXml += `</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap_comics.xml'), comicsXml, 'utf8');

  // 4. sitemap_chapters.xml
  let chapsXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  comics.forEach(c => {
    const slug = c.slug || c.id;
    (c.chapters || []).forEach(ch => {
      chapsXml += `  <url>\n    <loc>${escapeXml(`${domain}/truyen/${slug}/chap-${ch.chapterNumber}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
  });
  chapsXml += `</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap_chapters.xml'), chapsXml, 'utf8');

  // 5. sitemap_categories.xml
  let catXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  genres.forEach(g => {
    catXml += `  <url>\n    <loc>${escapeXml(`${domain}/the-loai/${g}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });
  teams.forEach(t => {
    catXml += `  <url>\n    <loc>${escapeXml(`${domain}/nhom-dich/${t.id}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });
  catXml += `</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap_categories.xml'), catXml, 'utf8');

  console.log(`Generated sitemaps successfully! Total comics: ${comics.length}, Total chapters: ${totalChapters}`);
}

run();
