import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { ComicDetailView } from './components/ComicDetailView';
import { ReaderView } from './components/ReaderView';
import { CategoryView } from './components/CategoryView';
import { UserLibraryView } from './components/UserLibraryView';
import { LoginModal } from './components/LoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { TeamPortal } from './components/TeamPortal';
import { TeamsView } from './components/TeamsView';
import { Footer } from './components/Footer';

import {
  Comic,
  Chapter,
  User,
  ScanTeam,
  ScanTeamMember,
  ImageServerConfig,
  MysqlConfig,
  ChapterComment,
  ReadingHistoryItem,
  FollowedComicItem,
  FollowedTeamItem,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_CHAPTER_AD,
  AppNotification,
} from './types';
import {
  INITIAL_COMICS,
  INITIAL_TEAMS,
  INITIAL_USERS,
  INITIAL_COMMENTS,
  INITIAL_READING_HISTORY,
  INITIAL_FOLLOWED_COMICS,
  INITIAL_FOLLOWED_TEAMS,
  INITIAL_NOTIFICATIONS,
  INITIAL_DATA_VERSION,
} from './data/initialData';
import { DEFAULT_IMAGE_SERVER_CONFIG } from './utils/imageServerUploader';
import { toSlug, GENRE_SLUG_MAP } from './utils/slug';
import { updateSeoMeta } from './utils/seo';
import { getOfficialTeamViews } from './utils/teamStats';
import {
  DEFAULT_MYSQL_CONFIG,
  fetchComicsFromMysql,
  fetchComicFromMysql,
  saveComicToMysql,
  saveChapterToMysql,
  deleteComicFromMysql,
  deleteChapterFromMysql,
  fetchCommentsFromMysql,
  saveCommentToMysql,
  likeCommentToMysql,
  deleteCommentFromMysql,
  fetchNotificationsFromMysql,
  saveNotificationToMysql,
  markNotificationReadInMysql,
  markAllNotificationsReadInMysql,
  deleteNotificationFromMysql,
  clearAllNotificationsInMysql,
  fetchReadingHistoryFromMysql,
  saveReadingHistoryToMysql,
  deleteReadingHistoryFromMysql,
  fetchFollowedComicsFromMysql,
  followComicToMysql,
  unfollowComicToMysql,
  fetchFollowedTeamsFromMysql,
  followTeamToMysql,
  unfollowTeamToMysql,
  fetchUsersFromMysql,
  saveUserToMysql,
  deleteUserFromMysql,
  fetchTeamsFromMysql,
  saveTeamToMysql,
  deleteTeamFromMysql,
  resetPasswordInMysql,
  saveSiteSettingsToMysql,
  fetchSiteSettingsFromMysql,
  clearAllComicsFromMysql,
  incrementComicViewInMysql,
} from './utils/mysqlSync';
import { getGmt7DateString, getGmt7MonthString } from './utils/viewTracking';

// Helper to safely cache comic metadata without heavy chapter images arrays (prevents browser freezing and quota errors)
// Note: updatedAt / createdAt are NEVER read from localStorage — SQL/API is the single source of truth for timestamps
function saveComicsToCache(_comicList: Comic[]) {
  try {
    localStorage.removeItem('leesincomic_comics_cache');
  } catch (e) {
    // Storage quota fallback
  }
}

declare const __APP_BUILD_ID__: string | undefined;

// Tự động kiểm tra và làm mới cache khi có build mới (cache-busting tự động)
(() => {
  try {
    const currentBuildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : INITIAL_DATA_VERSION;
    const savedBuildId = localStorage.getItem('leesincomic_app_build_id');
    if (savedBuildId !== currentBuildId) {
      console.log(`[CacheBuster] Phát hiện phiên bản build mới (${savedBuildId || 'none'} -> ${currentBuildId}). Dọn dẹp cache cũ...`);
      localStorage.removeItem('leesincomic_site_settings');
      localStorage.removeItem('leesincomic_users');
      localStorage.removeItem('leesincomic_comics');
      localStorage.removeItem('leesincomic_comics_cache');
      localStorage.removeItem('leesincomic_teams');
      localStorage.removeItem('leesincomic_comments');
      localStorage.removeItem('leesincomic_followed_teams');
      localStorage.removeItem('leesincomic_data_version');
      localStorage.setItem('leesincomic_app_build_id', currentBuildId);
    }
  } catch (e) {
    // Storage quota hoặc chế độ ẩn danh (private browsing)
  }
})();

