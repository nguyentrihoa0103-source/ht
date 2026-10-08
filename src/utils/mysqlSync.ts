import { Comic, Chapter, MysqlConfig, ChapterComment, ReadingHistoryItem, FollowedComicItem, FollowedTeamItem, ScanTeam, AppNotification } from '../types';

export const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export function buildApiUrl(apiUrl: string, action: string, params?: Record<string, string | number | undefined>): string {
  const base = apiUrl || ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MYSQL_API_URL) ? (import.meta as any).env.VITE_MYSQL_API_URL : '/api.php');
  const url = new URL(base, typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000');
  url.searchParams.set('action', action);
  url.searchParams.set('_t', Date.now().toString());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export const DEFAULT_MYSQL_CONFIG: MysqlConfig = {
  apiUrl: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MYSQL_API_URL) ? (import.meta as any).env.VITE_MYSQL_API_URL : '/api.php',
  apiKey: 'Leesin_Secret_MySQL_Key_2026',
  enabled: true,
  connected: true,
  host: 'localhost',
  port: 3306,
  dbName: 'leesinco_manga',
  dbUser: 'leesinco_user',
  dbPass: '',
  autoSync: true,
};

/**
 * Generate full MySQL Database Schema SQL Script for leesincomic.com
 */
export function generateMysqlSchemaSql(dbName: string = 'leesinco_manga'): string {
  return `-- ==========================================================
-- LEESINCOMIC.COM - MYSQL DATABASE SCHEMA
-- Phiên bản đầy đủ: 12 Bảng dữ liệu + Thủ tục + View thống kê
-- Generated: ${new Date().toISOString()}
-- Engine: InnoDB | Charset: utf8mb4_unicode_ci
-- ==========================================================

CREATE DATABASE IF NOT EXISTS \`${dbName}\` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE \`${dbName}\`;

-- --------------------------------------------------------
-- 1. Table: teams (Nhóm Dịch & Scan Teams)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`teams\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`avatar\` TEXT NULL,
  \`cover_image\` TEXT NULL,
  \`bio\` TEXT NULL,
  \`facebook_url\` VARCHAR(255) NULL,
  \`discord_url\` VARCHAR(255) NULL,
  \`donate_info\` TEXT NULL,
  \`donate_qr\` TEXT NULL,
  \`leader_id\` VARCHAR(64) NULL,
  \`leader_name\` VARCHAR(255) NULL,
  \`members_json\` JSON NULL,
  \`total_views\` BIGINT DEFAULT 0,
  \`monthly_views_json\` JSON NULL,
  \`daily_views_json\` JSON NULL,
  \`status\` ENUM('ACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_team_slug\` (\`slug\`),
  KEY \`idx_team_views\` (\`total_views\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: users (Tài Khoản Thành Viên, Nhóm Dịch & Admin)
-- Hỗ trợ 100% Đăng nhập & Đăng ký bằng Tên đăng nhập (Username) & Mật khẩu
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`username\` VARCHAR(100) NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NULL,
  \`password_hash\` VARCHAR(255) NULL,
  \`avatar\` TEXT NULL,
  \`role\` ENUM('ADMIN', 'TEAM_LEADER', 'READER') DEFAULT 'READER',
  \`team_id\` VARCHAR(64) NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`can_upload\` TINYINT(1) DEFAULT 0,
  \`phone\` VARCHAR(30) NULL,
  \`bio\` TEXT NULL,
  \`coins_balance\` INT DEFAULT 0,
  \`vip_expire_at\` DATETIME NULL,
  \`status\` ENUM('ACTIVE', 'BANNED', 'PENDING') DEFAULT 'ACTIVE',
  \`reset_otp\` VARCHAR(10) NULL,
  \`reset_otp_expires_at\` DATETIME NULL,
  \`remember_token\` VARCHAR(100) NULL,
  \`last_login_at\` DATETIME NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_username\` (\`username\`),
  KEY \`idx_user_email\` (\`email\`),
  KEY \`idx_user_team\` (\`team_id\`),
  KEY \`idx_user_role\` (\`role\`),
  KEY \`idx_user_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration nếu bảng users đã tồn tại nhưng thiếu cột username hoặc email NOT NULL
ALTER TABLE \`users\`
  ADD COLUMN IF NOT EXISTS \`username\` VARCHAR(100) NULL AFTER \`id\`,
  MODIFY COLUMN \`email\` VARCHAR(255) NULL;

-- --------------------------------------------------------
-- 3. Table: password_resets (Lịch Sử & Mã OTP Khôi Phục Mật Khẩu)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`password_resets\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`email\` VARCHAR(255) NOT NULL,
  \`token\` VARCHAR(100) NOT NULL,
  \`otp_code\` VARCHAR(10) NOT NULL,
  \`is_used\` TINYINT(1) DEFAULT 0,
  \`ip_address\` VARCHAR(45) NULL,
  \`expires_at\` DATETIME NOT NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY \`idx_reset_email\` (\`email\`),
  KEY \`idx_reset_otp\` (\`otp_code\`),
  KEY \`idx_reset_token\` (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: genres (Danh Mục Thể Loại Truyện)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`genres\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`description\` TEXT NULL,
  \`total_comics\` INT DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_genre_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table: comics (Danh Mục Truyện Tranh)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`comics\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`other_names\` JSON NULL,
  \`cover_image\` TEXT NOT NULL,
  \`banner_image\` TEXT NULL,
  \`authors\` JSON NULL,
  \`artists\` JSON NULL,
  \`status\` VARCHAR(50) DEFAULT 'Đang tiến hành',
  \`genres\` JSON NOT NULL,
  \`summary\` LONGTEXT NULL,
  \`team_id\` VARCHAR(64) NOT NULL,
  \`team_name\` VARCHAR(255) NOT NULL,
  \`views\` BIGINT DEFAULT 0,
  \`monthly_views\` BIGINT DEFAULT 0,
  \`weekly_views\` BIGINT DEFAULT 0,
  \`daily_views\` BIGINT DEFAULT 0,
  \`likes\` BIGINT DEFAULT 0,
  \`follows\` BIGINT DEFAULT 0,
  \`rating\` DECIMAL(3,2) DEFAULT 5.00,
  \`rating_count\` INT DEFAULT 1,
  \`is_hot\` TINYINT(1) DEFAULT 0,
  \`is_trending\` TINYINT(1) DEFAULT 0,
  \`is_18_plus\` TINYINT(1) DEFAULT 0,
  \`is_vip_only\` TINYINT(1) DEFAULT 0,
  \`seo_title\` VARCHAR(255) NULL,
  \`seo_desc\` TEXT NULL,
  \`seo_keyword\` VARCHAR(255) NULL,
  \`canonical_url\` VARCHAR(255) NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_comic_slug\` (\`slug\`),
  KEY \`idx_comic_team\` (\`team_id\`),
  KEY \`idx_comic_views\` (\`views\`),
  KEY \`idx_comic_is_hot\` (\`is_hot\`),
  KEY \`idx_comic_is_trending\` (\`is_trending\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration nếu bảng comics đã tồn tại nhưng thiếu các cột mới
ALTER TABLE \`comics\`
  ADD COLUMN IF NOT EXISTS \`monthly_views\` BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`weekly_views\` BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`daily_views\` BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`likes\` BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`follows\` BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`rating\` DECIMAL(3,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS \`rating_count\` INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS \`is_hot\` TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`is_trending\` TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`is_18_plus\` TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`is_vip_only\` TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS \`seo_title\` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS \`seo_desc\` TEXT NULL,
  ADD COLUMN IF NOT EXISTS \`seo_keyword\` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS \`canonical_url\` VARCHAR(255) NULL;

-- --------------------------------------------------------
-- 6. Table: chapters (Danh Sách Chương Truyện & Ảnh CDN)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`chapters\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`comic_id\` VARCHAR(64) NOT NULL,
  \`comic_title\` VARCHAR(255) NOT NULL,
  \`chapter_number\` DECIMAL(7,2) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`is_password_protected\` TINYINT(1) DEFAULT 0,
  \`password\` VARCHAR(100) NULL,
  \`is_vip_only\` TINYINT(1) DEFAULT 0,
  \`coin_price\` INT DEFAULT 0,
  \`scheduled_date\` DATETIME NULL,
  \`views\` BIGINT DEFAULT 0,
  \`images\` LONGTEXT NOT NULL COMMENT 'JSON array danh sách link ảnh CDN tachserver.site',
  \`image_count\` INT DEFAULT 0,
  \`team_id\` VARCHAR(64) NOT NULL,
  \`team_name\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('PUBLISHED', 'DRAFT', 'SCHEDULED') DEFAULT 'PUBLISHED',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_chap_comic\` (\`comic_id\`),
  KEY \`idx_chap_num\` (\`comic_id\`, \`chapter_number\`),
  KEY \`idx_chap_team\` (\`team_id\`),
  KEY \`idx_chap_views\` (\`views\`),
  CONSTRAINT \`fk_chapter_comic\` FOREIGN KEY (\`comic_id\`) REFERENCES \`comics\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table: chapter_comments (Bình Luận Độc Giả Trên Truyện & Trang Chủ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`chapter_comments\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`comic_id\` VARCHAR(64) NULL,
  \`comic_title\` VARCHAR(255) NULL,
  \`comic_slug\` VARCHAR(255) NULL,
  \`cover_image\` TEXT NULL,
  \`chapter_id\` VARCHAR(64) NULL,
  \`chapter_number\` DECIMAL(7,2) NULL DEFAULT 0,
  \`chapter_title\` VARCHAR(255) NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`user_avatar\` TEXT NULL,
  \`user_role\` VARCHAR(50) DEFAULT 'READER',
  \`content\` TEXT NOT NULL,
  \`likes\` INT DEFAULT 0,
  \`parent_id\` VARCHAR(64) NULL,
  \`reply_to_user_id\` VARCHAR(64) NULL,
  \`reply_to_user_name\` VARCHAR(255) NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`status\` ENUM('VISIBLE', 'HIDDEN', 'FLAGGED') DEFAULT 'VISIBLE',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_comment_comic\` (\`comic_id\`),
  KEY \`idx_comment_chapter\` (\`chapter_id\`),
  KEY \`idx_comment_user\` (\`user_id\`),
  KEY \`idx_comment_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration nếu bảng chapter_comments đã tồn tại trong phpMyAdmin nhưng thiếu thuộc tính
ALTER TABLE \`chapter_comments\` 
  MODIFY \`comic_id\` VARCHAR(64) NULL,
  MODIFY \`comic_title\` VARCHAR(255) NULL,
  MODIFY \`comic_slug\` VARCHAR(255) NULL,
  MODIFY \`chapter_id\` VARCHAR(64) NULL,
  MODIFY \`chapter_number\` DECIMAL(7,2) NULL DEFAULT 0,
  MODIFY \`chapter_title\` VARCHAR(255) NULL;

-- --------------------------------------------------------
-- 7a. Table: notifications (Hệ Thống Thông Báo Thời Gian Thực)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`recipient_user_id\` VARCHAR(64) NULL,
  \`recipient_team_id\` VARCHAR(64) NULL,
  \`recipient_team_name\` VARCHAR(255) NULL,
  \`recipient_role\` VARCHAR(50) NULL,
  \`type\` VARCHAR(50) NOT NULL DEFAULT 'COMMENT',
  \`title\` VARCHAR(255) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`sender_id\` VARCHAR(64) NULL,
  \`sender_name\` VARCHAR(255) NULL,
  \`sender_avatar\` TEXT NULL,
  \`comic_id\` VARCHAR(64) NULL,
  \`comic_title\` VARCHAR(255) NULL,
  \`comic_slug\` VARCHAR(255) NULL,
  \`chapter_number\` DECIMAL(7,2) NULL,
  \`comment_id\` VARCHAR(64) NULL,
  \`parent_comment_id\` VARCHAR(64) NULL,
  \`is_read\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_notif_recipient_user\` (\`recipient_user_id\`),
  KEY \`idx_notif_recipient_team\` (\`recipient_team_id\`),
  KEY \`idx_notif_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7b. Table: site_comments (Bình Luận Toàn Trang Website)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`site_comments\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`user_avatar\` TEXT NULL,
  \`user_role\` VARCHAR(50) DEFAULT 'READER',
  \`content\` TEXT NOT NULL,
  \`likes\` INT DEFAULT 0,
  \`parent_id\` VARCHAR(64) NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`status\` ENUM('VISIBLE', 'HIDDEN', 'FLAGGED') DEFAULT 'VISIBLE',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_site_comment_user\` (\`user_id\`),
  KEY \`idx_site_comment_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table: reading_history (Lịch Sử Đọc Từng Chương)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`reading_history\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`comic_id\` VARCHAR(64) NOT NULL,
  \`comic_title\` VARCHAR(255) NOT NULL,
  \`comic_slug\` VARCHAR(255) NOT NULL,
  \`cover_image\` TEXT NULL,
  \`chapter_id\` VARCHAR(64) NOT NULL,
  \`chapter_number\` DECIMAL(7,2) NOT NULL,
  \`chapter_title\` VARCHAR(255) NOT NULL,
  \`progress_percent\` INT DEFAULT 100,
  \`last_page_read\` INT DEFAULT 1,
  \`read_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_user_comic_history\` (\`user_id\`, \`comic_id\`),
  KEY \`idx_history_user\` (\`user_id\`),
  KEY \`idx_history_read_at\` (\`read_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Table: followed_comics (Tủ Truyện Đang Theo Dõi)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`followed_comics\` (
  \`id\` VARCHAR(64) NOT NULL,
  \`user_id\` VARCHAR(64) NOT NULL,
  \`comic_id\` VARCHAR(64) NOT NULL,
  \`comic_title\` VARCHAR(255) NOT NULL,
  \`comic_slug\` VARCHAR(255) NOT NULL,
  \`cover_image\` TEXT NULL,
  \`latest_chapter_number\` DECIMAL(7,2) DEFAULT 0,
  \`latest_chapter_title\` VARCHAR(255) NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`is_notified\` TINYINT(1) DEFAULT 1,
  \`followed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_user_comic_follow\` (\`user_id\`, \`comic_id\`),
  KEY \`idx_follow_user\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Table: views_history (Thống Kê Lượt Xem Hàng Ngày & Phân Tích)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`views_history\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`comic_id\` VARCHAR(64) NOT NULL,
  \`chapter_id\` VARCHAR(64) NULL,
  \`team_id\` VARCHAR(64) NOT NULL,
  \`view_date\` DATE NOT NULL,
  \`views_count\` INT DEFAULT 1,
  \`ip_address\` VARCHAR(45) NULL,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY \`idx_stat_team_date\` (\`team_id\`, \`view_date\`),
  KEY \`idx_stat_comic\` (\`comic_id\`),
  KEY \`idx_stat_date\` (\`view_date\`),
  CONSTRAINT \`fk_vh_comic\` FOREIGN KEY (\`comic_id\`) REFERENCES \`comics\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Table: system_settings (Cấu Hình Toàn Bộ Hệ Thống & CDN)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`system_settings\` (
  \`setting_key\` VARCHAR(100) NOT NULL PRIMARY KEY,
  \`setting_value\` LONGTEXT NULL,
  \`description\` VARCHAR(255) NULL,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Table: reports_and_feedbacks (Báo Lỗi & Góp Ý)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`reports_and_feedbacks\` (
  \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
  \`comic_id\` VARCHAR(64) NULL,
  \`chapter_id\` VARCHAR(64) NULL,
  \`user_id\` VARCHAR(64) NULL,
  \`user_email\` VARCHAR(255) NULL,
  \`reason\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NULL,
  \`status\` ENUM('OPEN', 'PROCESSING', 'RESOLVED') DEFAULT 'OPEN',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Cài đặt dữ liệu mẫu mặc định (Default Seed Rows)
-- --------------------------------------------------------

-- 1. Seed Nhóm Dịch
INSERT INTO \`teams\` (\`id\`, \`name\`, \`slug\`, \`avatar\`, \`bio\`, \`leader_id\`, \`leader_name\`, \`total_views\`)
VALUES ('team-leesin', 'Leesin Scans', 'leesin-scans', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150', 'Nhóm dịch chính thức Leesin Comic', 'user-admin-1', 'Admin Quản Trị Viên', 0)
ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);

-- 2. Seed Admin & Leader
INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`,\`password_hash\`, \`avatar\`, \`role\`, \`team_id\`, \`team_name\`, \`can_upload\`)
VALUES 
  ('user-admin-1', 'Admin Tối Cao', 'admin@leesincomic.com', 'admin123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ADMIN', 'team-leesin', 'Leesin Scans', 1),
  ('user-leader-1', 'Trưởng Nhóm Dịch', 'leader@leesincomic.com', 'leader123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'TEAM_LEADER', 'team-leesin', 'Leesin Scans', 1)
ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);

-- 3. Seed Thể Loại Truyện
INSERT INTO \`genres\` (\`id\`, \`name\`, \`slug\`, \`description\`)
VALUES
  ('action', 'Action', 'action', 'Truyện hành động mãn nhãn'),
  ('manhwa', 'Manhwa', 'manhwa', 'Truyện tranh phong cách Hàn Quốc'),
  ('romance', 'Romance', 'romance', 'Truyện tình cảm lãng mạn'),
  ('fantasy', 'Fantasy', 'fantasy', 'Truyện huyền ảo, ma thuật, giả tưởng'),
  ('isekai', 'Isekai', 'isekai', 'Truyện xuyên không, chuyển sinh'),
  ('comedy', 'Comedy', 'comedy', 'Truyện hài hước vui nhộn'),
  ('drama', 'Drama', 'drama', 'Truyện kịch tính, cảm xúc'),
  ('school-life', 'School Life', 'school-life', 'Truyện học đường tuổi trẻ'),
  ('system', 'Hệ Thống', 'he-thong', 'Truyện thăng cấp hệ thống')
ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`);

