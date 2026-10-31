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

export const MAX_SAFE_AMOUNT = 1_000_000_000_000;

export function localTodayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

// Nhận diện các đơn vị số lượng / danh từ đếm để bảo vệ số lượng không bị nhầm thành số tiền
const QTY_UNITS_REGEX = /\b(\d+(?:[.,]\d+)?)\s*(cái|chiếc|bộ|đôi|cặp|bát|tô|chén|đĩa|dĩa|phần|suất|cốc|ly|hộp|gói|bịch|túi|bao|tập|quyển|cuốn|con|quả|trái|cây|bó|nhánh|vé|người|lần|chuyến|bàn|phòng|size|kg|kí|ký|lạng|gam|g|áo|quần|váy|giày|dép|phở|bún|cơm|bánh|cafe|cà phê|trà|móc|chìa|khóa|món|đồ|chú|thùng|két|bình|lọ|lon|cuộn|tấm|miếng|thanh|chai\s+(?:nước|bia|rượu|dầu|mắm|sữa|sting|coca|pepsi)|tép|viên|liều|vỉ|mét|m)\b/giu;

// Nhận diện số lượng đứng ngay sau các động từ mua sắm/tiêu dùng: "mua 2 áo", "gọi 2 phở", "order 2 ly trà"
const VERB_QTY_REGEX = /(?<=(?:^|[^\p{L}\p{N}])(?:mua|order|gọi|lấy|thêm|đặt)\s+)(\d+)(?=\s+[a-zA-Z\p{L}])/giu;

function protectQuantities(text: string): { protectedText: string; map: string[] } {
  const map: string[] = [];
  // 1. Bảo vệ theo đơn vị đo đếm
  let res = text.replace(QTY_UNITS_REGEX, (match, num, unit) => {
    const key = `__QTY_${map.length}__`;
    map.push(num);
    return `${key} ${unit}`;
  });
  // 2. Bảo vệ theo động từ tiêu dùng
  res = res.replace(VERB_QTY_REGEX, (match, num) => {
    const key = `__QTY_${map.length}__`;
    map.push(num);
    return key;
  });
  return { protectedText: res, map };
}

