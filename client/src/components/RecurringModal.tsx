import React, { useState, useEffect } from 'react';
import { api, formatVND, getUserDisplayName, type RecurringTransaction, type User } from '../lib/api';
import { parseAmountInput } from '../lib/smartParser';
import { X, Plus, Trash2, Repeat, CheckCircle, Clock } from 'lucide-react';

interface Props {
  onClose: () => void;
  onChanged?: () => void;
  user?: User | null;
}

export default function RecurringModal({ onClose, onChanged, user }: Props) {
  const userName = getUserDisplayName(user);
  const [list, setList] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form thêm mới
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Nhà ở & Tiện ích');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadRecurring() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.getRecurring();
      setList(res.data);
    } catch (err: unknown) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách lặp lại');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api.getRecurring()
      .then(res => {
        if (!cancelled) setList(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách lặp lại');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleToggleActive(item: RecurringTransaction) {
    if (actionId !== null) return;
    setActionId(item.id);
    try {
      await api.updateRecurring(item.id, { is_active: item.is_active ? 0 : 1 });
      await loadRecurring();
      onChanged?.();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: number) {
    if (actionId !== null) return;
    if (!window.confirm(`${userName} có chắc muốn xóa khoản chi tiêu lặp lại này không?`)) return;
    setActionId(id);
    try {
      await api.deleteRecurring(id);
      await loadRecurring();
      onChanged?.();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Không thể xóa khoản chi tiêu lặp lại');
    } finally {
      setActionId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseAmountInput(amountStr);
    if (!description.trim()) {
      setError('Vui lòng nhập tên khoản chi tiêu lặp lại (ví dụ: Tiền nhà, Tiền mạng, Netflix...)');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (ví dụ: 3tr, 250k, 1 củ)');
      return;
    }

    setSubmitting(true);
    try {
      await api.createRecurring({
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        note: note.trim(),
        day_of_month: dayOfMonth
      });
      setDescription('');
      setAmountStr('');
      setNote('');
      setShowAdd(false);
      await loadRecurring();
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-base">Khoản chi tiêu lặp lại hàng tháng</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-400">Tự động cộng vào ngày cố định mỗi tháng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nút thêm mới */}
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm khoản chi tiêu lặp lại mới (Tiền nhà, mạng, Netflix...)
          </button>
        ) : (
          <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Tạo khoản chi tiêu lặp lại mới</span>
              <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                Đóng
              </button>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded-lg border border-red-200 dark:border-red-900">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'}`}
              >
                🔴 Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${type === 'income' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'}`}
              >
                🟢 Thu nhập
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Tên khoản chi</label>
              <input
                type="text"
                placeholder="Ví dụ: Tiền thuê nhà, Cước Internet, Netflix, Tập Gym..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Số tiền (hỗ trợ 3tr, 250k)</label>
                <input
                  type="text"
                  placeholder="3tr / 250k / 500000"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Ngày lặp lại mỗi tháng</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 dark:text-zinc-500">Ngày</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-center text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : 'Lưu khoản chi tiêu lặp lại'}
            </button>
          </form>
        )}

        {/* Danh sách các khoản chi tiêu lặp lại */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-6">Đang tải...</p>
          ) : loadError ? (
            <div className="text-center py-6 px-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{loadError}</p>
              <button
                type="button"
                onClick={loadRecurring}
                className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl space-y-1.5">
              <Clock className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Chưa có khoản chi tiêu lặp lại nào</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Hãy tạo các khoản tiền nhà, tiền mạng cố định để app tự cộng hàng tháng!
              </p>
            </div>
          ) : (
            list.map(item => (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.is_active
                    ? 'bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700'
                    : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-100 dark:border-zinc-800 opacity-60'
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-100 truncate">
                      {item.description}
                    </span>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded font-semibold">
                      Ngày {item.day_of_month} hàng tháng
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-zinc-400">
                    {item.category} {item.last_generated_month ? `• Đã cộng tháng ${item.last_generated_month}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`font-bold text-sm ${item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {item.type === 'income' ? '+' : '-'}{formatVND(item.amount)}
                  </span>

                  <button
                    type="button"
                    disabled={actionId !== null}
                    onClick={() => handleToggleActive(item)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 ${
                      item.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}
                    title="Bật / Tắt tự động tạo"
                  >
                    {actionId === item.id ? '...' : item.is_active ? 'Đang bật' : 'Tạm dừng'}
                  </button>

                  <button
                    type="button"
                    disabled={actionId !== null}
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    title="Xóa khoản lặp lại này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
