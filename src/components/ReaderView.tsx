import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ChevronsUp,
  ChevronLeft,
  ChevronRight,
  Lock,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Sparkles,
  Layers,
  Eye,
  Clock,
  ShieldCheck,
  Palette,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Comic, Chapter, User, ChapterComment, SiteSettings, ScanTeam, DEFAULT_CHAPTER_AD } from '../types';
import { LiveCommentsFeed } from './LiveCommentsFeed';
import { TeamDonationCard } from './TeamDonationCard';
import { ChapterAdModal, ChapterInlineAdBanner } from './ChapterAdModal';
import { getEffectiveChapterViews } from '../utils/viewTracking';

interface ReaderViewProps {
  comic: Comic;
  chapter: Chapter;
  team?: ScanTeam;
  currentUser: User | null;
  siteSettings?: SiteSettings;
  onBackToComic: () => void;
  onSelectChapter: (chap: Chapter) => void;
  onRequireLogin: () => void;
  onChapterViewCounted?: (chapter: Chapter, multiplier: number) => void;
  isTeamFollowed?: boolean;
  onToggleFollowTeam?: (teamId: string) => void;
  onViewTeam?: (team: ScanTeam) => void;
  comments?: ChapterComment[];
  highlightedCommentId?: string | null;
  onAddComment?: (comment: Omit<ChapterComment, 'id' | 'createdAt' | 'likes'>) => void;
  onLikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateChapterImages?: (chapterId: string, images: string[]) => void;
}

export const READER_BG_OPTIONS = [
  { id: 'brown-55', name: 'Nâu (#555555)', value: '#555555', color: '#555555' },
  { id: 'brown-earth', name: 'Nâu Đất', value: '#554433', color: '#554433' },
  { id: 'brown-coffee', name: 'Nâu Cafe', value: '#3d2b1f', color: '#3d2b1f' },
  { id: 'dark-default', name: 'Tối', value: '#0f1117', color: '#0f1117' },
];

// In-memory runtime view cooldown & ad tracker (LOẠI BỎ TRIỆT ĐỂ localStorage theo yêu cầu kiến trúc 100% database)
const viewCooldownRuntimeCache = new Map<string, number>();
let chapterAdRuntimeTracker = { count: 0, lastShownAt: 0, resetAt: 0 };

