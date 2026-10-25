import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  thisMonthRange,
  type Transaction,
  type FilterParams,
  type User
} from '../lib/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import Dashboard from '../components/Dashboard';
import ImportModal from '../components/ImportModal';
import AuthModal from '../components/AuthModal';
import { LayoutDashboard, List, Upload, LogOut, User as UserIcon } from 'lucide-react';

const PAGE_SIZE = 30;

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<FilterParams>(thisMonthRange());
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [showImport, setShowImport] = useState(false);

  // Kiểm tra phiên đăng nhập hiện tại
  useEffect(() => {
    api
      .getMe()
      .then(res => setCurrentUser(res.user))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));

    const onAuthLogout = () => setCurrentUser(null);
    window.addEventListener('auth_logout', onAuthLogout);
    return () => window.removeEventListener('auth_logout', onAuthLogout);
  }, []);

  const fetchTransactions = useCallback(
    async (f: FilterParams, off: number, replace: boolean) => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await api.getTransactions({ ...f, limit: PAGE_SIZE, offset: off });
        setTransactions(prev => (replace ? res.data : [...prev, ...res.data]));
        setTotal(res.total);
      } catch {
        // lỗi tải dữ liệu
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (currentUser) {
      setOffset(0);
      fetchTransactions(filters, 0, true);
    }
  }, [currentUser, filters, fetchTransactions]);

  function handleLoadMore() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchTransactions(filters, newOffset, false);
  }

  function handleCreated(_t: Transaction) {
    setOffset(0);
    fetchTransactions(filters, 0, true);
  }

  function handleDeleted(id: number) {
    setTransactions(prev => prev.filter(t => t.id !== id));
    setTotal(prev => prev - 1);
  }

  function handleUpdated(updated: Transaction) {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  }

  async function handleLogout() {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      await api.logout();
      setCurrentUser(null);
      setTransactions([]);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modal đăng nhập / đăng ký nếu chưa có tài khoản */}
      {!currentUser && (
        <AuthModal
          onSuccess={u => {
            setCurrentUser(u);
          }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-200">
              ₫
            </div>
            <div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">FinanceTracker</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Import */}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Tab switcher — Giao dịch trước */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Giao dịch</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Tổng quan</span>
              </button>
            </div>

            {/* Thông tin tài khoản & Đăng xuất */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-100 ml-1">
                <div
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 border border-slate-100"
                  title={`Đang đăng nhập: ${currentUser.username}`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span className="max-w-[100px] truncate">{currentUser.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-5">
          {/* Sidebar trái — Form thêm (desktop) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20">
              <TransactionForm onCreated={handleCreated} />
            </div>
          </aside>

          {/* Vùng nội dung chính */}
          <main className="flex-1 min-w-0 space-y-4">
            {/* Mobile: form thêm */}
            <div className="lg:hidden">
              <TransactionForm onCreated={handleCreated} />
            </div>

            {/* Thanh lọc */}
            <FilterBar filters={filters} onFiltersChange={f => setFilters(f)} />

            {/* Nội dung tab */}
            {activeTab === 'list' ? (
              <TransactionList
                transactions={transactions}
                total={total}
                loading={loading}
                filters={filters}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
                onLoadMore={handleLoadMore}
              />
            ) : (
              <Dashboard filters={filters} />
            )}
          </main>
        </div>
      </div>

      {/* Modal Import */}
      {showImport && (
        <ImportModal
          onImported={() => {
            setOffset(0);
            fetchTransactions(filters, 0, true);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
