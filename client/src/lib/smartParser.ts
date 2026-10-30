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
  const kM = clean.match(/(?:[\-:\u2013\u2014]\s*)?(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?![a-zA-Z0-9\p{L}])/iu);
  if (kM) {
    return { amount: parseViNum(kM[1]) * 1_000, cleanText: clean.replace(kM[0], '').trim() };
  }

  // 9. Có đơn vị đồng/đ/vnd: 20000đ, 20.000đ, 20.000 đồng
  const dongRx = /(?:[\-:\u2013\u2014]\s*)?(\d[\d.]*)\s*(?:đồng|dong|đ|vnd)(?![a-zA-Z0-9\p{L}])/iu;
  const dongM = clean.match(dongRx);
  if (dongM) {
    const num = parseInt(dongM[1].replace(/\./g, ''), 10);
    return { amount: num, cleanText: clean.replace(dongM[0], '').trim() };
  }

  // 10. Số có dấu chấm ngăn cách kiểu Việt: 20.000, 1.000.000 (kèm hoặc không kèm đ/đồng)
  const fmtRx = /(?:[\-:\u2013\u2014]\s*)?\b(\d{1,3}(?:\.\d{3})+)(?:\s*(?:đồng|dong|đ|vnd))?(?![a-zA-Z0-9\p{L}])/iu;
  const fmtM = clean.match(fmtRx);
  if (fmtM) {
    const num = parseInt(fmtM[1].replace(/\./g, ''), 10);
    return { amount: num, cleanText: clean.replace(fmtM[0], '').trim() };
  }

  // 11. Số nguyên thông thường từ 4 chữ số trở lên: 40000, 25000 (tránh nhầm với số thứ tự hay ngày tháng)
  const plainNumRx = /(?:[\-:\u2013\u2014]\s*)?\b(\d{4,12})(?:\s*(?:đồng|dong|đ|vnd))?(?![a-zA-Z0-9\p{L}])/iu;
  const plainM = clean.match(plainNumRx);
  if (plainM) {
    const num = parseInt(plainM[1], 10);
    return { amount: num, cleanText: clean.replace(plainM[0], '').trim() };
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

export interface ParsedDateResult {
  date: string;
  cleanText: string;
  hasExplicitDate: boolean;
}

/**
 * Tách ngày tháng từ câu tiếng Việt (hỗ trợ ngày cụ thể, hôm qua, hôm nay, từ lóng / viết tắt)
 */
export function parseDateFromVietnameseText(text: string, today: Date = new Date()): ParsedDateResult {
  let remaining = text;
  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // 1. Ngày đầy đủ: dd/MM/YYYY hoặc dd-MM-YYYY hoặc dd.MM.YYYY (kèm từ tiền tố "vào / hôm / ngày" nếu có)
  const fullDateRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/iu;
  const fullM = remaining.match(fullDateRx);
  if (fullM) {
    const day = parseInt(fullM[1], 10);
    const month = parseInt(fullM[2], 10) - 1;
    const year = parseInt(fullM[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      const clean = remaining.replace(fullM[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date: toISO(d),
        cleanText: cleanDescriptionText(clean),
        hasExplicitDate: true
      };
    }
  }

  // 2. Ngày với chữ "tháng" hoặc "thg": "20 tháng 10", "20 thg 10", "hôm 20 tháng 10"
  const thangDateRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})\s*(?:tháng|thg)\s*(\d{1,2})(?:\s*(?:năm|\/|-)\s*(\d{4}))?\b/iu;
  const thangM = remaining.match(thangDateRx);
  if (thangM) {
    const day = parseInt(thangM[1], 10);
    const month = parseInt(thangM[2], 10) - 1;
    let year = thangM[3] ? parseInt(thangM[3], 10) : today.getFullYear();
    let d = new Date(year, month, day);
    if (!thangM[3]) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d > tomorrow) d = new Date(year - 1, month, day);
    }
    if (!isNaN(d.getTime())) {
      const clean = remaining.replace(thangM[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date: toISO(d),
        cleanText: cleanDescriptionText(clean),
        hasExplicitDate: true
      };
    }
  }

  // 3. Ngày ngắn: dd/MM hoặc dd-MM (năm nay): "hôm 20-10", "ngày 20-10", "20/10", "20-10"
  const shortDateRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})[\/\-](\d{1,2})\b/iu;
  const shortM = remaining.match(shortDateRx);
  if (shortM) {
    const day = parseInt(shortM[1], 10);
    const month = parseInt(shortM[2], 10) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      let year = today.getFullYear();
      let d = new Date(year, month, day);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d > tomorrow) d = new Date(year - 1, month, day);
      if (!isNaN(d.getTime())) {
        const clean = remaining.replace(shortM[0], ' ').replace(/\s{2,}/g, ' ').trim();
        return {
          date: toISO(d),
          cleanText: cleanDescriptionText(clean),
          hasExplicitDate: true
        };
      }
    }
  }

  // 4. Hôm kia (-2 ngày): hôm kia, bữa kia, bữa hôm kia, hkia, h kia
  const homKiaRx = /(?:(?:vào|hôm|bữa)\s+)?\b(hôm kia|bữa kia|bữa hôm kia|hkia|h\s*kia)\b/iu;
  const homKiaM = remaining.match(homKiaRx);
  if (homKiaM) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    const clean = remaining.replace(homKiaM[0], ' ').replace(/\s{2,}/g, ' ').trim();
    return {
      date: toISO(d),
      cleanText: cleanDescriptionText(clean),
      hasExplicitDate: true
    };
  }

  // 5. Hôm qua (-1 ngày): hôm qua, tối qua, sáng qua, chiều qua, trưa qua, đêm qua, hqua, h qua, hq, tqua, t qua, squá, s qua, bữa qua
  const homQuaRx = /(?:(?:vào|hôm|bữa)\s+)?\b(hôm qua|tối qua|sáng qua|chiều qua|trưa qua|đêm qua|hqua|h\s*qua|hq|tqua|t\s*qua|squá|s\s*qua|bữa qua)\b/iu;
  const homQuaM = remaining.match(homQuaRx);
  if (homQuaM) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const clean = remaining.replace(homQuaM[0], ' ').replace(/\s{2,}/g, ' ').trim();
    return {
      date: toISO(d),
      cleanText: cleanDescriptionText(clean),
      hasExplicitDate: true
    };
  }

  // 6. 3 ngày trước (-3 ngày)
  const baNgayRx = /\b(3\s*ngày\s*trước|ba\s*ngày\s*trước)\b/iu;
  const baNgayM = remaining.match(baNgayRx);
  if (baNgayM) {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    const clean = remaining.replace(baNgayM[0], ' ').replace(/\s{2,}/g, ' ').trim();
    return {
      date: toISO(d),
      cleanText: cleanDescriptionText(clean),
      hasExplicitDate: true
    };
  }

  // 7. Hôm nay (0 ngày): hôm nay, sáng nay, tối nay, chiều nay, trưa nay, nay, hnay, h nay, bữa nay
  const homNayRx = /(?:(?:vào|hôm|bữa)\s+)?\b(hôm nay|sáng nay|tối nay|chiều nay|trưa nay|nay|hnay|h\s*nay|bữa nay)\b/iu;
  const homNayM = remaining.match(homNayRx);
  if (homNayM) {
    const clean = remaining.replace(homNayM[0], ' ').replace(/\s{2,}/g, ' ').trim();
    return {
      date: toISO(today),
      cleanText: cleanDescriptionText(clean),
      hasExplicitDate: true
    };
  }

  // 8. Thứ trong tuần (thứ hai ... chủ nhật)
  const thuRx = /(?:(?:vào|hôm)\s+)?\b(thứ\s+[2-7]|thứ\s+(?:hai|ba|tư|năm|sáu|bảy)|chủ\s*nhật|cn)\b/iu;
  const thuM = remaining.match(thuRx);
  if (thuM) {
    const thuStr = thuM[1].toLowerCase().replace(/\s+/g, ' ');
    const mapThu: Record<string, number> = {
      'thứ 2': 1, 'thứ hai': 1,
      'thứ 3': 2, 'thứ ba': 2,
      'thứ 4': 3, 'thứ tư': 3,
      'thứ 5': 4, 'thứ năm': 4,
      'thứ 6': 5, 'thứ sáu': 5,
      'thứ 7': 6, 'thứ bảy': 6,
      'chủ nhật': 0, 'cn': 0
    };
    const targetDow = mapThu[thuStr];
    if (targetDow !== undefined) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      const diff = (d.getDay() - targetDow + 7) % 7;
      d.setDate(d.getDate() - diff);
      const clean = remaining.replace(thuM[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date: toISO(d),
        cleanText: cleanDescriptionText(clean),
        hasExplicitDate: true
      };
    }
  }

  return { date: toISO(today), cleanText: cleanDescriptionText(remaining), hasExplicitDate: false };
}

