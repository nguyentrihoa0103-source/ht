import React, { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Mail, ExternalLink, Globe, Edit3, Settings, Phone, MessageCircle } from 'lucide-react';
import { User, SiteSettings, DEFAULT_SITE_SETTINGS, MysqlConfig } from '../types';
import { FooterEditModal } from './FooterEditModal';

interface FooterProps {
  currentUser?: User | null;
  siteSettings?: SiteSettings;
  onOpenAdmin: () => void;
  onOpenTeamPortal: () => void;
  onRequireLogin?: () => void;
  onUpdateSiteSettings?: (settings: SiteSettings) => void;
  mysqlConfig?: MysqlConfig;
}

export const Footer: React.FC<FooterProps> = ({
  currentUser,
  siteSettings,
  onOpenAdmin,
  onOpenTeamPortal,
  onRequireLogin,
  onUpdateSiteSettings,
  mysqlConfig,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';
  const isTeam = currentUser?.role === 'TEAM_LEADER' || currentUser?.role === 'TEAM_MEMBER';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const settings = siteSettings || DEFAULT_SITE_SETTINGS;

  useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  const col2Links = (settings.footerCol2Links && settings.footerCol2Links.length > 0)
    ? settings.footerCol2Links
    : (DEFAULT_SITE_SETTINGS.footerCol2Links || []);

  return (
    <footer id="main-footer" className="bg-[#0b0d13] border-t border-slate-800/80 text-slate-400 text-xs mt-16 relative">
      
      {/* Admin Quick Edit Floating / Inline Banner */}
      {isAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Đặc quyền Admin: Bạn có thể tùy biến toàn bộ nội dung, bản quyền và liên hệ chân trang.</span>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-950" />
              <span>Chỉnh Sửa Footer</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl && !logoError ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName || 'Logo'}
                  style={{
                    height: `${Math.max(20, Math.min(100, settings.footerLogoHeight || 32))}px`,
                    maxHeight: `${Math.max(20, Math.min(100, settings.footerLogoHeight || 32))}px`,
                    maxWidth: `${Math.max(60, Math.min(400, (settings.logoWidth || 240) * 0.8))}px`,
                  }}
                  className="w-auto object-contain drop-shadow transition-all"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    📚
                  </div>
                  <span className="font-extrabold text-lg text-white">
                    {settings.siteName || 'Leesin Comic'}
                  </span>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {settings.footerDescription || DEFAULT_SITE_SETTINGS.footerDescription}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{settings.footerSecurityText || DEFAULT_SITE_SETTINGS.footerSecurityText}</span>
            </div>
          </div>

          {/* Col 2: Liên kết nhanh */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {settings.footerCol2Title || DEFAULT_SITE_SETTINGS.footerCol2Title}
            </h4>
            <ul className="space-y-1.5 text-xs">
              {col2Links.map((link, idx) => (
                <li key={idx}>
                  {link.url ? (
                    <a
                      href={link.url}
                      target={link.url.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className="hover:text-amber-400 transition-colors flex items-center gap-1"
                    >
                      <span>{link.label}</span>
                      {link.url.startsWith('http') && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                    </a>
                  ) : (
                    <span className="hover:text-amber-400 transition-colors cursor-pointer">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Quản trị & Nhóm dịch */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {settings.footerCol3Title || DEFAULT_SITE_SETTINGS.footerCol3Title}
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  onClick={() => {
                    if (isAdmin) {
                      onOpenAdmin();
                    } else if (onRequireLogin) {
                      onRequireLogin();
                    }
                  }}
                  className={`text-left transition-colors ${isAdmin ? 'text-amber-400 hover:underline font-semibold' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  Quản trị Admin {isAdmin ? '(Đang truy cập)' : '(Cần tài khoản Admin)'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (isTeam || isAdmin) {
                      onOpenTeamPortal();
                    } else if (onRequireLogin) {
                      onRequireLogin();
                    }
                  }}
                  className={`text-left transition-colors ${isTeam || isAdmin ? 'text-emerald-400 hover:underline font-semibold' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  Portal Nhóm Dịch {isTeam ? '(Đang truy cập)' : '(Cần tài khoản Nhóm Dịch)'}
                </button>
              </li>
              <li>
                <span className="text-slate-500">
                  {settings.footerReaderText || DEFAULT_SITE_SETTINGS.footerReaderText}
                </span>
              </li>
              <li>
                <span className="text-slate-500">
                  {settings.footerTeamText || DEFAULT_SITE_SETTINGS.footerTeamText}
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Tuyên bố miễn trừ trách nhiệm */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              {settings.footerCol4Title || DEFAULT_SITE_SETTINGS.footerCol4Title}
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {settings.footerDisclaimer || DEFAULT_SITE_SETTINGS.footerDisclaimer}
            </p>
            
            {/* Email contact */}
            {(settings.footerContactEmail || DEFAULT_SITE_SETTINGS.footerContactEmail) && (
              <div className="pt-1 flex items-center gap-2 text-slate-400 text-xs">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a
                  href={`mailto:${settings.footerContactEmail || DEFAULT_SITE_SETTINGS.footerContactEmail}`}
                  className="hover:text-amber-300 font-mono transition-colors"
                >
                  {settings.footerContactEmail || DEFAULT_SITE_SETTINGS.footerContactEmail}
                </a>
              </div>
            )}

            {/* Phone contact */}
            {settings.footerContactPhone && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono">{settings.footerContactPhone}</span>
              </div>
            )}

            {/* Social channels */}
            {(settings.footerFacebookUrl || settings.footerTelegramUrl || settings.footerDiscordUrl) && (
              <div className="flex items-center gap-2 pt-1">
                {settings.footerFacebookUrl && (
                  <a
                    href={settings.footerFacebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold hover:bg-blue-600/30 transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {settings.footerTelegramUrl && (
                  <a
                    href={settings.footerTelegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold hover:bg-cyan-600/30 transition-colors"
                  >
                    Telegram
                  </a>
                )}
                {settings.footerDiscordUrl && (
                  <a
                    href={settings.footerDiscordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-bold hover:bg-indigo-600/30 transition-colors"
                  >
                    Discord
                  </a>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>
            {settings.footerCopyrightText || DEFAULT_SITE_SETTINGS.footerCopyrightText}
          </p>
          <div className="flex items-center gap-4">
            <span>{settings.footerBadge1 || DEFAULT_SITE_SETTINGS.footerBadge1}</span>
            <span>•</span>
            <span>{settings.footerBadge2 || DEFAULT_SITE_SETTINGS.footerBadge2}</span>
          </div>
        </div>
      </div>

      {/* Footer Edit Modal */}
      {isEditModalOpen && (
        <FooterEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          siteSettings={settings}
          onSaveSettings={(updated) => {
            if (onUpdateSiteSettings) {
              onUpdateSiteSettings(updated);
            }
          }}
          mysqlConfig={mysqlConfig}
        />
      )}

    </footer>
  );
};

