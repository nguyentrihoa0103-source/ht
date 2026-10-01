/**
 * Tiện ích định dạng và chuẩn hóa thời gian:
 * - Timezone chuẩn: Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 * - Hỗ trợ chuẩn ISO 8601 (VD: 2026-09-30T10:00:00.000Z)
 * - Hỗ trợ chuẩn datetime MySQL (VD: 2026-09-30 10:00:00)
 * - Hỗ trợ định dạng Việt Nam ngày/tháng/năm (VD: 30/09/2026 hay 14/11/2025)
 * - Tự động nhận diện chuỗi tương đối ("X phút trước", "X giờ trước", "X ngày trước", "Vừa xong")
 * - Bảo đảm KHÔNG bị lỗi biến ngày tương lai thành "Vừa xong"
 */

// Mốc thời gian crawl gốc của dữ liệu crawl lịch sử trên leesincomic (24/09/2026 12:00:00 UTC)
const CRAWL_ANCHOR_TIME = 1790251200000; // 2026-09-24T12:00:00.000Z

/**
 * Định dạng ngày theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 */
function formatVnDate(timestamp: number): string {
  const vnTime = new Date(timestamp + 7 * 3600 * 1000);
  const d = vnTime.getUTCDate().toString().padStart(2, '0');
  const m = (vnTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = vnTime.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Định dạng thời gian tương đối hiển thị cho người đọc (VD: "5 phút trước", "2 giờ trước", "20/09/2026")
 * Tính chuẩn theo múi giờ Việt Nam (Asia/Ho_Chi_Minh), KHÔNG biến dữ liệu cũ thành "Vừa xong"
 */
export function formatRelativeTime(dateInput?: string | null): string {
  if (!dateInput || !dateInput.trim()) {
    return '';
  }

  const trimmed = dateInput.trim();
  const timestamp = parseDateOrRelative(trimmed);
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return trimmed;
  }

  const now = Date.now();

  // Nếu mốc thời gian lớn hơn hiện tại hơn 1 phút (lên lịch hẹn giờ hoặc chênh lệch múi giờ)
  if (timestamp > now + 60 * 1000) {
    return formatVnDate(timestamp);
  }

  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return 'Vừa xong';
  }
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins} phút trước`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} giờ trước`;
  }
  if (diffSec < 86400 * 7) {
    const days = Math.floor(diffSec / 86400);
    return `${days} ngày trước`;
  }

  // Quá 7 ngày: hiển thị chuẩn định dạng dd/MM/yyyy theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
  return formatVnDate(timestamp);
}

/**
 * Định dạng ngày giờ chi tiết đầy đủ theo múi giờ Việt Nam (VD: "15:30 20/09/2026")
 */
