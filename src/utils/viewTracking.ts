import { Comic, Chapter, ScanTeam } from '../types';

export interface ViewLog {
  id: string;
  comicId: string;
  chapterId?: string;
  teamId?: string;
  teamName?: string;
  multiplier: number;
  viewedAt: string; // ISO string
}

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo đúng múi giờ Việt Nam (GMT+7: Asia/Ho_Chi_Minh)
 */
export function getGmt7DateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Lấy chuỗi hiển thị DD/MM theo đúng múi giờ Việt Nam (GMT+7: Asia/Ho_Chi_Minh)
 */
export function getGmt7DisplayDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  return `${day}/${month}`;
}

/**
 * Lấy chuỗi tháng YYYY-MM theo đúng múi giờ Việt Nam (GMT+7: Asia/Ho_Chi_Minh)
 */
export function getGmt7MonthString(d: Date = new Date()): string {
  return getGmt7DateString(d).slice(0, 7);
}

/**
 * Tính số lượt xem của một bộ truyện (Hiển thị trên Trang Truyện & Thẻ Truyện ngoài web)
 * Giữ nguyên 100% toàn bộ view cũ tích lũy từ trước đến nay
 */
export function getEffectiveComicViews(
  comic: Comic | null | undefined,
  _startDateStr?: string | null,
  _viewLogs?: ViewLog[]
): number {
  if (!comic) return 0;
  const rawViews = Number(comic.views) || 0;
  const chapsTotal = (comic.chapters || []).reduce((sum, ch) => sum + (Number(ch.views) || 0), 0);
  return Math.max(rawViews, chapsTotal);
}

/**
 * Tính số lượt xem của một chương truyện
 * Giữ nguyên 100% toàn bộ view cũ
 */
export function getEffectiveChapterViews(
  chapter: Chapter | null | undefined,
  _comic?: Comic | null,
  _startDateStr?: string | null,
  _viewLogs?: ViewLog[]
): number {
  if (!chapter) return 0;
  return Number(chapter.views) || 0;
}

/**
 * Tính tổng lượt xem của Nhóm Dịch (Dùng chung cho cả Team Portal, Danh sách nhóm /nhom-dich-all, Admin Dashboard)
 * ĐẢM BẢO 100% ĐỒNG BỘ VỚI TỔNG VIEW TRUYỆN Ở NGOÀI & GIỮ NGUYÊN TOÀN BỘ VIEW CŨ TÍCH LŨY
 */
export function getEffectiveTeamViews(
  team: ScanTeam | null | undefined,
  teamComics: Comic[] = [],
  _startDateStr?: string | null,
  _viewLogs?: ViewLog[]
): number {
  if (!team) return 0;
  const comicsSum = (teamComics || []).reduce(
    (sum, c) => sum + getEffectiveComicViews(c),
    0
  );
  return Math.max(Number(team.totalViews) || 0, comicsSum);
}

/**
 * Tính thống kê lượt xem 7 ngày gần nhất cho nhóm dịch theo múi giờ GMT+7 (Asia/Ho_Chi_Minh)
 */
export function getEffectiveTeam7DaysStats(
  team: ScanTeam | null | undefined,
  _startDateStr?: string | null,
  teamTotalViewsCount: number = 0
): { dateStr: string; displayDate: string; views: number }[] {
  const result: { dateStr: string; displayDate: string; views: number }[] = [];
  const now = new Date();

  // Tạo chính xác 7 ngày gần nhất theo múi giờ GMT+7 (Asia/Ho_Chi_Minh)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = getGmt7DateString(d);
    const displayDate = getGmt7DisplayDate(d);

    const rawViews = team?.dailyViews?.[dateStr] || 0;
    const views = teamTotalViewsCount > 0 ? Math.min(rawViews, teamTotalViewsCount) : rawViews;
    result.push({ dateStr, displayDate, views });
  }

  return result;
}

/**
 * Kiểm tra tính hợp lệ của timestamp
 */
export function isTimestampValidForTracking(
  _timestamp: string | Date | number,
  _startDateStr?: string | null
): boolean {
  return true;
}