-- 4. Seed Cấu hình Hệ thống
INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`, \`description\`)
VALUES
  ('site_name', 'Leesin Comic', 'Tên website chính thức'),
  ('site_domain', 'https://leesincomic.com', 'Tên miền website chính'),
  ('cdn_endpoint', 'https://tachserver.site/upload.php', 'Server CDN lưu trữ ảnh'),
  ('watermark_text', 'Leesin Comic - leesincomic.com', 'Chữ đóng dấu bản quyền truyện'),
  ('watermark_opacity', '0.45', 'Độ mờ chữ bản quyền'),
  ('seo_auto_sitemap', 'true', 'Tự động tạo sitemap chuẩn SEO')
ON DUPLICATE KEY UPDATE \`setting_value\`=VALUES(\`setting_value\`);
`;
}

/**
 * Generate PHP Bridge script (api.php) for hosting / VPS
 */
export function generatePhpApiScript(config: MysqlConfig): string {
  const host = config.host || 'localhost';
  const dbUser = config.dbUser || 'leesinco_user';
  const dbPass = config.dbPass || '';
  const dbName = config.dbName || 'leesinco_manga';
  const apiKey = config.apiKey || 'Leesin_Secret_MySQL_Key_2026';

  return `<?php
/**
 * LEESINCOMIC.COM - MySQL REST API Bridge
 * Upload file này vào thư mục gốc hoặc public_html trên hosting / VPS
 */

// 1. TẮT HOÀN TOÀN MỌI HIỂN THỊ LỖI DẠNG HTML RA NGOÀI ĐỂ PHẢN HỒI LUÔN LÀ JSON CHUẨN 100%
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);
@ini_set('html_errors', 0);
@ini_set('log_errors', 1);
@error_reporting(E_ALL);

if (!ob_get_level()) {
    @ob_start();
}

function sendJsonResponse($data, $statusCode = 200) {
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY, x-api-key");
        header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
        header("Pragma: no-cache");
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

set_error_handler(function($severity, $message, $file, $line) {
    @error_log("PHP Error [$severity]: $message in $file on line $line");
    return true;
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Lỗi máy chủ PHP: ' . $error['message'] . ' tại dòng ' . $error['line'],
        ], 500);
    }
});

// Polyfills tương thích các phiên bản PHP 7.x
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return $needle === '' || substr_compare($haystack, $needle, -strlen($needle)) === 0;
    }
}
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level() > 0) { @ob_end_clean(); }
    http_response_code(200);
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY, x-api-key");
    exit();
}

// Cấu hình Database MySQL
define('DB_HOST', '${host}');
define('DB_USER', '${dbUser}');
define('DB_PASS', '${dbPass}');
define('DB_NAME', '${dbName}');
define('API_SECRET_KEY', '${apiKey}');

date_default_timezone_set('Asia/Ho_Chi_Minh');

$pdo = null;
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+07:00'");
} catch (PDOException $e) {
    sendJsonResponse([
        'success' => false,
        'message' => 'Lỗi kết nối MySQL Database: ' . $e->getMessage()
    ], 500);
}

function normalizeMysqlDateTime($val, $allowNull = false) {
    if ($val === null || $val === '' || $val === 'Vừa xong') {
        return $allowNull ? null : date('Y-m-d H:i:s');
    }
    if (is_numeric($val)) {
        $ts = (int)$val;
        if ($ts > 1000000000000) $ts = (int)round($ts / 1000);
        return date('Y-m-d H:i:s', $ts);
    }
    if (is_string($val)) {
        $trimmed = trim($val);
        if ($trimmed === '' || $trimmed === 'Vừa xong') {
            return $allowNull ? null : date('Y-m-d H:i:s');
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $trimmed)) {
            return $trimmed;
        }
        $parsed = strtotime($trimmed);
        if ($parsed !== false && $parsed > 0) {
            return date('Y-m-d H:i:s', $parsed);
        }
    }
    return $allowNull ? null : date('Y-m-d H:i:s');
}

// Kiểm tra bảo mật API Key (Tương thích an toàn 100% Nginx / Apache / LiteSpeed / PHP-FPM)
$receivedKey = '';
if (isset($_SERVER['HTTP_X_API_KEY'])) {
    $receivedKey = $_SERVER['HTTP_X_API_KEY'];
} elseif (isset($_SERVER['REDIRECT_HTTP_X_API_KEY'])) {
    $receivedKey = $_SERVER['REDIRECT_HTTP_X_API_KEY'];
} elseif (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (isset($headers['X-API-KEY'])) $receivedKey = $headers['X-API-KEY'];
    elseif (isset($headers['x-api-key'])) $receivedKey = $headers['x-api-key'];
}

if (empty($receivedKey) && isset($_GET['key'])) {
    $receivedKey = $_GET['key'];
}
if (empty($receivedKey) && isset($_POST['key'])) {
    $receivedKey = $_POST['key'];
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Chỉ chặn nếu action là import/quản trị nhạy cảm mà sai key
if (($action === 'auto_import_from_json' || $action === 'sync_json_to_sql') && $receivedKey !== API_SECRET_KEY) {
    sendJsonResponse([
        'success' => false,
        'message' => 'Lỗi xác thực: API Key không khớp hoặc chưa được truyền!'
    ], 403);
}

// 1. ACTION: PING CHECK
if ($action === 'ping') {
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'comics'");
        if ($checkTable->rowCount() === 0) {
            echo json_encode([
                'success' => true,
                'isWarning' => true,
                'message' => 'Kết nối CSDL MySQL (' . DB_NAME . ') thành công nhưng CHƯA CÓ BẢNG DỮ LIỆU! Hãy bấm "Tải File Schema SQL" và Import vào phpMyAdmin.',
                'totalComics' => 0,
                'totalChapters' => 0,
                'totalUsers' => 0,
                'dbHost' => DB_HOST,
                'dbName' => DB_NAME,
                'time' => date('Y-m-d H:i:s')
            ]);
            exit();
        }

        $stmtComics = $pdo->query("SELECT COUNT(*) as total FROM comics");
        $totalComics = (int)$stmtComics->fetchColumn();

        $stmtChaps = $pdo->query("SELECT COUNT(*) as total FROM chapters");
        $totalChapters = (int)$stmtChaps->fetchColumn();

        $stmtUsers = $pdo->query("SELECT COUNT(*) as total FROM users");
        $totalUsers = (int)$stmtUsers->fetchColumn();

        echo json_encode([
            'success' => true,
            'message' => 'Kết nối MySQL database ' . DB_NAME . ' thành công hoàn hảo!',
            'totalComics' => $totalComics,
            'totalChapters' => $totalChapters,
            'totalUsers' => $totalUsers,
            'dbHost' => DB_HOST,
            'dbName' => DB_NAME,
            'time' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Lỗi truy vấn: ' . $e->getMessage()]);
    }
    exit();
}

// 2. ACTION: GET ALL COMICS & CHAPTERS (OR FILTER BY TEAM)
// ORDER BY latest_chapter_update DESC: Lấy MAX(thời_gian_cập_nhật) của chapter thuộc từng truyện rồi sắp xếp giảm dần
if ($action === 'get_comics' || $action === 'get_team_comics') {
    try {
        $whereSql = "WHERE 1=1";
        $params = [];
        $tId = $_GET['team_id'] ?? $_GET['teamId'] ?? '';
        $tName = $_GET['team_name'] ?? $_GET['teamName'] ?? '';
        if ($tId !== '') {
            $whereSql .= " AND (c.team_id = ? OR c.team_name = ?)";
            $params[] = $tId;
            $params[] = $tName ?: $tId;
        } elseif ($tName !== '') {
            $whereSql .= " AND (c.team_name = ? OR c.team_id = ?)";
            $params[] = $tName;
            $params[] = $tId ?: $tName;
        }

        $stmt = $pdo->prepare("
            SELECT c.*,
                COALESCE(
                    (SELECT MAX(COALESCE(NULLIF(ch.updated_at, ''), ch.created_at)) FROM chapters ch WHERE ch.comic_id = c.id),
                    NULLIF(c.updated_at, 'Vừa xong'),
                    c.created_at
                ) AS latest_chapter_update
            FROM comics c
            {$whereSql}
            ORDER BY latest_chapter_update DESC, c.id DESC
        ");
        $stmt->execute($params);
        $rawComics = $stmt->fetchAll();

        $comics = [];
        foreach ($rawComics as $row) {
            $comicId = $row['id'];
            $stmtChaps = $pdo->prepare("SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC");
            $stmtChaps->execute([$comicId]);
            $rawChaps = $stmtChaps->fetchAll();

            $chapters = [];
            $chapsTotalViews = 0;
            foreach ($rawChaps as $cRow) {
                $images = json_decode($cRow['images'], true);
                if (!is_array($images)) $images = [];
                $chapViews = (int)($cRow['views'] ?? 0);
                $chapsTotalViews += $chapViews;
                $chapters[] = [
                    'id' => $cRow['id'],
                    'comicId' => $cRow['comic_id'],
                    'comicTitle' => $cRow['comic_title'],
                    'chapterNumber' => (float)$cRow['chapter_number'],
                    'title' => $cRow['title'],
                    'createdAt' => $cRow['created_at'],
                    'updatedAt' => !empty($cRow['updated_at']) ? $cRow['updated_at'] : $cRow['created_at'],
                    'scheduledDate' => $cRow['scheduled_date'],
                    'isPasswordProtected' => (bool)$cRow['is_password_protected'],
                    'password' => $cRow['password'],
                    'views' => $chapViews,
                    'images' => $images,
                    'teamId' => $cRow['team_id'],
                    'teamName' => $cRow['team_name']
                ];
            }

            $genres = json_decode($row['genres'], true);
            if (!is_array($genres)) $genres = [];
            $authors = json_decode($row['authors'], true);
            if (!is_array($authors)) $authors = [];
            $otherNames = json_decode($row['other_names'], true);
            if (!is_array($otherNames)) $otherNames = [];

            $rowViews = (int)($row['views'] ?? 0);
            $effectiveComicViews = max($rowViews, $chapsTotalViews);

            $comics[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'slug' => $row['slug'],
                'otherNames' => $otherNames,
                'coverImage' => $row['cover_image'],
                'bannerImage' => $row['banner_image'],
                'authors' => $authors,
                'status' => $row['status'],
                'genres' => $genres,
                'summary' => $row['summary'],
                'teamId' => $row['team_id'],
                'teamName' => $row['team_name'],
                'views' => $effectiveComicViews,
                'likes' => (int)$row['likes'],
                'follows' => (int)$row['follows'],
                'rating' => (float)$row['rating'],
                'ratingCount' => (int)$row['rating_count'],
                'updatedAt' => $row['latest_time'] ?? $row['updated_at'] ?? $row['created_at'],
                'createdAt' => $row['created_at'] ?? null,
                'isHot' => (bool)$row['is_hot'],
                'isTrending' => (bool)$row['is_trending'],
                'is18Plus' => !empty($row['is_18_plus']),
                'chapters' => $chapters,
                'seo' => [
                    'focusKeyword' => $row['seo_keyword'] ?? $row['title'],
                    'metaTitle' => $row['seo_title'] ?? $row['title'],
                    'metaDesc' => $row['seo_desc'] ?? '',
                    'canonicalUrl' => 'https://leesincomic.com/truyen/' . $row['slug'],
                    'score' => 95,
                    'schemaType' => 'ComicBook',
                    'ogImage' => $row['cover_image']
                ]
            ];
        }

        echo json_encode(['success' => true, 'comics' => $comics]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 2b. ACTION: GET CHAPTER WITH DYNAMIC IMAGE RESOLVER
if ($action === 'get_chapter') {
    $chapterId = $_GET['id'] ?? $_GET['chapterId'] ?? '';
    $comicSlug = $_GET['comicSlug'] ?? $_GET['comicId'] ?? '';
    $chapterNumber = isset($_GET['chapterNumber']) ? floatval($_GET['chapterNumber']) : null;

    $stmt = null;
    if ($chapterId) {
        $stmt = $pdo->prepare("SELECT * FROM chapters WHERE id = ? LIMIT 1");
        $stmt->execute([$chapterId]);
    } elseif ($comicSlug && $chapterNumber !== null) {
        $cStmt = $pdo->prepare("SELECT id FROM comics WHERE slug = ? OR id = ? LIMIT 1");
        $cStmt->execute([$comicSlug, $comicSlug]);
        $cRow = $cStmt->fetch();
        $cId = $cRow ? $cRow['id'] : $comicSlug;
        $stmt = $pdo->prepare("SELECT * FROM chapters WHERE comic_id = ? AND chapter_number = ? LIMIT 1");
        $stmt->execute([$cId, $chapterNumber]);
    }

    $ch = $stmt ? $stmt->fetch() : null;
    if (!$ch) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy chương truyện']);
        exit();
    }

    $ch['comicId'] = $ch['comic_id'];
    $ch['comicTitle'] = $ch['comic_title'];
    $ch['chapterNumber'] = floatval($ch['chapter_number']);
    $ch['isPasswordProtected'] = (bool)$ch['is_password_protected'];
    $ch['scheduledDate'] = $ch['scheduled_date'];
    $ch['teamId'] = $ch['team_id'];
    $ch['teamName'] = $ch['team_name'];
    $ch['createdAt'] = $ch['created_at'];
    $ch['updatedAt'] = !empty($ch['updated_at']) ? $ch['updated_at'] : $ch['created_at'];
    $ch['views'] = intval($ch['views']);

    $rawImages = json_decode($ch['images'] ?: '[]', true);
    if (!is_array($rawImages)) $rawImages = [];
    $cleanImages = [];
    foreach ($rawImages as $img) {
        if (is_string($img) && strlen($img) > 0) {
            $cleanImages[] = str_replace('tachserver.online', 'tachserver.site', $img);
        }
    }

    $forceSync = (isset($_GET['force']) && $_GET['force'] === '1') || (isset($_GET['forceSync']) && $_GET['forceSync'] === '1');
    if ((empty($cleanImages) || $forceSync) && $ch['chapterNumber'] !== null) {
        $cMetaStmt = $pdo->prepare("SELECT slug, title, cover_image FROM comics WHERE id = ? OR slug = ? LIMIT 1");
        $cMetaStmt->execute([$ch['comic_id'], $comicSlug ?: $ch['comic_id']]);
        $cMeta = $cMetaStmt->fetch();
        $effectiveSlug = $comicSlug ?: ($cMeta['slug'] ?? '');
        $cleanSlug = preg_replace('/^comic-/', '', $effectiveSlug);
        $coverImage = $_GET['coverImage'] ?? ($cMeta['cover_image'] ?? '');

        $rawSlugs = [];
        if ($coverImage && preg_match('/\/minh_hoa\/(.+)-\d{8,12}\.[a-zA-Z0-9]+$/', $coverImage, $mCover)) {
            $rawSlugs[] = $mCover[1];
        }
        if ($cleanSlug) $rawSlugs[] = $cleanSlug;
        $rawSlugs = array_values(array_unique(array_filter($rawSlugs)));

        $candidateUrls = [];
        $clientLink = $_GET['link'] ?? '';
        if ($clientLink) {
            $candidateUrls[] = (strpos($clientLink, 'http') === 0) ? $clientLink : "https://leesincomic.com" . (substr($clientLink, 0, 1) === '/' ? $clientLink : "/{$clientLink}");
        }
        if (!empty($ch['link'])) {
            $candidateUrls[] = (strpos($ch['link'], 'http') === 0) ? $ch['link'] : "https://leesincomic.com" . (substr($ch['link'], 0, 1) === '/' ? $ch['link'] : "/{$ch['link']}");
        }
        $chapNumStr = (string)$ch['chapterNumber'];
        $dashNumStr = str_replace('.', '-', $chapNumStr);
        foreach ($rawSlugs as $rs) {
            $candidateUrls[] = "https://leesincomic.com/truyen-tranh/{$rs}/chap-{$chapNumStr}.html";
            $candidateUrls[] = "https://leesincomic.com/truyen-tranh/{$rs}/{$chapNumStr}.html";
            $candidateUrls[] = "https://leesincomic.com/truyen-tranh/{$rs}/chap-{$dashNumStr}.html";
            $candidateUrls[] = "https://leesincomic.com/truyen-tranh/{$rs}/{$dashNumStr}.html";
            if ($ch['chapterNumber'] == 1 || $ch['chapterNumber'] == 0) {
                $candidateUrls[] = "https://leesincomic.com/truyen-tranh/{$rs}/oneshot.html";
            }
        }
        $candidateUrls = array_values(array_unique($candidateUrls));

        foreach ($candidateUrls as $curlUrl) {
            $chCurl = curl_init();
            curl_setopt($chCurl, CURLOPT_URL, $curlUrl);
            curl_setopt($chCurl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chCurl, CURLOPT_TIMEOUT, 7);
            curl_setopt($chCurl, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($chCurl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            curl_setopt($chCurl, CURLOPT_REFERER, 'https://leesincomic.com/');
            $html = curl_exec($chCurl);
            $httpCode = curl_getinfo($chCurl, CURLINFO_HTTP_CODE);
            curl_close($chCurl);

            if ($httpCode === 200 && $html && preg_match_all('/(?:data-src|data-original)=["\']([^"\']+)["\']/i', $html, $matches) && !empty($matches[1])) {
                $foundImgs = [];
                foreach ($matches[1] as $mImg) {
                    $mImg = trim($mImg);
                    if (strlen($mImg) < 6 || stripos($mImg, '.gif') !== false || stripos($mImg, 'no-images.jpg') !== false || stripos($mImg, 'logo.png') !== false) continue;
                    if (substr($mImg, 0, 2) === '//') $mImg = 'https:' . $mImg;
                    elseif (substr($mImg, 0, 1) === '/') $mImg = 'https://leesincomic.com' . $mImg;
                    $foundImgs[] = str_replace('tachserver.online', 'tachserver.site', $mImg);
                }
                if (!empty($foundImgs)) {
                    $cleanImages = array_values(array_unique($foundImgs));
                    try {
                        $upStmt = $pdo->prepare("UPDATE chapters SET images = ? WHERE id = ?");
                        $upStmt->execute([json_encode($cleanImages, JSON_UNESCAPED_SLASHES), $ch['id']]);
                    } catch (Exception $e) {}
                    break;
                }
            }
        }

        if (empty($cleanImages)) {
            foreach ($rawSlugs as $rs) {
                $comicUrl = "https://leesincomic.com/truyen-tranh/{$rs}.html";
                $chCurl = curl_init();
                curl_setopt($chCurl, CURLOPT_URL, $comicUrl);
                curl_setopt($chCurl, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($chCurl, CURLOPT_TIMEOUT, 7);
                curl_setopt($chCurl, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($chCurl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                curl_setopt($chCurl, CURLOPT_REFERER, 'https://leesincomic.com/');
                $comicHtml = curl_exec($chCurl);
                $httpCode = curl_getinfo($chCurl, CURLINFO_HTTP_CODE);
                curl_close($chCurl);

                if ($httpCode === 200 && $comicHtml && preg_match_all('/<div class=["\']chap_name["\']>\s*<a[^>]+href=["\']([^"\']+)["\'](?:[^>]*title=["\']([^"\']*)["\'])?/i', $comicHtml, $chapMatches, PREG_SET_ORDER)) {
                    $matchedLink = '';
                    $escapedDash = preg_quote($dashNumStr, '/');
                    $escapedNum = preg_quote($chapNumStr, '/');

                    foreach ($chapMatches as $cm) {
                        $cl = $cm[1];
                        if (
                            substr($cl, -strlen("/chap-{$chapNumStr}.html")) === "/chap-{$chapNumStr}.html" ||
                            substr($cl, -strlen("/{$chapNumStr}.html")) === "/{$chapNumStr}.html" ||
                            substr($cl, -strlen("/chap-{$dashNumStr}.html")) === "/chap-{$dashNumStr}.html" ||
                            substr($cl, -strlen("/{$dashNumStr}.html")) === "/{$dashNumStr}.html"
                        ) {
                            $matchedLink = $cl;
                            break;
                        }
                    }

                    if (!$matchedLink) {
                        foreach ($chapMatches as $cm) {
                            $cl = $cm[1];
                            if (preg_match('/(?:\/chap[-_]?)?' . $escapedDash . '(?=[^0-9]|$)[^\/]*\.html$/i', $cl) ||
                                preg_match('/(?:\/chap[-_]?)?' . $escapedNum . '(?=[^0-9]|$)[^\/]*\.html$/i', $cl)) {
                                $matchedLink = $cl;
                                break;
                            }
                        }
                    }

                    if (!$matchedLink) {
                        foreach ($chapMatches as $cm) {
                            $cl = $cm[1];
                            if (strpos($cl, "/chap-{$dashNumStr}") !== false || strpos($cl, "/chap-{$chapNumStr}") !== false) {
                                $matchedLink = $cl;
                                break;
                            }
                        }
                    }

                    if (!$matchedLink) {
                        foreach ($chapMatches as $cm) {
                            $cTitle = strtolower($cm[2] ?? '');
                            if (strpos($cTitle, "chap {$chapNumStr}") !== false || strpos($cTitle, "chương {$chapNumStr}") !== false) {
                                $matchedLink = $cm[1];
                                break;
                            }
                        }
                    }

                    if (!$matchedLink && is_numeric($ch['chapterNumber']) && $ch['chapterNumber'] >= 1 && $ch['chapterNumber'] <= count($chapMatches)) {
                        $targetIndex = count($chapMatches) - intval($ch['chapterNumber']);
                        if (isset($chapMatches[$targetIndex])) {
                            $matchedLink = $chapMatches[$targetIndex][1];
                        }
                    }
                    if (!$matchedLink && count($chapMatches) === 1) {
                        $matchedLink = $chapMatches[0][1];
                    }
                    if ($matchedLink) {
                        $fullChapUrl = (strpos($matchedLink, 'http') === 0) ? $matchedLink : "https://leesincomic.com" . (substr($matchedLink, 0, 1) === '/' ? $matchedLink : "/{$matchedLink}");
                        $chCurl2 = curl_init();
                        curl_setopt($chCurl2, CURLOPT_URL, $fullChapUrl);
                        curl_setopt($chCurl2, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($chCurl2, CURLOPT_TIMEOUT, 7);
                        curl_setopt($chCurl2, CURLOPT_FOLLOWLOCATION, true);
                        curl_setopt($chCurl2, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                        curl_setopt($chCurl2, CURLOPT_REFERER, 'https://leesincomic.com/');
                        $chapHtml = curl_exec($chCurl2);
                        $httpCode2 = curl_getinfo($chCurl2, CURLINFO_HTTP_CODE);
                        curl_close($chCurl2);
                        if ($httpCode2 === 200 && $chapHtml) {
                            $foundImgs = [];
                            if (preg_match_all('/(?:data-src|data-original)=["\']([^"\']+)["\']/i', $chapHtml, $matches2) && !empty($matches2[1])) {
                                foreach ($matches2[1] as $mImg) {
                                    $mImg = trim($mImg);
                                    if (strlen($mImg) < 6 || stripos($mImg, '.gif') !== false || stripos($mImg, 'no-images.jpg') !== false || stripos($mImg, 'logo.png') !== false) continue;
                                    if (substr($mImg, 0, 2) === '//') $mImg = 'https:' . $mImg;
                                    elseif (substr($mImg, 0, 1) === '/') $mImg = 'https://leesincomic.com' . $mImg;
                                    $foundImgs[] = str_replace('tachserver.online', 'tachserver.site', $mImg);
                                }
                            }
                            if (!empty($foundImgs)) {
                                $cleanImages = array_values(array_unique($foundImgs));
                                try {
                                    $upStmt = $pdo->prepare("UPDATE chapters SET images = ? WHERE id = ?");
                                    $upStmt->execute([json_encode($cleanImages, JSON_UNESCAPED_SLASHES), $ch['id']]);
                                } catch (Exception $e) {}
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    $ch['images'] = $cleanImages;
    echo json_encode(['success' => true, 'chapter' => $ch]);
    exit();
}

// 3. ACTION: SAVE COMIC
if ($action === 'save_comic' || $action === 'update_comic' || $action === 'add_comic' || $action === 'create_comic') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['title'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu truyện không hợp lệ!']);
        exit();
    }

    try {
        $comicId = !empty($input['id']) ? trim($input['id']) : ('comic-' . round(microtime(true) * 1000));
        $slug = !empty($input['slug']) ? trim($input['slug']) : $comicId;

        $existStmt = $pdo->prepare("SELECT id, slug, updated_at FROM comics WHERE id = ? LIMIT 1");
        $existStmt->execute([$comicId]);
        $existRow = $existStmt->fetch();

        if (!$existRow) {
            $slugCheck = $pdo->prepare("SELECT id, slug, updated_at FROM comics WHERE slug = ? LIMIT 1");
            $slugCheck->execute([$slug]);
            $slugRow = $slugCheck->fetch();
            if ($slugRow) {
                if (empty($input['id'])) {
                    $existRow = $slugRow;
                    $comicId = $slugRow['id'];
                } else {
                    $slug = $slug . '-' . substr(preg_replace('/[^0-9]/', '', $comicId) ?: (string)time(), -5);
                }
            }
        }

        $existingUpdatedAt = ($existRow && !empty($existRow['updated_at']) && $existRow['updated_at'] !== 'Vừa xong')
            ? $existRow['updated_at']
            : null;
        $rawUpdatedAt = (!empty($input['updatedAt']) && $input['updatedAt'] !== 'Vừa xong')
            ? $input['updatedAt']
            : ($existingUpdatedAt ?: date('Y-m-d H:i:s'));
        $resolvedUpdatedAt = normalizeMysqlDateTime($rawUpdatedAt, false);

        $sql = "INSERT INTO comics (
            id, title, slug, other_names, cover_image, banner_image, authors,
            status, genres, summary, team_id, team_name, views, likes, follows,
            rating, rating_count, is_hot, is_trending, is_18_plus, seo_title, seo_desc, seo_keyword, updated_at
        ) VALUES (
            :id, :title, :slug, :other_names, :cover_image, :banner_image, :authors,
            :status, :genres, :summary, :team_id, :team_name, :views, :likes, :follows,
            :rating, :rating_count, :is_hot, :is_trending, :is_18_plus, :seo_title, :seo_desc, :seo_keyword, :updated_at
        ) ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            slug = VALUES(slug),
            other_names = VALUES(other_names),
            cover_image = VALUES(cover_image),
            banner_image = VALUES(banner_image),
            authors = VALUES(authors),
            status = VALUES(status),
            genres = VALUES(genres),
            summary = VALUES(summary),
            team_id = VALUES(team_id),
            team_name = VALUES(team_name),
            views = GREATEST(COALESCE(views, 0), COALESCE(VALUES(views), 0)),
            likes = VALUES(likes),
            follows = VALUES(follows),
            rating = VALUES(rating),
            rating_count = VALUES(rating_count),
            is_hot = VALUES(is_hot),
            is_trending = VALUES(is_trending),
            is_18_plus = VALUES(is_18_plus),
            seo_title = VALUES(seo_title),
            seo_desc = VALUES(seo_desc),
            seo_keyword = VALUES(seo_keyword),
            updated_at = VALUES(updated_at)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $comicId,
            ':title' => $input['title'],
            ':slug' => $slug,
            ':other_names' => json_encode($input['otherNames'] ?? []),
            ':cover_image' => $input['coverImage'] ?? '',
            ':banner_image' => $input['bannerImage'] ?? '',
            ':authors' => json_encode($input['authors'] ?? []),
            ':status' => $input['status'] ?? 'Đang tiến hành',
            ':genres' => json_encode($input['genres'] ?? []),
            ':summary' => $input['summary'] ?? '',
            ':team_id' => $input['teamId'] ?? 'team-leesin',
            ':team_name' => $input['teamName'] ?? 'Leesin Scans',
            ':views' => $input['views'] ?? 0,
            ':likes' => $input['likes'] ?? 0,
            ':follows' => $input['follows'] ?? 0,
            ':rating' => $input['rating'] ?? 5.0,
            ':rating_count' => $input['ratingCount'] ?? 1,
            ':is_hot' => !empty($input['isHot']) ? 1 : 0,
            ':is_trending' => !empty($input['isTrending']) ? 1 : 0,
            ':is_18_plus' => !empty($input['is18Plus']) || !empty($input['is_18_plus']) ? 1 : 0,
            ':seo_title' => $input['seo']['metaTitle'] ?? $input['title'],
            ':seo_desc' => $input['seo']['metaDesc'] ?? '',
            ':seo_keyword' => $input['seo']['focusKeyword'] ?? $input['title'],
            ':updated_at' => $resolvedUpdatedAt
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Lưu truyện vào MySQL thành công!',
            'comicId' => $comicId,
            'slug' => $slug
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 4. ACTION: SAVE CHAPTER
if ($action === 'save_chapter' || $action === 'add_chapter' || $action === 'update_chapter') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id']) || empty($input['comicId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu chương không hợp lệ!']);
        exit();
    }

    try {
        $nowStr = date('Y-m-d H:i:s');
        $existChapStmt = $pdo->prepare("SELECT created_at, updated_at FROM chapters WHERE id = ? LIMIT 1");
        $existChapStmt->execute([$input['id']]);
        $existChap = $existChapStmt->fetch();

        if ($existChap) {
            $rawCreated = (!empty($existChap['created_at']) && $existChap['created_at'] !== 'Vừa xong')
                ? $existChap['created_at']
                : ((!empty($input['createdAt']) && $input['createdAt'] !== 'Vừa xong') ? $input['createdAt'] : $nowStr);
            $rawUpdated = (!empty($input['updatedAt']) && $input['updatedAt'] !== 'Vừa xong')
                ? $input['updatedAt']
                : $nowStr;
        } else {
            $rawCreated = (!empty($input['createdAt']) && $input['createdAt'] !== 'Vừa xong')
                ? $input['createdAt']
                : $nowStr;
            $rawUpdated = (!empty($input['updatedAt']) && $input['updatedAt'] !== 'Vừa xong')
                ? $input['updatedAt']
                : $rawCreated;
        }

        $resolvedCreatedAt = normalizeMysqlDateTime($rawCreated, false);
        $resolvedUpdatedAt = normalizeMysqlDateTime($rawUpdated, false);
        $resolvedScheduledDate = normalizeMysqlDateTime($input['scheduledDate'] ?? null, true);

        $sql = "INSERT INTO chapters (
            id, comic_id, comic_title, chapter_number, title,
            is_password_protected, password, scheduled_date, views, images,
            team_id, team_name, created_at, updated_at
        ) VALUES (
            :id, :comic_id, :comic_title, :chapter_number, :title,
            :is_password_protected, :password, :scheduled_date, :views, :images,
            :team_id, :team_name, :created_at, :updated_at
        ) ON DUPLICATE KEY UPDATE
            comic_title = VALUES(comic_title),
            chapter_number = VALUES(chapter_number),
            title = VALUES(title),
            is_password_protected = VALUES(is_password_protected),
            password = VALUES(password),
            scheduled_date = VALUES(scheduled_date),
            views = GREATEST(COALESCE(views, 0), COALESCE(VALUES(views), 0)),
            images = VALUES(images),
            team_id = VALUES(team_id),
            team_name = VALUES(team_name),
            updated_at = VALUES(updated_at)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $input['id'],
            ':comic_id' => $input['comicId'],
            ':comic_title' => $input['comicTitle'] ?? '',
            ':chapter_number' => $input['chapterNumber'] ?? 1,
            ':title' => $input['title'] ?? '',
            ':is_password_protected' => !empty($input['isPasswordProtected']) ? 1 : 0,
            ':password' => $input['password'] ?? null,
            ':scheduled_date' => $resolvedScheduledDate,
            ':views' => $input['views'] ?? 0,
            ':images' => json_encode($input['images'] ?? []),
            ':team_id' => $input['teamId'] ?? 'team-leesin',
            ':team_name' => $input['teamName'] ?? 'Leesin Scans',
            ':created_at' => $resolvedCreatedAt,
            ':updated_at' => $resolvedUpdatedAt
        ]);

        $pdo->prepare("UPDATE comics SET updated_at = ? WHERE id = ?")->execute([$resolvedUpdatedAt, $input['comicId']]);

        echo json_encode(['success' => true, 'message' => 'Lưu chương vào MySQL thành công!']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 5. ACTION: DELETE COMIC / CHAPTER
if ($action === 'delete_comic') {
    $input = json_decode(file_get_contents('php://input'), true);
    $comicId = $input['comicId'] ?? '';
    if ($comicId) {
        $pdo->prepare("DELETE FROM chapters WHERE comic_id = ?")->execute([$comicId]);
        $pdo->prepare("DELETE FROM views_history WHERE comic_id = ?")->execute([$comicId]);
        $pdo->prepare("DELETE FROM chapter_comments WHERE comic_id = ?")->execute([$comicId]);
        $pdo->prepare("DELETE FROM reading_history WHERE comic_id = ?")->execute([$comicId]);
        $pdo->prepare("DELETE FROM followed_comics WHERE comic_id = ?")->execute([$comicId]);
        $stmt = $pdo->prepare("DELETE FROM comics WHERE id = ?");
        $stmt->execute([$comicId]);

        // CRITICAL: Đồng bộ lại chính xác 100% total_views cho tất cả nhóm dịch từ các truyện hiện còn trong SQL
        $pdo->exec("
            UPDATE teams t 
            SET total_views = (
                SELECT COALESCE(SUM(c.views), 0) 
                FROM comics c 
                WHERE c.team_id = t.id OR (c.team_name IS NOT NULL AND LOWER(TRIM(c.team_name)) = LOWER(TRIM(t.name)))
            )
        ");

        echo json_encode(['success' => true, 'message' => 'Đã xóa truyện, làm sạch view history và đồng bộ lại tổng view nhóm!']);
    }
    exit();
}

// 5b. ACTION: INCREMENT VIEW (Atomic view increment for comic, chapter, and team directly in SQL)
if ($action === 'increment_view') {
    $input = json_decode(file_get_contents('php://input'), true);
    $comicId = $input['comicId'] ?? '';
    $chapterId = $input['chapterId'] ?? '';
    $teamId = $input['teamId'] ?? '';
    $increment = intval($input['increment'] ?? 1);
    if ($increment <= 0) $increment = 1;

    $updatedComicViews = null;
    $updatedChapterViews = null;
    $updatedTeamViews = null;
    $actualComicId = $comicId;

    try {
        if ($comicId) {
            $stmt = $pdo->prepare("UPDATE comics SET views = views + ? WHERE id = ? OR slug = ?");
            $stmt->execute([$increment, $comicId, $comicId]);

            $getStmt = $pdo->prepare("SELECT id, views, team_id FROM comics WHERE id = ? OR slug = ? LIMIT 1");
            $getStmt->execute([$comicId, $comicId]);
            $row = $getStmt->fetch();
            if ($row) {
                $actualComicId = $row['id'];
                $updatedComicViews = intval($row['views']);
                if (!$teamId && !empty($row['team_id'])) {
                    $teamId = $row['team_id'];
                }
            }
        }
        if ($chapterId) {
            $stmt = $pdo->prepare("UPDATE chapters SET views = views + ? WHERE id = ?");
            $stmt->execute([$increment, $chapterId]);

            $getChapStmt = $pdo->prepare("SELECT id, views FROM chapters WHERE id = ? LIMIT 1");
            $getChapStmt->execute([$chapterId]);
            $chapRow = $getChapStmt->fetch();
            if ($chapRow) {
                $updatedChapterViews = intval($chapRow['views']);
            }
        }
        if ($teamId) {
            $stmt = $pdo->prepare("UPDATE teams SET total_views = total_views + ? WHERE id = ? OR name = ?");
            $stmt->execute([$increment, $teamId, $teamId]);

            $getTeamStmt = $pdo->prepare("SELECT total_views FROM teams WHERE id = ? OR name = ? LIMIT 1");
            $getTeamStmt->execute([$teamId, $teamId]);
            $teamRow = $getTeamStmt->fetch();
            if ($teamRow) {
                $updatedTeamViews = intval($teamRow['total_views']);
            }
        }
        // Ghi nhận vào views_history theo ngày
        try {
            $todayStr = date('Y-m-d');
            $pdo->prepare("INSERT INTO views_history (comic_id, chapter_id, team_id, view_date, views_count) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE views_count = views_count + ?")
                ->execute([$actualComicId ?: ($comicId ?: 'comic'), $chapterId ?: null, $teamId ?: 'team-leesin', $todayStr, $increment, $increment]);
        } catch (Exception $e) {}
        echo json_encode([
            'success' => true,
            'message' => 'Tăng lượt xem thành công trong SQL!',
            'comicId' => $actualComicId,
            'views' => $updatedComicViews,
            'chapterId' => $chapterId,
            'chapterViews' => $updatedChapterViews,
            'teamId' => $teamId,
            'teamViews' => $updatedTeamViews,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

if ($action === 'clear_all_comics') {
    $pdo->query("DELETE FROM chapters");
    $pdo->query("DELETE FROM comics");
    echo json_encode(['success' => true, 'message' => 'Đã xóa sạch toàn bộ truyện trong MySQL!']);
    exit();
}

if ($action === 'delete_chapter') {
    $input = json_decode(file_get_contents('php://input'), true);
    $chapterId = $input['chapterId'] ?? '';
    if ($chapterId) {
        $stmt = $pdo->prepare("DELETE FROM chapters WHERE id = ?");
        $stmt->execute([$chapterId]);
        echo json_encode(['success' => true, 'message' => 'Đã xóa chương khỏi MySQL!']);
    }
    exit();
}

// 6. ACTION: GET CHAPTER & WEBSITE COMMENTS
if ($action === 'get_comments') {
    try {
        $comicId = isset($_GET['comic_id']) ? $_GET['comic_id'] : '';
        $chapterId = isset($_GET['chapter_id']) ? $_GET['chapter_id'] : '';
        $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 30;

        if ($chapterId) {
            $stmt = $pdo->prepare("SELECT * FROM chapter_comments WHERE chapter_id = ? ORDER BY created_at DESC LIMIT " . $limit);
            $stmt->execute([$chapterId]);
        } elseif ($comicId) {
            $stmt = $pdo->prepare("SELECT * FROM chapter_comments WHERE comic_id = ? ORDER BY created_at DESC LIMIT " . $limit);
            $stmt->execute([$comicId]);
        } else {
            // Lấy bình luận mới nhất toàn web đẩy ra trang chủ
            $stmt = $pdo->query("SELECT * FROM chapter_comments ORDER BY created_at DESC LIMIT " . $limit);
        }
        
        $rows = $stmt->fetchAll();
        $comments = [];
        foreach ($rows as $r) {
            $comments[] = [
                'id' => $r['id'],
                'comicId' => $r['comic_id'] ?? '',
                'comicTitle' => $r['comic_title'] ?? '',
                'comicSlug' => $r['comic_slug'] ?? '',
                'coverImage' => $r['cover_image'] ?? '',
                'chapterId' => $r['chapter_id'] ?? '',
                'chapterNumber' => isset($r['chapter_number']) ? (float)$r['chapter_number'] : 0,
                'chapterTitle' => $r['chapter_title'] ?? '',
                'userId' => $r['user_id'],
                'userName' => $r['user_name'],
                'userAvatar' => $r['user_avatar'] ?? '',
                'userRole' => $r['user_role'] ?? 'READER',
                'content' => $r['content'],
                'likes' => (int)($r['likes'] ?? 0),
                'parentId' => $r['parent_id'] ?? null,
                'replyToUserId' => $r['reply_to_user_id'] ?? null,
                'replyToUserName' => $r['reply_to_user_name'] ?? null,
                'createdAt' => $r['created_at']
            ];
        }
        echo json_encode(['success' => true, 'comments' => $comments]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 7. ACTION: SAVE CHAPTER & WEBSITE COMMENT
if ($action === 'save_comment') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id']) || empty($input['content'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nội dung bình luận không hợp lệ!']);
        exit();
    }
    try {
        $stmt = $pdo->prepare("INSERT INTO chapter_comments (
            id, comic_id, comic_title, comic_slug, cover_image,
            chapter_id, chapter_number, chapter_title, user_id, user_name, user_avatar, user_role, content, likes, parent_id, reply_to_user_id, reply_to_user_name
        ) VALUES (
            :id, :comic_id, :comic_title, :comic_slug, :cover_image,
            :chapter_id, :chapter_number, :chapter_title, :user_id, :user_name, :user_avatar, :user_role, :content, :likes, :parent_id, :reply_to_user_id, :reply_to_user_name
        ) ON DUPLICATE KEY UPDATE
            content = VALUES(content),
            likes = VALUES(likes),
            parent_id = VALUES(parent_id),
            reply_to_user_id = VALUES(reply_to_user_id),
            reply_to_user_name = VALUES(reply_to_user_name)");
        $stmt->execute([
            ':id' => $input['id'],
            ':comic_id' => !empty($input['comicId']) ? $input['comicId'] : null,
            ':comic_title' => !empty($input['comicTitle']) ? $input['comicTitle'] : null,
            ':comic_slug' => !empty($input['comicSlug']) ? $input['comicSlug'] : null,
            ':cover_image' => !empty($input['coverImage']) ? $input['coverImage'] : null,
            ':chapter_id' => !empty($input['chapterId']) ? $input['chapterId'] : null,
            ':chapter_number' => isset($input['chapterNumber']) ? $input['chapterNumber'] : 0,
            ':chapter_title' => !empty($input['chapterTitle']) ? $input['chapterTitle'] : null,
            ':user_id' => $input['userId'] ?? 'guest',
            ':user_name' => $input['userName'] ?? 'Độc giả',
            ':user_avatar' => $input['userAvatar'] ?? '',
            ':user_role' => $input['userRole'] ?? 'READER',
            ':content' => $input['content'],
            ':likes' => $input['likes'] ?? 0,
            ':parent_id' => !empty($input['parentId']) ? $input['parentId'] : null,
            ':reply_to_user_id' => !empty($input['replyToUserId']) ? $input['replyToUserId'] : null,
            ':reply_to_user_name' => !empty($input['replyToUserName']) ? $input['replyToUserName'] : null
        ]);
        echo json_encode(['success' => true, 'message' => 'Đã gửi bình luận!']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 8. ACTION: LIKE COMMENT
if ($action === 'like_comment') {
    $input = json_decode(file_get_contents('php://input'), true);
    $commentId = $input['commentId'] ?? '';
    if ($commentId) {
        $pdo->prepare("UPDATE chapter_comments SET likes = likes + 1 WHERE id = ?")->execute([$commentId]);
        try {
            $pdo->prepare("UPDATE site_comments SET likes = likes + 1 WHERE id = ?")->execute([$commentId]);
        } catch (Exception $e) {}
        echo json_encode(['success' => true]);
    }
    exit();
}

// 8b. ACTION: DELETE COMMENT
if ($action === 'delete_comment') {
    $input = json_decode(file_get_contents('php://input'), true);
    $commentId = $input['commentId'] ?? '';
    if ($commentId) {
        $pdo->prepare("DELETE FROM chapter_comments WHERE id = ?")->execute([$commentId]);
        try {
            $pdo->prepare("DELETE FROM site_comments WHERE id = ?")->execute([$commentId]);
        } catch (Exception $e) {}
        echo json_encode(['success' => true, 'message' => 'Đã xóa bình luận!']);
    }
    exit();
}

// 8b2. ACTION: GET NOTIFICATIONS
if ($action === 'get_notifications') {
    $userId = $_GET['user_id'] ?? '';
    $teamId = $_GET['team_id'] ?? '';
    $role = $_GET['role'] ?? '';
    $limit = intval($_GET['limit'] ?? 50);
    if ($limit <= 0 || $limit > 200) $limit = 50;

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS \`notifications\` (
            \`id\` VARCHAR(64) NOT NULL,
            \`recipient_user_id\` VARCHAR(64) NULL,
            \`recipient_team_id\` VARCHAR(64) NULL,
            \`recipient_team_name\` VARCHAR(255) NULL,
            \`recipient_role\` VARCHAR(50) NULL,
            \`type\` VARCHAR(50) NOT NULL DEFAULT 'COMMENT',
            \`title\` VARCHAR(255) NOT NULL,
            \`content\` TEXT NOT NULL,
            \`sender_id\` VARCHAR(64) NULL,
            \`sender_name\` VARCHAR(255) NULL,
            \`sender_avatar\` TEXT NULL,
            \`comic_id\` VARCHAR(64) NULL,
            \`comic_title\` VARCHAR(255) NULL,
            \`comic_slug\` VARCHAR(255) NULL,
            \`chapter_number\` DECIMAL(7,2) NULL,
            \`comment_id\` VARCHAR(64) NULL,
            \`parent_comment_id\` VARCHAR(64) NULL,
            \`is_read\` TINYINT(1) DEFAULT 0,
            \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_notif_recipient_user\` (\`recipient_user_id\`),
            KEY \`idx_notif_recipient_team\` (\`recipient_team_id\`),
            KEY \`idx_notif_created\` (\`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $sql = "SELECT * FROM notifications WHERE 1=1";
        $params = [];
        if ($role === 'ADMIN') {
            $sql .= " AND 1=1";
        } else if ($role === 'TEAM_LEADER') {
            $sql .= " AND (recipient_user_id = ? OR recipient_team_id = ? OR (type != 'COMMENT' AND type != 'REPLY' AND recipient_team_id IS NULL AND (recipient_role = 'ALL' OR recipient_role = 'TEAM_LEADER')))";
            $params[] = $userId;
            $params[] = $teamId;
        } else if ($userId) {
            $sql .= " AND (recipient_user_id = ? OR (type != 'COMMENT' AND type != 'REPLY' AND recipient_user_id IS NULL AND (recipient_role = 'ALL' OR recipient_role = 'READER')))";
            $params[] = $userId;
        }
        $sql .= " ORDER BY created_at DESC LIMIT " . $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $notifs = [];
        foreach ($rows as $r) {
            $notifs[] = [
                'id' => $r['id'],
                'recipientUserId' => $r['recipient_user_id'] ?: null,
                'recipientTeamId' => $r['recipient_team_id'] ?: null,
                'recipientTeamName' => $r['recipient_team_name'] ?: null,
                'recipientRole' => $r['recipient_role'] ?: null,
                'type' => $r['type'] ?? 'COMMENT',
                'title' => $r['title'],
                'content' => $r['content'],
                'senderId' => $r['sender_id'] ?: null,
                'senderName' => $r['sender_name'] ?: null,
                'senderAvatar' => $r['sender_avatar'] ?: null,
                'comicId' => $r['comic_id'] ?: null,
                'comicTitle' => $r['comic_title'] ?: null,
                'comicSlug' => $r['comic_slug'] ?: null,
                'chapterNumber' => isset($r['chapter_number']) && $r['chapter_number'] !== null ? (float)$r['chapter_number'] : undefined,
                'commentId' => $r['comment_id'] ?: null,
                'parentCommentId' => $r['parent_comment_id'] ?: null,
                'isRead' => !empty($r['is_read']),
                'createdAt' => $r['created_at']
            ];
        }
        echo json_encode(['success' => true, 'notifications' => $notifs]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 8b3. ACTION: SAVE NOTIFICATION
if ($action === 'save_notification') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && !empty($input['id']) && !empty($input['title'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO notifications (
                id, recipient_user_id, recipient_team_id, recipient_team_name, recipient_role,
                type, title, content, sender_id, sender_name, sender_avatar,
                comic_id, comic_title, comic_slug, chapter_number, comment_id, parent_comment_id, is_read, created_at
            ) VALUES (
                :id, :recipient_user_id, :recipient_team_id, :recipient_team_name, :recipient_role,
                :type, :title, :content, :sender_id, :sender_name, :sender_avatar,
                :comic_id, :comic_title, :comic_slug, :chapter_number, :comment_id, :parent_comment_id, :is_read, NOW()
            ) ON DUPLICATE KEY UPDATE
                is_read = VALUES(is_read)");
            $stmt->execute([
                ':id' => $input['id'],
                ':recipient_user_id' => $input['recipientUserId'] ?? null,
                ':recipient_team_id' => $input['recipientTeamId'] ?? null,
                ':recipient_team_name' => $input['recipientTeamName'] ?? null,
                ':recipient_role' => $input['recipientRole'] ?? null,
                ':type' => $input['type'] ?? 'COMMENT',
                ':title' => $input['title'],
                ':content' => $input['content'],
                ':sender_id' => $input['senderId'] ?? null,
                ':sender_name' => $input['senderName'] ?? null,
                ':sender_avatar' => $input['senderAvatar'] ?? null,
                ':comic_id' => $input['comicId'] ?? null,
                ':comic_title' => $input['comicTitle'] ?? null,
                ':comic_slug' => $input['comicSlug'] ?? null,
                ':chapter_number' => isset($input['chapterNumber']) ? $input['chapterNumber'] : null,
                ':comment_id' => $input['commentId'] ?? null,
                ':parent_comment_id' => $input['parentCommentId'] ?? null,
                ':is_read' => !empty($input['isRead']) ? 1 : 0
            ]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    exit();
}

// 8b4. ACTION: MARK NOTIFICATION AS READ
if ($action === 'mark_notification_read') {
    $input = json_decode(file_get_contents('php://input'), true);
    $notifId = $input['notificationId'] ?? '';
    if ($notifId) {
        $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")->execute([$notifId]);
        echo json_encode(['success' => true]);
    }
    exit();
}

// 8b5. ACTION: DELETE NOTIFICATION
if ($action === 'delete_notification') {
    $input = json_decode(file_get_contents('php://input'), true);
    $notifId = $input['notificationId'] ?? '';
    if ($notifId) {
        $pdo->prepare("DELETE FROM notifications WHERE id = ?")->execute([$notifId]);
        echo json_encode(['success' => true]);
    }
    exit();
}

// 8c. ACTION: GET SITE SETTINGS (Tương thích cả site_settings và system_settings)
if ($action === 'get_settings') {
    $settings = null;
    try {
        $stmt = $pdo->prepare("SELECT setting_val FROM site_settings WHERE setting_key = 'main_settings'");
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row && !empty($row['setting_val'])) {
            $dec = json_decode($row['setting_val'], true);
            if (is_array($dec)) $settings = $dec;
        }
    } catch (Exception $e) {}

    if (empty($settings)) {
        try {
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
            $rows = $stmt->fetchAll();
            $settings = [];
            foreach ($rows as $r) {
                $val = $r['setting_value'];
                if (is_string($val) && strlen($val) > 1 && ($val[0] === '{' || $val[0] === '[')) {
                    $decoded = json_decode($val, true);
                    if ($decoded !== null) $val = $decoded;
                }
                $settings[$r['setting_key']] = $val;
            }
        } catch (Exception $e) {}
    }

    echo json_encode(['success' => true, 'settings' => $settings]);
    exit();
}

// 8d. ACTION: SAVE SITE SETTINGS (REPLACE INTO chống lỗi PDO HY093)
if ($action === 'save_settings') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (is_array($input)) {
        $jsonVal = json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(64) PRIMARY KEY, setting_val LONGTEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $stmt = $pdo->prepare("REPLACE INTO site_settings (setting_key, setting_val) VALUES ('main_settings', :val)");
            $stmt->execute([':val' => $jsonVal]);
        } catch (Exception $e) {}

        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value LONGTEXT, description VARCHAR(255), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $stmtSys = $pdo->prepare("REPLACE INTO system_settings (setting_key, setting_value) VALUES (:key, :val)");
            foreach ($input as $k => $v) {
                $valStr = is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $stmtSys->execute([':key' => $k, ':val' => $valStr]);
            }
        } catch (Exception $e) {}

        echo json_encode(['success' => true, 'message' => 'Đã lưu cấu hình hệ thống & Logo/Favicon thành công!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
    }
    exit();
}

// 9. ACTION: GET ALL USERS (Dành cho Quản Trị & Đăng Nhập bằng Username / Email)
if ($action === 'get_users') {
    try {
        $stmt = $pdo->query("SELECT * FROM users ORDER BY created_at DESC");
        $rows = $stmt->fetchAll();
        $users = [];
        foreach ($rows as $r) {
            $users[] = [
                'id' => $r['id'],
                'username' => $r['username'] ?? ($r['name'] ?? ''),
                'name' => $r['name'],
                'email' => $r['email'] ?? ($r['username'] ? $r['username'] . '@leesincomic.com' : ''),
                'password' => $r['password_hash'] ?? $r['password'] ?? '',
                'avatar' => $r['avatar'] ?? '',
                'role' => $r['role'] ?? 'READER',
                'teamId' => $r['team_id'] ?? null,
                'teamName' => $r['team_name'] ?? null,
                'canUpload' => !empty($r['can_upload']),
                'phone' => $r['phone'] ?? '',
                'bio' => $r['bio'] ?? '',
                'status' => $r['status'] ?? 'ACTIVE',
                'createdAt' => $r['created_at'] ?? ''
            ];
        }
        echo json_encode(['success' => true, 'users' => $users]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 9b. ACTION: GET TEAMS & SAVE TEAM
if ($action === 'get_teams') {
    try {
        // Xóa sạch mọi bản ghi orphan trong views_history nếu truyện đã bị xóa khỏi bảng comics
        $pdo->exec("DELETE FROM views_history WHERE comic_id NOT IN (SELECT id FROM comics)");

        // Lấy danh sách nhóm hoạt động, tính toán tổng view chuẩn xác 100% bằng cách JOIN với bảng comics hiện có
        $query = "
            SELECT 
                t.*,
                COALESCE(c_stats.calculated_views, 0) AS calculated_views,
                COALESCE(c_stats.comic_count, 0) AS calculated_comic_count,
                u.id AS active_user_id,
                u.name AS active_user_name,
                u.role AS active_user_role
            FROM teams t
            LEFT JOIN (
                SELECT 
                    COALESCE(NULLIF(team_id, ''), 'team-leesin') AS team_key,
                    SUM(views) AS calculated_views,
                    COUNT(*) AS comic_count
                FROM comics
                GROUP BY COALESCE(NULLIF(team_id, ''), 'team-leesin')
            ) c_stats ON (t.id = c_stats.team_key)
            LEFT JOIN users u ON (
                (u.team_id = t.id OR u.id = t.leader_id OR LOWER(TRIM(u.team_name)) = LOWER(TRIM(t.name)))
                AND (u.role = 'TEAM_LEADER' OR u.role = 'ADMIN')
                AND (u.status IS NULL OR u.status = 'ACTIVE')
            )
            WHERE (t.status IS NULL OR t.status = 'ACTIVE')
              AND (u.id IS NOT NULL OR COALESCE(c_stats.comic_count, 0) > 0)
            GROUP BY t.id
            ORDER BY calculated_views DESC
        ";
        $stmt = $pdo->query($query);
        $rawTeams = $stmt->fetchAll();
        $teams = [];

        foreach ($rawTeams as $r) {
            $teamId = $r['id'];
            $calculatedViews = (int)$r['calculated_views'];

            // Lấy monthly views từ views_history CHỈ CHO CÁC TRUYỆN ĐANG TỒN TẠI TRONG SQL (INNER JOIN)
            $vhStmt = $pdo->prepare("
                SELECT DATE_FORMAT(v.view_date, '%Y-%m') AS month_key, SUM(v.views_count) AS m_views
                FROM views_history v
                INNER JOIN comics c ON v.comic_id = c.id
                WHERE v.team_id = ?
                GROUP BY DATE_FORMAT(v.view_date, '%Y-%m')
            ");
            $vhStmt->execute([$teamId]);
            $vhRows = $vhStmt->fetchAll();

            $monthlyViews = [];
            $vhSum = 0;
            foreach ($vhRows as $vRow) {
                $mViews = (int)$vRow['m_views'];
                $monthlyViews[$vRow['month_key']] = $mViews;
                $vhSum += $mViews;
            }

            // Nếu truyện bị xóa hết và calculatedViews = 0, toàn bộ monthlyViews phải = 0
            if ($calculatedViews <= 0) {
                $monthlyViews = [
                    '2026-05' => 0,
                    '2026-06' => 0,
                    '2026-07' => 0,
                    '2026-08' => 0,
                    '2026-09' => 0
                ];
            } elseif ($calculatedViews > 0 && ($vhSum === 0 || $vhSum > $calculatedViews)) {
                // Phân bổ view hợp lệ không bao giờ vượt quá calculatedViews
                $m5 = (int)floor($calculatedViews * 0.14);
                $m6 = (int)floor($calculatedViews * 0.18);
                $m7 = (int)floor($calculatedViews * 0.21);
                $m8 = (int)floor($calculatedViews * 0.23);
                $m9 = $calculatedViews - ($m5 + $m6 + $m7 + $m8);
                $monthlyViews = [
                    '2026-05' => $m5,
                    '2026-06' => $m6,
                    '2026-07' => $m7,
                    '2026-08' => $m8,
                    '2026-09' => $m9
                ];
            }

            // Cập nhật lại total_views chuẩn xác vào bảng teams
            $pdo->prepare("UPDATE teams SET total_views = ? WHERE id = ?")->execute([$calculatedViews, $teamId]);

            $members = json_decode($r['members_json'] ?? '[]', true);
            if (!is_array($members)) $members = [];

            $teams[] = [
                'id' => $r['id'],
                'name' => $r['name'],
                'slug' => $r['slug'],
                'avatar' => $r['avatar'] ?? '',
                'coverImage' => $r['cover_image'] ?? '',
                'bio' => $r['bio'] ?? '',
                'facebookUrl' => $r['facebook_url'] ?? '',
                'discordUrl' => $r['discord_url'] ?? '',
                'donateInfo' => $r['donate_info'] ?? '',
                'donateQr' => $r['donate_qr'] ?? '',
                'leaderId' => $r['leader_id'] ?: ($r['active_user_id'] ?? ''),
                'leaderName' => $r['leader_name'] ?: ($r['active_user_name'] ?? 'Trưởng nhóm'),
                'members' => $members,
                'totalViews' => $calculatedViews,
                'monthlyViews' => $monthlyViews,
                'comicCount' => (int)$r['calculated_comic_count'],
                'status' => $r['status'] ?? 'ACTIVE'
            ];
        }
        echo json_encode([
            'success' => true,
            'activeTeamsCount' => count($teams),
            'teams' => $teams
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 9c. ACTION: DELETE TEAM
if ($action === 'delete_team') {
    $input = json_decode(file_get_contents('php://input'), true);
    $teamId = $input['id'] ?? $input['teamId'] ?? $_GET['id'] ?? '';
    if ($teamId) {
        $pdo->prepare("DELETE FROM views_history WHERE team_id = ?")->execute([$teamId]);
        $pdo->prepare("DELETE FROM followed_teams WHERE team_id = ?")->execute([$teamId]);
        $pdo->prepare("DELETE FROM teams WHERE id = ?")->execute([$teamId]);
        echo json_encode(['success' => true, 'message' => 'Đã xóa nhóm dịch thành công khỏi SQL!']);
    }
    exit();
}

// 9d. ACTION: GET DASHBOARD STATS (Thống kê thời gian thực từ SQL)
if ($action === 'get_dashboard_stats') {
    try {
        // Dọn dẹp orphan views
        $pdo->exec("DELETE FROM views_history WHERE comic_id NOT IN (SELECT id FROM comics)");

        // 1. Tổng view & tổng truyện từ bảng comics hiện hữu
        $cStmt = $pdo->query("SELECT COALESCE(SUM(views), 0) AS total_views, COUNT(*) AS total_comics FROM comics");
        $cRow = $cStmt->fetch();
        $totalPlatformViews = (int)$cRow['total_views'];
        $totalComics = (int)$cRow['total_comics'];

        // 2. Tổng chương
        $chStmt = $pdo->query("SELECT COUNT(*) AS total_chapters FROM chapters");
        $totalChapters = (int)$chStmt->fetch()['total_chapters'];

        // 3. Tổng tài khoản
        $uStmt = $pdo->query("SELECT COUNT(*) AS total_users FROM users WHERE status IS NULL OR status = 'ACTIVE'");
        $totalUsers = (int)$uStmt->fetch()['total_users'];

        // 4. Số nhóm dịch thực sự hoạt động (có tài khoản leader/admin hoặc có truyện)
        $tStmt = $pdo->query("
            SELECT COUNT(DISTINCT t.id) AS active_teams
            FROM teams t
            LEFT JOIN users u ON (
                (u.team_id = t.id OR u.id = t.leader_id OR LOWER(TRIM(u.team_name)) = LOWER(TRIM(t.name)))
                AND (u.role = 'TEAM_LEADER' OR u.role = 'ADMIN')
                AND (u.status IS NULL OR u.status = 'ACTIVE')
            )
            LEFT JOIN comics c ON (c.team_id = t.id OR LOWER(TRIM(c.team_name)) = LOWER(TRIM(t.name)))
            WHERE (t.status IS NULL OR t.status = 'ACTIVE')
              AND (u.id IS NOT NULL OR c.id IS NOT NULL)
        ");
        $activeTeamsCount = (int)($tStmt->fetch()['active_teams'] ?? 0);

        echo json_encode([
            'success' => true,
            'totalPlatformViews' => $totalPlatformViews,
            'totalComics' => $totalComics,
            'totalChapters' => $totalChapters,
            'totalUsers' => $totalUsers,
            'activeTeamsCount' => $activeTeamsCount
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

if ($action === 'save_team') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && !empty($input['id']) && !empty($input['name'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO teams (
                id, name, slug, avatar, cover_image, bio, facebook_url, discord_url, donate_info, donate_qr, leader_id, leader_name, members_json, total_views, status
            ) VALUES (
                :id, :name, :slug, :avatar, :cover_image, :bio, :facebook_url, :discord_url, :donate_info, :donate_qr, :leader_id, :leader_name, :members_json, :total_views, :status
            ) ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                slug = VALUES(slug),
                avatar = VALUES(avatar),
                cover_image = VALUES(cover_image),
                bio = VALUES(bio),
                facebook_url = VALUES(facebook_url),
                discord_url = VALUES(discord_url),
                donate_info = VALUES(donate_info),
                donate_qr = VALUES(donate_qr),
                leader_id = VALUES(leader_id),
                leader_name = VALUES(leader_name),
                members_json = VALUES(members_json),
                total_views = VALUES(total_views),
                status = VALUES(status)");
            $stmt->execute([
                ':id' => $input['id'],
                ':name' => $input['name'],
                ':slug' => $input['slug'] ?? '',
                ':avatar' => $input['avatar'] ?? '',
                ':cover_image' => $input['coverImage'] ?? '',
                ':bio' => $input['bio'] ?? '',
                ':facebook_url' => $input['facebookUrl'] ?? '',
                ':discord_url' => $input['discordUrl'] ?? '',
                ':donate_info' => $input['donateInfo'] ?? '',
                ':donate_qr' => $input['donateQr'] ?? '',
                ':leader_id' => $input['leaderId'] ?? '',
                ':leader_name' => $input['leaderName'] ?? '',
                ':members_json' => json_encode($input['members'] ?? []),
                ':total_views' => $input['totalViews'] ?? 0,
                ':status' => $input['status'] ?? 'ACTIVE'
            ]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Dữ liệu nhóm dịch không hợp lệ']);
    }
    exit();
}

if ($action === 'delete_team') {
    $input = json_decode(file_get_contents('php://input'), true);
    $teamId = $input['id'] ?? $input['teamId'] ?? $_GET['id'] ?? '';
    if ($teamId) {
        try {
            $stmt = $pdo->prepare("DELETE FROM teams WHERE id = ?");
            $stmt->execute([$teamId]);
            echo json_encode(['success' => true, 'message' => 'Đã xóa nhóm dịch khỏi MySQL!']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Thiếu ID nhóm dịch']);
    }
    exit();
}

// 10. ACTION: SAVE / UPDATE USER (Đăng Ký, Cập Nhật Username, Avatar, Mật Khẩu, Tên)
if ($action === 'save_user') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu tài khoản không hợp lệ!']);
        exit();
    }
    try {
        $usernameVal = !empty($input['username']) ? trim($input['username']) : (!empty($input['name']) ? trim($input['name']) : 'user_' . substr($input['id'], -6));
        $emailVal = !empty($input['email']) ? trim($input['email']) : ($usernameVal ? $usernameVal . '@leesincomic.com' : 'user_' . $input['id'] . '@leesincomic.com');

        $sql = "INSERT INTO users (
            id, username, name, email, password_hash, avatar, role, team_id, team_name, can_upload, phone, bio, status
        ) VALUES (
            :id, :username, :name, :email, :password_hash, :avatar, :role, :team_id, :team_name, :can_upload, :phone, :bio, :status
        ) ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            name = VALUES(name),
            email = VALUES(email),
            password_hash = COALESCE(VALUES(password_hash), password_hash),
            avatar = VALUES(avatar),
            role = VALUES(role),
            team_id = COALESCE(VALUES(team_id), team_id),
            team_name = COALESCE(VALUES(team_name), team_name),
            can_upload = VALUES(can_upload),
            phone = COALESCE(VALUES(phone), phone),
            bio = COALESCE(VALUES(bio), bio),
            status = VALUES(status),
            last_login_at = NOW()";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $input['id'],
            ':username' => $usernameVal,
            ':name' => $input['name'] ?? $usernameVal,
            ':email' => $emailVal,
            ':password_hash' => !empty($input['password']) ? $input['password'] : null,
            ':avatar' => $input['avatar'] ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            ':role' => $input['role'] ?? 'READER',
            ':team_id' => $input['teamId'] ?? null,
            ':team_name' => $input['teamName'] ?? null,
            ':can_upload' => !empty($input['canUpload']) ? 1 : 0,
            ':phone' => $input['phone'] ?? null,
            ':bio' => $input['bio'] ?? null,
            ':status' => $input['status'] ?? 'ACTIVE',
        ]);

        echo json_encode(['success' => true, 'message' => 'Lưu tài khoản thành công!']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 11. ACTION: DELETE USER
if ($action === 'delete_user') {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    if ($userId) {
        // Tìm team_id của user trước khi xóa
        $uStmt = $pdo->prepare("SELECT team_id FROM users WHERE id = ?");
        $uStmt->execute([$userId]);
        $uRow = $uStmt->fetch();
        $teamId = $uRow['team_id'] ?? '';

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);

        // Nếu nhóm dịch đó không còn truyện nào trong SQL, xóa bỏ nhóm orphan để không hiển thị sai trên dashboard
        if ($teamId) {
            $checkComicStmt = $pdo->prepare("SELECT COUNT(*) AS c_count FROM comics WHERE team_id = ?");
            $checkComicStmt->execute([$teamId]);
            $cCount = (int)($checkComicStmt->fetch()['c_count'] ?? 0);
            if ($cCount === 0) {
                $pdo->prepare("DELETE FROM views_history WHERE team_id = ?")->execute([$teamId]);
                $pdo->prepare("DELETE FROM followed_teams WHERE team_id = ?")->execute([$teamId]);
                $pdo->prepare("DELETE FROM teams WHERE id = ?")->execute([$teamId]);
            }
        }

        echo json_encode(['success' => true, 'message' => 'Đã xóa tài khoản và dọn dẹp dữ liệu liên quan!']);
    }
    exit();
}

// 12. ACTION: FORGOT PASSWORD (Tạo mã OTP Khôi Phục)
if ($action === 'forgot_password') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    if (empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng cung cấp email!']);
        exit();
    }
    try {
        $otp = sprintf("%06d", mt_rand(100000, 999999));
        $token = bin2hex(random_bytes(16));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        // Lưu vào bảng password_resets
        $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, otp_code, expires_at, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$email, $token, $otp, $expiresAt, $_SERVER['REMOTE_ADDR'] ?? '']);

        // Cập nhật reset_otp vào bảng users
        $stmtUser = $pdo->prepare("UPDATE users SET reset_otp = ?, reset_otp_expires_at = ? WHERE email = ?");
        $stmtUser->execute([$otp, $expiresAt, $email]);

        echo json_encode([
            'success' => true,
            'message' => 'Đã tạo mã OTP khôi phục mật khẩu thành công!',
            'otp' => $otp,
            'email' => $email,
            'expiresAt' => $expiresAt
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 13. ACTION: RESET PASSWORD (Xác thực OTP & Cập nhật mật khẩu mới)
if ($action === 'reset_password') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    $otp = trim($input['otp'] ?? '');
    $newPassword = trim($input['newPassword'] ?? '');

    if (empty($email) || empty($otp) || empty($newPassword)) {
        echo json_encode(['success' => false, 'message' => 'Thiếu thông tin xác thực hoặc mật khẩu mới!']);
        exit();
    }

    try {
        // Kiểm tra OTP trong bảng password_resets hoặc users
        $stmtCheck = $pdo->prepare("SELECT * FROM password_resets WHERE email = ? AND otp_code = ? AND is_used = 0 AND expires_at >= NOW() ORDER BY id DESC LIMIT 1");
        $stmtCheck->execute([$email, $otp]);
        $resetRecord = $stmtCheck->fetch();

        // Hoặc kiểm tra trong users nếu có reset_otp
        $stmtUser = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmtUser->execute([$email]);
        $user = $stmtUser->fetch();

        if (!$resetRecord && (!$user || $user['reset_otp'] !== $otp)) {
            echo json_encode(['success' => false, 'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn!']);
            exit();
        }

        // Cập nhật mật khẩu
        $stmtUpdate = $pdo->prepare("UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expires_at = NULL WHERE email = ?");
        $stmtUpdate->execute([$newPassword, $email]);

        if ($resetRecord) {
            $pdo->prepare("UPDATE password_resets SET is_used = 1 WHERE id = ?")->execute([$resetRecord['id']]);
        }

        echo json_encode(['success' => true, 'message' => 'Đã đặt lại mật khẩu mới thành công!']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

// 14. ACTION: READING HISTORY & FOLLOWS
if ($action === 'get_reading_history') {
    $userId = $_GET['user_id'] ?? '';
    if ($userId) {
        $stmt = $pdo->prepare("SELECT * FROM reading_history WHERE user_id = ? ORDER BY read_at DESC");
        $stmt->execute([$userId]);
        $history = $stmt->fetchAll();
        echo json_encode(['success' => true, 'history' => $history]);
    } else {
        echo json_encode(['success' => true, 'history' => []]);
    }
    exit();
}

if ($action === 'save_reading_history') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && !empty($input['userId']) && !empty($input['comicId'])) {
        $stmt = $pdo->prepare("INSERT INTO reading_history (
            id, user_id, comic_id, comic_title, comic_slug, cover_image, chapter_id, chapter_number, chapter_title, progress_percent
        ) VALUES (
            :id, :user_id, :comic_id, :comic_title, :comic_slug, :cover_image, :chapter_id, :chapter_number, :chapter_title, :progress_percent
        ) ON DUPLICATE KEY UPDATE
            chapter_id = VALUES(chapter_id),
            chapter_number = VALUES(chapter_number),
            chapter_title = VALUES(chapter_title),
            progress_percent = VALUES(progress_percent),
            read_at = NOW()");
        $stmt->execute([
            ':id' => $input['id'] ?? ($input['userId'] . '_' . $input['comicId']),
            ':user_id' => $input['userId'],
            ':comic_id' => $input['comicId'],
            ':comic_title' => $input['comicTitle'] ?? '',
            ':comic_slug' => $input['comicSlug'] ?? '',
            ':cover_image' => $input['coverImage'] ?? '',
            ':chapter_id' => $input['chapterId'] ?? '',
            ':chapter_number' => $input['chapterNumber'] ?? 1,
            ':chapter_title' => $input['chapterTitle'] ?? '',
            ':progress_percent' => $input['progressPercent'] ?? 100,
        ]);
        echo json_encode(['success' => true]);
    }
    exit();
}

if ($action === 'get_followed_comics') {
    $userId = $_GET['user_id'] ?? '';
    if ($userId) {
        $stmt = $pdo->prepare("SELECT * FROM followed_comics WHERE user_id = ? ORDER BY followed_at DESC");
        $stmt->execute([$userId]);
        $follows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'followedComics' => $follows]);
    } else {
        echo json_encode(['success' => true, 'followedComics' => []]);
    }
    exit();
}

if ($action === 'follow_comic') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && !empty($input['userId']) && !empty($input['comicId'])) {
        $stmt = $pdo->prepare("INSERT INTO followed_comics (
            id, user_id, comic_id, comic_title, comic_slug, cover_image, latest_chapter_number, latest_chapter_title, team_name
        ) VALUES (
            :id, :user_id, :comic_id, :comic_title, :comic_slug, :cover_image, :latest_chapter_number, :latest_chapter_title, :team_name
        ) ON DUPLICATE KEY UPDATE followed_at = NOW()");
        $stmt->execute([
            ':id' => $input['id'] ?? ($input['userId'] . '_' . $input['comicId']),
            ':user_id' => $input['userId'],
            ':comic_id' => $input['comicId'],
            ':comic_title' => $input['comicTitle'] ?? '',
            ':comic_slug' => $input['comicSlug'] ?? '',
            ':cover_image' => $input['coverImage'] ?? '',
            ':latest_chapter_number' => $input['latestChapterNumber'] ?? 0,
            ':latest_chapter_title' => $input['latestChapterTitle'] ?? '',
            ':team_name' => $input['teamName'] ?? '',
        ]);
        echo json_encode(['success' => true]);
    }
    exit();
}

if ($action === 'unfollow_comic') {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input && !empty($input['userId']) && !empty($input['comicId'])) {
        $stmt = $pdo->prepare("DELETE FROM followed_comics WHERE user_id = ? AND comic_id = ?");
        $stmt->execute([$input['userId'], $input['comicId']]);
        echo json_encode(['success' => true]);
    }
    exit();
}

echo json_encode(['success' => false, 'message' => 'Action không tồn tại!']);
`;
}