function unprotectQuantities(text: string, map: string[]): string {
  let res = text;
  for (let i = 0; i < map.length; i++) {
    res = res.replace(new RegExp(`__QTY_${i}__`, 'g'), map[i]);
  }
  return res;
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
  const { protectedText, map } = protectQuantities(text);
  let clean = protectedText;

  const result = (amount: number | null, cleanStr: string) => ({
    amount,
    cleanText: unprotectQuantities(cleanStr, map).trim()
  });

  // 1. Các từ chỉ phân nửa: nửa củ/nửa chai (500k), nửa lít (50k), nửa triệu (500k)
  if (/(?:^|[^\p{L}\p{N}])nửa\s+(?:củ|chai)(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return result(500_000, clean.replace(/nửa\s+(?:củ|chai)(?![a-zA-Z\p{L}])/iu, ''));
  }
  if (/(?:^|[^\p{L}\p{N}])nửa\s+lít(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return result(50_000, clean.replace(/nửa\s+lít(?![a-zA-Z\p{L}])/iu, ''));
  }
  if (/(?:^|[^\p{L}\p{N}])nửa\s+(?:triệu|tr)(?![a-zA-Z\p{L}])/iu.test(clean)) {
    return result(500_000, clean.replace(/nửa\s+(?:triệu|tr)(?![a-zA-Z\p{L}])/iu, ''));
  }

  // 2. Các từ có đuôi "rưỡi": 1 củ rưỡi (1.5tr), 2 lít rưỡi (250k), 1 tr rưỡi (1.5tr)
  const ruoiCuM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:củ|chai)\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiCuM) {
    return result((parseViNum(ruoiCuM[1]) + 0.5) * 1_000_000, clean.replace(ruoiCuM[0], ''));
  }
  const ruoiLitM = clean.match(/(\d+(?:[.,]\d+)?)\s*lít\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiLitM) {
    return result((parseViNum(ruoiLitM[1]) + 0.5) * 100_000, clean.replace(ruoiLitM[0], ''));
  }
  const ruoiTrM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr)\s+rưỡi(?![a-zA-Z\p{L}])/iu);
  if (ruoiTrM) {
    return result((parseViNum(ruoiTrM[1]) + 0.5) * 1_000_000, clean.replace(ruoiTrM[0], ''));
  }

  // 3. Số lẻ kiểu nói tắt: 2tr5 (2.5tr), 1tr2 (1.2tr), 2củ5 (2.5tr)
  const trLeM = clean.match(/(\d+)\s*(?:tr|củ|chai|m)\s*(\d)(?![a-zA-Z\p{L}\d])/iu);
  if (trLeM) {
    const num = parseFloat(`${trLeM[1]}.${trLeM[2]}`) * 1_000_000;
    return result(num, clean.replace(trLeM[0], ''));
  }

  // 4. Tỷ: 1tỷ, 1.5tỷ, 1,5ty
  const tyM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty|bil(?:lion)?)(?![a-zA-Z\p{L}])/iu);
  if (tyM) {
    return result(parseViNum(tyM[1]) * 1_000_000_000, clean.replace(tyM[0], ''));
  }

  // 5. Củ / Chai (1 củ = 1 chai = 1.000.000): 1 củ, 2 củ, 3.5 củ, 10 chai (loại trừ củ cà rốt, chai nước/bia...)
  const cuM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:củ|chai)(?!\s*(?:cà\s+rốt|khoai|sắn|hành|tỏi|gừng|sen|nước|rượu|bia|dầu|mắm))(?![a-zA-Z\p{L}])/iu);
  if (cuM) {
    return result(parseViNum(cuM[1]) * 1_000_000, clean.replace(cuM[0], ''));
  }

  // 6. Triệu: 2tr, 2m, 2triệu, 1.5tr, 1,5m
  const trM = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m|mil(?:lion)?)(?![a-zA-Z\p{L}])/iu);
  if (trM) {
    return result(parseViNum(trM[1]) * 1_000_000, clean.replace(trM[0], ''));
  }

  // 7. Lít (1 lít = 100.000): 1 lít, 2 lít, 5 lít, 1.5 lít (loại trừ lít xăng, lít dầu, lít nước...)
  const litM = clean.match(/(\d+(?:[.,]\d+)?)\s*lít(?!\s*(?:xăng|dầu|nhớt|nước|sữa))(?![a-zA-Z\p{L}])/iu);
  if (litM) {
    return result(parseViNum(litM[1]) * 100_000, clean.replace(litM[0], ''));
  }

  // 8. Ngàn / Nghìn / k: 20k, 50k, 20nghìn, 50ngàn
  const kM = clean.match(/(?:[\-:\u2013\u2014]\s*)?(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?![a-zA-Z0-9\p{L}])/iu);
  if (kM) {
    return result(parseViNum(kM[1]) * 1_000, clean.replace(kM[0], ''));
  }

  // 9. Có đơn vị đồng/đ/vnd: 20000đ, 20.000đ, 20.000 đồng
  const dongRx = /(?:[\-:\u2013\u2014]\s*)?(\d[\d.]*)\s*(?:đồng|dong|đ|vnd)(?![a-zA-Z0-9\p{L}])/iu;
  const dongM = clean.match(dongRx);
  if (dongM) {
    const num = parseInt(dongM[1].replace(/\./g, ''), 10);
    return result(num, clean.replace(dongM[0], ''));
  }

  // 10. Số có dấu chấm ngăn cách kiểu Việt: 20.000, 1.000.000, 155.000 (kèm hoặc không kèm đ/đồng)
  // Có lookbehind và lookahead chống nhầm với ngày tháng như 19/08/2026
  const fmtRx = /(?:[\-:\u2013\u2014]\s*)?(?<![\/\-\.\d])(\d{1,3}(?:\.\d{3})+)(?:\s*(?:đồng|dong|đ|vnd))?(?![\/\-\.\d])/iu;
  const fmtM = clean.match(fmtRx);
  if (fmtM) {
    const num = parseInt(fmtM[1].replace(/\./g, ''), 10);
    return result(num, clean.replace(fmtM[0], ''));
  }

  // 11. Số có khoảng trắng ngăn cách hàng ngàn: 155 000, 1 000 000
  const spaceFmtRx = /(?:[\-:\u2013\u2014]\s*)?(?<![\/\-\.\d])(\d{1,3}(?:\s+\d{3})+)(?:\s*(?:đồng|dong|đ|vnd))?(?![\/\-\.\d])/iu;
  const spaceM = clean.match(spaceFmtRx);
  if (spaceM) {
    const num = parseInt(spaceM[1].replace(/\s+/g, ''), 10);
    return result(num, clean.replace(spaceM[0], ''));
  }

  // 12. Số nguyên thông thường từ 4 chữ số trở lên: 40000, 25000 (loại trừ ngày tháng như 2026 trong 19/08/2026)
  const plainNumRx = /(?:[\-:\u2013\u2014]\s*)?(?<![\/\-\.\d])(\d{4,12})(?:\s*(?:đồng|dong|đ|vnd))?(?![\/\-\.\d])/iu;
  const plainM = clean.match(plainNumRx);
  if (plainM) {
    const num = parseInt(plainM[1], 10);
    return result(num, clean.replace(plainM[0], ''));
  }

  return result(null, clean);
}

