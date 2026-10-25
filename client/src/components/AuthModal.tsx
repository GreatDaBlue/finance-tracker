import React, { useState } from 'react';
import { api, setStoredToken, type User } from '../lib/api';
import { Lock, User as UserIcon, LogIn, UserPlus, ShieldCheck } from 'lucide-react';

interface Props {
  onSuccess: (user: User) => void;
}

export default function AuthModal({ onSuccess }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
        setStoredToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.register({
          username: username.trim(),
          password: password.trim(),
          name: name.trim() || undefined
        });
        setStoredToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">

        {/* Header với icon */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
            <span className="text-2xl font-bold">₫</span>
          </div>
          <h2 className="text-xl font-bold">FinanceTracker</h2>
          <p className="text-xs text-blue-100 mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sổ thu chi cá nhân an toàn & bảo mật
          </p>
        </div>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LogIn className="w-4 h-4" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              !isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Đăng ký mới
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên của bạn (hoặc biệt danh)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ví dụ: Tuấn Anh, Lan Anh..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoCapitalize="none"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ví dụ: tuan123, minh_chau"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ít nhất 4 ký tự"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản & Bắt đầu'}
          </button>

          <p className="text-[11px] text-center text-slate-400 pt-1">
            Mỗi người có một tài khoản riêng. Dữ liệu của bạn hoàn toàn bảo mật và không ai khác có thể xem.
          </p>
        </form>
      </div>
    </div>
  );
}
