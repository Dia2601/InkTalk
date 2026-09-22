import React from 'react';
import {
  BookOpen,
  Search,
  Key,
  Award,
  User as UserIcon,
  Sparkles,
  LogOut,
  Gem,
} from 'lucide-react';
import type { User } from '../types';

export type NavTab = 'library' | 'search' | 'clues' | 'achievements' | 'profile';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onDailyCheckin: () => void;
  hideMobileNav?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenAuth,
  onLogout,
  onDailyCheckin,
  hideMobileNav = false,
}) => {
  const handleLogoClick = () => {
    onSelectTab('library');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFF5E8]/95 backdrop-blur-md border-b-2 border-[#FFD85A]/40 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div
            onClick={handleLogoClick}
            className="flex items-center space-x-3 cursor-pointer group select-none"
            title="InkTalk — Văn học & Manh mối THPT"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] p-[2px] shadow-sm group-hover:scale-105 group-hover:rotate-1 transition-all">
              <div className="w-full h-full bg-[#FFFDF9] rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#B99BE8] fill-[#F3A6C8]/40" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-black tracking-wide text-[#40304F] font-serif-literary leading-none">
                  INKTALK
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3A6C8]/30 text-[#40304F] font-bold border border-[#F3A6C8]/50">
                  AI CHAT
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-[#74C7F5] uppercase block drop-shadow-2xs">
                VĂN HỌC & MANH MỐI THPT
              </span>
            </div>
          </div>

          {/* Center: Navigation tabs with vivid active states & individual colors */}
          <nav className="hidden md:flex items-center space-x-1.5 lg:space-x-2 bg-[#FFFDF9]/80 p-1.5 rounded-full border border-[#FFD85A]/30 shadow-inner">
            {/* Library - Pink */}
            <button
              onClick={() => onSelectTab('library')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentTab === 'library'
                  ? 'bg-[#F3A6C8] text-[#30243D] shadow-sm scale-102 ring-2 ring-[#F3A6C8]/60'
                  : 'text-[#40304F] hover:bg-[#F3A6C8]/20'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${currentTab === 'library' ? 'text-[#30243D]' : 'text-[#F3A6C8]'}`} />
              <span>THƯ VIỆN</span>
            </button>

            {/* Search - Blue */}
            <button
              onClick={() => onSelectTab('search')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentTab === 'search'
                  ? 'bg-[#74C7F5] text-[#30243D] shadow-sm scale-102 ring-2 ring-[#74C7F5]/60'
                  : 'text-[#40304F] hover:bg-[#74C7F5]/20'
              }`}
            >
              <Search className={`w-4 h-4 ${currentTab === 'search' ? 'text-[#30243D]' : 'text-[#74C7F5]'}`} />
              <span>TÌM KIẾM</span>
            </button>

            {/* Clues - Yellow */}
            <button
              onClick={() => onSelectTab('clues')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentTab === 'clues'
                  ? 'bg-[#FFD85A] text-[#30243D] shadow-sm scale-102 ring-2 ring-[#FFD85A]/60'
                  : 'text-[#40304F] hover:bg-[#FFD85A]/25'
              }`}
            >
              <Key className={`w-4 h-4 ${currentTab === 'clues' ? 'text-[#30243D]' : 'text-[#FFD85A]'}`} />
              <span>MANH MỐI</span>
            </button>

            {/* Achievements - Purple */}
            <button
              onClick={() => onSelectTab('achievements')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentTab === 'achievements'
                  ? 'bg-[#B99BE8] text-[#30243D] shadow-sm scale-102 ring-2 ring-[#B99BE8]/60'
                  : 'text-[#40304F] hover:bg-[#B99BE8]/20'
              }`}
            >
              <Award className={`w-4 h-4 ${currentTab === 'achievements' ? 'text-[#30243D]' : 'text-[#B99BE8]'}`} />
              <span>THÀNH TÍCH</span>
            </button>

            {/* Profile - Coral */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentTab === 'profile'
                  ? 'bg-[#FF8FA3] text-[#30243D] shadow-sm scale-102 ring-2 ring-[#FF8FA3]/60'
                  : 'text-[#40304F] hover:bg-[#FF8FA3]/20'
              }`}
            >
              <UserIcon className={`w-4 h-4 ${currentTab === 'profile' ? 'text-[#30243D]' : 'text-[#FF8FA3]'}`} />
              <span>HỒ SƠ</span>
            </button>
          </nav>

          {/* Right: Vivid Diamond Wallet + Avatar */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* Vivid Diamond Wallet */}
                <div className="flex items-center space-x-2 pl-3.5 pr-2 py-1.5 rounded-full diamond-wallet text-[#30243D] font-extrabold cursor-pointer transition-transform hover:scale-105 select-none">
                  <Gem className="w-5 h-5 text-[#30243D] fill-[#FFFDF9]/60 animate-pulse" />
                  <span className="text-sm font-black tracking-tight">{user.diamonds}</span>
                  <span className="text-xs">💎</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDailyCheckin();
                    }}
                    title="Điểm danh nhận +100 💎 mỗi ngày"
                    className="p-1 rounded-full bg-[#FFFDF9]/80 hover:bg-[#FFFDF9] text-[#40304F] shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B99BE8]" />
                  </button>
                </div>

                {/* Profile Avatar Badge with Pastel Ring */}
                <button
                  onClick={() => onSelectTab('profile')}
                  className="flex items-center space-x-2 p-1 pr-3 rounded-full bg-[#FFFDF9] border-2 border-[#B99BE8] hover:border-[#F3A6C8] shadow-xs transition-all hover:scale-102"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F3A6C8] via-[#B99BE8] to-[#74C7F5] p-[2px]">
                    <div className="w-full h-full rounded-full bg-[#FFFDF9] flex items-center justify-center text-xs font-black text-[#40304F]">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#40304F] hidden sm:inline max-w-[90px] truncate">
                    {user.username}
                  </span>
                </button>

                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-full text-[#40304F]/60 hover:text-[#40304F] hover:bg-[#F3A6C8]/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-5 py-2 rounded-full text-xs font-extrabold text-[#30243D] bg-gradient-to-r from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for mobile reachability) */}
      {!hideMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF5E8]/95 backdrop-blur-lg border-t-2 border-[#FFD85A]/50 py-2 px-3 flex items-center justify-around shadow-lg">
          <button
            onClick={() => onSelectTab('library')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              currentTab === 'library'
                ? 'bg-[#F3A6C8] text-[#30243D] font-extrabold shadow-xs'
                : 'text-[#40304F]'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${currentTab === 'library' ? 'text-[#30243D]' : 'text-[#F3A6C8]'}`} />
            <span className="text-[10px] mt-0.5">Thư viện</span>
          </button>

          <button
            onClick={() => onSelectTab('search')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              currentTab === 'search'
                ? 'bg-[#74C7F5] text-[#30243D] font-extrabold shadow-xs'
                : 'text-[#40304F]'
            }`}
          >
            <Search className={`w-5 h-5 ${currentTab === 'search' ? 'text-[#30243D]' : 'text-[#74C7F5]'}`} />
            <span className="text-[10px] mt-0.5">Tìm kiếm</span>
          </button>

          <button
            onClick={() => onSelectTab('clues')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              currentTab === 'clues'
                ? 'bg-[#FFD85A] text-[#30243D] font-extrabold shadow-xs'
                : 'text-[#40304F]'
            }`}
          >
            <Key className={`w-5 h-5 ${currentTab === 'clues' ? 'text-[#30243D]' : 'text-[#FFD85A]'}`} />
            <span className="text-[10px] mt-0.5">Manh mối</span>
          </button>

          <button
            onClick={() => onSelectTab('achievements')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              currentTab === 'achievements'
                ? 'bg-[#B99BE8] text-[#30243D] font-extrabold shadow-xs'
                : 'text-[#40304F]'
            }`}
          >
            <Award className={`w-5 h-5 ${currentTab === 'achievements' ? 'text-[#30243D]' : 'text-[#B99BE8]'}`} />
            <span className="text-[10px] mt-0.5">Thành tích</span>
          </button>

          <button
            onClick={() => onSelectTab('profile')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
              currentTab === 'profile'
                ? 'bg-[#FF8FA3] text-[#30243D] font-extrabold shadow-xs'
                : 'text-[#40304F]'
            }`}
          >
            <UserIcon className={`w-5 h-5 ${currentTab === 'profile' ? 'text-[#30243D]' : 'text-[#FF8FA3]'}`} />
            <span className="text-[10px] mt-0.5">Hồ sơ</span>
          </button>
        </div>
      )}
    </>
  );
};
