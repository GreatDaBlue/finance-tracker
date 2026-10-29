import React, { useState, useRef, useEffect } from 'react';
import { api, formatDate, thisMonthRange, type FilterParams } from '../lib/api';
import { Search, X, ChevronDown, Calendar, RotateCcw, HelpCircle, Sparkles } from 'lucide-react';

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

function homNay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type QuickKey = 'today' | 'month' | 'quarter' | 'year' | null;
function detectActiveQuick(filters: FilterParams): QuickKey {
  const today = homNay();
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const firstOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const firstOfQuarter = `${y}-${String(qStartMonth).padStart(2, '0')}-01`;
  const firstOfYear = `${y}-01-01`;

  if (filters.dateFrom === today && filters.dateTo === today) return 'today';
  if (filters.dateFrom === firstOfMonth && filters.dateTo === today) return 'month';
  if (filters.dateFrom === firstOfQuarter && filters.dateTo === today) return 'quarter';
  if (filters.dateFrom === firstOfYear && filters.dateTo === today) return 'year';
  return null;
}

export default function FilterBar({ filters, onFiltersChange }: Props) {
  const [naturalInput, setNaturalInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState('');
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const activeQuick = detectActiveQuick(filters);

  // Đóng dropdown & tooltip khi click ra ngoài
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatMenu(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Xử lý lệnh tự nhiên / tìm kiếm
  async function handleSearch(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : naturalInput).trim();
    if (!query) return;

    setIsParsing(true);
    setParseResult('');
    try {
      const r = await api.parseNaturalQuery(query);
      const f: FilterParams = {};
      if (r.type) f.type = r.type;
      if (r.category) f.category = r.category;
      if (r.dateFrom) f.dateFrom = r.dateFrom;
      if (r.dateTo) f.dateTo = r.dateTo;
      if (r.minAmount !== undefined) f.minAmount = r.minAmount;
      if (r.maxAmount !== undefined) f.maxAmount = r.maxAmount;

      // Nếu không khớp danh mục, ngày, số tiền hoặc loại, tìm kiếm theo từ khóa trong mô tả
      if (!r.category && !r.dateFrom && !r.type && r.minAmount === undefined && r.maxAmount === undefined) {
        f.search = query;
      }

      onFiltersChange(f);

      const parts: string[] = [];
      if (r.type) parts.push(r.type === 'income' ? 'Thu nhập' : 'Chi tiêu');
      if (r.category) parts.push(r.category);
      if (r.dateFrom) parts.push(`từ ${formatDate(r.dateFrom)}`);
      if (r.dateTo) parts.push(`đến ${formatDate(r.dateTo)}`);
      if (r.minAmount !== undefined && r.maxAmount !== undefined) {
        parts.push(`tiền từ ${r.minAmount.toLocaleString('vi-VN')}đ - ${r.maxAmount.toLocaleString('vi-VN')}đ`);
      } else if (r.minAmount !== undefined) {
        parts.push(`tiền ≥ ${r.minAmount.toLocaleString('vi-VN')}đ`);
      } else if (r.maxAmount !== undefined) {
        parts.push(`tiền ≤ ${r.maxAmount.toLocaleString('vi-VN')}đ`);
      }
      if (f.search) parts.push(`chứa từ "${f.search}"`);

      setParseResult(parts.length ? `→ ${parts.join(' · ')}` : `→ Tìm "${query}"`);
    } catch {
      // Nếu server lỗi parse, lọc tìm kiếm theo chuỗi text
      onFiltersChange({ search: query });
      setParseResult(`→ Tìm "${query}"`);
    } finally {
      setIsParsing(false);
    }
  }

  function applySuggestion(text: string) {
    setNaturalInput(text);
    setShowHelp(false);
    handleSearch(undefined, text);
  }

  function clearAll() {
    onFiltersChange(thisMonthRange());
    setNaturalInput('');
    setParseResult('');
  }

  function quickFilter(key: QuickKey) {
    const today = homNay();
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    if (key === 'today') {
      onFiltersChange({ ...filters, dateFrom: today, dateTo: today });
    } else if (key === 'month') {
      onFiltersChange({ ...filters, dateFrom: `${y}-${String(m).padStart(2, '0')}-01`, dateTo: today });
    } else if (key === 'quarter') {
      const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
      onFiltersChange({ ...filters, dateFrom: `${y}-${String(qStartMonth).padStart(2, '0')}-01`, dateTo: today });
    } else if (key === 'year') {
      onFiltersChange({ ...filters, dateFrom: `${y}-01-01`, dateTo: today });
    }
  }

  function quickCls(key: QuickKey) {
    const base = 'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ';
    if (activeQuick === key)
      return base + 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20';
    return base + 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600';
  }

  // Trạng thái mặc định ban đầu: là khoảng thời gian tháng này và không có tiêu chí lọc tùy chỉnh nào khác
  const defaultRange = thisMonthRange();
  const isDefaultDate = filters.dateFrom === defaultRange.dateFrom && filters.dateTo === defaultRange.dateTo;
  const hasCustomCriteria = Boolean(
    filters.search ||
    filters.type ||
    filters.category ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    naturalInput.trim() !== '' ||
    parseResult !== ''
  );
  // Chỉ hiển thị nút "Xóa lọc" khi người dùng ĐANG THỰC SỰ LỌC (đổi ngày, gõ tìm kiếm, chọn loại, chọn danh mục...)
  const canClear = hasCustomCriteria || (!isDefaultDate && (Boolean(filters.dateFrom) || Boolean(filters.dateTo)));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-4 space-y-3 transition-colors">
      {/* Ô tìm kiếm / lệnh tự nhiên */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={naturalInput}
            onChange={e => setNaturalInput(e.target.value)}
            placeholder='"thực phẩm từ 1/1/2026 đến nay", "chi tiêu tháng 10", hoặc gõ từ khóa "cơm", "grab"...'
            className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-colors"
          />

          {/* Vùng nút xóa & icon trợ giúp góc phải trong input */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {naturalInput && (
              <button
                type="button"
                onClick={() => {
                  setNaturalInput('');
                  if (filters.search) onFiltersChange({ ...filters, search: undefined });
                }}
                className="p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 rounded-md transition-colors"
                title="Xóa nội dung tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Icon dấu hỏi tròn nhỏ (?) */}
            <div
              ref={helpRef}
              className="relative inline-flex items-center"
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowHelp(prev => !prev);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-700/70 transition-colors focus:outline-none cursor-pointer"
                title="Gợi ý cách tìm kiếm"
                aria-label="Gợi ý cách tìm kiếm"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Tooltip / Popover gợi ý cách tìm kiếm */}
              {showHelp && (
                <>
                  {/* Backdrop mờ trên mobile để chạm ra ngoài là đóng */}
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 sm:hidden backdrop-blur-2xs"
                    onClick={e => {
                      e.stopPropagation();
                      setShowHelp(false);
                    }}
                  />

                  {/* Panel nội dung: Modal căn giữa màn hình trên Mobile, Popover thả xuống dưới ô tìm kiếm trên Desktop */}
                  <div
                    className="fixed sm:absolute z-50 inset-x-3 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:right-0 sm:top-full sm:translate-y-0 sm:mt-2 w-auto sm:w-80 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-700/90 rounded-2xl shadow-2xl p-4 text-xs text-slate-700 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-150 select-none max-h-[85vh] overflow-y-auto"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Mũi tên nhọn hướng lên icon ? trên màn hình desktop */}
                    <div className="hidden sm:block absolute -top-1.5 right-2 w-3 h-3 bg-white dark:bg-zinc-900 border-l border-t border-slate-200/90 dark:border-zinc-700/90 rotate-45" />

                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <span className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          Gợi ý cách tìm kiếm
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowHelp(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Đóng"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Mục 1: Theo tên / mô tả */}
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                          <span>📝</span>
                          <span>Tìm theo tên/mô tả:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          {["cơm", "cafe", "đổ xăng"].map(item => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => applySuggestion(item)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 border border-slate-200/60 dark:border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
                              title={`Tìm "${item}"`}
                            >
                              '{item}'
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mục 2: Theo số tiền */}
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                          <span>💵</span>
                          <span>Tìm theo số tiền:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          {["> 100k", "50k..200k", "< 500k"].map(item => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => applySuggestion(item)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 border border-slate-200/60 dark:border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
                              title={`Lọc số tiền ${item}`}
                            >
                              '{item}'
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mục 3: Theo thời gian */}
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
                          <span>📅</span>
                          <span>Tìm theo thời gian:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-4">
                          {["tháng 10", "tuần này", "từ 01/10 đến nay"].map(item => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => applySuggestion(item)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 border border-slate-200/60 dark:border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
                              title={`Lọc thời gian ${item}`}
                            >
                              '{item}'
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800 text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-400 italic">
                        💡 Mẹo: Bấm vào từ gợi ý để lọc nhanh hoặc gõ trực tiếp tự nhiên!
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isParsing || !naturalInput.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-xs"
        >
          {isParsing ? '...' : 'Tìm'}
        </button>

        {/* Nút Xóa lọc — Luôn hiện khi có bộ lọc hoặc có chữ tìm kiếm */}
        {canClear && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap border border-transparent dark:border-zinc-700"
            title="Xóa tất cả bộ lọc và quay về mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        )}
      </form>

      {parseResult && (
        <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-3 py-1.5 rounded-xl">
          <span className="font-medium">{parseResult}</span>
          <button
            type="button"
            onClick={() => setParseResult('')}
            className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 ml-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Bộ lọc UI — dòng 1: Toggle + Danh mục + Ngày */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle Thu / Chi / Tất cả */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs">
          {([['', 'Tất cả'], ['income', '📈 Thu'], ['expense', '📉 Chi']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => onFiltersChange({ ...filters, type: val as FilterParams['type'] })}
              className={`px-3 py-1.5 font-semibold transition-colors ${
                (filters.type ?? '') === val ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dropdown danh mục */}
        <div className="relative" ref={catRef}>
          <button
            type="button"
            onClick={() => setShowCatMenu(!showCatMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              filters.category
                ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700'
            }`}
          >
            {filters.category
              ? `${DANH_MUC.find(c => c.name === filters.category)?.icon} ${filters.category}`
              : '🏷️ Danh mục'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showCatMenu && (
            <div className="absolute top-full mt-1 left-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-zinc-800 z-50 w-64 py-1 max-h-72 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onFiltersChange({ ...filters, category: undefined });
                  setShowCatMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-medium"
              >
                Tất cả danh mục
              </button>
              {DANH_MUC.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    onFiltersChange({ ...filters, category: cat.name });
                    setShowCatMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 ${
                    filters.category === cat.name ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ngày từ → đến */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
            className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark] min-w-0 w-32"
          />
          <span className="text-slate-300 dark:text-zinc-600 text-sm font-bold">→</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
            className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark] min-w-0 w-32"
          />
        </div>
      </div>

      {/* Dòng 2: Nút chọn nhanh thời gian — Luôn nằm riêng ở dòng dưới */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 mr-1">Xem nhanh:</span>
        <button type="button" onClick={() => quickFilter('today')} className={quickCls('today')}>
          Hôm nay
        </button>
        <button type="button" onClick={() => quickFilter('month')} className={quickCls('month')}>
          Tháng này
        </button>
        <button type="button" onClick={() => quickFilter('quarter')} className={quickCls('quarter')}>
          Quý này
        </button>
        <button type="button" onClick={() => quickFilter('year')} className={quickCls('year')}>
          Năm nay
        </button>
      </div>
    </div>
  );
}
