import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  Lock,
  Calendar,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  FileArchive,
  Loader2,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Chapter, ImageServerConfig } from '../types';
import { processZipFile, processMultipleImageFiles } from '../utils/imageOptimizer';
import { uploadImagesToTachServer } from '../utils/imageServerUploader';

interface TeamEditChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  comicTitle: string;
  chapter: Chapter;
  comicId?: string;
  comicSlug?: string;
  onSaveChapter: (updatedChapter: Chapter) => void;
  watermarkText?: string;
  watermarkLogoUrl?: string;
  watermarkOpacity?: number;
  watermarkPosition?: any;
  imageServerConfig?: ImageServerConfig;
}

export const TeamEditChapterModal: React.FC<TeamEditChapterModalProps> = ({
  isOpen,
  onClose,
  comicTitle,
  chapter,
  comicId,
  comicSlug,
  onSaveChapter,
  watermarkText,
  watermarkLogoUrl,
  watermarkOpacity,
  watermarkPosition,
  imageServerConfig,
}) => {
  const [chapterNumber, setChapterNumber] = useState<number>(chapter.chapterNumber);
  const [title, setTitle] = useState<string>(chapter.title);
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(chapter.isPasswordProtected);
  const [password, setPassword] = useState<string>(chapter.password || '');
  const [isScheduled, setIsScheduled] = useState<boolean>(!!chapter.scheduledDate);
  const [scheduledDate, setScheduledDate] = useState<string>(chapter.scheduledDate || '');
  const [images, setImages] = useState<string[]>([...(chapter.images || [])]);
  const [uploadMethod, setUploadMethod] = useState<'upload-files' | 'upload-zip' | 'link'>('upload-files');
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace');
  const [uploadToCdn, setUploadToCdn] = useState<boolean>(imageServerConfig?.enabled ?? true);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [applyCanvasWatermark, setApplyCanvasWatermark] = useState<boolean>(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);

  // Tự động đồng bộ và tải ảnh đầy đủ từ backend nếu mảng ảnh ban đầu đang rỗng
  useEffect(() => {
    if (isOpen) {
      setChapterNumber(chapter.chapterNumber);
      setTitle(chapter.title);
      setIsPasswordProtected(chapter.isPasswordProtected);
      setPassword(chapter.password || '');
      setIsScheduled(!!chapter.scheduledDate);
      setScheduledDate(chapter.scheduledDate || '');
      setErrorMsg('');
      setStatusMessage('');
      setProcessProgress(0);
      setIsProcessing(false);

      if (Array.isArray(chapter.images) && chapter.images.length > 0) {
        setImages([...chapter.images]);
      } else {
        const targetSlug = comicSlug || chapter.comicId || '';
        const targetId = comicId || chapter.comicId || '';
        fetch(
          `/api.php?action=get_chapter&id=${encodeURIComponent(chapter.id || '')}&chapterId=${encodeURIComponent(
            chapter.id || ''
          )}&chapterNumber=${encodeURIComponent(chapter.chapterNumber)}&comicSlug=${encodeURIComponent(
            targetSlug
          )}&comicId=${encodeURIComponent(targetId)}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.chapter?.images) && data.chapter.images.length > 0) {
              setImages(data.chapter.images);
            }
          })
          .catch((err) => console.warn('Lỗi nạp ảnh chi tiết chương:', err));
      }
    }
  }, [isOpen, chapter, comicId, comicSlug]);

  if (!isOpen) return null;

  const handleAddImageLink = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    setImages((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleTriggerReplaceSingle = (idx: number) => {
    setReplacingIndex(idx);
    singleFileInputRef.current?.click();
  };

  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;

    setIsProcessing(true);
    setStatusMessage(`Đang xử lý ảnh mới cho trang #${replacingIndex + 1}...`);
    setErrorMsg('');
    try {
      const processed = await processMultipleImageFiles(
        [file],
        undefined,
        {
          logoUrl: applyCanvasWatermark ? watermarkLogoUrl : undefined,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );
      if (processed.length > 0) {
        setImages((prev) => {
          const next = [...prev];
          next[replacingIndex] = processed[0];
          return next;
        });
        setStatusMessage(`Đã cập nhật ảnh thay thế cho trang #${replacingIndex + 1}!`);
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý file ảnh thay thế!');
    } finally {
      setIsProcessing(false);
      setReplacingIndex(null);
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
    }
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setStatusMessage('Đang xử lý và tối ưu ảnh...');
    setErrorMsg('');
    try {
      const fileArray = Array.from(files) as File[];
      const processed = await processMultipleImageFiles(
        fileArray,
        (progress) => setProcessProgress(progress),
        {
          logoUrl: applyCanvasWatermark ? watermarkLogoUrl : undefined,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );

      if (uploadMode === 'replace') {
        setImages(processed);
        setStatusMessage(`Đã thay thế toàn bộ danh sách bằng ${processed.length} trang mới!`);
      } else {
        setImages((prev) => [...prev, ...processed]);
        setStatusMessage(`Đã nối tiếp thêm ${processed.length} trang mới vào danh sách!`);
      }
      setIsProcessing(false);
      setProcessProgress(0);
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý danh sách file ảnh!');
      setIsProcessing(false);
      setStatusMessage('');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage('Đang giải nén và tối ưu file ZIP...');
    setErrorMsg('');
    try {
      const processed = await processZipFile(
        file,
        (progress) => setProcessProgress(progress),
        {
          logoUrl: applyCanvasWatermark ? watermarkLogoUrl : undefined,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );

      if (uploadMode === 'replace') {
        setImages(processed);
        setStatusMessage(`Đã thay thế toàn bộ bằng ${processed.length} trang từ ZIP!`);
      } else {
        setImages((prev) => [...prev, ...processed]);
        setStatusMessage(`Đã nối tiếp thêm ${processed.length} trang từ ZIP vào danh sách!`);
      }
      setIsProcessing(false);
      setProcessProgress(0);
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi giải nén file ZIP!');
      setIsProcessing(false);
      setStatusMessage('');
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setErrorMsg('Chương cần ít nhất 1 trang ảnh!');
      return;
    }

    if (isPasswordProtected && !password.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu mở khóa cho chương nếu bật chế độ khóa pass!');
      return;
    }

    let finalImages = images;

    // Tự động đẩy ảnh base64 mới lên CDN nếu CDN đang kích hoạt
    const hasBase64 = images.some((img) => img.startsWith('data:') || img.startsWith('blob:'));
    if (hasBase64 && uploadToCdn && imageServerConfig?.enabled) {
      setIsProcessing(true);
      setStatusMessage('Đang tải ảnh mới lên CDN tachserver.site và xóa cache cũ...');
      setProcessProgress(10);
      try {
        const cleanSlug = (
          comicSlug ||
          comicId?.replace(/^comic-/, '') ||
          chapter.comicId?.replace(/^comic-/, '') ||
          'comic'
        ).trim().replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

        const uploadRes = await uploadImagesToTachServer(
          images,
          cleanSlug,
          chapterNumber,
          imageServerConfig,
          (percent) => setProcessProgress(percent)
        );
        if (uploadRes.urls && uploadRes.urls.length > 0) {
          finalImages = uploadRes.urls;
        }
      } catch (err: any) {
        console.warn('Lỗi CDN khi lưu chương, dùng ảnh trực tiếp:', err);
      } finally {
        setIsProcessing(false);
        setStatusMessage('');
      }
    }

    const updated: Chapter = {
      ...chapter,
      chapterNumber: Number(chapterNumber),
      title: title.trim() || `Chương ${chapterNumber}`,
      createdAt: chapter.createdAt,
      updatedAt: new Date().toISOString(),
      isPasswordProtected,
      password: isPasswordProtected ? password.trim() : undefined,
      scheduledDate: isScheduled && scheduledDate ? scheduledDate : undefined,
      images: finalImages,
    };

    onSaveChapter(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141822] border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Chỉnh Sửa Chương: {chapter.title}</h3>
            <p className="text-xs text-slate-400">
              Bộ truyện: <span className="text-amber-400 font-semibold">{comicTitle}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Số thứ tự chương (Chapter Number) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(parseFloat(e.target.value) || 0)}
                disabled={isProcessing}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tiêu đề chương *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Protection & Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password Protection */}
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={(e) => setIsPasswordProtected(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Khóa mật khẩu VIP / Pass riêng</span>
              </label>

              {isPasswordProtected && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập pass mở khóa (ví dụ: leesin2026)"
                  disabled={isProcessing}
                  className="w-full bg-[#141822] border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-amber-300 focus:outline-none"
                />
              )}
            </div>

            {/* Scheduled publication */}
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Hẹn giờ tự động phát hành</span>
              </label>

              {isScheduled && (
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-[#141822] border border-sky-500/50 rounded-xl px-3 py-1.5 text-xs text-sky-300 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Manage Chapter Image Pages */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Danh sách trang ảnh trong chương ({images.length} trang)</span>
                </h4>
                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xóa toàn bộ ${images.length} trang ảnh của chương này để tải lại từ đầu?`)) {
                        setImages([]);
                      }
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa tất cả</span>
                  </button>
                )}
              </div>

              {/* Upload Method Switcher */}
              <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUploadMethod('upload-files')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    uploadMethod === 'upload-files'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Ảnh (JPG/PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('upload-zip')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    uploadMethod === 'upload-zip'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Upload File ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('link')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                    uploadMethod === 'link'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Dán Link</span>
                </button>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleMultipleFilesChange}
              className="hidden"
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleZipFileChange}
              className="hidden"
            />
            <input
              ref={singleFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleSingleFileChange}
              className="hidden"
            />

            {/* Chế độ tải ảnh: Thay thế toàn bộ hay Nối tiếp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">Chế Độ Khi Tải Ảnh Mới:</span>
                  <span className="text-[10px] text-slate-400 block">
                    {uploadMode === 'replace'
                      ? 'Ảnh mới sẽ thay thế toàn bộ ảnh cũ hiện có của chương trên CDN'
                      : 'Ảnh mới sẽ được nối tiếp thêm vào cuối danh sách ảnh hiện tại'}
                  </span>
                </div>
              </div>
              <div className="flex p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setUploadMode('replace')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    uploadMode === 'replace'
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thay Thế Toàn Bộ Ảnh Cũ (Khuyên Dùng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('append')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    uploadMode === 'append'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nối Tiếp Thêm Ảnh</span>
                </button>
              </div>
            </div>

            {/* CDN upload sync toggle */}
            {imageServerConfig?.enabled && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Tải ảnh mới lên CDN ({imageServerConfig.targetDomain})</span>
                    <span className="text-[10px] text-slate-400 block">
                      Tự động ghi đè tệp ảnh trên CDN tachserver.site và xóa cache trình duyệt để hiển thị ảnh mới tức thì
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={uploadToCdn}
                  onChange={(e) => setUploadToCdn(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            )}

            {/* Watermark mode choice */}
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">In Chìm Logo Watermark Vào Tệp Ảnh (Canvas)</span>
                <span className="text-[10px] text-slate-400 block">
                  Mặc định tắt vì website đã có lớp Watermark tự động ngoài trình đọc (tránh bị 2 logo đè lên nhau)
                </span>
              </div>
              <input
                type="checkbox"
                checked={applyCanvasWatermark}
                onChange={(e) => setApplyCanvasWatermark(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Method 1: Upload Multiple JPG/PNG */}
            {uploadMethod === 'upload-files' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl text-center cursor-pointer transition-all group"
              >
                <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-emerald-300">
                  {uploadMode === 'replace'
                    ? 'Click để chọn nhiều ảnh JPG, PNG, WEBP (Sẽ thay thế toàn bộ ảnh cũ)'
                    : 'Click để chọn nhiều ảnh JPG, PNG, WEBP (Sẽ nối tiếp vào sau ảnh cũ)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống tự động sắp xếp theo thứ tự số trang và tối ưu hóa dung lượng.
                </p>
              </div>
            )}

            {/* Method 2: Upload ZIP */}
            {uploadMethod === 'upload-zip' && (
              <div
                onClick={() => zipInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-950/20 hover:bg-amber-950/30 rounded-2xl text-center cursor-pointer transition-all group"
              >
                <FileArchive className="w-8 h-8 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-amber-300">
                  {uploadMode === 'replace'
                    ? 'Click để chọn file .ZIP (Sẽ thay thế toàn bộ ảnh cũ của chương)'
                    : 'Click để chọn file .ZIP (Sẽ nối tiếp ảnh từ ZIP vào sau ảnh cũ)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tự động giải nén, sắp xếp thứ tự và tối ưu dung lượng cho toàn bộ chương.
                </p>
              </div>
            )}

            {/* Method 3: Add URL Link */}
            {uploadMethod === 'link' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Dán link ảnh mới (CDN hoặc HTTPS) vào đây..."
                  className="flex-1 bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddImageLink}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Trang</span>
                </button>
              </div>
            )}

            {/* Processing State Progress Bar */}
            {isProcessing && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {statusMessage || 'Đang xử lý ảnh...'}
                  </span>
                  <span>{processProgress}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full transition-all duration-300"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Grid of Pages with Reordering and Corner Delete */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[3/4] shadow"
                >
                  <img
                    src={imgUrl}
                    alt={`Trang ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 left-1 flex items-center gap-1 z-10">
                    <span className="px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                      #{idx + 1}
                    </span>
                    {(imgUrl.startsWith('data:') || imgUrl.startsWith('blob:')) && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-bold text-slate-950 shadow">
                        Mới
                      </span>
                    )}
                  </div>

                  {/* Corner Buttons: Replace Single Image & Delete */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={() => handleTriggerReplaceSingle(idx)}
                      title={`Thay thế ảnh trang ${idx + 1}`}
                      className="p-1 rounded-full bg-emerald-600/90 text-white hover:bg-emerald-500 transition-colors shadow"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title={`Xóa trang ${idx + 1}`}
                      className="p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Move Left / Right Reordering Controls */}
                  <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'left')}
                        title="Đổi chỗ sang trước"
                        className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className="text-[9px] text-slate-300 font-mono">P.{idx + 1}</span>
                    {idx < images.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'right')}
                        title="Đổi chỗ sang sau"
                        className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusMessage || 'Đang lưu chương...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cập Nhật Chương</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