/**
 * Parse số kiểu Việt: "1,5" → 1.5 (thập phân), "20.000" → 20000 (không phải thập phân)
 */
function parseViNum(str: string): number {
  if (/^\d+[.,]\d{1,2}$/.test(str)) {
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
  if (/^\s*-/.test(raw)) return 0; // Chặn số âm
  const { amount } = parseAmount(raw);
  if (amount !== null) return Math.min(amount, MAX_SAFE_AMOUNT);
  const digits = raw.replace(/\./g, '').replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10) || 0;
  return Math.min(parsed, MAX_SAFE_AMOUNT);
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
  // Loại bỏ số thứ tự ở đầu như "1. ", "2) ", "1- " (chỉ xóa khi theo sau là khoảng trắng VÀ chữ cái, tránh xóa nhầm số tiền như "155.000")
  res = res.replace(/^\s*\d{1,3}[\.\)\-:]\s+(?=[a-zA-Z\p{L}])/u, '');
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
  const hasDirectIncomeWord = matchViWords(lower, 'lương|salary|thưởng|bonus|thu nhập|cổ tức|lãi|lãi suất|freelance|nhận tiền|tiền vào|được tặng|lì xì|trúng thưởng|hoàn tiền|tiền hoàn|hoàn lại|hoàn trả|cashback|nhận hoàn|tiền về|ting ting|thu nợ|đòi nợ');
  const hasPlusAmount = /(?:^|\s)\+\s*\d+/i.test(trimmed); // Chỉ khi dấu + đứng trước số tiền (ví dụ +100k) mới tính là thu nhập
  const isSelling = matchViWords(lower, 'bán|thanh lý|sang nhượng') && !matchViWords(lower, 'mua|quán|tiệm|chỗ|hàng');
  const isReceiving = matchViWords(lower, 'nhận|kiếm được|thu được') && !matchViWords(lower, 'nhận phòng|nhận hàng');

  if (hasDirectIncomeWord || hasPlusAmount || isSelling || isReceiving) {
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
  // Ví dụ: 'Đây là dữ liệu chi tháng 8', 'Bảng chi tiêu tháng 8/2026', 'Khoản thu tháng 8:', 'Chi tiêu tháng 8', 'Danh sách khoản thu tháng này'
  const directiveRx = /^(?:(?:\d+[\.\)\-:]\s*)?(?:đây\s+là\s+|tất\s+cả\s+là\s+|toàn\s+bộ\s+là\s+)?(?:dữ\s+liệu|danh\s+sách|bảng|các|tổng\s+hợp)?\s*(?:các\s+khoản|khoản|mục|phần)?\s*)?(chi\s+tiêu|chi|thu\s+nhập|thu|tiền\s+vào|tiền\s+ra)(?:\s+(?:cá\s+nhân|gia\s+đình|sinh\s+hoạt))?(?:\s+(?:tháng|thg)\s*(\d{1,2}|này))?(?:\s*(?:năm|\/|-)\s*(\d{4}))?[:\s]*$/iu;
  const m = t.match(directiveRx);
  if (m) {
    const rawType = m[1].toLowerCase();
    const isIncome = rawType.includes('thu') || rawType.includes('tiền vào');
    const isExpense = rawType.includes('chi') || rawType.includes('tiền ra');
    const type = isIncome ? 'income' : (isExpense ? 'expense' : undefined);
    let month: number | undefined;
    if (m[2]) {
      month = m[2].toLowerCase() === 'này' ? new Date().getMonth() + 1 : parseInt(m[2], 10);
    }
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
  defaultDate: string = localTodayISO(),
  defaultType?: 'expense' | 'income'
): ParsedTransactionItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Bảo vệ dấu phẩy và chấm phẩy nằm bên trong dấu ngoặc (ví dụ: (trong đó 50k mời Hoàng, 10k tip))
  const protectedText = trimmed.replace(/\(([^)]+)\)/g, (match) => {
    return match.replace(/,/g, '__COMMA__').replace(/;/g, '__SEMI__');
  });

  // 2. Tách theo dấu ngắt mệnh đề: xuống dòng, chấm phẩy, dấu phẩy (không nằm giữa 2 số), hoặc từ nối "và", "rồi"
  const clauseRegex = /(?:[\r\n;]+|(?<!\d),(?!\d)|\s+(?:và|rồi)\s+)/i;
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

