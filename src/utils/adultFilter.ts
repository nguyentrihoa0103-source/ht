import { Comic } from '../types';

/**
 * Checks if a comic or genre list contains 18+ / Adult / R-18 indicators
 */
export function is18PlusComic(
  genresOrComic?: { genres?: string[]; is18Plus?: boolean } | string[] | null
): boolean {
  if (!genresOrComic) return false;

  // 1. Ưu tiên kiểm tra trường boolean is18Plus nếu được thiết lập rõ ràng từ form đăng truyện
  if (!Array.isArray(genresOrComic) && typeof genresOrComic.is18Plus === 'boolean') {
    return genresOrComic.is18Plus;
  }

  // 2. Fallback cho dữ liệu cũ chưa có trường is18Plus: chỉ xét các tag chỉ định 18+ rõ ràng
  const genres: string[] = Array.isArray(genresOrComic)
    ? genresOrComic
    : genresOrComic.genres || [];

  return genres.some((g) => {
    if (!g || typeof g !== 'string') return false;
    const clean = g.trim().toLowerCase().replace(/\s+/g, '');
    return (
      clean === '18+' ||
      clean === '18' ||
      clean === '+18' ||
      clean === '18_plus' ||
      clean === '18plus' ||
      clean === 'r18' ||
      clean === 'r-18' ||
      clean === 'hentai' ||
      clean === 'adult' ||
      clean === 'mature' ||
      clean === 'ecchi' ||
      clean === 'smut' ||
      clean.includes('18+') ||
      clean.includes('18plus') ||
      clean.includes('r18') ||
      clean.includes('truyen18') ||
      clean.includes('canhbao18')
    );
  });
}

// In-memory runtime cache for revealed 18+ comic covers (Zero localStorage storage)
const revealedCoversSet = new Set<string>();

/**
 * Check if the user has confirmed viewing this specific 18+ comic cover in current session
 */
export function isComicCoverRevealed(comicId?: string): boolean {
  if (!comicId) return false;
  return revealedCoversSet.has(comicId);
}

/**
 * Set the revealed status for a specific 18+ comic cover
 */
export function setComicCoverRevealed(comicId: string, revealed: boolean): void {
  if (!comicId) return;
  if (revealed) {
    revealedCoversSet.add(comicId);
  } else {
    revealedCoversSet.delete(comicId);
  }
  window.dispatchEvent(
    new CustomEvent('adult-cover-reveal-changed', {
      detail: { comicId, revealed },
    })
  );
}

