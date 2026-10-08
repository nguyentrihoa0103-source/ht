import React, { useState, useEffect } from 'react';
import {
  History,
  Bookmark,
  Trash2,
  BookOpen,
  Clock,
  Flame,
  Sparkles,
  ChevronRight,
  Eye,
  Star,
  UserCog,
  ShieldCheck,
  Users,
  Heart,
  Coffee,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  X
} from 'lucide-react';
import { ReadingHistoryItem, FollowedComicItem, FollowedTeamItem, Comic, User, ScanTeam } from '../types';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic } from '../utils/adultFilter';

interface UserLibraryViewProps {
  currentUser: User | null;
  initialTab?: 'history' | 'following';
  onTabChange?: (tab: 'history' | 'following') => void;
  historyItems: ReadingHistoryItem[];
  followedItems: FollowedComicItem[];
  followedTeams?: FollowedTeamItem[];
  allTeams?: ScanTeam[];
  allComics?: Comic[];
  onSelectComic: (comicId: string) => void;
  onReadChapter: (comicId: string, chapterId: string, chapterNumber?: number) => void;
  onDeleteHistory: (historyId: string) => void;
  onClearHistory: () => void;
  onUnfollowComic: (comicId: string) => void;
  onUnfollowTeam?: (teamId: string) => void;
  onSelectTeam?: (team: ScanTeam) => void;
  onNavigateTeams?: () => void;
  onRequireLogin: () => void;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
}