export function formatDateTime(dateInput?: string | null): string {
  if (!dateInput || !dateInput.trim()) return '';
  const trimmed = dateInput.trim();
  const timestamp = parseDateOrRelative(trimmed);
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) return trimmed;

  const vnTime = new Date(timestamp + 7 * 3600 * 1000);
  const d = vnTime.getUTCDate().toString().padStart(2, '0');
  const m = (vnTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = vnTime.getUTCFullYear();
  const hours = vnTime.getUTCHours().toString().padStart(2, '0');
  const mins = vnTime.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${mins} ${d}/${m}/${y}`;
}

/**
 * Chuyển đổi mọi định dạng thời gian (ISO, MySQL, dd/MM/yyyy, chuỗi tương đối tiếng Việt)
 * thành số milliseconds (timestamp epoch) theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
 * để so sánh và sắp xếp chuẩn xác 100%, KHÔNG lấy thời gian hiện tại của frontend cho dữ liệu cũ.
 */
export function parseDateOrRelative(str?: string | null): number {
  if (!str || typeof str !== 'string') return 0;
  const s = str.trim();
  if (!s) return 0;
  const sLower = s.toLowerCase();

  // Mọi chuỗi tương đối tiếng Việt tồn đọng từ dữ liệu crawl cũ đều neo cố định vào CRAWL_ANCHOR_TIME,
  // tuyệt đối KHÔNG neo vào Date.now() của frontend để tránh biến chapter cũ thành "Vừa xong".
  const refTime = CRAWL_ANCHOR_TIME;

  // "vừa xong" - biểu thị hành động xảy ra ngay lúc này
  if (sLower.includes('vừa xong') || sLower.includes('vua xong')) {
    return Date.now() - 10 * 1000;
  }

  // "X giây trước"
  const secMatch = sLower.match(/(\d+)\s*(?:giây|s)\s*trước/);
  if (secMatch) {
    return refTime - parseInt(secMatch[1], 10) * 1000;
  }

  // "X phút trước"
  const minMatch = sLower.match(/(\d+)\s*(?:phút|m|min)\s*trước/);
  if (minMatch) {
    return refTime - parseInt(minMatch[1], 10) * 60 * 1000;
  }

  // "X giờ trước" / "X tiếng trước"
  const hourMatch = sLower.match(/(\d+)\s*(?:giờ|tiếng|h)\s*trước/);
  if (hourMatch) {
    return refTime - parseInt(hourMatch[1], 10) * 3600 * 1000;
  }

  // "hôm nay"
  if (sLower.includes('hôm nay')) {
    return refTime - 60 * 1000;
  }

  // "hôm qua"
  if (sLower.includes('hôm qua')) {
    return refTime - 24 * 3600 * 1000;
  }

  // "X ngày trước"
  const dayMatch = sLower.match(/(\d+)\s*ngày\s*trước/);
  if (dayMatch) {
    return refTime - parseInt(dayMatch[1], 10) * 86400 * 1000;
  }

  // "X tuần trước"
  const weekMatch = sLower.match(/(\d+)\s*tuần\s*trước/);
  if (weekMatch) {
    return refTime - parseInt(weekMatch[1], 10) * 7 * 86400 * 1000;
  }

  // "X tháng trước"
  const monthMatch = sLower.match(/(\d+)\s*tháng\s*trước/);
  if (monthMatch) {
    return refTime - parseInt(monthMatch[1], 10) * 30 * 86400 * 1000;
  }

  // "X năm trước"
  const yearMatch = sLower.match(/(\d+)\s*năm\s*trước/);
  if (yearMatch) {
    return refTime - parseInt(yearMatch[1], 10) * 365 * 86400 * 1000;
  }

  // Định dạng dd/MM/yyyy hoặc dd-MM-yyyy (VD: "20/09/2026" hay "14/11/2025")
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    // Chuẩn hóa theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
    const t = Date.UTC(year, month, day, hour - 7, min, sec);
    if (!isNaN(t)) {
      return t;
    }
  }

  // Định dạng YYYY-MM-DD không có giờ (VD: "2026-09-25") -> hiểu là 12:00 trưa giờ Việt Nam (+07:00)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parsedDateOnly = Date.parse(`${s}T12:00:00+07:00`);
    if (!isNaN(parsedDateOnly)) {
      return parsedDateOnly;
    }
  }

  // Chuẩn ISO / MySQL (VD: "2026-09-30 12:00:00", "2026-09-30T12:00:00Z", "2026-09-20T10:00:00.000Z")
  let cleanStr = s;
  if (cleanStr.includes(' ') && !cleanStr.includes('T')) {
    cleanStr = cleanStr.replace(' ', 'T');
  }

  // Nếu chuỗi ngày giờ không có hậu tố múi giờ (Z hoặc +/-HH:MM), luôn gán múi giờ Việt Nam (+07:00)
  if (!/([Zz]|[+\-]\d{2}:?\d{2})$/.test(cleanStr)) {
    cleanStr += '+07:00';
  }

  const parsed = Date.parse(cleanStr);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return 0;
}

/**
 * Lấy mốc thời gian cập nhật thực tế của bộ truyện hoặc chapter mới nhất:
 * - So sánh cả thời gian của truyện (updatedAt / createdAt) và tất cả các chapter (updatedAt / createdAt)
 * - Lấy mốc thời gian lớn nhất (mới nhất) để truyện luôn nổi lên đầu danh sách "Truyện Mới Cập Nhật"
 */
export function getComicLatestTimestamp(comic: {
  updatedAt?: string;
  createdAt?: string;
  chapters?: Array<{ chapterNumber?: number; createdAt?: string; updatedAt?: string; scheduledDate?: string }>;
}): number {
  if (!comic) return 0;
  let maxTime = parseDateOrRelative(comic.updatedAt) || parseDateOrRelative(comic.createdAt) || 0;

  if (Array.isArray(comic.chapters) && comic.chapters.length > 0) {
    for (const ch of comic.chapters) {
      if (!ch) continue;
      const chTime = parseDateOrRelative(ch.updatedAt || ch.createdAt);
      if (chTime > maxTime) {
        maxTime = chTime;
      }
    }
  }

  return maxTime;
}

/**
 * Helper kiểm tra chuẩn xác trạng thái thông báo chưa đọc
 * Đồng bộ 100% giữa Database, API, State và UI Badge
 */
export function isNotificationUnread(n: any): boolean {
  if (!n) return false;
  // Kiểm tra is_read từ SQL
  if (n.is_read !== undefined && n.is_read !== null) {
    if (n.is_read === 1 || n.is_read === '1' || n.is_read === true) return false;
    if (n.is_read === 0 || n.is_read === '0' || n.is_read === false) return true;
  }
  // Kiểm tra isRead từ Frontend / API JSON
  if (n.isRead !== undefined && n.isRead !== null) {
    if (n.isRead === 1 || n.isRead === '1' || n.isRead === true) return false;
    if (n.isRead === 0 || n.isRead === '0' || n.isRead === false) return true;
  }
  return true;
}
