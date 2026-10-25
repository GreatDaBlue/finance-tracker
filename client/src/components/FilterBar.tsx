import React, { useState, useRef, useEffect } from 'react';
import { api, formatDate, type FilterParams } from '../lib/api';
import { Search, X, ChevronDown, Calendar } from 'lucide-react';

interface Props {
  filters: FilterParams;
  onFiltersChange: (f: FilterParams) => void;
}

const DANH_MUC = [
  { name: 'Thực phẩm & Ăn uống', icon: '🍔' },
  { name: 'Nhà ở & Tiện ích', icon: '🏠' },
  { name: 'Di chuyển & Xăng xe', icon: '🚗' },
  { name: 'Y tế & Sức khỏe', icon: '🏥' },
  { name: 'Giải trí & Mua sắm', icon: '🎬' },
  { name: 'Giáo dục', icon: '📚' },
  { name: 'Thu nhập lương', icon: '💼' },
  { name: 'Thu nhập khác', icon: '💰' },
  { name: 'Tiết kiệm & Đầu tư', icon: '💳' },
  { name: 'Sửa chữa & Bảo trì', icon: '🔧' },
  { name: 'Khác', icon: '❓' },
];

// Trả về ngày hôm nay dạng YYYY-MM-DD
function homNay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Kiểm tra nút nhanh nào đang active
type QuickKey = 'today' | 'month' | 'year' | null;
function detectActiveQuick(filters: FilterParams): QuickKey {
  const today = homNay();
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const firstOfMonth = `${y}-${String(m).padStart(2,'0')}-01`;
  const firstOfYear  = `${y}-01-01`;

  if (filters.dateFrom === today && filters.dateTo === today) return 'today';
  if (filters.dateFrom === firstOfMonth && filters.dateTo === today) return 'month';
  if (filters.dateFrom === firstOfYear  && filters.dateTo === today) return 'year';
  return null;
}

export default function FilterBar({ filters, onFiltersChange }: Props) {
  const [naturalInput, setNaturalInput] = useState('');
  const [isParsing, setIsParsing]       = useState(false);
  const [parseResult, setParseResult]   = useState('');
  const [showCatMenu, setShowCatMenu]   = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const activeQuick = detectActiveQuick(filters);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatMenu(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Xử lý lệnh tự nhiên
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!naturalInput.trim()) return;
    setIsParsing(true); setParseResult('');
    try {
      const r = await api.parseNaturalQuery(naturalInput);
      const f: FilterParams = {};
      if (r.type)     f.type     = r.type;
      if (r.category) f.category = r.category;
      if (r.dateFrom) f.dateFrom = r.dateFrom;
      if (r.dateTo)   f.dateTo   = r.dateTo;
      onFiltersChange(f);
      const parts: string[] = [];
      if (r.type)     parts.push(r.type === 'income' ? 'Thu nhập' : 'Chi tiêu');
      if (r.category) parts.push(r.category);
      if (r.dateFrom) parts.push(`từ ${formatDate(r.dateFrom)}`);
      if (r.dateTo)   parts.push(`đến ${formatDate(r.dateTo)}`);
      setParseResult(parts.length ? `→ ${parts.join(' · ')}` : '→ Tất cả giao dịch');
    } catch { setParseResult('Không thể phân tích lệnh'); }
    finally { setIsParsing(false); }
  }

  function clearAll() {
    onFiltersChange({});
    setNaturalInput('');
    setParseResult('');
  }

  // Các nút lọc nhanh
  function quickFilter(key: QuickKey) {
    const today = homNay();
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    if (key === 'today') {
      onFiltersChange({ ...filters, dateFrom: today, dateTo: today });
    } else if (key === 'month') {
      onFiltersChange({ ...filters, dateFrom: `${y}-${String(m).padStart(2,'0')}-01`, dateTo: today });
    } else if (key === 'year') {
      onFiltersChange({ ...filters, dateFrom: `${y}-01-01`, dateTo: today });
    }
  }

  // Style nút quick đang active
  function quickCls(key: QuickKey) {
    const base = 'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ';
    if (activeQuick === key)
      return base + 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200';
    return base + 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300';
  }

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">

      {/* Ô lệnh tự nhiên */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={naturalInput}
            onChange={e => setNaturalInput(e.target.value)}
            placeholder='"thực phẩm từ 1/1/2026 đến nay", "chi tiêu tháng 10", "thu nhập năm nay"...'
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
        <button type="submit" disabled={isParsing || !naturalInput.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {isParsing ? '...' : 'Tìm'}
        </button>
        {hasFilters && (
          <button type="button" onClick={clearAll}
            className="px-3 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-sm hover:bg-slate-200 transition-colors flex items-center gap-1">
            <X className="w-4 h-4" /> Xóa lọc
          </button>
        )}
      </form>

      {parseResult && (
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium">{parseResult}</p>
      )}

      {/* Bộ lọc UI — dòng 1: Toggle + Danh mục + Ngày */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Toggle Thu / Chi / Tất cả */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 text-xs">
          {([['', 'Tất cả'], ['income', '📈 Thu'], ['expense', '📉 Chi']] as const).map(([val, label]) => (
            <button key={val}
              onClick={() => onFiltersChange({ ...filters, type: val as FilterParams['type'] })}
              className={`px-3 py-1.5 font-semibold transition-colors ${
                (filters.type ?? '') === val ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Dropdown danh mục */}
        <div className="relative" ref={catRef}>
          <button onClick={() => setShowCatMenu(!showCatMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              filters.category
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {filters.category
              ? `${DANH_MUC.find(c => c.name === filters.category)?.icon} ${filters.category}`
              : '🏷️ Danh mục'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showCatMenu && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-100 z-50 w-64 py-1 max-h-72 overflow-y-auto">
              <button onClick={() => { onFiltersChange({ ...filters, category: undefined }); setShowCatMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-500 font-medium">
                Tất cả danh mục
              </button>
              {DANH_MUC.map(cat => (
                <button key={cat.name}
                  onClick={() => { onFiltersChange({ ...filters, category: cat.name }); setShowCatMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${
                    filters.category === cat.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                  }`}>
                  <span>{cat.icon}</span><span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ngày từ → đến */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input type="date"
            value={filters.dateFrom || ''}
            onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
            className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] min-w-0 w-32" />
          <span className="text-slate-300 text-sm font-bold">→</span>
          <input type="date"
            value={filters.dateTo || ''}
            onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
            className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] min-w-0 w-32" />
        </div>
      </div>

      {/* Dòng 2: Nút chọn nhanh thời gian — Luôn nằm riêng ở dòng dưới */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400 mr-1">Xem nhanh:</span>
        <button type="button" onClick={() => quickFilter('today')}  className={quickCls('today')}>Hôm nay</button>
        <button type="button" onClick={() => quickFilter('month')}  className={quickCls('month')}>Tháng này</button>
        <button type="button" onClick={() => quickFilter('year')}   className={quickCls('year')}>Năm nay</button>
      </div>
    </div>
  );
}
