import React, { useEffect, useState, useRef } from 'react';
import { api, formatVND, getUserDisplayName, type SummaryStats, type CategoryStat, type DateStat, type FilterParams, type User, type CreditCardSummary } from '../lib/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, HelpCircle, CreditCard as CreditCardIcon } from 'lucide-react';

interface Props {
  filters: FilterParams;
  user?: User | null;
  onSwitchTab?: (tab: 'list' | 'dashboard' | 'budget' | 'debt') => void;
  refreshKey?: number;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

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

function formatShortVND(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return String(val);
}

interface SavingsTier {
  min: number;
  badge: string;
  badgeClass: string;
  titleColor: string;
  progressColor: string;
  comment: string;
}

function getSavingsTier(rate: number, name = 'bạn'): SavingsTier {
  if (rate >= 70) {
    return {
      min: 70,
      badge: '👑 Bậc Thầy Độc Lập Tài Chính (FIRE)',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      titleColor: 'text-purple-600 dark:text-purple-400',
      progressColor: 'text-purple-500',
      comment: `👑 Đẳng cấp tự do tài chính (FIRE)! ${name} đang giữ lại hơn 70% thu nhập — tốc độ tích lũy siêu tốc, làm chủ hoàn toàn tương lai!`
    };
  }
  if (rate >= 50) {
    return {
      min: 50,
      badge: '💎 Chuyên Gia Tích Lũy (50% - 70%)',
      badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      progressColor: 'text-indigo-500',
      comment: `💎 Quá ấn tượng! ${name} giữ lại hơn một nửa thu nhập — năng lực kiểm soát chi tiêu và điều hướng dòng tiền thuộc nhóm xuất chúng!`
    };
  }
  if (rate >= 35) {
    return {
      min: 35,
      badge: '🚀 Tích Lũy Vượt Trội (35% - 50%)',
      badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
      titleColor: 'text-teal-600 dark:text-teal-400',
      progressColor: 'text-teal-500',
      comment: `🚀 Tích lũy vượt trội! Vượt xa mức tiêu chuẩn thông thường, tài sản tích lũy và quỹ đầu tư của ${name} đang gia tăng với tốc độ rất nhanh!`
    };
  }
  if (rate >= 20) {
    return {
      min: 20,
      badge: '🌟 Chuẩn Vàng 50/30/20 (20% - 35%)',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      progressColor: 'text-emerald-500',
      comment: `🎉 Xuất sắc! ${name} đạt chuẩn vàng 50/30/20 — duy trì tỷ lệ tích lũy tài chính lành mạnh và an toàn bền vững!`
    };
  }
  if (rate >= 10) {
    return {
      min: 10,
      badge: '👍 Khá Tốt (10% - 20%)',
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
      titleColor: 'text-sky-600 dark:text-sky-400',
      progressColor: 'text-sky-500',
      comment: `👍 Tinh thần tiết kiệm rất tốt! ${name} đã có khoản dự phòng đều đặn. Hãy cố gắng tối ưu thêm một vài chi phí để chạm mốc Chuẩn vàng 20% nhé!`
    };
  }
  if (rate >= 0) {
    return {
      min: 0,
      badge: '💡 Mức Khởi Đầu (0% - 10%)',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      titleColor: 'text-amber-600 dark:text-amber-400',
      progressColor: 'text-amber-500',
      comment: `💡 ${name} đã bắt đầu có tích lũy nhưng còn mỏng. Hãy đặt mục tiêu tối ưu các khoản phát sinh ngoài ý muốn để nâng dần tỷ lệ tiết kiệm!`
    };
  }
  return {
    min: -Infinity,
    badge: '⚠️ Cảnh Báo Thâm Hụt (< 0%)',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    titleColor: 'text-rose-600 dark:text-rose-400',
    progressColor: 'text-rose-500',
    comment: `⚠️ ${name} đang chi tiêu vượt quá thu nhập kỳ này. Hãy rà soát lại các khoản chi không cấp thiết để tránh thâm hụt và nợ nần!`
  };
}

function getTimePeriodLabel(filters: FilterParams): string {
  const { dateFrom, dateTo } = filters;
  if (!dateFrom && !dateTo) return 'Tất cả';

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  // Hôm nay & Hôm qua
  if (dateFrom === dateTo) {
    if (dateFrom === todayStr) return 'Hôm nay';
    if (dateFrom === yesterdayStr) return 'Hôm qua';
    if (dateFrom) {
      const parts = dateFrom.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateFrom;
    }
  }

  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const firstOfCurMonth = `${curYear}-${pad(curMonth)}-01`;
  const firstOfCurYear = `${curYear}-01-01`;

  // Kiểm tra Tuần này (từ Thứ 2 đến Chủ nhật hoặc hôm nay)
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Thứ 2, 6 = Chủ nhật
  const monday = new Date(now);
  monday.setDate(monday.getDate() - dayOfWeek);
  const mondayStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

  if (dateFrom === mondayStr && (dateTo === sundayStr || dateTo === todayStr)) {
    return 'Tuần này';
  }

  // Kiểm tra Tháng này (từ ngày 01 đến hôm nay hoặc hết tháng)
  if (dateFrom === firstOfCurMonth && (dateTo === todayStr || dateTo?.startsWith(`${curYear}-${pad(curMonth)}`))) {
    return 'Tháng này';
  }

  // Kiểm tra Năm nay
  if (dateFrom === firstOfCurYear && (dateTo === todayStr || dateTo === `${curYear}-12-31`)) {
    return 'Năm nay';
  }

  // Kiểm tra một tháng cụ thể (ví dụ 2026-09-01 đến 2026-09-30)
  if (dateFrom && dateTo) {
    const fromParts = dateFrom.split('-').map(Number);
    const toParts = dateTo.split('-').map(Number);
    if (fromParts.length === 3 && toParts.length === 3 && fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === 1) {
      const lastDayOfMonth = new Date(fromParts[0], fromParts[1], 0).getDate();
      if (toParts[2] === lastDayOfMonth) {
        return fromParts[0] === curYear ? `Tháng ${fromParts[1]}` : `T${fromParts[1]}/${fromParts[0]}`;
      }
    }

    // Khoảng ngày: dd/MM - dd/MM
    if (fromParts.length === 3 && toParts.length === 3) {
      return `${pad(fromParts[2])}/${pad(fromParts[1])} - ${pad(toParts[2])}/${pad(toParts[1])}`;
    }
  }

  if (dateFrom && !dateTo) {
    const p = dateFrom.split('-');
    return p.length === 3 ? `Từ ${p[2]}/${p[1]}` : `Từ ${dateFrom}`;
  }

  if (!dateFrom && dateTo) {
    const p = dateTo.split('-');
    return p.length === 3 ? `Đến ${p[2]}/${p[1]}` : `Đến ${dateTo}`;
  }

  return 'Tùy chọn';
}

export default function Dashboard({ filters, user, onSwitchTab, refreshKey }: Props) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [catStats, setCatStats] = useState<CategoryStat[]>([]);
  const [dateStats, setDateStats] = useState<DateStat[]>([]);
  const [chartGroup, setChartGroup] = useState<'day' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [showRuleTooltip, setShowRuleTooltip] = useState(false);
  const [creditSummary, setCreditSummary] = useState<CreditCardSummary | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getCreditCards().then(res => setCreditSummary(res.summary)).catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowRuleTooltip(false);
      }
    }
    if (showRuleTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRuleTooltip]);

  useEffect(() => {
    // Chỉ bật skeleton loading khi chưa có dữ liệu nào trong RAM
    if (!summary) setLoading(true);

    const dateStatsFilters = { ...filters };
    if (chartGroup === 'quarter') {
      const curYear = new Date().getFullYear();
      if (!filters.dateFrom || (filters.dateFrom.startsWith(`${curYear}-`) && (!filters.dateTo || filters.dateTo.startsWith(`${curYear}-`)))) {
        dateStatsFilters.dateFrom = `${curYear}-01-01`;
        dateStatsFilters.dateTo = `${curYear}-12-31`;
      }
    } else if (chartGroup === 'year') {
      delete dateStatsFilters.dateFrom;
      delete dateStatsFilters.dateTo;
    }

    Promise.all([
      api.getSummary(filters),
      api.getCategoryStats({ ...filters, type: 'expense' }),
      api.getDateStats({ ...dateStatsFilters, group: chartGroup })
    ]).then(([s, c, d]) => {
      setSummary(s);
      setCatStats(c.filter(cat => cat.type === 'expense'));
      setDateStats(d);
    }).finally(() => setLoading(false));
  }, [filters, chartGroup, refreshKey]);

  if (loading && !summary) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-28 animate-pulse bg-slate-50" />
        ))}
      </div>
    );
  }

  const expenseCategories = catStats.slice(0, 8);
  const pieTotal = expenseCategories.reduce((s, c) => s + c.total, 0);
  const userName = getUserDisplayName(user);
  const comparison = summary?.comparison;
  const savingsRate = comparison?.savingsRate ?? (summary && summary.totalIncome > 0 ? Math.round(((summary.balance) / summary.totalIncome) * 1000) / 10 : 0);
  const savingsTier = getSavingsTier(savingsRate, userName);
  const timePeriodLabel = getTimePeriodLabel(filters);

  return (
    <div className="space-y-4">
      {/* Banner Cảnh báo Thẻ tín dụng sắp đến hạn / quá hạn */}
      {creditSummary && (creditSummary.overdueCount > 0 || creditSummary.dueSoonCount > 0) && (
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-2xs transition-all ${
          creditSummary.overdueCount > 0
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              creditSummary.overdueCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              <CreditCardIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold block leading-tight">
                {creditSummary.overdueCount > 0
                  ? `Cảnh báo: ${userName} có ${creditSummary.overdueCount} thẻ tín dụng đã quá hạn thanh toán!`
                  : `Nhắc nhở: ${userName} có ${creditSummary.dueSoonCount} thẻ tín dụng cần thanh toán trong 7 ngày tới!`}
              </span>
              <span className="text-[11px] opacity-85 block truncate">
                Tổng dư nợ thẻ cần thanh toán: <strong>{formatVND(creditSummary.totalDebtRemaining)}</strong>
              </span>
            </div>
          </div>
          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('debt')}
              className={`shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-2xs ${
                creditSummary.overdueCount > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              Xem thẻ nợ →
            </button>
          )}
        </div>
      )}

      {/* Summary cards — Mobile: Dòng tiền ròng làm Hero card full-width ở trên, 2 cột Thu & Chi ở dưới. Desktop: 3 cột ngang chuẩn */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Dòng tiền ròng — Hero Card trên Mobile (col-span-2 md:col-span-1 md:order-3) */}
        <div className={`col-span-2 md:col-span-1 md:order-3 rounded-2xl shadow-sm border p-3.5 sm:p-5 transition-all flex flex-col justify-between ${
          (summary?.balance ?? 0) >= 0
            ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 border-blue-500 text-white shadow-md shadow-blue-500/15'
            : 'bg-gradient-to-br from-rose-600 via-rose-600 to-red-700 border-rose-500 text-white shadow-md shadow-rose-500/15'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm text-white/95 font-bold leading-tight">
                  Dòng tiền ròng (Số dư)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                  (summary?.balance ?? 0) >= 0 ? 'bg-white/20 text-white' : 'bg-black/25 text-white'
                }`}>
                  {(summary?.balance ?? 0) >= 0 ? 'Thặng dư (+)' : 'Thâm hụt (-)'}
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>

            <p className="text-xl xs:text-2xl sm:text-2xl md:text-3xl font-black text-white tracking-tight tabular-nums py-0.5" title={formatVND(summary?.balance ?? 0)}>
              {(summary?.balance ?? 0) > 0
                ? `+${formatVND(summary?.balance ?? 0)}`
                : formatVND(summary?.balance ?? 0)}
            </p>
          </div>
          
          <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-white/95">
            <span className="text-[11px] sm:text-xs font-semibold">
              Tiết kiệm: <strong className="text-white font-extrabold">{savingsRate}%</strong> thu nhập
            </span>
            <span className="text-[10px] sm:text-[11px] text-white/80 hidden xs:inline">
              {(summary?.balance ?? 0) >= 0 ? 'Dòng tiền dương an toàn' : 'Cần tối ưu chi phí'}
            </span>
          </div>
        </div>

        {/* Tổng thu — col-span-1 md:order-1 */}
        <div className="col-span-1 md:order-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-3 sm:p-5 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-1">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium leading-tight">
                Tổng thu
              </span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm xs:text-base sm:text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums" title={formatVND(summary?.totalIncome ?? 0)}>
              {formatVND(summary?.totalIncome ?? 0)}
            </p>
          </div>
          
          {/* Số lượng giao dịch & so sánh */}
          <div className="mt-2 text-[10px] sm:text-xs space-y-0.5">
            {comparison?.incomeChangePct !== null && comparison?.incomeChangePct !== undefined ? (
              <div className="flex items-center gap-0.5 font-semibold text-[10px] sm:text-[11px]">
                <span className={comparison.incomeChangePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-400"}>
                  {comparison.incomeChangePct >= 0 ? `↑+${comparison.incomeChangePct}%` : `↓${comparison.incomeChangePct}%`}
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-normal hidden sm:inline">so với kỳ trước</span>
              </div>
            ) : null}
            <p className="text-slate-500 dark:text-zinc-400 font-medium">
              {summary?.incomeCount ?? summary?.count ?? 0} giao dịch
            </p>
          </div>
        </div>

        {/* Tổng chi — col-span-1 md:order-2 */}
        <div className="col-span-1 md:order-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-3 sm:p-5 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-1">
              <span className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium leading-tight">
                Tổng chi
              </span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-50 dark:bg-rose-950/60 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 dark:text-rose-400" />
              </div>
            </div>
            <p className="text-sm xs:text-base sm:text-xl md:text-2xl font-bold text-rose-500 dark:text-rose-400 tracking-tight tabular-nums" title={formatVND(summary?.totalExpense ?? 0)}>
              {formatVND(summary?.totalExpense ?? 0)}
            </p>
          </div>
          
          {/* Số lượng giao dịch & so sánh */}
          <div className="mt-2 text-[10px] sm:text-xs space-y-0.5">
            {comparison?.expenseChangePct !== null && comparison?.expenseChangePct !== undefined ? (
              <div className="flex items-center gap-0.5 font-semibold text-[10px] sm:text-[11px]">
                <span className={comparison.expenseChangePct <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                  {comparison.expenseChangePct <= 0 ? `↓${comparison.expenseChangePct}%` : `↑+${comparison.expenseChangePct}%`}
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-normal hidden sm:inline">so với kỳ trước</span>
              </div>
            ) : comparison?.expenseToIncomeRatio !== null && comparison?.expenseToIncomeRatio !== undefined ? (
              <span className="text-slate-400 dark:text-zinc-500 font-normal text-[10px] sm:text-[11px] block">
                Tiêu {comparison.expenseToIncomeRatio}% thu
              </span>
            ) : null}
            <p className="text-slate-500 dark:text-zinc-400 font-medium">
              {summary?.expenseCount ?? 0} giao dịch
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ Tiến độ Tỷ lệ tiết kiệm (Savings Rate Gauge) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Chỉ số tài chính</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${savingsTier.badgeClass}`}>
              {savingsTier.badge}
            </span>

            {/* Nút ? giải thích chuẩn vàng 50/30/20 */}
            <div className="relative inline-block" ref={tooltipRef}>
              <button
                type="button"
                onClick={() => setShowRuleTooltip(v => !v)}
                onMouseEnter={() => setShowRuleTooltip(true)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Tìm hiểu quy tắc 50/30/20"
                aria-label="Tìm hiểu quy tắc 50/30/20"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Tooltip Popover giải thích chuẩn vàng 50/30/20 */}
              {showRuleTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 z-50 w-[295px] sm:w-[350px] max-w-[calc(100vw-36px)] p-3.5 sm:p-4 rounded-xl shadow-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-left animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                      <span className="font-bold text-slate-800 dark:text-zinc-100 text-xs sm:text-sm">
                        📐 Chuẩn Vàng 50/30/20 là gì?
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowRuleTooltip(false); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 leading-none text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Quy tắc phân bổ thu nhập kinh điển của trường Đại học Harvard, giúp {userName} cân bằng cuộc sống và tích lũy bền vững:
                    </p>

                    <div className="space-y-1.5">
                      <div className="p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                        <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-between text-[11px]">
                          <span>🏠 50% Nhu cầu thiết yếu</span>
                          <span className="text-[9.5px] bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-bold">Needs</span>
                        </div>
                        <p className="text-[10.5px] text-blue-950/80 dark:text-blue-200/80 mt-0.5">
                          Tiền nhà, ăn uống cơ bản, điện nước, xăng xe, y tế, học phí, chi phí tối thiểu để duy trì cuộc sống...
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                        <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between text-[11px]">
                          <span>🎬 30% Mong muốn & Sở thích</span>
                          <span className="text-[9.5px] bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold">Wants</span>
                        </div>
                        <p className="text-[10.5px] text-amber-950/80 dark:text-amber-200/80 mt-0.5">
                          Mua sắm, ăn ngoài, du lịch, xem phim, cà phê, sở thích cá nhân nâng cao chất lượng sống...
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-[11px]">
                          <span>💰 20% Tiết kiệm & Tích lũy</span>
                          <span className="text-[9.5px] bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">Savings</span>
                        </div>
                        <p className="text-[10.5px] text-emerald-950/80 dark:text-emerald-200/80 mt-0.5">
                          Quỹ khẩn cấp (3-6 tháng sinh hoạt), gửi tiết kiệm, đầu tư sinh lời và trả nợ gốc (chuẩn tối thiểu).
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 italic">
                      💡 Mốc 20% là chuẩn vàng tối thiểu. Càng tiết kiệm nhiều hơn (35%, 50%, 70%), {userName} càng nhanh chóng đạt Độc Lập Tài Chính (FIRE)!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">
            Tỷ lệ tiết kiệm (Savings Rate): <span className={savingsTier.titleColor}>{savingsRate}%</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-xl">
            {savingsTier.comment}
          </p>
        </div>

        {/* Vòng tròn tiến độ SVG */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100 dark:text-zinc-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${savingsTier.progressColor} transition-all duration-1000`}
              strokeDasharray={`${Math.max(0, Math.min(100, savingsRate))}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-sm sm:text-base font-extrabold ${savingsTier.titleColor}`}>
              {savingsRate}%
            </span>
            <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium">Tiết kiệm</span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart — expense by category */}
        {expenseCategories.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-4">Phân bổ chi tiêu</h3>
            <div className="flex gap-4 items-center">
              <div className="relative w-1/2 h-[180px] flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%" cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {expenseCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [formatVND(val), '']}
                      contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: '#18181b', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Note thời gian ở giữa vòng tròn */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none p-1">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium leading-none">
                    Chi tiêu
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-zinc-200 leading-tight mt-0.5">
                    {timePeriodLabel}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] pr-1">
                {expenseCategories.map((cat, i) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 dark:text-zinc-300 flex-1 truncate">{CATEGORY_ICONS[cat.category] ?? '❓'} {cat.category}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex-shrink-0">
                      {pieTotal > 0 ? Math.round((cat.total / pieTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bar chart — income vs expense by period */}
        {dateStats.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Thu chi theo thời gian</h3>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 text-xs bg-slate-50 dark:bg-zinc-800">
                {([
                  { key: 'day', label: 'Ngày' },
                  { key: 'month', label: 'Tháng' },
                  { key: 'quarter', label: 'Quý' },
                  { key: 'year', label: 'Năm' }
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setChartGroup(key)}
                    className={`px-2 sm:px-2.5 py-1 transition-colors ${
                      chartGroup === key
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dateStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(p: string) => {
                    if (chartGroup === 'quarter') {
                      const m = p.match(/^(\d{4})-Q(\d)$/);
                      if (m) return `Q${m[2]}/${m[1].slice(2)}`;
                    } else if (chartGroup === 'month') {
                      const m = p.match(/^(\d{4})-(\d{2})$/);
                      if (m) return `${m[2]}/${m[1].slice(2)}`;
                    } else if (chartGroup === 'day') {
                      const m = p.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                      if (m) return `${m[3]}/${m[2]}`;
                    }
                    return p;
                  }}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatShortVND}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  labelFormatter={(label: string) => {
                    if (chartGroup === 'quarter') {
                      const m = label.match(/^(\d{4})-Q(\d)$/);
                      if (m) return `Quý ${m[2]} năm ${m[1]}`;
                    } else if (chartGroup === 'month') {
                      const m = label.match(/^(\d{4})-(\d{2})$/);
                      if (m) return `Tháng ${m[2]}/${m[1]}`;
                    } else if (chartGroup === 'year') {
                      return `Năm ${label}`;
                    } else if (chartGroup === 'day') {
                      const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                      if (m) return `Ngày ${m[3]}/${m[2]}/${m[1]}`;
                    }
                    return label;
                  }}
                  formatter={(val: number) => [formatVND(val), '']}
                  contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: '#18181b', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Thu" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top categories table */}
      {catStats.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-4">Top danh mục chi tiêu</h3>
          <div className="space-y-2">
            {catStats.slice(0, 5).map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-slate-400 dark:text-zinc-500 text-xs w-4">{i + 1}</span>
                <span className="text-lg">{CATEGORY_ICONS[cat.category] ?? '❓'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-zinc-300">{cat.category}</span>
                    <span className="text-sm font-semibold text-red-500 dark:text-rose-400">{formatVND(cat.total)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-red-400 dark:bg-rose-500"
                      style={{ width: `${pieTotal > 0 ? (cat.total / pieTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 dark:text-zinc-500 w-8 text-right">{cat.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
