const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_STORE_PATH = path.join(ROOT_DIR, 'data_store.json');
const SRC_DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const INITIAL_DATA_TS = path.join(SRC_DATA_DIR, 'initialData.ts');
const INITIAL_DATA_JSON = path.join(SRC_DATA_DIR, 'initialDataStore.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PUBLIC_DB_SQL = path.join(PUBLIC_DIR, 'database.sql');
const PUBLIC_DB_GZ = path.join(PUBLIC_DIR, 'database.sql.gz');
const PUBLIC_BACKUP_SQL = path.join(PUBLIC_DIR, 'leesincomic_full_backup.sql');
const PUBLIC_DATA_STORE_PATH = path.join(PUBLIC_DIR, 'data_store.json');
const SQL_PARTS_DIR = path.join(PUBLIC_DIR, 'sql_parts');

if (!fs.existsSync(DATA_STORE_PATH)) {
  console.error('data_store.json not found!');
  process.exit(1);
}

if (!fs.existsSync(SQL_PARTS_DIR)) {
  fs.mkdirSync(SQL_PARTS_DIR, { recursive: true });
}

const store = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf8'));
const comics = store.comics || [];
const teams = store.teams || [];
const users = store.users || [];
const comments = store.comments || [];
const readingHistory = store.readingHistory || [];
const followedComics = store.followedComics || [];
const followedTeams = store.followedTeams || [];
const notifications = store.notifications || [];

console.log(`Loaded ${comics.length} comics, ${teams.length} teams, ${users.length} users from data_store.json`);

const OFFICIAL_TEAM_VIEWS = {
  "lessin comic": 914602,
  "lavibit windroom gl": 259416,
  "pheromone": 258774,
  "j97": 61125,
  "bạch dương team": 51519,
  "mưa tháng sáu": 40140,
  "wyn's den (out)": 33662,
  "tĩnh dạ": 28172,
  "iris team (out)": 23859,
  "shortie squad (out)": 22955,
  "spadez": 17904,
  "là muse team": 17042,
  "nora translation team": 12818,
  "tiểu hồ điệp (out)": 9761,
  "cúc thần thánh (out)": 4834,
  "vườn hạt dẻ": 4054,
  "vườn hoa mặt trời": 3897,
  "nguyệt hạ team": 3615,
  "kurage house": 3368,
  "tự kỷ cùng é": 2465,
  "đậu đỏ (out)": 2305,
  "xí xẹo": 2152,
  "bỉ ngạn trans": 2121,
  "water team (out)": 1702,
  "pinky team": 1392,
  "louisiana translation (out)": 1140,
  "cửu thập tứ": 795,
  "mèo béo team (out)": 657,
  "sipj team": 311,
  "yoru translation team (out)": 291,
  "tiệm bánh ngọt": 252,
  "linguabridge team": 9,
  "ủn ỉn (out)": 554
};

teams.forEach((t) => {
  const key = (t.name || '').toLowerCase().trim();
  if (OFFICIAL_TEAM_VIEWS[key] !== undefined) {
    t.totalViews = OFFICIAL_TEAM_VIEWS[key];
  }
});
fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');

// 1. Write src/data/initialDataStore.json and public/data_store.json
fs.writeFileSync(INITIAL_DATA_JSON, JSON.stringify(store), 'utf8');
fs.writeFileSync(PUBLIC_DATA_STORE_PATH, JSON.stringify(store), 'utf8');
console.log(`Wrote initialDataStore.json & public/data_store.json (${(fs.statSync(INITIAL_DATA_JSON).size / 1024 / 1024).toFixed(2)} MB)`);

// 2. Generate src/data/initialData.ts with ALL comics
const tsContent = `// AUTO-GENERATED INITIAL DATA FROM LEESINCOMIC.COM (${comics.length} COMICS, ${teams.length} TEAMS, ${users.length} USERS)
import { Comic, ScanTeam, User, ChapterComment, ReadingHistoryItem, FollowedComicItem, FollowedTeamItem, AppNotification } from '../types';

export const INITIAL_DATA_VERSION = '2026-09-30-leesin-fixed-timestamps-v8';

export const INITIAL_USERS: User[] = ${JSON.stringify(users, null, 2)};

export const INITIAL_TEAMS: ScanTeam[] = ${JSON.stringify(teams, null, 2)};

export const INITIAL_COMICS: Comic[] = ${JSON.stringify(comics, null, 2)};

export const INITIAL_COMMENTS: ChapterComment[] = ${JSON.stringify(comments, null, 2)};

export const INITIAL_READING_HISTORY: ReadingHistoryItem[] = ${JSON.stringify(readingHistory, null, 2)};

export const INITIAL_FOLLOWED_COMICS: FollowedComicItem[] = ${JSON.stringify(followedComics, null, 2)};

export const INITIAL_FOLLOWED_TEAMS: FollowedTeamItem[] = ${JSON.stringify(followedTeams, null, 2)};

export const INITIAL_NOTIFICATIONS: AppNotification[] = ${JSON.stringify(notifications, null, 2)};
`;

fs.writeFileSync(INITIAL_DATA_TS, tsContent, 'utf8');
console.log(`Wrote src/data/initialData.ts (${(fs.statSync(INITIAL_DATA_TS).size / 1024 / 1024).toFixed(2)} MB)`);

// Helper for safe SQL string escaping
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"": case "'": case "\\": case "%": return "\\" + char;
        default: return char;
      }
    })}'`;
  }
  const str = String(val);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"": case "'": case "\\": case "%": return "\\" + char;
      default: return char;
    }
  })}'`;
}

