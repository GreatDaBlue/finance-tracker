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
}

/**
 * Nhận diện ngày tháng trong mô tả, theo thứ tự ưu tiên:
 *  1. Ngày cụ thể trong mô tả: dd/MM/YYYY, dd-MM-YYYY, dd/MM, dd-MM
 *  2. Từ tương đối: "hôm qua", "hôm kia", "tối qua", v.v.
 *  3. Thứ trong tuần: "thứ hai", "thứ ba", ..., "chủ nhật"
 *  4. Mặc định: hôm nay (ngày nhập liệu)
 */
export function parseDateFromText(text: string, homNay: Date = new Date()): KetQuaParseDateInterface {
  let conLai = text;

  // ── 1. Ngày đầy đủ: dd/MM/YYYY hoặc dd-MM-YYYY ───────────────────────────
  const ngayDayDuRx = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const khopNgayDayDu = conLai.match(ngayDayDuRx);
  if (khopNgayDayDu) {
    const ngay  = parseInt(khopNgayDayDu[1], 10);
    const thang = parseInt(khopNgayDayDu[2], 10) - 1; // tháng trong JS bắt đầu từ 0
    const nam   = parseInt(khopNgayDayDu[3], 10);
    const date  = new Date(nam, thang, ngay);
    if (ngayHopLe(date, ngay, thang, nam)) {
      return {
        date,
        cleanText: conLai.replace(khopNgayDayDu[0], '').replace(/\s{2,}/g, ' ').trim()
      };
    }
  }

  // ── 2. Ngày ngắn: dd/MM hoặc dd-MM (giả định năm hiện tại) ──────────────
  const ngayNganRx = /\b(\d{1,2})[\/\-](\d{1,2})\b/;
  const khopNgayNgan = conLai.match(ngayNganRx);
  if (khopNgayNgan) {
    const ngay  = parseInt(khopNgayNgan[1], 10);
    const thang = parseInt(khopNgayNgan[2], 10) - 1;
    let nam     = homNay.getFullYear();
    let date    = new Date(nam, thang, ngay);
    // Nếu ngày đó nằm trong tương lai → dùng năm trước
    const ngayMai = new Date(homNay);
    ngayMai.setDate(ngayMai.getDate() + 1);
    if (date > ngayMai) {
      date = new Date(nam - 1, thang, ngay);
    }
    if (ngayHopLe(date, ngay, date.getMonth(), date.getFullYear())) {
      return {
        date,
        cleanText: conLai.replace(khopNgayNgan[0], '').replace(/\s{2,}/g, ' ').trim()
      };
    }
  }

  // ── 3. Từ tương đối (hôm qua, hôm kia, v.v.) ─────────────────────────────
  const tuTuongDoi: Array<{ pattern: RegExp; soNgayTruoc: number }> = [
    { pattern: /\b(hôm qua|tối qua|sáng qua|chiều qua|trưa qua|đêm qua)\b/i, soNgayTruoc: -1 },
    { pattern: /\b(hôm kia|bữa kia|bữa hôm kia)\b/i,                          soNgayTruoc: -2 },
    { pattern: /\b(3 ngày trước|ba ngày trước)\b/i,                            soNgayTruoc: -3 },
    { pattern: /\b(hôm nay|sáng nay|tối nay|chiều nay|trưa nay)\b/i,          soNgayTruoc:  0 },
  ];

  for (const { pattern, soNgayTruoc } of tuTuongDoi) {
    const m = conLai.match(pattern);
    if (m) {
      return {
        date: themNgay(homNay, soNgayTruoc),
        cleanText: conLai.replace(m[0], '').replace(/\s{2,}/g, ' ').trim()
      };
    }
  }

  // ── 4. Thứ trong tuần (lấy ngày gần nhất đã qua) ─────────────────────────
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
    const rx = new RegExp(`\\b${nhan}\\b`, 'i');
    if (rx.test(conLai)) {
      return {
        date: thuGanNhat(homNay, thuTu),
        cleanText: conLai.replace(rx, '').replace(/\s{2,}/g, ' ').trim()
      };
    }
  }

  // ── 5. Mặc định: hôm nay ─────────────────────────────────────────────────
  return { date: boGioPhut(homNay), cleanText: conLai.trim() };
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
