import React, { useState, useRef } from 'react';
import { X, Save, Trash2, Plus, Lock, Calendar, AlertCircle, Sparkles, Image as ImageIcon, UploadCloud, FileArchive, Loader2, Link as LinkIcon } from 'lucide-react';
import { Chapter } from '../types';
import { processZipFile, processMultipleImageFiles } from '../utils/imageOptimizer';

interface TeamEditChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  comicTitle: string;
  chapter: Chapter;
  onSaveChapter: (updatedChapter: Chapter) => void;
  watermarkText?: string;
  watermarkLogoUrl?: string;
  watermarkOpacity?: number;
  watermarkPosition?: any;
}

export const TeamEditChapterModal: React.FC<TeamEditChapterModalProps> = ({
  isOpen,
  onClose,
  comicTitle,
  chapter,
  onSaveChapter,
  watermarkText,
  watermarkLogoUrl,
  watermarkOpacity,
  watermarkPosition,
}) => {
  const [chapterNumber, setChapterNumber] = useState<number>(chapter.chapterNumber);
  const [title, setTitle] = useState<string>(chapter.title);
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(chapter.isPasswordProtected);
  const [password, setPassword] = useState<string>(chapter.password || '');
  const [isScheduled, setIsScheduled] = useState<boolean>(!!chapter.scheduledDate);
  const [scheduledDate, setScheduledDate] = useState<string>(chapter.scheduledDate || '');
  const [images, setImages] = useState<string[]>([...chapter.images]);
  const [uploadMethod, setUploadMethod] = useState<'upload-files' | 'upload-zip' | 'link'>('upload-files');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddImageLink = () => {
    if (!newImageUrl.trim()) return;
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const fileArray = Array.from(files) as File[];
      const processed = await processMultipleImageFiles(
        fileArray,
        (progress) => setProcessProgress(progress),
        {
          logoUrl: watermarkLogoUrl,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );

      setImages([...images, ...processed]);
      setIsProcessing(false);
      setProcessProgress(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý danh sách file ảnh!');
      setIsProcessing(false);
    }
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const processed = await processZipFile(
        file,
        (progress) => setProcessProgress(progress),
        {
          logoUrl: watermarkLogoUrl,
          opacity: watermarkOpacity,
          position: watermarkPosition || 'bottom-right',
          maxWidth: 2560,
          quality: 0.96,
          mode: 'logo',
        }
      );

      // Replace or append images
      if (window.confirm(`Thay thế toàn bộ trang hiện tại bằng ${processed.length} trang từ ZIP? (Bấm 'Hủy' để nối tiếp vào danh sách cũ)`)) {
        setImages(processed);
      } else {
        setImages([...images, ...processed]);
      }
      setIsProcessing(false);
      setProcessProgress(0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi giải nén file ZIP!');
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setErrorMsg('Chương cần ít nhất 1 trang ảnh!');
      return;
    }

    if (isPasswordProtected && !password.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu mở khóa cho chương nếu bật chế độ khóa pass!');
      return;
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
      images,
    };

    onSaveChapter(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141822] border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Chỉnh Sửa Chương: {chapter.title}</h3>
            <p className="text-xs text-slate-400">Bộ truyện: <span className="text-amber-400 font-semibold">{comicTitle}</span></p>
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
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tiêu đề chương *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-[#141822] border border-sky-500/50 rounded-xl px-3 py-1.5 text-xs text-sky-300 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Manage Chapter Image Pages */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Danh sách trang ảnh trong chương ({images.length} trang)</span>
              </h4>

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

            {/* Method 1: Upload Multiple JPG/PNG */}
            {uploadMethod === 'upload-files' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl text-center cursor-pointer transition-all group"
              >
                <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-emerald-300">
                  Click để chọn nhiều ảnh JPG, PNG, WEBP từ máy tính
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống tự động đóng dấu logo watermark & xếp thứ tự số trang.
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
                  Click để chọn file nén .ZIP chứa toàn bộ ảnh của chương
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tự động giải nén, tối ưu dung lượng và đóng dấu watermark tự động.
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
                    Đang xử lý & đóng dấu watermark...
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

            {/* Grid of Pages */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-900/40 rounded-2xl border border-slate-800">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-[3/4]">
                  <img
                    src={imgUrl}
                    alt={`Trang ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cập Nhật Chương</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
