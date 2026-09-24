import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Key,
  BookOpen,
  Gem,
  AlertCircle,
  Feather,
  ChevronDown,
  X,
  CheckCircle,
  Info,
  ExternalLink,
  RotateCcw,
  Bookmark,
} from 'lucide-react';
import type { Character, ChatMessage, Clue, User } from '../types';
import { sendChatMessage, getChatSession } from '../services/api';
import { getNeutralClueTitle } from '../utils/clueDisplay';

interface ChatRoomProps {
  character: Character;
  user: User;
  onBack: () => void;
  onOpenNotebook: () => void;
  onUpdateUserDiamonds: (diamonds: number) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  character,
  user,
  onBack,
  onOpenNotebook,
  onUpdateUserDiamonds,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlockedClues, setUnlockedClues] = useState<Clue[]>([]);
  const [newClueAlert, setNewClueAlert] = useState<Clue | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedMessageText, setFailedMessageText] = useState<string | null>(null);

  // Mobile drawer & top-sheet states
  const [showMobileTopSheet, setShowMobileTopSheet] = useState(false);
  const [showMobileClueDrawer, setShowMobileClueDrawer] = useState(false);
  const [showDesktopCluePanel, setShowDesktopCluePanel] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultQuickPrompts = [
    { text: 'Bạn nhớ điều gì nhất?', color: 'bg-[#F3A6C8]/25 text-[#40304F] border-[#F3A6C8]' },
    { text: 'Điều gì khiến bạn đau lòng?', color: 'bg-[#FF8FA3]/25 text-[#40304F] border-[#FF8FA3]' },
    { text: 'Chuyện bắt đầu từ đâu?', color: 'bg-[#FFD85A]/30 text-[#40304F] border-[#FFD85A]' },
    { text: 'Bạn đã nhìn thấy gì?', color: 'bg-[#74C7F5]/25 text-[#40304F] border-[#74C7F5]' },
    { text: 'Có điều gì chưa kể hết?', color: 'bg-[#B99BE8]/25 text-[#40304F] border-[#B99BE8]' },
  ];

  // Load chat session with persistence
  useEffect(() => {
    let isMounted = true;
    getChatSession(user.id, character.id)
      .then((data) => {
        if (!isMounted) return;
        setMessages(data.messages || []);
        setUnlockedClues(data.unlockedClues || []);
      })
      .catch((err) => {
        console.error('Failed to load session:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [user.id, character.id]);

  // Auto-dismiss new clue alert after 3.5s
  useEffect(() => {
    if (newClueAlert) {
      const timer = setTimeout(() => {
        setNewClueAlert(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [newClueAlert]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    if (user.diamonds < 3) {
      setErrorMsg('Bạn cần tối thiểu 3 💎 để gửi tin nhắn. Hãy điểm danh hoặc khám phá manh mối!');
      return;
    }

    setErrorMsg(null);
    setFailedMessageText(null);
    setInputText('');

    // Optimistic player message
    const tempPlayerMsg: ChatMessage = {
      id: 'tmp_' + Date.now(),
      sessionId: 'ses_active',
      sender: 'player',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempPlayerMsg]);
    setLoading(true);

    try {
      const data = await sendChatMessage(user.id, character.id, text);

      // Server returns updated userDiamonds ONLY when successful
      if (typeof data.userDiamonds === 'number') {
        onUpdateUserDiamonds(data.userDiamonds);
      }

      // Add character reply
      const charMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        sessionId: 'ses_active',
        sender: 'character',
        text: data.reply,
        timestamp: new Date().toISOString(),
        clueUnlocked: data.newClueUnlocked,
        debugInfo: data.debugInfo,
      };
      setMessages((prev) => [...prev, charMsg]);

      // Check if newly unlocked clue
      if (data.newClueUnlocked) {
        setUnlockedClues((prev) => {
          if (prev.some((c) => c.id === data.newClueUnlocked?.id)) return prev;
          return [...prev, data.newClueUnlocked];
        });
        setNewClueAlert(data.newClueUnlocked);
      }
    } catch (err: any) {
      setFailedMessageText(text);
      setErrorMsg(
        err?.message ||
          'Xin lỗi, ta cần một chút thời gian để nhớ lại chuyện này. Hãy thử hỏi lại ta sau một lát.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailedMessage = () => {
    if (failedMessageText) {
      handleSendMessage(failedMessageText);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-[#FFF5E8] selection:bg-[#F3A6C8] selection:text-[#30243D]">
      {/* ========================================================
          1. DESKTOP LEFT PANEL: CHARACTER INFORMATION
          ======================================================== */}
      <aside className="hidden md:flex flex-col w-72 lg:w-80 bg-[#FFFDF9]/95 border-r-2 border-[#FFD85A]/30 backdrop-blur-md shrink-0 shadow-xs z-20 overflow-y-auto">
        {/* Character Portrait & Main Header */}
        <div className="p-5 border-b border-[#FFD85A]/30 flex flex-col items-center text-center bg-gradient-to-b from-[#FEEDF5]/70 to-[#FFFDF9]">
          <div className="relative mb-3 group">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-3 border-[#F3A6C8] shadow-lg vivid-glow-pink bg-[#FFF5E8]">
              {character.imageUrl ? (
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#40304F]">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            {/* Bookmark decoration */}
            <div className="absolute -top-1 -right-2 px-2 py-0.5 rounded-md bg-[#FFD85A] text-[#30243D] text-[10px] font-black shadow-xs flex items-center space-x-0.5">
              <Bookmark className="w-3 h-3 fill-[#30243D]" />
              <span>{character.badge === 'main' ? 'CHÍNH' : 'NHÂN VẬT'}</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#74C7F5] border-2 border-white shadow-xs" />
          </div>

          <h2 className="text-xl font-bold font-serif-literary text-[#40304F] tracking-wide">
            {character.name}
          </h2>
          <p className="text-xs font-semibold text-[#74C7F5] uppercase tracking-wider mt-0.5">
            {character.workTitle}
          </p>
          <p className="text-[11px] text-[#40304F]/70 italic mt-0.5">
            Tác giả: {character.workAuthor}
          </p>

          {/* Role pill */}
          <div className="mt-2.5 px-3 py-1 rounded-full bg-[#FFD85A]/40 text-[#40304F] text-[11px] font-bold border border-[#FFD85A] shadow-2xs">
            {character.role}
          </div>
        </div>

        {/* Character Details / Personality / Voice Tone */}
        <div className="p-4 space-y-4 text-xs">
          {/* Status badge */}
          <div className="flex items-center space-x-2 p-2.5 rounded-2xl bg-[#F3EEFE] border border-[#B99BE8]/40 text-[#40304F]">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                loading ? 'bg-[#FF8FA3] animate-ping' : 'bg-[#74C7F5]'
              }`}
            />
            <span className="font-semibold">
              {loading ? 'Đang hồi ức câu chuyện…' : 'Đang lắng nghe người đọc…'}
            </span>
          </div>

          {/* Personality */}
          <div>
            <span className="font-bold text-[11px] text-[#40304F]/60 uppercase tracking-wider block mb-1">
              Tính cách nhân vật
            </span>
            <p className="text-[#40304F] leading-relaxed p-2.5 rounded-xl bg-[#FFF5E8] border border-[#FFD85A]/30">
              {character.personality}
            </p>
          </div>

          {/* Voice tone & Pronouns */}
          <div>
            <span className="font-bold text-[11px] text-[#40304F]/60 uppercase tracking-wider block mb-1">
              Giọng điệu & Xưng hô
            </span>
            <div className="p-2.5 rounded-xl bg-[#E8F5FD] border border-[#74C7F5]/40 text-[#40304F] space-y-1">
              <div>
                <strong className="text-[#74C7F5]">Xưng hô:</strong> {character.pronouns}
              </div>
              <div className="italic text-[11px] text-[#40304F]/85">{character.voiceTone}</div>
            </div>
          </div>

          {/* Knowledge boundary / Canon Lock */}
          <div>
            <span className="font-bold text-[11px] text-[#40304F]/60 uppercase tracking-wider block mb-1">
              Ranh giới kiến thức
            </span>
            <p className="text-[11px] text-[#40304F]/70 p-2.5 rounded-xl bg-[#FFFDF9] border border-[#B99BE8]/30 italic">
              Nhân vật chỉ biết các sự kiện trong nguyên tác THPT; không trả lời về thế giới hiện đại hay tác phẩm ngoài lề.
            </p>
          </div>
        </div>

        {/* Back Button on Desktop */}
        <div className="mt-auto p-4 border-t border-[#FFD85A]/30">
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-[#F3A6C8] bg-[#FEEDF5]/70 hover:bg-[#F3A6C8]/30 text-[#40304F] font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Đổi nhân vật khác</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          2. CENTER: FULL-SCREEN CONVERSATION AREA
          ======================================================== */}
      <section className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Chat Top Header */}
        <header className="px-3 sm:px-5 py-2.5 bg-[#FFFDF9]/95 backdrop-blur-md border-b-2 border-[#FFD85A]/40 flex items-center justify-between shrink-0 z-20 shadow-xs">
          {/* Left: Mobile Back + Character Identity trigger */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 rounded-xl bg-[#FFF5E8] hover:bg-[#F3A6C8]/30 border border-[#F3A6C8]/40 text-[#40304F] transition-colors cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Character Header / Clickable on mobile to open Top Sheet */}
            <div
              onClick={() => setShowMobileTopSheet(true)}
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group"
              title="Nhấn để xem chi tiết nhân vật"
            >
              <div className="relative">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-[#F3A6C8] shadow-sm bg-[#FFF5E8] group-hover:scale-105 transition-transform">
                  {character.imageUrl ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs sm:text-sm font-bold text-[#40304F]">
                      {character.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#74C7F5] border-2 border-white shadow-xs" />
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-sm sm:text-base font-bold font-serif-literary text-[#40304F]">
                    {character.name}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD85A]/60 text-[#30243D] font-extrabold border border-[#FFD85A]">
                    {character.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#B99BE8] md:hidden" />
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-[#74C7F5] font-semibold truncate max-w-[170px] sm:max-w-xs">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      loading ? 'bg-[#FF8FA3] animate-ping' : 'bg-[#74C7F5]'
                    }`}
                  />
                  <span className="truncate">
                    {loading ? 'Đang nhớ lại…' : 'Đang lắng nghe câu chuyện'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Tools: Diamond Wallet + Notebook Trigger */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Diamond Wallet */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full diamond-wallet text-[#30243D] text-xs font-black shadow-xs select-none">
              <Gem className="w-3.5 h-3.5 text-[#30243D] fill-white/60 animate-pulse" />
              <span>{user.diamonds}</span>
              <span className="text-[10px] text-[#30243D]/70 font-semibold hidden sm:inline">
                (-3💎/lời)
              </span>
            </div>

            {/* Mobile Clue Drawer button / Desktop toggle */}
            <button
              onClick={() => {
                if (window.innerWidth < 1280) {
                  setShowMobileClueDrawer(true);
                } else {
                  setShowDesktopCluePanel(!showDesktopCluePanel);
                }
              }}
              className="relative flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[#FFD85A] via-[#F3A6C8] to-[#B99BE8] text-[#30243D] text-xs font-black shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sổ Manh Mối</span>
              {unlockedClues.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#30243D] text-[#FFFDF9] text-[10px] flex items-center justify-center font-black shadow-xs">
                  {unlockedClues.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ========================================================
            NEW CLUE UNLOCKED TOAST (NON-SPOILER)
            ======================================================== */}
        {newClueAlert && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 max-w-sm w-[92%] sm:w-auto">
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] shadow-xl vivid-glow-yellow">
              <div className="bg-[#FFFDF9] px-4 py-2.5 rounded-[14px] flex items-center justify-between space-x-3 paper-note">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl animate-bounce">✨</span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#B99BE8]">
                      MANH MỐI MỚI MỞ KHÓA
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-serif-literary text-[#30243D] tracking-wide">
                      {getNeutralClueTitle(newClueAlert.title).toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMobileClueDrawer(true);
                    onOpenNotebook();
                  }}
                  className="text-[11px] font-extrabold px-3 py-1.5 rounded-lg bg-[#FFD85A] text-[#30243D] hover:scale-105 transition-transform shadow-xs cursor-pointer whitespace-nowrap"
                >
                  Xem Sổ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            CHAT MESSAGES AREA: PAPER TEXTURE + PARTICLES + CALLIGRAPHY MARKS
            ======================================================== */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 bg-chat-aura relative">
          {/* Subtle Background Decorative Elements: Sparkle particles + Handwritten quotes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* Literary handwritten quotes watermark */}
            <div className="absolute top-12 left-6 text-2xl sm:text-3xl font-serif-literary italic text-[#B99BE8]/10 rotate-[-4deg] whitespace-nowrap">
              “Thiếp trỏ bóng trên vách dỗ con nhỏ...”
            </div>
            <div className="absolute top-1/2 right-4 text-2xl sm:text-3xl font-serif-literary italic text-[#74C7F5]/10 rotate-[3deg] whitespace-nowrap">
              “Hoàng Giang sóng biếc muôn trùng oan khiên...”
            </div>
            <div className="absolute bottom-24 left-10 text-xl sm:text-2xl font-serif-literary italic text-[#F3A6C8]/10 rotate-[-2deg] whitespace-nowrap">
              “Nghi can từ lời ngây thơ của trẻ dại...”
            </div>

            {/* Sparkle particles floating */}
            <div className="absolute top-8 right-16 text-[#FFD85A]/50 text-sm animate-pulse">✦</div>
            <div className="absolute top-1/3 left-12 text-[#F3A6C8]/50 text-lg animate-bounce">✧</div>
            <div className="absolute top-2/3 right-10 text-[#74C7F5]/50 text-base animate-pulse">✦</div>
            <div className="absolute bottom-12 left-1/3 text-[#B99BE8]/50 text-sm">✧</div>
          </div>

          {/* Welcome Intro greeting if no messages yet */}
          {messages.length === 0 && (
            <div className="relative z-10 text-center my-6 max-w-md mx-auto p-6 rounded-3xl bg-[#FFFDF9]/95 border-2 border-[#FFD85A]/60 shadow-md paper-note">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#F3A6C8] mx-auto mb-3 shadow-md bg-[#FFF5E8]">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <BookOpen className="w-8 h-8 m-auto text-[#40304F]" />
                )}
              </div>
              <h3 className="text-lg font-bold font-serif-literary text-[#40304F] mb-1">
                Bạn đang lắng nghe {character.name}
              </h3>
              <p className="text-xs text-[#40304F]/80 leading-relaxed mb-4 italic">
                "{character.shortIntro || 'Câu chuyện trong trang sách đang mở ra. Hãy hỏi về những trăn trở sâu kín của nhân vật.'}"
              </p>
              <div className="text-[11px] font-bold text-[#30243D] flex items-center justify-center space-x-1.5 bg-[#FFD85A]/30 py-1.5 px-3.5 rounded-full border border-[#FFD85A]">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD85A]" />
                <span>Khóa vai nhân vật theo chuẩn ngữ văn THPT</span>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`relative z-10 flex items-start space-x-2.5 sm:space-x-3 ${
                msg.sender === 'player' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              {msg.sender === 'character' ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-[#F3A6C8] shrink-0 bg-[#FFF5E8] shadow-xs">
                  {character.imageUrl ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#40304F]">
                      {character.name.charAt(0)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] flex items-center justify-center shrink-0 text-xs font-black text-[#30243D] shadow-xs border-2 border-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-3xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                  msg.sender === 'player'
                    ? 'bg-gradient-to-r from-[#FEEDF5] via-[#FFFDF9] to-[#E8F5FD] text-[#30243D] rounded-tr-xs border-2 border-[#F3A6C8]/70 font-sans shadow-sm'
                    : 'bg-[#FFFDF9] text-[#30243D] rounded-tl-xs border-2 border-[#B99BE8]/50 paper-note font-serif-literary text-[13.5px] sm:text-[15px]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Clue Discovered Inside Bubble */}
                {msg.clueUnlocked && (
                  <div className="mt-3 pt-2.5 border-t border-[#FFD85A]/40 flex items-center justify-between text-xs text-[#30243D] font-sans bg-[#FFD85A]/15 p-2 rounded-xl">
                    <span className="flex items-center space-x-1.5 font-black text-[#B99BE8]">
                      <Sparkles className="w-4 h-4 text-[#FFD85A] fill-[#FFD85A]" />
                      <span>
                        Manh mối phát hiện:{' '}
                        <strong className="text-[#30243D]">
                          {getNeutralClueTitle(msg.clueUnlocked.title).toUpperCase()}
                        </strong>
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        setShowMobileClueDrawer(true);
                        onOpenNotebook();
                      }}
                      className="underline text-[11px] text-[#74C7F5] hover:text-[#40304F] font-extrabold cursor-pointer ml-2 whitespace-nowrap"
                    >
                      Mở Sổ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator with Feather */}
          {loading && (
            <div className="relative z-10 flex items-center space-x-3 animate-in fade-in">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-[#F3A6C8] shrink-0 bg-[#FFF5E8]">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#40304F]">
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="bg-[#FFFDF9] rounded-2xl px-4 py-2.5 border-2 border-[#B99BE8]/50 shadow-xs flex items-center space-x-2 text-xs text-[#40304F]">
                <Feather className="w-4 h-4 text-[#B99BE8] animate-bounce" />
                <span className="italic font-serif-literary">Nhân vật đang trăn trở hồi ức…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert with Retry button */}
        {errorMsg && (
          <div className="mx-3 sm:mx-5 mb-2 p-3 rounded-2xl bg-[#FEEDF5] border-2 border-[#FF8FA3] flex items-center justify-between text-xs text-[#30243D] shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#FF8FA3] shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {failedMessageText && (
                <button
                  onClick={handleRetryFailedMessage}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FFD85A] text-[#30243D] font-bold text-[11px] hover:scale-105 transition-transform cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Thử lại</span>
                </button>
              )}
              <button
                onClick={() => setErrorMsg(null)}
                className="text-xs font-bold p-1 hover:bg-[#F3A6C8]/30 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            QUICK PROMPTS + INPUT BAR (Compact & Mobile Unobstructed)
            ======================================================== */}
        <div className="p-2.5 sm:p-4 bg-[#FFFDF9]/95 border-t-2 border-[#FFD85A]/40 shrink-0 z-20 shadow-lg">
          {/* Quick Prompts Horizontal Scroll Strip */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none select-none">
            <span className="text-[10px] font-black text-[#B99BE8] uppercase tracking-wider shrink-0 mr-1">
              Gợi ý:
            </span>
            {defaultQuickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSendMessage(prompt.text)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-50 ${prompt.color}`}
              >
                {prompt.text}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="flex items-center space-x-2 mt-1">
            <input
              type="text"
              value={inputText}
              disabled={loading}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Trò chuyện với ${character.name}... (3 💎 / phản hồi)`}
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#B99BE8]/40 bg-white text-xs sm:text-sm text-[#30243D] placeholder-[#40304F]/40 focus:outline-none focus:border-[#F3A6C8] focus:ring-2 focus:ring-[#F3A6C8]/30 transition-all disabled:opacity-50"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              className="p-2.5 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] text-[#30243D] font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="hidden sm:inline">Gửi</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. DESKTOP RIGHT PANEL: CLUE NOTEBOOK SIDEBAR
          ======================================================== */}
      {showDesktopCluePanel && (
        <aside className="hidden xl:flex flex-col w-72 lg:w-80 bg-[#FFFDF9]/95 border-l-2 border-[#FFD85A]/30 backdrop-blur-md shrink-0 shadow-xs z-20 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-[#FFD85A]/30 flex items-center justify-between bg-gradient-to-b from-[#E8F5FD]/60 to-[#FFFDF9]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-xl bg-[#FFD85A] text-[#30243D]">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-[#40304F]">Sổ Manh Mối</h3>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#B99BE8]/30 text-[#40304F]">
              {unlockedClues.length} manh mối
            </span>
          </div>

          {/* Clue List preview */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {unlockedClues.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-[#40304F]/60 space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#FFF5E8] border border-[#FFD85A] mx-auto flex items-center justify-center text-lg">
                  🔍
                </div>
                <p className="font-semibold text-[#40304F]">Chưa có manh mối nào</p>
                <p className="text-[11px] leading-relaxed">
                  Hãy trò chuyện và hỏi các chi tiết quan trọng để mở khóa các mẩu ký ức ẩn!
                </p>
              </div>
            ) : (
              unlockedClues.map((clue) => (
                <div
                  key={clue.id}
                  className="p-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#FFD85A]/50 shadow-xs hover:border-[#F3A6C8] transition-colors paper-note"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#B99BE8]">
                      MANH MỐI ĐÃ MỞ
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-[#72D6D1]" />
                  </div>
                  <h4 className="text-xs font-bold font-serif-literary text-[#30243D]">
                    {getNeutralClueTitle(clue.title)}
                  </h4>
                </div>
              ))
            )}
          </div>

          {/* Open full Notebook Modal button */}
          <div className="p-4 border-t border-[#FFD85A]/30">
            <button
              onClick={onOpenNotebook}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFD85A] via-[#F3A6C8] to-[#B99BE8] text-[#30243D] font-extrabold text-xs shadow-sm hover:scale-102 transition-transform flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Mở Toàn Bộ Sổ Điều Tra</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================
          4. MOBILE TOP SHEET: CHARACTER INFORMATION
          ======================================================== */}
      {showMobileTopSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-start">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMobileTopSheet(false)}
          />

          {/* Top Sheet Content */}
          <div className="relative z-10 w-full bg-[#FFFDF9] rounded-b-3xl border-b-3 border-[#F3A6C8] shadow-2xl p-5 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#FFD85A]/30 mb-4">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-[#F3A6C8]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#40304F]">
                  Thông tin nhân vật
                </span>
              </div>
              <button
                onClick={() => setShowMobileTopSheet(false)}
                className="p-1.5 rounded-full bg-[#FFF5E8] hover:bg-[#FEEDF5] text-[#40304F] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#F3A6C8] shrink-0 shadow-md">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-[#40304F]">
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif-literary text-[#40304F]">
                  {character.name}
                </h3>
                <p className="text-xs font-semibold text-[#74C7F5]">{character.workTitle}</p>
                <p className="text-[11px] text-[#40304F]/70">Tác giả: {character.workAuthor}</p>
                <div className="mt-1 inline-block px-2.5 py-0.5 rounded-full bg-[#FFD85A]/50 text-[#30243D] text-[10px] font-bold border border-[#FFD85A]">
                  {character.role}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-[#40304F]/70 uppercase tracking-wider text-[10px] block mb-1">
                  Tính cách
                </span>
                <p className="p-2.5 rounded-xl bg-[#FFF5E8] border border-[#FFD85A]/40 text-[#40304F]">
                  {character.personality}
                </p>
              </div>

              <div>
                <span className="font-bold text-[#40304F]/70 uppercase tracking-wider text-[10px] block mb-1">
                  Xưng hô & Giọng điệu
                </span>
                <p className="p-2.5 rounded-xl bg-[#E8F5FD] border border-[#74C7F5]/40 text-[#40304F]">
                  <strong>{character.pronouns}:</strong> {character.voiceTone}
                </p>
              </div>

              <div>
                <span className="font-bold text-[#40304F]/70 uppercase tracking-wider text-[10px] block mb-1">
                  Ranh giới hiểu biết
                </span>
                <p className="p-2.5 rounded-xl bg-[#FEEDF5] border border-[#F3A6C8]/40 text-[#40304F] text-[11px]">
                  Khóa vai nghiêm ngặt theo tác phẩm. Nhân vật sẽ chỉ thuật lại các sự việc trong dòng chảy tác phẩm THPT.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. MOBILE CLUE DRAWER (SLIDE-IN FROM RIGHT)
          ======================================================== */}
      {showMobileClueDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMobileClueDrawer(false)}
          />

          {/* Drawer Content */}
          <div className="relative z-10 w-[85%] max-w-sm h-full bg-[#FFFDF9] border-l-3 border-[#B99BE8] shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[#FFD85A]/30 mb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-[#FFD85A]" />
                <h3 className="font-extrabold text-sm text-[#40304F]">Sổ Manh Mối</h3>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#B99BE8]/30 text-[#40304F]">
                  {unlockedClues.length}
                </span>
              </div>
              <button
                onClick={() => setShowMobileClueDrawer(false)}
                className="p-1.5 rounded-full bg-[#FFF5E8] hover:bg-[#FEEDF5] text-[#40304F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {unlockedClues.length === 0 ? (
                <div className="text-center py-12 px-4 text-xs text-[#40304F]/60 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#FFF5E8] border border-[#FFD85A] mx-auto flex items-center justify-center text-xl">
                    🔍
                  </div>
                  <p className="font-bold text-[#40304F]">Chưa thu thập manh mối nào</p>
                  <p className="text-[11px] leading-relaxed">
                    Hãy hỏi nhân vật về các tình tiết quan trọng để phát hiện ra các manh mối then chốt!
                  </p>
                </div>
              ) : (
                unlockedClues.map((clue) => (
                  <div
                    key={clue.id}
                    className="p-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#FFD85A]/50 shadow-xs paper-note"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#B99BE8]">
                        ĐÃ PHÁT HIỆN
                      </span>
                      <CheckCircle className="w-3.5 h-3.5 text-[#72D6D1]" />
                    </div>
                    <h4 className="text-xs font-bold font-serif-literary text-[#30243D]">
                      {getNeutralClueTitle(clue.title)}
                    </h4>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#FFD85A]/30">
              <button
                onClick={() => {
                  setShowMobileClueDrawer(false);
                  onOpenNotebook();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FFD85A] via-[#F3A6C8] to-[#B99BE8] text-[#30243D] font-extrabold text-xs shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Mở Sổ Điều Tra Toàn Diện</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
