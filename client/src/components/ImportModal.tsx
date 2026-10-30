import React, { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import {
  parseBatchTransactions,
  formatAmountDisplay,
  type BatchParsedRow
} from '../lib/smartParser';
import { Upload, X, Check, AlertCircle, FileText, ClipboardList, Sparkles } from 'lucide-react';

interface Props {
  onImported: () => void;
  onClose: () => void;
}

type PreviewRow = BatchParsedRow;

export default function ImportModal({ onImported, onClose }: Props) {
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [directiveSummary, setDirectiveSummary] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Xử lý chuỗi văn bản thông minh (từ file CSV/TXT hoặc từ ô dán trực tiếp)
  function processContent(content: string, sourceName = '') {
    if (sourceName) setFileName(sourceName);
    setDone(false);

    if (!content.trim()) {
      setRows([]);
      setDirectiveSummary(undefined);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { rows: parsed, directiveSummary: detected } = parseBatchTransactions(content, today);
    setRows(parsed);
    setDirectiveSummary(detected);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      processContent(text, file.name);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleImport() {
    const valid = rows.filter(r => r.valid);
    if (!valid.length) return;
    setImporting(true);
    let count = 0;
    for (const row of valid) {
      try {
        await api.createTransaction({
          type: row.type,
          amount: row.amount,
          description: row.description,
          category: row.category || undefined,
          note: row.note,
          date: row.date,
        });
        count++;
      } catch {
        // Tiếp tục import các dòng khác nếu 1 dòng lỗi
      }
    }
    setImportedCount(count);
    setImporting(false);
    setDone(true);
    onImported();
  }

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-50 p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col transition-colors cursor-default"
        onClick={e => e.stopPropagation()}
      >

        {/* Tiêu đề Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/60 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-zinc-100">Nhập dữ liệu thu chi</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-400">Hỗ trợ file .CSV, .TXT hoặc dán trực tiếp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
          </button>
        </div>

        {/* Lựa chọn cách nhập: Chọn file hoặc Dán văn bản */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-zinc-800 flex gap-4">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === 'file' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Tải file (.csv / .txt)
          </button>
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === 'text' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Dán văn bản trực tiếp
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">

          {/* Tab 1: Tải file */}
          {tab === 'file' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl p-6 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 rounded-2xl flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                  {fileName ? fileName : 'Bấm để chọn file (.csv hoặc .txt)'}
                </span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  Tự động nhận diện cả file bảng CSV lẫn file ghi chú câu tự nhiên
                </span>
              </button>
            </div>
          )}

          {/* Tab 2: Dán trực tiếp */}
          {tab === 'text' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400">
                Dán danh sách thu chi (mỗi giao dịch 1 dòng):
              </label>
              <textarea
                rows={6}
                value={rawText}
                onChange={e => {
                  setRawText(e.target.value);
                  processContent(e.target.value, 'Văn bản dán trực tiếp');
                }}
                placeholder={"Đây là dữ liệu chi tháng 8\n01/08/2026 nhận tiền hoàn techcombank 100k\n02/08 ăn phở bò 40k\n03/08 - đổ xăng - 50k\n05 tiền điện nước 650k"}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          )}

          {/* Hướng dẫn định dạng ví dụ */}
          <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3 border border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 space-y-1.5">
            <p className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
              💡 Trợ lý AI tự động đọc hiểu thông minh:
            </p>
            <p>• <b>Chỉ thị ngữ cảnh:</b> Ghi dòng đầu như <code className="text-blue-600 dark:text-blue-400 font-semibold">Đây là dữ liệu chi tháng 8</code> hoặc <code className="text-emerald-600 dark:text-emerald-400 font-semibold">Đây là dữ liệu thu tháng 8</code> — toàn bộ các dòng dưới sẽ tự động được gán là Chi / Thu theo đúng tháng!</p>
            <p>• <b>Tự nhận diện khoản thu:</b> Các dòng có chữ <code className="text-amber-600 dark:text-amber-400 font-semibold">nhận tiền</code>, <code className="text-amber-600 dark:text-amber-400 font-semibold">hoàn tiền</code>, <code className="text-amber-600 dark:text-amber-400 font-semibold">tiền hoàn</code>, <code className="text-amber-600 dark:text-amber-400 font-semibold">lương</code>, <code className="text-amber-600 dark:text-amber-400 font-semibold">thưởng</code>... tự động là <b>Khoản Thu</b>.</p>
            <p>• <b>Định dạng linh hoạt:</b> Hỗ trợ cả câu tự nhiên, cách nhau bằng gạch nối <code className="text-slate-600 dark:text-zinc-300">01/08 - ăn trưa - 35k</code> hoặc file Excel / CSV.</p>
          </div>

          {/* Huy hiệu thông báo nhận diện ngữ cảnh */}
          {directiveSummary && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium animate-in fade-in">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Đã nhận diện ngữ cảnh: <strong>{directiveSummary}</strong></span>
            </div>
          )}

          {/* Xem trước bảng dữ liệu đã nhận diện */}
          {rows.length > 0 && !done && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                  Xem trước: {rows.length} dòng
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-green-100 dark:bg-green-950/70 text-green-700 dark:text-green-300 px-2.5 py-0.5 rounded-full font-medium">✓ {validCount} hợp lệ</span>
                  {invalidCount > 0 && (
                    <span className="bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-300 px-2.5 py-0.5 rounded-full font-medium">✗ {invalidCount} lỗi</span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800 sticky top-0 border-b border-slate-100 dark:border-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-left w-6"></th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-zinc-300 font-semibold">Ngày</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-zinc-300 font-semibold">Loại</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-zinc-300 font-semibold">Số tiền</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-zinc-300 font-semibold">Mô tả</th>
                      <th className="px-3 py-2 text-left text-slate-600 dark:text-zinc-300 font-semibold">Danh mục</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t border-slate-100 dark:border-zinc-800 ${r.valid ? 'hover:bg-slate-50 dark:hover:bg-zinc-800/60' : 'bg-red-50/60 dark:bg-red-950/30'}`}>
                        <td className="px-3 py-2">
                          {r.valid ? (
                            <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                          ) : (
                            <span title={r.error} className="inline-flex">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                          {r.date.split('-').reverse().join('/')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.type === 'income' ? 'bg-green-100 dark:bg-green-950/70 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-300'
                          }`}>
                            {r.type === 'income' ? 'Thu' : 'Chi'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-zinc-100 whitespace-nowrap">
                          {formatAmountDisplay(r.amount)}₫
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-zinc-300 max-w-[150px] truncate" title={r.description}>
                          {r.description}
                          {r.note && <span className="text-slate-400 dark:text-zinc-500 ml-1 text-[11px]">({r.note})</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-zinc-400 max-w-[120px] truncate" title={r.category}>
                          {r.category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Thông báo khi import thành công */}
          {done && (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-950/60 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-bold text-slate-800 dark:text-zinc-100 text-base">Nhập dữ liệu thành công!</p>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Đã lưu <b className="text-slate-800 dark:text-zinc-200">{importedCount}</b> giao dịch vào ứng dụng</p>
            </div>
          )}
        </div>

        {/* Nút hành động */}
        <div className="p-5 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium transition-colors"
          >
            {done ? 'Đóng' : 'Hủy'}
          </button>
          {!done && validCount > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {importing ? 'Đang lưu...' : `Nhập ${validCount} giao dịch`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
