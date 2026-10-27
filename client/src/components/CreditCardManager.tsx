import React, { useState, useEffect } from 'react';
import {
  api,
  formatVND,
  formatDate,
  todayISO,
  getUserDisplayName,
  type CreditCard,
  type CreditCardListResponse,
  type User
} from '../lib/api';
import { parseAmountInput } from '../lib/smartParser';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ShieldAlert,
  Wallet
} from 'lucide-react';

interface Props {
  refreshKey?: number;
  user?: User | null;
  onCountChange?: (count: number) => void;
}

export default function CreditCardManager({ refreshKey, user, onCountChange }: Props) {
  const userName = getUserDisplayName(user);
  const [data, setData] = useState<CreditCardListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled'>('all');

  // Modal Thêm / Sửa thẻ
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [creditLimitStr, setCreditLimitStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [statementDay, setStatementDay] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Thanh toán nợ thẻ
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [createExpense, setCreateExpense] = useState(true);
  const [payNote, setPayNote] = useState('');
  const [payError, setPayError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  async function loadCreditCards() {
    setLoading(true);
    try {
      const res = await api.getCreditCards();
      setData(res);
      if (onCountChange) {
        onCountChange(res.data.length);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách thẻ tín dụng:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCreditCards();
  }, [refreshKey]);

  // Đóng modal khi ấn Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowFormModal(false);
        setPayingCard(null);
      }
    }
    if (showFormModal || payingCard) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFormModal, payingCard]);

  // Mở modal thêm mới
  function openAddModal() {
    setEditingCard(null);
    setCardName('');
    setBankName('');
    setBalanceStr('');
    setCreditLimitStr('');
    setDueDate(todayISO());
    setStatementDay('');
    setNote('');
    setError('');
    setShowFormModal(true);
  }

  // Mở modal sửa thẻ
  function openEditModal(card: CreditCard) {
    setEditingCard(card);
    setCardName(card.card_name);
    setBankName(card.bank_name || '');
    setBalanceStr(String(card.balance));
    setCreditLimitStr(card.credit_limit ? String(card.credit_limit) : '');
    setDueDate(card.due_date);
    setStatementDay(card.statement_day ? String(card.statement_day) : '');
    setNote(card.note || '');
    setError('');
    setShowFormModal(true);
  }

  // Mở modal thanh toán
  function openPayModal(card: CreditCard) {
    setPayingCard(card);
    setPayAmountStr(String(card.remaining > 0 ? card.remaining : card.balance));
    setPayDate(todayISO());
    setCreateExpense(true);
    setPayNote('');
    setPayError('');
  }

  // Xử lý Lưu thẻ (Thêm hoặc Sửa)
  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!cardName.trim()) {
      setError('Vui lòng nhập tên thẻ tín dụng (ví dụ: Techcombank Visa, VPBank StepUp...)');
      return;
    }

    const parsedBalance = parseAmountInput(balanceStr);
    if (!parsedBalance || parsedBalance <= 0) {
      setError('Vui lòng nhập số tiền nợ / dư nợ kỳ này hợp lệ');
      return;
    }

    if (!dueDate) {
      setError('Vui lòng chọn ngày đến hạn thanh toán');
      return;
    }

    const parsedLimit = creditLimitStr ? parseAmountInput(creditLimitStr) : 0;
    const parsedStatementDay = statementDay ? parseInt(statementDay, 10) : 0;

    setIsSubmitting(true);
    try {
      if (editingCard) {
        await api.updateCreditCard(editingCard.id, {
          card_name: cardName.trim(),
          bank_name: bankName.trim(),
          balance: parsedBalance,
          credit_limit: parsedLimit || 0,
          due_date: dueDate,
          statement_day: parsedStatementDay || 0,
          note: note.trim()
        });
      } else {
        await api.createCreditCard({
          card_name: cardName.trim(),
          bank_name: bankName.trim(),
          balance: parsedBalance,
          credit_limit: parsedLimit || 0,
          due_date: dueDate,
          statement_day: parsedStatementDay || 0,
          note: note.trim()
        });
      }

      setShowFormModal(false);
      await loadCreditCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu thẻ');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Xử lý Thanh toán thẻ
  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingCard) return;
    setPayError('');

    const parsedPay = parseAmountInput(payAmountStr);
    if (!parsedPay || parsedPay <= 0) {
      setPayError('Vui lòng nhập số tiền thanh toán hợp lệ');
      return;
    }

    setIsPaying(true);
    try {
      await api.payCreditCard(payingCard.id, {
        amount: parsedPay,
        payment_date: payDate,
        create_expense: createExpense,
        note: payNote.trim()
      });

      setPayingCard(null);
      await loadCreditCards();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Lỗi khi ghi nhận thanh toán');
    } finally {
      setIsPaying(false);
    }
  }

  // Xóa thẻ
  async function handleDeleteCard(card: CreditCard) {
    const ok = window.confirm(
      `${userName} có chắc chắn muốn xóa thẻ tín dụng "${card.card_name}" này không? Lịch sử thanh toán của thẻ cũng sẽ bị xóa.`
    );
    if (!ok) return;

    try {
      await api.deleteCreditCard(card.id);
      await loadCreditCards();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa thẻ, vui lòng thử lại');
    }
  }

  const cards = data?.data || [];
  const summary = data?.summary || {
    totalDebtRemaining: 0,
    totalPaid: 0,
    settledCount: 0,
    pendingCount: 0,
    dueSoonCount: 0,
    overdueCount: 0
  };

  const filteredCards = cards.filter(card => {
    if (filterStatus === 'pending') return card.status === 'pending' && card.remaining > 0;
    if (filterStatus === 'settled') return card.status === 'settled' || card.remaining === 0;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Thẻ Thống kê Dư nợ Thẻ tín dụng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Tổng dư nợ thẻ cần thanh toán */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-1 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-300 gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <CreditCardIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">Tổng dư nợ thẻ của {userName}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-[10.5px] bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
              {summary.pendingCount} thẻ còn nợ
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">
            {formatVND(summary.totalDebtRemaining)}
          </p>
          <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 flex items-center justify-between pt-0.5">
            <span>Đã thanh toán kỳ này: <strong>{formatVND(summary.totalPaid)}</strong></span>
            {summary.settledCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {summary.settledCount} thẻ đã trả hết</span>
            )}
          </div>
        </div>

        {/* Tình trạng hạn thanh toán */}
        <div className={`p-4 rounded-2xl border space-y-1 transition-colors shadow-2xs ${
          summary.overdueCount > 0
            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/70 text-rose-900 dark:text-rose-200'
            : summary.dueSoonCount > 0
            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/70 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              {summary.overdueCount > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
              ) : summary.dueSoonCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              Tình trạng hạn thanh toán
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/70 dark:bg-zinc-800/80">
              {summary.overdueCount > 0 ? 'Cảnh báo' : summary.dueSoonCount > 0 ? 'Sắp đến hạn' : 'An toàn'}
            </span>
          </div>

          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            {summary.overdueCount > 0
              ? `${summary.overdueCount} thẻ đã quá hạn!`
              : summary.dueSoonCount > 0
              ? `${summary.dueSoonCount} thẻ cần thanh toán ≤ 7 ngày`
              : 'Tất cả thẻ đều an toàn'}
          </p>

          <p className="text-[11px] opacity-85 leading-relaxed">
            {summary.overdueCount > 0
              ? 'Thanh toán ngay để tránh bị phạt phí trễ hạn và lãi suất tín dụng!'
              : summary.dueSoonCount > 0
              ? 'Chuẩn bị số dư để thanh toán đúng ngày đến hạn sao kê nhé.'
              : 'Không có thẻ nào bị quá hạn trong kỳ này.'}
          </p>
        </div>
      </div>

      {/* Thanh bộ lọc & Nút thêm thẻ mới */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-b border-slate-100 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Tất cả ({cards.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'pending'
                ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            Đang nợ ({summary.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('settled')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'settled'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            ✓ Đã thanh toán xong ({summary.settledCount})
          </button>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs ml-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm thẻ nợ mới
        </button>
      </div>

      {/* Danh sách thẻ nợ */}
      {loading ? (
        <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-8">Đang tải thẻ tín dụng...</p>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2.5">
          <CreditCardIcon className="w-9 h-9 text-slate-300 dark:text-zinc-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Chưa có thẻ tín dụng nào trong mục này.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm thẻ tín dụng đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCards.map(card => {
            const isSettled = card.status === 'settled' || card.remaining === 0;
            const daysRemaining = card.daysRemaining ?? 999;
            const isOverdue = !isSettled && daysRemaining < 0;
            const isDueToday = !isSettled && daysRemaining === 0;
            const isDueSoon = !isSettled && daysRemaining > 0 && daysRemaining <= 7;
            const paidPct = card.balance > 0 ? Math.min(100, Math.round((card.paid_amount / card.balance) * 100)) : 0;
            const limitUsedPct = card.credit_limit > 0 ? Math.round((card.remaining / card.credit_limit) * 100) : 0;

            return (
              <div
                key={card.id}
                className={`relative rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between space-y-3.5 ${
                  isSettled
                    ? 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700/60 opacity-80'
                    : isOverdue
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 shadow-xs ring-1 ring-rose-400/20'
                    : isDueToday || (isDueSoon && daysRemaining <= 3)
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 shadow-xs hover:border-blue-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Header thẻ: Tên thẻ + Badge hạn thanh toán */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSettled
                          ? 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                          : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                      }`}>
                        <CreditCardIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate leading-snug">
                          {card.card_name}
                        </h4>
                        {card.bank_name && (
                          <span className="text-[11px] text-slate-400 dark:text-zinc-400 block leading-tight">
                            {card.bank_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge trạng thái hạn trả */}
                    <div>
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-3 h-3" /> Đã xong
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                          <ShieldAlert className="w-3 h-3" /> Quá hạn {Math.abs(daysRemaining)} ngày
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                          <Clock className="w-3 h-3" /> Hôm nay hạn chót!
                        </span>
                      ) : isDueSoon ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          <Clock className="w-3 h-3" /> Còn {daysRemaining} ngày
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                          Còn {daysRemaining} ngày
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Số tiền nợ còn lại */}
                  <div className="mt-2.5">
                    <span className="text-[11px] text-slate-400 dark:text-zinc-400 block font-medium">
                      {isSettled ? 'Dư nợ đã thanh toán hết' : 'Dư nợ cần thanh toán kỳ này:'}
                    </span>
                    <p className={`text-xl font-black tracking-tight ${
                      isSettled
                        ? 'text-slate-400 dark:text-zinc-500 line-through'
                        : isOverdue
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-zinc-100'
                    }`}>
                      {formatVND(isSettled ? card.balance : card.remaining)}
                    </p>
                  </div>
                </div>

                {/* Chi tiết thanh toán & Tiến độ (nếu đã trả 1 phần) */}
                {card.paid_amount > 0 && !isSettled ? (
                  <div className="space-y-1 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                      <span>Đã trả: <strong className="text-emerald-600 dark:text-emerald-400">{formatVND(card.paid_amount)}</strong> ({paidPct}%)</span>
                      <span>Tổng nợ: <strong>{formatVND(card.balance)}</strong></span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                ) : null}

                {/* Hạn thanh toán & Hạn mức */}
                <div className="space-y-1 text-xs text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Hạn thanh toán:
                    </span>
                    <strong className={isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-zinc-200'}>
                      {formatDate(card.due_date)}
                    </strong>
                  </div>

                  {card.credit_limit > 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Hạn mức thẻ:</span>
                      <span>
                        <strong>{formatVND(card.credit_limit)}</strong>
                        {limitUsedPct > 0 && <span className="text-slate-400 ml-1">(đã dùng {limitUsedPct}%)</span>}
                      </span>
                    </div>
                  )}

                  {card.note && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic pt-0.5 truncate">
                      "{card.note}"
                    </p>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 flex-1">
                    {!isSettled ? (
                      <button
                        type="button"
                        onClick={() => openPayModal(card)}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Thanh toán nợ</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã tất toán kỳ này
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(card)}
                      className="p-1.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Chỉnh sửa thông tin thẻ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCard(card)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Xóa thẻ này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa Thẻ tín dụng */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowFormModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-2">
                <CreditCardIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {editingCard ? 'Cập nhật thẻ tín dụng' : 'Thêm thẻ tín dụng mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5">
              {/* Tên thẻ & Ngân hàng */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Tên thẻ nợ: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    placeholder="Ví dụ: VPBank StepUp, Techcombank Visa..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Tên ngân hàng (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Ví dụ: VPBank, Techcombank, VIB, TPBank..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dư nợ cần thanh toán */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Số tiền nợ (Dư nợ sao kê kỳ này): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={balanceStr}
                    onChange={e => setBalanceStr(e.target.value)}
                    placeholder="Ví dụ: 12tr, 15 củ, 500k, 12500000..."
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-sm">
                    ₫
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Hỗ trợ gõ tắt: <span className="text-blue-600 dark:text-blue-400 font-medium">12tr</span>, <span className="text-blue-600 dark:text-blue-400 font-medium">5 củ</span>, <span className="text-blue-600 dark:text-blue-400 font-medium">500k</span>...
                </p>
              </div>

              {/* Ngày đến hạn thanh toán & Hạn mức thẻ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Ngày cần thanh toán: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                    Hạn mức thẻ (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={creditLimitStr}
                    onChange={e => setCreditLimitStr(e.target.value)}
                    placeholder="Ví dụ: 50tr, 100tr..."
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ví dụ: Sao kê kỳ tháng 10, miễn lãi 45 ngày..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : editingCard ? 'Cập nhật thẻ' : 'Lưu thẻ tín dụng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thanh toán nợ thẻ */}
      {payingCard && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPayingCard(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Thanh toán nợ thẻ tín dụng
              </h3>
              <button
                type="button"
                onClick={() => setPayingCard(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs">
              <div className="text-slate-500 dark:text-zinc-400">Thẻ thanh toán:</div>
              <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{payingCard.card_name}</div>
              <div className="text-slate-600 dark:text-zinc-300 pt-1">
                Dư nợ còn lại: <strong className="text-blue-600 dark:text-blue-400 text-sm">{formatVND(payingCard.remaining)}</strong>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                    Số tiền thanh toán:
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmountStr(String(payingCard.remaining))}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Trả toàn bộ ({formatVND(payingCard.remaining)})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={payAmountStr}
                    onChange={e => setPayAmountStr(e.target.value)}
                    placeholder="Nhập số tiền trả (ví dụ: 5tr, 10 củ...)"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-sm">
                    ₫
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Ngày thanh toán:
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              {/* Tùy chọn tự động ghi vào thu chi */}
              <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer pt-0.5 select-none">
                <input
                  type="checkbox"
                  checked={createExpense}
                  onChange={e => setCreateExpense(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 border-slate-300"
                />
                <span>
                  Tự động ghi nhận một khoản <strong>Chi tiêu</strong> ("Thanh toán thẻ tín dụng") vào danh sách giao dịch
                </span>
              </label>

              {payError && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2 rounded-lg">
                  {payError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingCard(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isPaying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
