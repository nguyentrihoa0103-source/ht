import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Grid,
  Sparkles,
  Filter,
  Star,
  Eye,
  Clock,
  BookOpen,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react';
import { Comic, SiteSettings } from '../types';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic } from '../utils/adultFilter';
import { toSlug } from '../utils/slug';
import { formatRelativeTime, parseDateOrRelative, getComicLatestTimestamp } from '../utils/timeAgo';
import { getEffectiveComicViews } from '../utils/viewTracking';

interface CategoryViewProps {
  comics?: Comic[];
  allComics?: Comic[];
  siteSettings?: SiteSettings;
  pageType: 'genre' | 'hot' | 'ranking' | 'latest' | 'search';
  param?: string;
  selectedGenre?: string;
  searchQuery?: string;
  rankingTab?: 'day' | 'week' | 'month';
  onSelectComic?: (comic: Comic) => void;
  onNavigateToComic?: (comicSlug: string) => void;
  onNavigateToChapter?: (comicSlug: string, chapterNumber: number) => void;
  onSelectGenre?: (genre: string) => void;
  onNavigateHome?: () => void;
  onNavigateCategory?: (pageType: 'genre' | 'hot' | 'ranking' | 'latest' | 'search', param?: string) => void;
}

const CATEGORY_PAGE_SIZE = 30;

