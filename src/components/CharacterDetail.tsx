import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Feather,
  Sparkles,
  Compass,
  X,
  Bookmark,
} from 'lucide-react';
import type { Character } from '../types';

interface CharacterDetailProps {
  character: Character;
  onBack: () => void;
  onStartChat: () => void;
}

export const CharacterDetail: React.FC<CharacterDetailProps> = ({
  character,
  onBack,
  onStartChat,
}) => {
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#FFFCFA] border border-[#F5D889]/50 text-xs font-semibold text-[#5A4650] hover:bg-[#F3B8C8]/30 transition-all mb-8 shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Về Thư Viện</span>
      </button>

      {/* Main Profile Layout */}
      <div className="relative bg-[#FFFDF9] rounded-[32px] border-2 border-[#F5D889]/70 shadow-xl overflow-hidden notebook-paper">
        {/* Decorative Bookmark Ribbon Top Right */}
        <div className="absolute top-0 right-10 w-7 h-12 bg-gradient-to-b from-[#F3B8C8] to-[#C9B5EA] rounded-b-md shadow-md flex items-end justify-center pb-1 z-20 pointer-events-none">
          <Bookmark className="w-4 h-4 text-white fill-white/80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Character Image (Admin-provided) */}
          <div className="md:col-span-5 relative min-h-[360px] md:min-h-[500px] bg-gradient-to-t from-[#FFF8F1] to-[#FFFCFA] overflow-hidden border-b md:border-b-0 md:border-r border-[#F5D889]/30">
            {character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt={character.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-[#5A4650]">
                <BookOpen className="w-16 h-16 opacity-60 mb-3" />
                <p className="text-sm font-serif-literary">Hình ảnh nhân vật do Quản trị viên cập nhật</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#332B35]/40 via-transparent to-transparent pointer-events-none md:hidden" />
          </div>

          {/* Right Column: Character Details & Actions */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Tag & Era */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-[#F5D889]/40 border border-[#F5D889] text-[11px] font-bold text-[#5A4650]">
                  {character.role}
                </span>
                <span className="text-xs text-[#6F91AA]">
                  Nguyên tác: <strong>{character.workTitle}</strong>
                </span>
              </div>

              {/* Title / Name */}
              <h1 className="text-3xl sm:text-5xl font-bold font-serif-literary text-[#332B35] mb-2 tracking-tight">
                {character.name}
              </h1>

              {/* Author subtitle */}
              <p className="text-sm text-[#6F91AA] mb-6">
                Tác giả: <span className="font-semibold text-[#5A4650]">{character.workAuthor}</span>
              </p>

              {/* Introductory excerpt (Spoiler-free!) */}
              <div className="p-5 rounded-2xl bg-[#FFF8F1] border border-[#F5D889]/40 mb-6">
                <div className="flex items-start space-x-3">
                  <Feather className="w-5 h-5 text-[#C9B5EA] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-[#5A4650] leading-relaxed italic">
                    "{character.shortIntro || 'Một nhân vật mang theo những nỗi niềm và biến cố chưa từng được phơi bày trọn vẹn...'}"
                  </p>
                </div>
              </div>

              {/* Character Persona Highlights (Without spoiling mystery answers) */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-xs text-[#5A4650]">
                <div className="p-3.5 rounded-xl bg-white border border-[#C9B5EA]/30">
                  <span className="text-[10px] text-[#6F91AA] uppercase font-bold block mb-1">
                    Cách xưng hô
                  </span>
                  <span className="font-semibold">{character.pronouns || 'tôi'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-[#C9B5EA]/30">
                  <span className="text-[10px] text-[#6F91AA] uppercase font-bold block mb-1">
                    Tính cách
                  </span>
                  <span className="font-semibold line-clamp-1">{character.personality}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons (Mandatory per Section XI) */}
            <div className="pt-6 border-t border-[#F5D889]/30 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onStartChat}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl text-sm font-bold text-[#332B35] bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] shadow-md hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>BẮT ĐẦU TRÒ CHUYỆN</span>
              </button>

              <button
                onClick={() => setShowSummaryModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3.5 px-5 rounded-2xl text-sm font-semibold text-[#5A4650] bg-[#FFF8F1] hover:bg-[#F5D889]/30 border border-[#F5D889] transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>XEM TÓM TẮT NHÂN VẬT</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Modal (Spoiler-Safe) */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332B35]/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#FFFCFA] rounded-3xl border border-[#F5D889] shadow-2xl p-6 sm:p-8 paper-texture">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#F3B8C8]/30 text-[#5A4650]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-[#F5D889]/40 text-[#493C5A]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif-literary text-[#332B35]">
                  Tóm Tắt Bối Cảnh: {character.name}
                </h3>
                <p className="text-xs text-[#6F91AA]">
                  {character.workTitle} • {character.workAuthor}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-[#5A4650] leading-relaxed my-6 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <h4 className="font-bold text-[#493C5A] uppercase text-[10px] tracking-wider mb-1">
                  Vị trí trong tác phẩm
                </h4>
                <p>{character.role}. Mang âm hưởng văn học sâu sắc trong chương trình THPT.</p>
              </div>

              <div>
                <h4 className="font-bold text-[#493C5A] uppercase text-[10px] tracking-wider mb-1">
                  Góc nhìn tự sự
                </h4>
                <p>{character.perspective || 'Góc nhìn cá nhân từ những gì nhân vật trực tiếp trải qua trong hoàn cảnh lịch sử và gia đình.'}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#493C5A] uppercase text-[10px] tracking-wider mb-1">
                  Nét tâm lý nổi bật
                </h4>
                <p>{character.personality}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FFF8F1] border border-[#F5D889]/40 text-[11px] text-[#6F91AA]">
                <Compass className="w-3.5 h-3.5 inline mr-1 text-[#F5D889]" />
                Mọi chi tiết sâu hơn về bí mật và nút thắt bi kịch chỉ có thể mở ra thông qua các câu hỏi chân thành của bạn.
              </div>
            </div>

            <button
              onClick={() => {
                setShowSummaryModal(false);
                onStartChat();
              }}
              className="w-full py-3 rounded-xl font-semibold text-xs text-[#332B35] bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] shadow-xs hover:shadow-md transition-all"
            >
              Tiến vào Trò Chuyện với {character.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
