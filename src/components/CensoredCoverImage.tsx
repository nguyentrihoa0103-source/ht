import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldAlert, AlertTriangle, BookOpen } from 'lucide-react';
import { is18PlusComic, isComicCoverRevealed, setComicCoverRevealed } from '../utils/adultFilter';

interface CensoredCoverImageProps {
  src: string;
  alt: string;
  comicId?: string;
  genres?: string[];
  is18PlusOverride?: boolean;
  className?: string;
  imageClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'detail';
  loading?: 'lazy' | 'eager';
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  onRevealChange?: (revealed: boolean) => void;
  showBadge?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const CensoredCoverImage: React.FC<CensoredCoverImageProps> = React.memo(({
  src,
  alt,
  comicId = '',
  genres = [],
  is18PlusOverride,
  className = '',
  imageClassName = '',
  size = 'md',
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  onRevealChange,
  showBadge = true,
  onClick,
}) => {
  const is18 = is18PlusOverride !== undefined ? is18PlusOverride : is18PlusComic(genres);
  const [isRevealed, setIsRevealed] = useState<boolean>(() => {
    if (!is18) return true;
    return isComicCoverRevealed(comicId);
  });
  const [imgError, setImgError] = useState<boolean>(false);
  const sanitizeImageUrl = (url: string) => {
    if (!url) return '';
    let clean = url.trim();
    if (clean.includes('tachserver.online')) {
      clean = clean.replace(/tachserver\.online/g, 'tachserver.site');
    }
    if (clean.startsWith('uploads/')) {
      clean = '/' + clean;
    }
    return clean;
  };

  const [currentSrc, setCurrentSrc] = useState<string>(() => sanitizeImageUrl(src));

  useEffect(() => {
    setCurrentSrc(sanitizeImageUrl(src));
    setImgError(false);
  }, [src]);

  const handleImageError = () => {
    if (!currentSrc) {
      setImgError(true);
      return;
    }

    if (currentSrc.includes('tachserver.online')) {
      setCurrentSrc((prev) => prev.replace(/tachserver\.online/g, 'tachserver.site'));
    } else if (currentSrc.includes('tachserver.site/cdn3/uploads/')) {
      setCurrentSrc((prev) => prev.replace('https://tachserver.site/cdn3/uploads/', '/uploads/'));
    } else if (currentSrc.startsWith('/uploads/') || currentSrc.includes('leesincomic.com/uploads/')) {
      const idx = currentSrc.indexOf('uploads/');
      const pathPart = idx >= 0 ? currentSrc.substring(idx) : currentSrc.replace(/^\/+/, '');
      setCurrentSrc(`https://tachserver.site/cdn3/${pathPart}`);
    } else {
      setImgError(true);
    }
  };

  useEffect(() => {
    if (!is18) {
      setIsRevealed(true);
      return;
    }

    setIsRevealed(isComicCoverRevealed(comicId));

    const handleRevealEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ comicId: string; revealed: boolean }>;
      if (customEvent.detail && customEvent.detail.comicId === comicId) {
        setIsRevealed(customEvent.detail.revealed);
        onRevealChange?.(customEvent.detail.revealed);
      }
    };

    window.addEventListener('adult-cover-reveal-changed', handleRevealEvent);
    return () => {
      window.removeEventListener('adult-cover-reveal-changed', handleRevealEvent);
    };
  }, [comicId, is18, onRevealChange]);

  const handleToggleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const nextState = !isRevealed;
    setIsRevealed(nextState);
    if (comicId) {
      setComicCoverRevealed(comicId, nextState);
    }
    onRevealChange?.(nextState);
  };

  const isBlurred = is18 && !isRevealed;

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      onClick={onClick}
    >
      {/* Underlying Image or Fallback */}
      {imgError ? (
        <div className={`w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/60 text-center select-none ${imageClassName}`}>
          <BookOpen className="w-5 h-5 text-amber-400/90 mb-1 shrink-0" />
          <span className="text-[10px] font-bold text-slate-300 line-clamp-2 leading-tight">
            {alt || 'Leesin Comic'}
          </span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          referrerPolicy={referrerPolicy}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-all duration-300 ease-out ${
            isBlurred
              ? 'filter blur-xl brightness-[0.45] scale-110'
              : 'filter-none scale-100'
          } ${imageClassName}`}
        />
      )}

      {/* 18+ Badge (always visible for 18+ comics if showBadge is true) */}
      {is18 && showBadge && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] tracking-wider shadow-lg shadow-red-900/60 flex items-center gap-0.5 border border-red-400/30">
            <span className="text-[11px]">🔞</span>
            <span>18+</span>
          </span>

          {/* Quick re-hide button if revealed */}
          {isRevealed && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleToggleReveal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleReveal(e as unknown as React.MouseEvent);
                }
              }}
              title="Nhấp để che lại ảnh 18+"
              className="p-1 rounded-md bg-black/70 hover:bg-black/90 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors shadow cursor-pointer inline-flex items-center justify-center"
            >
              <EyeOff className="w-3 h-3" />
            </span>
          )}
        </div>
      )}

      {/* Blurred Overlay with Confirmation Action */}
      {isBlurred && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2.5 text-center bg-black/40 backdrop-blur-[2px]">
          {size === 'xs' || size === 'sm' ? (
            /* Compact variant (for small search lists or ranking items) */
            <span
              role="button"
              tabIndex={0}
              onClick={handleToggleReveal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleReveal(e as unknown as React.MouseEvent);
                }
              }}
              title="Nội dung 18+. Nhấp để xem ảnh"
              className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
            </span>
          ) : size === 'detail' ? (
            /* Large Detail Poster variant */
            <div className="space-y-3 px-3 max-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white drop-shadow">
                  Ảnh Bìa 18+
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Đã tự động che mờ nội dung nhạy cảm
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={handleToggleReveal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleReveal(e as unknown as React.MouseEvent);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-1.5 border border-rose-400/30 cursor-pointer select-none"
              >
                <Eye className="w-4 h-4" />
                <span>Xác nhận xem ảnh</span>
              </span>
            </div>
          ) : (
            /* Normal Card variant (Home, Categories, Libraries, Sliders) */
            <div className="flex flex-col items-center gap-2 max-w-[140px]">
              <div className="w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-md">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-slate-200 drop-shadow line-clamp-1">
                Ảnh 18+ Đã Che
              </p>
              <span
                role="button"
                tabIndex={0}
                onClick={handleToggleReveal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleReveal(e as unknown as React.MouseEvent);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-lg shadow-rose-700/40 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1 border border-rose-400/30 cursor-pointer whitespace-nowrap select-none"
              >
                <Eye className="w-3 h-3" />
                <span>Xem ảnh</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