export const CategoryView: React.FC<CategoryViewProps> = ({
  comics = [],
  allComics = [],
  siteSettings,
  pageType,
  param = '',
  selectedGenre = 'Tất cả',
  searchQuery = '',
  rankingTab = 'month',
  onSelectComic,
  onNavigateToComic,
  onNavigateToChapter,
  onSelectGenre,
  onNavigateHome,
  onNavigateCategory,
}) => {
  const rawComicList = comics.length > 0 ? comics : allComics;

  // Deduplicate comics by clean title
  const comicList = useMemo(() => {
    const seen = new Set<string>();
    const list: Comic[] = [];
    for (const c of rawComicList) {
      const cleanTitle = (c.title || '').trim().toLowerCase();
      if (!seen.has(cleanTitle)) {
        seen.add(cleanTitle);
        list.push(c);
      }
    }
    return list;
  }, [rawComicList]);

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

  // Extract unique genres
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    comicList.forEach((c) => c.genres?.forEach((g) => set.add(g)));
    return ['Tất cả', ...Array.from(set)];
  }, [comicList]);

  // Helper to find exact matching genre
  const findMatchingGenre = (target: string): string => {
    if (!target || target === 'Tất cả' || target === 'tat-ca') return 'Tất cả';
    const targetSlug = toSlug(target);
    const found = availableGenres.find(
      (g) => g.toLowerCase() === target.toLowerCase() || toSlug(g) === targetSlug
    );
    return found || target;
  };

  // Initialize initial states from param or props
  const initialGenre = pageType === 'genre' && param ? findMatchingGenre(param) : selectedGenre;
  const initialRanking = pageType === 'ranking' && (param === 'day' || param === 'week' || param === 'month') ? param : rankingTab;
  const initialSearch = pageType === 'search' && param ? param : searchQuery;

  const [currentGenre, setCurrentGenre] = useState<string>(initialGenre || 'Tất cả');
  const [currentRankingTab, setCurrentRankingTab] = useState<'day' | 'week' | 'month'>(initialRanking || 'month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Đang tiến hành' | 'Hoàn thành'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'rating' | 'updated'>(
    pageType === 'latest' ? 'updated' : 'views'
  );
  const [searchInternal, setSearchInternal] = useState(initialSearch || '');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Keep state in sync when param or pageType changes
  useEffect(() => {
    if (pageType === 'genre') {
      setCurrentGenre(findMatchingGenre(param || 'Tất cả'));
    } else if (pageType === 'ranking') {
      if (param === 'day' || param === 'week' || param === 'month') {
        setCurrentRankingTab(param);
      }
    } else if (pageType === 'search') {
      setSearchInternal(param || '');
    } else if (pageType === 'latest') {
      setSortBy('updated');
    }
    setCurrentPage(1);
  }, [pageType, param, availableGenres]);

  const handleComicClick = (comic: Comic) => {
    if (onSelectComic) {
      onSelectComic(comic);
    } else if (onNavigateToComic) {
      onNavigateToComic(comic.slug);
    }
  };

  // Filter & sort logic
  const filteredComics = useMemo(() => {
    return comicList
      .filter((comic) => {
        // Page type specific filter
        if (pageType === 'hot') {
          const hasExplicitHot = comicList.some((c) => !!c.isHot);
          if (hasExplicitHot) {
            if (!comic.isHot) return false;
          } else {
            // Fallback if no comics marked hot yet
            if ((comic.views || 0) < 1000 && !comic.isTrending) return false;
          }
        }

        // Search query filter
        if (pageType === 'search' || searchInternal) {
          const q = (searchInternal || searchQuery).toLowerCase().trim();
          if (q) {
            const matchTitle = (comic.title || '').toLowerCase().includes(q);
            const matchAuthor = (comic.authors || []).some((a) => a.toLowerCase().includes(q));
            const matchGenre = (comic.genres || []).some((g) => g.toLowerCase().includes(q));
            const matchOtherNames = (comic.otherNames || []).some((o) => o.toLowerCase().includes(q));
            if (!matchTitle && !matchAuthor && !matchGenre && !matchOtherNames) return false;
          }
        }

        // Genre filter
        if (pageType === 'genre' && currentGenre && currentGenre !== 'Tất cả') {
          const currentGenreSlug = toSlug(currentGenre);
          if (
            !comic.genres ||
            !comic.genres.some(
              (g) =>
                g.toLowerCase() === currentGenre.toLowerCase() ||
                toSlug(g) === currentGenreSlug
            )
          ) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && comic.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (pageType === 'ranking') {
          return getComicRankViews(b, currentRankingTab) - getComicRankViews(a, currentRankingTab);
        }
        if (pageType === 'hot' && sortBy === 'updated') {
          const scoreA = (a.isHot ? 10000000 : 0) + (a.views || 0);
          const scoreB = (b.isHot ? 10000000 : 0) + (b.views || 0);
          return scoreB - scoreA;
        }
        if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
        if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return getComicLatestTimestamp(b) - getComicLatestTimestamp(a);
      });
  }, [comicList, pageType, currentGenre, statusFilter, sortBy, currentRankingTab, searchInternal, searchQuery]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentGenre, statusFilter, sortBy, currentRankingTab, searchInternal]);

  const totalPages = Math.max(1, Math.ceil(filteredComics.length / CATEGORY_PAGE_SIZE));

  const paginatedComics = useMemo(() => {
    const start = (currentPage - 1) * CATEGORY_PAGE_SIZE;
    return filteredComics.slice(start, start + CATEGORY_PAGE_SIZE);
  }, [filteredComics, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    const topEl = document.getElementById('category-grid-top');
    if (topEl) {
      topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Page title and description
  const pageMeta = useMemo(() => {
    switch (pageType) {
      case 'genre':
        return {
          title: currentGenre === 'Tất cả' ? 'Tất Cả Thể Loại Truyện Tranh' : `Thể Loại: ${currentGenre}`,
          desc: `Khám phá các bộ truyện tranh ${currentGenre} hấp dẫn, chọn lọc với bản dịch chất lượng cao nhất.`,
          badge: 'Chuyên Mục Thể Loại',
          icon: <Grid className="w-4 h-4 text-amber-400" />,
        };
      case 'hot':
        return {
          title: 'Truyện Hot Được Đọc Nhiều Nhất',
          desc: 'Tuyển tập những siêu phẩm manga/manhwa/manhua đang gây sốt cộng đồng độc giả.',
          badge: 'Bảng Vàng Truyện Hot',
          icon: <Flame className="w-4 h-4 text-rose-500" />,
        };
      case 'ranking':
        return {
          title: 'Bảng Xếp Hạng Truyện Tranh',
          desc: 'Bảng xếp hạng tổng hợp theo lượt xem, lượt thích và lượt theo dõi cập nhật liên tục.',
          badge: 'Top Ranking',
          icon: <Trophy className="w-4 h-4 text-amber-400" />,
        };
      case 'latest':
        return {
          title: 'Truyện Mới Cập Nhật Hôm Nay',
          desc: 'Danh sách các bộ truyện vừa được nhóm dịch phát hành chương mới nhất.',
          badge: 'Mới Nhất',
          icon: <Clock className="w-4 h-4 text-emerald-400" />,
        };
      case 'search':
        return {
          title: `Kết Quả Tìm Kiếm: "${searchQuery || searchInternal}"`,
          desc: `Tìm thấy ${filteredComics.length} bộ truyện phù hợp với từ khóa của bạn.`,
          badge: 'Tìm Kiếm',
          icon: <Search className="w-4 h-4 text-sky-400" />,
        };
    }
  }, [pageType, currentGenre, searchQuery, searchInternal, filteredComics.length]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
              {pageMeta.icon}
              <span>{pageMeta.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{pageMeta.title}</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">{pageMeta.desc}</p>
          </div>

          {/* Ranking Tabs if pageType === 'ranking' */}
          {pageType === 'ranking' && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentRankingTab('day')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentRankingTab === 'day'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top Ngày
              </button>
              <button
                type="button"
                onClick={() => setCurrentRankingTab('week')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentRankingTab === 'week'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top Tuần
              </button>
              <button
                type="button"
                onClick={() => setCurrentRankingTab('month')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentRankingTab === 'month'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top Tháng
              </button>
            </div>
          )}

          {/* Search Input Box when pageType === 'search' */}
          {pageType === 'search' && (
            <div className="w-full md:w-80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInternal}
                  onChange={(e) => setSearchInternal(e.target.value)}
                  placeholder="Lọc hoặc đổi từ khóa..."
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
                />
                {searchInternal && (
                  <button
                    type="button"
                    onClick={() => setSearchInternal('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
                    title="Xóa từ khóa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Genre Pills list (if in Genre page) */}
      {pageType === 'genre' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Chọn Thể Loại:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  setCurrentGenre(genre);
                  if (onSelectGenre) {
                    onSelectGenre(genre);
                  } else if (onNavigateCategory) {
                    onNavigateCategory('genre', genre);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentGenre === genre
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control bar: Status & Sort filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="text-xs font-bold text-slate-400">
          Hiển thị <span className="text-white font-black">{filteredComics.length}</span> bộ truyện
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="text-slate-500 px-2 font-medium">Tình trạng:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Đang tiến hành')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'Đang tiến hành' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đang ra
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Hoàn thành')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                statusFilter === 'Hoàn thành' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoàn thành
            </button>
          </div>

          {/* Sort selection */}
          {pageType !== 'ranking' && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="views" className="bg-slate-900">Lượt Xem Nhiều Nhất</option>
                <option value="likes" className="bg-slate-900">Yêu Thích Nhất</option>
                <option value="rating" className="bg-slate-900">Đánh Giá Cao Nhất</option>
                <option value="updated" className="bg-slate-900">Mới Cập Nhật</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Comics Grid */}
      <div id="category-grid-top" className="scroll-mt-24">
        {filteredComics.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-40" />
            <h3 className="text-base font-bold text-slate-300">Không tìm thấy bộ truyện nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Vui lòng thử chọn thể loại khác hoặc từ khóa tìm kiếm khác.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {paginatedComics.map((comic, idx) => {
                const globalIdx = (currentPage - 1) * CATEGORY_PAGE_SIZE + idx;
                const sortedChaps = (comic.chapters || []).slice().sort((a, b) => {
                  const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseFloat(String(a.chapterNumber)) || 0;
                  const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseFloat(String(b.chapterNumber)) || 0;
                  if (numB !== numA) return numB - numA;
                  return parseDateOrRelative(b.createdAt) - parseDateOrRelative(a.createdAt);
                });
                const latestChap = sortedChaps[0] || null;
                const isTop3 = globalIdx < 3 && pageType === 'ranking';

                return (
                  <div
                    key={comic.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-amber-500/50 transition-all shadow-xl relative"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '200px 320px' }}
                  >
                    {/* Ranking Rank Badge */}
                    {pageType === 'ranking' && (
                      <div
                        className={`absolute top-2 left-2 z-20 w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shadow-lg ${
                          globalIdx === 0
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border border-yellow-300'
                            : globalIdx === 1
                            ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 border border-slate-200'
                            : globalIdx === 2
                            ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 border border-amber-600'
                            : 'bg-black/80 text-slate-300 border border-slate-700'
                        }`}
                      >
                        #{globalIdx + 1}
                      </div>
                    )}

                    {/* Hot & Trending & 18+ Badges */}
                    {pageType !== 'ranking' && (
                      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                        {is18PlusComic(comic) && (
                          <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] flex items-center gap-0.5 shadow-md border border-red-400/30">
                            <span>🔞</span>
                            <span>18+</span>
                          </div>
                        )}
                        {comic.isHot && (
                          <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[10px] flex items-center gap-1 shadow-md backdrop-blur-sm">
                            <Flame className="w-3 h-3 fill-white" />
                            <span>HOT</span>
                          </div>
                        )}
                        {comic.isTrending && (
                          <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md backdrop-blur-sm">
                            <Star className="w-3 h-3 fill-slate-950" />
                            <span>THỊNH HÀNH</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thumbnail */}
                    <div
                      onClick={() => handleComicClick(comic)}
                      className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                    >
                      <CensoredCoverImage
                        src={comic.coverImage}
                        alt={comic.title}
                        comicId={comic.id}
                        genres={comic.genres}
                        is18Plus={comic.is18Plus}
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        showBadge={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                      {/* Views & Rating */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                          <Eye className="w-3 h-3 text-amber-400" />
                          {pageType === 'ranking'
                            ? getComicRankViews(comic, currentRankingTab).toLocaleString()
                            : getEffectiveComicViews(comic, siteSettings?.viewTrackingStartDate).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {comic.rating || 5}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => handleComicClick(comic)}
                          className="font-bold text-xs sm:text-sm text-white hover:text-amber-400 line-clamp-2 text-left transition-colors"
                        >
                          {comic.title}
                        </button>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {comic.genres.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-medium"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      {latestChap && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToChapter) {
                              onNavigateToChapter(comic.slug, latestChap.chapterNumber);
                            } else {
                              handleComicClick(comic);
                            }
                          }}
                          className="mt-3 w-full py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20 transition-colors text-center"
                        >
                          Chap {latestChap.chapterNumber}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  Trang <span className="font-bold text-amber-400">{currentPage}</span> / <span className="font-bold text-white">{totalPages}</span>
                  <span className="hidden sm:inline"> • Hiển thị {(currentPage - 1) * CATEGORY_PAGE_SIZE + 1} - {Math.min(currentPage * CATEGORY_PAGE_SIZE, filteredComics.length)} trên {filteredComics.length} bộ truyện</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(1)}
                    title="Trang đầu"
                    className="p-2 rounded-xl border border-slate-800 bg-[#141822] text-slate-300 hover:text-white hover:border-amber-500/40 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

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
    </div>
  );
};
