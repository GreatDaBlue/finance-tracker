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

export const DANH_MUC = [
  'Ăn uống',
  'Xe cộ',
  'Sức khỏe',
  'Nhà cửa',
  'Mua sắm & Giải trí',
  'Giáo dục',
  'Thu nhập lương',
  'Thu nhập khác',
  'Tiết kiệm & Đầu tư',
  'Sửa chữa & Bảo trì',
  'Khác'
];

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
 * Parse số tiền với các đơn vị phổ biến và từ ngữ lóng thông dụng trong tiếng Việt:
 *   k, nghìn, ngàn: 20k     → 20,000
 *   lít           : 1 lít   → 100,000;  2 lít rưỡi → 250,000; nửa lít → 50,000
 *   củ            : 1 củ    → 1,000,000; 2 củ rưỡi → 2,500,000; 2củ5 → 2,500,000; nửa củ → 500,000
 *   tr, m, triệu  : 2tr, 2m → 2,000,000; 1.5tr, 1,5m → 1,500,000; 2tr5 → 2,500,000
 *   tỷ            : 1 tỷ    → 1,000,000,000
 *   20.000 / 20000đ
 */
export function parseAmount(text: string): { amount: number | null; cleanText: string } {
  let clean = text;

  // 1. Các từ chỉ phân nửa: nửa củ (500k), nửa lít (50k), nửa triệu (500k)
  if (/(?:^|[^\p{L}\p{N}])nửa\s+củ(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return { amount: 500_000, cleanText: clean.replace(/nửa\s+củ(?![a-zA-Z\p{L}])/iu, '').trim() };
  }
  if (/(?:^|[^\p{L}\p{N}])nửa\s+lít(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return { amount: 50_000, cleanText: clean.replace(/nửa\s+lít(?![a-zA-Z\p{L}])/iu, '').trim() };
  }
  if (/(?:^|[^\p{L}\p{N}])nửa\s+(?:triệu|tr)(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return { amount: 500_000, cleanText: clean.replace(/nửa\s+(?:triệu|tr)(?![a-zA-Z\p{L}])/iu, '').trim() };
  }

  // 2. Các từ có đuôi "rưỡi": 1 củ rưỡi (1.5tr), 2 lít rưỡi (250k), 1 tr rưỡi (1.5tr)
  const ruoiCuM = clean.match(/(\d+(?:[.,]\d+)?)\s*củ\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiCuM) {
    return { amount: (parseViNum(ruoiCuM[1]) + 0.5) * 1_000_000, cleanText: clean.replace(ruoiCuM[0], '').trim() };
  }
  const ruoiLitM = clean.match(/(\d+(?:[.,]\d+)?)\s*lít\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiLitM) {
    return { amount: (parseViNum(ruoiLitM[1]) + 0.5) * 100_000, cleanText: clean.replace(ruoiLitM[0], '').trim() };
  }
  const ruoiTrM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr)\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiTrM) {
    return { amount: (parseViNum(ruoiTrM[1]) + 0.5) * 1_000_000, cleanText: clean.replace(ruoiTrM[0], '').trim() };
  }

  // 3. Số lẻ kiểu nói tắt: 2tr5 (2.5tr), 1tr2 (1.2tr), 2củ5 (2.5tr)
  const trLeM = clean.match(/(\d+)\s*(?:tr|củ|m)\s*(\d)(?![a-zA-Z\p{L}\d])/iu);
  if (trLeM) {
    const num = parseFloat(`${trLeM[1]}.${trLeM[2]}`) * 1_000_000;
    return { amount: num, cleanText: clean.replace(trLeM[0], '').trim() };
  }

  // 4. Tỷ: 1tỷ, 1.5tỷ, 1,5ty
  const tyM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty|bil(?:lion)?)(?![a-zA-Z\p{L}])/iu);
  if (tyM) {
    return { amount: parseViNum(tyM[1]) * 1_000_000_000, cleanText: clean.replace(tyM[0], '').trim() };
  }

  // 5. Củ (1 củ = 1.000.000): 1 củ, 2 củ, 3.5 củ
  const cuM = clean.match(/(\d+(?:[.,]\d+)?)\s*củ(?![a-zA-Z\p{L}])/iu);
  if (cuM) {
    return { amount: parseViNum(cuM[1]) * 1_000_000, cleanText: clean.replace(cuM[0], '').trim() };
  }

  // 6. Triệu: 2tr, 2m, 2triệu, 1.5tr, 1,5m
  const trM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m|mil(?:lion)?)(?![a-zA-Z\p{L}])/iu);
  if (trM) {
    return { amount: parseViNum(trM[1]) * 1_000_000, cleanText: clean.replace(trM[0], '').trim() };
  }

  // 7. Lít (1 lít = 100.000): 1 lít, 2 lít, 5 lít, 1.5 lít
  const litM = clean.match(/(\d+(?:[.,]\d+)?)\s*lít(?![a-zA-Z\p{L}])/iu);
  if (litM) {
    return { amount: parseViNum(litM[1]) * 100_000, cleanText: clean.replace(litM[0], '').trim() };
  }

  // 8. Ngàn / Nghìn / k: 20k, 50k, 20nghìn, 50ngàn
  const kM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?![a-zA-Z\p{L}])/iu);
  if (kM) {
    return { amount: parseViNum(kM[1]) * 1_000, cleanText: clean.replace(kM[0], '').trim() };
  }

  // 9. Có đơn vị đồng/đ/vnd: 20000đ, 20.000đ, 20.000 đồng
  const dongRx = /(\d[\d.]*)\s*(?:đồng|dong|đ|vnd)\b/i;
  const dongM = clean.match(dongRx);
  if (dongM) {
    const num = parseInt(dongM[1].replace(/\./g, ''), 10);
    return { amount: num, cleanText: clean.replace(dongM[0], '').trim() };
  }

  // 10. Số có dấu chấm ngăn cách kiểu Việt: 20.000, 1.000.000
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
 * Làm sạch từ đệm tiếng Việt ở đầu hoặc cuối mô tả giao dịch
 * Ví dụ: "bán máy tính đc" -> "bán máy tính", "ăn trưa hết" -> "ăn trưa"
 */
