import React, { useState } from 'react';
import { api, setStoredToken, type User } from '../lib/api';
import { Lock, User as UserIcon, LogIn, UserPlus, ShieldCheck, Eye, EyeOff, CheckSquare, Square, Heart, Sparkles } from 'lucide-react';

interface Props {
  onSuccess: (user: User) => void;
}

export default function AuthModal({ onSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Mặc định luôn duy trì đăng nhập
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ username: username.trim(), password: password.trim() });
        setStoredToken(res.token, rememberMe);
        onSuccess(res.user);
      } else {
        const res = await api.register({
          username: username.trim(),
          password: password.trim(),
          name: name.trim() || undefined
        });
        setStoredToken(res.token, rememberMe);
        onSuccess(res.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-zinc-800 transition-colors">
        {/* Header với icon */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20 shadow-inner">
            <span className="text-2xl font-black">₫</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center justify-center gap-1.5">
            <span>Tiền Đâu Rồi?</span>
          </h2>
          <p className="text-xs text-blue-100/90 mt-1 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
            Sổ thu chi &amp; quản lý tài chính thông minh
          </p>
        </div>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isLogin ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              !isLogin ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Đăng ký mới
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isLogin && (
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
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ít nhất 4 ký tự"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Nút bật/tắt hiển thị mật khẩu */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
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
              className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-zinc-100 transition-colors select-none"
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
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản & Bắt đầu'}
          </button>

          <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500 pt-1">
            Mỗi người có một tài khoản riêng. Dữ liệu luôn hoàn toàn bảo mật và không ai khác có thể xem.
          </p>

          {/* Watermark / Tác giả */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-500 dark:text-zinc-400 font-medium select-none shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Designed &amp; Crafted with</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0 animate-pulse" />
              <span>by <strong className="text-slate-800 dark:text-zinc-100 font-bold">Hoàng</strong></span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