// 3. Generate Complete MySQL SQL Dump with all tables, compatible with both api.php & mysqlSync
let headerSql = `-- ====================================================================
-- LEESINCOMIC.COM DATABASE DUMP (FULL ${comics.length} COMICS, ${teams.length} TEAMS)
-- Generated: ${new Date().toISOString()}
-- Charset: utf8mb4 / Engine: InnoDB
-- Fully Compatible with phpMyAdmin, DirectAdmin, cPanel, MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- ====================================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- Drop old incompatible tables first to prevent collision and schema errors
DROP TABLE IF EXISTS \`chapters\`;
DROP TABLE IF EXISTS \`comics\`;
DROP TABLE IF EXISTS \`scan_teams\`;
DROP TABLE IF EXISTS \`teams\`;
DROP TABLE IF EXISTS \`users\`;
DROP TABLE IF EXISTS \`comments\`;
DROP TABLE IF EXISTS \`chapter_comments\`;
DROP TABLE IF EXISTS \`reading_history\`;
DROP TABLE IF EXISTS \`followed_comics\`;
DROP TABLE IF EXISTS \`followed_teams\`;
DROP TABLE IF EXISTS \`notifications\`;
DROP TABLE IF EXISTS \`site_settings\`;
DROP TABLE IF EXISTS \`system_settings\`;

-- 1. Table scan_teams & teams
CREATE TABLE \`scan_teams\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`avatar\` TEXT NULL,
  \`bio\` TEXT NULL,
  \`donate_info\` TEXT NULL,
  \`donate_qr\` TEXT NULL,
  \`leader_id\` VARCHAR(191) NULL,
  \`leader_name\` VARCHAR(255) NULL,
  \`total_views\` BIGINT DEFAULT 0,
  \`follows\` INT DEFAULT 0,
  \`daily_views\` JSON NULL,
  \`monthly_views\` JSON NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_scan_team_slug\` (\`slug\`),
  INDEX \`idx_scan_team_views\` (\`total_views\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`teams\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(191) NOT NULL,
  \`avatar\` TEXT NULL,
  \`bio\` TEXT NULL,
  \`donate_info\` TEXT NULL,
  \`donate_qr\` TEXT NULL,
  \`leader_id\` VARCHAR(191) NULL,
  \`leader_name\` VARCHAR(255) NULL,
  \`total_views\` BIGINT DEFAULT 0,
  \`follows\` INT DEFAULT 0,
  \`daily_views\` JSON NULL,
  \`monthly_views\` JSON NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_team_slug\` (\`slug\`),
  INDEX \`idx_team_views\` (\`total_views\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table users
CREATE TABLE \`users\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`username\` VARCHAR(191) NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`password_hash\` VARCHAR(255) NULL,
  \`avatar\` TEXT NULL,
  \`role\` VARCHAR(32) DEFAULT 'READER',
  \`team_id\` VARCHAR(191) NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`can_upload\` TINYINT(1) DEFAULT 0,
  \`created_at\` VARCHAR(64) NULL,
  INDEX \`idx_user_email\` (\`email\`),
  INDEX \`idx_user_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table comics
CREATE TABLE \`comics\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(191) NOT NULL UNIQUE,
  \`other_names\` JSON NULL,
  \`cover_image\` TEXT NULL,
  \`banner_image\` TEXT NULL,
  \`authors\` JSON NULL,
  \`status\` VARCHAR(64) DEFAULT 'Đang tiến hành',
  \`genres\` JSON NULL,
  \`summary\` LONGTEXT NULL,
  \`team_id\` VARCHAR(191) NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`views\` BIGINT DEFAULT 0,
  \`views_day\` INT DEFAULT 0,
  \`views_week\` INT DEFAULT 0,
  \`views_month\` INT DEFAULT 0,
  \`daily_views\` BIGINT DEFAULT 0,
  \`weekly_views\` BIGINT DEFAULT 0,
  \`monthly_views\` BIGINT DEFAULT 0,
  \`likes\` INT DEFAULT 0,
  \`follows\` INT DEFAULT 0,
  \`rating\` FLOAT DEFAULT 5.0,
  \`rating_count\` INT DEFAULT 1,
  \`is_hot\` TINYINT(1) DEFAULT 0,
  \`is_trending\` TINYINT(1) DEFAULT 0,
  \`is_vip_only\` TINYINT(1) DEFAULT 0,
  \`seo\` JSON NULL,
  \`seo_title\` VARCHAR(255) NULL,
  \`seo_desc\` TEXT NULL,
  \`seo_keyword\` VARCHAR(255) NULL,
  \`canonical_url\` VARCHAR(255) NULL,
  \`updated_at\` VARCHAR(64) DEFAULT 'Vừa xong',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_comic_views\` (\`views\`),
  INDEX \`idx_comic_hot\` (\`is_hot\`),
  INDEX \`idx_comic_team\` (\`team_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table chapters
CREATE TABLE \`chapters\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`comic_id\` VARCHAR(191) NOT NULL,
  \`comic_title\` VARCHAR(255) NULL,
  \`chapter_number\` FLOAT NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`is_password_protected\` TINYINT(1) DEFAULT 0,
  \`password\` VARCHAR(255) DEFAULT '',
  \`scheduled_date\` VARCHAR(64) DEFAULT '',
  \`views\` BIGINT DEFAULT 0,
  \`images\` LONGTEXT NOT NULL,
  \`team_id\` VARCHAR(191) NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`created_at\` VARCHAR(64) NULL,
  INDEX \`idx_chap_comic\` (\`comic_id\`),
  INDEX \`idx_chap_num\` (\`comic_id\`, \`chapter_number\`),
  INDEX \`idx_chap_views\` (\`views\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table comments & chapter_comments
CREATE TABLE \`comments\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`comic_id\` VARCHAR(191) NOT NULL,
  \`chapter_id\` VARCHAR(191) NULL,
  \`user_id\` VARCHAR(191) NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`user_avatar\` TEXT NULL,
  \`user_role\` VARCHAR(32) DEFAULT 'READER',
  \`content\` TEXT NOT NULL,
  \`likes\` INT DEFAULT 0,
  \`dislikes\` INT DEFAULT 0,
  \`comic_title\` VARCHAR(255) NULL,
  \`chapter_number\` FLOAT NULL,
  \`created_at\` VARCHAR(64) NULL,
  INDEX \`idx_c_comic\` (\`comic_id\`),
  INDEX \`idx_c_chap\` (\`chapter_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`chapter_comments\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`comic_id\` VARCHAR(191) NULL,
  \`comic_title\` VARCHAR(255) NULL,
  \`comic_slug\` VARCHAR(191) NULL,
  \`cover_image\` TEXT NULL,
  \`chapter_id\` VARCHAR(191) NULL,
  \`chapter_number\` FLOAT NULL DEFAULT 0,
  \`chapter_title\` VARCHAR(255) NULL,
  \`user_id\` VARCHAR(191) NOT NULL,
  \`user_name\` VARCHAR(255) NOT NULL,
  \`user_avatar\` TEXT NULL,
  \`user_role\` VARCHAR(50) DEFAULT 'READER',
  \`content\` TEXT NOT NULL,
  \`likes\` INT DEFAULT 0,
  \`parent_id\` VARCHAR(191) NULL,
  \`reply_to_user_id\` VARCHAR(191) NULL,
  \`reply_to_user_name\` VARCHAR(255) NULL,
  \`ip_address\` VARCHAR(45) NULL,
  \`status\` VARCHAR(32) DEFAULT 'VISIBLE',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_cc_comic\` (\`comic_id\`),
  INDEX \`idx_cc_chap\` (\`chapter_id\`),
  INDEX \`idx_cc_user\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table reading_history
CREATE TABLE \`reading_history\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`user_id\` VARCHAR(191) NOT NULL,
  \`comic_id\` VARCHAR(191) NOT NULL,
  \`chapter_id\` VARCHAR(191) NOT NULL,
  \`chapter_title\` VARCHAR(255) NULL,
  \`chapter_number\` FLOAT NULL,
  \`last_page\` INT DEFAULT 1,
  \`total_pages\` INT DEFAULT 1,
  \`read_at\` VARCHAR(64) NULL,
  INDEX \`idx_rh_user\` (\`user_id\`),
  INDEX \`idx_rh_comic\` (\`comic_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table followed_comics
CREATE TABLE \`followed_comics\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`user_id\` VARCHAR(191) NOT NULL,
  \`comic_id\` VARCHAR(191) NOT NULL,
  \`followed_at\` VARCHAR(64) NULL,
  \`notification_enabled\` TINYINT(1) DEFAULT 1,
  INDEX \`idx_fc_user\` (\`user_id\`),
  INDEX \`idx_fc_comic\` (\`comic_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table followed_teams
CREATE TABLE \`followed_teams\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`user_id\` VARCHAR(191) NOT NULL,
  \`team_id\` VARCHAR(191) NOT NULL,
  \`team_name\` VARCHAR(255) NULL,
  \`team_slug\` VARCHAR(191) NULL,
  \`team_avatar\` TEXT NULL,
  \`team_bio\` TEXT NULL,
  \`donate_info\` TEXT NULL,
  \`followed_at\` VARCHAR(64) NULL,
  \`notification_enabled\` TINYINT(1) DEFAULT 1,
  INDEX \`idx_ft_user\` (\`user_id\`),
  INDEX \`idx_ft_team\` (\`team_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table notifications
CREATE TABLE \`notifications\` (
  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
  \`recipient_user_id\` VARCHAR(191) NULL,
  \`recipient_team_id\` VARCHAR(191) NULL,
  \`type\` VARCHAR(50) NOT NULL DEFAULT 'COMMENT',
  \`title\` VARCHAR(255) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`sender_id\` VARCHAR(191) NULL,
  \`sender_name\` VARCHAR(255) NULL,
  \`sender_avatar\` TEXT NULL,
  \`comic_id\` VARCHAR(191) NULL,
  \`comic_title\` VARCHAR(255) NULL,
  \`comic_slug\` VARCHAR(191) NULL,
  \`chapter_number\` FLOAT NULL,
  \`is_read\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_notif_user\` (\`recipient_user_id\`),
  INDEX \`idx_notif_team\` (\`recipient_team_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table site_settings & system_settings
CREATE TABLE \`site_settings\` (
  \`setting_key\` VARCHAR(64) PRIMARY KEY,
  \`setting_val\` LONGTEXT,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`system_settings\` (
  \`setting_key\` VARCHAR(100) PRIMARY KEY,
  \`setting_value\` LONGTEXT,
  \`description\` VARCHAR(255) NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- INSERT SCAN TEAMS (${teams.length} Teams)
-- ====================================================================
`;