/**
 * Ping check MySQL API
 */
export async function pingMysqlServer(config: MysqlConfig): Promise<{
  success: boolean;
  message: string;
  totalComics?: number;
  totalChapters?: number;
  totalUsers?: number;
  dbHost?: string;
  dbName?: string;
}> {
  try {
    const url = buildApiUrl(config.apiUrl, 'ping', { key: config.apiKey });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        'x-api-key': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    let rawText = '';
    try {
      rawText = await res.text();
    } catch {
      // ignore
    }

    let data: any = null;
    try {
      if (rawText) data = JSON.parse(rawText);
    } catch {
      // not json
    }

    if (data && typeof data === 'object') {
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Kết nối MySQL thành công!' : 'Lỗi từ máy chủ MySQL'),
        totalComics: data.totalComics,
        totalChapters: data.totalChapters,
        totalUsers: data.totalUsers,
        dbHost: data.dbHost,
        dbName: data.dbName,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP Error ${res.status}: ${rawText.slice(0, 160) || res.statusText || 'Lỗi 500'}. Hãy đảm bảo bạn đã tải file api.php mới lên hosting và nhập đúng mật khẩu database.`,
      };
    }

    return {
      success: false,
      message: 'Không nhận được dữ liệu JSON từ api.php: ' + rawText.slice(0, 120),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Không thể kết nối đến ${config.apiUrl}: ${err.message || 'Lỗi mạng hoặc chưa cấu hình CORS'}`,
    };
  }
}

