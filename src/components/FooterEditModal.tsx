import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  RotateCcw,
  CheckCircle2,
  Globe,
  Mail,
  ShieldCheck,
  Layout,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  Phone,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { SiteSettings, DEFAULT_SITE_SETTINGS, MysqlConfig } from '../types';
import { saveSiteSettingsToMysql } from '../utils/mysqlSync';

interface FooterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSettings?: SiteSettings;
  onSaveSettings: (settings: SiteSettings) => void;
  mysqlConfig?: MysqlConfig;
}

export const FooterEditModal: React.FC<FooterEditModalProps> = ({
  isOpen,
  onClose,
  siteSettings,
  onSaveSettings,
  mysqlConfig,
}) => {
  const current = siteSettings || DEFAULT_SITE_SETTINGS;

  const [activeSubTab, setActiveSubTab] = useState<'brand' | 'links' | 'rights' | 'bottom'>('brand');
  const [formData, setFormData] = useState<SiteSettings>({ ...DEFAULT_SITE_SETTINGS, ...current });
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...DEFAULT_SITE_SETTINGS, ...(siteSettings || {}) });
      setSavedSuccess(false);
      setSaveMessage(null);
    }
  }, [isOpen, siteSettings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      onSaveSettings(formData);

      // Also persist to MySQL if enabled
      if (mysqlConfig && mysqlConfig.enabled) {
        const res = await saveSiteSettingsToMysql(mysqlConfig, formData);
        if (res.success) {
          setSaveMessage('Đã lưu và đồng bộ Footer lên máy chủ MySQL thành công!');
        } else {
          setSaveMessage('Đã lưu cấu hình Footer trên trình duyệt!');
        }
      } else {
        setSaveMessage('Đã lưu cấu hình Footer thành công!');
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err: any) {
      setSaveMessage('Lỗi khi lưu: ' + (err.message || 'Không xác định'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục lại nội dung Footer về mặc định ban đầu không?')) {
      const resetData: SiteSettings = {
        ...formData,
        footerDescription: DEFAULT_SITE_SETTINGS.footerDescription,
        footerSecurityText: DEFAULT_SITE_SETTINGS.footerSecurityText,
        footerCol2Title: DEFAULT_SITE_SETTINGS.footerCol2Title,
        footerCol2Links: DEFAULT_SITE_SETTINGS.footerCol2Links,
        footerCol3Title: DEFAULT_SITE_SETTINGS.footerCol3Title,
        footerReaderText: DEFAULT_SITE_SETTINGS.footerReaderText,
        footerTeamText: DEFAULT_SITE_SETTINGS.footerTeamText,
        footerCol4Title: DEFAULT_SITE_SETTINGS.footerCol4Title,
        footerDisclaimer: DEFAULT_SITE_SETTINGS.footerDisclaimer,
        footerContactEmail: DEFAULT_SITE_SETTINGS.footerContactEmail,
        footerContactPhone: DEFAULT_SITE_SETTINGS.footerContactPhone,
        footerFacebookUrl: DEFAULT_SITE_SETTINGS.footerFacebookUrl,
        footerTelegramUrl: DEFAULT_SITE_SETTINGS.footerTelegramUrl,
        footerDiscordUrl: DEFAULT_SITE_SETTINGS.footerDiscordUrl,
        footerCopyrightText: DEFAULT_SITE_SETTINGS.footerCopyrightText,
        footerBadge1: DEFAULT_SITE_SETTINGS.footerBadge1,
        footerBadge2: DEFAULT_SITE_SETTINGS.footerBadge2,
      };
      setFormData(resetData);
    }
  };

  const col2Links = formData.footerCol2Links && formData.footerCol2Links.length > 0
    ? formData.footerCol2Links
    : (DEFAULT_SITE_SETTINGS.footerCol2Links || []);

  const updateCol2Link = (index: number, field: 'label' | 'url', val: string) => {
    const updated = [...col2Links];
    if (!updated[index]) {
      updated[index] = { label: '', url: '' };
    }
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, footerCol2Links: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#10141e] border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Chỉnh Sửa & Tùy Biến Footer Cuối Trang</h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold text-[10px] uppercase">
                  Đặc quyền Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chỉnh sửa toàn bộ thông tin bản quyền, mô tả giới thiệu, liên hệ DMCA, các cột liên kết và bản quyền chân trang.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-[#0d1017] overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('brand')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'brand'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Giới Thiệu & Thương Hiệu (Cột 1)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('links')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'links'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>2. Khám Phá & Phân Quyền (Cột 2 & 3)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rights')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'rights'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>3. Bản Quyền, DMCA & Liên Hệ (Cột 4)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bottom')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'bottom'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>4. Dòng Bản Quyền Cuối (Bottom Bar)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Notifications */}
          {saveMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                savedSuccess
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* TAB 1: Brand & Column 1 */}
          {activeSubTab === 'brand' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Đoạn Văn Giới Thiệu Website (Dưới Logo Footer):
                  </label>
                  <textarea
                    rows={3}
                    value={formData.footerDescription ?? DEFAULT_SITE_SETTINGS.footerDescription}
                    onChange={(e) => setFormData({ ...formData, footerDescription: e.target.value })}
                    placeholder="Nhập nội dung mô tả website xuất hiện ở cột 1..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    Mô tả ngắn gọn về tôn chỉ hoạt động, định hướng thể loại truyện tranh của website.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Dòng Chữ Bảo Vệ Bản Quyền & Watermark (Icon Khiên Vàng):
                  </label>
                  <input
                    type="text"
                    value={formData.footerSecurityText ?? DEFAULT_SITE_SETTINGS.footerSecurityText}
                    onChange={(e) => setFormData({ ...formData, footerSecurityText: e.target.value })}
                    placeholder="Ví dụ: Hệ thống bảo vệ bản quyền & đóng watermark tự động"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Links & Column 2 & 3 */}
          {activeSubTab === 'links' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Cột 2: Khám Phá */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400 block">
                    Tiêu Đề Cột 2:
                  </label>
                  <input
                    type="text"
                    value={formData.footerCol2Title ?? DEFAULT_SITE_SETTINGS.footerCol2Title}
                    onChange={(e) => setFormData({ ...formData, footerCol2Title: e.target.value })}
                    placeholder="Ví dụ: KHÁM PHÁ TRUYỆN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Danh Sách 4 Dòng Liên Kết (Nhãn & URL):
                  </label>
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <input
                        type="text"
                        value={col2Links[idx]?.label ?? ''}
                        onChange={(e) => updateCol2Link(idx, 'label', e.target.value)}
                        placeholder={`Dòng ${idx + 1}: Nhãn hiển thị`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        value={col2Links[idx]?.url ?? ''}
                        onChange={(e) => updateCol2Link(idx, 'url', e.target.value)}
                        placeholder={`Link dẫn đến (để trống nếu không đổi)`}
                        className="w-full bg-slate-900/40 border border-slate-800/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột 3: Phân Quyền */}
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400 block">
                    Tiêu Đề Cột 3:
                  </label>
                  <input
                    type="text"
                    value={formData.footerCol3Title ?? DEFAULT_SITE_SETTINGS.footerCol3Title}
                    onChange={(e) => setFormData({ ...formData, footerCol3Title: e.target.value })}
                    placeholder="Ví dụ: HỆ THỐNG PHÂN QUYỀN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Dòng Mô Tả Cho Độc Giả:
                    </label>
                    <input
                      type="text"
                      value={formData.footerReaderText ?? DEFAULT_SITE_SETTINGS.footerReaderText}
                      onChange={(e) => setFormData({ ...formData, footerReaderText: e.target.value })}
                      placeholder="Ví dụ: Độc giả: Chỉ đọc truyện & lưu trữ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Dòng Mô Tả Cho Nhóm Dịch:
                    </label>
                    <input
                      type="text"
                      value={formData.footerTeamText ?? DEFAULT_SITE_SETTINGS.footerTeamText}
                      onChange={(e) => setFormData({ ...formData, footerTeamText: e.target.value })}
                      placeholder="Ví dụ: Nhóm dịch: Quản lý riêng truyện nhóm"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Rights & Disclaimer & Contact */}
          {activeSubTab === 'rights' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400 block">
                    Tiêu Đề Cột 4:
                  </label>
                  <input
                    type="text"
                    value={formData.footerCol4Title ?? DEFAULT_SITE_SETTINGS.footerCol4Title}
                    onChange={(e) => setFormData({ ...formData, footerCol4Title: e.target.value })}
                    placeholder="Ví dụ: BẢN QUYỀN & LIÊN HỆ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Lời Tuyên Bố Miễn Trừ Trách Nhiệm / DMCA:
                  </label>
                  <textarea
                    rows={3}
                    value={formData.footerDisclaimer ?? DEFAULT_SITE_SETTINGS.footerDisclaimer}
                    onChange={(e) => setFormData({ ...formData, footerDisclaimer: e.target.value })}
                    placeholder="Nhập tuyên bố bản quyền..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email Liên Hệ / Khiếu Nại:</span>
                    </label>
                    <input
                      type="text"
                      value={formData.footerContactEmail ?? DEFAULT_SITE_SETTINGS.footerContactEmail}
                      onChange={(e) => setFormData({ ...formData, footerContactEmail: e.target.value })}
                      placeholder="Ví dụ: contact@leesincomic.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hotline / Zalo (Tùy chọn):</span>
                    </label>
                    <input
                      type="text"
                      value={formData.footerContactPhone ?? ''}
                      onChange={(e) => setFormData({ ...formData, footerContactPhone: e.target.value })}
                      placeholder="Ví dụ: 0988.xxx.xxx (để trống nếu không có)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Link Facebook / Fanpage:</label>
                    <input
                      type="text"
                      value={formData.footerFacebookUrl ?? ''}
                      onChange={(e) => setFormData({ ...formData, footerFacebookUrl: e.target.value })}
                      placeholder="https://facebook.com/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-sky-400 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Link Telegram:</label>
                    <input
                      type="text"
                      value={formData.footerTelegramUrl ?? ''}
                      onChange={(e) => setFormData({ ...formData, footerTelegramUrl: e.target.value })}
                      placeholder="https://t.me/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-cyan-400 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Link Discord:</label>
                    <input
                      type="text"
                      value={formData.footerDiscordUrl ?? ''}
                      onChange={(e) => setFormData({ ...formData, footerDiscordUrl: e.target.value })}
                      placeholder="https://discord.gg/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-indigo-400 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Bottom Bar */}
          {activeSubTab === 'bottom' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 block">
                    Dòng Chữ Bản Quyền Dưới Cùng (Copyright):
                  </label>
                  <input
                    type="text"
                    value={formData.footerCopyrightText ?? DEFAULT_SITE_SETTINGS.footerCopyrightText}
                    onChange={(e) => setFormData({ ...formData, footerCopyrightText: e.target.value })}
                    placeholder="Ví dụ: © 2026 leesincomic.com • Đọc truyện tranh online cập nhật nhanh nhất"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">
                      Badge Dưới Cùng 1:
                    </label>
                    <input
                      type="text"
                      value={formData.footerBadge1 ?? DEFAULT_SITE_SETTINGS.footerBadge1}
                      onChange={(e) => setFormData({ ...formData, footerBadge1: e.target.value })}
                      placeholder="Ví dụ: MySQL Backend Synchronized"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">
                      Badge Dưới Cùng 2:
                    </label>
                    <input
                      type="text"
                      value={formData.footerBadge2 ?? DEFAULT_SITE_SETTINGS.footerBadge2}
                      onChange={(e) => setFormData({ ...formData, footerBadge2: e.target.value })}
                      placeholder="Ví dụ: Watermark Canvas Protection"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Mockup Preview */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Xem Trước Hiển Thị Footer Thực Tế:</span>
              </span>
              <span className="text-[10px] text-slate-500">Cập nhật trực tiếp theo dữ liệu bạn nhập</span>
            </div>

            <div className="p-4 bg-[#0b0d13] border border-slate-800/80 rounded-xl text-slate-400 text-[11px] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Col 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="h-6 w-auto max-w-[140px] object-contain" />
                    ) : (
                      <>
                        <span>📚</span>
                        <span>{formData.siteName || 'Leesin Comic'}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-3">
                    {formData.footerDescription || DEFAULT_SITE_SETTINGS.footerDescription}
                  </p>
                  <div className="text-[10px] text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{formData.footerSecurityText || DEFAULT_SITE_SETTINGS.footerSecurityText}</span>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">
                    {formData.footerCol2Title || DEFAULT_SITE_SETTINGS.footerCol2Title}
                  </div>
                  <ul className="space-y-1 text-[10px] text-slate-400">
                    {col2Links.map((l, i) => (
                      <li key={i}>{l.label || `Mục ${i + 1}`}</li>
                    ))}
                  </ul>
                </div>

                {/* Col 3 */}
                <div className="space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">
                    {formData.footerCol3Title || DEFAULT_SITE_SETTINGS.footerCol3Title}
                  </div>
                  <div className="text-[10px] text-amber-400">Quản trị Admin (Đang truy cập)</div>
                  <div className="text-[10px] text-emerald-400">Portal Nhóm Dịch</div>
                  <div className="text-[10px] text-slate-500">{formData.footerReaderText || DEFAULT_SITE_SETTINGS.footerReaderText}</div>
                  <div className="text-[10px] text-slate-500">{formData.footerTeamText || DEFAULT_SITE_SETTINGS.footerTeamText}</div>
                </div>

                {/* Col 4 */}
                <div className="space-y-1">
                  <div className="font-bold text-white text-[11px] uppercase">
                    {formData.footerCol4Title || DEFAULT_SITE_SETTINGS.footerCol4Title}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-3">
                    {formData.footerDisclaimer || DEFAULT_SITE_SETTINGS.footerDisclaimer}
                  </p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-amber-400" />
                    <span>{formData.footerContactEmail || DEFAULT_SITE_SETTINGS.footerContactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Bottom bar preview */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
                <span>{formData.footerCopyrightText || DEFAULT_SITE_SETTINGS.footerCopyrightText}</span>
                <div className="flex items-center gap-3">
                  <span>{formData.footerBadge1 || DEFAULT_SITE_SETTINGS.footerBadge1}</span>
                  <span>•</span>
                  <span>{formData.footerBadge2 || DEFAULT_SITE_SETTINGS.footerBadge2}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Khôi Phục Mặc Định Footer</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Đang Lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>Lưu & Cập Nhật Footer</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
