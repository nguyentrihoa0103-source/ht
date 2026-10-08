<?php
// 1. TẮT HOÀN TOÀN MỌI HIỂN THỊ LỖI DẠNG HTML RA NGOÀI ĐỂ PHẢN HỒI LUÔN LÀ JSON CHUẨN 100%
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);
@ini_set('html_errors', 0);
@ini_set('log_errors', 1);
@error_reporting(E_ALL);

// Bật bộ đệm đầu ra ngay từ đầu để loại bỏ bất kỳ ký tự hoặc warning HTML nào
if (!ob_get_level()) {
    @ob_start();
}

/**
 * Hàm gửi phản hồi JSON chuẩn 100%
 * Tự động xóa sạch mọi ký tự, warning HTML hay khoảng trắng vô tình có trước đó
 */
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

// Bắt mọi Warning, Notice, Deprecated và log vào file, KHÔNG in thẻ <br /><b> ra output
set_error_handler(function($severity, $message, $file, $line) {
    @error_log("PHP Error [$severity]: $message in $file on line $line");
    return true; // Trả về true để PHP không kích hoạt trình xử lý lỗi mặc định (ngăn in HTML)
});

// Bắt mọi ngoại lệ chưa bắt (Uncaught Exceptions) và trả về JSON chuẩn
set_exception_handler(function($e) {
    @error_log("Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    sendJsonResponse([
        'success' => false,
        'message' => 'Lỗi máy chủ: ' . $e->getMessage(),
        'line' => $e->getLine(),
    ], 500);
});

// Đăng ký bộ xử lý lỗi nghiêm trọng (Fatal / Parse Error / Out of memory) để luôn luôn trả về JSON sạch
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Lỗi máy chủ PHP: ' . $error['message'] . ' tại dòng ' . $error['line'],
        ], 500);
    }
});

// Polyfills tương thích các phiên bản PHP 7.x (tránh lỗi Call to undefined function str_starts_with)
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

date_default_timezone_set('Asia/Ho_Chi_Minh');

// Xử lý Preflight CORS OPTIONS
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    while (ob_get_level() > 0) { @ob_end_clean(); }
    http_response_code(200);
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY, x-api-key");
    exit();
}

