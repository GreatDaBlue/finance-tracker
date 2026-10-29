import React, { useState, useEffect } from 'react';
import { api, formatVND, todayISO, getUserDisplayName, type Debt, type DebtListResponse, type User } from '../lib/api';
import { parseAmountInput } from '../lib/smartParser';
import { Receipt, Plus, CheckCircle, Clock, Trash2, X, Sparkles, ArrowUpRight, ArrowDownLeft, Check, User as UserIcon, Calendar, AlertCircle, CreditCard as CreditCardIcon } from 'lucide-react';
import CreditCardManager from './CreditCardManager';

interface Props {
  refreshKey?: number;
  user?: User | null;
}

export default function DebtManager({ refreshKey, user }: Props) {
  const userName = getUserDisplayName(user);
  const [activeSection, setActiveSection] = useState<'personal' | 'credit_card'>('personal');
  const [creditCount, setCreditCount] = useState<number | null>(null);
  const [data, setData] = useState<DebtListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'lend' | 'borrow' | 'settled'>('all');

  // Modal thêm nợ mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [type, setType] = useState<'lend' | 'borrow'>('lend');
  const [person, setPerson] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal trả bớt tiền nợ
  const [repayDebt, setRepayDebt] = useState<Debt | null>(null);
  const [repayAmountStr, setRepayAmountStr] = useState('');

  async function loadDebts() {
    setLoading(true);
    try {
      const res = await api.getDebts();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDebts();
    api.getCreditCards().then(res => setCreditCount(res.data.length)).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setRepayDebt(null);
      }
    }
    if (showAddModal || repayDebt) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, repayDebt]);

  async function handleCreateDebt(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = parseAmountInput(amountStr);
    if (!person.trim()) {
      setError('Vui lòng nhập tên người vay hoặc người cho vay');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (ví dụ: 2tr, 1 củ, 500k)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createDebt({
        type,
        person: person.trim(),
        amount: parsedAmount,
        description: description.trim(),
        date,
        due_date: dueDate || undefined
      });
      setShowAddModal(false);
      setPerson('');
      setAmountStr('');
      setDescription('');
      setDueDate('');
      setDate(todayISO());
      await loadDebts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu khoản nợ');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkSettled(debt: Debt) {
    try {
      await api.updateDebt(debt.id, {
        paid_amount: debt.amount,
        status: 'settled'
      });
      await loadDebts();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRepaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repayDebt) return;

    const repayAmount = parseAmountInput(repayAmountStr);
    if (!repayAmount || repayAmount <= 0) return;

    const newPaid = Number(repayDebt.paid_amount) + repayAmount;
    try {
      await api.updateDebt(repayDebt.id, {
        paid_amount: newPaid,
        status: newPaid >= repayDebt.amount ? 'settled' : 'pending'
      });
      setRepayDebt(null);
      setRepayAmountStr('');
      await loadDebts();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteDebt(id: number) {
    if (!confirm(`${userName} có chắc chắn muốn xóa khoản nợ này?`)) return;
    try {
      await api.deleteDebt(id);
      await loadDebts();
    } catch (err) {
      console.error(err);
    }
  }

  // Lọc danh sách nợ
  const filteredDebts = (data?.data || []).filter(d => {
    if (filterType === 'settled') return d.status === 'settled';
    if (filterType === 'lend') return d.type === 'lend' && d.status === 'pending';
    if (filterType === 'borrow') return d.type === 'borrow' && d.status === 'pending';
    return true; // 'all'
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 space-y-5 transition-colors">
      {/* Tiêu đề & Nút thêm nợ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
            activeSection === 'credit_card'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
          }`}>
            {activeSection === 'credit_card' ? <CreditCardIcon className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 leading-tight">
              {activeSection === 'credit_card' ? 'Quản lý Nợ Thẻ Tín Dụng' : 'Sổ ghi nợ & Cho vay'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
              {activeSection === 'credit_card'
                ? 'Theo dõi dư nợ thẻ, hạn thanh toán sao kê và chủ động kế hoạch chi trả'
                : <>Khoản nợ sẽ được hoàn trả nên <strong className="text-purple-600 dark:text-purple-400 font-semibold">KHÔNG</strong> tính vào tổng thu chi và dòng tiền</>}
            </p>
          </div>
        </div>

        {activeSection === 'personal' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Ghi nhận khoản nợ mới
          </button>
        )}
      </div>

      {/* Phân nhóm: Nợ cá nhân vs Nợ thẻ tín dụng */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 max-w-sm">
        <button
          type="button"
          onClick={() => setActiveSection('personal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'personal'
              ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-xs'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Nợ cá nhân ({data?.data?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('credit_card')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'credit_card'
              ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <CreditCardIcon className="w-4 h-4" />
          <span>Thẻ tín dụng ({creditCount !== null ? creditCount : '0'})</span>
        </button>
      </div>

      {activeSection === 'credit_card' ? (
        <CreditCardManager user={user} refreshKey={refreshKey} onCountChange={setCreditCount} />
      ) : (
        <>
          {/* 2 Khối Thống kê Nợ riêng biệt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Người khác nợ người dùng */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2 transition-colors shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 truncate" title={`Người khác nợ ${userName}`}>
                    Người khác nợ {userName}
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  Cho vay
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                {formatVND(data?.summary.totalLendRemaining || 0)}
              </p>
            </div>

            {/* Người dùng đang nợ người khác */}
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 space-y-2 transition-colors shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-rose-200/70 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-rose-900 dark:text-rose-200 truncate" title={`${userName} đang nợ`}>
                    {userName} đang nợ
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[10.5px] bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                  Đi vay
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400 tracking-tight">
                {formatVND(data?.summary.totalBorrowRemaining || 0)}
              </p>
            </div>
          </div>

      {/* Bộ lọc tab nợ */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          Tất cả ({data?.data?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('lend')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterType === 'lend'
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          🟢 Cho vay (Cần thu)
        </button>
        <button
          type="button"
          onClick={() => setFilterType('borrow')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterType === 'borrow'
              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          🔴 Đi vay (Cần trả)
        </button>
        <button
          type="button"
          onClick={() => setFilterType('settled')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterType === 'settled'
              ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200'
              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          ✓ Đã thanh toán xong ({data?.summary?.settledCount || 0})
        </button>
      </div>

      {/* Danh sách các khoản nợ */}
      {loading ? (
        <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-8">Đang tải sổ nợ...</p>
      ) : filteredDebts.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl space-y-2">
          <Receipt className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Chưa có khoản nợ nào trong mục này.</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm khoản cho vay hoặc đi vay
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDebts.map(d => {
            const isLend = d.type === 'lend';
            const isSettled = d.status === 'settled';
            const remaining = d.remaining > 0 ? d.remaining : (isSettled ? 0 : d.amount);
            const paid = d.paid_amount || 0;
            const progressPct = d.amount > 0 ? Math.min(100, Math.round((paid / d.amount) * 100)) : 0;
            const isOverdue = !isSettled && d.due_date && d.due_date < todayISO();

            return (
              <div
                key={d.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isSettled
                    ? 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700/60 opacity-80'
                    : isLend
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/40 shadow-xs'
                    : 'bg-rose-50/40 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/40 shadow-xs'
                }`}
              >
                {/* Hàng 1: Badge Phân loại & Số tiền nợ còn lại */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 ${
                        isSettled
                          ? 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                          : isLend
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-rose-600 text-white shadow-rose-500/20'
                      }`}
                    >
                      {isSettled ? (
                        <>✓ Đã thanh toán xong</>
                      ) : isLend ? (
                        <>
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Cho vay (Cần thu)</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Đi vay (Cần trả)</span>
                        </>
                      )}
                    </span>

                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10.5px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Quá hạn
                      </span>
                    )}
                  </div>

                  {/* Số tiền nợ còn lại */}
                  <div className="text-right">
                    <div
                      className={`font-black text-base sm:text-lg tracking-tight tabular-nums ${
                        isSettled
                          ? 'text-slate-400 dark:text-zinc-500 line-through'
                          : isLend
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isSettled
                        ? formatVND(d.amount)
                        : (isLend ? `+${formatVND(remaining)}` : `-${formatVND(remaining)}`)}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block -mt-0.5 font-medium">
                      {isSettled ? 'Đã tất toán' : 'Số tiền còn lại'}
                    </span>
                  </div>
                </div>

                {/* Hàng 2: Đối tượng vay/cho vay cực kỳ rõ ràng */}
                <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-2.5 sm:p-3 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isLend
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                    }`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 leading-none">
                        {isLend ? `Người vay tiền của ${userName}:` : `${userName} đang vay tiền của:`}
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 leading-tight mt-1 truncate">
                        {d.person}
                      </div>
                    </div>
                  </div>

                  {d.description && (
                    <p className="text-xs text-slate-600 dark:text-zinc-300 pl-10.5 italic leading-relaxed">
                      "{d.description}"
                    </p>
                  )}
                </div>

                {/* Hàng 3: Chi tiết số tiền & thanh tiến độ (nếu đã trả một phần) */}
                {paid > 0 && !isSettled ? (
                  <div className="space-y-1 bg-slate-100/60 dark:bg-zinc-800/50 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      <span>Đã thanh toán: <strong className="text-emerald-600 dark:text-emerald-400">{formatVND(paid)}</strong> ({progressPct}%)</span>
                      <span>Gốc: <strong>{formatVND(d.amount)}</strong></span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    Số tiền gốc: <strong className="text-slate-700 dark:text-zinc-200">{formatVND(d.amount)}</strong>
                  </div>
                )}

                {/* Hàng 4: Ngày vay & Hạn trả */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày {isLend ? 'cho vay' : 'vay'}: <strong>{d.date ? d.date.split('-').reverse().join('/') : '---'}</strong></span>
                  </div>
                  <div>
                    {d.due_date ? (
                      <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-zinc-300'}>
                        ⏰ Hạn trả: <strong>{d.due_date.split('-').reverse().join('/')}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">⏰ Không hẹn ngày</span>
                    )}
                  </div>
                </div>

                {/* Hàng 5: Nút thao tác (Rộng rãi, dễ bấm trên mobile) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-1">
                    {!isSettled && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRepayDebt(d);
                            setRepayAmountStr('');
                          }}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-colors shadow-2xs text-center"
                        >
                          💸 {isLend ? 'Thu bớt' : 'Trả bớt'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkSettled(d)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã xong</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDebt(d.id)}
                    className="p-2 sm:p-1.5 text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 active:scale-90 transition-all cursor-pointer ml-auto"
                    title="Xóa khoản nợ này"
                    aria-label="Xóa khoản nợ này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* Modal Tạo Khoản Nợ Mới */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Ghi nhận khoản nợ mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3.5">
              {/* Chọn loại: Cho vay hay Đi vay */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setType('lend')}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    type === 'lend'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Cho vay (Người ta nợ {userName})
                </button>
                <button
                  type="button"
                  onClick={() => setType('borrow')}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    type === 'borrow'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Đi vay ({userName} nợ người ta)
                </button>
              </div>

              {/* Tên người */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  {type === 'lend' ? `Người mượn tiền của ${userName}:` : `Người ${userName} đã vay tiền:`}
                </label>
                <input
                  type="text"
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                  placeholder="Ví dụ: Hoàng, anh Tuấn, chị Linh..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  autoFocus
                />
              </div>

              {/* Số tiền */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  Số tiền nợ:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    placeholder="Ví dụ: 2tr, 1 củ, 500k, 2000000..."
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-bold text-sm">
                    ₫
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Hỗ trợ gõ tắt: <span className="text-purple-600 dark:text-purple-400 font-medium">2tr</span>, <span className="text-purple-600 dark:text-purple-400 font-medium">1 củ</span>, <span className="text-purple-600 dark:text-purple-400 font-medium">5 lít</span>...
                </p>
              </div>

              {/* Ngày vay & Ngày hẹn trả */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">Ngày vay:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-400 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">Hạn trả (tùy chọn):</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-400 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Mô tả / Lý do */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">Mô tả / Lý do:</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ví dụ: vay mua xe, mượn đóng tiền phòng..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu khoản nợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Trả bớt tiền nợ */}
      {repayDebt && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setRepayDebt(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">
                {repayDebt.type === 'lend' ? 'Ghi nhận thu bớt tiền nợ' : 'Ghi nhận trả bớt tiền nợ'}
              </h3>
              <button
                type="button"
                onClick={() => setRepayDebt(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300">
              {repayDebt.type === 'lend' ? 'Thu nợ từ' : 'Trả nợ cho'}: <strong className="text-slate-800 dark:text-zinc-100">{repayDebt.person}</strong> (Còn lại: <strong className="text-purple-600 dark:text-purple-400">{formatVND(repayDebt.remaining > 0 ? repayDebt.remaining : repayDebt.amount)}</strong>)
            </p>

            <form onSubmit={handleRepaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1">
                  {repayDebt.type === 'lend' ? 'Số tiền vừa thu thêm:' : 'Số tiền vừa trả thêm:'}
                </label>
                <input
                  type="text"
                  value={repayAmountStr}
                  onChange={e => setRepayAmountStr(e.target.value)}
                  placeholder="Ví dụ: 500k, 1 củ, 1000000..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepayDebt(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  {repayDebt.type === 'lend' ? 'Xác nhận thu nợ' : 'Xác nhận trả nợ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