export default function App() {
  // MySQL Configuration (Enabled by default to connect to SQL database)
  const [mysqlConfig, setMysqlConfig] = useState<MysqlConfig>(() => {
    const saved = localStorage.getItem('leesincomic_mysql_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_MYSQL_CONFIG, ...parsed, enabled: true };
      } catch (e) {
        console.warn(e);
      }
    }
    return DEFAULT_MYSQL_CONFIG;
  });

  // Application Data States - 100% Hydrated from MySQL Database (never from localStorage)
  const [comics, setComics] = useState<Comic[]>(() => {
    try {
      localStorage.removeItem('leesincomic_comics');
      localStorage.removeItem('leesincomic_comics_cache');
      localStorage.removeItem('leesincomic_data_version');
      localStorage.removeItem('leesincomic_teams');
      localStorage.removeItem('leesincomic_comments');
      localStorage.removeItem('leesincomic_followed_teams');
    } catch (e) {}
    return INITIAL_COMICS;
  });
  const [teams, setTeams] = useState<ScanTeam[]>(() => INITIAL_TEAMS);
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('leesincomic_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_USERS;
  });
  const [comments, setComments] = useState<ChapterComment[]>(() => INITIAL_COMMENTS);

  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [selectedTeamForView, setSelectedTeamForView] = useState<ScanTeam | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<'team-views' | 'manage-comics' | 'manage-users' | 'add-comic' | 'seo-rankmath' | 'watermark-settings' | 'cdn-server' | 'mysql-database' | 'site-settings' | 'footer-settings' | 'manage-comments' | 'ads-settings' | 'migrate-leesin' | 'notifications'>('manage-comics');
  const [adminResetTargetUser, setAdminResetTargetUser] = useState<User | null>(null);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('leesincomic_site_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_SITE_SETTINGS,
            ...parsed,
          };
        }
      }
    } catch (e) {}
    return {
      ...DEFAULT_SITE_SETTINGS,
      logoUrl: '',
      faviconUrl: '/favicon.svg',
      watermarkText: '',
      watermarkMode: 'logo' as const,
      watermark: {
        ...DEFAULT_SITE_SETTINGS.watermark,
        text: '',
        mode: 'logo' as const,
      },
    };
  });

  // Reader Reading History State (User-specific) - Lấy từ LocalStorage & đồng bộ SQL database
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('leesincomic_reading_history');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Reader Followed Comics State (User-specific) - Lấy từ LocalStorage & đồng bộ SQL database
  const [followedComics, setFollowedComics] = useState<FollowedComicItem[]>(() => {
    try {
      const saved = localStorage.getItem('leesincomic_followed_comics');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Reader Followed Teams State (User-specific) - Lấy từ LocalStorage & đồng bộ SQL database
  const [followedTeams, setFollowedTeams] = useState<FollowedTeamItem[]>(() => {
    try {
      const saved = localStorage.getItem('leesincomic_followed_teams');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return INITIAL_FOLLOWED_TEAMS;
  });

  // Image Server Configuration (tachserver.site)
  const [imageServerConfig, setImageServerConfig] = useState<ImageServerConfig>(() => {
    const saved = localStorage.getItem('leesincomic_image_server_config');
    return saved ? JSON.parse(saved) : DEFAULT_IMAGE_SERVER_CONFIG;
  });

  // Current logged in user (session duy trì để không bắt đăng nhập lại sau khi F5)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('leesincomic_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Tự động lưu trữ lịch sử đọc truyện vào LocalStorage để không bị mất khi F5 hoặc duyệt ẩn danh
  useEffect(() => {
    try {
      localStorage.setItem('leesincomic_reading_history', JSON.stringify(readingHistory));
    } catch (e) {}
  }, [readingHistory]);

  // Tự động lưu trữ danh sách theo dõi truyện vào LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('leesincomic_followed_comics', JSON.stringify(followedComics));
    } catch (e) {}
  }, [followedComics]);

  // Tự động lưu trữ danh sách theo dõi nhóm dịch vào LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('leesincomic_followed_teams', JSON.stringify(followedTeams));
    } catch (e) {}
  }, [followedTeams]);

  // =========================================================================
  // NOTIFICATION SYSTEM: SQL / BACKEND LÀ SINGLE SOURCE OF TRUTH (Không dùng localStorage)
  // =========================================================================
  const [notifications, setNotifications] = useState<AppNotification[]>(() => INITIAL_NOTIFICATIONS);

  // Helper broadcast thông báo tức thời cho các tab/cửa sổ khác cùng làm mới thông báo từ SQL
  const notifyOtherTabsNotificationChange = useCallback(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('leesincomic_notifications_channel');
        channel.postMessage({ type: 'SYNC_NOTIFICATIONS', timestamp: Date.now() });
        channel.close();
      }
    } catch (e) {}
    try {
      localStorage.setItem('leesincomic_notif_sync_ping', Date.now().toString());
    } catch (e) {}
  }, []);

  // Hàm lấy thông báo chính xác từ Backend SQL theo tài khoản người dùng hiện tại
  const syncNotificationsFromBackend = useCallback(async (userToSync?: User | null) => {
    const activeUser = userToSync !== undefined ? userToSync : currentUser;
    if (!activeUser) {
      setNotifications([]);
      return;
    }
    try {
      const remoteNotifs = await fetchNotificationsFromMysql(mysqlConfig, {
        userId: activeUser.id,
        teamId: activeUser.teamId,
        teamName: activeUser.teamName,
        role: activeUser.role,
        limit: 100,
      });
      if (remoteNotifs && Array.isArray(remoteNotifs)) {
        setNotifications((prev) => {
          // Tránh trigger re-render không cần thiết nếu dữ liệu không đổi
          const prevSig = prev.map((n) => `${n.id}:${n.isRead ? 1 : 0}`).join('|');
          const nextSig = remoteNotifs.map((n) => `${n.id}:${n.isRead ? 1 : 0}`).join('|');
          if (prevSig !== nextSig) {
            return remoteNotifs;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ thông báo từ Backend SQL:', err);
    }
  }, [currentUser, mysqlConfig]);

  // Đồng bộ thời gian thực giữa nhiều tab trình duyệt khi có sự kiện thay đổi
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('leesincomic_notifications_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_NOTIFICATIONS') {
            syncNotificationsFromBackend();
          }
        };
      }
    } catch (e) {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'leesincomic_notif_sync_ping') {
        syncNotificationsFromBackend();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncNotificationsFromBackend]);

  // Tự động kéo thông báo mới nhất khi quay lại tab (window focus) hoặc khi có mạng lại (online/reconnect)
  useEffect(() => {
    const handleRevalidate = () => {
      if (currentUser) {
        syncNotificationsFromBackend();
      }
    };
    window.addEventListener('focus', handleRevalidate);
    window.addEventListener('online', handleRevalidate);
    return () => {
      window.removeEventListener('focus', handleRevalidate);
      window.removeEventListener('online', handleRevalidate);
    };
  }, [currentUser, syncNotificationsFromBackend]);

  // Polling chu kỳ mỗi 5s để đảm bảo chuông thông báo luôn cập nhật tức thì từ SQL
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    syncNotificationsFromBackend();
    const pollInterval = setInterval(() => {
      syncNotificationsFromBackend();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [currentUser, syncNotificationsFromBackend]);

  // Navigation and Views
  const [currentView, setCurrentView] = useState<
    'home' | 'comic-detail' | 'reader' | 'admin' | 'team-portal' | 'category' | 'library' | 'teams'
  >('home');
  const [previousView, setPreviousView] = useState<string | null>(null);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  // Category page parameters
  const [categoryPageType, setCategoryPageType] = useState<
    'genre' | 'hot' | 'ranking' | 'latest' | 'search'
  >('genre');
  const [categoryPageParam, setCategoryPageParam] = useState<string>('Tất cả');

  // Library page parameters ('history' | 'following')
  const [libraryInitialTab, setLibraryInitialTab] = useState<'history' | 'following'>('history');

  // Home filtering states (controlled from header)
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả');
  const [selectedRankingTab, setSelectedRankingTab] = useState<'day' | 'week' | 'month'>('month');

  // Modals & Popups
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Watermark Global Settings
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.85);

  // Page Navigation / Reload Progress State (F5-like smooth refresh)
  const [isPageNavigating, setIsPageNavigating] = useState<boolean>(false);

  // Update Favicon and Apple Touch Icon tags when siteSettings change
  useEffect(() => {
    const favUrl = siteSettings.faviconUrl || '/favicon.svg';
    const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
    if (favEl) favEl.href = favUrl;
    const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
    if (appleFavEl) appleFavEl.href = favUrl;
  }, [siteSettings.faviconUrl]);

  // Configuration & session persistence (only keep API credentials and login session)
  useEffect(() => {
    localStorage.setItem('leesincomic_image_server_config', JSON.stringify(imageServerConfig));
  }, [imageServerConfig]);

  useEffect(() => {
    localStorage.setItem('leesincomic_mysql_config', JSON.stringify(mysqlConfig));
  }, [mysqlConfig]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('leesincomic_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('leesincomic_current_user');
    }
  }, [currentUser]);

  // Attempt initial sync from MySQL database if enabled
  useEffect(() => {
    if (mysqlConfig.enabled) {
      fetchSiteSettingsFromMysql(mysqlConfig).then((remoteSettings) => {
        if (remoteSettings) {
          const parsedWm = typeof remoteSettings.watermark === 'string'
            ? JSON.parse(remoteSettings.watermark)
            : remoteSettings.watermark;

          setSiteSettings((prev) => {
            const resolvedLogo = remoteSettings.logoUrl !== undefined
              ? remoteSettings.logoUrl
              : (remoteSettings.logo_url !== undefined ? remoteSettings.logo_url : prev.logoUrl);
            const resolvedFavicon = remoteSettings.faviconUrl !== undefined
              ? remoteSettings.faviconUrl
              : (remoteSettings.favicon_url !== undefined ? remoteSettings.favicon_url : prev.faviconUrl);

            let parsedChapterAd = remoteSettings.chapterAd;
            if (typeof parsedChapterAd === 'string') {
              try { parsedChapterAd = JSON.parse(parsedChapterAd); } catch (e) {}
            }

            const nextSettings = {
              ...prev,
              ...remoteSettings,
              chapterAd: parsedChapterAd
                ? { ...(prev.chapterAd || DEFAULT_CHAPTER_AD), ...parsedChapterAd }
                : (prev.chapterAd || DEFAULT_CHAPTER_AD),
              siteName: remoteSettings.siteName || remoteSettings.site_name || prev.siteName,
              siteSlogan: remoteSettings.siteSlogan || remoteSettings.site_slogan || prev.siteSlogan,
              siteDomain: remoteSettings.siteDomain || remoteSettings.site_domain || prev.siteDomain,
              headTitle: remoteSettings.headTitle || remoteSettings.head_title || remoteSettings.metaTitle || remoteSettings.meta_title || prev.headTitle,
              metaTitle: remoteSettings.headTitle || remoteSettings.head_title || remoteSettings.metaTitle || remoteSettings.meta_title || prev.metaTitle,
              siteDescription: remoteSettings.siteDescription || remoteSettings.site_description || remoteSettings.metaDescription || remoteSettings.meta_description || prev.siteDescription,
              metaDescription: remoteSettings.siteDescription || remoteSettings.site_description || remoteSettings.metaDescription || remoteSettings.meta_description || prev.metaDescription,
              siteKeywords: remoteSettings.siteKeywords || remoteSettings.site_keywords || prev.siteKeywords,
              canonicalUrl: remoteSettings.canonicalUrl || remoteSettings.canonical_url || prev.canonicalUrl,
              logoUrl: resolvedLogo,
              logoHeight: remoteSettings.logoHeight !== undefined ? Number(remoteSettings.logoHeight) : (remoteSettings.logo_height !== undefined ? Number(remoteSettings.logo_height) : prev.logoHeight),
              logoWidth: remoteSettings.logoWidth !== undefined ? Number(remoteSettings.logoWidth) : (remoteSettings.logo_width !== undefined ? Number(remoteSettings.logo_width) : prev.logoWidth),
              footerLogoHeight: remoteSettings.footerLogoHeight !== undefined ? Number(remoteSettings.footerLogoHeight) : (remoteSettings.footer_logo_height !== undefined ? Number(remoteSettings.footer_logo_height) : prev.footerLogoHeight),
              logoScale: remoteSettings.logoScale !== undefined ? Number(remoteSettings.logoScale) : (remoteSettings.logo_scale !== undefined ? Number(remoteSettings.logo_scale) : prev.logoScale),
              faviconUrl: resolvedFavicon,
              headerBadgeText: remoteSettings.headerBadgeText || remoteSettings.header_badge_text || prev.headerBadgeText,
              viewDelaySeconds: remoteSettings.viewDelaySeconds !== undefined ? Number(remoteSettings.viewDelaySeconds) : (remoteSettings.view_delay_seconds !== undefined ? Number(remoteSettings.view_delay_seconds) : prev.viewDelaySeconds),
              viewCooldownMinutes: remoteSettings.viewCooldownMinutes !== undefined ? Number(remoteSettings.viewCooldownMinutes) : (remoteSettings.view_cooldown_minutes !== undefined ? Number(remoteSettings.view_cooldown_minutes) : prev.viewCooldownMinutes),
              viewMultiplier: remoteSettings.viewMultiplier !== undefined ? Number(remoteSettings.viewMultiplier) : (remoteSettings.view_multiplier !== undefined ? Number(remoteSettings.view_multiplier) : prev.viewMultiplier),
              requireScrollPercent: remoteSettings.requireScrollPercent !== undefined ? Number(remoteSettings.requireScrollPercent) : (remoteSettings.require_scroll_percent !== undefined ? Number(remoteSettings.require_scroll_percent) : prev.requireScrollPercent),
              showAnnouncementBanner: remoteSettings.showAnnouncementBanner !== undefined ? (remoteSettings.showAnnouncementBanner === 'true' || remoteSettings.showAnnouncementBanner === true) : prev.showAnnouncementBanner,
              announcementTitle: remoteSettings.announcementTitle || remoteSettings.announcement_title || prev.announcementTitle,
              announcementBadge: remoteSettings.announcementBadge || remoteSettings.announcement_badge || prev.announcementBadge,
              announcementText: remoteSettings.announcementText || remoteSettings.announcement_text || prev.announcementText,
              showHomeComments: remoteSettings.showHomeComments !== undefined ? (remoteSettings.showHomeComments === 'true' || remoteSettings.showHomeComments === true) : prev.showHomeComments,
              watermarkText: '',
              watermarkLogoUrl: remoteSettings.watermarkLogoUrl || remoteSettings.watermark_logo_url || parsedWm?.logoUrl || prev.watermarkLogoUrl || resolvedLogo || prev.logoUrl,
              watermarkOpacity: remoteSettings.watermarkOpacity ? Number(remoteSettings.watermarkOpacity) : (parsedWm?.opacity !== undefined ? Number(parsedWm.opacity) : prev.watermarkOpacity),
              watermarkPosition: remoteSettings.watermarkPosition || remoteSettings.watermark_position || parsedWm?.position || prev.watermarkPosition || 'bottom-right',
              watermarkMode: 'logo' as const,
              watermark: {
                ...(parsedWm || {}),
                mode: 'logo' as const,
                logoUrl: remoteSettings.watermarkLogoUrl || remoteSettings.watermark_logo_url || parsedWm?.logoUrl || prev.watermarkLogoUrl || resolvedLogo || prev.logoUrl,
                opacity: remoteSettings.watermarkOpacity ? Number(remoteSettings.watermarkOpacity) : (parsedWm?.opacity !== undefined ? Number(parsedWm.opacity) : prev.watermarkOpacity),
                position: remoteSettings.watermarkPosition || remoteSettings.watermark_position || parsedWm?.position || prev.watermarkPosition || 'bottom-right',
              },
            };

            // Cập nhật tab favicon trên trình duyệt ngay lập tức
            if (nextSettings.faviconUrl) {
              const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
              if (favEl) favEl.href = nextSettings.faviconUrl;
              const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
              if (appleFavEl) appleFavEl.href = nextSettings.faviconUrl;
            }

            // Cập nhật thẻ SEO Head trên trình duyệt nếu đang ở trang chủ (tránh đè title của /lich-su, /theo-doi, ...)
            const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
            const isHomePage = currentPath === '/' || currentPath === '/index.html';
            if (isHomePage) {
              const hTitle = nextSettings.headTitle || nextSettings.metaTitle || (nextSettings.siteName ? `${nextSettings.siteName} - Đọc Truyện Tranh Online Miễn Phí` : 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí');
              const hDesc = nextSettings.siteDescription || nextSettings.metaDescription || 'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).';
              updateSeoMeta({
                title: hTitle,
                description: hDesc,
                url: nextSettings.siteDomain || window.location.origin,
              });
            }

            if (nextSettings.watermarkText) setWatermarkText(nextSettings.watermarkText);
            if (nextSettings.watermarkOpacity) setWatermarkOpacity(nextSettings.watermarkOpacity);
            try {
              localStorage.setItem('leesincomic_site_settings', JSON.stringify(nextSettings));
            } catch (e) {}
            return nextSettings;
          });
        }
      });
      // Hydrate toàn bộ dữ liệu 100% đồng bộ từ MySQL Database qua API
      Promise.all([
        fetchComicsFromMysql(mysqlConfig),
        fetchCommentsFromMysql(mysqlConfig),
        fetchUsersFromMysql(mysqlConfig),
        fetchTeamsFromMysql(mysqlConfig),
        currentUser ? fetchReadingHistoryFromMysql(mysqlConfig, currentUser.id) : Promise.resolve(null),
        currentUser ? fetchFollowedComicsFromMysql(mysqlConfig, currentUser.id) : Promise.resolve(null),
        currentUser ? fetchFollowedTeamsFromMysql(mysqlConfig, currentUser.id) : Promise.resolve(null),
      ]).then(([remoteComics, remoteComments, remoteUsers, remoteTeams, remoteHist, remoteFollows, remoteFollowTeams]) => {
        if (remoteComics !== null && Array.isArray(remoteComics)) {
          const normalizedComics = remoteComics.map((c) => ({
            ...c,
            views: typeof c.views === 'number' ? c.views : (Number(c.views) || 0),
          }));
          setComics((prevComics) => {
            // Preserve any in-memory chapter images already loaded in reader
            const prevMap = new Map<string, Comic>(prevComics.map((pc) => [pc.id, pc]));
            const merged = normalizedComics.map((nc) => {
              const existing = prevMap.get(nc.id) || prevMap.get(nc.slug);
              if (!existing) return nc;
              const existingChapMap = new Map<string, Chapter>((existing.chapters || []).map((ch) => [ch.id, ch]));
              const remoteChapIds = new Set((nc.chapters || []).map((ch) => ch.id));
              const remoteChapNums = new Set((nc.chapters || []).map((ch) => Number(ch.chapterNumber)));

              const mergedChapters = (nc.chapters || []).map((nch) => {
                const exCh =
                  existingChapMap.get(nch.id) ||
                  (existing.chapters || []).find((ch) => Number(ch.chapterNumber) === Number(nch.chapterNumber));
                if (exCh && Array.isArray(exCh.images) && exCh.images.length > 0 && (!nch.images || nch.images.length === 0)) {
                  return { ...nch, images: exCh.images };
                }
                return nch;
              });

              // Preserve locally added chapters that might not yet be in remote response
              for (const exCh of (existing.chapters || [])) {
                if (!remoteChapIds.has(exCh.id) && !remoteChapNums.has(Number(exCh.chapterNumber))) {
                  mergedChapters.push(exCh);
                }
              }
              mergedChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));

              return {
                ...nc,
                chapters: mergedChapters,
              };
            });
            saveComicsToCache(merged);
            return merged;
          });
          setSelectedComic((currentSelected) => {
            if (!currentSelected) return null;
            const fresh = normalizedComics.find((c) => c.id === currentSelected.id || c.slug === currentSelected.slug);
            if (!fresh) return currentSelected;
            const existingChapMap = new Map<string, Chapter>((currentSelected.chapters || []).map((ch) => [ch.id, ch]));
            const remoteChapIds = new Set((fresh.chapters || []).map((ch) => ch.id));
            const remoteChapNums = new Set((fresh.chapters || []).map((ch) => Number(ch.chapterNumber)));

            const mergedChapters = (fresh.chapters || []).map((nch) => {
              const exCh =
                existingChapMap.get(nch.id) ||
                (currentSelected.chapters || []).find((ch) => Number(ch.chapterNumber) === Number(nch.chapterNumber));
              if (exCh && Array.isArray(exCh.images) && exCh.images.length > 0 && (!nch.images || nch.images.length === 0)) {
                return { ...nch, images: exCh.images };
              }
              return nch;
            });

            for (const exCh of (currentSelected.chapters || [])) {
              if (!remoteChapIds.has(exCh.id) && !remoteChapNums.has(Number(exCh.chapterNumber))) {
                mergedChapters.push(exCh);
              }
            }
            mergedChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));

            return {
              ...fresh,
              chapters: mergedChapters,
            };
          });
          setActiveChapter((currentChap) => {
            if (!currentChap) return null;
            for (const c of normalizedComics) {
              const freshChap = (c.chapters || []).find((ch) => ch.id === currentChap.id);
              if (freshChap) {
                if (Array.isArray(currentChap.images) && currentChap.images.length > 0 && (!freshChap.images || freshChap.images.length === 0)) {
                  return { ...freshChap, images: currentChap.images };
                }
                return freshChap;
              }
            }
            return currentChap;
          });
        }

        if (remoteComments !== null && Array.isArray(remoteComments)) {
          setComments(remoteComments);
          syncNotificationsFromBackend();
        }

        if (remoteTeams !== null && Array.isArray(remoteTeams) && remoteTeams.length > 0) {
          setTeams(remoteTeams);
        }

        if (remoteUsers !== null && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          const userList = remoteUsers;
          setUsers(userList);
          try {
            localStorage.setItem('leesincomic_users', JSON.stringify(userList));
          } catch (e) {}
          setCurrentUser((prevUser) => {
            if (!prevUser) return null;
            const freshUser = userList.find((u) => {
              if (u.id && prevUser.id && u.id === prevUser.id) return true;
              const u1 = (prevUser.username || '').trim().toLowerCase().replace(/^@/, '');
              const u2 = (u.username || '').trim().toLowerCase().replace(/^@/, '');
              if (u1 && u2 && u1 === u2) return true;
              const e1 = (prevUser.email || '').trim().toLowerCase();
              const e2 = (u.email || '').trim().toLowerCase();
              if (e1 && e2 && e1 === e2) return true;
              return false;
            });
            if (freshUser) {
              const updatedUser: User = {
                ...prevUser,
                ...freshUser,
                role: freshUser.role || prevUser.role,
                avatar: (freshUser.avatar && freshUser.avatar.trim()) ? freshUser.avatar : prevUser.avatar,
                teamId: freshUser.teamId !== undefined ? freshUser.teamId : prevUser.teamId,
                teamName: freshUser.teamName !== undefined ? freshUser.teamName : prevUser.teamName,
                canUpload: freshUser.role === 'ADMIN' || freshUser.role === 'TEAM_LEADER' || !!freshUser.canUpload,
              };
              try {
                localStorage.setItem('leesincomic_current_user', JSON.stringify(updatedUser));
              } catch (e) {}
              return updatedUser;
            }
            return prevUser;
          });
        }

        if (remoteHist !== null && Array.isArray(remoteHist)) {
          setReadingHistory((prev) => {
            const remoteMap = new Map(remoteHist.map((h) => [h.comicId, h]));
            const localOnly = prev.filter((h) => !remoteMap.has(h.comicId));
            const merged = [...remoteHist, ...localOnly];
            try {
              localStorage.setItem('leesincomic_reading_history', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (remoteFollows !== null && Array.isArray(remoteFollows)) {
          setFollowedComics((prev) => {
            const remoteMap = new Map(remoteFollows.map((f) => [f.comicId, f]));
            const localOnly = prev.filter((f) => !remoteMap.has(f.comicId));
            const merged = [...remoteFollows, ...localOnly];
            try {
              localStorage.setItem('leesincomic_followed_comics', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (remoteFollowTeams !== null && Array.isArray(remoteFollowTeams)) {
          setFollowedTeams((prev) => {
            const remoteMap = new Map(remoteFollowTeams.map((t) => [t.teamId, t]));
            const localOnly = prev.filter((t) => !remoteMap.has(t.teamId));
            const merged = [...remoteFollowTeams, ...localOnly];
            try {
              localStorage.setItem('leesincomic_followed_teams', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }).catch((err) => {
        console.warn('Lỗi lấy dữ liệu từ MySQL:', err);
      });
    }
  }, [mysqlConfig.enabled, mysqlConfig.apiUrl, mysqlConfig.apiKey, currentUser?.id]);

  // Keep currentUser synchronized whenever the users state changes
  useEffect(() => {
    if (!currentUser) return;
    if (users === INITIAL_USERS) return; // Tránh mock data tĩnh đè lên session thật khi vừa F5
    const matched = users.find((u) => {
      if (u.id && currentUser.id && u.id === currentUser.id) return true;
      const u1 = (currentUser.username || '').trim().toLowerCase().replace(/^@/, '');
      const u2 = (u.username || '').trim().toLowerCase().replace(/^@/, '');
      if (u1 && u2 && u1 === u2) return true;
      const e1 = (currentUser.email || '').trim().toLowerCase();
      const e2 = (u.email || '').trim().toLowerCase();
      if (e1 && e2 && e1 === e2) return true;
      return false;
    });
    if (matched) {
      if (
        matched.role !== currentUser.role ||
        matched.teamId !== currentUser.teamId ||
        matched.teamName !== currentUser.teamName ||
        matched.canUpload !== currentUser.canUpload ||
        matched.name !== currentUser.name ||
        (matched.avatar && matched.avatar.trim() && matched.avatar !== currentUser.avatar)
      ) {
        const synced: User = {
          ...currentUser,
          ...matched,
          avatar: (matched.avatar && matched.avatar.trim()) ? matched.avatar : currentUser.avatar,
        };
        setCurrentUser(synced);
        try {
          localStorage.setItem('leesincomic_current_user', JSON.stringify(synced));
        } catch (e) {}
      }
    }
  }, [users]);

  // --- Navigation & F5-Style Reload Handlers ---

  const lastSyncTimestampRef = useRef<number>(Date.now());

  const syncCoreDataFromMysql = useCallback(async (force = false) => {
    if (!mysqlConfig.enabled) return;
    const now = Date.now();
    if (!force && now - lastSyncTimestampRef.current < 25000) {
      return;
    }
    lastSyncTimestampRef.current = now;
    try {
      const [remoteComics, remoteTeams, remoteUsers] = await Promise.all([
        fetchComicsFromMysql(mysqlConfig, force),
        fetchTeamsFromMysql(mysqlConfig, force),
        fetchUsersFromMysql(mysqlConfig, force),
      ]);

      if (remoteComics !== null && Array.isArray(remoteComics)) {
        const normalizedComics = remoteComics.map((c) => ({
          ...c,
          views: typeof c.views === 'number' ? c.views : (Number(c.views) || 0),
        }));
        setComics((prevComics) => {
          const prevMap = new Map<string, Comic>(prevComics.map((pc) => [pc.id, pc]));
          const merged = normalizedComics.map((nc) => {
            const existing = prevMap.get(nc.id) || prevMap.get(nc.slug);
            if (!existing) return nc;
            const existingChapMap = new Map<string, Chapter>((existing.chapters || []).map((ch) => [ch.id, ch]));
            const remoteChapIds = new Set((nc.chapters || []).map((ch) => ch.id));
            const remoteChapNums = new Set((nc.chapters || []).map((ch) => Number(ch.chapterNumber)));

            const mergedChapters = (nc.chapters || []).map((nch) => {
              const exCh = existingChapMap.get(nch.id);
              if (exCh && Array.isArray(exCh.images) && exCh.images.length > 0 && (!nch.images || nch.images.length === 0)) {
                return { ...nch, images: exCh.images };
              }
              return nch;
            });

            // Preserve locally added chapters that might not yet be in remote response
            for (const exCh of (existing.chapters || [])) {
              if (!remoteChapIds.has(exCh.id) && !remoteChapNums.has(Number(exCh.chapterNumber))) {
                mergedChapters.push(exCh);
              }
            }
            mergedChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));

            return {
              ...nc,
              chapters: mergedChapters,
            };
          });
          saveComicsToCache(merged);
          return merged;
        });
        setSelectedComic((currentSelected) => {
          if (!currentSelected) return null;
          const fresh = normalizedComics.find((c) => c.id === currentSelected.id || c.slug === currentSelected.slug);
          if (!fresh) return currentSelected;
          const existingChapMap = new Map<string, Chapter>((currentSelected.chapters || []).map((ch) => [ch.id, ch]));
          const remoteChapIds = new Set((fresh.chapters || []).map((ch) => ch.id));
          const remoteChapNums = new Set((fresh.chapters || []).map((ch) => Number(ch.chapterNumber)));

          const mergedChapters = (fresh.chapters || []).map((nch) => {
            const exCh = existingChapMap.get(nch.id);
            if (exCh && Array.isArray(exCh.images) && exCh.images.length > 0 && (!nch.images || nch.images.length === 0)) {
              return { ...nch, images: exCh.images };
            }
            return nch;
          });

          for (const exCh of (currentSelected.chapters || [])) {
            if (!remoteChapIds.has(exCh.id) && !remoteChapNums.has(Number(exCh.chapterNumber))) {
              mergedChapters.push(exCh);
            }
          }
          mergedChapters.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0));

          return {
            ...fresh,
            chapters: mergedChapters,
          };
        });
      }

      if (remoteTeams !== null && Array.isArray(remoteTeams) && remoteTeams.length > 0) {
        setTeams(remoteTeams);
      }

      if (remoteUsers !== null && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        setCurrentUser((prevUser) => {
          if (!prevUser) return null;
          const fresh = remoteUsers.find((u) => {
            if (u.id && prevUser.id && u.id === prevUser.id) return true;
            const u1 = (prevUser.username || '').trim().toLowerCase().replace(/^@/, '');
            const u2 = (u.username || '').trim().toLowerCase().replace(/^@/, '');
            if (u1 && u2 && u1 === u2) return true;
            const e1 = (prevUser.email || '').trim().toLowerCase();
            const e2 = (u.email || '').trim().toLowerCase();
            if (e1 && e2 && e1 === e2) return true;
            return false;
          });
          if (fresh) {
            const syncedUser: User = {
              ...prevUser,
              ...fresh,
              avatar: (fresh.avatar && fresh.avatar.trim()) ? fresh.avatar : prevUser.avatar,
              teamId: fresh.teamId !== undefined ? fresh.teamId : prevUser.teamId,
              teamName: fresh.teamName !== undefined ? fresh.teamName : prevUser.teamName,
              canUpload: fresh.role === 'ADMIN' || fresh.role === 'TEAM_LEADER' || !!fresh.canUpload,
            };
            try {
              localStorage.setItem('leesincomic_current_user', JSON.stringify(syncedUser));
            } catch (e) {}
            return syncedUser;
          }
          return prevUser;
        });
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ dữ liệu SQL nền:', err);
    }
  }, [mysqlConfig]);

  const notifySqlDataChange = useCallback((extraPayload?: any) => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('leesincomic_sql_data_channel');
        ch.postMessage({ type: 'SQL_DATA_UPDATED', timestamp: Date.now(), ...(extraPayload || {}) });
        ch.close();
      }
      localStorage.setItem('leesincomic_sql_data_sync_ping', JSON.stringify({ timestamp: Date.now(), ...(extraPayload || {}) }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!mysqlConfig.enabled) return;
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('leesincomic_sql_data_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SQL_DATA_UPDATED') {
            if (event.data.userAvatar) {
              const uId = event.data.userId;
              const uUname = event.data.username;
              setCurrentUser((prev) => {
                if (!prev) return null;
                const isMe =
                  (uId && prev.id === uId) ||
                  (uUname && prev.username && prev.username.toLowerCase().replace(/^@/, '') === uUname.toLowerCase().replace(/^@/, ''));
                if (isMe) {
                  const refreshed: User = { ...prev, avatar: event.data.userAvatar };
                  try {
                    localStorage.setItem('leesincomic_current_user', JSON.stringify(refreshed));
                  } catch (e) {}
                  return refreshed;
                }
                return prev;
              });
            }
            syncCoreDataFromMysql(true);
          }
        };
      }
    } catch (e) {}

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'leesincomic_sql_data_sync_ping') {
        try {
          const parsed = JSON.parse(e.newValue || '{}');
          if (parsed.userAvatar) {
            setCurrentUser((prev) => {
              if (!prev) return null;
              const isMe =
                (parsed.userId && prev.id === parsed.userId) ||
                (parsed.username && prev.username && prev.username.toLowerCase().replace(/^@/, '') === parsed.username.toLowerCase().replace(/^@/, ''));
              if (isMe) {
                const refreshed: User = { ...prev, avatar: parsed.userAvatar };
                try {
                  localStorage.setItem('leesincomic_current_user', JSON.stringify(refreshed));
                } catch (err) {}
                return refreshed;
              }
              return prev;
            });
          }
        } catch (err) {}
        syncCoreDataFromMysql(true);
      }
    };
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncCoreDataFromMysql(true);
      }
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Polling định kỳ mỗi 12 giây để các thiết bị khác luôn thấy avatar và dữ liệu mới nhất
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncCoreDataFromMysql(false);
      }
    }, 12000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [mysqlConfig.enabled, syncCoreDataFromMysql]);

  const reloadAndSyncMysql = async () => {
    setIsPageNavigating(true);
    if (mysqlConfig.enabled) {
      try {
        let savedUser: User | null = null;
        try {
          const s = localStorage.getItem('leesincomic_current_user');
          if (s) savedUser = JSON.parse(s);
        } catch (e) {}

        const [remoteComics, remoteSettings, remoteComments, remoteTeams, remoteUsers, remoteNotifs] = await Promise.all([
          fetchComicsFromMysql(mysqlConfig),
          fetchSiteSettingsFromMysql(mysqlConfig),
          fetchCommentsFromMysql(mysqlConfig),
          fetchTeamsFromMysql(mysqlConfig),
          fetchUsersFromMysql(mysqlConfig),
          fetchNotificationsFromMysql(mysqlConfig, savedUser ? {
            userId: savedUser.id,
            teamId: savedUser.teamId,
            teamName: savedUser.teamName,
            role: savedUser.role,
            limit: 100,
          } : undefined),
        ]);

        if (remoteComics !== null && Array.isArray(remoteComics)) {
          const normalizedComics = remoteComics.map((c) => ({
            ...c,
            views: typeof c.views === 'number' ? c.views : (Number(c.views) || 0),
          }));
          setComics((prevComics) => {
            const prevMap = new Map<string, Comic>(prevComics.map((pc) => [pc.id, pc]));
            const merged = normalizedComics.map((nc) => {
              const existing = prevMap.get(nc.id);
              if (!existing) return nc;
              const existingChapMap = new Map<string, Chapter>((existing.chapters || []).map((ch) => [ch.id, ch]));
              return {
                ...nc,
                chapters: (nc.chapters || []).map((nch) => {
                  const exCh = existingChapMap.get(nch.id);
                  if (exCh && Array.isArray(exCh.images) && exCh.images.length > 0 && (!nch.images || nch.images.length === 0)) {
                    return { ...nch, images: exCh.images };
                  }
                  return nch;
                }),
              };
            });
            saveComicsToCache(merged);
            return merged;
          });
        }

        if (remoteSettings) {
          let parsedChapterAd = remoteSettings.chapterAd;
          if (typeof parsedChapterAd === 'string') {
            try { parsedChapterAd = JSON.parse(parsedChapterAd); } catch (e) {}
          }
          setSiteSettings((prev) => {
            const updated = {
              ...prev,
              ...remoteSettings,
              chapterAd: parsedChapterAd
                ? { ...(prev.chapterAd || DEFAULT_CHAPTER_AD), ...parsedChapterAd }
                : (prev.chapterAd || DEFAULT_CHAPTER_AD),
              logoUrl: remoteSettings.logoUrl ?? remoteSettings.logo_url ?? prev.logoUrl,
              faviconUrl: remoteSettings.faviconUrl ?? remoteSettings.favicon_url ?? prev.faviconUrl,
              logoHeight: remoteSettings.logoHeight !== undefined ? Number(remoteSettings.logoHeight) : (remoteSettings.logo_height !== undefined ? Number(remoteSettings.logo_height) : prev.logoHeight),
              logoWidth: remoteSettings.logoWidth !== undefined ? Number(remoteSettings.logoWidth) : (remoteSettings.logo_width !== undefined ? Number(remoteSettings.logo_width) : prev.logoWidth),
              footerLogoHeight: remoteSettings.footerLogoHeight !== undefined ? Number(remoteSettings.footerLogoHeight) : (remoteSettings.footer_logo_height !== undefined ? Number(remoteSettings.footer_logo_height) : prev.footerLogoHeight),
              logoScale: remoteSettings.logoScale !== undefined ? Number(remoteSettings.logoScale) : (remoteSettings.logo_scale !== undefined ? Number(remoteSettings.logo_scale) : prev.logoScale),
            };
            try {
              localStorage.setItem('leesincomic_site_settings', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        if (remoteComments && Array.isArray(remoteComments)) {
          setComments(remoteComments);
        }

        if (remoteNotifs && Array.isArray(remoteNotifs)) {
          setNotifications(remoteNotifs);
        }

        if (remoteTeams && Array.isArray(remoteTeams) && remoteTeams.length > 0) {
          setTeams(remoteTeams);
        }

        if (remoteUsers && Array.isArray(remoteUsers)) {
          setUsers(remoteUsers);
          try {
            localStorage.setItem('leesincomic_users', JSON.stringify(remoteUsers));
          } catch (e) {}
          if (savedUser) {
            const fresh = remoteUsers.find((u) => {
              if (u.id && savedUser.id && u.id === savedUser.id) return true;
              const u1 = (savedUser.username || '').trim().toLowerCase().replace(/^@/, '');
              const u2 = (u.username || '').trim().toLowerCase().replace(/^@/, '');
              if (u1 && u2 && u1 === u2) return true;
              const e1 = (savedUser.email || '').trim().toLowerCase();
              const e2 = (u.email || '').trim().toLowerCase();
              if (e1 && e2 && e1 === e2) return true;
              return false;
            });
            if (fresh) {
              const syncedUser: User = {
                ...savedUser,
                ...fresh,
                avatar: (fresh.avatar && fresh.avatar.trim()) ? fresh.avatar : savedUser.avatar,
              };
              setCurrentUser(syncedUser);
              try {
                localStorage.setItem('leesincomic_current_user', JSON.stringify(syncedUser));
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ dữ liệu khi tải lại:', err);
      }
    }

    setTimeout(() => {
      setIsPageNavigating(false);
    }, 320);
  };

  const handleNavigateHome = (pushHistory = true, shouldSync = true) => {
    setPreviousView(null);
    setCurrentView('home');
    setSelectedComic(null);
    setActiveChapter(null);
    setSelectedGenre('Tất cả');
    setAdminResetTargetUser(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (pushHistory) {
      try {
        window.history.pushState({ view: 'home' }, '', '/');
      } catch (e) {
        console.warn(e);
      }
    }
    const homeTitle = siteSettings.headTitle || siteSettings.metaTitle || (siteSettings.siteName ? `${siteSettings.siteName} - Đọc Truyện Tranh Online Miễn Phí` : 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí');
    const homeDesc = siteSettings.siteDescription || siteSettings.metaDescription || 'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).';
    updateSeoMeta({
      title: homeTitle,
      description: homeDesc,
      url: (siteSettings.siteDomain ? (siteSettings.siteDomain.startsWith('http') ? siteSettings.siteDomain : `https://${siteSettings.siteDomain}`) : window.location.origin) + '/',
      siteSettings,
      breadcrumbs: [{ name: 'Trang Chủ', url: '/' }],
    });
    if (shouldSync) {
      reloadAndSyncMysql();
    }
  };

  const handleNavigateCategory = (
    pageType: 'genre' | 'hot' | 'ranking' | 'latest' | 'search',
    param = '',
    pushHistory = true,
    shouldSync = true
  ) => {
    setCategoryPageType(pageType);
    setCategoryPageParam(param || (pageType === 'genre' ? 'Tất cả' : ''));
    setCurrentView('category');
    setSelectedComic(null);
    setActiveChapter(null);
    window.scrollTo({ top: 0, behavior: 'instant' });

    let targetPath = '/the-loai';
    let title = 'Thể Loại Truyện';
    let desc = 'Đọc truyện tranh online với hàng ngàn đầu truyện tuyển chọn.';

    if (pageType === 'genre') {
      const slug = param && param !== 'Tất cả' ? toSlug(param) : 'tat-ca';
      targetPath = `/the-loai/${slug}`;
      title = `Thể loại ${param} - Leesin Comic`;
      desc = `Tuyển tập danh sách truyện tranh thể loại ${param} hay nhất và mới nhất.`;
    } else if (pageType === 'hot') {
      targetPath = '/hot';
      title = 'Truyện Hot Được Đọc Nhiều Nhất - Leesin Comic';
      desc = 'Top những bộ truyện tranh hot nhất được độc giả yêu thích và đón đọc nhiều nhất.';
    } else if (pageType === 'ranking') {
      targetPath = `/xep-hang/${param || 'month'}`;
      title = `Bảng Xếp Hạng Truyện Tranh - Leesin Comic`;
      desc = 'Bảng xếp hạng truyện tranh theo ngày, tuần và tháng tại Leesin Comic.';
    } else if (pageType === 'latest') {
      targetPath = '/moi-cap-nhat';
      title = 'Truyện Mới Cập Nhật - Leesin Comic';
      desc = 'Danh sách các bộ truyện tranh vừa được ra mắt và cập nhật chương mới nhất.';
    } else if (pageType === 'search') {
      targetPath = `/tim-kiem?q=${encodeURIComponent(param)}`;
      title = `Tìm kiếm "${param}" - Leesin Comic`;
      desc = `Kết quả tìm kiếm truyện tranh cho từ khóa "${param}".`;
    }

    if (pushHistory) {
      try {
        window.history.pushState({ view: 'category', pageType, param }, '', targetPath);
      } catch (e) {
        console.warn(e);
      }
    }
    updateSeoMeta({
      title,
      description: desc,
      url: window.location.origin + targetPath,
      siteSettings,
      breadcrumbs: [
        { name: 'Trang Chủ', url: '/' },
        { name: title, url: targetPath },
      ],
    });
    if (shouldSync) {
      reloadAndSyncMysql();
    }
  };

  const handleNavigateLibrary = (tab: 'history' | 'following' = 'history', pushHistory = true, shouldSync = true) => {
    setLibraryInitialTab(tab);
    setCurrentView('library');
    setSelectedComic(null);
    setActiveChapter(null);
    window.scrollTo({ top: 0, behavior: 'instant' });

    const targetPath = tab === 'following' ? '/theo-doi' : '/lich-su';
    const title = tab === 'following' ? 'Truyện Đã Theo Dõi - Leesin Comic' : 'Lịch Sử Đọc Truyện - Leesin Comic';
    const desc = tab === 'following' ? 'Danh sách những bộ truyện tranh bạn đang theo dõi.' : 'Lịch sử các chương truyện bạn đã đọc gần đây.';

    if (pushHistory) {
      try {
        window.history.pushState({ view: 'library', tab }, '', targetPath);
      } catch (e) {
        console.warn(e);
      }
    }
    updateSeoMeta({
      title,
      description: desc,
      url: window.location.origin + targetPath,
      siteSettings,
      breadcrumbs: [
        { name: 'Trang Chủ', url: '/' },
        { name: title, url: targetPath },
      ],
    });
    if (shouldSync) {
      reloadAndSyncMysql();
    }
  };

  const handleNavigateTeams = (team?: ScanTeam | null, pushHistory = true, shouldSync = true) => {
    setSelectedTeamForView(team || null);
    setCurrentView('teams');
    setSelectedComic(null);
    setActiveChapter(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const teamSlug = team ? (team.slug || toSlug(team.name) || team.id || 'team') : '';
    const targetPath = team ? `/nhom-dich/${teamSlug}` : '/nhom-dich-all';
    if (pushHistory) {
      try {
        window.history.pushState({ view: 'teams', teamId: team?.id, teamSlug }, '', targetPath);
      } catch (e) {
        console.warn(e);
      }
    }
    updateSeoMeta({
      title: team ? `Nhóm Dịch: ${team.name} - Danh Sách Truyện Đã Dịch` : 'Danh Bạ Nhóm Dịch - Leesin Comic',
      description: team ? (team.description || `Danh sách các bộ truyện tranh do nhóm dịch ${team.name} phát hành và chuyển ngữ.`) : 'Khám phá các nhóm dịch truyện tranh chất lượng cao và theo dõi các nhóm dịch bạn yêu thích.',
      url: window.location.origin + targetPath,
      siteSettings,
      breadcrumbs: [
        { name: 'Trang Chủ', url: '/' },
        { name: 'Danh Bạ Nhóm Dịch', url: '/nhom-dich-all' },
        ...(team ? [{ name: team.name, url: targetPath }] : []),
      ],
    });
    if (shouldSync) {
      reloadAndSyncMysql();
    }
  };

  const handleSelectGenre = (genre: string) => {
    handleNavigateCategory('genre', genre, true, true);
  };

  const handleNavigateHot = () => {
    handleNavigateCategory('hot', '', true, true);
  };

  const handleNavigateRanking = (tab: 'day' | 'week' | 'month' = 'month') => {
    handleNavigateCategory('ranking', tab, true, true);
  };

  const handleSearchSubmit = (query: string) => {
    handleNavigateCategory('search', query, true, true);
  };

  const handleSelectComic = async (comic: Comic, pushHistory = true, shouldSync = false, shouldScrollTop = true) => {
    if (currentView !== 'comic-detail' && currentView !== 'reader') {
      setPreviousView(currentView);
    }
    setSelectedComic(comic);
    setActiveChapter(null);
    setCurrentView('comic-detail');
    if (shouldScrollTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    const targetSlug = comic.slug || comic.id;
    if (pushHistory) {
      try {
        window.history.pushState({ view: 'comic-detail', slug: targetSlug }, '', `/truyen/${targetSlug}`);
      } catch (e) {
        console.warn(e);
      }
    }
    const genreName = comic.genres && comic.genres[0] ? comic.genres[0] : 'Truyện Tranh';
    const genreSlug = (comic.genres && comic.genres[0] && GENRE_SLUG_MAP[comic.genres[0]]) || 'tat-ca';

    updateSeoMeta({
      title: `${comic.title} [Mới Nhất] - ${siteSettings.siteName || 'Leesin Comic'}`,
      description: comic.summary || `Đọc truyện tranh ${comic.title} online bản dịch chất lượng cao, cập nhật nhanh nhất tại ${siteSettings.siteName || 'Leesin Comic'}.`,
      image: comic.coverImage,
      url: `${(siteSettings?.siteDomain ? (siteSettings.siteDomain.startsWith('http') ? siteSettings.siteDomain : `https://${siteSettings.siteDomain}`) : window.location.origin)}/truyen/${targetSlug}`,
      type: 'book',
      keywords: [comic.title, ...(comic.genres || []), ...(comic.authors || []), 'truyện tranh', 'manga online'],
      comicData: comic,
      siteSettings,
      breadcrumbs: [
        { name: 'Trang Chủ', url: '/' },
        { name: genreName, url: `/the-loai/${genreSlug}` },
        { name: comic.title, url: `/truyen/${targetSlug}` },
      ],
    });
    if (shouldSync) {
      reloadAndSyncMysql();
    }
  };

  // Helper to re-calculate team views from comic list
  const syncTeamsWithComicsList = (teamList: ScanTeam[], comicList: Comic[]) => {
    const list = teamList || [];
    return list.map((t) => {
      const tComics = (comicList || []).filter(
        (c) =>
          c &&
          (c.teamId === t.id ||
            (c.teamName && t.name && c.teamName.toLowerCase().trim() === t.name.toLowerCase().trim()) ||
            (t.leaderName && c.teamName && c.teamName.toLowerCase().trim() === t.leaderName.toLowerCase().trim()))
      );
      const comicsSum = tComics.reduce((sum, c) => {
        const chapsSum = (c.chapters || []).reduce((chS, ch) => chS + (ch.views || 0), 0);
        return sum + Math.max(c.views || 0, chapsSum);
      }, 0);
      const total = getOfficialTeamViews(t, comicsSum > 0 ? comicsSum : (t.totalViews || 0));

      const existingMonthly = t.monthlyViews || {};
      const monthlyViews: Record<string, number> = {
        ...existingMonthly,
      };
      if (total === 0) {
        monthlyViews['2026-05'] = 0;
        monthlyViews['2026-06'] = 0;
        monthlyViews['2026-07'] = 0;
        monthlyViews['2026-08'] = 0;
        monthlyViews['2026-09'] = 0;
        monthlyViews['2026-10'] = 0;
      } else {
        const m5 = Math.floor(total * 0.14);
        const m6 = Math.floor(total * 0.18);
        const m7 = Math.floor(total * 0.21);
        const m8 = Math.floor(total * 0.23);
        const m9 = total - (m5 + m6 + m7 + m8);
        monthlyViews['2026-05'] = m5;
        monthlyViews['2026-06'] = m6;
        monthlyViews['2026-07'] = m7;
        monthlyViews['2026-08'] = m8;
        monthlyViews['2026-09'] = m9;
      }
      const currentMonthKey = getGmt7MonthString();
      if (monthlyViews[currentMonthKey] === undefined) {
        const dailySum = Object.entries(t.dailyViews || {})
          .filter(([d]) => d.startsWith(currentMonthKey))
          .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
        monthlyViews[currentMonthKey] = dailySum;
      }

      const updated = {
        ...t,
        totalViews: total,
        monthlyViews,
      };
      if (mysqlConfig.enabled && t.totalViews !== total) {
        saveTeamToMysql(mysqlConfig, updated);
      }
      return updated;
    });
  };

  const handleReadChapter = async (chapter: Chapter, pushHistory = true, shouldScrollTop = true) => {
    const targetComic = comics.find((c) => c.id === chapter.comicId) || selectedComic;
    if (targetComic) {
      setSelectedComic(targetComic);
    }
    setActiveChapter(chapter);
    setCurrentView('reader');
    if (shouldScrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Record Reading History (both logged-in users and guests)
    if (targetComic) {
      const activeUserId = currentUser ? currentUser.id : 'guest';
      const nowIso = new Date().toISOString();
      const historyItem: ReadingHistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: activeUserId,
        comicId: targetComic.id,
        comicTitle: targetComic.title,
        comicSlug: targetComic.slug,
        comicCover: targetComic.coverImage,
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.title,
        readAt: nowIso,
        lastReadAt: nowIso,
        teamName: chapter.teamName || targetComic.teamName,
      };

      setReadingHistory((prev) => {
        const filtered = prev.filter(
          (h) => !(h.comicId === targetComic.id && (h.userId === activeUserId || !h.userId))
        );
        const updated = [historyItem, ...filtered];
        try {
          localStorage.setItem('leesincomic_reading_history', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (currentUser && mysqlConfig.enabled) {
        saveReadingHistoryToMysql(mysqlConfig, historyItem);
      }
    }

    const slug = targetComic?.slug || 'truyen';
    const siteDomain = siteSettings?.siteDomain
      ? (siteSettings.siteDomain.startsWith('http') ? siteSettings.siteDomain : `https://${siteSettings.siteDomain}`)
      : window.location.origin;
    const targetUrl = `${siteDomain}/truyen/${slug}/chap-${chapter.chapterNumber}`;

    if (pushHistory) {
      try {
        window.history.pushState(
          { view: 'reader', slug, chapterNumber: chapter.chapterNumber },
          '',
          `/truyen/${slug}/chap-${chapter.chapterNumber}`
        );
      } catch (e) {
        console.warn(e);
      }
    }
    updateSeoMeta({
      title: `${targetComic?.title || 'Truyện'} - ${chapter.title} - ${siteSettings.siteName || 'Leesin Comic'}`,
      description: `Đọc truyện ${targetComic?.title || ''} ${chapter.title} Tiếng Việt nhanh nhất và không quảng cáo khó chịu tại ${siteSettings.siteName || 'Leesin Comic'}.`,
      image: targetComic?.coverImage,
      url: targetUrl,
      type: 'article',
      keywords: [targetComic?.title || '', chapter.title, 'đọc truyện online'],
      comicData: targetComic || undefined,
      chapterData: targetComic ? { comic: targetComic, chapter } : undefined,
      siteSettings,
      breadcrumbs: [
        { name: 'Trang Chủ', url: '/' },
        { name: targetComic?.title || 'Truyện Tranh', url: `/truyen/${slug}` },
        { name: chapter.title, url: `/truyen/${slug}/chap-${chapter.chapterNumber}` },
      ],
    });
  };

  // Handler: Atomic View Increment from Views Calculation Engine in ReaderView (SQL as Source of Truth)
  const handleCountChapterView = async (chapter: Chapter, multiplier: number = 1) => {
    const todayStr = getGmt7DateString();
    const currentMonthStr = getGmt7MonthString();

    // 1. Cập nhật trực tiếp vào React state để phản hồi giao diện tức thì
    const currentComic = comics.find((c) => c.id === chapter.comicId);
    const targetTeamId = (chapter.teamId || currentComic?.teamId || '').trim();
    const targetTeamName = (chapter.teamName || currentComic?.teamName || '').trim();

    setComics((prevComics) => {
      const nextComics = prevComics.map((c) => {
        if (c.id === chapter.comicId) {
          const updatedChapters = (c.chapters || []).map((ch) =>
            ch.id === chapter.id ? { ...ch, views: (ch.views || 0) + multiplier } : ch
          );
          const chapsSum = updatedChapters.reduce((s, ch) => s + (ch.views || 0), 0);
          return {
            ...c,
            views: Math.max((c.views || 0) + multiplier, chapsSum),
            dayViews: (c.dayViews || 0) + multiplier,
            weekViews: (c.weekViews || 0) + multiplier,
            monthViews: (c.monthViews || 0) + multiplier,
            chapters: updatedChapters,
          };
        }
        return c;
      });
      return nextComics;
    });

    setSelectedComic((prev) => {
      if (!prev || prev.id !== chapter.comicId) return prev;
      const updatedChaps = (prev.chapters || []).map((ch) =>
        ch.id === chapter.id ? { ...ch, views: (ch.views || 0) + multiplier } : ch
      );
      const chapsSum = updatedChaps.reduce((s, ch) => s + (ch.views || 0), 0);
      return {
        ...prev,
        views: Math.max((prev.views || 0) + multiplier, chapsSum),
        chapters: updatedChaps,
      };
    });

    setActiveChapter((prev) => (prev && prev.id === chapter.id ? { ...prev, views: (prev.views || 0) + multiplier } : prev));

    setTeams((prevTeams) => {
      const nextTeams = prevTeams.map((t) => {
        // Khớp DUY NHẤT nhóm dịch sở hữu bộ truyện / chương này
        let isMatch = false;
        if (targetTeamId) {
          isMatch = t.id === targetTeamId || t.id.toLowerCase() === targetTeamId.toLowerCase();
        } else if (targetTeamName) {
          isMatch = t.name.toLowerCase().trim() === targetTeamName.toLowerCase().trim();
        } else {
          isMatch = t.id === 'team-lessin-comic' || t.id === 'team-leesin';
        }

        if (isMatch) {
          const currentDaily = t.dailyViews || {};
          const todayDailyCount = (currentDaily[todayStr] || 0) + multiplier;
          const currentMonthStr = todayStr.slice(0, 7);
          const [y, m] = currentMonthStr.split('-');
          const slashMonth = `${parseInt(m, 10)}/${y}`;
          const currentMonthly = t.monthlyViews || {};
          const monthCount = (currentMonthly[currentMonthStr] || currentMonthly[slashMonth] || 0) + multiplier;
          return {
            ...t,
            totalViews: (t.totalViews || 0) + multiplier,
            dailyViews: {
              ...currentDaily,
              [todayStr]: todayDailyCount,
            },
            monthlyViews: {
              ...currentMonthly,
              [currentMonthStr]: monthCount,
              [slashMonth]: monthCount,
            },
            views_2026_10: currentMonthStr === '2026-10' ? monthCount : (t as any).views_2026_10,
          };
        }
        return t;
      });
      return nextTeams;
    });

    // 2. Nếu MySQL bật, đồng bộ nguyên tử (Atomic increment) với MySQL và cập nhật giá trị chuẩn từ SQL
    if (mysqlConfig.enabled) {
      try {
        const res = await incrementComicViewInMysql(
          mysqlConfig,
          chapter.comicId,
          chapter.id,
          targetTeamId,
          multiplier
        );
        if (res && res.success) {
          const freshComicViews = typeof res.views === 'number' ? res.views : undefined;
          const freshChapterViews = typeof res.chapterViews === 'number' ? res.chapterViews : undefined;

          if (freshComicViews !== undefined || freshChapterViews !== undefined) {
            setComics((prevComics) => {
              const nextComics = prevComics.map((c) => {
                if (c.id === chapter.comicId) {
                  const updatedChapters = (c.chapters || []).map((ch) =>
                    ch.id === chapter.id && freshChapterViews !== undefined ? { ...ch, views: freshChapterViews } : ch
                  );
                  const chapsSum = updatedChapters.reduce((s, ch) => s + (ch.views || 0), 0);
                  return {
                    ...c,
                    views: freshComicViews !== undefined ? Math.max(freshComicViews, chapsSum) : Math.max(c.views || 0, chapsSum),
                    chapters: updatedChapters,
                  };
                }
                return c;
              });
              return nextComics;
            });

            if (freshComicViews !== undefined) {
              setSelectedComic((prev) => (prev && prev.id === chapter.comicId ? { ...prev, views: freshComicViews } : prev));
            }
            if (freshChapterViews !== undefined) {
              setActiveChapter((prev) => (prev && prev.id === chapter.id ? { ...prev, views: freshChapterViews } : prev));
            }
          }

          if (typeof res.teamViews === 'number') {
            setTeams((prevTeams) => {
              const nextTeams = prevTeams.map((t) => {
                const isMatch =
                  (targetTeamId && (t.id === targetTeamId || t.id.toLowerCase() === targetTeamId.toLowerCase())) ||
                  (targetTeamName && t.name.toLowerCase().trim() === targetTeamName.toLowerCase().trim()) ||
                  (!targetTeamId && (t.id === 'team-leesin' || t.id === 'team-lessin-comic'));
                if (isMatch) {
                  const updatedMonthly = { ...(t.monthlyViews || {}) };
                  if (res.monthlyViews && typeof res.monthlyViews === 'object') {
                    Object.assign(updatedMonthly, res.monthlyViews);
                  }
                  if (typeof res.views_2026_10 === 'number') {
                    updatedMonthly['2026-10'] = res.views_2026_10;
                    updatedMonthly['10/2026'] = res.views_2026_10;
                  }
                  const updatedDaily = { ...(t.dailyViews || {}) };
                  if (res.dailyViews && typeof res.dailyViews === 'object') {
                    Object.assign(updatedDaily, res.dailyViews);
                  }
                  return {
                    ...t,
                    totalViews: res.teamViews!,
                    monthlyViews: updatedMonthly,
                    dailyViews: updatedDaily,
                    views_2026_10: updatedMonthly['2026-10'] || res.views_2026_10,
                  };
                }
                return t;
              });
              return nextTeams;
            });
          }
        }
      } catch (err) {
        console.warn('Lỗi gọi API tăng view SQL từ bộ máy tính view:', err);
      }
    }
  };

  const handleOpenAdmin = (pushHistory = true) => {
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushHistory) {
      try {
        window.history.pushState({ view: 'admin' }, '', '/admin');
      } catch (e) {
        console.warn(e);
      }
    }
    document.title = 'Bảng Quản Trị Hệ Thống - Leesin Comic';
  };

  const handleOpenTeamPortal = (pushHistory = true) => {
    setCurrentView('team-portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (pushHistory) {
      try {
        window.history.pushState({ view: 'team-portal' }, '', '/team-portal');
      } catch (e) {
        console.warn(e);
      }
    }
    document.title = 'Portal Nhóm Dịch - Leesin Comic';
  };

  // --- Follow / Unfollow Comic Handler ---
  const handleToggleFollow = (comicId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const targetComic = comics.find((c) => c.id === comicId);
    if (!targetComic) return;

    const isAlreadyFollowed = followedComics.some(
      (f) => f.userId === currentUser.id && f.comicId === comicId
    );

    if (isAlreadyFollowed) {
      // Unfollow
      setFollowedComics((prev) =>
        prev.filter((f) => !(f.userId === currentUser.id && f.comicId === comicId))
      );
      setComics((prev) =>
        prev.map((c) => (c.id === comicId ? { ...c, follows: Math.max(0, c.follows - 1) } : c))
      );
      if (mysqlConfig.enabled) {
        unfollowComicToMysql(mysqlConfig, currentUser.id, comicId);
      }
    } else {
      // Follow
      const latestChap = targetComic.chapters[targetComic.chapters.length - 1];
      const followItem: FollowedComicItem = {
        id: `flw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser.id,
        comicId: targetComic.id,
        comicTitle: targetComic.title,
        comicSlug: targetComic.slug,
        comicCover: targetComic.coverImage,
        latestChapterNumber: latestChap ? latestChap.chapterNumber : 1,
        latestChapterTitle: latestChap ? latestChap.title : 'Chương 1',
        followedAt: 'Vừa xong',
        teamName: targetComic.teamName,
      };

      setFollowedComics((prev) => [followItem, ...prev]);
      setComics((prev) =>
        prev.map((c) => (c.id === comicId ? { ...c, follows: c.follows + 1 } : c))
      );
      if (mysqlConfig.enabled) {
        followComicToMysql(mysqlConfig, followItem);
      }
    }
  };

  const handleUnfollowComic = (comicId: string) => {
    setFollowedComics((prev) =>
      prev.filter((f) => {
        if (currentUser) {
          return !(f.userId === currentUser.id && f.comicId === comicId);
        }
        return f.comicId !== comicId;
      })
    );
    setComics((prev) =>
      prev.map((c) => (c.id === comicId ? { ...c, follows: Math.max(0, c.follows - 1) } : c))
    );
    if (currentUser && mysqlConfig.enabled) {
      unfollowComicToMysql(mysqlConfig, currentUser.id, comicId);
    }
  };

  // --- Follow / Unfollow Team Handler ---
  const isTeamFollowed = (teamIdOrName: string): boolean => {
    if (!teamIdOrName) return false;
    const clean = teamIdOrName.trim().toLowerCase();
    return followedTeams.some(
      (f) =>
        (!f.userId || (currentUser && f.userId === currentUser.id)) &&
        (f.teamId?.toLowerCase() === clean || f.teamName?.toLowerCase() === clean)
    );
  };

  const handleToggleFollowTeam = (teamIdOrName: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const clean = teamIdOrName.trim();
    const targetTeam = teams.find(
      (t) => t.id === clean || t.name.toLowerCase() === clean.toLowerCase()
    );

    const teamIdValue = targetTeam ? targetTeam.id : clean;
    const teamNameValue = targetTeam ? targetTeam.name : clean;

    const isAlreadyFollowed = isTeamFollowed(teamIdValue) || isTeamFollowed(teamNameValue);

    if (isAlreadyFollowed) {
      // Unfollow
      setFollowedTeams((prev) =>
        prev.filter(
          (f) =>
            !(
              (f.userId === currentUser.id || !f.userId) &&
              (f.teamId?.toLowerCase() === teamIdValue.toLowerCase() ||
                f.teamName?.toLowerCase() === teamNameValue.toLowerCase())
            )
        )
      );

      // Decrement team follows count
      setTeams((prev) => {
        const updated = prev.map((t) => {
          if (t.id === teamIdValue || (t.name && t.name.toLowerCase() === teamNameValue.toLowerCase())) {
            const currentFollows = t.follows ?? t.followsCount ?? 0;
            const nextFollows = Math.max(0, currentFollows - 1);
            const updatedT = { ...t, follows: nextFollows, followsCount: nextFollows };
            if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, updatedT);
            return updatedT;
          }
          return t;
        });
        return updated;
      });

      if (mysqlConfig.enabled) {
        unfollowTeamToMysql(mysqlConfig, currentUser.id, teamIdValue);
      }
    } else {
      // Follow
      const matchedComics = comics.filter(
        (c) =>
          c.teamId === teamIdValue ||
          (c.teamName && c.teamName.toLowerCase() === teamNameValue.toLowerCase())
      );

      const followItem: FollowedTeamItem = {
        id: `flw-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser.id,
        teamId: teamIdValue,
        teamName: teamNameValue,
        teamAvatar:
          targetTeam?.avatar ||
          targetTeam?.avatarUrl ||
          'https://images.unsplash.com/photo-1563089145-599997674d42?w=200',
        teamBio: targetTeam?.bio || targetTeam?.description || '',
        leaderName: targetTeam?.leaderName || 'Admin',
        comicsCount: matchedComics.length,
        donateInfo: targetTeam?.donateInfo,
        followedAt: 'Vừa xong',
      };

      setFollowedTeams((prev) => [followItem, ...prev]);

      // Increment team follows count
      setTeams((prev) => {
        const updated = prev.map((t) => {
          if (t.id === teamIdValue || (t.name && t.name.toLowerCase() === teamNameValue.toLowerCase())) {
            const currentFollows = t.follows ?? t.followsCount ?? 0;
            const nextFollows = currentFollows + 1;
            const updatedT = { ...t, follows: nextFollows, followsCount: nextFollows };
            if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, updatedT);
            return updatedT;
          }
          return t;
        });
        return updated;
      });

      if (mysqlConfig.enabled) {
        followTeamToMysql(mysqlConfig, followItem);
      }
    }
  };

  const handleUnfollowTeam = (teamIdOrName: string) => {
    const clean = teamIdOrName.trim().toLowerCase();
    setFollowedTeams((prev) =>
      prev.filter((f) => {
        const isMatch = f.teamId?.toLowerCase() === clean || f.teamName?.toLowerCase() === clean;
        if (!isMatch) return true;
        if (currentUser) {
          return f.userId && f.userId !== currentUser.id;
        }
        return false;
      })
    );

    setTeams((prev) => {
      const updated = prev.map((t) => {
        if (t.id.toLowerCase() === clean || (t.name && t.name.toLowerCase() === clean)) {
          const currentFollows = t.follows ?? t.followsCount ?? 0;
          const nextFollows = Math.max(0, currentFollows - 1);
          const updatedT = { ...t, follows: nextFollows, followsCount: nextFollows };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, updatedT);
          return updatedT;
        }
        return t;
      });
      return updated;
    });

    if (currentUser && mysqlConfig.enabled) {
      unfollowTeamToMysql(mysqlConfig, currentUser.id, teamIdOrName);
    }
  };

  // --- Reading History Delete Handler ---
  const handleDeleteHistory = (historyId: string) => {
    setReadingHistory((prev) => {
      const updated = prev.filter((h) => h.id !== historyId);
      try {
        localStorage.setItem('leesincomic_reading_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (mysqlConfig.enabled) {
      deleteReadingHistoryFromMysql(mysqlConfig, historyId);
    }
  };

  const handleClearAllHistory = () => {
    setReadingHistory((prev) => {
      const updated = currentUser
        ? prev.filter((h) => h.userId !== currentUser.id && h.userId !== 'user-admin' && h.userId !== 'user-reader-vip' && h.userId !== 'guest')
        : [];
      try {
        localStorage.setItem('leesincomic_reading_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (currentUser && mysqlConfig.enabled) {
      const toDelete = readingHistory.filter((h) => h.userId === currentUser.id);
      toDelete.forEach((h) => deleteReadingHistoryFromMysql(mysqlConfig, h.id));
    }
  };

  // --- Live Comments Feed Handlers & Notification Engine ---
  const handleAddComment = (
    commentData: Omit<ChapterComment, 'id' | 'createdAt' | 'likes'>
  ) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    const newCommentId = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newComment: ChapterComment = {
      ...commentData,
      id: newCommentId,
      createdAt: new Date().toISOString(),
      likes: 0,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      userRole: currentUser.role || 'READER',
    };

    setComments((prev) => [newComment, ...prev]);

    if (mysqlConfig.enabled) {
      saveCommentToMysql(mysqlConfig, newComment);
    }

    // --- AUTOMATIC NOTIFICATION GENERATION ---
    const matchedComic = comics.find(
      (c) => c.id === commentData.comicId || c.slug === commentData.comicSlug
    );
    const teamId = matchedComic?.teamId || 'team-leesin';
    const teamName = matchedComic?.teamName || 'Leesin Scans';
    const comicTitle = matchedComic?.title || commentData.comicTitle || 'Truyện';
    const comicSlug = matchedComic?.slug || commentData.comicSlug || 'truyen';
    const chapNumber = commentData.chapterNumber;

    const generatedNotifications: AppNotification[] = [];

    // 1. User Reply Notification: If this comment is replying to another user's comment
    if (commentData.replyToUserId && commentData.replyToUserId !== currentUser.id) {
      generatedNotifications.push({
        id: `notif-${Date.now()}-reply-${Math.random().toString(36).slice(2, 6)}`,
        recipientUserId: commentData.replyToUserId,
        recipientRole: 'READER',
        type: 'REPLY',
        title: 'Có người vừa trả lời bạn',
        content: `${currentUser.name} đã trả lời bình luận của bạn trong "${comicTitle}" (Chap ${chapNumber}): "${commentData.content}"`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        comicId: matchedComic?.id || commentData.comicId,
        comicTitle,
        comicSlug,
        chapterId: commentData.chapterId,
        chapterNumber: chapNumber,
        commentId: newCommentId,
        parentCommentId: commentData.parentId,
        createdAt: new Date().toISOString(),
        isRead: false,
        link: `/truyen/${comicSlug || matchedComic?.id || commentData.comicId}/chap-${chapNumber}#comment-${newCommentId}`,
      });
    }

    // 2. Translation Team Notification: Sent to the translation team managing this comic
    // (Ensure team leaders receive comment notifications on their comics)
    const targetTeamObj = teams.find(
      (t) => t.id === teamId || (t.name && t.name.toLowerCase().trim() === teamName.toLowerCase().trim())
    );
    const targetLeader = users.find(
      (u) =>
        (targetTeamObj?.leaderId && u.id === targetTeamObj.leaderId) ||
        (u.teamId === teamId && (u.role === 'TEAM_LEADER' || u.role === 'ADMIN')) ||
        (u.teamName && u.teamName.toLowerCase().trim() === teamName.toLowerCase().trim() && (u.role === 'TEAM_LEADER' || u.role === 'ADMIN'))
    );
    const leaderUserId = targetLeader?.id || targetTeamObj?.leaderId || matchedComic?.uploaderId;

    const isSelfTeam =
      currentUser.teamId === teamId ||
      (currentUser.teamName && currentUser.teamName.toLowerCase().trim() === teamName.toLowerCase().trim()) ||
      (leaderUserId && currentUser.id === leaderUserId);

    if (!isSelfTeam || !commentData.replyToUserId) {
      generatedNotifications.push({
        id: `notif-${Date.now()}-team-${Math.random().toString(36).slice(2, 6)}`,
        recipientTeamId: teamId,
        recipientTeamName: teamName,
        recipientUserId: leaderUserId,
        recipientRole: 'TEAM_LEADER',
        type: 'COMMENT',
        title: `Bình luận mới về truyện "${comicTitle}"`,
        content: `${currentUser.name} vừa bình luận truyện "${comicTitle}" (Chap ${chapNumber}): "${commentData.content}"`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        comicId: matchedComic?.id || commentData.comicId,
        comicTitle,
        comicSlug,
        chapterId: commentData.chapterId,
        chapterNumber: chapNumber,
        commentId: newCommentId,
        createdAt: new Date().toISOString(),
        isRead: false,
        link: `/truyen/${comicSlug || matchedComic?.id || commentData.comicId}/chap-${chapNumber}#comment-${newCommentId}`,
      });
    }

    // 3. Admin Notification: Thông báo cho Ban Quản Trị hệ thống
    if (currentUser.role !== 'ADMIN' && leaderUserId !== 'user-admin') {
      generatedNotifications.push({
        id: `notif-${Date.now()}-admin-${Math.random().toString(36).slice(2, 6)}`,
        recipientRole: 'ADMIN',
        recipientUserId: 'user-admin',
        type: 'COMMENT',
        title: `Bình luận mới trên truyện "${comicTitle}"`,
        content: `${currentUser.name} vừa bình luận truyện "${comicTitle}" (Nhóm ${teamName}, Chap ${chapNumber}): "${commentData.content}"`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        comicId: matchedComic?.id || commentData.comicId,
        comicTitle,
        comicSlug,
        chapterId: commentData.chapterId,
        chapterNumber: chapNumber,
        commentId: newCommentId,
        createdAt: new Date().toISOString(),
        isRead: false,
        link: `/truyen/${comicSlug || matchedComic?.id || commentData.comicId}/chap-${chapNumber}#comment-${newCommentId}`,
      });
    }

    if (generatedNotifications.length > 0) {
      if (mysqlConfig.enabled) {
        Promise.all(generatedNotifications.map((notif) => saveNotificationToMysql(mysqlConfig, notif))).then(() => {
          syncNotificationsFromBackend();
          notifyOtherTabsNotificationChange();
        });
      }
    }
  };

  const handleLikeComment = (commentId: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );
    if (mysqlConfig.enabled) {
      likeCommentToMysql(mysqlConfig, commentId);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setNotifications((prev) => prev.filter((n) => n.commentId !== commentId));
    if (mysqlConfig.enabled) {
      deleteCommentFromMysql(mysqlConfig, commentId).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  // --- Notification Center Handlers ---
  const handleMarkNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    if (mysqlConfig.enabled) {
      markNotificationReadInMysql(mysqlConfig, notificationId).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (mysqlConfig.enabled) {
      markAllNotificationsReadInMysql(mysqlConfig, {
        userId: currentUser.id,
        teamId: currentUser.teamId,
        teamName: currentUser.teamName,
        role: currentUser.role,
      }).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (mysqlConfig.enabled) {
      deleteNotificationFromMysql(mysqlConfig, notificationId).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  const handleClearAllNotifications = () => {
    if (!currentUser) return;
    setNotifications([]);
    if (mysqlConfig.enabled) {
      clearAllNotificationsInMysql(mysqlConfig, {
        userId: currentUser.id,
        teamId: currentUser.teamId,
        teamName: currentUser.teamName,
        role: currentUser.role,
      }).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  const handleSelectNotification = (notif: AppNotification) => {
    handleMarkNotificationAsRead(notif.id);
    const targetCommentId = notif.commentId || notif.parentCommentId || null;
    
    // Reset first then set to guarantee re-triggering highlight scroll effect even if clicking same comment
    setHighlightedCommentId(null);
    setTimeout(() => {
      setHighlightedCommentId(targetCommentId);
    }, 60);

    if (notif.title === 'Yêu cầu cấp lại mật khẩu' || notif.title?.includes('cấp lại mật khẩu') || notif.link === '/admin') {
      if (currentUser?.role === 'ADMIN') {
        const cleanAccount = (notif.senderName || notif.senderId || '').trim();
        const contentMatch = notif.content?.match(/Tài khoản "([^"]+)"/);
        const targetAccount = (contentMatch ? contentMatch[1] : cleanAccount).trim();

        let matched = users.find(
          (u) =>
            u.id.toLowerCase() === targetAccount.toLowerCase() ||
            u.id.toLowerCase() === notif.senderId?.toLowerCase() ||
            (u.username && u.username.toLowerCase() === targetAccount.toLowerCase()) ||
            (u.email && u.email.toLowerCase() === targetAccount.toLowerCase()) ||
            (u.name && u.name.toLowerCase() === targetAccount.toLowerCase())
        );

        if (!matched && targetAccount) {
          matched = {
            id: notif.senderId && !notif.senderId.startsWith('guest') ? notif.senderId : `user-${Date.now()}`,
            name: notif.senderName || targetAccount,
            username: targetAccount.includes('@') ? targetAccount.split('@')[0] : targetAccount,
            email: targetAccount.includes('@') ? targetAccount : `${targetAccount}@leesincomic.com`,
            role: 'READER',
            avatar: notif.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            canUpload: false,
          };
        }

        setAdminInitialTab('notifications');
        setAdminResetTargetUser(matched ? { ...matched, _resetNonce: Date.now() } as any : null);
        handleOpenAdmin();
        return;
      }
    }

    // Lookup comment in memory to resolve comic and chapter if not present in notification object
    const targetComment = comments.find(
      (c) =>
        (targetCommentId && c.id === targetCommentId) ||
        (notif.commentId && c.id === notif.commentId) ||
        (notif.parentCommentId && c.id === notif.parentCommentId)
    );

    const comicId = (notif.comicId || targetComment?.comicId || '').trim();
    const comicSlug = (notif.comicSlug || targetComment?.comicSlug || '').trim().toLowerCase();
    const comicTitle = (notif.comicTitle || targetComment?.comicTitle || '').trim().toLowerCase();
    const chapterId = notif.chapterId || targetComment?.chapterId;
    const chapterNumber =
      notif.chapterNumber !== undefined && notif.chapterNumber !== null
        ? Number(notif.chapterNumber)
        : targetComment?.chapterNumber !== undefined && targetComment?.chapterNumber !== null
        ? Number(targetComment.chapterNumber)
        : undefined;

    if (comicSlug || comicId || comicTitle) {
      const cleanId = comicId.toLowerCase();
      const cleanWithoutPrefix = cleanId.replace(/^comic-/, '');

      const foundComic = comics.find(
        (c) =>
          (comicSlug && (c.slug?.toLowerCase() === comicSlug || c.id.toLowerCase() === comicSlug)) ||
          (cleanId &&
            (c.id.toLowerCase() === cleanId ||
              c.slug?.toLowerCase() === cleanId ||
              c.id.toLowerCase().replace(/^comic-/, '') === cleanWithoutPrefix)) ||
          (comicTitle && c.title.toLowerCase() === comicTitle)
      );

      if (foundComic) {
        let foundChap: Chapter | undefined = undefined;
        if (foundComic.chapters && foundComic.chapters.length > 0) {
          if (chapterId) {
            foundChap = foundComic.chapters.find((ch) => ch.id === chapterId);
          }
          if (!foundChap && chapterNumber !== undefined && !isNaN(chapterNumber)) {
            foundChap = foundComic.chapters.find((ch) => Number(ch.chapterNumber) === chapterNumber);
          }
        }

        if (foundChap) {
          // Navigate to chapter reader without smooth scrolling to top so it can scroll directly to the comment
          handleReadChapter(foundChap, true, false);
          return;
        }

        // Navigate to comic detail without instant scrolling to top
        handleSelectComic(foundComic, true, false, false);
        return;
      }
    }
  };

  const handleSendNotification = (notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev]);
    if (mysqlConfig.enabled) {
      saveNotificationToMysql(mysqlConfig, notif).then(() => {
        notifyOtherTabsNotificationChange();
      });
    }
  };

  const handleQuickReplyFromNotification = (
    notif: AppNotification,
    replyText: string
  ) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (notif.type === 'SYSTEM' || notif.title === 'Yêu cầu cấp lại mật khẩu' || notif.title?.includes('cấp lại mật khẩu')) {
      const contentMatch = notif.content?.match(/Tài khoản "([^"]+)"/);
      const targetAccount = (contentMatch ? contentMatch[1] : notif.senderName || notif.senderId || '').trim();
      const matched = users.find(
        (u) =>
          u.id.toLowerCase() === notif.senderId?.toLowerCase() ||
          (u.username && u.username.toLowerCase() === targetAccount.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === targetAccount.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === targetAccount.toLowerCase())
      );

      const replyNotif: AppNotification = {
        id: `notif-sys-reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recipientUserId: matched?.id || (notif.senderId && !notif.senderId.startsWith('guest') ? notif.senderId : targetAccount),
        recipientRole: matched?.role || 'READER',
        type: 'SYSTEM',
        title: 'Phản hồi từ Ban Quản Trị (Admin)',
        content: replyText.trim(),
        senderId: currentUser.id,
        senderName: 'Ban Quản Trị (Admin)',
        senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setNotifications((prev) => [replyNotif, ...prev]);
      if (mysqlConfig.enabled) {
        saveNotificationToMysql(mysqlConfig, replyNotif).then(() => {
          notifyOtherTabsNotificationChange();
        });
      }

      handleMarkNotificationAsRead(notif.id);
      return;
    }

    const matchedComic = comics.find(
      (c) =>
        (notif.comicSlug && c.slug?.toLowerCase() === notif.comicSlug.toLowerCase()) ||
        (notif.comicId && c.id === notif.comicId)
    );

    const comicId = matchedComic?.id || notif.comicId || 'comic-1';
    const comicTitle = matchedComic?.title || notif.comicTitle || 'Truyện';
    const comicSlug = matchedComic?.slug || notif.comicSlug || 'truyen';
    const chapterNumber = notif.chapterNumber !== undefined ? notif.chapterNumber : 1;
    const foundChap = matchedComic?.chapters?.find((ch) => ch.chapterNumber === chapterNumber);
    const chapterTitle = foundChap?.title || `Chương ${chapterNumber}`;
    const coverImage = matchedComic?.coverImage;

    handleAddComment({
      comicId,
      comicTitle,
      comicSlug,
      chapterId: foundChap?.id || `chap-${chapterNumber}`,
      chapterNumber,
      chapterTitle,
      coverImage,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: currentUser.role,
      content: replyText.trim(),
      parentId: notif.commentId || notif.parentCommentId,
      replyToUserId: notif.senderId,
      replyToUserName: notif.senderName,
    });

    handleMarkNotificationAsRead(notif.id);
  };

  // Navigate to comic chapter from comment
  const handleNavigateToChapter = (comicSlug: string, chapterNumber: number) => {
    const foundComic = comics.find(
      (c) => c.slug?.toLowerCase() === comicSlug.toLowerCase() || c.id === comicSlug
    );
    if (foundComic) {
      const foundChap = foundComic.chapters.find((ch) => ch.chapterNumber === chapterNumber);
      if (foundChap) {
        handleReadChapter(foundChap);
      } else {
        handleSelectComic(foundComic);
      }
    }
  };

  // Ref to track if initial deep-link route resolution has been performed
  const initialRouteResolvedRef = useRef<boolean>(false);
  const teamsRef = useRef<ScanTeam[]>(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  // URL Path Resolver for direct URL links and Browser Back/Forward buttons
  useEffect(() => {
    const resolveCurrentRoute = (comicList: Comic[]) => {
      let pathname = window.location.pathname;

      if ((!pathname || pathname === '/' || pathname === '/index.html') && window.location.hash.startsWith('#/')) {
        pathname = window.location.hash.replace('#', '');
      }

      const cleanPath = pathname.replace(/\/+$/, '') || '/';

      if (cleanPath === '/' || cleanPath === '/index.html') {
        if (!initialRouteResolvedRef.current) {
          handleNavigateHome(false, false);
        }
        return;
      }

      if (cleanPath === '/admin') {
        handleOpenAdmin(false);
        return;
      }

      if (cleanPath === '/team-portal' || cleanPath === '/portal-nhom-dich') {
        handleOpenTeamPortal(false);
        return;
      }

      if (cleanPath === '/lich-su') {
        handleNavigateLibrary('history', false, false);
        return;
      }

      if (cleanPath === '/theo-doi') {
        handleNavigateLibrary('following', false, false);
        return;
      }

      if (cleanPath === '/hot' || cleanPath === '/truyen-hot') {
        handleNavigateCategory('hot', '', false, false);
        return;
      }

      if (cleanPath === '/moi-cap-nhat') {
        handleNavigateCategory('latest', '', false, false);
        return;
      }

      // Match /xep-hang or /xep-hang/:tab
      const rankingMatch = cleanPath.match(/^\/xep-hang(?:\/([a-zA-Z0-9_-]+))?$/i);
      if (rankingMatch) {
        const tab = (rankingMatch[1] as 'day' | 'week' | 'month') || 'month';
        handleNavigateCategory('ranking', tab, false, false);
        return;
      }

      // Match /the-loai or /the-loai/:slug
      const genreMatch = cleanPath.match(/^\/the-loai(?:\/([a-zA-Z0-9_\u00C0-\u1EF9%-]+))?$/i);
      if (genreMatch) {
        const slug = genreMatch[1] ? decodeURIComponent(genreMatch[1]).toLowerCase() : 'tat-ca';
        const mappedGenre = GENRE_SLUG_MAP[slug] || (slug === 'tat-ca' ? 'Tất cả' : slug.replace(/-/g, ' '));
        handleNavigateCategory('genre', mappedGenre, false, false);
        return;
      }

      // Match /tim-kiem
      if (cleanPath === '/tim-kiem') {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || '';
        handleNavigateCategory('search', q, false, false);
        return;
      }

      // Match /nhom-dich-all or /nhom-dich (directory of all translation teams)
      if (cleanPath === '/nhom-dich-all' || cleanPath === '/nhom-dich') {
        handleNavigateTeams(null, false, false);
        return;
      }

      // Match /nhom-dich/:idOrSlug
      const teamMatch = cleanPath.match(/^\/nhom-dich(?:\/([^/]+))?$/i);
      if (teamMatch && teamMatch[1]) {
        const teamParam = decodeURIComponent(teamMatch[1]).trim();
        if (teamParam.toLowerCase() === 'all') {
          handleNavigateTeams(null, false, false);
          return;
        }
        const currentTeams = teamsRef.current.length > 0 ? teamsRef.current : (teams.length > 0 ? teams : INITIAL_TEAMS);
        const lowerParam = teamParam.toLowerCase();
        let foundTeam = currentTeams.find(
          (t) =>
            t.id?.toLowerCase() === lowerParam ||
            t.slug?.toLowerCase() === lowerParam ||
            toSlug(t.slug || '').toLowerCase() === lowerParam ||
            toSlug(t.name || '').toLowerCase() === lowerParam ||
            t.name?.toLowerCase() === lowerParam
        );

        if (!foundTeam) {
          const currentComics = comicList.length > 0 ? comicList : (comics.length > 0 ? comics : INITIAL_COMICS);
          const matchComic = currentComics.find(
            (c) => c.teamName && (toSlug(c.teamName) === lowerParam || c.teamName.toLowerCase() === lowerParam)
          );
          if (matchComic && matchComic.teamName) {
            foundTeam = {
              id: matchComic.teamId || `team-${toSlug(matchComic.teamName)}`,
              name: matchComic.teamName,
              slug: toSlug(matchComic.teamName),
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
              bio: `Nhóm dịch ${matchComic.teamName}`,
              leaderId: 'system',
              leaderName: matchComic.teamName,
              members: [],
              monthlyViews: {},
              dailyViews: {},
              totalViews: 0,
            };
          }
        }

        handleNavigateTeams(foundTeam || null, false, false);
        return;
      }

      // Match /truyen/:slug or /truyen/:slug/chap-:num
      const truyenMatch = cleanPath.match(/^\/truyen\/([^/]+)(?:\/(?:chap|chuong|chapter)?-?(\d+))?$/i);
      if (truyenMatch) {
        const rawSlug = decodeURIComponent(truyenMatch[1]);
        const chapNum = truyenMatch[2] ? parseInt(truyenMatch[2], 10) : null;

        const foundComic = comicList.find(
          (c) => c.slug?.toLowerCase() === rawSlug.toLowerCase() || c.id === rawSlug
        );

        if (foundComic) {
          if (chapNum !== null) {
            const foundChap = (foundComic.chapters || []).find((ch) => ch.chapterNumber === chapNum);
            if (foundChap) {
              setSelectedComic(foundComic);
              setActiveChapter(foundChap);
              setCurrentView('reader');
              updateSeoMeta({
                title: `${foundComic.title} - ${foundChap.title} - Leesin Comic`,
                description: `Đọc truyện tranh ${foundComic.title} ${foundChap.title} online tại Leesin Comic.`,
                image: foundComic.coverImage,
                url: window.location.href,
                type: 'article',
              });
              return;
            }
          }
          handleSelectComic(foundComic, false, false);
          if (mysqlConfig.enabled) {
            fetchComicFromMysql(mysqlConfig, rawSlug).then((fresh) => {
              if (fresh && fresh.chapters && fresh.chapters.length > (foundComic.chapters?.length || 0)) {
                setSelectedComic(fresh);
                setComics((prev) => prev.map((c) => (c.id === fresh.id || c.slug === fresh.slug ? fresh : c)));
              }
            });
          }
          return;
        } else if (mysqlConfig.enabled) {
          fetchComicFromMysql(mysqlConfig, rawSlug).then((fresh) => {
            if (fresh) {
              setComics((prev) => [fresh, ...prev.filter((c) => c.id !== fresh.id)]);
              if (chapNum !== null) {
                const foundChap = (fresh.chapters || []).find((ch) => ch.chapterNumber === chapNum);
                if (foundChap) {
                  setSelectedComic(fresh);
                  setActiveChapter(foundChap);
                  setCurrentView('reader');
                  return;
                }
              }
              handleSelectComic(fresh, false, false);
            } else if (!initialRouteResolvedRef.current) {
              handleNavigateHome(false, false);
            }
          });
          return;
        }
      }

      if (!initialRouteResolvedRef.current) {
        handleNavigateHome(false, false);
      }
    };

    // Chỉ tự động phân giải URL lần đầu khi load trang (hoặc khi danh sách truyện nạp xong)
    // Tuyệt đối không reset trang về Home mỗi khi có chapter mới được xuất bản!
    if (!initialRouteResolvedRef.current && (comics.length > 0 || window.location.pathname !== '/')) {
      initialRouteResolvedRef.current = true;
      resolveCurrentRoute(comics);
    }

    const onPopState = () => {
      resolveCurrentRoute(comics);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [comics]);

  // Handler: Add new chapter from Team Portal
  const handleAddChapter = (comicId: string, newChapter: Chapter) => {
    let comicToSave: Comic | null = null;
    const nowIso = new Date().toISOString();
    const normalizedNewChapter: Chapter = {
      ...newChapter,
      createdAt: (!newChapter.createdAt || newChapter.createdAt === 'Vừa xong') ? nowIso : newChapter.createdAt,
      updatedAt: (!newChapter.updatedAt || newChapter.updatedAt === 'Vừa xong') ? nowIso : newChapter.updatedAt,
    };

    const cleanId = String(comicId || '').trim();
    const withoutPrefix = cleanId.replace(/^comic-/, '');
    const withPrefix = cleanId.startsWith('comic-') ? cleanId : `comic-${cleanId}`;

    setComics((prevComics) => {
      const otherComics: Comic[] = [];
      let updatedTarget: Comic | null = null;

      for (const c of prevComics) {
        if (c.id === cleanId || c.slug === cleanId || c.id === withPrefix || c.slug === withoutPrefix) {
          const existingChapters = (c.chapters || []).filter(
            (ch) => ch.id !== normalizedNewChapter.id && Number(ch.chapterNumber) !== Number(normalizedNewChapter.chapterNumber)
          );
          const updatedChapters = [...existingChapters, normalizedNewChapter].sort(
            (a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0)
          );
          const updated = {
            ...c,
            updatedAt: nowIso,
            chapters: updatedChapters,
          };
          updatedTarget = updated;
          comicToSave = updated;
        } else {
          otherComics.push(c);
        }
      }

      const nextComics = updatedTarget ? [updatedTarget, ...otherComics] : prevComics;
      saveComicsToCache(nextComics);
      return nextComics;
    });

    setSelectedComic((prev) => {
      if (!prev) return prev;
      const isTarget = prev.id === cleanId || prev.slug === cleanId || prev.id === withPrefix || prev.slug === withoutPrefix;
      if (!isTarget) return prev;
      const existingChapters = (prev.chapters || []).filter(
        (ch) => ch.id !== normalizedNewChapter.id && Number(ch.chapterNumber) !== Number(normalizedNewChapter.chapterNumber)
      );
      const updatedChapters = [...existingChapters, normalizedNewChapter].sort(
        (a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0)
      );
      return {
        ...prev,
        updatedAt: nowIso,
        chapters: updatedChapters,
      };
    });

    // Update team stats an toàn tuyệt đối (tránh undefined members làm crash màn hình đen)
    setTeams((prevTeams) => {
      const nextTeams = prevTeams.map((t) => {
        if (t.id === normalizedNewChapter.teamId) {
          const membersList = Array.isArray(t.members) ? t.members : [];
          const updatedMembers = membersList.map((m) =>
            m.id === currentUser?.id
              ? { ...m, uploadedChaptersCount: (m.uploadedChaptersCount || 0) + 1 }
              : m
          );
          return { ...t, members: updatedMembers };
        }
        return t;
      });

      return nextTeams;
    });

    // Tác vụ mạng MySQL tách rời khỏi setState để bảo đảm an toàn
    if (mysqlConfig.enabled) {
      saveChapterToMysql(mysqlConfig, normalizedNewChapter)
        .then(async (savedOk) => {
          if (!savedOk && comicToSave) {
            await saveComicToMysql(mysqlConfig, comicToSave, true);
          }
          await syncCoreDataFromMysql(true);
          notifySqlDataChange();
        })
        .catch((err) => console.warn('Lỗi lưu chapter MySQL:', err));

      // Tạo notification cho độc giả theo dõi truyện và Admin
      const targetComic = comics.find((c) => c.id === comicId);
      const comicTitle = targetComic?.title || newChapter.comicTitle || 'Truyện';
      const comicSlug = targetComic?.slug || '';
      const chapNum = newChapter.chapterNumber;
      const teamName = newChapter.teamName || targetComic?.teamName || 'Nhóm dịch';

      const newNotifs: AppNotification[] = [];

      // Gửi thông báo chương mới cho độc giả theo dõi
      const comicFollowers = followedComics.filter((f) => f.comicId === comicId && f.userId && f.userId !== currentUser?.id);
      comicFollowers.forEach((f) => {
        newNotifs.push({
          id: `notif-chap-${Date.now()}-${f.userId}-${Math.random().toString(36).slice(2, 6)}`,
          recipientUserId: f.userId,
          recipientRole: 'READER',
          type: 'NEW_CHAPTER',
          title: `Chương mới: ${comicTitle}`,
          content: `Truyện "${comicTitle}" bạn theo dõi vừa có Chap ${chapNum} mới do ${teamName} đăng tải!`,
          senderId: currentUser?.id || newChapter.teamId,
          senderName: teamName,
          senderAvatar: currentUser?.avatar || targetComic?.coverImage,
          comicId,
          comicTitle,
          comicSlug,
          chapterNumber: chapNum,
          createdAt: new Date().toISOString(),
          isRead: false,
          link: `/truyen/${comicSlug || comicId}/chap-${chapNum}`,
        });
      });

      // Thông báo chương mới cho toàn bộ độc giả
      newNotifs.push({
        id: `notif-chap-all-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recipientRole: 'READER',
        type: 'NEW_CHAPTER',
        title: `Chương mới: ${comicTitle}`,
        content: `Truyện "${comicTitle}" vừa ra mắt Chap ${chapNum} mới do ${teamName} đăng tải!`,
        senderId: currentUser?.id || newChapter.teamId,
        senderName: teamName,
        senderAvatar: currentUser?.avatar || targetComic?.coverImage,
        comicId,
        comicTitle,
        comicSlug,
        chapterNumber: chapNum,
        createdAt: new Date().toISOString(),
        isRead: false,
        link: `/truyen/${comicSlug || comicId}/chap-${chapNum}`,
      });

      // Thông báo cho Ban Quản Trị (Admin)
      if (currentUser?.role !== 'ADMIN') {
        newNotifs.push({
          id: `notif-chap-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipientRole: 'ADMIN',
          recipientUserId: 'user-admin',
          type: 'NEW_CHAPTER',
          title: `Nhóm ${teamName} vừa cập nhật chương`,
          content: `${currentUser?.name || teamName} vừa đăng Chap ${chapNum} của truyện "${comicTitle}".`,
          senderId: currentUser?.id || newChapter.teamId,
          senderName: currentUser?.name || teamName,
          senderAvatar: currentUser?.avatar || targetComic?.coverImage,
          comicId,
          comicTitle,
          comicSlug,
          chapterNumber: chapNum,
          createdAt: new Date().toISOString(),
          isRead: false,
          link: `/truyen/${comicSlug || comicId}/chap-${chapNum}`,
        });
      }

      if (newNotifs.length > 0) {
        Promise.all(newNotifs.map((n) => saveNotificationToMysql(mysqlConfig, n))).then(() => {
          syncNotificationsFromBackend();
          notifyOtherTabsNotificationChange();
        });
      }
    }
  };

  // Handler: Update an existing Chapter (Edit chapter title, number, password, images)
  const handleUpdateChapter = (comicId: string, updatedChapter: Chapter) => {
    const editIso = updatedChapter.updatedAt || new Date().toISOString();
    const cleanId = String(comicId || '').trim();
    const withoutPrefix = cleanId.replace(/^comic-/, '');
    const withPrefix = cleanId.startsWith('comic-') ? cleanId : `comic-${cleanId}`;

    // Tìm truyện mục tiêu và chương hiện tại đồng bộ ngay từ đầu
    const targetComic = comics.find(
      (c) => c.id === cleanId || c.slug === cleanId || c.id === withPrefix || c.slug === withoutPrefix
    );
    const existingChap = targetComic?.chapters?.find(
      (ch) => ch.id === updatedChapter.id || Number(ch.chapterNumber) === Number(updatedChapter.chapterNumber)
    );

    // Đảm bảo gán đầy đủ comicId, comicTitle và mảng images vào payload lưu
    const finalChapterToSave: Chapter = {
      ...updatedChapter,
      id: updatedChapter.id || existingChap?.id || `chap-${Date.now()}`,
      comicId: cleanId || targetComic?.id || updatedChapter.comicId,
      comicTitle: targetComic?.title || updatedChapter.comicTitle || '',
      chapterNumber: Number(updatedChapter.chapterNumber) || 1,
      images: Array.isArray(updatedChapter.images) ? updatedChapter.images : [],
      createdAt: existingChap?.createdAt || updatedChapter.createdAt || editIso,
      updatedAt: editIso,
    };

    let comicToSave: Comic | null = null;

    setComics((prevComics) => {
      const nextComics = prevComics.map((c) => {
        if (c.id === cleanId || c.slug === cleanId || c.id === withPrefix || c.slug === withoutPrefix) {
          const existsById = (c.chapters || []).some((ch) => ch.id === finalChapterToSave.id);
          const updatedChapters = (c.chapters || [])
            .map((ch) => {
              if (existsById ? ch.id === finalChapterToSave.id : Number(ch.chapterNumber) === Number(finalChapterToSave.chapterNumber)) {
                return finalChapterToSave;
              }
              return ch;
            })
            .sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
          const updatedComic = { ...c, chapters: updatedChapters, updatedAt: editIso };
          comicToSave = updatedComic;
          return updatedComic;
        }
        return c;
      });

      saveComicsToCache(nextComics);
      return nextComics;
    });

    if (mysqlConfig.enabled) {
      saveChapterToMysql(mysqlConfig, finalChapterToSave)
        .then(async (savedOk) => {
          if (!savedOk && (comicToSave || targetComic)) {
            await saveComicToMysql(mysqlConfig, (comicToSave || targetComic)!, true);
          }
          await syncCoreDataFromMysql(true);
          notifySqlDataChange();
        })
        .catch((err) => console.warn('Lỗi lưu chapter sửa MySQL:', err));
    }

    if (selectedComic && (selectedComic.id === cleanId || selectedComic.slug === cleanId || selectedComic.id === withPrefix || selectedComic.slug === withoutPrefix)) {
      setSelectedComic((prev) => {
        if (!prev) return null;
        const existsById = (prev.chapters || []).some((ch) => ch.id === finalChapterToSave.id);
        const updatedChapters = (prev.chapters || [])
          .map((ch) =>
            (existsById ? ch.id === finalChapterToSave.id : Number(ch.chapterNumber) === Number(finalChapterToSave.chapterNumber))
              ? finalChapterToSave
              : ch
          )
          .sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
        return {
          ...prev,
          updatedAt: editIso,
          chapters: updatedChapters,
        };
      });
    }
  };

  // Handler: Delete a Chapter
  const handleDeleteChapter = (comicId: string, chapterId: string) => {
    let comicToSave: Comic | null = null;

    setComics((prevComics) => {
      const nextComics = prevComics.map((c) => {
        if (c.id === comicId) {
          const updatedChapters = (c.chapters || []).filter((ch) => ch.id !== chapterId);
          const updatedComic = { ...c, chapters: updatedChapters };
          comicToSave = updatedComic;
          return updatedComic;
        }
        return c;
      });

      saveComicsToCache(nextComics);
      return nextComics;
    });

    if (mysqlConfig.enabled) {
      deleteChapterFromMysql(mysqlConfig, chapterId)
        .then(async () => {
          await syncCoreDataFromMysql();
          notifySqlDataChange();
        })
        .catch((err) => console.warn(err));
    }
  };

  // Handler: Update an existing Comic (Edit title, authors, genres, cover, summary, status)
  const handleUpdateComic = async (updatedComic: Comic) => {
    setComics((prev) => {
      const next = prev.map((c) => (c.id === updatedComic.id ? updatedComic : c));
      saveComicsToCache(next);
      setTeams((prevTeams) => syncTeamsWithComicsList(prevTeams, next));
      return next;
    });
    if (selectedComic && selectedComic.id === updatedComic.id) {
      setSelectedComic(updatedComic);
    }
    if (mysqlConfig.enabled) {
      try {
        await saveComicToMysql(mysqlConfig, updatedComic, false);
        await syncCoreDataFromMysql();
        notifySqlDataChange();
      } catch (err) {
        console.error('Lỗi cập nhật truyện vào MySQL:', err);
      }
    }
  };

  // Handler: Add new Comic
  const handleAddNewComic = async (newComic: Comic) => {
    setComics((prev) => {
      const next = [newComic, ...prev];
      saveComicsToCache(next);
      setTeams((prevTeams) => syncTeamsWithComicsList(prevTeams, next));
      return next;
    });
    if (mysqlConfig.enabled) {
      try {
        const saved = await saveComicToMysql(mysqlConfig, newComic, true);
        if (!saved) {
          console.error('Không thể lưu truyện mới vào MySQL server!');
        } else {
          await syncCoreDataFromMysql();
          notifySqlDataChange();
        }
      } catch (err) {
        console.error('Lỗi khi thêm truyện mới vào MySQL:', err);
      }
    }
  };

  // Handler: Delete single Comic (synchronize team views and platform total)
  const handleDeleteComic = (comicId: string) => {
    setComics((prev) => {
      const next = prev.filter((c) => c.id !== comicId);
      saveComicsToCache(next);
      setTeams((prevTeams) => syncTeamsWithComicsList(prevTeams, next));
      return next;
    });
    if (selectedComic && selectedComic.id === comicId) {
      setSelectedComic(null);
      setCurrentView('home');
    }
    if (mysqlConfig.enabled) {
      deleteComicFromMysql(mysqlConfig, comicId).then(async () => {
        await syncCoreDataFromMysql();
        notifySqlDataChange();
      });
    }
  };

  // Handler: Clear all demo/sample comics
  const handleClearDemoComics = () => {
    setComics([]);
    saveComicsToCache([]);
    setTeams((prevTeams) => syncTeamsWithComicsList(prevTeams, []));
    if (mysqlConfig.enabled) {
      clearAllComicsFromMysql(mysqlConfig);
    }
  };

  // Handler: Restore sample comics
  const handleRestoreSampleComics = () => {
    setComics(INITIAL_COMICS);
    saveComicsToCache(INITIAL_COMICS);
    setTeams((prevTeams) => syncTeamsWithComicsList(prevTeams, INITIAL_COMICS));
    if (mysqlConfig.enabled) {
      INITIAL_COMICS.forEach((c) => saveComicToMysql(mysqlConfig, c));
    }
  };

  // Handler: Add new User from Admin
  const handleAddNewUser = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    if ((newUser.role === 'TEAM_LEADER' || newUser.role === 'ADMIN') && newUser.teamName) {
      setTeams((prevTeams) => {
        const teamId = newUser.teamId || (newUser.role === 'ADMIN' ? 'team-leesin' : `team-${newUser.id}`);
        const exists = prevTeams.some((t) => t.id === teamId || t.name.toLowerCase() === newUser.teamName!.toLowerCase());
        if (!exists) {
          const newTeam: ScanTeam = {
            id: teamId,
            name: newUser.teamName!,
            slug: toSlug(newUser.teamName!),
            avatar: newUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            bio: `Nhóm dịch ${newUser.teamName!}`,
            leaderId: newUser.id,
            leaderName: newUser.name,
            members: [],
            monthlyViews: {},
            dailyViews: {},
            totalViews: 0,
          };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, newTeam);
          return [...prevTeams, newTeam];
        }
        return prevTeams;
      });
    }
    if (mysqlConfig.enabled) {
      saveUserToMysql(mysqlConfig, newUser);
    }
  };

  // Handler: Update User Role from Admin
  const handleUpdateUserRole = (userId: string, newRole: User['role'], teamId?: string, teamName?: string) => {
    let updatedUserObj: User | null = null;
    let oldTeamName: string | undefined;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          oldTeamName = u.teamName;
          const isTeamOrAdmin = newRole === 'TEAM_LEADER' || newRole === 'ADMIN';
          updatedUserObj = {
            ...u,
            role: newRole,
            teamId: isTeamOrAdmin ? (teamId || u.teamId || (newRole === 'ADMIN' ? 'team-leesin' : `team-${u.id}`)) : undefined,
            teamName: isTeamOrAdmin ? (teamName || u.teamName || (newRole === 'ADMIN' ? 'Leesin Scans' : `${u.name} Team`)) : undefined,
            canUpload: newRole !== 'READER',
          };
          return updatedUserObj;
        }
        return u;
      })
    );

    if ((newRole === 'TEAM_LEADER' || newRole === 'ADMIN') && teamName) {
      setTeams((prevTeams) => {
        const effectiveTeamId = teamId || (newRole === 'ADMIN' ? 'team-leesin' : `team-${userId}`);
        const idx = prevTeams.findIndex(
          (t) => t.id === effectiveTeamId || (oldTeamName && t.name.toLowerCase() === oldTeamName.toLowerCase())
        );
        if (idx >= 0) {
          const updated = [...prevTeams];
          updated[idx] = {
            ...updated[idx],
            name: teamName,
            slug: toSlug(teamName),
          };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, updated[idx]);
          return updated;
        } else {
          const newTeam: ScanTeam = {
            id: effectiveTeamId,
            name: teamName,
            slug: toSlug(teamName),
            avatar: updatedUserObj?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            bio: `Nhóm dịch ${teamName}`,
            leaderId: userId,
            leaderName: updatedUserObj?.name || 'Trưởng nhóm',
            members: [],
            monthlyViews: {},
            dailyViews: {},
            totalViews: 0,
          };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, newTeam);
          return [...prevTeams, newTeam];
        }
      });

      // Also update any comics associated with this team if teamName changed
      if (oldTeamName && oldTeamName !== teamName) {
        setComics((prev) =>
          prev.map((c) => {
            if ((teamId && c.teamId === teamId) || c.teamName?.toLowerCase() === oldTeamName?.toLowerCase()) {
              const updatedC = { ...c, teamName };
              if (mysqlConfig.enabled) saveComicToMysql(mysqlConfig, updatedC);
              return updatedC;
            }
            return c;
          })
        );
      }
    }

    if (updatedUserObj && mysqlConfig.enabled) {
      saveUserToMysql(mysqlConfig, updatedUserObj);
    }

    if (currentUser?.id === userId && updatedUserObj) {
      setCurrentUser(updatedUserObj);
      localStorage.setItem('leesincomic_current_user', JSON.stringify(updatedUserObj));
    }
  };

  // Handler: Delete user from Admin
  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    if (targetUser) {
      setTeams((prevTeams) => {
        const nextTeams = prevTeams.filter((t) => {
          const isUserTeam =
            t.leaderId === userId ||
            (targetUser.teamId && t.id === targetUser.teamId) ||
            (targetUser.teamName && t.name.toLowerCase().trim() === targetUser.teamName.toLowerCase().trim());
          if (isUserTeam && mysqlConfig.enabled) {
            deleteTeamFromMysql(mysqlConfig, t.id);
          }
          return !isUserTeam;
        });
        return nextTeams;
      });
    }

    if (mysqlConfig.enabled) {
      deleteUserFromMysql(mysqlConfig, userId);
    }
  };

  // Handler: Real-time re-fetch all entities from MySQL API
  const handleRefreshAdminData = async () => {
    if (!mysqlConfig.enabled) return;
    try {
      const [remoteComics, remoteTeams, remoteUsers] = await Promise.all([
        fetchComicsFromMysql(mysqlConfig),
        fetchTeamsFromMysql(mysqlConfig),
        fetchUsersFromMysql(mysqlConfig),
      ]);
      if (remoteComics !== null && Array.isArray(remoteComics)) {
        const normalizedComics = remoteComics.map((c) => ({
          ...c,
          views: typeof c.views === 'number' ? c.views : (Number(c.views) || 0),
        }));
        setComics(normalizedComics);
      }
      if (remoteTeams !== null && Array.isArray(remoteTeams)) {
        setTeams(remoteTeams);
      }
      if (remoteUsers !== null && Array.isArray(remoteUsers)) {
        setUsers(remoteUsers);
      }
    } catch (e) {
      console.warn('Lỗi refresh data từ MySQL:', e);
    }
  };

  // Handler: Update current user profile (Avatar, Name, Password, TeamName)
  const handleUpdateProfile = (updatedData: { name: string; avatar: string; password?: string; teamName?: string }) => {
    if (!currentUser) return;
    const latestUser = users.find(
      (u) =>
        u.id === currentUser.id ||
        (u.email && currentUser.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
    );
    const effectiveRole = latestUser?.role || currentUser.role;
    const effectiveTeamId = latestUser?.teamId || currentUser.teamId;
    const effectiveCanUpload = latestUser?.canUpload ?? currentUser.canUpload;

    const oldTeamName = latestUser?.teamName || currentUser.teamName;
    const newTeamName = updatedData.teamName !== undefined ? updatedData.teamName : oldTeamName;

    const isTeamOrAdmin = effectiveRole === 'TEAM_LEADER' || effectiveRole === 'ADMIN';

    const cleanAvatar = (updatedData.avatar || '').trim() || currentUser.avatar;

    const updatedUser: User = {
      ...currentUser,
      ...latestUser,
      name: updatedData.name.trim(),
      avatar: cleanAvatar,
      role: effectiveRole,
      teamId: isTeamOrAdmin ? (effectiveTeamId || (effectiveRole === 'ADMIN' ? 'team-leesin' : `team-${currentUser.id}`)) : undefined,
      teamName: isTeamOrAdmin ? (newTeamName || (effectiveRole === 'ADMIN' ? 'Leesin Scans' : `${updatedData.name} Team`)) : undefined,
      canUpload: effectiveCanUpload,
      ...(updatedData.password ? { password: updatedData.password } : {}),
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('leesincomic_current_user', JSON.stringify(updatedUser));
    } catch (e) {}

    setUsers((prevUsers) => {
      const exists = prevUsers.some((u) => u.id === updatedUser.id);
      if (exists) {
        return prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      }
      return [...prevUsers, updatedUser];
    });

    if (isTeamOrAdmin && newTeamName && newTeamName !== oldTeamName) {
      setTeams((prev) => {
        const teamId = updatedUser.teamId || (effectiveRole === 'ADMIN' ? 'team-leesin' : `team-${currentUser.id}`);
        const idx = prev.findIndex(
          (t) => t.id === teamId || (oldTeamName && t.name.toLowerCase() === oldTeamName.toLowerCase())
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            name: newTeamName,
            slug: toSlug(newTeamName),
          };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, updated[idx]);
          return updated;
        } else {
          const newTeam: ScanTeam = {
            id: teamId,
            name: newTeamName,
            slug: toSlug(newTeamName),
            avatar: cleanAvatar,
            bio: `Nhóm dịch ${newTeamName}`,
            leaderId: currentUser.id,
            leaderName: updatedData.name || currentUser.name,
            members: [],
            monthlyViews: {},
            dailyViews: {},
            totalViews: 0,
          };
          if (mysqlConfig.enabled) saveTeamToMysql(mysqlConfig, newTeam);
          return [...prev, newTeam];
        }
      });

      setComics((prev) =>
        prev.map((c) => {
          if (
            (currentUser.teamId && c.teamId === currentUser.teamId) ||
            (oldTeamName && c.teamName?.toLowerCase() === oldTeamName.toLowerCase())
          ) {
            const updatedC = { ...c, teamName: newTeamName };
            if (mysqlConfig.enabled) saveComicToMysql(mysqlConfig, updatedC);
            return updatedC;
          }
          return c;
        })
      );
    }

    if (cleanAvatar && cleanAvatar !== currentUser.avatar) {
      setComments((prev) =>
        prev.map((c) => (c.userId === currentUser.id ? { ...c, userAvatar: cleanAvatar } : c))
      );
    }

    if (mysqlConfig.enabled) {
      saveUserToMysql(mysqlConfig, updatedUser)
        .then(() => {
          notifySqlDataChange({
            userId: updatedUser.id,
            username: updatedUser.username,
            userAvatar: cleanAvatar,
          });
          syncCoreDataFromMysql(true);
        })
        .catch((err) => console.warn('Lỗi lưu user vào MySQL:', err));
    }
  };

  // Handler: Admin Reset Password for Scan Team Leaders & Readers
  const handleAdminResetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    const cleanPass = newPassword.trim();
    if (!cleanPass) return false;

    let targetUser: User | null = null;
    setUsers((prev) => {
      const nextUsers = prev.map((u) => {
        if (u.id === userId) {
          targetUser = {
            ...u,
            password: cleanPass,
            passwordHash: undefined,
          };
          return targetUser;
        }
        return u;
      });
      return nextUsers;
    });

    if (mysqlConfig.enabled) {
      try {
        const u = targetUser || users.find((item) => item.id === userId);
        const identifier = (u as any)?.username || (u as any)?.email || userId;
        await resetPasswordInMysql(mysqlConfig, identifier, cleanPass, '888888');
        if (u) {
          await saveUserToMysql(mysqlConfig, { ...u, password: cleanPass, passwordHash: undefined });
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ mật khẩu lên MySQL:', err);
      }
    }

    if (currentUser?.id === userId) {
      const updatedCurr = { ...currentUser, password: cleanPass, passwordHash: undefined };
      setCurrentUser(updatedCurr);
      try {
        localStorage.setItem('leesincomic_current_user', JSON.stringify(updatedCurr));
      } catch (e) {}
    }

    return true;
  };

  // Handler: Reset Password (Admin & user workflow)
  const handleResetPassword = (email: string, newPassword: string): boolean => {
    let updated = false;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.email?.toLowerCase() === email.toLowerCase() || u.username?.toLowerCase() === email.toLowerCase()) {
          updated = true;
          return { ...u, password: newPassword, passwordHash: undefined };
        }
        return u;
      })
    );

    if (mysqlConfig.enabled) {
      resetPasswordInMysql(mysqlConfig, email, newPassword, '888888');
    }

    return updated;
  };

  // Handler: Gửi thông báo yêu cầu cấp lại mật khẩu tới Admin
  const handleSendPasswordResetNotification = async (account: string, note?: string): Promise<boolean> => {
    const cleanAccount = account.trim();
    let currentUsers = users;
    if (mysqlConfig.enabled) {
      try {
        const remoteUsers = await fetchUsersFromMysql(mysqlConfig);
        if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          currentUsers = remoteUsers;
        }
      } catch (e) {}
    }

    const matchedUser = currentUsers.find((u) => {
      const uName = (u.username || '').toLowerCase();
      const uMail = (u.email || '').toLowerCase();
      const target = cleanAccount.toLowerCase();
      return uName === target || uMail === target || u.id === target;
    });

    const notifId = `notif-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNotif: AppNotification = {
      id: notifId,
      recipientRole: 'ADMIN',
      type: 'SYSTEM',
      title: 'Yêu cầu cấp lại mật khẩu',
      content: `Tài khoản "${cleanAccount}"${matchedUser ? ` (${matchedUser.name} - ${matchedUser.role === 'TEAM_LEADER' ? 'Nhóm dịch: ' + (matchedUser.teamName || matchedUser.name) : 'Độc giả'})` : ''} đã gửi yêu cầu cấp lại mật khẩu.${note ? ` Ghi chú: ${note}` : ''}`,
      senderId: matchedUser?.id || `guest-${cleanAccount}`,
      senderName: cleanAccount,
      senderAvatar: matchedUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      createdAt: new Date().toISOString(),
      isRead: false,
      link: '/admin',
    };

    setNotifications((prev) => [newNotif, ...prev]);
    if (mysqlConfig.enabled) {
      try {
        await saveNotificationToMysql(mysqlConfig, newNotif);
        notifyOtherTabsNotificationChange();
      } catch (err) {
        console.warn('Lỗi lưu thông báo vào MySQL:', err);
      }
    }

    return true;
  };

  // Handler: Update Site Settings
  const handleUpdateSiteSettings = (newSettings: SiteSettings, skipSaveToMysql: boolean = false) => {
    setSiteSettings(newSettings);
    try {
      localStorage.setItem('leesincomic_site_settings', JSON.stringify(newSettings));
    } catch (e) {}
    if (!skipSaveToMysql && mysqlConfig.enabled) {
      saveSiteSettingsToMysql(mysqlConfig, newSettings);
    }
  };

  // Determine active team for portal
  const activeTeam: ScanTeam = (() => {
    const userTeamName = currentUser?.teamName;
    const userTeamId = currentUser?.teamId;
    const userName = currentUser?.name;

    const found = teams.find(
      (t) =>
        (userTeamId && t.id === userTeamId) ||
        (userTeamName && t.name.toLowerCase().trim() === userTeamName.toLowerCase().trim()) ||
        (userName && t.leaderName?.toLowerCase().trim() === userName.toLowerCase().trim()) ||
        (userName && t.name.toLowerCase().trim() === userName.toLowerCase().trim())
    );

    const teamComics = comics.filter(
      (c) =>
        (userTeamId && c.teamId === userTeamId) ||
        (userTeamName && c.teamName?.toLowerCase().trim() === userTeamName.toLowerCase().trim()) ||
        (userName && c.teamName?.toLowerCase().trim() === userName.toLowerCase().trim()) ||
        (found && (c.teamId === found.id || (c.teamName && found.name && c.teamName.toLowerCase().trim() === found.name.toLowerCase().trim())))
    );

    const realTotalViews = Math.max(
      found?.totalViews || 0,
      teamComics.reduce((sum, c) => {
        const chapsSum = (c.chapters || []).reduce((chSum, ch) => chSum + (ch.views || 0), 0);
        return sum + Math.max(c.views || 0, chapsSum);
      }, 0)
    );

    if (found) {
      const base = userTeamName && found.name !== userTeamName
        ? { ...found, name: userTeamName }
        : found;
      return {
        ...base,
        bio: base.bio || base.description || '',
        description: base.description || base.bio || '',
        donateInfo: base.donateInfo || '',
        donateQr: base.donateQr || '',
        avatarUrl: base.avatarUrl || base.avatar || '',
        totalViews: realTotalViews,
      };
    }
    return {
      id: userTeamId || `team-${currentUser?.id || 'custom'}`,
      name: userTeamName || currentUser?.name || teams[0]?.name || 'Nhóm Dịch Của Tôi',
      slug: toSlug(userTeamName || currentUser?.name || 'nhom-dich'),
      avatar: currentUser?.avatar || teams[0]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      avatarUrl: currentUser?.avatar || teams[0]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: `Nhóm dịch của ${currentUser?.name || 'trưởng nhóm'}`,
      description: `Nhóm dịch của ${currentUser?.name || 'trưởng nhóm'}`,
      donateInfo: '',
      donateQr: '',
      leaderId: currentUser?.id || 'leader',
      leaderName: currentUser?.name || 'Trưởng Nhóm',
      members: [],
      monthlyViews: {},
      dailyViews: {},
      totalViews: realTotalViews,
    };
  })();

  // Handler: Update Scan Team Profile (Bio, Description, Donate Info, QR)
  const handleUpdateTeamProfile = (updatedFields: Partial<ScanTeam>) => {
    setTeams((prevTeams) => {
      const targetId = activeTeam.id;
      const exists = prevTeams.some((t) => t.id === targetId);
      let nextTeams: ScanTeam[];
      if (exists) {
        nextTeams = prevTeams.map((t) =>
          t.id === targetId
            ? {
                ...t,
                ...updatedFields,
                bio: updatedFields.bio !== undefined ? updatedFields.bio : (updatedFields.description !== undefined ? updatedFields.description : t.bio),
                description: updatedFields.description !== undefined ? updatedFields.description : (updatedFields.bio !== undefined ? updatedFields.bio : t.description),
              }
            : t
        );
      } else {
        const newTeamItem: ScanTeam = {
          ...activeTeam,
          ...updatedFields,
          bio: updatedFields.bio || updatedFields.description || activeTeam.bio,
          description: updatedFields.description || updatedFields.bio || activeTeam.description,
        };
        nextTeams = [...prevTeams, newTeamItem];
      }
      return nextTeams;
    });

    // Save to MySQL database if enabled
    if (mysqlConfig.enabled) {
      const teamToSave: ScanTeam = {
        ...activeTeam,
        ...updatedFields,
        bio: updatedFields.bio || updatedFields.description || activeTeam.bio,
        description: updatedFields.description || updatedFields.bio || activeTeam.description,
      };
      saveTeamToMysql(mysqlConfig, teamToSave);
    }
  };

  const isCurrentComicFollowed =
    Boolean(selectedComic && currentUser && followedComics.some(
      (f) => f.userId === currentUser.id && f.comicId === selectedComic.id
    ));

  return (
    <div id="leesincomic-app" className="min-h-screen flex flex-col bg-[#0f1117] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] relative">
      
      {/* Top Loading Progress Bar (F5-style reload indicator) */}
      {isPageNavigating && (
        <div id="page-reload-indicator" className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-slate-900/60 overflow-hidden pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 animate-nprogress shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
        </div>
      )}

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        siteSettings={siteSettings}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        onSelectNotification={handleSelectNotification}
        onQuickReply={handleQuickReplyFromNotification}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={() => setCurrentUser(null)}
        onNavigateHome={() => handleNavigateHome()}
        onSelectGenre={handleSelectGenre}
        onNavigateHot={handleNavigateHot}
        onNavigateRanking={handleNavigateRanking}
        onNavigateTeams={() => handleNavigateTeams()}
        onNavigateHistory={() => handleNavigateLibrary('history')}
        onNavigateFollowing={() => handleNavigateLibrary('following')}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        onOpenAdmin={() => handleOpenAdmin()}
        onOpenTeamPortal={() => handleOpenTeamPortal()}
        onSelectComic={handleSelectComic}
        allComics={comics}
        currentView={currentView}
        libraryTab={libraryInitialTab}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 ${currentView === 'admin' ? 'max-w-[1720px] 2xl:max-w-[1850px]' : 'max-w-7xl'}`}>
        
        {/* VIEW 1: Homepage */}
        {currentView === 'home' && (
          <HomeView
            comics={comics}
            currentUser={currentUser}
            teams={teams}
            comments={comments}
            siteSettings={siteSettings}
            onSelectComic={handleSelectComic}
            onViewTeam={(team) => handleNavigateTeams(team)}
            onOpenTeamPortal={() => handleOpenTeamPortal()}
            onNavigateToCategory={handleNavigateCategory}
            onNavigateToChapter={handleNavigateToChapter}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onDeleteComment={handleDeleteComment}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            selectedGenre={selectedGenre}
            onSelectGenre={handleSelectGenre}
            selectedRankingTab={selectedRankingTab}
            onSelectRankingTab={setSelectedRankingTab}
          />
        )}

        {/* VIEW 2: Dedicated Category & Ranking & Search Pages */}
        {currentView === 'category' && (
          <CategoryView
            key={`category-${categoryPageType}-${categoryPageParam}`}
            comics={comics}
            siteSettings={siteSettings}
            pageType={categoryPageType}
            param={categoryPageParam}
            onSelectComic={handleSelectComic}
            onNavigateHome={() => handleNavigateHome()}
            onNavigateCategory={handleNavigateCategory}
          />
        )}

        {/* VIEW 3: User Library (Reading History, Followed Comics & Followed Teams) */}
        {currentView === 'library' && (
          <UserLibraryView
            key={`user-library-${libraryInitialTab}`}
            currentUser={currentUser}
            historyItems={readingHistory}
            followedItems={followedComics}
            followedTeams={followedTeams}
            allTeams={teams}
            allComics={comics}
            initialTab={libraryInitialTab}
            onTabChange={(tab) => handleNavigateLibrary(tab, true)}
            onSelectComic={(comicId) => {
              const c = comics.find((item) => item.id === comicId);
              if (c) handleSelectComic(c);
            }}
            onReadChapter={(comicId, chapId, chapNum) => {
              const c = comics.find((item) => item.id === comicId || item.slug === comicId);
              if (c) {
                const chap =
                  c.chapters.find((ch) => ch.id === chapId) ||
                  (chapNum !== undefined ? c.chapters.find((ch) => Number(ch.chapterNumber) === Number(chapNum)) : undefined) ||
                  c.chapters[0];
                if (chap) {
                  handleReadChapter(chap);
                } else {
                  handleSelectComic(c);
                }
              }
            }}
            onDeleteHistory={handleDeleteHistory}
            onClearHistory={handleClearAllHistory}
            onUnfollowComic={handleUnfollowComic}
            onUnfollowTeam={handleUnfollowTeam}
            onSelectTeam={(team) => {
              handleNavigateTeams(team);
            }}
            onNavigateTeams={() => handleNavigateTeams(null)}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            onNavigateHome={() => handleNavigateHome()}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        )}

        {/* VIEW 4: Comic Detail */}
        {currentView === 'comic-detail' && selectedComic && (
          <ComicDetailView
            comic={selectedComic}
            team={
              teams.find(t => t.id === selectedComic.teamId || t.name.toLowerCase() === (selectedComic.teamName || '').toLowerCase() || t.slug?.toLowerCase() === toSlug(selectedComic.teamName || '').toLowerCase()) ||
              (selectedComic.teamName === activeTeam.name ? activeTeam : undefined) ||
              (selectedComic.teamName ? {
                id: selectedComic.teamId || `team-${toSlug(selectedComic.teamName)}`,
                name: selectedComic.teamName,
                slug: toSlug(selectedComic.teamName),
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                bio: `Nhóm dịch ${selectedComic.teamName}`,
                leaderId: 'system',
                leaderName: selectedComic.teamName,
                members: [],
                monthlyViews: {},
                dailyViews: {},
                totalViews: 0,
              } : undefined)
            }
            currentUser={currentUser}
            siteSettings={siteSettings}
            onBack={() => {
              const prev = previousView;
              setPreviousView(null);
              if (prev === 'team-portal') {
                handleOpenTeamPortal(true);
              } else if (prev === 'admin') {
                handleOpenAdmin(true);
              } else if (prev === 'teams') {
                handleNavigateTeams(selectedTeamForView, true, false);
              } else if (prev === 'category') {
                handleNavigateCategory(categoryPageType, categoryPageParam, true, false);
              } else if (prev === 'library') {
                handleNavigateLibrary(libraryInitialTab, true, false);
              } else {
                handleNavigateHome(true, false);
              }
            }}
            backLabel={
              previousView === 'team-portal'
                ? 'Quay lại Portal Nhóm Dịch'
                : previousView === 'admin'
                ? 'Quay lại Bảng Quản Trị'
                : previousView === 'teams'
                ? (selectedTeamForView ? `Quay lại Nhóm ${selectedTeamForView.name}` : 'Quay lại Danh Sách Nhóm Dịch')
                : previousView === 'category'
                ? (categoryPageType === 'genre'
                    ? `Quay lại Thể Loại ${categoryPageParam}`
                    : categoryPageType === 'hot'
                    ? 'Quay lại Truyện Hot'
                    : categoryPageType === 'ranking'
                    ? 'Quay lại Bảng Xếp Hạng'
                    : categoryPageType === 'latest'
                    ? 'Quay lại Mới Cập Nhật'
                    : `Quay lại Tìm Kiếm`)
                : previousView === 'library'
                ? (libraryInitialTab === 'following' ? 'Quay lại Truyện Đang Theo Dõi' : 'Quay lại Lịch Sử Đọc')
                : 'Quay lại Trang Chủ'
            }
            onReadChapter={handleReadChapter}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            isFollowed={isCurrentComicFollowed}
            onToggleFollow={handleToggleFollow}
            comments={comments}
            highlightedCommentId={highlightedCommentId}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onDeleteComment={handleDeleteComment}
            isTeamFollowed={selectedComic.teamId ? isTeamFollowed(selectedComic.teamId) : (selectedComic.teamName ? isTeamFollowed(selectedComic.teamName) : false)}
            onToggleFollowTeam={handleToggleFollowTeam}
            onViewTeam={(team) => {
              handleNavigateTeams(team);
            }}
            onSelectGenre={handleSelectGenre}
          />
        )}

        {/* VIEW 5: Manga Webtoon Reader */}
        {currentView === 'reader' && selectedComic && activeChapter && (
          <ReaderView
            comic={selectedComic}
            chapter={activeChapter}
            team={
              teams.find(t => t.id === (activeChapter.teamId || selectedComic.teamId) || t.name.toLowerCase() === ((activeChapter.teamName || selectedComic.teamName) || '').toLowerCase() || t.slug?.toLowerCase() === toSlug((activeChapter.teamName || selectedComic.teamName) || '').toLowerCase()) ||
              (selectedComic.teamName === activeTeam.name ? activeTeam : undefined) ||
              ((activeChapter.teamName || selectedComic.teamName) ? {
                id: activeChapter.teamId || selectedComic.teamId || `team-${toSlug(activeChapter.teamName || selectedComic.teamName || '')}`,
                name: activeChapter.teamName || selectedComic.teamName || '',
                slug: toSlug(activeChapter.teamName || selectedComic.teamName || ''),
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                bio: `Nhóm dịch ${activeChapter.teamName || selectedComic.teamName}`,
                leaderId: 'system',
                leaderName: activeChapter.teamName || selectedComic.teamName || '',
                members: [],
                monthlyViews: {},
                dailyViews: {},
                totalViews: 0,
              } : undefined)
            }
            currentUser={currentUser}
            siteSettings={siteSettings}
            onBackToComic={() => handleSelectComic(selectedComic)}
            onSelectChapter={(chap) => handleReadChapter(chap)}
            onRequireLogin={() => setIsLoginModalOpen(true)}
            onChapterViewCounted={handleCountChapterView}
            comments={comments}
            highlightedCommentId={highlightedCommentId}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onDeleteComment={handleDeleteComment}
            onUpdateChapterImages={(chapterId, imgs) => {
              setActiveChapter((prev) => (prev && prev.id === chapterId ? { ...prev, images: imgs } : prev));
              setSelectedComic((prev) => {
                if (!prev || !prev.chapters) return prev;
                return {
                  ...prev,
                  chapters: prev.chapters.map((ch) => (ch.id === chapterId ? { ...ch, images: imgs } : ch)),
                };
              });
              setComics((prevComics) =>
                prevComics.map((c) => {
                  if (!c.chapters) return c;
                  const hasChap = c.chapters.some((ch) => ch.id === chapterId);
                  if (!hasChap) return c;
                  return {
                    ...c,
                    chapters: c.chapters.map((ch) => (ch.id === chapterId ? { ...ch, images: imgs } : ch)),
                  };
                })
              );
            }}
            isTeamFollowed={activeChapter.teamId ? isTeamFollowed(activeChapter.teamId) : (selectedComic.teamId ? isTeamFollowed(selectedComic.teamId) : (selectedComic.teamName ? isTeamFollowed(selectedComic.teamName) : false))}
            onToggleFollowTeam={handleToggleFollowTeam}
            onViewTeam={(team) => {
              handleNavigateTeams(team);
            }}
          />
        )}

        {/* VIEW 6: Admin Dashboard */}
        {currentView === 'admin' && (
          currentUser?.role === 'ADMIN' ? (
            <AdminDashboard
              currentUser={currentUser}
              teams={teams}
              comics={comics}
              users={users}
              comments={comments}
              notifications={notifications}
              onDeleteComment={handleDeleteComment}
              onClose={() => handleNavigateHome()}
              onSelectComic={handleSelectComic}
              onReadChapter={(comic, chap) => handleReadChapter(chap)}
              watermarkText={watermarkText}
              setWatermarkText={setWatermarkText}
              watermarkOpacity={watermarkOpacity}
              setWatermarkOpacity={setWatermarkOpacity}
              imageServerConfig={imageServerConfig}
              setImageServerConfig={setImageServerConfig}
              mysqlConfig={mysqlConfig}
              setMysqlConfig={setMysqlConfig}
              siteSettings={siteSettings}
              onUpdateSiteSettings={handleUpdateSiteSettings}
              onAddNewComic={handleAddNewComic}
              onUpdateComic={handleUpdateComic}
              onDeleteComic={handleDeleteComic}
              onClearDemoComics={handleClearDemoComics}
              onRestoreSampleComics={handleRestoreSampleComics}
              onAddNewUser={handleAddNewUser}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              onResetUserPassword={handleAdminResetUserPassword}
              onRefreshData={handleRefreshAdminData}
              initialTab={adminInitialTab}
              targetResetUser={adminResetTargetUser}
              onMarkNotificationAsRead={handleMarkNotificationAsRead}
              onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
              onDeleteNotification={handleDeleteNotification}
              onSendNotification={handleSendNotification}
              onQuickReplyNotification={handleQuickReplyFromNotification}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 bg-[#141822] border border-rose-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl font-bold">
                🔒
              </div>
              <h3 className="text-xl font-bold text-white">Yêu Cầu Quyền Quản Trị Viên (Admin)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Khu vực này chỉ dành riêng cho Admin tối cao của Leesin Comic (leesincomic.com). Thành viên đọc truyện hoặc nhóm dịch không được phép truy cập vào bảng quản trị này.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handleNavigateHome()}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Quay lại Trang Chủ
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
                >
                  Đăng Nhập Tài Khoản Admin
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 7: Scanlation Team Portal */}
        {currentView === 'team-portal' && (
          (currentUser?.role === 'TEAM_LEADER' || currentUser?.role === 'ADMIN') ? (
            <TeamPortal
              currentUser={currentUser}
              team={activeTeam}
              comics={comics}
              siteSettings={siteSettings}
              onAddChapter={handleAddChapter}
              onAddNewComic={handleAddNewComic}
              onUpdateComic={handleUpdateComic}
              onDeleteComic={currentUser?.role === 'ADMIN' ? handleDeleteComic : undefined}
              onUpdateChapter={handleUpdateChapter}
              onDeleteChapter={handleDeleteChapter}
              onSelectComic={handleSelectComic}
              onReadChapter={(comic, chap) => handleReadChapter(chap)}
              onUpdateTeamName={(newName) =>
                handleUpdateProfile({
                  name: currentUser.name,
                  avatar: currentUser.avatar,
                  teamName: newName,
                })
              }
              onUpdateTeamProfile={handleUpdateTeamProfile}
              onClose={() => handleNavigateHome()}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkLogoUrl={siteSettings.watermarkLogoUrl || siteSettings.watermark?.logoUrl || siteSettings.logoUrl}
              watermarkPosition={siteSettings.watermarkPosition || siteSettings.watermark?.position || 'bottom-right'}
              imageServerConfig={imageServerConfig}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 bg-[#141822] border border-emerald-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl font-bold">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-white">Yêu Cầu Quyền Nhóm Dịch Thuật</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tài khoản độc giả thông thường chỉ có quyền đọc truyện tranh. Để đăng truyện, chỉnh sửa truyện hoặc sửa các chương đã up lên, bạn cần đăng nhập với tài khoản Nhóm Dịch hoặc Admin.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handleNavigateHome()}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Quay lại Trang Chủ Đọc Truyện
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Đăng Nhập Tài Khoản Nhóm Dịch
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 8: Teams Directory */}
        {currentView === 'teams' && (
          <TeamsView
            teams={teams}
            comics={comics}
            siteSettings={siteSettings}
            onSelectComic={handleSelectComic}
            initialSelectedTeam={selectedTeamForView}
            onSelectTeam={(team) => {
              handleNavigateTeams(team);
            }}
            followedTeamIds={followedTeams.map((f) => f.teamId || f.teamName)}
            followedTeams={followedTeams}
            isTeamFollowed={isTeamFollowed}
            onToggleFollowTeam={handleToggleFollowTeam}
          />
        )}

      </main>

      {/* Direct Homepage Login / Register Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        users={users}
        mysqlConfig={mysqlConfig}
        onSelectUser={(user) => {
          if (user) {
            const fresh =
              users.find(
                (u) =>
                  u.id === user.id ||
                  (u.email && user.email && u.email.trim().toLowerCase() === user.email.trim().toLowerCase())
              ) || user;
            setCurrentUser(fresh);
            try {
              localStorage.setItem('leesincomic_current_user', JSON.stringify(fresh));
            } catch (e) {}
            syncNotificationsFromBackend(fresh);
          } else {
            setCurrentUser(null);
            setNotifications([]);
            try {
              localStorage.removeItem('leesincomic_current_user');
            } catch (e) {}
          }
        }}
        onRegisterUser={(newUser) => {
          handleAddNewUser(newUser);
          setCurrentUser(newUser);
          try {
            localStorage.setItem('leesincomic_current_user', JSON.stringify(newUser));
          } catch (e) {}
          syncNotificationsFromBackend(newUser);
        }}
        onResetPassword={handleResetPassword}
        onRequestPasswordReset={handleSendPasswordResetNotification}
      />

      {/* User Profile Settings & Password Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Footer */}
      <Footer
        currentUser={currentUser}
        siteSettings={siteSettings}
        onOpenAdmin={() => handleOpenAdmin()}
        onOpenTeamPortal={() => handleOpenTeamPortal()}
        onRequireLogin={() => setIsLoginModalOpen(true)}
        onUpdateSiteSettings={handleUpdateSiteSettings}
        mysqlConfig={mysqlConfig}
      />

    </div>
  );
}
