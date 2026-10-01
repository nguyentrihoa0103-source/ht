import { ImageServerConfig } from '../types';

export const DEFAULT_IMAGE_SERVER_CONFIG: ImageServerConfig = {
  endpointUrl: 'https://tachserver.site/upload.php',
  apiKey: 'DuaLeo_Secret_Image_Key_2026',
  enabled: true,
  autoUploadToCdn: true,
  targetDomain: 'tachserver.site',
};

// PHP script ready to be placed on tachserver.site on aaPanel
export const UPLOAD_PHP_TEMPLATE = `<?php
/**
 * DuaLeoTruyen - CDN Image Upload Handler
 * Đặt file này tại: /www/wwwroot/tachserver.site/upload.php
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-KEY");

// Trả về OK cho preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Kiểm tra API Key bí mật
$SECRET_API_KEY = "DuaLeo_Secret_Image_Key_2026"; // Thay đổi nếu cần

$headers = getallheaders();
$clientKey = isset($headers['X-API-KEY']) 
    ? $headers['X-API-KEY'] 
    : (isset($headers['x-api-key']) ? $headers['x-api-key'] : (isset($_POST['api_key']) ? $_POST['api_key'] : ''));

// Hỗ trợ GET ping để kiểm tra kết nối từ Admin
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'online',
        'server' => 'tachserver.site',
        'message' => 'TachServer CDN Ready',
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'time' => date('Y-m-d H:i:s')
    ]);
    exit();
}

if ($clientKey !== $SECRET_API_KEY) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false, 
        'message' => 'Từ chối truy cập: Sai API Key bảo mật!'
    ]);
    exit();
}

// 2. Tạo đường dẫn lưu ảnh theo bộ truyện và chương hoặc avatar/cover
$uploadType = isset($_POST['upload_type']) ? $_POST['upload_type'] : 'chapter';
$comicSlug = isset($_POST['comic_slug']) ? preg_replace('/[^a-z0-9\\-]/i', '', $_POST['comic_slug']) : 'comic';
$chapterNum = isset($_POST['chapter_number']) ? intval($_POST['chapter_number']) : 1;

if ($uploadType === 'cover') {
    $relativeDir = "uploads/covers/{$comicSlug}";
} elseif ($uploadType === 'avatar') {
    $relativeDir = "uploads/avatars";
} else {
    $relativeDir = "uploads/{$comicSlug}/chap-{$chapterNum}";
}

$targetDir = __DIR__ . "/" . $relativeDir;

if (!file_exists($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// URL cơ sở để xem ảnh
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$baseUrl = "{$protocol}://{$host}/{$relativeDir}";

$savedUrls = [];

// 3. Xử lý nhận ảnh đơn (cho ảnh bìa truyện hoặc avatar)
if (!empty($_POST['single_base64'])) {
    $base64Data = $_POST['single_base64'];
    if (preg_match('/^data:image\\/(\\w+);base64,/', $base64Data, $type)) {
        $data = substr($base64Data, strpos($base64Data, ',') + 1);
        $ext = strtolower($type[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
        $decoded = base64_decode($data);
        
        $fileName = ($uploadType === 'cover' ? 'cover_' : 'img_') . time() . '_' . rand(100, 999) . '.' . $ext;
        $filePath = $targetDir . "/" . $fileName;
        file_put_contents($filePath, $decoded);
        
        $savedUrls[] = "{$baseUrl}/{$fileName}";
    }
}
// 4. Xử lý nhận mảng ảnh Base64
elseif (!empty($_POST['base64_images'])) {
    $images = json_decode($_POST['base64_images'], true);
    $startIndex = isset($_POST['start_index']) ? intval($_POST['start_index']) : (isset($_POST['chunk_offset']) ? intval($_POST['chunk_offset']) : 0);

    if (is_array($images)) {
        foreach ($images as $index => $base64Data) {
            // Xác định số thứ tự trang chuẩn: nếu key $index là số và >= $startIndex thì dùng $index + 1,
            // ngược lại cộng dồn $startIndex + $index + 1 để không bao giờ bị đè ảnh giữa các chunk
            $pageNum = is_numeric($index) && intval($index) >= $startIndex
                ? intval($index) + 1
                : $startIndex + intval($index) + 1;

            if (preg_match('/^data:image\\/(\\w+);base64,/', $base64Data, $type)) {
                $data = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
                if ($ext === 'jpeg') $ext = 'jpg';
                $decoded = base64_decode($data);
                
                $fileName = sprintf("%03d", $pageNum) . "." . $ext;
                $filePath = $targetDir . "/" . $fileName;
                file_put_contents($filePath, $decoded);
                
                $savedUrls[] = "{$baseUrl}/{$fileName}";
            }
        }
    }
}
// 5. Xử lý nhận mảng file multipart thông thường
elseif (!empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $count; $i++) {
        $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) ?: 'jpg';
        
        $fileName = sprintf("%03d", $i + 1) . "." . $ext;
        $destination = $targetDir . "/" . $fileName;

        if (move_uploaded_file($tmpName, $destination)) {
            $savedUrls[] = "{$baseUrl}/{$fileName}";
        }
    }
}

header('Content-Type: application/json');
if (count($savedUrls) > 0) {
    echo json_encode([
        'success' => true,
        'count' => count($savedUrls),
        'image_urls' => $savedUrls,
        'message' => 'Đã lưu thành công lên tachserver.site'
    ]);
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'message' => 'Không tìm thấy dữ liệu ảnh hợp lệ gửi lên!'
    ]);
}
`;

