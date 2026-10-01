<?php
/**
 * ==============================================================================
 * LEESINCOMIC.COM - AUTO SYNC CRAWLER TO MYSQL
 * File: public/sync_from_leesincomic.php
 * 
 * Script độc lập quét và đồng bộ toàn bộ truyện cùng chapter từ leesincomic.com
 * vào MySQL của hệ thống.
 * 
 * Tính năng chính:
 * 1. Kết nối MySQL PDO với cấu hình hệ thống.
 * 2. Tự động tương thích cả bảng `comics` và `stories`, tự động kiểm tra cột.
 * 3. Quét danh sách truyện theo phân trang (`?page=1&limit=10`) hoặc theo slug (`?slug=...`).
 * 4. Đối chiếu thông minh:
 *    - Truyện đã có -> Lấy ID, tiếp tục bù chapter.
 *    - Truyện chưa có -> Tạo mới bộ truyện.
 *    - Chapter đã có -> BỎ QUA (giữ nguyên lượt xem, không đè dữ liệu).
 *    - Chapter chưa có -> Cào danh sách link ảnh CDN tachserver.site và INSERT bù vào MySQL.
 * 5. Giao diện trực quan streaming log trực tiếp ra màn hình, hỗ trợ tự động nhảy trang (auto-next).
 * ==============================================================================
 */

// 1. Cấu hình môi trường thực thi PHP
@ini_set('display_errors', 1);
@ini_set('display_startup_errors', 1);
@error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
@ini_set('max_execution_time', 600);
@set_time_limit(600);
@ini_set('memory_limit', '512M');
@date_default_timezone_set('Asia/Ho_Chi_Minh');

// Bật cơ chế streaming không đệm để hiển thị tiến trình cào theo thời gian thực
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 0);
@ini_set('implicit_flush', 1);
while (ob_get_level() > 0) {
    @ob_end_flush();
}
ob_implicit_flush(1);

header('Content-Type: text/html; charset=utf-8');

// Polyfills tương thích PHP 7.x
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

// 2. CẤU HÌNH KẾT NỐI MYSQL
$DB_HOST = isset($_GET['db_host']) && $_GET['db_host'] !== '' ? trim($_GET['db_host']) : (getenv('DB_HOST') ?: "localhost");
$DB_NAME = isset($_GET['db_name']) && $_GET['db_name'] !== '' ? trim($_GET['db_name']) : (getenv('DB_NAME') ?: "leesinco_manga");
$DB_USER = isset($_GET['db_user']) && $_GET['db_user'] !== '' ? trim($_GET['db_user']) : (getenv('DB_USER') ?: "leesinco_user");
$DB_PASS = isset($_GET['db_pass']) && $_GET['db_pass'] !== '' ? trim($_GET['db_pass']) : (getenv('DB_PASS') ?: "LeesinComic@2026");

// Tham số chạy crawler
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;
$targetSlug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
$autoNext = isset($_GET['auto']) && $_GET['auto'] === '1';

// Thống kê toàn phiên chạy
$stats = [
    'comics_checked' => 0,
    'comics_created' => 0,
    'comics_existed' => 0,
    'chapters_existed' => 0,
    'chapters_inserted' => 0,
    'images_saved' => 0,
    'errors' => 0,
];

