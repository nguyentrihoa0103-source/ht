import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  Heart,
  Bookmark,
  Star,
  Clock,
  Lock,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  WifiOff,
  Search,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Users
} from 'lucide-react';
import { Comic, Chapter, User, ChapterComment, ScanTeam, SiteSettings } from '../types';
import { LiveCommentsFeed } from './LiveCommentsFeed';
import { TeamDonationCard } from './TeamDonationCard';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic, isComicCoverRevealed, setComicCoverRevealed } from '../utils/adultFilter';
import { formatRelativeTime, parseDateOrRelative } from '../utils/timeAgo';
import { getEffectiveComicViews, getEffectiveChapterViews } from '../utils/viewTracking';

interface ComicDetailViewProps {
  comic: Comic;
  team?: ScanTeam;
  currentUser: User | null;
  siteSettings?: SiteSettings;
  onBack: () => void;
  onReadChapter: (chapter: Chapter) => void;
  onRequireLogin: () => void;
  isFollowed?: boolean;
  onToggleFollow?: (comicId: string) => void;
  isTeamFollowed?: boolean;
  onToggleFollowTeam?: (teamId: string) => void;
  onViewTeam?: (team: ScanTeam) => void;
  comments?: ChapterComment[];
  highlightedCommentId?: string | null;
  onAddComment?: (comment: Omit<ChapterComment, 'id' | 'createdAt' | 'likes'>) => void;
  onLikeComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onSelectGenre?: (genre: string) => void;
  backLabel?: string;
}

