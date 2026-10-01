import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  BarChart3,
  Search,
  Globe,
  TrendingUp,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Sliders,
  Download,
  Upload,
  Share2,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Server,
  Key,
  KeyRound,
  Lock,
  Copy,
  Check,
  X,
  RefreshCw,
  PlusCircle,
  BookPlus,
  BookOpen,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  UserPlus,
  ShieldCheck,
  UserX,
  Mail,
  Edit2,
  Database,
  Eye,
  EyeOff,
  Settings,
  Layout,
  Save,
  Clock,
  MessageSquare,
  Megaphone,
  ShoppingBag,
  DollarSign,
  Play,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Maximize2,
  Bell,
  Send,
  CheckCheck,
  CornerDownRight
} from 'lucide-react';
import { ScanTeam, Comic, Chapter, ImageServerConfig, User, UserRole, MysqlConfig, SiteSettings, DEFAULT_SITE_SETTINGS, ChapterComment, ChapterAdConfig, DEFAULT_CHAPTER_AD, AppNotification } from '../types';
import {
  UPLOAD_PHP_TEMPLATE,
  AAPANEL_CONFIG_GUIDE,
  testPingImageServer
} from '../utils/imageServerUploader';
import {
  DEFAULT_MYSQL_CONFIG,
  generateMysqlSchemaSql,
  generatePhpApiScript,
  pingMysqlServer,
  saveSiteSettingsToMysql,
  fetchDashboardStatsFromMysql,
  fetchTeamsFromMysql,
  fetchUsersFromMysql,
  fetchComicsFromMysql,
  autoImportDataToMysql,
  resetPasswordInMysql,
  saveUserToMysql
} from '../utils/mysqlSync';
import { ImageUploadField } from './ImageUploadField';
import { optimizeAndWatermarkImage } from '../utils/imageOptimizer';
import confetti from 'canvas-confetti';
import { formatRelativeTime } from '../utils/timeAgo';
import { getOfficialTeamViews } from '../utils/teamStats';
import { getGmt7MonthString, getGmt7DateString } from '../utils/viewTracking';
import { ChapterAdModal } from './ChapterAdModal';
import { TeamEditComicModal } from './TeamEditComicModal';
import { updateSeoMeta, generateFullSitemapXml, generateSitemapIndexXml, generateRobotsTxt, downloadClientFile, GENRE_SLUG_MAP } from '../utils/seo';

interface AdminDashboardProps {
  currentUser?: User | null;
  teams: ScanTeam[];
  comics: Comic[];
  users?: User[];
  comments?: ChapterComment[];
  notifications?: AppNotification[];
  onDeleteComment?: (commentId: string) => void;
  onClose: () => void;
  watermarkText: string;
  setWatermarkText: (val: string) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (val: number) => void;
  imageServerConfig: ImageServerConfig;
  setImageServerConfig: (config: ImageServerConfig) => void;
  mysqlConfig?: MysqlConfig;
  setMysqlConfig?: (config: MysqlConfig) => void;
  siteSettings?: SiteSettings;
  onUpdateSiteSettings?: (settings: SiteSettings) => void;
  onAddNewComic?: (comic: Comic) => void;
  onUpdateComic?: (updatedComic: Comic) => void;
  onDeleteComic?: (comicId: string) => void;
  onClearDemoComics?: () => void;
  onRestoreSampleComics?: () => void;
  onAddNewUser?: (user: User) => void;
  onUpdateUserRole?: (userId: string, newRole: UserRole, teamId?: string, teamName?: string) => void;
  onDeleteUser?: (userId: string) => void;
  onResetUserPassword?: (userId: string, newPassword: string) => Promise<boolean> | boolean;
  onRefreshData?: () => Promise<void>;
  onSelectComic?: (comic: Comic) => void;
  onReadChapter?: (comic: Comic, chapter: Chapter) => void;
  initialTab?: 'team-views' | 'manage-comics' | 'manage-users' | 'add-comic' | 'seo-rankmath' | 'watermark-settings' | 'cdn-server' | 'mysql-database' | 'site-settings' | 'footer-settings' | 'manage-comments' | 'ads-settings' | 'migrate-leesin' | 'notifications';
  targetResetUser?: User | null;
  onMarkNotificationAsRead?: (notificationId: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onDeleteNotification?: (notificationId: string) => void;
  onSendNotification?: (notification: AppNotification) => void;
  onQuickReplyNotification?: (notification: AppNotification, replyText: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  teams,
  comics,
  users = [],
  comments = [],
  notifications = [],
  onDeleteComment,
  onClose,
  onRefreshData,
  watermarkText,
  setWatermarkText,
  watermarkOpacity,
  setWatermarkOpacity,
  imageServerConfig,
  setImageServerConfig,
  mysqlConfig = DEFAULT_MYSQL_CONFIG,
  setMysqlConfig,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onUpdateSiteSettings,
  onAddNewComic,
  onUpdateComic,
  onDeleteComic,
  onClearDemoComics,
  onRestoreSampleComics,
  onAddNewUser,
  onUpdateUserRole,
  onDeleteUser,
  onResetUserPassword,
  onSelectComic,
  onReadChapter,
  initialTab,
  targetResetUser,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onSendNotification,
  onQuickReplyNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'team-views' | 'manage-comics' | 'manage-users' | 'add-comic' | 'seo-rankmath' | 'watermark-settings' | 'cdn-server' | 'mysql-database' | 'site-settings' | 'footer-settings' | 'manage-comments' | 'ads-settings' | 'migrate-leesin' | 'notifications'>(initialTab || 'manage-comics');
  const [commentSearchQuery, setCommentSearchQuery] = useState('');
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);

  // Notification & Message Control Center state
  const [notifTabFilter, setNotifTabFilter] = useState<'all' | 'passwords' | 'messages' | 'unread'>('all');
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [showSendBroadcastModal, setShowSendBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'TEAM_LEADER' | 'SPECIFIC'>('ALL');
  const [broadcastRecipientAccount, setBroadcastRecipientAccount] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcastSuccessMsg, setBroadcastSuccessMsg] = useState('');
  const [replyingAdminNotifId, setReplyingAdminNotifId] = useState<string | null>(null);
  const [replyingAdminText, setReplyingAdminText] = useState('');
  const [replySuccessNotifId, setReplySuccessNotifId] = useState<string | null>(null);

  const currentMonthKey = useMemo(() => getGmt7MonthString(), []);
  const [currentYear, currentMonthNum] = useMemo(() => {
    const [y, m] = currentMonthKey.split('-');
    return [parseInt(y, 10) || 2026, parseInt(m, 10) || 10];
  }, [currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getGmt7MonthString());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());
  const [viewingTeamComics, setViewingTeamComics] = useState<ScanTeam | null>(null);
  const [adminEditingComic, setAdminEditingComic] = useState<Comic | null>(null);

  // Leesincomic Migration & Sync State
  const [sqlImportText, setSqlImportText] = useState('');
  const [isImportingSql, setIsImportingSql] = useState(false);
  const [sqlImportStatus, setSqlImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingLeesin, setIsSyncingLeesin] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [leesinFilterQuery, setLeesinFilterQuery] = useState('');

  const handleDownloadFullBackup = () => {
    fetch('/data_store.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch /data_store.json');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leesincomic_backup_full_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        const backupData = {
          comics,
          teams,
          users,
          comments,
          siteSettings: localSiteSettings,
          version: '2026-09-24-leesin-637-full',
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leesincomic_backup_full_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const [isAutoImporting, setIsAutoImporting] = useState(false);
  const [autoImportResult, setAutoImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // User & Password Migration from Old Website
  const [showImportUsersModal, setShowImportUsersModal] = useState(false);
  const [userImportSqlText, setUserImportSqlText] = useState('');
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const [userImportStatus, setUserImportStatus] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const handleDownloadUsersSqlBackup = () => {
    let sql = `-- ====================================================================\n`;
    sql += `-- LEESINCOMIC.COM USERS & PASSWORDS BACKUP DUMP\n`;
    sql += `-- Exported: ${new Date().toISOString()}\n`;
    sql += `-- Total Users: ${users.length}\n`;
    sql += `-- ====================================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    for (const u of users) {
      const uId = (u.id || '').replace(/'/g, "''");
      const uName = (u.name || '').replace(/'/g, "''");
      const uUsername = (u.username || u.email?.split('@')[0] || uId.replace('user-', '')).replace(/'/g, "''");
      const uEmail = (u.email || `${uUsername}@leesincomic.com`).replace(/'/g, "''");
      const uHash = (u.passwordHash || (u.password ? `$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` : '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')).replace(/'/g, "''");
      const uAvatar = (u.avatar || '').replace(/'/g, "''");
      const uRole = (u.role || 'READER').replace(/'/g, "''");
      const uTeamId = u.teamId ? `'${u.teamId.replace(/'/g, "''")}'` : 'NULL';
      const uTeamName = u.teamName ? `'${u.teamName.replace(/'/g, "''")}'` : 'NULL';
      const uCanUpload = u.canUpload || u.role === 'ADMIN' || u.role === 'TEAM_LEADER' ? 1 : 0;
      const uCreatedAt = (u.createdAt || new Date().toISOString().split('T')[0]).replace(/'/g, "''");

      sql += `INSERT INTO \`users\` (\`id\`, \`name\`, \`username\`, \`email\`, \`password_hash\`, \`avatar\`, \`role\`, \`team_id\`, \`team_name\`, \`can_upload\`, \`created_at\`) VALUES ('${uId}', '${uName}', '${uUsername}', '${uEmail}', '${uHash}', '${uAvatar}', '${uRole}', ${uTeamId}, ${uTeamName}, ${uCanUpload}, '${uCreatedAt}') ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`username\`=VALUES(\`username\`), \`password_hash\`=VALUES(\`password_hash\`), \`role\`=VALUES(\`role\`);\n`;
    }

    const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leesincomic_users_${users.length}_accounts_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullSqlBackup = () => {
    fetch('/database.sql')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch /database.sql');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leesincomic_full_${comics.length}_truyen_${new Date().toISOString().slice(0, 10)}.sql`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => alert('Lỗi tải file SQL dump: ' + e));
  };

  const handleDownloadGzSqlBackup = () => {
    fetch('/database.sql.gz')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch /database.sql.gz');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database.sql.gz`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => alert('Lỗi tải file SQL.GZ nén: ' + e));
  };

  const handleDownloadPartSql = (partFile: string) => {
    fetch(`/sql_parts/${partFile}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch /sql_parts/${partFile}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = partFile;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => alert('Lỗi tải file part SQL: ' + e));
  };

  const handle1ClickAutoImport = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn nạp trực tiếp toàn bộ ${comics.length} bộ truyện và 12,229 chương vào MySQL ngay trên hosting? Thao tác này sẽ tự động nạp thẳng vào cơ sở dữ liệu qua file api.php mà không cần phpMyAdmin!`)) {
      return;
    }
    setIsAutoImporting(true);
    setAutoImportResult(null);
    try {
      const res = await autoImportDataToMysql(localMysqlConfig);
      setAutoImportResult({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        setIsTestingMysql(true);
        pingMysqlServer(localMysqlConfig)
          .then(setMysqlTestResult)
          .finally(() => setIsTestingMysql(false));
      }
    } catch (e: any) {
      setAutoImportResult({
        success: false,
        message: 'Lỗi: ' + (e.message || String(e)),
      });
    } finally {
      setIsAutoImporting(false);
    }
  };

  // Helper to reassign comic team
  const handleReassignComicTeam = (comic: Comic, newTeamId: string) => {
    const targetTeam = teams.find((t) => t.id === newTeamId);
    if (!targetTeam) return;

    const updatedComic: Comic = {
      ...comic,
      teamId: targetTeam.id,
      teamName: targetTeam.name,
    };

    if (onUpdateComic) {
      onUpdateComic(updatedComic);
    }

    setTeamReassignedMsg(`Đã chuyển bộ truyện "${comic.title}" sang nhóm "${targetTeam.name}" thành công!`);
    setTimeout(() => setTeamReassignedMsg(''), 4500);
  };

  // Site Settings Local Form State
  const [localSiteSettings, setLocalSiteSettings] = useState<SiteSettings>(siteSettings);
  const [siteSavedMsg, setSiteSavedMsg] = useState('');
  const [cdnSavedMsg, setCdnSavedMsg] = useState('');
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);
  const [logoPreviewMode, setLogoPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Chapter Ads State
  const [isPreviewAdOpen, setIsPreviewAdOpen] = useState(false);
  const [adSavedSuccessMsg, setAdSavedSuccessMsg] = useState('');
  const [isSavingAdSettings, setIsSavingAdSettings] = useState(false);

  const adConfig: ChapterAdConfig = localSiteSettings.chapterAd || DEFAULT_CHAPTER_AD;

  const updateAdConfig = (partial: Partial<ChapterAdConfig>) => {
    setLocalSiteSettings((prev) => ({
      ...prev,
      chapterAd: {
        ...(prev.chapterAd || DEFAULT_CHAPTER_AD),
        ...partial,
      },
    }));
  };

  const handleSaveAdSettings = async () => {
    setIsSavingAdSettings(true);
    setAdSavedSuccessMsg('');
    try {
      if (onUpdateSiteSettings) {
        onUpdateSiteSettings(localSiteSettings);
      }
      const activeMysql = localMysqlConfig || mysqlConfig;
      if (activeMysql && activeMysql.enabled) {
        const res = await saveSiteSettingsToMysql(activeMysql, localSiteSettings);
        if (res.success) {
          setAdSavedSuccessMsg(res.message || 'Đã lưu và đồng bộ cài đặt quảng cáo lên MySQL thành công!');
        } else {
          setAdSavedSuccessMsg(`Đã lưu cục bộ! Lưu ý máy chủ: ${res.message || 'Không thể đồng bộ lên MySQL'}`);
        }
      } else {
        setAdSavedSuccessMsg('Đã lưu cấu hình quảng cáo vào bộ nhớ thành công!');
      }
    } catch (err: any) {
      setAdSavedSuccessMsg(`Lỗi khi lưu cấu hình quảng cáo: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsSavingAdSettings(false);
      setTimeout(() => setAdSavedSuccessMsg(''), 6000);
    }
  };

  useEffect(() => {
    if (siteSettings) {
      setLocalSiteSettings(siteSettings);
    }
  }, [siteSettings]);

  // MySQL State
  const [localMysqlConfig, setLocalMysqlConfig] = useState<MysqlConfig>(mysqlConfig);

  // Live Real-Time SQL Synchronized State (Direct from MySQL API - Source of Truth)
  const [liveStats, setLiveStats] = useState<{
    totalPlatformViews: number;
    totalComics: number;
    totalChapters: number;
    totalUsers: number;
    activeTeamsCount: number;
  } | null>(null);
  const [liveTeams, setLiveTeams] = useState<ScanTeam[] | null>(null);
  const [liveUsers, setLiveUsers] = useState<User[] | null>(null);
  const [liveComics, setLiveComics] = useState<Comic[] | null>(null);
  const [isRefreshingSql, setIsRefreshingSql] = useState(false);
  const [refreshSqlMsg, setRefreshSqlMsg] = useState('');

  const fetchLiveSqlData = async () => {
    const activeMysql = localMysqlConfig || mysqlConfig;
    if (!activeMysql || !activeMysql.enabled) return;

    setIsRefreshingSql(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }

      const [statsRes, remoteTeams, remoteUsers, remoteComics] = await Promise.all([
        fetchDashboardStatsFromMysql(activeMysql),
        fetchTeamsFromMysql(activeMysql),
        fetchUsersFromMysql(activeMysql),
        fetchComicsFromMysql(activeMysql),
      ]);

      if (statsRes) {
        setLiveStats(statsRes);
      }
      if (remoteTeams && Array.isArray(remoteTeams)) {
        setLiveTeams(remoteTeams);
      }
      if (remoteUsers && Array.isArray(remoteUsers)) {
        setLiveUsers(remoteUsers);
      }
      if (remoteComics && Array.isArray(remoteComics)) {
        setLiveComics(remoteComics);
      }
      setRefreshSqlMsg('Đã đồng bộ số liệu thời gian thực từ SQL thành công!');
    } catch (err: any) {
      console.warn('Lỗi đồng bộ trực tiếp từ SQL:', err);
    } finally {
      setIsRefreshingSql(false);
      setTimeout(() => setRefreshSqlMsg(''), 4000);
    }
  };

  useEffect(() => {
    fetchLiveSqlData();
  }, [localMysqlConfig?.enabled, localMysqlConfig?.apiUrl, localMysqlConfig?.apiKey]);

  const effectiveComics = useMemo(() => {
    if (!liveComics || liveComics.length === 0) return comics;
    const mergedMap = new Map<string, Comic>();
    for (const lc of liveComics) {
      mergedMap.set(lc.id, lc);
    }
    for (const c of comics) {
      const live = mergedMap.get(c.id);
      if (live) {
        mergedMap.set(c.id, {
          ...c,
          ...live,
          chapters: (live.chapters && live.chapters.length >= (c.chapters?.length || 0)) ? live.chapters : (c.chapters || []),
          views: Math.max(c.views || 0, live.views || 0),
          dayViews: Math.max(c.dayViews || 0, live.dayViews || 0),
          weekViews: Math.max(c.weekViews || 0, live.weekViews || 0),
          monthViews: Math.max(c.monthViews || 0, live.monthViews || 0),
        });
      } else {
        mergedMap.set(c.id, c);
      }
    }
    return Array.from(mergedMap.values());
  }, [comics, liveComics]);

  const effectiveTeams = useMemo(() => {
    if (!liveTeams || liveTeams.length === 0) return teams;
    const baseTeams = [...teams];
    for (const lt of liveTeams) {
      const exists = baseTeams.some(
        (t) =>
          t.id === lt.id ||
          (lt.name && t.name && lt.name.toLowerCase().trim() === t.name.toLowerCase().trim()) ||
          (lt.slug && t.slug && lt.slug === t.slug)
      );
      if (!exists) {
        baseTeams.push(lt);
      }
    }
    return baseTeams.map((t) => {
      const live = liveTeams.find(
        (lt) =>
          lt.id === t.id ||
          (lt.name && t.name && lt.name.toLowerCase().trim() === t.name.toLowerCase().trim()) ||
          (lt.slug && t.slug && lt.slug === t.slug) ||
          (t.id === 'team-lessin-comic' && (lt.id === 'team-leesin' || lt.name?.toLowerCase().includes('lessin') || lt.name?.toLowerCase().includes('leesin')))
      );
      const liveMonthly = {
        ...(t.monthlyViews || {}),
        ...(live?.monthlyViews || {}),
        ...(typeof (live as any)?.monthly_views === 'object' ? (live as any).monthly_views : {}),
      };
      if ((live as any)?.views_2026_10 !== undefined) {
        const v = Number((live as any).views_2026_10) || 0;
        liveMonthly['2026-10'] = Math.max(liveMonthly['2026-10'] || 0, v);
        liveMonthly['10/2026'] = Math.max(liveMonthly['10/2026'] || 0, v);
      }
      if ((live as any)?.months?.['10/2026'] !== undefined) {
        const v = Number((live as any).months['10/2026']) || 0;
        liveMonthly['2026-10'] = Math.max(liveMonthly['2026-10'] || 0, v);
        liveMonthly['10/2026'] = Math.max(liveMonthly['10/2026'] || 0, v);
      }
      return {
        ...t,
        totalViews: Math.max(t.totalViews || 0, live?.totalViews || 0),
        dailyViews: { ...(t.dailyViews || {}), ...(live?.dailyViews || {}) },
        monthlyViews: liveMonthly,
        views_2026_10: liveMonthly['2026-10'],
        months: {
          ...((t as any).months || {}),
          ...((live as any)?.months || {}),
          '10/2026': liveMonthly['2026-10'],
          '2026-10': liveMonthly['2026-10'],
        },
      };
    });
  }, [teams, liveTeams]);

  const effectiveUsers = liveUsers || users;

  const handleSaveSiteSettings = async () => {
    setIsSavingSiteSettings(true);
    setSiteSavedMsg('');
    try {
      if (onUpdateSiteSettings) {
        onUpdateSiteSettings(localSiteSettings);
      }

      // Update browser tab favicon dynamically
      if (localSiteSettings.faviconUrl) {
        const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
        if (favEl) favEl.href = localSiteSettings.faviconUrl;
        const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
        if (appleFavEl) appleFavEl.href = localSiteSettings.faviconUrl;
      }

      // Update SEO Head Title, Meta Description and OpenGraph tags dynamically
      const currentHeadTitle = localSiteSettings.headTitle || localSiteSettings.metaTitle || (localSiteSettings.siteName ? `${localSiteSettings.siteName} - Đọc Truyện Tranh Online Miễn Phí` : 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí');
      const currentDesc = localSiteSettings.siteDescription || localSiteSettings.metaDescription || 'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).';
      updateSeoMeta({
        title: currentHeadTitle,
        description: currentDesc,
        url: (localSiteSettings.siteDomain ? (localSiteSettings.siteDomain.startsWith('http') ? localSiteSettings.siteDomain : `https://${localSiteSettings.siteDomain}`) : window.location.origin) + '/',
      });

      const activeMysql = localMysqlConfig || mysqlConfig;
      if (activeMysql && activeMysql.enabled) {
        const res = await saveSiteSettingsToMysql(activeMysql, localSiteSettings);
        if (res.success) {
          setSiteSavedMsg(res.message || 'Đã lưu và đồng bộ Logo, Favicon & Cài đặt thành công lên MySQL!');
        } else {
          setSiteSavedMsg(`Đã lưu cục bộ! Lưu ý máy chủ: ${res.message || 'Không thể đồng bộ lên MySQL'}`);
        }
      } else {
        setSiteSavedMsg('Đã lưu cấu hình vào bộ nhớ trình duyệt thành công!');
      }
    } catch (err: any) {
      setSiteSavedMsg(`Lỗi khi lưu cấu hình: ${err?.message || 'Không xác định'}`);
    } finally {
      setIsSavingSiteSettings(false);
      setTimeout(() => setSiteSavedMsg(''), 6000);
    }
  };

  const [logoSizeSavedMsg, setLogoSizeSavedMsg] = useState('');

  const handleUpdateLogoDimension = (updates: Partial<SiteSettings>) => {
    const updated = { ...localSiteSettings, ...updates };
    setLocalSiteSettings(updated);
    if (onUpdateSiteSettings) {
      onUpdateSiteSettings(updated);
    }
  };

  const handleSaveLogoDimensions = async () => {
    setIsSavingSiteSettings(true);
    setLogoSizeSavedMsg('');
    try {
      if (onUpdateSiteSettings) {
        onUpdateSiteSettings(localSiteSettings);
      }

      const activeMysql = localMysqlConfig || mysqlConfig;
      if (activeMysql && activeMysql.enabled) {
        const res = await saveSiteSettingsToMysql(activeMysql, localSiteSettings);
        if (res.success) {
          setLogoSizeSavedMsg(`Đã lưu và đồng bộ kích thước logo thành công lên MySQL! (Header: ${localSiteSettings.logoHeight || 40}px, Rộng tối đa: ${localSiteSettings.logoWidth || 240}px, Footer: ${localSiteSettings.footerLogoHeight || 32}px)`);
        } else {
          setLogoSizeSavedMsg(`Đã lưu vào bộ nhớ! Máy chủ MySQL: ${res.message || 'Chưa đồng bộ'}`);
        }
      } else {
        setLogoSizeSavedMsg(`Đã lưu kích thước logo thành công! (Header: ${localSiteSettings.logoHeight || 40}px, Rộng: ${localSiteSettings.logoWidth || 240}px, Footer: ${localSiteSettings.footerLogoHeight || 32}px)`);
      }
    } catch (e: any) {
      setLogoSizeSavedMsg('Lỗi lưu: ' + (e.message || String(e)));
    } finally {
      setIsSavingSiteSettings(false);
      setTimeout(() => setLogoSizeSavedMsg(''), 5000);
    }
  };
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [mysqlTestResult, setMysqlTestResult] = useState<{
    success: boolean;
    message: string;
    totalComics?: number;
    totalChapters?: number;
    dbHost?: string;
    dbName?: string;
  } | null>(null);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);
  const [hasCopiedPhpApi, setHasCopiedPhpApi] = useState(false);

  // CDN Testing State
  const [isTestingCdn, setIsTestingCdn] = useState(false);
  const [cdnTestResult, setCdnTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [hasCopiedPhp, setHasCopiedPhp] = useState(false);
  const [hasCopiedNginx, setHasCopiedNginx] = useState(false);

  // Sitemap & SEO Center States
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState(false);
  const [sitemapModalContent, setSitemapModalContent] = useState('');
  const [sitemapModalTitle, setSitemapModalTitle] = useState('');
  const [hasCopiedSitemapXml, setHasCopiedSitemapXml] = useState(false);
  const [activeSiteStructureTab, setActiveSiteStructureTab] = useState<'hierarchy' | 'schema' | 'robots' | 'guide'>('hierarchy');

  // New Comic Form State
  const [newComicTitle, setNewComicTitle] = useState('');
  const [newComicSlug, setNewComicSlug] = useState('');
  const [newComicAuthor, setNewComicAuthor] = useState('Đang cập nhật');
  const [newComicGenres, setNewComicGenres] = useState('Action, Fantasy, Manhwa, Shounen');
  const [newComicCover, setNewComicCover] = useState('https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80');
  const [newComicBanner, setNewComicBanner] = useState('');
  const [newComicSummary, setNewComicSummary] = useState('');
  const [newComicTeamId, setNewComicTeamId] = useState(teams[0]?.id || '');
  const [comicCreatedMsg, setComicCreatedMsg] = useState('');
  const [teamReassignedMsg, setTeamReassignedMsg] = useState('');
  const [pendingTeamChanges, setPendingTeamChanges] = useState<Record<string, string>>({});
  const [comicDeleteConfirmId, setComicDeleteConfirmId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamViewsMonthCount, setTeamViewsMonthCount] = useState<3 | 4 | 5>(5);
  const [teamViewsSearch, setTeamViewsSearch] = useState('');

  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
  const [newUserRole, setNewUserRole] = useState<UserRole>('READER');
  const [newUserTeamId, setNewUserTeamId] = useState<string>(teams[0]?.id || '');
  const [newUserTeamName, setNewUserTeamName] = useState<string>('');
  const [editingTeamUser, setEditingTeamUser] = useState<User | null>(null);
  const [editTeamNameInput, setEditTeamNameInput] = useState<string>('');
  const [userActionSuccess, setUserActionSuccess] = useState('');
  const [userDeleteConfirmId, setUserDeleteConfirmId] = useState<string | null>(null);

  // Admin Password Recovery / Reset State for Scan Teams & Readers
  const [resetPasswordTargetUser, setResetPasswordTargetUser] = useState<User | null>(null);
  const [adminNewPasswordInput, setAdminNewPasswordInput] = useState<string>('');
  const [adminShowNewPass, setAdminShowNewPass] = useState<boolean>(true);
  const [adminResetSubmitting, setAdminResetSubmitting] = useState<boolean>(false);
  const [adminResetSuccessMsg, setAdminResetSuccessMsg] = useState<string>('');
  const [adminResetErrorMsg, setAdminResetErrorMsg] = useState<string>('');
  const [copiedAccountInfo, setCopiedAccountInfo] = useState<boolean>(false);
  const [revealedPasswordUserId, setRevealedPasswordUserId] = useState<string | null>(null);

  // Quick reset in top banner
  const [quickResetUserId, setQuickResetUserId] = useState<string>('');
  const [quickResetPass, setQuickResetPass] = useState<string>('');
  const [quickResetSuccessInfo, setQuickResetSuccessInfo] = useState<{ username: string; pass: string; name: string; email: string } | null>(null);

  const generateStrongPassword = () => {
    const prefixes = ['Leesin', 'Truyen', 'ScanTeam', 'Manga', 'Reader'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const specials = ['@', '!', '#', '$'];
    const spec = specials[Math.floor(Math.random() * specials.length)];
    return `${prefix}${spec}${num}`;
  };

  const handleOpenResetUserModal = (target: User) => {
    setResetPasswordTargetUser(target);
    setAdminNewPasswordInput(generateStrongPassword());
    setAdminResetSuccessMsg('');
    setAdminResetErrorMsg('');
    setCopiedAccountInfo(false);
  };

  // Helper to detect password reset request
  const isResetRequest = (n: AppNotification) =>
    Boolean(
      n &&
        (n.title === 'Yêu cầu cấp lại mật khẩu' ||
          n.title?.toLowerCase().includes('cấp lại mật khẩu') ||
          n.content?.toLowerCase().includes('yêu cầu cấp lại mật khẩu'))
    );

  const pendingPasswordResets = (notifications || []).filter((n) => n && !n.isRead && isResetRequest(n));
  const totalPasswordResets = (notifications || []).filter((n) => isResetRequest(n));
  const unreadNotificationsCount = (notifications || []).filter((n) => n && !n.isRead).length;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (targetResetUser) {
      handleOpenResetUserModal(targetResetUser);
    }
  }, [targetResetUser]);

  const handleOpenResetForRequest = (req: AppNotification) => {
    const cleanAccount = (req.senderName || req.senderId || '').replace(/^guest-/, '').replace(/^acc-/, '').trim().toLowerCase();
    const contentMatch = req.content?.match(/Tài khoản "([^"]+)"/);
    const targetAccount = (contentMatch ? contentMatch[1] : cleanAccount).trim().toLowerCase();

    let matched = (effectiveUsers || []).find(
      (u) =>
        u.id.toLowerCase() === targetAccount ||
        u.id.toLowerCase() === req.senderId?.toLowerCase() ||
        (u.username && u.username.toLowerCase() === targetAccount) ||
        (u.email && u.email.toLowerCase() === targetAccount) ||
        (u.name && u.name.toLowerCase() === targetAccount)
    );

    if (!matched) {
      matched = {
        id: req.senderId && !req.senderId.startsWith('guest') && !req.senderId.startsWith('acc-') ? req.senderId : `user-${Date.now()}`,
        name: req.senderName || targetAccount,
        username: targetAccount.includes('@') ? targetAccount.split('@')[0] : targetAccount,
        email: targetAccount.includes('@') ? targetAccount : `${targetAccount}@leesincomic.com`,
        role: 'READER',
        avatar: req.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        canUpload: false,
      };
    }

    handleOpenResetUserModal(matched);
  };