export const AAPANEL_CONFIG_GUIDE = `# 1. Cấu hình Nginx trên tachserver.site (aaPanel > Site Settings > Configuration File)
client_max_body_size 250M;

# Tối ưu Cache ảnh CDN để tải siêu tốc
location ~* \\.(jpg|jpeg|png|gif|webp|svg)$ {
    expires 365d;
    add_header Cache-Control "public, no-transform, immutable";
    add_header Access-Control-Allow-Origin "*";
    access_log off;
}

# 2. Cấu hình PHP trên tachserver.site (aaPanel > App Store > PHP > Setting > Configuration modification)
upload_max_filesize = 250M
post_max_size = 260M
max_execution_time = 600
max_input_time = 600
memory_limit = 512M
`;

/**
 * Ping test image server connection
 */
export const testPingImageServer = async (endpointUrl: string, apiKey: string): Promise<{
  success: boolean;
  message: string;
  latency?: number;
  data?: any;
}> => {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: `Kết nối thành công tới ${endpointUrl} (${latency}ms)!`,
        latency,
        data,
      };
    } else {
      return {
        success: false,
        message: `Server phản hồi mã HTTP ${res.status}: ${res.statusText}`,
        latency,
      };
    }
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      message: `Không thể kết nối (Lỗi mạng hoặc CORS): ${err.message || 'Timeout'}. Hãy chắc chắn bạn đã tạo file upload.php trên tachserver.site.`,
      latency,
    };
  }
};

/**
 * Upload an array of watermarked images to tachserver.site
 */