export interface AmountCellEvaluation {
  amount: number;
  score: number; // 100: có k/tr/triệu/tỷ/củ/chai/lít; 95: có đ/đồng/vnd; 90: số format 155.000; 70: số nguyên >= 1000; 40: số nguyên 101-999; 10: số nguyên <= 100
  raw: string;
}

export function evaluatePartAmountCell(raw: string): AmountCellEvaluation | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;

  // 1. Nếu ô chứa chữ cái tiếng Việt/Latin KHÔNG PHẢI đơn vị tiền tệ (ví dụ "Mua 2 cái áo", "2 bát phở"),
  // thì đây là MÔ TẢ (description), TUYỆT ĐỐI KHÔNG coi là ô số tiền!
  const nonCurrencyLetters = t
    .replace(/^[\+\-:\u2013\u2014\s]+/, '')
    .replace(/[\d.,\s]/g, '')
    .replace(/^(?:khoảng|tầm|hết|mất)\s+/iu, '')
    .replace(/(?:đồng|dong|đ|d|vnd|₫|k|nghìn|nghin|ngàn|ngan|triệu|trieu|tr|m|củ|cu|chai|lít|lit|tỷ|ty)$/iu, '')
    .trim();

  if (/[a-zA-Z\p{L}]/u.test(nonCurrencyLetters)) {
    return null;
  }

  // 2. Định dạng có hậu tố tiền tệ rõ ràng:
  // k, nghìn, ngàn
  const mK = t.match(/^[\+\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?:\s*(?:đ|đồng|dong|vnd|₫))?$/iu);
  if (mK) {
    const val = Math.min(Math.round(parseFloat(mK[1].replace(',', '.')) * 1000), MAX_SAFE_AMOUNT);
    return { amount: val, score: 100, raw: t };
  }

  // tr, triệu, m, củ, chai
  const mTr = t.match(/^[\+\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|m|củ|cu|chai)(?:\s*(?:đ|đồng|dong|vnd|₫))?$/iu);
  if (mTr) {
    const val = Math.min(Math.round(parseFloat(mTr[1].replace(',', '.')) * 1000000), MAX_SAFE_AMOUNT);
    return { amount: val, score: 100, raw: t };
  }

  // lít (100k)
  const mLit = t.match(/^[\+\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:lít|lit)(?:\s*(?:đ|đồng|dong|vnd|₫))?$/iu);
  if (mLit) {
    const val = Math.min(Math.round(parseFloat(mLit[1].replace(',', '.')) * 100000), MAX_SAFE_AMOUNT);
    return { amount: val, score: 100, raw: t };
  }

  // tỷ
  const mTy = t.match(/^[\+\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty)(?:\s*(?:đ|đồng|dong|vnd|₫))?$/iu);
  if (mTy) {
    const val = Math.min(Math.round(parseFloat(mTy[1].replace(',', '.')) * 1000000000), MAX_SAFE_AMOUNT);
    return { amount: val, score: 100, raw: t };
  }

  // Có đơn vị đồng, đ, vnd rõ ràng (ví dụ 20000đ, 20.000 đ, 2đ)
  const mDong = t.match(/^[\+\-]?\s*(\d[\d.,\s]*)\s*(?:đồng|dong|đ|vnd|₫)$/iu);
  if (mDong) {
    const cleanDigits = mDong[1].replace(/[.,\s]/g, '');
    const num = parseInt(cleanDigits, 10);
    if (!isNaN(num) && num > 0) {
      return { amount: Math.min(num, MAX_SAFE_AMOUNT), score: 95, raw: t };
    }
  }

  // 3. Định dạng số kiểu Việt có dấu chấm/phẩy/khoảng trắng ngăn cách hàng ngàn: 155.000, 155,000, 155 000
  const mFmt = t.match(/^[\+\-]?\s*(\d{1,3}(?:[.,\s]\d{3})+)(?:\s*(?:đồng|dong|đ|vnd|₫))?$/iu);
  if (mFmt) {
    const cleanDigits = mFmt[1].replace(/[.,\s]/g, '');
    const num = parseInt(cleanDigits, 10);
    if (!isNaN(num) && num > 0) {
      return { amount: Math.min(num, MAX_SAFE_AMOUNT), score: 90, raw: t };
    }
  }

  // 4. Số nguyên thuần túy (chỉ chứa các chữ số từ 1 đến 12 chữ số)
  const mPure = t.match(/^[\+\-]?\s*(\d{1,12})$/);
  if (mPure) {
    const num = parseInt(mPure[1], 10);
    if (!isNaN(num) && num > 0) {
      // Số lớn >= 1000: khả năng cao là số tiền (ví dụ 40000, 25000, 1000) -> score 70
      // Số vừa 101 - 999 -> score 40
      // Số nhỏ <= 100 (như 1, 2, 3...): Rất có thể là Số Lượng (Quantity) hoặc Số Thứ Tự (STT)! -> score 10
      let score = 10;
      if (num >= 1000) score = 70;
      else if (num > 100) score = 40;
      return { amount: Math.min(num, MAX_SAFE_AMOUNT), score, raw: t };
    }
  }

  return null;
}

