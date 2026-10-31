import React, { useState } from 'react';
import { api, setStoredToken, type User } from '../lib/api';
import {
  Lock,
  User as UserIcon,
  LogIn,
  UserPlus,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Heart,
  Sparkles,
  Mail,
  ArrowLeft,
  KeyRound,
  CheckCircle2
} from 'lucide-react';

interface Props {
  onSuccess: (user: User, rememberMe?: boolean) => void;
}

type Mode = 'login' | 'register' | 'forgot';

export default function AuthModal({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login');

  // Login / Register fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password fields
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotSimulatedOtp, setForgotSimulatedOtp] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // Common status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Xử lý Đăng nhập / Đăng ký
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    if (mode === 'register' && password.trim().length < 8) {
      setError('Mật khẩu đăng ký phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ username: username.trim(), password: password.trim() });
        setStoredToken(res.token, rememberMe);
        onSuccess(res.user, rememberMe);
      } else if (mode === 'register') {
        const res = await api.register({
          username: username.trim(),
          password: password.trim(),
          name: name.trim() || undefined,
          email: email.trim() || undefined
        });
        setStoredToken(res.token, rememberMe);
        onSuccess(res.user, rememberMe);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  // Chuyển sang màn hình Quên mật khẩu
  function handleGoToForgot() {
    setMode('forgot');
    setForgotStep(1);
    setError('');
    setForgotIdentifier(username.trim());
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotSimulatedOtp('');
  }

  // Bước 1: Gửi mã OTP về Gmail
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!forgotIdentifier.trim()) {
      setError('Vui lòng nhập tên đăng nhập hoặc địa chỉ Gmail đã liên kết');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotIdentifier.trim());
      setForgotMaskedEmail(res.maskedEmail);
      if (res.simulatedOtp) {
        setForgotSimulatedOtp(res.simulatedOtp);
      }
      setForgotStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể gửi mã xác thực, vui lòng kiểm tra lại');
    } finally {
      setLoading(false);
    }
  }

  // Bước 2: Xác nhận mã OTP & Đặt mật khẩu mới
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!forgotOtp.trim()) {
      setError('Vui lòng nhập mã OTP 6 chữ số đã được gửi tới Gmail của bạn');
      return;
    }

    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    if (forgotNewPassword.trim() !== forgotConfirmPassword.trim()) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        identifier: forgotIdentifier.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword.trim()
      });
      setStoredToken(res.token, true);
      onSuccess(res.user, true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-zinc-800 transition-colors max-h-[90dvh] flex flex-col my-auto">
        {/* Header với icon */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl mx-auto mb-3 border border-white/25 shadow-lg overflow-hidden">
            <img src="/logo.png" alt="Tiền Đâu Rồi Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center justify-center gap-1.5">
            <span>Tiền Đâu Rồi?</span>
          </h2>
          <p className="text-xs text-blue-100/90 mt-1 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            {mode === 'forgot'
              ? 'Lấy lại mật khẩu qua Gmail bảo mật'
              : 'Sổ thu chi & quản lý tài chính thông minh'}
          </p>
        </div>

        {/* Tab Đăng nhập / Đăng ký (ẩn khi đang ở màn hình Quên mật khẩu) */}
        {mode !== 'forgot' ? (
          <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-4 h-4" /> Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Đăng ký mới
            </button>
          </div>
        ) : (
          /* Header điều hướng khi Quên mật khẩu */
          <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Đăng nhập
            </button>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
              Bước {forgotStep}/2
            </span>
          </div>
        )}

        {/* ═══════════════ FORM ĐĂNG NHẬP & ĐĂNG KÝ ═══════════════ */}
        {mode !== 'forgot' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Tên hiển thị (hoặc biệt danh)
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ví dụ: Tuấn Anh, Lan Anh..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      Địa chỉ Gmail liên kết
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Khuyên dùng để lấy lại mật khẩu
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoCapitalize="none"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="vidu@gmail.com (tùy chọn)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoCapitalize="none"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ví dụ: tuan123, minh_chau"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  Mật khẩu
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleGoToForgot}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ít nhất 4 ký tự"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nút duy trì đăng nhập */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors select-none cursor-pointer"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                )}
                <span>Duy trì đăng nhập (không cần đăng nhập lại lần sau)</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản & Bắt đầu'}
            </button>

            <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500 pt-1">
              Mỗi người có một tài khoản riêng. Dữ liệu luôn hoàn toàn bảo mật và không ai khác có thể xem.
            </p>

            {/* Watermark */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-500 dark:text-zinc-400 font-medium select-none shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Designed &amp; Crafted with</span>
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0 animate-pulse" />
                <span>by <strong className="text-slate-800 dark:text-zinc-100 font-bold">Hoàng</strong></span>
              </div>
            </div>
          </form>
        )}

        {/* ═══════════════ FORM QUÊN MẬT KHẨU ═══════════════ */}
        {mode === 'forgot' && (
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* BƯỚC 1: Nhập Tên đăng nhập hoặc Gmail */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">
                    Tìm tài khoản cần lấy lại mật khẩu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    Nhập <strong>Tên đăng nhập</strong> hoặc <strong>địa chỉ Gmail</strong> bạn đã liên kết với tài khoản. Hệ thống sẽ gửi mã OTP 6 số để xác minh danh tính.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Tên đăng nhập hoặc Gmail
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoCapitalize="none"
                      value={forgotIdentifier}
                      onChange={e => setForgotIdentifier(e.target.value)}
                      placeholder="Ví dụ: tuan123 hoặc tuan@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 px-3.5 py-2.5 rounded-xl text-xs font-medium leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  {loading ? 'Đang gửi mã OTP...' : 'Gửi mã xác thực về Gmail'}
                </button>
              </form>
            )}

            {/* BƯỚC 2: Nhập mã OTP & Đặt mật khẩu mới */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 p-3 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Đã gửi mã xác thực thành công!</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-blue-800/90 dark:text-blue-300">
                    Mã xác nhận 6 số đã được gửi tới hộp thư <strong>{forgotMaskedEmail}</strong>. Mã này có hiệu lực trong <strong>15 phút</strong>.
                  </p>
                </div>

                {/* Banner hỗ trợ nếu chạy chế độ thử nghiệm (chỉ hiện ở DEV mode) */}
                {import.meta.env.DEV && forgotSimulatedOtp && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 p-2.5 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[11px] uppercase tracking-wider block">Mã thử nghiệm (Dev Mode):</span>
                      <strong className="text-base font-mono font-black text-amber-700 dark:text-amber-300">{forgotSimulatedOtp}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotOtp(forgotSimulatedOtp)}
                      className="px-2 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Điền nhanh
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Nhập mã OTP (6 chữ số)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-base font-mono tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      placeholder="Ít nhất 4 ký tự"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Xác nhận lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={e => setForgotConfirmPassword(e.target.value)}
                      placeholder="Nhập lại đúng mật khẩu trên"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 px-3.5 py-2.5 rounded-xl text-xs font-medium leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {loading ? 'Đang cập nhật mật khẩu...' : 'Đổi mật khẩu & Đăng nhập ngay'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setError('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Chưa nhận được mã? Gửi lại mã OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