let teamsSql = '';
teams.forEach((t) => {
  const values = `(${escapeSql(t.id)}, ${escapeSql(t.name)}, ${escapeSql(t.slug)}, ${escapeSql(t.avatar || t.avatarUrl)}, ${escapeSql(t.bio)}, ${escapeSql(t.donateInfo)}, ${escapeSql(t.donateQr)}, ${escapeSql(t.leaderId)}, ${escapeSql(t.leaderName)}, ${t.totalViews || 0}, ${t.follows || 0}, ${escapeSql(t.dailyViews)}, ${escapeSql(t.monthlyViews)})`;
  teamsSql += `INSERT INTO \`scan_teams\` (\`id\`, \`name\`, \`slug\`, \`avatar\`, \`bio\`, \`donate_info\`, \`donate_qr\`, \`leader_id\`, \`leader_name\`, \`total_views\`, \`follows\`, \`daily_views\`, \`monthly_views\`) VALUES ${values} ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`total_views\`=VALUES(\`total_views\`);\n`;
  teamsSql += `INSERT INTO \`teams\` (\`id\`, \`name\`, \`slug\`, \`avatar\`, \`bio\`, \`donate_info\`, \`donate_qr\`, \`leader_id\`, \`leader_name\`, \`total_views\`, \`follows\`, \`daily_views\`, \`monthly_views\`) VALUES ${values} ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`total_views\`=VALUES(\`total_views\`);\n`;
});

