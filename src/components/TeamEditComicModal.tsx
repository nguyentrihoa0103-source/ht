import React, { useState } from 'react';
import { X, Save, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Comic, ScanTeam, ImageServerConfig } from '../types';
import { ImageUploadField } from './ImageUploadField';
import { toSlug } from '../utils/slug';
import { is18PlusComic } from '../utils/adultFilter';

interface TeamEditComicModalProps {
  isOpen: boolean;
  onClose: () => void;
  comic: Comic;
  onSaveComic: (updatedComic: Comic) => void;
  imageServerConfig?: ImageServerConfig;
  isAdmin?: boolean;
}

export const TeamEditComicModal: React.FC<TeamEditComicModalProps> = ({
  isOpen,
  onClose,
  comic,
  onSaveComic,
  imageServerConfig,
  isAdmin = false,
}) => {
  const [title, setTitle] = useState(comic.title);
  const [slug, setSlug] = useState(comic.slug);
  const [otherNamesStr, setOtherNamesStr] = useState(comic.otherNames.join(', '));
  const [authorsStr, setAuthorsStr] = useState(comic.authors.join(', '));
  const [genresStr, setGenresStr] = useState(comic.genres.join(', '));
  const [status, setStatus] = useState<Comic['status']>(comic.status);
  const [summary, setSummary] = useState(comic.summary);
  const [coverImage, setCoverImage] = useState(comic.coverImage);
  const [bannerImage, setBannerImage] = useState(comic.bannerImage || '');
  const [isHot, setIsHot] = useState(!!comic.isHot);
  const [isTrending, setIsTrending] = useState(!!comic.isTrending);
  const [is18Plus, setIs18Plus] = useState(comic.is18Plus !== undefined ? comic.is18Plus : is18PlusComic(comic));
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên bộ truyện!');
      return;
    }

    const parsedGenres = genresStr.split(',').map((s) => s.trim()).filter(Boolean);
    const finalGenres = is18Plus
      ? (parsedGenres.some(g => g.toLowerCase() === '18+') ? parsedGenres : [...parsedGenres, '18+'])
      : parsedGenres.filter(g => g.toLowerCase() !== '18+');

    const updated: Comic = {
      ...comic,
      title: title.trim(),
      slug: toSlug(slug.trim() || title.trim()) || comic.slug,
      otherNames: otherNamesStr.split(',').map((s) => s.trim()).filter(Boolean),
      authors: authorsStr.split(',').map((s) => s.trim()).filter(Boolean),
      genres: finalGenres,
      status,
      summary: summary.trim(),
      coverImage: coverImage.trim() || comic.coverImage,
      bannerImage: bannerImage.trim() || coverImage.trim() || comic.bannerImage,
      isHot: !!isHot,
      isTrending: isAdmin ? isTrending : !!comic.isTrending,
      is18Plus: is18Plus,
      updatedAt: comic.updatedAt,
    };

    onSaveComic(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141822] border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
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
            <h3 className="text-lg font-bold text-white">Chỉnh Sửa Thông Tin Bộ Truyện</h3>
            <p className="text-xs text-slate-400">Cập nhật tên, tác giả, thể loại, ảnh bìa và tóm tắt truyện</p>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tên bộ truyện *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Đường dẫn slug URL</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tác giả (ngăn cách bằng dấu phẩy)</label>
              <input
                type="text"
                value={authorsStr}
                onChange={(e) => setAuthorsStr(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tên khác</label>
              <input
                type="text"
                value={otherNamesStr}
                onChange={(e) => setOtherNamesStr(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Thể loại (ngăn cách bằng dấu phẩy)</label>
              <input
                type="text"
                value={genresStr}
                onChange={(e) => setGenresStr(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Trạng thái phát hành</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Đang tiến hành">Đang tiến hành</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Tạm ngưng">Tạm ngưng</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <ImageUploadField
                id="edit-comic-cover"
                label="Ảnh Bìa Bộ Truyện (Cover Image)"
                value={coverImage}
                onChange={setCoverImage}
                type="cover"
                slugOrId={slug || 'comic-cover'}
                imageServerConfig={imageServerConfig}
                placeholder="https://... hoặc bấm nút Tải Ảnh Lên"
                helperText="Tải ảnh bìa trực tiếp từ máy tính hoặc dán URL."
              />
            </div>
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <ImageUploadField
                id="edit-comic-banner"
                label="Ảnh Banner Ngang (Banner Image)"
                value={bannerImage}
                onChange={setBannerImage}
                type="cover"
                slugOrId={slug ? `${slug}-banner` : 'comic-banner'}
                imageServerConfig={imageServerConfig}
                placeholder="https://... hoặc bấm nút Tải Ảnh Lên"
                helperText="Tải ảnh banner ngang làm hình nền đầu truyện."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tóm tắt nội dung</label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[#1b2230] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHot}
                onChange={(e) => setIsHot(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">Gắn thẻ Truyện Hot 🔥</span>
                <span className="text-[10px] text-slate-400 font-normal">(Hiển thị huy hiệu HOT trên trang chủ và mục Truyện Hot)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={is18Plus}
                onChange={(e) => setIs18Plus(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span className="text-red-400 font-bold">Gắn nhãn 18+ 🔞</span>
                <span className="text-[10px] text-slate-400 font-normal">(Tự động che mờ ảnh bìa và cảnh báo độ tuổi)</span>
              </span>
            </label>

            {isAdmin && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">Thịnh Hành / Trending ⭐</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Đặc quyền Admin: đưa lên Slider Thịnh Hành đầu trang)</span>
                </span>
              </label>
            )}
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
              <span>Lưu Thay Đổi Bộ Truyện</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
