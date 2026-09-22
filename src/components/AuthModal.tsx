import React, { useState } from 'react';
import { X, Sparkles, KeyRound, User as UserIcon, Lock, CheckCircle2 } from 'lucide-react';
import { loginPlayer, registerPlayer } from '../services/api';
import type { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, welcomeBonus?: boolean, adminToken?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không trùng khớp.');
          setLoading(false);
          return;
        }
        const data = await registerPlayer(username.trim(), password, confirmPassword);
        onSuccess(data.user, true);
        onClose();
      } else {
        const data = await loginPlayer(username.trim(), password);
        onSuccess(data.user, false, data.adminToken);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332B35]/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#FFFCFA] rounded-3xl border border-[#F3B8C8]/60 shadow-2xl p-6 sm:p-8 overflow-hidden paper-texture">
        {/* Soft pastel ambient background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#F5D889]/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#C9B5EA]/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#F3B8C8]/30 text-[#5A4650] transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#F3B8C8]/50 via-[#F5D889]/50 to-[#A9D8F5]/50 mb-3 shadow-inner">
            <KeyRound className="w-6 h-6 text-[#493C5A]" />
          </div>
          <h2 className="text-2xl font-bold font-serif-literary text-[#332B35]">
            {isRegister ? 'Tạo Thẻ Độc Giả' : 'Chào Mừng Trở Lại'}
          </h2>
          <p className="text-xs text-[#6F91AA] mt-1">
            {isRegister
              ? 'Đăng ký tài khoản để nhận ngay 500 💎 và bắt đầu trò chuyện.'
              : 'Đăng nhập để tiếp tục khám phá các tác phẩm THPT.'}
          </p>
        </div>

        {/* Bonus badge for registration */}
        {isRegister && (
          <div className="mb-5 flex items-center space-x-2 p-3 rounded-2xl bg-[#FFF8F1] border border-[#F5D889] text-xs text-[#5A4650]">
            <Sparkles className="w-4 h-4 text-[#F5D889] shrink-0" />
            <span>Tặng ngay <strong>+500 💎</strong> cho lần đầu khởi tạo tài khoản!</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#F3B8C8]/40 border border-[#F3B8C8] text-xs text-[#493C5A]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4650] mb-1.5">
              Tên người chơi / Bút danh
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#6F91AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: Hoài Thanh, Lan Viên..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white text-sm text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A4650] mb-1.5">
              Mật khẩu (bạn tự đặt)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6F91AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white text-sm text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] transition-all"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#5A4650] mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <CheckCircle2 className="w-4 h-4 text-[#6F91AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#C9B5EA]/50 bg-white text-sm text-[#332B35] focus:outline-none focus:ring-2 focus:ring-[#F3B8C8] transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-[#332B35] bg-gradient-to-r from-[#F3B8C8] via-[#F5D889] to-[#A9D8F5] shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {loading
              ? 'Đang xử lý...'
              : isRegister
              ? 'Hoàn tất Đăng ký (+500 💎)'
              : 'Đăng nhập vào Thư viện'}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-6 text-center text-xs text-[#5A4650]">
          {isRegister ? (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="font-bold text-[#493C5A] underline hover:text-[#332B35]"
              >
                Đăng nhập ngay
              </button>
            </p>
          ) : (
            <p>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="font-bold text-[#493C5A] underline hover:text-[#332B35]"
              >
                Đăng ký mới (+500 💎)
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
