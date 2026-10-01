import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  CornerDownRight,
  Sparkles,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  BookOpen,
  Clock,
  ShieldCheck,
  X,
  Send,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { AppNotification, User, Comic } from '../types';
import { formatRelativeTime } from '../utils/timeAgo';

interface NotificationDropdownProps {
  currentUser: User | null;
  notifications: AppNotification[];
  comics?: Comic[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
  onClearAllNotifications: () => void;
  onSelectNotification: (notification: AppNotification) => void;
  onQuickReply?: (notification: AppNotification, replyText: string) => void;
  onOpenLogin: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  currentUser,
  notifications,
  comics = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onSelectNotification,
  onQuickReply,
  onOpenLogin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'passwords' | 'comments'>('all');
  const [replyingNotifId, setReplyingNotifId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Helper to detect password reset request
  const isResetRequest = (n: AppNotification) =>
    Boolean(
      n &&
        (n.title === 'Yêu cầu cấp lại mật khẩu' ||
          n.title?.toLowerCase().includes('cấp lại mật khẩu') ||
          n.content?.toLowerCase().includes('yêu cầu cấp lại mật khẩu'))
    );

  // Helper kiểm tra chuẩn xác trạng thái chưa đọc (bảo đảm khớp 100% kể cả khi SQL trả về 0, "0", false)
  const isNotificationUnread = (n: AppNotification) => {
    if (!n) return false;
    const ir: any = (n as any).is_read;
    if (ir !== undefined) {
      if (ir === 0 || ir === '0' || ir === false) return true;
      if (ir === 1 || ir === '1' || ir === true) return false;
    }
    const r: any = n.isRead;
    return !r || r === '0' || r === 0;
  };

  // Close when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setReplyingNotifId(null);
        setReplyText('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus input when inline reply is opened
  useEffect(() => {
    if (replyingNotifId && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingNotifId]);

  // Lọc thông báo nghiêm ngặt theo đúng tài khoản người dùng:
  // TUYỆT ĐỐI KHÔNG XEM CHUNG BÌNH LUẬN CỦA TRUYỆN THUỘC TÀI KHOẢN / NHÓM DỊCH KHÁC!
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return false;

    // 1. Thông báo bình luận (COMMENT): CHỈ tài khoản/nhóm dịch sở hữu truyện đó mới được đọc!
    if (n.type === 'COMMENT') {
      const matchDirectUser = Boolean(
        n.recipientUserId &&
        (n.recipientUserId === currentUser.id ||
          (currentUser.username && n.recipientUserId.toLowerCase() === currentUser.username.toLowerCase()) ||
          (currentUser.email && n.recipientUserId.toLowerCase() === currentUser.email.toLowerCase()))
      );

      const isLessinCurrentUser =
        (currentUser.teamId && (currentUser.teamId === 'team-lessin-comic' || currentUser.teamId === 'team-leesin')) ||
        (currentUser.teamName && currentUser.teamName.toLowerCase().includes('lessin'));

      const isLessinNotif =
        (n.recipientTeamId && (n.recipientTeamId === 'team-lessin-comic' || n.recipientTeamId === 'team-leesin')) ||
        (n.recipientTeamName && n.recipientTeamName.toLowerCase().includes('lessin'));

      let matchTeam = Boolean(
        (n.recipientTeamId && currentUser.teamId && n.recipientTeamId === currentUser.teamId) ||
        (isLessinCurrentUser && isLessinNotif) ||
        (n.recipientTeamName && currentUser.teamName && n.recipientTeamName.toLowerCase().trim() === currentUser.teamName.toLowerCase().trim())
      );

      // Đối soát trực tiếp với danh sách truyện để đảm bảo truyện thuộc sở hữu của tài khoản/nhóm dịch này
      if (Array.isArray(comics) && comics.length > 0 && (n.comicId || n.comicSlug)) {
        const foundComic = comics.find((c) => c.id === n.comicId || c.slug === n.comicSlug || c.id === n.comicSlug);
        if (foundComic) {
          const isComicBelongsToUserTeam =
            (foundComic.teamId && currentUser.teamId && foundComic.teamId === currentUser.teamId) ||
            (isLessinCurrentUser && (foundComic.teamId === 'team-lessin-comic' || foundComic.teamId === 'team-leesin' || foundComic.teamName?.toLowerCase().includes('lessin'))) ||
            (foundComic.teamName && currentUser.teamName && foundComic.teamName.toLowerCase().trim() === currentUser.teamName.toLowerCase().trim()) ||
            (foundComic.uploaderId && foundComic.uploaderId === currentUser.id);

          if (!isComicBelongsToUserTeam) {
            // Truyện này thuộc về nhóm khác hoặc tài khoản khác -> TUYỆT ĐỐI KHÔNG XEM CHUNG!
            return false;
          }
          matchTeam = matchTeam || Boolean(isComicBelongsToUserTeam);
        }
      }

      return matchDirectUser || matchTeam;
    }

    // 2. Thông báo trả lời bình luận (REPLY): CHỈ người được trả lời mới nhận được
    if (n.type === 'REPLY') {
      return Boolean(
        n.recipientUserId &&
        (n.recipientUserId === currentUser.id ||
          (currentUser.username && n.recipientUserId.toLowerCase() === currentUser.username.toLowerCase()) ||
          (currentUser.email && n.recipientUserId.toLowerCase() === currentUser.email.toLowerCase()))
      );
    }

    // 3. Yêu cầu cấp lại mật khẩu: Chỉ Admin
    if (isResetRequest(n)) {
      return currentUser.role === 'ADMIN';
    }

    // 4. Các thông báo hệ thống / cột mốc / thông báo chung khác
    if (currentUser.role === 'ADMIN') {
      return true;
    }

    if (currentUser.role === 'TEAM_LEADER') {
      if (n.recipientRole === 'ALL' || n.recipientRole === 'TEAM_LEADER') return true;
      if (
        n.recipientUserId &&
        (n.recipientUserId === currentUser.id ||
          (currentUser.username && n.recipientUserId.toLowerCase() === currentUser.username.toLowerCase()) ||
          (currentUser.email && n.recipientUserId.toLowerCase() === currentUser.email.toLowerCase()))
      ) {
        return true;
      }
      if (n.recipientTeamId && currentUser.teamId && n.recipientTeamId === currentUser.teamId) return true;
      if (
        n.recipientTeamName &&
        currentUser.teamName &&
        n.recipientTeamName.toLowerCase().trim() === currentUser.teamName.toLowerCase().trim()
      ) {
        return true;
      }
      return false;
    }

    // 5. Độc giả (READER):
    if (n.recipientRole === 'ALL' || n.recipientRole === 'READER') return true;
    return Boolean(
      n.recipientUserId === currentUser.id ||
      (currentUser.username && n.recipientUserId?.toLowerCase() === currentUser.username.toLowerCase()) ||
      (currentUser.email && n.recipientUserId?.toLowerCase() === currentUser.email.toLowerCase())
    );
  });

  const unreadCount = userNotifications.filter(isNotificationUnread).length;
  const pendingPassCount = userNotifications.filter((n) => isNotificationUnread(n) && isResetRequest(n)).length;
  const totalPassCount = userNotifications.filter(isResetRequest).length;

  const filteredList = userNotifications.filter((n) => {
    if (activeFilter === 'unread') return isNotificationUnread(n);
    if (activeFilter === 'passwords') return isResetRequest(n);
    if (activeFilter === 'comments') return n.type === 'COMMENT' || n.type === 'REPLY' || (n.type === 'SYSTEM' && !isResetRequest(n));
    return true;
  });


  const handleNotificationClick = (n: AppNotification) => {
    if (isNotificationUnread(n)) {
      onMarkAsRead(n.id);
    }
    setIsOpen(false);
    setReplyingNotifId(null);
    onSelectNotification(n);
  };

  const handleStartReply = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    if (!currentUser) {
      onOpenLogin();
      return;
    }
    if (replyingNotifId === notif.id) {
      setReplyingNotifId(null);
      setReplyText('');
    } else {
      setReplyingNotifId(notif.id);
      setReplyText('');
    }
  };

  const handleSubmitReply = (e: React.FormEvent, notif: AppNotification) => {
    e.preventDefault();
    e.stopPropagation();
    if (!replyText.trim()) return;

    if (onQuickReply) {
      onQuickReply(notif, replyText.trim());
    }

    if (!notif.isRead) {
      onMarkAsRead(notif.id);
    }

    setSentSuccessId(notif.id);
    setReplyingNotifId(null);
    setReplyText('');

    setTimeout(() => {
      setSentSuccessId(null);
    }, 2500);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Bell Button */}
      <button
        id="btn-header-notification-bell"
        type="button"
        onClick={() => {
          if (!currentUser) {
            onOpenLogin();
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`relative p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10'
            : unreadCount > 0
            ? 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-slate-700/80 hover:border-amber-500/40'
            : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
        }`}
        title={currentUser ? `Thông báo (${unreadCount} chưa đọc)` : 'Đăng nhập để nhận thông báo'}
        aria-label="Thông báo"
      >
        <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'animate-wiggle text-amber-400' : ''}`} />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 rounded-full text-white font-extrabold text-[10px] shadow-lg ring-2 ring-[#121620] animate-pulse ${
            pendingPassCount > 0 ? 'bg-gradient-to-r from-amber-500 to-rose-600 shadow-rose-600/50' : 'bg-rose-600 shadow-rose-600/50'
          }`}>
            {pendingPassCount > 0 ? `🔑${unreadCount}` : unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Dropdown */}
      {isOpen && currentUser && (
        <div
          id="header-notification-popover"
          className="absolute right-0 sm:-right-6 top-full mt-2.5 w-[340px] sm:w-[420px] max-w-[95vw] bg-[#161a24] border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Thông Báo</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-[10px]">
                      {unreadCount} mới
                    </span>
                  )}
                  {pendingPassCount > 0 && currentUser.role === 'ADMIN' && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold animate-pulse flex items-center gap-0.5">
                      <KeyRound className="w-2.5 h-2.5" />
                      {pendingPassCount} chờ cấp pass
                    </span>
                  )}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span className="hidden xs:inline">Đã đọc hết</span>
                </button>
              )}
              {userNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
                      onClearAllNotifications();
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Xóa tất cả thông báo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Tất cả ({userNotifications.length})
            </button>
            {currentUser.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setActiveFilter('passwords')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  activeFilter === 'passwords'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black shadow-sm'
                    : pendingPassCount > 0
                    ? 'text-amber-300 bg-amber-500/10 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Cấp lại pass ({totalPassCount})</span>
                {pendingPassCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveFilter('comments')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'comments'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Tin nhắn & Bình luận
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>


          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-800/80 custom-scrollbar">
            {filteredList.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-slate-300">Không có thông báo nào</p>
                <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
                  {activeFilter === 'unread'
                    ? 'Bạn đã đọc hết tất cả thông báo!'
                    : 'Khi có người bình luận trên truyện hoặc trả lời bạn, thông báo sẽ hiển thị tại đây.'}
                </p>
              </div>
            ) : (
              filteredList.map((notif) => {
                const isReply = notif.type === 'REPLY';
                const isComment = notif.type === 'COMMENT';
                const isPasswordResetRequest = notif.title === 'Yêu cầu cấp lại mật khẩu' || notif.title?.toLowerCase().includes('cấp lại mật khẩu');
                const isReplyingThis = replyingNotifId === notif.id;
                const isSentSuccess = sentSuccessId === notif.id;
                const isUnread = isNotificationUnread(notif);

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors relative group flex flex-col gap-2 ${
                      isUnread
                        ? 'bg-gradient-to-r from-amber-500/10 via-slate-900/50 to-transparent hover:bg-slate-800/60'
                        : 'hover:bg-slate-800/40 bg-slate-950/20'
                    }`}
                  >
                    {/* Top row: Avatar + sender + content */}
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {/* Left Avatar with indicator badge */}
                      <div className="relative shrink-0 mt-0.5">
                        <img
                          src={notif.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={notif.senderName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-sm"
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-[#161a24] ${
                            isPasswordResetRequest
                              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-bold'
                              : isReply
                              ? 'bg-sky-500 text-white'
                              : isComment
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {isPasswordResetRequest ? (
                            <KeyRound className="w-3 h-3 text-slate-950" />
                          ) : isReply ? (
                            <CornerDownRight className="w-3 h-3" />
                          ) : isComment ? (
                            <MessageSquare className="w-3 h-3" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                            {notif.senderName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {isPasswordResetRequest ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                <KeyRound className="w-3 h-3" />
                                Yêu cầu cấp lại pass
                              </span>
                            ) : isReply ? (
                              'đã trả lời bạn:'
                            ) : isComment ? (
                              'vừa bình luận truyện:'
                            ) : (
                              'đã gửi thông báo:'
                            )}
                          </span>
                        </div>

                        {/* Comic & Chapter info */}
                        {notif.comicTitle && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-300 truncate max-w-[170px]">
                              {notif.comicTitle}
                            </span>
                            {notif.chapterNumber !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
                                Chap {notif.chapterNumber}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Snippet / Quoted content */}
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 group-hover:border-slate-700/80 transition-colors">
                          "{notif.content}"
                        </p>

                        {/* Timestamp & Badges */}
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                              Mới
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unread Glowing Dot */}
                      {isUnread && (
                        <div className="absolute right-3 top-3.5 w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80" />
                      )}
                    </div>

                    {/* Action Bar: Phím tắt hành động */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 pl-12 pr-1">
                      <div className="flex items-center gap-2">
                        {isPasswordResetRequest && currentUser?.role === 'ADMIN' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notif)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 text-[11px] font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                              title="Chuyển đến bảng quản trị và cấp lại mật khẩu ngay cho tài khoản này"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Cấp lại pass ngay</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleStartReply(e, notif)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isReplyingThis
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800/90 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/40'
                              }`}
                              title="Gửi thông báo phản hồi lại cho người dùng này"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isReplyingThis ? 'Đang soạn' : 'Nhắn tin'}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 1. Trả lời trực tiếp button */}
                            <button
                              type="button"
                              onClick={(e) => handleStartReply(e, notif)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isReplyingThis
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-800/90 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/40'
                              }`}
                              title="Trả lời trực tiếp bình luận này ngay tại đây"
                            >
                              <CornerDownRight className="w-3 h-3" />
                              <span>{isReplyingThis ? 'Đang trả lời' : 'Trả lời nhanh'}</span>
                            </button>

                            {/* 2. Dẫn hướng đến bình luận đó luôn button */}
                            <button
                              type="button"
                              onClick={() => handleNotificationClick(notif)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 text-[11px] font-medium transition-all cursor-pointer"
                              title="Chuyển đến trang đọc truyện và cuộn trực tiếp tới bình luận này"
                            >
                              <span>Đến bình luận</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Delete notification */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notif.id);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Xóa thông báo này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Success Toast Banner */}
                    {isSentSuccess && (
                      <div className="ml-12 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 animate-in fade-in duration-200">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold">Đã gửi phản hồi thành công!</span>
                      </div>
                    )}

                    {/* 3. Inline Direct Reply Form */}
                    {isReplyingThis && (
                      <form
                        onSubmit={(e) => handleSubmitReply(e, notif)}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-12 mt-1 p-2 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2 animate-in fade-in zoom-in-95 duration-150 shadow-lg"
                      >
                        <div className="flex items-center justify-between text-[11px] text-amber-300">
                          <span className="font-semibold flex items-center gap-1 truncate">
                            <CornerDownRight className="w-3 h-3 text-amber-400" />
                            Trả lời @{notif.senderName}:
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingNotifId(null);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            ref={replyInputRef}
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Nhập phản hồi cho ${notif.senderName}...`}
                            maxLength={500}
                            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="submit"
                            disabled={!replyText.trim()}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                          >
                            <Send className="w-3 h-3" />
                            <span>Gửi</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tự động cập nhật & liên kết trực tiếp bình luận truyện</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
