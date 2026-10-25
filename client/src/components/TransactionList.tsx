import React, { useState } from 'react';
import { api, formatVND, formatDate, type Transaction, type FilterParams } from '../lib/api';
import { Pencil, Trash2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  filters: FilterParams;
  onDeleted: (id: number) => void;
  onUpdated: (t: Transaction) => void;
  onLoadMore: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Thực phẩm & Ăn uống': '🍔',
  'Nhà ở & Tiện ích': '🏠',
  'Di chuyển & Xăng xe': '🚗',
  'Y tế & Sức khỏe': '🏥',
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Chỉnh sửa giao dịch</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-500">Mô tả</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500">Số tiền</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500">Ngày</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <label className="block text-xs font-medium text-slate-500">Danh mục</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="block text-xs font-medium text-slate-500">Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, total, loading, onDeleted, onUpdated, onLoadMore }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        Đang tải...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-slate-500">Chưa có giao dịch nào</p>
        <p className="text-slate-400 text-sm mt-1">Thêm giao dịch đầu tiên của bạn!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dates.map(date => {
        const dayTxns = grouped[date];
        const dayIncome = dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const dayExpense = dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        return (
          <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Date header */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{formatDate(date)}</span>
              <div className="flex items-center gap-3 text-xs">
                {dayIncome > 0 && <span className="text-green-600 font-medium">+{formatVND(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-red-500 font-medium">-{formatVND(dayExpense)}</span>}
              </div>
            </div>

            {/* Transactions */}
            {dayTxns.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group transition-colors ${
                  i < dayTxns.length - 1 ? 'border-b border-slate-50' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {CATEGORY_ICONS[t.category] ?? '❓'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category}{t.note ? ` · ${t.note}` : ''}</p>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatVND(t.amount)}
                  </p>
                </div>

                {/* Actions (show on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Load more */}
      {transactions.length < total && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-blue-300 hover:text-blue-500 transition-colors"
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