// In tiêu đề HTML giao diện
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LeesinComic - Quét & Đồng Bộ Dữ Liệu Vào MySQL</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header-card {
            background: linear-gradient(135deg, #161b22 0%, #1f242c 100%);
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .header-title {
            color: #f59e0b;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 6px;
        }
        .badge-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
        .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            align-items: end;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #21262d;
        }
        label { display: block; font-size: 11px; color: #8b949e; margin-bottom: 4px; font-weight: 600; }
        input[type="text"], input[type="number"] {
            width: 100%;
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            color: #e6edf3;
            padding: 7px 10px;
            font-size: 12px;
        }
        .btn {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #000;
            font-weight: bold;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-outline {
            background: transparent;
            color: #e6edf3;
            border: 1px solid #30363d;
        }
        .btn-outline:hover { background: #21262d; }
        .btn-red { background: #ef4444; color: #fff; }
        
        .comic-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
        }
        .comic-header {
            padding: 12px 16px;
            background: #21262d;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        .comic-title { font-weight: bold; color: #fff; font-size: 14px; }
        .comic-slug { color: #8b949e; font-size: 12px; font-family: monospace; }
        .comic-body { padding: 12px 16px; }
        
        .log-entry {
            padding: 4px 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        .log-icon { flex-shrink: 0; width: 16px; }
        .log-success { color: #4ade80; }
        .log-skip { color: #94a3b8; }
        .log-info { color: #38bdf8; }
        .log-warn { color: #fbbf24; }
        .log-error { color: #f87171; }
        
        .summary-bar {
            position: sticky;
            bottom: 0;
            background: rgba(22, 27, 34, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 12px 20px;
            margin-top: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header-card">
        <div class="header-title">
            <span>⚡ LEESINCOMIC.COM AUTO SYNC CRAWLER</span>
            <span class="badge badge-amber">v2.0 Standalone</span>
            <span class="badge badge-green">MySQL PDO Direct</span>
        </div>
        <p style="color: #8b949e; font-size: 12px;">
            Quét truyện và chương tranh trực tiếp từ <strong style="color: #e6edf3;">https://leesincomic.com</strong>.
            Cơ chế chống trùng lặp: Giữ nguyên 100% chapter đã có, chỉ bổ sung các chapter còn thiếu và bộ truyện mới vào MySQL.
        </p>

        <form method="GET" class="form-grid">
            <div>
                <label>Trang cần quét (Page):</label>
                <input type="number" name="page" min="1" value="<?php echo htmlspecialchars($page); ?>">
            </div>
            <div>
                <label>Số truyện mỗi lượt (Limit):</label>
                <input type="number" name="limit" min="1" max="50" value="<?php echo htmlspecialchars($limit); ?>">
            </div>
            <div>
                <label>Hoặc quét riêng 1 Slug cụ thể:</label>
                <input type="text" name="slug" placeholder="vd: tac-gia-xx" value="<?php echo htmlspecialchars($targetSlug); ?>">
            </div>
            <div>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 8px;">
                    <input type="checkbox" name="auto" value="1" <?php echo $autoNext ? 'checked' : ''; ?>>
                    <span>Tự động quét trang kế tiếp</span>
                </label>
                <button type="submit" class="btn" style="width: 100%;">
                    <span>▶ Bắt đầu Quét & Bù</span>
                </button>
            </div>
        </form>
    </div>

    <div id="crawler-logs">
<?php
flush();

// 3. THỰC HIỆN KẾT NỐI DATABASE
try {
    $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+07:00'");
    echo '<div style="margin-bottom: 15px;"><span class="badge badge-green">✓ Kết nối MySQL thành công (' . htmlspecialchars($DB_NAME) . ')</span></div>';
} catch (PDOException $e) {
    echo '<div style="margin-bottom: 15px;"><span class="badge badge-red">✗ Lỗi kết nối MySQL: ' . htmlspecialchars($e->getMessage()) . '</span></div>';
    echo '<p style="color: #f87171; margin-bottom: 20px;">Vui lòng kiểm tra lại thông số DB_HOST, DB_NAME, DB_USER, DB_PASS hoặc truyền qua URL (?db_host=...&db_name=...&db_user=...&db_pass=...).</p>';
    echo '</div></div></body></html>';
    exit();
}

// 4. KIỂM TRA BẢNG VÀ CỘT TRONG DATABASE (Tự động hỗ trợ cả 'comics' và 'stories')
function checkTableExists($pdo, $tbl) {
    try {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$tbl]);
        return (bool)$stmt->fetch();
    } catch (Exception $e) {
        return false;
    }
}

function getTableColumns($pdo, $tbl) {
    $cols = [];
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `{$tbl}`");
        while ($r = $stmt->fetch()) {
            $cols[] = $r['Field'];
        }
    } catch (Exception $e) {}
    return $cols;
}

// Xác định bảng truyện
$COMIC_TABLE = checkTableExists($pdo, 'comics') ? 'comics' : (checkTableExists($pdo, 'stories') ? 'stories' : 'comics');

// Nếu bảng truyện hoặc chapters chưa tồn tại, tự động khởi tạo theo chuẩn hệ thống
if (!checkTableExists($pdo, $COMIC_TABLE)) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS comics (
            id VARCHAR(191) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(191) NOT NULL UNIQUE,
            other_names JSON NULL,
            cover_image TEXT NULL,
            banner_image TEXT NULL,
            authors JSON NULL,
            status VARCHAR(64) DEFAULT 'Đang tiến hành',
            genres JSON NULL,
            summary LONGTEXT NULL,
            team_id VARCHAR(191) NULL,
            team_name VARCHAR(255) NULL,
            views BIGINT DEFAULT 0,
            views_day INT DEFAULT 0,
            views_week INT DEFAULT 0,
            views_month INT DEFAULT 0,
            likes INT DEFAULT 0,
            follows INT DEFAULT 0,
            rating FLOAT DEFAULT 5.0,
            rating_count INT DEFAULT 1,
            is_hot TINYINT(1) DEFAULT 0,
            is_trending TINYINT(1) DEFAULT 0,
            updated_at VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_c_views (views)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $COMIC_TABLE = 'comics';
}

if (!checkTableExists($pdo, 'chapters')) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chapters (
            id VARCHAR(191) PRIMARY KEY,
            comic_id VARCHAR(191) NOT NULL,
            comic_title VARCHAR(255) NULL,
            chapter_number FLOAT NOT NULL,
            title VARCHAR(255) NOT NULL,
            is_password_protected TINYINT(1) DEFAULT 0,
            password VARCHAR(255) DEFAULT '',
            scheduled_date VARCHAR(64) DEFAULT '',
            views BIGINT DEFAULT 0,
            images LONGTEXT NOT NULL,
            team_id VARCHAR(191) NULL,
            team_name VARCHAR(255) NULL,
            created_at VARCHAR(64) NULL,
            updated_at VARCHAR(64) NULL,
            INDEX idx_comic (comic_id),
            INDEX idx_chap_num (comic_id, chapter_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

$comicCols = getTableColumns($pdo, $COMIC_TABLE);
$chapCols = getTableColumns($pdo, 'chapters');

$colComicId = in_array('id', $comicCols) ? 'id' : (in_array('story_id', $comicCols) ? 'story_id' : 'id');
$colChapFk = in_array('comic_id', $chapCols) ? 'comic_id' : (in_array('story_id', $chapCols) ? 'story_id' : 'comic_id');
$colChapNum = in_array('chapter_number', $chapCols) ? 'chapter_number' : (in_array('number', $chapCols) ? 'number' : 'chapter_number');

// 5. HELPER CRAWLER (cURL / fallback)
function fetchLeesinUrl($url, $timeout = 25) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            CURLOPT_HTTPHEADER => [
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer: https://leesincomic.com/',
                'Cache-Control: no-cache',
            ],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 400 && $response) {
            return $response;
        }
    }

    // Fallback stream context
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\nReferer: https://leesincomic.com/\r\n",
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]
    ];
    $context = stream_context_create($opts);
    return @file_get_contents($url, false, $context) ?: '';
}

function cleanVietnameseSlug($str) {
    $str = mb_strtolower(trim($str), 'UTF-8');
    $unicode = [
        'a' => 'á|à|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ',
        'd' => 'đ',
        'e' => 'é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ',
        'i' => 'í|ì|ỉ|ĩ|ị',
        'o' => 'ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ',
        'u' => 'ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự',
        'y' => 'ý|ỳ|ỷ|ỹ|ỵ',
    ];
    foreach ($unicode as $nonUni => $uni) {
        $str = preg_replace("/($uni)/i", $nonUni, $str);
    }
    $str = preg_replace('/[^a-z0-9\-]/', '-', $str);
    $str = preg_replace('/-+/', '-', $str);
    return trim($str, '-');
}

function extractImagesFromChapterHtml($html) {
    $matches = [];
    preg_match_all('/data-src=["\']([^"\']+)["\']/i', $html, $m1);
    if (!empty($m1[1])) $matches = array_merge($matches, $m1[1]);

    preg_match_all('/data-original=["\']([^"\']+)["\']/i', $html, $m2);
    if (!empty($m2[1])) $matches = array_merge($matches, $m2[1]);

    preg_match_all('/<img[^>]+src=["\'](https?:\/\/[^"\']+(?:tachserver\.site|tachserver\.online|leesincomic\.com)\/[^"\']*uploads\/[^"\']+)["\']/i', $html, $m3);
    if (!empty($m3[1])) $matches = array_merge($matches, $m3[1]);

    $valid = [];
    foreach ($matches as $img) {
        $img = trim($img);
        if (strlen($img) < 5) continue;
        if (str_contains($img, 'loadx-min.gif') || str_contains($img, 'loading.gif') || str_contains($img, 'load.gif') || str_ends_with($img, '.gif')) continue;
        if (str_contains($img, 'logo.png') || str_contains($img, 'user.png') || str_contains($img, 'icon-stars.png') || str_contains($img, 'no-images.jpg')) continue;
        
        if (str_starts_with($img, '//')) {
            $img = 'https:' . $img;
        } elseif (str_starts_with($img, '/')) {
            $img = 'https://leesincomic.com' . $img;
        }

        $img = str_replace('tachserver.online', 'tachserver.site', $img);
        $valid[] = $img;
    }

    return array_values(array_unique($valid));
}

// 6. THU THẬP DANH SÁCH BỘ TRUYỆN CẦN QUÉT
$targetComics = []; // Mảng chứa ['slug' => ..., 'url' => ...]

if ($targetSlug !== '') {
    // Quét riêng 1 truyện
    $slugClean = preg_replace('/\.html$/', '', $targetSlug);
    $targetComics[] = [
        'slug' => $slugClean,
        'url' => "https://leesincomic.com/truyen-tranh/{$slugClean}.html",
    ];
} else {
    // Quét danh sách truyện từ trang phân trang /truyen-moi-cap-nhat.html?page=X
    $listUrl = "https://leesincomic.com/truyen-moi-cap-nhat.html?page={$page}";
    echo "<div style='margin-bottom: 12px; color: #8b949e;'>Đang nạp danh sách truyện từ: <a href='{$listUrl}' target='_blank' style='color: #60a5fa;'>{$listUrl}</a> ...</div>";
    flush();

    $listHtml = fetchLeesinUrl($listUrl, 25);
    if ($listHtml) {
        // Tìm các link truyện dạng /truyen-tranh/{slug}.html
        preg_match_all('/<a[^>]+href=["\'](\/truyen-tranh\/([^"\'\/]+)\.html)["\']/i', $listHtml, $m);
        if (!empty($m[2])) {
            $seenSlugs = [];
            for ($i = 0; $i < count($m[2]); $i++) {
                $rawSlug = $m[2][$i];
                if (isset($seenSlugs[$rawSlug])) continue;
                $seenSlugs[$rawSlug] = true;

                $targetComics[] = [
                    'slug' => $rawSlug,
                    'url' => "https://leesincomic.com/truyen-tranh/{$rawSlug}.html",
                ];

                if (count($targetComics) >= $limit) {
                    break;
                }
            }
        }
    }

    if (empty($targetComics)) {
        // Dự phòng: Quét từ danh mục chung
        echo "<div class='log-entry log-warn'><span class='log-icon'>⚠</span> Không lấy được link từ trang cập nhật, chuyển sang quét qua trang chủ...</div>";
        flush();
        $homeHtml = fetchLeesinUrl('https://leesincomic.com/', 20);
        if ($homeHtml) {
            preg_match_all('/href=["\'](\/truyen-tranh\/([^"\'\/]+)\.html)["\']/i', $homeHtml, $hm);
            if (!empty($hm[2])) {
                $seen = [];
                for ($i = 0; $i < count($hm[2]); $i++) {
                    $s = $hm[2][$i];
                    if (isset($seen[$s])) continue;
                    $seen[$s] = true;
                    $targetComics[] = [
                        'slug' => $s,
                        'url' => "https://leesincomic.com/truyen-tranh/{$s}.html",
                    ];
                    if (count($targetComics) >= $limit) break;
                }
            }
        }
    }
}

echo "<div style='margin-bottom: 16px; font-weight: 600; color: #fbbf24;'>Tìm thấy " . count($targetComics) . " bộ truyện trong đợt quét này. Bắt đầu đối chiếu và bù dữ liệu MySQL...</div>";
flush();

// 7. XỬ LÝ TỪNG BỘ TRUYỆN VÀ TỪNG CHAPTER
foreach ($targetComics as $comicIndex => $item) {
    $rawSlug = $item['slug'];
    $comicUrl = $item['url'];
    $stats['comics_checked']++;

    echo "<div class='comic-card'>";
    echo "<div class='comic-header'>";
    echo "<div><span class='comic-title'>#" . ($comicIndex + 1) . " Quét: " . htmlspecialchars($rawSlug) . "</span></div>";
    echo "<div><a href='{$comicUrl}' target='_blank' style='color: #60a5fa; font-size: 11px;'>Xem link gốc ↗</a></div>";
    echo "</div>";
    echo "<div class='comic-body'>";
    flush();

    // 7.1. Cào HTML chi tiết truyện
    $comicHtml = fetchLeesinUrl($comicUrl, 25);
    if (!$comicHtml || strlen($comicHtml) < 200) {
        echo "<div class='log-entry log-error'><span class='log-icon'>✗</span> Không tải được trang chi tiết truyện từ LeesinComic ({$comicUrl})</div>";
        echo "</div></div>";
        $stats['errors']++;
        flush();
        continue;
    }

    // 7.2. Parse thông tin bộ truyện
    // Tiêu đề
    preg_match('/<h1>([^<]+)<\/h1>/i', $comicHtml, $titleM);
    if (empty($titleM[1])) {
        preg_match('/<meta property=["\']og:title["\'] content=["\']([^"\']+)["\']/i', $comicHtml, $titleM);
    }
    $comicTitle = !empty($titleM[1]) ? trim(html_entity_decode($titleM[1], ENT_QUOTES, 'UTF-8')) : $rawSlug;

    // Ảnh bìa
    preg_match('/<div class=["\']box_info_left["\'][\s\S]*?<img src=["\']([^"\']+)["\']/i', $comicHtml, $coverM);
    if (empty($coverM[1])) {
        preg_match('/<meta property=["\']og:image["\'] content=["\']([^"\']+)["\']/i', $comicHtml, $coverM);
    }
    $coverImage = !empty($coverM[1]) ? trim($coverM[1]) : '';
    if (str_starts_with($coverImage, '//')) $coverImage = 'https:' . $coverImage;
    $coverImage = str_replace('tachserver.online', 'tachserver.site', $coverImage);

    // Tóm tắt
    preg_match('/<meta property=["\']og:description["\'] content=[\'"]([^\'"]*)[\'"]/i', $comicHtml, $descM);
    $summary = !empty($descM[1]) ? trim(html_entity_decode($descM[1], ENT_QUOTES, 'UTF-8')) : ($comicTitle . ' - Đọc truyện tranh online tại Leesin Comic.');

    // Tác giả
    preg_match('/Tác [Gg]iả:[\s\S]*?<a[^>]*>([^<]+)<\/a>/i', $comicHtml, $authorM);
    $author = !empty($authorM[1]) ? trim($authorM[1]) : 'Đang cập nhật';

    // Nhóm dịch
    preg_match('/<a href=["\']\/nhom-dich-[^"\']+["\'][^>]*>([^<]+)<\/a>/i', $comicHtml, $teamM);
    $teamName = !empty($teamM[1]) ? trim($teamM[1]) : 'Leesin Scans';
    $teamId = 'team-' . cleanVietnameseSlug($teamName);

    // Thể loại
    $genres = [];
    preg_match('/<ul class=["\']list-tag-story[^\'"]*["\']>[\s\S]*?<\/ul>/i', $comicHtml, $tagSection);
    if (!empty($tagSection[0])) {
        preg_match_all('/<a[^>]*>([^<]+)<\/a>/i', $tagSection[0], $tags);
        if (!empty($tags[1])) {
            foreach ($tags[1] as $tg) {
                $gTrim = trim($tg);
                if ($gTrim !== '') $genres[] = $gTrim;
            }
        }
    }
    if (empty($genres)) $genres = ['Manhwa', 'Action'];

    // Lượt xem & theo dõi
    preg_match('/Lượt xem:\s*([0-9.,]+)/i', $comicHtml, $viewsM);
    $views = !empty($viewsM[1]) ? intval(str_replace(['.', ','], '', $viewsM[1])) : 500;

    preg_match('/Lượt theo dõi:\s*([0-9.,]+)/i', $comicHtml, $followsM);
    $follows = !empty($followsM[1]) ? intval(str_replace(['.', ','], '', $followsM[1])) : 50;

    $standardSlug = cleanVietnameseSlug($comicTitle);
    if ($standardSlug === '') $standardSlug = cleanVietnameseSlug($rawSlug);

    // 7.3. ĐỐI CHIẾU TRUYỆN TRONG MYSQL
    $dbComic = null;
    $stmtFindComic = $pdo->prepare("SELECT * FROM `{$COMIC_TABLE}` WHERE slug = ? OR slug = ? OR title = ? LIMIT 1");
    $stmtFindComic->execute([$standardSlug, $rawSlug, $comicTitle]);
    $dbComic = $stmtFindComic->fetch();

    $activeComicId = null;
    if ($dbComic) {
        $activeComicId = $dbComic[$colComicId];
        $stats['comics_existed']++;
        echo "<div class='log-entry log-skip'><span class='log-icon'>ℹ</span> Truyện đã có trong MySQL: <strong>" . htmlspecialchars($comicTitle) . "</strong> (ID: <code>" . htmlspecialchars($activeComicId) . "</code>)</div>";
    } else {
        // TẠO MỚI BỘ TRUYỆN VÀO MYSQL
        $newComicId = 'comic-' . $standardSlug;
        $insertData = [];

        if (in_array('id', $comicCols)) $insertData['id'] = $newComicId;
        if (in_array('story_id', $comicCols)) $insertData['story_id'] = $newComicId;
        if (in_array('title', $comicCols)) $insertData['title'] = $comicTitle;
        if (in_array('slug', $comicCols)) $insertData['slug'] = $standardSlug;
        if (in_array('cover_image', $comicCols)) $insertData['cover_image'] = $coverImage;
        if (in_array('banner_image', $comicCols)) $insertData['banner_image'] = $coverImage;
        if (in_array('authors', $comicCols)) $insertData['authors'] = json_encode([$author], JSON_UNESCAPED_UNICODE);
        if (in_array('author', $comicCols)) $insertData['author'] = $author;
        if (in_array('status', $comicCols)) $insertData['status'] = 'Đang tiến hành';
        if (in_array('genres', $comicCols)) $insertData['genres'] = json_encode($genres, JSON_UNESCAPED_UNICODE);
        if (in_array('summary', $comicCols)) $insertData['summary'] = $summary;
        if (in_array('description', $comicCols)) $insertData['description'] = $summary;
        if (in_array('team_id', $comicCols)) $insertData['team_id'] = $teamId;
        if (in_array('team_name', $comicCols)) $insertData['team_name'] = $teamName;
        if (in_array('views', $comicCols)) $insertData['views'] = $views;
        if (in_array('follows', $comicCols)) $insertData['follows'] = $follows;
        if (in_array('rating', $comicCols)) $insertData['rating'] = 5.0;
        if (in_array('rating_count', $comicCols)) $insertData['rating_count'] = 1;
        if (in_array('is_hot', $comicCols)) $insertData['is_hot'] = ($views > 5000 ? 1 : 0);
        if (in_array('is_trending', $comicCols)) $insertData['is_trending'] = ($views > 3000 ? 1 : 0);
        if (in_array('updated_at', $comicCols)) $insertData['updated_at'] = date('c');

        $colsStr = '`' . implode('`, `', array_keys($insertData)) . '`';
        $placeholders = implode(', ', array_fill(0, count($insertData), '?'));
        $stmtInsert = $pdo->prepare("INSERT INTO `{$COMIC_TABLE}` ({$colsStr}) VALUES ({$placeholders})");
        $stmtInsert->execute(array_values($insertData));

        $activeComicId = $newComicId;
        $stats['comics_created']++;
        echo "<div class='log-entry log-success'><span class='log-icon'>✓</span> Đã tạo mới bộ truyện: <strong>" . htmlspecialchars($comicTitle) . "</strong> (ID: <code>" . htmlspecialchars($activeComicId) . "</code>)</div>";
    }
    flush();

    // 7.4. QUÉT VÀ ĐỐI CHIẾU CHAPTERS
    // Trích xuất tất cả chapter từ trang chi tiết
    // Mẫu: <div class="chap_name"><a href="/truyen-tranh/tac-gia-xx/chap-41--end-season-1.html" title="Tác Giả XX Chap 41 - End Season 1">...Chap 41...</a></div>
    preg_match_all('/<div class=["\']chap_name["\']>\s*<a href=["\']([^"\']+)["\'] title=["\']([^"\']*)["\']>([\s\S]*?)<\/a>/i', $comicHtml, $rawChapMatches, PREG_SET_ORDER);

    if (empty($rawChapMatches)) {
        echo "<div class='log-entry log-warn'><span class='log-icon'>⚠</span> Không tìm thấy danh sách chapter nào trên LeesinComic</div>";
        echo "</div></div>";
        flush();
        continue;
    }

    $crawledChapters = [];
    foreach ($rawChapMatches as $rcm) {
        $chapHref = trim($rcm[1]);
        $chapTitleAttr = trim($rcm[2]);
        $chapText = strip_tags(trim($rcm[3]));

        // Lấy số chapter
        $chapNum = null;
        if (preg_match('/(?:chap|chương|tập)[_\-\s]*([0-9]+(?:\.[0-9]+)?)/i', $chapHref . ' ' . $chapTitleAttr . ' ' . $chapText, $numMatch)) {
            $chapNum = floatval($numMatch[1]);
        } elseif (preg_match('/\/([0-9]+(?:\.[0-9]+)?)\.html/i', $chapHref, $numMatch2)) {
            $chapNum = floatval($numMatch2[1]);
        } elseif (stripos($chapHref, 'oneshot') !== false || stripos($chapText, 'oneshot') !== false) {
            $chapNum = 1.0;
        }

        if ($chapNum === null) {
            continue;
        }

        $fullChapUrl = str_starts_with($chapHref, 'http') ? $chapHref : "https://leesincomic.com" . (str_starts_with($chapHref, '/') ? '' : '/') . $chapHref;
        $cleanTitle = $chapTitleAttr !== '' ? $chapTitleAttr : ($chapText !== '' ? $chapText : "Chương {$chapNum}");

        $crawledChapters[(string)$chapNum] = [
            'num' => $chapNum,
            'title' => $cleanTitle,
            'url' => $fullChapUrl,
            'href' => $chapHref,
        ];
    }

    // Sắp xếp các chapter theo số tăng dần (1, 2, 3...)
    uksort($crawledChapters, function($a, $b) {
        return floatval($a) <=> floatval($b);
    });

    echo "<div style='margin: 8px 0; color: #8b949e; font-size: 11px;'>Tổng số chương tìm thấy: <strong>" . count($crawledChapters) . "</strong>. Bắt đầu kiểm tra dữ liệu thiếu trong MySQL...</div>";
    flush();

    // Lấy danh sách số chapter đã tồn tại trong database của truyện này để đối chiếu cực nhanh
    $stmtExistingChaps = $pdo->prepare("SELECT {$colChapNum} FROM `chapters` WHERE {$colChapFk} = ?");
    $stmtExistingChaps->execute([$activeComicId]);
    $existingNumsList = $stmtExistingChaps->fetchAll(PDO::FETCH_COLUMN);
    $existingNumsSet = [];
    foreach ($existingNumsList as $n) {
        $existingNumsSet[(string)floatval($n)] = true;
    }

    $comicSkippedCount = 0;
    $comicInsertedCount = 0;

    foreach ($crawledChapters as $numStr => $chapInfo) {
        $chNum = $chapInfo['num'];

        // Kiểm tra xem chapter đã có trong MySQL chưa
        if (isset($existingNumsSet[(string)$chNum])) {
            $comicSkippedCount++;
            $stats['chapters_existed']++;
            continue;
        }

        // CHAPTER CHƯA CÓ -> TIẾN HÀNH CÀO ẢNH VÀ INSERT BÙ VÀO MYSQL
        $chapHtml = fetchLeesinUrl($chapInfo['url'], 20);
        $images = extractImagesFromChapterHtml($chapHtml);

        if (empty($images)) {
            // Thử link biến thể
            $altUrl = "https://leesincomic.com/truyen-tranh/{$rawSlug}/chap-{$chNum}.html";
            if ($altUrl !== $chapInfo['url']) {
                $altHtml = fetchLeesinUrl($altUrl, 15);
                $images = extractImagesFromChapterHtml($altHtml);
            }
        }

        $chapId = "chap-{$standardSlug}-" . str_replace('.', '-', (string)$chNum);
        $chapTitle = $chapInfo['title'];
        if (!str_starts_with($chapTitle, 'Chương') && !str_starts_with($chapTitle, 'Chap')) {
            $chapTitle = "Chương {$chNum}: {$chapTitle}";
        }

        $chapData = [];
        if (in_array('id', $chapCols)) $chapData['id'] = $chapId;
        if (in_array('comic_id', $chapCols)) $chapData['comic_id'] = $activeComicId;
        if (in_array('story_id', $chapCols)) $chapData['story_id'] = $activeComicId;
        if (in_array('comic_title', $chapCols)) $chapData['comic_title'] = $comicTitle;
        if (in_array('story_title', $chapCols)) $chapData['story_title'] = $comicTitle;
        if (in_array('chapter_number', $chapCols)) $chapData['chapter_number'] = $chNum;
        if (in_array('number', $chapCols)) $chapData['number'] = $chNum;
        if (in_array('title', $chapCols)) $chapData['title'] = $chapTitle;
        if (in_array('images', $chapCols)) $chapData['images'] = json_encode($images, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (in_array('team_id', $chapCols)) $chapData['team_id'] = $teamId;
        if (in_array('team_name', $chapCols)) $chapData['team_name'] = $teamName;
        if (in_array('views', $chapCols)) $chapData['views'] = 50;
        if (in_array('is_password_protected', $chapCols)) $chapData['is_password_protected'] = 0;
        if (in_array('created_at', $chapCols)) $chapData['created_at'] = date('Y-m-d H:i:s');
        if (in_array('updated_at', $chapCols)) $chapData['updated_at'] = date('Y-m-d H:i:s');

        $cColsStr = '`' . implode('`, `', array_keys($chapData)) . '`';
        $cPlaceholders = implode(', ', array_fill(0, count($chapData), '?'));
        
        try {
            $stmtInsertChap = $pdo->prepare("INSERT INTO `chapters` ({$cColsStr}) VALUES ({$cPlaceholders})");
            $stmtInsertChap->execute(array_values($chapData));

            $comicInsertedCount++;
            $stats['chapters_inserted']++;
            $stats['images_saved'] += count($images);
            $existingNumsSet[(string)$chNum] = true;

            echo "<div class='log-entry log-success'>";
            echo "<span class='log-icon'>+</span>";
            echo "<span>Bù thành công <strong>[Chap {$chNum}]</strong>: <em>" . htmlspecialchars($chapTitle) . "</em> (" . count($images) . " ảnh)</span>";
            echo "</div>";
            flush();
        } catch (Exception $e) {
            echo "<div class='log-entry log-error'><span class='log-icon'>✗</span> Lỗi khi lưu Chap {$chNum}: " . htmlspecialchars($e->getMessage()) . "</div>";
            $stats['errors']++;
            flush();
        }
    }

    echo "<div style='margin-top: 8px; padding-top: 8px; border-top: 1px dashed #30363d; font-size: 11px; color: #8b949e;'>";
    echo "✓ Hoàn tất đối chiếu truyện này: Đã bỏ qua <strong>{$comicSkippedCount}</strong> chapter có sẵn, đã bù mới <strong>{$comicInsertedCount}</strong> chapter vào MySQL.";
    echo "</div>";

    echo "</div></div>";
    flush();
}

$nextPage = $page + 1;
$nextUrl = "?page={$nextPage}&limit={$limit}" . ($autoNext ? "&auto=1" : "");
?>
    </div>

    <!-- Thanh tổng kết trạng thái dính dưới màn hình -->
    <div class="summary-bar">
        <div>
            <span style="font-weight: bold; color: #fff;">KẾT QUẢ ĐỢT QUÉT (Trang <?php echo $page; ?>):</span>
            <span class="badge badge-blue">Truyện: <?php echo $stats['comics_checked']; ?></span>
            <span class="badge badge-green">Tạo mới: <?php echo $stats['comics_created']; ?></span>
            <span class="badge badge-amber">Chapter bù mới: <?php echo $stats['chapters_inserted']; ?></span>
            <span class="badge badge-skip">Chapter đã có: <?php echo $stats['chapters_existed']; ?></span>
            <span class="badge badge-green">Ảnh lưu: <?php echo $stats['images_saved']; ?></span>
            <?php if ($stats['errors'] > 0): ?>
                <span class="badge badge-red">Lỗi: <?php echo $stats['errors']; ?></span>
            <?php endif; ?>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
            <?php if ($autoNext): ?>
                <span id="countdown-text" style="color: #fbbf24; font-size: 12px; font-weight: bold;">
                    ⏳ Tự động chuyển sang Trang <?php echo $nextPage; ?> sau <span id="sec">3</span>s...
                </span>
                <a href="<?php echo $nextUrl; ?>" class="btn">Chuyển ngay</a>
                <a href="?page=<?php echo $page; ?>&limit=<?php echo $limit; ?>" class="btn btn-outline">Dừng tự động</a>
                <script>
                    let s = 3;
                    const timer = setInterval(() => {
                        s--;
                        const el = document.getElementById('sec');
                        if (el) el.innerText = s;
                        if (s <= 0) {
                            clearInterval(timer);
                            window.location.href = "<?php echo $nextUrl; ?>";
                        }
                    }, 1000);
                </script>
            <?php else: ?>
                <a href="<?php echo $nextUrl; ?>" class="btn">
                    <span>Tiếp tục sang Trang <?php echo $nextPage; ?> (Batch kế tiếp) ➔</span>
                </a>
            <?php endif; ?>
        </div>
    </div>
</div>
</body>
</html>
