import { Comic, Chapter, SiteSettings } from '../types';
export { GENRE_SLUG_MAP, toSlug } from './slug';
import { GENRE_SLUG_MAP, toSlug } from './slug';

/**
 * SEO Helper for dynamic page metadata (Title, OpenGraph, Twitter, Canonical, Meta Description, Robots & JSON-LD Schemas)
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SeoConfig {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book' | 'comic';
  keywords?: string[];
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  schemaData?: Record<string, any>;
  comicData?: Comic;
  chapterData?: { comic: Comic; chapter: Chapter };
  siteSettings?: SiteSettings;
}

/**
 * Updates all SEO tags in real-time in document.head
 */
export function updateSeoMeta(config: SeoConfig) {
  if (typeof document === 'undefined') return;

  const origin = config.siteSettings?.siteDomain && config.siteSettings.siteDomain.startsWith('http')
    ? config.siteSettings.siteDomain.replace(/\/$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : 'https://leesincomic.com');

  const siteName = config.siteSettings?.siteName || 'Leesin Comic';

  // 1. Page Title
  document.title = config.title;

  // 2. Meta Description
  if (config.description) {
    setMetaTag('description', config.description, 'name');
    setMetaTag('og:description', config.description, 'property');
    setMetaTag('twitter:description', config.description, 'name');
  }

  // 3. OpenGraph Title & Twitter Title
  setMetaTag('og:title', config.title, 'property');
  setMetaTag('twitter:title', config.title, 'name');

  // 4. OpenGraph Site Name & Locale
  setMetaTag('og:site_name', siteName, 'property');
  setMetaTag('og:locale', 'vi_VN', 'property');

  // 5. OpenGraph Type
  setMetaTag('og:type', config.type || 'website', 'property');

  // 6. Twitter Card Type
  setMetaTag('twitter:card', 'summary_large_image', 'name');

  // 7. OpenGraph Image & Twitter Image
  if (config.image) {
    const fullImgUrl = config.image.startsWith('http') ? config.image : `${origin}${config.image}`;
    setMetaTag('og:image', fullImgUrl, 'property');
    setMetaTag('og:image:alt', config.title, 'property');
    setMetaTag('twitter:image', fullImgUrl, 'name');
  }

  // 8. Canonical URL & og:url
  const canonicalUrl = config.url || (typeof window !== 'undefined' ? window.location.href : origin);
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);
  setMetaTag('og:url', canonicalUrl, 'property');

  // 9. Meta Robots for Googlebot
  const robotsContent = config.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  setMetaTag('robots', robotsContent, 'name');
  setMetaTag('googlebot', robotsContent, 'name');

  // 10. Meta Keywords
  if (config.keywords && config.keywords.length > 0) {
    setMetaTag('keywords', config.keywords.join(', '), 'name');
  }

  // 11. Structured Data Schema.org (JSON-LD)
  updateStructuredData(config, origin, siteName);
}

