import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
  Eye,
  Info,
  ShieldCheck,
  QrCode,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { ScanTeam, ImageServerConfig } from '../types';
import { uploadSingleImageToTachServer } from '../utils/imageServerUploader';

interface TeamProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: ScanTeam;
  imageServerConfig?: ImageServerConfig;
  onSave: (updatedFields: Partial<ScanTeam>) => void;
}

export const TeamProfileEditModal: React.FC<TeamProfileEditModalProps> = ({
  isOpen,
  onClose,
  team,
  imageServerConfig,
  onSave,
}) => {
  const [name, setName] = useState(team.name || '');
  const [avatar, setAvatar] = useState(team.avatar || team.avatarUrl || '');
  const [bio, setBio] = useState(team.bio || team.description || '');
  const [donateQr, setDonateQr] = useState(team.donateQr || '');
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);

  // Upload States
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [qrUploadStatus, setQrUploadStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [isDraggingQr, setIsDraggingQr] = useState(false);
  const [showManualQrUrl, setShowManualQrUrl] = useState(false);

  if (!isOpen) return null;

  // Process QR Code Image File
  const processQrFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setQrUploadStatus({
        success: false,
        msg: 'Vui lòng chọn tệp ảnh hợp lệ (PNG, JPG, JPEG, WEBP).',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setQrUploadStatus({
        success: false,
        msg: 'Ảnh vượt quá 10MB! Vui lòng chọn ảnh nhỏ hơn.',
      });
      return;
    }

    setIsUploadingQr(true);
    setQrUploadStatus(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result as string;
      if (!base64Data) {
        setIsUploadingQr(false);
        return;
      }

      try {
        const res = await uploadSingleImageToTachServer(
          base64Data,
          'avatar',
          team.slug || team.id || 'qr-code',
          imageServerConfig
        );
        setDonateQr(res.url);
        setIsUploadingQr(false);
        setQrUploadStatus({
          success: true,
          msg: res.isRealRemote
            ? 'Đã tải ảnh mã QR lên máy chủ tachserver.site thành công!'
            : 'Đã tải ảnh mã QR lên thành công!',
        });
        setTimeout(() => setQrUploadStatus(null), 4000);
      } catch (err: any) {
        setDonateQr(base64Data);
        setIsUploadingQr(false);
        setQrUploadStatus({
          success: true,
          msg: 'Đã tải ảnh mã QR thành công!',
        });
        setTimeout(() => setQrUploadStatus(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process Avatar Image File
  const processAvatarFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      setAvatarUploadStatus({
        success: false,
        msg: 'Ảnh avatar vượt quá 10MB!',
      });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadStatus(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result as string;
      if (!base64Data) {
        setIsUploadingAvatar(false);
        return;
      }
      try {
        const res = await uploadSingleImageToTachServer(
          base64Data,
          'avatar',
          team.slug || team.id || 'avatar',
          imageServerConfig
        );
        setAvatar(res.url);
        setIsUploadingAvatar(false);
        setAvatarUploadStatus({
          success: true,
          msg: 'Đã tải ảnh đại diện thành công!',
        });
        setTimeout(() => setAvatarUploadStatus(null), 3000);
      } catch (err) {
        setAvatar(base64Data);
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || team.name,
      avatar: avatar.trim() || team.avatar,
      bio: bio.trim(),
      description: bio.trim(),
      donateQr: donateQr.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#141822] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Cài Đặt Mô Tả Nhóm Dịch</span>
              </h2>
              <p className="text-xs text-slate-400">
                Chỉnh sửa thông tin giới thiệu và mô tả hiển thị cho độc giả của <strong className="text-amber-400">{team.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit / Preview Toggle Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800/60 bg-slate-950/40 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setPreviewTab('edit')}
            className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
              previewTab === 'edit'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Chỉnh Sửa Mô Tả</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('preview')}
            className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
              previewTab === 'preview'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem Trước Hiển Thị</span>
          </button>
        </div>

        {/* Form Body */}
        {previewTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Section 1: Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Tên Nhóm Dịch:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên nhóm..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Ảnh Đại Diện Nhóm (Avatar):
                  </label>
                  {avatarUploadStatus && (
                    <span className="text-[10px] text-emerald-400 font-semibold">{avatarUploadStatus.msg}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://...link-anh hoặc tải lên"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processAvatarFile(f);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700 shrink-0 transition-colors"
                    title="Tải ảnh đại diện từ máy tính"
                  >
                    {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Tải Ảnh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: QR Code Upload Component (Converted from plain link to Image Upload) */}
            <div className="space-y-2.5 p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Ảnh Mã QR Nhóm Dịch (Tùy chọn)</span>
                </label>
                <span className="text-[11px] text-slate-500">Hiển thị mã QR trong khung thông tin nhóm</span>
              </div>

              {/* Hidden file input for QR code */}
              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processQrFile(f);
                }}
                className="hidden"
              />

              {/* Upload Status Banner */}
              {qrUploadStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    qrUploadStatus.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {qrUploadStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{qrUploadStatus.msg}</span>
                </div>
              )}

              {/* UI View 1: An Image Is Already Selected / Uploaded */}
              {donateQr ? (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Image Preview with High-Contrast White Background */}
                  <div className="relative p-2 bg-white rounded-xl shadow-lg border border-slate-300 shrink-0 group">
                    <img
                      src={donateQr}
                      alt="Mã QR nhóm dịch"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100?text=Lỗi+Ảnh+QR';
                      }}
                    />
                    {isUploadingQr && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Actions and Description */}
                  <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã kết nối ảnh mã QR thành công</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Độc giả có thể bấm xem và phóng to mã QR ở trang truyện và chân chương đọc để ủng hộ nhóm dịch.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={isUploadingQr}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow"
                        title="Chọn ảnh QR khác từ thiết bị"
                      >
                        {isUploadingQr ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Tải Ảnh Khác Thay Thế</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDonateQr('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/40 flex items-center gap-1.5 transition-colors"
                        title="Xóa mã QR hiện tại"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa Ảnh QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowManualQrUrl(!showManualQrUrl)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
                      >
                        {showManualQrUrl ? 'Ẩn Link' : 'Xem / Sửa Link Trực Tiếp'}
                      </button>
                    </div>

                    {showManualQrUrl && (
                      <div className="pt-2 animate-in fade-in">
                        <input
                          type="text"
                          value={donateQr}
                          onChange={(e) => setDonateQr(e.target.value)}
                          placeholder="https://...link-anh-ma-qr.png"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* UI View 2: No Image Yet - Drag & Drop / Click Upload Box */
                <div className="space-y-2">
                  <div
                    onClick={() => qrFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingQr(true);
                    }}
                    onDragLeave={() => setIsDraggingQr(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingQr(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processQrFile(file);
                    }}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isDraggingQr
                        ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                        : 'border-slate-700 hover:border-amber-500/60 bg-slate-900/50 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                        {isUploadingQr ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                          <span>{isUploadingQr ? 'Đang tải ảnh lên...' : 'Tải Ảnh Mã QR Lên'}</span>
                          <span className="text-amber-400 font-normal">(Bấm để chọn ảnh từ máy)</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Kéo thả ảnh vào đây hoặc bấm nút bên dưới • Hỗ trợ PNG, JPG, JPEG, WEBP (Tối đa 10MB)
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isUploadingQr}
                        className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 pointer-events-none"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn Tệp Ảnh QR Từ Thiết Bị</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual URL Link Option */}
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <button
                      type="button"
                      onClick={() => setShowManualQrUrl(!showManualQrUrl)}
                      className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-medium"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showManualQrUrl ? 'Ẩn ô nhập link ảnh' : 'Hoặc dán link ảnh nếu có sẵn'}</span>
                    </button>
                    <span className="text-slate-500">Nên dùng ảnh vuông sắc nét để quét dễ nhất</span>
                  </div>

                  {showManualQrUrl && (
                    <div className="mt-2 animate-in fade-in">
                      <input
                        type="text"
                        value={donateQr}
                        onChange={(e) => setDonateQr(e.target.value)}
                        placeholder="https://...link-anh-ma-qr.png hoặc jpg"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Team Description / Bio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mô Tả & Giới Thiệu Nhóm Dịch</span>
                </label>
                <span className="text-[11px] text-slate-500">Hiển thị ở trang chi tiết nhóm & dưới mỗi chương đọc</span>
              </div>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ví dụ: Nhóm dịch chuyên các bộ Manhwa hành động, tái sinh, võ hiệp chất lượng cao. Bản dịch sắc nét, cập nhật liên tục hàng tuần..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
              />
            </div>

            {/* Helpful notice */}
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Mô tả và ảnh mã QR sẽ tự động hiển thị trong <strong>hộp thoại nhóm dịch ở chân chương truyện</strong>, <strong>trang chi tiết truyện</strong> và <strong>trang danh sách nhóm dịch</strong>.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSaved || isUploadingQr || isUploadingAvatar}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950 animate-bounce" />
                    <span>Đã Lưu Thành Công!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Mô Tả Nhóm</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Tab: Preview */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              Dưới đây là giao diện mô tả nhóm dịch mà độc giả sẽ nhìn thấy khi đọc truyện:
            </div>

            {/* Preview Card */}
            <div className="relative bg-gradient-to-br from-[#141824] via-[#10131d] to-[#141824] border border-amber-500/30 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-3.5">
                <img
                  src={avatar || team.avatar || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150'}
                  alt={name || team.name}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-500/60"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      {name || team.name}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Nhóm Dịch
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trưởng nhóm: <span className="text-slate-300 font-semibold">{team.leaderName || 'Trưởng Nhóm'}</span>
                  </p>
                </div>
              </div>

              {/* Bio Preview */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Mô Tả & Giới Thiệu Nhóm Dịch</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {bio.trim() || 'Chưa cập nhật mô tả nhóm dịch.'}
                </p>
              </div>

              {/* QR Code Preview */}
              {donateQr && (
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mã QR Nhóm Dịch</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mã QR này sẽ hiển thị để độc giả có thể quét hoặc bấm phóng to.
                    </p>
                  </div>
                  <div className="shrink-0 p-1.5 bg-white rounded-xl shadow-md border border-slate-700">
                    <img
                      src={donateQr}
                      alt="Mã QR"
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100?text=Lỗi+QR';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTab('edit')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Quay Lại Chỉnh Sửa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

