import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  BookOpen,
  Key,
  Award,
  Sparkles,
  Flame,
  Gem,
  MessageSquare,
  Compass,
  Settings,
  LogOut,
} from 'lucide-react';
import type { ReadingJourney, User } from '../types';
import { getPlayerJourney, dailyCheckin } from '../services/api';

interface ReadingJourneyViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout?: () => void;
}

export const ReadingJourneyView: React.FC<ReadingJourneyViewProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [journey, setJourney] = useState<ReadingJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPlayerJourney(user.id)
      .then((data) => {
        if (isMounted) setJourney(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const handleDailyBonus = async () => {
    try {
      const result = await dailyCheckin(user.id);
      if (result.diamondsAdded > 0) {
        setCheckinMsg(`✨ Điểm danh thành công! Bạn nhận được +${result.diamondsAdded} 💎`);
        onUpdateUser(result.user);
      } else {
        setCheckinMsg('Hôm nay bạn đã nhận thưởng điểm danh rồi. Hãy quay lại vào ngày mai nhé!');
      }
    } catch (err: any) {
      setCheckinMsg(err?.message || 'Không thể điểm danh.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Profile Banner */}
      <div className="bg-[#FFFCFA] rounded-3xl border border-[#F5D889]/60 shadow-sm p-6 sm:p-8 paper-texture mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#F3B8C8] via-[#F5D889] to-[#C9B5EA] p-1 shadow-md">
              <div className="w-full h-full bg-[#FFFCFA] rounded-[22px] flex items-center justify-center text-3xl font-bold font-serif-literary text-[#493C5A]">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif-literary text-[#332B35]">
                  {user.username}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5D889]/40 text-[#5A4650] text-[11px] font-bold">
                  Độc giả THPT
                </span>
              </div>
              <p className="text-xs text-[#6F91AA] mt-1">
                Gia nhập: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </p>

              {/* Diamond & Checkin Action */}
              <div className="mt-3 flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#FFF8F1] border border-[#F5D889] text-xs font-bold text-[#332B35]">
                  <Gem className="w-3.5 h-3.5 text-[#F5D889] fill-[#F5D889]/40" />
                  <span>{user.diamonds} 💎</span>
                </div>
                <button
                  onClick={handleDailyBonus}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#F5D889] hover:shadow-sm text-xs font-semibold text-[#332B35] transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#5A4650]" />
                  <span>Điểm danh hằng ngày (+100 💎)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {checkinMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-[#A9D8F5]/20 border border-[#A9D8F5]/40 text-xs text-[#332B35] text-center">
            {checkinMsg}
          </div>
        )}
      </div>

      {/* Profile Navigation & Account Settings Card (Requirement 8) */}
      <div className="bg-[#FFFCFA] rounded-3xl border border-[#F5D889]/60 shadow-sm p-6 paper-texture mb-8">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-[#F5D889]/30">
          <div className="w-8 h-8 rounded-xl bg-[#FFF5E8] border border-[#F5D889] flex items-center justify-center text-[#40304F]">
            <UserIcon className="w-4 h-4 text-[#F3A6C8]" />
          </div>
          <div>
            <h3 className="text-base font-bold font-serif-literary text-[#332B35]">
              Hồ sơ
            </h3>
            <p className="text-[11px] text-[#6F91AA]">
              Thông tin tài khoản độc giả và quản lý phiên đăng nhập
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#F5D889]/20 text-xs">
          {/* Tài khoản của tôi */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 font-semibold text-[#5A4650]">
              <div className="w-8 h-8 rounded-xl bg-[#F3A6C8]/20 flex items-center justify-center text-[#493C5A]">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[#332B35] font-bold">Tài khoản của tôi</span>
                <span className="text-[11px] text-[#6F91AA]">Độc giả chính thức InkTalk THPT</span>
              </div>
            </div>
            <span className="font-bold text-[#332B35] bg-[#FFF8F1] px-3 py-1 rounded-xl border border-[#F5D889]/40">
              {user.username}
            </span>
          </div>

          {/* Thành tích */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 font-semibold text-[#5A4650]">
              <div className="w-8 h-8 rounded-xl bg-[#B99BE8]/20 flex items-center justify-center text-[#493C5A]">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[#332B35] font-bold">Thành tích</span>
                <span className="text-[11px] text-[#6F91AA]">Huy hiệu & tiến trình đọc đã tích lũy</span>
              </div>
            </div>
            <span className="font-bold text-[#332B35] bg-[#FFF8F1] px-3 py-1 rounded-xl border border-[#F5D889]/40">
              {journey?.badges?.filter((b) => !!b.unlockedAt).length || 0} / {journey?.badges?.length || 8} huy hiệu
            </span>
          </div>

          {/* Số dư Diamond */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 font-semibold text-[#5A4650]">
              <div className="w-8 h-8 rounded-xl bg-[#FFD85A]/30 flex items-center justify-center text-[#493C5A]">
                <Gem className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[#332B35] font-bold">Số dư Diamond</span>
                <span className="text-[11px] text-[#6F91AA]">Dùng để giải mã manh mối & trò chuyện</span>
              </div>
            </div>
            <span className="font-bold text-[#332B35] bg-[#FFF8F1] px-3 py-1 rounded-xl border border-[#F5D889]/40 flex items-center space-x-1">
              <span>{user.diamonds}</span>
              <span>💎</span>
            </span>
          </div>

          {/* Cài đặt */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3 font-semibold text-[#5A4650]">
              <div className="w-8 h-8 rounded-xl bg-[#74C7F5]/20 flex items-center justify-center text-[#493C5A]">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[#332B35] font-bold">Cài đặt</span>
                <span className="text-[11px] text-[#6F91AA]">Hiển thị giao diện & tùy chọn đọc</span>
              </div>
            </div>
            <span className="text-[11px] text-[#6F91AA]">Vivid Pastel Literary • Tiếng Việt</span>
          </div>

          {/* Đăng xuất */}
          <div className="pt-3.5 flex items-center justify-between">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              id="btn-player-logout"
              className="flex items-center space-x-3 font-semibold text-[#A84A5D] hover:text-[#D13B53] transition-colors py-1 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#F3A6C8]/30 group-hover:bg-[#F3A6C8]/50 flex items-center justify-center text-[#A84A5D] transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-bold">Đăng xuất</span>
            </button>
            <span className="text-[11px] text-[#6F91AA]">Rời phiên làm việc hiện tại</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Player Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332B35]/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-[#FFFCFA] rounded-3xl border border-[#F3B8C8] shadow-2xl p-6 text-center paper-texture">
            <div className="w-12 h-12 rounded-2xl bg-[#F3B8C8]/30 mx-auto mb-4 flex items-center justify-center text-[#493C5A]">
              <LogOut className="w-6 h-6 text-[#A84A5D]" />
            </div>
            <h4 className="text-base font-bold font-serif-literary text-[#332B35] mb-2">
              Bạn muốn đăng xuất khỏi InkTalk?
            </h4>
            <p className="text-xs text-[#6F91AA] mb-6 leading-relaxed">
              Tài khoản, lịch sử đối thoại, manh mối thu thập và số dư Diamond của bạn sẽ được lưu giữ nguyên vẹn.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                id="btn-logout-stay"
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#C9B5EA]/60 text-xs font-bold text-[#5A4650] hover:bg-[#FFF8F1] transition-colors cursor-pointer"
              >
                Ở LẠI
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }}
                id="btn-logout-confirm"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F3B8C8] to-[#FF8FA3] text-xs font-bold text-[#FFFDF9] shadow-sm hover:shadow transition-all cursor-pointer"
              >
                ĐĂNG XUẤT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READING JOURNEY (Section XXV) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35] flex items-center space-x-2">
              <Compass className="w-5 h-5 text-[#F5D889]" />
              <span>HÀNH TRÌNH ĐỌC (READING JOURNEY)</span>
            </h2>
            <p className="text-xs text-[#6F91AA]">
              Lưu giữ những cuộc đối thoại, suy tư và manh mối bạn đã từng bước chạm tới
            </p>
          </div>
        </div>

        {/* 6 Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#F3B8C8]/50 text-center shadow-xs">
            <BookOpen className="w-5 h-5 mx-auto mb-1.5 text-[#F3B8C8]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.charactersExplored || 0}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Nhân vật</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#F5D889]/50 text-center shadow-xs">
            <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-[#F5D889]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.worksExplored || 0}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Tác phẩm</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#A9D8F5]/50 text-center shadow-xs">
            <Key className="w-5 h-5 mx-auto mb-1.5 text-[#A9D8F5]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.cluesSolved || 0}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Manh mối</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#C9B5EA]/50 text-center shadow-xs">
            <MessageSquare className="w-5 h-5 mx-auto mb-1.5 text-[#C9B5EA]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.totalMessages || 0}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Lượt hỏi</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#F5D889]/50 text-center shadow-xs">
            <Award className="w-5 h-5 mx-auto mb-1.5 text-[#F5D889]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.completedMysteries || 0}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Phá đảo</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCFA] border border-[#F3B8C8]/50 text-center shadow-xs">
            <Flame className="w-5 h-5 mx-auto mb-1.5 text-[#F3B8C8]" />
            <div className="text-xl sm:text-2xl font-bold font-serif-literary text-[#332B35]">
              {journey?.streakDays || 1}
            </div>
            <div className="text-[11px] text-[#6F91AA] font-semibold">Chuỗi ngày</div>
          </div>
        </div>

        {/* Empty state when progress = 0 */}
        {journey && journey.charactersExplored === 0 && (
          <div className="text-center py-10 px-6 rounded-3xl bg-[#FFFCFA] border border-[#F5D889]/40 paper-texture mb-8">
            <p className="font-serif-literary text-lg text-[#5A4650] mb-1">
              “Hành trình của bạn bắt đầu từ câu hỏi đầu tiên.”
            </p>
            <p className="text-xs text-[#6F91AA]">
              Hãy trở về Thư viện để chọn một nhân vật và mở ra cuộc trò chuyện đầu tiên.
            </p>
          </div>
        )}

        {/* Badges / Achievements List */}
        <div className="bg-[#FFFCFA] rounded-3xl border border-[#F5D889]/40 p-6 sm:p-8 paper-texture shadow-xs">
          <h3 className="text-lg font-bold font-serif-literary text-[#332B35] mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#F5D889]" />
            <span>Huy Hiệu Độc Giả (Badges)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {journey?.badges.map((badge) => {
              const isUnlocked = !!badge.unlockedAt;
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isUnlocked
                      ? 'bg-white border-[#F5D889] shadow-xs'
                      : 'bg-[#FFF8F1]/60 border-dashed border-[#C9B5EA]/40 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isUnlocked
                            ? 'bg-gradient-to-tr from-[#F3B8C8] to-[#F5D889] text-[#332B35]'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Award className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isUnlocked
                            ? 'bg-[#A9D8F5]/40 text-[#332B35]'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isUnlocked ? 'Đã đạt' : 'Chưa mở'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#332B35] mb-1 font-serif-literary">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-[#6F91AA] leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                  {isUnlocked && badge.unlockedAt && (
                    <span className="text-[10px] text-[#6F91AA] mt-3 pt-2 border-t border-[#FFF8F1]">
                      Đạt ngày: {new Date(badge.unlockedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
