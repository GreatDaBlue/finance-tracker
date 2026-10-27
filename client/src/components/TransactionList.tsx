import React, { useState, useEffect } from 'react';
import { api, formatVND, formatDate, getUserDisplayName, type Transaction, type FilterParams, type User } from '../lib/api';
import { getCategoryIcon } from '../lib/smartParser';
import { exportToExcel, exportToCSV } from '../lib/exportUtils';
import { Pencil, Trash2, X, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  filters: FilterParams;
  user?: User | null;
  onDeleted: (id: number) => void;
  onUpdated: (t: Transaction) => void;
  onLoadMore: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Ăn uống': '🍜',
  'Thực phẩm & Ăn uống': '🍔',
  'Xe cộ': '🛵',
  'Di chuyển & Xăng xe': '🚗',
  'Sức khỏe': '💊',
  'Y tế & Sức khỏe': '🏥',
  'Nhà cửa': '🏠',
  'Nhà ở & Tiện ích': '🏠',
  'Mua sắm & Giải trí': '🛍️',
  'Giải trí & Mua sắm': '🎬',
  'Giáo dục': '📚',
  'Thu nhập lương': '💼',
  'Thu nhập khác': '💰',
  'Tiết kiệm & Đầu tư': '💳',
  'Sửa chữa & Bảo trì': '🔧',
  'Khác': '❓',
};

function EditModal({ t, onClose, onSaved }: { t: Transaction; onClose: () => void; onSaved: (t: Transaction) => void }) {
  const [desc, setDesc] = useState(t.description);
  const [amount, setAmount] = useState(String(t.amount));
  const [date, setDate] = useState(t.date);
  const [category, setCategory] = useState(t.category);
  const [note, setNote] = useState(t.note);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateTransaction(t.id, {
        description: desc,
        amount: parseFloat(amount),
        date,
        category,
        note
      });
      onSaved(updated);
      onClose();
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
      className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-5 space-y-4 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <h3 className="font-semibold text-slate-800 dark:text-zinc-100">Chỉnh sửa giao dịch</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Mô tả</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Số tiền</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Ngày</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]" />
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Danh mục</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">Hủy</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-xs">
            {saving ? 'Lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, total, loading, filters, user, onDeleted, onUpdated, onLoadMore }: Props) {
  const userName = getUserDisplayName(user);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      onDeleted(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8 text-center text-slate-400 dark:text-zinc-500 transition-colors">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        Đang tải...
      </div>
    );
  }

  if (transactions.length === 0) {
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
      {/* Thanh công cụ: Đếm số lượng & Nút Xuất file Excel (.xlsx) / CSV */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
          Hiển thị <strong className="text-slate-800 dark:text-zinc-200">{transactions.length}</strong> / {total} giao dịch
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Xuất toàn bộ giao dịch ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel (.xlsx)'}</span>
          </button>

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
      {dates.map(date => {
        const dayTxns = grouped[date];
        const dayIncome = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const dayExpense = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        return (
          <div key={date} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden transition-colors">
            {/* Date header */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">{formatDate(date)}</span>
              <div className="flex items-center gap-3 text-xs">
                {dayIncome > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatVND(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-rose-500 dark:text-rose-400 font-semibold">-{formatVND(dayExpense)}</span>}
              </div>
            </div>

            {/* Transactions with Framer Motion slide-in */}
            <div className="divide-y divide-slate-50 dark:divide-zinc-800/70">
              <AnimatePresence initial={false}>
                {dayTxns.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 group transition-colors"
                  >
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
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed break-words">
                        {t.category}{t.note ? ` · ${t.note.replace('[Định kỳ hàng tháng]', '').trim()}` : ''}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold tracking-tight ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatVND(t.amount)}
                      </p>
                    </div>

                    {/* Actions (show on hover / tap) */}
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingId(t.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Chỉnh sửa giao dịch"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                        title="Xóa giao dịch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
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
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 text-sm hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          {loading ? 'Đang tải...' : `Xem thêm (còn ${total - transactions.length} giao dịch)`}
        </button>
      )}

      {editingId !== null && (
        <EditModal
          t={transactions.find(t => t.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSaved={t => { onUpdated(t); setEditingId(null); }}
        />
      )}
    </div>
  );
}