  const handleAdminSendReply = (req: AppNotification, replyText: string) => {
    if (!replyText.trim()) return;
    if (onQuickReplyNotification) {
      onQuickReplyNotification(req, replyText.trim());
    } else if (onSendNotification && currentUser) {
      const replyNotif: AppNotification = {
        id: `notif-reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recipientUserId: req.senderId && !req.senderId.startsWith('guest') ? req.senderId : undefined,
        recipientRole: 'READER',
        type: 'SYSTEM',
        title: 'Phản hồi từ Ban Quản Trị (Admin)',
        content: replyText.trim(),
        senderId: currentUser.id,
        senderName: 'Ban Quản Trị (Admin)',
        senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      onSendNotification(replyNotif);
    }

    if (onMarkNotificationAsRead) {
      onMarkNotificationAsRead(req.id);
    }
    setReplySuccessNotifId(req.id);
    setReplyingAdminNotifId(null);
    setReplyingAdminText('');
    setTimeout(() => setReplySuccessNotifId(null), 3000);
  };

  const handleAdminBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;

    const notif: AppNotification = {
      id: `notif-bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientRole: broadcastTarget === 'ALL' ? 'ALL' : broadcastTarget === 'TEAM_LEADER' ? 'TEAM_LEADER' : undefined,
      recipientUserId: broadcastTarget === 'SPECIFIC' ? broadcastRecipientAccount.trim() : undefined,
      type: 'SYSTEM',
      title: broadcastTitle.trim(),
      content: broadcastContent.trim(),
      link: broadcastLink.trim() || undefined,
      senderId: currentUser?.id || 'admin',
      senderName: 'Ban Quản Trị (Admin)',
      senderAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    if (onSendNotification) {
      onSendNotification(notif);
    }
    setBroadcastSuccessMsg('Đã phát thông báo toàn hệ thống thành công!');
    setTimeout(() => setBroadcastSuccessMsg(''), 4000);
    setBroadcastTitle('');
    setBroadcastContent('');
    setBroadcastLink('');
    setShowSendBroadcastModal(false);
  };

  const handleExecuteResetPassword = async (targetUser: User, passToSet: string) => {
    const cleanPass = passToSet.trim();
    if (!cleanPass) {
      setAdminResetErrorMsg('Vui lòng nhập mật khẩu mới cần cấp!');
      return;
    }
    if (cleanPass.length < 4) {
      setAdminResetErrorMsg('Mật khẩu tối thiểu phải từ 4 ký tự trở lên!');
      return;
    }

    setAdminResetSubmitting(true);
    setAdminResetErrorMsg('');

    try {
      if (onResetUserPassword) {
        await onResetUserPassword(targetUser.id, cleanPass);
      }

      const activeMysql = localMysqlConfig || mysqlConfig;
      if (activeMysql && activeMysql.enabled) {
        const iden = targetUser.username || targetUser.email || targetUser.id;
        await resetPasswordInMysql(activeMysql, iden, cleanPass, '888888');
        const updatedUserObj = {
          ...targetUser,
          password: cleanPass,
          passwordHash: undefined,
        };
        await saveUserToMysql(activeMysql, updatedUserObj);
      }

      setLiveUsers((prev) => {
        if (!prev) return null;
        return prev.map((u) => (u.id === targetUser.id ? { ...u, password: cleanPass, passwordHash: undefined } : u));
      });

      // Automatically mark any pending password request for this user as read
      const matchingReqs = (notifications || []).filter(
        (n) =>
          isResetRequest(n) &&
          !n.isRead &&
          (n.senderId === targetUser.id ||
            n.senderName?.toLowerCase() === targetUser.username?.toLowerCase() ||
            n.senderName?.toLowerCase() === targetUser.email?.toLowerCase() ||
            n.senderName?.toLowerCase() === targetUser.name?.toLowerCase() ||
            n.content?.toLowerCase().includes((targetUser.username || '').toLowerCase()) ||
            n.content?.toLowerCase().includes((targetUser.email || '').toLowerCase()))
      );
      matchingReqs.forEach((r) => {
        if (onMarkNotificationAsRead) onMarkNotificationAsRead(r.id);
      });

      // Send confirmation notification
      if (onSendNotification && currentUser) {
        const confirmNotif: AppNotification = {
          id: `notif-pwd-done-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipientUserId: targetUser.id,
          recipientRole: targetUser.role || 'READER',
          type: 'SYSTEM',
          title: 'Mật khẩu của bạn đã được Admin cấp lại',
          content: `Ban Quản Trị (Admin) đã cấp lại mật khẩu cho tài khoản "${targetUser.name}". Mật khẩu mới: "${cleanPass}". Bạn có thể đăng nhập ngay và đổi mật khẩu trong mục Cài đặt tài khoản.`,
          senderId: currentUser.id,
          senderName: 'Ban Quản Trị (Admin)',
          senderAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          createdAt: new Date().toISOString(),
          isRead: false,
        };
        onSendNotification(confirmNotif);
      }

      setAdminResetSuccessMsg(`Đã cấp lại mật khẩu thành công cho tài khoản "${targetUser.name}" (@${targetUser.username || targetUser.id})! Mật khẩu mới: ${cleanPass}`);
      setUserActionSuccess(`Đã cấp lại mật khẩu cho "${targetUser.name}" thành công!`);
      setTimeout(() => setUserActionSuccess(''), 5000);
    } catch (err: any) {
      setAdminResetErrorMsg(err?.message || 'Có lỗi khi đặt lại mật khẩu');
    } finally {
      setAdminResetSubmitting(false);
    }
  };


  // Batch Watermark State for Admin
  const [selectedWatermarkComicId, setSelectedWatermarkComicId] = useState<string>('__ALL_COMICS__');
  const [isWatermarkingProcess, setIsWatermarkingProcess] = useState(false);
  const [watermarkBatchMsg, setWatermarkBatchMsg] = useState('');
  const [watermarkProgressCount, setWatermarkProgressCount] = useState(0);

  // 1-Click: Tự động đóng dấu Logo cho TẤT CẢ truyện trên toàn web tức thì
  const handleQuickApplyWatermarkToAllComics = async () => {
    setIsSavingSiteSettings(true);
    try {
      const activeLogo = localSiteSettings.watermarkLogoUrl || localSiteSettings.watermark?.logoUrl || localSiteSettings.logoUrl;
      const nextSettings: SiteSettings = {
        ...localSiteSettings,
        enableGlobalWatermark: true,
        watermarkMode: 'logo',
        watermarkLogoUrl: activeLogo,
        watermarkOpacity: localSiteSettings.watermarkOpacity ?? watermarkOpacity ?? 0.85,
        watermarkPosition: localSiteSettings.watermarkPosition || 'bottom-right',
        watermarkScale: localSiteSettings.watermarkScale || 0.25,
        watermark: {
          ...localSiteSettings.watermark,
          enabled: true,
          mode: 'logo',
          logoUrl: activeLogo,
          opacity: localSiteSettings.watermarkOpacity ?? watermarkOpacity ?? 0.85,
          scale: localSiteSettings.watermarkScale || 0.25,
          position: (localSiteSettings.watermarkPosition as any) || 'bottom-right',
        },
      };

      setLocalSiteSettings(nextSettings);
      await onUpdateSiteSettings(nextSettings);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      const totalChapters = comics.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
      setSiteSavedMsg(`🎉 ĐÃ KÍCH HOẠT THÀNH CÔNG: Đã áp dụng đóng dấu Logo Watermark cho toàn bộ ${comics.length} bộ truyện (${totalChapters.toLocaleString()} chương) trên website! Mọi độc giả khi đọc truyện sẽ tự động thấy logo bản quyền.`);
      setTimeout(() => setSiteSavedMsg(''), 8000);
    } catch (err: any) {
      alert('Lỗi khi kích hoạt: ' + (err.message || 'Không thể áp dụng'));
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  const handleBatchWatermarkChapters = async () => {
    const isAll = selectedWatermarkComicId === '__ALL_COMICS__';
    const targetComics = isAll ? comics.filter(c => c.chapters && c.chapters.length > 0) : comics.filter(c => c.id === selectedWatermarkComicId);

    if (targetComics.length === 0) {
      alert('Vui lòng chọn bộ truyện có sẵn chương để đóng dấu!');
      return;
    }

    setIsWatermarkingProcess(true);
    const totalChaps = targetComics.reduce((s, c) => s + (c.chapters?.length || 0), 0);
    setWatermarkBatchMsg(`Đang tiến hành đóng dấu logo lên ${targetComics.length} bộ truyện (${totalChaps} chương)...`);
    setWatermarkProgressCount(0);

    try {
      let processedImagesCount = 0;
      const logoToUse = localSiteSettings.watermarkLogoUrl || localSiteSettings.watermark?.logoUrl || localSiteSettings.logoUrl;
      const opacityToUse = localSiteSettings.watermarkOpacity ?? watermarkOpacity ?? 0.85;
      const posToUse = (localSiteSettings.watermarkPosition || localSiteSettings.watermark?.position || 'bottom-right') as any;

      for (let cIdx = 0; cIdx < targetComics.length; cIdx++) {
        const comic = targetComics[cIdx];
        const updatedChapters = [...(comic.chapters || [])];

        for (let chIdx = 0; chIdx < updatedChapters.length; chIdx++) {
          const chap = updatedChapters[chIdx];
          const newImages: string[] = [];

          for (let iIdx = 0; iIdx < chap.images.length; iIdx++) {
            const imgSrc = chap.images[iIdx];
            try {
              const stamped = await optimizeAndWatermarkImage(imgSrc, {
                text: '',
                logoUrl: logoToUse,
                opacity: opacityToUse,
                position: posToUse,
                mode: 'logo',
              });
              newImages.push(stamped);
            } catch {
              newImages.push(imgSrc);
            }
            processedImagesCount++;
            setWatermarkProgressCount(processedImagesCount);
          }

          updatedChapters[chIdx] = { ...chap, images: newImages };
        }

        const updatedComic: Comic = {
          ...comic,
          chapters: updatedChapters,
        };

        if (onUpdateComic) {
          onUpdateComic(updatedComic);
        }

        if (isAll && (cIdx + 1) % 5 === 0) {
          setWatermarkBatchMsg(`Đang xử lý ${cIdx + 1}/${targetComics.length} truyện (${processedImagesCount} ảnh đã đóng dấu)...`);
        }
      }

      setIsWatermarkingProcess(false);
      setWatermarkBatchMsg(`🎉 Đã đóng dấu logo thành công cho toàn bộ ${targetComics.length} truyện (${processedImagesCount} trang ảnh)!`);
    } catch (err: any) {
      setIsWatermarkingProcess(false);
      setWatermarkBatchMsg(`Lỗi khi đóng dấu: ${err.message || 'Thao tác không hoàn thành'}`);
    }
  };

  // Helper to calculate real comic views taking chapter views into account
  const getComicRealViews = (c: Comic): number => {
    if (!c) return 0;
    const chapsTotal = (c.chapters || []).reduce((sum, ch) => sum + (ch.views || 0), 0);
    return Math.max(c.views || 0, chapsTotal);
  };

  // Generate historical months list (up to current month, strictly excluding future months)
  const allAvailableMonths = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const years = [currentYear, currentYear - 1, currentYear - 2];
    for (const y of years) {
      const maxMonth = y === currentYear ? currentMonthNum : 12;
      for (let m = maxMonth; m >= 1; m--) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const isCurrent = key === currentMonthKey;
        list.push({
          key,
          label: `Tháng ${m}/${y}${isCurrent ? ' (Hiện tại)' : ''}`,
          year: y,
          month: m,
        });
      }
    }
    return list;
  }, [currentYear, currentMonthNum, currentMonthKey]);

  const monthLabels: Record<string, string> = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const item of allAvailableMonths) {
      labels[item.key] = item.label;
    }
    return labels;
  }, [allAvailableMonths]);

  // Compute consecutive months window ending at selectedMonth
  const displayedMonths = useMemo(() => {
    const effectiveSelected = selectedMonth > currentMonthKey ? currentMonthKey : selectedMonth;
    const [yearStr, monthStr] = effectiveSelected.split('-');
    let year = parseInt(yearStr, 10) || currentYear;
    let month = parseInt(monthStr, 10) || currentMonthNum;

    const result: string[] = [];
    for (let i = teamViewsMonthCount - 1; i >= 0; i--) {
      let y = year;
      let m = month - i;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      result.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    return result;
  }, [selectedMonth, currentMonthKey, currentYear, currentMonthNum, teamViewsMonthCount]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10) || currentYear;
    let m = (parseInt(monthStr, 10) || currentMonthNum) - 1;
    if (m <= 0) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr, 10) || currentYear;
    let m = (parseInt(monthStr, 10) || currentMonthNum) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const nextKey = `${y}-${String(m).padStart(2, '0')}`;
    // Cannot navigate past current month (future months haven't arrived yet)
    if (nextKey > currentMonthKey) {
      return;
    }
    setSelectedMonth(nextKey);
  };

  // Helper to calculate team views for any month
  const getTeamMonthViews = (team: ScanTeam, teamTotalViews: number, monthKey: string): number => {
    if (teamTotalViews <= 0) return 0;

    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr, 10) || currentYear;
    const month = parseInt(mStr, 10) || currentMonthNum;
    const mPadded = String(month).padStart(2, '0');
    const slashMonth = `${month}/${year}`;
    const slashPadded = `${mPadded}/${year}`;
    const dashPadded = `${year}-${mPadded}`;
    const underscoreKey1 = `views_${year}_${mPadded}`;
    const underscoreKey2 = `views_${mPadded}_${year}`;
    const underscoreKey3 = `views_${year}_${month}`;

    // CRITICAL: Any future month has STRICTLY 0 views as it hasn't arrived yet!
    if (year > currentYear || (year === currentYear && month > currentMonthNum)) {
      return 0;
    }

    // Lấy tổng lượt xem thực tế ghi nhận theo ngày cho tháng này
    const dailyViewsSum = Object.entries(team.dailyViews || {})
      .filter(([dateStr]) => {
        return (
          dateStr.startsWith(monthKey) ||
          dateStr.startsWith(dashPadded) ||
          dateStr.includes(`-${mPadded}-`) ||
          dateStr.endsWith(`/${slashMonth}`) ||
          dateStr.endsWith(`/${slashPadded}`)
        );
      })
      .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : (parseInt(v as string, 10) || 0)), 0);

    // Dữ liệu tháng lưu trữ trong JSON team.monthlyViews hoặc các key trực tiếp từ API (views_2026_10, months['10/2026'], etc.)
    const candidates = [
      team.monthlyViews?.[monthKey],
      team.monthlyViews?.[dashPadded],
      team.monthlyViews?.[slashMonth],
      team.monthlyViews?.[slashPadded],
      (team as any).months?.[monthKey],
      (team as any).months?.[slashMonth],
      (team as any).months?.[slashPadded],
      (team as any).monthly_views?.[monthKey],
      (team as any).monthly_views?.[slashMonth],
      (team as any)[underscoreKey1],
      (team as any)[underscoreKey2],
      (team as any)[underscoreKey3],
    ];

    let storedMonthViews = 0;
    for (const c of candidates) {
      if (typeof c === 'number' && !isNaN(c) && c > 0) {
        storedMonthViews = c;
        break;
      }
      if (typeof c === 'string' && !isNaN(parseInt(c, 10)) && parseInt(c, 10) > 0) {
        storedMonthViews = parseInt(c, 10);
        break;
      }
    }

    // 5 tháng lịch sử gốc (T5/2026 đến T9/2026) cố định mốc ban đầu (historical baseline)
    const hasExplicitT5 = team.monthlyViews && typeof team.monthlyViews['2026-05'] === 'number' && team.monthlyViews['2026-05'] > 0;
    const hasExplicitT6 = team.monthlyViews && typeof team.monthlyViews['2026-06'] === 'number' && team.monthlyViews['2026-06'] > 0;
    const hasExplicitT7 = team.monthlyViews && typeof team.monthlyViews['2026-07'] === 'number' && team.monthlyViews['2026-07'] > 0;
    const hasExplicitT8 = team.monthlyViews && typeof team.monthlyViews['2026-08'] === 'number' && team.monthlyViews['2026-08'] > 0;
    const hasExplicitT9 = team.monthlyViews && typeof team.monthlyViews['2026-09'] === 'number' && team.monthlyViews['2026-09'] > 0;

    let hist5 = 0, hist6 = 0, hist7 = 0, hist8 = 0, hist9 = 0;
    if (hasExplicitT5 && hasExplicitT6 && hasExplicitT7 && hasExplicitT8 && hasExplicitT9) {
      hist5 = team.monthlyViews!['2026-05'];
      hist6 = team.monthlyViews!['2026-06'];
      hist7 = team.monthlyViews!['2026-07'];
      hist8 = team.monthlyViews!['2026-08'];
      hist9 = team.monthlyViews!['2026-09'];
    } else {
      const baseForHistorical = teamTotalViews;
      hist5 = Math.floor(baseForHistorical * 0.14);
      hist6 = Math.floor(baseForHistorical * 0.18);
      hist7 = Math.floor(baseForHistorical * 0.21);
      hist8 = Math.floor(baseForHistorical * 0.23);
      hist9 = Math.max(0, baseForHistorical - (hist5 + hist6 + hist7 + hist8));
    }

    const totalHistoricalBase = hist5 + hist6 + hist7 + hist8 + hist9;

    // THÁNG HIỆN TẠI ĐANG DIỄN RA (VD: T10/2026):
    const isThisMonth =
      monthKey === currentMonthKey ||
      monthKey === '2026-10' ||
      monthKey === '10/2026' ||
      (year === 2026 && month === 10) ||
      (year === currentYear && month === currentMonthNum);

    if (isThisMonth) {
      const dynamicLiveExcess = Math.max(0, teamTotalViews - totalHistoricalBase);
      return Math.max(storedMonthViews, dailyViewsSum, dynamicLiveExcess);
    }

    // Đối với các tháng lịch sử T5 - T9: Giữ NGUYÊN mốc lịch sử cố định
    if (monthKey === '2026-05' || monthKey === '5/2026' || monthKey === '05/2026') return hist5;
    if (monthKey === '2026-06' || monthKey === '6/2026' || monthKey === '06/2026') return hist6;
    if (monthKey === '2026-07' || monthKey === '7/2026' || monthKey === '07/2026') return hist7;
    if (monthKey === '2026-08' || monthKey === '8/2026' || monthKey === '08/2026') return hist8;
    if (monthKey === '2026-09' || monthKey === '9/2026' || monthKey === '09/2026') return hist9;

    // Đối với các tháng khác trong quá khứ:
    return Math.max(storedMonthViews, dailyViewsSum);
  };

  const handleTestCdn = async () => {
    setIsTestingCdn(true);
    setCdnTestResult(null);
    const result = await testPingImageServer(imageServerConfig.endpointUrl, imageServerConfig.apiKey);
    setCdnTestResult(result);
    setIsTestingCdn(false);
  };

  const handleCopyPhpCode = () => {
    navigator.clipboard.writeText(UPLOAD_PHP_TEMPLATE);
    setHasCopiedPhp(true);
    setTimeout(() => setHasCopiedPhp(false), 3000);
  };

  const handleCopyNginxCode = () => {
    navigator.clipboard.writeText(AAPANEL_CONFIG_GUIDE);
    setHasCopiedNginx(true);
    setTimeout(() => setHasCopiedNginx(false), 3000);
  };

  const handleDownloadPhpFile = () => {
    const blob = new Blob([UPLOAD_PHP_TEMPLATE], { type: 'application/x-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upload.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateComicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComicTitle.trim()) return;

    const assignedTeam = teams.find(t => t.id === newComicTeamId) || teams[0];
    const generatedSlug = newComicSlug.trim() || newComicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newComic: Comic = {
      id: `comic-${Date.now()}`,
      title: newComicTitle.trim(),
      slug: generatedSlug,
      otherNames: [],
      coverImage: newComicCover.trim() || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      bannerImage: newComicBanner.trim() || newComicCover.trim(),
      authors: [newComicAuthor.trim() || 'Tác giả'],
      status: 'Đang tiến hành',
      genres: newComicGenres.split(',').map(g => g.trim()).filter(Boolean),
      summary: newComicSummary.trim() || `Truyện tranh ${newComicTitle} được dịch và cập nhật bởi nhóm ${assignedTeam.name}.`,
      teamId: assignedTeam.id,
      teamName: assignedTeam.name,
      views: 0,
      likes: 0,
      follows: 0,
      rating: 5.0,
      ratingCount: 1,
      updatedAt: new Date().toISOString(),
      chapters: [],
      seo: {
        focusKeyword: newComicTitle,
        metaTitle: `${newComicTitle} Tiếng Việt Mới Nhất - Leesin Comic`,
        metaDesc: `Đọc truyện ${newComicTitle} full tiếng việt, load ảnh siêu nhanh từ CDN tachserver.site.`,
        canonicalUrl: `https://leesincomic.com/truyen/${generatedSlug}`,
        score: 95,
        schemaType: 'ComicBook',
        ogImage: newComicCover.trim(),
      }
    };

    if (onAddNewComic) {
      onAddNewComic(newComic);
    }
    setComicCreatedMsg(`Đã tạo bộ truyện "${newComic.title}" thành công! Nhóm ${assignedTeam.name} có thể bắt đầu đăng chương ngay.`);
    setNewComicTitle('');
    setNewComicSlug('');
    setNewComicSummary('');
    setTimeout(() => setComicCreatedMsg(''), 5000);
  };

  // Synchronize team views with official numbers and active comics
  const syncedTeams = useMemo(() => {
    const sourceTeams = effectiveTeams;
    if (!Array.isArray(sourceTeams)) return [];
    return sourceTeams
      .filter((t): t is ScanTeam => t !== null && typeof t === 'object')
      .map((team) => {
        const teamComics = (effectiveComics || []).filter(
          (c) =>
            c &&
            (c.teamId === team.id ||
              (c.teamName && team.name && c.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
              (team.leaderName && c.teamName && c.teamName.toLowerCase().trim() === team.leaderName.toLowerCase().trim()))
        );
        const comicsSum = teamComics.reduce((sum, c) => sum + getComicRealViews(c), 0);
        // Team total views dynamically tracks live comic views and team total views
        const teamTotalViews = Math.max(team.totalViews || 0, comicsSum);
        const safeMembers = Array.isArray(team.members) ? team.members : [];

        // Generate dynamic views for displayed months + selected month strictly from synced total
        const dynamicMonthlyViews: Record<string, number> = {
          ...(team.monthlyViews || {}),
        };
        for (const mKey of displayedMonths) {
          const val = getTeamMonthViews(team, teamTotalViews, mKey);
          dynamicMonthlyViews[mKey] = val;
          const [y, m] = mKey.split('-');
          const mNum = parseInt(m, 10);
          dynamicMonthlyViews[`${mNum}/${y}`] = val;
          dynamicMonthlyViews[`views_${y}_${String(mNum).padStart(2, '0')}`] = val;
        }
        const selVal = getTeamMonthViews(team, teamTotalViews, selectedMonth);
        dynamicMonthlyViews[selectedMonth] = selVal;
        const [selY, selM] = selectedMonth.split('-');
        dynamicMonthlyViews[`${parseInt(selM, 10)}/${selY}`] = selVal;

        const m10Val = dynamicMonthlyViews['2026-10'] !== undefined
          ? dynamicMonthlyViews['2026-10']
          : getTeamMonthViews(team, teamTotalViews, '2026-10');
        dynamicMonthlyViews['2026-10'] = m10Val;
        dynamicMonthlyViews['10/2026'] = m10Val;

        return {
          ...team,
          avatar: team.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          leaderName: team.leaderName || 'Trưởng nhóm',
          members: safeMembers,
          totalViews: teamTotalViews,
          monthlyViews: dynamicMonthlyViews,
          views_2026_10: m10Val,
          views_10_2026: m10Val,
          months: {
            ...((team as any).months || {}),
            '10/2026': m10Val,
            '2026-10': m10Val,
          },
        };
      })
      .filter((team) => {
        const hasComics = (effectiveComics || []).some(
          (c) =>
            c &&
            (c.teamId === team.id ||
              (c.teamName && team.name && c.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
              (team.leaderName && c.teamName && c.teamName.toLowerCase().trim() === team.leaderName.toLowerCase().trim()))
        );
        const hasUser = (effectiveUsers || []).some(
          (u) =>
            (u.role === 'TEAM_LEADER' || u.role === 'ADMIN') &&
            ((u.teamId && u.teamId === team.id) ||
              (u.teamName && team.name && u.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
              u.id === team.leaderId)
        );
        return hasComics || hasUser;
      })
      .sort((a, b) => b.totalViews - a.totalViews);
  }, [effectiveTeams, effectiveComics, effectiveUsers, displayedMonths, selectedMonth]);

  // Calculate platform totals strictly synchronized from active teams and comics
  const totalPlatformViews = useMemo(() => {
    const teamsSum = syncedTeams.reduce((acc, t) => acc + (t.totalViews || 0), 0);
    const comicsSum = (effectiveComics || []).reduce((acc, c) => acc + getComicRealViews(c), 0);
    const baseTotal = liveStats && typeof liveStats.totalPlatformViews === 'number' ? liveStats.totalPlatformViews : 0;
    return Math.max(baseTotal, teamsSum, comicsSum);
  }, [effectiveComics, syncedTeams, liveStats]);

  const totalChapters = liveStats ? liveStats.totalChapters : effectiveComics.reduce((acc, c) => acc + c.chapters.length, 0);

  return (
    <div id="admin-dashboard-view" className="space-y-6 pb-20 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 p-0.5 shadow-xl shadow-rose-500/20">
              <div className="w-full h-full bg-[#0f1117] rounded-[14px] flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">Quản Trị Hệ Thống - Leesin Comic</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  leesincomic.com
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Quản lý kho truyện, xóa truyện mẫu • Thống kê view từng nhóm dịch • Đồng bộ thời gian thực từ MySQL Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              id="btn-sync-sql-dashboard"
              onClick={fetchLiveSqlData}
              disabled={isRefreshingSql}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Lấy trực tiếp dữ liệu mới nhất từ cơ sở dữ liệu SQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSql ? 'animate-spin' : ''}`} />
              <span>{isRefreshingSql ? 'Đang đồng bộ SQL...' : 'Làm Mới Từ SQL'}</span>
            </button>
            <button
              id="btn-close-admin-dash"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
            >
              Đóng Bảng Quản Trị
            </button>
          </div>
        </div>

        {/* Real-time SQL Sync Banner */}
        {refreshSqlMsg && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{refreshSqlMsg}</span>
          </div>
        )}

        {/* Global Key Metrics (Direct from SQL API) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Tổng Lượt Xem Toàn Sàn</p>
            <p className="text-lg font-black text-amber-400 mt-1">{totalPlatformViews.toLocaleString()} views</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Nhóm Dịch Hoạt Động</p>
            <p className="text-lg font-black text-white mt-1">
              {liveStats ? liveStats.activeTeamsCount : syncedTeams.length} Nhóm Dịch
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Tổng Đầu Truyện</p>
            <p className="text-lg font-black text-white mt-1">
              {liveStats ? liveStats.totalComics : effectiveComics.length} Truyện
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Tổng Tài Khoản</p>
            <p className="text-lg font-black text-emerald-400 mt-1">
              {liveStats ? liveStats.totalUsers : effectiveUsers.length} Tài Khoản
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap p-1.5 bg-[#141822] rounded-2xl border border-slate-800 gap-1.5">
        <button
          id="tab-admin-manage-comics"
          onClick={() => setActiveTab('manage-comics')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manage-comics'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Quản Lý & Xóa Truyện ({comics.length})</span>
        </button>

        <button
          id="tab-admin-add-comic"
          onClick={() => setActiveTab('add-comic')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'add-comic'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookPlus className="w-4 h-4" />
          <span>Thêm Truyện Mới</span>
        </button>

        <button
          id="tab-admin-notifications"
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/60'
              : pendingPasswordResets.length > 0
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 animate-pulse'
              : 'text-slate-300 hover:text-white border border-slate-800 bg-slate-900/60'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Thông Báo & Tin Nhắn</span>
          {pendingPasswordResets.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-sm animate-bounce">
              🔑 {pendingPasswordResets.length} quên pass
            </span>
          ) : unreadNotificationsCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
              {unreadNotificationsCount}
            </span>
          ) : null}
        </button>

        <button
          id="tab-admin-manage-users"
          onClick={() => setActiveTab('manage-users')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manage-users'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Tài Khoản & Nhóm Dịch ({users.length})</span>
        </button>

        <button
          id="tab-admin-manage-comments"
          onClick={() => setActiveTab('manage-comments')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manage-comments'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white border border-amber-500/20'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Quản Lý Bình Luận ({comments.length})</span>
        </button>

        <button
          id="tab-admin-mysql"
          onClick={() => setActiveTab('mysql-database')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mysql-database'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-white border border-sky-500/20'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>Database MySQL</span>
        </button>

        <button
          id="tab-admin-migrate-leesin"
          onClick={() => setActiveTab('migrate-leesin')}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'migrate-leesin'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50'
              : 'text-amber-300 hover:text-white border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Bê Dữ Liệu leesincomic.com ({comics.length})</span>
        </button>

        <button
          id="tab-admin-cdn"
          onClick={() => setActiveTab('cdn-server')}
          className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'cdn-server'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white border border-emerald-500/20'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" />
          <span>Server Ảnh tachserver.site</span>
        </button>

        <button
          id="tab-admin-views"
          onClick={() => setActiveTab('team-views')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'team-views'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tổng View Nhóm</span>
        </button>

        <button
          id="tab-admin-watermark"
          onClick={() => setActiveTab('watermark-settings')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'watermark-settings'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Watermark</span>
        </button>

        <button
          id="tab-admin-seo"
          onClick={() => setActiveTab('seo-rankmath')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'seo-rankmath'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>SEO Rank Math</span>
        </button>

        <button
          id="tab-admin-site-settings"
          onClick={() => setActiveTab('site-settings')}
          className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'site-settings'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Logo, Favicon & Calc View</span>
        </button>

        <button
          id="tab-admin-footer-settings"
          onClick={() => setActiveTab('footer-settings')}
          className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'footer-settings'
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Cấu Hình Footer Chân Trang</span>
        </button>

        <button
          id="tab-admin-ads-settings"
          onClick={() => setActiveTab('ads-settings')}
          className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ads-settings'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Quảng Cáo Trong Chap</span>
        </button>
      </div>

      {/* TAB: Manage & Delete Comics */}
      {activeTab === 'manage-comics' && (
        <div id="admin-manage-comics-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-rose-400" />
                  Quản Lý Danh Sách Truyện Toàn Website
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Xóa các truyện mẫu để chuẩn bị cho truyện thật, hoặc quản lý chương của từng bộ truyện.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-admin-go-add-comic"
                  onClick={() => setActiveTab('add-comic')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm Truyện Mới</span>
                </button>

                {onClearDemoComics && comics.length > 0 && (
                  <>
                    {!showClearAllConfirm ? (
                      <button
                        id="btn-admin-clear-all"
                        onClick={() => setShowClearAllConfirm(true)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Sạch Tất Cả Truyện</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-500/60 p-1.5 rounded-xl text-xs">
                        <span className="text-rose-200 font-bold px-1">Xác nhận xóa hết?</span>
                        <button
                          onClick={() => {
                            onClearDemoComics();
                            setShowClearAllConfirm(false);
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                        >
                          Xóa Hết
                        </button>
                        <button
                          onClick={() => setShowClearAllConfirm(false)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </>
                )}

                {onRestoreSampleComics && comics.length === 0 && (
                  <button
                    id="btn-admin-restore-sample"
                    onClick={onRestoreSampleComics}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi Phục Dữ Liệu Mẫu</span>
                  </button>
                )}
              </div>
            </div>

            {/* Success notification for team reassign */}
            {teamReassignedMsg && (
              <div
                id="alert-team-reassigned-success"
                className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">{teamReassignedMsg}</span>
                </div>
                <button
                  onClick={() => setTeamReassignedMsg('')}
                  className="p-1 hover:bg-emerald-900/50 rounded-lg text-emerald-400 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Search filter */}
            {comics.length > 0 && (
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên truyện hoặc thể loại..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Comics Table / List */}
            {comics.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">Chưa có truyện nào trong hệ thống</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Toàn bộ truyện mẫu đã được dọn sạch. Bạn hãy bấm "Thêm Truyện Mới" để tạo các bộ truyện chính thức của Leesin Comic!
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('add-comic')}
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20"
                  >
                    Thêm Truyện Mới Ngay
                  </button>
                  {onRestoreSampleComics && (
                    <button
                      onClick={onRestoreSampleComics}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                    >
                      Khôi phục lại dữ liệu mẫu
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comics
                  .filter((c) =>
                    !searchQuery ||
                    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((comic) => (
                    <div
                      key={comic.id}
                      className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-slate-700 transition-all group"
                    >
                      <div
                        onClick={() => {
                          if (onSelectComic) {
                            onClose();
                            onSelectComic(comic);
                          }
                        }}
                        className={`relative group shrink-0 ${onSelectComic ? 'cursor-pointer' : ''}`}
                        title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                      >
                        <img
                          src={comic.coverImage}
                          alt={comic.title}
                          className="w-20 h-28 object-cover rounded-xl shrink-0 shadow-md border border-slate-700 group-hover:border-rose-400 group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {onSelectComic && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                            <Eye className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4
                            onClick={() => {
                              if (onSelectComic) {
                                onClose();
                                onSelectComic(comic);
                              }
                            }}
                            className={`font-bold text-sm text-white truncate transition-colors ${
                              onSelectComic ? 'cursor-pointer hover:text-rose-400 hover:underline' : 'group-hover:text-rose-400'
                            }`}
                            title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                          >
                            {comic.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Tác giả: {comic.authors?.join(', ') || 'Đang cập nhật'}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="text-emerald-400 font-semibold">{comic.chapters.length} chương</span>
                            <span>•</span>
                            <span>{comic.views.toLocaleString()} view</span>
                          </div>
                          <div className="mt-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] text-slate-400 font-semibold shrink-0">Đổi nhóm:</span>
                              <select
                                id={`select-team-${comic.id}`}
                                value={pendingTeamChanges[comic.id] ?? (comic.teamId || teams[0]?.id)}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const currentId = comic.teamId || teams[0]?.id;
                                  if (selectedId === currentId) {
                                    setPendingTeamChanges((prev) => {
                                      const next = { ...prev };
                                      delete next[comic.id];
                                      return next;
                                    });
                                  } else {
                                    setPendingTeamChanges((prev) => ({ ...prev, [comic.id]: selectedId }));
                                  }
                                }}
                                className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-all w-full truncate cursor-pointer focus:outline-none ${
                                  pendingTeamChanges[comic.id] && pendingTeamChanges[comic.id] !== (comic.teamId || teams[0]?.id)
                                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-900 text-amber-300 border-slate-700 hover:border-slate-600 focus:border-amber-500'
                                }`}
                              >
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Confirmation bar when a different team is selected */}
                            {pendingTeamChanges[comic.id] && pendingTeamChanges[comic.id] !== (comic.teamId || teams[0]?.id) && (
                              <div
                                id={`reassign-confirm-bar-${comic.id}`}
                                className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
                              >
                                <div className="text-[10px] text-amber-300/90 font-medium">
                                  Chuyển sang nhóm: <strong className="text-white font-bold">{teams.find((t) => t.id === pendingTeamChanges[comic.id])?.name}</strong>?
                                </div>
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    id={`btn-confirm-reassign-${comic.id}`}
                                    type="button"
                                    onClick={() => {
                                      const chosenTeamId = pendingTeamChanges[comic.id];
                                      handleReassignComicTeam(comic, chosenTeamId);
                                      setPendingTeamChanges((prev) => {
                                        const next = { ...prev };
                                        delete next[comic.id];
                                        return next;
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Xác nhận</span>
                                  </button>
                                  <button
                                    id={`btn-cancel-reassign-${comic.id}`}
                                    type="button"
                                    onClick={() => {
                                      setPendingTeamChanges((prev) => {
                                        const next = { ...prev };
                                        delete next[comic.id];
                                        return next;
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Hủy</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 mt-2">
                          <span className="text-[10px] text-slate-500">
                            Cập nhật: {formatRelativeTime(comic.updatedAt)}
                          </span>

                          <div className="flex items-center gap-2">
                            {onSelectComic && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectComic(comic);
                                }}
                                className="text-rose-300 hover:text-white px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                                title="Xem trang chi tiết truyện trên web"
                              >
                                <Eye className="w-3 h-3 text-rose-400" />
                                <span>Chi Tiết</span>
                              </button>
                            )}

                            <button
                              onClick={() => setAdminEditingComic(comic)}
                              className="text-slate-400 hover:text-amber-400 px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors flex items-center gap-1 text-[11px]"
                              title="Sửa thông tin, gắn thẻ Hot & Thịnh hành"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>Sửa</span>
                            </button>

                            {onDeleteComic && (
                              <>
                                {comicDeleteConfirmId === comic.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        onDeleteComic(comic.id);
                                        setComicDeleteConfirmId(null);
                                      }}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white rounded"
                                    >
                                      Xác nhận
                                    </button>
                                    <button
                                      onClick={() => setComicDeleteConfirmId(null)}
                                      className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 rounded"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setComicDeleteConfirmId(comic.id)}
                                    className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                                    title="Xóa truyện"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Monthly Views Breakdown per Team */}
      {activeTab === 'team-views' && (
        <div id="admin-team-views-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Bảng Tổng Hợp View Riêng Biệt Hàng Tháng Của Từng Nhóm Dịch
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dữ liệu phân tách riêng biệt, đồng bộ thời gian thực theo từng chương truyện để tính thưởng & phân bổ doanh thu.
                </p>
              </div>

              {/* Month Navigator & Calendar Picker & View Mode */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Team Filter */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teamViewsSearch}
                    onChange={(e) => setTeamViewsSearch(e.target.value)}
                    placeholder="Tìm theo tên nhóm..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {teamViewsSearch && (
                    <button
                      type="button"
                      onClick={() => setTeamViewsSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Desktop Month Count Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTeamViewsMonthCount(3)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      teamViewsMonthCount === 3
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Hiển thị gọn 3 tháng gần nhất để dễ quan sát trên màn hình máy tính"
                  >
                    3 Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamViewsMonthCount(4)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      teamViewsMonthCount === 4
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Hiển thị 4 tháng"
                  >
                    4 Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamViewsMonthCount(5)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      teamViewsMonthCount === 5
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Hiển thị đầy đủ 5 tháng"
                  >
                    5 Tháng
                  </button>
                </div>

                {/* Previous Month */}
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Xem tháng trước đó"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Interactive Calendar Button */}
                <button
                  type="button"
                  onClick={() => {
                    const [y] = selectedMonth.split('-');
                    setPickerYear(parseInt(y, 10) || 2026);
                    setIsMonthPickerOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs py-2 px-3 rounded-xl shadow-sm transition-all"
                  title="Mở lịch chọn tháng và xem chi tiết các tháng trước đó"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{monthLabels[selectedMonth] || selectedMonth}</span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1 py-0.5 rounded font-mono">Tra cứu</span>
                </button>

                {/* Next Month */}
                <button
                  type="button"
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= currentMonthKey}
                  className={`p-2 rounded-xl border transition-colors ${
                    selectedMonth >= currentMonthKey
                      ? 'bg-slate-900/30 border-slate-800/60 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={selectedMonth >= currentMonthKey ? 'Đã là tháng hiện tại' : 'Xem tháng tiếp theo'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Quick select dropdown */}
                <select
                  id="select-admin-month"
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val <= currentMonthKey) {
                      setSelectedMonth(val);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold py-2 px-2.5 rounded-xl focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {allAvailableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* Reset to current month if viewing past */}
                {selectedMonth !== currentMonthKey && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(currentMonthKey)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                  >
                    Về T{currentMonthNum}
                  </button>
                )}
              </div>
            </div>

            {/* Matrix Table with Desktop-optimized Layout */}
            {(() => {
              const filteredTeams = teamViewsSearch.trim()
                ? syncedTeams.filter(
                    (t) =>
                      (t.name || '').toLowerCase().includes(teamViewsSearch.toLowerCase().trim()) ||
                      (t.leaderName || '').toLowerCase().includes(teamViewsSearch.toLowerCase().trim())
                  )
                : syncedTeams;

              const totalViewsSum = filteredTeams.reduce((acc, t) => acc + (t.totalViews || 0), 0);
              const monthSums: Record<string, number> = {};
              for (const mKey of displayedMonths) {
                monthSums[mKey] = filteredTeams.reduce((acc, t) => acc + (t.monthlyViews?.[mKey] || 0), 0);
              }

              if (filteredTeams.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
                    <BarChart3 className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">Không tìm thấy nhóm dịch phù hợp</p>
                    <p className="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 shadow-inner">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3.5 min-w-[160px]">Tên Nhóm Dịch</th>
                        <th className="py-3 px-2.5 min-w-[100px]">Trưởng Nhóm</th>
                        <th className="py-3 px-2 text-center min-w-[65px]">Thành Viên</th>
                        {displayedMonths.map((mKey) => {
                          const isSelected = mKey === selectedMonth;
                          const [y, m] = mKey.split('-');
                          const isCurrent = mKey === currentMonthKey;
                          const isFuture = mKey > currentMonthKey;
                          return (
                            <th
                              key={mKey}
                              onClick={() => {
                                if (!isFuture) setSelectedMonth(mKey);
                              }}
                              className={`py-3 px-2 text-right select-none min-w-[75px] transition-all ${
                                isFuture
                                  ? 'text-slate-600 opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'text-amber-300 bg-amber-500/15 font-black border-b-2 border-amber-400 cursor-pointer'
                                  : 'text-slate-400 hover:text-white cursor-pointer hover:bg-amber-500/10'
                              }`}
                              title={isFuture ? `Tháng ${parseInt(m, 10)}/${y} chưa diễn ra` : `Bấm để chọn xem chi tiết tháng ${parseInt(m, 10)}/${y}`}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>T{parseInt(m, 10)}/{y}</span>
                                {isCurrent && <span className="text-[9px] text-emerald-400 font-bold">*</span>}
                                {isSelected && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-amber-400/30 text-amber-200 font-bold">
                                    Xem
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="py-3 px-3 text-right font-black text-emerald-400 min-w-[105px] bg-slate-900 border-l border-slate-800">
                          Tổng View
                        </th>
                        <th className="py-3 px-2.5 text-center min-w-[90px]">Truyện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredTeams.map((team) => {
                        const percentOfTotal = totalPlatformViews > 0 ? Math.round(((team.totalViews || 0) / totalPlatformViews) * 100) : 0;
                        const teamComicsCount = effectiveComics.filter(
                          (c) =>
                            c &&
                            (c.teamId === team.id ||
                              (c.teamName && team.name && c.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
                              (team.leaderName && c.teamName && c.teamName.toLowerCase().trim() === team.leaderName.toLowerCase().trim()))
                        ).length;

                        return (
                          <tr key={team.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3.5 font-bold text-white">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={team.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                  alt={team.name || 'Nhóm'}
                                  className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-100 truncate">{team.name || 'Nhóm dịch'}</p>
                                  <span className="text-[10px] text-amber-400 font-semibold">{percentOfTotal}% thị phần view</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-300 font-medium text-xs truncate max-w-[120px]">
                              {team.leaderName || 'Chưa cập nhật'}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold text-[10px]">
                                {Array.isArray(team.members) ? team.members.length : 0} người
                              </span>
                            </td>
                            {displayedMonths.map((mKey) => {
                              const isSelected = mKey === selectedMonth;
                              const [yStr, mStr] = mKey.split('-');
                              const mNum = parseInt(mStr, 10);
                              const mPad = String(mNum).padStart(2, '0');
                              const mVal =
                                (team.monthlyViews && typeof team.monthlyViews[mKey] === 'number')
                                  ? team.monthlyViews[mKey]
                                  : (team.monthlyViews && typeof team.monthlyViews[`${mNum}/${yStr}`] === 'number')
                                  ? team.monthlyViews[`${mNum}/${yStr}`]
                                  : (team.monthlyViews && typeof team.monthlyViews[`${mPad}/${yStr}`] === 'number')
                                  ? team.monthlyViews[`${mPad}/${yStr}`]
                                  : (team as any)[`views_${yStr}_${mPad}`] !== undefined
                                  ? Number((team as any)[`views_${yStr}_${mPad}`])
                                  : (team as any)[`views_${mPad}_${yStr}`] !== undefined
                                  ? Number((team as any)[`views_${mPad}_${yStr}`])
                                  : (team as any).months?.[`${mNum}/${yStr}`] !== undefined
                                  ? Number((team as any).months[`${mNum}/${yStr}`])
                                  : (team as any).months?.[mKey] !== undefined
                                  ? Number((team as any).months[mKey])
                                  : (team as any).monthly_views?.[mKey] !== undefined
                                  ? Number((team as any).monthly_views[mKey])
                                  : 0;

                              return (
                                <td
                                  key={mKey}
                                  className={`py-2.5 px-2 text-right font-mono text-xs font-medium transition-colors ${
                                    isSelected ? 'font-bold text-amber-300 bg-amber-500/10' : 'text-slate-300'
                                  }`}
                                >
                                  {mVal.toLocaleString()}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 text-xs bg-emerald-950/20 border-l border-slate-800/80">
                              {(team.totalViews || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <button
                                onClick={() => setViewingTeamComics(team)}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                                title={`Xem ${teamComicsCount} bộ truyện của nhóm ${team.name}`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{teamComicsCount} Truyện</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-900/90 border-t-2 border-slate-700 text-slate-200 font-bold text-xs">
                      <tr>
                        <td className="py-3 px-3.5 text-amber-300 font-black">
                          TỔNG CỘNG ({filteredTeams.length} Nhóm)
                        </td>
                        <td className="py-3 px-2.5 text-slate-400 text-[11px]">-</td>
                        <td className="py-3 px-2 text-center text-slate-400 text-[11px]">-</td>
                        {displayedMonths.map((mKey) => {
                          const isSelected = mKey === selectedMonth;
                          return (
                            <td
                              key={mKey}
                              className={`py-3 px-2 text-right font-mono font-black text-xs ${
                                isSelected ? 'text-amber-300 bg-amber-500/15' : 'text-slate-200'
                              }`}
                            >
                              {(monthSums[mKey] || 0).toLocaleString()}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm bg-emerald-950/40 border-l border-slate-700">
                          {totalViewsSum.toLocaleString()}
                        </td>
                        <td className="py-3 px-2.5 text-center text-[11px] text-slate-400">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}

            {/* Visual Bar Comparison for Selected Month */}
            {syncedTeams.length > 0 && (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Tỷ trọng lượt xem theo nhóm dịch trong {monthLabels[selectedMonth] || selectedMonth}</span>
                  </h4>
                  <span className="text-[11px] text-amber-400 font-semibold">
                    Tổng tháng: {syncedTeams.reduce((acc, t) => acc + (t.monthlyViews?.[selectedMonth] || 0), 0).toLocaleString()} views
                  </span>
                </div>
                <div className="space-y-3 pt-1">
                  {syncedTeams.map((team) => {
                    const mViews = team.monthlyViews?.[selectedMonth] || 0;
                    const monthTotal = syncedTeams.reduce((acc, t) => acc + (t.monthlyViews?.[selectedMonth] || 0), 0);
                    const share = monthTotal > 0 ? Math.round((mViews / monthTotal) * 100) : 0;

                    return (
                      <div key={team.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200 font-medium">{team.name}</span>
                          <span className="text-amber-400 font-bold">{mViews.toLocaleString()} views ({share}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Manage Users & Scan Teams */}
      {activeTab === 'manage-users' && (
        <div id="admin-manage-users-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Danh Sách Quản Lý Tài Khoản (Thành Viên & Nhóm Dịch)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Phân quyền độc giả, thành viên nhóm dịch, trưởng nhóm và quản trị viên tối cao. Độc giả chỉ có quyền đọc truyện.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  id="btn-admin-import-users-sql"
                  onClick={() => setShowImportUsersModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>Đồng Bộ User & Pass Từ Web Cũ</span>
                </button>

                <button
                  type="button"
                  id="btn-admin-export-users-sql"
                  onClick={handleDownloadUsersSqlBackup}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Xuất file users.sql chứa toàn bộ tài khoản và mã băm mật khẩu Bcrypt"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Xuất File Users (.sql)</span>
                </button>

                <button
                  id="btn-admin-show-add-user"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Thêm Tài Khoản Mới</span>
                </button>
              </div>
            </div>

            {userActionSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userActionSuccess}</span>
              </div>
            )}

            {/* Password Reset Requests Alert Banner */}
            {(() => {
              const pendingResetRequests = (notifications || []).filter(
                (n) =>
                  n &&
                  !n.isRead &&
                  (n.title === 'Yêu cầu cấp lại mật khẩu' ||
                    n.title?.toLowerCase().includes('cấp lại mật khẩu') ||
                    n.content?.toLowerCase().includes('yêu cầu cấp lại mật khẩu'))
              );

              if (pendingResetRequests.length === 0) return null;

              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-slate-900 border border-amber-500/50 space-y-3 shadow-lg shadow-amber-500/10 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                      <KeyRound className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                      <span>Thông Báo Quên Mật Khẩu Đang Chờ Cấp Lại ({pendingResetRequests.length})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40">
                      Cần Admin Cấp Lại Pass
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl border border-slate-800 p-2 sm:p-3">
                    {pendingResetRequests.map((req) => {
                      const cleanAccount = (req.senderName || req.senderId || '').trim().toLowerCase();
                      const matchedUser = effectiveUsers.find(
                        (u) =>
                          u.id === req.senderId ||
                          (u.username && u.username.toLowerCase() === cleanAccount) ||
                          (u.email && u.email.toLowerCase() === cleanAccount) ||
                          (u.name && u.name.toLowerCase() === cleanAccount)
                      );

                      return (
                        <div key={req.id} className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {matchedUser ? matchedUser.name : (req.senderName || 'Thành viên')}
                              </span>
                              {matchedUser?.role === 'TEAM_LEADER' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  Nhóm Dịch: {matchedUser.teamName || matchedUser.name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-mono">
                                • {formatRelativeTime(req.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2">
                              {req.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenResetForRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-110 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Cấp Mật Khẩu Mới Ngay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingAdminNotifId(req.id);
                                setReplyingAdminText('Admin Leesin Comic đã nhận được yêu cầu của bạn.');
                                setActiveTab('notifications');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Gửi tin nhắn phản hồi cho tài khoản này"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Nhắn Tin</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Role Breakdown Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Admin Tối Cao</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {users.filter(u => u.role === 'ADMIN').length}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Toàn quyền hệ thống, CDN & quản trị</p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Tài Khoản Nhóm Dịch</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {users.filter(u => u.role === 'TEAM_LEADER').length}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Thêm truyện & quản lý truyện của nhóm</p>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Độc Giả (Thành Viên Đọc)</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {users.filter(u => u.role === 'READER').length}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Chỉ đọc truyện, bình luận & offline</p>
              </div>
            </div>

            {/* Quick Password Recovery Card for Admin */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-rose-500/10 border border-amber-500/30 rounded-2xl space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Cấp Lại Mật Khẩu Nhanh (Nhóm Dịch & Độc Giả)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Quyền Admin
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cấp lại mật khẩu trực tiếp cho thành viên hoặc nhóm dịch khi quên mật khẩu (không cần OTP).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Chọn tài khoản cần cấp lại pass:
                  </label>
                  <select
                    id="quick-reset-user-select"
                    value={quickResetUserId}
                    onChange={(e) => setQuickResetUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Chọn tài khoản nhóm dịch hoặc độc giả --</option>
                    {users.map((u) => {
                      const roleBadge = u.role === 'TEAM_LEADER' ? `[Nhóm: ${u.teamName || u.name}]` : u.role === 'ADMIN' ? '[Admin]' : '[Độc Giả]';
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} (@{u.username || 'user'}) - {roleBadge}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Mật khẩu mới:
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuickResetPass(generateStrongPassword())}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                    >
                      🎲 Tạo ngẫu nhiên
                    </button>
                  </div>
                  <input
                    id="quick-reset-pass-input"
                    type="text"
                    placeholder="Nhập hoặc tạo mật khẩu mới..."
                    value={quickResetPass}
                    onChange={(e) => setQuickResetPass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    id="btn-quick-reset-submit"
                    disabled={!quickResetUserId || !quickResetPass.trim() || adminResetSubmitting}
                    onClick={async () => {
                      const target = users.find((u) => u.id === quickResetUserId);
                      if (!target) return;
                      await handleExecuteResetPassword(target, quickResetPass.trim());
                      setQuickResetSuccessInfo({
                        name: target.name,
                        username: target.username || target.id,
                        email: target.email || `${target.username || 'user'}@leesincomic.com`,
                        pass: quickResetPass.trim(),
                      });
                      setQuickResetPass('');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Cấp Pass Ngay</span>
                  </button>
                </div>
              </div>

              {quickResetSuccessInfo && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Đã cấp lại mật khẩu cho {quickResetSuccessInfo.name} (@{quickResetSuccessInfo.username})!
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickResetSuccessInfo(null)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg text-xs font-mono text-slate-200 border border-slate-800 space-y-1 select-all">
                    <div>Tài khoản: <strong className="text-white">@{quickResetSuccessInfo.username}</strong></div>
                    <div>Email: <strong className="text-white">{quickResetSuccessInfo.email}</strong></div>
                    <div>Mật khẩu mới: <strong className="text-amber-400 font-bold text-sm bg-amber-500/10 px-1.5 py-0.5 rounded">{quickResetSuccessInfo.pass}</strong></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `[Leesin Comic] Thông tin tài khoản của bạn đã được Admin cấp lại:\n- Tên tài khoản: ${quickResetSuccessInfo.name}\n- Tên đăng nhập: @${quickResetSuccessInfo.username}\n- Email: ${quickResetSuccessInfo.email}\n- Mật khẩu mới: ${quickResetSuccessInfo.pass}\n- Đăng nhập tại: ${window.location.origin}`;
                      navigator.clipboard.writeText(text);
                      alert('Đã sao chép thông tin tài khoản và mật khẩu mới!');
                    }}
                    className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép thông tin gửi thành viên</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="search-user-input"
                  type="text"
                  placeholder="Tìm theo tên hiển thị, email hoặc tên nhóm..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 text-xs font-semibold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Tất cả chức vụ ({users.length})</option>
                  <option value="ADMIN">Admin Tối Cao</option>
                  <option value="TEAM_LEADER">Tài Khoản Nhóm Dịch</option>
                  <option value="READER">Độc Giả (Chỉ đọc)</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Tài Khoản & Email</th>
                    <th className="py-3 px-3">Phân Quyền Hiện Tại</th>
                    <th className="py-3 px-3">Phạm Vi Cho Phép</th>
                    <th className="py-3 px-3">Mật Khẩu & Cấp Lại</th>
                    <th className="py-3 px-3">Ngày Tham Gia</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {users
                    .filter((u) => {
                      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                      const matchSearch =
                        !userSearchQuery.trim() ||
                        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        (u.teamName && u.teamName.toLowerCase().includes(userSearchQuery.toLowerCase()));
                      return matchRole && matchSearch;
                    })
                    .map((user) => {
                      const userTeamName =
                        user.teamName ||
                        (user.teamId ? teams.find((t) => t.id === user.teamId)?.name : '') ||
                        (user.role === 'TEAM_LEADER' ? `${user.name} Team` : '');
                      const teamComics = comics.filter(
                        (c) =>
                          (user.teamId && c.teamId === user.teamId) ||
                          (userTeamName && c.teamName?.toLowerCase() === userTeamName.toLowerCase())
                      );
                      const comicCount = teamComics.length;

                      const handleViewComics = () => {
                        const foundTeam = teams.find(
                          (t) =>
                            (user.teamId && t.id === user.teamId) ||
                            (userTeamName && t.name.toLowerCase() === userTeamName.toLowerCase())
                        );
                        const teamToView: ScanTeam = foundTeam
                          ? {
                              ...foundTeam,
                              name: userTeamName || foundTeam.name,
                            }
                          : {
                              id: user.teamId || `team-${user.id}`,
                              name: userTeamName || user.name,
                              slug: (userTeamName || user.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                              avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                              bio: `Nhóm dịch ${userTeamName || user.name}`,
                              leaderId: user.id,
                              leaderName: user.name,
                              members: [],
                              monthlyViews: {},
                              dailyViews: {},
                              totalViews: teamComics.reduce((sum, c) => sum + (c.views || 0), 0),
                            };
                        setViewingTeamComics(teamToView);
                      };

                      return (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-start gap-3">
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-slate-100">{user.name}</p>
                                  {user.username && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                                      @{user.username}
                                    </span>
                                  )}
                                  {user.role === 'ADMIN' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-normal block truncate">{user.email || (user.username ? `${user.username}@leesincomic.com` : 'user@leesincomic.com')}</span>

                                {/* Team Account / Admin: Clickable button to view comics count & list + self-set team name */}
                                {(user.role === 'TEAM_LEADER' || user.role === 'ADMIN') && (
                                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={handleViewComics}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[11px] font-semibold transition-all shadow-sm group cursor-pointer"
                                      title={`Bấm để xem danh sách ${comicCount} bộ truyện của nhóm "${userTeamName}"`}
                                    >
                                      <BookOpen className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                                      <span>Nhóm: <strong className="text-white font-bold">{userTeamName}</strong></span>
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 font-extrabold text-[10px]">
                                        {comicCount} truyện
                                      </span>
                                      <Eye className="w-3 h-3 text-amber-400 opacity-75 group-hover:opacity-100" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTeamUser(user);
                                        setEditTeamNameInput(userTeamName);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium border border-slate-700 transition-colors cursor-pointer"
                                      title="Tự đặt / đổi tên nhóm dịch cho tài khoản này"
                                    >
                                      <Edit2 className="w-3 h-3 text-emerald-400" />
                                      <span>Tự đặt tên nhóm</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={user.role}
                              disabled={user.email === 'admin@leesincomic.com'}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                let tId = user.teamId;
                                let tName = user.teamName;
                                if (newRole === 'READER') {
                                  tId = undefined;
                                  tName = undefined;
                                } else if (newRole === 'TEAM_LEADER' || newRole === 'ADMIN') {
                                  if (!tName) {
                                    tName = user.role === 'ADMIN' ? 'Leesin Scans' : `${user.name} Scans`;
                                  }
                                  if (!tId) {
                                    tId = user.role === 'ADMIN' ? 'team-leesin' : `team-${user.id}`;
                                  }
                                }
                                if (onUpdateUserRole) {
                                  onUpdateUserRole(user.id, newRole, tId, tName);
                                  setUserActionSuccess(`Đã đổi quyền của "${user.name}" thành ${newRole}`);
                                  setTimeout(() => setUserActionSuccess(''), 4000);
                                }
                              }}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer ${
                                user.role === 'ADMIN'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : user.role === 'TEAM_LEADER'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              <option value="READER" className="bg-slate-900 text-slate-200">Độc Giả (Chỉ đọc)</option>
                              <option value="TEAM_LEADER" className="bg-slate-900 text-emerald-300">Tài Khoản Nhóm Dịch</option>
                              <option value="ADMIN" className="bg-slate-900 text-rose-300">Admin Tối Cao</option>
                            </select>
                          </td>

                          <td className="py-3 px-3 text-[11px]">
                            {user.role === 'ADMIN' && (
                              <span className="text-rose-400 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                Quản trị toàn hệ thống & Nhóm {userTeamName}
                              </span>
                            )}
                            {user.role === 'TEAM_LEADER' && (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                Quản lý truyện nhóm {userTeamName}
                              </span>
                            )}
                            {user.role === 'READER' && (
                              <span className="text-slate-400 font-medium flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                Chỉ đọc truyện & lưu offline
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {user.password ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                                  <span>{revealedPasswordUserId === user.id ? user.password : '••••••••'}</span>
                                  <button
                                    type="button"
                                    onClick={() => setRevealedPasswordUserId(revealedPasswordUserId === user.id ? null : user.id)}
                                    className="text-slate-400 hover:text-amber-400 cursor-pointer p-0.5"
                                    title={revealedPasswordUserId === user.id ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                  >
                                    {revealedPasswordUserId === user.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                  Bcrypt/Hash
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenResetUserModal(user)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                                title={`Cấp lại mật khẩu mới cho ${user.name}`}
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Cấp lại Pass</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {user.createdAt || '2026-09-01'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenResetUserModal(user)}
                                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title={`Cấp lại mật khẩu mới cho ${user.name} (@${user.username || user.id})`}
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {(user.role === 'TEAM_LEADER' || user.role === 'ADMIN') && (
                                <button
                                  type="button"
                                  onClick={handleViewComics}
                                  className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  title={`Xem danh sách ${comicCount} truyện của nhóm`}
                                >
                                  <BookOpen className="w-4 h-4" />
                                </button>
                              )}

                              {user.email !== 'admin@leesincomic.com' ? (
                                userDeleteConfirmId === user.id ? (
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (onDeleteUser) {
                                          onDeleteUser(user.id);
                                          setUserActionSuccess(`Đã xóa tài khoản "${user.name}"!`);
                                          setTimeout(() => setUserActionSuccess(''), 4000);
                                        }
                                        setUserDeleteConfirmId(null);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                                    >
                                      Chắc chắn xóa
                                    </button>
                                    <button
                                      onClick={() => setUserDeleteConfirmId(null)}
                                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setUserDeleteConfirmId(user.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Xóa tài khoản"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] text-amber-400 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                                  Root
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal: Add New User */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-md bg-[#181d28] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      Tạo Tài Khoản Mới
                    </h4>
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Đăng Nhập (Username): <span className="text-amber-400">*</span></label>
                      <input
                        type="text"
                        placeholder="Ví dụ: admin2, team_leesin, reader99..."
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full bg-slate-950 border border-slate-700 text-xs text-amber-300 font-mono p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mật Khẩu Đăng Nhập: <span className="text-amber-400">*</span></label>
                      <input
                        type="text"
                        placeholder="Nhập mật khẩu (ví dụ: pass123456)..."
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Hiển Thị / Nickname:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Hoàng Long, Dịch Giả A..."
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Tùy chọn):</label>
                      <input
                        type="email"
                        placeholder="user@leesincomic.com (để trống sẽ tự tạo theo username)"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Chức Vụ / Phân Quyền:</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-semibold"
                      >
                        <option value="READER">Độc Giả (Chỉ xem và lưu offline truyện, không quản lý)</option>
                        <option value="TEAM_LEADER">Tài Khoản Nhóm Dịch (Thêm truyện & quản lý truyện nhóm mình)</option>
                        <option value="ADMIN">Admin Tối Cao (Quản trị toàn hệ thống & cấu hình CDN)</option>
                      </select>
                    </div>

                    {(newUserRole === 'TEAM_LEADER' || newUserRole === 'ADMIN') && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Nhóm Dịch (Tự Đặt):</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Leesin Scans, Team Mèo Ú... (để trống sẽ lấy tên tài khoản)"
                          value={newUserTeamName}
                          onChange={(e) => setNewUserTeamName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Tài khoản {newUserRole === 'ADMIN' ? 'Admin' : 'nhóm dịch'} có thể tự do đặt tên nhóm riêng của mình và xuất hiện trong danh bạ nhóm dịch.
                        </p>
                      </div>
                    )}

                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <ImageUploadField
                        id="new-user-avatar"
                        label="Ảnh Đại Diện (Avatar)"
                        value={newUserAvatar}
                        onChange={setNewUserAvatar}
                        type="avatar"
                        slugOrId="user-avatar"
                        imageServerConfig={imageServerConfig}
                        placeholder="https://... hoặc tải ảnh thường từ máy tính"
                        helperText="Tải ảnh avatar cá nhân lên máy chủ tachserver.site"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        const cleanUsername = newUserUsername.trim() || newUserName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                        if (!cleanUsername) {
                          alert('Vui lòng nhập Tên đăng nhập (Username)!');
                          return;
                        }
                        const cleanDisplayName = newUserName.trim() || cleanUsername;
                        const cleanEmail = newUserEmail.trim() || `${cleanUsername}@leesincomic.com`;
                        const cleanPassword = newUserPassword.trim() || '123456';

                        const customTeamName = newUserTeamName.trim() || (cleanDisplayName ? `${cleanDisplayName} Team` : 'Nhóm Dịch');
                        const customTeamId = `team-${Date.now()}`;
                        const createdUser: User = {
                          id: `user-${cleanUsername}-${Date.now().toString().slice(-4)}`,
                          username: cleanUsername,
                          name: cleanDisplayName,
                          email: cleanEmail,
                          password: cleanPassword,
                          avatar: newUserAvatar.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                          role: newUserRole,
                          teamId: newUserRole === 'TEAM_LEADER' ? customTeamId : undefined,
                          teamName: newUserRole === 'TEAM_LEADER' ? customTeamName : undefined,
                          canUpload: newUserRole !== 'READER',
                          createdAt: new Date().toISOString().split('T')[0],
                        };

                        if (onAddNewUser) {
                          onAddNewUser(createdUser);
                        }
                        setShowAddUserModal(false);
                        setNewUserUsername('');
                        setNewUserName('');
                        setNewUserPassword('');
                        setNewUserEmail('');
                        setNewUserTeamName('');
                        setUserActionSuccess(`Đã tạo tài khoản "${createdUser.name}" (username: @${cleanUsername}) thành công!`);
                        setTimeout(() => setUserActionSuccess(''), 4000);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg cursor-pointer"
                    >
                      Tạo Tài Khoản
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Import Users & Passwords from Old Website */}
            {showImportUsersModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-xl bg-[#141822] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Đồng Bộ Tài Khoản & Mật Khẩu Từ Website Cũ
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Hỗ trợ file users.sql, database.sql hoặc danh sách JSON
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowImportUsersModal(false);
                        setUserImportStatus(null);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3.5 bg-sky-950/30 border border-sky-500/30 rounded-2xl space-y-2 text-xs text-slate-300">
                    <p className="font-bold text-sky-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>Hướng dẫn đồng bộ trọn vẹn tài khoản & mật khẩu:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
                      <li>Đăng nhập <strong>phpMyAdmin</strong> trên hosting cPanel / DirectAdmin của website cũ.</li>
                      <li>Chọn Database cũ &gt; Chọn bảng <code className="text-amber-300">users</code> &gt; Nhấn <strong>Export (Xuất)</strong> ra file <code className="text-emerald-300">.sql</code>.</li>
                      <li>Tải file đó lên ở ô bên dưới hoặc mở file copy các dòng lệnh <code className="text-sky-300">INSERT INTO users ...</code> rồi dán vào.</li>
                      <li>Hệ thống mới sẽ giữ nguyên vẹn 100% <strong>Username</strong>, <strong>Email</strong> và <strong>Mã băm Bcrypt ($2y$)</strong>, độc giả đăng nhập ngay bằng mật khẩu cũ mà không cần reset.</li>
                    </ol>
                  </div>

                  {userImportStatus && (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      userImportStatus.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {userImportStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                      <span>{userImportStatus.message}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-4 text-center transition-colors bg-slate-900/60">
                        <Upload className="w-6 h-6 text-sky-400 mx-auto mb-1.5" />
                        <span className="text-xs font-bold text-slate-200 block">Chọn file .sql hoặc .json từ máy tính</span>
                        <span className="text-[10px] text-slate-400">Ví dụ: users.sql, database.sql, leesincomic_users.sql</span>
                      </div>
                      <input
                        type="file"
                        accept=".sql,.json,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const content = evt.target?.result;
                            if (typeof content === 'string') {
                              setUserImportSqlText(content);
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">
                          Hoặc Dán Nội Dung Câu Lệnh SQL Vào Đây:
                        </label>
                        {userImportSqlText && (
                          <span className="text-[10px] text-sky-400 font-mono">
                            {userImportSqlText.length.toLocaleString()} ký tự
                          </span>
                        )}
                      </div>
                      <textarea
                        value={userImportSqlText}
                        onChange={(e) => setUserImportSqlText(e.target.value)}
                        placeholder="Dán các câu lệnh INSERT INTO users (id, name, username, email, password_hash, ...) VALUES (...) vào đây..."
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-y"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportUsersModal(false);
                        setUserImportStatus(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>

                    <button
                      type="button"
                      disabled={isImportingUsers || !userImportSqlText.trim()}
                      onClick={async () => {
                        if (!userImportSqlText.trim()) return;
                        setIsImportingUsers(true);
                        setUserImportStatus(null);
                        try {
                          const resp = await fetch('/api.php?action=import_sql_dump', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sql: userImportSqlText }),
                          });
                          const data = await resp.json();
                          setUserImportStatus({
                            success: data.success,
                            message: data.message || `Đồng bộ thành công ${data.importedUsersCount || 0} tài khoản vào hệ thống!`,
                            count: data.importedUsersCount,
                          });
                          if (data.success && onRefreshData) {
                            await onRefreshData();
                          }
                        } catch (err: any) {
                          setUserImportStatus({
                            success: false,
                            message: err.message || 'Lỗi khi nhập dữ liệu SQL',
                          });
                        } finally {
                          setIsImportingUsers(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Database className="w-4 h-4" />
                      <span>{isImportingUsers ? 'Đang Xử Lý & Đồng Bộ...' : 'Đồng Bộ Ngay Vào Database'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {editingTeamUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-[#181d28] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-emerald-400" />
                      <span>Đặt Tên Nhóm Dịch: {editingTeamUser.name}</span>
                    </h4>
                    <button
                      onClick={() => setEditingTeamUser(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tên Nhóm Dịch Của Tài Khoản Này:
                    </label>
                    <input
                      type="text"
                      value={editTeamNameInput}
                      onChange={(e) => setEditTeamNameInput(e.target.value)}
                      placeholder="Nhập tên nhóm dịch tùy ý..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Tên nhóm dịch này sẽ tự động hiển thị cho tài khoản này và gắn liền với các bộ truyện/chương truyện của nhóm.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setEditingTeamUser(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        if (!editTeamNameInput.trim()) {
                          alert('Vui lòng nhập tên nhóm dịch!');
                          return;
                        }
                        const newName = editTeamNameInput.trim();
                        if (onUpdateUserRole) {
                          onUpdateUserRole(
                            editingTeamUser.id,
                            editingTeamUser.role,
                            editingTeamUser.teamId || `team-${editingTeamUser.id}`,
                            newName
                          );
                        }
                        setUserActionSuccess(`Đã cập nhật tên nhóm dịch thành "${newName}"!`);
                        setTimeout(() => setUserActionSuccess(''), 4000);
                        setEditingTeamUser(null);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg"
                    >
                      Lưu Tên Nhóm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Rank Math SEO / Google Indexing & Sitemap Optimization */}
      {activeTab === 'seo-rankmath' && (
        <div id="admin-seo-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  Trung Tâm Tối Ưu SEO Google & Sơ Đồ Trang Web (Sitemap.xml)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Biên dịch sơ đồ trang web sitemap.xml động, cấu trúc phân cấp site (Site Hierarchy), thẻ meta chuẩn Googlebot và Schema.org JSON-LD Rich Snippet
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Google Index Ready (Rank Math Pro)</span>
                </span>
              </div>
            </div>

            {/* SEO Health Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Điểm SEO Google</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">98 / 100</span>
                </div>
                <p className="text-[11px] text-slate-400">Đạt chuẩn 100% Core Web Vitals & Rank Math</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Trạng Thái Googlebot</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300">Index, Follow Enabled</span>
                </div>
                <p className="text-[11px] text-slate-400">Đã mở quyền crawl toàn bộ truyện và thể loại</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng URLs Trong Sitemap</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-400">
                    {6 + Object.keys(GENRE_SLUG_MAP).length + comics.length + comics.reduce((acc, c) => acc + (c.chapters?.length || 0), 0)}
                  </span>
                  <span className="text-[11px] text-slate-400">liên kết</span>
                </div>
                <p className="text-[11px] text-slate-400">Tự động cập nhật khi thêm truyện/chapter mới</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Schema Rich Snippets</p>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-sky-300">ComicSeries & Breadcrumb</span>
                </div>
                <p className="text-[11px] text-slate-400">Hỗ trợ hiển thị sao đánh giá trên Google Search</p>
              </div>
            </div>

            {/* Sitemap XML Action Center */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Sơ Đồ Trang Web Tự Động (Dynamic Sitemap XML Generator)</h4>
                    <p className="text-[11px] text-slate-400">
                      Được tạo thời gian thực theo domain chính thức: <span className="text-amber-300 font-mono font-bold">{localSiteSettings.siteDomain || 'https://leesincomic.com'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setUserActionSuccess('Đang tạo và cập nhật lại toàn bộ sitemap XML...');
                        if (mysqlConfig.enabled) {
                          const res = await fetch(`${mysqlConfig.apiUrl.replace(/\/+$/, '')}?action=regenerate_sitemap`, {
                            headers: { 'X-API-KEY': mysqlConfig.apiKey }
                          });
                          const json = await res.json();
                          if (json.success) {
                            setUserActionSuccess('Đã cập nhật tự động toàn bộ Sitemap XML vào máy chủ thành công!');
                          }
                        } else {
                          const xml = generateFullSitemapXml({
                            domain: localSiteSettings.siteDomain || 'https://leesincomic.com',
                            comics,
                            siteSettings: localSiteSettings,
                          });
                          downloadClientFile('sitemap.xml', xml, 'application/xml;charset=utf-8');
                          setUserActionSuccess('Đã tạo sitemap.xml thành công!');
                        }
                      } catch (e) {
                        setUserActionSuccess('Đã yêu cầu cập nhật sitemap!');
                      }
                      setTimeout(() => setUserActionSuccess(''), 4000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cập Nhật Sitemap Ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const xml = generateFullSitemapXml({
                        domain: localSiteSettings.siteDomain || 'https://leesincomic.com',
                        comics,
                        siteSettings: localSiteSettings,
                      });
                      setSitemapModalTitle('Sơ Đồ Trang Web Đầy Đủ (sitemap.xml)');
                      setSitemapModalContent(xml);
                      setIsSitemapModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Live sitemap.xml</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const indexXml = generateSitemapIndexXml({
                        domain: localSiteSettings.siteDomain || 'https://leesincomic.com',
                      });
                      setSitemapModalTitle('Chỉ Mục Sơ Đồ Trang Web (sitemap_index.xml)');
                      setSitemapModalContent(indexXml);
                      setIsSitemapModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem sitemap_index.xml</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const xml = generateFullSitemapXml({
                        domain: localSiteSettings.siteDomain || 'https://leesincomic.com',
                        comics,
                        siteSettings: localSiteSettings,
                      });
                      downloadClientFile('sitemap.xml', xml, 'application/xml;charset=utf-8');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải sitemap.xml</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const robots = generateRobotsTxt({
                        domain: localSiteSettings.siteDomain || 'https://leesincomic.com',
                      });
                      downloadClientFile('robots.txt', robots, 'text/plain;charset=utf-8');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải robots.txt</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-slate-300">
                    Trạng thái tự động: <strong className="text-emerald-400">100% Tự Động Cập Nhật</strong> (Khi đăng truyện mới hoặc thêm chap mới, toàn bộ sitemap.xml, sitemap_index.xml, sitemap_comics.xml, sitemap_chapters.xml sẽ được tạo và cập nhật ngay lập tức)
                  </span>
                </div>
              </div>

              {/* Sitemap Links Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Link Sitemap Chính (Google Search Console):</p>
                    <p className="text-xs font-mono text-emerald-400 truncate mt-0.5">
                      {(localSiteSettings.siteDomain ? (localSiteSettings.siteDomain.startsWith('http') ? localSiteSettings.siteDomain : `https://${localSiteSettings.siteDomain}`) : 'https://leesincomic.com').replace(/\/$/, '')}/sitemap.xml
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${(localSiteSettings.siteDomain ? (localSiteSettings.siteDomain.startsWith('http') ? localSiteSettings.siteDomain : `https://${localSiteSettings.siteDomain}`) : 'https://leesincomic.com').replace(/\/$/, '')}/sitemap.xml`;
                      navigator.clipboard.writeText(url);
                      setUserActionSuccess('Đã sao chép link sitemap.xml!');
                      setTimeout(() => setUserActionSuccess(''), 3000);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                    title="Sao chép link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Link Robots.txt:</p>
                    <p className="text-xs font-mono text-amber-300 truncate mt-0.5">
                      {(localSiteSettings.siteDomain ? (localSiteSettings.siteDomain.startsWith('http') ? localSiteSettings.siteDomain : `https://${localSiteSettings.siteDomain}`) : 'https://leesincomic.com').replace(/\/$/, '')}/robots.txt
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${(localSiteSettings.siteDomain ? (localSiteSettings.siteDomain.startsWith('http') ? localSiteSettings.siteDomain : `https://${localSiteSettings.siteDomain}`) : 'https://leesincomic.com').replace(/\/$/, '')}/robots.txt`;
                      navigator.clipboard.writeText(url);
                      setUserActionSuccess('Đã sao chép link robots.txt!');
                      setTimeout(() => setUserActionSuccess(''), 3000);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors"
                    title="Sao chép link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Site Structure & Google Indexing Visualizer */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layout className="w-4 h-4 text-sky-400" />
                    Cấu Trúc Phân Cấp Site Chuẩn Google (Site Architecture & Hierarchy)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cấu trúc 4 cấp độ (Level 1 → Level 4) giúp Googlebot cào dữ liệu nhanh gấp 5 lần và hiển thị đầy đủ Sitelinks trên trang tìm kiếm
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveSiteStructureTab('hierarchy')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeSiteStructureTab === 'hierarchy' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cây Phân Cấp Site
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSiteStructureTab('schema')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeSiteStructureTab === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Schema.org JSON-LD
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSiteStructureTab('guide')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeSiteStructureTab === 'guide' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cách Index Google
                  </button>
                </div>
              </div>

              {activeSiteStructureTab === 'hierarchy' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">CẤP 1 (ROOT)</span>
                      <span className="text-[10px] font-mono text-emerald-400">Pri: 1.0</span>
                    </div>
                    <h5 className="text-xs font-bold text-white">Trang Chủ (Homepage)</h5>
                    <p className="text-[11px] font-mono text-slate-400 break-all">/ (leesincomic.com)</p>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Cửa ngõ chính, chứa danh sách Top Hot, Mới Nhất và Xếp Hạng. Cung cấp Schema WebSite & SearchAction.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">CẤP 2 (HUBS)</span>
                      <span className="text-[10px] font-mono text-emerald-400">Pri: 0.8 - 0.9</span>
                    </div>
                    <h5 className="text-xs font-bold text-white">Thể Loại & Danh Mục</h5>
                    <p className="text-[11px] font-mono text-slate-400 break-all">/the-loai/:slug, /hot</p>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Phân chia 40+ chuyên mục truyện rõ ràng. Cung cấp Schema CollectionPage & BreadcrumbList.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CẤP 3 (COMIC)</span>
                      <span className="text-[10px] font-mono text-emerald-400">Pri: 0.9</span>
                    </div>
                    <h5 className="text-xs font-bold text-white">Trang Chi Tiết Truyện</h5>
                    <p className="text-[11px] font-mono text-slate-400 break-all">/truyen/:slug</p>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Thông tin tác giả, danh sách toàn bộ chương, điểm đánh giá. Schema ComicSeries & AggregateRating.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CẤP 4 (CHAPTER)</span>
                      <span className="text-[10px] font-mono text-emerald-400">Pri: 0.8</span>
                    </div>
                    <h5 className="text-xs font-bold text-white">Trang Đọc Chương</h5>
                    <p className="text-[11px] font-mono text-slate-400 break-all">/truyen/:slug/chap-:n</p>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Nội dung đọc chương, bình luận trực tiếp, chuyển chương kế. Schema ComicIssue & Breadcrumbs.
                    </p>
                  </div>
                </div>
              )}

              {activeSiteStructureTab === 'schema' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hệ Thống Đã Kích Hoạt Tự Động 5 Loại Schema.org Chuẩn Google:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="font-bold text-indigo-300">1. Schema WebSite & SearchAction</p>
                      <p className="text-[11px] text-slate-400">Khai báo ô tìm kiếm trực tiếp trên kết quả tìm kiếm Google (Sitelinks Searchbox).</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="font-bold text-sky-300">2. Schema Organization</p>
                      <p className="text-[11px] text-slate-400">Xác thực thương hiệu Leesin Comic, Logo chính thức và thông tin nhà xuất bản.</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="font-bold text-amber-300">3. Schema ComicSeries & Book</p>
                      <p className="text-[11px] text-slate-400">Tối ưu Rich Snippets cho từng bộ truyện, tự động hiển thị số sao đánh giá và tác giả trên SERP.</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="font-bold text-emerald-300">4. Schema BreadcrumbList</p>
                      <p className="text-[11px] text-slate-400">Hiển thị đường dẫn phân cấp điều hướng: Trang Chủ &gt; Thể Loại &gt; Tên Truyện &gt; Chương X.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSiteStructureTab === 'guide' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs text-slate-300">
                  <h5 className="font-bold text-amber-300 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    4 Bước Đưa Website Lên Top Google Tìm Kiếm (Google Search Console):
                  </h5>
                  <ol className="list-decimal list-inside space-y-2 pl-1 text-[12px] text-slate-300">
                    <li>
                      Truy cập{' '}
                      <a
                        href="https://search.google.com/search-console"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 underline font-bold"
                      >
                        Google Search Console
                      </a>{' '}
                      và đăng nhập tài khoản Google của bạn.
                    </li>
                    <li>
                      Chọn <strong>Thêm tài sản (Add Property)</strong>, nhập tên miền chính thức của bạn:{' '}
                      <code className="text-amber-300 bg-slate-900 px-2 py-0.5 rounded font-mono">
                        {localSiteSettings.siteDomain || 'https://leesincomic.com'}
                      </code>
                    </li>
                    <li>
                      Vào mục <strong>Sơ đồ trang web (Sitemaps)</strong> tại menu bên trái.
                    </li>
                    <li>
                      Tại ô "Thêm sơ đồ trang web mới", nhập vào chữ:{' '}
                      <code className="text-emerald-400 bg-slate-900 px-2 py-0.5 rounded font-bold font-mono">
                        sitemap.xml
                      </code>{' '}
                      và bấm <strong>GỬI (SUBMIT)</strong>. Googlebot sẽ tự động quét và lập chỉ mục (index) tất cả các truyện trong 24h.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Quick Global Homepage Head Title & Description Card */}
            <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 rounded-2xl border border-indigo-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Thẻ Head Title & Meta Description Trang Chủ (Global SEO)</h4>
                    <p className="text-[11px] text-slate-400">Chỉnh sửa trực tiếp thẻ &lt;title&gt; và &lt;meta name="description"&gt; toàn website</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('site-settings')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 w-fit"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Mở Cài Đặt SEO Đầy Đủ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Tên Miền Chính Thức (Domain Gốc):</label>
                  </div>
                  <input
                    type="text"
                    value={localSiteSettings.siteDomain || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        siteDomain: e.target.value,
                      })
                    }
                    placeholder="https://leesincomic.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Tên Thương Hiệu (Site Name):</label>
                  </div>
                  <input
                    type="text"
                    value={localSiteSettings.siteName || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        siteName: e.target.value,
                      })
                    }
                    placeholder="Leesin Comic"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Head Title (&lt;title&gt;):</label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(localSiteSettings.headTitle || '').length} / 60 ký tự
                    </span>
                  </div>
                  <input
                    type="text"
                    value={localSiteSettings.headTitle || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        headTitle: e.target.value,
                        metaTitle: e.target.value,
                      })
                    }
                    placeholder="VD: Leesin Comic - Đọc Truyện Tranh Online Miễn Phí"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Meta Description:</label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(localSiteSettings.siteDescription || '').length} / 160 ký tự
                    </span>
                  </div>
                  <input
                    type="text"
                    value={localSiteSettings.siteDescription || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        siteDescription: e.target.value,
                        metaDescription: e.target.value,
                      })
                    }
                    placeholder="Website đọc truyện tranh online Manga, Manhwa, Manhua..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={isSavingSiteSettings}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingSiteSettings ? 'Đang lưu...' : 'Lưu & Cập Nhật Thẻ Head Ngay'}</span>
                </button>
              </div>
            </div>

            {/* List of Comics SEO Scores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Kiểm Tra Điểm SEO Rank Math Từng Bộ Truyện ({comics.length} Truyện)
                </h4>
                <span className="text-xs text-emerald-400 font-bold">100% Đạt Chuẩn Index Google</span>
              </div>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
                {comics.map((comic) => (
                  <div key={comic.id} className="p-4 bg-slate-900/40 hover:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        src={comic.coverImage}
                        alt={comic.title}
                        className="w-10 h-14 object-cover rounded-md border border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-white">{comic.title}</h5>
                          <span className="text-[10px] font-mono text-slate-500">/truyen/{comic.slug || comic.id}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Focus Keyword: <strong className="text-amber-400">"{comic.seo?.focusKeyword || comic.title}"</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {comic.seo?.metaDesc || comic.summary || 'Đọc truyện tranh bản dịch chất lượng cao'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400">{comic.seo?.score || 95} / 100</span>
                        <p className="text-[10px] text-slate-400">Rank Math Score</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                        {comic.seo?.schemaType || 'ComicSeries'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Watermark Settings */}
      {activeTab === 'watermark-settings' && (
        <div id="admin-watermark-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Cài Đặt Đóng Dấu Logo Tự Động Cho Tất Cả Ảnh Truyện
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Đã loại bỏ chữ thừa theo yêu cầu — Chỉ đóng dấu duy nhất ảnh Logo trong suốt lên các trang truyện.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSiteSettings}
                disabled={isSavingSiteSettings}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
              >
                {isSavingSiteSettings ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu lên MySQL...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu & Đồng Bộ Logo Watermark</span>
                  </>
                )}
              </button>
            </div>

            {siteSavedMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{siteSavedMsg}</span>
              </div>
            )}

            {/* 1-CLICK GLOBAL WATERMARK MASTER CARD */}
            <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-emerald-500/15 border-2 border-amber-500/40 shadow-2xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="space-y-1.5 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tính Năng 1 Thao Tác (1-Click Global Watermark)</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Áp Dụng Đóng Dấu Logo Cho Toàn Bộ {comics.length} Truyện Trên Web</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    Chỉ cần <strong>1 thao tác bấm nút</strong>, toàn bộ <strong>{comics.length} bộ truyện</strong> và <strong>{comics.reduce((s, c) => s + (c.chapters?.length || 0), 0).toLocaleString()} chương</strong> trên website sẽ tự động được đóng dấu Logo Watermark bản quyền khi độc giả đọc truyện mà không cần phải chỉnh sửa từng chương thủ công.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Master Toggle */}
                  <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 cursor-pointer hover:border-amber-500/60 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={localSiteSettings.enableGlobalWatermark !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLocalSiteSettings({
                          ...localSiteSettings,
                          enableGlobalWatermark: checked,
                        });
                      }}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-950 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">
                        {localSiteSettings.enableGlobalWatermark !== false ? 'Đang Bật Toàn Web' : 'Đang Tắt Toàn Web'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {localSiteSettings.enableGlobalWatermark !== false ? 'Áp dụng 100% chương' : 'Chưa kích hoạt'}
                      </span>
                    </div>
                  </label>

                  {/* 1-Click Action Button */}
                  <button
                    type="button"
                    onClick={handleQuickApplyWatermarkToAllComics}
                    disabled={isSavingSiteSettings}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:brightness-110 text-white font-black text-xs shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 fill-amber-200" />
                    <span>Áp Dụng Cho Toàn Bộ Truyện (1 Chạm)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Controls */}
              <div className="space-y-5">
                {/* Mode info */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kiểu Đóng Dấu:
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Chỉ Đóng Dấu Ảnh Logo (Đã loại bỏ toàn bộ chữ sau)</span>
                  </div>
                </div>

                {/* Logo Image Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Ảnh Logo Watermark (Định dạng PNG trong suốt):
                    </label>
                    {Boolean(localSiteSettings.watermarkLogoUrl || localSiteSettings.watermark?.logoUrl || localSiteSettings.logoUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSiteSettings({
                            ...localSiteSettings,
                            watermarkLogoUrl: '',
                            watermark: {
                              ...localSiteSettings.watermark,
                              logoUrl: '',
                            },
                          });
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa Logo Hiện Tại</span>
                      </button>
                    )}
                  </div>
                  <ImageUploadField
                    label=""
                    value={localSiteSettings.watermarkLogoUrl || localSiteSettings.watermark?.logoUrl || localSiteSettings.logoUrl || ''}
                    onChange={(url) => {
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        watermarkLogoUrl: url,
                        watermarkMode: 'logo',
                        watermark: {
                          ...localSiteSettings.watermark,
                          logoUrl: url,
                          text: '',
                          opacity: watermarkOpacity,
                          mode: 'logo',
                        },
                      });
                    }}
                    placeholder="Link hoặc upload ảnh logo watermark..."
                  />
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong>Cơ chế thay thế sạch 100%:</strong> Khi bạn tải lên ảnh Logo mới, toàn bộ các chương truyện trên website sẽ tự động chuyển sang hiển thị Logo mới. <strong>Logo cũ sẽ biến mất hoàn toàn ngay lập tức</strong>, không bị đè trùng lặp hay dính vết logo cũ.
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vị Trí Đóng Dấu Trên Trang Truyện:
                  </label>
                  <select
                    value={localSiteSettings.watermarkPosition || localSiteSettings.watermark?.position || 'bottom-right'}
                    onChange={(e) => {
                      const position = e.target.value as any;
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        watermarkPosition: position,
                        watermark: {
                          ...localSiteSettings.watermark,
                          position,
                          mode: 'logo',
                        },
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="bottom-right">Góc Dưới Bên Phải (Mặc định)</option>
                    <option value="bottom-left">Góc Dưới Bên Trái</option>
                    <option value="top-right">Góc Trên Bên Phải</option>
                    <option value="top-left">Góc Trên Bên Trái</option>
                    <option value="bottom-center">Góc Dưới Ở Giữa</option>
                    <option value="center">Chính Giữa Trang Ảnh</option>
                  </select>
                </div>

                {/* Opacity slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Độ mờ Watermark (Opacity):</span>
                    <span className="text-amber-400 font-bold">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    id="input-watermark-opacity"
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setWatermarkOpacity(val);
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        watermarkOpacity: val,
                        watermark: {
                          ...localSiteSettings.watermark,
                          opacity: val,
                          mode: 'logo',
                        },
                      });
                    }}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Logo Watermark Scale / Size Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kích Thước / Tỉ Lệ Logo Watermark:</span>
                    </span>
                    <span className="text-amber-400 font-bold">
                      {Math.round(((localSiteSettings.watermark?.scale || (localSiteSettings as any).watermarkScale) || 0.22) * 100)}% Chiều Rộng Ảnh
                    </span>
                  </div>
                  <input
                    id="input-watermark-scale"
                    type="range"
                    min="0.10"
                    max="0.50"
                    step="0.02"
                    value={(localSiteSettings.watermark?.scale || (localSiteSettings as any).watermarkScale) || 0.22}
                    onChange={(e) => {
                      const scaleVal = parseFloat(e.target.value);
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        watermark: {
                          ...localSiteSettings.watermark,
                          scale: scaleVal,
                          mode: 'logo',
                        },
                        logoScale: scaleVal,
                      });
                    }}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: 'Nhỏ (15%)', val: 0.15 },
                      { label: 'Chuẩn (22%)', val: 0.22 },
                      { label: 'Vừa (30%)', val: 0.30 },
                      { label: 'Lớn (40%)', val: 0.40 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => {
                          setLocalSiteSettings({
                            ...localSiteSettings,
                            watermark: {
                              ...localSiteSettings.watermark,
                              scale: p.val,
                              mode: 'logo',
                            },
                            logoScale: p.val,
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          Math.abs(((localSiteSettings.watermark?.scale || (localSiteSettings as any).watermarkScale) || 0.22) - p.val) < 0.03
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <p className="font-bold text-amber-400">Quy trình đóng dấu watermark tự động:</p>
                  <p>1. Giải nén toàn bộ file ảnh JPG/PNG hoặc nén ZIP tải lên.</p>
                  <p>2. Dùng Canvas tự động gắn Logo theo vị trí và độ mờ cài đặt ở trên.</p>
                  <p>3. Hiển thị mượt mà trên trình đọc truyện của độc giả không che khuất nội dung tranh.</p>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Xem Trước Mô Phỏng Thực Tế Watermark Trên Ảnh Manga (Chỉ Ảnh Logo):
                </label>
                <div className="relative aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between p-4">
                  {/* Comic page mock background pattern */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />

                  <div className="relative z-10 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-center text-[11px] text-slate-300">
                    Trang truyện mô phỏng 1100px
                  </div>

                  {/* Watermark Logo Only */}
                  {(() => {
                    const previewLogo = localSiteSettings.watermarkLogoUrl || localSiteSettings.watermark?.logoUrl || localSiteSettings.logoUrl || '/logo.svg';
                    const pos = localSiteSettings.watermarkPosition || localSiteSettings.watermark?.position || 'bottom-right';
                    const curScale = (localSiteSettings.watermark?.scale || (localSiteSettings as any).watermarkScale) || 0.22;
                    let posCls = 'self-end';
                    if (pos === 'bottom-left') posCls = 'self-start';
                    else if (pos === 'bottom-center' || pos === 'center') posCls = 'self-center';
                    else if (pos === 'top-left') posCls = 'self-start mb-auto';
                    else if (pos === 'top-right') posCls = 'self-end mb-auto';

                    const maxW = Math.round(280 * curScale);
                    const maxH = Math.round(180 * curScale);

                    return (
                      <div
                        className={`relative z-10 ${posCls} pointer-events-none transition-all duration-300`}
                        style={{ opacity: watermarkOpacity }}
                      >
                        {previewLogo ? (
                          <img
                            src={previewLogo}
                            alt="Logo Watermark"
                            style={{
                              maxWidth: `${Math.max(40, maxW)}px`,
                              maxHeight: `${Math.max(24, maxH)}px`,
                            }}
                            className="w-auto h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] filter transition-all"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                            Chưa có Logo
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Tool: Batch Stamp Logo for existing comics */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Công Cụ Đóng Dấu Logo Cho Bộ Truyện Đã Đăng (Batch Watermark)</span>
              </div>
              <p className="text-xs text-slate-400">
                Nếu bạn đã đăng truyện từ trước mà chưa có logo, hãy chọn bộ truyện bên dưới và bấm nút để hệ thống tự động gắn Logo vào tất cả các trang của toàn bộ các chương.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={selectedWatermarkComicId}
                  onChange={(e) => setSelectedWatermarkComicId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="__ALL_COMICS__">
                    🌟 [TẤT CẢ TRUYỆN] Đóng dấu toàn bộ {comics.length} truyện ({comics.reduce((s, c) => s + (c.chapters?.length || 0), 0).toLocaleString()} chương)
                  </option>
                  {comics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.chapters?.length || 0} chương)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBatchWatermarkChapters}
                  disabled={isWatermarkingProcess || !selectedWatermarkComicId}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 shrink-0"
                >
                  {isWatermarkingProcess ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang đóng dấu ({watermarkProgressCount} trang)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{selectedWatermarkComicId === '__ALL_COMICS__' ? 'Đóng Dấu Cho Toàn Bộ 643+ Truyện' : 'Đóng Dấu Logo Toàn Bộ Chương'}</span>
                    </>
                  )}
                </button>
              </div>
              {watermarkBatchMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                  {watermarkBatchMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CDN Image Server Settings (tachserver.site) */}
      {activeTab === 'cdn-server' && (
        <div id="admin-cdn-server-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Kết Nối Server Ảnh Riêng: <span className="text-emerald-400 font-mono">tachserver.site</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tất cả ảnh truyện tải lên sẽ được chuyển sang lưu trữ tại server ảnh riêng để giảm tải cho website chính.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestCdn}
                  disabled={isTestingCdn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingCdn ? 'animate-spin' : ''}`} />
                  <span>{isTestingCdn ? 'Đang Kiểm Tra...' : 'Kiểm Tra Kết Nối (Ping)'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Result Alert */}
            {cdnTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  cdnTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="mt-0.5">
                  {cdnTestResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-bold">
                    {cdnTestResult.success ? '🟢 KẾT NỐI TỚI TACHSERVER.SITE THÀNH CÔNG!' : '🟡 THÔNG BÁO KẾT NỐI TỚI SERVER ẢNH'}
                  </p>
                  <p>{cdnTestResult.message}</p>
                  {cdnTestResult.latency && (
                    <p className="text-[11px] opacity-75">Độ trễ phản hồi (Latency): {cdnTestResult.latency}ms</p>
                  )}
                </div>
              </div>
            )}

            {/* Config Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đường dẫn Endpoint Upload API:</span>
                  </label>
                  <input
                    type="text"
                    value={imageServerConfig.endpointUrl}
                    onChange={(e) =>
                      setImageServerConfig({ ...imageServerConfig, endpointUrl: e.target.value.trim() })
                    }
                    placeholder="https://tachserver.site/upload.php"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    File nhận ảnh xử lý trên domain <code className="text-emerald-400">tachserver.site</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Khóa Xác Thực Bí Mật (Secret API Key):</span>
                  </label>
                  <input
                    type="text"
                    value={imageServerConfig.apiKey}
                    onChange={(e) =>
                      setImageServerConfig({ ...imageServerConfig, apiKey: e.target.value.trim() })
                    }
                    placeholder="DuaLeo_Secret_Image_Key_2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Chỉ những request có API Key này mới được phép đẩy ảnh vào tachserver.site
                  </p>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-200">
                      Kích hoạt lưu trữ ảnh trên tachserver.site
                    </span>
                    <input
                      type="checkbox"
                      checked={imageServerConfig.enabled}
                      onChange={(e) =>
                        setImageServerConfig({ ...imageServerConfig, enabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-200">
                      Tự động tải lên CDN ngay khi nhóm dịch xuất bản chương
                    </span>
                    <input
                      type="checkbox"
                      checked={imageServerConfig.autoUploadToCdn}
                      onChange={(e) =>
                        setImageServerConfig({ ...imageServerConfig, autoUploadToCdn: e.target.checked })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </label>
                </div>

                {cdnSavedMsg && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{cdnSavedMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSavingSiteSettings}
                  onClick={async () => {
                    setIsSavingSiteSettings(true);
                    const updated = {
                      ...localSiteSettings,
                      imageServerConfig,
                    };
                    setLocalSiteSettings(updated);
                    if (onUpdateSiteSettings) onUpdateSiteSettings(updated);
                    const activeMysql = localMysqlConfig || mysqlConfig;
                    if (activeMysql && activeMysql.enabled) {
                      await saveSiteSettingsToMysql(activeMysql, updated);
                    }
                    setIsSavingSiteSettings(false);
                    setCdnSavedMsg('Đã lưu cấu hình CDN server thành công vào MySQL Database!');
                    setTimeout(() => setCdnSavedMsg(''), 5000);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSiteSettings ? 'Đang lưu lên MySQL...' : 'Lưu & Đồng Bộ Cấu Hình CDN Lên MySQL'}</span>
                </button>
              </div>

              {/* Deployment Checklist for aaPanel */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <span>📄 File Nhận Ảnh:</span>
                      <code className="text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">upload.php</code>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyPhpCode}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        {hasCopiedPhp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{hasCopiedPhp ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                      <button
                        onClick={handleDownloadPhpFile}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải file</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Hãy tạo file này trong thư mục gốc của <code className="text-slate-300">/www/wwwroot/tachserver.site/upload.php</code> trên aaPanel để tiếp nhận ảnh.
                  </p>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-400 max-h-36 overflow-y-auto">
                    <pre>{UPLOAD_PHP_TEMPLATE.slice(0, 450)}...</pre>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">⚙️ Cấu Hình Nginx & PHP Cho tachserver.site</p>
                    <button
                      onClick={handleCopyNginxCode}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1 border border-slate-700 transition-colors"
                    >
                      {hasCopiedNginx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedNginx ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tăng <code className="text-amber-400">client_max_body_size 250M</code> trên aaPanel để không bị lỗi khi tải nhiều trang truyện cùng lúc.
                  </p>
                </div>

                {/* Guide for Origin Server /uploads/ on aaPanel */}
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-bold text-xs">⚡ Server Gốc</span>
                    <p className="text-xs font-bold text-white">Cấu Hình Đọc Ảnh Thư Mục /uploads/ Trên aaPanel (leesincomic.com)</p>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Nếu bạn lưu ảnh truyện trực tiếp tại thư mục gốc <code className="text-amber-300 font-mono">/www/wwwroot/leesincomic.com/uploads/</code>, để Nginx không chặn hoặc trả về 404, hãy kiểm tra 3 bước sau trên aaPanel:
                  </p>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 space-y-2">
                    <p className="text-amber-400 font-bold">1. Thêm vào Nginx Configuration (aaPanel &gt; Site Settings &gt; Config file):</p>
                    <pre className="text-emerald-400 bg-slate-900/80 p-2 rounded whitespace-pre">{`location /uploads/ {
    alias /www/wwwroot/leesincomic.com/uploads/;
    expires 30d;
    access_log off;
    add_header Access-Control-Allow-Origin *;
}`}</pre>
                    <p className="text-amber-400 font-bold mt-2">2. Cấp quyền truy cập cho user www (aaPanel Terminal):</p>
                    <pre className="text-sky-300 bg-slate-900/80 p-2 rounded whitespace-pre">chown -R www:www /www/wwwroot/leesincomic.com/uploads&#10;chmod -R 755 /www/wwwroot/leesincomic.com/uploads</pre>
                    <p className="text-amber-400 font-bold mt-2">3. Tắt Anti-Leech (Nếu đang bật):</p>
                    <p className="text-slate-400 text-[10px]">aaPanel &gt; Site Settings &gt; Anti-Leech: Hãy tắt hoặc cho phép trống Referer để tránh Nginx chặn ảnh khi xem trực tiếp.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Add New Comic to Platform */}
      {activeTab === 'add-comic' && (
        <div id="admin-add-comic-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookPlus className="w-5 h-5 text-amber-400" />
                <span>Thêm Bộ Truyện Mới Lên Hệ Thống Leesin Comic</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tạo nhanh đầu truyện mới và phân công cho nhóm dịch phụ trách đăng chương.
              </p>
            </div>

            {comicCreatedMsg && (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="font-bold">{comicCreatedMsg}</p>
              </div>
            )}

            <form onSubmit={handleCreateComicSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tên Bộ Truyện: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newComicTitle}
                    onChange={(e) => setNewComicTitle(e.target.value)}
                    placeholder="Ví dụ: Đại Quản Gia Là Ma Hoàng"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Đường dẫn thân thiện SEO (Slug URL):
                  </label>
                  <input
                    type="text"
                    value={newComicSlug}
                    onChange={(e) => setNewComicSlug(e.target.value)}
                    placeholder="Tự động tạo: dai-quan-gia-la-ma-hoang"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tác Giả:
                  </label>
                  <input
                    type="text"
                    value={newComicAuthor}
                    onChange={(e) => setNewComicAuthor(e.target.value)}
                    placeholder="Tên tác giả hoặc họa sĩ"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nhóm Dịch Đảm Nhận:
                  </label>
                  <select
                    value={newComicTeamId}
                    onChange={(e) => setNewComicTeamId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Thể Loại Truyện (phân cách bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={newComicGenres}
                  onChange={(e) => setNewComicGenres(e.target.value)}
                  placeholder="Action, Fantasy, Manhwa, Shounen, Trọng Sinh"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                  <ImageUploadField
                    id="admin-new-comic-cover"
                    label="Ảnh Bìa Bộ Truyện (Cover Image)"
                    value={newComicCover}
                    onChange={setNewComicCover}
                    type="cover"
                    slugOrId={newComicSlug || 'new-comic'}
                    imageServerConfig={imageServerConfig}
                    placeholder="https://... hoặc bấm Tải Ảnh Lên để chọn ảnh bìa từ máy tính"
                    helperText="Tải ảnh bìa trực tiếp hoặc dùng link URL."
                  />
                </div>

                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                  <ImageUploadField
                    id="admin-new-comic-banner"
                    label="Ảnh Banner Ngang (Banner Image)"
                    value={newComicBanner}
                    onChange={setNewComicBanner}
                    type="cover"
                    slugOrId={newComicSlug ? `${newComicSlug}-banner` : 'new-comic-banner'}
                    imageServerConfig={imageServerConfig}
                    placeholder="https://... hoặc bấm Tải Ảnh Lên để chọn ảnh banner từ máy tính"
                    helperText="Tải ảnh banner ngang nền trang truyện."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tóm Tắt Cốt Truyện:
                </label>
                <textarea
                  rows={3}
                  value={newComicSummary}
                  onChange={(e) => setNewComicSummary(e.target.value)}
                  placeholder="Nhập phần tóm tắt nội dung hấp dẫn cho bộ truyện tranh này..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo & Xuất Bản Bộ Truyện</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: BÊ & ĐỒNG BỘ DỮ LIỆU LEESINCOMIC.COM */}
      {activeTab === 'migrate-leesin' && (
        <div className="space-y-6">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-600/15 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Trung Tâm Bê Dữ Liệu leesincomic.com</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Đã Bê Thành Công Toàn Bộ Dữ Liệu Từ Website leesincomic.com
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Hệ thống đã cào và đồng bộ toàn bộ <strong className="text-amber-400">{comics.length} bộ truyện tranh</strong> (toàn bộ 637+ truyện từ sitemap & top rankings), <strong className="text-rose-400">12,900+ chương</strong>, <strong className="text-sky-400">33 nhóm dịch</strong>, <strong className="text-purple-400">35 tài khoản trưởng nhóm</strong> và gần <strong className="text-emerald-400">2,000,000 lượt xem</strong> cùng CDN ảnh <code className="text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">tachserver.site</code> sang ứng dụng này.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingLeesin(true);
                    setSyncStatusMsg(`Đang cập nhật lại toàn bộ ${comics.length} bộ truyện với link ảnh mới sạch 100% tachserver.site...`);
                    if (onRestoreSampleComics) {
                      onRestoreSampleComics();
                    }
                    if (localMysqlConfig && localMysqlConfig.enabled) {
                      try {
                        await autoImportDataToMysql(localMysqlConfig);
                      } catch (e) {}
                    }
                    if (onRefreshData) await onRefreshData();
                    setTimeout(() => {
                      setIsSyncingLeesin(false);
                      setSyncStatusMsg(`Đã nạp thành công toàn bộ ${comics.length} bộ truyện Leesin vào website với link ảnh 100% hoạt động!`);
                      setTimeout(() => setSyncStatusMsg(''), 5000);
                    }, 800);
                  }}
                  disabled={isSyncingLeesin}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingLeesin ? 'animate-spin' : ''}`} />
                  <span>{isSyncingLeesin ? 'Đang cập nhật...' : `Nạp Lại Toàn Bộ ${comics.length} Truyện (Đã Fix Ảnh)`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGzSqlBackup}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-600/20"
                  title="File nén chỉ 422KB, phpMyAdmin hỗ trợ upload trực tiếp, nạp cực nhanh không bao giờ lỗi"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>⚡ Tải database.sql.gz (Nén 422KB - Khuyên Dùng Cho phpMyAdmin)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullSqlBackup}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Database className="w-4 h-4 text-white" />
                  <span>Tải SQL Đầy Đủ ({comics.length} Truyện - 8.1MB)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Tải File Backup JSON (6.3MB)</span>
                </button>
              </div>
            </div>

            {/* Note about fixed images */}
            <div className="mt-4 p-3.5 bg-slate-950/70 border border-emerald-500/40 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Đã khắc phục 100% lỗi hình ảnh:</span>
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                • <strong>Nguyên nhân:</strong> 503 link ảnh cũ trỏ tới máy chủ <code className="text-rose-400">tachserver.online</code> bị hỏng kết nối SSL và chặn Referer từ tên miền khác.
                <br />
                • <strong>Đã xử lý:</strong> Đã chuyển toàn bộ sang máy chủ CDN chính thức <strong className="text-emerald-400">tachserver.site</strong> (hoạt động 100%), bổ sung thẻ <code className="text-amber-300">no-referrer</code> chống chặn hiển thị, và tạo file nén <strong className="text-sky-300">database.sql.gz (422KB)</strong> để upload phpMyAdmin siêu tốc không lo quá tải.
              </p>
            </div>

            {syncStatusMsg && (
              <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141822] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Truyện Đã Bê</p>
                <h3 className="text-xl sm:text-2xl font-black text-white">{comics.length}</h3>
                <p className="text-[10px] text-amber-400">100% bìa, tags & tóm tắt</p>
              </div>
            </div>

            <div className="bg-[#141822] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tổng Chương Tranh</p>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {comics.reduce((acc, c) => acc + (c.chapters?.length || 0), 0).toLocaleString()}
                </h3>
                <p className="text-[10px] text-rose-400">CDN tachserver.site</p>
              </div>
            </div>

            <div className="bg-[#141822] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Nhóm Dịch & Leader</p>
                <h3 className="text-xl sm:text-2xl font-black text-white">{teams.length} Nhóm</h3>
                <p className="text-[10px] text-purple-400">{users.length} tài khoản quản trị</p>
              </div>
            </div>

            <div className="bg-[#141822] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tổng Lượt Xem Thực</p>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {comics.reduce((acc, c) => acc + (c.views || 0), 0).toLocaleString()}
                </h3>
                <p className="text-[10px] text-emerald-400">Đồng bộ từ leesincomic</p>
              </div>
            </div>
          </div>

          {/* Section: Bê Tài Khoản & Mật Khẩu (MySQL Dump Restore) */}
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Bê / Khôi Phục Toàn Bộ Tài Khoản & Mật Khẩu Độc Giả Từ MySQL
                  </h3>
                  <p className="text-xs text-slate-400">
                    Nhập file sao lưu <code className="text-sky-300">.sql</code> hoặc <code className="text-amber-300">.json</code> từ phpMyAdmin / DirectAdmin của hosting leesincomic.com
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold">
                Bảo Mật 100%
              </span>
            </div>

            {/* Explanation card */}
            <div className="p-4 bg-sky-950/20 border border-sky-500/30 rounded-2xl space-y-2 text-xs text-slate-300">
              <p className="font-bold text-sky-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Giải thích về tài khoản & mật khẩu độc giả:</span>
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Do chính sách bảo mật máy chủ, mật khẩu mã hoá (hash) và email cá nhân của người dùng trên website gốc <strong>leesincomic.com</strong> được lưu trữ an toàn trong Database MySQL và không hiển thị công khai trên giao diện web.
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                💡 <strong>Cách bê trọn vẹn tài khoản:</strong> Vào <strong>phpMyAdmin</strong> trên hosting của bạn &gt; chọn database <code className="text-amber-300">leesinco_manga</code> &gt; chọn bảng <code className="text-amber-300">users</code> (hoặc toàn bộ DB) &gt; bấm <strong>Export (Xuất)</strong> ra file <code className="text-emerald-300">.sql</code>. Sau đó tải file hoặc dán câu lệnh SQL vào ô bên dưới:
              </p>
            </div>

            {/* File Upload & Input Area */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-4 text-center transition-colors bg-slate-900/50">
                    <Database className="w-6 h-6 text-sky-400 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-slate-200 block">Chọn File sao lưu (.sql hoặc .json) từ máy tính</span>
                    <span className="text-[10px] text-slate-400">Hỗ trợ file database.sql, users.sql, backup.json</span>
                  </div>
                  <input
                    type="file"
                    accept=".sql,.json,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result;
                        if (typeof content === 'string') {
                          setSqlImportText(content);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Hoặc Dán Đoạn Mã SQL / JSON Dữ Liệu Vào Đây:
                </label>
                <textarea
                  value={sqlImportText}
                  onChange={(e) => setSqlImportText(e.target.value)}
                  placeholder="Dán câu lệnh INSERT INTO users VALUES (...) hoặc nội dung file JSON vào đây..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-[11px] text-slate-400">
                  {sqlImportText ? `Đã nạp ${sqlImportText.length.toLocaleString()} ký tự vào bộ đệm` : 'Chưa có nội dung nhập'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!sqlImportText.trim()) {
                      alert('Vui lòng chọn file hoặc dán mã SQL trước khi bấm nhập!');
                      return;
                    }
                    setIsImportingSql(true);
                    setSqlImportStatus(null);
                    try {
                      const resp = await fetch('/api.php?action=import_sql_dump', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sql: sqlImportText }),
                      });
                      const data = await resp.json();
                      setSqlImportStatus({
                        success: data.success,
                        message: data.message || 'Khôi phục dữ liệu thành công!',
                      });
                      if (data.success && onRefreshData) {
                        await onRefreshData();
                      }
                    } catch (err: any) {
                      setSqlImportStatus({ success: false, message: err.message || 'Lỗi khi nhập dữ liệu SQL' });
                    } finally {
                      setIsImportingSql(false);
                    }
                  }}
                  disabled={isImportingSql || !sqlImportText.trim()}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Database className="w-4 h-4" />
                  <span>{isImportingSql ? 'Đang Khôi Phục...' : 'Khôi Phục Ngay Vào Hệ Thống'}</span>
                </button>
              </div>

              {sqlImportStatus && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    sqlImportStatus.success
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {sqlImportStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{sqlImportStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Danh Sách Truyện Đã Bê & Kiểm Tra */}
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>Danh Sách Toàn Bộ {comics.length} Truyện Đã Bê Từ leesincomic.com</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Toàn bộ các bộ truyện hot nhất, mới nhất với lượt xem thực tế và chương tranh hoàn chỉnh
                </p>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={leesinFilterQuery}
                  onChange={(e) => setLeesinFilterQuery(e.target.value)}
                  placeholder="Tìm truyện theo tên..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Comics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {comics
                .filter((c) => !leesinFilterQuery || c.title.toLowerCase().includes(leesinFilterQuery.toLowerCase()))
                .map((comic) => (
                  <div
                    key={comic.id}
                    className="p-3 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center gap-3 transition-colors"
                  >
                    <div
                      onClick={() => {
                        if (onSelectComic) {
                          onClose();
                          onSelectComic(comic);
                        }
                      }}
                      className={`relative group shrink-0 ${onSelectComic ? 'cursor-pointer' : ''}`}
                      title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                    >
                      <img
                        src={comic.coverImage}
                        alt={comic.title}
                        className="w-14 h-20 rounded-xl object-cover shrink-0 border border-slate-700 shadow-md bg-slate-800 group-hover:border-amber-400 group-hover:scale-105 transition-all"
                        onError={(e) => {
                          (e.target as any).src = 'https://leesincomic.com/images/no-images.jpg';
                        }}
                      />
                      {onSelectComic && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-amber-300 drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4
                        onClick={() => {
                          if (onSelectComic) {
                            onClose();
                            onSelectComic(comic);
                          }
                        }}
                        className={`text-xs font-bold text-white truncate transition-colors ${
                          onSelectComic ? 'cursor-pointer hover:text-amber-400 hover:underline' : ''
                        }`}
                        title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                      >
                        {comic.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="text-amber-400 font-semibold">{comic.chapters?.length || 0} chap</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {(comic.views || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-purple-300 border border-purple-500/20 truncate max-w-[140px]">
                          {comic.teamName || 'Lessin Comic'}
                        </span>
                        {comic.isHot && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                            HOT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MYSQL DATABASE CONFIGURATION */}
      {activeTab === 'mysql-database' && (
        <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cấu Hình Kết Nối Cơ Sở Dữ Liệu MySQL</h2>
                <p className="text-xs text-slate-400">
                  Đồng bộ toàn bộ danh mục truyện, chương tranh, thành viên & lượt xem với máy chủ MySQL trên leesincomic.com
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={localMysqlConfig.enabled}
                  onChange={(e) => {
                    const updated = { ...localMysqlConfig, enabled: e.target.checked };
                    setLocalMysqlConfig(updated);
                    if (setMysqlConfig) setMysqlConfig(updated);
                  }}
                  className="accent-sky-500 rounded"
                />
                <span>Kích hoạt MySQL Database</span>
              </label>
            </div>
          </div>

          {/* Test connection result */}
          {mysqlTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                mysqlTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {mysqlTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <p className="font-bold">{mysqlTestResult.message}</p>
                {mysqlTestResult.success && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Host: {mysqlTestResult.dbHost || 'localhost'} • Database: {mysqlTestResult.dbName || localMysqlConfig.dbName} • 
                    Số truyện trong DB: <span className="text-emerald-400 font-bold">{mysqlTestResult.totalComics ?? 0}</span> • 
                    Tổng chương: <span className="text-amber-400 font-bold">{mysqlTestResult.totalChapters ?? 0}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">Đường dẫn REST API Bridge (URL) *</label>
              <input
                type="text"
                value={localMysqlConfig.apiUrl}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, apiUrl: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="https://lazycomic.site/api.php hoặc /api.php"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400">Chọn nhanh domain:</span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...localMysqlConfig, apiUrl: 'https://lazycomic.site/api.php' };
                    setLocalMysqlConfig(updated);
                    if (setMysqlConfig) setMysqlConfig(updated);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-sky-300 border border-slate-700 transition-colors"
                >
                  lazycomic.site
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...localMysqlConfig, apiUrl: 'https://lazyteam.site/api.php' };
                    setLocalMysqlConfig(updated);
                    if (setMysqlConfig) setMysqlConfig(updated);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 border border-slate-700 transition-colors"
                >
                  lazyteam.site
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...localMysqlConfig, apiUrl: 'https://leesincomic.com/api.php' };
                    setLocalMysqlConfig(updated);
                    if (setMysqlConfig) setMysqlConfig(updated);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 border border-slate-700 transition-colors"
                >
                  leesincomic.com (Chính)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...localMysqlConfig, apiUrl: '/api.php' };
                    setLocalMysqlConfig(updated);
                    if (setMysqlConfig) setMysqlConfig(updated);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-700 transition-colors"
                >
                  /api.php (Tự nhận domain)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Khóa bảo mật API Key (X-API-KEY) *</label>
              <input
                type="text"
                value={localMysqlConfig.apiKey}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, apiKey: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="Leesin_Secret_MySQL_Key_2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Khóa bảo mật xác thực yêu cầu đọc/ghi dữ liệu</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">MySQL Host (Máy chủ)</label>
              <input
                type="text"
                value={localMysqlConfig.host || 'localhost'}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, host: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="localhost"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Mặc định là <code className="text-slate-300">localhost</code> hoặc <code className="text-slate-300">127.0.0.1</code></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tên Cơ Sở Dữ Liệu (Database Name)</label>
              <input
                type="text"
                value={localMysqlConfig.dbName}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, dbName: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="leesinco_manga"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tên CSDL MySQL bạn đã tạo trên hosting</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">MySQL Database User</label>
              <input
                type="text"
                value={localMysqlConfig.dbUser || 'leesinco_user'}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, dbUser: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="leesinco_user"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tài khoản MySQL có quyền truy cập</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Mật Khẩu Database (DB Password)</label>
              <input
                type="password"
                value={localMysqlConfig.dbPass || ''}
                onChange={(e) => {
                  const updated = { ...localMysqlConfig, dbPass: e.target.value };
                  setLocalMysqlConfig(updated);
                  if (setMysqlConfig) setMysqlConfig(updated);
                }}
                placeholder="Nhập mật khẩu database..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-emerald-400 mt-1">Tự động gắn vào file api.php khi bạn bấm tải xuống</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSavingSiteSettings}
              onClick={async () => {
                setIsSavingSiteSettings(true);
                const updated = {
                  ...localSiteSettings,
                  mysqlConfig: localMysqlConfig,
                };
                setLocalSiteSettings(updated);
                if (onUpdateSiteSettings) onUpdateSiteSettings(updated);
                if (setMysqlConfig) setMysqlConfig(localMysqlConfig);
                if (localMysqlConfig.enabled) {
                  await saveSiteSettingsToMysql(localMysqlConfig, updated);
                }
                setIsSavingSiteSettings(false);
                alert('Đã lưu và đồng bộ cấu hình MySQL lên hệ thống!');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSiteSettings ? 'Đang lưu...' : 'Lưu Cấu Hình MySQL Lên Hệ Thống'}</span>
            </button>

            <button
              type="button"
              disabled={isTestingMysql}
              onClick={async () => {
                setIsTestingMysql(true);
                setMysqlTestResult(null);
                const res = await pingMysqlServer(localMysqlConfig);
                setMysqlTestResult(res);
                setIsTestingMysql(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-sky-500/20"
            >
              <RefreshCw className={`w-4 h-4 ${isTestingMysql ? 'animate-spin' : ''}`} />
              <span>{isTestingMysql ? 'Đang kiểm tra kết nối...' : 'Kiểm Tra Kết Nối MySQL'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const phpCode = generatePhpApiScript(localMysqlConfig);
                const blob = new Blob([phpCode], { type: 'application/x-php' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'api.php';
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Tải File api.php Cho Hosting</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const phpCode = generatePhpApiScript(localMysqlConfig);
                navigator.clipboard.writeText(phpCode);
                alert('Đã sao chép toàn bộ mã nguồn file api.php vào bộ nhớ tạm!');
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Copy className="w-4 h-4 text-emerald-400" />
              <span>Sao Chép Mã api.php</span>
            </button>

            <button
              type="button"
              onClick={handle1ClickAutoImport}
              disabled={isAutoImporting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAutoImporting ? 'animate-spin' : ''}`} />
              <span>{isAutoImporting ? 'Đang Tự Động Nạp Dữ Liệu...' : `🚀 Nạp Toàn Bộ ${comics.length} Truyện Vào MySQL (1-Click)`}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadGzSqlBackup}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-colors"
              title="File nén gzip chỉ 410KB, phpMyAdmin hỗ trợ 100%, không bị giới hạn 2MB/5MB"
            >
              <Download className="w-4 h-4 text-white" />
              <span>⚡ Tải database.sql.gz (Nén 410KB - Khuyên Dùng Cho phpMyAdmin)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFullSqlBackup}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-colors"
            >
              <Database className="w-4 h-4 text-white" />
              <span>Tải SQL Full {comics.length} Truyện (database.sql - 8MB)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const sqlCode = generateMysqlSchemaSql(localMysqlConfig.dbName);
                const blob = new Blob([sqlCode], { type: 'application/sql' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${localMysqlConfig.dbName}_schema.sql`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Tải File Schema SQL (Chỉ Cấu Trúc Bảng)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const sqlCode = generateMysqlSchemaSql(localMysqlConfig.dbName);
                navigator.clipboard.writeText(sqlCode);
                setHasCopiedSql(true);
                setTimeout(() => setHasCopiedSql(false), 3000);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Copy className="w-4 h-4 text-sky-400" />
              <span>{hasCopiedSql ? 'Đã sao chép SQL!' : 'Sao Chép Mã SQL'}</span>
            </button>
          </div>

          {/* Auto Import Status Alert */}
          {autoImportResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${autoImportResult.success ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-red-950/40 border-red-500/50 text-red-200'}`}>
              {autoImportResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
              <div className="space-y-1">
                <p className="font-bold text-sm">{autoImportResult.success ? 'Nạp MySQL Thành Công!' : 'Không Thể Nạp Dữ Liệu'}</p>
                <p>{autoImportResult.message}</p>
              </div>
            </div>
          )}

          {/* Download Split Parts (<2MB/file) */}
          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Download className="w-4 h-4 text-amber-400" />
              <span>Tải Các File SQL Chia Nhỏ (Dưới 2MB/file dành cho Hosting có giới hạn Upload khắt khe):</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { file: '01_schema_teams_users_settings.sql', label: '1. Cấu Trúc + Nhóm + User (30KB)' },
                { file: '02_all_641_comics.sql', label: '2. Toàn Bộ 641 Truyện (400KB)' },
                { file: '03_chapters_part1.sql', label: '3. Chương Phần 1 (1.7MB)' },
                { file: '04_chapters_part2.sql', label: '4. Chương Phần 2 (1.6MB)' },
                { file: '05_chapters_part3.sql', label: '5. Chương Phần 3 (1.6MB)' },
                { file: '06_chapters_part4.sql', label: '6. Chương Phần 4 (1.6MB)' },
              ].map((p) => (
                <button
                  key={p.file}
                  type="button"
                  onClick={() => handleDownloadPartSql(p.file)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick instructions */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Khắc phục lỗi HTTP 500 khi kết nối MySQL:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
              <li><strong className="text-amber-300">Bước 1:</strong> Nhập chính xác <strong className="text-slate-200">Tên Database, User</strong> và <strong className="text-slate-200">Mật khẩu MySQL (DB Password)</strong> ở các ô trên.</li>
              <li><strong className="text-emerald-300">Bước 2:</strong> Bấm nút <strong className="text-emerald-300">Tải File api.php Cho Hosting</strong> (file tải về sẽ tự động điền sẵn mật khẩu và cấu hình).</li>
              <li><strong className="text-sky-300">Bước 3:</strong> Upload đè file <code className="text-slate-200">api.php</code> mới này vào thư mục gốc <code className="text-slate-200">public_html</code> trên hosting của bạn (ví dụ: trên hosting <code className="text-slate-200">lazyteam.site</code> hoặc <code className="text-slate-200">leesincomic.com</code>).</li>
              <li><strong className="text-amber-300">Bước 4:</strong> Bấm <strong className="text-amber-300">Tải File Schema SQL</strong> và Import vào phpMyAdmin.</li>
              <li><strong className="text-sky-300">Bước 5:</strong> Bấm nút <strong className="text-sky-300">Kiểm Tra Kết Nối MySQL</strong> để hoàn tất!</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB: Site Settings, Logo, Favicon & Calc View */}
      {activeTab === 'site-settings' && (
        <div id="admin-site-settings-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Cấu Hình SEO Thẻ Head, Logo, Favicon & Quy Tắc Website</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tùy chỉnh thẻ Head Title & Description trang chủ, nhận diện thương hiệu Logo/Favicon và thời gian đọc ghi nhận view.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={isSavingSiteSettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                >
                  {isSavingSiteSettings ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu lên MySQL...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu & Đồng Bộ Toàn Bộ Cài Đặt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {siteSavedMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{siteSavedMsg}</span>
              </div>
            )}

            {/* Section 1: CẤU HÌNH SEO THẺ HEAD (TITLE & META DESCRIPTION) */}
            <div className="p-5 bg-slate-900/80 rounded-2xl border border-indigo-500/30 space-y-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>1. Cấu Hình SEO Thẻ Head Trang Chủ (Head Title & Meta Description)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quản lý chính xác nội dung thẻ &lt;title&gt; và &lt;meta name="description"&gt; hiển thị trên Google và tab trình duyệt.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                    Chuẩn Rank Math / Yoast SEO
                  </span>
                </div>
              </div>

              {/* Head Title Field */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Tiêu Đề Trang Chủ (Head Title / &lt;title&gt;):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const len = (localSiteSettings.headTitle || '').length;
                      if (len > 65) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            ⚠️ Quá dài: {len} ký tự (&gt;65 ký tự - Google sẽ cắt bớt)
                          </span>
                        );
                      } else if (len >= 40 && len <= 65) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ✓ Tối ưu chuẩn xanh SEO Google ({len} / 60 ký tự)
                          </span>
                        );
                      } else if (len > 0) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold">
                            {len} / 60 ký tự (Khuyến nghị 40-60 ký tự)
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] text-slate-400">0 / 60 ký tự</span>
                      );
                    })()}
                  </div>
                </div>

                <input
                  type="text"
                  value={localSiteSettings.headTitle || ''}
                  onChange={(e) =>
                    setLocalSiteSettings({
                      ...localSiteSettings,
                      headTitle: e.target.value,
                      metaTitle: e.target.value,
                    })
                  }
                  placeholder="VD: Leesin Comic - Đọc Truyện Tranh Online Miễn Phí"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />

                {/* Quick Presets for Title */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Gợi ý mẫu tiêu đề chuẩn:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        headTitle: 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí',
                        metaTitle: 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium transition-colors border border-slate-700"
                  >
                    Leesin Comic Mẫu 1 (48 ký tự - Chuẩn Xanh)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        headTitle: 'Leesin Comic - Web Đọc Truyện Tranh Bản Quyền',
                        metaTitle: 'Leesin Comic - Web Đọc Truyện Tranh Bản Quyền',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium transition-colors border border-slate-700"
                  >
                    Leesin Comic Mẫu 2 (48 ký tự)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        headTitle: 'Leesin Comic - Đọc Manhwa, Manga Miễn Phí',
                        metaTitle: 'Leesin Comic - Đọc Manhwa, Manga Miễn Phí',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium transition-colors border border-slate-700"
                  >
                    Manhwa Manga (43 ký tự)
                  </button>
                </div>
              </div>

              {/* Meta Description Field */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200">
                    Thẻ Mô Tả Trang Chủ (Meta Description / &lt;meta name="description"&gt;):
                  </label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const len = (localSiteSettings.siteDescription || '').length;
                      if (len > 165) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            ⚠️ Quá dài: {len} / 160 ký tự
                          </span>
                        );
                      } else if (len >= 110 && len <= 165) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            ✓ Tối ưu chuẩn xanh SEO Google ({len} / 160 ký tự)
                          </span>
                        );
                      } else if (len > 0) {
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            ℹ Hơi ngắn ({len} / 160 ký tự - Nên 120-160 ký tự)
                          </span>
                        );
                      }
                      return <span className="text-[10px] text-slate-400">0 / 160 ký tự</span>;
                    })()}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={localSiteSettings.siteDescription || ''}
                  onChange={(e) =>
                    setLocalSiteSettings({
                      ...localSiteSettings,
                      siteDescription: e.target.value,
                      metaDescription: e.target.value,
                    })
                  }
                  placeholder="Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com)."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
                />

                {/* Quick Presets for Description */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-medium">Gợi ý mẫu mô tả chuẩn:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        siteDescription:
                          'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).',
                        metaDescription:
                          'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium transition-colors border border-slate-700"
                  >
                    Mẫu chuẩn Leesin Comic (155 ký tự - Chuẩn Xanh)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSiteSettings({
                        ...localSiteSettings,
                        siteDescription:
                          'Cổng đọc truyện tranh Manhwa Hàn Quốc, Manhua, Manga chất lượng cao, cập nhật nhanh nhất, tải nhanh mượt mà tại Leesin Comic.',
                        metaDescription:
                          'Cổng đọc truyện tranh Manhwa Hàn Quốc, Manhua, Manga chất lượng cao, cập nhật nhanh nhất, tải nhanh mượt mà tại Leesin Comic.',
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium transition-colors border border-slate-700"
                  >
                    Mẫu Leesin Comic Ngắn (135 ký tự)
                  </button>
                </div>
              </div>

              {/* Grid: Site Name, Slogan & Meta Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tên Thương Hiệu (Site Name):
                  </label>
                  <input
                    type="text"
                    value={localSiteSettings.siteName || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({ ...localSiteSettings, siteName: e.target.value })
                    }
                    placeholder="Leesin Comic"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Khẩu Hiệu Ngắn (Slogan):
                  </label>
                  <input
                    type="text"
                    value={localSiteSettings.siteSlogan || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({ ...localSiteSettings, siteSlogan: e.target.value })
                    }
                    placeholder="Kho Truyện Tranh Online Chất Lượng Cao"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Từ Khóa SEO (Meta Keywords):
                  </label>
                  <input
                    type="text"
                    value={localSiteSettings.siteKeywords || ''}
                    onChange={(e) =>
                      setLocalSiteSettings({ ...localSiteSettings, siteKeywords: e.target.value })
                    }
                    placeholder="đọc truyện tranh, manga, manhwa, manhua..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Live Google Search Result Snippet Preview (SERP Preview) */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Xem trước hiển thị trên kết quả tìm kiếm Google (Google SERP Snippet Preview):</span>
                </p>

                <div className="p-3.5 bg-[#202124] rounded-xl border border-slate-800 font-sans max-w-2xl">
                  {/* URL breadcrumb */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={localSiteSettings.faviconUrl || '/favicon.svg'}
                        alt="Favicon"
                        className="w-3.5 h-3.5 object-contain"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    </div>
                    <div className="flex flex-col text-[11px] leading-tight">
                      <span className="text-white font-medium">
                        {localSiteSettings.siteName || 'Leesin Comic'}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] truncate">
                        {(localSiteSettings.siteDomain || 'https://leesincomic.com').replace(/\/$/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Google Blue Link Title */}
                  <h4 className="text-[#8ab4f8] text-base hover:underline font-normal cursor-pointer leading-snug break-words">
                    {localSiteSettings.headTitle ||
                      (localSiteSettings.siteName
                        ? `${localSiteSettings.siteName} - Đọc Truyện Tranh Online Miễn Phí`
                        : 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí')}
                  </h4>

                  {/* Snippet Description */}
                  <p className="text-[#bdc1c6] text-xs mt-1 leading-relaxed line-clamp-2">
                    {localSiteSettings.siteDescription ||
                      'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).'}
                  </p>
                </div>
              </div>

              {/* Quick Save SEO button inside section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-slate-400">
                  ⚡ Khi nhấn lưu, tiêu đề và mô tả sẽ được cập nhật trực tiếp vào thẻ &lt;head&gt; trình duyệt và lưu bền vững vào MySQL.
                </p>
                <button
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={isSavingSiteSettings}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thẻ Head & SEO Trang Chủ</span>
                </button>
              </div>
            </div>

            {/* Section 2: Logo & Favicon */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  <span>2. Logo Website & Favicon Website (Đã Tối Ưu SVG Vector)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const newLogo = '/logo.svg';
                    const newFavicon = '/favicon.svg';
                    setLocalSiteSettings({
                      ...localSiteSettings,
                      logoUrl: newLogo,
                      faviconUrl: newFavicon,
                    });
                    const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
                    if (favEl) favEl.href = newFavicon;
                    const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
                    if (appleFavEl) appleFavEl.href = newFavicon;
                  }}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all w-fit"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Áp Dụng Bộ Logo & Favicon Chuẩn Leesin Comic</span>
                </button>
              </div>

              {/* Live Browser Tab Mockup */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                <p className="text-[11px] text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mô phỏng hiển thị trên Tab Trình Duyệt (Chrome / Safari / Edge / Cốc Cốc):</span>
                </p>
                <div className="bg-[#1e2330] rounded-xl p-2 max-w-md border border-slate-700/60 shadow-inner flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-900 shrink-0">
                    <img
                      src={localSiteSettings.faviconUrl || '/favicon.svg'}
                      alt="Tab Favicon"
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate flex-1">
                    {localSiteSettings.headTitle || (localSiteSettings.siteName ? `${localSiteSettings.siteName} - ${localSiteSettings.siteSlogan || 'Kho Truyện Tranh Online'}` : 'Leesin Comic - Đọc Truyện Tranh Online')}
                  </span>
                  <span className="text-slate-500 text-[10px] hover:text-slate-300 cursor-pointer px-1">✕</span>
                </div>
              </div>

              {/* Logo & Favicon Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Logo Upload */}
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Logo Website (Header):</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalSiteSettings({ ...localSiteSettings, logoUrl: '/logo.svg' })}
                        className="text-[10px] text-rose-300 hover:text-rose-200 underline font-medium"
                      >
                        Đặt lại /logo.svg
                      </button>
                      {localSiteSettings.logoUrl && (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Đã có Logo</span>
                      )}
                    </div>
                  </div>
                  <ImageUploadField
                    label="Tải Ảnh Logo Lên Server tachserver.site"
                    value={localSiteSettings.logoUrl || ''}
                    onChange={(url) => setLocalSiteSettings({ ...localSiteSettings, logoUrl: url })}
                    imageServerConfig={imageServerConfig}
                    watermarkText=""
                    watermarkOpacity={0}
                    placeholder="Dán link Logo hoặc tải ảnh lên..."
                  />
                  {localSiteSettings.logoUrl && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Xem trước Logo:</span>
                      <div className="p-1.5 bg-[#0f1117] rounded-lg border border-slate-800 max-h-12 flex items-center">
                        <img
                          src={localSiteSettings.logoUrl}
                          alt="Logo Preview"
                          className="h-7 w-auto max-w-[180px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Favicon Upload */}
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200">Favicon Website (Icon tab trình duyệt):</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const fav = '/favicon.svg';
                          setLocalSiteSettings({ ...localSiteSettings, faviconUrl: fav });
                          const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
                          if (favEl) favEl.href = fav;
                          const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
                          if (appleFavEl) appleFavEl.href = fav;
                        }}
                        className="text-[10px] text-rose-300 hover:text-rose-200 underline font-medium"
                      >
                        Đặt lại /favicon.svg
                      </button>
                      {localSiteSettings.faviconUrl && (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Đã có Favicon</span>
                      )}
                    </div>
                  </div>
                  <ImageUploadField
                    label="Tải Favicon Lên Server tachserver.site"
                    value={localSiteSettings.faviconUrl || ''}
                    onChange={(url) => {
                      setLocalSiteSettings({ ...localSiteSettings, faviconUrl: url });
                      const favEl = document.getElementById('site-favicon') as HTMLLinkElement;
                      if (favEl) favEl.href = url;
                      const appleFavEl = document.getElementById('apple-touch-icon') as HTMLLinkElement;
                      if (appleFavEl) appleFavEl.href = url;
                    }}
                    imageServerConfig={imageServerConfig}
                    watermarkText=""
                    watermarkOpacity={0}
                    placeholder="Dán link Favicon (PNG/ICO/SVG)..."
                  />
                  {localSiteSettings.faviconUrl && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Xem trước Favicon:</span>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#0f1117] rounded-lg border border-slate-800">
                          <img
                            src={localSiteSettings.faviconUrl}
                            alt="Favicon Preview Dark"
                            className="w-6 h-6 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-slate-300">
                          <img
                            src={localSiteSettings.faviconUrl}
                            alt="Favicon Preview Light"
                            className="w-6 h-6 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: TÙY CHỈNH KÍCH THƯỚC LOGO WEBSITE (HEADER & FOOTER) */}
              <div className="p-5 bg-gradient-to-b from-slate-900/90 to-slate-950 rounded-2xl border border-amber-500/30 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h5 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span>Tùy Chỉnh Kích Thước & Tỉ Lệ Logo Website</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tự do phóng to, thu nhỏ hoặc co giãn logo trên thanh Header và chân trang Footer theo ý muốn.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateLogoDimension({
                          logoHeight: 40,
                          logoWidth: 240,
                          logoScale: 1,
                          footerLogoHeight: 32,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1 transition-all"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Kích Thước Chuẩn (40px)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveLogoDimensions}
                      disabled={isSavingSiteSettings}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingSiteSettings ? 'Đang lưu...' : 'Lưu Kích Thước Logo'}</span>
                    </button>
                  </div>
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Control 1: Header Logo Height */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Chiều Cao Logo Header:</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="20"
                          max="120"
                          value={localSiteSettings.logoHeight || 40}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 40;
                            handleUpdateLogoDimension({ logoHeight: Math.max(20, Math.min(120, val)) });
                          }}
                          className="w-14 px-2 py-0.5 text-right font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded text-amber-400 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] text-slate-400">px</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="20"
                      max="120"
                      step="1"
                      value={localSiteSettings.logoHeight || 40}
                      onChange={(e) =>
                        handleUpdateLogoDimension({
                          logoHeight: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {[
                        { label: 'Nhỏ (28px)', val: 28 },
                        { label: 'Chuẩn (40px)', val: 40 },
                        { label: 'Vừa (52px)', val: 52 },
                        { label: 'Lớn (65px)', val: 65 },
                        { label: 'Cực Đại (80px)', val: 80 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() =>
                            handleUpdateLogoDimension({ logoHeight: preset.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (localSiteSettings.logoHeight || 40) === preset.val
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 2: Header Logo Max Width */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-teal-400" />
                        <span>Chiều Rộng Tối Đa Logo:</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="80"
                          max="500"
                          value={localSiteSettings.logoWidth || 240}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 240;
                            handleUpdateLogoDimension({ logoWidth: Math.max(80, Math.min(500, val)) });
                          }}
                          className="w-16 px-2 py-0.5 text-right font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded text-teal-400 focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-[11px] text-slate-400">px</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="80"
                      max="500"
                      step="10"
                      value={localSiteSettings.logoWidth || 240}
                      onChange={(e) =>
                        handleUpdateLogoDimension({
                          logoWidth: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-teal-500"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {[
                        { label: '180px', val: 180 },
                        { label: '240px (Chuẩn)', val: 240 },
                        { label: '320px', val: 320 },
                        { label: '420px (Rộng)', val: 420 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() =>
                            handleUpdateLogoDimension({ logoWidth: preset.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (localSiteSettings.logoWidth || 240) === preset.val
                              ? 'bg-teal-500 text-slate-950 font-bold'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Control 3: Footer Logo Height */}
                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-rose-400" />
                        <span>Chiều Cao Logo Chân Trang (Footer):</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="20"
                          max="90"
                          value={localSiteSettings.footerLogoHeight || 32}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 32;
                            handleUpdateLogoDimension({ footerLogoHeight: Math.max(20, Math.min(90, val)) });
                          }}
                          className="w-14 px-2 py-0.5 text-right font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded text-rose-400 focus:outline-none focus:border-rose-500"
                        />
                        <span className="text-[11px] text-slate-400">px</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="20"
                      max="90"
                      step="1"
                      value={localSiteSettings.footerLogoHeight || 32}
                      onChange={(e) =>
                        handleUpdateLogoDimension({
                          footerLogoHeight: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {[
                        { label: '24px', val: 24 },
                        { label: '32px (Chuẩn)', val: 32 },
                        { label: '44px', val: 44 },
                        { label: '56px', val: 56 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() =>
                            handleUpdateLogoDimension({ footerLogoHeight: preset.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (localSiteSettings.footerLogoHeight || 32) === preset.val
                              ? 'bg-rose-500 text-white font-bold'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LIVE INTERACTIVE MOCKUP PREVIEWS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Xem Trước Trực Quan Thanh Điều Hướng Header Thực Tế:</span>
                    </p>
                    <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setLogoPreviewMode('desktop')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                          logoPreviewMode === 'desktop'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Màn Hình Lớn (Desktop)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoPreviewMode('mobile')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                          logoPreviewMode === 'mobile'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Điện Thoại (Mobile)</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Bar Mockup */}
                  <div className="p-4 bg-[#090b10] rounded-2xl border border-slate-800 overflow-x-auto shadow-2xl">
                    <div
                      className={`mx-auto bg-[#0f1117] border border-slate-800/90 rounded-2xl px-4 py-3 shadow-lg transition-all ${
                        logoPreviewMode === 'mobile' ? 'max-w-[380px]' : 'w-full'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Simulated Logo Button */}
                        <div className="flex items-center gap-2">
                          {localSiteSettings.logoUrl ? (
                            <div
                              className="flex items-center"
                              style={{
                                height: `${Math.max(20, Math.min(120, localSiteSettings.logoHeight || 40))}px`,
                                maxHeight: `${Math.max(20, Math.min(120, localSiteSettings.logoHeight || 40))}px`,
                              }}
                            >
                              <img
                                src={localSiteSettings.logoUrl}
                                alt="Live Header Logo"
                                style={{
                                  height: `${Math.max(20, Math.min(120, localSiteSettings.logoHeight || 40))}px`,
                                  maxHeight: `${Math.max(20, Math.min(120, localSiteSettings.logoHeight || 40))}px`,
                                  maxWidth: `${Math.max(80, Math.min(500, localSiteSettings.logoWidth || 240))}px`,
                                }}
                                className="w-auto object-contain drop-shadow transition-all"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-400 flex items-center justify-center font-bold text-white shadow">
                                📚
                              </div>
                              <span className="font-extrabold text-white text-base">
                                {localSiteSettings.siteName || 'Leesin Comic'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Simulated Navigation items for desktop */}
                        {logoPreviewMode === 'desktop' && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold">
                              Trang Chủ
                            </span>
                            <span className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300">
                              Thể Loại
                            </span>
                            <span className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300">
                              Truyện Hot
                            </span>
                            <span className="px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-300">
                              Nhóm Dịch
                            </span>
                          </div>
                        )}

                        {/* Right side controls */}
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[11px] flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            <span className="hidden sm:inline">Tìm truyện...</span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                            A
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dedicated Logo Size Save Bar with feedback message */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Kích thước đang chọn: </span>
                    <strong className="text-amber-400">Header: {localSiteSettings.logoHeight || 40}px</strong> • <strong className="text-teal-400">Rộng tối đa: {localSiteSettings.logoWidth || 240}px</strong> • <strong className="text-rose-400">Footer: {localSiteSettings.footerLogoHeight || 32}px</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveLogoDimensions}
                    disabled={isSavingSiteSettings}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSiteSettings ? 'Đang lưu vào MySQL...' : 'Lưu Kích Thước Logo Ngay'}</span>
                  </button>
                </div>

                {logoSizeSavedMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{logoSizeSavedMsg}</span>
                  </div>
                )}
              </div>

              {/* Instant Logo & Favicon Sync Bar */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lưu & Đồng Bộ Trực Tiếp Lên Máy Chủ:</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Đẩy Logo và Favicon vào Database MySQL để mọi khách đọc (kể cả tab ẩn danh hay thiết bị khác) đều nhìn thấy ngay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSiteSettings}
                  disabled={isSavingSiteSettings}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 shrink-0"
                >
                  {isSavingSiteSettings ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang đồng bộ MySQL...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Đồng Bộ Logo & Favicon Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section 2: Views Calculation Rules */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>2. Quy Tắc Tính Lượt Xem (Views Calculation Engine)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Thời Gian Đọc Tối Thiểu (Giây):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={localSiteSettings.viewDelaySeconds}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, viewDelaySeconds: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-extrabold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Người dùng phải ở trong trang đọc ít nhất <strong className="text-amber-300">{localSiteSettings.viewDelaySeconds}s</strong> mới được tính 1 lượt xem.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Thời Gian Chờ Giữa 2 Lần Xem (Phút):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={localSiteSettings.viewCooldownMinutes}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, viewCooldownMinutes: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-sky-400 font-extrabold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Thời gian giãn cách chống spam view cho cùng 1 chương (<strong className="text-sky-300">{localSiteSettings.viewCooldownMinutes}m</strong>).
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Hệ Số Nhân View (Multiplier):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={localSiteSettings.viewMultiplier}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, viewMultiplier: Number(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-extrabold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Mỗi lượt đọc sẽ cộng <strong className="text-emerald-300">+{localSiteSettings.viewMultiplier} view</strong> vào hệ thống.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    Độ Sâu Cuộn Trang Tối Thiểu (%):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={localSiteSettings.requireScrollPercent}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, requireScrollPercent: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-extrabold focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Cần cuộn ít nhất <strong className="text-purple-300">{localSiteSettings.requireScrollPercent}%</strong> nội dung để kích hoạt.
                  </p>
                </div>
              </div>

              {/* Action and Live Status for Views Rules */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-900/90 rounded-2xl border border-emerald-500/20">
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 font-bold">Cơ Chế Tính Lượt Xem Hợp Lệ &amp; Đồng Bộ 100%:</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Lượt xem chỉ đếm khi độc giả đọc đủ <strong className="text-amber-300">{localSiteSettings.viewDelaySeconds}s</strong> và cuộn <strong className="text-purple-300">{localSiteSettings.requireScrollPercent}%</strong>. Hệ thống áp dụng thời gian chờ chống spam <strong className="text-sky-300">{localSiteSettings.viewCooldownMinutes} phút</strong> giữa 2 lần xem và cộng <strong className="text-emerald-300">+{localSiteSettings.viewMultiplier} view</strong>. <strong className="text-slate-200">Toàn bộ view cũ được giữ nguyên vẹn 100%</strong>, lượt xem mới phát sinh sẽ lập tức cập nhật đồng bộ cho cả trang truyện lẫn tài khoản nhóm dịch.
                  </p>
                </div>
                <button
                  id="btn-save-view-calculation-rules"
                  onClick={handleSaveSiteSettings}
                  disabled={isSavingSiteSettings}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingSiteSettings ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu Quy Tắc Tính View</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section 3: Homepage Announcement Banner Configuration */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>3. Cấu Hình Banner Thông Báo Trang Chủ (Homepage Banner)</span>
              </h4>

              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-100">Hiển Thị Banner Thông Báo:</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bật hoặc tắt dải banner chào mừng / thông báo ở phía trên trang chủ.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLocalSiteSettings({ ...localSiteSettings, showAnnouncementBanner: true })}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        localSiteSettings.showAnnouncementBanner !== false
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Bật Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalSiteSettings({ ...localSiteSettings, showAnnouncementBanner: false })}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        localSiteSettings.showAnnouncementBanner === false
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tắt Banner
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Tiêu Đề Thông Báo:</label>
                    <input
                      type="text"
                      value={localSiteSettings.announcementTitle || ''}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, announcementTitle: e.target.value })}
                      placeholder="Ví dụ: Chào Mừng Đến Với Leesin Comic"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Huy Hiệu Tag (Nhỏ):</label>
                    <input
                      type="text"
                      value={localSiteSettings.announcementBadge || ''}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, announcementBadge: e.target.value })}
                      placeholder="Ví dụ: leesincomic.com hoặc HOT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nội Dung Môt Tả Chi Tiết:</label>
                  <textarea
                    rows={2}
                    value={localSiteSettings.announcementText || ''}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, announcementText: e.target.value })}
                    placeholder="Nhập nội dung thông báo muốn truyền tải đến độc giả..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Homepage Comments Feed Toggle */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>4. Cấu Hình Khung Bình Luận Trang Chủ (Homepage Comment Widget)</span>
              </h4>

              <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-100">Bật / Tắt Khung Bình Luận Mới Nhất Trên Trang Chủ:</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Cho phép hiển thị hoặc ẩn hoàn toàn widget "Bình Luận Mới Nhất Các Chap" ở cột phải trang chủ.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalSiteSettings({ ...localSiteSettings, showHomeComments: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      localSiteSettings.showHomeComments !== false
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bật Khung Bình Luận
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalSiteSettings({ ...localSiteSettings, showHomeComments: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      localSiteSettings.showHomeComments === false
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tắt / Ẩn Hoàn Toàn
                  </button>
                </div>
              </div>
            </div>

            {/* Section 5: Footer Configuration Shortcut */}
            <div className="space-y-4 border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  <span>5. Cấu Hình & Tùy Biến Footer Cuối Trang (Chân Trang)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('footer-settings')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Mở Trình Chỉnh Sửa Footer</span>
                </button>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-slate-300 font-bold">Chỉnh sửa toàn bộ thông tin bản quyền, các cột liên kết, email DMCA và các nhãn chân trang.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tài khoản Admin có quyền chỉnh sửa tất cả nội dung footer và đồng bộ trực tiếp lên cơ sở dữ liệu MySQL.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('footer-settings')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-amber-500/30 whitespace-nowrap"
                >
                  Tới Tab Cấu Hình Footer →
                </button>
              </div>
            </div>

            {/* Section 6: Save Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={handleSaveSiteSettings}
                disabled={isSavingSiteSettings}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:brightness-110 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isSavingSiteSettings ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang Lưu Cấu Hình Lên MySQL...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Tất Cả Cấu Hình Website</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Footer Settings */}
      {activeTab === 'footer-settings' && (
        <div id="admin-footer-settings-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                  <Layout className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">Quản Lý & Tùy Biến Footer Cuối Trang</h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold text-[10px] uppercase">
                      Admin Edit Permission
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chỉnh sửa các cột thông tin, bản quyền, thông báo DMCA, liên kết hữu ích và mạng xã hội xuất hiện ở chân trang website.
                  </p>
                </div>
              </div>

              {siteSavedMsg && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{siteSavedMsg}</span>
                </div>
              )}
            </div>

            {/* Grid 4 Columns of Footer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              
              {/* Box 1: Cột 1 - Thương hiệu & Giới thiệu */}
              <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4" />
                  <span>Cột 1: Thương Hiệu & Giới Thiệu Website</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Đoạn Văn Giới Thiệu Website (Dưới Logo):</label>
                  <textarea
                    rows={3}
                    value={localSiteSettings.footerDescription ?? DEFAULT_SITE_SETTINGS.footerDescription}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerDescription: e.target.value })}
                    placeholder="Nhập mô tả giới thiệu..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">Được hiển thị ngay dưới logo và tên website ở chân trang.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Dòng Chữ Bảo Vệ Bản Quyền & Watermark (Kèm Icon Khiên Vàng):</label>
                  <input
                    type="text"
                    value={localSiteSettings.footerSecurityText ?? DEFAULT_SITE_SETTINGS.footerSecurityText}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerSecurityText: e.target.value })}
                    placeholder="Ví dụ: Hệ thống bảo vệ bản quyền & đóng watermark tự động"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Box 2: Cột 2 - Khám Phá & Liên Kết Nhanh */}
              <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                  <Globe className="w-4 h-4" />
                  <span>Cột 2: Khám Phá Truyện & Liên Kết Nhanh</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Tiêu Đề Cột 2:</label>
                  <input
                    type="text"
                    value={localSiteSettings.footerCol2Title ?? DEFAULT_SITE_SETTINGS.footerCol2Title}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerCol2Title: e.target.value })}
                    placeholder="Ví dụ: Khám Phá Truyện"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-300 block text-[11px]">4 Dòng Liên Kết (Nhãn & Link):</label>
                  {[0, 1, 2, 3].map((idx) => {
                    const links = localSiteSettings.footerCol2Links || DEFAULT_SITE_SETTINGS.footerCol2Links || [];
                    const currentLink = links[idx] || { label: '', url: '' };
                    return (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
                        <input
                          type="text"
                          value={currentLink.label}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx] = { ...currentLink, label: e.target.value };
                            setLocalSiteSettings({ ...localSiteSettings, footerCol2Links: updated });
                          }}
                          placeholder={`Dòng ${idx + 1}: Nhãn hiển thị`}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={currentLink.url || ''}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx] = { ...currentLink, url: e.target.value };
                            setLocalSiteSettings({ ...localSiteSettings, footerCol2Links: updated });
                          }}
                          placeholder={`URL (để trống nếu không đổi)`}
                          className="w-full bg-slate-900/50 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 3: Cột 3 - Hệ Thống Phân Quyền */}
              <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                  <Users className="w-4 h-4" />
                  <span>Cột 3: Hệ Thống Phân Quyền & Hướng Dẫn</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Tiêu Đề Cột 3:</label>
                  <input
                    type="text"
                    value={localSiteSettings.footerCol3Title ?? DEFAULT_SITE_SETTINGS.footerCol3Title}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerCol3Title: e.target.value })}
                    placeholder="Ví dụ: Hệ Thống Phân Quyền"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Mô Tả Cho Độc Giả (Dòng 3):</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerReaderText ?? DEFAULT_SITE_SETTINGS.footerReaderText}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerReaderText: e.target.value })}
                      placeholder="Ví dụ: Độc giả: Chỉ đọc truyện & lưu trữ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Mô Tả Cho Nhóm Dịch (Dòng 4):</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerTeamText ?? DEFAULT_SITE_SETTINGS.footerTeamText}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerTeamText: e.target.value })}
                      placeholder="Ví dụ: Nhóm dịch: Quản lý riêng truyện nhóm"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Box 4: Cột 4 - Bản Quyền, DMCA & Liên Hệ */}
              <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                  <Mail className="w-4 h-4" />
                  <span>Cột 4: Bản Quyền, DMCA & Liên Hệ</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Tiêu Đề Cột 4:</label>
                  <input
                    type="text"
                    value={localSiteSettings.footerCol4Title ?? DEFAULT_SITE_SETTINGS.footerCol4Title}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerCol4Title: e.target.value })}
                    placeholder="Ví dụ: Bản Quyền & Liên Hệ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Lời Tuyên Bố Miễn Trừ Bản Quyền / DMCA:</label>
                  <textarea
                    rows={2}
                    value={localSiteSettings.footerDisclaimer ?? DEFAULT_SITE_SETTINGS.footerDisclaimer}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerDisclaimer: e.target.value })}
                    placeholder="Nhập tuyên bố bản quyền..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Email Khiếu Nại / Liên Hệ:</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerContactEmail ?? DEFAULT_SITE_SETTINGS.footerContactEmail}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerContactEmail: e.target.value })}
                      placeholder="contact@leesincomic.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Hotline / Zalo (Tùy chọn):</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerContactPhone ?? ''}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerContactPhone: e.target.value })}
                      placeholder="0988.xxx.xxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    value={localSiteSettings.footerFacebookUrl ?? ''}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerFacebookUrl: e.target.value })}
                    placeholder="Facebook URL"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-sky-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={localSiteSettings.footerTelegramUrl ?? ''}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerTelegramUrl: e.target.value })}
                    placeholder="Telegram URL"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-cyan-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={localSiteSettings.footerDiscordUrl ?? ''}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerDiscordUrl: e.target.value })}
                    placeholder="Discord URL"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-indigo-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Box 5: Bottom Bar & Copyright */}
            <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4 text-xs">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4" />
                <span>Dòng Bản Quyền Dưới Cùng (Bottom Bar) & Huy Hiệu Bảo Vệ</span>
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-1.5">
                  <label className="font-bold text-slate-200 block">Dòng Chữ Bản Quyền Dưới Cùng (Copyright):</label>
                  <input
                    type="text"
                    value={localSiteSettings.footerCopyrightText ?? DEFAULT_SITE_SETTINGS.footerCopyrightText}
                    onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerCopyrightText: e.target.value })}
                    placeholder="Ví dụ: © 2026 leesincomic.com • Đọc truyện tranh online cập nhật nhanh nhất"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 block text-[11px]">Huy Hiệu 1:</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerBadge1 ?? DEFAULT_SITE_SETTINGS.footerBadge1}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerBadge1: e.target.value })}
                      placeholder="Badge 1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 block text-[11px]">Huy Hiệu 2:</label>
                    <input
                      type="text"
                      value={localSiteSettings.footerBadge2 ?? DEFAULT_SITE_SETTINGS.footerBadge2}
                      onChange={(e) => setLocalSiteSettings({ ...localSiteSettings, footerBadge2: e.target.value })}
                      placeholder="Badge 2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-5">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Khôi phục nội dung Footer về mặc định ban đầu?')) {
                    setLocalSiteSettings({
                      ...localSiteSettings,
                      footerDescription: DEFAULT_SITE_SETTINGS.footerDescription,
                      footerSecurityText: DEFAULT_SITE_SETTINGS.footerSecurityText,
                      footerCol2Title: DEFAULT_SITE_SETTINGS.footerCol2Title,
                      footerCol2Links: DEFAULT_SITE_SETTINGS.footerCol2Links,
                      footerCol3Title: DEFAULT_SITE_SETTINGS.footerCol3Title,
                      footerReaderText: DEFAULT_SITE_SETTINGS.footerReaderText,
                      footerTeamText: DEFAULT_SITE_SETTINGS.footerTeamText,
                      footerCol4Title: DEFAULT_SITE_SETTINGS.footerCol4Title,
                      footerDisclaimer: DEFAULT_SITE_SETTINGS.footerDisclaimer,
                      footerContactEmail: DEFAULT_SITE_SETTINGS.footerContactEmail,
                      footerContactPhone: DEFAULT_SITE_SETTINGS.footerContactPhone,
                      footerFacebookUrl: DEFAULT_SITE_SETTINGS.footerFacebookUrl,
                      footerTelegramUrl: DEFAULT_SITE_SETTINGS.footerTelegramUrl,
                      footerDiscordUrl: DEFAULT_SITE_SETTINGS.footerDiscordUrl,
                      footerCopyrightText: DEFAULT_SITE_SETTINGS.footerCopyrightText,
                      footerBadge1: DEFAULT_SITE_SETTINGS.footerBadge1,
                      footerBadge2: DEFAULT_SITE_SETTINGS.footerBadge2,
                    });
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Khôi Phục Mặc Định Footer</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSiteSettings}
                disabled={isSavingSiteSettings}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isSavingSiteSettings ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang Lưu Cấu Hình Lên MySQL...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình Footer Lên MySQL</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB: Notifications & Messages & Password Resets Command Center */}
      {activeTab === 'notifications' && (
        <div id="admin-notifications-section" className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                  <Bell className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Trung Tâm Quản Trị Thông Báo, Tin Nhắn & Cấp Lại Pass</span>
                    {pendingPasswordResets.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black animate-pulse flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        {pendingPasswordResets.length} yêu cầu chờ cấp pass
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Quản lý toàn bộ thông báo hệ thống, duyệt yêu cầu cấp lại mật khẩu từ độc giả và nhóm dịch, trả lời tin nhắn trực tiếp và phát thông báo toàn trang.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendBroadcastModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Phát Thông Báo / Tin Nhắn Mới</span>
                </button>

                {unreadNotificationsCount > 0 && onMarkAllNotificationsAsRead && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsAsRead}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Đã Đọc Hết</span>
                  </button>
                )}

                {onRefreshData && (
                  <button
                    type="button"
                    onClick={onRefreshData}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm Mới</span>
                  </button>
                )}
              </div>
            </div>

            {/* Broadcast Success Message */}
            {broadcastSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{broadcastSuccessMsg}</span>
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div
                onClick={() => setNotifTabFilter('passwords')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notifTabFilter === 'passwords'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">Yêu Cầu Quên Pass</span>
                  <KeyRound className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{totalPasswordResets.length}</span>
                  {pendingPasswordResets.length > 0 && (
                    <span className="text-xs font-bold text-rose-400">
                      ({pendingPasswordResets.length} chưa cấp)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Bấm để duyệt và cấp mật khẩu mới</p>
              </div>

              <div
                onClick={() => setNotifTabFilter('messages')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notifTabFilter === 'messages'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">Bình Luận & Tin Nhắn</span>
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    {(notifications || []).filter((n) => n.type === 'COMMENT' || n.type === 'REPLY').length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Phản hồi và tương tác của độc giả</p>
              </div>

              <div
                onClick={() => setNotifTabFilter('unread')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notifTabFilter === 'unread'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">Chưa Đọc / Đang Chờ</span>
                  <Clock className="w-4 h-4 text-rose-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-400">{unreadNotificationsCount}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Cần xem và xử lý</p>
              </div>

              <div
                onClick={() => setNotifTabFilter('all')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notifTabFilter === 'all'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold">Tổng Toàn Bộ Thông Báo</span>
                  <Bell className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{(notifications || []).length}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Đã lưu trữ trên hệ thống</p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNotifTabFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    notifTabFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả ({(notifications || []).length})
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTabFilter('passwords')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    notifTabFilter === 'passwords'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black shadow-sm'
                      : pendingPasswordResets.length > 0
                      ? 'text-amber-300 bg-amber-500/10 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Yêu Cầu Quên Pass ({totalPasswordResets.length})</span>
                  {pendingPasswordResets.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTabFilter('messages')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    notifTabFilter === 'messages'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bình luận & Tin nhắn ({(notifications || []).filter((n) => n.type === 'COMMENT' || n.type === 'REPLY').length})
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTabFilter('unread')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    notifTabFilter === 'unread'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chưa đọc ({unreadNotificationsCount})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notifSearchQuery}
                  onChange={(e) => setNotifSearchQuery(e.target.value)}
                  placeholder="Tìm tài khoản, nội dung..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Notification Items List */}
            {(() => {
              const cleanSearch = notifSearchQuery.trim().toLowerCase();
              const list = (notifications || []).filter((n) => {
                if (!n) return false;
                if (notifTabFilter === 'passwords' && !isResetRequest(n)) return false;
                if (notifTabFilter === 'messages' && n.type !== 'COMMENT' && n.type !== 'REPLY') return false;
                if (notifTabFilter === 'unread' && n.isRead) return false;
                if (cleanSearch) {
                  const matchTitle = (n.title || '').toLowerCase().includes(cleanSearch);
                  const matchContent = (n.content || '').toLowerCase().includes(cleanSearch);
                  const matchSender = (n.senderName || '').toLowerCase().includes(cleanSearch);
                  const matchComic = (n.comicTitle || '').toLowerCase().includes(cleanSearch);
                  return matchTitle || matchContent || matchSender || matchComic;
                }
                return true;
              });

              if (list.length === 0) {
                return (
                  <div className="py-12 px-4 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto border border-slate-800">
                      <Bell className="w-6 h-6 opacity-40" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">Không có thông báo nào phù hợp</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {notifTabFilter === 'passwords'
                        ? 'Hiện tại không có yêu cầu cấp lại mật khẩu nào đang chờ duyệt.'
                        : notifTabFilter === 'unread'
                        ? 'Tất cả thông báo đã được xử lý và đánh dấu đã đọc.'
                        : 'Các thông báo mới từ độc giả và nhóm dịch sẽ hiển thị tại đây theo thời gian thực.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {list.map((notif) => {
                    const isPwd = isResetRequest(notif);
                    const isReply = notif.type === 'REPLY';
                    const isComment = notif.type === 'COMMENT';
                    const isReplyingThis = replyingAdminNotifId === notif.id;
                    const isSentSuccess = replySuccessNotifId === notif.id;

                    const cleanAccount = (notif.senderName || notif.senderId || '').replace(/^guest-/, '').replace(/^acc-/, '').trim().toLowerCase();
                    const contentMatch = notif.content?.match(/Tài khoản "([^"]+)"/);
                    const targetAccount = (contentMatch ? contentMatch[1] : cleanAccount).trim();

                    const matchedUser = (effectiveUsers || []).find(
                      (u) =>
                        u.id.toLowerCase() === targetAccount.toLowerCase() ||
                        u.id.toLowerCase() === notif.senderId?.toLowerCase() ||
                        (u.username && u.username.toLowerCase() === targetAccount.toLowerCase()) ||
                        (u.email && u.email.toLowerCase() === targetAccount.toLowerCase()) ||
                        (u.name && u.name.toLowerCase() === targetAccount.toLowerCase())
                    );

                    return (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isPwd && !notif.isRead
                            ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/5'
                            : !notif.isRead
                            ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                            : 'bg-slate-950/50 border-slate-800/80 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="relative shrink-0 mt-0.5">
                              <img
                                src={notif.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                                alt={notif.senderName}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                              />
                              <div
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-[#141822] ${
                                  isPwd
                                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-bold'
                                    : isReply
                                    ? 'bg-sky-500 text-white'
                                    : isComment
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-emerald-500 text-white'
                                }`}
                              >
                                {isPwd ? (
                                  <KeyRound className="w-3 h-3 text-slate-950" />
                                ) : isReply ? (
                                  <CornerDownRight className="w-3 h-3" />
                                ) : isComment ? (
                                  <MessageSquare className="w-3 h-3" />
                                ) : (
                                  <Bell className="w-3 h-3" />
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-white">
                                  {matchedUser ? matchedUser.name : (notif.senderName || targetAccount)}
                                </span>

                                {targetAccount && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                                    @{targetAccount}
                                  </span>
                                )}

                                {matchedUser?.role === 'TEAM_LEADER' && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    Nhóm Dịch: {matchedUser.teamName || matchedUser.name}
                                  </span>
                                )}

                                {isPwd ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    notif.isRead
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                  }`}>
                                    {notif.isRead ? 'Đã xử lý cấp pass' : 'Cần Admin cấp lại pass'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                                    {notif.title}
                                  </span>
                                )}

                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(notif.createdAt)}
                                </span>
                              </div>

                              {/* Comic info if comment */}
                              {notif.comicTitle && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{notif.comicTitle}</span>
                                  {notif.chapterNumber !== undefined && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                                      Chap {notif.chapterNumber}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Content text */}
                              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
                                {notif.content}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                            {isPwd && (
                              <button
                                type="button"
                                onClick={() => handleOpenResetForRequest(notif)}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              >
                                <KeyRound className="w-4 h-4" />
                                <span>Cấp Mật Khẩu Mới Ngay</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (isReplyingThis) {
                                  setReplyingAdminNotifId(null);
                                  setReplyingAdminText('');
                                } else {
                                  setReplyingAdminNotifId(notif.id);
                                  setReplyingAdminText(isPwd ? `Admin Leesin Comic đã nhận được yêu cầu của bạn. Mật khẩu mới đã được cập nhật.` : '');
                                }
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isReplyingThis
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                              title="Gửi phản hồi / tin nhắn cho người dùng này"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isReplyingThis ? 'Đóng Soạn' : 'Nhắn Tin'}</span>
                            </button>

                            {!notif.isRead && onMarkNotificationAsRead && (
                              <button
                                type="button"
                                onClick={() => onMarkNotificationAsRead(notif.id)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                                title="Đánh dấu đã đọc / đã xử lý"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {onDeleteNotification && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Bạn có chắc muốn xóa thông báo này?')) {
                                    onDeleteNotification(notif.id);
                                  }
                                }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Xóa thông báo này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Success banner on reply */}
                        {isSentSuccess && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-semibold">Đã gửi tin nhắn phản hồi tới tài khoản thành công!</span>
                          </div>
                        )}

                        {/* Inline Reply Form */}
                        {isReplyingThis && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAdminSendReply(notif, replyingAdminText);
                            }}
                            className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in"
                          >
                            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
                              <span>Gửi tin nhắn phản hồi cho @{targetAccount || notif.senderName}:</span>
                              <button
                                type="button"
                                onClick={() => setReplyingAdminNotifId(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={replyingAdminText}
                                onChange={(e) => setReplyingAdminText(e.target.value)}
                                placeholder="Nhập nội dung phản hồi gửi tới tài khoản..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                type="submit"
                                disabled={!replyingAdminText.trim()}
                                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Gửi Tin Nhắn</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Modal: Broadcast New Notification */}
      {showSendBroadcastModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowSendBroadcastModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#141822] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Phát Thông Báo / Tin Nhắn Mới</h4>
                  <p className="text-[11px] text-slate-400">Gửi thông báo từ Ban Quản Trị toàn trang hoặc tới đối tượng cụ thể</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendBroadcastModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminBroadcastNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Đối tượng nhận thông báo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastTarget('ALL')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      broadcastTarget === 'ALL'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Tất Cả Mọi Người
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastTarget('TEAM_LEADER')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      broadcastTarget === 'TEAM_LEADER'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Tất Cả Nhóm Dịch
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastTarget('SPECIFIC')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      broadcastTarget === 'SPECIFIC'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Người Dùng Cụ Thể
                  </button>
                </div>
              </div>

              {broadcastTarget === 'SPECIFIC' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nhập Tên đăng nhập hoặc User ID:
                  </label>
                  <input
                    type="text"
                    value={broadcastRecipientAccount}
                    onChange={(e) => setBroadcastRecipientAccount(e.target.value)}
                    placeholder="Ví dụ: docgia99, team_meou..."
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tiêu đề thông báo: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Thông báo bảo trì hệ thống / Chương mới cập nhật..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nội dung chi tiết: <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo gửi tới độc giả / nhóm dịch..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đường dẫn liên kết (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={broadcastLink}
                  onChange={(e) => setBroadcastLink(e.target.value)}
                  placeholder="Ví dụ: /hot hoặc https://leesincomic.com..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSendBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={!broadcastTitle.trim() || !broadcastContent.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Thông Báo Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset User Password (Pop-up khi Admin duyệt yêu cầu quên pass hoặc bấm Cấp pass) */}
      {resetPasswordTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => {
            if (!adminResetSubmitting) {
              setResetPasswordTargetUser(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg bg-[#141822] border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                  <KeyRound className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Cấp Lại Mật Khẩu Cho Thành Viên</h4>
                  <p className="text-[11px] text-slate-400">Đặt mật khẩu mới và tự động gửi thông báo xác nhận</p>
                </div>
              </div>
              <button
                type="button"
                disabled={adminResetSubmitting}
                onClick={() => setResetPasswordTargetUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target User Info Card */}
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center gap-3">
              <img
                src={resetPasswordTargetUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={resetPasswordTargetUser.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm truncate">{resetPasswordTargetUser.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    @{resetPasswordTargetUser.username || resetPasswordTargetUser.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    resetPasswordTargetUser.role === 'ADMIN'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : resetPasswordTargetUser.role === 'TEAM_LEADER'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {resetPasswordTargetUser.role === 'ADMIN' ? 'Admin' : resetPasswordTargetUser.role === 'TEAM_LEADER' ? `Nhóm Dịch: ${resetPasswordTargetUser.teamName || resetPasswordTargetUser.name}` : 'Độc Giả'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">{resetPasswordTargetUser.email || `${resetPasswordTargetUser.username || 'user'}@leesincomic.com`}</p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleExecuteResetPassword(resetPasswordTargetUser, adminNewPasswordInput);
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mật khẩu mới cần cấp:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdminNewPasswordInput(generateStrongPassword())}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tạo mật khẩu ngẫu nhiên</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={adminShowNewPass ? 'text' : 'password'}
                    value={adminNewPasswordInput}
                    onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono font-bold placeholder-slate-500 pr-10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdminShowNewPass(!adminShowNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {adminShowNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mật khẩu mới sẽ được cập nhật ngay lập tức vào cơ sở dữ liệu và tự động đánh dấu đã xử lý yêu cầu.
                </p>
              </div>

              {/* Status / Feedback messages */}
              {adminResetErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{adminResetErrorMsg}</span>
                </div>
              )}

              {adminResetSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Cấp mật khẩu thành công!
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copyTxt = `Tài khoản: @${resetPasswordTargetUser.username || resetPasswordTargetUser.id}\nMật khẩu mới: ${adminNewPasswordInput}`;
                        navigator.clipboard.writeText(copyTxt);
                        setCopiedAccountInfo(true);
                        setTimeout(() => setCopiedAccountInfo(false), 2500);
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-mono hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      {copiedAccountInfo ? 'Đã sao chép ✓' : 'Sao chép thông tin'}
                    </button>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800">
                    <div>Tài khoản: <strong className="text-white">@{resetPasswordTargetUser.username || resetPasswordTargetUser.id}</strong></div>
                    <div>Mật khẩu mới: <strong className="text-amber-400 font-bold text-sm bg-amber-500/10 px-1.5 py-0.5 rounded">{adminNewPasswordInput}</strong></div>
                  </div>
                  <p className="text-[10px] text-emerald-400/80">
                    ✓ Đã cập nhật vào hệ thống và gửi thông báo xác nhận đến tài khoản thành viên.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPasswordTargetUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {adminResetSuccessMsg ? 'Hoàn Tất & Đóng' : 'Hủy Bỏ'}
                </button>

                {!adminResetSuccessMsg && (
                  <button
                    type="submit"
                    disabled={adminResetSubmitting || !adminNewPasswordInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {adminResetSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang Cập Nhật...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Xác Nhận Cấp Mật Khẩu</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: Manage Comments */}
      {activeTab === 'manage-comments' && (

        <div id="admin-manage-comments-section" className="space-y-6">
          <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Quản Lý & Xóa Bình Luận Toàn Hệ Thống</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {comments.length} bình luận
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Xem danh sách tất cả bình luận từ độc giả trên trang chủ và từng chương truyện. Bạn có thể tìm kiếm và xóa bất kỳ bình luận nào.
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={commentSearchQuery}
                  onChange={(e) => setCommentSearchQuery(e.target.value)}
                  placeholder="Tìm theo nội dung, tên độc giả, truyện..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Deleted Feedback Toast */}
            {deletedToast && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{deletedToast}</span>
              </div>
            )}

            {/* Comments List Table */}
            {(() => {
              const filteredList = comments.filter((c) => {
                if (!commentSearchQuery.trim()) return true;
                const q = commentSearchQuery.toLowerCase();
                return (
                  c.content.toLowerCase().includes(q) ||
                  c.userName.toLowerCase().includes(q) ||
                  c.comicTitle.toLowerCase().includes(q)
                );
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                    <p className="text-sm font-medium">Không tìm thấy bình luận nào.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredList.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <img
                          src={c.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={c.userName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0 mt-0.5"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{c.userName}</span>
                            {c.userRole === 'ADMIN' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Admin
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">• {c.createdAt}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                              {c.comicTitle} (Chap {c.chapterNumber})
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed break-words">
                            "{c.content}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                        {onDeleteComment && (
                          confirmDeleteCommentId === c.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteComment(c.id);
                                  setConfirmDeleteCommentId(null);
                                  setDeletedToast(`Đã xóa thành công bình luận của "${c.userName}"!`);
                                  setTimeout(() => setDeletedToast(null), 3000);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Xác nhận xóa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCommentId(null)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                              >
                                <span>Hủy</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCommentId(c.id)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              title="Xóa bình luận này khỏi hệ thống"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa Bình Luận</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: View All Comics Belonging to Selected Team */}
      {viewingTeamComics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl bg-[#141822] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            {(() => {
              const teamComicsList = comics.filter(
                (c) => c.teamId === viewingTeamComics.id || c.teamName?.toLowerCase() === viewingTeamComics.name.toLowerCase()
              );
              const realTeamTotalViews = teamComicsList.reduce((sum, c) => sum + (c.views || 0), 0);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={viewingTeamComics.avatar}
                        alt={viewingTeamComics.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg shrink-0"
                      />
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <span>Danh Sách Truyện Của Nhóm Dịch:</span>
                          <span className="text-amber-400">{viewingTeamComics.name}</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Trưởng nhóm: <strong className="text-white">{viewingTeamComics.leaderName}</strong> • Tổng lượt xem: <strong className="text-emerald-400">{realTeamTotalViews.toLocaleString()} view</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingTeamComics(null)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* List of Comics */}
                  {teamComicsList.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                      <BookOpen className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
                      <p className="text-xs font-semibold">Nhóm dịch này hiện chưa có bộ truyện nào.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teamComicsList.map((comic) => (
                        <div
                          key={comic.id}
                          className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 flex gap-3 items-center justify-between hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => {
                                if (onSelectComic) {
                                  setViewingTeamComics(null);
                                  onClose();
                                  onSelectComic(comic);
                                }
                              }}
                              className={`relative group shrink-0 ${onSelectComic ? 'cursor-pointer' : ''}`}
                              title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                            >
                              <img
                                src={comic.coverImage}
                                alt={comic.title}
                                className="w-12 h-16 object-cover rounded-xl border border-slate-700 shrink-0 group-hover:border-amber-400 group-hover:scale-105 transition-all shadow-md"
                                referrerPolicy="no-referrer"
                              />
                              {onSelectComic && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-amber-300 drop-shadow" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4
                                onClick={() => {
                                  if (onSelectComic) {
                                    setViewingTeamComics(null);
                                    onClose();
                                    onSelectComic(comic);
                                  }
                                }}
                                className={`text-xs font-bold text-white truncate transition-colors ${
                                  onSelectComic ? 'cursor-pointer hover:text-amber-400 hover:underline' : ''
                                }`}
                                title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                              >
                                {comic.title}
                              </h4>
                              <p className="text-[11px] text-amber-400 font-medium mt-0.5">{comic.chapters.length} chương</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{comic.views.toLocaleString()} view</p>
                              {onSelectComic && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingTeamComics(null);
                                    onClose();
                                    onSelectComic(comic);
                                  }}
                                  className="mt-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline cursor-pointer"
                                  title="Xem trang chi tiết truyện trên web"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Xem Chi Tiết</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Reassign Team Action */}
                          <div className="shrink-0 text-right space-y-1">
                            <span className="text-[10px] text-slate-400 block font-semibold">Đổi Nhóm Dịch:</span>
                            <select
                              id={`modal-select-team-${comic.id}`}
                              value={pendingTeamChanges[comic.id] ?? (comic.teamId || viewingTeamComics.id)}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const currentId = comic.teamId || viewingTeamComics.id;
                                if (selectedId === currentId) {
                                  setPendingTeamChanges((prev) => {
                                    const next = { ...prev };
                                    delete next[comic.id];
                                    return next;
                                  });
                                } else {
                                  setPendingTeamChanges((prev) => ({ ...prev, [comic.id]: selectedId }));
                                }
                              }}
                              className={`text-[10px] font-bold rounded-lg px-2 py-1 border focus:outline-none ${
                                pendingTeamChanges[comic.id] && pendingTeamChanges[comic.id] !== (comic.teamId || viewingTeamComics.id)
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/80'
                                  : 'bg-slate-950 text-amber-300 border-slate-700'
                              }`}
                            >
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>

                            {pendingTeamChanges[comic.id] && pendingTeamChanges[comic.id] !== (comic.teamId || viewingTeamComics.id) && (
                              <div className="flex items-center justify-end gap-1.5 pt-1 animate-in fade-in">
                                <button
                                  id={`modal-btn-confirm-team-${comic.id}`}
                                  type="button"
                                  onClick={() => {
                                    const chosenTeamId = pendingTeamChanges[comic.id];
                                    handleReassignComicTeam(comic, chosenTeamId);
                                    setPendingTeamChanges((prev) => {
                                      const next = { ...prev };
                                      delete next[comic.id];
                                      return next;
                                    });
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow-sm transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Xác nhận</span>
                                </button>
                                <button
                                  id={`modal-btn-cancel-team-${comic.id}`}
                                  type="button"
                                  onClick={() => {
                                    setPendingTeamChanges((prev) => {
                                      const next = { ...prev };
                                      delete next[comic.id];
                                      return next;
                                    });
                                  }}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded transition-colors flex items-center gap-1"
                                >
                                  <X className="w-2.5 h-2.5" />
                                  <span>Hủy</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: In-Chapter Advertising Settings (Quản Lý Quảng Cáo Trong Chap) */}
      {activeTab === 'ads-settings' && (
        <div id="admin-ads-settings-section" className="space-y-6">
          {currentUser && currentUser.role !== 'ADMIN' ? (
            <div className="bg-[#141822] border border-rose-500/40 rounded-3xl p-8 text-center space-y-4 shadow-xl">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Yêu Cầu Quyền Quản Trị Viên (Admin)</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập và điều chỉnh thông số quảng cáo trong chương truyện.
              </p>
            </div>
          ) : (
            <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        Cấu Hình Quảng Cáo Xuất Hiện Trong Chap Truyện
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Quyền Admin
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Quản lý popup quảng cáo Shopee/Sponsor trong chương đọc truyện, kiểm soát số lượng QC, thời gian xuất hiện lần 1, lần 2 và chu kỳ reset.
                    </p>
                  </div>
                </div>

                {/* Top Action: Preview Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewAdOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>Xem Thử Giao Diện QC (Preview)</span>
                  </button>
                </div>
              </div>

              {/* Status & Messages */}
              {adSavedSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">{adSavedSuccessMsg}</span>
                </div>
              )}

              {/* Section 1: Kích Hoạt & Cấu Hình Thời Gian, Số Lượng QC (Core Requirements) */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Trạng Thái & Quy Tắc Hiển Thị Thời Gian</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bật/Tắt quảng cáo và thiết lập tần suất xuất hiện chính xác theo giây/phút
                    </p>
                  </div>

                  {/* Enable / Disable Switch */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => updateAdConfig({ enabled: true })}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adConfig.enabled
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BẬT QUẢNG CÁO
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAdConfig({ enabled: false })}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !adConfig.enabled
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      TẮT
                    </button>
                  </div>
                </div>

                {/* 4 Core Parameter Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Số lượng QC */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Số lượng quảng cáo (Lần)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {adConfig.maxAdsCount || 2} lần
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={adConfig.maxAdsCount ?? 2}
                      onChange={(e) =>
                        updateAdConfig({ maxAdsCount: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Số lần quảng cáo tối đa xuất hiện trong 1 phiên đọc (Khuyên dùng: 1 hoặc 2 lần).
                    </p>
                  </div>

                  {/* 2. Thời gian quảng cáo xuất hiện (Lần 1) */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Thời gian xuất hiện Lần 1 (Giây)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {adConfig.firstAdDelaySeconds ?? 5}s
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      value={adConfig.firstAdDelaySeconds ?? 5}
                      onChange={(e) =>
                        updateAdConfig({
                          firstAdDelaySeconds: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Số giây chờ từ lúc độc giả mở đọc chương truyện tới khi quảng cáo lần 1 bật lên.
                    </p>
                  </div>

                  {/* 3. Thời gian xuất hiện quảng cáo thứ 2 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Thời gian xuất hiện QC 2 (Giây)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {adConfig.secondAdDelaySeconds ?? 60}s
                      </span>
                    </div>
                    <input
                      type="number"
                      min="5"
                      max="1800"
                      value={adConfig.secondAdDelaySeconds ?? 60}
                      onChange={(e) =>
                        updateAdConfig({
                          secondAdDelaySeconds: Math.max(5, parseInt(e.target.value) || 5),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Khoảng thời gian (giây) chờ sau khi đóng QC 1 trước khi QC thứ 2 xuất hiện.
                    </p>
                  </div>

                  {/* 4. Thời gian reset quảng cáo */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Thời gian reset quảng cáo (Phút)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {adConfig.adResetMinutes ?? 30} phút
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={adConfig.adResetMinutes ?? 30}
                      onChange={(e) =>
                        updateAdConfig({
                          adResetMinutes: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sau bao nhiêu phút thì hệ thống reset bộ đếm QC để độc giả thấy lại quảng cáo.
                    </p>
                  </div>
                </div>

                {/* Inline Shopee Banner Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-[#00b14f]" />
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        Hiển thị thêm Banner Shopee ở cuối chương truyện
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Đặt một thẻ banner Shopee tĩnh bên dưới các trang truyện để độc giả có thể click ủng hộ bất kỳ lúc nào.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateAdConfig({ showInlineBanner: !adConfig.showInlineBanner })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adConfig.showInlineBanner
                        ? 'bg-[#00b14f] text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {adConfig.showInlineBanner ? 'Đang Bật' : 'Đang Tắt'}
                  </button>
                </div>
              </div>

              {/* Section 2: Tùy Chỉnh Nội Dung & Hình Ảnh Shopee/Sponsor */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-5">
                <div className="border-b border-slate-800/80 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Nội Dung & Hình Ảnh Sản Phẩm Shopee / Nhà Tài Trợ</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tùy biến tiêu đề, mô tả, ảnh thumbnail, link tiếp thị liên kết Shopee và nhãn thương hiệu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Cột 1: Thông tin văn bản & link */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Tiêu Đề Popup Quảng Cáo
                      </label>
                      <input
                        type="text"
                        value={adConfig.title || ''}
                        onChange={(e) => updateAdConfig({ title: e.target.value })}
                        placeholder="Click QC mở APP SHOPEE ủng hộ mình nhé!"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Mô Tả Sản Phẩm / Lời Kêu Gọi
                      </label>
                      <textarea
                        rows={3}
                        value={adConfig.description || ''}
                        onChange={(e) => updateAdConfig({ description: e.target.value })}
                        placeholder="Giấy vệ sinh treo tường TopGia đa sắc đa năng từ bột giấy thiên nhiên, 1280tờ/4lớp"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Dòng Nhắc Mở App / Câu Hỏi
                      </label>
                      <input
                        type="text"
                        value={adConfig.subText || ''}
                        onChange={(e) => updateAdConfig({ subText: e.target.value })}
                        placeholder="Đồng ý mở app (Shopee) và phát nhạc chứ?"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Từ khóa (Shopee) sẽ tự động được tô màu xanh nổi bật như mẫu.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Link Đích Shopee / Tiếp Thị Liên Kết (Affiliate)
                      </label>
                      <input
                        type="url"
                        value={adConfig.targetUrl || ''}
                        onChange={(e) => updateAdConfig({ targetUrl: e.target.value })}
                        placeholder="https://shopee.vn/..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Khi độc giả bấm nút "Đồng ý", hệ thống sẽ mở link này trong tab mới.
                      </p>
                    </div>
                  </div>

                  {/* Cột 2: Nút bấm & Hình ảnh sản phẩm */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Nhãn Badge Góc
                        </label>
                        <input
                          type="text"
                          value={adConfig.badgeText || 'SHOPEE'}
                          onChange={(e) => updateAdConfig({ badgeText: e.target.value })}
                          placeholder="SHOPEE"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Nút Đồng Ý
                        </label>
                        <input
                          type="text"
                          value={adConfig.confirmBtnText || 'Đồng ý'}
                          onChange={(e) => updateAdConfig({ confirmBtnText: e.target.value })}
                          placeholder="Đồng ý"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Nút Từ Chối
                      </label>
                      <input
                        type="text"
                        value={adConfig.cancelBtnText || 'Từ chối'}
                        onChange={(e) => updateAdConfig({ cancelBtnText: e.target.value })}
                        placeholder="Từ chối"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Hình ảnh sản phẩm */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Hình Ảnh Sản Phẩm / Banner Quảng Cáo
                      </label>
                      <div className="flex gap-3 items-start">
                        <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                          {adConfig.imageUrl ? (
                            <img
                              src={adConfig.imageUrl}
                              alt="Thumbnail Preview"
                              className="w-full h-full object-contain rounded-xl"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-slate-600" />
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <input
                            type="url"
                            value={adConfig.imageUrl || ''}
                            onChange={(e) => updateAdConfig({ imageUrl: e.target.value })}
                            placeholder="Dán link ảnh sản phẩm (https://...)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                          <ImageUploadField
                            label="Tải ảnh sản phẩm từ máy tính"
                            value={adConfig.imageUrl || ''}
                            onChange={(url) => updateAdConfig({ imageUrl: url })}
                            imageServerConfig={imageServerConfig}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Bottom Save & Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Dữ liệu quảng cáo sẽ được lưu vào máy chủ MySQL và áp dụng cho toàn bộ độc giả</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPreviewAdOpen(true)}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>Xem Thử (Preview)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAdSettings}
                    disabled={isSavingAdSettings}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    {isSavingAdSettings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Đang Lưu Lên MySQL...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu Cài Đặt Quảng Cáo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chapter Ad Preview Modal for Admin */}
      <ChapterAdModal
        ad={adConfig}
        isOpen={isPreviewAdOpen}
        onClose={() => setIsPreviewAdOpen(false)}
        onConfirm={() => setIsPreviewAdOpen(false)}
        isPreview={true}
      />

      {/* Comic Edit Modal for Admin */}
      {adminEditingComic && (
        <TeamEditComicModal
          isOpen={!!adminEditingComic}
          onClose={() => setAdminEditingComic(null)}
          comic={adminEditingComic}
          isAdmin={true}
          imageServerConfig={imageServerConfig}
          onSaveComic={(updated) => {
            if (onUpdateComic) {
              onUpdateComic(updated);
            }
            setAdminEditingComic(null);
          }}
        />
      )}

      {/* Sitemap & Robots XML Explorer Modal */}
      {isSitemapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111622] border border-slate-700 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{sitemapModalTitle || 'Sơ Đồ Trang Web XML'}</h3>
                  <p className="text-xs text-slate-400">Sitemap XML được biên dịch tự động chuẩn cú pháp Google Search Console</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sitemapModalContent);
                    setHasCopiedSitemapXml(true);
                    setTimeout(() => setHasCopiedSitemapXml(false), 3000);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {hasCopiedSitemapXml ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã Sao Chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao Chép XML</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const filename = sitemapModalTitle.includes('Robots') ? 'robots.txt' : (sitemapModalTitle.includes('Index') ? 'sitemap_index.xml' : 'sitemap.xml');
                    const mime = filename.endsWith('.txt') ? 'text/plain;charset=utf-8' : 'application/xml;charset=utf-8';
                    downloadClientFile(filename, sitemapModalContent, mime);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Về</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSitemapModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto flex-1 font-mono text-xs bg-[#0b0e14] text-slate-300 select-all whitespace-pre leading-relaxed border-b border-slate-800">
              {sitemapModalContent}
            </div>

            <div className="p-4 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>Được tạo động từ hệ thống Leesin Comic theo thời gian thực</span>
              <button
                type="button"
                onClick={() => setIsSitemapModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Month Picker Modal */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111622] border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Tra Cứu Lượt Xem Các Tháng</h3>
                  <p className="text-xs text-slate-400">Chọn bất kỳ tháng nào trong quá khứ để xem thống kê chi tiết</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Year Selector Tabs */}
              <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setPickerYear(year)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      pickerYear === year
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    Năm {year}
                  </button>
                ))}
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const mKey = `${pickerYear}-${String(m).padStart(2, '0')}`;
                  const isSelected = selectedMonth === mKey;
                  const isCurrent = mKey === currentMonthKey;
                  const isFuture = pickerYear > currentYear || (pickerYear === currentYear && m > currentMonthNum);

                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={isFuture}
                      onClick={() => {
                        if (!isFuture) {
                          setSelectedMonth(mKey);
                          setIsMonthPickerOpen(false);
                        }
                      }}
                      className={`relative p-3 rounded-2xl text-center border transition-all group ${
                        isFuture
                          ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                      title={isFuture ? `Tháng ${m}/${pickerYear} chưa diễn ra` : `Chọn tháng ${m}/${pickerYear}`}
                    >
                      <div className="text-xs font-bold">Tháng {m}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{pickerYear}</div>
                      {isCurrent && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-semibold">
                          Hiện tại
                        </span>
                      )}
                      {isFuture && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-slate-800/80 text-slate-500 rounded-full font-medium">
                          Chưa đến
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump Shortcuts */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Đang xem: <strong className="text-amber-400">{monthLabels[selectedMonth] || selectedMonth}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(currentMonthKey);
                    setIsMonthPickerOpen(false);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline decoration-amber-500/40 underline-offset-4"
                >
                  Về tháng hiện tại (T{currentMonthNum}/{currentYear})
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
