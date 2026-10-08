import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Star,
  Sparkles,
  Zap,
  TrendingUp,
  Crown,
  Play
} from 'lucide-react';
import { Comic, ScanTeam } from '../types';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic, isComicCoverRevealed } from '../utils/adultFilter';
import { toSlug } from '../utils/slug';

interface TopFeaturedSliderProps {
  comics: Comic[];
  teams?: ScanTeam[];
  onSelectComic: (comic: Comic) => void;
  onViewTeam?: (team: ScanTeam) => void;
  onNavigateToChapter?: (comicSlug: string, chapterNumber: number) => void;
  onOpenTeamPortal?: () => void;
}

const RANK_BADGES = [
  { rank: 1, label: 'TOP 1 THỊNH HÀNH', color: 'from-amber-400 via-rose-500 to-rose-600', icon: Crown, border: 'border-amber-400/60 shadow-rose-500/30' },
  { rank: 2, label: 'TOP 2 THỊNH HÀNH', color: 'from-sky-400 to-indigo-600', icon: Flame, border: 'border-sky-400/50 shadow-sky-500/20' },
  { rank: 3, label: 'TOP 3 THỊNH HÀNH', color: 'from-emerald-400 to-teal-600', icon: TrendingUp, border: 'border-emerald-400/50 shadow-emerald-500/20' },
  { rank: 4, label: 'TOP 4 NỔI BẬT', color: 'from-purple-400 to-pink-600', icon: Sparkles, border: 'border-purple-400/50 shadow-purple-500/20' },
  { rank: 5, label: 'TOP 5 NỔI BẬT', color: 'from-orange-400 to-amber-600', icon: Zap, border: 'border-orange-400/50 shadow-orange-500/20' },
];

