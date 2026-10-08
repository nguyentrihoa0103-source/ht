// AUTO-GENERATED INITIAL DATA FROM LEESINCOMIC.COM (642 COMICS, 33 TEAMS, 35 USERS)
import { Comic, ScanTeam, User, ChapterComment, ReadingHistoryItem, FollowedComicItem, FollowedTeamItem, AppNotification } from '../types';

export const INITIAL_DATA_VERSION = '2026-09-30-leesin-fixed-timestamps-v8';

export const INITIAL_USERS: User[] = [
  {
    "id": "user-admin",
    "name": "Admin Leesin Comic",
    "email": "admin@leesincomic.com",
    "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
    "role": "ADMIN",
    "teamId": "team-leesin",
    "teamName": "Leesin Scans",
    "canUpload": true,
    "createdAt": "2026-01-01",
    "username": "admin",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-lessin-comic-leader",
    "name": "Trưởng Nhóm Lessin Comic",
    "email": "lessin-comic@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/lessin-comic-1763349912.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-lessin-comic",
    "teamName": "Lessin Comic",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "lessin-comic",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-xi-xeo-leader",
    "name": "Trưởng Nhóm Xí Xẹo",
    "email": "xi-xeo@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/xi-xeo-1778941070.png",
    "role": "TEAM_LEADER",
    "teamId": "team-xi-xeo",
    "teamName": "Xí Xẹo",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "xi-xeo",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-spadez-leader",
    "name": "Trưởng Nhóm spadez",
    "email": "spadez@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/spadez-1759595819.png",
    "role": "TEAM_LEADER",
    "teamId": "team-spadez",
    "teamName": "spadez",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "spadez",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-kurage-house-leader",
    "name": "Trưởng Nhóm Kurage House",
    "email": "kurage-house@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/kurage-house-1786637129.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-kurage-house",
    "teamName": "Kurage House",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "kurage-house",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-tinh-da-leader",
    "name": "Trưởng Nhóm Tĩnh Dạ",
    "email": "tinh-da@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tinh-da-1759336856.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-tinh-da",
    "teamName": "Tĩnh Dạ",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "tinh-da",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-vuon-hoa-mat-troi-leader",
    "name": "Trưởng Nhóm Vườn Hoa Mặt Trời",
    "email": "vuon-hoa-mat-troi@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/vuon-hoa-mat-troi-1782234265.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-vuon-hoa-mat-troi",
    "teamName": "Vườn Hoa Mặt Trời",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "vuon-hoa-mat-troi",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-un-in-out-leader",
    "name": "Trưởng Nhóm Ủn Ỉn (out)",
    "email": "un-in-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/un-in-1785720729.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-un-in-out",
    "teamName": "Ủn Ỉn (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "un-in-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-bi-ngan-trans-leader",
    "name": "Trưởng Nhóm Bỉ Ngạn Trans",
    "email": "bi-ngan-trans@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/bi-ngan-trans-1760503818.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-bi-ngan-trans",
    "teamName": "Bỉ Ngạn Trans",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "bi-ngan-trans",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-pinky-team-leader",
    "name": "Trưởng Nhóm Pinky Team",
    "email": "pinky-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/pinky-team-1787295974.png",
    "role": "TEAM_LEADER",
    "teamId": "team-pinky-team",
    "teamName": "Pinky Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "pinky-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-wyns-den-out-leader",
    "name": "Trưởng Nhóm Wyn's Den (out)",
    "email": "wyns-den-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/Wyn-s-den-out--1778246273.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-wyns-den-out",
    "teamName": "Wyn's Den (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "wyns-den-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-nguyet-ha-team-leader",
    "name": "Trưởng Nhóm Nguyệt Hạ Team",
    "email": "nguyet-ha-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/nguyet-ha-team-1783615859.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-nguyet-ha-team",
    "teamName": "Nguyệt Hạ Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "nguyet-ha-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-nora-translation-team-leader",
    "name": "Trưởng Nhóm Nora Translation Team",
    "email": "nora-translation-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/nora-translation-team-1771006285.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-nora-translation-team",
    "teamName": "Nora Translation Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "nora-translation-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-yoru-translation-team-out-leader",
    "name": "Trưởng Nhóm Yoru Translation Team (out)",
    "email": "yoru-translation-team-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/yoru-translation-team-1783836172.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-yoru-translation-team-out",
    "teamName": "Yoru Translation Team (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "yoru-translation-team-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-mua-thang-sau-leader",
    "name": "Trưởng Nhóm Mưa Tháng Sáu",
    "email": "mua-thang-sau@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/mua-thang-sau-1786378124.png",
    "role": "TEAM_LEADER",
    "teamId": "team-mua-thang-sau",
    "teamName": "Mưa Tháng Sáu",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "mua-thang-sau",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-tiem-banh-ngot-leader",
    "name": "Trưởng Nhóm Tiệm Bánh Ngọt",
    "email": "tiem-banh-ngot@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tiem-banh-ngot-1784270354.png",
    "role": "TEAM_LEADER",
    "teamId": "team-tiem-banh-ngot",
    "teamName": "Tiệm Bánh Ngọt",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "tiem-banh-ngot",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-pheromone-leader",
    "name": "Trưởng Nhóm Pheromone",
    "email": "pheromone@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/pheromone-1786463682.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-pheromone",
    "teamName": "Pheromone",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "pheromone",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-iris-team-out-leader",
    "name": "Trưởng Nhóm Iris Team (out)",
    "email": "iris-team-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/iris-team--1766907010.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-iris-team-out",
    "teamName": "Iris Team (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "iris-team-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-vuon-hat-de-leader",
    "name": "Trưởng Nhóm Vườn Hạt Dẻ",
    "email": "vuon-hat-de@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/vuon-hat-de-1786556819.png",
    "role": "TEAM_LEADER",
    "teamId": "team-vuon-hat-de",
    "teamName": "Vườn Hạt Dẻ",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "vuon-hat-de",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-dau-do-out-leader",
    "name": "Trưởng Nhóm Đậu Đỏ (out)",
    "email": "dau-do-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/dau-do-1759323573.png",
    "role": "TEAM_LEADER",
    "teamId": "team-dau-do-out",
    "teamName": "Đậu Đỏ (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "dau-do-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-cuc-than-thanh-out-leader",
    "name": "Trưởng Nhóm Cúc Thần Thánh (out)",
    "email": "cuc-than-thanh-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/cuc-than-thanh-1759513197.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-cuc-than-thanh-out",
    "teamName": "Cúc Thần Thánh (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "cuc-than-thanh-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-shortie-squad-out-leader",
    "name": "Trưởng Nhóm Shortie Squad (out)",
    "email": "shortie-squad-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/shortie-squad-1759249661.png",
    "role": "TEAM_LEADER",
    "teamId": "team-shortie-squad-out",
    "teamName": "Shortie Squad (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "shortie-squad-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-bach-duong-team-leader",
    "name": "Trưởng Nhóm Bạch Dương Team",
    "email": "bach-duong-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/bach-duong-team-1759247238.png",
    "role": "TEAM_LEADER",
    "teamId": "team-bach-duong-team",
    "teamName": "Bạch Dương Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "bach-duong-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-cuu-thap-tu-leader",
    "name": "Trưởng Nhóm Cửu Thập Tứ",
    "email": "cuu-thap-tu@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/cuu-thap-tu-1759252992.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-cuu-thap-tu",
    "teamName": "Cửu Thập Tứ",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "cuu-thap-tu",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-la-muse-team-leader",
    "name": "Trưởng Nhóm Là Muse Team",
    "email": "la-muse-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/la-muse-team-1784781951.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-la-muse-team",
    "teamName": "Là Muse Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "la-muse-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-louisiana-translation-out-leader",
    "name": "Trưởng Nhóm Louisiana Translation (out)",
    "email": "louisiana-translation-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/louisiana-translation--1771820371.png",
    "role": "TEAM_LEADER",
    "teamId": "team-louisiana-translation-out",
    "teamName": "Louisiana Translation (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "louisiana-translation-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-tieu-ho-diep-out-leader",
    "name": "Trưởng Nhóm Tiểu Hồ Điệp (out)",
    "email": "tieu-ho-diep-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tieu-ho-diep-1776757717.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-tieu-ho-diep-out",
    "teamName": "Tiểu Hồ Điệp (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "tieu-ho-diep-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-lavibit-windroom-gl-leader",
    "name": "Trưởng Nhóm Lavibit Windroom GL",
    "email": "lavibit-windroom-gl@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/lavibit-Windroom-gl-1784437408.png",
    "role": "TEAM_LEADER",
    "teamId": "team-lavibit-windroom-gl",
    "teamName": "Lavibit Windroom GL",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "lavibit-windroom-gl",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-water-team-out-leader",
    "name": "Trưởng Nhóm Water Team (out)",
    "email": "water-team-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/water-team-1781314786.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-water-team-out",
    "teamName": "Water Team (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "water-team-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-meo-beo-team-out-leader",
    "name": "Trưởng Nhóm Mèo Béo Team (out)",
    "email": "meo-beo-team-out@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/meo-beo-team-1785347705.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-meo-beo-team-out",
    "teamName": "Mèo Béo Team (out)",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "meo-beo-team-out",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-sipj-team-leader",
    "name": "Trưởng Nhóm Sipj Team",
    "email": "sipj-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/sipj-team-1786207130.jpeg",
    "role": "TEAM_LEADER",
    "teamId": "team-sipj-team",
    "teamName": "Sipj Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "sipj-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-tu-ky-cung-e-leader",
    "name": "Trưởng Nhóm Tự Kỷ Cùng É",
    "email": "tu-ky-cung-e@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tu-ky-cung-e-1788876449.png",
    "role": "TEAM_LEADER",
    "teamId": "team-tu-ky-cung-e",
    "teamName": "Tự Kỷ Cùng É",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "tu-ky-cung-e",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-linguabridge-team-leader",
    "name": "Trưởng Nhóm Linguabridge Team",
    "email": "linguabridge-team@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/linguabridge-team-1789202578.png",
    "role": "TEAM_LEADER",
    "teamId": "team-linguabridge-team",
    "teamName": "Linguabridge Team",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "linguabridge-team",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-j97-leader",
    "name": "Trưởng Nhóm j97",
    "email": "j97@leesincomic.com",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/j97-1777609339.jpg",
    "role": "TEAM_LEADER",
    "teamId": "team-j97",
    "teamName": "j97",
    "canUpload": true,
    "createdAt": "2026-01-15",
    "username": "j97",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  },
  {
    "id": "user-reader-vip",
    "name": "Minh Thư (Độc Giả)",
    "email": "reader@gmail.com",
    "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    "role": "READER",
    "createdAt": "2026-06-01",
    "username": "reader",
    "password": "password",
    "passwordHash": "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  }
];

export const INITIAL_TEAMS: ScanTeam[] = [
  {
    "id": "team-lessin-comic",
    "name": "Lessin Comic",
    "slug": "lessin-comic",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/lessin-comic-1763349912.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/lessin-comic-1763349912.jpeg",
    "bio": "Nhóm dịch Lessin Comic chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Lessin Comic tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Lessin Comic qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-lessin-comic-leader",
    "leaderName": "Trưởng Nhóm Lessin Comic",
    "totalViews": 914602,
    "follows": 3026,
    "monthlyViews": {
      "2026-05": 128005,
      "2026-06": 164578,
      "2026-07": 192008,
      "2026-08": 210294,
      "2026-09": 219439,
      "2026-10": 4
    },
    "dailyViews": {
      "2026-09-24": 1,
      "2026-09-30": 1,
      "2026-10-01": 4
    },
    "members": [
      {
        "id": "user-lessin-comic-leader",
        "name": "Trưởng Nhóm Lessin Comic",
        "email": "lessin-comic@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 181
      }
    ]
  },
  {
    "id": "team-xi-xeo",
    "name": "Xí Xẹo",
    "slug": "xi-xeo",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/xi-xeo-1778941070.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/xi-xeo-1778941070.png",
    "bio": "Nhóm dịch Xí Xẹo chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Xí Xẹo tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Xí Xẹo qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-xi-xeo-leader",
    "leaderName": "Trưởng Nhóm Xí Xẹo",
    "totalViews": 2152,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 680,
      "2026-06": 874,
      "2026-07": 1020,
      "2026-08": 1117,
      "2026-09": 1168,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-xi-xeo-leader",
        "name": "Trưởng Nhóm Xí Xẹo",
        "email": "xi-xeo@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-spadez",
    "name": "spadez",
    "slug": "spadez",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/spadez-1759595819.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/spadez-1759595819.png",
    "bio": "Nhóm dịch spadez chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch spadez tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm spadez qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-spadez-leader",
    "leaderName": "Trưởng Nhóm spadez",
    "totalViews": 17904,
    "follows": 59,
    "monthlyViews": {
      "2026-05": 2514,
      "2026-06": 3232,
      "2026-07": 3771,
      "2026-08": 4130,
      "2026-09": 4313,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-spadez-leader",
        "name": "Trưởng Nhóm spadez",
        "email": "spadez@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-kurage-house",
    "name": "Kurage House",
    "slug": "kurage-house",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/kurage-house-1786637129.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/kurage-house-1786637129.jpg",
    "bio": "Nhóm dịch Kurage House chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Kurage House tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Kurage House qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-kurage-house-leader",
    "leaderName": "Trưởng Nhóm Kurage House",
    "totalViews": 3368,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 547,
      "2026-06": 704,
      "2026-07": 821,
      "2026-08": 900,
      "2026-09": 942,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-kurage-house-leader",
        "name": "Trưởng Nhóm Kurage House",
        "email": "kurage-house@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-tinh-da",
    "name": "Tĩnh Dạ",
    "slug": "tinh-da",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tinh-da-1759336856.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/tinh-da-1759336856.jpeg",
    "bio": "Nhóm dịch Tĩnh Dạ chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Tĩnh Dạ tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Tĩnh Dạ qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-tinh-da-leader",
    "leaderName": "Trưởng Nhóm Tĩnh Dạ",
    "totalViews": 28172,
    "follows": 93,
    "monthlyViews": {
      "2026-05": 4168,
      "2026-06": 5359,
      "2026-07": 6253,
      "2026-08": 6848,
      "2026-09": 7149,
      "2026-10": 0
    },
    "dailyViews": {
      "2026-09-24": 1
    },
    "members": [
      {
        "id": "user-tinh-da-leader",
        "name": "Trưởng Nhóm Tĩnh Dạ",
        "email": "tinh-da@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-vuon-hoa-mat-troi",
    "name": "Vườn Hoa Mặt Trời",
    "slug": "vuon-hoa-mat-troi",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/vuon-hoa-mat-troi-1782234265.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/vuon-hoa-mat-troi-1782234265.jpeg",
    "bio": "Nhóm dịch Vườn Hoa Mặt Trời chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Vườn Hoa Mặt Trời tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Vườn Hoa Mặt Trời qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-vuon-hoa-mat-troi-leader",
    "leaderName": "Trưởng Nhóm Vườn Hoa Mặt Trời",
    "totalViews": 3897,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 545,
      "2026-06": 701,
      "2026-07": 818,
      "2026-08": 896,
      "2026-09": 937,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-vuon-hoa-mat-troi-leader",
        "name": "Trưởng Nhóm Vườn Hoa Mặt Trời",
        "email": "vuon-hoa-mat-troi@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-un-in-out",
    "name": "Ủn Ỉn (out)",
    "slug": "un-in-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/un-in-1785720729.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/un-in-1785720729.jpg",
    "bio": "Nhóm dịch Ủn Ỉn (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Ủn Ỉn (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Ủn Ỉn (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-un-in-out-leader",
    "leaderName": "Trưởng Nhóm Ủn Ỉn (out)",
    "totalViews": 554,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 77,
      "2026-06": 99,
      "2026-07": 116,
      "2026-08": 127,
      "2026-09": 135,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-un-in-out-leader",
        "name": "Trưởng Nhóm Ủn Ỉn (out)",
        "email": "un-in-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-bi-ngan-trans",
    "name": "Bỉ Ngạn Trans",
    "slug": "bi-ngan-trans",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/bi-ngan-trans-1760503818.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/bi-ngan-trans-1760503818.jpg",
    "bio": "Nhóm dịch Bỉ Ngạn Trans chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Bỉ Ngạn Trans tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Bỉ Ngạn Trans qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-bi-ngan-trans-leader",
    "leaderName": "Trưởng Nhóm Bỉ Ngạn Trans",
    "totalViews": 2121,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 297,
      "2026-06": 382,
      "2026-07": 445,
      "2026-08": 488,
      "2026-09": 511,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-bi-ngan-trans-leader",
        "name": "Trưởng Nhóm Bỉ Ngạn Trans",
        "email": "bi-ngan-trans@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-pinky-team",
    "name": "Pinky Team",
    "slug": "pinky-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/pinky-team-1787295974.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/pinky-team-1787295974.png",
    "bio": "Nhóm dịch Pinky Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Pinky Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Pinky Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-pinky-team-leader",
    "leaderName": "Trưởng Nhóm Pinky Team",
    "totalViews": 1392,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 201,
      "2026-06": 259,
      "2026-07": 302,
      "2026-08": 330,
      "2026-09": 347,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-pinky-team-leader",
        "name": "Trưởng Nhóm Pinky Team",
        "email": "pinky-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-wyns-den-out",
    "name": "Wyn's Den (out)",
    "slug": "wyns-den-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/Wyn-s-den-out--1778246273.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/Wyn-s-den-out--1778246273.jpg",
    "bio": "Nhóm dịch Wyn's Den (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Wyn's Den (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Wyn's Den (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-wyns-den-out-leader",
    "leaderName": "Trưởng Nhóm Wyn's Den (out)",
    "totalViews": 33662,
    "follows": 111,
    "monthlyViews": {
      "2026-05": 4729,
      "2026-06": 6080,
      "2026-07": 7093,
      "2026-08": 7769,
      "2026-09": 8109,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-wyns-den-out-leader",
        "name": "Trưởng Nhóm Wyn's Den (out)",
        "email": "wyns-den-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 6
      }
    ]
  },
  {
    "id": "team-nguyet-ha-team",
    "name": "Nguyệt Hạ Team",
    "slug": "nguyet-ha-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/nguyet-ha-team-1783615859.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/nguyet-ha-team-1783615859.jpg",
    "bio": "Nhóm dịch Nguyệt Hạ Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Nguyệt Hạ Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Nguyệt Hạ Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-nguyet-ha-team-leader",
    "leaderName": "Trưởng Nhóm Nguyệt Hạ Team",
    "totalViews": 3615,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 838,
      "2026-06": 1078,
      "2026-07": 1258,
      "2026-08": 1378,
      "2026-09": 1440,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-nguyet-ha-team-leader",
        "name": "Trưởng Nhóm Nguyệt Hạ Team",
        "email": "nguyet-ha-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-nora-translation-team",
    "name": "Nora Translation Team",
    "slug": "nora-translation-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/nora-translation-team-1771006285.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/nora-translation-team-1771006285.jpg",
    "bio": "Nhóm dịch Nora Translation Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Nora Translation Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Nora Translation Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-nora-translation-team-leader",
    "leaderName": "Trưởng Nhóm Nora Translation Team",
    "totalViews": 12818,
    "follows": 41,
    "monthlyViews": {
      "2026-05": 3431,
      "2026-06": 4412,
      "2026-07": 5147,
      "2026-08": 5638,
      "2026-09": 5886,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-nora-translation-team-leader",
        "name": "Trưởng Nhóm Nora Translation Team",
        "email": "nora-translation-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-yoru-translation-team-out",
    "name": "Yoru Translation Team (out)",
    "slug": "yoru-translation-team-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/yoru-translation-team-1783836172.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/yoru-translation-team-1783836172.jpg",
    "bio": "Nhóm dịch Yoru Translation Team (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Yoru Translation Team (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Yoru Translation Team (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-yoru-translation-team-out-leader",
    "leaderName": "Trưởng Nhóm Yoru Translation Team (out)",
    "totalViews": 291,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 135,
      "2026-06": 174,
      "2026-07": 203,
      "2026-08": 222,
      "2026-09": 234,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-yoru-translation-team-out-leader",
        "name": "Trưởng Nhóm Yoru Translation Team (out)",
        "email": "yoru-translation-team-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-mua-thang-sau",
    "name": "Mưa Tháng Sáu",
    "slug": "mua-thang-sau",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/mua-thang-sau-1786378124.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/mua-thang-sau-1786378124.png",
    "bio": "Nhóm dịch Mưa Tháng Sáu chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Mưa Tháng Sáu tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Mưa Tháng Sáu qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-mua-thang-sau-leader",
    "leaderName": "Trưởng Nhóm Mưa Tháng Sáu",
    "totalViews": 40140,
    "follows": 120,
    "monthlyViews": {
      "2026-05": 5620,
      "2026-06": 7225,
      "2026-07": 8430,
      "2026-08": 9232,
      "2026-09": 9636,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-mua-thang-sau-leader",
        "name": "Trưởng Nhóm Mưa Tháng Sáu",
        "email": "mua-thang-sau@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 7
      }
    ]
  },
  {
    "id": "team-tiem-banh-ngot",
    "name": "Tiệm Bánh Ngọt",
    "slug": "tiem-banh-ngot",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tiem-banh-ngot-1784270354.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/tiem-banh-ngot-1784270354.png",
    "bio": "Nhóm dịch Tiệm Bánh Ngọt chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Tiệm Bánh Ngọt tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Tiệm Bánh Ngọt qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-tiem-banh-ngot-leader",
    "leaderName": "Trưởng Nhóm Tiệm Bánh Ngọt",
    "totalViews": 252,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 137,
      "2026-06": 177,
      "2026-07": 206,
      "2026-08": 226,
      "2026-09": 238,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-tiem-banh-ngot-leader",
        "name": "Trưởng Nhóm Tiệm Bánh Ngọt",
        "email": "tiem-banh-ngot@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-pheromone",
    "name": "Pheromone",
    "slug": "pheromone",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/pheromone-1786463682.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/pheromone-1786463682.jpg",
    "bio": "Nhóm dịch Pheromone chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Pheromone tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Pheromone qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-pheromone-leader",
    "leaderName": "Trưởng Nhóm Pheromone",
    "totalViews": 258774,
    "follows": 789,
    "monthlyViews": {
      "2026-05": 36613,
      "2026-06": 47075,
      "2026-07": 54920,
      "2026-08": 60151,
      "2026-09": 62769,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-pheromone-leader",
        "name": "Trưởng Nhóm Pheromone",
        "email": "pheromone@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 47
      }
    ]
  },
  {
    "id": "team-iris-team-out",
    "name": "Iris Team (out)",
    "slug": "iris-team-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/iris-team--1766907010.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/iris-team--1766907010.jpeg",
    "bio": "Nhóm dịch Iris Team (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Iris Team (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Iris Team (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-iris-team-out-leader",
    "leaderName": "Trưởng Nhóm Iris Team (out)",
    "totalViews": 23859,
    "follows": 79,
    "monthlyViews": {
      "2026-05": 3346,
      "2026-06": 4302,
      "2026-07": 5019,
      "2026-08": 5497,
      "2026-09": 5740,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-iris-team-out-leader",
        "name": "Trưởng Nhóm Iris Team (out)",
        "email": "iris-team-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-vuon-hat-de",
    "name": "Vườn Hạt Dẻ",
    "slug": "vuon-hat-de",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/vuon-hat-de-1786556819.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/vuon-hat-de-1786556819.png",
    "bio": "Nhóm dịch Vườn Hạt Dẻ chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Vườn Hạt Dẻ tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Vườn Hạt Dẻ qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-vuon-hat-de-leader",
    "leaderName": "Trưởng Nhóm Vườn Hạt Dẻ",
    "totalViews": 4054,
    "follows": 13,
    "monthlyViews": {
      "2026-05": 572,
      "2026-06": 735,
      "2026-07": 858,
      "2026-08": 940,
      "2026-09": 982,
      "2026-10": 0
    },
    "dailyViews": {
      "2026-09-24": 1
    },
    "members": [
      {
        "id": "user-vuon-hat-de-leader",
        "name": "Trưởng Nhóm Vườn Hạt Dẻ",
        "email": "vuon-hat-de@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-dau-do-out",
    "name": "Đậu Đỏ (out)",
    "slug": "dau-do-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/dau-do-1759323573.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/dau-do-1759323573.png",
    "bio": "Nhóm dịch Đậu Đỏ (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Đậu Đỏ (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Đậu Đỏ (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-dau-do-out-leader",
    "leaderName": "Trưởng Nhóm Đậu Đỏ (out)",
    "totalViews": 2305,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 336,
      "2026-06": 433,
      "2026-07": 505,
      "2026-08": 553,
      "2026-09": 579,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-dau-do-out-leader",
        "name": "Trưởng Nhóm Đậu Đỏ (out)",
        "email": "dau-do-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-cuc-than-thanh-out",
    "name": "Cúc Thần Thánh (out)",
    "slug": "cuc-than-thanh-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/cuc-than-thanh-1759513197.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/cuc-than-thanh-1759513197.jpg",
    "bio": "Nhóm dịch Cúc Thần Thánh (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Cúc Thần Thánh (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Cúc Thần Thánh (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-cuc-than-thanh-out-leader",
    "leaderName": "Trưởng Nhóm Cúc Thần Thánh (out)",
    "totalViews": 4834,
    "follows": 15,
    "monthlyViews": {
      "2026-05": 884,
      "2026-06": 1136,
      "2026-07": 1326,
      "2026-08": 1452,
      "2026-09": 1518,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-cuc-than-thanh-out-leader",
        "name": "Trưởng Nhóm Cúc Thần Thánh (out)",
        "email": "cuc-than-thanh-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-shortie-squad-out",
    "name": "Shortie Squad (out)",
    "slug": "shortie-squad-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/shortie-squad-1759249661.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/shortie-squad-1759249661.png",
    "bio": "Nhóm dịch Shortie Squad (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Shortie Squad (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Shortie Squad (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-shortie-squad-out-leader",
    "leaderName": "Trưởng Nhóm Shortie Squad (out)",
    "totalViews": 22955,
    "follows": 76,
    "monthlyViews": {
      "2026-05": 3214,
      "2026-06": 4132,
      "2026-07": 4821,
      "2026-08": 5280,
      "2026-09": 5513,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-shortie-squad-out-leader",
        "name": "Trưởng Nhóm Shortie Squad (out)",
        "email": "shortie-squad-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-bach-duong-team",
    "name": "Bạch Dương Team",
    "slug": "bach-duong-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/bach-duong-team-1759247238.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/bach-duong-team-1759247238.png",
    "bio": "Nhóm dịch Bạch Dương Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Bạch Dương Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Bạch Dương Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-bach-duong-team-leader",
    "leaderName": "Trưởng Nhóm Bạch Dương Team",
    "totalViews": 51519,
    "follows": 170,
    "monthlyViews": {
      "2026-05": 7374,
      "2026-06": 9481,
      "2026-07": 11062,
      "2026-08": 12115,
      "2026-09": 12645,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-bach-duong-team-leader",
        "name": "Trưởng Nhóm Bạch Dương Team",
        "email": "bach-duong-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 10
      }
    ]
  },
  {
    "id": "team-cuu-thap-tu",
    "name": "Cửu Thập Tứ",
    "slug": "cuu-thap-tu",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/cuu-thap-tu-1759252992.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/cuu-thap-tu-1759252992.jpg",
    "bio": "Nhóm dịch Cửu Thập Tứ chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Cửu Thập Tứ tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Cửu Thập Tứ qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-cuu-thap-tu-leader",
    "leaderName": "Trưởng Nhóm Cửu Thập Tứ",
    "totalViews": 795,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 111,
      "2026-06": 143,
      "2026-07": 166,
      "2026-08": 182,
      "2026-09": 193,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-cuu-thap-tu-leader",
        "name": "Trưởng Nhóm Cửu Thập Tứ",
        "email": "cuu-thap-tu@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-la-muse-team",
    "name": "Là Muse Team",
    "slug": "la-muse-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/la-muse-team-1784781951.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/la-muse-team-1784781951.jpg",
    "bio": "Nhóm dịch Là Muse Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Là Muse Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Là Muse Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-la-muse-team-leader",
    "leaderName": "Trưởng Nhóm Là Muse Team",
    "totalViews": 17042,
    "follows": 53,
    "monthlyViews": {
      "2026-05": 2423,
      "2026-06": 3116,
      "2026-07": 3635,
      "2026-08": 3981,
      "2026-09": 4158,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-la-muse-team-leader",
        "name": "Trưởng Nhóm Là Muse Team",
        "email": "la-muse-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-louisiana-translation-out",
    "name": "Louisiana Translation (out)",
    "slug": "louisiana-translation-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/louisiana-translation--1771820371.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/louisiana-translation--1771820371.png",
    "bio": "Nhóm dịch Louisiana Translation (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Louisiana Translation (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Louisiana Translation (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-louisiana-translation-out-leader",
    "leaderName": "Trưởng Nhóm Louisiana Translation (out)",
    "totalViews": 1140,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 193,
      "2026-06": 249,
      "2026-07": 290,
      "2026-08": 318,
      "2026-09": 334,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-louisiana-translation-out-leader",
        "name": "Trưởng Nhóm Louisiana Translation (out)",
        "email": "louisiana-translation-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-tieu-ho-diep-out",
    "name": "Tiểu Hồ Điệp (out)",
    "slug": "tieu-ho-diep-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tieu-ho-diep-1776757717.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/tieu-ho-diep-1776757717.jpg",
    "bio": "Nhóm dịch Tiểu Hồ Điệp (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Tiểu Hồ Điệp (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Tiểu Hồ Điệp (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-tieu-ho-diep-out-leader",
    "leaderName": "Trưởng Nhóm Tiểu Hồ Điệp (out)",
    "totalViews": 9761,
    "follows": 32,
    "monthlyViews": {
      "2026-05": 1366,
      "2026-06": 1756,
      "2026-07": 2049,
      "2026-08": 2245,
      "2026-09": 2345,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-tieu-ho-diep-out-leader",
        "name": "Trưởng Nhóm Tiểu Hồ Điệp (out)",
        "email": "tieu-ho-diep-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-lavibit-windroom-gl",
    "name": "Lavibit Windroom GL",
    "slug": "lavibit-windroom-gl",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/lavibit-Windroom-gl-1784437408.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/lavibit-Windroom-gl-1784437408.png",
    "bio": "Nhóm dịch Lavibit Windroom GL chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Lavibit Windroom GL tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Lavibit Windroom GL qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-lavibit-windroom-gl-leader",
    "leaderName": "Trưởng Nhóm Lavibit Windroom GL",
    "totalViews": 259416,
    "follows": 840,
    "monthlyViews": {
      "2026-05": 36351,
      "2026-06": 46738,
      "2026-07": 54527,
      "2026-08": 59720,
      "2026-09": 62320,
      "2026-10": 1
    },
    "dailyViews": {
      "2026-09-24": 1,
      "2026-10-01": 1
    },
    "members": [
      {
        "id": "user-lavibit-windroom-gl-leader",
        "name": "Trưởng Nhóm Lavibit Windroom GL",
        "email": "lavibit-windroom-gl@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 50
      }
    ]
  },
  {
    "id": "team-water-team-out",
    "name": "Water Team (out)",
    "slug": "water-team-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/water-team-1781314786.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/water-team-1781314786.jpg",
    "bio": "Nhóm dịch Water Team (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Water Team (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Water Team (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-water-team-out-leader",
    "leaderName": "Trưởng Nhóm Water Team (out)",
    "totalViews": 1702,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 238,
      "2026-06": 306,
      "2026-07": 357,
      "2026-08": 391,
      "2026-09": 411,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-water-team-out-leader",
        "name": "Trưởng Nhóm Water Team (out)",
        "email": "water-team-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-meo-beo-team-out",
    "name": "Mèo Béo Team (out)",
    "slug": "meo-beo-team-out",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/meo-beo-team-1785347705.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/meo-beo-team-1785347705.jpeg",
    "bio": "Nhóm dịch Mèo Béo Team (out) chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Mèo Béo Team (out) tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Mèo Béo Team (out) qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-meo-beo-team-out-leader",
    "leaderName": "Trưởng Nhóm Mèo Béo Team (out)",
    "totalViews": 657,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 167,
      "2026-06": 215,
      "2026-07": 251,
      "2026-08": 275,
      "2026-09": 288,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-meo-beo-team-out-leader",
        "name": "Trưởng Nhóm Mèo Béo Team (out)",
        "email": "meo-beo-team-out@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-sipj-team",
    "name": "Sipj Team",
    "slug": "sipj-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/sipj-team-1786207130.jpeg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/sipj-team-1786207130.jpeg",
    "bio": "Nhóm dịch Sipj Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Sipj Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Sipj Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-sipj-team-leader",
    "leaderName": "Trưởng Nhóm Sipj Team",
    "totalViews": 311,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 77,
      "2026-06": 99,
      "2026-07": 116,
      "2026-08": 127,
      "2026-09": 134,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-sipj-team-leader",
        "name": "Trưởng Nhóm Sipj Team",
        "email": "sipj-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-tu-ky-cung-e",
    "name": "Tự Kỷ Cùng É",
    "slug": "tu-ky-cung-e",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/tu-ky-cung-e-1788876449.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/tu-ky-cung-e-1788876449.png",
    "bio": "Nhóm dịch Tự Kỷ Cùng É chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Tự Kỷ Cùng É tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Tự Kỷ Cùng É qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-tu-ky-cung-e-leader",
    "leaderName": "Trưởng Nhóm Tự Kỷ Cùng É",
    "totalViews": 2465,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 913,
      "2026-06": 1174,
      "2026-07": 1370,
      "2026-08": 1501,
      "2026-09": 1569,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-tu-ky-cung-e-leader",
        "name": "Trưởng Nhóm Tự Kỷ Cùng É",
        "email": "tu-ky-cung-e@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-linguabridge-team",
    "name": "Linguabridge Team",
    "slug": "linguabridge-team",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/linguabridge-team-1789202578.png",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/linguabridge-team-1789202578.png",
    "bio": "Nhóm dịch Linguabridge Team chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch Linguabridge Team tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm Linguabridge Team qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-linguabridge-team-leader",
    "leaderName": "Trưởng Nhóm Linguabridge Team",
    "totalViews": 9,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 7,
      "2026-06": 9,
      "2026-07": 10,
      "2026-08": 11,
      "2026-09": 13,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-linguabridge-team-leader",
        "name": "Trưởng Nhóm Linguabridge Team",
        "email": "linguabridge-team@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  },
  {
    "id": "team-j97",
    "name": "j97",
    "slug": "j97",
    "avatar": "https://tachserver.site/cdn3/uploads/avatar/j97-1777609339.jpg",
    "avatarUrl": "https://tachserver.site/cdn3/uploads/avatar/j97-1777609339.jpg",
    "bio": "Nhóm dịch j97 chính thức trên Leesin Comic (leesincomic.com). Chuyên chuyển ngữ và phát hành truyện tranh độc quyền chất lượng cao.",
    "description": "Nhóm dịch j97 tại leesincomic.com",
    "donateInfo": "Ủng hộ nhóm j97 qua STK ngân hàng hoặc MoMo để nhóm có kinh phí dịch truyện tiếp nhé!",
    "leaderId": "user-j97-leader",
    "leaderName": "Trưởng Nhóm j97",
    "totalViews": 61125,
    "follows": 12,
    "monthlyViews": {
      "2026-05": 8557,
      "2026-06": 11002,
      "2026-07": 12836,
      "2026-08": 14058,
      "2026-09": 14672,
      "2026-10": 0
    },
    "dailyViews": {},
    "members": [
      {
        "id": "user-j97-leader",
        "name": "Trưởng Nhóm j97",
        "email": "j97@leesincomic.com",
        "role": "LEADER",
        "canUpload": true,
        "joinedDate": "2026-01-15",
        "uploadedChaptersCount": 5
      }
    ]
  }
];

// INITIAL_COMICS moved to ./initialComicsData.ts for bundle optimization
export { INITIAL_COMICS } from './initialComicsData';


export const INITIAL_COMMENTS: ChapterComment[] = [
  {
    "id": "cmt-1",
    "comicId": "comic-1",
    "comicTitle": "Đại Quản Gia Là Ma Hoàng",
    "comicSlug": "dai-quan-gia-la-ma-hoang",
    "comicCover": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "chapterNumber": 3,
    "chapterTitle": "Chương 3: Cửu U Bí Lục Thức Tỉnh",
    "userId": "user-reader-vip",
    "userName": "Minh Thư (Độc Giả)",
    "userAvatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    "userRole": "READER",
    "content": "Trác Phàm ngầu đét luôn anh em ơi! Quả combat đỉnh chóp, nhóm Leesin Scans dịch mượt mà không tỳ vết!",
    "likes": 42,
    "createdAt": "15 phút trước"
  },
  {
    "id": "cmt-2",
    "comicId": "comic-2",
    "comicTitle": "Võ Luyện Đỉnh Phong",
    "comicSlug": "vo-luyen-dinh-phong",
    "comicCover": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    "chapterNumber": 2,
    "chapterTitle": "Chương 2: Thí Luyện Ma Tháp",
    "userId": "user-leader-1",
    "userName": "Tài Khoản Nhóm Dịch (Leesin Comic)",
    "userAvatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    "userRole": "TEAM_LEADER",
    "content": "Cảm ơn anh em đã theo dõi và ủng hộ. Tối nay nhóm sẽ ra mắt tiếp chương 3 hẹn giờ nhé!",
    "likes": 68,
    "createdAt": "1 giờ trước"
  },
  {
    "id": "cmt-3",
    "comicId": "comic-3",
    "comicTitle": "Thiên Đạo Đồ Thư Quán",
    "comicSlug": "thien-dao-do-thu-quan",
    "comicCover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "chapterNumber": 2,
    "chapterTitle": "Chương 2: Chỉ Điểm Lỗi Sai Của Trưởng Lão",
    "userId": "user-admin",
    "userName": "Admin Tủ Sách Xinh Xinh",
    "userAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "userRole": "ADMIN",
    "content": "Hệ thống server ảnh tachserver.site và lazyteam.site đã được tối ưu hóa băng thông tải siêu tốc 0.1s. Chúc các bạn đọc truyện vui vẻ!",
    "likes": 125,
    "createdAt": "2 giờ trước"
  },
  {
    "id": "cmt-4",
    "comicId": "comic-4",
    "comicTitle": "Hắc Dạ Ám Sát Lục",
    "comicSlug": "hac-da-am-sat-luc",
    "comicCover": "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=500&auto=format&fit=crop&q=80",
    "chapterNumber": 1,
    "chapterTitle": "Chương 1: Lưỡi Dao Trong Bóng Đêm",
    "userId": "user-reader-vip",
    "userName": "Minh Thư (Độc Giả)",
    "userAvatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    "userRole": "READER",
    "content": "Nét vẽ art bộ này u tối đúng chất tâm lý kinh dị, hóng chương mới quá tác giả ơi!",
    "likes": 19,
    "createdAt": "3 giờ trước"
  }
];

export const INITIAL_READING_HISTORY: ReadingHistoryItem[] = [
  {
    "id": "hist-1790793713236-ec74",
    "userId": "user-admin",
    "comicId": "comic-nhiem-vu-hongsil",
    "comicTitle": "NHIỆM VỤ HONGSIL",
    "comicSlug": "nhiem-vu-hongsil",
    "comicCover": "https://tachserver.site/cdn3/uploads/minh_hoa/nhiem-vu-hongsil-1760203225.jpg",
    "chapterId": "chap-nhiem-vu-hongsil-1-1",
    "chapterNumber": 1,
    "chapterTitle": "Chương 1: 1",
    "lastReadAt": "Vừa xong",
    "teamName": "Lessin Comic"
  },
  {
    "id": "hist-1790793576142-vm5h",
    "userId": "user-admin",
    "comicId": "comic-tac-gia-xx",
    "comicTitle": "Tác Giả XX",
    "comicSlug": "tac-gia-xx",
    "comicCover": "https://tachserver.site/cdn3/uploads/minh_hoa/tac-gia-xx-1787398000.jpg",
    "chapterId": "chap-tac-gia-xx-40",
    "chapterNumber": 40,
    "chapterTitle": "Chương 40: Tác Giả XX Chap 40",
    "lastReadAt": "Vừa xong",
    "teamName": "Lavibit Windroom GL"
  },
  {
    "id": "hist-1790695355110-m5ht",
    "userId": "user-admin",
    "comicId": "comic-1790695277063",
    "comicTitle": "test truyện",
    "comicSlug": "test-truy-n",
    "comicCover": "data:image/webp;base64,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",
    "chapterId": "chap-1790695291063-833",
    "chapterNumber": 1,
    "chapterTitle": "Chương 1",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Leesin Scans"
  },
  {
    "id": "hist-1790811596660-5spu",
    "userId": "user-admin",
    "comicId": "comic-tuyen-tap-truyen-ngan-bl-manhwa",
    "comicTitle": "Tuyển Tập Truyện Ngắn BL Manhwa",
    "comicSlug": "tuyen-tap-truyen-ngan-bl-manhwa",
    "comicCover": "https://tachserver.site/cdn3/uploads/minh_hoa/tuyen-tap-truyen-ngan-bl-manhwa-1764089559.jpg",
    "chapterId": "chap-tuyen-tap-truyen-ngan-bl-manhwa-1",
    "chapterNumber": 1,
    "chapterTitle": "Diễm Hỏa 1",
    "lastReadAt": "Vừa xong",
    "teamName": "Lessin Comic"
  },
  {
    "id": "hist-1790258744982-8l8g",
    "userId": "user-admin",
    "comicId": "comic-19+-khoai-cam-toi-loi",
    "comicTitle": "[19+] Khoái Cảm Tội Lỗi",
    "comicSlug": "19+-khoai-cam-toi-loi",
    "comicCover": "https://tachserver.site/cdn3/uploads/minh_hoa/19+-khoai-cam-toi-loi-1787398143.jpg",
    "chapterId": "chap-19+-khoai-cam-toi-loi-23",
    "chapterNumber": 23,
    "chapterTitle": "Chương 23: Giới thiệu",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Lavibit Windroom GL"
  },
  {
    "id": "hist-1790258522914-60gq",
    "userId": "user-admin",
    "comicId": "comic-song-chung-cung-tro-giang-",
    "comicTitle": "Sống Chung Cùng Trợ Giảng",
    "comicSlug": "song-chung-cung-tro-giang-",
    "comicCover": "https://tachserver.site/cdn3/uploads/minh_hoa/song-chung-cung-tro-giang--1789295414.jpg",
    "chapterId": "chap-song-chung-cung-tro-giang--3",
    "chapterNumber": 3,
    "chapterTitle": "Chương 3: Chap 3",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Vườn Hạt Dẻ"
  },
  {
    "id": "hist-1790258420586-09un",
    "userId": "user-1790257816031",
    "comicId": "comic-an-son-mong-dam",
    "comicTitle": "Ẩn Sơn Mộng Đàm",
    "comicSlug": "an-son-mong-dam",
    "comicCover": "https://leesincomic.com/uploads/minh_hoa/an-son-mong-dam-1747462144.jpg",
    "chapterId": "chap-an-son-mong-dam-46",
    "chapterNumber": 46,
    "chapterTitle": "Chương 46: 46",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Tĩnh Dạ"
  },
  {
    "id": "hist-1790257824192-42pt",
    "userId": "user-1790257816031",
    "comicId": "comic-3",
    "comicTitle": "Cách Hiệp Sĩ Nữ Bắt Kẻ Phản Diện Phục Tùng",
    "comicSlug": "cach-hiep-si-nu-bat-ke-phan-dien-phuc-tung",
    "comicCover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "chapterId": "chap-1790257323524-660",
    "chapterNumber": 3,
    "chapterTitle": "Chương 3",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Admin Leesin Comic"
  },
  {
    "id": "hist-1790257629042-et2b",
    "userId": "user-admin",
    "comicId": "comic-3",
    "comicTitle": "Cách Hiệp Sĩ Nữ Bắt Kẻ Phản Diện Phục Tùng",
    "comicSlug": "cach-hiep-si-nu-bat-ke-phan-dien-phuc-tung",
    "comicCover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "chapterId": "chap-1790257323524-660",
    "chapterNumber": 3,
    "chapterTitle": "Chương 3",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Admin Leesin Comic"
  },
  {
    "id": "hist-1789654156220-z7p7",
    "userId": "user-1789649692624",
    "comicId": "comic-2",
    "comicTitle": "Tôi Thăng Cấp Một Mình (Solo Leveling)",
    "comicSlug": "toi-thang-cap-mot-minh",
    "comicCover": "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80",
    "chapterId": "chap-1789654151989-823",
    "chapterNumber": 4,
    "chapterTitle": "Chương 4",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "admin"
  },
  {
    "id": "hist-1",
    "userId": "user-admin",
    "comicId": "comic-1",
    "comicTitle": "Đại Quản Gia Là Ma Hoàng",
    "comicSlug": "dai-quan-gia-la-ma-hoang",
    "comicCover": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "chapterId": "chap-1-3",
    "chapterNumber": 3,
    "chapterTitle": "Chương 3: Cửu U Bí Lục Thức Tỉnh",
    "lastReadAt": "2026-09-29T10:00:00.000Z",
    "teamName": "Leesin Scans"
  },
  {
    "id": "hist-2",
    "userId": "user-admin",
    "comicId": "comic-2",
    "comicTitle": "Võ Luyện Đỉnh Phong",
    "comicSlug": "vo-luyen-dinh-phong",
    "comicCover": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    "chapterId": "chap-2-2",
    "chapterNumber": 2,
    "chapterTitle": "Chương 2: Thí Luyện Ma Tháp",
    "lastReadAt": "2 giờ trước",
    "teamName": "Leesin Scans"
  }
];

export const INITIAL_FOLLOWED_COMICS: FollowedComicItem[] = [
  {
    "id": "flw-1",
    "userId": "user-admin",
    "comicId": "comic-1",
    "comicTitle": "Đại Quản Gia Là Ma Hoàng",
    "comicSlug": "dai-quan-gia-la-ma-hoang",
    "comicCover": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "latestChapterNumber": 3,
    "latestChapterTitle": "Chương 3: Cửu U Bí Lục Thức Tỉnh",
    "followedAt": "Hôm qua",
    "teamName": "Leesin Scans"
  },
  {
    "id": "flw-2",
    "userId": "user-admin",
    "comicId": "comic-3",
    "comicTitle": "Thiên Đạo Đồ Thư Quán",
    "comicSlug": "thien-dao-do-thu-quan",
    "comicCover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "latestChapterNumber": 2,
    "latestChapterTitle": "Chương 2: Chỉ Điểm Lỗi Sai Của Trưởng Lão",
    "followedAt": "3 ngày trước",
    "teamName": "Phượng Hoàng Các"
  }
];

export const INITIAL_FOLLOWED_TEAMS: FollowedTeamItem[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-init-admin-1',
    recipientRole: 'ADMIN',
    recipientUserId: 'user-admin',
    type: 'SYSTEM',
    title: 'Hệ thống thông báo đã sẵn sàng',
    content: 'Chào mừng Admin! Hệ thống thông báo thời gian thực đã hoạt động bình thường, thông báo bình luận và chương mới sẽ được gửi về tài khoản của bạn.',
    senderId: 'system',
    senderName: 'Hệ Thống Leesin Comic',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: '2026-10-04T07:00:00.000Z',
    isRead: false,
    link: '/admin',
  },
  {
    id: 'notif-init-team-1',
    recipientRole: 'TEAM_LEADER',
    recipientTeamId: 'team-lessin-comic',
    recipientTeamName: 'Lessin Comic',
    recipientUserId: 'user-lessin-comic-leader',
    type: 'COMMENT',
    title: 'Bình luận mới về truyện "Tư Duy Ngược BL"',
    content: 'Độc giả vừa bình luận truyện "Tư Duy Ngược BL" (Chap 31): "Truyện cực hay, cảm ơn nhóm dịch Lessin Comic đã ra chap đều đặn!"',
    senderId: 'user-reader-vip',
    senderName: 'Minh Thư (Độc Giả)',
    senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    comicId: 'comic-tu-duy-nguoc-bl',
    comicTitle: 'Tư Duy Ngược BL',
    comicSlug: 'tu-duy-nguoc-bl',
    chapterNumber: 31,
    commentId: 'cmt-4',
    createdAt: '2026-10-04T07:30:00.000Z',
    isRead: false,
  },
  {
    id: 'notif-init-reader-1',
    recipientRole: 'READER',
    type: 'NEW_CHAPTER',
    title: 'Chương mới: Tư Duy Ngược BL',
    content: 'Truyện "Tư Duy Ngược BL" vừa ra mắt Chap 31 mới do nhóm Lessin Comic phát hành!',
    senderId: 'team-lessin-comic',
    senderName: 'Lessin Comic',
    senderAvatar: 'https://tachserver.site/cdn3/uploads/avatar/lessin-comic-1763349912.jpeg',
    comicId: 'comic-tu-duy-nguoc-bl',
    comicTitle: 'Tư Duy Ngược BL',
    comicSlug: 'tu-duy-nguoc-bl',
    chapterNumber: 31,
    createdAt: '2026-10-04T08:00:00.000Z',
    isRead: false,
    link: '/truyen/tu-duy-nguoc-bl/chap-31',
  },
];