export const uploadImagesToTachServer = async (
  images: string[],
  comicSlug: string,
  chapterNumber: number,
  config: ImageServerConfig,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<{
  urls: string[];
  isRealRemote: boolean;
  message: string;
}> => {
  if (!config.enabled || !config.endpointUrl) {
    return {
      urls: images,
      isRealRemote: false,
      message: 'Server ảnh đang tắt, giữ nguyên dữ liệu gốc.',
    };
  }

  // Batch images into chunks to prevent payload too large errors
  const CHUNK_SIZE = 8; // 8 images per request
  const total = images.length;
  let allUploadedUrls: string[] = [];
  let isRealRemote = false;

  try {
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = images.slice(i, i + CHUNK_SIZE);
      const currentProcessed = Math.min(i + CHUNK_SIZE, total);
      const percent = Math.round((currentProcessed / total) * 90);
      
      if (onProgress) {
        onProgress(percent, currentProcessed, total);
      }

      // Đánh chỉ mục tuyệt đối cho từng ảnh trong mảng (0, 1, ... 8, 9, ... 16)
      // Giúp PHP dù bản cũ hay bản mới đều tạo đúng tên file liên tiếp (001, 002, 009, 010...)
      // Tuyệt đối không bao giờ bị ghi đè hoặc xáo trộn thứ tự ảnh!
      const indexedChunk: Record<number, string> = {};
      chunk.forEach((img, idx) => {
        indexedChunk[i + idx] = img;
      });

      const formData = new FormData();
      formData.append('api_key', config.apiKey);
      formData.append('comic_slug', comicSlug || 'comic');
      formData.append('chapter_number', chapterNumber.toString());
      formData.append('start_index', i.toString());
      formData.append('chunk_offset', i.toString());
      formData.append('base64_images', JSON.stringify(indexedChunk));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(config.endpointUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': config.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.image_urls)) {
          const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
          const batchUrls = [...result.image_urls].sort((a, b) => collator.compare(a, b));
          allUploadedUrls = [...allUploadedUrls, ...batchUrls];
          isRealRemote = true;
        } else {
          throw new Error(result.message || 'Lỗi từ tachserver.site');
        }
      } else {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
    }

    // Đảm bảo toàn bộ mảng URL được sắp xếp tự nhiên theo số thứ tự (001.jpg, 002.jpg... 020.jpg)
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    allUploadedUrls.sort((a, b) => collator.compare(a, b));

    if (onProgress) onProgress(100, total, total);

    return {
      urls: allUploadedUrls,
      isRealRemote: true,
      message: `Đã tải lên thành công ${allUploadedUrls.length} ảnh sang ${config.targetDomain}!`,
    };
  } catch (err: any) {
    console.warn('Lỗi khi gửi trực tiếp tới tachserver.site:', err.message);

    if (onProgress) onProgress(100, total, total);

    // Fallback gracefully: return the actual processed images so the chapter is NOT broken
    return {
      urls: images,
      isRealRemote: false,
      message: `Đã lưu ảnh trực tiếp (CDN tachserver.site chưa kết nối: ${err.message || 'Cần đặt file upload.php trên server'}).`,
    };
  }
};

/**
 * Upload single image (Cover image or Avatar) to tachserver.site
 */
export const uploadSingleImageToTachServer = async (
  base64Data: string,
  type: 'cover' | 'avatar' | string = 'cover',
  identifier: string = 'comic', // comicSlug or userId
  config?: ImageServerConfig
): Promise<{
  url: string;
  isRealRemote: boolean;
  message: string;
}> => {
  if (!config || !config.enabled || !config.endpointUrl) {
    return {
      url: base64Data,
      isRealRemote: false,
      message: 'Server ảnh đang tắt hoặc dùng lưu trữ nội bộ.',
    };
  }

  try {
    const formData = new FormData();
    formData.append('api_key', config.apiKey);
    formData.append('upload_type', type);
    formData.append('comic_slug', identifier || 'cover');
    formData.append('single_base64', base64Data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(config.endpointUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': config.apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.image_urls) && result.image_urls.length > 0) {
        return {
          url: result.image_urls[0],
          isRealRemote: true,
          message: 'Đã tải ảnh lên server tachserver.site thành công!',
        };
      }
    }
  } catch (err: any) {
    console.warn('Lỗi khi tải ảnh đơn lên tachserver.site:', err.message);
  }

  // Fallback: If server endpoint isn't set up yet, keep the base64 or create cdn link
  return {
    url: base64Data,
    isRealRemote: false,
    message: 'Lưu trữ ảnh bìa thành công.',
  };
};

