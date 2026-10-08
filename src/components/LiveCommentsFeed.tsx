import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Heart,
  Flame,
  BookOpen,
  Clock,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Trash2,
  Smile,
  CheckCircle2,
  LogIn,
  Lock,
  CornerDownRight,
  X,
  Target
} from 'lucide-react';
import { ChapterComment, User, Comic, Chapter } from '../types';
import { formatRelativeTime } from '../utils/timeAgo';

interface LiveCommentsFeedProps {
  comments: ChapterComment[];
  currentUser?: User | null;
  onAddComment: (comment: Omit<ChapterComment, 'id' | 'createdAt' | 'likes'>) => void;
  onLikeComment: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onNavigateToComic: (comicSlug: string) => void;
  onNavigateToChapter: (comicSlug: string, chapterNumber: number) => void;
  onRequireLogin?: () => void;
  title?: string;
  comicFilter?: string; // If filtered to a specific comic
  chapterFilter?: number; // If filtered to a specific chapter
  showComicInfo?: boolean; // Whether to show comic cover & title in each card
  highlightedCommentId?: string | null;
  currentComic?: Comic | null;
  currentChapter?: Chapter | null;
}

const QUICK_EMOJIS = ['❤️', '🔥', '😍', '😂', '👏', '😭', '🚀', '👍', '⚡', '💯', '👑', '✨'];

