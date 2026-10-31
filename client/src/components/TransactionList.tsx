import React, { useState, useEffect } from 'react';
import { api, formatVND, formatDate, getUserDisplayName, type Transaction, type FilterParams, type User } from '../lib/api';
import { getCategoryIcon } from '../lib/smartParser';
import { exportToExcel, exportToCSV } from '../lib/exportUtils';
import { Pencil, Trash2, X, Download, FileSpreadsheet, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  filters: FilterParams;
  user?: User | null;
  onDeleted: (id: number) => void;
  onBatchDeleted?: (ids: number[]) => void;
  onAllDeleted?: () => void;
  onUpdated: (t: Transaction) => void;
  onLoadMore: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Ăn uống': '🍜',
  'Thực phẩm & Ăn uống': '🍔',
  'Xe cộ': '🛵',
  'Xe cộ & Đi lại': '🛵',
  'Di chuyển & Xăng xe': '🚗',
  'Sức khỏe': '💊',
  'Sức khỏe & Y tế': '💊',
  'Y tế & Sức khỏe': '🏥',
  'Nhà cửa': '🏠',
  'Nhà cửa & Hóa đơn': '🏠',
  'Nhà ở & Tiện ích': '🏠',
  'Mua sắm & Giải trí': '🛍️',
  'Giải trí & Mua sắm': '🎬',
  'Giáo dục': '📚',
  'Giáo dục & Học tập': '📚',
  'Thu nhập lương': '💵',
  'Lương': '💵',
  'Quà tặng & Cho biếu': '🎁',
  'Được tặng & Cho': '🎁',
  'Thu nhập khác': '💰',
  'Tiết kiệm & Đầu tư': '📈',
  'Sửa chữa & Bảo trì': '🔧',
  'Khác': '🏷️',
};

function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    const billions = Math.round((amount / 1_000_000_000) * 10) / 10;
    return `${billions.toLocaleString('vi-VN')} tỷ ₫`;
  }
  return formatVND(amount);
}

