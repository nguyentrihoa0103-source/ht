/**
 * Bảng tổng hợp lượt xem chính thức và chuẩn hóa theo từng nhóm dịch của Leesin Comic.
 * Đảm bảo 100% đồng bộ nhất quán giữa Admin Dashboard, Danh Sách Nhóm Dịch (/nhom-dich-all),
 * Portal Nhóm Dịch và Tủ Sách độc giả.
 */

export const OFFICIAL_TEAM_VIEWS: Record<string, number> = {
  'lessin comic': 914602,
  'lavibit windroom gl': 259416,
  'pheromone': 258774,
  'j97': 61125,
  'bạch dương team': 51519,
  'mưa tháng sáu': 40140,
  "wyn's den (out)": 33662,
  "wyn's den": 33662,
  'tĩnh dạ': 28172,
  'iris team (out)': 23859,
  'iris team': 23859,
  'shortie squad (out)': 22955,
  'shortie squad': 22955,
  'spadez': 17904,
  'là muse team': 17042,
  'nora translation team': 12818,
  'tiểu hồ điệp (out)': 9761,
  'tiểu hồ điệp': 9761,
  'cúc thần thánh (out)': 4834,
  'cúc thần thánh': 4834,
  'vườn hạt dẻ': 4054,
  'vườn hoa mặt trời': 3897,
  'nguyệt hạ team': 3615,
  'kurage house': 3368,
  'tự kỷ cùng é': 2465,
  'đậu đỏ (out)': 2305,
  'đậu đỏ': 2305,
  'xí xẹo': 2152,
  'bỉ ngạn trans': 2121,
  'water team (out)': 1702,
  'water team': 1702,
  'pinky team': 1392,
  'louisiana translation (out)': 1140,
  'louisiana translation': 1140,
  'cửu thập tứ': 795,
  'mèo béo team (out)': 657,
  'mèo béo team': 657,
  'sipj team': 311,
  'yoru translation team (out)': 291,
  'yoru translation team': 291,
  'tiệm bánh ngọt': 252,
  'linguabridge team': 9,
  'ủn ỉn (out)': 554,
  'ủn ỉn': 554,
};

/**
 * Lấy lượt xem chuẩn chính thức của nhóm dịch
 */
export function getOfficialTeamViews(
  team: { id?: string; name?: string; totalViews?: number } | null | undefined,
  fallbackViews: number = 0
): number {
  if (!team) return fallbackViews;
  const currentTotal = Math.max(team.totalViews || 0, fallbackViews);
  if (currentTotal > 0) {
    return currentTotal;
  }
  const nameKey = (team.name || '').toLowerCase().trim();
  const idKey = (team.id || '').toLowerCase().trim();

  const officialBase = OFFICIAL_TEAM_VIEWS[nameKey] ?? OFFICIAL_TEAM_VIEWS[idKey] ?? 0;
  return Math.max(officialBase, currentTotal);
}