let usersSql = `\n-- ====================================================================\n-- INSERT USERS (${users.length} Users)\n-- ====================================================================\n`;
users.forEach((u) => {
  usersSql += `INSERT INTO \`users\` (\`id\`, \`name\`, \`username\`, \`email\`, \`password_hash\`, \`avatar\`, \`role\`, \`team_id\`, \`team_name\`, \`can_upload\`, \`created_at\`) VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.username || u.email.split('@')[0])}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash || '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')}, ${escapeSql(u.avatar)}, ${escapeSql(u.role)}, ${escapeSql(u.teamId)}, ${escapeSql(u.teamName)}, ${u.canUpload ? 1 : 0}, ${escapeSql(u.createdAt)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`role\`=VALUES(\`role\`);\n`;
});

let settingsSql = `\n-- ====================================================================\n-- DEFAULT SITE SETTINGS\n-- ====================================================================\n`;
settingsSql += `REPLACE INTO \`system_settings\` (\`setting_key\`, \`setting_value\`, \`description\`) VALUES
('site_name', 'Leesin Comic', 'Tên website chính thức'),
('site_domain', 'https://leesincomic.com', 'Tên miền chính thức'),
('cdn_endpoint', 'https://tachserver.site/upload.php', 'Server CDN lưu ảnh'),
('watermark_text', 'Leesin Comic - leesincomic.com', 'Bản quyền'),
('watermark_opacity', '0.45', 'Độ mờ bản quyền'),
('seo_auto_sitemap', 'true', 'Tự động tạo sitemap');\n`;

