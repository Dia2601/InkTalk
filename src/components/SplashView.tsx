import React from 'react';
import { BookOpen, Sparkles, ArrowRight, Bookmark, Star } from 'lucide-react';

interface SplashViewProps {
  onStart: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onStart }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-fantasy-splash flex flex-col justify-between selection:bg-[#F3A6C8] selection:text-[#30243D]">
      {/* ========================================================
          BACKGROUND DEPTH LAYERS (Fantasy Library + Sunshine)
          ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Layer 1 - Background: Arched Window with Sunbeams & Colorful Bookshelf Silhouettes */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-b-[450px] border-4 border-[#FFD85A]/40 bg-gradient-to-b from-[#FFF5E8]/60 via-[#FFD85A]/15 to-transparent blur-xs opacity-80" />
        
        {/* Colorful Bookshelf Glow Zones (Pink, Yellow, Blue, Purple) */}
        <div className="absolute top-12 left-4 sm:left-12 w-48 sm:w-72 h-80 rounded-3xl bg-gradient-to-br from-[#F3A6C8]/40 via-[#FF8FA3]/25 to-transparent blur-2xl" />
        <div className="absolute top-16 right-4 sm:right-12 w-48 sm:w-72 h-80 rounded-3xl bg-gradient-to-bl from-[#74C7F5]/45 via-[#72D6D1]/30 to-transparent blur-2xl" />
        <div className="absolute bottom-20 left-10 sm:left-24 w-60 sm:w-80 h-64 rounded-3xl bg-gradient-to-tr from-[#B99BE8]/45 via-[#F3A6C8]/30 to-transparent blur-2xl" />
        <div className="absolute bottom-16 right-10 sm:right-24 w-64 sm:w-88 h-64 rounded-3xl bg-gradient-to-tl from-[#FFD85A]/50 via-[#74C7F5]/30 to-transparent blur-2xl" />

        {/* Layer 2 - Midground: Floating Books, Bookmarks, Floating Pages & Twinkles */}
        <div className="absolute top-28 left-[14%] floating-element opacity-80 hidden sm:block">
          <div className="w-12 h-14 rounded-md bg-[#FFFDF9] border-2 border-[#F3A6C8] shadow-md flex items-center justify-center rotate-[-12deg]">
            <BookOpen className="w-6 h-6 text-[#F3A6C8]" />
          </div>
        </div>
        <div className="absolute top-36 right-[15%] floating-element opacity-80 hidden sm:block" style={{ animationDelay: '1.8s' }}>
          <div className="w-11 h-14 rounded-md bg-[#FFFDF9] border-2 border-[#74C7F5] shadow-md flex items-center justify-center rotate-[14deg]">
            <BookOpen className="w-6 h-6 text-[#74C7F5]" />
          </div>
        </div>
        <div className="absolute bottom-36 left-[20%] floating-element opacity-75 hidden md:block" style={{ animationDelay: '2.7s' }}>
          <div className="px-3 py-1.5 rounded-lg bg-[#FFD85A]/90 text-[#40304F] text-xs font-serif-literary shadow-sm rotate-[6deg]">
            ✦ “Nam Xương...”
          </div>
        </div>
        <div className="absolute bottom-40 right-[18%] floating-element opacity-75 hidden md:block" style={{ animationDelay: '0.9s' }}>
          <div className="px-3 py-1.5 rounded-lg bg-[#B99BE8]/90 text-[#FFFDF9] text-xs font-serif-literary shadow-sm rotate-[-8deg]">
            🔖 “Trương Sinh...”
          </div>
        </div>

        {/* Twinkles & Light Dust */}
        <div className="absolute top-1/4 left-1/3 text-[#FFD85A] animate-ping opacity-70 text-lg">✦</div>
        <div className="absolute top-1/3 right-1/3 text-[#F3A6C8] animate-pulse opacity-80 text-xl">✧</div>
        <div className="absolute bottom-1/3 left-1/4 text-[#74C7F5] animate-bounce opacity-70 text-sm">✦</div>
        <div className="absolute top-2/3 right-1/4 text-[#B99BE8] animate-pulse opacity-75 text-lg">✧</div>
      </div>

      {/* ========================================================
          TOP HEADER
          ======================================================== */}
      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F3A6C8] via-[#FFD85A] to-[#74C7F5] p-[2.5px] shadow-md hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#FFFDF9] rounded-[13px] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#B99BE8] fill-[#F3A6C8]/40" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-wide text-[#40304F] font-serif-literary leading-none">
                INKTALK
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD85A] text-[#30243D] font-extrabold shadow-2xs">
                AI MYSTERY
              </span>
            </div>
            <p className="text-[11px] font-extrabold tracking-widest text-[#74C7F5] uppercase mt-0.5">
              Văn học & Manh mối THPT
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full bg-[#FFFDF9]/90 border-2 border-[#FFD85A] text-xs font-bold text-[#40304F] shadow-sm">
          <Sparkles className="w-4 h-4 text-[#FFD85A] fill-[#FFD85A]" />
          <span>Thế Giới Đối Thoại Văn Học Trực Tiếp</span>
        </div>
      </header>

      {/* ========================================================
          CENTER HERO: Glowing Tome + Poetic Lines + Start Button
          ======================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto my-auto py-8">
        {/* Layer 3 - Foreground: Glowing Open Book Tome with Radiant Aura */}
        <div className="relative mb-6 group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#FFD85A] via-[#F3A6C8] to-[#B99BE8] p-[3px] shadow-xl vivid-glow-yellow transition-transform duration-500 group-hover:scale-110">
            <div className="w-full h-full rounded-[21px] bg-[#FFFDF9] flex flex-col items-center justify-center relative overflow-hidden">
              <BookOpen className="w-12 h-12 text-[#40304F] drop-shadow-sm" />
              <div className="absolute bottom-1 w-12 h-1 bg-[#FFD85A] rounded-full" />
            </div>
          </div>
          {/* Accent Badges */}
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#FFD85A] border-2 border-[#FFFDF9] flex items-center justify-center shadow-md animate-bounce">
            <Sparkles className="w-4 h-4 text-[#30243D]" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-[#74C7F5] border-2 border-[#FFFDF9] flex items-center justify-center shadow-md">
            <Star className="w-3.5 h-3.5 text-[#FFFDF9] fill-[#FFFDF9]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-[#40304F] tracking-tight font-serif-literary mb-4 drop-shadow-xs">
          INKTALK
        </h1>

        {/* Poetic Core Lines */}
        <div className="space-y-1.5 sm:space-y-2.5 mb-8 text-xl sm:text-3xl md:text-4xl text-[#30243D] font-serif-literary font-semibold tracking-wide">
          <p className="hover:text-[#F3A6C8] transition-colors">“Bước vào câu chuyện.</p>
          <p className="hover:text-[#FFD85A] transition-colors">Lắng nghe nhân vật.</p>
          <p className="hover:text-[#74C7F5] transition-colors">Tìm ra điều bị bỏ quên.”</p>
        </div>

        {/* Subtitle */}
        <p className="max-w-xl text-sm sm:text-base text-[#40304F]/85 font-medium mb-10 leading-relaxed bg-[#FFFDF9]/60 px-5 py-2.5 rounded-2xl border border-[#FFD85A]/30 backdrop-blur-xs">
          Không chỉ đọc tác phẩm từ xa. Hãy trực tiếp trò chuyện với nhân vật trong trang sách, phát hiện từng manh mối nhỏ và giải mã ẩn số văn học THPT.
        </p>

        {/* START BUTTON: Gradient Pink → Purple with Yellow Glow */}
        <button
          onClick={onStart}
          id="btn-splash-start"
          className="group relative inline-flex items-center justify-center px-10 sm:px-14 py-4 sm:py-5 text-lg sm:text-xl font-black tracking-wider text-[#FFFDF9] bg-gradient-to-r from-[#F3A6C8] via-[#FF8FA3] to-[#B99BE8] rounded-3xl shadow-xl vivid-glow-yellow hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden border-2 border-[#FFFDF9]"
        >
          {/* Subtle light shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform" />

          <span className="relative z-10 flex items-center space-x-3 text-[#FFFDF9] drop-shadow-md">
            <span>BẮT ĐẦU HÀNH TRÌNH</span>
            <div className="w-8 h-8 rounded-full bg-[#FFD85A] text-[#30243D] flex items-center justify-center shadow-sm group-hover:translate-x-1.5 transition-transform">
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </div>
          </span>
        </button>
      </main>

      {/* ========================================================
          FOOTER
          ======================================================== */}
      <footer className="relative z-10 py-5 text-center text-xs font-semibold text-[#40304F]/70">
        <p>© 2026 InkTalk • Văn học & Manh mối THPT • Khám phá qua đối thoại nhân vật sống động</p>
      </footer>
    </div>
  );
};