export function parsePartAmountCell(raw: string): number | null {
  const evalCell = evaluatePartAmountCell(raw);
  if (!evalCell) return null;
  // Nếu là số nguyên trần <= 100 không có đơn vị rõ ràng (score <= 10), không coi là số tiền độc lập
  if (evalCell.score <= 10) return null;
  return evalCell.amount;
}

export interface DateAmountLineResult {
  date: string;
  amount: number;
  description: string;
  explicitType: 'income' | 'expense' | null;
}

/**
 * Bóc tách theo cấu trúc cố định "Ngày ở đầu — Mô tả ở giữa — Số tiền ở cuối".
 * Thứ tự ưu tiên:
 *   1. Ngày tháng ở ĐẦU dòng (DD/MM/YYYY hoặc DD/MM)
 *   2. Số tiền ở CUỐI dòng (50.000 | 1.005.000 | 50k | 2tr | 1,5tr | 20000đ | 40000)
 *   3. Toàn bộ phần nằm giữa là Mô tả (giữ nguyên số bên trong như "lần 2", "2 cái áo")
 * Trả về null nếu dòng không khớp cấu trúc → để các bộ parse khác xử lý.
 */
export function parseDateAmountLine(
  line: string,
  ctx: { contextYear: number | null }
): DateAmountLineResult | null {
  const t = line.replace(/[\u00A0\u2007\u202F]/g, ' ').trim();

  // Bước 1: Ngày ở đầu dòng
  const dateM = t.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?(?:\s*[-–—:,;|]\s*|\s+)/);
  if (!dateM) return null;
  const day = parseInt(dateM[1], 10);
  const month = parseInt(dateM[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const year = dateM[3] ? parseInt(dateM[3], 10) : (ctx.contextYear || new Date().getFullYear());
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const rest = t.slice(dateM[0].length);

  // Bước 2: Số tiền ở cuối dòng (bắt buộc có khoảng trắng / dấu phân cách đứng trước)
  const amtM = rest.match(
    /(?:^|[\s\-–—:,;|]+)\+?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|m|củ|tỷ|ty|đ|đồng|dong|vnd|₫)?\s*$/iu
  );
  if (!amtM) return null;
  const numStr = amtM[1];
  const unit = (amtM[2] || '').toLowerCase();
  const hasThousandSep = /^\d{1,3}(?:[.,]\d{3})+$/.test(numStr);

  let amount: number;
  if (['k', 'nghìn', 'nghin', 'ngàn', 'ngan'].includes(unit)) {
    amount = parseViNum(numStr) * 1_000;
  } else if (['tr', 'triệu', 'trieu', 'm', 'củ'].includes(unit)) {
    amount = parseViNum(numStr) * 1_000_000;
  } else if (['tỷ', 'ty'].includes(unit)) {
    amount = parseViNum(numStr) * 1_000_000_000;
  } else {
    // Không có hậu tố hệ số: chỉ chấp nhận số nguyên (bỏ dấu . , phân cách hàng nghìn)
    if (!hasThousandSep && !/^\d+$/.test(numStr)) return null;
    amount = parseInt(numStr.replace(/[.,]/g, ''), 10);
    // Số trần nhỏ < 1.000 không kèm đơn vị (vd "lần 2") là số lượng/thứ tự, không phải tiền
    if (!unit && !hasThousandSep && amount < 1000) return null;
  }
  amount = Math.round(amount);
  if (!isFinite(amount) || amount <= 0) return null;
  amount = Math.min(amount, MAX_SAFE_AMOUNT);

  // Bước 3: Phần giữa là mô tả
  let middle = rest.slice(0, rest.length - amtM[0].length).trim();

  // Cột loại Thu/Chi (nếu có) ở đầu hoặc cuối phần giữa, vd "Chi  Ăn sáng" / "Ăn sáng, chi"
  let explicitType: 'income' | 'expense' | null = null;
  const typeTok = '(thu nhập|thu|chi tiêu|chi|income|expense|tiền vào|tiền ra)';
  const lead = middle.match(new RegExp(`^${typeTok}(?:\\s*[,;|\\t]\\s*|\\s{2,}|\\s+[-–—]\\s+)`, 'iu'));
  if (lead) {
    explicitType = parseExplicitTypeCell(lead[1]);
    middle = middle.slice(lead[0].length);
  } else {
    const trail = middle.match(new RegExp(`(?:\\s*[,;|\\t]\\s*|\\s{2,}|\\s+[-–—]\\s+)${typeTok}$`, 'iu'));
    if (trail) {
      explicitType = parseExplicitTypeCell(trail[1]);
      middle = middle.slice(0, middle.length - trail[0].length);
    }
  }

  const description = cleanDescriptionText(middle.replace(/\s+/g, ' '));
  return { date, amount, description, explicitType };
}