/**
 * Làm sạch mô tả giao dịch: loại bỏ ký tự gạch đầu dòng, dấu hai chấm, dấu gạch nối, đơn vị tiền thừa
 */
export function cleanDescriptionText(text: string): string {
  let res = text.trim();
  // Loại bỏ các đơn vị tiền tệ hoặc dấu gạch nối tiền bị sót: " - đ", " - đồng", "đ", "vnd"
  res = res.replace(/[\s:\-\u2013\u2014]+(?:đồng|dong|đ|vnd)(?![a-zA-Z0-9\p{L}])/giu, '');
  res = res.replace(/(?:^|\s)(?:đồng|dong|đ|vnd)$/giu, '');
  // Loại bỏ số thứ tự ở đầu như "1. ", "2) ", "1- "
  res = res.replace(/^\s*\d+[\.\)\-:]\s*/, '');
  // Loại bỏ từ đệm đầu/cuối: "hết", "mất", "được", "tầm", v.v.
  res = cleanFillerWords(res);
  // Gom các dấu gạch nối liên tiếp "--", " - - " thành " - "
  res = res.replace(/[\-\u2013\u2014\s]{2,}/g, ' - ');
  // Loại bỏ các ký tự phân cách ở đầu và cuối: dấu hai chấm :, gạch ngang -, gạch dài –, —, chấm phẩy ;, phẩy ,, chấm .
  res = res.replace(/^[\s,;:\-\u2013\u2014\•\*]+/, '').replace(/[\s,;:\-\u2013\u2014\•\*]+$/, '').trim();
  return res;
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
  if (/Quà|Tặng|Cho|Biếu/i.test(cat)) return '🎁';
  if (/Thu nhập/i.test(cat)) return '💰';
  if (/Tiết kiệm|Đầu tư/i.test(cat)) return '📈';
  if (/Sửa chữa/i.test(cat)) return '🔧';
  return '🏷️';
}

