import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Eye,
  Star,
  Award,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Bookmark,
  Heart,
  Coffee,
  Copy,
  Check,
  Link as LinkIcon
} from 'lucide-react';
import { ScanTeam, Comic, FollowedTeamItem, SiteSettings } from '../types';
import { TeamDonationCard } from './TeamDonationCard';
import { CensoredCoverImage } from './CensoredCoverImage';
import { is18PlusComic } from '../utils/adultFilter';
import { getOfficialTeamViews } from '../utils/teamStats';
import { getComicLatestTimestamp } from '../utils/timeAgo';
import { toSlug } from '../utils/slug';
import { getEffectiveTeamViews } from '../utils/viewTracking';

interface TeamsViewProps {
  teams: ScanTeam[];
  comics: Comic[];
  siteSettings?: SiteSettings;
  onSelectComic: (comic: Comic) => void;
  onOpenTeamPortal?: (team: ScanTeam) => void;
  initialSelectedTeam?: ScanTeam | null;
  onSelectTeam?: (team: ScanTeam | null) => void;
  followedTeamIds?: string[];
  followedTeams?: FollowedTeamItem[];
  isTeamFollowed?: (teamIdOrName: string) => boolean;
  onToggleFollowTeam?: (teamId: string) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  comics,
  siteSettings,
  onSelectComic,
  onOpenTeamPortal,
  initialSelectedTeam = null,
  onSelectTeam,
  followedTeamIds = [],
  followedTeams = [],
  isTeamFollowed,
  onToggleFollowTeam,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<ScanTeam | null>(initialSelectedTeam);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setSelectedTeam(initialSelectedTeam);
  }, [initialSelectedTeam]);

  const handleTeamClick = (team: ScanTeam) => {
    setSelectedTeam(team);
    if (onSelectTeam) {
      onSelectTeam(team);
    }
  };

  const handleBackToList = () => {
    setSelectedTeam(null);
    if (onSelectTeam) {
      onSelectTeam(null);
    }
  };

  const handleCopyTeamUrl = (team: ScanTeam) => {
    const slug = team.slug || toSlug(team.name) || team.id;
    const fullUrl = `${window.location.origin}/nhom-dich/${slug}`;
    try {
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  // Check if team is followed
  const checkIsTeamFollowed = (teamId: string, teamName?: string): boolean => {
    if (isTeamFollowed) {
      if (isTeamFollowed(teamId)) return true;
      if (teamName && isTeamFollowed(teamName)) return true;
    }
    if (followedTeamIds.includes(teamId)) return true;
    if (teamName && followedTeamIds.includes(teamName)) return true;
    return false;
  };

  // Calculate stats for a team synchronized 100% with Admin Dashboard & Real Views
  const getTeamStats = (team: ScanTeam) => {
    const rawTeamComics = (comics || []).filter(
      (c) =>
        c &&
        (c.teamId === team.id ||
          (c.teamName && team.name && c.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
          (team.leaderName && c.teamName && c.teamName.toLowerCase().trim() === team.leaderName.toLowerCase().trim()))
    );

    // ORDER BY latest_chapter_update DESC: Truyện có chapter mới được đăng/cập nhật gần nhất luôn đứng đầu danh sách
    const teamComics = [...rawTeamComics].sort((a, b) => {
      const timeA = getComicLatestTimestamp(a);
      const timeB = getComicLatestTimestamp(b);
      return timeB - timeA;
    });

    const totalChapters = teamComics.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
    // Real comic views taking chapter views into account, matching AdminDashboard and App.tsx exactly!
    const comicsSum = teamComics.reduce((sum, c) => {
      const chapsSum = (c.chapters || []).reduce((chS, ch) => chS + (ch.views || 0), 0);
      return sum + Math.max(c.views || 0, chapsSum);
    }, 0);
    const totalViews = getEffectiveTeamViews(team, teamComics, siteSettings?.viewTrackingStartDate);

    // Calculate actual follows count
    const activeFollowsCount = followedTeams.filter(
      (f) =>
        f.teamId === team.id ||
        (f.teamName && team.name && f.teamName.toLowerCase().trim() === team.name.toLowerCase().trim())
    ).length;
    const baseFollows = team.follows || team.followsCount || 0;
    const followsCount = Math.max(baseFollows, activeFollowsCount);

    return {
      comicsCount: teamComics.length,
      chaptersCount: totalChapters,
      viewsCount: totalViews,
      followsCount: followsCount,
      comicsList: teamComics,
    };
  };

  const filteredTeams = teams.filter((team) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const desc = (team.bio || team.description || '').toLowerCase();
    const name = (team.name || '').toLowerCase();
    const leader = (team.leaderName || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || leader.includes(q);
  }).sort((a, b) => {
    const statsA = getTeamStats(a);
    const statsB = getTeamStats(b);
    return statsB.viewsCount - statsA.viewsCount;
  });

  // Format numbers (e.g. 1.2M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // If a team is selected, view Team Detail page
  if (selectedTeam) {
    const stats = getTeamStats(selectedTeam);

    return (
      <div id="team-detail-page" className="space-y-6 pb-16 animate-in fade-in">
        {/* Back Button & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToList}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Quay lại Danh Sách Nhóm Dịch</span>
          </button>
        </div>

        {/* Team Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-[#141822] border border-slate-800 shadow-2xl p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <img
                src={selectedTeam.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                alt={selectedTeam.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-amber-500/60 shadow-xl shadow-amber-500/10"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px] shadow-lg flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VERIFIED</span>
              </span>
            </div>

            {/* Team Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedTeam.name}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Nhóm Dịch Chính Thức</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyTeamUrl(selectedTeam)}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Sao chép đường link trực tiếp vào nhóm dịch này"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Đã chép link!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono text-[11px] text-amber-300/90">/nhom-dich/{selectedTeam.slug || toSlug(selectedTeam.name) || selectedTeam.id}</span>
                      <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {selectedTeam.description || 'Chưa có tiểu sử nhóm dịch.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <span>Trưởng nhóm: <strong className="text-white font-bold">{selectedTeam.leaderName}</strong></span>
                <span>• Thành viên: <strong className="text-amber-400 font-bold">{selectedTeam.members?.length || 1} người</strong></span>
                <span>• Theo dõi: <strong className="text-rose-400 font-bold">{formatNumber(stats.followsCount)} người</strong></span>
                {selectedTeam.createdAt && (
                  <span>• Ngày tham gia: <strong className="text-slate-300 font-mono">{selectedTeam.createdAt}</strong></span>
                )}
              </div>

              {/* Follow Team Action Button in Hero Header */}
              {onToggleFollowTeam && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleFollowTeam(selectedTeam.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                      checkIsTeamFollowed(selectedTeam.id, selectedTeam.name)
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:brightness-110 shadow-amber-500/20'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${checkIsTeamFollowed(selectedTeam.id, selectedTeam.name) ? 'fill-rose-400 text-rose-400' : 'text-white'}`} />
                    <span>{checkIsTeamFollowed(selectedTeam.id, selectedTeam.name) ? 'Đang Theo Dõi Nhóm' : 'Theo Dõi Nhóm Dịch Này'}</span>
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    <strong className="text-rose-400 font-bold">{formatNumber(stats.followsCount)}</strong> thành viên đang theo dõi
                  </span>
                </div>
              )}
            </div>

            {/* Quick Stats Summary Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-center">
                <span className="text-base sm:text-lg font-black text-amber-400 block">{stats.comicsCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Bộ Truyện</span>
              </div>
              <div className="text-center sm:border-l border-slate-800 px-2 sm:px-3">
                <span className="text-base sm:text-lg font-black text-sky-400 block">{stats.chaptersCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Chương</span>
              </div>
              <div className="text-center sm:border-l border-slate-800 px-2 sm:px-3">
                <span className="text-base sm:text-lg font-black text-emerald-400 block">{formatNumber(stats.viewsCount)}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Lượt Xem</span>
              </div>
              <div className="text-center sm:border-l border-slate-800 px-2 sm:px-3">
                <span className="text-base sm:text-lg font-black text-rose-400 block">{formatNumber(stats.followsCount)}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Theo Dõi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Description & Donate Card */}
        <TeamDonationCard
          team={selectedTeam}
          isFollowed={followedTeamIds.includes(selectedTeam.id)}
          onToggleFollow={onToggleFollowTeam}
        />

        {/* List of Comics translated by this Team */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Tất Cả Truyện Do Nhóm {selectedTeam.name} Đang Dịch ({stats.comicsCount})</span>
            </h2>
          </div>

          {stats.comicsList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2 bg-[#141822] rounded-3xl border border-slate-800">
              <BookOpen className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
              <p className="text-sm font-medium">Nhóm dịch này chưa đăng tải bộ truyện nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {stats.comicsList.map((comic) => (
                <div
                  key={comic.id}
                  onClick={() => onSelectComic(comic)}
                  className="group bg-[#141822] border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
                    <CensoredCoverImage
                      src={comic.coverImage}
                      alt={comic.title}
                      comicId={comic.id}
                      genres={comic.genres}
                      is18Plus={comic.is18Plus}
                      size="md"
                      showBadge={false}
                      className="w-full h-full"
                      imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Status & 18+ Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                      {is18PlusComic(comic) && (
                        <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-extrabold uppercase shadow">
                          🔞 18+
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[10px] font-extrabold uppercase shadow">
                        {comic.status === 'Đang tiến hành' || (comic.status as string) === 'Ongoing' ? 'Đang ra' : 'Hoàn thành'}
                      </span>
                    </div>

                    {/* Views Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black via-black/70 to-transparent flex items-center justify-between text-[11px] font-bold text-white z-10 pointer-events-none">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Eye className="w-3 h-3" />
                        <span>{formatNumber(comic.views)}</span>
                      </span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        <span>{comic.rating}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5">
                    <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {comic.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      Mới nhất: <strong className="text-amber-400">Chap {comic.latestChapter ?? (comic.chapters?.length ? comic.chapters[comic.chapters.length - 1].chapterNumber : 0)}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="teams-view-page" className="space-y-6 pb-16 animate-in fade-in">
      {/* Header section */}
      <div className="relative rounded-3xl bg-[#141822] border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Cộng Đồng Nhóm Dịch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Danh Sách Nhóm Dịch Truyện Tranh
            </h1>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Khám phá các nhóm dịch chất lượng cao đang đăng tải bộ truyện tranh tại tủ sách. Bấm vào từng nhóm dịch để xem danh sách toàn bộ truyện nhóm đang thực hiện.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên nhóm dịch, trưởng nhóm..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Grid of Teams */}
      {filteredTeams.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2 bg-[#141822] rounded-3xl border border-slate-800">
          <Users className="w-10 h-10 mx-auto opacity-30 text-rose-400" />
          <p className="text-sm font-medium">Không tìm thấy nhóm dịch nào khớp với tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            const stats = getTeamStats(team);
            const teamSlug = team.slug || toSlug(team.name) || team.id;
            const teamUrl = `/nhom-dich/${teamSlug}`;

            return (
              <div
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className="group bg-[#141822] border border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={team.avatar || team.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt={team.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-amber-500 transition-colors shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={teamUrl}
                        onClick={(e) => {
                          e.preventDefault();
                          handleTeamClick(team);
                        }}
                        className="text-base font-bold text-white group-hover:text-amber-400 transition-colors truncate hover:underline"
                      >
                        {team.name}
                      </a>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Trưởng nhóm: <strong className="text-slate-200">{team.leaderName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {team.bio || team.description || 'Chưa cập nhật giới thiệu nhóm.'}
                    </p>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-xs font-extrabold text-amber-400 block">{stats.comicsCount}</span>
                    <span className="text-[10px] text-slate-500">Truyện</span>
                  </div>
                  <div className="border-l border-slate-800/80">
                    <span className="text-xs font-extrabold text-sky-400 block">{stats.chaptersCount}</span>
                    <span className="text-[10px] text-slate-500">Chương</span>
                  </div>
                  <div className="border-l border-slate-800/80">
                    <span className="text-xs font-extrabold text-emerald-400 block">{formatNumber(stats.viewsCount)}</span>
                    <span className="text-[10px] text-slate-500">View</span>
                  </div>
                  <div className="border-l border-slate-800/80">
                    <span className="text-xs font-extrabold text-rose-400 block">{formatNumber(stats.followsCount)}</span>
                    <span className="text-[10px] text-slate-500">Theo Dõi</span>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  <a
                    href={teamUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      handleTeamClick(team);
                    }}
                    className="flex items-center gap-1.5 hover:underline"
                  >
                    <span>Xem Tất Cả Truyện</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>

                  {onToggleFollowTeam && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFollowTeam(team.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        checkIsTeamFollowed(team.id, team.name)
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                      title={checkIsTeamFollowed(team.id, team.name) ? 'Bỏ theo dõi nhóm dịch' : 'Theo dõi nhóm dịch'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${checkIsTeamFollowed(team.id, team.name) ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
                      <span>{checkIsTeamFollowed(team.id, team.name) ? 'Đang Theo Dõi' : 'Theo Dõi'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
