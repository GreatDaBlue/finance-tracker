import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  thisMonthRange,
  setStoredUser,
  getUserDisplayName,
  type Transaction,
  type FilterParams,
  type User
} from '../lib/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import Dashboard from '../components/Dashboard';
import BudgetManager from '../components/BudgetManager';
import DebtManager from '../components/DebtManager';
import RecurringModal from '../components/RecurringModal';
import ImportModal from '../components/ImportModal';
import AuthModal from '../components/AuthModal';
import SideDrawer from '../components/SideDrawer';
import InstallGuideModal from '../components/InstallGuideModal';
import InstallSmartBanner from '../components/InstallSmartBanner';
import AnimalAvatarGraphic from '../components/AnimalAvatarGraphic';
import { getAnimalAvatar } from '../lib/animalAvatars';
import { exportToExcel, exportToCSV } from '../lib/exportUtils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BookOpenCheck,
  Target,
  Upload,
  LogOut,
  User as UserIcon,
  FileSpreadsheet,
  Download,
  Receipt,
  Repeat,
  Sun,
  Moon,
  Menu
} from 'lucide-react';

const PAGE_SIZE = 30;

const NAV_TABS = [
  { id: 'list', label: 'Giao dịch', icon: ArrowLeftRight },
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'budget', label: 'Hạn mức', icon: Target },
  { id: 'debt', label: 'Sổ nợ', icon: BookOpenCheck },
] as const;

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<FilterParams>(thisMonthRange());
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard' | 'budget' | 'debt'>('list');
  const [showImport, setShowImport] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Theo dõi các tab đã từng mở ít nhất 1 lần để lazy-load và giữ component trong RAM (Keep-Alive)
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ list: true });

  useEffect(() => {
    setVisitedTabs(prev => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
    // Khi chuyển sang tab dashboard, kích hoạt nhẹ event resize để Recharts tính toán lại kích thước biểu đồ chuẩn xác
    if (activeTab === 'dashboard') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Lắng nghe sự kiện cài đặt PWA của trình duyệt (Android Chrome, Edge, Chromium)
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Chế độ Tối (Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Đảm bảo không còn lưu lại trạng thái ẩn số dư
  useEffect(() => {
    document.documentElement.classList.remove('privacy-mode');
    try {
      localStorage.removeItem('tiendauroi_privacy_mode');
    } catch {}
  }, []);

  const currentAnimalAvatar = getAnimalAvatar(currentUser?.avatar);

  // Kiểm tra phiên đăng nhập hiện tại
  useEffect(() => {
    api
      .getMe()
      .then(res => {
        setCurrentUser(res.user);
        setStoredUser(res.user);
      })
      .catch(() => {
        setCurrentUser(null);
        setStoredUser(null);
      })
      .finally(() => setAuthChecking(false));

    const onAuthLogout = () => {
      setCurrentUser(null);
      setStoredUser(null);
    };
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
    setRefreshKey(k => k + 1);
  }

  function handleDeleted(id: number) {
    const next = transactions.filter(t => t.id !== id);
    const nextTotal = Math.max(0, total - 1);
    setTransactions(next);
    setTotal(nextTotal);
    setRefreshKey(k => k + 1);

    // Nếu trang hiện tại không còn phần tử nào nhưng database vẫn còn giao dịch, tự động tải lại offset 0
    if (next.length === 0 && nextTotal > 0) {
      setOffset(0);
      fetchTransactions(filters, 0, true);
    }
  }

  function handleBatchDeleted(deletedIds: number[]) {
    const idSet = new Set(deletedIds);
    const next = transactions.filter(t => !idSet.has(t.id));
    const nextTotal = Math.max(0, total - deletedIds.length);
    setTransactions(next);
    setTotal(nextTotal);
    setRefreshKey(k => k + 1);

    if (next.length === 0 && nextTotal > 0) {
      setOffset(0);
      fetchTransactions(filters, 0, true);
    }
  }

  function handleAllDeleted() {
    setTransactions([]);
    setTotal(0);
    setOffset(0);
    setRefreshKey(k => k + 1);
  }

  function handleUpdated(updated: Transaction) {
    setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    setRefreshKey(k => k + 1);
  }

  async function handleLogout() {
    const userName = getUserDisplayName(currentUser);
    if (window.confirm(`${userName} có chắc chắn muốn đăng xuất không?`)) {
      await api.logout();
      setCurrentUser(null);
      setStoredUser(null);
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Modal đăng nhập / đăng ký nếu chưa có tài khoản */}
      {!currentUser && (
        <AuthModal
          onSuccess={u => {
            setCurrentUser(u);
            setStoredUser(u);
          }}
        />
      )}

      {/* Thanh Smart Banner hướng dẫn cài App PWA trên điện thoại / trình duyệt */}
      <InstallSmartBanner
        onOpenGuide={() => setShowInstallGuide(true)}
        deferredPrompt={deferredPrompt}
      />

      {/* Header */}
      <header className="bg-white dark:bg-zinc-900/90 border-b border-slate-100 dark:border-zinc-800 sticky top-0 z-40 w-full backdrop-blur-md transition-colors">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo & Tên app: Bấm vào mở Side Drawer */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 shrink-0 p-1 -ml-1 sm:p-1.5 sm:-ml-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all text-left group cursor-pointer"
            title="Nhấn để mở Menu & Hồ sơ cá nhân"
          >
            <div className="relative">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center p-0.5 text-white font-black text-sm sm:text-base shadow-sm group-hover:scale-105 transition-transform overflow-hidden ${
                currentAnimalAvatar
                  ? `bg-gradient-to-br ${currentAnimalAvatar.bgGradient}`
                  : 'bg-slate-900 dark:bg-zinc-800'
              }`}>
                {currentAnimalAvatar ? (
                  <AnimalAvatarGraphic avatarId={currentAnimalAvatar.id} className="w-full h-full object-contain filter drop-shadow-xs" />
                ) : (
                  <img src="/logo.png" alt="Tiền Đâu Rồi Logo" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-xs">
                ?
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 dark:text-zinc-100 text-sm sm:text-lg tracking-tight leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1">
                Tiền Đâu Rồi?
                <Menu className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors ml-0.5" />
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">
                Hồ sơ &amp; Cài đặt
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Nút Import */}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              title="Nhập dữ liệu từ file"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Import</span>
            </button>

            {/* Nút chuyển đổi Dark Mode (Sáng / Tối) */}
            <button
              type="button"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-90 duration-200" />
              )}
            </button>

            {/* Tab switcher trên Desktop: Giao dịch, Tổng quan, Hạn mức, Sổ nợ */}
            <div className="hidden md:flex rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80">
              {NAV_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Thông tin tài khoản & Nút Đăng xuất */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-zinc-700 ml-0.5 sm:ml-1">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Nhấn để mở Menu & Hồ sơ cá nhân"
                >
                  {currentAnimalAvatar ? (
                    <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 p-0.5 shadow-2xs">
                      <AnimalAvatarGraphic avatarId={currentAnimalAvatar.id} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="max-w-[100px] truncate">{currentUser.name || currentUser.username}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors border border-red-100 dark:border-red-900/60 shadow-sm"
                  title="Đăng xuất khỏi tài khoản"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-5 pb-24 md:pb-6">
        <div className="flex gap-5 w-full">
          {/* Sidebar trái — Form thêm (desktop) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20">
              <TransactionForm onCreated={handleCreated} user={currentUser} />
            </div>
          </aside>

          {/* Vùng nội dung chính */}
          <main className="w-full flex-1 min-w-0 space-y-4">
            {/* Mobile: form thêm — chỉ hiển thị ở tab Giao dịch */}
            {activeTab === 'list' && (
              <div className="lg:hidden">
                <TransactionForm onCreated={handleCreated} user={currentUser} />
              </div>
            )}

            {/* Thanh lọc — chỉ hiển thị ở tab Giao dịch */}
            {activeTab === 'list' && (
              <FilterBar filters={filters} onFiltersChange={f => setFilters(f)} />
            )}

            {/* Nội dung các tab — Cơ chế Keep-Alive: Lưu vào RAM khi mở lần đầu, chuyển tab 0ms tức thì */}
            {/* Tab 1: Giao dịch */}
            <div className={activeTab === 'list' ? 'block' : 'hidden'}>
              <TransactionList
                transactions={transactions}
                total={total}
                loading={loading}
                filters={filters}
                user={currentUser}
                onDeleted={handleDeleted}
                onBatchDeleted={handleBatchDeleted}
                onAllDeleted={handleAllDeleted}
                onUpdated={handleUpdated}
                onLoadMore={handleLoadMore}
              />
            </div>

            {/* Tab 2: Tổng quan & Biểu đồ (Keep-Alive sau khi mở lần đầu) */}
            {visitedTabs['dashboard'] && (
              <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
                <Dashboard
                  filters={thisMonthRange()}
                  user={currentUser}
                  onSwitchTab={setActiveTab}
                  refreshKey={refreshKey}
                />
              </div>
            )}

            {/* Tab 3: Hạn mức ngân sách (Keep-Alive sau khi mở lần đầu) */}
            {visitedTabs['budget'] && (
              <div className={activeTab === 'budget' ? 'block' : 'hidden'}>
                <BudgetManager
                  refreshKey={refreshKey}
                  onOpenRecurring={() => setShowRecurring(true)}
                  user={currentUser}
                />
              </div>
            )}

            {/* Tab 4: Sổ nợ & Thẻ tín dụng (Keep-Alive sau khi mở lần đầu) */}
            {visitedTabs['debt'] && (
              <div className={activeTab === 'debt' ? 'block' : 'hidden'}>
                <DebtManager
                  refreshKey={refreshKey}
                  user={currentUser}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Side Drawer (Ngăn kéo menu & cài đặt hồ sơ) */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={currentUser}
        onUserUpdated={u => {
          setCurrentUser(u);
          setStoredUser(u);
        }}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenImport={() => {
          setIsDrawerOpen(false);
          setShowImport(true);
        }}
        onOpenInstallGuide={() => {
          setIsDrawerOpen(false);
          setShowInstallGuide(true);
        }}
      />

      {/* Modal Hướng dẫn cài đặt App (PWA) trên điện thoại */}
      <InstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setDeferredPrompt(null)}
      />

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

      {/* Modal Quản lý khoản chi lặp lại */}
      {showRecurring && (
        <RecurringModal
          user={currentUser}
          onClose={() => setShowRecurring(false)}
          onChanged={() => {
            setOffset(0);
            fetchTransactions(filters, 0, true);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* Thanh điều hướng Mobile (Bottom Navigation Bar) */}
      <nav
        aria-label="Thanh điều hướng chuyển tab trên điện thoại"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-zinc-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] dark:shadow-black/60 md:hidden px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto items-center">
          {NAV_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-150 select-none ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/90 dark:bg-blue-950/70 shadow-xs'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                <Icon
                  className="w-[19px] h-[19px]"
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span className="text-[10.5px] leading-tight tracking-tight mt-1">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
