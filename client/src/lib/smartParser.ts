/**
 * smartParser.ts
 * Parse văn bản tự nhiên tiếng Việt để tách: số tiền, ghi chú, mô tả, ngày tháng, danh mục
 * Ví dụ: "22/10 ăn trưa 20k (ăn với mẹ)"
 *   → amount: 20000, note: "ăn với mẹ", description: "22/10 ăn trưa"
 */

export interface SmartParseResult {
  amount: number | null;    // Số tiền đã parse
  note: string;             // Nội dung trong (ngoặc)
  description: string;      // Văn bản còn lại
}

/**
 * Hàm chính: parse một dòng văn bản tự nhiên
 */
export function parseSmartInput(text: string): SmartParseResult {
  let remaining = text.trim();

  // Bước 1: Tách ghi chú từ (ngoặc đơn)
  const noteMatch = remaining.match(/\(([^)]+)\)/);
  const note = noteMatch ? noteMatch[1].trim() : '';
  if (noteMatch) remaining = remaining.replace(noteMatch[0], '').trim();

  // Bước 2: Tách số tiền
  const { amount, cleanText } = parseAmount(remaining);
  remaining = cleanText.trim();

  // Bước 3: Phần còn lại là mô tả (chứa ngày và nội dung)
  return { amount, note, description: remaining };
}

/**
 * Parse số tiền với các đơn vị phổ biến trong tiếng Việt:
 *   20k     → 20,000
 *   2tr     → 2,000,000
 *   1,5tr   → 1,500,000
 *   20.000  → 20,000
 *   20000đ  → 20,000
 *   50ngàn  → 50,000
 */
export function parseAmount(text: string): { amount: number | null; cleanText: string } {
  let clean = text;

  // Tỷ: 1tỷ, 1.5tỷ, 1,5ty
  const tyRx = /(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty|bil(?:lion)?)\b/i;
  const tyM = clean.match(tyRx);
  if (tyM) {
    return { amount: parseViNum(tyM[1]) * 1_000_000_000, cleanText: clean.replace(tyM[0], '').trim() };
  }

  // Triệu: 2tr, 2triệu, 1.5tr, 2m
  const trRx = /(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr(?!\w)|mil(?:lion)?)\b/i;
  const trM = clean.match(trRx);
  if (trM) {
    return { amount: parseViNum(trM[1]) * 1_000_000, cleanText: clean.replace(trM[0], '').trim() };
  }

  // Ngàn/Nghìn: 20k, 50k, 20nghìn, 50ngàn
  const kRx = /(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)\b/i;
  const kM = clean.match(kRx);
  if (kM) {
    return { amount: parseViNum(kM[1]) * 1_000, cleanText: clean.replace(kM[0], '').trim() };
  }

  // Có đơn vị đồng/đ/vnd: 20000đ, 20.000đ, 20.000 đồng
  const dongRx = /(\d[\d.]*)\s*(?:đồng|dong|đ|vnd)\b/i;
  const dongM = clean.match(dongRx);
  if (dongM) {
    const num = parseInt(dongM[1].replace(/\./g, ''), 10);
    return { amount: num, cleanText: clean.replace(dongM[0], '').trim() };
  }

  // Số có dấu chấm ngăn cách kiểu Việt: 20.000, 1.000.000
  const fmtRx = /\b(\d{1,3}(?:\.\d{3})+)\b/;
  const fmtM = clean.match(fmtRx);
  if (fmtM) {
    const num = parseInt(fmtM[1].replace(/\./g, ''), 10);
    return { amount: num, cleanText: clean.replace(fmtM[0], '').trim() };
  }

  return { amount: null, cleanText: clean };
}

/**
 * Parse số kiểu Việt: "1,5" → 1.5 (thập phân), "20.000" → 20000 (không phải thập phân)
 */