export const ReaderView: React.FC<ReaderViewProps> = ({
  comic,
  chapter,
  team,
  currentUser,
  siteSettings,
  onBackToComic,
  onSelectChapter,
  onRequireLogin,
  onChapterViewCounted,
  isTeamFollowed = false,
  onToggleFollowTeam,
  onViewTeam,
  comments = [],
  highlightedCommentId,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onUpdateChapterImages,
}) => {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!chapter.isPasswordProtected);
  const [passwordError, setPasswordError] = useState('');
  const [readerWidth, setReaderWidth] = useState<'normal' | 'wide' | 'full'>('normal');
  const [readerBg, setReaderBg] = useState<string>(() => {
    return localStorage.getItem('leesincomic_reader_bg') || '#555555';
  });
  const [showAntiTheftToast, setShowAntiTheftToast] = useState(false);
  const toastTimeoutRef = useRef<any>(null);

  const sanitizeImg = (url: string) => {
    if (typeof url !== 'string' || !url.trim()) return '';
    let clean = url.trim();
    // Chuyển tachserver.online sang tachserver.site
    clean = clean.replace(/https?:\/\/(?:www\.)?tachserver\.online/gi, 'https://tachserver.site');
    clean = clean.replace(/tachserver\.online/gi, 'tachserver.site');

    // Hỗ trợ ảnh cũ trực tiếp trên host qua thư mục uploads
    if (clean.startsWith('uploads/')) {
      clean = '/' + clean;
    }
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    return clean;
  };

  // Dynamic Chapter Images state - Fetches on-demand from CDN / leesincomic.com if not pre-cached
  const [chapterImages, setChapterImages] = useState<string[]>(() => {
    return (chapter.images || [])
      .map(sanitizeImg)
      .filter((img) => typeof img === 'string' && img.trim().length > 0);
  });
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    let ticking = false;
    let lastProgress = 0;
    let lastShowScrollTop = false;

    const updateScrollState = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
          const showTop = scrollY > 200;
          if (showTop !== lastShowScrollTop) {
            lastShowScrollTop = showTop;
            setShowScrollTop(showTop);
          }

          const scrollElem = document.documentElement;
          const totalHeight = scrollElem.scrollHeight - window.innerHeight;
          const progress = totalHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollY / totalHeight) * 100))) : 0;
          if (Math.abs(progress - lastProgress) >= 1 || progress === 0 || progress === 100) {
            lastProgress = progress;
            setReadingProgress(progress);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, [chapter.id]);

  const fetchChapterImages = useCallback(
    (force = false) => {
      setIsLoadingImages(true);
      const linkParam = chapter.link ? `&link=${encodeURIComponent(chapter.link)}` : '';
      const coverParam = comic.coverImage ? `&coverImage=${encodeURIComponent(comic.coverImage)}` : '';
      const forceParam = force ? '&forceSync=1' : '';
      fetch(
        `/api.php?action=get_chapter&comicSlug=${encodeURIComponent(comic.slug)}&chapterNumber=${encodeURIComponent(
          chapter.chapterNumber
        )}&id=${encodeURIComponent(chapter.id)}${linkParam}${coverParam}${forceParam}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.chapter?.images) && data.chapter.images.length > 0) {
            const cleanImgs = data.chapter.images.map(sanitizeImg);
            setChapterImages(cleanImgs);
            if (onUpdateChapterImages) {
              onUpdateChapterImages(chapter.id, cleanImgs);
            }
          }
        })
        .catch((err) => console.warn('Could not load chapter images:', err))
        .finally(() => setIsLoadingImages(false));
    },
    [chapter.id, chapter.chapterNumber, chapter.link, comic.slug, comic.coverImage, onUpdateChapterImages]
  );

  useEffect(() => {
    const existing = (chapter.images || [])
      .map(sanitizeImg)
      .filter((img) => typeof img === 'string' && img.trim().length > 0);
    setChapterImages(existing);
    if (existing.length === 0) {
      fetchChapterImages(false);
    }
  }, [chapter.id, chapter.chapterNumber, comic.slug, fetchChapterImages]);

  // Sync reader background with body while reading chapter
  useEffect(() => {
    try {
      localStorage.setItem('leesincomic_reader_bg', readerBg);
    } catch (e) {}
    document.body.style.backgroundColor = readerBg;
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [readerBg]);

  // Trigger Anti-Theft Toast Notification
  const triggerAntiTheftToast = (msg?: string) => {
    setShowAntiTheftToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowAntiTheftToast(false);
    }, 2800);
  };

  // --- ANTI-THEFT & ANTI-LEECH SHIELD LISTENERS ---
  useEffect(() => {
    // 1. Chặn mở menu chuột phải toàn bộ trang đọc
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerAntiTheftToast();
      return false;
    };

    // 2. Chặn các phím tắt sao chép, tải trang, soi mã nguồn
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerAntiTheftToast();
        return false;
      }

      // Ctrl + S (Lưu trang), Ctrl + U (Xem nguồn), Ctrl + P (In trang)
      if (isCtrlOrMeta && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerAntiTheftToast();
        return false;
      }

      // Ctrl + Shift + I / J / C (DevTools & Element Inspector)
      if (isCtrlOrMeta && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        triggerAntiTheftToast();
        return false;
      }
    };

    // 3. Chặn kéo thả tệp ảnh
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragstart', handleDragStart);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // --- VIEWS CALCULATION ENGINE (Quy Tắc Tính Lượt Xem Từ Cài Đặt Hệ Thống) ---
  const viewDelaySeconds = Math.max(0, siteSettings?.viewDelaySeconds ?? 15);
  const viewCooldownMinutes = Math.max(0, siteSettings?.viewCooldownMinutes ?? 15);
  const viewMultiplier = Math.max(1, siteSettings?.viewMultiplier ?? 1);
  const requireScrollPercent = Math.max(0, Math.min(100, siteSettings?.requireScrollPercent ?? 0));

  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [scrollDepthPercent, setScrollDepthPercent] = useState(0);
  const [viewStatus, setViewStatus] = useState<'pending' | 'counted' | 'cooldown'>('pending');

  const cooldownKey = `leesin_view_cd_${comic.id}_${chapter.id}`;
  const hasTriggeredRef = useRef(false);
  const timeSpentRef = useRef(0);
  const maxScrollDepthRef = useRef(0);
  const onChapterViewCountedRef = useRef(onChapterViewCounted);
  const chapterRef = useRef(chapter);

  useEffect(() => {
    onChapterViewCountedRef.current = onChapterViewCounted;
    chapterRef.current = chapter;
  }, [onChapterViewCounted, chapter]);

  const formatReadingTimer = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}p${s < 10 ? `0${s}` : s}s`;
  };

  // Khởi tạo và kiểm tra Cooldown chống spam view khi đổi chương đọc
  useEffect(() => {
    hasTriggeredRef.current = false;
    timeSpentRef.current = 0;
    maxScrollDepthRef.current = 0;
    setTimeSpentSeconds(0);
    setScrollDepthPercent(0);

    const lastTime = viewCooldownRuntimeCache.get(cooldownKey) || 0;
    const now = Date.now();
    const cooldownMs = viewCooldownMinutes * 60 * 1000;

    if (viewCooldownMinutes > 0 && lastTime > 0 && now - lastTime < cooldownMs) {
      setViewStatus('cooldown');
      hasTriggeredRef.current = true; // Đang trong thời gian giãn cách, không tính lặp
    } else {
      setViewStatus('pending');
    }
  }, [chapter.id, comic.id, viewCooldownMinutes, cooldownKey]);

  // Bộ máy tính lượt xem: Theo dõi thời gian đọc (giây) và độ sâu cuộn trang (%)
  useEffect(() => {
    if (chapter.isPasswordProtected && !isUnlocked) return;

    const getCurrentScrollPercent = () => {
      const scrollElem = document.documentElement;
      const totalHeight = scrollElem.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return 100;
      const scrollY = window.scrollY || scrollElem.scrollTop || 0;
      return Math.min(100, Math.max(0, Math.round((scrollY / totalHeight) * 100)));
    };

    const evaluateRules = (secs: number, scroll: number) => {
      if (hasTriggeredRef.current) return;

      const isTimeSatisfied = viewDelaySeconds <= 0 || secs >= viewDelaySeconds;
      const isScrollSatisfied = requireScrollPercent <= 0 || scroll >= requireScrollPercent;

      if (isTimeSatisfied && isScrollSatisfied) {
        hasTriggeredRef.current = true;
        setViewStatus('counted');
        try {
          viewCooldownRuntimeCache.set(cooldownKey, Date.now());
        } catch (e) {
          console.warn(e);
        }
        if (onChapterViewCountedRef.current) {
          onChapterViewCountedRef.current(chapterRef.current, viewMultiplier);
        }
      }
    };

    const initialScroll = getCurrentScrollPercent();
    maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, initialScroll);
    setScrollDepthPercent(maxScrollDepthRef.current);
    evaluateRules(timeSpentRef.current, maxScrollDepthRef.current);

    // Đồng hồ bấm giờ mỗi giây khi người dùng đang mở trang đọc
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      timeSpentRef.current += 1;
      setTimeSpentSeconds(timeSpentRef.current);

      const curScroll = getCurrentScrollPercent();
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, curScroll);
      setScrollDepthPercent(maxScrollDepthRef.current);
      evaluateRules(timeSpentRef.current, maxScrollDepthRef.current);
    }, 1000);

    // Lắng nghe cuộn chuột mượt mà qua requestAnimationFrame, tránh re-render mỗi pixel
    let scrollTicking = false;
    const handleScroll = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const curScroll = getCurrentScrollPercent();
          if (curScroll > maxScrollDepthRef.current) {
            maxScrollDepthRef.current = curScroll;
            setScrollDepthPercent(curScroll);
          }
          evaluateRules(timeSpentRef.current, maxScrollDepthRef.current);
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [
    isUnlocked,
    chapter.id,
    chapter.isPasswordProtected,
    comic.id,
    viewDelaySeconds,
    requireScrollPercent,
    viewMultiplier,
    cooldownKey,
  ]);

  // Reset unlock state when chapter changes
  useEffect(() => {
    setIsUnlocked(!chapter.isPasswordProtected);
    setEnteredPassword('');
    setPasswordError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapter.id, chapter.isPasswordProtected]);

  const currentIndex = comic.chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? comic.chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < comic.chapters.length - 1 ? comic.chapters[currentIndex + 1] : null;

  const handleUnlockPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword.trim() === (chapter.password || 'leesin2026')) {
      setIsUnlocked(true);
      setPasswordError('');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } else {
      setPasswordError('Mật khẩu không chính xác! Vui lòng thử lại hoặc hỏi nhóm dịch.');
    }
  };

  // --- IN-CHAPTER ADVERTISING SYSTEM (QUẢNG CÁO TRONG CHƯƠNG TRUYỆN) ---
  const chapterAdConfig = siteSettings?.chapterAd || DEFAULT_CHAPTER_AD;
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const adTimerRef = useRef<any>(null);

  const getAdTracker = () => {
    const now = Date.now();
    const resetIntervalMs = Math.max(1, chapterAdConfig.adResetMinutes || 30) * 60 * 1000;
    try {
      const saved = sessionStorage.getItem('leesincomic_ad_tracker');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (now < (parsed.resetAt || 0)) {
          chapterAdRuntimeTracker = parsed;
          return chapterAdRuntimeTracker;
        }
      }
    } catch (e) {}
    if (now >= (chapterAdRuntimeTracker.resetAt || 0)) {
      chapterAdRuntimeTracker = { count: 0, lastShownAt: 0, resetAt: now + resetIntervalMs };
      try { sessionStorage.setItem('leesincomic_ad_tracker', JSON.stringify(chapterAdRuntimeTracker)); } catch (e) {}
    }
    return chapterAdRuntimeTracker;
  };

  const recordAdShown = () => {
    const current = getAdTracker();
    current.count += 1;
    current.lastShownAt = Date.now();
    try { sessionStorage.setItem('leesincomic_ad_tracker', JSON.stringify(current)); } catch (e) {}
  };

  // Kích hoạt hẹn giờ hiển thị quảng cáo khi độc giả mở đọc chương
  useEffect(() => {
    if (!chapterAdConfig.enabled || (chapter.isPasswordProtected && !isUnlocked)) {
      return;
    }

    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }

    const tracker = getAdTracker();
    const maxAds = Math.max(1, chapterAdConfig.maxAdsCount || 2);

    if (tracker.count >= maxAds) {
      return;
    }

    let delayMs = 5000;
    if (tracker.count === 0) {
      // Lần đầu tiên: chờ firstAdDelaySeconds (giây)
      delayMs = Math.max(1, chapterAdConfig.firstAdDelaySeconds || 5) * 1000;
    } else {
      // Lần thứ 2: chờ secondAdDelaySeconds kể từ lần trước hoặc từ khi vào chương
      const now = Date.now();
      const elapsedSinceLast = now - (tracker.lastShownAt || 0);
      const targetGapMs = Math.max(5, chapterAdConfig.secondAdDelaySeconds || 60) * 1000;
      delayMs = Math.max(1000, targetGapMs - elapsedSinceLast);
    }

    adTimerRef.current = setTimeout(() => {
      setIsAdModalOpen(true);
      recordAdShown();
    }, delayMs);

    return () => {
      if (adTimerRef.current) {
        clearTimeout(adTimerRef.current);
      }
    };
  }, [
    chapter.id,
    currentUser,
    isUnlocked,
    chapterAdConfig.enabled,
    chapterAdConfig.maxAdsCount,
    chapterAdConfig.firstAdDelaySeconds,
    chapterAdConfig.secondAdDelaySeconds,
    chapterAdConfig.adResetMinutes,
  ]);

  const handleCloseAdModal = () => {
    setIsAdModalOpen(false);

    // Nếu vẫn còn lượt hiển thị quảng cáo thứ 2 (hoặc tiếp theo), lên lịch cho lần 2
    const tracker = getAdTracker();
    const maxAds = Math.max(1, chapterAdConfig.maxAdsCount || 2);
    if (tracker.count < maxAds && chapterAdConfig.enabled) {
      const secondDelayMs = Math.max(5, chapterAdConfig.secondAdDelaySeconds || 60) * 1000;
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
      adTimerRef.current = setTimeout(() => {
        setIsAdModalOpen(true);
        recordAdShown();
      }, secondDelayMs);
    }
  };

  // Password Protected Chapter check
  if (chapter.isPasswordProtected && !isUnlocked) {
    return (
      <div id="reader-password-prompt" className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141822] border border-amber-500/50 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
            <KeyRound className="w-8 h-8" />
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              Chương Được Khóa Mật Khẩu
            </span>
            <h2 className="text-xl font-bold text-white mt-2">{chapter.title}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Nhóm dịch <strong className="text-amber-400">{chapter.teamName}</strong> đã đặt mật khẩu bảo vệ cho chương này.
            </p>
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockPassword} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nhập mật khẩu mở khóa:
              </label>
              <input
                id="chapter-password-input"
                type="text"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Nhập password do nhóm dịch cấp..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <button
                id="btn-submit-unlock-chapter"
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                Mở Khóa Đọc Chương
              </button>
              <button
                type="button"
                onClick={onBackToComic}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Quay lại danh sách chương
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Active Reader Container
  const widthClasses = {
    normal: 'max-w-3xl',
    wide: 'max-w-5xl',
    full: 'max-w-full px-2',
  }[readerWidth];

  return (
    <div
      id="manga-reader-view"
      className="space-y-6 pb-24 transition-colors duration-300 rounded-3xl p-2 sm:p-4"
      style={{ backgroundColor: readerBg }}
    >
      
      {/* Sticky Reader Top Bar */}
      <div className="sticky top-16 z-30 bg-[#121620]/95 backdrop-blur-md border border-slate-800 py-2.5 px-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            id="btn-reader-back"
            onClick={onBackToComic}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {comic.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amber-400 font-medium">
                {chapter.title} • {chapter.teamName}
              </span>
              <span className="text-slate-400 flex items-center gap-1 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                <Eye className="w-3 h-3 text-slate-400" />
                <span>{getEffectiveChapterViews(chapter, comic, siteSettings?.viewTrackingStartDate).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Chapter Quick Selector */}
        <div className="flex items-center gap-2">
          <button
            id="btn-prev-chapter"
            disabled={!prevChapter}
            onClick={() => prevChapter && onSelectChapter(prevChapter)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            id="select-active-chapter"
            value={chapter.id}
            onChange={(e) => {
              const selected = comic.chapters.find((c) => c.id === e.target.value);
              if (selected) onSelectChapter(selected);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:border-amber-500"
          >
            {comic.chapters.map((c) => {
              const displayLabel = c.title
                ? (c.title.toLowerCase().startsWith('chap') || c.title.toLowerCase().startsWith('chương')
                    ? c.title
                    : `Chương ${c.chapterNumber}: ${c.title}`)
                : `Chương ${c.chapterNumber}`;
              return (
                <option key={c.id} value={c.id}>
                  {displayLabel} {c.isPasswordProtected ? '🔒' : ''}
                </option>
              );
            })}
          </select>

          <button
            id="btn-next-chapter"
            disabled={!nextChapter}
            onClick={() => nextChapter && onSelectChapter(nextChapter)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Width controls & Offline Save */}
        <div className="flex items-center gap-2">
          {/* DRM Anti-Theft Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold select-none" title="Trang đọc truyện được kích hoạt hệ thống bảo vệ chống sao chép ảnh">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bảo Vệ Bản Quyền</span>
          </div>

          {/* Reader Background Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs" title="Đổi màu nền đọc truyện">
            <Palette className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-0.5 shrink-0" />
            {READER_BG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setReaderBg(opt.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  readerBg.toLowerCase() === opt.value.toLowerCase()
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Đổi màu nền: ${opt.name}`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30 inline-block shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="hidden md:inline">{opt.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Reader Width Selector */}
          <div className="hidden sm:flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setReaderWidth('normal')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                readerWidth === 'normal' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Khung đọc 768px"
            >
              Chuẩn (768px)
            </button>
            <button
              onClick={() => setReaderWidth('wide')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                readerWidth === 'wide' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Khung đọc 1024px"
            >
              Rộng (1024px)
            </button>
            <button
              onClick={() => setReaderWidth('full')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                readerWidth === 'full' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Hiển thị theo độ rộng gốc nguyên bản của ảnh"
            >
              Gốc (100%)
            </button>
          </div>

        </div>
      </div>

      {/* Floating Anti-Theft Toast Notification */}
      {showAntiTheftToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-amber-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-2xl px-5 py-3 flex items-center gap-3 animate-bounce">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Ảnh Truyện Được Bảo Vệ Bản Quyền</h4>
            <p className="text-[11px] text-slate-300">Vui lòng không lưu hay sao chép hình ảnh trái phép.</p>
          </div>
        </div>
      )}

      {/* Comic Pages Continuous Reader Strip (Webtoon mode) - Seamless blocks with Anti-Leech Shields */}
      {(() => {
        const validImages = chapterImages.filter(
          (img) => typeof img === 'string' && img.trim().length > 0
        );

        if (isLoadingImages) {
          return (
            <div
              className={`mx-auto ${widthClasses} border border-slate-800 rounded-2xl p-16 text-center text-slate-300 space-y-4`}
              style={{ backgroundColor: readerBg }}
            >
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Đang tải các trang truyện từ CDN tachserver.site / leesincomic.com...</p>
              <p className="text-xs text-slate-400">Hệ thống đang tự động tối ưu và nạp các trang ảnh chất lượng cao</p>
            </div>
          );
        }

        if (validImages.length === 0) {
          return (
            <div
              className={`mx-auto ${widthClasses} border border-slate-800 rounded-3xl p-8 sm:p-12 text-center text-slate-300 space-y-4 shadow-2xl`}
              style={{ backgroundColor: readerBg }}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <p className="text-base font-bold text-white">Chương này chưa có hình ảnh hoặc đang chờ nạp từ CDN</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hệ thống hỗ trợ lấy ảnh trực tiếp từ cụm máy chủ <span className="text-emerald-400 font-mono font-semibold">tachserver.site</span> và <span className="text-amber-400 font-mono font-semibold">leesincomic.com</span>. Bấm nút bên dưới để đồng bộ ngay.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fetchChapterImages(true)}
                  disabled={isLoadingImages}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingImages ? 'animate-spin' : ''}`} />
                  <span>{isLoadingImages ? 'Đang đồng bộ ảnh...' : 'Đồng Bộ Ngay Từ Server tachserver.site'}</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToComic}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  Quay lại mục lục
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            className={`mx-auto ${widthClasses} flex flex-col gap-0 space-y-0 overflow-hidden shadow-2xl rounded-2xl select-none reader-protected-area border border-black/20`}
            style={{ backgroundColor: readerBg }}
            onContextMenu={(e) => {
              e.preventDefault();
              triggerAntiTheftToast();
            }}
          >
            {validImages.map((imgSrc, index) => (
              <div
                key={index}
                className="relative w-full group p-0 m-0 border-0 leading-none select-none overflow-hidden"
                style={{
                  backgroundColor: readerBg,
                  contentVisibility: 'auto',
                  containIntrinsicSize: '800px 1200px',
                }}
              >
                {/* Manga Image Page */}
                <img
                  src={imgSrc}
                  alt={`${comic.title} - ${chapter.title} - Trang ${index + 1}`}
                  className="w-full h-auto block p-0 m-0 border-0 anti-theft-image select-none pointer-events-none"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  draggable={false}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const src = target.src || '';
                    const step = parseInt(target.getAttribute('data-fallback-step') || '0', 10);
                    
                    if (step === 0) {
                      target.setAttribute('data-fallback-step', '1');
                      if (src.includes('tachserver.online')) {
                        target.src = src.replace(/tachserver\.online/g, 'tachserver.site');
                      } else if (src.includes('tachserver.site/cdn3/uploads/')) {
                        target.src = src.replace('https://tachserver.site/cdn3/uploads/', 'https://leesincomic.com/uploads/');
                      } else if (src.includes('leesincomic.com/uploads/')) {
                        target.src = src.replace('https://leesincomic.com/uploads/', 'https://tachserver.site/cdn3/uploads/');
                      } else if (src.includes('tachserver.site/uploads/')) {
                        target.src = src.replace('https://tachserver.site/uploads/', 'https://tachserver.site/cdn3/uploads/');
                      } else if (src.startsWith('/uploads/')) {
                        target.src = `https://tachserver.site/cdn3${src}`;
                      } else {
                        target.style.opacity = '0.5';
                      }
                    } else if (step === 1) {
                      target.setAttribute('data-fallback-step', '2');
                      // Step 2: Try relative path /uploads/ or alternate extension (.jpg <-> .png)
                      if (src.includes('https://leesincomic.com/uploads/')) {
                        target.src = src.replace('https://leesincomic.com', '');
                      } else if (src.includes('.jpg')) {
                        target.src = src.replace('.jpg', '.png');
                      } else if (src.includes('.png')) {
                        target.src = src.replace('.png', '.jpg');
                      } else {
                        target.style.opacity = '0.5';
                      }
                    } else if (step === 2) {
                      target.setAttribute('data-fallback-step', '3');
                      // Step 3: Try leading zero adjustment (e.g. 4- -> 04- or 04- -> 4-)
                      const urlParts = src.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      if (/^\d{1}-/.test(filename)) {
                        urlParts[urlParts.length - 1] = `0${filename}`;
                        target.src = urlParts.join('/');
                      } else if (/^0\d-/.test(filename)) {
                        urlParts[urlParts.length - 1] = filename.replace(/^0/, '');
                        target.src = urlParts.join('/');
                      } else {
                        target.style.opacity = '0.5';
                      }
                    } else {
                      target.style.opacity = '0.5';
                    }
                  }}
                />

                {/* Transparent Anti-Leech Protective Shield Overlay (Chặn trực tiếp chuột phải & kéo ảnh) */}
                <div
                  className="absolute inset-0 z-20 select-none bg-transparent cursor-default"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerAntiTheftToast();
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                    return false;
                  }}
                />

                {/* Global Automatic Watermark Logo (Đóng Dấu Cho Toàn Bộ Truyện 1-Thao Tác) */}
                {(() => {
                  const isWatermarkEnabled = siteSettings?.enableGlobalWatermark !== false;
                  const watermarkLogo = siteSettings?.watermarkLogoUrl || siteSettings?.watermark?.logoUrl || siteSettings?.logoUrl;
                  if (!isWatermarkEnabled || !watermarkLogo) return null;

                  const opacity = siteSettings?.watermarkOpacity !== undefined
                    ? siteSettings.watermarkOpacity
                    : siteSettings?.watermark?.opacity !== undefined
                    ? siteSettings.watermark.opacity
                    : 0.85;

                  const scale = siteSettings?.watermarkScale !== undefined
                    ? siteSettings.watermarkScale
                    : siteSettings?.watermark?.scale !== undefined
                    ? siteSettings.watermark.scale
                    : 0.25;

                  const position = siteSettings?.watermarkPosition || siteSettings?.watermark?.position || 'bottom-right';

                  let posClass = 'bottom-4 right-4';
                  if (position === 'bottom-left') posClass = 'bottom-4 left-4';
                  else if (position === 'top-right') posClass = 'top-4 right-4';
                  else if (position === 'top-left') posClass = 'top-4 left-4';
                  else if (position === 'center') posClass = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
                  else if (position === 'bottom-center') posClass = 'bottom-4 left-1/2 -translate-x-1/2';

                  return (
                    <div
                      className={`absolute z-10 pointer-events-none select-none transition-all ${posClass}`}
                      style={{
                        width: `${Math.round(scale * 100)}%`,
                        maxWidth: '320px',
                        minWidth: '80px',
                        opacity: opacity,
                      }}
                    >
                      <img
                        src={watermarkLogo}
                        alt="Logo Watermark"
                        className="w-full h-auto block drop-shadow-md select-none pointer-events-none"
                        draggable={false}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  );
                })()}

                {/* Page number pill */}
                <div className="absolute top-3 left-3 pointer-events-none z-20">
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-bold text-slate-300">
                    {index + 1} / {validImages.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* In-Chapter Inline Shopee Sponsor Banner (nếu admin bật) */}
      {chapterAdConfig.enabled && chapterAdConfig.showInlineBanner && (
        <div className={`mx-auto ${widthClasses} px-2`}>
          <ChapterInlineAdBanner ad={chapterAdConfig} />
        </div>
      )}

      {/* Reader Bottom Navigation & Completion Card */}
      <div className={`mx-auto ${widthClasses} bg-[#141822] border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl`}>
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Bạn vừa đọc xong {chapter.title}</h3>
        <p className="text-xs text-slate-400">
          Bản dịch thuộc sở hữu của <strong className="text-amber-400">{chapter.teamName}</strong>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {prevChapter && (
            <button
              onClick={() => onSelectChapter(prevChapter)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Chương Trước: {prevChapter.title || `Chap ${prevChapter.chapterNumber}`}</span>
            </button>
          )}

          <button
            onClick={onBackToComic}
            className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            Mục Lục Truyện
          </button>

          <button
            type="button"
            onClick={scrollToTop}
            className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-amber-500/30 text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Cuộn Lên Đầu Trang</span>
          </button>

          {nextChapter ? (
            <button
              onClick={() => onSelectChapter(nextChapter)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <span>Chương Kế Tiếp: {nextChapter.title || `Chap ${nextChapter.chapterNumber}`}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-medium">
              Bạn đang ở chương mới nhất!
            </span>
          )}
        </div>
      </div>

      {/* Team Description & Donate Info Card */}
      {team && (
        <div className={`mx-auto ${widthClasses}`}>
          <TeamDonationCard
            team={team}
            isFollowed={isTeamFollowed}
            onToggleFollow={onToggleFollowTeam}
            onViewTeam={onViewTeam}
          />
        </div>
      )}

      {/* Chapter Comments Feed */}
      {onAddComment && onLikeComment && (
        <div className={`mx-auto ${widthClasses}`}>
          <LiveCommentsFeed
            comments={comments}
            currentUser={currentUser}
            onAddComment={onAddComment}
            onLikeComment={onLikeComment}
            onDeleteComment={onDeleteComment}
            onRequireLogin={onRequireLogin}
            onNavigateToComic={() => onBackToComic()}
            onNavigateToChapter={(slug, chapNum) => {
              const chap = comic.chapters?.find((c) => Number(c.chapterNumber) === Number(chapNum));
              if (chap) onSelectChapter(chap);
            }}
            title={`Bình Luận ${chapter.title} - ${comic.title}`}
            comicFilter={comic.id}
            chapterFilter={chapter.chapterNumber}
            currentComic={comic}
            currentChapter={chapter}
            showComicInfo={false}
            highlightedCommentId={highlightedCommentId}
          />
        </div>
      )}

      {/* Hộp Nhỏ Đếm Ngược Thời Gian Tính View Bên Phải (Floating Right-Side View Countdown) */}
      <div
        id="reader-view-timer-floating"
        className="fixed right-2.5 sm:right-5 top-1/2 -translate-y-1/2 z-40 pointer-events-auto select-none"
      >
        {viewStatus === 'pending' ? (
          <div
            className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-[0_6px_24px_rgba(0,0,0,0.7)] text-center min-w-[54px]"
            title={`Đếm ngược thời gian đọc để tính lượt xem (${Math.max(0, viewDelaySeconds - timeSpentSeconds)}s còn lại)`}
          >
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold text-amber-300 font-mono leading-none">
              {Math.max(0, viewDelaySeconds - timeSpentSeconds) > 0
                ? `${Math.max(0, viewDelaySeconds - timeSpentSeconds)}s`
                : `${scrollDepthPercent}/${requireScrollPercent}%`}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none">
              {Math.max(0, viewDelaySeconds - timeSpentSeconds) > 0 ? 'Tính view' : 'Cuộn đọc'}
            </span>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 shadow-[0_6px_24px_rgba(0,0,0,0.7)] text-center min-w-[54px] transition-all duration-300"
            title="Đã đủ điều kiện và ghi nhận lượt xem cho chương này"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-extrabold text-emerald-300 leading-none">
              +{viewMultiplier} View
            </span>
            <span className="text-[9px] font-semibold text-slate-400 leading-none">
              Đã tính
            </span>
          </div>
        )}
      </div>

      {/* Con Lăn Cuộn Lên Đầu Trang (Floating Scroll-To-Top Roller inside Chapter) */}
      <button
        id="btn-reader-scroll-top-roller"
        type="button"
        onClick={scrollToTop}
        title="Cuộn lên đầu trang"
        aria-label="Cuộn lên đầu trang"
        className={`fixed bottom-6 right-4 sm:right-6 z-40 group flex flex-col items-center justify-center gap-1 p-2.5 sm:p-3 rounded-full bg-slate-900/95 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border-2 border-amber-500/60 hover:border-amber-300 shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all duration-300 cursor-pointer active:scale-90 ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Mouse Roller / Scroll Wheel Icon with Upward Chevron */}
        <div className="relative flex flex-col items-center justify-center w-7 h-9 sm:w-8 sm:h-10 rounded-full border-2 border-current transition-transform group-hover:-translate-y-0.5">
          <ChevronsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 -mb-0.5 animate-bounce" />
          <span className="w-1 h-2 sm:h-2.5 rounded-full bg-current opacity-90" />
        </div>
        <span className="text-[10px] font-extrabold tracking-tight leading-none px-1">
          {readingProgress > 0 ? `${readingProgress}%` : 'TOP'}
        </span>
      </button>

      {/* Chapter Ad Modal Popup (Xuất hiện theo thời gian và số lượng Admin đã cài đặt) */}
      <ChapterAdModal
        ad={chapterAdConfig}
        isOpen={isAdModalOpen}
        onClose={handleCloseAdModal}
        onConfirm={handleCloseAdModal}
      />

    </div>
  );
};
