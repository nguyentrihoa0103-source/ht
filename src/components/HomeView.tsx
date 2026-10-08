import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Clock,
  Eye,
  Star,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Sparkles,
  Shield,
  Zap,
  FolderArchive,
  Lock,
  WifiOff,
  BookOpen,
  MessageSquare,
  Grid,
  Trophy
} from 'lucide-react';
import { Comic, User, ChapterComment, SiteSettings, ScanTeam, Chapter } from '../types';
import { LiveCommentsFeed } from './LiveCommentsFeed';
import { TopFeaturedSlider } from './TopFeaturedSlider';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic } from '../utils/adultFilter';
import { formatRelativeTime, parseDateOrRelative, getComicLatestTimestamp } from '../utils/timeAgo';
import { toSlug } from '../utils/slug';
import { getEffectiveComicViews } from '../utils/viewTracking';

interface HomeViewProps {
  comics: Comic[];
  currentUser: User | null;
  teams?: ScanTeam[];
  comments?: ChapterComment[];
  siteSettings?: SiteSettings;
  onSelectComic: (comic: Comic) => void;
  onViewTeam?: (team: ScanTeam) => void;
  onOpenTeamPortal: () => void;
  onNavigateToCategory?: (pageType: 'genre' | 'hot' | 'ranking' | 'latest', param?: string) => void;
  onNavigateToChapter?: (comicSlug: string, chapterNumber: number) => void;
  onAddComment?: (comment: Omit<ChapterComment, 'id' | 'createdAt' | 'likes'>) => void;
  onLikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onRequireLogin?: () => void;
  selectedGenre?: string;
  onSelectGenre?: (genre: string) => void;
  selectedRankingTab?: 'day' | 'week' | 'month';
  onSelectRankingTab?: (tab: 'day' | 'week' | 'month') => void;
  isLoading?: boolean;
}

const COMICS_PER_PAGE = 24;

// Helper format tiêu đề hiển thị cho chương trong Chapters List preview
const formatChapterPreviewTitle = (chap: Chapter | null | undefined): string => {
  if (!chap) return '';
  const rawTitle = (chap.title || '').trim();
  const num = chap.chapterNumber !== undefined && chap.chapterNumber !== null ? chap.chapterNumber : '';
  // Nếu trong tiêu đề đã có chữ Chương hoặc Chap ở đầu (không phân biệt hoa/thường)
  if (/^(chương|chuong|chap)(\s|\d|:|$)/i.test(rawTitle)) {
    return rawTitle;
  }
  // Nếu không có chữ Chương hay Chap ở đầu thì tự động thêm chữ Chương {chapterNumber}: vào trước
  if (rawTitle && rawTitle !== String(num)) {
    return num !== '' ? `Chương ${num}: ${rawTitle}` : rawTitle;
  }
  return num !== '' ? `Chương ${num}` : rawTitle;
};

