export type UserRole = 'ADMIN' | 'TEAM_LEADER' | 'TEAM_MEMBER' | 'READER';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar: string;
  role: UserRole;
  password?: string;
  passwordHash?: string;
  teamId?: string;
  teamName?: string;
  canUpload?: boolean;
  phone?: string;
  bio?: string;
  status?: 'ACTIVE' | 'BANNED';
  resetOtp?: string;
  resetOtpExpires?: number;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface ScanTeamMember {
  id: string;
  name: string;
  email: string;
  role: 'LEADER';
  canUpload: boolean;
  joinedDate: string;
  uploadedChaptersCount: number;
}

export interface ScanTeam {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  avatarUrl?: string;
  bio: string;
  description?: string;
  donateInfo?: string; // Thông tin donate / tài khoản ủng hộ nhóm dịch
  donateQr?: string;   // Link ảnh mã QR donate của nhóm
  leaderId: string;
  leaderName: string;
  members: ScanTeamMember[];
  membersCount?: number;
  createdAt?: string;
  monthlyViews: Record<string, number>; // e.g. "2026-05": 145000
  dailyViews: Record<string, number>;   // e.g. "2026-09-14": 4200
  totalViews: number;
  follows?: number; // Số lượt theo dõi của độc giả đối với nhóm dịch
  followsCount?: number;
}

export interface Chapter {
  id: string;
  comicId: string;
  comicTitle: string;
  chapterNumber: number;
  title: string;
  createdAt: string;
  updatedAt?: string;
  scheduledDate?: string; // If in the future, it's scheduled
  isPasswordProtected: boolean;
  password?: string;
  views: number;
  images: string[];
  teamId: string;
  teamName: string;
  link?: string;
  pageCount?: number;
}

export interface SeoConfig {
  focusKeyword?: string;
  title?: string;
  metaTitle?: string;
  metaDesc?: string;
  metaDescription?: string;
  metaKeywords?: string | string[];
  description?: string;
  keywords?: string | string[];
  canonicalUrl?: string;
  score?: number;
  schemaType?: 'ComicBook' | 'Book' | 'CreativeWork';
  ogImage?: string;
  [key: string]: any;
}

export interface Comic {
  id: string;
  title: string;
  slug: string;
  rawSlug?: string;
  otherNames: string[];
  alternativeTitles?: string[];
  latestChapter?: number | string;
  coverImage: string;
  bannerImage: string;
  authors: string[];
  status: 'Đang tiến hành' | 'Hoàn thành' | 'Đã hoàn thành' | 'Tạm ngưng' | (string & {});
  genres: string[];
  summary?: string;
  description?: string;
  teamId: string;
  teamName: string;
  views: number;
  dayViews?: number;
  weekViews?: number;
  monthViews?: number;
  likes: number;
  follows: number;
  rating: number;
  ratingCount: number;
  updatedAt: string;
  createdAt?: string;
  uploaderId?: string;
  isHot?: boolean;
  isTrending?: boolean;
  is18Plus?: boolean;
  isRecommended?: boolean;
  isNewRelease?: boolean;
  chapters: Chapter[];
  seo?: SeoConfig;
}

export interface ReadingHistoryItem {
  id: string;
  userId?: string;
  comicId: string;
  comicTitle: string;
  comicSlug?: string;
  coverImage?: string;
  comicCover?: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  readAt?: string;
  lastReadAt?: string;
  teamName?: string;
  progressPercent?: number;
}

export interface FollowedComicItem {
  id?: string;
  userId?: string;
  comicId: string;
  comicTitle?: string;
  comicSlug?: string;
  coverImage?: string;
  comicCover?: string;
  followedAt: string;
  lastReadChapterNumber?: number;
  latestChapterNumber?: number;
  latestChapterTitle?: string;
  teamName?: string;
  hasUnread?: boolean;
}

export interface FollowedTeamItem {
  id?: string;
  userId?: string;
  teamId: string;
  teamName: string;
  teamSlug?: string;
  teamAvatar?: string;
  teamBio?: string;
  donateInfo?: string;
  followedAt: string;
  comicsCount?: number;
  totalViews?: number;
  leaderName?: string;
}

export interface ChapterComment {
  id: string;
  comicId: string;
  comicTitle: string;
  comicSlug: string;
  coverImage?: string;
  comicCover?: string;
  chapterId?: string;
  chapterNumber: number;
  chapterTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: UserRole | string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  replyCount?: number;
  parentId?: string; // ID của bình luận cha nếu là bình luận trả lời
  replyToUserId?: string; // ID của người dùng được trả lời
  replyToUserName?: string; // Tên của người dùng được trả lời
}

export type NotificationType = 'COMMENT' | 'REPLY' | 'NEW_CHAPTER' | 'SYSTEM' | 'VIEW_MILESTONE';