/**
 * Tiền xử lý: Tự động ghép nối các dòng bị ngắt dòng do copy từ bảng hẹp hoặc word wrap
 * Ví dụ:
 *   Dòng 1: "19/08/2026   Mua 2 cái áo mới + móc chìa"
 *   Dòng 2: "khóa   155.000"
 * Sẽ được tự động nối lại thành:
 *   "19/08/2026   Mua 2 cái áo mới + móc chìa khóa   155.000"
 */
export function stitchBrokenLines(rawLines: string[]): string[] {
  const stitched: string[] = [];

  function startsWithDateOrDirective(line: string): boolean {
    const t = line.trim();
    if (detectHeaderDirective(t)) return true;
    if (/^(?:(?:ngày|hôm|vào)\s+)?(?:\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{4})?|\d{4}-\d{2}-\d{2})\b/i.test(t)) return true;
    if (/^(?:hôm\s*(?:nay|qua|kia)|bữa\s*(?:nay|qua|kia)|nay|hnay|hqua|tối\s*qua|sáng\s*(?:nay|qua)|thứ\s+[2-7]|chủ\s*nhật|cn)\b/i.test(t)) return true;
    return false;
  }

  function hasValidAmount(line: string): boolean {
    const { amount } = parseAmount(line);
    if (amount !== null && amount > 0) return true;
    const parts = line.split(/[\t;,]|\s+[-–—]\s+|\s{2,}/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      const evalCell = evaluatePartAmountCell(p);
      if (evalCell && evalCell.amount > 0 && evalCell.score >= 40) return true;
    }
    return false;
  }

  for (let i = 0; i < rawLines.length; i++) {
    const current = rawLines[i].trim();
    if (!current) continue;

    if (stitched.length > 0 && !startsWithDateOrDirective(current)) {
      const prevIdx = stitched.length - 1;
      const prevLine = stitched[prevIdx];
      const prevHasAmount = hasValidAmount(prevLine);
      const currHasAmount = hasValidAmount(current);

      // Trường hợp 1: Dòng trước có ngày/nội dung nhưng CHƯA có số tiền, dòng hiện tại CÓ số tiền
      if (!prevHasAmount && currHasAmount) {
        stitched[prevIdx] = `${prevLine} ${current}`;
        continue;
      }

      // Trường hợp 2: Dòng trước kết thúc bằng dấu nối dở dang (+, -, /, và, với...)
      if (/[\+\-\/&]\s*$/i.test(prevLine) || /\s+(?:và|với|cùng|hoặc|\+)\s*$/i.test(prevLine)) {
        stitched[prevIdx] = `${prevLine} ${current}`;
        continue;
      }
    }

    stitched.push(current);
  }

  return stitched;
}