// Memoized Comic Card Component for zero-lag rendering
const ComicCardItem = React.memo<{
  comic: Comic;
  onSelectComic: (comic: Comic) => void;
  teams?: ScanTeam[];
  onViewTeam?: (team: ScanTeam) => void;
  siteSettings?: SiteSettings;
}>(({ comic, onSelectComic, teams, onViewTeam, siteSettings }) => {
  // Sắp xếp danh sách chương theo số chương lớn nhất hoặc thời gian cập nhật thực tế của chương
  const sortedChaps = useMemo(() => {
    if (!comic.chapters || comic.chapters.length === 0) return [];
    return [...comic.chapters].sort((a, b) => {
      const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseFloat(String(a.chapterNumber)) || 0;
      const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseFloat(String(b.chapterNumber)) || 0;
      if (numB !== numA) return numB - numA;
      return parseDateOrRelative(b.updatedAt || b.createdAt) - parseDateOrRelative(a.updatedAt || a.createdAt);
    });
  }, [comic.chapters]);

  const latestChap = sortedChaps[0] || null;
  const prevChap = sortedChaps[1] || null;

  const displayViews = useMemo(() => {
    return getEffectiveComicViews(comic, siteSettings?.viewTrackingStartDate);
  }, [comic, siteSettings?.viewTrackingStartDate]);

  return (
    <div
      onClick={() => onSelectComic(comic)}
      className="group bg-[#141822] rounded-xl overflow-hidden border border-slate-800/80 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-200 cursor-pointer flex flex-col"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '200px 320px' }}
    >
      {/* Thumbnail Poster */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
        <CensoredCoverImage
          src={comic.coverImage}
          alt={comic.title}
          comicId={comic.id}
          genres={comic.genres}
          is18Plus={comic.is18Plus}
          className="w-full h-full"
          imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          showBadge={false}
        />
        
        {/* View count tag top right */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-medium text-slate-200 flex items-center gap-1 border border-white/10 z-10">
          <Eye className="w-3 h-3 text-amber-400" />
          <span>
            {displayViews >= 1000000
              ? `${(displayViews / 1000000).toFixed(1)}M`
              : displayViews >= 1000
              ? `${(displayViews / 1000).toFixed(1)}k`
              : `${displayViews}`}
          </span>
        </div>

        {/* Badges top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {is18PlusComic(comic) && (
            <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[9px] shadow-lg shadow-red-600/40 flex items-center gap-0.5 border border-red-400/30">
              <span>🔞</span>
              <span>18+</span>
            </div>
          )}
          {comic.isHot && (
            <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[9px] shadow-lg shadow-rose-600/40 flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 fill-white" />
              <span>HOT</span>
            </div>
          )}
          {comic.isTrending && (
            <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-[9px] shadow-lg shadow-amber-500/30 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-slate-950" />
              <span>THỊNH HÀNH</span>
            </div>
          )}
          {comic.teamName && (
            <div
              onClick={(e) => {
                if (onViewTeam) {
                  e.stopPropagation();
                  const foundTeam = teams?.find(
                    (t) =>
                      t.id === comic.teamId ||
                      t.name.toLowerCase() === comic.teamName!.toLowerCase() ||
                      t.slug?.toLowerCase() === toSlug(comic.teamName!).toLowerCase()
                  );
                  if (foundTeam) {
                    onViewTeam(foundTeam);
                  } else {
                    onViewTeam({
                      id: comic.teamId || `team-${toSlug(comic.teamName)}`,
                      name: comic.teamName,
                      slug: toSlug(comic.teamName),
                      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                      bio: `Nhóm dịch ${comic.teamName}`,
                      leaderId: 'system',
                      leaderName: comic.teamName,
                      members: [],
                      monthlyViews: {},
                      dailyViews: {},
                      totalViews: 0,
                    });
                  }
                }
              }}
              className="px-1.5 py-0.5 rounded bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold text-[9px] shadow cursor-pointer transition-colors"
              title={`Xem các truyện của nhóm dịch ${comic.teamName}`}
            >
              {comic.teamName}
            </div>
          )}
        </div>

        {/* Rating bottom left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-amber-400 border border-white/10">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="font-bold">{comic.rating}</span>
        </div>

        {/* Gradient Overlay for Title */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141822] via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
      </div>

      {/* Comic Info */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
            {comic.title}
          </h4>
        </div>

        {/* Chapters List preview */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
          {latestChap ? (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-400 truncate">
                  {formatChapterPreviewTitle(latestChap)}
                  {latestChap.isPasswordProtected && ' 🔒'}
                  {latestChap.scheduledDate && ' ⏳'}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatRelativeTime(latestChap.updatedAt || latestChap.createdAt || comic.updatedAt)}
                </span>
              </div>
              {prevChap && (
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">{formatChapterPreviewTitle(prevChap)}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatRelativeTime(prevChap.updatedAt || prevChap.createdAt)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-amber-400/90 font-medium">Mới phát hành</span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {formatRelativeTime(comic.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const HomeView: React.FC<HomeViewProps> = ({
  comics,
  currentUser,
  teams,
  comments = [],
  siteSettings,
  onSelectComic,
  onViewTeam,
  onOpenTeamPortal,
  onNavigateToCategory,
  onNavigateToChapter,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onRequireLogin,
  selectedGenre: propSelectedGenre,
  onSelectGenre,
  selectedRankingTab: propRankingTab,
  onSelectRankingTab,
  isLoading = false,
}) => {
  const [internalGenre, setInternalGenre] = useState<string>('Tất cả');
  const [internalRankingTab, setInternalRankingTab] = useState<'day' | 'week' | 'month'>('month');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const selectedGenre = propSelectedGenre !== undefined ? propSelectedGenre : internalGenre;
  const rankingTab = propRankingTab !== undefined ? propRankingTab : internalRankingTab;

  const handleSetGenre = (genre: string) => {
    if (onNavigateToCategory) {
      onNavigateToCategory('genre', genre);
    } else if (onSelectGenre) {
      onSelectGenre(genre);
    } else {
      setInternalGenre(genre);
    }
  };

  const handleSetRankingTab = (tab: 'day' | 'week' | 'month') => {
    if (onSelectRankingTab) {
      onSelectRankingTab(tab);
    } else {
      setInternalRankingTab(tab);
    }
  };

  const genres = [
    'Tất cả',
    'Hành Động',
    'Trọng Sinh',
    'Ngôn Tình',
    'Tu Tiên',
    'Hầm Ngục',
    'Kinh Dị',
    'Hoàng Gia',
    'Huyền Huyễn',
  ];

  // Helper to calculate / retrieve views for ranking tabs
  const getComicRankViews = (comic: Comic, tab: 'day' | 'week' | 'month'): number => {
    const effectiveTotal = getEffectiveComicViews(comic, siteSettings?.viewTrackingStartDate);
    if (tab === 'day') {
      if (comic.dayViews !== undefined && comic.dayViews > 0) return Math.min(effectiveTotal, comic.dayViews);
      const seed = (comic.id || comic.title).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const factor = 0.035 + (seed % 10) * 0.005; // 3.5% to 8%
      return Math.min(effectiveTotal, Math.max(15, Math.round((comic.views || 0) * factor)));
    }
    if (tab === 'week') {
      if (comic.weekViews !== undefined && comic.weekViews > 0) return Math.min(effectiveTotal, comic.weekViews);
      const seed = (comic.id || comic.title).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const factor = 0.18 + (seed % 12) * 0.01; // 18% to 29%
      return Math.min(effectiveTotal, Math.max(75, Math.round((comic.views || 0) * factor)));
    }
    // 'month'
    if (comic.monthViews !== undefined && comic.monthViews > 0) return Math.min(effectiveTotal, comic.monthViews);
    return effectiveTotal;
  };

  // Deduplicate comics by clean title and sort strictly by latest update time (newest first)
  const uniqueComics = useMemo(() => {
    const seen = new Set<string>();
    const list: Comic[] = [];
    for (const c of comics) {
      const cleanTitle = (c.title || '').trim().toLowerCase();
      if (!seen.has(cleanTitle)) {
        seen.add(cleanTitle);
        list.push(c);
      }
    }
    // Sắp xếp theo mốc thời gian cập nhật mới nhất (mới nhất luôn đứng đầu tiên)
    return list.sort((a, b) => {
      return getComicLatestTimestamp(b) - getComicLatestTimestamp(a);
    });
  }, [comics]);

  // Memoized filtered comics for the selected genre
  const filteredComics = useMemo(() => {
    if (selectedGenre === 'Tất cả') {
      return uniqueComics;
    }
    return uniqueComics.filter((c) => c.genres && c.genres.includes(selectedGenre));
  }, [uniqueComics, selectedGenre]);

  // Reset to page 1 on genre change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGenre]);

  const totalPages = Math.max(1, Math.ceil(filteredComics.length / COMICS_PER_PAGE));

  // Slice for current page - loads only 24 items at once for lightning fast DOM rendering
  const paginatedComics = useMemo(() => {
    const start = (currentPage - 1) * COMICS_PER_PAGE;
    return filteredComics.slice(start, start + COMICS_PER_PAGE);
  }, [filteredComics, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    const anchor = document.getElementById('comic-grid-anchor');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sort comics dynamically based on rankingTab ('day' | 'week' | 'month')
  const sortedRanking = useMemo(() => {
    return [...uniqueComics].sort((a, b) => {
      const vA = getComicRankViews(a, rankingTab);
      const vB = getComicRankViews(b, rankingTab);
      return vB - vA;
    });
  }, [uniqueComics, rankingTab]);

  return (
    <div id="home-view" className="space-y-8 pb-16">
      
      {/* 5 Top Comics Single Row Carousel Banner (Auto 5s & Left/Right) */}
      <TopFeaturedSlider
        comics={comics}
        teams={teams}
        onSelectComic={onSelectComic}
        onViewTeam={onViewTeam}
        onNavigateToChapter={onNavigateToChapter}
        onOpenTeamPortal={onOpenTeamPortal}
      />

      {/* Announcement & Quick Portal Banner */}
      {siteSettings?.showAnnouncementBanner !== false && (
        <section id="announcement-banner" className="bg-gradient-to-r from-slate-900 via-[#151926] to-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white">
                    {siteSettings?.announcementTitle || 'Chào Mừng Đến Với Leesin Comic'}
                  </span>
                  {(siteSettings?.announcementBadge ?? 'leesincomic.com') && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {siteSettings?.announcementBadge || 'leesincomic.com'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {siteSettings?.announcementText || 'Kho truyện tranh cập nhật liên tục mỗi ngày. Đọc siêu tốc mượt mà, hỗ trợ tải về đọc offline tiện lợi.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={onOpenTeamPortal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-500/20 flex items-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Cổng Đăng Truyện Nhóm Dịch</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 Cols: Comic list with filter */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section Title & Genre Filters */}
          <div id="comic-grid-anchor" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 scroll-mt-24">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Truyện Mới Cập Nhật {selectedGenre !== 'Tất cả' ? `• Thể loại: ${selectedGenre}` : ''}
              </h2>
              <span className="text-xs text-slate-400 font-medium ml-1">
                ({filteredComics.length} bộ)
              </span>
            </div>

            {/* Genre Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSetGenre(g)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedGenre === g
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Comic Cards Grid */}
          {isLoading && filteredComics.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="bg-[#141822] rounded-xl overflow-hidden border border-slate-800/80 animate-pulse flex flex-col">
                  <div className="aspect-[3/4] bg-slate-800/50" />
                  <div className="p-2.5 space-y-2">
                    <div className="h-3.5 bg-slate-800/80 rounded w-3/4" />
                    <div className="h-3 bg-slate-800/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredComics.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#141822] rounded-2xl border border-dashed border-slate-800">
              <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-300 font-semibold text-sm">Chưa có truyện nào</p>
              <p className="text-slate-500 text-xs mt-1">Đăng nhập tài khoản Quản trị để thêm các bộ truyện mới vào hệ thống.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {paginatedComics.map((comic) => (
                  <ComicCardItem
                    key={comic.id}
                    comic={comic}
                    onSelectComic={onSelectComic}
                    teams={teams}
                    onViewTeam={onViewTeam}
                    siteSettings={siteSettings}
                  />
                ))}
              </div>

              {/* Clean Pagination Bar */}
              {totalPages > 1 && (
                <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Trang <span className="font-bold text-amber-400">{currentPage}</span> / <span className="font-bold text-white">{totalPages}</span>
                    <span className="hidden sm:inline"> • Hiển thị {(currentPage - 1) * COMICS_PER_PAGE + 1} - {Math.min(currentPage * COMICS_PER_PAGE, filteredComics.length)} trên {filteredComics.length} truyện</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* First Page */}
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(1)}
                      title="Trang đầu"
                      className="p-2 rounded-xl border border-slate-800 bg-[#141822] text-slate-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Prev Page */}
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      title="Trang trước"
                      className="px-3 py-2 rounded-xl border border-slate-800 bg-[#141822] text-xs font-semibold text-slate-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    {/* Number buttons (up to 5 pages around current) */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const hasGap = prevPage && p - prevPage > 1;

                          return (
                            <React.Fragment key={p}>
                              {hasGap && <span className="px-1 text-slate-600">...</span>}
                              <button
                                type="button"
                                onClick={() => handlePageChange(p)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                                  currentPage === p
                                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                    : 'border border-slate-800 bg-[#141822] text-slate-300 hover:text-white hover:border-amber-500/40'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    {/* Next Page */}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      title="Trang sau"
                      className="px-3 py-2 rounded-xl border border-slate-800 bg-[#141822] text-xs font-semibold text-slate-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(totalPages)}
                      title="Trang cuối"
                      className="p-2 rounded-xl border border-slate-800 bg-[#141822] text-slate-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right 4 Cols: Top Ranking & Sidebar Widget */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top Views Ranking Card */}
          <div id="ranking-box" className="bg-[#141822] border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Bảng Xếp Hạng</h3>
              </div>

              {/* Filter Day / Week / Month */}
              <div className="flex p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => handleSetRankingTab('day')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    rankingTab === 'day' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ngày
                </button>
                <button
                  onClick={() => handleSetRankingTab('week')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    rankingTab === 'week' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => handleSetRankingTab('month')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    rankingTab === 'month' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tháng
                </button>
              </div>
            </div>

            {/* Ranking Items */}
            <div className="space-y-3">
              {sortedRanking.slice(0, 5).map((comic, idx) => (
                <div
                  key={comic.id}
                  onClick={() => onSelectComic(comic)}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-slate-700/60"
                >
                  {/* Number Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                        : idx === 1
                        ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950'
                        : idx === 2
                        ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    0{idx + 1}
                  </div>

                  {/* Thumbnail */}
                  <CensoredCoverImage
                    src={comic.coverImage}
                    alt={comic.title}
                    comicId={comic.id}
                    genres={comic.genres}
                    is18Plus={comic.is18Plus}
                    size="xs"
                    showBadge={false}
                    className="w-11 h-14 rounded-md shadow shrink-0"
                    imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 truncate">
                      {comic.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Chương {comic.chapters[comic.chapters.length - 1]?.chapterNumber || 1}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-amber-300">
                        <Eye className="w-3 h-3 text-amber-400" />
                        {getComicRankViews(comic, rankingTab).toLocaleString()}
                      </span>
                      <span>•</span>
                      {comic.teamName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            if (onViewTeam) {
                              e.stopPropagation();
                              const foundTeam = teams?.find(
                                (t) =>
                                  t.id === comic.teamId ||
                                  t.name.toLowerCase() === comic.teamName!.toLowerCase() ||
                                  t.slug?.toLowerCase() === toSlug(comic.teamName!).toLowerCase()
                              );
                              if (foundTeam) {
                                onViewTeam(foundTeam);
                              } else {
                                onViewTeam({
                                  id: comic.teamId || `team-${toSlug(comic.teamName)}`,
                                  name: comic.teamName,
                                  slug: toSlug(comic.teamName),
                                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                                  bio: `Nhóm dịch ${comic.teamName}`,
                                  leaderId: 'system',
                                  leaderName: comic.teamName,
                                  members: [],
                                  monthlyViews: {},
                                  dailyViews: {},
                                  totalViews: 0,
                                });
                              }
                            }
                          }}
                          className="text-amber-400/90 hover:text-amber-300 hover:underline truncate cursor-pointer transition-colors"
                          title={`Xem các truyện của nhóm ${comic.teamName}`}
                        >
                          {comic.teamName}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View Full Ranking Button */}
            {onNavigateToCategory && (
              <button
                type="button"
                onClick={() => onNavigateToCategory('ranking', rankingTab)}
                className="w-full mt-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <span>Xem Toàn Bộ Bảng Xếp Hạng</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DualeoTruyen Style Live Chapter Comments Feed on Homepage */}
          {siteSettings?.showHomeComments !== false && onAddComment && onLikeComment && (
            <LiveCommentsFeed
              comments={comments}
              currentUser={currentUser}
              onAddComment={onAddComment}
              onLikeComment={onLikeComment}
              onDeleteComment={onDeleteComment}
              onRequireLogin={onRequireLogin}
              onNavigateToComic={(slug) => {
                const c = comics.find((item) => item.slug === slug);
                if (c) onSelectComic(c);
              }}
              onNavigateToChapter={(slug, num) => {
                if (onNavigateToChapter) onNavigateToChapter(slug, num);
              }}
              title="Bình Luận Mới Nhất"
              showComicInfo={true}
            />
          )}

          {/* Scanlation Team Join Promo */}
          <div className="bg-gradient-to-br from-slate-900 via-[#161a25] to-[#121620] border border-amber-500/30 rounded-2xl p-4 shadow-xl text-center space-y-3">
            <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Bạn có nhóm dịch truyện?</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Đăng ký nhóm dịch tại Leesin Comic (leesincomic.com) để sở hữu công cụ upload ZIP tự động đóng watermark, thống kê view theo ngày tháng độc quyền!
              </p>
            </div>
            <button
              onClick={onOpenTeamPortal}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-colors"
            >
              Mở Portal Nhóm Dịch
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
