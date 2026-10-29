/**
 * dateParser.ts
 * Nhận diện và phân tích ngày tháng từ văn bản tiếng Việt.
 *
 * Kết quả trả về:
 *  - date       : ngày đã được xác định
 *  - cleanText  : mô tả sau khi đã loại bỏ phần ngày tháng
 */

export interface KetQuaParseDateInterface {
  date: Date;
  cleanText: string;
  hasExplicitDate?: boolean;
}

/**
 * Nhận diện ngày tháng trong mô tả, theo thứ tự ưu tiên:
 *  1. Ngày cụ thể trong mô tả: dd/MM/YYYY, dd-MM-YYYY, dd/MM, dd-MM (kèm tiền tố hôm, ngày...)
 *  2. Từ tương đối: "hôm qua", "hôm kia", "tối qua", từ lóng "hqua", "nay", "hnay"...
 *  3. Thứ trong tuần: "thứ hai", "thứ ba", ..., "chủ nhật"
 *  4. Mặc định: hôm nay (ngày nhập liệu)
 */
export function parseDateFromText(text: string, homNay: Date = new Date()): KetQuaParseDateInterface {
  let conLai = text;

  // ── 1. Ngày đầy đủ: dd/MM/YYYY hoặc dd-MM-YYYY ───────────────────────────
  const ngayDayDuRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/iu;
  const khopNgayDayDu = conLai.match(ngayDayDuRx);
  if (khopNgayDayDu) {
    const ngay  = parseInt(khopNgayDayDu[1], 10);
    const thang = parseInt(khopNgayDayDu[2], 10) - 1; // tháng trong JS bắt đầu từ 0
    const nam   = parseInt(khopNgayDayDu[3], 10);
    const date  = new Date(nam, thang, ngay);
    if (ngayHopLe(date, ngay, thang, nam)) {
      const clean = conLai.replace(khopNgayDayDu[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date,
        cleanText: clean.replace(/^[\s,;:\-]+/, '').replace(/[\s,;:\-]+$/, '').trim(),
        hasExplicitDate: true
      };
    }
  }

  // ── 2. Ngày với chữ "tháng" hoặc "thg": "20 tháng 10", "20 thg 10", "hôm 20 tháng 10" ──────
  const thangDateRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})\s*(?:tháng|thg)\s*(\d{1,2})(?:\s*(?:năm|\/|-)\s*(\d{4}))?\b/iu;
  const khopThang = conLai.match(thangDateRx);
  if (khopThang) {
    const ngay = parseInt(khopThang[1], 10);
    const thang = parseInt(khopThang[2], 10) - 1;
    let nam = khopThang[3] ? parseInt(khopThang[3], 10) : homNay.getFullYear();
    let date = new Date(nam, thang, ngay);
    if (!khopThang[3]) {
      const ngayMai = new Date(homNay);
      ngayMai.setDate(ngayMai.getDate() + 1);
      if (date > ngayMai) date = new Date(nam - 1, thang, ngay);
    }
    if (ngayHopLe(date, ngay, date.getMonth(), date.getFullYear())) {
      const clean = conLai.replace(khopThang[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date,
        cleanText: clean.replace(/^[\s,;:\-]+/, '').replace(/[\s,;:\-]+$/, '').trim(),
        hasExplicitDate: true
      };
    }
  }

  // ── 3. Ngày ngắn: dd/MM hoặc dd-MM (giả định năm hiện tại): "hôm 20-10", "ngày 20-10", "20/10" ──
  const ngayNganRx = /(?:(?:vào|hôm|ngày)\s+)?\b(\d{1,2})[\/\-](\d{1,2})\b/iu;
  const khopNgayNgan = conLai.match(ngayNganRx);
  if (khopNgayNgan) {
    const ngay  = parseInt(khopNgayNgan[1], 10);
    const thang = parseInt(khopNgayNgan[2], 10) - 1;
    if (ngay >= 1 && ngay <= 31 && thang >= 0 && thang <= 11) {
      let nam     = homNay.getFullYear();
      let date    = new Date(nam, thang, ngay);
      // Nếu ngày đó nằm trong tương lai → dùng năm trước
      const ngayMai = new Date(homNay);
      ngayMai.setDate(ngayMai.getDate() + 1);
      if (date > ngayMai) {
        date = new Date(nam - 1, thang, ngay);
      }
      if (ngayHopLe(date, ngay, date.getMonth(), date.getFullYear())) {
        const clean = conLai.replace(khopNgayNgan[0], ' ').replace(/\s{2,}/g, ' ').trim();
        return {
          date,
          cleanText: clean.replace(/^[\s,;:\-]+/, '').replace(/[\s,;:\-]+$/, '').trim(),
          hasExplicitDate: true
        };
      }
    }
  }

  // ── 4. Từ tương đối (hôm qua, hôm kia, từ lóng tiếng Việt) ───────────────
  const tuTuongDoi: Array<{ pattern: RegExp; soNgayTruoc: number }> = [
    { pattern: /(?:(?:vào|hôm|bữa)\s+)?\b(hôm kia|bữa kia|bữa hôm kia|hkia|h\s*kia)\b/iu,                                                         soNgayTruoc: -2 },
    { pattern: /(?:(?:vào|hôm|bữa)\s+)?\b(hôm qua|tối qua|sáng qua|chiều qua|trưa qua|đêm qua|hqua|h\s*qua|hq|tqua|t\s*qua|squá|s\s*qua|bữa qua)\b/iu, soNgayTruoc: -1 },
    { pattern: /\b(3\s*ngày\s*trước|ba\s*ngày\s*trước)\b/iu,                                                                                       soNgayTruoc: -3 },
    { pattern: /(?:(?:vào|hôm|bữa)\s+)?\b(hôm nay|sáng nay|tối nay|chiều nay|trưa nay|nay|hnay|h\s*nay|bữa nay)\b/iu,                             soNgayTruoc:  0 },
  ];

  for (const { pattern, soNgayTruoc } of tuTuongDoi) {
    const m = conLai.match(pattern);
    if (m) {
      const clean = conLai.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date: themNgay(homNay, soNgayTruoc),
        cleanText: clean.replace(/^[\s,;:\-]+/, '').replace(/[\s,;:\-]+$/, '').trim(),
        hasExplicitDate: true
      };
    }
  }

  // ── 5. Thứ trong tuần (lấy ngày gần nhất đã qua) ─────────────────────────
  const banDoThu: Record<string, number> = {
    'thứ hai': 1, 'thứ 2': 1,
    'thứ ba':  2, 'thứ 3': 2,
    'thứ tư':  3, 'thứ 4': 3,
    'thứ năm': 4, 'thứ 5': 4,
    'thứ sáu': 5, 'thứ 6': 5,
    'thứ bảy': 6, 'thứ 7': 6,
    'chủ nhật': 0, 'cn': 0
  };

  for (const [nhan, thuTu] of Object.entries(banDoThu)) {
    const rx = new RegExp(`(?:(?:vào|hôm)\\s+)?\\b${nhan}\\b`, 'iu');
    const m = conLai.match(rx);
    if (m) {
      const clean = conLai.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim();
      return {
        date: thuGanNhat(homNay, thuTu),
        cleanText: clean.replace(/^[\s,;:\-]+/, '').replace(/[\s,;:\-]+$/, '').trim(),
        hasExplicitDate: true
      };
    }
  }

  // ── 6. Mặc định: hôm nay ─────────────────────────────────────────────────
  return { date: boGioPhut(homNay), cleanText: conLai.trim(), hasExplicitDate: false };
}

// ── Hàm hỗ trợ ────────────────────────────────────────────────────────────

// Cộng/trừ số ngày vào một ngày
function themNgay(goc: Date, soNgay: number): Date {
  const d = new Date(goc);
  d.setDate(d.getDate() + soNgay);
  return boGioPhut(d);
}

// Xóa giờ phút giây để chỉ giữ lại ngày
function boGioPhut(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Kiểm tra ngày có hợp lệ không
function ngayHopLe(d: Date, ngay: number, thang: number, nam: number): boolean {
  return (
    !isNaN(d.getTime()) &&
    d.getDate()     === ngay  &&
    d.getMonth()    === thang &&
    d.getFullYear() === nam
  );
}

/** Tìm ngày gần nhất (đã qua hoặc hôm nay) có thứ = targetDow (0=CN … 6=T7) */
function thuGanNhat(homNay: Date, targetDow: number): Date {
  const d    = boGioPhut(homNay);
  const diff = (d.getDay() - targetDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Định dạng Date thành chuỗi YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
