import React, { useState, useEffect, useMemo } from 'react';
import { api, formatVND, getUserDisplayName, type BudgetResponse, type BudgetItem, type User } from '../lib/api';
import { DANH_MUC, getCategoryIcon, parseAmountInput } from '../lib/smartParser';
import { getAllCategories } from '../lib/customCategories';
import { Target, AlertTriangle, AlertCircle, CheckCircle2, Plus, Trash2, Calendar, X, Sparkles, Repeat } from 'lucide-react';

interface Props {
  refreshKey?: number;
  onOpenRecurring?: () => void;
  user?: User | null;
}

export default function BudgetManager({ refreshKey, onOpenRecurring, user }: Props) {
  const userName = getUserDisplayName(user);
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // State cho form tạo/sửa ngân sách
  const [category, setCategory] = useState(''); // '' là ngân sách tổng
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingBudgetId, setDeletingBudgetId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const custom = getAllCategories().filter(c => c.type !== 'income');
    const map = new Map<string, string>();
    for (const c of custom) {
      map.set(c.name, c.icon || getCategoryIcon(c.name));
    }
    for (const d of DANH_MUC) {
      if (!d.startsWith('Thu nhập') && !map.has(d)) {
        map.set(d, getCategoryIcon(d));
      }
    }
    return Array.from(map.entries()).map(([name, icon]) => ({ name, icon }));
  }, []);

  async function loadBudgets() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getBudgets(selectedMonth);
      setData(res);
    } catch (err: unknown) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Không tải được ngân sách');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api.getBudgets(selectedMonth)
      .then(res => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được ngân sách');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, refreshKey]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowAddModal(false);
    }
    if (showAddModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseAmountInput(amountStr);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền ngân sách hợp lệ (ví dụ: 8tr, 3 củ, 500k)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.setBudget({
        month: selectedMonth,
        category: category || undefined,
        amount: parsedAmount
      });
      setShowAddModal(false);
      setAmountStr('');
      setCategory('');
      await loadBudgets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu ngân sách');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBudget(id: number) {
    if (deletingBudgetId !== null) return;
    if (!confirm(`${userName} có chắc chắn muốn xóa ngân sách này?`)) return;

    setDeletingBudgetId(id);
    try {
      await api.deleteBudget(id);
      await loadBudgets();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Không thể xóa ngân sách');
    } finally {
      setDeletingBudgetId(null);
    }
  }

  const currentDay = data?.currentDay || new Date().getDate();
  const totalDays = data?.totalDays || 30;
  const dayPercentage = Math.round(((data?.expectedPaceRatio || currentDay / totalDays) * 100));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 space-y-4 transition-colors">
      {/* Header & Chọn tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 leading-tight">
              Ngân sách & Cảnh báo chi tiêu
            </h2>
            <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
              Tự động cảnh báo khi chi tiêu quá tay theo tiến độ thời gian trong tháng
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chọn tháng */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-700 dark:text-zinc-200 text-xs focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Nút Khoản chi lặp lại */}
          {onOpenRecurring && (
            <button
              type="button"
              onClick={onOpenRecurring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs rounded-xl transition-colors shadow-2xs"
              title="Quản lý các khoản chi tiêu lặp lại hàng tháng (tiền nhà, tiền mạng, Netflix...)"
            >
              <Repeat className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Khoản chi tiêu lặp lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Đặt ngân sách
          </button>
        </div>
      </div>

      {/* Thanh tiến độ ngày trong tháng */}
      <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 rounded-xl space-y-1.5 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-zinc-200">
            📅 Tiến độ tháng: <span className="text-blue-600 dark:text-blue-400">Ngày {currentDay}/{totalDays}</span>
          </span>
          <span className="text-slate-500 dark:text-zinc-400 font-medium">
            Đã qua {dayPercentage}% thời gian tháng
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 dark:bg-blue-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${dayPercentage}%` }}
          />
        </div>
      </div>

      {/* Khối cảnh báo nổi bật nếu có chi tiêu quá tay */}
      {data?.budgets?.filter(b => b.status === 'WARNING' || b.status === 'EXCEEDED').map(b => (
        <div
          key={`alert-${b.id}`}
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
            b.status === 'EXCEEDED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300'
          }`}
        >
          {b.status === 'EXCEEDED' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">
              {b.status === 'EXCEEDED' ? '🚨 Vượt 100% ngân sách: ' : '⚠️ Cảnh báo chi tiêu quá tay: '}
            </span>
            {b.message}
          </div>
        </div>
      ))}

      {/* Danh sách các ngân sách đã đặt */}
      {loading ? (
        <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-6">Đang tải dữ liệu ngân sách...</p>
      ) : loadError ? (
        <div className="text-center py-6 px-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{loadError}</p>
          <button
            type="button"
            onClick={loadBudgets}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : !data?.budgets || data.budgets.length === 0 ? (
        <div className="text-center py-7 px-4 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl space-y-3 bg-slate-50/40 dark:bg-zinc-900/30">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-200 font-bold">
              Chưa có ngân sách nào cho tháng {selectedMonth.split('-').reverse().join('/')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
              Đặt hạn mức chi tiêu để kiểm soát tài chính (ví dụ: tổng 8 triệu, ăn uống 3 triệu)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer mx-auto"
          >
            <Plus className="w-4 h-4" /> Đặt ngân sách ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.budgets.map(b => {
            const isAll = !b.category || b.category === 'Tất cả';
            const icon = isAll ? '🎯' : getCategoryIcon(b.category);
            const title = isAll ? 'Toàn bộ chi tiêu tháng' : b.category;

            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                  b.status === 'EXCEEDED'
                    ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                    : b.status === 'WARNING'
                    ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
                    : 'bg-slate-50/70 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700/70'
                }`}
              >
                {/* Dòng tiêu đề */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{icon}</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-100 text-xs truncate">{title}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Badge trạng thái */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'EXCEEDED'
                          ? 'bg-rose-600 text-white'
                          : b.status === 'WARNING'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {b.status === 'EXCEEDED'
                        ? '🚨 Quá ngân sách'
                        : b.status === 'WARNING'
                        ? '⚠️ Quá tay'
                        : '✅ An toàn'}
                    </span>

                    <button
                      type="button"
                      disabled={deletingBudgetId !== null}
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-2 sm:p-1 text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-white dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer disabled:opacity-50"
                      title="Xóa ngân sách này"
                      aria-label="Xóa ngân sách này"
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Số tiền: Đã tiêu / Ngân sách */}
                <div className="flex items-baseline justify-between tabular-nums">
                  <div className="text-xs">
                    <span className="text-slate-400 dark:text-zinc-400 font-medium">Đã tiêu: </span>
                    <span
                      className={`font-bold ${
                        b.status === 'EXCEEDED'
                          ? 'text-rose-600 dark:text-rose-400'
                          : b.status === 'WARNING'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-700 dark:text-zinc-200'
                      }`}
                    >
                      {formatVND(b.spent)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Ngân sách: {formatVND(b.amount)}
                  </div>
                </div>

                {/* Progress bar có vạch đánh dấu tiến độ ngày */}
                <div className="relative w-full bg-slate-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.status === 'EXCEEDED'
                        ? 'bg-rose-500'
                        : b.status === 'WARNING'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>

                {/* Dòng phụ: % đã dùng & mức an toàn */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
                  <span>
                    Đã dùng <strong className="text-slate-700 dark:text-zinc-200">{b.percentage}%</strong>
                  </span>
                  <span>
                    Còn lại: <strong className={b.remaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}>{formatVND(b.remaining)}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Đặt ngân sách */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800 w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Đặt ngân sách tháng {selectedMonth.split('-').reverse().join('/')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3.5">
              {/* Chọn phạm vi: Tổng thể hay danh mục */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Áp dụng cho:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">🎯 Toàn bộ chi tiêu trong tháng (Tổng cả tháng)</option>
                  {availableCategories.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô nhập số tiền ngân sách */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Số tiền ngân sách tối đa:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    placeholder="Ví dụ: 8 triệu, 3 củ, 500k, 8000000..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-sm">
                    ₫
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {userName} có thể gõ linh hoạt: <span className="text-blue-600 dark:text-blue-400 font-medium">8tr</span>, <span className="text-blue-600 dark:text-blue-400 font-medium">3 củ</span>, <span className="text-blue-600 dark:text-blue-400 font-medium">5 lít</span>...
                </p>
              </div>

              {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2 rounded-lg">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu ngân sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