/**
 * Phân loại loại giao dịch và danh mục nhanh từ văn bản (dành cho file txt và parse tự động)
 * Phân biệt rõ ràng giữa CHO và NHẬN:
 *   - "ABC cho": ABC cho mình -> Được nhận -> THU NHẬP (income)
 *   - "Cho ABC": Mình cho người khác -> Mất tiền -> CHI TIÊU (expense)
 */
export function guessCategoryAndType(text: string): { type: 'income' | 'expense'; category: string } {
  const lower = text.toLowerCase();
  const trimmed = text.trim();

  // 1. Phân biệt rõ việc CHO và NHẬN:
  // A. Trường hợp người khác cho mình ("tiền thừa anh Thắng cho", "anh Thắng cho tiền thừa", "được cho", "tiền mẹ cho", "khách bo"...)
  // => MÌNH ĐƯỢC NHẬN = THU NHẬP (INCOME)
  if (/^(?:được|nhận)\s+(?:(?:tiền\s+)?(?:thừa|thối|dư\s+)?(?:cho|tặng|lì xì|biếu|thưởng)|quà)(?:\s+\d|;|,|$|\s+)/iu.test(trimmed)) {
    return { type: 'income', category: 'Được tặng & Cho' };
  }

  // Tiền thừa / tiền thối / tiền bo / tiền tip
  if (/^(?:tiền\s+)?(?:thừa|thối|dư|bo|tip)\b/iu.test(trimmed)) {
    // Nếu có "ai đó cho", ví dụ "tiền thừa anh Thắng cho"
    if (/\b(?:cho|tặng|biếu|thưởng|gửi|để lại)\b/iu.test(trimmed)) {
      return { type: 'income', category: 'Được tặng & Cho' };
    }
    // Nếu chỉ ghi "tiền bo", "tiền tip", "nhận tiền thừa"
    if (/\b(?:bo|tip|nhận|thu)\b/iu.test(trimmed)) {
      return { type: 'income', category: 'Thu nhập khác' };
    }
  }

  // Khách bo, khách tip, khách cho
  if (/\bkhách\s+(?:bo|tip|cho|tặng)\b/iu.test(trimmed)) {
    return { type: 'income', category: 'Thu nhập khác' };
  }

  // Cấu trúc: [tiền thừa/tiền...] [ai đó] cho / tặng / biếu / lì xì / thưởng
  const aiDoChoMatch = trimmed.match(/(?:^(?:tiền(?:\s+(?:thừa|thối|dư))?\s+)?|(?:^được\s+))([^\d,.;]+?)\s+(?:cho|lì xì|tặng|biếu|thưởng)(?:\s+(?:tiền(?:\s+(?:thừa|thối|dư))?|mình|tôi|em|con|cháu|giữ))?(?:\s+\d|;|,|$)/iu);
  if (aiDoChoMatch) {
    const subject = aiDoChoMatch[1].trim().toLowerCase();
    // Nếu chủ ngữ KHÔNG PHẢI là ngôi thứ nhất ("tôi", "mình", "tao")
    if (!/^(?:tôi|mình|tao)$/iu.test(subject)) {
      return { type: 'income', category: 'Được tặng & Cho' };
    }
  }

  // B. Trường hợp mình cho người khác ("cho ABC ...", "cho tiền ABC ...", "tôi cho ABC ...", "mình cho ABC ...", "biếu ABC ...", "tặng ABC ...")
  // => MÌNH CHO NGƯỜI KHÁC = MÌNH MẤT TIỀN = CHI TIÊU (EXPENSE)
  const choNguoiKhacMatch = trimmed.match(/^(?:tôi\s+|mình\s+|tao\s+)?(?:cho(?:\s+tiền)?|biếu|tặng|lì xì|mừng)\s+([^\d,.;]+?)(?:\s+\d|;|,|$)/iu);
  if (choNguoiKhacMatch) {
    return { type: 'expense', category: 'Quà tặng & Cho biếu' };
  }

  // C. Nếu chỉ ghi "cho 500k", "cho tiền 500k", "từ thiện 100k", "mừng cưới 500k"
  if (/^(?:tôi\s+|mình\s+|tao\s+)?(?:cho(?:\s+tiền)?|từ thiện|mừng cưới|phúng viếng)(?:\s+\d|;|,|$)/iu.test(trimmed)) {
    return { type: 'expense', category: 'Quà tặng & Cho biếu' };
  }

  // 2. Nhận diện các khoản thu nhập rõ ràng khác
  const hasDirectIncomeWord = matchViWords(lower, 'lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|lãi suất|freelance|nhận tiền|tiền vào|được tặng|lì xì|trúng thưởng|hoàn tiền|tiền hoàn|hoàn lại|hoàn trả|cashback|nhận hoàn|tiền về|ting ting|thu nợ|đòi nợ|\\+');
  const isSelling = matchViWords(lower, 'bán|thanh lý|sang nhượng') && !matchViWords(lower, 'mua|quán|tiệm|chỗ|hàng');
  const isReceiving = matchViWords(lower, 'nhận|kiếm được|thu được') && !matchViWords(lower, 'nhận phòng|nhận hàng');

  if (hasDirectIncomeWord || isSelling || isReceiving) {
    if (matchViWords(lower, 'lương|salary|thưởng|bonus')) {
      return { type: 'income', category: 'Thu nhập lương' };
    }
    return { type: 'income', category: 'Thu nhập khác' };
  }

  // 3. Nhận diện chi tiêu theo từ khóa:
  // Ăn uống: cơm, phở, trà sữa, cafe, ăn, uống, bún, bánh...
  if (matchViWords(lower, 'ăn|uống|cơm|phở|bún|bánh|mì|miến|cháo|thịt|rau|cá|cafe|cà phê|coffee|trà|trà sữa|nước|sinh tố|siêu thị|chợ|buffet|quán|lẩu|nướng|nhậu|trưa|tối|sáng|bữa|hoa quả|trái cây|mít|sầu riêng|cam|táo|ổi|dưa|chuối|xoài|thực phẩm')) {
    return { type: 'expense', category: 'Ăn uống' };
  }
  // Xe cộ: xăng, xe, gửi xe, đổ xăng, rửa xe, grab, taxi...
  if (matchViWords(lower, 'xăng|xe|gửi xe|đậu xe|bãi xe|đổ xăng|rửa xe|sửa xe|thay nhớt|grab|be|gojek|taxi|bus|vé xe|vé tàu|vé máy bay')) {
    return { type: 'expense', category: 'Xe cộ' };
  }
  // Sức khỏe: gym, thuốc, khám, bác sĩ, bệnh viện, nha khoa, cồn y tế, ráy tai...
  if (matchViWords(lower, 'gym|thuốc|mua thuốc|bệnh viện|khám|bác sĩ|nha|răng|nha khoa|fitness|yoga|spa|mát xa|cắt tóc|gội đầu|mỹ phẩm|cồn|ráy tai|vệ sinh tai|tai mũi họng|y tế')) {
    return { type: 'expense', category: 'Sức khỏe' };
  }
  // Nhà cửa & Tiện ích
  if (matchViWords(lower, 'điện|nước|tiền điện|tiền nước|internet|wifi|tiền nhà|thuê nhà|phòng trọ|chung cư|gas|rác|dọn vệ sinh|vệ sinh nhà')) {
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

export interface HeaderDirectiveResult {
  isHeader: boolean;
  isDirective?: boolean;
  isColumnHeader?: boolean;
  isSummary?: boolean;
  type?: 'income' | 'expense';
  month?: number;
  year?: number;
  text?: string;
}

/**
 * Nhận diện các dòng chỉ thị ngữ cảnh hoặc dòng tiêu đề bảng / tổng kết:
 * - "Đây là dữ liệu chi tháng 8", "Dữ liệu thu tháng 8/2026", "Khoản chi:", "Bảng chi tiêu cá nhân"
 * - "Ngày - Tên chi tiêu - Số tiền", "STT, Ngày, Mô tả, Số tiền"
 * - "Tổng cộng: 1.500.000đ"
 */
export function detectHeaderDirective(line: string): HeaderDirectiveResult | null {
  const t = line.trim();
  if (!t) return null;

  // 1. Dòng tiêu đề cột bảng: 'Ngày - Tên chi tiêu - Số tiền', 'STT, Ngày, Mô tả, Số tiền', v.v.
  const isTableColHeader =
    /^(?:stt|tt)[\s,;\t|–\-]+(?:ngày|date)/i.test(t) ||
    /^(?:stt|tt|ngày|date)[\s,;\t|–\-]+(?:mô\s+tả|nội\s+dung|tên|loại|chi\s+tiết|danh\s+mục)/i.test(t) ||
    /^(?:ngày|date)[\s,;\t|–\-]+(?:loại|số\s+tiền|tiền|amount)/i.test(t) ||
    /^(?:mô\s+tả|nội\s+dung|tên\s+chi\s+tiêu)[\s,;\t|–\-]+(?:số\s+tiền|tiền|amount)/i.test(t);
  if (isTableColHeader) {
    return { isHeader: true, isColumnHeader: true, text: t };
  }

  // 2. Dòng tổng cộng / thống kê: 'Tổng cộng: 1.500.000', 'Tổng chi: ...'
  if (/^tổng\s*(?:cộng|chi|thu)?[:\s]/i.test(t)) {
    return { isHeader: true, isSummary: true, text: t };
  }

  // 3. Tiêu đề chỉ thị Thu / Chi và Tháng / Năm:
  // Ví dụ: 'Đây là dữ liệu chi tháng 8', 'Bảng chi tiêu tháng 8/2026', 'Khoản thu tháng 8:', 'Chi tiêu tháng 8'
  const directiveRx = /^(?:(?:\d+[\.\)\-:]\s*)?(?:đây\s+là\s+|tất\s+cả\s+là\s+|toàn\s+bộ\s+là\s+)?(?:dữ\s+liệu|danh\s+sách|bảng|các\s+khoản|khoản|phần)?\s*)?(chi\s+tiêu|chi|thu\s+nhập|thu|tiền\s+vào|tiền\s+ra)(?:\s+(?:cá\s+nhân|gia\s+đình|sinh\s+hoạt))?(?:\s+(?:tháng|thg)\s*(\d{1,2}))?(?:\s*(?:năm|\/|-)\s*(\d{4}))?[:\s]*$/iu;
  const m = t.match(directiveRx);
  if (m) {
    const rawType = m[1].toLowerCase();
    const isIncome = rawType.includes('thu') || rawType.includes('tiền vào');
    const isExpense = rawType.includes('chi') || rawType.includes('tiền ra');
    const type = isIncome ? 'income' : (isExpense ? 'expense' : undefined);
    const month = m[2] ? parseInt(m[2], 10) : undefined;
    const year = m[3] ? parseInt(m[3], 10) : undefined;
    return { isHeader: true, isDirective: true, type, month, year, text: t };
  }

  // 4. Các dòng đề mục chung: '2. Bảng chi tiêu cá nhân', '1. Khoản thu', '2. Khoản chi'
  const sectionRx = /^(?:\d+[\.\)\-:]\s*)?(?:bảng|danh\s+sách|mục)\s+(chi\s+tiêu|thu\s+nhập|chi|thu)(?:\s+cá\s+nhân)?[:\s]*$/iu;
  const mSec = t.match(sectionRx);
  if (mSec) {
    const isIncome = mSec[1].toLowerCase().includes('thu');
    return { isHeader: true, isDirective: true, type: isIncome ? 'income' : 'expense', text: t };
  }

  return null;
}

