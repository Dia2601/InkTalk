import React, { useState } from 'react';
import { BookOpen, Sparkles, Compass, Bookmark, Library, Layers } from 'lucide-react';
import type { Character } from '../types';

interface CharacterLibraryProps {
  characters: Character[];
  onSelectCharacter: (char: Character) => void;
}

type FilterCategory = 'all' | 'featured' | 'newest' | 'unexpected';

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  characters,
  onSelectCharacter,
}) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const getBadgeStyle = (badge: Character['badge']) => {
    switch (badge) {
      case 'main':
        return 'bg-[#F5D889]/60 text-[#493C5A] border-[#F5D889]';
      case 'sub':
        return 'bg-[#A9D8F5]/60 text-[#332B35] border-[#A9D8F5]';
      case 'unexpected':
        return 'bg-[#C9B5EA]/60 text-[#493C5A] border-[#C9B5EA]';
      default:
        return 'bg-[#F3B8C8]/60 text-[#332B35] border-[#F3B8C8]';
    }
  };

  const getBadgeLabel = (badge: Character['badge']) => {
    switch (badge) {
      case 'main':
        return 'Nhân vật chính';
      case 'sub':
        return 'Nhân vật phụ';
      case 'unexpected':
        return 'Góc nhìn bất ngờ';
      default:
        return 'Nhân vật';
    }
  };

  // Filter logic
  const filteredCharacters = characters.filter((char) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'featured') return char.badge === 'main';
    if (activeCategory === 'unexpected') return char.badge === 'unexpected';
    if (activeCategory === 'newest') return true;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section per Section XVIII */}
      <section className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FFFCFA] border border-[#F5D889]/70 shadow-xs text-xs font-semibold text-[#5A4650] mb-4 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#F5D889]" />
          <span>Đối thoại trực tiếp & Khám phá manh mối THPT</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-serif-literary text-[#332B35] tracking-tight mb-4 uppercase">
          NHỮNG NHÂN VẬT ĐANG CHỜ BẠN
        </h1>
        <p className="text-base sm:text-lg text-[#6F91AA] leading-relaxed font-serif-literary italic">
          “Bạn sẽ mở cuốn sách nào trước?”
        </p>
      </section>

      {/* Category Navigation Pills */}
      {characters.length > 0 && (
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] text-[#332B35] shadow-xs border border-[#F3B8C8]'
                : 'bg-[#FFFCFA] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/40'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Tất Cả Nhân Vật ({characters.length})</span>
          </button>

          <button
            onClick={() => setActiveCategory('featured')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeCategory === 'featured'
                ? 'bg-gradient-to-r from-[#F5D889] to-[#F3B8C8] text-[#332B35] shadow-xs border border-[#F5D889]'
                : 'bg-[#FFFCFA] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5D889]" />
            <span>✨ Nhân Vật Nổi Bật</span>
          </button>

          <button
            onClick={() => setActiveCategory('newest')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeCategory === 'newest'
                ? 'bg-gradient-to-r from-[#C9B5EA] to-[#A9D8F5] text-[#332B35] shadow-xs border border-[#C9B5EA]'
                : 'bg-[#FFFCFA] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C9B5EA]" />
            <span>📖 Mới Mở Khóa</span>
          </button>

          <button
            onClick={() => setActiveCategory('unexpected')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeCategory === 'unexpected'
                ? 'bg-gradient-to-r from-[#A9D8F5] to-[#C9B5EA] text-[#332B35] shadow-xs border border-[#A9D8F5]'
                : 'bg-[#FFFCFA] text-[#6F91AA] hover:text-[#332B35] border border-[#F5D889]/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#A9D8F5]" />
            <span>🔮 Góc Nhìn Bất Ngờ</span>
          </button>
        </div>
      )}

      {/* Character Cards Grid or Empty State */}
      {characters.length === 0 ? (
        /* Artistic Empty State as strictly required by Section XIX */
        <div className="my-12 py-16 px-6 rounded-3xl bg-[#FFFCFA]/95 border-2 border-[#F5D889]/60 shadow-lg text-center max-w-2xl mx-auto notebook-paper relative overflow-hidden">
          {/* Light Beam Illusion */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-b from-[#F5D889]/20 via-[#F3B8C8]/10 to-transparent pointer-events-none rounded-full blur-xl" />

          {/* Decorative Bookshelf with open book in the middle */}
          <div className="relative w-36 h-28 mx-auto mb-6 flex items-center justify-center">
            {/* Background closed books */}
            <div className="absolute left-2 bottom-4 w-7 h-20 rounded-t-md bg-[#C9B5EA]/40 border border-[#C9B5EA] shadow-xs -rotate-6" />
            <div className="absolute right-2 bottom-4 w-7 h-22 rounded-t-md bg-[#A9D8F5]/40 border border-[#A9D8F5] shadow-xs rotate-6" />

            {/* Glowing Open Book in Center */}
            <div className="relative z-10 w-24 h-20 rounded-2xl bg-gradient-to-tr from-[#FFF8F1] to-[#FFFCFA] border-2 border-[#F5D889] flex items-center justify-center shadow-lg">
              <BookOpen className="w-12 h-12 text-[#493C5A] opacity-90" />
            </div>

            {/* Floating Bookmark */}
            <div className="absolute -top-2 right-4 w-5 h-8 bg-[#F3B8C8] rounded-b-sm shadow-xs flex items-end justify-center pb-1 z-20">
              <span className="text-[9px] text-white">✦</span>
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35] mb-2 tracking-wide uppercase">
            THƯ VIỆN ĐANG CHỜ NHỮNG NHÂN VẬT ĐẦU TIÊN
          </h3>
          <p className="text-sm sm:text-base text-[#6F91AA] max-w-md mx-auto leading-relaxed font-serif-literary italic mb-6">
            “Mỗi cuốn sách mở ra một góc nhìn khác.”
          </p>

          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#FFF8F1] border border-[#F5D889]/50 text-xs text-[#5A4650]">
            <Compass className="w-4 h-4 text-[#F5D889]" />
            <span>Trang sách đang được chuẩn bị cẩn trọng theo nguyên tác THPT</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 sm:gap-8">
          {filteredCharacters.map((char) => (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className="group relative bg-[#FFFDF9] rounded-[28px] border-2 border-[#F5D889]/60 hover:border-[#F3B8C8] overflow-hidden card-shadow card-hover cursor-pointer flex flex-col justify-between notebook-paper"
            >
              {/* Pastel Bookmark Ribbon Top-Right (Section XVII) */}
              <div className="absolute top-0 right-7 w-6 h-10 bg-gradient-to-b from-[#F3B8C8] to-[#F5D889] rounded-b-md shadow-md flex items-end justify-center pb-1 z-20 pointer-events-none group-hover:h-12 transition-all duration-300">
                <Bookmark className="w-3.5 h-3.5 text-white fill-white/70" />
              </div>

              {/* Image Section - Takes ~45-50% with Decorative Frame & Pastel Glow */}
              <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-gradient-to-t from-[#FFF8F1] via-[#FFFCFA] to-[#F5D889]/15 p-2.5 pb-0">
                {/* Inner Decorative Frame */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-[#F5D889]/40 shadow-inner">
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#5A4650] bg-gradient-to-br from-[#FFF8F1] to-[#F5D889]/20">
                      <BookOpen className="w-12 h-12 opacity-60 mb-2" />
                      <span className="text-xs font-serif-literary">Hình ảnh đang cập nhật</span>
                    </div>
                  )}

                  {/* Soft Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FFFDF9] via-transparent to-black/10 pointer-events-none" />

                  {/* Character Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border shadow-xs backdrop-blur-md ${getBadgeStyle(
                        char.badge
                      )}`}
                    >
                      {getBadgeLabel(char.badge)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Book Page & Dossier Content Body */}
              <div className="p-6 flex-1 flex flex-col justify-between relative z-10">
                <div>
                  {/* Work title & author */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#6F91AA] mb-1">
                    {char.workTitle} • {char.workAuthor}
                  </div>

                  {/* Character Name (Large Display) */}
                  <h3 className="text-2xl sm:text-3xl font-bold font-serif-literary text-[#332B35] group-hover:text-[#493C5A] transition-colors mb-2 tracking-tight">
                    {char.name}
                  </h3>

                  {/* Introduction / Perspective Excerpt */}
                  <p className="text-xs sm:text-[13px] text-[#5A4650] line-clamp-3 leading-relaxed mb-4">
                    {char.shortIntro || char.personality}
                  </p>
                </div>

                {/* Card Footer: Role & Open Prompt */}
                <div className="pt-4 border-t border-[#F5D889]/40 flex items-center justify-between text-xs font-semibold text-[#5A4650]">
                  <span className="text-[11px] text-[#6F91AA]">{char.role}</span>
                  <span className="flex items-center space-x-1.5 text-[#493C5A] group-hover:translate-x-1.5 transition-transform font-bold">
                    <span>Mở trang sách</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