export const ComicDetailView: React.FC<ComicDetailViewProps> = ({
  comic,
  team,
  currentUser,
  siteSettings,
  onBack,
  onReadChapter,
  onRequireLogin,
  isFollowed = false,
  onToggleFollow,
  isTeamFollowed = false,
  onToggleFollowTeam,
  onViewTeam,
  comments = [],
  highlightedCommentId,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onSelectGenre,
  backLabel,
}) => {
  const [showSeoBox, setShowSeoBox] = useState(false);
  const is18 = is18PlusComic(comic.genres);
  const [isAdultRevealed, setIsAdultRevealed] = useState<boolean>(() => {
    if (!is18) return true;
    return isComicCoverRevealed(comic.id);
  });

  React.useEffect(() => {
    if (!is18) {
      setIsAdultRevealed(true);
      return;
    }
    setIsAdultRevealed(isComicCoverRevealed(comic.id));

    const handleRevealChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ comicId: string; revealed: boolean }>;
      if (customEvent.detail && customEvent.detail.comicId === comic.id) {
        setIsAdultRevealed(customEvent.detail.revealed);
      }
    };

    window.addEventListener('adult-cover-reveal-changed', handleRevealChange);
    return () => {
      window.removeEventListener('adult-cover-reveal-changed', handleRevealChange);
    };
  }, [comic.id, is18]);

  const handleToggleAdultReveal = () => {
    const next = !isAdultRevealed;
    setIsAdultRevealed(next);
    setComicCoverRevealed(comic.id, next);
  };

  const handleChapterClick = (chapter: Chapter) => {
    // Check if chapter is scheduled in the future
    if (chapter.scheduledDate && new Date(chapter.scheduledDate) > new Date()) {
      // If user is not admin or team leader, inform scheduled
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.teamId !== chapter.teamId)) {
        alert(
          `Chương này đang được hẹn giờ phát hành vào: ${new Date(
            chapter.scheduledDate
          ).toLocaleString('vi-VN')}. Vui lòng quay lại sau!`
        );
        return;
      }
    }

    onReadChapter(chapter);
  };

  const handleToggleFollow = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (onToggleFollow) {
      onToggleFollow(comic.id);
    }
  };

  const sortedChapters = React.useMemo(() => {
    if (!comic.chapters || !comic.chapters.length) return [];
    return [...comic.chapters].sort((a, b) => {
      const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : parseFloat(String(a.chapterNumber)) || 0;
      const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : parseFloat(String(b.chapterNumber)) || 0;
      if (numB !== numA) return numB - numA;
      return parseDateOrRelative(b.createdAt) - parseDateOrRelative(a.createdAt);
    });
  }, [comic.chapters]);

  const firstChapter = sortedChapters.length > 0 ? sortedChapters[sortedChapters.length - 1] : comic.chapters[0];
  const latestChapter = sortedChapters.length > 0 ? sortedChapters[0] : comic.chapters[comic.chapters.length - 1];

  return (
    <div id="comic-detail-view" className="space-y-6 pb-20">
      
      {/* Top back button */}
      <button
        id="btn-back-to-home"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel || 'Quay lại Trang Chủ'}</span>
      </button>

      {/* Main Comic Overview Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#141822] border border-slate-800 shadow-2xl">
        {/* Blurred Header Backdrop */}
        <div className="h-56 sm:h-72 w-full relative overflow-hidden">
          <img
            src={comic.bannerImage || comic.coverImage}
            alt={comic.title}
            className={`w-full h-full object-cover transition-all duration-700 ${
              is18 && !isAdultRevealed
                ? 'blur-2xl scale-125 opacity-20 brightness-50'
                : 'blur-sm scale-105 opacity-35'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141822] via-[#141822]/70 to-transparent" />
        </div>

        {/* Content Box Overlapping Banner */}
        <div className="relative px-4 sm:px-8 pb-8 -mt-36 sm:-mt-48 flex flex-col md:flex-row gap-6 lg:gap-8">
          
          {/* Left Poster Image */}
          <div className="w-44 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/30 relative group bg-slate-950">
              <CensoredCoverImage
                src={comic.coverImage}
                alt={comic.title}
                comicId={comic.id}
                genres={comic.genres}
                size="detail"
                showBadge={false}
                className="w-full h-full"
                imageClassName="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase shadow z-20">
                {comic.status}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 space-y-2">
              <button
                id="btn-read-first-chap"
                onClick={() => firstChapter && handleChapterClick(firstChapter)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Đọc Từ Đầu (Chap 1)</span>
              </button>

              <button
                id="btn-follow-comic"
                onClick={handleToggleFollow}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isFollowed
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-lg shadow-rose-500/20'
                    : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFollowed ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{isFollowed ? 'Đang Theo Dõi (Đã Lưu)' : 'Theo Dõi Truyện'}</span>
              </button>
            </div>
          </div>

          {/* Right Meta Info */}
          <div className="flex-1 space-y-4 text-left">
            {/* 18+ Interactive Confirmation Box */}
            {is18 && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isAdultRevealed
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : 'bg-gradient-to-r from-red-950/80 via-rose-950/70 to-slate-900 border-red-500/60 shadow-xl shadow-red-950/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-rose-400 shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white tracking-wide">
                          CẢNH BÁO NỘI DUNG 18+
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 font-black text-white shadow">
                          NGƯỜI LỚN
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {isAdultRevealed
                          ? 'Đã mở khóa hiển thị ảnh bìa 18+. Bạn có thể che lại bất cứ lúc nào.'
                          : 'Bộ truyện có yếu tố nhạy cảm 18+. Ảnh bìa đã được che mờ tự động. Bấm nút bên cạnh nếu bạn muốn xem.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAdultReveal}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-lg ${
                      isAdultRevealed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30 border border-rose-400/40 active:scale-95'
                    }`}
                  >
                    {isAdultRevealed ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Che lại ảnh bìa</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Xác nhận muốn xem ảnh 18+</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (team && onViewTeam) {
                      onViewTeam(team);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  title={`Xem danh sách truyện của nhóm ${comic.teamName}`}
                >
                  <Users className="w-3 h-3" />
                  <span>Nhóm dịch: {comic.teamName}</span>
                </button>
                {is18 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                    <span>🔞</span>
                    <span>Nội dung 18+</span>
                  </span>
                )}
                {comic.isHot && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    🔥 Truyện HOT
                  </span>
                )}
                {comic.isTrending && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ⭐ Thịnh Hành
                  </span>
                )}
                {/* Toggle SEO Inspection Box */}
                <button
                  id="btn-toggle-seo-preview"
                  onClick={() => setShowSeoBox(!showSeoBox)}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Rank Math SEO Score: {comic.seo.score}/100</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {comic.title}
              </h1>

              {comic.otherNames && comic.otherNames.length > 0 && (
                <p className="text-xs text-slate-400 mt-1 italic">
                  Tên khác: {comic.otherNames.join(' • ')}
                </p>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Lượt xem</p>
                <p className="text-xs font-bold text-amber-400 mt-0.5">
                  {getEffectiveComicViews(comic, siteSettings?.viewTrackingStartDate).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Theo dõi</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">{comic.follows.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Đánh giá</p>
                <p className="text-xs font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{comic.rating}</span>
                </p>
              </div>
            </div>

            {/* Genres Tags */}
            <div className="flex flex-wrap gap-1.5">
              {comic.genres.map((g) => {
                const isTag18 = is18PlusComic([g]);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onSelectGenre?.(g)}
                    title={`Xem chuyên mục thể loại ${g}`}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95 select-none ${
                      isTag18
                        ? 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/50 shadow-sm font-bold hover:shadow-red-500/20 hover:shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-300 border border-slate-700/60 hover:border-amber-500/40'
                    }`}
                  >
                    {isTag18 && <span>🔞</span>}
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>

            {/* Synopsis */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tóm tắt nội dung:
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                {comic.summary}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Rank Math SEO Inspector Box (Tối ưu WordPress Rank Math SEO / Yoast SEO) */}
      {showSeoBox && (
        <div
          id="rank-math-seo-preview-card"
          className="bg-[#121620] border-2 border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                RM
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Rank Math SEO Optimizer (WordPress Plugin)</h4>
                <p className="text-[11px] text-slate-400">Xem trước hiển thị kết quả tìm kiếm Google & Phân tích On-page</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              Điểm SEO: {comic.seo.score} / 100 (Tốt)
            </div>
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400">leesincomic.com</span>
              <span>› truyen ›</span>
              <span className="text-slate-500">{comic.slug}</span>
            </div>
            <a
              href="#"
              className="text-base sm:text-lg font-medium text-sky-400 hover:underline block leading-snug"
            >
              {comic.seo.metaTitle}
            </a>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {comic.seo.metaDesc}
            </p>
          </div>

          {/* Rank Math Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Từ khóa trọng tâm: "{comic.seo.focusKeyword}"</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Schema: {comic.seo.schemaType} (Rich Snippet)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Thẻ Canonical: Hợp lệ</span>
            </div>
          </div>
        </div>
      )}

      {/* Translation Team & Donate Info */}
      {team && (
        <TeamDonationCard
          team={team}
          isFollowed={isTeamFollowed}
          onToggleFollow={onToggleFollowTeam}
          onViewTeam={onViewTeam}
        />
      )}

      {/* Chapters Section */}
      <div id="chapters-section" className="bg-[#141822] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Danh Sách Chương ({comic.chapters.length})</h3>
          </div>
          
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Công khai
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" /> Khóa pass
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-400" /> Hẹn giờ
            </span>
          </div>
        </div>

        {/* Member login note */}
        {!currentUser && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Quy định: Bắt buộc phải có tài khoản đăng nhập mới có thể đọc được truyện!</span>
            </div>
            <button
              onClick={onRequireLogin}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shrink-0 text-center"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Chapters Table / List */}
        <div className="divide-y divide-slate-800/80">
          {sortedChapters.map((chap) => {
            const isScheduled = chap.scheduledDate && new Date(chap.scheduledDate) > new Date();

            return (
              <div
                key={chap.id}
                className="py-3 px-2 flex items-center justify-between gap-2 sm:gap-3 hover:bg-slate-800/40 rounded-xl transition-colors group"
              >
                <div
                  onClick={() => handleChapterClick(chap)}
                  className="flex flex-wrap items-center gap-1.5 sm:gap-3 flex-1 min-w-0 cursor-pointer pr-1"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-amber-400 transition-colors truncate max-w-full">
                    {chap.title}
                  </span>

                  {/* Badges */}
                  {chap.isPasswordProtected && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Khóa Pass</span>
                    </span>
                  )}

                  {isScheduled && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
                      <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Hẹn giờ</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-slate-400 shrink-0">
                  <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-900/80 sm:bg-transparent px-2 py-1 sm:p-0 rounded-lg border border-slate-800 sm:border-0">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span className="font-medium text-[11px] sm:text-xs">
                      {getEffectiveChapterViews(chap, comic, siteSettings?.viewTrackingStartDate).toLocaleString()}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400 text-[10px] sm:text-xs bg-slate-900/50 sm:bg-transparent px-1.5 py-1 sm:p-0 rounded-lg border border-slate-800/60 sm:border-0 whitespace-nowrap">
                    <Clock className="w-3 h-3 text-slate-500 hidden xs:inline sm:inline" />
                    <span>{formatRelativeTime(chap.updatedAt || chap.createdAt)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comic Chapter Comments Feed */}
      {onAddComment && onLikeComment && (
        <LiveCommentsFeed
          comments={comments}
          currentUser={currentUser}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
          onDeleteComment={onDeleteComment}
          onRequireLogin={onRequireLogin}
          onNavigateToComic={() => {}}
          onNavigateToChapter={(slug, chapNum) => {
            const chap = comic.chapters.find((c) => c.chapterNumber === chapNum);
            if (chap) handleChapterClick(chap);
          }}
          title={`Bình Luận Về Truyện "${comic.title}"`}
          comicFilter={comic.id}
          showComicInfo={false}
          highlightedCommentId={highlightedCommentId}
        />
      )}
    </div>
  );
};
