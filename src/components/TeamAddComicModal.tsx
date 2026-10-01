import React, { useState } from 'react';
import { BookPlus, PlusCircle, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { Comic, ScanTeam, ImageServerConfig } from '../types';
import { ImageUploadField } from './ImageUploadField';
import { toSlug } from '../utils/slug';

interface TeamAddComicModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: ScanTeam;
  onAddNewComic: (newComic: Comic) => void | Promise<void>;
  imageServerConfig?: ImageServerConfig;
}

export const TeamAddComicModal: React.FC<TeamAddComicModalProps> = ({
  isOpen,
  onClose,
  team,
  onAddNewComic,
  imageServerConfig,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [author, setAuthor] = useState('');
  const [genres, setGenres] = useState('Manhwa, Action, Chuyển Sinh');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'
  );
  const [bannerImage, setBannerImage] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const generatedSlug = slug.trim() ? toSlug(slug.trim()) : toSlug(title.trim());
    const finalSlug = generatedSlug || `comic-${Date.now()}`;

    const newComic: Comic = {
      id: `comic-${Date.now()}`,
      title: title.trim(),
      slug: finalSlug,
      otherNames: [],
      coverImage:
        coverImage.trim() ||
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      bannerImage: bannerImage.trim() || coverImage.trim(),
      authors: [author.trim() || 'Đang cập nhật'],
      status: 'Đang tiến hành',
      genres: genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      summary:
        summary.trim() ||
        `Truyện tranh ${title} được dịch và đăng tải độc quyền bởi nhóm ${team.name}.`,
      teamId: team.id,
      teamName: team.name,
      views: 0,
      likes: 0,
      follows: 0,
      rating: 5.0,
      ratingCount: 1,
      updatedAt: new Date().toISOString(),
      chapters: [],
      seo: {
        focusKeyword: title,
        metaTitle: `${title} Tiếng Việt Mới Nhất - Leesin Comic`,
        metaDesc: `Đọc truyện ${title} full tiếng việt chất lượng cao tại ${team.name}.`,
        canonicalUrl: `https://leesincomic.com/truyen/${finalSlug}`,
        score: 95,
        schemaType: 'ComicBook',
        ogImage: coverImage.trim(),
      },
    };

    try {
      await onAddNewComic(newComic);
      setSuccessMsg(`Đã tạo bộ truyện "${title}" thành công cho nhóm ${team.name}!`);
      setTimeout(() => {
        setSuccessMsg('');
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Lỗi khi tạo truyện: ${err?.message || 'Không thể lưu vào cơ sở dữ liệu'}`);
    }
  };

  return (
    <div
      id="team-add-comic-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#141822] border border-slate-700/80 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thêm Bộ Truyện Mới Của Nhóm</h3>
              <p className="text-xs text-slate-400">
                Nhóm <strong className="text-emerald-400">{team.name}</strong> tự tạo và sở hữu đầu truyện
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên Bộ Truyện: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Huyền Thoại Pháp Sư Trọng Sinh"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Đường dẫn thân thiện (Slug URL):
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Tự động: huyen-thoai-phap-su-trong-sinh"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tác Giả:
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Tên tác giả / Họa sĩ"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Thể Loại (phân cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Action, Fantasy, Manhwa, Shounen"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Cover & Banner Image upload fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <ImageUploadField
                id="team-new-comic-cover"
                label="Ảnh Bìa Bộ Truyện (Cover Image)"
                value={coverImage}
                onChange={setCoverImage}
                type="cover"
                slugOrId={slug || 'new-comic'}
                imageServerConfig={imageServerConfig}
                placeholder="https://... hoặc bấm Tải Ảnh Lên"
                helperText="Chọn ảnh bìa (JPG/PNG/WEBP) từ máy tính hoặc dán link URL."
              />
            </div>

            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
              <ImageUploadField
                id="team-new-comic-banner"
                label="Ảnh Banner Ngang (Banner Image)"
                value={bannerImage}
                onChange={setBannerImage}
                type="cover"
                slugOrId={slug ? `${slug}-banner` : 'new-comic-banner'}
                imageServerConfig={imageServerConfig}
                placeholder="https://... hoặc bấm Tải Ảnh Lên"
                helperText="Ảnh banner ngang kích thước lớn hiển thị đầu trang truyện."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tóm Tắt Nội Dung:
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Nhập tóm tắt cốt truyện mở đầu..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Lưu Lên Database...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo Bộ Truyện Cho Nhóm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
