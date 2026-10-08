import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  LogIn,
  LogOut,
  ShieldAlert,
  Users,
  Compass,
  Flame,
  Trophy,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  History,
  Bookmark,
  UserCog,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { User, Comic, SiteSettings, AppNotification } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic } from '../utils/adultFilter';

interface HeaderProps {
  currentUser: User | null;
  siteSettings?: SiteSettings;
  notifications?: AppNotification[];
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (notificationId: string) => void;
  onClearAllNotifications?: () => void;
  onSelectNotification?: (notification: AppNotification) => void;
  onQuickReply?: (notification: AppNotification, replyText: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onSelectGenre?: (genre: string) => void;
  onNavigateHot?: () => void;
  onNavigateRanking?: (tab?: 'day' | 'week' | 'month') => void;
  onNavigateTeams?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFollowing?: () => void;
  onOpenProfile?: () => void;
  onSearchSubmit?: (query: string) => void;
  onOpenAdmin: () => void;
  onOpenTeamPortal: () => void;
  onSelectComic: (comic: Comic) => void;
  allComics: Comic[];
  currentView: string;
  libraryTab?: 'history' | 'following';
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  siteSettings,
  notifications = [],
  onMarkAsRead = () => {},
  onMarkAllAsRead = () => {},
  onDeleteNotification = () => {},
  onClearAllNotifications = () => {},
  onSelectNotification = () => {},
  onQuickReply = () => {},
  onOpenLogin,
  onLogout,
  onNavigateHome,
  onSelectGenre,
  onNavigateHot,
  onNavigateRanking,
  onNavigateTeams,
  onNavigateHistory,
  onNavigateFollowing,
  onOpenProfile,
  onSearchSubmit,
  onOpenAdmin,
  onOpenTeamPortal,
  onSelectComic,
  allComics,
  currentView,
  libraryTab,
}) => {
  const isHistoryActive = currentView === 'library' && libraryTab === 'history';
  const isFollowingActive = currentView === 'library' && libraryTab === 'following';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGenresOpen, setIsGenresOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const genresDropdownRef = useRef<HTMLDivElement>(null);
  const rankingDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and auto-focus search input when search modal is active
  useEffect(() => {
    if (isSearchModalOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchModalOpen]);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, / to open search modal, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (genresDropdownRef.current && !genresDropdownRef.current.contains(e.target as Node)) {
        setIsGenresOpen(false);
      }
      if (rankingDropdownRef.current && !rankingDropdownRef.current.contains(e.target as Node)) {
        setIsRankingOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredComics = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Comic[] = [];
    for (const c of allComics) {
      if (
        c.title.toLowerCase().includes(q) ||
        (c.otherNames && c.otherNames.some((n) => n.toLowerCase().includes(q))) ||
        (c.genres && c.genres.some((g) => g.toLowerCase().includes(q))) ||
        (c.authors && c.authors.some((a) => a.toLowerCase().includes(q)))
      ) {
        results.push(c);
        if (results.length >= 25) break;
      }
    }
    return results;
  }, [searchQuery, allComics]);

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
    'Võ Thuật',
    'Hài Hước',
    'Đô Thị',
    'Học Đường',
    'Phiêu Lưu',
    'Xuyên Không',
  ];

  const handleGenreClick = (genre: string) => {
    setIsGenresOpen(false);
    setIsMobileMenuOpen(false);
    if (onSelectGenre) {
      onSelectGenre(genre);
    } else {
      onNavigateHome();
    }
  };

  const handleHotClick = () => {
    setIsMobileMenuOpen(false);
    if (onNavigateHot) {
      onNavigateHot();
    } else {
      onNavigateHome();
    }
  };

  const handleRankingClick = (tab: 'day' | 'week' | 'month' = 'month') => {
    setIsRankingOpen(false);
    setIsMobileMenuOpen(false);
    if (onNavigateRanking) {
      onNavigateRanking(tab);
    } else {
      onNavigateHome();
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-[#121620]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2 lg:gap-4 xl:gap-5 shrink-0">
            <button
              id="logo-button"
              onClick={() => {
                onNavigateHome();
              }}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              {siteSettings?.logoUrl && (
                <div
                  className="flex items-center transition-all"
                  style={{
                    height: `${Math.max(20, Math.min(120, siteSettings.logoHeight || 40))}px`,
                    maxHeight: `${Math.max(20, Math.min(120, siteSettings.logoHeight || 40))}px`,
                  }}
                >
                  <img
                    src={siteSettings.logoUrl}
                    alt={siteSettings.siteName || 'Leesin Comic'}
                    style={{
                      height: `${Math.max(20, Math.min(120, siteSettings.logoHeight || 40))}px`,
                      maxHeight: `${Math.max(20, Math.min(120, siteSettings.logoHeight || 40))}px`,
                      maxWidth: `${Math.max(60, Math.min(500, siteSettings.logoWidth || 240))}px`,
                      transform: siteSettings.logoScale && siteSettings.logoScale !== 1 ? `scale(${siteSettings.logoScale})` : undefined,
                      transformOrigin: 'left center',
                    }}
                    className="w-auto object-contain drop-shadow transition-all"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </button>

            {/* Main Navigation for Desktop */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 text-xs xl:text-sm font-medium shrink-0">
              <button
                id="nav-home"
                onClick={() => {
                  onNavigateHome();
                }}
                className={`px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                  currentView === 'home'
                    ? 'text-amber-400 bg-amber-500/10 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Trang Chủ
              </button>

              {/* Genres Dropdown */}
              <div ref={genresDropdownRef} className="relative">
                <button
                  id="nav-genres"
                  onClick={() => setIsGenresOpen(!isGenresOpen)}
                  className={`flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                    isGenresOpen
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Thể Loại</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isGenresOpen ? 'rotate-180' : ''}`} />
                </button>

                {isGenresOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-[#181d28] border border-slate-700/90 rounded-2xl shadow-2xl p-3 grid grid-cols-2 gap-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="col-span-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-800 mb-1">
                      Khám Phá Theo Thể Loại
                    </div>
                    {genres.map((g) => (
                      <button
                        key={g}
                        onClick={() => handleGenreClick(g)}
                        className="text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition-colors font-medium flex items-center justify-between"
                      >
                        <span>{g}</span>
                        {g === 'Tất cả' && <span className="text-[10px] text-amber-500 font-bold">ALL</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hot Comics Navigation */}
              <button
                id="nav-hot"
                onClick={handleHotClick}
                className="flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Truyện Hot</span>
              </button>

              {/* Ranking Navigation with Dropdown */}
              <div ref={rankingDropdownRef} className="relative">
                <button
                  id="nav-ranking"
                  onClick={() => setIsRankingOpen(!isRankingOpen)}
                  className={`flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                    isRankingOpen
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Xếp Hạng</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRankingOpen ? 'rotate-180' : ''}`} />
                </button>

                {isRankingOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-[#181d28] border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => handleRankingClick('month')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bảng Xếp Hạng Tháng</span>
                    </button>
                    <button
                      onClick={() => handleRankingClick('week')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>Bảng Xếp Hạng Tuần</span>
                    </button>
                    <button
                      onClick={() => handleRankingClick('day')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Bảng Xếp Hạng Ngày</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nhóm Dịch Navigation */}
              <button
                id="nav-teams"
                onClick={() => {
                  if (onNavigateTeams) onNavigateTeams();
                }}
                className={`flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                  currentView === 'teams'
                    ? 'text-amber-400 bg-amber-500/10 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Nhóm Dịch</span>
              </button>

              {/* Lịch Sử Đọc & Theo Dõi */}
              <button
                id="nav-history"
                title="Lịch sử đọc truyện"
                onClick={() => {
                  if (onNavigateHistory) onNavigateHistory();
                }}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                  isHistoryActive
                    ? 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <History className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="hidden xl:inline">Lịch Sử</span>
              </button>

              <button
                id="nav-following"
                title="Truyện đang theo dõi"
                onClick={() => {
                  if (onNavigateFollowing) onNavigateFollowing();
                }}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors ${
                  isFollowingActive
                    ? 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bookmark className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="hidden xl:inline">Theo Dõi</span>
              </button>
            </nav>
          </div>

          {/* User Account Controls & Search Trigger & Mobile Menu Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Ultra-compact Search Button - Zero Layout Shift */}
            <button
              id="header-search-btn"
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="relative p-2 rounded-full transition-all flex items-center justify-center cursor-pointer bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/80 hover:border-amber-500/40"
              title="Tìm kiếm truyện (Ctrl+K)"
              aria-label="Tìm kiếm truyện"
            >
              <Search className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
              <span className="text-xs text-slate-400 group-hover:text-slate-200 hidden 2xl:inline">
                Tìm kiếm...
              </span>
              <kbd className="hidden 2xl:inline-flex items-center text-[9px] bg-slate-900/90 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/80 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown
              currentUser={currentUser}
              notifications={notifications}
              comics={allComics}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onDeleteNotification={onDeleteNotification}
              onClearAllNotifications={onClearAllNotifications}
              onSelectNotification={onSelectNotification}
              onQuickReply={onQuickReply}
              onOpenLogin={onOpenLogin}
            />

            {currentUser ? (
              <div ref={userMenuRef} className="relative">
                <button
                  id="user-profile-button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 2xl:pr-3 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-amber-500/50"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left hidden 2xl:block">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                      {currentUser.name}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium inline-block leading-none mt-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {currentUser.role === 'ADMIN'
                        ? 'Admin Tối Cao'
                        : currentUser.role === 'TEAM_LEADER'
                        ? `Nhóm Dịch (${currentUser.teamName || 'Nhóm Dịch'})`
                        : 'Độc Giả (Chỉ đọc)'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    id="user-menu-dropdown"
                    className="absolute right-0 top-full mt-2 w-64 bg-[#181d28] border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                  >
                    <div className="p-3 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Đang đăng nhập với:</p>
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-amber-400 truncate">{currentUser.email}</p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onNavigateHistory) onNavigateHistory();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      >
                        <History className="w-4 h-4 text-sky-400" />
                        <span>Lịch Sử Đọc Truyện</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onNavigateFollowing) onNavigateFollowing();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-rose-400" />
                        <span>Truyện Đã Theo Dõi</span>
                      </button>

                      <button
                        id="btn-open-user-profile"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      >
                        <UserCog className="w-4 h-4 text-amber-400" />
                        <span>Cài Đặt Tài Khoản / Đổi Pass</span>
                      </button>

                      {currentUser.role === 'ADMIN' && (
                        <button
                          id="btn-open-admin-portal"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>Quản Trị Admin Hệ Thống</span>
                        </button>
                      )}

                      {(currentUser.role === 'TEAM_LEADER' || currentUser.role === 'ADMIN') && (
                        <button
                          id="btn-open-team-portal"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenTeamPortal();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <Users className="w-4 h-4 text-emerald-400" />
                          <span>Portal Nhóm Dịch & Sửa Truyện</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        id="btn-logout"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng Xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="btn-header-login"
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
              </button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-800 space-y-2 animate-in fade-in">
            {/* Quick Search Bar inside Mobile Menu Drawer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setIsMobileMenuOpen(false);
                  if (onSearchSubmit) onSearchSubmit(searchQuery.trim());
                }
              }}
              className="relative mb-3"
            >
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên truyện, tác giả..."
                className="w-full bg-[#161b26] border border-slate-700/90 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px]"
                >
                  Tìm
                </button>
              </div>
            </form>

            <button
              onClick={() => {
                onNavigateHome();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Trang Chủ</span>
            </button>

            <button
              onClick={() => {
                if (onNavigateTeams) onNavigateTeams();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-rose-400" />
              <span>Cộng Đồng Nhóm Dịch</span>
            </button>

            <button
              onClick={() => {
                if (onNavigateHistory) onNavigateHistory();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                isHistoryActive ? 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-sky-400" />
              <span>Lịch Sử Đọc Truyện</span>
            </button>

            <button
              onClick={() => {
                if (onNavigateFollowing) onNavigateFollowing();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                isFollowingActive ? 'text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4 text-rose-400" />
              <span>Truyện Đã Theo Dõi</span>
            </button>

            {currentUser && (
              <button
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <UserCog className="w-4 h-4 text-amber-400" />
                <span>Cài Đặt Tài Khoản / Đổi Mật Khẩu</span>
              </button>
            )}

            <button
              onClick={handleHotClick}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Truyện Hot</span>
            </button>

            <button
              onClick={() => handleRankingClick('month')}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Bảng Xếp Hạng</span>
            </button>

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[11px] font-bold text-slate-400 px-3 mb-1">THỂ LOẠI TRUYỆN:</p>
              <div className="grid grid-cols-3 gap-1 px-1">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGenreClick(g)}
                    className="text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 truncate"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dedicated Search Modal Overlay (matching user's design) */}
      {isSearchModalOpen && (
        <div
          id="search-overlay-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-12 sm:pt-20 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchModalOpen(false);
            }
          }}
        >
          <div
            className="bg-white text-slate-800 rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top input bar */}
            <div className="p-3 sm:p-3.5 flex items-center gap-2.5 border-b border-slate-100">
              <div className="flex-1 flex items-center gap-2 bg-[#f4f5f7] rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 border border-transparent">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setIsSearchModalOpen(false);
                      if (onSearchSubmit) {
                        onSearchSubmit(searchQuery.trim());
                      }
                    }
                  }}
                  placeholder="Nhập tên truyện cần tìm..."
                  className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Xóa từ khóa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="text-[#1877f2] hover:text-blue-700 font-semibold text-sm px-2 py-1 transition-colors cursor-pointer shrink-0"
              >
                Đóng
              </button>
            </div>

            {/* Modal Body */}
            {!searchQuery.trim() ? (
              <div className="py-10 sm:py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5 text-slate-300">
                  <Search className="w-12 h-12 stroke-[1.2]" />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Hãy nhập tên truyện để bắt đầu tìm kiếm
                </p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-3 py-1.5 mb-1">
                  <span>Kết quả cho "{searchQuery}"</span>
                  <span className="text-blue-600 font-bold">{filteredComics.length} truyện</span>
                </div>

                {filteredComics.length === 0 ? (
                  <div className="py-12 px-4 text-center text-sm text-slate-400">
                    Không tìm thấy truyện nào phù hợp với từ khóa "{searchQuery}".
                  </div>
                ) : (
                  <>
                    {filteredComics.slice(0, 8).map((comic) => (
                      <button
                        key={comic.id}
                        type="button"
                        onClick={() => {
                          onSelectComic(comic);
                          setIsSearchModalOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors group cursor-pointer"
                      >
                        <div className="w-11 h-14 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-100">
                          <CensoredCoverImage
                            src={comic.coverImage}
                            alt={comic.title}
                            comicId={comic.id}
                            genres={comic.genres}
                            is18Plus={comic.is18Plus}
                            size="xs"
                            showBadge={false}
                            className="w-full h-full"
                            imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                              {comic.title}
                            </p>
                            {is18PlusComic(comic) && (
                              <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded shrink-0">
                                18+
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            Mới nhất: Chap {comic.chapters[comic.chapters.length - 1]?.chapterNumber || 1} • {comic.teamName || 'Leesin Comic'}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {comic.genres.slice(0, 3).map((g) => (
                              <span key={g} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        if (onSearchSubmit) {
                          onSearchSubmit(searchQuery.trim());
                        }
                      }}
                      className="w-full mt-2 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold text-center transition-colors cursor-pointer"
                    >
                      Xem tất cả {filteredComics.length} kết quả (Nhấn Enter) →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
