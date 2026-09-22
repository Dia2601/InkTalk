import React, { useState } from 'react';
import {
  X,
  Search,
  Key,
  Link as LinkIcon,
  Brain,
  Sparkles,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookOpen,
} from 'lucide-react';
import type { Clue, GameSession, User } from '../types';
import {
  testClueConnection,
  submitDeduction,
  replayMystery,
} from '../services/api';
import { getNeutralClueTitle, getClueIcon } from '../utils/clueDisplay';

interface ClueNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  characterId: string;
  characterName: string;
  session: GameSession | null;
  unlockedClues: Clue[];
  totalCluesCount: number;
  onSessionUpdated: () => void;
  onUpdateUserDiamonds: (diamonds: number) => void;
}

export const ClueNotebookModal: React.FC<ClueNotebookModalProps> = ({
  isOpen,
  onClose,
  user,
  characterId,
  characterName,
  session,
  unlockedClues,
  totalCluesCount,
  onSessionUpdated,
  onUpdateUserDiamonds,
}) => {
  const [selectedClueIds, setSelectedClueIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [explanationText, setExplanationText] = useState('');
  const [activeTab, setActiveTab] = useState<'clues' | 'connect' | 'deduction'>('clues');
  const [expandedDecodedClueId, setExpandedDecodedClueId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleClueSelection = (id: string) => {
    setSelectedClueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTestConnection = async () => {
    if (!session || selectedClueIds.length < 2) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng chọn ít nhất 2 thẻ manh mối để kiểm tra mối liên hệ.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const result = await testClueConnection(session.id, selectedClueIds);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `✨ ${result.message}\nGiải mã: "${result.reveal}"`,
        });
        setSelectedClueIds([]);
        onSessionUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: result.message,
        });
        onSessionUpdated();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Thử nghiệm thất bại.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeduction = async () => {
    if (!session || selectedClueIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Vui lòng chọn các manh mối bạn cho là cốt lõi của bí ẩn.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const result = await submitDeduction(session.id, selectedClueIds, explanationText);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `🎉 GIẢI MÃ THÀNH CÔNG! ${result.message}\n\n${result.finalReveal}`,
        });
        if (result.rewardGranted && typeof result.userDiamonds === 'number') {
          onUpdateUserDiamonds(result.userDiamonds);
        }
        onSessionUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: result.message,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Suy luận thất bại.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = async () => {
    if (!confirm('Bạn có chắc muốn chơi lại để trải nghiệm lại hành trình điều tra từ đầu?')) {
      return;
    }

    setLoading(true);
    try {
      await replayMystery(user.id, characterId);
      setFeedback({
        type: 'success',
        message: 'Đã thiết lập lại hành trình chơi lại thành công.',
      });
      onSessionUpdated();
      onClose();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Không thể chơi lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  const isTestLocked =
    session && session.testLockedUntilQuestion > session.questionCount;
  const questionsNeededToUnlock =
    session && isTestLocked
      ? session.testLockedUntilQuestion - session.questionCount
      : 0;

  // Deduction eligibility check
  const minRequiredQuestions = session?.isReplay ? 20 : 3;
  const isEligibleForDeduction =
    (session?.questionCount || 0) >= minRequiredQuestions && unlockedClues.length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#332B35]/50 backdrop-blur-md animate-fade-in">
      {/* Background subtle silhouette decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-5 flex justify-between items-center px-12 overflow-hidden">
        <BookOpen className="w-96 h-96 -rotate-12 transform" />
        <BookOpen className="w-96 h-96 rotate-12 transform" />
      </div>

      {/* Main Investigation Notebook Card */}
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#FFFDF9] rounded-[28px] border-2 border-[#F5D889] shadow-[0_20px_60px_-15px_rgba(73,60,90,0.25)] flex flex-col notebook-paper overflow-hidden">
        {/* Decorative Notebook Bookmark Ribbon on Top Right */}
        <div className="absolute -top-1 right-14 w-6 h-12 bg-gradient-to-b from-[#F3B8C8] to-[#C9B5EA] rounded-b-md shadow-md flex items-end justify-center pb-1 pointer-events-none z-20">
          <Bookmark className="w-3.5 h-3.5 text-white fill-white/80" />
        </div>

        {/* Decorative Subtle Star Watermark */}
        <div className="absolute top-4 left-6 text-[#F5D889]/15 select-none pointer-events-none text-5xl font-serif">
          ✦
        </div>
        <div className="absolute bottom-6 right-6 text-[#C9B5EA]/15 select-none pointer-events-none text-6xl font-serif">
          🗝️
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#F3B8C8]/30 text-[#5A4650] transition-colors z-20 cursor-pointer"
          title="Đóng sổ manh mối"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Sổ Điều Tra Văn Học */}
        <div className="px-6 sm:px-8 pt-7 pb-4 shrink-0 border-b border-[#F5D889]/30 relative z-10">
          <div className="flex items-center space-x-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F3B8C8]/40 via-[#F5D889]/40 to-[#A9D8F5]/40 border border-[#F5D889]/50 flex items-center justify-center shadow-xs">
              <Search className="w-6 h-6 text-[#493C5A]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35] tracking-wide uppercase">
                  Sổ Manh Mối
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#C9B5EA]/30 text-[#493C5A]">
                  Hồ Sơ Điều Tra
                </span>
              </div>
              <p className="text-xs text-[#6F91AA] font-medium mt-0.5">
                Nhân vật: <strong className="text-[#493C5A]">{characterName}</strong>
              </p>
            </div>
          </div>

          {/* Collection Progress Bar (●━━━━○━━━━○ Style) */}
          <div className="mt-3 flex items-center justify-between bg-[#FFF8F1]/80 px-3.5 py-2 rounded-xl border border-[#F5D889]/40">
            <div className="flex items-center space-x-2 text-xs text-[#5A4650] font-medium">
              <Key className="w-3.5 h-3.5 text-[#F5D889]" />
              <span>Đã thu thập <strong>{unlockedClues.length}</strong> / {totalCluesCount || 3} manh mối</span>
            </div>

            {/* Classical node-based dots progression */}
            <div className="flex items-center space-x-1.5">
              {Array.from({ length: Math.max(totalCluesCount || 3, 3) }).map((_, i) => {
                const isCollected = i < unlockedClues.length;
                return (
                  <React.Fragment key={i}>
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isCollected
                          ? 'bg-[#F3B8C8] shadow-[0_0_8px_#F3B8C8]'
                          : 'bg-[#F5D889]/40 border border-[#F5D889]'
                      }`}
                    />
                    {i < Math.max(totalCluesCount || 3, 3) - 1 && (
                      <span
                        className={`w-3 sm:w-5 h-0.5 ${
                          i < unlockedClues.length - 1 ? 'bg-[#F3B8C8]' : 'bg-[#F5D889]/30'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Navigation (Modern Pills) */}
        <div className="px-6 sm:px-8 py-3 shrink-0 flex items-center space-x-2 border-b border-[#F5D889]/20 relative z-10 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('clues');
              setFeedback(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'clues'
                ? 'bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] text-[#332B35] shadow-xs border border-[#F3B8C8]'
                : 'bg-[#FFF8F1] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/30'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Danh Sách ({unlockedClues.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('connect');
              setFeedback(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-gradient-to-r from-[#C9B5EA] to-[#A9D8F5] text-[#332B35] shadow-xs border border-[#C9B5EA]'
                : 'bg-[#FFF8F1] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/30'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Liên Kết Manh Mối</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('deduction');
              setFeedback(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'deduction'
                ? 'bg-gradient-to-r from-[#F5D889] to-[#F3B8C8] text-[#332B35] shadow-xs border border-[#F5D889]'
                : 'bg-[#FFF8F1] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/30'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Điểm Suy Luận</span>
          </button>
        </div>

        {/* Feedback Message Banner */}
        {feedback && (
          <div className="mx-6 sm:mx-8 mt-3 shrink-0">
            <div
              className={`p-3 rounded-2xl text-xs whitespace-pre-line border shadow-xs animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-[#A9D8F5]/30 border-[#A9D8F5] text-[#332B35]'
                  : 'bg-[#F3B8C8]/30 border-[#F3B8C8] text-[#493C5A]'
              }`}
            >
              {feedback.message}
            </div>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-4 relative z-10">
          {/* TAB 1: DANH SÁCH MANH MỐI (STRICT NO-SPOILER CARDS) */}
          {activeTab === 'clues' && (
            <div>
              {unlockedClues.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl bg-[#FFF8F1] border border-[#F5D889]/40 text-[#6F91AA]">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#F3B8C8]/30 to-[#F5D889]/30 border border-[#F5D889]/40 flex items-center justify-center">
                    <Key className="w-6 h-6 text-[#5A4650] opacity-60" />
                  </div>
                  <p className="font-serif-literary text-base font-bold text-[#493C5A] mb-1">
                    “Những điều bạn chưa để ý vẫn đang ẩn mình trong câu chuyện.”
                  </p>
                  <p className="text-xs max-w-sm mx-auto leading-relaxed">
                    Hãy tiếp tục trò chuyện sâu sắc cùng <strong>{characterName}</strong> để các manh mối dần xuất hiện trên trang sổ.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unlockedClues.map((clue, idx) => {
                    const neutralTitle = getNeutralClueTitle(clue.title);
                    const clueIcon = getClueIcon(clue.title, idx);
                    const padIndex = String(idx + 1).padStart(2, '0');

                    // Check if this clue was successfully decoded in combinations or completion
                    const isDecoded =
                      session?.decodedCombinationIds.some(
                        (reveal) =>
                          reveal.toLowerCase().includes(neutralTitle.toLowerCase()) ||
                          reveal.toLowerCase().includes(clue.title.toLowerCase())
                      ) ||
                      session?.completed ||
                      false;

                    const isExpanded = expandedDecodedClueId === clue.id;

                    return (
                      <div
                        key={clue.id}
                        className={`relative rounded-2xl border transition-all duration-300 clue-card-glow flex flex-col justify-between overflow-hidden ${
                          isDecoded
                            ? 'bg-gradient-to-b from-[#FFFCFA] to-[#A9D8F5]/15 border-[#A9D8F5]'
                            : 'bg-[#FFFCFA] border-[#F5D889]/60 hover:border-[#F5D889]'
                        }`}
                      >
                        {/* Card Header & Content: STRICTLY TITLE + STATUS ONLY */}
                        <div className="p-4 sm:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl select-none" role="img" aria-label="clue-icon">
                              {clueIcon}
                            </span>
                            <span className="text-[10px] font-mono tracking-widest text-[#6F91AA] uppercase">
                              MANH MỐI {padIndex}
                            </span>
                          </div>

                          {/* Clue Neutral Title (Uppercase, High Curiosity) */}
                          <h3 className="text-base sm:text-lg font-bold font-serif-literary text-[#332B35] tracking-wide mb-3 leading-snug">
                            {neutralTitle.toUpperCase()}
                          </h3>

                          {/* Status Badge */}
                          <div className="flex items-center justify-between pt-1">
                            <span
                              className={`text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center space-x-1 ${
                                isDecoded
                                  ? 'bg-[#A9D8F5]/40 text-[#332B35] border border-[#A9D8F5]'
                                  : 'bg-[#FFF8F1] text-[#6F91AA] border border-[#F5D889]/40'
                              }`}
                            >
                              {isDecoded ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-[#6F91AA]" />
                                  <span>✓ ĐÃ GIẢI MÃ</span>
                                </>
                              ) : (
                                <span>Chưa giải mã</span>
                              )}
                            </span>

                            {/* If decoded, allow expanding deep literary analysis */}
                            {isDecoded && (
                              <button
                                onClick={() =>
                                  setExpandedDecodedClueId(isExpanded ? null : clue.id)
                                }
                                className="text-[11px] text-[#493C5A] hover:text-[#332B35] font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Thu gọn' : 'Xem ý nghĩa'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* REVEALED CONTENT — ONLY ACCESSIBLE AFTER DECODING */}
                        {isDecoded && isExpanded && (
                          <div className="p-4 bg-[#FFF8F1] border-t border-[#A9D8F5]/40 text-xs text-[#493C5A] space-y-2 animate-fade-in">
                            <p className="font-semibold text-[#332B35]">Ý nghĩa văn học:</p>
                            <p className="leading-relaxed text-[#5A4650]">
                              {clue.description}
                            </p>
                            {clue.sourceHint && (
                              <p className="text-[10px] text-[#6F91AA] italic pt-1 border-t border-[#F5D889]/30">
                                Bối cảnh: {clue.sourceHint}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIÊN KẾT MANH MỐI (STRICT NO-SPOILER GRAPH) */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              {/* Educational banner */}
              <div className="p-4 rounded-2xl bg-[#FFF8F1] border border-[#F5D889]/40 text-xs text-[#5A4650] leading-relaxed">
                <p className="font-bold text-[#493C5A] mb-1 flex items-center space-x-1.5">
                  <LinkIcon className="w-4 h-4 text-[#C9B5EA]" />
                  <span>Thử nghiệm liên kết manh mối</span>
                </p>
                <p>
                  Có những manh mối vẫn chưa tìm thấy mối liên hệ. Hãy chọn các manh mối bạn nghi vấn có sự liên đới để kiểm tra sự thật.
                </p>
              </div>

              {/* Locked Notice if spam prevented */}
              {isTestLocked && (
                <div className="p-3.5 rounded-2xl bg-[#F3B8C8]/30 border border-[#F3B8C8] text-xs text-[#493C5A] flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Thử nghiệm đang tạm khóa. Vui lòng quay lại trò chuyện thêm ít nhất{' '}
                    <strong>{questionsNeededToUnlock}</strong> câu hỏi để gom thêm bối cảnh.
                  </span>
                </div>
              )}

              {/* Clue Selection Nodes */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#332B35] flex items-center justify-between">
                  <span>Chọn manh mối để kết nối ({selectedClueIds.length} đã chọn):</span>
                  <span className="text-[11px] text-[#6F91AA] font-normal">Cần tối thiểu 2 manh mối</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {unlockedClues.map((clue, idx) => {
                    const neutralTitle = getNeutralClueTitle(clue.title);
                    const clueIcon = getClueIcon(clue.title, idx);
                    const isSelected = selectedClueIds.includes(clue.id);

                    return (
                      <div
                        key={clue.id}
                        onClick={() => !isTestLocked && toggleClueSelection(clue.id)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#F3B8C8]/40 to-[#F5D889]/30 border-[#F3B8C8] shadow-xs'
                            : 'bg-[#FFFCFA] border-[#F5D889]/40 hover:border-[#F5D889]'
                        } ${isTestLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-base select-none">{clueIcon}</span>
                          <span className="font-bold font-serif-literary text-[#332B35]">
                            {neutralTitle}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 rounded text-[#F3B8C8] focus:ring-0 pointer-events-none accent-[#F3B8C8]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleTestConnection}
                disabled={loading || isTestLocked || selectedClueIds.length < 2}
                className="w-full py-3 rounded-2xl font-bold text-xs text-[#332B35] bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang kiểm tra mối liên hệ...' : 'Kiểm Tra Mối Liên Hệ'}
              </button>

              {/* Decoded Connections (Ink Thread visualization) */}
              {session && session.decodedCombinationIds.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#F5D889]/30">
                  <h4 className="text-xs font-bold text-[#493C5A] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5D889]" />
                    <span>Mối liên hệ đã được khám phá:</span>
                  </h4>

                  <div className="space-y-3">
                    {session.decodedCombinationIds.map((reveal, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#A9D8F5] shadow-xs space-y-2 relative overflow-hidden"
                      >
                        {/* Decorative connection ink thread */}
                        <div className="h-1 w-full ink-thread rounded-full mb-2" />
                        <div className="flex items-start space-x-2 text-xs text-[#332B35] leading-relaxed">
                          <CheckCircle className="w-4 h-4 text-[#6F91AA] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">{reveal}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ĐIỂM SUY LUẬN (REFINED END GAME) */}
          {activeTab === 'deduction' && (
            <div className="space-y-4">
              {!isEligibleForDeduction && !session?.completed ? (
                <div className="text-center py-12 px-4 rounded-3xl bg-[#FFF8F1] border border-[#F5D889]/40 text-[#6F91AA]">
                  <Brain className="w-10 h-10 mx-auto mb-2 text-[#C9B5EA]" />
                  <h4 className="font-serif-literary text-base font-bold text-[#493C5A] mb-1">
                    “Câu chuyện vẫn còn những khoảng trống.”
                  </h4>
                  <p className="text-xs max-w-md mx-auto leading-relaxed">
                    Tiếp tục trò chuyện cùng nhân vật và thu thập thêm manh mối để mở điểm suy luận kết thúc.
                  </p>
                  <p className="text-[11px] text-[#5A4650] mt-3">
                    Số lượt trò chuyện hiện tại: <strong>{session?.questionCount || 0}</strong> / {minRequiredQuestions}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF8F1] via-[#FFFCFA] to-[#F5D889]/20 border border-[#F5D889] text-xs text-[#332B35] leading-relaxed">
                    <div className="flex items-center space-x-2 font-bold font-serif-literary text-sm mb-1 text-[#493C5A]">
                      <Brain className="w-4 h-4 text-[#C9B5EA]" />
                      <span>Bản Suy Luận Kết Thúc Tác Phẩm</span>
                    </div>
                    <p>
                      Hãy lựa chọn những manh mối cốt lõi cấu thành bi kịch và đưa ra suy luận của bạn để khép lại hành trình giải mã (+50 💎).
                    </p>
                  </div>

                  {session?.completed && (
                    <div className="p-4 rounded-2xl bg-[#A9D8F5]/25 border border-[#A9D8F5] text-xs text-[#332B35] flex items-center justify-between shadow-xs">
                      <span className="flex items-center space-x-2 font-bold font-serif-literary text-sm text-[#493C5A]">
                        <Sparkles className="w-4 h-4 text-[#F5D889]" />
                        <span>Bạn đã phá đảo thành công bí ẩn của nhân vật!</span>
                      </span>
                      <button
                        onClick={handleReplay}
                        className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#A9D8F5] text-[#493C5A] hover:bg-[#FFF8F1] transition-all cursor-pointer shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Chơi Lại</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-[#332B35] block mb-2">
                      1. Chọn manh mối cốt lõi dẫn đến chân tướng:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {unlockedClues.map((clue, idx) => {
                        const neutralTitle = getNeutralClueTitle(clue.title);
                        const clueIcon = getClueIcon(clue.title, idx);
                        const isSelected = selectedClueIds.includes(clue.id);

                        return (
                          <div
                            key={clue.id}
                            onClick={() => toggleClueSelection(clue.id)}
                            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#F3B8C8]/40 to-[#F5D889]/30 border-[#F3B8C8] shadow-xs'
                                : 'bg-[#FFFCFA] border-[#F5D889]/40 hover:border-[#F5D889]'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="text-base select-none">{clueIcon}</span>
                              <span className="font-bold font-serif-literary text-[#332B35]">
                                {neutralTitle}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded text-[#F3B8C8] focus:ring-0 pointer-events-none accent-[#F3B8C8]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#332B35] block mb-1">
                      2. Góc nhìn thấu cảm / Lời đúc kết của bạn:
                    </label>
                    <textarea
                      rows={3}
                      value={explanationText}
                      onChange={(e) => setExplanationText(e.target.value)}
                      placeholder="Ghi lại góc nhìn của bạn về nguồn cơn bi kịch trong tác phẩm..."
                      className="w-full p-3.5 rounded-2xl border border-[#C9B5EA]/40 text-xs bg-white text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8]"
                    />
                  </div>

                  <button
                    onClick={handleDeduction}
                    disabled={loading || selectedClueIds.length === 0}
                    className="w-full py-3.5 rounded-2xl font-bold text-xs text-[#332B35] bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Đang đối chiếu suy luận...' : 'Nộp Suy Luận Cuối (+50 💎)'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