/**
 * Bộ đọc hàng loạt thông minh hỗ trợ:
 * - File CSV / TSV / Bảng copy từ Excel
 * - Danh sách văn bản dán trực tiếp theo câu tự nhiên
 * - Định dạng phân cách 'Ngày - Tên chi tiêu - Số tiền'
 * - Chỉ thị ngữ cảnh: "Đây là dữ liệu chi tháng 8", "Dữ liệu thu tháng 8/2026", "Khoản chi:"
 */
export function parseBatchTransactions(content: string, defaultDate: string = localTodayISO()): BatchParseResult {
  const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lines = stitchBrokenLines(rawLines);
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

    let date: string | null = null;
    let amount: number | null = null;
    let explicitType: 'income' | 'expense' | null = null;
    let description = '';

    // 2a. Ưu tiên cấu trúc "Ngày (đầu) — Mô tả (giữa) — Số tiền (cuối)"
    const fixed = parseDateAmountLine(cleanLine, { contextYear });
    if (fixed) {
      date = fixed.date;
      amount = fixed.amount;
      description = fixed.description;
      explicitType = fixed.explicitType;
    }

    // 2b. Kiểm tra nếu có phân cách cột (tab, phẩy, chấm phẩy, hoặc ' - ')
    let parts: string[] = [];
    if (fixed) {
      // Đã bóc tách xong, bỏ qua phân tách cột
    } else if (cleanLine.includes('\t')) {
      parts = cleanLine.split('\t').map(s => s.trim()).filter(Boolean);
    } else if (cleanLine.includes(';') && !cleanLine.includes(',')) {
      parts = cleanLine.split(';').map(s => s.trim()).filter(Boolean);
    } else if (cleanLine.includes(',') && !/^\d+,\d+$/.test(cleanLine)) {
      parts = cleanLine.split(',').map(s => s.trim()).filter(Boolean);
    } else if (/\s+[-–—]\s+/.test(cleanLine)) {
      parts = cleanLine.split(/\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    } else if (/\s{2,}/.test(cleanLine)) {
      parts = cleanLine.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    }

    if (parts.length >= 2) {
      let dateCandidate: string | null = null;
      let typeCandidate: 'income' | 'expense' | null = null;
      const amountCandidates: { index: number; evaluation: AmountCellEvaluation }[] = [];
      const otherIndices: number[] = [];

      for (let idx = 0; idx < parts.length; idx++) {
        const p = parts[idx];

        // 1. Kiểm tra ngày
        if (!dateCandidate) {
          const d = parseExplicitDateWithCtx(p, { contextMonth, contextYear });
          if (d) {
            dateCandidate = d;
            continue;
          }
        }

        // 2. Kiểm tra loại thu/chi
        if (!typeCandidate) {
          const t = parseExplicitTypeCell(p);
          if (t) {
            typeCandidate = t;
            continue;
          }
        }

        // 3. Đánh giá số tiền
        const evalAmt = evaluatePartAmountCell(p);
        if (evalAmt && evalAmt.amount > 0) {
          amountCandidates.push({ index: idx, evaluation: evalAmt });
          continue;
        }

        otherIndices.push(idx);
      }

      // Chọn ứng viên số tiền tốt nhất:
      // Sắp xếp theo score giảm dần, sau đó theo giá trị amount giảm dần
      if (amountCandidates.length > 0) {
        amountCandidates.sort((a, b) => {
          if (b.evaluation.score !== a.evaluation.score) {
            return b.evaluation.score - a.evaluation.score;
          }
          return b.evaluation.amount - a.evaluation.amount;
        });

        // Ứng viên số tiền số 1 được chọn
        const best = amountCandidates[0];
        amount = best.evaluation.amount;

        // Các ô số còn lại (ví dụ số lượng, STT) bị coi là mô tả, đưa vào otherIndices
        for (let i = 1; i < amountCandidates.length; i++) {
          otherIndices.push(amountCandidates[i].index);
        }
      }

      // Giữ đúng thứ tự ban đầu của các cột mô tả
      otherIndices.sort((a, b) => a - b);
      const descParts = otherIndices.map(i => parts[i]);
      description = cleanDescriptionText(descParts.join(' - '));
      if (dateCandidate) date = dateCandidate;
      if (typeCandidate) explicitType = typeCandidate;
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