// 4. Generate Comics Insert Statements
let comicsSql = `\n-- ====================================================================\n-- INSERT COMICS (${comics.length} Comics)\n-- ====================================================================\n`;
let allChapters = [];

comics.forEach((c) => {
  const dViews = c.dayViews || 0;
  const wViews = c.weekViews || 0;
  const mViews = c.monthViews || c.views || 0;
  const seoTitle = c.seo?.metaTitle || `${c.title} - Leesin Comic`;
  const seoDesc = c.seo?.metaDesc || (c.summary ? c.summary.substring(0, 160) : '');
  const seoKw = c.seo?.focusKeyword || c.title;

  comicsSql += `INSERT INTO \`comics\` (
    \`id\`, \`title\`, \`slug\`, \`other_names\`, \`cover_image\`, \`banner_image\`,
    \`authors\`, \`status\`, \`genres\`, \`summary\`, \`team_id\`, \`team_name\`,
    \`views\`, \`views_day\`, \`views_week\`, \`views_month\`,
    \`daily_views\`, \`weekly_views\`, \`monthly_views\`,
    \`likes\`, \`follows\`, \`rating\`, \`rating_count\`,
    \`is_hot\`, \`is_trending\`, \`is_vip_only\`,
    \`seo\`, \`seo_title\`, \`seo_desc\`, \`seo_keyword\`, \`updated_at\`, \`created_at\`
  ) VALUES (
    ${escapeSql(c.id)}, ${escapeSql(c.title)}, ${escapeSql(c.slug)}, ${escapeSql(c.otherNames)}, ${escapeSql(c.coverImage)}, ${escapeSql(c.bannerImage)},
    ${escapeSql(c.authors)}, ${escapeSql(c.status)}, ${escapeSql(c.genres)}, ${escapeSql(c.summary)}, ${escapeSql(c.teamId)}, ${escapeSql(c.teamName)},
    ${c.views || 0}, ${dViews}, ${wViews}, ${mViews},
    ${dViews}, ${wViews}, ${mViews},
    ${c.likes || 0}, ${c.follows || 0}, ${c.rating || 5.0}, ${c.ratingCount || 1},
    ${c.isHot ? 1 : 0}, ${c.isTrending ? 1 : 0}, 0,
    ${escapeSql(c.seo)}, ${escapeSql(seoTitle)}, ${escapeSql(seoDesc)}, ${escapeSql(seoKw)}, ${escapeSql(c.updatedAt)}, ${escapeSql(c.createdAt || c.updatedAt)}
  ) ON DUPLICATE KEY UPDATE
    \`title\`=VALUES(\`title\`),
    \`views\`=VALUES(\`views\`),
    \`cover_image\`=VALUES(\`cover_image\`);\n`;

  if (Array.isArray(c.chapters)) {
    c.chapters.forEach((ch) => {
      allChapters.push({
        ...ch,
        comicId: c.id,
        comicTitle: c.title,
        teamId: ch.teamId || c.teamId,
        teamName: ch.teamName || c.teamName,
      });
    });
  }
});

