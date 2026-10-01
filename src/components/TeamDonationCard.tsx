import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  Layers,
  Edit3,
  Sparkles,
  QrCode,
  Maximize2,
  X,
  ExternalLink
} from 'lucide-react';
import { ScanTeam } from '../types';

interface TeamDonationCardProps {
  team: ScanTeam;
  variant?: 'full' | 'compact' | 'minimal';
  showEditButton?: boolean;
  onOpenEdit?: () => void;
  isFollowed?: boolean;
  onToggleFollow?: (teamId: string) => void;
  onViewTeam?: (team: ScanTeam) => void;
  className?: string;
}

export const TeamDonationCard: React.FC<TeamDonationCardProps> = ({
  team,
  showEditButton = false,
  onOpenEdit,
  isFollowed = false,
  onToggleFollow,
  onViewTeam,
  className = '',
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const teamBio = team.bio || team.description || 'Chưa cập nhật mô tả nhóm dịch.';

  return (
    <>
      <div
        id={`team-info-card-${team.id}`}
        className={`relative bg-gradient-to-br from-[#141824] via-[#10131d] to-[#141824] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl transition-all ${className}`}
      >
        {/* Background soft glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Team Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={team.avatar || team.avatarUrl || 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150'}
                alt={team.name}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-500/60 shadow-md shadow-amber-500/10"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150';
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {team.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Nhóm Dịch
                </span>
                {((team.follows ?? 0) > 0 || (team.followsCount ?? 0) > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-rose-400" />
                    <span>{(team.follows || team.followsCount || 0).toLocaleString()} theo dõi</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Trưởng nhóm: <span className="text-slate-300 font-semibold">{team.leaderName || 'Trưởng Nhóm'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons: Follow, View Comics, Edit */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {onToggleFollow && (
              <button
                type="button"
                onClick={() => onToggleFollow(team.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  isFollowed
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 transition-transform ${isFollowed ? 'fill-rose-400 text-rose-400 scale-110' : 'text-slate-400'}`} />
                <span>{isFollowed ? 'Đang Theo Dõi' : 'Theo Dõi Nhóm'}</span>
              </button>
            )}

            {onViewTeam && (
              <button
                type="button"
                onClick={() => onViewTeam(team)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Xem Truyện</span>
              </button>
            )}

            {showEditButton && onOpenEdit && (
              <button
                type="button"
                onClick={onOpenEdit}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa Mô Tả & QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Team Description / Bio */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Mô Tả & Giới Thiệu Nhóm Dịch</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {teamBio}
          </p>
        </div>

        {/* QR Code Section (If Configured by Team) */}
        {team.donateQr && (
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-4 bg-slate-950/60 p-3 sm:p-3.5 rounded-2xl border border-slate-800/90 relative z-10">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-0.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Mã QR Nhóm Dịch</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bấm vào ảnh mã QR để phóng to và quét mã.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="shrink-0 group relative p-1.5 bg-white rounded-xl shadow-md border border-slate-700 hover:scale-105 transition-transform"
              title="Bấm để phóng to mã QR"
            >
              <img
                src={team.donateQr}
                alt={`Mã QR - ${team.name}`}
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Maximize2 className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Modal Zoom Mã QR */}
      {showQrModal && team.donateQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#141824] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-white">
              Mã QR Nhóm {team.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Quét mã QR bằng ứng dụng điện thoại
            </p>

            <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-500/40">
              <img
                src={team.donateQr}
                alt={`Mã QR - ${team.name}`}
                className="w-56 h-56 object-contain"
              />
            </div>

            <div className="mt-5 flex items-center gap-2 w-full">
              <a
                href={team.donateQr}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Ảnh Gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
