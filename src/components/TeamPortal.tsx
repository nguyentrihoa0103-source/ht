import React, { useState, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  FileArchive,
  Lock,
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  BookPlus,
  Server,
  Loader2,
  TrendingUp,
  BookOpen,
  Edit3,
  Trash2,
  Layers,
  Eye,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  FolderPlus,
  Search,
  Heart,
  Coffee,
  Sparkles,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Comic, Chapter, ScanTeam, User, ImageServerConfig, SiteSettings } from '../types';
import { getComicLatestTimestamp } from '../utils/timeAgo';
import { processZipFile } from '../utils/imageOptimizer';
import { uploadImagesToTachServer } from '../utils/imageServerUploader';
import { TeamAddComicModal } from './TeamAddComicModal';
import { TeamEditComicModal } from './TeamEditComicModal';
import { TeamEditChapterModal } from './TeamEditChapterModal';
import { TeamProfileEditModal } from './TeamProfileEditModal';
import { TeamDonationCard } from './TeamDonationCard';
import { formatRelativeTime, formatDateTime } from '../utils/timeAgo';
import {
  getEffectiveComicViews,
  getEffectiveTeamViews,
  getEffectiveTeam7DaysStats,
  isTimestampValidForTracking,
} from '../utils/viewTracking';

interface TeamPortalProps {
  currentUser: User;
  team: ScanTeam;
  comics: Comic[];
  siteSettings?: SiteSettings;
  onAddChapter: (comicId: string, newChapter: Chapter) => void;
  onAddNewComic?: (newComic: Comic) => void;
  onUpdateComic?: (updatedComic: Comic) => void;
  onDeleteComic?: (comicId: string) => void;
  onUpdateChapter?: (comicId: string, updatedChapter: Chapter) => void;
  onDeleteChapter?: (comicId: string, chapterId: string) => void;
  onUpdateTeamName?: (newName: string) => void;
  onUpdateTeamProfile?: (updatedFields: Partial<ScanTeam>) => void;
  onClose: () => void;
  watermarkText?: string;
  watermarkOpacity: number;
  watermarkLogoUrl?: string;
  watermarkPosition?: any;
  imageServerConfig?: ImageServerConfig;
  onSelectComic?: (comic: Comic) => void;
  onReadChapter?: (comic: Comic, chapter: Chapter) => void;
}