function parseViNum(str: string): number {
  if (/^\d+,\d{1,2}$/.test(str)) {
    return parseFloat(str.replace(',', '.'));
  }
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

/**
 * Định dạng số tiền ra dạng hiển thị: 20000 → "20.000"
 */
export function formatAmountDisplay(amount: number): string {
  return amount.toLocaleString('vi-VN');
}

/**
 * Parse chuỗi nhập từ ô số tiền (xử lý format Việt + suffix k/tr)
 */
export function parseAmountInput(raw: string): number {
  if (!raw.trim()) return 0;
  const { amount } = parseAmount(raw);
  if (amount !== null) return amount;
  const digits = raw.replace(/\./g, '').replace(/[^\d]/g, '');
  return parseInt(digits, 10) || 0;
}

/**
 * Tách ngày tháng từ câu tiếng Việt (cho bulk import file .txt)
 */
export function parseDateFromVietnameseText(text: string, today: Date = new Date()): { date: string; cleanText: string } {
  let remaining = text;
  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // dd/MM/YYYY hoặc dd-MM-YYYY
  const fullDateRx = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const fullM = remaining.match(fullDateRx);
  if (fullM) {
    const day = parseInt(fullM[1], 10);
    const month = parseInt(fullM[2], 10) - 1;
    const year = parseInt(fullM[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return { date: toISO(d), cleanText: remaining.replace(fullM[0], '').trim() };
    }
  }

  // dd/MM hoặc dd-MM (năm nay)
  const shortDateRx = /\b(\d{1,2})[\/\-](\d{1,2})\b/;
  const shortM = remaining.match(shortDateRx);
  if (shortM) {
    const day = parseInt(shortM[1], 10);
    const month = parseInt(shortM[2], 10) - 1;
    let year = today.getFullYear();
    let d = new Date(year, month, day);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d > tomorrow) d = new Date(year - 1, month, day);
    if (!isNaN(d.getTime())) {
      return { date: toISO(d), cleanText: remaining.replace(shortM[0], '').trim() };
    }
  }

  // Hôm qua, hôm kia
  if (/\b(hôm qua|tối qua|sáng qua|chiều qua|trưa qua)\b/i.test(remaining)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { date: toISO(d), cleanText: remaining.replace(/\b(hôm qua|tối qua|sáng qua|chiều qua|trưa qua)\b/i, '').trim() };
  }
  if (/\b(hôm kia|bữa kia)\b/i.test(remaining)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return { date: toISO(d), cleanText: remaining.replace(/\b(hôm kia|bữa kia)\b/i, '').trim() };
  }
  if (/\b(hôm nay|sáng nay|tối nay|chiều nay|trưa nay)\b/i.test(remaining)) {
    return { date: toISO(today), cleanText: remaining.replace(/\b(hôm nay|sáng nay|tối nay|chiều nay|trưa nay)\b/i, '').trim() };
  }

  return { date: toISO(today), cleanText: remaining.trim() };
}

/**
 * Phân loại loại giao dịch và danh mục nhanh từ văn bản (dành cho file txt)
 */
export function guessCategoryAndType(text: string): { type: 'income' | 'expense'; category: string } {
  const lower = text.toLowerCase();

  // Nhận diện thu nhập
  const isIncome = /\b(lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|bán hàng|freelance|nhận tiền|tiền vào|\+)\b/i.test(lower);
  if (isIncome) {
    if (/\b(lương|salary|thưởng|bonus)\b/i.test(lower)) {
      return { type: 'income', category: 'Thu nhập lương' };
    }
    return { type: 'income', category: 'Thu nhập khác' };
  }

  // Nhận diện danh mục chi tiêu
  if (/\b(ăn|cơm|phở|bún|bánh|thịt|rau|cá|cafe|coffee|trà|nước|sinh tố|siêu thị|chợ|buffet|quán|lẩu|nướng)\b/i.test(lower)) {
    return { type: 'expense', category: 'Thực phẩm & Ăn uống' };
  }
  if (/\b(điện|nước|internet|wifi|tiền nhà|thuê nhà|phòng trọ|chung cư|gas|rác)\b/i.test(lower)) {
    return { type: 'expense', category: 'Nhà ở & Tiện ích' };
  }
  if (/\b(xăng|grab|be|gojek|taxi|xe|bus|gửi xe|vé xe|vé tàu|vé máy bay|đổ xăng)\b/i.test(lower)) {
    return { type: 'expense', category: 'Di chuyển & Xăng xe' };
  }
  if (/\b(thuốc|bệnh viện|khám|bác sĩ|nha|răng|gym|fitness|yoga|spa|mát xa|cắt tóc)\b/i.test(lower)) {
    return { type: 'expense', category: 'Y tế & Sức khỏe' };
  }
  if (/\b(shopee|lazada|tiki|quần|áo|váy|giày|dép|túi|phim|cgv|cinema|game|netflix|du lịch)\b/i.test(lower)) {
    return { type: 'expense', category: 'Giải trí & Mua sắm' };
  }
  if (/\b(học|khóa học|sách|giáo trình|học phí|trường|gia sư)\b/i.test(lower)) {
    return { type: 'expense', category: 'Giáo dục' };
  }
  if (/\b(tiết kiệm|gửi ngân hàng|vàng|chứng khoán|cổ phiếu|crypto|bitcoin|quỹ)\b/i.test(lower)) {
    return { type: 'expense', category: 'Tiết kiệm & Đầu tư' };
  }
  if (/\b(sửa|bảo trì|thay|linh kiện|phụ tùng|bảo dưỡng)\b/i.test(lower)) {
    return { type: 'expense', category: 'Sửa chữa & Bảo trì' };
  }

  return { type: 'expense', category: 'Khác' };
}