function setMetaTag(key: string, value: string, attrName: 'name' | 'property') {
  let el = document.querySelector(`meta[${attrName}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/**
 * Builds and injects dynamic JSON-LD structured schemas for Google Rich Results
 */
function updateStructuredData(config: SeoConfig, origin: string, siteName: string) {
  let scriptEl = document.getElementById('seo-structured-data-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'seo-structured-data-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const schemas: any[] = [];

  // Base Organization / WebSite Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: siteName,
    url: origin,
    description: config.siteSettings?.siteDescription || 'Website đọc truyện tranh online bản quyền chất lượng cao.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/tim-kiem?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'vi-VN',
  });

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: siteName,
    url: origin,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/logo.svg`,
      caption: siteName,
    },
  });

  // Breadcrumbs Schema if available
  if (config.breadcrumbs && config.breadcrumbs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: config.breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: b.name,
        item: b.url.startsWith('http') ? b.url : `${origin}${b.url}`,
      })),
    });
  }

  // Comic Detail View -> ComicSeries / Book Schema
  if (config.comicData) {
    const c = config.comicData;
    const comicUrl = `${origin}/truyen/${c.slug || c.id}`;
    schemas.push({
      '@context': 'https://schema.org',
      '@type': ['ComicSeries', 'Book'],
      '@id': `${comicUrl}#comic`,
      url: comicUrl,
      name: c.title,
      headline: `${c.title} - Đọc Truyện Tranh Online`,
      description: c.summary || `${c.title} truyện tranh hấp dẫn, cập nhật nhanh nhất tại ${siteName}.`,
      image: c.coverImage ? (c.coverImage.startsWith('http') ? c.coverImage : `${origin}${c.coverImage}`) : undefined,
      author: {
        '@type': 'Person',
        name: (c as any).author || (Array.isArray(c.authors) ? c.authors.join(', ') : (c.authors as any)) || 'Đang cập nhật',
      },
      genre: c.genres || ['Manga', 'Manhwa'],
      inLanguage: 'vi',
      dateModified: new Date().toISOString(),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: c.rating ? Number(c.rating).toFixed(1) : '4.9',
        bestRating: '5',
        worstRating: '1',
        ratingCount: Math.max(120, Math.floor((c.views || 500) / 10)),
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: origin,
      },
      hasPart: (c.chapters || []).slice(0, 50).map((ch) => ({
        '@type': 'ComicIssue',
        name: ch.title,
        issueNumber: String(ch.chapterNumber),
        url: `${comicUrl}/chap-${ch.chapterNumber}`,
      })),
    });
  }

  // Chapter Reader View -> ComicIssue / Article Schema
  if (config.chapterData) {
    const { comic, chapter } = config.chapterData;
    const chapterUrl = `${origin}/truyen/${comic.slug || comic.id}/chap-${chapter.chapterNumber}`;
    schemas.push({
      '@context': 'https://schema.org',
      '@type': ['ComicIssue', 'Article'],
      '@id': `${chapterUrl}#chapter`,
      url: chapterUrl,
      name: `${comic.title} - ${chapter.title}`,
      headline: `Đọc truyện ${comic.title} ${chapter.title} Tiếng Việt mới nhất`,
      issueNumber: String(chapter.chapterNumber),
      isPartOf: {
        '@type': 'ComicSeries',
        name: comic.title,
        url: `${origin}/truyen/${comic.slug || comic.id}`,
      },
      image: comic.coverImage ? (comic.coverImage.startsWith('http') ? comic.coverImage : `${origin}${comic.coverImage}`) : undefined,
      datePublished: chapter.createdAt || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: chapter.teamName || comic.teamName || siteName,
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: origin,
      },
      inLanguage: 'vi',
    });
  }

  scriptEl.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : { '@graph': schemas }, null, 2);
}

/**
 * Generates a full XML Sitemap string for Google Search Console
 */
