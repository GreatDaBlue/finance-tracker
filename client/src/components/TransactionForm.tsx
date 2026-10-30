import React, { useState, useEffect, useRef } from 'react';
import { api, formatVND, todayISO, getUserDisplayName, type Transaction, type User } from '../lib/api';
import {
  parseSmartInput,
  parseAmountInput,
  formatAmountDisplay,
  guessCategoryAndType,
  parseDateFromVietnameseText,
  parseMultiSmartInput,
  cleanDescriptionText,
  type ParsedTransactionItem,
  DANH_MUC,
  getCategoryIcon
} from '../lib/smartParser';
import { getAllCategories } from '../lib/customCategories';
import { Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Mic, MicOff, X, Layers } from 'lucide-react';

interface Props {
  onCreated: (t: Transaction) => void;
  user?: User | null;
}

export default function TransactionForm({ onCreated, user }: Props) {
  const userName = getUserDisplayName(user);
  const availableCategories = Array.from(new Set([...DANH_MUC, ...getAllCategories().map(c => c.name)]));
  const [smartText, setSmartText]                 = useState('');
  const [parsedItems, setParsedItems]             = useState<ParsedTransactionItem[]>([]);
  const [type, setType]                           = useState<'expense' | 'income' | 'debt_lend' | 'debt_borrow'>('expense');
  const [person, setPerson]                       = useState('');
  const [userOverrodeType, setUserOverrodeType]   = useState(false);
  const [amount, setAmount]                       = useState('');
  const [description, setDescription]             = useState('');
  const [note, setNote]                           = useState('');
  const [date, setDate]                           = useState(todayISO());
  const [category, setCategory]                   = useState('');
  const [expanded, setExpanded]                   = useState(false);
  const [preview, setPreview]                     = useState<{ category: string; suggestedDate: string; cleanDescription: string } | null>(null);
  const [showHelp, setShowHelp]                   = useState(false);
  const [isListening, setIsListening]             = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [isRecurring, setIsRecurring]             = useState(false);
  const [recurringDay, setRecurringDay]           = useState(new Date().getDate());
  const [error, setError]                         = useState('');
  const [success, setSuccess]                     = useState('');

  const previewTimer = useRef<ReturnType<typeof setTimeout>>();
  const recognitionRef = useRef<any>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Đóng tooltip trợ giúp khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }
    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelp]);

  // Dừng nhận diện giọng nói khi component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // ── Xử lý nhận diện giọng nói tiếng Việt (Web Speech API) ─────────────────
  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      setError(`Trình duyệt chưa hỗ trợ nhận diện giọng nói. ${userName} vui lòng dùng Google Chrome, Edge hoặc Cốc Cốc nhé!`);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setSmartText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Vui lòng cấp quyền truy cập Micro trên trình duyệt để nhập bằng giọng nói.');
        } else if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      setIsListening(false);
      setError('Không thể kích hoạt micro: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
    }
  }

  // ── Khi người dùng gõ hoặc nói vào ô nhập nhanh ──────────────────────────
  useEffect(() => {
    if (!smartText.trim()) {
      setParsedItems([]);
      setPreview(null);
      if (!expanded) {
        setAmount('');
        setDescription('');
        setNote('');
        setPerson('');
        setCategory('');
        setDate(todayISO());
        if (!userOverrodeType) setType('expense');
      }
      return;
    }

    // 1. Phân tích đa giao dịch / giao dịch kép
    const multi = parseMultiSmartInput(smartText, todayISO());
    setParsedItems(multi);

    // 2. Nếu chỉ có 1 giao dịch hoặc câu đơn
    if (multi.length <= 1) {
      if (multi.length === 1 && multi[0].isDebt) {
        const item = multi[0];
        if (item.amount) setAmount(formatAmountDisplay(item.amount));
        if (item.note) setNote(item.note);
        if (!userOverrodeType) {
          setType(item.type);
        }
        setPerson(item.person || '');
        if (item.date) setDate(item.date);
        setCategory('Sổ nợ');
        setDescription(item.description);
        setPreview(null);
        return;
      }

      const parsed = parseSmartInput(smartText);
      const clientDate = parseDateFromVietnameseText(parsed.description || smartText);
      const guessed = guessCategoryAndType(parsed.description || smartText);

      if (parsed.amount !== null) {
        setAmount(formatAmountDisplay(parsed.amount));
      }
      if (parsed.note) {
        setNote(parsed.note);
      }
      if (!userOverrodeType) {
        setType(guessed.type);
      }
      if (clientDate.date) {
        setDate(clientDate.date);
      }
      if (!category || category === 'Sổ nợ') {
        setCategory(guessed.category);
      }
      setDescription(cleanDescriptionText(clientDate.cleanText || parsed.description || smartText.trim()));

      // Gọi server classifyPreview
      clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(async () => {
        const activeType = userOverrodeType
          ? (type === 'income' ? 'income' : 'expense')
          : guessed.type;
        const descForServer = parsed.description.trim() || smartText.trim();
        if (!descForServer) return;

        try {
          const p = await api.classifyPreview(descForServer, activeType);
          setPreview(p);
          if (p.suggestedDate) setDate(p.suggestedDate);
          setCategory(p.category || guessed.category);
          setDescription(cleanDescriptionText(p.cleanDescription || parsed.description));
        } catch {
          setPreview({
            category: guessed.category,
            suggestedDate: clientDate.date,
            cleanDescription: cleanDescriptionText(clientDate.cleanText || parsed.description)
          });
        }
      }, 380);
    } else {
      setPreview(null);
    }

    return () => clearTimeout(previewTimer.current);
  }, [smartText, userOverrodeType, type]);

  // ── Thao tác trên danh sách nhiều giao dịch ──────────────────────────────
  function removeItem(index: number) {
    const updated = parsedItems.filter((_, i) => i !== index);
    setParsedItems(updated);
  }

  function toggleItemType(index: number) {
    const updated = [...parsedItems];
    const curr = updated[index].type;
    let next: 'expense' | 'income' | 'debt_lend' | 'debt_borrow';
    if (curr === 'expense') next = 'income';
    else if (curr === 'income') next = 'debt_lend';
    else if (curr === 'debt_lend') next = 'debt_borrow';
    else next = 'expense';

    const isDebt = next === 'debt_lend' || next === 'debt_borrow';
    const debtType = next === 'debt_lend' ? 'lend' : next === 'debt_borrow' ? 'borrow' : undefined;

    updated[index] = {
      ...updated[index],
      type: next,
      isDebt,
      debtType,
      category: isDebt ? 'Sổ nợ' : (updated[index].category === 'Sổ nợ' ? 'Khác' : updated[index].category),
      person: isDebt ? (updated[index].person || (debtType === 'borrow' ? 'Chủ nợ' : 'Người vay')) : undefined
    };
    setParsedItems(updated);
  }

  function updateItemCategory(index: number, newCat: string) {
    const updated = [...parsedItems];
    updated[index] = {
      ...updated[index],
      category: newCat
    };
    setParsedItems(updated);
  }

  function updateItemDate(index: number, newDate: string) {
    const updated = [...parsedItems];
    updated[index] = {
      ...updated[index],
      date: newDate
    };
    setParsedItems(updated);
  }

  // ── Đổi loại Thu/Chi/Nợ thủ công trong Tùy chỉnh chi tiết ───────────────────
  function handleTypeChange(newType: 'expense' | 'income' | 'debt_lend' | 'debt_borrow') {
    setType(newType);
    setUserOverrodeType(true);
    if (newType === 'debt_lend' || newType === 'debt_borrow') {
      setCategory('Sổ nợ');
      if (!person) {
        setPerson(newType === 'debt_borrow' ? 'Chủ nợ' : 'Người vay');
      }
    } else {
      setCategory('');
    }
    setPreview(null);
  }

  // ── Submit form ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Trường hợp 1: Nhập nhiều giao dịch cùng lúc (parsedItems.length > 1)
    if (parsedItems.length > 1) {
      setIsSubmitting(true);
      try {
        const regularItems = parsedItems.filter(i => !i.isDebt);
        const debtItems = parsedItems.filter(i => i.isDebt);

        let createdTxCount = 0;
        let createdDebtCount = 0;

        if (regularItems.length > 0) {
          const res = await api.createBatchTransactions(
            regularItems.map(item => ({
              type: item.type === 'income' ? 'income' : 'expense',
              amount: item.amount,
              description: item.description,
              category: item.category || undefined,
              note: item.note,
              date: item.date,
            }))
          );
          createdTxCount = res.count;
          if (res.data && res.data.length > 0) {
            onCreated(res.data[0]);
          }
        }

        if (debtItems.length > 0) {
          await Promise.all(
            debtItems.map(d =>
              api.createDebt({
                type: d.debtType || (d.type === 'debt_borrow' ? 'borrow' : 'lend'),
                person: d.person?.trim() || (d.debtType === 'borrow' ? 'Chủ nợ' : 'Người vay'),
                amount: d.amount,
                description: d.description,
                date: d.date,
                due_date: undefined
              })
            )
          );
          createdDebtCount = debtItems.length;
          onCreated({} as Transaction);
        }

        const msgParts: string[] = [];
        if (createdTxCount > 0) msgParts.push(`${createdTxCount} giao dịch`);
        if (createdDebtCount > 0) msgParts.push(`${createdDebtCount} khoản vào Sổ nợ`);
        setSuccess(`✅ Đã lưu thành công: ${msgParts.join(' và ')}!`);

        // Reset
        setSmartText('');
        setParsedItems([]);
        setAmount('');
        setDescription('');
        setNote('');
        setPerson('');
        setCategory('');
        setPreview(null);
        setDate(todayISO());
        setUserOverrodeType(false);
        setTimeout(() => setSuccess(''), 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi khi lưu các giao dịch');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Trường hợp 2: Nhập giao dịch đơn lẻ hoặc Nợ đơn lẻ
    let finalAmount = parseAmountInput(amount);
    let finalDesc = cleanDescriptionText(description.trim() || smartText.trim());
    let finalNote = note.trim();
    let finalType = type;
    let finalDate = date;
    let finalCat = category;

    if (parsedItems.length === 1) {
      const item = parsedItems[0];
      finalAmount = item.amount;
      finalDesc = item.description;
      finalNote = item.note;
      finalType = userOverrodeType ? type : item.type;
      finalDate = item.date;
      finalCat = category || item.category;
    } else if ((!finalAmount || !finalDesc) && smartText.trim()) {
      const parsed = parseSmartInput(smartText);
      if (parsed.amount) finalAmount = parsed.amount;
      if (parsed.note) finalNote = parsed.note;
      if (!finalDesc) finalDesc = parsed.description || smartText.trim();

      const guessed = guessCategoryAndType(parsed.description || smartText);
      if (!userOverrodeType) finalType = guessed.type;
      if (!finalCat) finalCat = guessed.category;

      const clientDate = parseDateFromVietnameseText(parsed.description || smartText);
      if (clientDate.date) finalDate = clientDate.date;
    }

    // Kiểm tra nếu là Nợ (Cho vay hoặc Đi vay)
    const isSingleDebt =
      finalType === 'debt_lend' ||
      finalType === 'debt_borrow' ||
      (parsedItems.length === 1 && parsedItems[0].isDebt);

    if (isSingleDebt) {
      const debtItem = parsedItems.length === 1 && parsedItems[0].isDebt ? parsedItems[0] : null;
      const debtType = (finalType === 'debt_borrow' || debtItem?.debtType === 'borrow') ? 'borrow' : 'lend';
      const debtPerson = person.trim() || debtItem?.person?.trim() || (debtType === 'borrow' ? 'Chủ nợ' : 'Người vay');
      const debtAmount = debtItem ? debtItem.amount : finalAmount;
      const debtDesc = finalDesc || (debtType === 'lend' ? `Cho ${debtPerson} vay` : `Vay ${debtPerson}`);

      if (!debtAmount || debtAmount <= 0) {
        setError('Vui lòng nhập số tiền cho khoản nợ (ví dụ: 500k, 2tr, 1 củ)');
        return;
      }

      setIsSubmitting(true);
      try {
        await api.createDebt({
          type: debtType,
          person: debtPerson,
          amount: debtAmount,
          description: debtDesc,
          date: finalDate,
          due_date: undefined
        });

        onCreated({} as Transaction);
        setSuccess(`✅ Đã lưu vào Sổ nợ: ${debtType === 'lend' ? `Cho ${debtPerson} vay` : `Vay ${debtPerson}`} — ${formatVND(debtAmount)} (Không tính vào thu chi)!`);

        // Reset form
        setSmartText('');
        setParsedItems([]);
        setAmount('');
        setDescription('');
        setNote('');
        setPerson('');
        setCategory('');
        setPreview(null);
        setDate(todayISO());
        setUserOverrodeType(false);
        setTimeout(() => setSuccess(''), 3500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu khoản nợ');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Giao dịch thông thường (Chi tiêu hoặc Thu nhập)
    if (!finalAmount || finalAmount <= 0) {
      setError('Vui lòng nhập số tiền trong câu (ví dụ: ăn trưa 35k, 2tr) hoặc điền ở Tùy chỉnh chi tiết.');
      return;
    }
    if (!finalDesc) {
      setError('Vui lòng nhập mô tả giao dịch');
      return;
    }

    setIsSubmitting(true);
    try {
      const t = await api.createTransaction({
        type: finalType === 'income' ? 'income' : 'expense',
        amount: finalAmount,
        description: finalDesc,
        category: finalCat || undefined,
        note: finalNote,
        date: finalDate,
      });
      onCreated(t);

      // Nếu người dùng tích chọn "Lặp lại hàng tháng"
      if (isRecurring && (finalType === 'income' || finalType === 'expense')) {
        try {
          const dom = parseInt(String(recurringDay), 10) || (finalDate ? parseInt(finalDate.split('-')[2], 10) : new Date().getDate());
          await api.createRecurring({
            type: finalType,
            amount: finalAmount,
            description: finalDesc,
            category: finalCat || undefined,
            note: finalNote,
            day_of_month: dom
          });
          setSuccess(`✅ Đã lưu ${t.type === 'expense' ? 'chi tiêu' : 'thu nhập'} và kích hoạt tự động lặp lại vào ngày ${dom} hàng tháng!`);
        } catch {
          setSuccess(`✅ Đã lưu ${t.type === 'expense' ? 'chi tiêu' : 'thu nhập'}: ${t.description} — ${formatVND(t.amount)}`);
        }
      } else {
        setSuccess(`✅ Đã lưu ${t.type === 'expense' ? 'chi tiêu' : 'thu nhập'}: ${t.description} — ${formatVND(t.amount)}`);
      }

      // Reset form
      setSmartText('');
      setParsedItems([]);
      setAmount('');
      setDescription('');
      setNote('');
      setPerson('');
      setCategory('');
      setIsRecurring(false);
      setPreview(null);
      setDate(todayISO());
      setUserOverrodeType(false);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu giao dịch');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Tính tổng số tiền khi có nhiều giao dịch
  const isMultiple = parsedItems.length > 1;
  const totalIncome = parsedItems.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const totalExpense = parsedItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  const debtCount = parsedItems.filter(i => i.isDebt).length;

  // Màu sắc theo loại giao dịch
  const isExpense = type === 'expense';
  const isIncome = type === 'income';
  const isDebtLend = type === 'debt_lend';
  const isDebtBorrow = type === 'debt_borrow';
  const isAnyDebt = isDebtLend || isDebtBorrow;

  const colorCls = isExpense
    ? { btn: 'bg-red-500 hover:bg-red-600', ring: 'focus:ring-red-400', badge: 'bg-red-100 text-red-700 border-red-200' }
    : isIncome
    ? { btn: 'bg-green-600 hover:bg-green-700', ring: 'focus:ring-green-400', badge: 'bg-green-100 text-green-700 border-green-200' }
    : isDebtLend
    ? { btn: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-400', badge: 'bg-purple-100 text-purple-700 border-purple-200' }
    : { btn: 'bg-amber-600 hover:bg-amber-700', ring: 'focus:ring-amber-400', badge: 'bg-amber-100 text-amber-800 border-amber-200' };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
      {/* Tiêu đề & Trợ giúp ? */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-zinc-100 leading-tight">Thêm giao dịch</h2>
            <p className="text-xs text-slate-400 dark:text-zinc-400">Gõ hoặc nói tự nhiên</p>
          </div>
        </div>

        {/* Nút trợ giúp ? */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-blue-600 font-bold text-sm flex items-center justify-center transition-all shadow-xs"
            title="Gợi ý cách sử dụng"
          >
            ?
          </button>

          {showHelp && (
            <div className="absolute right-0 top-9 z-50 w-80 sm:w-96 p-4 bg-slate-900 text-white text-xs rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5 text-sm">
                  💡 Gợi ý cách sử dụng
                </span>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Câu hỏi theo đúng văn bản yêu cầu */}
              <p className="text-slate-200 leading-relaxed text-xs mb-2.5">
                Chỉ cần gõ theo cách {userName} nói (ví dụ: &ldquo;<span
                  className="text-amber-300 font-medium underline cursor-pointer hover:text-amber-200"
                  onClick={() => {
                    setSmartText('hôm qua ăn phở 100k với Hoàng(trong đó 50k mời Hoàng)');
                    setShowHelp(false);
                  }}
                  title="Nhấn để áp dụng câu mẫu này"
                >hôm qua ăn phở 100k với Hoàng(trong đó 50k mời Hoàng)</span>&rdquo;), hệ thống sẽ tự nhận diện số tiền, ngày và danh mục.
              </p>

              {/* Ví dụ nhập nhiều giao dịch cùng 1 dòng & Sổ nợ */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="font-semibold text-sky-300 block">
                  ⚡ Mới: Ghi nợ / Cho vay tự động & Nhiều giao dịch:
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Hiểu từ lóng: <span className="text-amber-300 font-semibold">k</span>, <span className="text-amber-300 font-semibold">lít</span> (100k), <span className="text-amber-300 font-semibold">củ</span> (1 triệu), <span className="text-amber-300 font-semibold">tr</span>...
                </p>
                <div
                  className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-purple-300 cursor-pointer hover:bg-slate-800 transition-colors space-y-1"
                  onClick={() => {
                    setSmartText('đổ xăng 50k, cho Nam vay 200k, ăn trưa 40k');
                    setShowHelp(false);
                  }}
                  title="Nhấn để thử câu có cả chi tiêu & cho vay này"
                >
                  <span className="text-amber-300 font-semibold text-[11px] block">👉 Ví dụ kết hợp chi tiêu & cho vay:</span>
                  <span>&ldquo;đổ xăng 50k, cho Nam vay 200k, ăn trưa 40k&rdquo;</span>
                </div>

                <div
                  className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-amber-200 cursor-pointer hover:bg-slate-800 transition-colors space-y-1"
                  onClick={() => {
                    setSmartText('nhận thưởng 1 củ, mời Đạt ăn 5 lít, đổ xăng 50k, bán máy tính 2tr5');
                    setShowHelp(false);
                  }}
                  title="Nhấn để thử câu nhiều giao dịch này"
                >
                  <span className="text-sky-300 font-semibold text-[11px] block">👉 Ví dụ nhiều giao dịch:</span>
                  <span>&ldquo;nhận thưởng 1 củ, mời Đạt ăn 5 lít, đổ xăng 50k, bán máy tính 2tr5&rdquo;</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                💡 <span className="text-purple-300">Ghi nợ:</span> Chỉ cần gõ <span className="text-amber-200 font-medium">&ldquo;cho Nam vay 500k&rdquo;</span> hoặc <span className="text-amber-200 font-medium">&ldquo;vay anh Tuấn 2tr&rdquo;</span>, hệ thống sẽ tự nhận biết và lưu vào <strong>Sổ nợ</strong> mà không tính vào thu chi!
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ⚡ Ô NHẬP NHANH DUY NHẤT MẶC ĐỊNH + NÚT MIC */}
        <div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={smartText}
              onChange={e => setSmartText(e.target.value)}
              placeholder='Gõ tự nhiên: "ăn trưa 40k", "cho Nam vay 500k", "vay 2tr", "đổ xăng 50k, mượn 1 củ"...'
              className={`w-full pl-3.5 pr-20 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                isListening
                  ? 'border-red-400 bg-red-50/50 dark:bg-red-950/40 ring-2 ring-red-300'
                  : 'border-slate-200 dark:border-zinc-700 bg-amber-50/40 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-400 focus:ring-blue-100 dark:focus:ring-blue-900/40 placeholder:text-slate-400 dark:placeholder:text-zinc-500'
              }`}
            />

            {/* Nút Xóa nhanh & Nút Micro */}
            <div className="absolute right-2 flex items-center gap-1">
              {smartText && (
                <button
                  type="button"
                  onClick={() => {
                    setSmartText('');
                    setParsedItems([]);
                    setAmount('');
                    setDescription('');
                    setNote('');
                    setPerson('');
                    setPreview(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                  title="Xóa nội dung"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-md'
                    : 'bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-zinc-700 shadow-xs'
                }`}
                title={isListening ? 'Đang nghe... Bấm để dừng' : 'Bấm để nói bằng giọng nói (tiếng Việt)'}
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            </div>
          </div>

          {/* Trạng thái đang nghe giọng nói */}
          {isListening && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Đang lắng nghe tiếng Việt... Hãy nói câu giao dịch của {userName}!</span>
            </div>
          )}
        </div>

        {/* ══ TRƯỜNG HỢP 1: NHẬN DIỆN NHIỀU GIAO DỊCH CÙNG LÚC (GIAO DỊCH KÉP) ══ */}
        {isMultiple && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Đã bóc tách {parsedItems.length} mục:
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {totalIncome > 0 && <span className="text-emerald-600 font-bold">+{formatVND(totalIncome)}</span>}
                {totalIncome > 0 && totalExpense > 0 && ' • '}
                {totalExpense > 0 && <span className="text-rose-600 font-bold">-{formatVND(totalExpense)}</span>}
                {debtCount > 0 && <span className="text-purple-600 font-bold ml-1">• 🟣 {debtCount} khoản nợ</span>}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {parsedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs transition-all space-y-2 ${
                    item.type === 'income'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : item.type === 'debt_lend'
                      ? 'bg-purple-50/60 border-purple-200'
                      : item.type === 'debt_borrow'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  {/* HÀNG 1: Loại + Tên mô tả (tự động xuống dòng khi thiếu chỗ, không cắt bớt) + Số tiền + Nút xóa */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleItemType(idx)}
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] shrink-0 mt-0.5 transition-transform active:scale-95 shadow-xs ${
                          item.type === 'income'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : item.type === 'debt_lend'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : item.type === 'debt_borrow'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                        title="Bấm để đổi loại (Thu -> Cho vay -> Đi vay -> Chi)"
                      >
                        {item.type === 'income' ? '🟢 Thu' : item.type === 'debt_lend' ? '🟣 Cho vay' : item.type === 'debt_borrow' ? '🟠 Đi vay' : '🔴 Chi'}
                      </button>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 text-sm leading-snug break-words">
                          {item.description}
                        </span>
                        {item.isDebt && item.person && (
                          <span className="block text-[11px] font-semibold text-purple-700 mt-0.5">
                            👤 {item.debtType === 'lend' ? 'Người vay' : 'Chủ nợ'}: {item.person}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold text-sm tracking-tight whitespace-nowrap ${
                        item.type === 'income' ? 'text-emerald-700' : item.isDebt ? 'text-purple-700' : 'text-rose-600'
                      }`}>
                        {item.type === 'income' ? '+' : item.isDebt ? '' : '-'}{formatVND(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white/80 transition-colors"
                        title="Xóa mục này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ghi chú chi tiết nếu có (hiển thị đầy đủ, tự động xuống dòng) */}
                  {item.note && (
                    <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/70 px-2 py-1 rounded-md leading-relaxed break-words">
                      📝 {item.note}
                    </div>
                  )}

                  {/* HÀNG 2: Danh mục (hoặc Huy hiệu Sổ nợ) + Ngày */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {item.isDebt ? (
                        <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                          🛡️ Sổ nợ (Không tính thu chi)
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-400 shrink-0">🏷️</span>
                          <select
                            value={item.category}
                            onChange={e => updateItemCategory(idx, e.target.value)}
                            className="bg-white/80 hover:bg-white border border-slate-200/90 rounded-md px-1.5 py-0.5 font-medium text-slate-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer max-w-[180px] truncate"
                          >
                            <option value={item.category}>{item.category}</option>
                            {availableCategories.filter(c => c !== item.category).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-slate-500 whitespace-nowrap">
                      <span className="text-slate-400">📅</span>
                      <input
                        type="date"
                        value={item.date}
                        onChange={e => updateItemDate(idx, e.target.value)}
                        className="bg-white/80 hover:bg-white border border-slate-200/90 rounded-md px-1.5 py-0.5 font-medium text-slate-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                        title="Nhấn để đổi ngày của giao dịch này"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cảnh báo khi dán văn bản nhiều dòng nhưng chưa có số tiền nào */}
        {smartText.includes('\n') && parsedItems.length === 0 && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <span className="text-sm">ℹ️</span>
            <span>Đoạn văn bản đã dán chưa chứa số tiền hợp lệ (ví dụ: 35k, 50.000đ, 2tr). Các dòng tiêu đề và ghi chú sẽ được bỏ qua tự động.</span>
          </div>
        )}

        {/* ══ TRƯỜNG HỢP 2: 1 GIAO DỊCH ĐƠN (HIỂN THỊ CHIPS NHƯ CŨ) ══ */}
        {!isMultiple && smartText.trim() && (!smartText.includes('\n') || parsedItems.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Nhận diện Loại */}
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${colorCls.badge}`}>
              {isExpense ? '🔴 Chi tiêu' : isIncome ? '🟢 Thu nhập' : isDebtLend ? '🟣 Sổ nợ: Cho vay' : '🟠 Sổ nợ: Đi vay'}
            </span>

            {/* Tên người nếu là nợ */}
            {isAnyDebt && (person || parsedItems[0]?.person) && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200">
                👤 {person || parsedItems[0]?.person}
              </span>
            )}

            {/* Số tiền */}
            {amount ? (
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold border ${colorCls.badge}`}>
                💰 {amount}₫
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                💰 Chưa có số tiền
              </span>
            )}

            {/* Ngày */}
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-1 rounded-full font-medium">
              📅 {date ? date.split('-').reverse().join('/') : 'Hôm nay'}
            </span>

            {/* Huy hiệu không tính thu chi nếu là nợ */}
            {isAnyDebt ? (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] px-2 py-0.5 rounded-full font-medium">
                🛡️ Không tính thu chi
              </span>
            ) : (
              (category || preview?.category) && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  🏷️ {category || preview?.category}
                </span>
              )
            )}

            {/* Ghi chú */}
            {note && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium">
                📝 {note}
              </span>
            )}
          </div>
        )}

        {/* Nút mở rộng Tùy chỉnh chi tiết (cho giao dịch đơn) */}
        {!isMultiple && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Ẩn chi tiết
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Tùy chỉnh chi tiết
                </>
              )}
            </button>

            {/* Form chi tiết mở rộng */}
            {expanded && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {/* 1. Toggle 4 loại: Chi tiêu / Thu nhập / Cho vay / Đi vay */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Loại giao dịch / Sổ nợ</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('expense')}
                      className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-colors ${
                        type === 'expense' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> Chi tiêu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('income')}
                      className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-colors ${
                        type === 'income' ? 'bg-green-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Thu nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('debt_lend')}
                      className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-colors ${
                        type === 'debt_lend' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>🟣</span> Cho vay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('debt_borrow')}
                      className={`py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-colors ${
                        type === 'debt_borrow' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>🟠</span> Đi vay
                    </button>
                  </div>
                </div>

                {/* Nếu là Nợ: Hiện ô nhập Tên người vay / người cho vay */}
                {isAnyDebt && (
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-1.5">
                    <label className="block text-xs font-bold text-purple-900">
                      {type === 'debt_lend' ? 'Người vay tiền (Bạn bè, người quen)' : `Người ${userName} vay tiền (Chủ nợ)`}
                    </label>
                    <input
                      type="text"
                      value={person}
                      onChange={e => setPerson(e.target.value)}
                      placeholder="Ví dụ: Nam, anh Tuấn, bạn Linh..."
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
                    />
                    <p className="text-[11px] text-purple-700">
                      💡 Khoản này sẽ lưu thẳng vào <strong>Sổ nợ</strong> và không tính vào tổng thu chi.
                    </p>
                  </div>
                )}

                {/* 2. Số tiền */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Số tiền <span className="text-slate-400 font-normal">(có thể gõ 20k / 2tr / 50000)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="20k / 2tr / 500.000"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₫</span>
                  </div>
                </div>

                {/* 3. Mô tả */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mô tả {isAnyDebt ? 'khoản nợ' : 'giao dịch'}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={isAnyDebt ? "Ví dụ: Cho Nam vay tiền đóng trọ..." : "Mô tả giao dịch"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 4. Ngày giao dịch */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ngày {isAnyDebt ? 'ghi nợ' : 'giao dịch'}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light]"
                  />
                </div>

                {/* 5. Danh mục (chỉ hiện khi là Thu/Chi thông thường) */}
                {!isAnyDebt && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Danh mục</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{category ? `${category} (tự động)` : 'Tự động phân loại'}</option>
                      {availableCategories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 6. Ghi chú */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú thêm</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ghi chú chi tiết (hoặc gõ trong dấu ngoặc ở ô trên)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 7. Khoản chi lặp lại định kỳ (Recurring) */}
                {!isAnyDebt && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={e => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                        <span>🔁</span> Lặp lại hàng tháng (tiền nhà, tiền mạng, Netflix, gym...)
                      </span>
                    </label>

                    {isRecurring && (
                      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">Tự động cộng vào ngày:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Ngày</span>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={recurringDay}
                              onChange={e => setRecurringDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                              className="w-14 px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-800 text-center font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">hàng tháng</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                          ⚡ Hệ thống sẽ tự động tạo khoản này vào ngày {recurringDay} mỗi tháng mà {userName} không cần phải nhập tay lại!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Thông báo lỗi / thành công */}
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100 font-medium">{success}</p>}

        {/* Nút Submit chính */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all shadow-sm ${
            isMultiple
              ? 'bg-blue-600 hover:bg-blue-700'
              : colorCls.btn
          } disabled:opacity-50 flex items-center justify-center gap-1.5`}
        >
          <Plus className="w-5 h-5" />
          {isSubmitting
            ? 'Đang lưu...'
            : isMultiple
            ? `Lưu tất cả ${parsedItems.length} mục`
            : isDebtLend
            ? `Lưu vào Sổ nợ (Cho vay)`
            : isDebtBorrow
            ? `Lưu vào Sổ nợ (Đi vay)`
            : smartText.trim()
            ? `Thêm ${isExpense ? 'Chi tiêu' : 'Thu nhập'}`
            : 'Thêm giao dịch'}
        </button>
      </form>
    </div>
  );
}