export interface AppNotification {
  id: string;
  recipientUserId?: string; // ID người nhận (nếu gửi đích danh)
  recipientRole?: UserRole | 'ALL'; // Vai trò người nhận (ADMIN, TEAM_LEADER, READER)
  recipientTeamId?: string; // ID nhóm dịch nhận thông báo
  recipientTeamName?: string; // Tên nhóm dịch nhận thông báo
  type: NotificationType;
  title: string;
  content: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  comicId?: string;
  comicTitle?: string;
  comicSlug?: string;
  chapterId?: string;
  chapterNumber?: number;
  parentCommentId?: string;
  commentId?: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
}

export interface ImageServerConfig {
  endpointUrl: string;       // e.g. "https://tachserver.site/upload.php"
  apiKey: string;            // e.g. "Leesin_Secret_Image_Key_2026"
  enabled: boolean;          // Whether remote CDN is active
  autoUploadToCdn: boolean;  // Automatically upload to tachserver when publishing
  targetDomain: string;      // "tachserver.site"
}

export interface MysqlConfig {
  apiUrl: string;            // e.g. "/api.php" or "https://lazyteam.site/api.php" or "https://leesincomic.com/api.php"
  apiKey: string;
  enabled: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  dbName: string;
  dbUser?: string;
  dbPass?: string;
  autoSync?: boolean;
  lastSyncedAt?: string;
}

export interface SiteSettings {
  siteName: string;
  siteDomain?: string;
  siteSlogan?: string;
  headTitle?: string;
  metaTitle?: string;
  siteDescription?: string;
  metaDescription?: string;
  siteKeywords?: string;
  canonicalUrl?: string;
  logoUrl?: string;
  logoHeight?: number; // Chiều cao logo Header (px), e.g. 40
  logoWidth?: number; // Chiều rộng tối đa logo Header (px), e.g. 240
  logoScale?: number; // Tỉ lệ phóng to/thu nhỏ logo Header
  footerLogoHeight?: number; // Chiều cao logo Chân Trang Footer (px), e.g. 32
  faviconUrl?: string;
  headerBadgeText?: string;
  // View calculation rules
  viewDelaySeconds: number; // e.g. 10 (user must read at least 10s before view is recorded)
  viewCooldownMinutes: number; // e.g. 15 (cooldown between counting views for same chapter)
  viewMultiplier: number; // e.g. 1 = 1x view, 2 = double view
  requireScrollPercent: number; // e.g. 0% or 30% scroll depth
  viewTrackingStartDate?: string; // Mốc thời gian bắt đầu tính view (ISO 8601 string, e.g. "2026-09-01T00:00:00"). View trước thời điểm này sẽ không tính.
  // Comments configuration
  allowGuestComments: boolean;
  autoApproveComments: boolean;
  commentMaxLength: number;
  showHomeComments?: boolean; // Toggle homepage comment feed box
  // Announcement Banner
  showAnnouncementBanner?: boolean;
  announcementTitle?: string;
  announcementBadge?: string;
  announcementText?: string;
  announcementButtonText?: string;
  announcementButtonLink?: string;
  // Chapter Advertisements (Quảng Cáo Trong Chap)
  chapterAd?: ChapterAdConfig;
  // Watermark Auto Settings
  enableGlobalWatermark?: boolean; // Tự động đóng dấu Watermark Logo cho toàn bộ truyện & chương trên website (1 thao tác)
  watermarkText?: string;
  watermarkLogoUrl?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'tiled' | 'bottom-center' | 'diagonal';
  watermarkScale?: number;
  watermarkMode?: 'text' | 'logo' | 'both';
  watermark?: {
    enabled?: boolean;
    logoUrl?: string;
    text?: string;
    opacity?: number;
    scale?: number;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'tiled' | 'diagonal';
    mode?: 'text' | 'logo' | 'both';
  };
  // Footer Customization
  footerDescription?: string;
  footerSecurityText?: string;
  footerCol2Title?: string;
  footerCol2Links?: { label: string; url?: string }[];
  footerCol3Title?: string;
  footerReaderText?: string;
  footerTeamText?: string;
  footerCol4Title?: string;
  footerDisclaimer?: string;
  footerContactEmail?: string;
  footerContactPhone?: string;
  footerFacebookUrl?: string;
  footerTelegramUrl?: string;
  footerDiscordUrl?: string;
  footerCopyrightText?: string;
  footerBadge1?: string;
  footerBadge2?: string;
}

export interface ChapterAdConfig {
  enabled: boolean;
  title: string;
  description: string;
  subText: string;
  imageUrl: string;
  targetUrl: string;
  confirmBtnText: string;
  cancelBtnText: string;
  badgeText?: string;
  maxAdsCount: number; // Số lượng QC xuất hiện
  firstAdDelaySeconds: number; // Thời gian quảng cáo xuất hiện lần 1 (giây)
  secondAdDelaySeconds: number; // Thời gian xuất hiện quảng cáo thứ 2 (giây)
  adResetMinutes: number; // Thời gian reset quảng cáo (phút)
  showInlineBanner?: boolean; // Hiển thị thêm banner Shopee ở cuối chap
}

