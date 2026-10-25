import React, { useState, useEffect, useRef } from 'react';
import { api, formatVND, todayISO, type Transaction } from '../lib/api';
import { parseSmartInput, parseAmountInput, formatAmountDisplay } from '../lib/smartParser';
import { Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface Props {
  onCreated: (t: Transaction) => void;
}

// Danh mục để chọn thủ công
const DANH_MUC = [
  'Thực phẩm & Ăn uống','Nhà ở & Tiện ích','Di chuyển & Xăng xe',
  'Y tế & Sức khỏe','Giải trí & Mua sắm','Giáo dục',
  'Thu nhập lương','Thu nhập khác','Tiết kiệm & Đầu tư',
  'Sửa chữa & Bảo trì','Khác'
];

export default function TransactionForm({ onCreated }: Props) {
  const [type, setType]                   = useState<'expense' | 'income'>('expense');
  const [smartText, setSmartText]         = useState('');           // Ô nhập nhanh
  const [amount, setAmount]               = useState('');           // Ô số tiền (manual)
  const [description, setDescription]     = useState('');
  const [note, setNote]                   = useState('');
  const [date, setDate]                   = useState(todayISO());
  const [category, setCategory]           = useState('');
  const [expanded, setExpanded]           = useState(false);        // Hiện form chi tiết
  const [preview, setPreview]             = useState<{ category: string; suggestedDate: string; cleanDescription: string } | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Khi người dùng gõ vào ô nhập nhanh ───────────────────────────────────
  useEffect(() => {
    if (!smartText.trim()) { setPreview(null); return; }
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      // 1. Parse client-side: số tiền + ghi chú
      const parsed = parseSmartInput(smartText);

      // Cập nhật ô số tiền nếu parse được
      if (parsed.amount !== null) {
        setAmount(formatAmountDisplay(parsed.amount));
      }
      // Cập nhật ghi chú nếu có
      if (parsed.note) setNote(parsed.note);

      // 2. Gửi mô tả đã làm sạch lên server để parse ngày + danh mục
      if (parsed.description.trim()) {
        try {
          const p = await api.classifyPreview(parsed.description, type);
          setPreview(p);
          setDate(p.suggestedDate);
          if (!category) setCategory(p.category);
          setDescription(p.cleanDescription || parsed.description);
        } catch { /* bỏ qua lỗi mạng */ }
      }
    }, 450); // Debounce 450ms
    return () => clearTimeout(previewTimer.current);
  }, [smartText, type]);

  // ── Khi đổi loại Thu/Chi → reset category + re-classify ─────────────────
  function handleTypeChange(newType: 'expense' | 'income') {
    setType(newType);
    setCategory('');
    setPreview(null);
  }

  // ── Submit form ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseAmountInput(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền (ví dụ: 20k, 2tr, 50000)');
      return;
    }
    const finalDesc = description.trim() || smartText.trim();
    if (!finalDesc) {
      setError('Vui lòng nhập mô tả giao dịch');
      return;
    }

    setIsSubmitting(true);
    try {
      const t = await api.createTransaction({
        type,
        amount: parsedAmount,
        description: finalDesc,
        category: category || undefined,
        note: note.trim(),
        date,
      });
      onCreated(t);
      setSuccess(`✅ ${t.type === 'expense' ? 'Chi' : 'Thu'}: ${t.description} — ${formatVND(t.amount)}`);

      // Reset form
      setSmartText(''); setAmount(''); setDescription('');
      setNote(''); setCategory(''); setPreview(null);
      setDate(todayISO());
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Màu sắc theo loại giao dịch ──────────────────────────────────────────
  const colorCls = type === 'expense'
    ? { btn: 'bg-red-500 hover:bg-red-600', ring: 'focus:ring-red-400', text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' }
    : { btn: 'bg-green-500 hover:bg-green-600', ring: 'focus:ring-green-400', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5 text-blue-500" />
        Thêm giao dịch
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Toggle Thu / Chi */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200">
          <button type="button" onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
            <TrendingDown className="w-4 h-4" /> Chi tiêu
          </button>
          <button type="button" onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
            <TrendingUp className="w-4 h-4" /> Thu nhập
          </button>
        </div>

        {/* ⚡ Ô nhập nhanh */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            Nhập nhanh
            <span className="text-slate-400 font-normal">— gõ tất cả vào đây</span>
          </label>
          <input
            type="text"
            value={smartText}
            onChange={e => setSmartText(e.target.value)}
            placeholder='Ví dụ: "22/10 ăn trưa 20k (ăn với mẹ)" hoặc "hôm qua grab 55k"'
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-amber-50 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-slate-400"
          />
        </div>

        {/* Preview đã parse */}
        {preview && (
          <div className="flex flex-wrap gap-2 px-1">
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">
              📅 {date.split('-').reverse().join('/')}
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
              🏷️ {preview.category}
            </span>
            {amount && (
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                💰 {amount}đ
              </span>
            )}
            {note && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full">
                📝 {note}
              </span>
            )}
          </div>
        )}

        {/* Số tiền — luôn hiển thị */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Số tiền <span className="text-slate-400 font-normal">(hoặc gõ 20k / 2tr / 50000)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => {
                // Cho phép gõ tự do (k, tr, số) — parse khi submit
                setAmount(e.target.value);
              }}
              placeholder="20k / 2tr / 500.000"
              className={`w-full pl-3 pr-12 py-2.5 rounded-xl border text-lg font-bold focus:outline-none focus:ring-2 ${colorCls.ring} ${
                amount ? `${colorCls.text} ${colorCls.border} ${colorCls.bg}` : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₫</span>
          </div>
        </div>

        {/* Nút mở rộng form chi tiết */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Ẩn chi tiết</> : <><ChevronDown className="w-3.5 h-3.5" /> Tùy chỉnh chi tiết</>}
        </button>

        {/* Form chi tiết mở rộng */}
        {expanded && (
          <div className="space-y-3 border-t border-slate-100 pt-3">

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mô tả</label>
              <input type="text" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả giao dịch"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Ngày */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ngày giao dịch</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light]" />
            </div>

            {/* Danh mục */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Danh mục</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{preview ? `${preview.category} (tự động)` : 'Tự động phân loại'}</option>
                {DANH_MUC.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú thêm (hoặc gõ trong ngoặc ở ô trên)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {error   && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

        <button type="submit" disabled={isSubmitting}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${colorCls.btn} disabled:opacity-50`}>
          {isSubmitting ? 'Đang lưu...' : `+ Thêm ${type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}`}
        </button>
      </form>
    </div>
  );
}