export function cleanFillerWords(text: string): string {
  let res = text.trim();
  res = res.replace(/\s+(hết|mất|đc|được|tầm|khoảng|giá|là)\s*$/i, '');
  res = res.replace(/^\s*(hết|mất|đc|được|tầm|khoảng|giá|là)\s+/i, '');
  return res.trim();
}

/**
 * Kiểm tra xem văn bản có chứa các từ tiếng Việt nguyên vẹn hay không (hỗ trợ Unicode)
 */
function matchViWords(text: string, pattern: string): boolean {
  const rx = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${pattern})(?:[^\\p{L}\\p{N}]|$)`, 'iu');
  return rx.test(text);
}

/**
 * Lấy icon trực quan tương ứng cho từng danh mục
 */
export function getCategoryIcon(cat: string): string {
  if (/Ăn uống|Thực phẩm/i.test(cat)) return '🍜';
  if (/Xe cộ|Di chuyển|Xăng/i.test(cat)) return '🛵';
  if (/Sức khỏe|Y tế/i.test(cat)) return '💊';
  if (/Nhà/i.test(cat)) return '🏠';
  if (/Mua sắm|Giải trí/i.test(cat)) return '🛍️';
  if (/Giáo dục|Học/i.test(cat)) return '📚';
  if (/lương/i.test(cat)) return '💵';
  if (/Thu nhập/i.test(cat)) return '💰';
  if (/Tiết kiệm|Đầu tư/i.test(cat)) return '📈';
  if (/Sửa chữa/i.test(cat)) return '🔧';
  return '🏷️';
}

/**
 * Phân loại loại giao dịch và danh mục nhanh từ văn bản (dành cho file txt và parse tự động)
 * Tự động gắn danh mục và icon chuẩn:
 *   - xăng, xe, gửi xe → Xe cộ 🛵
 *   - cơm, phở, trà sữa, cafe → Ăn uống 🍜
 *   - gym, thuốc → Sức khỏe 💊
 */
export function guessCategoryAndType(text: string): { type: 'income' | 'expense'; category: string } {
  const lower = text.toLowerCase();

  // 1. Nhận diện thu nhập rõ ràng
  const hasDirectIncomeWord = matchViWords(lower, 'lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|lãi suất|freelance|nhận tiền|tiền vào|được cho|mẹ cho|bố cho|cho tiền|được tặng|lì xì|trúng thưởng|hoàn tiền|thu nợ|đòi nợ|\\+');
  const isSelling = matchViWords(lower, 'bán|thanh lý|sang nhượng') && !matchViWords(lower, 'mua|quán|tiệm|chỗ|hàng');
  const isReceiving = matchViWords(lower, 'nhận|kiếm được|thu được') && !matchViWords(lower, 'nhận phòng|nhận hàng');

  if (hasDirectIncomeWord || isSelling || isReceiving) {
    if (matchViWords(lower, 'lương|salary|thưởng|bonus')) {
      return { type: 'income', category: 'Thu nhập lương' };
    }
    return { type: 'income', category: 'Thu nhập khác' };
  }

  // 2. Nhận diện chi tiêu theo từ khóa:
  // Ăn uống: cơm, phở, trà sữa, cafe, ăn, uống, bún, bánh...
  if (matchViWords(lower, 'ăn|uống|cơm|phở|bún|bánh|mì|miến|cháo|thịt|rau|cá|cafe|cà phê|coffee|trà|trà sữa|nước|sinh tố|siêu thị|chợ|buffet|quán|lẩu|nướng|nhậu|trưa|tối|sáng|bữa')) {
    return { type: 'expense', category: 'Ăn uống' };
  }
  // Xe cộ: xăng, xe, gửi xe, đổ xăng, rửa xe, grab, taxi...
  if (matchViWords(lower, 'xăng|xe|gửi xe|đậu xe|bãi xe|đổ xăng|rửa xe|sửa xe|thay nhớt|grab|be|gojek|taxi|bus|vé xe|vé tàu|vé máy bay')) {
    return { type: 'expense', category: 'Xe cộ' };
  }
  // Sức khỏe: gym, thuốc, khám, bác sĩ, bệnh viện, nha khoa...
  if (matchViWords(lower, 'gym|thuốc|mua thuốc|bệnh viện|khám|bác sĩ|nha|răng|nha khoa|fitness|yoga|spa|mát xa|cắt tóc|gội đầu|mỹ phẩm')) {
    return { type: 'expense', category: 'Sức khỏe' };
  }
  // Nhà cửa & Tiện ích
  if (matchViWords(lower, 'điện|nước|tiền điện|tiền nước|internet|wifi|tiền nhà|thuê nhà|phòng trọ|chung cư|gas|rác|vệ sinh')) {
    return { type: 'expense', category: 'Nhà cửa' };
  }
  // Mua sắm & Giải trí
  if (matchViWords(lower, 'shopee|lazada|tiki|quần|áo|váy|giày|dép|túi|ví|phim|cgv|cinema|game|nạp thẻ|nạp game|netflix|du lịch|khách sạn|homestay')) {
    return { type: 'expense', category: 'Mua sắm & Giải trí' };
  }
  // Giáo dục
  if (matchViWords(lower, 'học|khóa học|sách|giáo trình|học phí|trường|gia sư|bút|vở')) {
    return { type: 'expense', category: 'Giáo dục' };
  }
  // Tiết kiệm & Đầu tư
  if (matchViWords(lower, 'tiết kiệm|gửi ngân hàng|vàng|chứng khoán|cổ phiếu|crypto|bitcoin|quỹ')) {
    return { type: 'expense', category: 'Tiết kiệm & Đầu tư' };
  }
  // Sửa chữa & Bảo trì
  if (matchViWords(lower, 'sửa|bảo trì|thay|linh kiện|phụ tùng|bảo dưỡng|thợ')) {
    return { type: 'expense', category: 'Sửa chữa & Bảo trì' };
  }

  return { type: 'expense', category: 'Khác' };
}

export interface DebtDetectionResult {
  isDebt: boolean;
  debtType?: 'lend' | 'borrow'; // 'lend': Cho vay / Cho mượn | 'borrow': Đi vay / Mượn
  person?: string;              // Tên người vay hoặc người cho vay
  cleanDescription?: string;    // Mô tả đã làm sạch
}

export function cleanPersonName(raw?: string): string {
  if (!raw) return '';
  let p = raw.trim();
  p = p.replace(/^(?:của|tiền\s+của|từ|cho)\s+/i, '');
  p = p.replace(/\s+(?:tiền|hết|mất|tầm|khoảng|đc|được)$/i, '');
  return p.trim();
}

/**
 * Nhận diện câu nhập ghi nợ, cho vay hoặc đi vay
 */
export function detectDebtInfo(text: string): DebtDetectionResult {
  const trimmed = text.trim();
  if (!trimmed) return { isDebt: false };

  // Bỏ qua nếu là trả nợ / thu nợ / đòi nợ
  if (/(?:thu|đòi|trả)\s+nợ/iu.test(trimmed)) {
    return { isDebt: false };
  }

  // 1. Cho ... vay / Cho ... mượn (Ví dụ: "cho Nam vay 500k", "cho bạn Linh mượn 200k", "cho em vay 100k")
  const choVayMatch = trimmed.match(/(?:^|[^\p{L}\p{N}])cho\s+([^0-9,.;]+?)\s+(?:vay|mượn)(?![a-zA-Z\p{L}])/iu);
  if (choVayMatch) {
    const person = cleanPersonName(choVayMatch[1]) || 'Người quen';
    return {
      isDebt: true,
      debtType: 'lend',
      person,
      cleanDescription: `Cho ${person} vay`
    };
  }

  // 2. Cho vay / Cho mượn không kèm tên người phía trước (Ví dụ: "cho vay 500k", "cho mượn 200k", "cho vay bạn Nam 500k")
  const choVayDirectMatch = trimmed.match(/(?:^|[^\p{L}\p{N}])cho\s+(?:vay|mượn)(?:\s+(?:cho\s+)?([^0-9,.;]+?))?(?:\s+\d|;|,|$)/iu);
  if (choVayDirectMatch) {
    const rawPerson = choVayDirectMatch[1]?.trim();
    const person = cleanPersonName(rawPerson) || 'Người quen';
    return {
      isDebt: true,
      debtType: 'lend',
      person,
      cleanDescription: rawPerson ? `Cho ${person} vay` : 'Cho vay'
    };
  }

  // 3. Vay của ... / Mượn của ... (Ví dụ: "vay của anh Tuấn 2tr", "mượn của chị Mai 1tr")
  const vayCuaMatch = trimmed.match(/(?:^|[^\p{L}\p{N}])(?:vay|mượn)\s+của\s+([^0-9,.;]+?)(?:\s+\d|;|,|$)/iu);
  if (vayCuaMatch) {
    const person = cleanPersonName(vayCuaMatch[1]) || 'Chủ nợ';
    return {
      isDebt: true,
      debtType: 'borrow',
      person,
      cleanDescription: `Vay của ${person}`
    };
  }

  // 4. Vay ... / Mượn ... (Ví dụ: "vay anh Tuấn 2tr", "mượn Hoàng 1 củ", "vay ngân hàng 50tr", "đi vay 5tr")
  const vayDirectMatch = trimmed.match(/(?:^|[^\p{L}\p{N}])(?:tôi\s+|mình\s+|đi\s+)?(?:vay|mượn)\s+([^0-9,.;]+?)(?:\s+\d|;|,|$)/iu);
  if (vayDirectMatch) {
    const rawPerson = vayDirectMatch[1]?.trim();
    const person = cleanPersonName(rawPerson) || 'Chủ nợ';
    return {
      isDebt: true,
      debtType: 'borrow',
      person,
      cleanDescription: `Vay ${person}`
    };
  }

  // 5. Nợ ... (Ví dụ: "nợ anh Tuấn 500k", "nợ quán cơm 30k")
  const noMatch = trimmed.match(/(?:^|[^\p{L}\p{N}])nợ\s+([^0-9,.;]+?)(?:\s+\d|;|,|$)/iu);
  if (noMatch) {
    const person = cleanPersonName(noMatch[1]) || 'Chủ nợ';
    return {
      isDebt: true,
      debtType: 'borrow',
      person,
      cleanDescription: `Nợ ${person}`
    };
  }

  // 6. [Tên người] vay ... / [Tên người] mượn ... (Ví dụ: "Nam vay 500k", "Linh mượn 200k", "Hoàng mượn 1 củ")
  const nguoiVayMatch = trimmed.match(/^([^0-9,.;]+?)\s+(?:vay|mượn)(?:\s+tiền)?(?:\s+\d|;|,|$)/iu);
  if (nguoiVayMatch) {
    const rawPerson = nguoiVayMatch[1].trim();
    if (/^(?:tôi|mình|tao|em|anh|chị)$/i.test(rawPerson)) {
      return {
        isDebt: true,
        debtType: 'borrow',
        person: 'Chủ nợ',
        cleanDescription: 'Đi vay'
      };
    }
    const person = cleanPersonName(rawPerson) || 'Người quen';
    return {
      isDebt: true,
      debtType: 'lend',
      person,
      cleanDescription: `Cho ${person} vay`
    };
  }

  return { isDebt: false };
}

export interface ParsedTransactionItem {
  id: string;
  type: 'income' | 'expense' | 'debt_lend' | 'debt_borrow';
  amount: number;
  description: string;
  category: string;
  note: string;
  date: string;
  rawText: string;
  isDebt?: boolean;
  debtType?: 'lend' | 'borrow';
  person?: string;
}

/**
 * Đọc hiểu câu nhập kép / nhiều giao dịch trên cùng 1 dòng
 * Ví dụ: "nhận thưởng 1tr, mời Đạt đi ăn 500k, đổ xăng 100k, bán máy tính đc 1tr"
 */
export function parseMultiSmartInput(rawText: string, defaultDate: string = new Date().toISOString().split('T')[0]): ParsedTransactionItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Bảo vệ dấu phẩy và chấm phẩy nằm bên trong dấu ngoặc (ví dụ: (trong đó 50k mời Hoàng, 10k tip))
  const protectedText = trimmed.replace(/\(([^)]+)\)/g, (match) => {
    return match.replace(/,/g, '__COMMA__').replace(/;/g, '__SEMI__');
  });

  // 2. Tách theo dấu ngắt mệnh đề: xuống dòng, chấm phẩy, dấu phẩy (không nằm giữa 2 số), hoặc từ nối "và", "rồi", "+"
  const clauseRegex = /(?:[\r\n;]+|(?<!\d),(?!\d)|\s+(?:và|rồi|\+)\s+)/i;
  const rawClauses = protectedText.split(clauseRegex);

  // 3. Kiểm tra ngày chung nếu người dùng mở đầu bằng ngày (ví dụ: "hôm qua nhận thưởng 1tr, cafe 30k")
  let globalDate = defaultDate;
  const firstDateCheck = parseDateFromVietnameseText(trimmed);
  if (firstDateCheck.date && firstDateCheck.date !== defaultDate) {
    globalDate = firstDateCheck.date;
  }

  const items: ParsedTransactionItem[] = [];
  let pendingPrefix = '';

  for (let i = 0; i < rawClauses.length; i++) {
    let clause = rawClauses[i].trim();
    if (!clause) continue;

    // Khôi phục dấu phẩy trong ngoặc
    clause = clause.replace(/__COMMA__/g, ',').replace(/__SEMI__/g, ';');

    if (pendingPrefix) {
      clause = `${pendingPrefix} ${clause}`;
      pendingPrefix = '';
    }

    const parsed = parseSmartInput(clause);

    // Mệnh đề không chứa số tiền: có thể là từ chỉ ngày (hôm qua, ...) hoặc tiền tố mô tả
    if (parsed.amount === null || parsed.amount <= 0) {
      const dCheck = parseDateFromVietnameseText(clause);
      if (dCheck.date && dCheck.date !== defaultDate) {
        globalDate = dCheck.date;
      }
      if (dCheck.cleanText) {
        pendingPrefix = dCheck.cleanText;
      }
      continue;
    }

    // Làm sạch từ đệm (đc, được, hết, mất...)
    let desc = cleanFillerWords(parsed.description || clause);

    // Tách ngày riêng của mệnh đề (nếu có)
    const clauseDate = parseDateFromVietnameseText(desc);
    let itemDate = globalDate;
    if (clauseDate.date && clauseDate.date !== defaultDate) {
      itemDate = clauseDate.date;
      desc = cleanFillerWords(clauseDate.cleanText || desc);
    }

    // Kiểm tra xem mệnh đề có phải là khoản nợ (cho vay hoặc đi vay) không
    const debtInfo = detectDebtInfo(desc || clause);
    if (debtInfo.isDebt && debtInfo.debtType) {
      const isLend = debtInfo.debtType === 'lend';
      items.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        type: isLend ? 'debt_lend' : 'debt_borrow',
        amount: parsed.amount,
        description: desc || debtInfo.cleanDescription || (isLend ? `Cho ${debtInfo.person} vay` : `Vay ${debtInfo.person}`),
        category: 'Sổ nợ',
        note: parsed.note || '',
        date: itemDate,
        rawText: clause,
        isDebt: true,
        debtType: debtInfo.debtType,
        person: debtInfo.person || (isLend ? 'Người vay' : 'Chủ nợ')
      });
    } else {
      const guessed = guessCategoryAndType(desc || clause);
      items.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        type: guessed.type,
        amount: parsed.amount,
        description: desc || (guessed.type === 'income' ? 'Khoản thu' : 'Khoản chi'),
        category: guessed.category,
        note: parsed.note || '',
        date: itemDate,
        rawText: clause
      });
    }
  }

  return items;
}