export const DEFAULT_CHAPTER_AD: ChapterAdConfig = {
  enabled: true,
  title: 'Click QC mở APP SHOPEE ủng hộ mình nhé!',
  description: 'Giấy vệ sinh treo tường TopGia đa sắc đa năng từ bột giấy thiên nhiên, 1280tờ/4lớp',
  subText: 'Đồng ý mở app (Shopee) và phát nhạc chứ?',
  imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
  targetUrl: 'https://shopee.vn',
  confirmBtnText: 'Đồng ý',
  cancelBtnText: 'Từ chối',
  badgeText: 'SHOPEE',
  maxAdsCount: 2,
  firstAdDelaySeconds: 5,
  secondAdDelaySeconds: 60,
  adResetMinutes: 30,
  showInlineBanner: true,
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Leesin Comic',
  siteDomain: 'https://leesincomic.com',
  siteSlogan: 'Kho Truyện Tranh Online Chất Lượng Cao',
  headTitle: 'Leesin Comic - Đọc Truyện Tranh Online Miễn Phí',
  siteDescription: 'Website đọc truyện tranh Manga, Manhwa, Manhua online bản quyền chất lượng cao, cập nhật chương mới mỗi ngày tại Leesin Comic (leesincomic.com).',
  siteKeywords: 'đọc truyện tranh, manga online, manhwa, manhua, leesin comic, truyen tranh online',
  canonicalUrl: 'https://leesincomic.com',
  logoUrl: '',
  logoHeight: 40,
  logoWidth: 240,
  logoScale: 1,
  footerLogoHeight: 32,
  faviconUrl: '',
  headerBadgeText: 'COMIC',
  viewDelaySeconds: 5,
  viewCooldownMinutes: 15,
  viewMultiplier: 1,
  requireScrollPercent: 15,
  viewTrackingStartDate: '',
  allowGuestComments: true,
  autoApproveComments: true,
  commentMaxLength: 500,
  showHomeComments: true,
  showAnnouncementBanner: true,
  announcementTitle: 'Chào Mừng Đến Với Leesin Comic',
  announcementBadge: 'leesincomic.com',
  announcementText: 'Kho truyện tranh cập nhật liên tục mỗi ngày. Đọc siêu tốc mượt mà, hỗ trợ tải về đọc offline tiện lợi.',
  announcementButtonText: 'Cổng Đăng Truyện Nhóm Dịch',
  announcementButtonLink: '',
  chapterAd: DEFAULT_CHAPTER_AD,
  enableGlobalWatermark: true,
  watermarkText: '',
  watermarkLogoUrl: '',
  watermarkOpacity: 0.85,
  watermarkPosition: 'bottom-right',
  watermarkScale: 0.25,
  watermarkMode: 'logo',
  footerDescription: 'Cổng đọc truyện tranh Manhwa, Manhua, Manga chất lượng cao, phân quyền chặt chẽ giữa độc giả, các nhóm dịch và ban quản trị.',
  footerSecurityText: 'Hệ thống bảo vệ bản quyền & đóng watermark tự động',
  footerCol2Title: 'Khám Phá Truyện',
  footerCol2Links: [
    { label: 'Truyện Manhwa Hàn Quốc', url: '' },
    { label: 'Truyện Trọng Sinh - Tu Tiên', url: '' },
    { label: 'Truyện Ngôn Tình Hoàng Gia', url: '' },
    { label: 'Bảng Xếp Hạng Lượt Xem', url: '' },
  ],
  footerCol3Title: 'Hệ Thống Phân Quyền',
  footerReaderText: 'Độc giả: Chỉ đọc truyện & lưu trữ',
  footerTeamText: 'Nhóm dịch: Quản lý riêng truyện nhóm',
  footerCol4Title: 'Bản Quyền & Liên Hệ',
  footerDisclaimer: 'Tất cả truyện tranh trên leesincomic.com đều được tổng hợp và sưu tầm bởi các nhóm dịch phi thương mại. Nếu vi phạm bản quyền xin liên hệ để được gỡ bỏ ngay lập tức.',
  footerContactEmail: 'contact@leesincomic.com',
  footerContactPhone: '',
  footerFacebookUrl: '',
  footerTelegramUrl: '',
  footerDiscordUrl: '',
  footerCopyrightText: '© 2026 leesincomic.com • Đọc truyện tranh online cập nhật nhanh nhất',
  footerBadge1: 'MySQL Backend Synchronized',
  footerBadge2: 'Watermark Canvas Protection',
};

export type AppRoute =
  | { type: 'home' }
  | { type: 'hot' }
  | { type: 'ranking'; tab?: 'day' | 'week' | 'month' }
  | { type: 'genre'; genre: string }
  | { type: 'history' }
  | { type: 'following' }
  | { type: 'comic-detail'; comicSlug: string }
  | { type: 'reader'; comicSlug: string; chapterNumber: number }
  | { type: 'admin'; tab?: string }
  | { type: 'team-portal' }
  | { type: 'search'; query: string };

