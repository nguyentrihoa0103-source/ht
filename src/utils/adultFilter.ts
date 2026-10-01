import { Comic } from '../types';

/**
 * Checks if a comic or genre list contains 18+ / Adult / R-18 indicators
 */
export function is18PlusComic(
  genresOrComic?: { genres?: string[] } | string[] | null
): boolean {
  if (!genresOrComic) return false;

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