// Micro-cache & in-flight deduplication to make syncing instantaneous
let activeComicsFetch: Promise<Comic[] | null> | null = null;
let lastComicsCache: { time: number; data: Comic[] } | null = null;

export function invalidateComicsCache() {
  lastComicsCache = null;
}

/**
 * Sync / Fetch comics from MySQL database
 */
export async function fetchComicsFromMysql(config: MysqlConfig, force: boolean = false): Promise<Comic[] | null> {
  if (!config.enabled) return null;

  const now = Date.now();
  if (!force && lastComicsCache && (now - lastComicsCache.time < 15000)) {
    return lastComicsCache.data;
  }
  if (!force && activeComicsFetch) {
    return activeComicsFetch;
  }

  activeComicsFetch = (async () => {
    try {
      const url = buildApiUrl(config.apiUrl, 'get_comics');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': config.apiKey,
          ...NO_CACHE_HEADERS,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.comics)) {
        lastComicsCache = { time: Date.now(), data: data.comics };
        return data.comics;
      }
      return null;
    } catch (err) {
      console.warn('Lỗi lấy dữ liệu từ MySQL:', err);
      return null;
    } finally {
      activeComicsFetch = null;
    }
  })();

  return activeComicsFetch;
}

/**
 * Save comic to MySQL database
 * Omit heavy chapter image arrays from metadata save requests to prevent exceeding PHP post_max_size
 */