export const TeamPortal: React.FC<TeamPortalProps> = ({
  currentUser,
  team,
  comics,
  siteSettings,
  onAddChapter,
  onAddNewComic,
  onUpdateComic,
  onDeleteComic,
  onUpdateChapter,
  onDeleteChapter,
  onUpdateTeamName,
  onUpdateTeamProfile,
  onClose,
  watermarkText,
  watermarkOpacity,
  watermarkLogoUrl,
  watermarkPosition,
  imageServerConfig,
  onSelectComic,
  onReadChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'manage-comics' | 'upload-chapter' | 'team-stats'>('manage-comics');
  const [isAddComicModalOpen, setIsAddComicModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [editingChapterData, setEditingChapterData] = useState<{ comic: Comic; chapter: Chapter } | null>(null);
  const [expandedComicId, setExpandedComicId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [comicSearchQuery, setComicSearchQuery] = useState<string>('');

  // Helper to calculate real total views of any comic based on Admin's tracking start date
  const getComicRealViews = (c: Comic) => {
    return getEffectiveComicViews(c, siteSettings?.viewTrackingStartDate);
  };

  // Filter comics belonging to this team, ORDER BY latest_chapter_update DESC
  const isLeader = currentUser.role === 'TEAM_LEADER' || currentUser.role === 'ADMIN';
  const teamComics = useMemo(() => {
    const list = comics.filter((c) => {
      const matchId = (team?.id && c.teamId === team.id) || (currentUser.teamId && c.teamId === currentUser.teamId);
      const matchName = (team?.name && c.teamName && c.teamName.toLowerCase().trim() === team.name.toLowerCase().trim()) ||
                        (currentUser.teamName && c.teamName && c.teamName.toLowerCase().trim() === currentUser.teamName.toLowerCase().trim()) ||
                        (currentUser.name && c.teamName && c.teamName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
                        (team?.leaderName && c.teamName && c.teamName.toLowerCase().trim() === team.leaderName.toLowerCase().trim());
      return Boolean(matchId || matchName);
    });
    return list.sort((a, b) => getComicLatestTimestamp(b) - getComicLatestTimestamp(a));
  }, [comics, currentUser, team]);

  // Dynamically compute total views strictly from team comics
  const teamTotalViewsCount = useMemo(() => {
    const comicsSum = teamComics.reduce((sum, c) => sum + getComicRealViews(c), 0);
    return Math.max(Number(team?.totalViews) || 0, comicsSum);
  }, [team, teamComics]);

  // Today Date & 7 Days View Calculation with GMT+7
  const recent7DaysStats = useMemo(() => {
    return getEffectiveTeam7DaysStats(team, siteSettings?.viewTrackingStartDate, teamTotalViewsCount);
  }, [team, siteSettings?.viewTrackingStartDate, teamTotalViewsCount]);

  const teamTodayViewsCount = useMemo(() => {
    const todayStat = recent7DaysStats[recent7DaysStats.length - 1];
    return todayStat ? todayStat.views : 0;
  }, [recent7DaysStats]);

  // Form states for Upload Chapter
  const [selectedComicId, setSelectedComicId] = useState<string>(teamComics[0]?.id || '');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState<string>('');
  
  // Scheduled publishing
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');

  // Password protection
  const [isPassProtected, setIsPassProtected] = useState<boolean>(false);
  const [chapterPassword, setChapterPassword] = useState<string>('');

  // ZIP Upload & Image Processing
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processedPages, setProcessedPages] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  // CDN Upload states (tachserver.site)
  const [uploadToCdn, setUploadToCdn] = useState<boolean>(imageServerConfig?.autoUploadToCdn ?? true);
  const [isUploadingToCdn, setIsUploadingToCdn] = useState<boolean>(false);
  const [cdnUploadProgress, setCdnUploadProgress] = useState<number>(0);
  const [cdnStatusText, setCdnStatusText] = useState<string>('');

  const canUpload = isLeader || currentUser.canUpload === true;

  // Sync selected comic when teamComics changes
  useEffect(() => {
    if (!selectedComicId && teamComics.length > 0) {
      setSelectedComicId(teamComics[0].id);
      setExpandedComicId(teamComics[0].id);
    }
  }, [teamComics, selectedComicId]);

  // Auto-set next chapter number when selected comic changes
  useEffect(() => {
    const comic = teamComics.find((c) => c.id === selectedComicId);
    if (comic && comic.chapters.length > 0) {
      const maxChap = Math.max(...comic.chapters.map((ch) => ch.chapterNumber));
      const nextChap = maxChap + 1;
      setChapterNumber(nextChap);
      setChapterTitle(`Chương ${nextChap}`);
    } else {
      setChapterNumber(1);
      setChapterTitle('Chương 1');
    }
  }, [selectedComicId, teamComics]);

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Handle ZIP File Upload & Auto Watermark Optimization
  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipFile(file);
    setIsProcessingZip(true);
    setProcessingProgress(10);
    setUploadError('');

    try {
      const images = await processZipFile(
        file,
        (progress) => {
          setProcessingProgress(progress);
        },
        {
          logoUrl: watermarkLogoUrl,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );

      setProcessedPages(images);
      setIsProcessingZip(false);
      setProcessingProgress(100);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setIsProcessingZip(false);
      setUploadError(err.message || 'Lỗi khi giải nén và tối ưu file ZIP!');
    }
  };

  // Fallback demo images generator if no real zip is uploaded
  const handleGenerateSamplePages = async () => {
    setIsProcessingZip(true);
    setProcessingProgress(30);

    const dummyCanvas = async (pageNum: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1300;
      const ctx = canvas.getContext('2d')!;
      
      const grad = ctx.createLinearGradient(0, 0, 900, 1300);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 900, 1300);

      ctx.fillStyle = '#111827';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 820, 560);
      ctx.fillRect(40, 40, 820, 560);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Manga Panel - Trang ${pageNum}`, 450, 320);

      ctx.strokeRect(40, 640, 820, 560);
      ctx.fillRect(40, 640, 820, 560);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`${chapterTitle || `Chương ${chapterNumber}`}`, 450, 920);

      return canvas.toDataURL('image/jpeg', 0.9);
    };

    const dummy1 = await dummyCanvas(1);
    setProcessingProgress(60);
    const dummy2 = await dummyCanvas(2);
    setProcessingProgress(80);
    const dummy3 = await dummyCanvas(3);

    setProcessedPages([dummy1, dummy2, dummy3]);
    setIsProcessingZip(false);
    setProcessingProgress(100);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Publish Chapter Flow
  const handlePublishChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!selectedComicId) {
      setUploadError('Vui lòng chọn bộ truyện muốn đăng chương!');
      return;
    }

    if (processedPages.length === 0) {
      setUploadError('Vui lòng tải lên file ZIP hoặc tạo bộ ảnh cho chương trước khi đăng!');
      return;
    }

    if (isPassProtected && !chapterPassword.trim()) {
      setUploadError('Vui lòng nhập mật khẩu khóa chương hoặc tắt chế độ khóa pass!');
      return;
    }

    const targetComic = teamComics.find((c) => c.id === selectedComicId);
    if (!targetComic) {
      setUploadError('Không tìm thấy bộ truyện đã chọn!');
      return;
    }

    let finalImages = processedPages;

    // Optional CDN upload
    if (uploadToCdn && imageServerConfig?.enabled) {
      setIsUploadingToCdn(true);
      setCdnStatusText('Đang đẩy ảnh lên CDN tachserver.site...');
      try {
        const uploadRes = await uploadImagesToTachServer(
          processedPages,
          targetComic.slug || 'comic',
          chapterNumber,
          imageServerConfig,
          (progress) => setCdnUploadProgress(progress)
        );

        if (uploadRes.urls && uploadRes.urls.length > 0) {
          finalImages = uploadRes.urls;
        } else {
          console.warn('Lỗi CDN, dùng ảnh tối ưu trực tiếp:', uploadRes.message);
        }
      } catch (err: any) {
        console.warn('Upload CDN thất bại:', err);
      } finally {
        setIsUploadingToCdn(false);
      }
    }

    const newChapter: Chapter = {
      id: `chap-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      comicId: targetComic.id,
      comicTitle: targetComic.title,
      chapterNumber: Number(chapterNumber),
      title: chapterTitle.trim() || `Chương ${chapterNumber}`,
      createdAt: new Date().toISOString(),
      scheduledDate: isScheduled && scheduledDateTime ? scheduledDateTime : undefined,
      isPasswordProtected: isPassProtected,
      password: isPassProtected ? chapterPassword.trim() : undefined,
      views: 0,
      images: finalImages,
      teamId: team.id,
      teamName: team.name,
    };

    try {
      onAddChapter(targetComic.id, newChapter);
      setUploadSuccess(`Đã xuất bản thành công "${newChapter.title}" (${finalImages.length} trang)!`);
      
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } catch (cErr) {
        console.warn('Lỗi hiệu ứng confetti:', cErr);
      }

      // Reset form safely
      setProcessedPages([]);
      setZipFile(null);
      const nextNum = (Number(chapterNumber) || 0) + 1;
      setChapterNumber(nextNum);
      setChapterTitle(`Chương ${nextNum}`);
      setChapterPassword('');
      setIsPassProtected(false);
      setIsScheduled(false);
      setScheduledDateTime('');
    } catch (pubErr: any) {
      console.error('Lỗi khi xuất bản chương:', pubErr);
      setUploadError(pubErr.message || 'Lỗi khi xuất bản chương truyện!');
    }
  };

  const handleCreatedComic = (newComic: Comic) => {
    if (onAddNewComic) {
      onAddNewComic(newComic);
      setSelectedComicId(newComic.id);
      setExpandedComicId(newComic.id);
      setIsAddComicModalOpen(false);
      showFeedback(`Đã tạo mới bộ truyện "${newComic.title}" thành công!`);
    }
  };

  const handleDeleteComicConfirm = (comic: Comic) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Tài khoản nhóm dịch không có quyền xóa truyện. Vui lòng liên hệ Quản trị viên (Admin) nếu bạn cần gỡ bỏ bộ truyện này!');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ truyện "${comic.title}" và tất cả các chương của nó?`)) {
      if (onDeleteComic) {
        onDeleteComic(comic.id);
        showFeedback(`Đã xóa bộ truyện "${comic.title}" thành công.`);
      }
    }
  };

  const handleDeleteChapterConfirm = (comic: Comic, chapter: Chapter) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${chapter.title}" khỏi bộ truyện "${comic.title}"?`)) {
      if (onDeleteChapter) {
        onDeleteChapter(comic.id, chapter.id);
        showFeedback(`Đã xóa "${chapter.title}" thành công.`);
      }
    }
  };

  return (
    <div id="team-portal-view" className="space-y-6 pb-20 animate-in fade-in">
      
      {/* Top Welcome Banner */}
      <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={team.avatar}
              alt={team.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/10"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-white">{team.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    const newName = window.prompt('Nhập tên nhóm dịch của bạn (tự đặt):', team.name);
                    if (newName && newName.trim() && newName.trim() !== team.name) {
                      onUpdateTeamName?.(newName.trim());
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 text-[10px] font-semibold border border-slate-700 transition-colors"
                  title="Tự đặt / đổi tên nhóm dịch"
                >
                  <Edit3 className="w-3 h-3 text-emerald-400" />
                  <span>Đổi tên nhóm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-[11px] font-bold border border-amber-500/40 transition-all shadow-sm"
                  title="Cài đặt mô tả và giới thiệu nhóm dịch"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sửa Mô Tả Nhóm</span>
                </button>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {currentUser.role === 'ADMIN' ? 'Admin Toàn Quyền' : 'Nhóm Dịch Chính Thức'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Trưởng nhóm: <span className="text-slate-200 font-semibold">{team.leaderName}</span> • Quản lý truyện, chỉnh sửa chương & phân tích lượt đọc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAddNewComic && (
              <button
                onClick={() => setIsAddComicModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Thêm Truyện Mới</span>
              </button>
            )}
            <button
              id="btn-close-team-portal"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
            >
              Đóng Portal
            </button>
          </div>
        </div>

        {/* Total Views Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Tổng Lượt Đọc</p>
            <p className="text-base sm:text-lg font-black text-amber-400 mt-1">{teamTotalViewsCount.toLocaleString()} views</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Lượt Theo Dõi</p>
            <p className="text-base sm:text-lg font-black text-rose-400 mt-1">{(team.follows || team.followsCount || 0).toLocaleString()} độc giả</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Bộ Truyện</p>
            <p className="text-base sm:text-lg font-black text-white mt-1">{teamComics.length} Truyện</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">Chương Đã Đăng</p>
            <p className="text-base sm:text-lg font-black text-emerald-400 mt-1">
              {teamComics.reduce((acc, c) => acc + c.chapters.length, 0)} Chương
            </p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-slate-400 font-medium">Thành Viên</p>
            <p className="text-base sm:text-lg font-black text-slate-200 mt-1">{team.members?.length || 1} Thành Viên</p>
          </div>
        </div>

        {/* Team Bio & Donate Card */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <TeamDonationCard
            team={team}
            showEditButton={true}
            onOpenEdit={() => setIsProfileModalOpen(true)}
          />
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap p-1.5 bg-[#141822] rounded-2xl border border-slate-800 gap-1.5">
        <button
          id="tab-manage-comics"
          onClick={() => setActiveTab('manage-comics')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manage-comics'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Quản Lý Truyện & Sửa Chương ({teamComics.length})</span>
        </button>

        <button
          id="tab-upload-chapter"
          onClick={() => setActiveTab('upload-chapter')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upload-chapter'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Đăng Chương Mới (.ZIP / CDN)</span>
        </button>

        <button
          id="tab-team-stats"
          onClick={() => setActiveTab('team-stats')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'team-stats'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Thống Kê Lượt Xem</span>
        </button>
      </div>

      {/* TAB 1: MANAGE COMICS & EDIT CHAPTERS */}
      {activeTab === 'manage-comics' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#141822] rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Danh Sách Truyện Của Nhóm ({teamComics.length} Bộ Truyện)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhóm dịch có thể sửa thông tin truyện, thêm/sửa/xóa từng chương hoặc thay thế ảnh trực tiếp.
              </p>
            </div>
            {onAddNewComic && (
              <button
                onClick={() => setIsAddComicModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm bộ truyện mới</span>
              </button>
            )}
          </div>

          {teamComics.length === 0 ? (
            <div className="p-12 bg-[#141822] rounded-3xl border border-dashed border-slate-800 text-center space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-slate-300 font-bold text-sm">Nhóm dịch chưa có bộ truyện nào trên hệ thống</p>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Hãy tạo bộ truyện mới đầu tiên để bắt đầu tải lên các chương truyện tranh chất lượng cao!
              </p>
              {onAddNewComic && (
                <button
                  onClick={() => setIsAddComicModalOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  + Tạo Bộ Truyện Ngay
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search filter for team comics */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={comicSearchQuery}
                  onChange={(e) => setComicSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên truyện hoặc thể loại..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                {comicSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setComicSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Check if filter has matching comics */}
              {(() => {
                const filteredTeamComics = teamComics.filter((c) => {
                  if (!comicSearchQuery.trim()) return true;
                  const q = comicSearchQuery.toLowerCase();
                  return (
                    c.title.toLowerCase().includes(q) ||
                    (c.genres && c.genres.some((g) => g.toLowerCase().includes(q))) ||
                    (c.authors && c.authors.some((a) => a.toLowerCase().includes(q))) ||
                    (c.alternativeTitles && c.alternativeTitles.some((alt) => alt.toLowerCase().includes(q)))
                  );
                });

                if (filteredTeamComics.length === 0) {
                  return (
                    <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
                      <Search className="w-8 h-8 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-white">Không tìm thấy bộ truyện nào</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Không có truyện nào thuộc nhóm dịch khớp với từ khóa "{comicSearchQuery}". Hãy thử tìm tên khác hoặc thể loại khác.
                      </p>
                      <button
                        type="button"
                        onClick={() => setComicSearchQuery('')}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                      >
                        Xóa bộ lọc tìm kiếm
                      </button>
                    </div>
                  );
                }

                return filteredTeamComics.map((comic) => {
                  const isExpanded = expandedComicId === comic.id;

                return (
                  <div
                    key={comic.id}
                    className="bg-[#141822] border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                  >
                    {/* Comic Header Item */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border-b border-slate-800/80">
                      <div className="flex items-center gap-3.5">
                        <div
                          onClick={() => onSelectComic?.(comic)}
                          className={`relative group shrink-0 ${onSelectComic ? 'cursor-pointer' : ''}`}
                          title={onSelectComic ? `Bấm để xem trang chi tiết truyện ${comic.title}` : comic.title}
                        >
                          <img
                            src={comic.coverImage}
                            alt={comic.title}
                            className="w-14 h-20 rounded-xl object-cover border border-slate-700 shrink-0 shadow-md group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {onSelectComic && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-emerald-300 drop-shadow" />
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              onClick={() => onSelectComic?.(comic)}
                              className={`text-sm sm:text-base font-bold text-white transition-colors ${
                                onSelectComic ? 'cursor-pointer hover:text-emerald-400 hover:underline' : ''
                              }`}
                              title={onSelectComic ? `Bấm để xem chi tiết truyện ${comic.title}` : comic.title}
                            >
                              {comic.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {comic.status}
                            </span>
                            {comic.isHot && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                HOT 🔥
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {comic.genres.join(', ')} • Tác giả: {comic.authors.join(', ')}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="text-emerald-400 font-semibold">{comic.chapters.length} chương</span>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">{getComicRealViews(comic).toLocaleString()} lượt đọc</span>
                            <span>•</span>
                            <span>Cập nhật: {formatRelativeTime(comic.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons for Comic */}
                      <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                        {onSelectComic && (
                          <button
                            type="button"
                            onClick={() => onSelectComic(comic)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/35 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Mở xem chi tiết câu chuyện này trên website"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Xem Chi Tiết</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingComic(comic)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Sửa Truyện</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedComicId(comic.id);
                            setActiveTab('upload-chapter');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Đăng Chap</span>
                        </button>

                        <button
                          onClick={() => setExpandedComicId(isExpanded ? null : comic.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                        >
                          {isExpanded ? 'Thu Gọn' : `Xem ${comic.chapters.length} Chương`}
                        </button>

                        {currentUser.role === 'ADMIN' && onDeleteComic && (
                          <button
                            onClick={() => handleDeleteComicConfirm(comic)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Xóa bộ truyện này (Chỉ dành cho Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Chapters List Table */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-[#11151f]">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2 pb-1 border-b border-slate-800">
                          <span>DANH SÁCH CHƯƠNG ({comic.chapters.length} CHƯƠNG)</span>
                          <button
                            onClick={() => {
                              setSelectedComicId(comic.id);
                              setActiveTab('upload-chapter');
                            }}
                            className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                          >
                            + Đăng thêm chương mới
                          </button>
                        </div>

                        {comic.chapters.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-500">
                            Bộ truyện này chưa có chương nào. Nhấp "Đăng Chap" ở trên để tải lên chương đầu tiên!
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-[#141822]">
                            {comic.chapters.map((chap) => (
                              <div
                                key={chap.id}
                                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                                    #{chap.chapterNumber}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        onClick={() => {
                                          if (onReadChapter) onReadChapter(comic, chap);
                                          else if (onSelectComic) onSelectComic(comic);
                                        }}
                                        className={`text-xs font-bold text-white transition-colors ${
                                          onReadChapter || onSelectComic ? 'cursor-pointer hover:text-emerald-400 hover:underline' : ''
                                        }`}
                                        title="Bấm để đọc chương truyện này"
                                      >
                                        {chap.title}
                                      </span>
                                      {chap.isPasswordProtected && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1">
                                          <Lock className="w-2.5 h-2.5" /> Pass: {chap.password || 'Có pass'}
                                        </span>
                                      )}
                                      {chap.scheduledDate && (
                                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/40 flex items-center gap-1">
                                          <Calendar className="w-2.5 h-2.5" /> Hẹn: {chap.scheduledDate.replace('T', ' ')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {chap.images.length} trang ảnh • Ngày đăng: {formatDateTime(chap.createdAt) || formatRelativeTime(chap.createdAt)} • {chap.views.toLocaleString()} views
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {onReadChapter && (
                                    <button
                                      type="button"
                                      onClick={() => onReadChapter(comic, chap)}
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1 border border-sky-500/30 transition-colors cursor-pointer"
                                      title="Đọc chương truyện này"
                                    >
                                      <BookOpen className="w-3 h-3" />
                                      <span>Đọc Thử</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setEditingChapterData({ comic, chapter: chap })}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Sửa Chương</span>
                                  </button>

                                  {onDeleteChapter && (
                                    <button
                                      onClick={() => handleDeleteChapterConfirm(comic, chap)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Xóa</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    )}

      {/* TAB 2: UPLOAD CHAPTER FORM */}
      {activeTab === 'upload-chapter' && (
        <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Đăng Tải Chương Truyện Mới (.ZIP hoặc CDN)</h2>
                <p className="text-xs text-slate-400">
                  Tự động giải nén file ZIP, tối ưu nén ảnh, đóng dấu Watermark và upload lên CDN tachserver.site
                </p>
              </div>
            </div>
          </div>

          {uploadSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handlePublishChapter} className="space-y-5">
            {/* Choose comic & chapter number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Chọn Bộ Truyện Đăng Chương: *
                </label>
                <select
                  value={selectedComicId}
                  onChange={(e) => setSelectedComicId(e.target.value)}
                  disabled={!canUpload || teamComics.length === 0}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:border-emerald-500"
                >
                  {teamComics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.chapters.length} chương)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Số Thứ Tự Chương (Chapter No): *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(parseFloat(e.target.value) || 0)}
                  disabled={!canUpload}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Tiêu Đề Chương: *
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Ví dụ: Chương 12: Đột Phá Cảnh Giới"
                  disabled={!canUpload}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Advanced Publishing Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/40 rounded-2xl border border-slate-800">
              {/* Scheduled Publishing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-slate-200">Hẹn Giờ Đăng Truyện</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    disabled={!canUpload}
                    className="w-4 h-4 accent-sky-500 rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Chương sẽ tự động hiển thị mở khóa cho độc giả sau khi tới thời gian hẹn.
                </p>
                {isScheduled && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    disabled={!canUpload}
                    className="w-full bg-slate-950 border border-slate-700 text-sky-300 text-xs p-2.5 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Khóa Chapter Bằng Password</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPassProtected}
                    onChange={(e) => setIsPassProtected(e.target.checked)}
                    disabled={!canUpload}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Độc giả phải nhập đúng mật khẩu này mới có thể xem được nội dung ảnh.
                </p>
                {isPassProtected && (
                  <input
                    type="text"
                    value={chapterPassword}
                    onChange={(e) => setChapterPassword(e.target.value)}
                    placeholder="Nhập pass mở khóa (ví dụ: leesin2026)"
                    disabled={!canUpload}
                    className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            </div>

            {/* ZIP Upload Section */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                Tải Lên File ZIP Chứa Toàn Bộ Ảnh Truyện:
              </label>

              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-2xl p-6 text-center bg-slate-900/30 transition-colors">
                <FileArchive className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-200">
                  {zipFile ? zipFile.name : 'Chọn hoặc kéo thả file .ZIP vào đây'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  File nén chứa tất cả ảnh truyện (01.jpg, 02.jpg...). Hệ thống sẽ tự động tối ưu kích thước và đóng dấu logo website!
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <label
                    htmlFor="zip-upload-input"
                    className={`px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow transition-all ${
                      !canUpload ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <span>Chọn File .ZIP Từ Máy Tính</span>
                    <input
                      id="zip-upload-input"
                      type="file"
                      accept=".zip,application/zip"
                      onChange={handleZipFileChange}
                      disabled={!canUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateSamplePages}
                    disabled={!canUpload || isProcessingZip}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-all"
                  >
                    ⚡ Tạo Nhanh Bộ Ảnh Mẫu Kèm Watermark
                  </button>
                </div>
              </div>

              {/* Processing Progress */}
              {isProcessingZip && (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-400">Đang giải nén, resize ảnh & đóng dấu watermark...</span>
                    <span className="text-white">{processingProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview Pages */}
              {processedPages.length > 0 && (
                <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã nạp và xử lý xong {processedPages.length} trang ảnh chất lượng cao
                    </span>
                    <button
                      type="button"
                      onClick={() => setProcessedPages([])}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Xóa làm lại
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl">
                    {processedPages.map((img, idx) => (
                      <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-800">
                        <img src={img} alt={`Trang ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[10px] text-white">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CDN Options - Only visible to Admin */}
            {currentUser.role === 'ADMIN' && (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Tự Động Đẩy Ảnh Lên CDN tachserver.site</p>
                    <p className="text-[11px] text-slate-400">Giúp tăng tốc độ tải ảnh truyện x10 lần cho độc giả</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={uploadToCdn}
                  onChange={(e) => setUploadToCdn(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </div>
            )}

            {/* CDN Progress */}
            {isUploadingToCdn && (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {cdnStatusText}
                  </span>
                  <span className="text-white">{cdnUploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                    style={{ width: `${cdnUploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={!canUpload || isProcessingZip || isUploadingToCdn}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <UploadCloud className="w-5 h-5" />
                <span>XUẤT BẢN CHƯƠNG LÊN HỆ THỐNG</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TEAM STATS */}
      {activeTab === 'team-stats' && (
        <div className="bg-[#141822] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Thống Kê Chi Tiết Lượt Đọc Của Nhóm Dịch</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Tổng Lượt Xem Tích Lũy</p>
              <p className="text-base font-black text-amber-400 mt-1">{teamTotalViewsCount.toLocaleString()} views</p>
            </div>
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Số Đầu Truyện</p>
              <p className="text-base font-black text-white mt-1">{teamComics.length} Truyện</p>
            </div>
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Tổng Số Chương</p>
              <p className="text-base font-black text-emerald-400 mt-1">
                {teamComics.reduce((acc, c) => acc + c.chapters.length, 0)} Chapters
              </p>
            </div>
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Lượt Xem Hôm Nay</p>
              <p className="text-base font-black text-sky-400 mt-1">
                {teamTodayViewsCount.toLocaleString()} views
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Lượt xem theo ngày (7 ngày gần nhất):</h4>
            <div className="grid grid-cols-7 gap-2 text-center pt-1">
              {recent7DaysStats.map((stat) => (
                <div key={stat.dateStr} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <p className="text-[10px] text-slate-400">{stat.displayDate}</p>
                  <p className="text-xs font-bold text-amber-400">{stat.views.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Comic */}
      {onAddNewComic && (
        <TeamAddComicModal
          isOpen={isAddComicModalOpen}
          onClose={() => setIsAddComicModalOpen(false)}
          team={team}
          onAddNewComic={handleCreatedComic}
          imageServerConfig={imageServerConfig}
        />
      )}

      {/* Modal: Edit Comic */}
      {editingComic && (
        <TeamEditComicModal
          isOpen={!!editingComic}
          onClose={() => setEditingComic(null)}
          comic={editingComic}
          isAdmin={currentUser?.role === 'ADMIN'}
          imageServerConfig={imageServerConfig}
          onSaveComic={(updated) => {
            if (onUpdateComic) {
              onUpdateComic(updated);
              showFeedback(`Đã lưu thay đổi bộ truyện "${updated.title}" thành công!`);
            }
          }}
        />
      )}

      {/* Modal: Edit Chapter */}
      {editingChapterData && (
        <TeamEditChapterModal
          isOpen={!!editingChapterData}
          onClose={() => setEditingChapterData(null)}
          comicTitle={editingChapterData.comic.title}
          chapter={editingChapterData.chapter}
          watermarkLogoUrl={watermarkLogoUrl}
          watermarkOpacity={watermarkOpacity}
          watermarkPosition={watermarkPosition}
          onSaveChapter={(updatedChap) => {
            if (onUpdateChapter) {
              onUpdateChapter(editingChapterData.comic.id, updatedChap);
              showFeedback(`Đã cập nhật chương "${updatedChap.title}" thành công!`);
            }
          }}
        />
      )}

      {/* Modal: Edit Team Profile & Description */}
      <TeamProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        team={team}
        imageServerConfig={imageServerConfig}
        onSave={(updatedFields) => {
          onUpdateTeamProfile?.(updatedFields);
          if (updatedFields.name && updatedFields.name !== team.name) {
            onUpdateTeamName?.(updatedFields.name);
          }
          setActionSuccessMsg('Đã cập nhật mô tả nhóm dịch thành công!');
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }}
      />

    </div>
  );
};