console.log(`Prepared ${comics.length} comic inserts and ${allChapters.length} chapter records.`);

// 5. Generate Chapters Insert Statements
let chaptersSql = `\n-- ====================================================================\n-- INSERT CHAPTERS (${allChapters.length} Chapters)\n-- ====================================================================\n`;
allChapters.forEach((ch) => {
  chaptersSql += `INSERT INTO \`chapters\` (
    \`id\`, \`comic_id\`, \`comic_title\`, \`chapter_number\`, \`title\`,
    \`is_password_protected\`, \`password\`, \`scheduled_date\`, \`views\`,
    \`images\`, \`team_id\`, \`team_name\`, \`created_at\`
  ) VALUES (
    ${escapeSql(ch.id)}, ${escapeSql(ch.comicId)}, ${escapeSql(ch.comicTitle)}, ${ch.chapterNumber || 1}, ${escapeSql(ch.title)},
    ${ch.isPasswordProtected ? 1 : 0}, ${escapeSql(ch.password || '')}, ${escapeSql(ch.scheduledDate || '')}, ${ch.views || 0},
    ${escapeSql(ch.images || [])}, ${escapeSql(ch.teamId)}, ${escapeSql(ch.teamName)}, ${escapeSql(ch.createdAt)}
  ) ON DUPLICATE KEY UPDATE \`views\`=VALUES(\`views\`), \`images\`=VALUES(\`images\`);\n`;
});