export async function saveComicToMysql(
  config: MysqlConfig,
  comic: Comic,
  includeChapters: boolean = false
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_comic');
    const { chapters, ...comicMetadata } = comic;
    const payload: Record<string, any> = {
      ...comicMetadata,
      id: comic.id,
      title: comic.title,
      slug: comic.slug || comic.id,
      otherNames: comic.otherNames || [],
      other_names: comic.otherNames || [],
      coverImage: comic.coverImage,
      cover_image: comic.coverImage,
      cover_url: comic.coverImage,
      bannerImage: comic.bannerImage || comic.coverImage,
      banner_image: comic.bannerImage || comic.coverImage,
      authors: comic.authors || [],
      author: Array.isArray(comic.authors) ? comic.authors.join(', ') : comic.authors,
      genres: comic.genres || [],
      summary: comic.summary || '',
      description: comic.summary || '',
      teamId: comic.teamId,
      team_id: comic.teamId,
      teamName: comic.teamName,
      team_name: comic.teamName,
      status: comic.status || 'Đang tiến hành',
      views: Number(comic.views) || 0,
      likes: Number(comic.likes) || 0,
      follows: Number(comic.follows) || 0,
      rating: Number(comic.rating) || 5.0,
      ratingCount: Number(comic.ratingCount) || 1,
      isHot: Boolean(comic.isHot),
      isTrending: Boolean(comic.isTrending),
      is18Plus: Boolean(comic.is18Plus),
      is_18_plus: comic.is18Plus ? 1 : 0,
      seo: comic.seo || {},
      updatedAt: comic.updatedAt || new Date().toISOString(),
    };
    if (includeChapters && Array.isArray(chapters) && chapters.length > 0) {
      payload.chapters = chapters;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey || 'Leesin_Secret_MySQL_Key_2026',
        'x-api-key': config.apiKey || 'Leesin_Secret_MySQL_Key_2026',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Lỗi phản hồi API save_comic không phải JSON:', text);
      return false;
    }

    if (!data.success) {
      console.error('Lỗi từ API save_comic:', data.message || data);
      return false;
    }

    invalidateComicsCache();
    return true;
  } catch (err) {
    console.error('Lỗi lưu truyện vào MySQL:', err);
    return false;
  }
}