export function generateFullSitemapXml(options: {
  domain: string;
  comics: Comic[];
  siteSettings?: SiteSettings;
}): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';

  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily', lastmod: today },
    { loc: `${origin}/hot`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${origin}/moi-cap-nhat`, priority: '0.9', changefreq: 'daily', lastmod: today },
    { loc: `${origin}/xep-hang/month`, priority: '0.8', changefreq: 'weekly', lastmod: today },
    { loc: `${origin}/nhom-dich-all`, priority: '0.7', changefreq: 'weekly', lastmod: today },
    { loc: `${origin}/the-loai/tat-ca`, priority: '0.8', changefreq: 'weekly', lastmod: today },
  ];

  // Category URLs from genre map
  const genreUrls = Object.entries(GENRE_SLUG_MAP).map(([name, slug]) => ({
    loc: `${origin}/the-loai/${slug}`,
    priority: '0.7',
    changefreq: 'weekly',
    lastmod: today,
  }));

  // Comic Main URLs
  const comicUrls = options.comics.map((c) => ({
    loc: `${origin}/truyen/${c.slug || c.id}`,
    priority: '0.9',
    changefreq: 'daily',
    lastmod: today,
    image: c.coverImage,
    title: c.title,
  }));

  // Chapter URLs
  const chapterUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod: string }> = [];
  options.comics.forEach((c) => {
    (c.chapters || []).forEach((ch) => {
      chapterUrls.push({
        loc: `${origin}/truyen/${c.slug || c.id}/chap-${ch.chapterNumber}`,
        priority: '0.8',
        changefreq: 'monthly',
        lastmod: today,
      });
    });
  });

  const allUrls = [...staticUrls, ...genreUrls, ...comicUrls, ...chapterUrls];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  allUrls.forEach((u: any) => {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(u.loc)}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    if (u.image) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(u.image)}</image:loc>\n`;
      if (u.title) {
        xml += `      <image:title>${escapeXml(u.title)}</image:title>\n`;
      }
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Generates Comics Only Sitemap XML
 */
export function generateComicsSitemapXml(options: {
  comics: Comic[];
  domain: string;
}): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  (options.comics || []).forEach((c) => {
    const slug = c.slug || c.id;
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${origin}/truyen/${slug}`)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    if (c.coverImage) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(c.coverImage)}</image:loc>\n`;
      xml += `      <image:title>${escapeXml(c.title)}</image:title>\n`;
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Generates Chapters Only Sitemap XML
 */
export function generateChaptersSitemapXml(options: {
  comics: Comic[];
  domain: string;
}): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  (options.comics || []).forEach((c) => {
    const slug = c.slug || c.id;
    (c.chapters || []).forEach((ch) => {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${origin}/truyen/${slug}/chap-${ch.chapterNumber}`)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Generates Categories, Genres & Teams Sitemap XML
 */
export function generateCategoriesSitemapXml(options: {
  domain: string;
  teams?: Array<{ id: string; name: string }>;
}): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Thể loại
  const genres = [
    'all', 'manhwa', 'manga', 'manhua', 'dam-my', 'bach-hop', 'ngon-tinh',
    'action', 'adventure', 'chuyen-sinh', 'co-dai', 'comedy', 'drama',
    'fantasy', 'harem', 'historical', 'isekai', 'magic', 'martial-arts',
    'mystery', 'romance', 'school-life', 'sci-fi', 'shoujo', 'shounen',
    'slice-of-life', 'sports', 'supernatural', 'tragedy', 'xuyen-khong'
  ];

  genres.forEach((g) => {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${origin}/the-loai/${g}`)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  });

  // Nhóm dịch
  (options.teams || []).forEach((t) => {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${origin}/nhom-dich/${t.id}`)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Generates Sitemap Index XML file linking sub-sitemaps
 */
export function generateSitemapIndexXml(options: { domain: string }): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';

  const today = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${origin}/sitemap_main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${origin}/sitemap_comics.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${origin}/sitemap_chapters.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${origin}/sitemap_categories.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Generates Robots.txt configured for Googlebot & Bingbot indexing
 */
export function generateRobotsTxt(options: { domain: string }): string {
  const origin = options.domain && options.domain.startsWith('http')
    ? options.domain.replace(/\/$/, '')
    : 'https://leesincomic.com';

  return `# Robots.txt for ${origin}
# Optimized for Googlebot, Bingbot & Search Engine Crawlers

User-agent: *
Allow: /
Allow: /truyen/
Allow: /the-loai/
Allow: /hot
Allow: /moi-cap-nhat
Allow: /xep-hang/
Allow: /nhom-dich-all

# Disallow private user & administrative panels
Disallow: /admin
Disallow: /admin/
Disallow: /nhom-dich-portal
Disallow: /nhom-dich-portal/
Disallow: /lich-su
Disallow: /theo-doi
Disallow: /api.php

# Sitemaps
Sitemap: ${origin}/sitemap.xml
Sitemap: ${origin}/sitemap_index.xml
`;
}

/**
 * Utility helper to download text file from client
 */
export function downloadClientFile(filename: string, content: string, mimeType = 'application/xml;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