function EditModal({ t, onClose, onSaved }: { t: Transaction; onClose: () => void; onSaved: (t: Transaction) => void }) {
  const [desc, setDesc] = useState(t.description);
  const [amount, setAmount] = useState(String(t.amount));
  const [date, setDate] = useState(t.date);
  const [category, setCategory] = useState(t.category);
  const [note, setNote] = useState(t.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || num > 1_000_000_000_000) {
      setError('Số tiền phải là số hợp lệ từ 1 đến 1.000 tỷ ₫');
      return;
    }
    if (!desc.trim()) {
      setError('Mô tả giao dịch không được để trống');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày hợp lệ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await api.updateTransaction(t.id, {
        description: desc.trim(),
        amount: num,
        date,
        category,
        note: note.trim()
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu thay đổi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-50 p-4 cursor-pointer overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-5 space-y-4 cursor-default max-h-[90dvh] overflow-y-auto my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h3 className="font-semibold text-slate-800 dark:text-zinc-100">Chỉnh sửa giao dịch</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Mô tả</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Số tiền (₫)</label>
          <input type="number" min="1" step="any" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Ngày</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Danh mục</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {!Object.keys(CATEGORY_ICONS).includes(category) && category && <option value={category}>{category}</option>}
            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">Hủy</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({
  transactions,
  total,
  loading,
  filters,
  user,
  onDeleted,
  onBatchDeleted,
  onAllDeleted,
  onUpdated,
  onLoadMore
}: Props) {
  const userName = getUserDisplayName(user);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Chế độ chọn nhiều
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Modal xác nhận xóa sạch tất cả
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Xuất ra file Excel (.xlsx)
  async function handleExportExcel() {
    setIsExporting(true);
    try {
      let dataToExport = transactions;
      if (total > transactions.length) {
        const fullRes = await api.getTransactions({ ...filters, limit: total, offset: 0 });
        dataToExport = fullRes.data;
      }
      exportToExcel(dataToExport);
    } catch (err) {
      console.error(err);
      exportToExcel(transactions);
    } finally {
      setIsExporting(false);
    }
  }

  // Xuất ra file CSV
  async function handleExportCSV() {
    setIsExporting(true);
    try {
      let dataToExport = transactions;
      if (total > transactions.length) {
        const fullRes = await api.getTransactions({ ...filters, limit: total, offset: 0 });
        dataToExport = fullRes.data;
      }
      exportToCSV(dataToExport);
    } catch (err) {
      console.error(err);
      exportToCSV(transactions);
    } finally {
      setIsExporting(false);
    }
  }

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    (acc[t.date] = acc[t.date] || []).push(t);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  async function handleDelete(id: number) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
      return;
    }
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await api.deleteTransaction(id);
      onDeleted(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
    } catch (err: any) {
      if (err?.status === 404) {
        onDeleted(id);
      } else {
        alert(err?.message || 'Không thể xóa giao dịch. Vui lòng thử lại.');
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  const isAllDisplayedSelected =
    transactions.length > 0 && transactions.every(t => selectedIds.includes(t.id));

  function handleToggleSelectAllDisplayed() {
    if (isAllDisplayedSelected) {
      const currentIds = new Set(transactions.map(t => t.id));
      setSelectedIds(prev => prev.filter(id => !currentIds.has(id)));
    } else {
      const currentIds = transactions.map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} giao dịch đã chọn không?`)) {
      return;
    }

    setIsBatchDeleting(true);
    try {
      await api.deleteTransactionsBatch(selectedIds);
      onBatchDeleted?.(selectedIds);
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      alert('Không thể xóa các giao dịch đã chọn. Vui lòng thử lại!');
    } finally {
      setIsBatchDeleting(false);
    }
  }

  async function handleConfirmDeleteAll() {
    setIsDeletingAll(true);
    try {
      await api.deleteAllTransactions(filters);
      onAllDeleted?.();
      setShowConfirmDeleteAll(false);
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err) {
      alert('Không thể xóa sạch giao dịch. Vui lòng thử lại!');
    } finally {
      setIsDeletingAll(false);
    }
  }

  // Trạng thái đang tải dữ liệu ban đầu
  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8 text-center text-slate-400 dark:text-zinc-500 transition-colors">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        Đang tải giao dịch...
      </div>
    );
  }

  // Khi danh sách hiển thị tạm thời hết nhưng DB vẫn còn giao dịch (tránh bug hiện rỗng sai)
  if (transactions.length === 0 && total > 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8 text-center text-slate-400 dark:text-zinc-500 transition-colors">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        Đang tải các giao dịch tiếp theo ({total} giao dịch)...
      </div>
    );
  }

  // Khi thực sự không còn giao dịch nào trong DB
  if (transactions.length === 0 && total === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-12 text-center transition-colors">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-slate-600 dark:text-zinc-300 font-medium">Chưa có giao dịch nào</p>
        <p className="text-slate-400 dark:text-zinc-500 text-sm mt-1">Thêm giao dịch đầu tiên của {userName}!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Thanh công cụ: Đếm số lượng, Chọn nhiều, Xóa sạch & Xuất file */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Hiển thị <strong className="text-slate-800 dark:text-zinc-200">{transactions.length}</strong> / {total} giao dịch
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nút Chọn nhiều */}
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds([]);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
              isSelectMode
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700'
            }`}
            title="Bật chế độ chọn nhiều để xóa hàng loạt"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}</span>
          </button>

          {/* Nút Xóa sạch ({total}) */}
          {total > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmDeleteAll(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Xóa tất cả giao dịch"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Xóa sạch ({total})</span>
            </button>
          )}

          {/* Xuất file Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Xuất toàn bộ giao dịch ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>

          {/* Xuất CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Xuất ra file CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Banner thanh tác vụ khi đang ở Chế độ Chọn nhiều */}
      {isSelectMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAllDisplayed}
              className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
            >
              {isAllDisplayedSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Bỏ chọn ({transactions.length})
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Chọn tất cả ({transactions.length})
                </>
              )}
            </button>
            <span className="text-xs text-slate-600 dark:text-zinc-400">
              Đã chọn: <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedIds.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={selectedIds.length === 0 || isBatchDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBatchDeleting ? 'Đang xóa...' : `Xóa ${selectedIds.length} mục đã chọn`}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds([]);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Danh sách giao dịch gom nhóm theo ngày */}
      {dates.map(date => {
        const dayTxns = grouped[date];
        const dayIncome = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
        const dayExpense = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

        return (
          <div key={date} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden transition-colors">
            {/* Date header */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200 shrink-0">{formatDate(date)}</span>
              <div className="flex items-center gap-2.5 text-xs font-semibold shrink-0">
                {dayIncome > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{formatVND(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-rose-500 dark:text-rose-400">-{formatVND(dayExpense)}</span>}
              </div>
            </div>

            {/* Transactions with Framer Motion slide-in */}
            <div className="divide-y divide-slate-50 dark:divide-zinc-800/70">
              <AnimatePresence initial={false}>
                {dayTxns.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={() => {
                        if (isSelectMode) toggleSelect(t.id);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 group transition-colors ${
                        isSelectMode ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                    >
                      {/* Checkbox khi bật Chọn nhiều */}
                      {isSelectMode && (
                        <div className="shrink-0 -mr-1">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
                          )}
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-rose-50 dark:bg-rose-950/60'
                      }`}>
                        {getCategoryIcon(t.category) || CATEGORY_ICONS[t.category] || '❓'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 leading-snug break-words">
                            {t.description}
                          </p>
                          {t.note?.includes('[Định kỳ hàng tháng]') && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                              🔁 Lặp lại
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5 leading-relaxed break-words">
                          {t.category}{t.note ? ` · ${t.note.replace('[Định kỳ hàng tháng]', '').trim()}` : ''}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p
                          title={formatVND(t.amount)}
                          className={`text-sm sm:text-base font-bold tracking-tight tabular-nums ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                        >
                          {t.type === 'income' ? '+' : '-'}{formatCompactVND(t.amount)}
                        </p>
                      </div>

                      {/* Actions (Vùng chạm tối ưu trên Mobile, hover trên Desktop) */}
                      {!isSelectMode && (
                        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingId(t.id)}
                            className="p-2 sm:p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/70 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all cursor-pointer"
                            title="Chỉnh sửa giao dịch"
                            aria-label="Chỉnh sửa giao dịch"
                          >
                            <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingIds.has(t.id)}
                            className="p-2 sm:p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/70 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 active:scale-90 transition-all cursor-pointer disabled:opacity-50"
                            title="Xóa giao dịch"
                            aria-label="Xóa giao dịch"
                          >
                            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {transactions.length < total && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 text-sm hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          {loading ? 'Đang tải...' : `Xem thêm (còn ${total - transactions.length} giao dịch)`}
        </button>
      )}

      {/* Modal Chỉnh sửa */}
      {editingId !== null && (() => {
        const editingTx = transactions.find(t => t.id === editingId);
        if (!editingTx) return null;
        return (
          <EditModal
            t={editingTx}
            onClose={() => setEditingId(null)}
            onSaved={t => { onUpdated(t); setEditingId(null); }}
          />
        );
      })()}

      {/* Modal xác nhận Xóa sạch tất cả giao dịch */}
      {showConfirmDeleteAll && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeletingAll && setShowConfirmDeleteAll(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Xác nhận xóa sạch giao dịch
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Xóa tất cả các bản ghi giao dịch
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ <strong className="text-rose-600 dark:text-rose-400 font-bold">{total} giao dịch</strong> không?
              Hành động này sẽ xóa vĩnh viễn và <span className="font-semibold text-rose-600 dark:text-rose-400">không thể khôi phục</span>!
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingAll ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa sạch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