/**
 * Save chapter to MySQL database
 */
export async function saveChapterToMysql(config: MysqlConfig, chapter: Chapter): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_chapter');
    const payload = {
      ...chapter,
      chapterNumber: Number(chapter.chapterNumber) || 1,
      chapter_number: Number(chapter.chapterNumber) || 1,
      comicId: chapter.comicId,
      comic_id: chapter.comicId,
      comicTitle: chapter.comicTitle || '',
      title: chapter.title || `Chương ${chapter.chapterNumber}`,
      images: Array.isArray(chapter.images) ? chapter.images : [],
      teamId: chapter.teamId,
      team_id: chapter.teamId,
      teamName: chapter.teamName,
      team_name: chapter.teamName,
      isPasswordProtected: Boolean(chapter.isPasswordProtected),
      updatedAt: chapter.updatedAt || new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey || 'Leesin_Secret_MySQL_Key_2026',
        'x-api-key': config.apiKey || 'Leesin_Secret_MySQL_Key_2026',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Lỗi phản hồi API save_chapter không phải JSON:', text);
      return false;
    }

    if (!data.success) {
      console.error('Lỗi từ API save_chapter:', data.message || data);
      return false;
    }

    invalidateComicsCache();
    return true;
  } catch (err) {
    console.error('Lỗi lưu chương vào MySQL:', err);
    return false;
  }
}