/**
 * Đọc hiểu câu nhập kép / nhiều giao dịch trên cùng 1 dòng
 * Ví dụ: "nhận thưởng 1tr, mời Đạt đi ăn 500k, đổ xăng 100k, bán máy tính đc 1tr"
 */
export function parseMultiSmartInput(
  rawText: string,
  defaultDate: string = new Date().toISOString().split('T')[0],
  defaultType?: 'expense' | 'income'
): ParsedTransactionItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Bảo vệ dấu phẩy và chấm phẩy nằm bên trong dấu ngoặc (ví dụ: (trong đó 50k mời Hoàng, 10k tip))
  const protectedText = trimmed.replace(/\(([^)]+)\)/g, (match) => {
    return match.replace(/,/g, '__COMMA__').replace(/;/g, '__SEMI__');
  });

  // 2. Tách theo dấu ngắt mệnh đề: xuống dòng, chấm phẩy, dấu phẩy (không nằm giữa 2 số), hoặc từ nối "và", "rồi", "+"
  const clauseRegex = /(?:[\r\n;]+|(?<!\d),(?!\d)|\s+(?:và|rồi|\+)\s+)/i;
  const rawClauses = protectedText.split(clauseRegex);

  let currentContextDate = defaultDate;
  let currentContextType: 'income' | 'expense' | null = null;
  let currentContextMonth: number | null = null;
  let currentContextYear: number | null = null;

  const items: ParsedTransactionItem[] = [];

  for (let i = 0; i < rawClauses.length; i++) {
    let clause = rawClauses[i].trim();
    if (!clause) continue;

    // Khôi phục dấu phẩy trong ngoặc
    clause = clause.replace(/__COMMA__/g, ',').replace(/__SEMI__/g, ';');

    // Dọn sạch gạch đầu dòng, bullet point, dấu hai chấm ở đầu clause
    clause = clause.replace(/^[\-\*\+•:\u2013\u2014\s]+/, '').trim();
    if (!clause) continue;

    // Kiểm tra dòng chỉ thị tiêu đề (ví dụ "Đây là dữ liệu chi tháng 8")
    const headerCheck = detectHeaderDirective(clause);
    if (headerCheck) {
      if (headerCheck.isDirective) {
        if (headerCheck.type) currentContextType = headerCheck.type;
        if (headerCheck.month) {
          currentContextMonth = headerCheck.month;
          const y = headerCheck.year || new Date().getFullYear();
          currentContextYear = y;
          currentContextDate = `${y}-${String(headerCheck.month).padStart(2, '0')}-01`;
        }
      }
      continue;
    }

    const parsed = parseSmartInput(clause);
    const dCheck = parseDateFromVietnameseText(clause);

    // Mệnh đề không chứa số tiền:
    // Nếu là từ chỉ ngày (ví dụ "Hôm qua:", "20/10:"), cập nhật ngày ngữ cảnh cho các dòng sau.
    // Các dòng không có tiền ĐỀU BỊ BỎ QUA (không tạo giao dịch 0đ).
    if (parsed.amount === null || parsed.amount <= 0) {
      if (dCheck.hasExplicitDate && dCheck.date) {
        currentContextDate = dCheck.date;
      }
      continue;
    }

    // Nếu CÓ SỐ TIỀN:
    let itemDate = currentContextDate;
    let desc = parsed.description || clause;

    // Kiểm tra xem mệnh đề có mốc thời gian riêng không (ví dụ "01/08/2026 nhận tiền hoàn...", "nay ăn sáng 20k")
    const clauseDate = parseDateFromVietnameseText(desc || clause);
    if (clauseDate.hasExplicitDate && clauseDate.date) {
      itemDate = clauseDate.date;
      currentContextDate = clauseDate.date; // Cập nhật ngày cho các mệnh đề sau
      desc = clauseDate.cleanText;
    } else if (currentContextMonth) {
      // Nhận diện ngày chỉ ghi số '01', '05', 'ngày 5' khi đã có context tháng
      const dayM = desc.match(/^(?:(?:ngày|hôm|vào)\s+)?(\d{1,2})(?:\s+|$|[-–—:])/i);
      if (dayM) {
        const d = parseInt(dayM[1], 10);
        if (d >= 1 && d <= 31) {
          const y = currentContextYear || new Date().getFullYear();
          itemDate = `${y}-${String(currentContextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          currentContextDate = itemDate;
          desc = desc.replace(dayM[0], ' ').trim();
        }
      }
    }

    desc = cleanDescriptionText(desc);

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
      const lowerDesc = desc.toLowerCase();
      const hasStrongIncome = matchViWords(lowerDesc, 'lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|lãi suất|freelance|nhận tiền|tiền vào|được tặng|lì xì|trúng thưởng|hoàn tiền|tiền hoàn|hoàn lại|hoàn trả|cashback|thu nợ|đòi nợ');

      // Thứ tự ưu tiên xác định loại giao dịch:
      // 1. Chỉ thị ngữ cảnh có quyền lực cao nhất ("Đây là dữ liệu chi tháng 8", "Khoản chi:") -> 100% là expense!
      // 2. Nếu không có chỉ thị ngữ cảnh, kiểm tra từ khóa thu nhập rõ ràng (lương, thưởng, nhận tiền...)
      // 3. Nếu người dùng đang chọn loại cụ thể trên form (defaultType) -> áp dụng defaultType
      // 4. Mặc định suy đoán theo mô tả
      let finalType: 'income' | 'expense';
      if (currentContextType) {
        finalType = currentContextType;
      } else if (hasStrongIncome) {
        finalType = 'income';
      } else if (defaultType) {
        finalType = defaultType;
      } else {
        finalType = guessed.type;
      }

      items.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        type: finalType,
        amount: parsed.amount,
        description: desc || (finalType === 'income' ? 'Khoản thu' : 'Khoản chi'),
        category: guessed.category,
        note: parsed.note || '',
        date: itemDate,
        rawText: clause
      });
    }
  }

  return items;
}

export interface BatchParsedRow {
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  note: string;
  valid: boolean;
  error?: string;
  rawText?: string;
}

export interface BatchParseResult {
  rows: BatchParsedRow[];
  directiveSummary?: string;
}

function parseExplicitDateWithCtx(raw: string, ctx: { contextMonth: number | null; contextYear: number | null }): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m1 = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  const m2 = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const y = ctx.contextYear || new Date().getFullYear();
    return `${y}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

function parseExplicitTypeCell(raw: string): 'income' | 'expense' | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (['thu', 'income', 'thu nhập', 'in', '+', 'tiền vào', 'nhận'].includes(s)) return 'income';
  if (['chi', 'expense', 'chi tiêu', 'out', '-', 'tiền ra'].includes(s)) return 'expense';
  return null;
}

function parsePartAmountCell(raw: string): number | null {
  if (!raw) return null;
  const t = raw.trim();
  const mK = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)$/i);
  if (mK) return parseFloat(mK[1].replace(',', '.')) * 1000;
  const mTr = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|m|củ)$/i);
  if (mTr) return parseFloat(mTr[1].replace(',', '.')) * 1000000;
  const mLit = t.match(/^(\d+(?:[.,]\d+)?)\s*lít$/i);
  if (mLit) return parseFloat(mLit[1].replace(',', '.')) * 100000;
  const digits = t.replace(/\./g, '').replace(/,/g, '').replace(/[^\d]/g, '');
  if (/^\d+$/.test(digits) && parseInt(digits, 10) > 0) return parseInt(digits, 10);
  return null;
}