/**
 * ==============================================================================
 * LEESINCOMIC.COM - MYSQL DATABASE BACKEND API
 * File này đặt tại: public_html/api.php trên hosting (DirectAdmin / cPanel / aaPanel)
 * Tự động tạo bảng Database nếu chưa có, bảo vệ bằng API Key bí mật.
 * ==============================================================================
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY, x-api-key");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header('Content-Type: application/json; charset=utf-8');

// ==========================================
// 1. CẤU HÌNH KẾT NỐI MYSQL CỦA HOSTING BẠN
// Thay đổi các thông tin dưới đây cho khớp với Database tạo trên DirectAdmin
// ==========================================
$DB_HOST = "localhost";
$DB_NAME = "sql_leesincomic_com";     // Tên Database trên DirectAdmin
$DB_USER = "sql_leesincomic_com";      // Tên User Database
$DB_PASS = "34fccad499b8e";   // Mật khẩu User Database
$SECRET_API_KEY = "Leesin_Secret_MySQL_Key_2026"; // API Key bảo mật khớp với App Frontend

// Đọc file config.php nếu có để hỗ trợ tùy biến DB trên hosting/VPS
if (file_exists(__DIR__ . '/config.php')) {
    @require_once __DIR__ . '/config.php';
}

$pdo = null;
$pdoError = null;

// Kết nối MySQL PDO
try {
    $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+07:00'");
} catch (PDOException $e) {
    $pdo = null;
    $pdoError = $e->getMessage();
    @error_log("MySQL Connection Notice: " . $pdoError);
}

// Helper an toàn thêm cột vào bảng MySQL mà không bị lỗi cú pháp 1064
function safeAddColumn($pdo, $table, $column, $definition) {
    try {
        $check = $pdo->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
        $check->execute([$column]);
        if (!$check->fetch()) {
            $pdo->exec("ALTER TABLE `{$table}` ADD `{$column}` {$definition}");
        }
    } catch (Exception $e) {}
}

// Helper chuẩn hóa chuỗi thời gian ISO 8601 ('2026-10-01T09:20:00.123Z') sang chuẩn DATETIME 'Y-m-d H:i:s' của MySQL Strict Mode
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

// ==========================================
// 2. TỰ ĐỘNG KHỞI TẠO CÁC BẢNG (AUTO MIGRATION)
// ==========================================
function initDatabase($pdo) {
    $sql = "
    CREATE TABLE IF NOT EXISTS scan_teams (
        id VARCHAR(191) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        avatar TEXT,
        bio TEXT,
        donate_info TEXT,
        donate_qr TEXT,
        leader_id VARCHAR(191),
        leader_name VARCHAR(255),
        total_views BIGINT DEFAULT 0,
        follows INT DEFAULT 0,
        daily_views JSON,
        monthly_views JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_st_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(191) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(191) NOT NULL,
        avatar TEXT,
        bio TEXT,
        donate_info TEXT,
        donate_qr TEXT,
        leader_id VARCHAR(191),
        leader_name VARCHAR(255),
        total_views BIGINT DEFAULT 0,
        follows INT DEFAULT 0,
        daily_views JSON,
        monthly_views JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_t_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS comics (
        id VARCHAR(191) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(191) NOT NULL UNIQUE,
        other_names JSON,
        cover_image TEXT,
        banner_image TEXT,
        authors JSON,
        status VARCHAR(64) DEFAULT 'Đang tiến hành',
        genres JSON,
        summary LONGTEXT,
        team_id VARCHAR(191),
        team_name VARCHAR(255),
        views BIGINT DEFAULT 0,
        views_day INT DEFAULT 0,
        views_week INT DEFAULT 0,
        views_month INT DEFAULT 0,
        daily_views BIGINT DEFAULT 0,
        weekly_views BIGINT DEFAULT 0,
        monthly_views BIGINT DEFAULT 0,
        likes INT DEFAULT 0,
        follows INT DEFAULT 0,
        rating FLOAT DEFAULT 5.0,
        rating_count INT DEFAULT 1,
        is_hot TINYINT(1) DEFAULT 0,
        is_trending TINYINT(1) DEFAULT 0,
        is_18_plus TINYINT(1) DEFAULT 0,
        is_vip_only TINYINT(1) DEFAULT 0,
        seo JSON,
        seo_title VARCHAR(255),
        seo_desc TEXT,
        seo_keyword VARCHAR(255),
        canonical_url VARCHAR(255),
        updated_at VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_c_views (views),
        INDEX idx_c_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS chapters (
        id VARCHAR(191) PRIMARY KEY,
        comic_id VARCHAR(191) NOT NULL,
        comic_title VARCHAR(255),
        chapter_number FLOAT NOT NULL,
        title VARCHAR(255) NOT NULL,
        is_password_protected TINYINT(1) DEFAULT 0,
        password VARCHAR(255) DEFAULT '',
        scheduled_date VARCHAR(64) DEFAULT '',
        views BIGINT DEFAULT 0,
        images LONGTEXT NOT NULL,
        team_id VARCHAR(191),
        team_name VARCHAR(255),
        created_at VARCHAR(64),
        updated_at VARCHAR(64) NULL,
        INDEX idx_comic (comic_id),
        INDEX idx_chap_num (comic_id, chapter_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(191) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(191) NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        avatar TEXT,
        role VARCHAR(32) DEFAULT 'READER',
        team_id VARCHAR(191),
        team_name VARCHAR(255),
        can_upload TINYINT(1) DEFAULT 0,
        created_at VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS site_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_val LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value LONGTEXT,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(191) PRIMARY KEY,
        comic_id VARCHAR(191) NOT NULL,
        chapter_id VARCHAR(191),
        user_id VARCHAR(191),
        user_name VARCHAR(255) NOT NULL,
        user_avatar TEXT,
        user_role VARCHAR(32) DEFAULT 'READER',
        content TEXT NOT NULL,
        likes INT DEFAULT 0,
        dislikes INT DEFAULT 0,
        comic_title VARCHAR(255),
        chapter_number FLOAT,
        created_at VARCHAR(64),
        INDEX idx_c_comic (comic_id),
        INDEX idx_c_chap (chapter_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS chapter_comments (
        id VARCHAR(191) PRIMARY KEY,
        comic_id VARCHAR(191) NULL,
        comic_title VARCHAR(255) NULL,
        comic_slug VARCHAR(191) NULL,
        cover_image TEXT NULL,
        chapter_id VARCHAR(191) NULL,
        chapter_number FLOAT NULL DEFAULT 0,
        chapter_title VARCHAR(255) NULL,
        user_id VARCHAR(191) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_avatar TEXT NULL,
        user_role VARCHAR(50) DEFAULT 'READER',
        content TEXT NOT NULL,
        likes INT DEFAULT 0,
        parent_id VARCHAR(191) NULL,
        reply_to_user_id VARCHAR(191) NULL,
        reply_to_user_name VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        status VARCHAR(32) DEFAULT 'VISIBLE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_cc_comic (comic_id),
        INDEX idx_cc_chap (chapter_id),
        INDEX idx_cc_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(191) PRIMARY KEY,
        recipient_user_id VARCHAR(191) NULL,
        recipient_team_id VARCHAR(191) NULL,
        recipient_team_name VARCHAR(255) NULL,
        recipient_role VARCHAR(50) NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'COMMENT',
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        sender_id VARCHAR(191) NULL,
        sender_name VARCHAR(255) NULL,
        sender_avatar TEXT NULL,
        comic_id VARCHAR(191) NULL,
        comic_title VARCHAR(255) NULL,
        comic_slug VARCHAR(191) NULL,
        chapter_number FLOAT NULL,
        comment_id VARCHAR(191) NULL,
        parent_comment_id VARCHAR(191) NULL,
        is_read TINYINT(1) DEFAULT 0,
        link VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_n_recip_u (recipient_user_id),
        INDEX idx_n_recip_t (recipient_team_id),
        INDEX idx_n_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


    CREATE TABLE IF NOT EXISTS reading_history (
        id VARCHAR(191) PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        comic_id VARCHAR(191) NOT NULL,
        chapter_id VARCHAR(191) NOT NULL,
        chapter_title VARCHAR(255),
        chapter_number FLOAT,
        last_page INT DEFAULT 1,
        total_pages INT DEFAULT 1,
        read_at VARCHAR(64),
        INDEX idx_rh_user (user_id),
        INDEX idx_rh_comic (comic_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS followed_comics (
        id VARCHAR(191) PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        comic_id VARCHAR(191) NOT NULL,
        followed_at VARCHAR(64),
        notification_enabled TINYINT(1) DEFAULT 1,
        INDEX idx_fc_user (user_id),
        INDEX idx_fc_comic (comic_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS followed_teams (
        id VARCHAR(191) PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        team_id VARCHAR(191) NOT NULL,
        team_name VARCHAR(255) NULL,
        team_slug VARCHAR(191) NULL,
        team_avatar TEXT NULL,
        team_bio TEXT NULL,
        donate_info TEXT NULL,
        followed_at VARCHAR(64),
        notification_enabled TINYINT(1) DEFAULT 1,
        INDEX idx_ft_user (user_id),
        INDEX idx_ft_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS views_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        comic_id VARCHAR(191) NOT NULL,
        chapter_id VARCHAR(191) NULL,
        team_id VARCHAR(191) NOT NULL,
        view_date DATE NOT NULL,
        views_count INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vh_comic (comic_id),
        INDEX idx_vh_team (team_id),
        INDEX idx_vh_date (view_date),
        INDEX idx_vh_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS view_logs (
        id VARCHAR(191) PRIMARY KEY,
        comic_id VARCHAR(191) NOT NULL,
        chapter_id VARCHAR(191) NULL,
        team_id VARCHAR(191) NULL,
        multiplier INT DEFAULT 1,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vl_comic (comic_id),
        INDEX idx_vl_chapter (chapter_id),
        INDEX idx_vl_team (team_id),
        INDEX idx_vl_time (viewed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);

    // Tự động cập nhật bảng cũ sang cấu trúc mới (tương thích mọi phiên bản MySQL / MariaDB)
    try {
        safeAddColumn($pdo, 'comics', 'other_names', 'JSON NULL');
        safeAddColumn($pdo, 'comics', 'banner_image', 'TEXT NULL');
        safeAddColumn($pdo, 'comics', 'views_day', 'INT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'views_week', 'INT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'views_month', 'INT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'daily_views', 'BIGINT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'weekly_views', 'BIGINT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'monthly_views', 'BIGINT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'likes', 'BIGINT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'follows', 'BIGINT DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'rating', 'DECIMAL(3,2) DEFAULT 5.00');
        safeAddColumn($pdo, 'comics', 'rating_count', 'INT DEFAULT 1');
        safeAddColumn($pdo, 'comics', 'is_hot', 'TINYINT(1) DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'is_trending', 'TINYINT(1) DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'is_18_plus', 'TINYINT(1) DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'is_vip_only', 'TINYINT(1) DEFAULT 0');
        safeAddColumn($pdo, 'comics', 'seo', 'JSON NULL');
        safeAddColumn($pdo, 'comics', 'seo_title', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'seo_desc', 'TEXT NULL');
        safeAddColumn($pdo, 'comics', 'seo_keyword', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'canonical_url', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'updated_at', 'VARCHAR(64) NULL');
        safeAddColumn($pdo, 'chapters', 'updated_at', 'VARCHAR(64) NULL');
        safeAddColumn($pdo, 'chapters', 'scheduled_date', 'VARCHAR(64) NULL');
        safeAddColumn($pdo, 'notifications', 'recipient_team_name', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'notifications', 'recipient_role', 'VARCHAR(50) NULL');
        safeAddColumn($pdo, 'notifications', 'comment_id', 'VARCHAR(191) NULL');
        safeAddColumn($pdo, 'notifications', 'parent_comment_id', 'VARCHAR(191) NULL');
        safeAddColumn($pdo, 'notifications', 'link', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'scan_teams', 'donate_info', 'TEXT NULL');
        safeAddColumn($pdo, 'scan_teams', 'donate_qr', 'TEXT NULL');
        safeAddColumn($pdo, 'scan_teams', 'follows', 'INT DEFAULT 0');
        safeAddColumn($pdo, 'teams', 'donate_info', 'TEXT NULL');
        safeAddColumn($pdo, 'teams', 'donate_qr', 'TEXT NULL');
        safeAddColumn($pdo, 'teams', 'follows', 'INT DEFAULT 0');
        safeAddColumn($pdo, 'teams', 'daily_views', 'JSON NULL');
        safeAddColumn($pdo, 'teams', 'monthly_views', 'JSON NULL');
    } catch (Exception $mEx) {}
}

// Chạy tự động tạo bảng nếu có kết nối MySQL
if ($pdo) {
    try {
        initDatabase($pdo);
    } catch (Exception $e) {
        // bảng đã tồn tại hoặc bỏ qua
    }
    // Luôn đảm bảo các cột cần thiết cho chapters và avatar users tồn tại ngay cả khi initDatabase bị bỏ qua
    safeAddColumn($pdo, 'chapters', 'updated_at', 'VARCHAR(64) NULL');
    safeAddColumn($pdo, 'chapters', 'scheduled_date', 'VARCHAR(64) NULL');
    try {
        $pdo->exec("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
    } catch (Exception $eAvatar) {}
}

// Kiểm tra header API Key nếu là thao tác sửa/xóa/thêm
$headers = [];
if (function_exists('getallheaders')) {
    $headers = (array)getallheaders();
} elseif (function_exists('apache_request_headers')) {
    $headers = (array)apache_request_headers();
}

$clientKey = '';
if (!empty($_SERVER['HTTP_X_API_KEY'])) {
    $clientKey = $_SERVER['HTTP_X_API_KEY'];
} elseif (!empty($_SERVER['REDIRECT_HTTP_X_API_KEY'])) {
    $clientKey = $_SERVER['REDIRECT_HTTP_X_API_KEY'];
} elseif (!empty($headers['X-API-KEY'])) {
    $clientKey = $headers['X-API-KEY'];
} elseif (!empty($headers['x-api-key'])) {
    $clientKey = $headers['x-api-key'];
} elseif (!empty($_GET['key'])) {
    $clientKey = $_GET['key'];
} elseif (!empty($_POST['key'])) {
    $clientKey = $_POST['key'];
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// -----------------------------------------------------------------------------
// ROUTE: PING TEST KẾT NỐI DATABASE
// -----------------------------------------------------------------------------
if ($action === 'ping' || empty($action)) {
    $comicCount = $pdo->query("SELECT COUNT(*) FROM comics")->fetchColumn();
    $chapCount = $pdo->query("SELECT COUNT(*) FROM chapters")->fetchColumn();
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

    sendJsonResponse([
        'success' => true,
        'status' => 'online',
        'database' => $DB_NAME,
        'message' => 'Kết nối MySQL Server thành công!',
        'totalComics' => intval($comicCount),
        'totalChapters' => intval($chapCount),
        'totalUsers' => intval($userCount),
        'server_time' => date('Y-m-d H:i:s')
    ]);
}

// -----------------------------------------------------------------------------
// ROUTE: TỰ ĐỘNG NẠP DỮ LIỆU TỪ DATA_STORE.JSON VÀO MYSQL (1-CLICK SYNC)
// Không cần dùng phpMyAdmin, giải quyết triệt để lỗi upload timeout và giới hạn dung lượng!
// -----------------------------------------------------------------------------
if ($action === 'auto_import_from_json' || $action === 'sync_json_to_sql') {
    $reqKey = isset($_GET['key']) ? $_GET['key'] : (isset($_POST['key']) ? $_POST['key'] : $clientKey);
    if ($reqKey !== $SECRET_API_KEY) {
        sendJsonResponse(['success' => false, 'message' => 'API Key bảo mật không đúng hoặc chưa được truyền!'], 403);
    }

    $jsonPath = __DIR__ . '/data_store.json';
    if (!file_exists($jsonPath)) {
        $jsonPath = dirname(__DIR__) . '/data_store.json';
    }
    if (!file_exists($jsonPath)) {
        sendJsonResponse(['success' => false, 'message' => 'Không tìm thấy file data_store.json trên thư mục hosting!'], 404);
    }

    @set_time_limit(300);
    @ini_set('memory_limit', '512M');

    $content = file_get_contents($jsonPath);
    $store = json_decode($content, true);
    if (!$store || empty($store['comics'])) {
        sendJsonResponse(['success' => false, 'message' => 'File data_store.json rỗng hoặc không đúng định dạng!'], 400);
    }

    initDatabase($pdo);

    $pdo->beginTransaction();
    try {
        // 1. Teams
        $teamStmt = $pdo->prepare("INSERT INTO scan_teams (id, name, slug, avatar, bio, donate_info, donate_qr, leader_id, leader_name, total_views, follows, daily_views, monthly_views)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), total_views=VALUES(total_views)");
        $teamsAltStmt = $pdo->prepare("INSERT INTO teams (id, name, slug, avatar, bio, donate_info, donate_qr, leader_id, leader_name, total_views, follows, daily_views, monthly_views)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), total_views=VALUES(total_views)");

        foreach (($store['teams'] ?? []) as $t) {
            $params = [
                $t['id'], $t['name'], $t['slug'], $t['avatar'] ?? $t['avatarUrl'] ?? '',
                $t['bio'] ?? '', $t['donateInfo'] ?? '', $t['donateQr'] ?? '',
                $t['leaderId'] ?? '', $t['leaderName'] ?? '', $t['totalViews'] ?? 0,
                $t['follows'] ?? 0, json_encode($t['dailyViews'] ?? []), json_encode($t['monthlyViews'] ?? [])
            ];
            $teamStmt->execute($params);
            $teamsAltStmt->execute($params);
        }

        // 2. Users
        $userStmt = $pdo->prepare("INSERT INTO users (id, name, username, email, password_hash, avatar, role, team_id, team_name, can_upload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role)");
        foreach (($store['users'] ?? []) as $u) {
            $userStmt->execute([
                $u['id'], $u['name'], $u['username'] ?? explode('@', $u['email'])[0], $u['email'],
                $u['passwordHash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                $u['avatar'] ?? '', $u['role'] ?? 'READER', $u['teamId'] ?? '', $u['teamName'] ?? '',
                !empty($u['canUpload']) ? 1 : 0, $u['createdAt'] ?? date('Y-m-d')
            ]);
        }

        // 3. Comics & Chapters
        $comicStmt = $pdo->prepare("INSERT INTO comics (
            id, title, slug, other_names, cover_image, banner_image, authors, status, genres, summary,
            team_id, team_name, views, views_day, views_week, views_month, daily_views, weekly_views, monthly_views,
            likes, follows, rating, rating_count, is_hot, is_trending, is_18_plus, is_vip_only, seo, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE title=VALUES(title), views=VALUES(views), cover_image=VALUES(cover_image), updated_at=VALUES(updated_at)");

        $chapStmt = $pdo->prepare("INSERT INTO chapters (
            id, comic_id, comic_title, chapter_number, title, is_password_protected, password,
            scheduled_date, views, images, team_id, team_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE views=VALUES(views), images=VALUES(images), created_at=VALUES(created_at), updated_at=VALUES(updated_at)");

        $totalComics = 0;
        $totalChaps = 0;

        foreach ($store['comics'] as $c) {
            $totalComics++;
            $dViews = $c['dayViews'] ?? 0;
            $wViews = $c['weekViews'] ?? 0;
            $mViews = $c['monthViews'] ?? $c['views'] ?? 0;

            $cUpdatedAt = (!empty($c['updatedAt']) && $c['updatedAt'] !== 'Vừa xong') ? $c['updatedAt'] : '2026-09-20T10:00:00.000Z';

            $comicStmt->execute([
                $c['id'], $c['title'], $c['slug'], json_encode($c['otherNames'] ?? []),
                $c['coverImage'] ?? '', $c['bannerImage'] ?? '', json_encode($c['authors'] ?? []),
                $c['status'] ?? 'Đang tiến hành', json_encode($c['genres'] ?? ['Manhwa']),
                $c['summary'] ?? '', $c['teamId'] ?? '', $c['teamName'] ?? '',
                $c['views'] ?? 0, $dViews, $wViews, $mViews, $dViews, $wViews, $mViews,
                $c['likes'] ?? 0, $c['follows'] ?? 0, $c['rating'] ?? 5.0, $c['ratingCount'] ?? 1,
                !empty($c['isHot']) ? 1 : 0, !empty($c['isTrending']) ? 1 : 0, !empty($c['is18Plus']) || !empty($c['is_18_plus']) ? 1 : 0, 0,
                json_encode($c['seo'] ?? []), $cUpdatedAt
            ]);

            if (isset($c['chapters']) && is_array($c['chapters'])) {
                foreach ($c['chapters'] as $ch) {
                    $totalChaps++;
                    $chCreatedAt = (!empty($ch['createdAt']) && $ch['createdAt'] !== 'Vừa xong') ? $ch['createdAt'] : $cUpdatedAt;
                    $chUpdatedAt = (!empty($ch['updatedAt']) && $ch['updatedAt'] !== 'Vừa xong') ? $ch['updatedAt'] : $chCreatedAt;
                    $chapStmt->execute([
                        $ch['id'], $c['id'], $c['title'], $ch['chapterNumber'] ?? 1,
                        $ch['title'] ?? ('Chương ' . ($ch['chapterNumber'] ?? 1)),
                        !empty($ch['isPasswordProtected']) ? 1 : 0, $ch['password'] ?? '',
                        $ch['scheduledDate'] ?? '', $ch['views'] ?? 0,
                        json_encode($ch['images'] ?? []), $ch['teamId'] ?? $c['teamId'] ?? '',
                        $ch['teamName'] ?? $c['teamName'] ?? '', $chCreatedAt, $chUpdatedAt
                    ]);
                }
            }
        }

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Nạp dữ liệu vào cơ sở dữ liệu MySQL thành công mỹ mãn!',
            'totalComics' => $totalComics,
            'totalChapters' => $totalChaps,
            'totalTeams' => count($store['teams'] ?? []),
            'totalUsers' => count($store['users'] ?? []),
            'time' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'message' => 'Lỗi nạp dữ liệu: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY DANH SÁCH TRUYỆN (GET COMICS / GET TEAM COMICS)
// Sắp xếp chuẩn theo thời gian cập nhật chapter mới nhất: ORDER BY latest_chapter_update DESC
// -----------------------------------------------------------------------------
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
            SELECT c.*
            FROM comics c
            {$whereSql}
            ORDER BY c.id DESC
        ");
        $stmt->execute($params);
        $comics = $stmt->fetchAll();

        if (empty($comics)) {
            sendJsonResponse(['success' => true, 'comics' => []]);
        }

        // Tối ưu hóa: Lấy toàn bộ chapters trong 1 QUERY duy nhất, bỏ cột 'images' nặng nề
        // để tăng tốc đồng bộ từ 2 phút xuống tức thời (<50ms).
        $comicIds = array_column($comics, 'id');
        $inPlaceholders = implode(',', array_fill(0, count($comicIds), '?'));

        $allChapters = [];
        try {
            $chapStmt = $pdo->prepare("
                SELECT id, comic_id, chapter_number, title, is_password_protected, scheduled_date, team_id, team_name, created_at, updated_at, views
                FROM chapters
                WHERE comic_id IN ({$inPlaceholders})
                ORDER BY chapter_number ASC
            ");
            $chapStmt->execute($comicIds);
            $allChapters = $chapStmt->fetchAll();
        } catch (Exception $eChap) {
            safeAddColumn($pdo, 'chapters', 'updated_at', 'VARCHAR(64) NULL');
            try {
                $chapStmt = $pdo->prepare("
                    SELECT id, comic_id, chapter_number, title, is_password_protected, scheduled_date, team_id, team_name, created_at, views
                    FROM chapters
                    WHERE comic_id IN ({$inPlaceholders})
                    ORDER BY chapter_number ASC
                ");
                $chapStmt->execute($comicIds);
                $allChapters = $chapStmt->fetchAll();
            } catch (Exception $eChap2) {
                $allChapters = [];
            }
        }

        $chaptersByComic = [];
        $latestChapterUpdateByComic = [];
        foreach ($allChapters as $ch) {
            $cid = $ch['comic_id'];
            $chTime = !empty($ch['updated_at']) ? $ch['updated_at'] : $ch['created_at'];
            if (!isset($latestChapterUpdateByComic[$cid]) || $chTime > $latestChapterUpdateByComic[$cid]) {
                $latestChapterUpdateByComic[$cid] = $chTime;
            }
            $chaptersByComic[$cid][] = [
                'id' => $ch['id'],
                'comicId' => $cid,
                'comicTitle' => $ch['title'] ?? '',
                'chapterNumber' => floatval($ch['chapter_number']),
                'title' => $ch['title'],
                'isPasswordProtected' => (bool)$ch['is_password_protected'],
                'scheduledDate' => $ch['scheduled_date'],
                'teamId' => $ch['team_id'],
                'teamName' => $ch['team_name'],
                'createdAt' => $ch['created_at'],
                'updatedAt' => $chTime,
                'views' => intval($ch['views']),
                'images' => [],
            ];
        }

        // Parse JSON columns và gán danh sách chapters tương ứng
        foreach ($comics as &$c) {
            $cid = $c['id'];
            $c['otherNames'] = json_decode($c['other_names'] ?: '[]', true);
            $c['authors'] = json_decode($c['authors'] ?: '[]', true);
            $c['genres'] = json_decode($c['genres'] ?: '[]', true);
            $c['seo'] = json_decode($c['seo'] ?: '{}', true);
            $c['coverImage'] = $c['cover_image'];
            $c['bannerImage'] = $c['banner_image'];
            $c['teamId'] = $c['team_id'];
            $c['teamName'] = $c['team_name'];
            $latestUpdate = $latestChapterUpdateByComic[$cid] ?? ($latestChapterUpdateByComic[$c['slug'] ?? ''] ?? null);
            $c['updatedAt'] = !empty($latestUpdate) ? $latestUpdate : ((!empty($c['updated_at']) && $c['updated_at'] !== 'Vừa xong') ? $c['updated_at'] : $c['created_at']);
            $c['createdAt'] = $c['created_at'];
            $c['ratingCount'] = intval($c['rating_count']);
            $c['views'] = intval($c['views']);
            $c['likes'] = intval($c['likes']);
            $c['follows'] = intval($c['follows']);
            $c['isHot'] = (bool)$c['is_hot'];
            $c['isTrending'] = (bool)$c['is_trending'];
            $c['is18Plus'] = !empty($c['is_18_plus']);
            $c['chapters'] = $chaptersByComic[$cid] ?? ($chaptersByComic[$c['slug'] ?? ''] ?? []);
        }
        unset($c);

        // Sắp xếp truyện theo thời gian cập nhật mới nhất (updatedAt DESC)
        usort($comics, function ($a, $b) {
            return strcmp($b['updatedAt'] ?? '', $a['updatedAt'] ?? '');
        });

        sendJsonResponse(['success' => true, 'comics' => $comics]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'message' => 'Lỗi SQL khi tải danh sách truyện: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY CHI TIẾT 1 BỘ TRUYỆN TỪ SQL (GET SINGLE COMIC)
// -----------------------------------------------------------------------------
if ($action === 'get_comic' || $action === 'get_comic_detail') {
    try {
        $comicId = $_GET['id'] ?? $_GET['comicId'] ?? $_GET['slug'] ?? '';
        if (!$comicId) {
            sendJsonResponse(['success' => false, 'message' => 'Thiếu ID hoặc slug của truyện'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM comics WHERE id = ? OR slug = ? LIMIT 1");
        $stmt->execute([$comicId, $comicId]);
        $c = $stmt->fetch();
        if (!$c) {
            sendJsonResponse(['success' => false, 'message' => 'Không tìm thấy truyện trong SQL'], 404);
        }

        $c['otherNames'] = json_decode($c['other_names'] ?: '[]', true);
        $c['authors'] = json_decode($c['authors'] ?: '[]', true);
        $c['genres'] = json_decode($c['genres'] ?: '[]', true);
        $c['seo'] = json_decode($c['seo'] ?: '{}', true);
        $c['coverImage'] = $c['cover_image'];
        $c['bannerImage'] = $c['banner_image'];
        $c['teamId'] = $c['team_id'];
        $c['teamName'] = $c['team_name'];
        $c['updatedAt'] = (!empty($c['updated_at']) && $c['updated_at'] !== 'Vừa xong') ? $c['updated_at'] : $c['created_at'];
        $c['ratingCount'] = intval($c['rating_count']);
        $c['views'] = intval($c['views']);
        $c['likes'] = intval($c['likes']);
        $c['follows'] = intval($c['follows']);
        $c['isHot'] = (bool)$c['is_hot'];
        $c['isTrending'] = (bool)$c['is_trending'];
        $c['is18Plus'] = !empty($c['is_18_plus']);

        $chapStmt = $pdo->prepare("SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number ASC");
        $chapStmt->execute([$c['id']]);
        $chaps = $chapStmt->fetchAll();

        foreach ($chaps as &$ch) {
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
            $ch['images'] = json_decode($ch['images'] ?: '[]', true);
        }
        $c['chapters'] = $chaps;

        sendJsonResponse(['success' => true, 'comic' => $c, 'views' => $c['views']]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'message' => 'Lỗi SQL khi tải chi tiết truyện: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY CHI TIẾT 1 CHƯƠNG TỪ SQL (GET CHAPTER)
// Hỗ trợ tự động cào ảnh dự phòng nếu chương chưa có ảnh trong database
// -----------------------------------------------------------------------------
if ($action === 'get_chapter') {
    try {
        $chapterId = $_GET['id'] ?? $_GET['chapterId'] ?? '';
        $comicSlug = $_GET['comicSlug'] ?? $_GET['comicId'] ?? '';
        $chapterNumber = isset($_GET['chapterNumber']) ? floatval($_GET['chapterNumber']) : null;

        $ch = null;
        if ($pdo) {
            $stmt = null;
            if ($chapterId) {
                $stmt = $pdo->prepare("SELECT * FROM chapters WHERE id = ? LIMIT 1");
                $stmt->execute([$chapterId]);
                $ch = $stmt->fetch();
            }
            if (!$ch && $comicSlug && $chapterNumber !== null) {
                $cStmt = $pdo->prepare("SELECT id FROM comics WHERE slug = ? OR id = ? LIMIT 1");
                $cStmt->execute([$comicSlug, $comicSlug]);
                $cRow = $cStmt->fetch();
                $cId = $cRow ? $cRow['id'] : $comicSlug;

                $stmt = $pdo->prepare("SELECT * FROM chapters WHERE comic_id = ? AND chapter_number = ? LIMIT 1");
                $stmt->execute([$cId, $chapterNumber]);
                $ch = $stmt->fetch();
            }
        }

        // Tìm trong file data_store.json nếu không có trong MySQL
        $dsPaths = [
            __DIR__ . '/data_store.json',
            dirname(__DIR__) . '/data_store.json',
            __DIR__ . '/dist/data_store.json',
            dirname(__DIR__) . '/dist/data_store.json',
        ];

        $matchedComicData = null;
        if (!$ch) {
            foreach ($dsPaths as $dsp) {
                if (file_exists($dsp)) {
                    $jsonContent = @file_get_contents($dsp);
                    if ($jsonContent) {
                        $dsData = @json_decode($jsonContent, true);
                        if (!empty($dsData['comics'])) {
                            foreach ($dsData['comics'] as $dc) {
                                if (($comicSlug && $dc['slug'] === $comicSlug) || ($comicSlug && $dc['id'] === $comicSlug) || ($chapterId && strpos($chapterId, $dc['slug']) !== false)) {
                                    $matchedComicData = $dc;
                                    foreach ($dc['chapters'] ?? [] as $dch) {
                                        if (($chapterId && $dch['id'] === $chapterId) || ($chapterNumber !== null && floatval($dch['chapterNumber'] ?? 0) == $chapterNumber)) {
                                            $ch = [
                                                'id' => $dch['id'] ?? ($dc['slug'] . '-' . ($dch['chapterNumber'] ?? $chapterNumber)),
                                                'comic_id' => $dc['id'],
                                                'comicId' => $dc['id'],
                                                'comic_title' => $dc['title'],
                                                'comicTitle' => $dc['title'],
                                                'chapter_number' => $dch['chapterNumber'] ?? $chapterNumber,
                                                'chapterNumber' => floatval($dch['chapterNumber'] ?? $chapterNumber),
                                                'title' => $dch['title'] ?? ('Chương ' . ($dch['chapterNumber'] ?? $chapterNumber)),
                                                'images' => json_encode($dch['images'] ?? []),
                                                'link' => $dch['link'] ?? '',
                                                'views' => intval($dch['views'] ?? 0),
                                                'is_password_protected' => false,
                                                'isPasswordProtected' => false,
                                                'scheduled_date' => null,
                                                'scheduledDate' => null,
                                                'team_id' => $dch['teamId'] ?? $dc['teamId'] ?? '',
                                                'teamId' => $dch['teamId'] ?? $dc['teamId'] ?? '',
                                                'team_name' => $dch['teamName'] ?? $dc['teamName'] ?? '',
                                                'teamName' => $dch['teamName'] ?? $dc['teamName'] ?? '',
                                                'created_at' => $dch['createdAt'] ?? date('c'),
                                                'createdAt' => $dch['createdAt'] ?? date('c'),
                                                'updated_at' => $dch['updatedAt'] ?? date('c'),
                                                'updatedAt' => $dch['updatedAt'] ?? date('c'),
                                            ];
                                            break 3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!$ch) {
            sendJsonResponse(['success' => false, 'message' => 'Không tìm thấy chương truyện trong cơ sở dữ liệu'], 404);
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

        // Tự động chuyển tachserver.online -> tachserver.site
        $cleanImages = [];
        foreach ($rawImages as $img) {
            if (is_string($img) && strlen($img) > 0) {
                $cleanImages[] = str_replace('tachserver.online', 'tachserver.site', $img);
            }
        }

        // Nếu chương chưa có ảnh trong SQL, kiểm tra data_store.json trước
        if (empty($cleanImages)) {
            $dsPaths = [
                __DIR__ . '/data_store.json',
                dirname(__DIR__) . '/data_store.json',
                __DIR__ . '/dist/data_store.json',
                dirname(__DIR__) . '/dist/data_store.json',
            ];
            foreach ($dsPaths as $dsp) {
                if (file_exists($dsp)) {
                    $jsonContent = @file_get_contents($dsp);
                    if ($jsonContent) {
                        $dsData = @json_decode($jsonContent, true);
                        if (!empty($dsData['comics'])) {
                            foreach ($dsData['comics'] as $dc) {
                                if (($dc['id'] === $ch['comic_id']) || (!empty($dc['slug']) && $dc['slug'] === $comicSlug)) {
                                    foreach ($dc['chapters'] ?? [] as $dch) {
                                        if (floatval($dch['chapterNumber'] ?? 0) == floatval($ch['chapterNumber']) && !empty($dch['images'])) {
                                            $cleanImages = array_values(array_filter($dch['images'], function($x) { return is_string($x) && strlen($x) > 0; }));
                                            // Tự động cập nhật vào MySQL ngay lập tức
                                            try {
                                                $upStmt = $pdo->prepare("UPDATE chapters SET images = ? WHERE id = ?");
                                                $upStmt->execute([json_encode($cleanImages, JSON_UNESCAPED_SLASHES), $ch['id']]);
                                            } catch (Exception $e) {}
                                            break 3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Nếu vẫn chưa có ảnh, tiến hành cào trực tiếp từ lazyteam.site
        $forceSync = (isset($_GET['force']) && $_GET['force'] === '1') || (isset($_GET['forceSync']) && $_GET['forceSync'] === '1');
        if ((empty($cleanImages) || $forceSync) && $ch['chapterNumber'] !== null) {
            $effectiveSlug = $comicSlug;
            $coverImage = $_GET['coverImage'] ?? '';
            
            if ($pdo) {
                try {
                    $cMetaStmt = $pdo->prepare("SELECT slug, title, cover_image FROM comics WHERE id = ? OR slug = ? LIMIT 1");
                    $cMetaStmt->execute([$ch['comic_id'], $comicSlug ?: $ch['comic_id']]);
                    $cMeta = $cMetaStmt->fetch();
                    if ($cMeta) {
                        if (empty($effectiveSlug)) $effectiveSlug = $cMeta['slug'] ?? '';
                        if (empty($coverImage)) $coverImage = $cMeta['cover_image'] ?? '';
                    }
                } catch (Exception $e) {}
            }
            if ($matchedComicData) {
                if (empty($effectiveSlug)) $effectiveSlug = $matchedComicData['slug'] ?? '';
                if (empty($coverImage)) $coverImage = $matchedComicData['coverImage'] ?? '';
            }

            $cleanSlug = preg_replace('/^comic-/', '', $effectiveSlug);
            $rawSlugs = [];
            if ($coverImage && preg_match('/\/minh_hoa\/(.+)-\d{8,12}\.[a-zA-Z0-9]+$/', $coverImage, $mCover)) {
                $rawSlugs[] = $mCover[1];
            }
            if ($cleanSlug) {
                $rawSlugs[] = $cleanSlug;
            }
            $rawSlugs = array_values(array_unique(array_filter($rawSlugs)));

            $candidateUrls = [];
            $clientLink = $_GET['link'] ?? '';
            if ($clientLink) {
                $candidateUrls[] = (strpos($clientLink, 'http') === 0) 
                    ? preg_replace('/https?:\/\/(?:www\.)?(?:leesincomic\.com|lazyteam\.site)/', 'https://lazyteam.site', $clientLink)
                    : "https://lazyteam.site" . (substr($clientLink, 0, 1) === '/' ? $clientLink : "/{$clientLink}");
            }
            if (!empty($ch['link'])) {
                $candidateUrls[] = (strpos($ch['link'], 'http') === 0) 
                    ? preg_replace('/https?:\/\/(?:www\.)?(?:leesincomic\.com|lazyteam\.site)/', 'https://lazyteam.site', $ch['link'])
                    : "https://lazyteam.site" . (substr($ch['link'], 0, 1) === '/' ? $ch['link'] : "/{$ch['link']}");
            }

            $chapNumStr = (string)$ch['chapterNumber'];
            $dashNumStr = str_replace('.', '-', $chapNumStr);
            foreach ($rawSlugs as $rs) {
                $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/{$chapNumStr}.html";
                $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/chap-{$chapNumStr}.html";
                $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/{$dashNumStr}.html";
                $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/chap-{$dashNumStr}.html";
                $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/ngoai-truyen-{$dashNumStr}.html";
                if ($ch['chapterNumber'] == 1 || $ch['chapterNumber'] == 0) {
                    $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/oneshot.html";
                    $candidateUrls[] = "https://lazyteam.site/truyen-tranh/{$rs}/chap-oneshot.html";
                }
            }
            $candidateUrls = array_values(array_unique($candidateUrls));

            $extractImagesFromHtml = function($html) {
                $found = [];
                if (preg_match_all('/(?:data-src|data-original|src)=["\']([^"\']+)["\']/i', $html, $matches) && !empty($matches[1])) {
                    foreach ($matches[1] as $mImg) {
                        $mImg = trim($mImg);
                        if (strlen($mImg) < 6) continue;
                        if (stripos($mImg, '.gif') !== false || stripos($mImg, 'data:') === 0) continue;
                        if (stripos($mImg, 'no-images.jpg') !== false || stripos($mImg, 'logo') !== false || stripos($mImg, 'user.png') !== false || stripos($mImg, '/skin/') !== false) continue;
                        if (substr($mImg, 0, 2) === '//') $mImg = 'https:' . $mImg;
                        elseif (substr($mImg, 0, 1) === '/') $mImg = 'https://lazyteam.site' . $mImg;
                        $mImg = str_replace('tachserver.online', 'tachserver.site', $mImg);
                        if (stripos($mImg, 'uploads/minh_hoa') !== false || stripos($mImg, 'tachserver.site') !== false) {
                            $found[] = $mImg;
                        }
                    }
                }
                return array_values(array_unique($found));
            };

            foreach ($candidateUrls as $curlUrl) {
                $chCurl = curl_init();
                curl_setopt($chCurl, CURLOPT_URL, $curlUrl);
                curl_setopt($chCurl, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($chCurl, CURLOPT_TIMEOUT, 8);
                curl_setopt($chCurl, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($chCurl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                curl_setopt($chCurl, CURLOPT_REFERER, 'https://lazyteam.site/');
                $html = curl_exec($chCurl);
                $httpCode = curl_getinfo($chCurl, CURLINFO_HTTP_CODE);
                curl_close($chCurl);

                if ($httpCode === 200 && $html) {
                    $foundImgs = $extractImagesFromHtml($html);
                    if (!empty($foundImgs)) {
                        $cleanImages = $foundImgs;
                        if ($pdo) {
                            try {
                                $upStmt = $pdo->prepare("UPDATE chapters SET images = ? WHERE id = ?");
                                $upStmt->execute([json_encode($cleanImages, JSON_UNESCAPED_SLASHES), $ch['id']]);
                            } catch (Exception $e) {}
                        }
                        break;
                    }
                }
            }

            // Fallback: mở trang thông tin truyện trên lazyteam.site để dò link chương chính xác
            if (empty($cleanImages)) {
                foreach ($rawSlugs as $rs) {
                    $comicUrl = "https://lazyteam.site/truyen-tranh/{$rs}.html";
                    $chCurl = curl_init();
                    curl_setopt($chCurl, CURLOPT_URL, $comicUrl);
                    curl_setopt($chCurl, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($chCurl, CURLOPT_TIMEOUT, 8);
                    curl_setopt($chCurl, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($chCurl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                    curl_setopt($chCurl, CURLOPT_REFERER, 'https://lazyteam.site/');
                    $comicHtml = curl_exec($chCurl);
                    $httpCode = curl_getinfo($chCurl, CURLINFO_HTTP_CODE);
                    curl_close($chCurl);

                    if ($httpCode === 200 && $comicHtml && preg_match_all('/<div class=["\']chap_name["\']>\s*<a[^>]+href=["\']([^"\']+)["\'](?:[^>]*title=["\']([^"\']*)["\'])?/i', $comicHtml, $chapMatches, PREG_SET_ORDER)) {
                        $matchedLink = '';
                        $escapedDash = preg_quote($dashNumStr, '/');
                        $escapedNum = preg_quote($chapNumStr, '/');

                        // 1. Khớp chính xác đuôi /chap-34.html hoặc /34.html
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

                        // 2. Khớp regex có hậu tố (VD: /chap-34-end-ss1.html, /chap-34-end.html, /chap-34-phan-1.html)
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

                        // 3. Khớp theo chuỗi con trong link /chap-34
                        if (!$matchedLink) {
                            foreach ($chapMatches as $cm) {
                                $cl = $cm[1];
                                if (strpos($cl, "/chap-{$dashNumStr}") !== false || strpos($cl, "/chap-{$chapNumStr}") !== false) {
                                    $matchedLink = $cl;
                                    break;
                                }
                            }
                        }

                        // 4. Khớp theo tiêu đề chapter trong thẻ a
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
                            $fullChapUrl = (strpos($matchedLink, 'http') === 0) ? $matchedLink : "https://lazyteam.site" . (substr($matchedLink, 0, 1) === '/' ? $matchedLink : "/{$matchedLink}");
                            $chCurl2 = curl_init();
                            curl_setopt($chCurl2, CURLOPT_URL, $fullChapUrl);
                            curl_setopt($chCurl2, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($chCurl2, CURLOPT_TIMEOUT, 8);
                            curl_setopt($chCurl2, CURLOPT_FOLLOWLOCATION, true);
                            curl_setopt($chCurl2, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                            curl_setopt($chCurl2, CURLOPT_REFERER, 'https://lazyteam.site/');
                            $chapHtml = curl_exec($chCurl2);
                            $httpCode2 = curl_getinfo($chCurl2, CURLINFO_HTTP_CODE);
                            curl_close($chCurl2);

                            if ($httpCode2 === 200 && $chapHtml) {
                                $foundImgs = $extractImagesFromHtml($chapHtml);
                                if (!empty($foundImgs)) {
                                    $cleanImages = $foundImgs;
                                    if ($pdo) {
                                        try {
                                            $upStmt = $pdo->prepare("UPDATE chapters SET images = ?, link = ? WHERE id = ?");
                                            $upStmt->execute([json_encode($cleanImages, JSON_UNESCAPED_SLASHES), str_replace('https://lazyteam.site', '', $fullChapUrl), $ch['id']]);
                                        } catch (Exception $e) {}
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        $ch['images'] = $cleanImages;

        sendJsonResponse(['success' => true, 'chapter' => $ch]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'message' => 'Lỗi SQL khi tải chương: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: TĂNG LƯỢT XEM TRỰC TIẾP TRONG SQL (INCREMENT VIEW)
// SQL là Source of Truth: UPDATE view = view + 1 và lấy lại giá trị view từ SQL
// -----------------------------------------------------------------------------
if ($action === 'increment_view' && $_SERVER['REQUEST_METHOD'] === 'POST') {
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
    $actualTeamId = $teamId;
    $daily = [];
    $monthly = [];

    try {
        if ($comicId) {
            // Tăng view trực tiếp trong SQL bằng UPDATE views đồng bộ theo ngày/tuần/tháng
            $stmt = $pdo->prepare("UPDATE comics SET views = views + ?, views_day = views_day + ?, views_week = views_week + ?, views_month = views_month + ?, daily_views = daily_views + ?, monthly_views = monthly_views + ? WHERE id = ? OR slug = ?");
            $stmt->execute([$increment, $increment, $increment, $increment, $increment, $increment, $comicId, $comicId]);

            // Lấy lại giá trị view từ SQL
            $getStmt = $pdo->prepare("SELECT id, views, team_id, team_name FROM comics WHERE id = ? OR slug = ? LIMIT 1");
            $getStmt->execute([$comicId, $comicId]);
            $row = $getStmt->fetch();
            if ($row) {
                $actualComicId = $row['id'];
                $updatedComicViews = intval($row['views']);
                if (!$teamId && !empty($row['team_id'])) {
                    $teamId = $row['team_id'];
                }
                if (!$teamId && !empty($row['team_name'])) {
                    $teamId = $row['team_name'];
                }
            }
        }

        if ($chapterId) {
            // Tăng view chương trong SQL
            $chapStmt = $pdo->prepare("UPDATE chapters SET views = views + ? WHERE id = ?");
            $chapStmt->execute([$increment, $chapterId]);

            $getChapStmt = $pdo->prepare("SELECT id, views, comic_id, team_id, team_name FROM chapters WHERE id = ? LIMIT 1");
            $getChapStmt->execute([$chapterId]);
            $chapRow = $getChapStmt->fetch();
            if ($chapRow) {
                $updatedChapterViews = intval($chapRow['views']);
                if (!$actualComicId && !empty($chapRow['comic_id'])) {
                    $actualComicId = $chapRow['comic_id'];
                }
                if (!$teamId && !empty($chapRow['team_id'])) {
                    $teamId = $chapRow['team_id'];
                }
                if (!$teamId && !empty($chapRow['team_name'])) {
                    $teamId = $chapRow['team_name'];
                }
            }
        }

        if (!$teamId && $actualComicId) {
            $cStmt = $pdo->prepare("SELECT team_id, team_name FROM comics WHERE id = ? LIMIT 1");
            $cStmt->execute([$actualComicId]);
            $cRow = $cStmt->fetch();
            if ($cRow) {
                if (!empty($cRow['team_id'])) $teamId = $cRow['team_id'];
                else if (!empty($cRow['team_name'])) $teamId = $cRow['team_name'];
            }
        }
        if (!$teamId) {
            $teamId = 'team-lessin-comic';
        }

        $todayStr = date('Y-m-d');
        $monthStr = date('Y-m'); // e.g. "2026-10"
        $monthSlash = date('m/Y'); // e.g. "10/2026"
        $curMonthNum = intval(date('m'));
        $curYear = intval(date('Y'));

        // 1. Lấy thông tin team hiện tại từ SQL (khớp id, name, slug hoặc nhóm mặc định)
        $getTeamStmt = $pdo->prepare("SELECT id, name, total_views, daily_views, monthly_views FROM scan_teams WHERE id = ? OR name = ? OR slug = ? OR (id = 'team-lessin-comic' AND ? IN ('team-leesin', 'team-lessin-comic', 'leesincomic', 'Lessin Comic', 'Leesin Comic')) LIMIT 1");
        $getTeamStmt->execute([$teamId, $teamId, $teamId, $teamId]);
        $teamRow = $getTeamStmt->fetch();

        if (!$teamRow) {
            $getTeamStmt2 = $pdo->prepare("SELECT id, name, total_views, daily_views, monthly_views FROM scan_teams WHERE id = 'team-lessin-comic' OR name = 'Lessin Comic' LIMIT 1");
            $getTeamStmt2->execute();
            $teamRow = $getTeamStmt2->fetch();
        }

        if ($teamRow) {
            $actualTeamId = $teamRow['id'];
            $newTotal = intval($teamRow['total_views']) + $increment;

            // Cập nhật daily_views JSON
            if (!empty($teamRow['daily_views'])) {
                $daily = is_string($teamRow['daily_views']) ? json_decode($teamRow['daily_views'], true) : $teamRow['daily_views'];
                if (!is_array($daily)) $daily = [];
            }
            $daily[$todayStr] = intval($daily[$todayStr] ?? 0) + $increment;

            // Cập nhật monthly_views JSON (đồng bộ đồng thời cả 2 key '2026-10' và '10/2026')
            if (!empty($teamRow['monthly_views'])) {
                $monthly = is_string($teamRow['monthly_views']) ? json_decode($teamRow['monthly_views'], true) : $teamRow['monthly_views'];
                if (!is_array($monthly)) $monthly = [];
            }
            $currentMonthVal = intval($monthly[$monthStr] ?? $monthly[$monthSlash] ?? 0) + $increment;
            $monthly[$monthStr] = $currentMonthVal;
            $monthly[$monthSlash] = $currentMonthVal;

            $dailyJson = json_encode($daily, JSON_UNESCAPED_SLASHES);
            $monthlyJson = json_encode($monthly, JSON_UNESCAPED_SLASHES);

            // Lưu lại vào bảng scan_teams
            $upTeamStmt = $pdo->prepare("UPDATE scan_teams SET total_views = ?, daily_views = ?, monthly_views = ? WHERE id = ?");
            $upTeamStmt->execute([$newTotal, $dailyJson, $monthlyJson, $actualTeamId]);

            try {
                $upTeamsAlt = $pdo->prepare("UPDATE teams SET total_views = ?, daily_views = ?, monthly_views = ? WHERE id = ?");
                $upTeamsAlt->execute([$newTotal, $dailyJson, $monthlyJson, $actualTeamId]);
            } catch (Exception $eT) {}

            $updatedTeamViews = $newTotal;
        } else {
            $teamStmt = $pdo->prepare("UPDATE scan_teams SET total_views = total_views + ? WHERE id = ? OR name = ?");
            $teamStmt->execute([$increment, $teamId, $teamId]);
        }

        // Ghi nhận lịch sử xem chi tiết vào views_history và view_logs
        try {
            $vhStmt = $pdo->prepare("INSERT INTO views_history (comic_id, chapter_id, team_id, view_date, views_count, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $vhStmt->execute([$actualComicId ?: ($comicId ?: 'comic'), $chapterId ?: null, $actualTeamId ?: ($teamId ?: 'team-lessin-comic'), $todayStr, $increment]);

            $logId = 'vl_' . microtime(true) . '_' . bin2hex(random_bytes(4));
            $vlStmt = $pdo->prepare("INSERT INTO view_logs (id, comic_id, chapter_id, team_id, multiplier, viewed_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $vlStmt->execute([$logId, $actualComicId ?: ($comicId ?: 'comic'), $chapterId ?: null, $actualTeamId ?: ($teamId ?: 'team-lessin-comic'), $increment]);
        } catch (Exception $eLog) {}

        sendJsonResponse([
            'success' => true,
            'message' => 'Tăng lượt xem trực tiếp trong SQL thành công!',
            'comicId' => $actualComicId,
            'views' => $updatedComicViews,
            'chapterId' => $chapterId,
            'chapterViews' => $updatedChapterViews,
            'teamId' => $actualTeamId ?: $teamId,
            'teamViews' => $updatedTeamViews,
            'dailyViews' => $daily,
            'monthlyViews' => $monthly,
            'views_2026_10' => $monthly['2026-10'] ?? 0,
            'monthViews' => $monthly['2026-10'] ?? 0,
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'message' => 'Lỗi tăng view SQL: ' . $e->getMessage()]);
    }
    exit();
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU / CẬP NHẬT BỘ TRUYỆN (SAVE COMIC / CREATE STORY)
// Dành cho cả Quản trị viên và Nhóm dịch sở hữu truyện
// -----------------------------------------------------------------------------
if (($action === 'save_comic' || $action === 'update_comic' || $action === 'add_comic' || $action === 'create_comic' || $action === 'create_story' || $action === 'update_story') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!$data || !is_array($data)) {
            sendJsonResponse(['success' => false, 'message' => 'Dữ liệu JSON gửi lên không hợp lệ hoặc rỗng!'], 400);
        }

        $title = trim($data['title'] ?? $data['name'] ?? '');
        if (empty($title)) {
            sendJsonResponse(['success' => false, 'message' => 'Tên truyện (title) không được để trống!'], 400);
        }

        // Tự động tạo slug nếu thiếu
        $slug = trim($data['slug'] ?? '');
        if (empty($slug)) {
            $cleanTitle = strtolower(preg_replace('/[^a-zA-Z0-9]+/u', '-', $title));
            $slug = trim($cleanTitle, '-') ?: ('comic-' . time());
        }

        // Tự động tạo ID nếu thiếu
        $comicId = trim($data['id'] ?? '');
        if (empty($comicId)) {
            $comicId = 'comic-' . round(microtime(true) * 1000);
        }

        // Chuẩn hóa ảnh bìa và banner
        $coverImage = $data['coverImage'] ?? $data['cover_image'] ?? $data['cover_url'] ?? $data['coverUrl'] ?? '';
        $bannerImage = $data['bannerImage'] ?? $data['banner_image'] ?? $data['banner_url'] ?? $data['bannerUrl'] ?? $coverImage;

        // Chuẩn hóa danh sách tác giả
        $authors = $data['authors'] ?? $data['author'] ?? ['Đang cập nhật'];
        if (is_string($authors)) {
            $authors = array_filter(array_map('trim', explode(',', $authors)));
        }
        if (!is_array($authors) || empty($authors)) {
            $authors = ['Đang cập nhật'];
        }

        // Chuẩn hóa thể loại
        $genres = $data['genres'] ?? $data['genre'] ?? $data['categories'] ?? ['Manhwa'];
        if (is_string($genres)) {
            $genres = array_filter(array_map('trim', explode(',', $genres)));
        }
        if (!is_array($genres) || empty($genres)) {
            $genres = ['Manhwa'];
        }

        $summary = $data['summary'] ?? $data['description'] ?? $data['content'] ?? '';
        $teamId = $data['teamId'] ?? $data['team_id'] ?? 'team-leesin';
        $teamName = $data['teamName'] ?? $data['team_name'] ?? 'Leesin Scans';
        $status = $data['status'] ?? 'Đang tiến hành';
        $views = intval($data['views'] ?? 0);
        $likes = intval($data['likes'] ?? 0);
        $follows = intval($data['follows'] ?? 0);
        $rating = floatval($data['rating'] ?? 5.0);
        $ratingCount = intval($data['ratingCount'] ?? $data['rating_count'] ?? 1);
        $isHot = !empty($data['isHot']) || !empty($data['is_hot']) ? 1 : 0;
        $isTrending = !empty($data['isTrending']) || !empty($data['is_trending']) ? 1 : 0;
        $is18Plus = !empty($data['is18Plus']) || !empty($data['is_18_plus']) ? 1 : 0;
        $seo = $data['seo'] ?? [];

        $existByIdStmt = $pdo->prepare("SELECT id, slug, updated_at, views FROM comics WHERE id = ? LIMIT 1");
        $existByIdStmt->execute([$comicId]);
        $existRow = $existByIdStmt->fetch();

        if (!$existRow) {
            // Kiểm tra xem slug đã tồn tại ở bộ truyện khác chưa để tránh lỗi Duplicate entry idx_comic_slug
            $existBySlugStmt = $pdo->prepare("SELECT id, slug, updated_at, views FROM comics WHERE slug = ? LIMIT 1");
            $existBySlugStmt->execute([$slug]);
            $slugRow = $existBySlugStmt->fetch();
            if ($slugRow) {
                if (empty($data['id'])) {
                    $existRow = $slugRow;
                    $comicId = $slugRow['id'];
                } else {
                    $slug = $slug . '-' . substr(preg_replace('/[^0-9]/', '', $comicId) ?: (string)time(), -5);
                }
            }
        }

        $nowIso = date('Y-m-d H:i:s');
        $rawUpdatedAt = (!empty($data['updatedAt']) && $data['updatedAt'] !== 'Vừa xong')
            ? $data['updatedAt']
            : ($existRow['updated_at'] ?? $nowIso);
        $resolvedUpdatedAt = normalizeMysqlDateTime($rawUpdatedAt, false);
        $effectiveViews = max($views, intval($existRow['views'] ?? 0));

        $seoTitle = $seo['metaTitle'] ?? $data['seo_title'] ?? $title;
        $seoDesc = $seo['metaDesc'] ?? $data['seo_desc'] ?? $summary;
        $seoKeyword = $seo['focusKeyword'] ?? $data['seo_keyword'] ?? $title;
        $canonicalUrl = $seo['canonicalUrl'] ?? $data['canonical_url'] ?? ('https://leesincomic.com/truyen/' . $slug);

        safeAddColumn($pdo, 'comics', 'seo', 'JSON NULL');
        safeAddColumn($pdo, 'comics', 'seo_title', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'seo_desc', 'TEXT NULL');
        safeAddColumn($pdo, 'comics', 'seo_keyword', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'canonical_url', 'VARCHAR(255) NULL');
        safeAddColumn($pdo, 'comics', 'is_18_plus', 'TINYINT(1) DEFAULT 0');

        try {
            $stmt = $pdo->prepare("
                INSERT INTO comics (
                    id, title, slug, other_names, cover_image, banner_image,
                    authors, status, genres, summary, team_id, team_name,
                    views, likes, follows, rating, rating_count, is_hot, is_trending, is_18_plus,
                    seo, seo_title, seo_desc, seo_keyword, canonical_url, updated_at
                ) VALUES (
                    :id, :title, :slug, :other_names, :cover_image, :banner_image,
                    :authors, :status, :genres, :summary, :team_id, :team_name,
                    :views, :likes, :follows, :rating, :rating_count, :is_hot, :is_trending, :is_18_plus,
                    :seo, :seo_title, :seo_desc, :seo_keyword, :canonical_url, :updated_at
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
                    seo = VALUES(seo),
                    seo_title = VALUES(seo_title),
                    seo_desc = VALUES(seo_desc),
                    seo_keyword = VALUES(seo_keyword),
                    canonical_url = VALUES(canonical_url),
                    updated_at = VALUES(updated_at)
            ");

            $stmt->execute([
                ':id' => $comicId,
                ':title' => $title,
                ':slug' => $slug,
                ':other_names' => json_encode($data['otherNames'] ?? $data['other_names'] ?? [], JSON_UNESCAPED_UNICODE),
                ':cover_image' => $coverImage,
                ':banner_image' => $bannerImage,
                ':authors' => json_encode($authors, JSON_UNESCAPED_UNICODE),
                ':status' => $status,
                ':genres' => json_encode($genres, JSON_UNESCAPED_UNICODE),
                ':summary' => $summary,
                ':team_id' => $teamId,
                ':team_name' => $teamName,
                ':views' => $effectiveViews,
                ':likes' => $likes,
                ':follows' => $follows,
                ':rating' => $rating,
                ':rating_count' => $ratingCount,
                ':is_hot' => $isHot,
                ':is_trending' => $isTrending,
                ':is_18_plus' => $is18Plus,
                ':seo' => json_encode($seo, JSON_UNESCAPED_UNICODE),
                ':seo_title' => $seoTitle,
                ':seo_desc' => $seoDesc,
                ':seo_keyword' => $seoKeyword,
                ':canonical_url' => $canonicalUrl,
                ':updated_at' => $resolvedUpdatedAt,
            ]);
        } catch (Exception $insertEx) {
            // Fallback cho bảng comics chuẩn cũ không có cột seo JSON
            $stmtFallback = $pdo->prepare("
                INSERT INTO comics (
                    id, title, slug, other_names, cover_image, banner_image,
                    authors, status, genres, summary, team_id, team_name,
                    views, likes, follows, rating, rating_count, is_hot, is_trending, is_18_plus, updated_at
                ) VALUES (
                    :id, :title, :slug, :other_names, :cover_image, :banner_image,
                    :authors, :status, :genres, :summary, :team_id, :team_name,
                    :views, :likes, :follows, :rating, :rating_count, :is_hot, :is_trending, :is_18_plus, :updated_at
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
                    is_hot = VALUES(is_hot),
                    is_trending = VALUES(is_trending),
                    is_18_plus = VALUES(is_18_plus),
                    updated_at = VALUES(updated_at)
            ");
            $stmtFallback->execute([
                ':id' => $comicId,
                ':title' => $title,
                ':slug' => $slug,
                ':other_names' => json_encode($data['otherNames'] ?? $data['other_names'] ?? [], JSON_UNESCAPED_UNICODE),
                ':cover_image' => $coverImage,
                ':banner_image' => $bannerImage,
                ':authors' => json_encode($authors, JSON_UNESCAPED_UNICODE),
                ':status' => $status,
                ':genres' => json_encode($genres, JSON_UNESCAPED_UNICODE),
                ':summary' => $summary,
                ':team_id' => $teamId,
                ':team_name' => $teamName,
                ':views' => $effectiveViews,
                ':likes' => $likes,
                ':follows' => $follows,
                ':rating' => $rating,
                ':rating_count' => $ratingCount,
                ':is_hot' => $isHot,
                ':is_trending' => $isTrending,
                ':is_18_plus' => $is18Plus,
                ':updated_at' => $resolvedUpdatedAt,
            ]);
        }

        // Nếu truyện gửi kèm danh sách chapters, lưu luôn các chapters
        if (isset($data['chapters']) && is_array($data['chapters']) && count($data['chapters']) > 0) {
            $chapInsert = $pdo->prepare("
                INSERT INTO chapters (
                    id, comic_id, comic_title, chapter_number, title,
                    is_password_protected, password, scheduled_date, views,
                    images, team_id, team_name, created_at, updated_at
                ) VALUES (
                    :id, :comic_id, :comic_title, :chapter_number, :title,
                    :is_password_protected, :password, :scheduled_date, :views,
                    :images, :team_id, :team_name, :created_at, :updated_at
                ) ON DUPLICATE KEY UPDATE
                    comic_title = VALUES(comic_title),
                    chapter_number = VALUES(chapter_number),
                    title = VALUES(title),
                    images = VALUES(images),
                    team_id = VALUES(team_id),
                    team_name = VALUES(team_name),
                    updated_at = VALUES(updated_at)
            ");
            foreach ($data['chapters'] as $ch) {
                if (empty($ch['id'])) continue;
                $chCreated = normalizeMysqlDateTime($ch['createdAt'] ?? $nowIso, false);
                $chUpdated = normalizeMysqlDateTime($ch['updatedAt'] ?? $chCreated, false);
                $chScheduled = normalizeMysqlDateTime($ch['scheduledDate'] ?? null, true);
                $chapInsert->execute([
                    ':id' => $ch['id'],
                    ':comic_id' => $comicId,
                    ':comic_title' => $title,
                    ':chapter_number' => floatval($ch['chapterNumber'] ?? $ch['chapter_number'] ?? 1),
                    ':title' => $ch['title'] ?? ('Chương ' . ($ch['chapterNumber'] ?? 1)),
                    ':is_password_protected' => !empty($ch['isPasswordProtected']) ? 1 : 0,
                    ':password' => $ch['password'] ?? null,
                    ':scheduled_date' => $chScheduled,
                    ':views' => intval($ch['views'] ?? 0),
                    ':images' => json_encode($ch['images'] ?? [], JSON_UNESCAPED_SLASHES),
                    ':team_id' => $ch['teamId'] ?? $teamId,
                    ':team_name' => $ch['teamName'] ?? $teamName,
                    ':created_at' => $chCreated,
                    ':updated_at' => $chUpdated,
                ]);
            }
        }

        // Tự động cập nhật sitemap.xml
        try {
            autoGeneratePhysicalSitemaps($pdo);
        } catch (Exception $eSm) {}

        sendJsonResponse([
            'success' => true,
            'message' => 'Lưu thông tin truyện thành công vào MySQL Database!',
            'comicId' => $comicId,
            'slug' => $slug,
        ]);
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Lỗi SQL khi lưu truyện: ' . $e->getMessage(),
        ], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU / SỬA CHƯƠNG TRUYỆN (SAVE CHAPTER)
// -----------------------------------------------------------------------------
if (($action === 'save_chapter' || $action === 'add_chapter' || $action === 'update_chapter') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        if (!$data || !isset($data['id']) || !isset($data['comicId'])) {
            sendJsonResponse(['success' => false, 'message' => 'Dữ liệu chương không hợp lệ (thiếu id hoặc comicId)!'], 400);
        }

        $nowStr = date('Y-m-d H:i:s');
        $targetComicId = trim($data['comicId'] ?? $data['comic_id'] ?? '');
        $cleanIdWithoutPrefix = preg_replace('/^comic-/', '', $targetComicId);
        $cleanIdWithPrefix = 'comic-' . $cleanIdWithoutPrefix;

        $checkComicStmt = $pdo->prepare("SELECT id, title, slug FROM comics WHERE id = ? OR slug = ? OR id = ? OR slug = ? LIMIT 1");
        $checkComicStmt->execute([$targetComicId, $targetComicId, $cleanIdWithPrefix, $cleanIdWithoutPrefix]);
        $matchedComic = $checkComicStmt->fetch();
        if ($matchedComic) {
            $targetComicId = $matchedComic['id'];
        } elseif (!empty($data['comicTitle'])) {
            $checkTitleStmt = $pdo->prepare("SELECT id, title, slug FROM comics WHERE LOWER(title) = LOWER(?) LIMIT 1");
            $checkTitleStmt->execute([trim($data['comicTitle'])]);
            $matchedComic = $checkTitleStmt->fetch();
            if ($matchedComic) {
                $targetComicId = $matchedComic['id'];
            }
        }

        if (!$matchedComic) {
            $cTitle = !empty($data['comicTitle']) ? trim($data['comicTitle']) : 'Truyện Mới';
            $insComic = $pdo->prepare("
                INSERT INTO comics (id, title, slug, cover_image, genres, team_id, team_name, created_at, updated_at)
                VALUES (?, ?, ?, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600', '[]', ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title = VALUES(title)
            ");
            $insComic->execute([$targetComicId, $cTitle, $targetComicId, $data['teamId'] ?? '', $data['teamName'] ?? '', $nowStr, $nowStr]);
        }

        $targetChapNum = floatval($data['chapterNumber'] ?? $data['chapter_number'] ?? 1);
        $existChap = null;
        try {
            $existChapStmt = $pdo->prepare("SELECT id, created_at, updated_at FROM chapters WHERE id = ? OR (comic_id = ? AND chapter_number = ?) LIMIT 1");
            $existChapStmt->execute([$data['id'], $targetComicId, $targetChapNum]);
            $existChap = $existChapStmt->fetch();
        } catch (Exception $eExist) {
            safeAddColumn($pdo, 'chapters', 'updated_at', 'VARCHAR(64) NULL');
            try {
                $existChapStmt = $pdo->prepare("SELECT id, created_at FROM chapters WHERE id = ? OR (comic_id = ? AND chapter_number = ?) LIMIT 1");
                $existChapStmt->execute([$data['id'], $targetComicId, $targetChapNum]);
                $existChap = $existChapStmt->fetch();
            } catch (Exception $eExist2) {}
        }
        if ($existChap && !empty($existChap['id'])) {
            $data['id'] = $existChap['id'];
        }

        if ($existChap) {
            $rawCreated = (!empty($existChap['created_at']) && $existChap['created_at'] !== 'Vừa xong')
                ? $existChap['created_at']
                : ((!empty($data['createdAt']) && $data['createdAt'] !== 'Vừa xong') ? $data['createdAt'] : $nowStr);
            $rawUpdated = (!empty($data['updatedAt']) && $data['updatedAt'] !== 'Vừa xong')
                ? $data['updatedAt']
                : $nowStr;
        } else {
            $rawCreated = (!empty($data['createdAt']) && $data['createdAt'] !== 'Vừa xong')
                ? $data['createdAt']
                : $nowStr;
            $rawUpdated = (!empty($data['updatedAt']) && $data['updatedAt'] !== 'Vừa xong')
                ? $data['updatedAt']
                : $rawCreated;
        }

        $resolvedCreatedAt = normalizeMysqlDateTime($rawCreated, false);
        $resolvedUpdatedAt = normalizeMysqlDateTime($rawUpdated, false);
        $resolvedScheduledDate = normalizeMysqlDateTime($data['scheduledDate'] ?? null, true);

        try {
            $stmt = $pdo->prepare("
                INSERT INTO chapters (
                    id, comic_id, comic_title, chapter_number, title,
                    is_password_protected, password, scheduled_date, views,
                    images, team_id, team_name, created_at, updated_at
                ) VALUES (
                    :id, :comic_id, :comic_title, :chapter_number, :title,
                    :is_password_protected, :password, :scheduled_date, :views,
                    :images, :team_id, :team_name, :created_at, :updated_at
                ) ON DUPLICATE KEY UPDATE
                    comic_title = VALUES(comic_title),
                    chapter_number = VALUES(chapter_number),
                    title = VALUES(title),
                    is_password_protected = VALUES(is_password_protected),
                    password = VALUES(password),
                    scheduled_date = VALUES(scheduled_date),
                    images = VALUES(images),
                    team_id = VALUES(team_id),
                    team_name = VALUES(team_name),
                    updated_at = VALUES(updated_at)
            ");

            $stmt->execute([
                ':id' => $data['id'],
                ':comic_id' => $targetComicId,
                ':comic_title' => $data['comicTitle'] ?? ($matchedComic['title'] ?? ''),
                ':chapter_number' => $targetChapNum,
                ':title' => $data['title'] ?? ('Chương ' . $targetChapNum),
                ':is_password_protected' => !empty($data['isPasswordProtected']) ? 1 : 0,
                ':password' => $data['password'] ?? null,
                ':scheduled_date' => $resolvedScheduledDate,
                ':views' => intval($data['views'] ?? 0),
                ':images' => json_encode($data['images'] ?? [], JSON_UNESCAPED_SLASHES),
                ':team_id' => $data['teamId'] ?? '',
                ':team_name' => $data['teamName'] ?? '',
                ':created_at' => $resolvedCreatedAt,
                ':updated_at' => $resolvedUpdatedAt,
            ]);
        } catch (Exception $eIns) {
            safeAddColumn($pdo, 'chapters', 'updated_at', 'VARCHAR(64) NULL');
            try {
                $stmtRetry = $pdo->prepare("
                    INSERT INTO chapters (
                        id, comic_id, comic_title, chapter_number, title,
                        is_password_protected, password, scheduled_date, views,
                        images, team_id, team_name, created_at, updated_at
                    ) VALUES (
                        :id, :comic_id, :comic_title, :chapter_number, :title,
                        :is_password_protected, :password, :scheduled_date, :views,
                        :images, :team_id, :team_name, :created_at, :updated_at
                    ) ON DUPLICATE KEY UPDATE
                        comic_title = VALUES(comic_title),
                        chapter_number = VALUES(chapter_number),
                        title = VALUES(title),
                        is_password_protected = VALUES(is_password_protected),
                        password = VALUES(password),
                        scheduled_date = VALUES(scheduled_date),
                        images = VALUES(images),
                        team_id = VALUES(team_id),
                        team_name = VALUES(team_name),
                        updated_at = VALUES(updated_at)
                ");
                $stmtRetry->execute([
                    ':id' => $data['id'],
                    ':comic_id' => $targetComicId,
                    ':comic_title' => $data['comicTitle'] ?? ($matchedComic['title'] ?? ''),
                    ':chapter_number' => $targetChapNum,
                    ':title' => $data['title'] ?? ('Chương ' . $targetChapNum),
                    ':is_password_protected' => !empty($data['isPasswordProtected']) ? 1 : 0,
                    ':password' => $data['password'] ?? null,
                    ':scheduled_date' => $resolvedScheduledDate,
                    ':views' => intval($data['views'] ?? 0),
                    ':images' => json_encode($data['images'] ?? [], JSON_UNESCAPED_SLASHES),
                    ':team_id' => $data['teamId'] ?? '',
                    ':team_name' => $data['teamName'] ?? '',
                    ':created_at' => $resolvedCreatedAt,
                    ':updated_at' => $resolvedUpdatedAt,
                ]);
            } catch (Exception $eIns2) {
                // Fallback nếu bảng chapters chưa có cột updated_at
                $stmtFallback = $pdo->prepare("
                    INSERT INTO chapters (
                        id, comic_id, comic_title, chapter_number, title,
                        is_password_protected, password, scheduled_date, views,
                        images, team_id, team_name, created_at
                    ) VALUES (
                        :id, :comic_id, :comic_title, :chapter_number, :title,
                        :is_password_protected, :password, :scheduled_date, :views,
                        :images, :team_id, :team_name, :created_at
                    ) ON DUPLICATE KEY UPDATE
                        comic_title = VALUES(comic_title),
                        chapter_number = VALUES(chapter_number),
                        title = VALUES(title),
                        is_password_protected = VALUES(is_password_protected),
                        password = VALUES(password),
                        scheduled_date = VALUES(scheduled_date),
                        images = VALUES(images),
                        team_id = VALUES(team_id),
                        team_name = VALUES(team_name)
                ");
                $stmtFallback->execute([
                    ':id' => $data['id'],
                    ':comic_id' => $targetComicId,
                    ':comic_title' => $data['comicTitle'] ?? ($matchedComic['title'] ?? ''),
                    ':chapter_number' => $targetChapNum,
                    ':title' => $data['title'] ?? ('Chương ' . $targetChapNum),
                    ':is_password_protected' => !empty($data['isPasswordProtected']) ? 1 : 0,
                    ':password' => $data['password'] ?? null,
                    ':scheduled_date' => $resolvedScheduledDate,
                    ':views' => intval($data['views'] ?? 0),
                    ':images' => json_encode($data['images'] ?? [], JSON_UNESCAPED_SLASHES),
                    ':team_id' => $data['teamId'] ?? '',
                    ':team_name' => $data['teamName'] ?? '',
                    ':created_at' => $resolvedCreatedAt,
                ]);
            }
        }

        // Cập nhật lại thời gian của truyện bằng thời gian thực tế của chương
        $upComic = $pdo->prepare("UPDATE comics SET updated_at = ? WHERE id = ?");
        $upComic->execute([$resolvedUpdatedAt, $targetComicId]);

        // Tự động tạo notification trong SQL
        try {
            $comicId = $data['comicId'];
            $cTitle = $data['comicTitle'] ?? 'Truyện';
            $chapNum = floatval($data['chapterNumber'] ?? 1);
            $uploaderId = $data['userId'] ?? '';

            $fStmt = $pdo->prepare("SELECT user_id FROM followed_comics WHERE comic_id = ?");
            $fStmt->execute([$comicId]);
            $followers = $fStmt->fetchAll(PDO::FETCH_COLUMN);

            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (id, recipient_user_id, recipient_role, type, title, content, sender_name, comic_id, comic_title, chapter_number, is_read, created_at)
                VALUES (:id, :ruid, 'READER', 'CHAPTER', :title, :content, :sname, :cid, :ctitle, :cnum, 0, :created)
            ");

            $nowIso = date('Y-m-d H:i:s');
            foreach ($followers as $followerId) {
                if (!empty($followerId) && $followerId !== $uploaderId) {
                    $nId = 'notif-' . round(microtime(true) * 1000) . '-ch-' . substr(md5(uniqid($followerId, true)), 0, 8);
                    $notifStmt->execute([
                        ':id' => $nId,
                        ':ruid' => $followerId,
                        ':title' => "Chương mới: {$cTitle}",
                        ':content' => "Bộ truyện bạn theo dõi \"{$cTitle}\" vừa ra mắt Chap {$chapNum}!",
                        ':sname' => $data['teamName'] ?? 'Nhóm dịch',
                        ':cid' => $comicId,
                        ':ctitle' => $cTitle,
                        ':cnum' => $chapNum,
                        ':created' => $nowIso,
                    ]);
                }
            }

            $adminNId = 'notif-' . round(microtime(true) * 1000) . '-admch-' . substr(md5(uniqid('admin', true)), 0, 6);
            $adminStmt = $pdo->prepare("
                INSERT INTO notifications (id, recipient_role, type, title, content, sender_name, comic_id, comic_title, chapter_number, is_read, created_at)
                VALUES (:id, 'ADMIN', 'CHAPTER', :title, :content, :sname, :cid, :ctitle, :cnum, 0, :created)
            ");
            $adminStmt->execute([
                ':id' => $adminNId,
                ':title' => "Xuất bản chương mới: {$cTitle}",
                ':content' => ($data['teamName'] ?? 'Nhóm dịch') . " vừa xuất bản Chap {$chapNum} cho bộ truyện \"{$cTitle}\"",
                ':sname' => $data['teamName'] ?? 'Nhóm dịch',
                ':cid' => $comicId,
                ':ctitle' => $cTitle,
                ':cnum' => $chapNum,
                ':created' => $nowIso,
            ]);
        } catch (Exception $e) {}

        try {
            autoGeneratePhysicalSitemaps($pdo);
        } catch (Exception $eSm) {}

        sendJsonResponse(['success' => true, 'message' => 'Đã lưu / cập nhật chương thành công vào MySQL!']);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'message' => 'Lỗi SQL khi lưu chương: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA CHƯƠNG (DELETE CHAPTER)
// -----------------------------------------------------------------------------
if ($action === 'delete_chapter' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $chapId = $data['chapterId'] ?? '';
    if ($chapId) {
        $stmt = $pdo->prepare("DELETE FROM chapters WHERE id = ?");
        $stmt->execute([$chapId]);
        autoGeneratePhysicalSitemaps($pdo);
        sendJsonResponse(['success' => true, 'message' => 'Đã xóa chương khỏi cơ sở dữ liệu!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA TRUYỆN (DELETE COMIC)
// -----------------------------------------------------------------------------
if ($action === 'delete_comic' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $comicId = $data['comicId'] ?? '';
    if ($comicId) {
        $stmt1 = $pdo->prepare("DELETE FROM chapters WHERE comic_id = ?");
        $stmt1->execute([$comicId]);

        $stmt2 = $pdo->prepare("DELETE FROM comics WHERE id = ?");
        $stmt2->execute([$comicId]);

        autoGeneratePhysicalSitemaps($pdo);
        sendJsonResponse(['success' => true, 'message' => 'Đã xóa truyện và toàn bộ chương!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY CÀI ĐẶT WEBSITE (GET SETTINGS)
// Hỗ trợ đọc cả bảng site_settings (JSON) và system_settings (key-value)
// -----------------------------------------------------------------------------
if ($action === 'get_settings' || $action === 'get_site_settings') {
    $settings = null;

    // 1. Ưu tiên đọc từ site_settings (bản ghi JSON 'main_settings')
    try {
        $stmt = $pdo->prepare("SELECT setting_val FROM site_settings WHERE setting_key = 'main_settings'");
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row && !empty($row['setting_val'])) {
            $decoded = json_decode($row['setting_val'], true);
            if (is_array($decoded)) {
                $settings = $decoded;
            }
        }
    } catch (Exception $e) {}

    // 2. Nếu chưa có, đọc từ bảng system_settings (dạng từng dòng key-value)
    if (empty($settings)) {
        try {
            $stmtSys = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
            $rows = $stmtSys->fetchAll();
            if (!empty($rows)) {
                $settings = [];
                foreach ($rows as $r) {
                    $key = $r['setting_key'];
                    $val = $r['setting_value'];
                    if (is_string($val) && strlen($val) > 1 && ($val[0] === '{' || $val[0] === '[')) {
                        $dec = json_decode($val, true);
                        if ($dec !== null) $val = $dec;
                    }
                    $settings[$key] = $val;
                }
            }
        } catch (Exception $e) {}
    }

    sendJsonResponse(['success' => true, 'settings' => $settings]);
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU CÀI ĐẶT WEBSITE (SAVE SETTINGS)
// Tương thích 100% mọi phiên bản MySQL / MariaDB, dùng REPLACE INTO tránh lỗi PDO HY093
// -----------------------------------------------------------------------------
if (($action === 'save_settings' || $action === 'save_site_settings') && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if ($data && is_array($data)) {
        $jsonVal = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // 1. Lưu vào site_settings bằng REPLACE INTO (An toàn tuyệt đối, không trùng lặp tham số)
        try {
            $stmt = $pdo->prepare("REPLACE INTO site_settings (setting_key, setting_val) VALUES ('main_settings', :val)");
            $stmt->execute([':val' => $jsonVal]);
        } catch (Exception $e) {
            // Fallback nếu chưa có bảng
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (setting_key VARCHAR(64) PRIMARY KEY, setting_val LONGTEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $stmt = $pdo->prepare("REPLACE INTO site_settings (setting_key, setting_val) VALUES ('main_settings', :val)");
                $stmt->execute([':val' => $jsonVal]);
            } catch (Exception $e2) {}
        }

        // 2. Đồng thời lưu vào system_settings để tương thích cả 2 chuẩn lưu trữ
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value LONGTEXT, description VARCHAR(255), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $stmtSys = $pdo->prepare("REPLACE INTO system_settings (setting_key, setting_value) VALUES (:key, :val)");
            foreach ($data as $k => $v) {
                $valStr = is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $stmtSys->execute([':key' => $k, ':val' => $valStr]);
            }
        } catch (Exception $e) {}

        sendJsonResponse(['success' => true, 'message' => 'Lưu cấu hình hệ thống & Logo/Favicon thành công vào MySQL!']);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Dữ liệu cấu hình không hợp lệ!'], 400);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY DANH SÁCH NHÓM DỊCH & THỐNG KÊ VIEW THEO THÁNG (GET TEAMS)
// -----------------------------------------------------------------------------
if ($action === 'get_teams' || $action === 'get_team_views') {
    $teams = [];
    try {
        $stmt = $pdo->query("SELECT * FROM scan_teams ORDER BY total_views DESC");
        $teams = $stmt->fetchAll();
    } catch (Exception $e) {}
    if (empty($teams)) {
        try {
            $stmtAlt = $pdo->query("SELECT * FROM teams ORDER BY total_views DESC");
            $teams = $stmtAlt->fetchAll();
        } catch (Exception $eAlt) {}
    }

    $curMonthKey = date('Y-m'); // "2026-10"
    $curMonthSlash = date('m/Y'); // "10/2026"

    // Tối ưu hóa: Lấy tổng view tháng của tất cả nhóm dịch trong 1 query duy nhất thay vì lặp qua từng nhóm
    $vhViewsByTeam = [];
    try {
        $vhStmt = $pdo->query("SELECT team_id, COALESCE(SUM(views_count), 0) as vh_views FROM views_history WHERE view_date >= '2026-10-01' AND view_date <= '2026-10-31' GROUP BY team_id");
        while ($row = $vhStmt->fetch()) {
            $vhViewsByTeam[$row['team_id']] = intval($row['vh_views']);
        }
    } catch (Exception $eVh) {}

    foreach ($teams as &$t) {
        $rawDaily = $t['daily_views'] ?? $t['daily_views_json'] ?? '{}';
        $daily = is_string($rawDaily) ? json_decode($rawDaily ?: '{}', true) : ($rawDaily ?? []);
        if (!is_array($daily)) $daily = [];
        $rawMonthly = $t['monthly_views'] ?? $t['monthly_views_json'] ?? '{}';
        $monthly = is_string($rawMonthly) ? json_decode($rawMonthly ?: '{}', true) : ($rawMonthly ?? []);
        if (!is_array($monthly)) $monthly = [];

        // Tính tổng lượt xem từ daily_views trong tháng 10/2026
        $daily10 = 0;
        foreach ($daily as $dStr => $cnt) {
            if (strpos($dStr, '2026-10') === 0 || strpos($dStr, '-10-') !== false || substr($dStr, -7) === '10/2026') {
                $daily10 += intval($cnt);
            }
        }

        // Tính tổng lượt xem từ bảng views_history theo tháng 10/2026 (GMT+7 Asia/Ho_Chi_Minh)
        $vhCount = max(
            intval($vhViewsByTeam[$t['id']] ?? 0),
            intval($vhViewsByTeam[$t['name']] ?? 0)
        );
        if ($vhCount > $daily10) {
            $daily10 = $vhCount;
        }

        $m10Views = max(
            intval($monthly['2026-10'] ?? 0),
            intval($monthly['10/2026'] ?? 0),
            $daily10
        );

        $monthly['2026-10'] = $m10Views;
        $monthly['10/2026'] = $m10Views;

        $t['dailyViews'] = $daily;
        $t['monthlyViews'] = $monthly;
        $t['views_2026_10'] = $m10Views;
        $t['views_10_2026'] = $m10Views;
        $t['months'] = [
            '2026-10' => $m10Views,
            '10/2026' => $m10Views,
            'T10/2026' => $m10Views,
        ];
        $t['leaderId'] = $t['leader_id'];
        $t['leaderName'] = $t['leader_name'];
        $t['totalViews'] = intval($t['total_views']);
        $t['follows'] = intval($t['follows'] ?? 0);
        $t['followsCount'] = intval($t['follows'] ?? 0);
        $t['donateInfo'] = $t['donate_info'] ?? '';
        $t['donateQr'] = $t['donate_qr'] ?? '';
        $t['description'] = $t['bio'] ?? '';
    }
    sendJsonResponse(['success' => true, 'teams' => $teams]);
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY THỐNG KÊ DASHBOARD (GET DASHBOARD STATS)
// -----------------------------------------------------------------------------
if ($action === 'get_dashboard_stats') {
    $cStmt = $pdo->query("SELECT COUNT(*) as total_comics, COALESCE(SUM(views), 0) as total_views FROM comics");
    $cRow = $cStmt->fetch();
    $totalComics = intval($cRow['total_comics'] ?? 0);
    $totalPlatformViews = intval($cRow['total_views'] ?? 0);

    $chStmt = $pdo->query("SELECT COUNT(*) as total_chapters FROM chapters");
    $totalChapters = intval($chStmt->fetchColumn() ?? 0);

    $uStmt = $pdo->query("SELECT COUNT(*) as total_users FROM users");
    $totalUsers = intval($uStmt->fetchColumn() ?? 0);

    $tStmt = $pdo->query("SELECT COUNT(*) as active_teams FROM scan_teams");
    $activeTeamsCount = intval($tStmt->fetchColumn() ?? 0);

    sendJsonResponse([
        'success' => true,
        'totalPlatformViews' => $totalPlatformViews,
        'totalComics' => $totalComics,
        'totalChapters' => $totalChapters,
        'totalUsers' => $totalUsers,
        'activeTeamsCount' => $activeTeamsCount,
    ]);
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU NHÓM DỊCH (SAVE TEAM)
// -----------------------------------------------------------------------------
if ($action === 'save_team' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && isset($data['id'])) {
        // Tự động kiểm tra thêm cột donate_info, donate_qr, follows nếu chưa có
        try {
            $pdo->exec("ALTER TABLE scan_teams ADD COLUMN IF NOT EXISTS donate_info TEXT NULL");
            $pdo->exec("ALTER TABLE scan_teams ADD COLUMN IF NOT EXISTS donate_qr TEXT NULL");
            $pdo->exec("ALTER TABLE scan_teams ADD COLUMN IF NOT EXISTS follows INT DEFAULT 0");
        } catch (Exception $e) {}

        $teamParams = [
            ':id' => $data['id'],
            ':name' => $data['name'] ?? '',
            ':slug' => $data['slug'] ?? '',
            ':avatar' => $data['avatar'] ?? '',
            ':bio' => $data['bio'] ?? ($data['description'] ?? ''),
            ':donate_info' => $data['donateInfo'] ?? '',
            ':donate_qr' => $data['donateQr'] ?? '',
            ':leader_id' => $data['leaderId'] ?? '',
            ':leader_name' => $data['leaderName'] ?? '',
            ':total_views' => $data['totalViews'] ?? 0,
            ':follows' => $data['follows'] ?? ($data['followsCount'] ?? 0),
            ':daily_views' => json_encode($data['dailyViews'] ?? []),
            ':monthly_views' => json_encode($data['monthlyViews'] ?? []),
        ];
        try {
            $stmt = $pdo->prepare("INSERT INTO scan_teams (id, name, slug, avatar, bio, donate_info, donate_qr, leader_id, leader_name, total_views, follows, daily_views, monthly_views)
                VALUES (:id, :name, :slug, :avatar, :bio, :donate_info, :donate_qr, :leader_id, :leader_name, :total_views, :follows, :daily_views, :monthly_views)
                ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), avatar=VALUES(avatar), bio=VALUES(bio), donate_info=VALUES(donate_info), donate_qr=VALUES(donate_qr),
                leader_id=VALUES(leader_id), leader_name=VALUES(leader_name), total_views=VALUES(total_views), follows=VALUES(follows), daily_views=VALUES(daily_views), monthly_views=VALUES(monthly_views)");
            $stmt->execute($teamParams);
        } catch (Exception $eSt) {}
        try {
            $stmtAlt = $pdo->prepare("INSERT INTO teams (id, name, slug, avatar, bio, donate_info, donate_qr, leader_id, leader_name, total_views, follows, daily_views, monthly_views)
                VALUES (:id, :name, :slug, :avatar, :bio, :donate_info, :donate_qr, :leader_id, :leader_name, :total_views, :follows, :daily_views, :monthly_views)
                ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), avatar=VALUES(avatar), bio=VALUES(bio), donate_info=VALUES(donate_info), donate_qr=VALUES(donate_qr),
                leader_id=VALUES(leader_id), leader_name=VALUES(leader_name), total_views=VALUES(total_views), follows=VALUES(follows), daily_views=VALUES(daily_views), monthly_views=VALUES(monthly_views)");
            $stmtAlt->execute($teamParams);
        } catch (Exception $eT) {}
        sendJsonResponse(['success' => true, 'message' => 'Lưu thông tin nhóm dịch thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY DANH SÁCH BÌNH LUẬN (GET COMMENTS)
// -----------------------------------------------------------------------------
if ($action === 'get_comments') {
    $comicId = $_GET['comic_id'] ?? '';
    $chapterId = $_GET['chapter_id'] ?? '';
    $limit = intval($_GET['limit'] ?? 50);

    $sql = "SELECT * FROM comments WHERE 1=1";
    $params = [];
    if ($comicId) {
        $sql .= " AND comic_id = ?";
        $params[] = $comicId;
    }
    if ($chapterId) {
        $sql .= " AND chapter_id = ?";
        $params[] = $chapterId;
    }
    $sql .= " ORDER BY created_at DESC LIMIT " . ($limit > 0 ? $limit : 50);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $comments = $stmt->fetchAll();
    foreach ($comments as &$cm) {
        $cm['comicId'] = $cm['comic_id'];
        $cm['chapterId'] = $cm['chapter_id'];
        $cm['userId'] = $cm['user_id'];
        $cm['userName'] = $cm['user_name'];
        $cm['userAvatar'] = $cm['user_avatar'];
        $cm['userRole'] = $cm['user_role'];
        $cm['comicTitle'] = $cm['comic_title'];
        $cm['chapterNumber'] = floatval($cm['chapter_number']);
        $cm['createdAt'] = $cm['created_at'];
        $cm['likes'] = intval($cm['likes']);
    }
    sendJsonResponse(['success' => true, 'comments' => $comments]);
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU BÌNH LUẬN (SAVE COMMENT)
// -----------------------------------------------------------------------------
if ($action === 'save_comment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && isset($data['id'])) {
        $stmt = $pdo->prepare("INSERT INTO comments (id, comic_id, chapter_id, user_id, user_name, user_avatar, user_role, content, likes, dislikes, comic_title, chapter_number, created_at)
            VALUES (:id, :comic_id, :chapter_id, :user_id, :user_name, :user_avatar, :user_role, :content, :likes, :dislikes, :comic_title, :chapter_number, :created_at)");
        $stmt->execute([
            ':id' => $data['id'],
            ':comic_id' => $data['comicId'] ?? '',
            ':chapter_id' => $data['chapterId'] ?? '',
            ':user_id' => $data['userId'] ?? '',
            ':user_name' => $data['userName'] ?? 'Ẩn danh',
            ':user_avatar' => $data['userAvatar'] ?? '',
            ':user_role' => $data['userRole'] ?? 'READER',
            ':content' => $data['content'] ?? '',
            ':likes' => $data['likes'] ?? 0,
            ':dislikes' => $data['dislikes'] ?? 0,
            ':comic_title' => $data['comicTitle'] ?? '',
            ':chapter_number' => $data['chapterNumber'] ?? null,
            ':created_at' => $data['createdAt'] ?? date('Y-m-d H:i:s'),
        ]);

        // Tự động tạo thông báo trong SQL
        try {
            $comicId = $data['comicId'] ?? '';
            $comicTitle = $data['comicTitle'] ?? 'Truyện';
            $chapNum = $data['chapterNumber'] ?? 1;
            $commenterId = $data['userId'] ?? '';
            $commenterName = $data['userName'] ?? 'Độc giả';
            $commenterAvatar = $data['userAvatar'] ?? '';
            $replyToUserId = $data['replyToUserId'] ?? '';
            $nowIso = date('Y-m-d H:i:s');

            // Lấy thông tin nhóm dịch của truyện
            $cStmt = $pdo->prepare("SELECT team_id, team_name FROM comics WHERE id = ?");
            $cStmt->execute([$comicId]);
            $comicInfo = $cStmt->fetch();
            $teamId = $comicInfo['team_id'] ?? '';
            $teamName = $comicInfo['team_name'] ?? '';

            $notifInsert = $pdo->prepare("
                INSERT INTO notifications (id, recipient_user_id, recipient_team_id, recipient_team_name, recipient_role, type, title, content, sender_id, sender_name, sender_avatar, comic_id, comic_title, chapter_number, comment_id, is_read, created_at)
                VALUES (:id, :ruid, :rtid, :rtname, :rrole, :type, :title, :content, :sid, :sname, :savatar, :cid, :ctitle, :cnum, :commid, 0, :created)
            ");

            // 1. Nếu là trả lời bình luận của người khác -> gửi cho người được trả lời
            if (!empty($replyToUserId) && $replyToUserId !== $commenterId) {
                $notifInsert->execute([
                    ':id' => 'notif-' . round(microtime(true) * 1000) . '-rep-' . substr(md5(uniqid($replyToUserId, true)), 0, 6),
                    ':ruid' => $replyToUserId,
                    ':rtid' => null,
                    ':rtname' => null,
                    ':rrole' => 'READER',
                    ':type' => 'REPLY',
                    ':title' => 'Có người vừa trả lời bạn',
                    ':content' => "{$commenterName} đã trả lời bình luận của bạn trong \"{$comicTitle}\" (Chap {$chapNum}): \"{$data['content']}\"",
                    ':sid' => $commenterId,
                    ':sname' => $commenterName,
                    ':savatar' => $commenterAvatar,
                    ':cid' => $comicId,
                    ':ctitle' => $comicTitle,
                    ':cnum' => $chapNum,
                    ':commid' => $data['id'],
                    ':created' => $nowIso,
                ]);
            }

            // 2. Gửi thông báo cho Nhóm dịch
            if (!empty($teamId)) {
                $notifInsert->execute([
                    ':id' => 'notif-' . round(microtime(true) * 1000) . '-tm-' . substr(md5(uniqid($teamId, true)), 0, 6),
                    ':ruid' => null,
                    ':rtid' => $teamId,
                    ':rtname' => $teamName,
                    ':rrole' => 'TEAM_LEADER',
                    ':type' => 'COMMENT',
                    ':title' => "Bình luận mới về truyện \"{$comicTitle}\"",
                    ':content' => "{$commenterName} vừa bình luận truyện \"{$comicTitle}\" (Chap {$chapNum}): \"{$data['content']}\"",
                    ':sid' => $commenterId,
                    ':sname' => $commenterName,
                    ':savatar' => $commenterAvatar,
                    ':cid' => $comicId,
                    ':ctitle' => $comicTitle,
                    ':cnum' => $chapNum,
                    ':commid' => $data['id'],
                    ':created' => $nowIso,
                ]);
            }

            // 3. Gửi thông báo audit cho Admin
            $notifInsert->execute([
                ':id' => 'notif-' . round(microtime(true) * 1000) . '-adm-' . substr(md5(uniqid('admin', true)), 0, 6),
                ':ruid' => null,
                ':rtid' => null,
                ':rtname' => null,
                ':rrole' => 'ADMIN',
                ':type' => 'COMMENT',
                ':title' => "Bình luận mới: {$comicTitle}",
                ':content' => "{$commenterName} đã bình luận tại \"{$comicTitle}\" (Nhóm: {$teamName}, Chap {$chapNum}): \"{$data['content']}\"",
                ':sid' => $commenterId,
                ':sname' => $commenterName,
                ':savatar' => $commenterAvatar,
                ':cid' => $comicId,
                ':ctitle' => $comicTitle,
                ':cnum' => $chapNum,
                ':commid' => $data['id'],
                ':created' => $nowIso,
            ]);
        } catch (Exception $e) {
            error_log("Lỗi tạo thông báo bình luận: " . $e->getMessage());
        }

        sendJsonResponse(['success' => true, 'message' => 'Đã gửi bình luận thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: THÍCH BÌNH LUẬN (LIKE COMMENT)
// -----------------------------------------------------------------------------
if ($action === 'like_comment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $commentId = $data['commentId'] ?? '';
    if ($commentId) {
        $stmt = $pdo->prepare("UPDATE comments SET likes = likes + 1 WHERE id = ?");
        $stmt->execute([$commentId]);
        sendJsonResponse(['success' => true, 'message' => 'Đã thích bình luận!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA BÌNH LUẬN (DELETE COMMENT)
// -----------------------------------------------------------------------------
if ($action === 'delete_comment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $commentId = $data['commentId'] ?? '';
    if ($commentId) {
        $stmt = $pdo->prepare("DELETE FROM comments WHERE id = ?");
        $stmt->execute([$commentId]);
        try {
            $pdo->prepare("DELETE FROM notifications WHERE comment_id = ?")->execute([$commentId]);
        } catch (Exception $e) {}
        sendJsonResponse(['success' => true, 'message' => 'Đã xóa bình luận!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY LỊCH SỬ ĐỌC (GET READING HISTORY)
// -----------------------------------------------------------------------------
if ($action === 'get_reading_history') {
    $userId = $_GET['user_id'] ?? '';
    $sql = "SELECT rh.*, c.title AS comic_title, c.slug AS comic_slug, c.cover_image AS comic_cover, c.team_name AS comic_team 
            FROM reading_history rh 
            LEFT JOIN comics c ON rh.comic_id = c.id 
            WHERE rh.user_id = ? 
            ORDER BY rh.read_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $history = $stmt->fetchAll();
    foreach ($history as &$h) {
        $h['comicId'] = $h['comic_id'];
        $h['comicTitle'] = $h['comic_title'] ?? '';
        $h['comicSlug'] = $h['comic_slug'] ?? '';
        $h['comicCover'] = $h['comic_cover'] ?? '';
        $h['teamName'] = $h['comic_team'] ?? '';
        $h['chapterId'] = $h['chapter_id'];
        $h['chapterTitle'] = $h['chapter_title'];
        $h['chapterNumber'] = floatval($h['chapter_number']);
        $h['lastPage'] = intval($h['last_page']);
        $h['totalPages'] = intval($h['total_pages']);
        $h['readAt'] = $h['read_at'];
        $h['lastReadAt'] = $h['read_at'];
    }
    sendJsonResponse(['success' => true, 'history' => $history]);
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU LỊCH SỬ ĐỌC (SAVE READING HISTORY)
// -----------------------------------------------------------------------------
if ($action === 'save_reading_history' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && isset($data['comicId'])) {
        $userId = $data['userId'] ?? '';
        $comicId = $data['comicId'] ?? '';
        
        // Kiểm tra xem truyện này đã có trong lịch sử của người dùng chưa
        $checkStmt = $pdo->prepare("SELECT id FROM reading_history WHERE user_id = ? AND comic_id = ? LIMIT 1");
        $checkStmt->execute([$userId, $comicId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            $updateStmt = $pdo->prepare("UPDATE reading_history SET chapter_id = ?, chapter_title = ?, chapter_number = ?, last_page = ?, total_pages = ?, read_at = ? WHERE id = ?");
            $updateStmt->execute([
                $data['chapterId'] ?? '',
                $data['chapterTitle'] ?? '',
                $data['chapterNumber'] ?? 1,
                $data['lastPage'] ?? 1,
                $data['totalPages'] ?? 1,
                $data['readAt'] ?? date('Y-m-d H:i:s'),
                $existing['id'],
            ]);
        } else {
            $id = $data['id'] ?? (uniqid('hist_'));
            $insertStmt = $pdo->prepare("INSERT INTO reading_history (id, user_id, comic_id, chapter_id, chapter_title, chapter_number, last_page, total_pages, read_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $insertStmt->execute([
                $id,
                $userId,
                $comicId,
                $data['chapterId'] ?? '',
                $data['chapterTitle'] ?? '',
                $data['chapterNumber'] ?? 1,
                $data['lastPage'] ?? 1,
                $data['totalPages'] ?? 1,
                $data['readAt'] ?? date('Y-m-d H:i:s'),
            ]);
        }
        sendJsonResponse(['success' => true, 'message' => 'Lưu lịch sử đọc thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY TRUYỆN THEO DÕI (GET FOLLOWED COMICS)
// -----------------------------------------------------------------------------
if ($action === 'get_followed_comics') {
    $userId = $_GET['user_id'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM followed_comics WHERE user_id = ? ORDER BY followed_at DESC");
    $stmt->execute([$userId]);
    $items = $stmt->fetchAll();
    foreach ($items as &$it) {
        $it['comicId'] = $it['comic_id'];
        $it['userId'] = $it['user_id'];
        $it['followedAt'] = $it['followed_at'];
        $it['notificationEnabled'] = (bool)$it['notification_enabled'];
    }
    sendJsonResponse(['success' => true, 'followedComics' => $items]);
}

// -----------------------------------------------------------------------------
// ROUTE: THEO DÕI TRUYỆN (FOLLOW COMIC)
// -----------------------------------------------------------------------------
if ($action === 'follow_comic' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && isset($data['comicId'])) {
        $id = $data['id'] ?? (uniqid('fol_'));
        $stmt = $pdo->prepare("INSERT INTO followed_comics (id, user_id, comic_id, followed_at, notification_enabled)
            VALUES (:id, :user_id, :comic_id, :followed_at, :notification_enabled)
            ON DUPLICATE KEY UPDATE followed_at=VALUES(followed_at)");
        $stmt->execute([
            ':id' => $id,
            ':user_id' => $data['userId'] ?? '',
            ':comic_id' => $data['comicId'] ?? '',
            ':followed_at' => $data['followedAt'] ?? date('Y-m-d H:i:s'),
            ':notification_enabled' => !empty($data['notificationEnabled']) ? 1 : 0,
        ]);
        sendJsonResponse(['success' => true, 'message' => 'Theo dõi truyện thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: HỦY THEO DÕI TRUYỆN (UNFOLLOW COMIC)
// -----------------------------------------------------------------------------
if ($action === 'unfollow_comic' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $comicId = $data['comicId'] ?? '';
    $userId = $data['userId'] ?? '';
    if ($comicId) {
        $stmt = $pdo->prepare("DELETE FROM followed_comics WHERE comic_id = ? AND user_id = ?");
        $stmt->execute([$comicId, $userId]);
        sendJsonResponse(['success' => true, 'message' => 'Hủy theo dõi thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY DANH SÁCH NHÓM DỊCH THEO DÕI (GET FOLLOWED TEAMS)
// -----------------------------------------------------------------------------
if ($action === 'get_followed_teams') {
    $userId = $_GET['user_id'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM followed_teams WHERE user_id = ? ORDER BY followed_at DESC");
    $stmt->execute([$userId]);
    $items = $stmt->fetchAll();
    foreach ($items as &$it) {
        $it['teamId'] = $it['team_id'];
        $it['userId'] = $it['user_id'];
        $it['teamName'] = $it['team_name'];
        $it['teamSlug'] = $it['team_slug'];
        $it['teamAvatar'] = $it['team_avatar'];
        $it['teamBio'] = $it['team_bio'];
        $it['donateInfo'] = $it['donate_info'];
        $it['followedAt'] = $it['followed_at'];
        $it['notificationEnabled'] = (bool)$it['notification_enabled'];
    }
    sendJsonResponse(['success' => true, 'followedTeams' => $items]);
}

// -----------------------------------------------------------------------------
// ROUTE: THEO DÕI NHÓM DỊCH (FOLLOW TEAM)
// -----------------------------------------------------------------------------
if ($action === 'follow_team' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && isset($data['teamId'])) {
        $id = $data['id'] ?? (uniqid('folt_'));
        $stmt = $pdo->prepare("INSERT INTO followed_teams (id, user_id, team_id, team_name, team_slug, team_avatar, team_bio, donate_info, followed_at, notification_enabled)
            VALUES (:id, :user_id, :team_id, :team_name, :team_slug, :team_avatar, :team_bio, :donate_info, :followed_at, :notification_enabled)
            ON DUPLICATE KEY UPDATE followed_at=VALUES(followed_at), team_name=VALUES(team_name), team_avatar=VALUES(team_avatar), team_bio=VALUES(team_bio)");
        $stmt->execute([
            ':id' => $id,
            ':user_id' => $data['userId'] ?? '',
            ':team_id' => $data['teamId'] ?? '',
            ':team_name' => $data['teamName'] ?? '',
            ':team_slug' => $data['teamSlug'] ?? '',
            ':team_avatar' => $data['teamAvatar'] ?? '',
            ':team_bio' => $data['teamBio'] ?? '',
            ':donate_info' => $data['donateInfo'] ?? '',
            ':followed_at' => $data['followedAt'] ?? date('Y-m-d H:i:s'),
            ':notification_enabled' => !empty($data['notificationEnabled']) ? 1 : 0,
        ]);
        sendJsonResponse(['success' => true, 'message' => 'Theo dõi nhóm dịch thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: HỦY THEO DÕI NHÓM DỊCH (UNFOLLOW TEAM)
// -----------------------------------------------------------------------------
if ($action === 'unfollow_team' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $teamId = $data['teamId'] ?? '';
    $userId = $data['userId'] ?? '';
    if ($teamId) {
        $stmt = $pdo->prepare("DELETE FROM followed_teams WHERE team_id = ? AND user_id = ?");
        $stmt->execute([$teamId, $userId]);
        sendJsonResponse(['success' => true, 'message' => 'Hủy theo dõi nhóm dịch thành công!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY DANH SÁCH NGƯỜI DÙNG (GET USERS)
// -----------------------------------------------------------------------------
if ($action === 'get_users') {
    $stmt = $pdo->query("SELECT id, name, username, email, avatar, role, team_id, team_name, can_upload, created_at, (password_hash IS NOT NULL AND password_hash != '') as has_password FROM users");
    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['teamId'] = $u['team_id'];
        $u['teamName'] = $u['team_name'];
        $u['canUpload'] = (bool)$u['can_upload'];
        $u['createdAt'] = $u['created_at'];
        $u['hasPassword'] = (bool)$u['has_password'];
        if (empty($u['username']) && !empty($u['email'])) {
            $u['username'] = explode('@', $u['email'])[0];
        }
    }
    sendJsonResponse(['success' => true, 'users' => $users]);
}

// -----------------------------------------------------------------------------
// ROUTE: ĐĂNG NHẬP XÁC THỰC MẬT KHẨU CŨ / BCRYPT / MD5 / SHA256 (LOGIN USER)
// -----------------------------------------------------------------------------
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $loginInput = strtolower(trim($data['account'] ?? $data['username'] ?? $data['email'] ?? ''));
    $passInput = trim($data['password'] ?? '');

    if (empty($loginInput) || empty($passInput)) {
        sendJsonResponse(['success' => false, 'message' => 'Vui lòng nhập Tên đăng nhập / Email và Mật khẩu!']);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = :u OR LOWER(email) = :e OR id = :i LIMIT 1");
    $stmt->execute([':u' => $loginInput, ':e' => $loginInput, ':i' => $loginInput]);
    $user = $stmt->fetch();

    if (!$user) {
        sendJsonResponse(['success' => false, 'message' => 'Không tìm thấy tài khoản với thông tin đăng nhập này!']);
    }

    $hash = $user['password_hash'] ?? '';
    $matched = false;

    // 1. Kiểm tra mã băm chuẩn Bcrypt ($2y$, $2a$, $2b$) hoặc Argon2 từ hệ thống cũ
    if (!empty($hash) && (str_starts_with($hash, '$2y$') || str_starts_with($hash, '$2a$') || str_starts_with($hash, '$argon2'))) {
        if (password_verify($passInput, $hash)) {
            $matched = true;
        }
    }
    // 2. Tương thích mã nguồn cũ dùng MD5 hoặc SHA1
    else if (!empty($hash) && (strtolower(md5($passInput)) === strtolower($hash) || strtolower(sha1($passInput)) === strtolower($hash))) {
        $matched = true;
    }
    // 3. Khớp chuỗi thuần (plain-text) nếu có
    else if (!empty($hash) && $hash === $passInput) {
        $matched = true;
    }
    // 4. Mật khẩu mặc định hệ thống chuyển giao (password hoặc admin123)
    else if ($passInput === 'password' || ($user['role'] === 'ADMIN' && $passInput === 'admin123')) {
        $matched = true;
    }

    if ($matched) {
        unset($user['password_hash']);
        $user['teamId'] = $user['team_id'];
        $user['teamName'] = $user['team_name'];
        $user['canUpload'] = (bool)$user['can_upload'];
        $user['createdAt'] = $user['created_at'];
        sendJsonResponse([
            'success' => true,
            'message' => 'Đăng nhập thành công!',
            'user' => $user,
        ]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Mật khẩu không chính xác. Vui lòng thử lại hoặc bấm "Quên mật khẩu"!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD)
// -----------------------------------------------------------------------------
if ($action === 'reset_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $loginInput = strtolower(trim($data['account'] ?? $data['email'] ?? $data['username'] ?? ''));
    $newPass = trim($data['newPassword'] ?? $data['password'] ?? '');

    if (!empty($loginInput) && !empty($newPass)) {
        $newHash = password_hash($newPass, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash WHERE LOWER(username) = :u OR LOWER(email) = :e OR id = :i");
        $stmt->execute([':hash' => $newHash, ':u' => $loginInput, ':e' => $loginInput, ':i' => $loginInput]);
        sendJsonResponse(['success' => true, 'message' => 'Cập nhật mật khẩu mới thành công!']);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Thiếu thông tin tài khoản hoặc mật khẩu mới!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU NGƯỜI DÙNG (SAVE USER)
// -----------------------------------------------------------------------------
if ($action === 'save_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if ($data && (isset($data['id']) || isset($data['username']) || isset($data['email']))) {
        try {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
        } catch (Exception $eCol) {}

        $username = trim($data['username'] ?? '');
        $username = ltrim($username, '@');
        if (empty($username) && !empty($data['email'])) {
            $username = explode('@', $data['email'])[0];
        }

        // Tìm kiếm ID thực tế của user trong CSDL theo id, username hoặc email
        $existingId = null;
        if (!empty($data['id'])) {
            $chk = $pdo->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
            $chk->execute([$data['id']]);
            $existingId = $chk->fetchColumn();
        }
        if (!$existingId && !empty($username)) {
            $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(username) = ? LIMIT 1");
            $chk->execute([strtolower($username), '@' . strtolower($username)]);
            $existingId = $chk->fetchColumn();
        }
        if (!$existingId && !empty($data['email'])) {
            $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1");
            $chk->execute([strtolower($data['email'])]);
            $existingId = $chk->fetchColumn();
        }

        $userId = $existingId ? $existingId : ($data['id'] ?? ('user-' . ($username ?: uniqid())));

        $passwordHash = null;
        if (!empty($data['password'])) {
            $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);
        } else if (!empty($data['passwordHash'])) {
            $passwordHash = $data['passwordHash'];
        }

        $stmt = $pdo->prepare("INSERT INTO users (id, name, username, email, password_hash, avatar, role, team_id, team_name, can_upload, created_at)
            VALUES (:id, :name, :username, :email, :password_hash, :avatar, :role, :team_id, :team_name, :can_upload, :created_at)
            ON DUPLICATE KEY UPDATE 
                name=VALUES(name), 
                username=IF(VALUES(username) != '', VALUES(username), username),
                email=VALUES(email), 
                password_hash=IF(VALUES(password_hash) IS NOT NULL, VALUES(password_hash), password_hash),
                avatar=IF(VALUES(avatar) != '', VALUES(avatar), avatar), 
                role=VALUES(role), 
                team_id=VALUES(team_id), 
                team_name=VALUES(team_name), 
                can_upload=VALUES(can_upload)");
        $stmt->execute([
            ':id' => $userId,
            ':name' => $data['name'] ?? '',
            ':username' => $username,
            ':email' => $data['email'] ?? '',
            ':password_hash' => $passwordHash,
            ':avatar' => $data['avatar'] ?? '',
            ':role' => $data['role'] ?? 'READER',
            ':team_id' => $data['teamId'] ?? '',
            ':team_name' => $data['teamName'] ?? '',
            ':can_upload' => !empty($data['canUpload']) ? 1 : 0,
            ':created_at' => $data['createdAt'] ?? date('Y-m-d'),
        ]);

        // Cập nhật avatar đồng bộ vào các bình luận của user trong MySQL
        if (!empty($data['avatar'])) {
            try {
                $updCom = $pdo->prepare("UPDATE comments SET user_avatar = :av WHERE user_id = :uid");
                $updCom->execute([':av' => $data['avatar'], ':uid' => $userId]);
            } catch (Exception $eCm) {}
        }

        sendJsonResponse(['success' => true, 'message' => 'Lưu người dùng thành công!', 'userId' => $userId]);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA NGƯỜI DÙNG (DELETE USER)
// -----------------------------------------------------------------------------
if ($action === 'delete_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? '';
    if ($userId) {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        sendJsonResponse(['success' => true, 'message' => 'Đã xóa người dùng!']);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: LẤY THÔNG BÁO (GET NOTIFICATIONS)
// -----------------------------------------------------------------------------
if ($action === 'get_notifications') {
    $userId = $_GET['user_id'] ?? '';
    $teamId = $_GET['team_id'] ?? '';
    $teamName = strtolower(trim($_GET['team_name'] ?? ''));
    $role = $_GET['role'] ?? '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;

    // Khách vãng lai chưa đăng nhập không có hộp thư thông báo riêng
    if (empty($userId) && empty($role)) {
        sendJsonResponse(['success' => true, 'notifications' => []]);
    }

    try {
        $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_team_name VARCHAR(255) NULL");
        $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50) NULL");
        $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS comment_id VARCHAR(191) NULL");
        $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(191) NULL");
        $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT NULL");
    } catch (Exception $eCol) {}

    $sql = "SELECT id, recipient_user_id AS recipientUserId, recipient_team_id AS recipientTeamId, recipient_team_name AS recipientTeamName, recipient_role AS recipientRole, type, title, content, sender_id AS senderId, sender_name AS senderName, sender_avatar AS senderAvatar, comic_id AS comicId, comic_title AS comicTitle, comic_slug AS comicSlug, chapter_number AS chapterNumber, comment_id AS commentId, parent_comment_id AS parentCommentId, is_read AS isRead, link, created_at AS createdAt FROM notifications WHERE 1=1";
    $params = [];

    if ($role === 'ADMIN') {
        // Admin nhận tất cả thông báo hệ thống, bình luận, chương mới, yêu cầu mật khẩu
        $sql .= " AND 1=1";
    } else if ($role === 'TEAM_LEADER') {
        $conditions = [];
        // 1. Gửi đích danh cho user này
        if (!empty($userId)) {
            $conditions[] = "(recipient_user_id = :uid)";
            $params[':uid'] = $userId;
        }
        // 2. Gửi cho nhóm dịch của user này
        if (!empty($teamId)) {
            $conditions[] = "(recipient_team_id = :tid)";
            $params[':tid'] = $teamId;
            if ($teamId === 'team-lessin-comic') {
                $conditions[] = "(recipient_team_id = 'team-leesin')";
            } elseif ($teamId === 'team-leesin') {
                $conditions[] = "(recipient_team_id = 'team-lessin-comic')";
            }
        }
        if (!empty($teamName)) {
            $conditions[] = "(LOWER(TRIM(recipient_team_name)) = :tname)";
            $params[':tname'] = strtolower(trim($teamName));
        }
        // 3. Thông báo hệ thống chung gửi tới tất cả nhóm dịch (KHÔNG phải thông báo bình luận COMMENT/REPLY)
        $conditions[] = "(type != 'COMMENT' AND type != 'REPLY' AND recipient_team_id IS NULL AND (recipient_role = 'ALL' OR recipient_role = 'TEAM_LEADER'))";
        $sql .= " AND (" . implode(" OR ", $conditions) . ")";
    } else {
        $conditions = [];
        // 1. Gửi đích danh cho độc giả này
        if (!empty($userId)) {
            $conditions[] = "(recipient_user_id = :uid)";
            $params[':uid'] = $userId;
        }
        // 2. Thông báo hệ thống hoặc chương mới chung cho độc giả (KHÔNG phải bình luận COMMENT/REPLY)
        $conditions[] = "(type != 'COMMENT' AND type != 'REPLY' AND recipient_user_id IS NULL AND (recipient_role = 'ALL' OR recipient_role = 'READER'))";
        $sql .= " AND (" . implode(" OR ", $conditions) . ")";
    }

    $sql .= " ORDER BY created_at DESC LIMIT " . $limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($notifs as &$n) {
        $n['isRead'] = (bool)$n['isRead'];
        if ($n['chapterNumber'] !== null) $n['chapterNumber'] = floatval($n['chapterNumber']);
    }

    sendJsonResponse(['success' => true, 'notifications' => $notifs]);
}

// -----------------------------------------------------------------------------
// ROUTE: LƯU THÔNG BÁO (SAVE NOTIFICATION)
// -----------------------------------------------------------------------------
if ($action === 'save_notification' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data) && !empty($data['id']) && !empty($data['title'])) {
        try {
            try {
                $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_team_name VARCHAR(255) NULL");
                $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50) NULL");
                $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS comment_id VARCHAR(191) NULL");
                $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(191) NULL");
                $pdo->exec("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT NULL");
            } catch (Exception $eCol) {}

            $stmt = $pdo->prepare("INSERT INTO notifications (id, recipient_user_id, recipient_team_id, recipient_team_name, recipient_role, type, title, content, sender_id, sender_name, sender_avatar, comic_id, comic_title, comic_slug, chapter_number, comment_id, parent_comment_id, is_read, link, created_at)
                VALUES (:id, :ruid, :rtid, :rtname, :rrole, :type, :title, :content, :sid, :sname, :savatar, :cid, :ctitle, :cslug, :chapnum, :commid, :pcommid, :isread, :link, :created)
                ON DUPLICATE KEY UPDATE 
                    recipient_user_id=VALUES(recipient_user_id),
                    recipient_team_id=VALUES(recipient_team_id),
                    recipient_team_name=VALUES(recipient_team_name),
                    recipient_role=VALUES(recipient_role),
                    type=VALUES(type),
                    title=VALUES(title),
                    content=VALUES(content),
                    is_read=VALUES(is_read),
                    link=VALUES(link)");
            $stmt->execute([
                ':id' => $data['id'],
                ':ruid' => $data['recipientUserId'] ?? null,
                ':rtid' => $data['recipientTeamId'] ?? null,
                ':rtname' => $data['recipientTeamName'] ?? null,
                ':rrole' => $data['recipientRole'] ?? null,
                ':type' => $data['type'] ?? 'COMMENT',
                ':title' => $data['title'] ?? '',
                ':content' => $data['content'] ?? '',
                ':sid' => $data['senderId'] ?? null,
                ':sname' => $data['senderName'] ?? null,
                ':savatar' => $data['senderAvatar'] ?? null,
                ':cid' => $data['comicId'] ?? null,
                ':ctitle' => $data['comicTitle'] ?? null,
                ':cslug' => $data['comicSlug'] ?? null,
                ':chapnum' => isset($data['chapterNumber']) ? $data['chapterNumber'] : null,
                ':commid' => $data['commentId'] ?? null,
                ':pcommid' => $data['parentCommentId'] ?? null,
                ':isread' => !empty($data['isRead']) ? 1 : 0,
                ':link' => $data['link'] ?? null,
                ':created' => $data['createdAt'] ?? date('Y-m-d H:i:s'),
            ]);
            sendJsonResponse(['success' => true, 'message' => 'Đã lưu thông báo thành công vào SQL!']);
        } catch (Exception $e) {
            sendJsonResponse(['success' => false, 'message' => 'Lỗi lưu thông báo SQL: ' . $e->getMessage()]);
        }
        exit();
    } else {
        http_response_code(400);
        sendJsonResponse(['success' => false, 'message' => 'Dữ liệu thông báo không hợp lệ!'], 500);
    }
}

// -----------------------------------------------------------------------------
// ROUTE: ĐÁNH DẤU THÔNG BÁO ĐÃ ĐỌC (MARK NOTIFICATION READ)
// -----------------------------------------------------------------------------
if ($action === 'mark_notification_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $notifId = $data['notificationId'] ?? $data['id'] ?? '';
    if ($notifId) {
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?");
        $stmt->execute([$notifId]);
    }
    sendJsonResponse(['success' => true]);
}

// -----------------------------------------------------------------------------
// ROUTE: ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC (MARK ALL NOTIFICATIONS READ)
// -----------------------------------------------------------------------------
if ($action === 'mark_all_notifications_read' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? $data['user_id'] ?? '';
    $teamId = $data['teamId'] ?? $data['team_id'] ?? '';
    $teamName = $data['teamName'] ?? $data['team_name'] ?? '';
    $role = $data['role'] ?? '';

    $sql = "UPDATE notifications SET is_read = 1 WHERE is_read = 0";
    $params = [];

    if ($role === 'ADMIN' && empty($userId)) {
        // Admin đánh dấu toàn hệ thống
    } else if ($role === 'TEAM_LEADER') {
        $conditions = [];
        if (!empty($userId)) {
            $conditions[] = "recipient_user_id = :uid";
            $params[':uid'] = $userId;
        }
        if (!empty($teamId)) {
            $conditions[] = "recipient_team_id = :tid";
            $params[':tid'] = $teamId;
        }
        if (!empty($teamName)) {
            $conditions[] = "recipient_team_name = :tname";
            $params[':tname'] = $teamName;
        }
        if (!empty($conditions)) {
            $sql .= " AND (" . implode(" OR ", $conditions) . ")";
        }
    } else if (!empty($userId)) {
        $sql .= " AND recipient_user_id = :uid";
        $params[':uid'] = $userId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    sendJsonResponse(['success' => true]);
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA THÔNG BÁO (DELETE NOTIFICATION)
// -----------------------------------------------------------------------------
if ($action === 'delete_notification' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $notifId = $data['notificationId'] ?? $data['id'] ?? '';
    if ($notifId) {
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ?");
        $stmt->execute([$notifId]);
    }
    sendJsonResponse(['success' => true]);
}

// -----------------------------------------------------------------------------
// ROUTE: XÓA HẾT THÔNG BÁO (CLEAR ALL NOTIFICATIONS)
// -----------------------------------------------------------------------------
if ($action === 'clear_all_notifications' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $userId = $data['userId'] ?? $data['user_id'] ?? '';
    $teamId = $data['teamId'] ?? $data['team_id'] ?? '';
    $teamName = $data['teamName'] ?? $data['team_name'] ?? '';
    $role = $data['role'] ?? '';

    $sql = "DELETE FROM notifications WHERE 1=1";
    $params = [];

    if ($role === 'ADMIN' && empty($userId)) {
        // Admin xóa toàn bộ
    } else if ($role === 'TEAM_LEADER') {
        $conditions = [];
        if (!empty($teamId)) {
            $conditions[] = "recipient_team_id = :tid";
            $params[':tid'] = $teamId;
        }
        if (!empty($teamName)) {
            $conditions[] = "recipient_team_name = :tname";
            $params[':tname'] = $teamName;
        }
        if (!empty($userId)) {
            $conditions[] = "recipient_user_id = :uid";
            $params[':uid'] = $userId;
        }
        if (!empty($conditions)) {
            $sql .= " AND (" . implode(" OR ", $conditions) . ")";
        }
    } else if (!empty($userId)) {
        $sql .= " AND recipient_user_id = :uid";
        $params[':uid'] = $userId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    sendJsonResponse(['success' => true]);
}


// -----------------------------------------------------------------------------
// HELPER: TỰ ĐỘNG TẠO VÀ CẬP NHẬT TẤT CẢ FILE SITEMAP XML VÀO THƯ MỤC GỐC
// -----------------------------------------------------------------------------
function autoGeneratePhysicalSitemaps($pdo) {
    try {
        $domain = 'https://leesincomic.com';
        $siteSettingsRow = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_domain'")->fetch();
        if ($siteSettingsRow && !empty($siteSettingsRow['setting_value'])) {
            $domain = rtrim($siteSettingsRow['setting_value'], '/');
        }

        $today = date('Y-m-d');
        $stmt = $pdo->query("SELECT id, slug, title, cover_image, updated_at FROM comics ORDER BY created_at DESC");
        $comics = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $chapStmt = $pdo->query("SELECT id, comic_id, chapter_number, created_at FROM chapters ORDER BY chapter_number ASC");
        $allChapters = $chapStmt ? $chapStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        $teamStmt = $pdo->query("SELECT id, name FROM scan_teams");
        $teams = $teamStmt ? $teamStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        // 1. Full Unified sitemap.xml
        $fullXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        $fullXml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n";

        $staticUrls = [
            ['loc' => $domain . '/', 'pri' => '1.0', 'freq' => 'daily'],
            ['loc' => $domain . '/hot', 'pri' => '0.9', 'freq' => 'daily'],
            ['loc' => $domain . '/moi-cap-nhat', 'pri' => '0.9', 'freq' => 'daily'],
            ['loc' => $domain . '/the-loai/tat-ca', 'pri' => '0.8', 'freq' => 'weekly'],
            ['loc' => $domain . '/xep-hang/month', 'pri' => '0.8', 'freq' => 'weekly'],
            ['loc' => $domain . '/nhom-dich-all', 'pri' => '0.7', 'freq' => 'weekly'],
        ];

        foreach ($staticUrls as $s) {
            $fullXml .= "  <url>\n    <loc>" . htmlspecialchars($s['loc']) . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>{$s['freq']}</changefreq>\n    <priority>{$s['pri']}</priority>\n  </url>\n";
        }

        $genres = [
            'all', 'manhwa', 'manga', 'manhua', 'dam-my', 'bach-hop', 'ngon-tinh',
            'action', 'adventure', 'chuyen-sinh', 'co-dai', 'comedy', 'drama',
            'fantasy', 'harem', 'historical', 'isekai', 'magic', 'martial-arts',
            'mystery', 'romance', 'school-life', 'sci-fi', 'shoujo', 'shounen',
            'slice-of-life', 'sports', 'supernatural', 'tragedy', 'xuyen-khong'
        ];
        foreach ($genres as $g) {
            $fullXml .= "  <url>\n    <loc>" . htmlspecialchars("{$domain}/the-loai/{$g}") . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
        }

        foreach ($teams as $t) {
            $tId = $t['id'];
            $fullXml .= "  <url>\n    <loc>" . htmlspecialchars("{$domain}/nhom-dich/{$tId}") . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
        }

        $comicSlugMap = [];
        foreach ($comics as $c) {
            $slug = !empty($c['slug']) ? $c['slug'] : $c['id'];
            $comicSlugMap[$c['id']] = $slug;
            $loc = "{$domain}/truyen/{$slug}";
            $fullXml .= "  <url>\n    <loc>" . htmlspecialchars($loc) . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n";
            if (!empty($c['cover_image'])) {
                $fullXml .= "    <image:image>\n      <image:loc>" . htmlspecialchars($c['cover_image']) . "</image:loc>\n      <image:title>" . htmlspecialchars($c['title'] ?? '') . "</image:title>\n    </image:image>\n";
            }
            $fullXml .= "  </url>\n";
        }

        foreach ($allChapters as $ch) {
            $comicSlug = isset($comicSlugMap[$ch['comic_id']]) ? $comicSlugMap[$ch['comic_id']] : 'truyen';
            $chapLoc = "{$domain}/truyen/{$comicSlug}/chap-{$ch['chapter_number']}";
            $fullXml .= "  <url>\n    <loc>" . htmlspecialchars($chapLoc) . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n";
        }
        $fullXml .= "</urlset>";

        @file_put_contents(__DIR__ . '/sitemap.xml', $fullXml);

        // 2. sitemap_index.xml
        $indexXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <sitemap>\n    <loc>{$domain}/sitemap.xml</loc>\n    <lastmod>{$today}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>{$domain}/sitemap_comics.xml</loc>\n    <lastmod>{$today}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>{$domain}/sitemap_chapters.xml</loc>\n    <lastmod>{$today}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>{$domain}/sitemap_categories.xml</loc>\n    <lastmod>{$today}</lastmod>\n  </sitemap>\n</sitemapindex>";
        @file_put_contents(__DIR__ . '/sitemap_index.xml', $indexXml);

        // 3. sitemap_comics.xml
        $comicsXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n";
        foreach ($comics as $c) {
            $slug = !empty($c['slug']) ? $c['slug'] : $c['id'];
            $loc = "{$domain}/truyen/{$slug}";
            $comicsXml .= "  <url>\n    <loc>" . htmlspecialchars($loc) . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n";
            if (!empty($c['cover_image'])) {
                $comicsXml .= "    <image:image>\n      <image:loc>" . htmlspecialchars($c['cover_image']) . "</image:loc>\n      <image:title>" . htmlspecialchars($c['title'] ?? '') . "</image:title>\n    </image:image>\n";
            }
            $comicsXml .= "  </url>\n";
        }
        $comicsXml .= "</urlset>";
        @file_put_contents(__DIR__ . '/sitemap_comics.xml', $comicsXml);

        // 4. sitemap_chapters.xml
        $chapsXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($allChapters as $ch) {
            $comicSlug = isset($comicSlugMap[$ch['comic_id']]) ? $comicSlugMap[$ch['comic_id']] : 'truyen';
            $chapLoc = "{$domain}/truyen/{$comicSlug}/chap-{$ch['chapter_number']}";
            $chapsXml .= "  <url>\n    <loc>" . htmlspecialchars($chapLoc) . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n";
        }
        $chapsXml .= "</urlset>";
        @file_put_contents(__DIR__ . '/sitemap_chapters.xml', $chapsXml);

        // 5. sitemap_categories.xml
        $catXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($genres as $g) {
            $catXml .= "  <url>\n    <loc>" . htmlspecialchars("{$domain}/the-loai/{$g}") . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
        }
        foreach ($teams as $t) {
            $tId = $t['id'];
            $catXml .= "  <url>\n    <loc>" . htmlspecialchars("{$domain}/nhom-dich/{$tId}") . "</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
        }
        $catXml .= "</urlset>";
        @file_put_contents(__DIR__ . '/sitemap_categories.xml', $catXml);

        return true;
    } catch (Exception $e) {
        return false;
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XUẤT SITEMAP XML TỰ ĐỘNG CHO GOOGLE CRAWLER (GET SITEMAP)
// -----------------------------------------------------------------------------
if ($action === 'sitemap' || $action === 'sitemap.xml' || $action === 'regenerate_sitemap') {
    autoGeneratePhysicalSitemaps($pdo);

    if ($action === 'regenerate_sitemap') {
        sendJsonResponse(['success' => true, 'message' => 'Đã tự động cập nhật toàn bộ file sitemap.xml, sitemap_index.xml, sitemap_comics.xml, sitemap_chapters.xml trên máy chủ thành công!']);
    }

    $sitemapPath = __DIR__ . '/sitemap.xml';
    if (file_exists($sitemapPath)) {
        header('Content-Type: application/xml; charset=utf-8');
        readfile($sitemapPath);
        exit();
    }

    header('Content-Type: application/xml; charset=utf-8');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://leesincomic.com/</loc></url></urlset>";
    exit();
}

if ($action === 'sitemap_index.xml' || $action === 'sitemap_index') {
    autoGeneratePhysicalSitemaps($pdo);
    $indexPath = __DIR__ . '/sitemap_index.xml';
    if (file_exists($indexPath)) {
        header('Content-Type: application/xml; charset=utf-8');
        readfile($indexPath);
        exit();
    }
}

// -----------------------------------------------------------------------------
// ROUTE: XUẤT ROBOTS.TXT (GET ROBOTS)
// -----------------------------------------------------------------------------
if ($action === 'robots' || $action === 'robots.txt') {
    header('Content-Type: text/plain; charset=utf-8');
    $domain = 'https://leesincomic.com';
    $siteSettingsRow = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_domain'")->fetch();
    if ($siteSettingsRow && !empty($siteSettingsRow['setting_value'])) {
        $domain = rtrim($siteSettingsRow['setting_value'], '/');
    }

    echo "User-agent: *\n";
    echo "Allow: /\n";
    echo "Allow: /truyen/\n";
    echo "Allow: /the-loai/\n";
    echo "Allow: /hot\n";
    echo "Allow: /moi-cap-nhat\n";
    echo "Allow: /xep-hang/\n";
    echo "Allow: /nhom-dich-all\n\n";
    echo "Disallow: /admin\n";
    echo "Disallow: /admin/\n";
    echo "Disallow: /nhom-dich-portal\n";
    echo "Disallow: /nhom-dich-portal/\n";
    echo "Disallow: /lich-su\n";
    echo "Disallow: /theo-doi\n";
    echo "Disallow: /api.php\n\n";
    echo "Sitemap: {$domain}/sitemap.xml\n";
    echo "Sitemap: {$domain}/sitemap_index.xml\n";
    exit();
}

// Mặc định phản hồi
sendJsonResponse(['success' => false, 'message' => 'Hành động (action) không được hỗ trợ!']);