export const UserLibraryView: React.FC<UserLibraryViewProps> = ({
  currentUser,
  initialTab = 'history',
  onTabChange,
  historyItems = [],
  followedItems = [],
  followedTeams = [],
  allTeams = [],
  allComics = [],
  onSelectComic,
  onReadChapter,
  onDeleteHistory,
  onClearHistory,
  onUnfollowComic,
  onUnfollowTeam,
  onSelectTeam,
  onNavigateTeams,
  onRequireLogin,
  onNavigateHome,
  onOpenProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'following'>(initialTab);
  const [followSubFilter, setFollowSubFilter] = useState<'all' | 'comics' | 'teams'>('all');
  
  // Custom Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    type: 'unfollow_team' | 'unfollow_comic' | 'delete_history' | 'clear_all_history';
    id?: string;
    name?: string;
    extraInfo?: string;
    title: string;
    description: string;
    confirmLabel: string;
    dangerLevel?: 'danger' | 'warning';
  } | null>(null);

  // Synchronize internal state whenever the initialTab prop changes from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: 'history' | 'following') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Filter items strictly for the logged-in user if available (or include shared demo/admin items)
  const rawUserHistory = currentUser
    ? historyItems.filter((h) => !h.userId || h.userId === currentUser.id || h.userId === 'guest' || h.userId === 'user-reader-vip' || h.userId === 'user-admin')
    : historyItems;

  // Deduplicate by comicId/slug so each comic shows only its most recently read chapter
  const seenComicIds = new Set<string>();
  const userHistory = rawUserHistory.filter((item) => {
    const key = item.comicId || item.comicSlug || item.id;
    if (seenComicIds.has(key)) return false;
    seenComicIds.add(key);
    return true;
  });

  const userFollowed = currentUser
    ? followedItems.filter((f) => !f.userId || f.userId === currentUser.id || f.userId === 'user-reader-vip' || f.userId === 'user-admin')
    : followedItems;

  const userFollowedTeams = currentUser
    ? followedTeams.filter((t) => !t.userId || t.userId === currentUser.id || t.userId === 'user-reader-vip' || t.userId === 'user-admin')
    : followedTeams;

  const totalFollowedCount = userFollowed.length + userFollowedTeams.length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'Vừa xong') return 'Vừa xong';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24 && now.getDate() === d.getDate()) return `${diffHours} giờ trước`;

      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to find ScanTeam object
  const getFullTeam = (teamId: string, teamName?: string): ScanTeam | undefined => {
    return (
      allTeams.find((t) => t.id === teamId) ||
      allTeams.find((t) => t.name.toLowerCase() === (teamName || '').toLowerCase())
    );
  };

  const handleExecuteConfirm = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'unfollow_team' && confirmModal.id) {
      if (onUnfollowTeam) onUnfollowTeam(confirmModal.id);
    } else if (confirmModal.type === 'unfollow_comic' && confirmModal.id) {
      onUnfollowComic(confirmModal.id);
    } else if (confirmModal.type === 'delete_history' && confirmModal.id) {
      onDeleteHistory(confirmModal.id);
    } else if (confirmModal.type === 'clear_all_history') {
      onClearHistory();
    }
    setConfirmModal(null);
  };

  // Calculate stats for team
  const getTeamStats = (teamId: string, teamName?: string) => {
    const matchedComics = (allComics || []).filter(
      (c) => c && (c.teamId === teamId || (teamName && c.teamName?.toLowerCase() === teamName.toLowerCase()))
    );
    const totalChapters = matchedComics.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
    const totalViews = matchedComics.reduce((sum, c) => {
      const chapsSum = (c.chapters || []).reduce((chS, ch) => chS + (ch.views || 0), 0);
      return sum + Math.max(c.views || 0, chapsSum);
    }, 0);
    return {
      comicsCount: matchedComics.length,
      chaptersCount: totalChapters,
      totalViews,
      latestComics: matchedComics.slice(0, 3),
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tủ Sách Cá Nhân & Độc Giả</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activeTab === 'history' ? 'Lịch Sử Đọc Truyện' : 'Mục Đang Theo Dõi'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {activeTab === 'history'
                ? 'Lưu lại các chương truyện bạn đã đọc để dễ dàng tiếp tục trải nghiệm bất cứ lúc nào.'
                : 'Theo dõi truyện tranh yêu thích và các nhóm dịch ruột để cập nhật chương mới nhất.'}
            </p>
          </div>

          {/* Tab switchers */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleTabSwitch('history')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch Sử ({userHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('following')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'following'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Theo Dõi ({totalFollowedCount})</span>
            </button>
          </div>
        </div>

        {/* Logged in user info bar with Edit Account button */}
        {currentUser && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-500/60 shadow-md"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{currentUser.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {currentUser.role === 'ADMIN'
                      ? 'Admin Tối Cao'
                      : currentUser.role === 'TEAM_LEADER'
                      ? `Nhóm: ${currentUser.teamName || 'Nhóm Dịch'}`
                      : 'Độc Giả'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
            </div>

            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UserCog className="w-4 h-4 text-amber-400" />
                <span>Đổi Avatar, Tên & Mật Khẩu</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: LỊCH SỬ ĐỌC TRUYỆN */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              Tổng cộng {userHistory.length} bộ truyện đã đọc gần đây
            </span>
            {userHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    type: 'clear_all_history',
                    title: 'Xóa Toàn Bộ Lịch Sử Đọc?',
                    description: 'Toàn bộ danh sách các chương truyện bạn đã đọc gần đây sẽ bị xóa hoàn toàn khỏi tủ sách của bạn.',
                    confirmLabel: 'Xác Nhận Xóa Hết',
                    dangerLevel: 'danger',
                  });
                }}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Tất Cả Lịch Sử</span>
              </button>
            )}
          </div>

          {userHistory.length === 0 ? (
            <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <History className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-40" />
              <h3 className="text-base font-bold text-slate-300">Chưa có lịch sử đọc truyện</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Khi bạn bắt đầu đọc một chương truyện, lịch sử đọc sẽ tự động được lưu lại tại đây.
              </p>
              <button
                type="button"
                onClick={onNavigateHome}
                className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-amber-500/20"
              >
                Khám Phá Truyện Ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userHistory.map((item) => {
                const matchedComic = allComics.find(
                  (c) => c.id === item.comicId || (item.comicSlug && c.slug === item.comicSlug)
                );
                const displayTitle = item.comicTitle || matchedComic?.title || 'Truyện tranh';
                const displayCover = item.coverImage || item.comicCover || matchedComic?.coverImage || '';
                const displayGenres = matchedComic?.genres;
                const displayChapter = item.chapterNumber ? `Chap ${item.chapterNumber}` : (item.chapterTitle || 'Chương mới');
                const displayTime = formatDate(item.readAt || item.lastReadAt);
 
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex gap-3.5 items-center justify-between group transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectComic(item.comicId)}
                      className="relative flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border border-slate-800 group-hover:border-amber-500/50 transition-colors"
                    >
                      <CensoredCoverImage
                        src={displayCover}
                        alt={displayTitle}
                        comicId={item.comicId}
                        genres={displayGenres}
                        is18Plus={matchedComic?.is18Plus}
                        size="xs"
                        showBadge={false}
                        className="w-full h-full"
                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectComic(item.comicId)}
                        className="text-left font-bold text-sm text-white hover:text-amber-400 truncate block w-full transition-colors"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </button>
                      
                      <p className="text-xs text-amber-400 font-medium mt-0.5">
                        Đã đọc: <span className="font-bold">{displayChapter}</span>
                      </p>

                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{displayTime}</span>
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => onReadChapter(item.comicId, item.chapterId, item.chapterNumber)}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-[11px] hover:brightness-110 flex items-center gap-1 transition-all shadow-sm"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Đọc Tiếp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              type: 'delete_history',
                              id: item.id,
                              name: displayTitle,
                              extraInfo: item.chapterTitle ? `Chương: ${item.chapterTitle}` : undefined,
                              title: 'Xóa Khỏi Lịch Sử Đọc?',
                              description: `Bạn có chắc muốn xóa bản ghi lịch sử đọc của truyện "${displayTitle}" không?`,
                              confirmLabel: 'Xác Nhận Xóa',
                              dangerLevel: 'danger',
                            });
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Xóa khỏi lịch sử"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MỤC THEO DÕI (TRUYỆN + NHÓM DỊCH) */}
      {activeTab === 'following' && (
        <div className="space-y-6">
          {/* Sub-filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFollowSubFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  followSubFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Tất Cả ({totalFollowedCount})
              </button>

              <button
                type="button"
                onClick={() => setFollowSubFilter('comics')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  followSubFilter === 'comics'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Truyện Tranh ({userFollowed.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFollowSubFilter('teams')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  followSubFilter === 'teams'
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Nhóm Dịch ({userFollowedTeams.length})</span>
              </button>
            </div>

            {onNavigateTeams && (
              <button
                type="button"
                onClick={onNavigateTeams}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors ml-auto sm:ml-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Khám phá thêm nhóm dịch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* SECTION 1: NHÓM DỊCH ĐANG THEO DÕI */}
          {(followSubFilter === 'all' || followSubFilter === 'teams') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Nhóm Dịch Đang Theo Dõi</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {userFollowedTeams.length} nhóm
                    </span>
                  </h2>
                </div>

                {onNavigateTeams && (
                  <button
                    type="button"
                    onClick={onNavigateTeams}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Xem danh bạ nhóm</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {userFollowedTeams.length === 0 ? (
                followSubFilter === 'teams' ? (
                  <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-3">
                    <Users className="w-16 h-16 mx-auto text-slate-600 opacity-40" />
                    <h3 className="text-base font-bold text-slate-300">Bạn chưa theo dõi nhóm dịch nào</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Theo dõi các nhóm dịch bạn yêu thích để dễ dàng theo dõi các bộ truyện do nhóm phát hành và ủng hộ donate cho nhóm.
                    </p>
                    {onNavigateTeams && (
                      <button
                        type="button"
                        onClick={onNavigateTeams}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-amber-500/20"
                      >
                        Khám Phá Nhóm Dịch Ngay
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">Bạn chưa theo dõi nhóm dịch nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Theo dõi nhóm dịch để cập nhật những tác phẩm độc quyền mới nhất từ nhóm!
                        </p>
                      </div>
                    </div>
                    {onNavigateTeams && (
                      <button
                        type="button"
                        onClick={onNavigateTeams}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Khám Phá Nhóm Dịch</span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userFollowedTeams.map((item) => {
                    const fullTeam = getFullTeam(item.teamId, item.teamName);
                    const stats = getTeamStats(item.teamId, item.teamName);
                    const avatar = item.teamAvatar || fullTeam?.avatar || fullTeam?.avatarUrl || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200';
                    const bio = item.teamBio || fullTeam?.bio || fullTeam?.description || 'Chưa cập nhật mô tả nhóm dịch.';
                    const donateInfo = item.donateInfo || fullTeam?.donateInfo;

                    return (
                      <div
                        key={item.teamId}
                        className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl group transition-all"
                      >
                        {/* Team Info Header */}
                        <div className="flex items-start gap-3.5">
                          <img
                            src={avatar}
                            alt={item.teamName}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md shrink-0 group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200';
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3
                                onClick={() => fullTeam && onSelectTeam && onSelectTeam(fullTeam)}
                                className="font-extrabold text-sm text-white hover:text-amber-400 cursor-pointer transition-colors truncate"
                              >
                                {item.teamName}
                              </h3>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            </div>

                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Trưởng nhóm: <strong className="text-slate-300">{item.leaderName || fullTeam?.leaderName || 'Admin Nhóm'}</strong>
                            </p>

                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                              {bio}
                            </p>
                          </div>
                        </div>

                        {/* Quick Team Stats */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center text-xs">
                          <div>
                            <span className="text-xs font-bold text-amber-400 block">{stats.comicsCount || item.comicsCount || 0}</span>
                            <span className="text-[10px] text-slate-500">Truyện</span>
                          </div>
                          <div className="border-x border-slate-800/80">
                            <span className="text-xs font-bold text-sky-400 block">{stats.chaptersCount || 0}</span>
                            <span className="text-[10px] text-slate-500">Chương</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-400 block">
                              {stats.totalViews > 0 ? (stats.totalViews >= 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews) : '245k'}
                            </span>
                            <span className="text-[10px] text-slate-500">Lượt Xem</span>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => fullTeam && onSelectTeam && onSelectTeam(fullTeam)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>Xem Truyện Của Nhóm</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {onUnfollowTeam && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  type: 'unfollow_team',
                                  id: item.teamId,
                                  name: item.teamName,
                                  extraInfo: item.leaderName ? `Trưởng nhóm: ${item.leaderName}` : undefined,
                                  title: 'Bỏ Theo Dõi Nhóm Dịch?',
                                  description: `Bạn có chắc chắn muốn bỏ theo dõi nhóm dịch "${item.teamName}" không? Nhóm sẽ được gỡ khỏi danh sách nhóm dịch yêu thích của bạn.`,
                                  confirmLabel: 'Bỏ Theo Dõi',
                                  dangerLevel: 'warning',
                                });
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                              title="Bỏ theo dõi nhóm dịch này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Bỏ theo dõi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: TRUYỆN TRANH ĐANG THEO DÕI */}
          {(followSubFilter === 'all' || followSubFilter === 'comics') && (
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Truyện Tranh Đang Theo Dõi</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {userFollowed.length} truyện
                    </span>
                  </h2>
                </div>
              </div>

              {userFollowed.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                  <Bookmark className="w-16 h-16 mx-auto mb-4 text-slate-600 opacity-40" />
                  <h3 className="text-base font-bold text-slate-300">Chưa có truyện nào trong danh sách theo dõi</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Bấm vào nút "Theo Dõi" ở bất kỳ trang chi tiết truyện nào để lưu vào tủ sách cá nhân.
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-amber-500/20"
                  >
                    Khám Phá Truyện Hay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {userFollowed.map((item) => (
                    <div
                      key={item.comicId}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-amber-500/50 transition-all shadow-lg"
                    >
                      {/* Thumbnail */}
                      <div 
                        onClick={() => onSelectComic(item.comicId)}
                        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                      >
                        <CensoredCoverImage
                          src={item.coverImage || item.comicCover || ''}
                          alt={item.comicTitle}
                          comicId={item.comicId}
                          genres={allComics.find((c) => c.id === item.comicId)?.genres}
                          is18Plus={allComics.find((c) => c.id === item.comicId)?.is18Plus}
                          size="md"
                          className="w-full h-full"
                          imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                        
                        {/* Unfollow button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              type: 'unfollow_comic',
                              id: item.comicId,
                              name: item.comicTitle,
                              extraInfo: item.latestChapterNumber ? `Chap mới nhất: ${item.latestChapterNumber}` : undefined,
                              title: 'Bỏ Theo Dõi Truyện Tranh?',
                              description: `Bạn có chắc muốn bỏ theo dõi truyện "${item.comicTitle}" không? Truyện sẽ được gỡ khỏi tủ sách theo dõi của bạn.`,
                              confirmLabel: 'Bỏ Theo Dõi',
                              dangerLevel: 'warning',
                            });
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white backdrop-blur-sm transition-all shadow-md border border-slate-700/50 hover:border-rose-500"
                          title="Bỏ theo dõi truyện"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <button
                            type="button"
                            onClick={() => onSelectComic(item.comicId)}
                            className="font-bold text-xs sm:text-sm text-white hover:text-amber-400 line-clamp-2 text-left transition-colors"
                          >
                            {item.comicTitle}
                          </button>

                          {item.teamName && (
                            <p className="text-[10px] text-slate-400 mt-1 truncate">
                              Nhóm: <span className="text-amber-400 font-semibold">{item.teamName}</span>
                            </p>
                          )}

                          {item.latestChapterNumber && (
                            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              <span>Chap {item.latestChapterNumber}</span>
                              <span className="text-[9px] text-slate-400">(Mới nhất)</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectComic(item.comicId)}
                          className="mt-3 w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors text-center"
                        >
                          Xem Chi Tiết
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setConfirmModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon + Title */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                confirmModal.dangerLevel === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {confirmModal.dangerLevel === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white leading-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Vui lòng xác nhận trước khi tiếp tục thao tác
                </p>
              </div>
            </div>

            {/* Item detail box */}
            {confirmModal.name && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 block">Mục được chọn:</span>
                <p className="text-sm font-bold text-amber-300 truncate">
                  {confirmModal.name}
                </p>
                {confirmModal.extraInfo && (
                  <p className="text-xs text-slate-400">
                    {confirmModal.extraInfo}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {confirmModal.description}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirm}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg flex items-center gap-1.5 ${
                  confirmModal.dangerLevel === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-110 shadow-amber-500/25'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