/**
 * Bộ đọc hàng loạt thông minh hỗ trợ:
 * - File CSV / TSV / Bảng copy từ Excel
 * - Danh sách văn bản dán trực tiếp theo câu tự nhiên
 * - Định dạng phân cách 'Ngày - Tên chi tiêu - Số tiền'
 * - Chỉ thị ngữ cảnh: "Đây là dữ liệu chi tháng 8", "Dữ liệu thu tháng 8/2026", "Khoản chi:"
 */
export function parseBatchTransactions(content: string, defaultDate: string = new Date().toISOString().split('T')[0]): BatchParseResult {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: BatchParsedRow[] = [];

  let contextType: 'income' | 'expense' | null = null;
  let contextMonth: number | null = null;
  let contextYear: number | null = null;
  let directiveMessages: string[] = [];

  for (const rawLine of lines) {
    const header = detectHeaderDirective(rawLine);
    if (header) {
      if (header.isDirective) {
        if (header.type) {
          contextType = header.type;
        }
        if (header.month) {
          contextMonth = header.month;
          contextYear = header.year || new Date().getFullYear();
          directiveMessages.push(`Dữ liệu ${contextType === 'income' ? 'Thu' : 'Chi'} Tháng ${contextMonth}/${contextYear}`);
        } else if (contextType) {
          directiveMessages.push(`Dữ liệu ${contextType === 'income' ? 'Thu' : 'Chi'}`);
        }
      }
      // Bỏ qua dòng header / directive, không tạo giao dịch
      continue;
    }

    // 1. Tách ghi chú ngoặc đơn (...)
    let note = '';
    let cleanLine = rawLine;
    const noteM = cleanLine.match(/\(([^)]+)\)/);
    if (noteM) {
      note = noteM[1].trim();
      cleanLine = cleanLine.replace(noteM[0], ' ').trim();
    }

    // 2. Kiểm tra nếu có phân cách cột (tab, phẩy, chấm phẩy, hoặc ' - ')
    let parts: string[] = [];
    if (cleanLine.includes('\t')) {
      parts = cleanLine.split('\t').map(s => s.trim()).filter(Boolean);
    } else if (cleanLine.includes(';') && !cleanLine.includes(',')) {
      parts = cleanLine.split(';').map(s => s.trim()).filter(Boolean);
    } else if (cleanLine.includes(',') && !/^\d+,\d+$/.test(cleanLine)) {
      parts = cleanLine.split(',').map(s => s.trim()).filter(Boolean);
    } else if (/\s+[-–—]\s+/.test(cleanLine)) {
      parts = cleanLine.split(/\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    }

    let date: string | null = null;
    let amount: number | null = null;
    let explicitType: 'income' | 'expense' | null = null;
    let description = '';

    if (parts.length >= 2) {
      const descTokens: string[] = [];
      for (const p of parts) {
        if (!date && parseExplicitDateWithCtx(p, { contextMonth, contextYear })) {
          date = parseExplicitDateWithCtx(p, { contextMonth, contextYear });
          continue;
        }
        if (amount === null && parsePartAmountCell(p) !== null) {
          amount = parsePartAmountCell(p);
          continue;
        }
        if (!explicitType && parseExplicitTypeCell(p)) {
          explicitType = parseExplicitTypeCell(p);
          continue;
        }
        descTokens.push(p);
      }
      description = cleanDescriptionText(descTokens.join(' - '));
    }

    // Nếu không phân tách cột được, hoặc câu tự nhiên liền nhau: "01/08/2026 nhận tiền hoàn techcombank 100k"
    if (amount === null) {
      const pAmt = parseAmount(cleanLine);
      amount = pAmt.amount;
      cleanLine = pAmt.cleanText;

      if (!date) {
        const fullD = cleanLine.match(/(?:(?:ngày|hôm|vào)\s+)?\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/i);
        if (fullD) {
          date = `${fullD[3]}-${fullD[2].padStart(2, '0')}-${fullD[1].padStart(2, '0')}`;
          cleanLine = cleanLine.replace(fullD[0], ' ').trim();
        } else {
          const shortD = cleanLine.match(/(?:(?:ngày|hôm|vào)\s+)?\b(\d{1,2})[\/\-](\d{1,2})\b/i);
          if (shortD) {
            const y = contextYear || new Date().getFullYear();
            date = `${y}-${shortD[2].padStart(2, '0')}-${shortD[1].padStart(2, '0')}`;
            cleanLine = cleanLine.replace(shortD[0], ' ').trim();
          } else if (contextMonth) {
            const dayM = cleanLine.match(/^(?:(?:ngày|hôm|vào)\s+)?(\d{1,2})(?:\s+|$|[-–—:])/i);
            if (dayM) {
              const d = parseInt(dayM[1], 10);
              if (d >= 1 && d <= 31) {
                const y = contextYear || new Date().getFullYear();
                date = `${y}-${String(contextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                cleanLine = cleanLine.replace(dayM[0], ' ').trim();
              }
            }
          }
        }
      }

      // Kiểm tra ngày tương đối (hôm qua, hôm nay, thứ...)
      if (!date) {
        const dCheck = parseDateFromVietnameseText(cleanLine);
        if (dCheck.hasExplicitDate && dCheck.date) {
          date = dCheck.date;
          cleanLine = dCheck.cleanText;
        }
      }

      description = cleanDescriptionText(cleanLine);
    }

    // Bỏ qua dòng hoàn toàn không có tiền và không có nội dung giao dịch
    if (!amount || amount <= 0) {
      continue;
    }

    if (!date) {
      date = contextMonth
        ? `${contextYear || new Date().getFullYear()}-${String(contextMonth).padStart(2, '0')}-01`
        : defaultDate;
    }

    // Xác định Type & Category
    const guessed = guessCategoryAndType(description);
    const lowerDesc = description.toLowerCase();
    const hasStrongIncome = matchViWords(lowerDesc, 'lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|lãi suất|freelance|nhận tiền|tiền vào|được tặng|lì xì|trúng thưởng|hoàn tiền|tiền hoàn|hoàn lại|hoàn trả|cashback|thu nợ|đòi nợ');

    let finalType: 'income' | 'expense';
    if (explicitType) {
      finalType = explicitType;
    } else if (contextType) {
      // Chỉ thị ngữ cảnh có mức độ ưu tiên cao nhất (ví dụ: "Đây là dữ liệu chi tháng 8" -> tất cả là chi)
      finalType = contextType;
    } else if (hasStrongIncome) {
      finalType = 'income';
    } else {
      finalType = guessed.type;
    }

    const errors: string[] = [];
    if (!description) {
      description = finalType === 'income' ? 'Khoản thu' : 'Khoản chi';
    }

    rows.push({
      date,
      type: finalType,
      amount,
      description,
      category: guessed.category,
      note,
      valid: errors.length === 0,
      error: errors.join(', '),
      rawText: rawLine
    });
  }

  const directiveSummary = directiveMessages.length > 0 ? directiveMessages[directiveMessages.length - 1] : undefined;
  return { rows, directiveSummary };
}
