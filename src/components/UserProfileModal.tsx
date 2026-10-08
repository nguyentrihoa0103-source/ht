import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User as UserIcon,
  Camera,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  Eye,
  EyeOff,
  Save,
  Key
} from 'lucide-react';
import { User } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateProfile: (updatedData: { name: string; avatar: string; password?: string; teamName?: string }) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [teamName, setTeamName] = useState(currentUser.teamName || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setTeamName(currentUser.teamName || '');
      setAvatar(currentUser.avatar || AVATAR_PRESETS[0]);
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ảnh không được vượt quá 10MB!');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawData = ev.target?.result as string;
      if (!rawData) {
        setIsUploading(false);
        return;
      }
      // Nén và chuẩn hóa avatar về kích thước chuẩn nét tối ưu (240x240) để lưu trữ nhanh, đồng bộ tức thời mọi thiết bị
      const img = new Image();
      img.onload = () => {
        const maxDim = 240;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/jpeg', 0.82);
          setAvatar(optimized);
        } else {
          setAvatar(rawData);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setAvatar(rawData);
        setIsUploading(false);
      };
      img.src = rawData;
    };
    reader.onerror = () => {
      setErrorMsg('Có lỗi khi đọc file ảnh!');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customAvatarUrl.trim()) return;
    setAvatar(customAvatarUrl.trim());
    setCustomAvatarUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Tên hiển thị không được để trống!');
      return;
    }

    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự!');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không trùng khớp!');
        return;
      }
    }

    // Tự động nhận diện customAvatarUrl nếu người dùng vừa dán link mà chưa kịp ấn Áp dụng
    const finalAvatar = (customAvatarUrl.trim() || avatar || '').trim();

    onUpdateProfile({
      name: name.trim(),
      avatar: finalAvatar || currentUser.avatar,
      password: newPassword.trim() ? newPassword.trim() : undefined,
      teamName: (currentUser.role === 'TEAM_LEADER' || currentUser.role === 'ADMIN') ? (teamName.trim() || undefined) : undefined,
    });

    setSuccessMsg('Cập nhật thông tin tài khoản thành công!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="user-profile-modal-content"
        className="w-full max-w-2xl bg-[#141822] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-2 sm:p-3 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-user-profile-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-[#141822] rounded-[14px] flex items-center justify-center text-amber-400">
              <UserIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Chỉnh Sửa Thông Tin Tài Khoản</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thay đổi ảnh đại diện (avatar), tên hiển thị và mật khẩu đăng nhập của bạn.
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section 1: Avatar Settings */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3.5">
            <label className="block text-xs font-bold text-slate-200">
              Ảnh Đại Diện (Avatar)
            </label>

            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/70 shadow-lg shadow-black/40"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  title="Tải ảnh mới từ máy"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isUploading ? 'Đang đọc ảnh...' : 'Tải Ảnh Từ Máy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ JPG, PNG, WEBP (tối đa 5MB).
                </p>
              </div>
            </div>

            {/* Avatar Presets Selection */}
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                Hoặc chọn nhanh mẫu avatar có sẵn:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(presetUrl)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      avatar === presetUrl
                        ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                placeholder="Hoặc dán đường link ảnh đại diện (URL)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold border border-slate-700"
              >
                Áp Dụng
              </button>
            </div>
          </div>

          {/* Section 2: Display Name & Email */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Tên Tài khoản:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={currentUser.username ? `${currentUser.username}` : (currentUser.email || currentUser.name)}
                    disabled
                    className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-sm text-amber-300 font-mono cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Tên Hiển Thị: *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                Vai trò hiện tại:{' '}
                <strong className="text-amber-400 font-bold">
                  {currentUser.role === 'ADMIN'
                    ? `Quản Trị Viên & Nhóm Dịch (${currentUser.teamName || 'Leesin Scans'})`
                    : currentUser.role === 'TEAM_LEADER'
                    ? `Nhóm Dịch (${currentUser.teamName || 'Chưa đặt tên'})`
                    : 'Độc Giả (Thành viên)'}
                </strong>
              </span>
            </div>

            {/* Section for Team Leader / Admin to self-set team name */}
            {(currentUser.role === 'TEAM_LEADER' || currentUser.role === 'ADMIN') && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <label className="block text-xs font-bold text-emerald-300">
                  Tên Nhóm Dịch Của Bạn (Hiển thị trên website & danh bạ nhóm):
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Nhập tên nhóm dịch của bạn (Ví dụ: Leesin Scans, Mèo Ú Team...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <p className="text-[11px] text-slate-400">
                  Tài khoản của bạn sẽ đại diện cho nhóm dịch này trong danh bạ nhóm dịch và danh sách người đăng truyện.
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Change Password */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">Đổi Mật Khẩu Đăng Nhập (Tùy Chọn)</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Để trống nếu bạn không muốn thay đổi mật khẩu hiện tại.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Hủy Bỏ
            </button>

            <button
              id="btn-save-profile"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
