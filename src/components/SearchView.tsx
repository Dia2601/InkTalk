import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Sparkles, Filter } from 'lucide-react';
import type { Character } from '../types';

interface SearchViewProps {
  characters: Character[];
  onSelectCharacter: (char: Character) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  characters,
  onSelectCharacter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<string>('all');

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchesText =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.workTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.workAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.personality.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBadge =
        selectedBadge === 'all' || c.badge === selectedBadge;

      return matchesText && matchesBadge;
    });
  }, [characters, searchTerm, selectedBadge]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Search Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold font-serif-literary text-[#332B35] mb-2">
          Tra Cứu Nhân Vật & Tác Phẩm
        </h1>
        <p className="text-xs sm:text-sm text-[#6F91AA]">
          Tìm kiếm nhân vật theo tên, tác phẩm, tác giả hoặc nét tính cách đặc trưng
        </p>
      </div>

      {/* Search Input & Filter Pills */}
      <div className="max-w-2xl mx-auto mb-10 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-[#6F91AA] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên nhân vật, tác phẩm (ví dụ: Chuyện người con gái Nam Xương, Chí Phèo...)"
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#C9B5EA]/50 bg-white text-sm text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] shadow-xs"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-[#6F91AA] uppercase flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Bộ lọc:</span>
          </span>
          <button
            onClick={() => setSelectedBadge('all')}
            className={`px-3 py-1 rounded-full shrink-0 transition-colors ${
              selectedBadge === 'all'
                ? 'bg-[#F3B8C8] text-[#332B35] font-bold'
                : 'bg-white border border-[#F5D889]/40 text-[#5A4650]'
            }`}
          >
            Tất cả ({characters.length})
          </button>
          <button
            onClick={() => setSelectedBadge('main')}
            className={`px-3 py-1 rounded-full shrink-0 transition-colors ${
              selectedBadge === 'main'
                ? 'bg-[#F5D889] text-[#332B35] font-bold'
                : 'bg-white border border-[#F5D889]/40 text-[#5A4650]'
            }`}
          >
            Nhân vật chính
          </button>
          <button
            onClick={() => setSelectedBadge('sub')}
            className={`px-3 py-1 rounded-full shrink-0 transition-colors ${
              selectedBadge === 'sub'
                ? 'bg-[#A9D8F5] text-[#332B35] font-bold'
                : 'bg-white border border-[#F5D889]/40 text-[#5A4650]'
            }`}
          >
            Nhân vật phụ
          </button>
          <button
            onClick={() => setSelectedBadge('unexpected')}
            className={`px-3 py-1 rounded-full shrink-0 transition-colors ${
              selectedBadge === 'unexpected'
                ? 'bg-[#C9B5EA] text-[#332B35] font-bold'
                : 'bg-white border border-[#F5D889]/40 text-[#5A4650]'
            }`}
          >
            Góc nhìn bất ngờ
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredCharacters.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-[#FFFCFA] border border-[#F5D889]/40 max-w-md mx-auto paper-texture">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#F5D889] opacity-70" />
          <h3 className="text-xl font-bold font-serif-literary text-[#332B35] mb-1">
            “Thử mở một trang sách khác.”
          </h3>
          <p className="text-xs text-[#6F91AA] leading-relaxed">
            Không tìm thấy nhân vật nào phù hợp với từ khóa "{searchTerm}". Bạn hãy thử đổi từ khóa hoặc tìm lại sau khi Quản trị viên cập nhật thêm tác phẩm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map((char) => (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className="group bg-[#FFFCFA] rounded-2xl border border-[#F3B8C8]/40 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#F5D889] bg-[#FFF8F1]">
                {char.imageUrl ? (
                  <img
                    src={char.imageUrl}
                    alt={char.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 m-auto text-[#5A4650]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#6F91AA] block truncate">
                  {char.workTitle}
                </span>
                <h4 className="text-base font-bold font-serif-literary text-[#332B35] truncate group-hover:text-[#493C5A]">
                  {char.name}
                </h4>
                <p className="text-xs text-[#5A4650] truncate">{char.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
