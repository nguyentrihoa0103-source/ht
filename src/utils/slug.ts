/**
 * Helper to convert Vietnamese string to clean URL slug without accents
 * e.g., 'Võ Thuật' -> 'vo-thuat'
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function toSlug(str: string): string {
  if (!str) return '';
  return removeVietnameseAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Map slug back to readable category name
 */
export const GENRE_SLUG_MAP: Record<string, string> = {
  'tat-ca': 'Tất cả',
  'tinh-yeu': 'Tình Yêu',
  'da-full': 'Đã Full',
  'manhwa': 'Manhwa',
  'supernatural': 'Supernatural',
  'boy-love': 'Boy Love',
  'boylove': 'BoyLove',
  'drama': 'Drama',
  'horror': 'Horror',
  'psychological': 'Psychological',
  '18': '18+',
  '18-plus': '18+',
  'dam-my': 'Đam Mỹ',
  'tong-tai': 'Tổng Tài',
  'truyen-mau': 'Truyện Màu',
  'girllove': 'GirlLove',
  'girl-love': 'Girl Love',
  'bach-hop': 'Bách Hợp',
  'yuri': 'Yuri',
  'hanh-dong': 'Hành Động',
  'lang-man': 'Lãng Mạn',
  'tinh-cam': 'Tình Cảm',
  'hoc-duong': 'Học Đường',
  'abo': 'ABO',
  'co-dai': 'Cổ Đại',
  'xuyen-khong': 'Xuyên Không',
  'hai-huoc': 'Hài Hước',
  'historical': 'Historical',
  'fantasy': 'Fantasy',
  'manga': 'Manga',
  'kich-tinh': 'Kịch Tính',
  'manhua': 'Manhua',
  'phieu-luu': 'Phiêu Lưu',
  'vien-tuong': 'Viễn Tưởng',
  'cap-nhap-moi-ngay': 'Cập Nhập Mỗi Ngày',
  'hentai': 'Hentai',
  'oneshot': 'Oneshot',
  'trinh-tham': 'Trinh Thám',
  'kinh-di': 'Kinh Dị',
  'harem': 'Harem',
  'yaoi': 'Yaoi',
  'nguoi-thu': 'Người Thú',
  'doujinshi': 'Doujinshi',
  '15': '15',
  'chuyen-sinh': 'Chuyển Sinh',
  'echi': 'Echi',
  'gender-warp': 'Gender Warp',
  'hot-nhat': 'Hot Nhất',
  'trong-sinh': 'Trọng Sinh',
  'ngon-tinh': 'Ngôn Tình',
  'tu-tien': 'Tu Tiên',
  'ham-nguc': 'Hầm Ngục',
  'hoang-gia': 'Hoàng Gia',
  'huyen-huyen': 'Huyền Huyễn',
  'vo-thuat': 'Võ Thuật',
  'do-thi': 'Đô Thị',
};
