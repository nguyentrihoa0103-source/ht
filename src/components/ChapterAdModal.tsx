import React from 'react';
import { X, ExternalLink, ShoppingBag, ShieldCheck } from 'lucide-react';
import { ChapterAdConfig } from '../types';

export const normalizeAdUrl = (url?: string): string => {
  if (!url) return 'https://shopee.vn';
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) return 'https://shopee.vn';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

interface ChapterAdModalProps {
  ad: ChapterAdConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPreview?: boolean;
}

export const ChapterAdModal: React.FC<ChapterAdModalProps> = ({
  ad,
  isOpen,
  onClose,
  onConfirm,
  isPreview = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    if (!isPreview && ad.targetUrl) {
      window.open(normalizeAdUrl(ad.targetUrl), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      id="chapter-ad-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="chapter-ad-modal-card"
        className="relative w-full max-w-[340px] sm:max-w-[380px] bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 select-none overflow-hidden"
      >
        {/* Top Right Close Button */}
        <button
          id="btn-close-ad-modal"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Thumbnail / Ad Image */}
        <div className="relative mb-3.5 mt-1">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 shadow-sm flex items-center justify-center p-1.5">
            {ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <div className="w-full h-full bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center rounded-xl">
                <ShoppingBag className="w-10 h-10" />
              </div>
            )}
          </div>

          {ad.badgeText && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#00b14f] text-white text-[10px] font-extrabold tracking-wider shadow-sm uppercase">
              {ad.badgeText}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug px-1">
          {ad.title || 'Click QC mở APP SHOPEE ủng hộ mình nhé!'}
        </h4>

        {/* Product Description */}
        {ad.description && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed px-1">
            {ad.description}
          </p>
        )}

        {/* Subtext Prompt */}
        {ad.subText && (
          <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 w-full font-medium">
            {ad.subText.includes('(Shopee)') ? (
              <>
                {ad.subText.split('(Shopee)')[0]}
                <span className="text-[#00b14f] font-bold">(Shopee)</span>
                {ad.subText.split('(Shopee)')[1]}
              </>
            ) : (
              ad.subText
            )}
          </p>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 mt-4 pt-1">
          <button
            id="btn-ad-confirm"
            onClick={handleConfirm}
            className="w-full py-3 px-4 rounded-2xl bg-[#00b14f] hover:bg-[#009b45] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-[#00b14f]/30 transition-all flex items-center justify-center gap-2"
          >
            <span>{ad.confirmBtnText || 'Đồng ý'}</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </button>

          <button
            id="btn-ad-cancel"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 font-semibold text-xs transition-all"
          >
            {ad.cancelBtnText || 'Từ chối'}
          </button>
        </div>

        {isPreview && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <ShieldCheck className="w-3 h-3" />
            <span>Chế độ Xem Trước (Admin Preview)</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChapterInlineAdBannerProps {
  ad: ChapterAdConfig;
  className?: string;
}

export const ChapterInlineAdBanner: React.FC<ChapterInlineAdBannerProps> = ({
  ad,
  className = '',
}) => {
  if (!ad.enabled || !ad.showInlineBanner) return null;

  return (
    <div
      id="chapter-inline-ad-banner"
      className={`relative w-full max-w-[420px] mx-auto bg-white rounded-3xl p-5 border border-slate-200 shadow-xl overflow-hidden text-slate-800 ${className}`}
    >
      {/* Top Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-[#00b14f] text-white text-[11px] font-extrabold uppercase tracking-wider">
          {ad.badgeText || 'SHOPEE'}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">Tài trợ ủng hộ nhóm dịch</span>
      </div>

      {/* Product Image */}
      <div className="w-full h-44 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-3">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Title & Desc */}
      <h5 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
        {ad.title}
      </h5>
      {ad.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
          {ad.description}
        </p>
      )}

      {/* Action Button */}
      <a
        href={normalizeAdUrl(ad.targetUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-[#00b14f] hover:bg-[#009b45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#00b14f]/25 transition-all text-center block"
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>Xem Ngay Trên Shopee</span>
      </a>
    </div>
  );
};