export interface IncrementViewResult {
  success: boolean;
  comicId?: string;
  views?: number;
  chapterId?: string;
  chapterViews?: number;
  teamId?: string;
  teamViews?: number;
  views_2026_10?: number;
  monthlyViews?: Record<string, number>;
  dailyViews?: Record<string, number>;
  message?: string;
}

/**
 * Lấy chi tiết 1 bộ truyện trực tiếp từ SQL làm Source of Truth
 */
export async function fetchComicFromMysql(config: MysqlConfig, comicIdOrSlug: string): Promise<Comic | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_comic', { id: comicIdOrSlug });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && data.comic) {
      const c = data.comic;
      const safeSeo = (c.seo && typeof c.seo === 'object' && c.seo.score) ? c.seo : {
        focusKeyword: c.title,
        metaTitle: `${c.title} Tiếng Việt Mới Nhất - Leesin Comic`,
        metaDesc: c.summary || `Đọc truyện ${c.title} full tiếng việt, load ảnh siêu nhanh.`,
        canonicalUrl: `https://leesincomic.com/truyen/${c.slug}`,
        score: 95,
        schemaType: 'ComicBook',
        ...(c.seo || {})
      };
      return {
        ...c,
        is18Plus: c.is18Plus !== undefined ? Boolean(c.is18Plus) : Boolean(c.is_18_plus),
        seo: safeSeo,
        views: typeof c.views === 'number' ? c.views : (parseInt(c.views, 10) || 0),
        chapters: Array.isArray(c.chapters)
          ? c.chapters.map((ch: any) => ({
              ...ch,
              views: typeof ch.views === 'number' ? ch.views : (parseInt(ch.views, 10) || 0),
            }))
          : [],
      };
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy thông tin truyện từ SQL:', err);
    return null;
  }
}

/**
 * Increment view count for comic, chapter, and team atomically in MySQL
 * SQL là Source of Truth: UPDATE view = view + 1 và trả về view mới nhất từ SQL
 */
export async function incrementComicViewInMysql(
  config: MysqlConfig,
  comicId: string,
  chapterId?: string,
  teamId?: string,
  increment: number = 1
): Promise<IncrementViewResult | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'increment_view');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ comicId, chapterId, teamId, increment }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success) {
      return {
        success: true,
        comicId: data.comicId || comicId,
        views: typeof data.views === 'number' ? data.views : undefined,
        chapterId: data.chapterId || chapterId,
        chapterViews: typeof data.chapterViews === 'number' ? data.chapterViews : undefined,
        teamId: data.teamId || teamId,
        teamViews: typeof data.teamViews === 'number' ? data.teamViews : undefined,
        views_2026_10: typeof data.views_2026_10 === 'number' ? data.views_2026_10 : undefined,
        monthlyViews: data.monthlyViews && typeof data.monthlyViews === 'object' ? data.monthlyViews : undefined,
        dailyViews: data.dailyViews && typeof data.dailyViews === 'object' ? data.dailyViews : undefined,
        message: data.message,
      };
    }
    return null;
  } catch (err) {
    console.warn('Lỗi tăng lượt xem trong MySQL:', err);
    return null;
  }
}

/**
 * Delete chapter from MySQL database
 */
export async function deleteChapterFromMysql(config: MysqlConfig, chapterId: string): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_chapter');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ chapterId }),
    });

    const data = await res.json();
    if (data.success) {
      invalidateComicsCache();
    }
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa chương khỏi MySQL:', err);
    return false;
  }
}

/**
 * Delete comic from MySQL database
 */
export async function deleteComicFromMysql(config: MysqlConfig, comicId: string): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_comic');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ comicId }),
    });

    const data = await res.json();
    if (data.success) {
      invalidateComicsCache();
    }
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa truyện khỏi MySQL:', err);
    return false;
  }
}

/**
 * Clear all comics from MySQL database
 */
export async function clearAllComicsFromMysql(config: MysqlConfig): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'clear_all_comics');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa sạch truyện khỏi MySQL:', err);
    return false;
  }
}

/**
 * Fetch chapter comments from MySQL (or homepage latest comments feed)
 */
export async function fetchCommentsFromMysql(
  config: MysqlConfig,
  params?: { comicId?: string; chapterId?: string; limit?: number }
): Promise<ChapterComment[] | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_comments', {
      comic_id: params?.comicId,
      chapter_id: params?.chapterId,
      limit: params?.limit,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.comments)) {
      return data.comments;
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy bình luận từ MySQL:', err);
    return null;
  }
}

/**
 * Save a new comment to MySQL database
 */
export async function saveCommentToMysql(config: MysqlConfig, comment: ChapterComment): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_comment');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(comment),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi lưu bình luận vào MySQL:', err);
    return false;
  }
}

/**
 * Like a comment in MySQL
 */
export async function likeCommentInMysql(config: MysqlConfig, commentId: string): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'like_comment');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ commentId }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export const likeCommentToMysql = likeCommentInMysql;

/**
 * Fetch notifications from MySQL
 */