let footerSql = `
COMMIT;
SET FOREIGN_KEY_CHECKS=1;
SET AUTOCOMMIT = 1;
`;

// Combine full database.sql
const fullSql = headerSql + teamsSql + usersSql + settingsSql + comicsSql + chaptersSql + footerSql;
fs.writeFileSync(PUBLIC_DB_SQL, fullSql, 'utf8');
fs.writeFileSync(PUBLIC_BACKUP_SQL, fullSql, 'utf8');
console.log(`Wrote public/database.sql (${(fs.statSync(PUBLIC_DB_SQL).size / 1024 / 1024).toFixed(2)} MB)`);

// 6. Gzip compression (database.sql.gz) for effortless phpMyAdmin upload
const gzipped = zlib.gzipSync(Buffer.from(fullSql, 'utf8'), { level: 9 });
fs.writeFileSync(PUBLIC_DB_GZ, gzipped);
console.log(`Wrote public/database.sql.gz (${(gzipped.length / 1024 / 1024).toFixed(2)} MB - COMPRESSED FOR PHPMYADMIN)`);

// 7. Generate split parts (< 2MB each for strict hosting upload limits)
// Part 1: Schema, Teams, Users, Settings
const part1Sql = headerSql + teamsSql + usersSql + settingsSql + `\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n`;
fs.writeFileSync(path.join(SQL_PARTS_DIR, '01_schema_teams_users_settings.sql'), part1Sql, 'utf8');

// Part 2: All 641 Comics
const part2Sql = `SET FOREIGN_KEY_CHECKS=0;\nSET AUTOCOMMIT=0;\nSTART TRANSACTION;\n` + comicsSql + `\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n`;
fs.writeFileSync(path.join(SQL_PARTS_DIR, '02_all_641_comics.sql'), part2Sql, 'utf8');

// Part 3 to 6: Chapters divided into 4 chunks (~3,000 chapters each)
const CHUNK_SIZE = 3100;
let partIdx = 3;
for (let i = 0; i < allChapters.length; i += CHUNK_SIZE) {
  const chunk = allChapters.slice(i, i + CHUNK_SIZE);
  let chunkSql = `SET FOREIGN_KEY_CHECKS=0;\nSET AUTOCOMMIT=0;\nSTART TRANSACTION;\n`;
  chunk.forEach((ch) => {
    chunkSql += `INSERT INTO \`chapters\` (\`id\`, \`comic_id\`, \`comic_title\`, \`chapter_number\`, \`title\`, \`is_password_protected\`, \`password\`, \`scheduled_date\`, \`views\`, \`images\`, \`team_id\`, \`team_name\`, \`created_at\`) VALUES (${escapeSql(ch.id)}, ${escapeSql(ch.comicId)}, ${escapeSql(ch.comicTitle)}, ${ch.chapterNumber || 1}, ${escapeSql(ch.title)}, ${ch.isPasswordProtected ? 1 : 0}, ${escapeSql(ch.password || '')}, ${escapeSql(ch.scheduledDate || '')}, ${ch.views || 0}, ${escapeSql(ch.images || [])}, ${escapeSql(ch.teamId)}, ${escapeSql(ch.teamName)}, ${escapeSql(ch.createdAt)}) ON DUPLICATE KEY UPDATE \`views\`=VALUES(\`views\`), \`images\`=VALUES(\`images\`);\n`;
  });
  chunkSql += `\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n`;

  const partFileName = `0${partIdx}_chapters_part${partIdx - 2}.sql`;
  const partFilePath = path.join(SQL_PARTS_DIR, partFileName);
  fs.writeFileSync(partFilePath, chunkSql, 'utf8');
  console.log(`Wrote ${partFileName} (${(fs.statSync(partFilePath).size / 1024 / 1024).toFixed(2)} MB, ${chunk.length} chapters)`);
  partIdx++;
}

console.log('All MySQL dumps generated successfully!');

// 8. Auto generate sitemaps
try {
  require('./generate_sitemaps.cjs');
} catch (e) {
  console.warn('Sitemap generator error:', e);
}

