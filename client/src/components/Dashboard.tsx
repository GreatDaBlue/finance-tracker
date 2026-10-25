import React, { useEffect, useState } from 'react';
import { api, formatVND, type SummaryStats, type CategoryStat, type DateStat, type FilterParams } from '../lib/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  filters: FilterParams;
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

export default function Dashboard({ filters }: Props) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [catStats, setCatStats] = useState<CategoryStat[]>([]);
  const [dateStats, setDateStats] = useState<DateStat[]>([]);
  const [chartGroup, setChartGroup] = useState<'day' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSummary(filters),
      api.getCategoryStats({ ...filters, type: 'expense' }),
      api.getDateStats({ ...filters, group: chartGroup })
    ]).then(([s, c, d]) => {
      setSummary(s);
      setCatStats(c.filter(cat => cat.type === 'expense'));
      setDateStats(d);
    }).finally(() => setLoading(false));
  }, [filters, chartGroup]);

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

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500 font-medium">Tổng thu</span>
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatVND(summary?.totalIncome ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-1">{summary?.count ?? 0} giao dịch</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500 font-medium">Tổng chi</span>
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatVND(summary?.totalExpense ?? 0)}</p>
        </div>

        <div className={`rounded-2xl shadow-sm border p-5 ${
          (summary?.balance ?? 0) >= 0
            ? 'bg-blue-600 border-blue-500'
            : 'bg-orange-500 border-orange-400'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/80 font-medium">Số dư</span>
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatVND(Math.abs(summary?.balance ?? 0))}</p>
          <p className="text-xs text-white/70 mt-1">
            {(summary?.balance ?? 0) >= 0 ? '↑ Dư thu' : '↓ Vượt chi'}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart — expense by category */}
        {expenseCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Phân bổ chi tiêu</h3>
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={180}>
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
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] pr-1">
                {expenseCategories.map((cat, i) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{CATEGORY_ICONS[cat.category] ?? '❓'} {cat.category}</span>
                    <span className="text-xs font-medium text-slate-700 flex-shrink-0">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Thu chi theo thời gian</h3>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                {(['day', 'month'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setChartGroup(g)}
                    className={`px-2.5 py-1 transition-colors ${chartGroup === g ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {g === 'day' ? 'Ngày' : 'Tháng'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dateStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
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
                  formatter={(val: number) => formatVND(val)}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top danh mục chi tiêu</h3>
          <div className="space-y-2">
            {catStats.slice(0, 5).map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-4">{i + 1}</span>
                <span className="text-lg">{CATEGORY_ICONS[cat.category] ?? '❓'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{cat.category}</span>
                    <span className="text-sm font-semibold text-red-500">{formatVND(cat.total)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-red-400"
                      style={{ width: `${pieTotal > 0 ? (cat.total / pieTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-8 text-right">{cat.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