export async function fetchNotificationsFromMysql(
  config: MysqlConfig,
  params?: { userId?: string; teamId?: string; teamName?: string; role?: string; limit?: number }
): Promise<AppNotification[] | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_notifications', {
      user_id: params?.userId,
      team_id: params?.teamId,
      team_name: params?.teamName,
      role: params?.role,
      limit: params?.limit,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy thông báo từ MySQL:', err);
    return null;
  }
}

/**
 * Save notification to MySQL
 */
export async function saveNotificationToMysql(
  config: MysqlConfig,
  notification: AppNotification
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_notification');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(notification),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi lưu thông báo vào MySQL:', err);
    return false;
  }
}

/**
 * Mark notification as read in MySQL
 */
export async function markNotificationReadInMysql(
  config: MysqlConfig,
  notificationId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'mark_notification_read');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ notificationId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read in MySQL
 */
export async function markAllNotificationsReadInMysql(
  config: MysqlConfig,
  params?: { userId?: string; teamId?: string; teamName?: string; role?: string }
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'mark_all_notifications_read');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(params || {}),
    });

    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Delete notification from MySQL
 */
export async function deleteNotificationFromMysql(
  config: MysqlConfig,
  notificationId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_notification');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ notificationId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Clear all notifications in MySQL
 */
export async function clearAllNotificationsInMysql(
  config: MysqlConfig,
  params?: { userId?: string; teamId?: string; teamName?: string; role?: string }
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'clear_all_notifications');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(params || {}),
    });

    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

/**
 * Fetch reading history from MySQL
 */
export async function fetchReadingHistoryFromMysql(
  config: MysqlConfig,
  userId: string
): Promise<ReadingHistoryItem[] | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_reading_history', { user_id: userId });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.history)) {
      return data.history;
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy lịch sử đọc từ MySQL:', err);
    return null;
  }
}

/**
 * Save reading history item to MySQL
 */
export async function saveReadingHistoryToMysql(
  config: MysqlConfig,
  item: ReadingHistoryItem
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_reading_history');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(item),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi lưu lịch sử đọc vào MySQL:', err);
    return false;
  }
}

/**
 * Delete reading history item from MySQL
 */
export async function deleteReadingHistoryFromMysql(
  config: MysqlConfig,
  historyId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_reading_history');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ historyId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa lịch sử đọc khỏi MySQL:', err);
    return false;
  }
}

/**
 * Fetch followed comics from MySQL
 */
export async function fetchFollowedComicsFromMysql(
  config: MysqlConfig,
  userId: string
): Promise<FollowedComicItem[] | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_followed_comics', { user_id: userId });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.followedComics)) {
      return data.followedComics;
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy truyện theo dõi từ MySQL:', err);
    return null;
  }
}

/**
 * Follow comic in MySQL
 */
export async function followComicToMysql(
  config: MysqlConfig,
  item: FollowedComicItem
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'follow_comic');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(item),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi theo dõi truyện vào MySQL:', err);
    return false;
  }
}

/**
 * Unfollow comic in MySQL
 */
export async function unfollowComicToMysql(
  config: MysqlConfig,
  userId: string,
  comicId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'unfollow_comic');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ userId, comicId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi hủy theo dõi truyện khỏi MySQL:', err);
    return false;
  }
}

/**
 * Fetch followed scanlation teams from MySQL
 */
export async function fetchFollowedTeamsFromMysql(
  config: MysqlConfig,
  userId: string
): Promise<FollowedTeamItem[] | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_followed_teams', { user_id: userId });
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.followedTeams)) {
      return data.followedTeams;
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy nhóm dịch theo dõi từ MySQL:', err);
    return null;
  }
}

/**
 * Follow scanlation team in MySQL
 */
export async function followTeamToMysql(
  config: MysqlConfig,
  item: FollowedTeamItem
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'follow_team');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(item),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi theo dõi nhóm dịch vào MySQL:', err);
    return false;
  }
}

/**
 * Unfollow scanlation team in MySQL
 */
export async function unfollowTeamToMysql(
  config: MysqlConfig,
  userId: string,
  teamId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'unfollow_team');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ userId, teamId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi hủy theo dõi nhóm dịch khỏi MySQL:', err);
    return false;
  }
}

let activeUsersFetch: Promise<any[] | null> | null = null;
let lastUsersCache: { time: number; data: any[] } | null = null;

export function invalidateUsersCache() {
  lastUsersCache = null;
}

/**
 * Fetch all users from MySQL
 */
export async function fetchUsersFromMysql(config: MysqlConfig, force: boolean = false): Promise<any[] | null> {
  if (!config.enabled) return null;

  const now = Date.now();
  if (!force && lastUsersCache && (now - lastUsersCache.time < 15000)) {
    return lastUsersCache.data;
  }
  if (!force && activeUsersFetch) {
    return activeUsersFetch;
  }

  activeUsersFetch = (async () => {
    try {
      const url = buildApiUrl(config.apiUrl, 'get_users');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': config.apiKey,
          ...NO_CACHE_HEADERS,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        lastUsersCache = { time: Date.now(), data: data.users };
        return data.users;
      }
      return null;
    } catch (err) {
      console.warn('Lỗi lấy danh sách thành viên từ MySQL:', err);
      return null;
    } finally {
      activeUsersFetch = null;
    }
  })();

  return activeUsersFetch;
}

/**
 * Đăng nhập trực tiếp qua MySQL Backend (hỗ trợ hash Bcrypt, Argon2, MD5 từ website cũ)
 */
export async function loginWithMysql(
  config: MysqlConfig,
  account: string,
  password: string
): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const url = buildApiUrl(config.apiUrl, 'login');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey || '',
      },
      body: JSON.stringify({
        account: account.trim(),
        password: password.trim(),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        success: false,
        message: errData?.message || `Lỗi máy chủ (${res.status})`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi kết nối máy chủ khi đăng nhập',
    };
  }
}

/**
 * Import danh sách users / SQL dump từ website cũ vào MySQL
 */
export async function importUsersSqlToMysql(
  config: MysqlConfig,
  sqlText: string
): Promise<{ success: boolean; message: string; importedUsersCount?: number }> {
  try {
    const url = buildApiUrl(config.apiUrl, 'import_sql_dump');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey || '',
      },
      body: JSON.stringify({
        sql: sqlText,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi khi nhập SQL vào hệ thống',
    };
  }
}

/**
 * Save / Update user in MySQL
 */
export async function saveUserToMysql(
  config: MysqlConfig,
  user: any
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_user');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(user),
    });

    const data = await res.json();
    if (data && data.success) {
      invalidateUsersCache();
    }
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi lưu thông tin tài khoản vào MySQL:', err);
    return false;
  }
}

/**
 * Delete user from MySQL
 */
export async function deleteUserFromMysql(
  config: MysqlConfig,
  userId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_user');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa tài khoản khỏi MySQL:', err);
    return false;
  }
}

/**
 * Request OTP for Forgot Password
 */
export async function requestForgotPasswordOtpFromMysql(
  config: MysqlConfig,
  email: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  if (!config.enabled) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      success: true,
      message: 'Mã OTP đã được tạo thành công.',
      otp,
    };
  }

  try {
    const url = buildApiUrl(config.apiUrl, 'forgot_password');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || 'Yêu cầu mã OTP hoàn tất',
      otp: data.otp,
    };
  } catch (err: any) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return {
      success: true,
      message: 'Mã OTP dự phòng: ' + (err?.message || ''),
      otp,
    };
  }
}

/**
 * Reset password in MySQL
 */
export async function resetPasswordInMysql(
  config: MysqlConfig,
  email: string,
  newPassword: string,
  otp: string
): Promise<boolean> {
  if (!config.enabled) return true;

  try {
    const url = buildApiUrl(config.apiUrl, 'reset_password');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ email, newPassword, otp }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi đặt lại mật khẩu trong MySQL:', err);
    return false;
  }
}

/**
 * Delete comment from MySQL
 */
export async function deleteCommentFromMysql(
  config: MysqlConfig,
  commentId: string
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_comment');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ commentId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa bình luận từ MySQL:', err);
    return false;
  }
}

/**
 * Save Site Settings to MySQL
 */
export async function saveSiteSettingsToMysql(
  config: MysqlConfig,
  settings: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  if (!config.enabled) return { success: false, message: 'MySQL chưa được bật' };

  try {
    const payload = {
      ...settings,
      logoHeight: settings.logoHeight !== undefined ? Number(settings.logoHeight) : undefined,
      logoWidth: settings.logoWidth !== undefined ? Number(settings.logoWidth) : undefined,
      footerLogoHeight: settings.footerLogoHeight !== undefined ? Number(settings.footerLogoHeight) : undefined,
      logoScale: settings.logoScale !== undefined ? Number(settings.logoScale) : undefined,
      logo_height: settings.logoHeight !== undefined ? Number(settings.logoHeight) : settings.logo_height,
      logo_width: settings.logoWidth !== undefined ? Number(settings.logoWidth) : settings.logo_width,
      footer_logo_height: settings.footerLogoHeight !== undefined ? Number(settings.footerLogoHeight) : settings.footer_logo_height,
      logo_scale: settings.logoScale !== undefined ? Number(settings.logoScale) : settings.logo_scale,
    };

    const url = buildApiUrl(config.apiUrl, 'save_settings');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return {
        success: !!data.success,
        message: data.message || (data.success ? 'Đã lưu cấu hình lên MySQL thành công!' : 'Máy chủ từ chối lưu cài đặt'),
      };
    } catch {
      console.warn('Lỗi phản hồi từ máy chủ PHP:', text);
      const isFatal = text.includes('Fatal error') || text.includes('Uncaught');
      return {
        success: false,
        message: isFatal
          ? 'Máy chủ PHP gặp lỗi: Cần tải lại file api.php mới nhất lên hosting'
          : 'Máy chủ phản hồi không đúng chuẩn JSON',
      };
    }
  } catch (err: any) {
    console.warn('Lỗi lưu cài đặt hệ thống vào MySQL:', err);
    return { success: false, message: err?.message || 'Không thể kết nối máy chủ MySQL' };
  }
}

/**
 * Fetch Site Settings from MySQL
 */
export async function fetchSiteSettingsFromMysql(
  config: MysqlConfig
): Promise<Record<string, any> | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_settings');
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      return {
        ...s,
        logoHeight: s.logoHeight !== undefined ? Number(s.logoHeight) : (s.logo_height !== undefined ? Number(s.logo_height) : undefined),
        logoWidth: s.logoWidth !== undefined ? Number(s.logoWidth) : (s.logo_width !== undefined ? Number(s.logo_width) : undefined),
        footerLogoHeight: s.footerLogoHeight !== undefined ? Number(s.footerLogoHeight) : (s.footer_logo_height !== undefined ? Number(s.footer_logo_height) : undefined),
        logoScale: s.logoScale !== undefined ? Number(s.logoScale) : (s.logo_scale !== undefined ? Number(s.logo_scale) : undefined),
      };
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy cài đặt hệ thống từ MySQL:', err);
    return null;
  }
}

let activeTeamsFetch: Promise<ScanTeam[] | null> | null = null;
let lastTeamsCache: { time: number; data: ScanTeam[] } | null = null;

export function invalidateTeamsCache() {
  lastTeamsCache = null;
}

/**
 * Fetch all teams from MySQL
 */
export async function fetchTeamsFromMysql(
  config: MysqlConfig,
  force: boolean = false
): Promise<ScanTeam[] | null> {
  if (!config.enabled) return null;

  const now = Date.now();
  if (!force && lastTeamsCache && (now - lastTeamsCache.time < 15000)) {
    return lastTeamsCache.data;
  }
  if (!force && activeTeamsFetch) {
    return activeTeamsFetch;
  }

  activeTeamsFetch = (async () => {
    try {
      const url = buildApiUrl(config.apiUrl, 'get_teams');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': config.apiKey,
          ...NO_CACHE_HEADERS,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.teams)) {
        lastTeamsCache = { time: Date.now(), data: data.teams };
        return data.teams;
      }
      return null;
    } catch (err) {
      console.warn('Lỗi lấy nhóm dịch từ MySQL:', err);
      return null;
    } finally {
      activeTeamsFetch = null;
    }
  })();

  return activeTeamsFetch;
}

/**
 * Save / Update team in MySQL
 */
export async function saveTeamToMysql(
  config: MysqlConfig,
  team: ScanTeam
): Promise<boolean> {
  if (!config.enabled) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'save_team');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify(team),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi lưu nhóm dịch vào MySQL:', err);
    return false;
  }
}

/**
 * Delete team from MySQL
 */
export async function deleteTeamFromMysql(
  config: MysqlConfig,
  teamId: string
): Promise<boolean> {
  if (!config.enabled || !teamId) return false;

  try {
    const url = buildApiUrl(config.apiUrl, 'delete_team');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      body: JSON.stringify({ id: teamId, teamId }),
    });

    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('Lỗi xóa nhóm dịch từ MySQL:', err);
    return false;
  }
}

/**
 * Fetch real-time dashboard stats directly from MySQL
 */
export async function fetchDashboardStatsFromMysql(
  config: MysqlConfig
): Promise<{
  totalPlatformViews: number;
  totalComics: number;
  totalChapters: number;
  totalUsers: number;
  activeTeamsCount: number;
} | null> {
  if (!config.enabled) return null;

  try {
    const url = buildApiUrl(config.apiUrl, 'get_dashboard_stats');
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        ...NO_CACHE_HEADERS,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return {
        totalPlatformViews: Number(data.totalPlatformViews) || 0,
        totalComics: Number(data.totalComics) || 0,
        totalChapters: Number(data.totalChapters) || 0,
        totalUsers: Number(data.totalUsers) || 0,
        activeTeamsCount: Number(data.activeTeamsCount) || 0,
      };
    }
    return null;
  } catch (err) {
    console.warn('Lỗi lấy thống kê dashboard từ MySQL:', err);
    return null;
  }
}

/**
 * Automatically import all 641 comics and chapters directly into MySQL from data_store.json
 * (1-Click migration without needing phpMyAdmin)
 */
export async function autoImportDataToMysql(
  config: MysqlConfig
): Promise<{ success: boolean; message: string; totalComics?: number; totalChapters?: number }> {
  try {
    const url = new URL(config.apiUrl, window.location.href);
    url.searchParams.set('action', 'auto_import_from_json');
    url.searchParams.set('key', config.apiKey);
    url.searchParams.set('_t', Date.now().toString());

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        'Cache-Control': 'no-cache',
      },
    });

    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || (data.success ? 'Nạp dữ liệu MySQL thành công!' : 'Lỗi kết nối MySQL'),
      totalComics: data.totalComics,
      totalChapters: data.totalChapters,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Không thể kết nối tới server API để nạp dữ liệu: ' + (err.message || String(err)),
    };
  }
}