export const TopFeaturedSlider: React.FC<TopFeaturedSliderProps> = ({
  comics,
  teams,
  onSelectComic,
  onViewTeam,
  onNavigateToChapter,
  onOpenTeamPortal,
}) => {
  // Get top 5 comics sorted strictly by highest views (Thịnh Hành)
  const top5Comics = React.useMemo(() => {
    if (!comics || comics.length === 0) return [];
    const sorted = [...comics].sort((a, b) => {
      // Sort strictly by view count (highest views first)
      const viewDiff = (b.views || 0) - (a.views || 0);
      if (viewDiff !== 0) return viewDiff;
      const likeDiff = (b.likes || 0) - (a.likes || 0);
      if (likeDiff !== 0) return likeDiff;
      return (b.follows || 0) - (a.follows || 0);
    });
    return sorted.slice(0, 5);
  }, [comics]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activeComic = top5Comics[currentIndex] || comics[0];
  const is18 = activeComic ? is18PlusComic(activeComic) : false;
  const [isAdultRevealed, setIsAdultRevealed] = useState<boolean>(() => {
    if (!activeComic || !is18) return true;
    return isComicCoverRevealed(activeComic.id);
  });

  useEffect(() => {
    if (!activeComic || !is18) {
      setIsAdultRevealed(true);
      return;
    }
    setIsAdultRevealed(isComicCoverRevealed(activeComic.id));

    const handleRevealChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ comicId: string; revealed: boolean }>;
      if (customEvent.detail && customEvent.detail.comicId === activeComic.id) {
        setIsAdultRevealed(customEvent.detail.revealed);
      }
    };

    window.addEventListener('adult-cover-reveal-changed', handleRevealChange);
    return () => {
      window.removeEventListener('adult-cover-reveal-changed', handleRevealChange);
    };
  }, [activeComic?.id, is18]);

  // Auto switch slide every 5 seconds (5000ms)
  useEffect(() => {
    if (top5Comics.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % top5Comics.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [top5Comics.length, isPaused]);

  // Handle touch swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      // Swipe left -> Next slide
      handleNext();
    } else if (diff < -50) {
      // Swipe right -> Prev slide
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handlePrev = () => {
    if (top5Comics.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + top5Comics.length) % top5Comics.length);
  };

  const handleNext = () => {
    if (top5Comics.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % top5Comics.length);
  };

  // If no comics in database
  if (top5Comics.length === 0) {
    return (
      <section
        id="top-featured-empty-banner"
        className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#121622] via-[#181d2c] to-[#121622] border border-slate-800 p-8 text-center shadow-2xl"
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Chưa có truyện nào trong Top Thịnh Hành</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống đang kết nối cơ sở dữ liệu MySQL. Quản trị viên hoặc các nhóm dịch có thể bắt đầu đăng truyện ngay!
          </p>
          {onOpenTeamPortal && (
            <button
              onClick={onOpenTeamPortal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Đăng Truyện Mới Ngay</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  const activeRank = RANK_BADGES[currentIndex] || RANK_BADGES[0];
  const RankIcon = activeRank.icon;
  const latestChapter = activeComic.chapters[activeComic.chapters.length - 1];

  return (
    <section
      id="top-5-featured-slider"
      className="relative rounded-3xl overflow-hidden bg-[#0e121a] border border-slate-800/90 shadow-2xl transition-all select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Banner with Glass Gradient Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          key={`bg-${activeComic.id}`}
          src={activeComic.bannerImage || activeComic.coverImage}
          alt={activeComic.title}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            is18 && !isAdultRevealed
              ? 'blur-2xl scale-125 opacity-15 brightness-50'
              : 'blur-md scale-110 opacity-25'
          }`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e121a] via-[#0e121a]/85 to-[#0e121a]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e121a] via-transparent to-transparent" />
      </div>

      {/* Main Slide Content */}
      <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
        
        {/* Left: 3D Poster Card */}
        <div
          onClick={() => onSelectComic(activeComic)}
          className="relative w-44 sm:w-52 md:w-56 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/60 group cursor-pointer hover:border-rose-500/80 transition-all duration-300 hover:scale-[1.02]"
        >
          <CensoredCoverImage
            key={`cover-${activeComic.id}`}
            src={activeComic.coverImage}
            alt={activeComic.title}
            comicId={activeComic.id}
            genres={activeComic.genres}
            is18Plus={activeComic.is18Plus}
            is18PlusOverride={is18}
            size="lg"
            showBadge={false}
            className="w-full h-full"
            imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Rank Badge on Poster */}
          <div className="absolute top-2.5 left-2.5 z-20">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black text-white bg-gradient-to-r ${activeRank.color} shadow-lg shadow-black/40 border border-white/20`}
            >
              <RankIcon className="w-3.5 h-3.5" />
              <span>#{currentIndex + 1}</span>
            </span>
          </div>

          {/* Quick Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-xs transition-opacity z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 transform scale-75 group-hover:scale-100 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3.5 text-center lg:text-left w-full">
          
          {/* Top Tags & Rank Label */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r ${activeRank.color} shadow-md`}
            >
              <RankIcon className="w-3.5 h-3.5" />
              <span>{activeRank.label}</span>
            </span>

            {is18 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600/30 text-red-300 border border-red-500/50">
                <span>🔞</span>
                <span>18+</span>
              </span>
            )}

            {activeComic.teamName && (
              <button
                type="button"
                onClick={() => {
                  if (onViewTeam) {
                    const foundTeam = teams?.find(
                      (t) =>
                        t.id === activeComic.teamId ||
                        t.name.toLowerCase() === activeComic.teamName!.toLowerCase() ||
                        t.slug?.toLowerCase() === toSlug(activeComic.teamName!).toLowerCase()
                    );
                    if (foundTeam) {
                      onViewTeam(foundTeam);
                    } else {
                      onViewTeam({
                        id: activeComic.teamId || `team-${toSlug(activeComic.teamName)}`,
                        name: activeComic.teamName,
                        slug: toSlug(activeComic.teamName),
                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                        bio: `Nhóm dịch ${activeComic.teamName}`,
                        leaderId: 'system',
                        leaderName: activeComic.teamName,
                        members: [],
                        monthlyViews: {},
                        dailyViews: {},
                        totalViews: 0,
                      });
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700 transition-colors cursor-pointer"
                title={`Xem các truyện của nhóm ${activeComic.teamName}`}
              >
                Nhóm: {activeComic.teamName}
              </button>
            )}

            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/80 text-slate-300 border border-slate-800">
              {activeComic.status}
            </span>
          </div>

          {/* Comic Title */}
          <div>
            <h2
              onClick={() => onSelectComic(activeComic)}
              className="text-xl sm:text-2xl md:text-3xl font-black text-white hover:text-rose-400 cursor-pointer transition-colors line-clamp-2 tracking-tight"
            >
              {activeComic.title}
            </h2>
            {activeComic.otherNames && activeComic.otherNames.length > 0 && (
              <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">
                Tên khác: {activeComic.otherNames.join(' • ')}
              </p>
            )}
          </div>

          {/* Quick Stats: Views, Rating, Chapters */}
          <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-white">{activeComic.views.toLocaleString()}</span> lượt đọc
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{activeComic.rating || '5.0'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span className="text-slate-200 font-semibold">{activeComic.chapters.length} Chương</span>
            </div>
          </div>

          {/* Genres Chips */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
            {activeComic.genres.slice(0, 5).map((genre) => (
              <span
                key={genre}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/60"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Synopsis Short */}
          <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed max-w-2xl bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
            {activeComic.summary || 'Đọc truyện tranh hấp dẫn với hình ảnh sắc nét, load mượt mà tại Leesin Comic (leesincomic.com).'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
            {activeComic.chapters.length > 0 && onNavigateToChapter && (
              <button
                id="btn-top-read-first"
                onClick={() => onNavigateToChapter(activeComic.slug, activeComic.chapters[0].chapterNumber)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>Đọc Từ Đầu (Chap 1)</span>
              </button>
            )}

            {latestChapter && onNavigateToChapter && (
              <button
                id="btn-top-read-latest"
                onClick={() => onNavigateToChapter(activeComic.slug, latestChapter.chapterNumber)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Chap Mới (Chap {latestChapter.chapterNumber})</span>
              </button>
            )}

            <button
              id="btn-top-view-detail"
              onClick={() => onSelectComic(activeComic)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
            >
              Chi Tiết Truyện
            </button>
          </div>
        </div>
      </div>

      {/* Single Row 5-Comics Overlapping Carousel Selector Strip */}
      <div className="relative z-10 px-4 sm:px-8 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          
          {/* Prev button */}
          <button
            id="btn-slider-prev"
            onClick={handlePrev}
            aria-label="Truyện trước"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-rose-500 hover:text-white text-slate-400 border border-slate-800 flex items-center justify-center shrink-0 transition-all shadow-md active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 5 Top Comics Stacked & Overlapping in 1 Single Row */}
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-1 scrollbar-none">
            {top5Comics.map((comic, idx) => {
              const isActive = idx === currentIndex;
              const rankInfo = RANK_BADGES[idx] || RANK_BADGES[0];

              return (
                <div
                  key={comic.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCurrentIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setCurrentIndex(idx);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl border transition-all duration-300 text-left shrink-0 cursor-pointer select-none ${
                    isActive
                      ? `bg-slate-900 border-rose-500/80 shadow-lg shadow-rose-500/10 scale-105 z-20`
                      : 'bg-slate-950/70 border-slate-800/90 opacity-65 hover:opacity-100 hover:bg-slate-900/80 hover:border-slate-700 scale-95'
                  }`}
                >
                  {/* Small Thumbnail */}
                  <div className="w-7 h-9 rounded-md overflow-hidden shrink-0">
                    <CensoredCoverImage
                      src={comic.coverImage}
                      alt={comic.title}
                      comicId={comic.id}
                      genres={comic.genres}
                      is18Plus={comic.is18Plus}
                      size="xs"
                      showBadge={false}
                      className="w-full h-full"
                      imageClassName={`w-full h-full object-cover border ${
                        isActive ? 'border-rose-400' : 'border-slate-800'
                      }`}
                    />
                  </div>

                  {/* Rank & Title */}
                  <div className="min-w-0 max-w-[100px] sm:max-w-[130px] md:max-w-[160px]">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          isActive ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        #{idx + 1} TOP
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {comic.title}
                    </p>
                  </div>

                  {/* 5-Second Animated Progress Bar for Active Slide */}
                  {isActive && !isPaused && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 animate-[progress_5s_linear_infinite]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Next button */}
          <button
            id="btn-slider-next"
            onClick={handleNext}
            aria-label="Truyện kế tiếp"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-rose-500 hover:text-white text-slate-400 border border-slate-800 flex items-center justify-center shrink-0 transition-all shadow-md active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};