export const LiveCommentsFeed: React.FC<LiveCommentsFeedProps> = ({
  comments,
  currentUser,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onNavigateToComic,
  onNavigateToChapter,
  onRequireLogin,
  title = 'Bình Luận Mới Nhất',
  comicFilter,
  chapterFilter,
  showComicInfo = true,
  highlightedCommentId,
  currentComic,
  currentChapter,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    comicId?: string;
    comicTitle?: string;
    comicSlug?: string;
    coverImage?: string;
    chapterId?: string;
    chapterNumber?: number;
    chapterTitle?: string;
  } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Available chapters sorted descending for chapter selector
  const sortedChapters = useMemo(() => {
    if (!currentComic?.chapters || !Array.isArray(currentComic.chapters)) return [];
    return [...currentComic.chapters].sort((a, b) => Number(b.chapterNumber) - Number(a.chapterNumber));
  }, [currentComic]);

  const defaultChapterNum = useMemo(() => {
    if (chapterFilter !== undefined && chapterFilter !== null) return Number(chapterFilter);
    if (currentChapter?.chapterNumber !== undefined) return Number(currentChapter.chapterNumber);
    if (sortedChapters.length > 0) return Number(sortedChapters[0].chapterNumber);
    return 1;
  }, [chapterFilter, currentChapter, sortedChapters]);

  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(defaultChapterNum);

  useEffect(() => {
    setSelectedChapterNum(defaultChapterNum);
  }, [defaultChapterNum]);

  // Filter if needed (memoized, guarantees highlighted comment is NEVER filtered out)
  const filteredComments = useMemo(() => {
    const cleanComicFilter = (comicFilter || currentComic?.id || '').trim().toLowerCase();
    const cleanComicWithoutPrefix = cleanComicFilter.replace(/^comic-/, '');
    const cleanComicSlug = (currentComic?.slug || '').trim().toLowerCase();

    return comments.filter((c) => {
      // If this is the highlighted comment from notification, ALWAYS include it
      if (highlightedCommentId && (c.id === highlightedCommentId || (c.parentId && c.parentId === highlightedCommentId))) {
        return true;
      }

      if (cleanComicFilter) {
        const cId = (c.comicId || '').trim().toLowerCase();
        const cSlug = (c.comicSlug || '').trim().toLowerCase();
        const cWithoutPrefix = cId.replace(/^comic-/, '');
        const matchComic =
          cId === cleanComicFilter ||
          (cleanComicSlug && (cSlug === cleanComicSlug || cId === cleanComicSlug)) ||
          cSlug === cleanComicFilter ||
          cWithoutPrefix === cleanComicWithoutPrefix;
        if (!matchComic) return false;
      }

      if (chapterFilter !== undefined && chapterFilter !== null) {
        const numFilter = Number(chapterFilter);
        const cNum = Number(c.chapterNumber);
        if (!isNaN(numFilter) && !isNaN(cNum) && cNum !== numFilter) {
          return false;
        }
      }

      return true;
    });
  }, [comments, comicFilter, currentComic, chapterFilter, highlightedCommentId]);

  // Handle direct navigation & smooth scrolling to the target comment
  useEffect(() => {
    if (!highlightedCommentId) return;

    setActiveHighlightId(highlightedCommentId);

    // Repeated attempts to locate and smoothly scroll to the comment
    // Handles dynamic layout shifts, image loading in reader, and React re-renders
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const element = document.getElementById(`comment-${highlightedCommentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (attempts >= 4) {
          clearInterval(interval);
        }
      } else if (attempts >= 15) {
        clearInterval(interval);
      }
    }, 200);

    // Keep highlight glowing for 6 seconds then gently fade
    const clearTimer = setTimeout(() => {
      setActiveHighlightId(null);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(clearTimer);
    };
  }, [highlightedCommentId, filteredComments.length]);

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  const handleStartReply = (comment: ChapterComment) => {
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setReplyingTo({
      id: comment.id,
      userId: comment.userId,
      userName: comment.userName,
      content: comment.content,
      comicId: comment.comicId,
      comicTitle: comment.comicTitle,
      comicSlug: comment.comicSlug,
      coverImage: comment.coverImage,
      chapterId: comment.chapterId,
      chapterNumber: comment.chapterNumber,
      chapterTitle: comment.chapterTitle,
    });
    if (comment.chapterNumber !== undefined) {
      setSelectedChapterNum(Number(comment.chapterNumber));
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (!content.trim()) return;

    const authorName = currentUser.name || 'Độc giả';
    const authorAvatar =
      currentUser.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
    const authorRole = currentUser.role || 'READER';
    const authorId = currentUser.id;

    // Use concrete comic & chapter data
    const targetComicTitle = replyingTo?.comicTitle || currentComic?.title || (filteredComments[0]?.comicTitle || 'Truyện Mới');
    const targetComicSlug = replyingTo?.comicSlug || currentComic?.slug || (filteredComments[0]?.comicSlug || 'truyen-moi');
    const targetComicId = replyingTo?.comicId || currentComic?.id || comicFilter || 'comic-general';
    const targetCover =
      replyingTo?.coverImage ||
      currentComic?.coverImage ||
      filteredComments[0]?.coverImage ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300';

    const targetChapterNum = replyingTo?.chapterNumber !== undefined
      ? Number(replyingTo.chapterNumber)
      : (chapterFilter !== undefined ? Number(chapterFilter) : Number(selectedChapterNum || 1));

    const matchedChap = sortedChapters.find((ch) => Number(ch.chapterNumber) === targetChapterNum) || currentChapter;
    const targetChapterId = replyingTo?.chapterId || matchedChap?.id || `chap-${targetChapterNum}`;
    const targetChapterTitle = replyingTo?.chapterTitle || matchedChap?.title || `Chương ${targetChapterNum}`;

    onAddComment({
      comicId: targetComicId,
      comicTitle: targetComicTitle,
      comicSlug: targetComicSlug,
      chapterId: targetChapterId,
      chapterNumber: targetChapterNum,
      chapterTitle: targetChapterTitle,
      coverImage: targetCover,
      userId: authorId,
      userName: authorName,
      userAvatar: authorAvatar,
      userRole: authorRole,
      content: content.trim(),
      parentId: replyingTo ? replyingTo.id : undefined,
      replyToUserId: replyingTo ? replyingTo.userId : undefined,
      replyToUserName: replyingTo ? replyingTo.userName : undefined,
    });

    setContent('');
    setShowEmojiPicker(false);
    setReplyingTo(null);
  };

  const timeAgo = (dateStr: string) => {
    return formatRelativeTime(dateStr);
  };

  return (
    <div id="live-comments-section" className="bg-[#121620] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                {filteredComments.length}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Trực tiếp</span>
        </div>
      </div>

      {/* Input Box */}
      {!currentUser ? (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center mb-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-slate-300 text-xs sm:text-sm font-semibold">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Đăng nhập để tham gia thảo luận cùng cộng đồng</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Bình luận văn minh, lịch sự, không spoil nội dung trước
          </p>
          {onRequireLogin && (
            <button
              type="button"
              onClick={onRequireLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập ngay</span>
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-4 space-y-2">
          {/* Reply-to indicator bar */}
          {replyingTo && (
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 truncate">
                <CornerDownRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-400">Đang trả lời</span>
                <span className="font-bold text-amber-400 truncate">@{replyingTo.userName}</span>
                <span className="text-slate-500 truncate hidden sm:inline text-[11px]">"{replyingTo.content}"</span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                className="p-1 rounded-lg hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors shrink-0"
                title="Hủy trả lời"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chapter Selector or Current Chapter Indicator */}
          {sortedChapters.length > 0 && chapterFilter === undefined ? (
            <div className="flex items-center gap-2 px-1 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Bình luận tại:</span>
              </span>
              <select
                value={selectedChapterNum}
                onChange={(e) => setSelectedChapterNum(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-bold font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                title="Chọn chương bạn muốn bình luận"
              >
                {sortedChapters.map((ch) => (
                  <option key={ch.id || ch.chapterNumber} value={ch.chapterNumber} className="bg-slate-900 text-slate-200">
                    Chap {ch.chapterNumber}{ch.title && ch.title !== `Chap ${ch.chapterNumber}` ? ` - ${ch.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (chapterFilter !== undefined || currentChapter?.chapterNumber !== undefined) ? (
            <div className="flex items-center gap-2 px-1 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Đang bình luận tại:</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-bold font-mono text-xs border border-amber-500/30">
                {currentChapter?.title || `Chap ${chapterFilter ?? currentChapter?.chapterNumber}`}
              </span>
            </div>
          ) : null}

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  replyingTo
                    ? `Trả lời @${replyingTo.userName}...`
                    : `Viết bình luận của bạn với tư cách ${currentUser.name}...`
                }
                maxLength={500}
                className="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors ${
                  showEmojiPicker ? 'text-amber-400 bg-slate-800' : ''
                }`}
                title="Chọn emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!content.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex-shrink-0"
            >
              <span>{replyingTo ? 'Trả lời' : 'Gửi'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Emoji Picker Row */}
          {showEmojiPicker && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto custom-scrollbar">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddEmoji(emoji)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-base transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Chưa có bình luận nào. Hãy là người đầu tiên để lại cảm nghĩ!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredComments.map((comment) => {
            const isAuthor = currentUser && currentUser.id === comment.userId;
            const isAdmin = currentUser?.role === 'ADMIN';
            const canDelete = isAuthor || isAdmin;
            const isHighlighted = activeHighlightId === comment.id;

            return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`p-3 sm:p-3.5 rounded-xl transition-all flex gap-3 group relative ${
                  isHighlighted
                    ? 'ring-2 ring-amber-400 bg-amber-500/15 border-amber-400/80 shadow-lg shadow-amber-500/20 scale-[1.01]'
                    : 'bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Active Highlight Target Pill Badge */}
                {isHighlighted && (
                  <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold shadow-md flex items-center gap-1 animate-bounce">
                    <Target className="w-3 h-3" />
                    <span>Bình luận từ thông báo</span>
                  </div>
                )}

                {/* Comic Cover Thumbnail if showComicInfo */}
                {showComicInfo && comment.coverImage && (
                  <button
                    type="button"
                    onClick={() => onNavigateToComic(comment.comicSlug)}
                    className="relative flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-slate-800 group-hover:border-amber-500/50 transition-colors"
                  >
                    <img
                      src={comment.coverImage}
                      alt={comment.comicTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-amber-300 font-bold text-center py-0.5 leading-none">
                      C.{comment.chapterNumber}
                    </span>
                  </button>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Meta header */}
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 hover:text-amber-400 transition-colors">
                        {comment.userName}
                      </span>
                      {comment.userRole === 'ADMIN' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Admin
                        </span>
                      )}
                      {comment.userRole === 'TEAM_LEADER' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Nhóm Dịch
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(comment.createdAt)}
                      </span>
                      {canDelete && onDeleteComment && (
                        confirmDeleteId === comment.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteComment(comment.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Xác nhận
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(comment.id)}
                            className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Xóa bình luận này"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Comic / Chapter Breadcrumb Tag */}
                  <div className="flex items-center gap-1.5 text-[11px] mb-1.5 flex-wrap">
                    {showComicInfo && comment.comicTitle && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateToComic(comment.comicSlug || currentComic?.slug || '')}
                          className="font-bold text-slate-300 hover:text-amber-400 truncate max-w-[180px] transition-colors cursor-pointer"
                          title={comment.comicTitle}
                        >
                          {comment.comicTitle}
                        </button>
                        <span className="text-slate-600">•</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigateToChapter(comment.comicSlug || currentComic?.slug || '', comment.chapterNumber)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/30 transition-colors cursor-pointer"
                      title={`Bình luận tại Chap ${comment.chapterNumber} - Bấm để chuyển đến đọc chương`}
                    >
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span>{comment.chapterTitle || `Chap ${comment.chapterNumber}`}</span>
                    </button>
                  </div>

                  {/* Comment Text */}
                  <div className="text-xs sm:text-[13px] text-slate-300 leading-relaxed break-words">
                    {comment.replyToUserName && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold mr-1.5 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px] border border-amber-500/20">
                        <CornerDownRight className="w-3 h-3 inline" />
                        @{comment.replyToUserName}
                      </span>
                    )}
                    {comment.content}
                  </div>

                  {/* Actions: Like & Reply */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          if (onRequireLogin) onRequireLogin();
                          return;
                        }
                        onLikeComment(comment.id);
                      }}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title={!currentUser ? 'Đăng nhập để thích bình luận' : 'Thích'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{comment.likes || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartReply(comment)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title={!currentUser ? 'Đăng nhập để trả lời' : 'Trả lời bình luận này'}
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Trả lời</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
