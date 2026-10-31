import * as XLSX from 'xlsx';
import { type Transaction, todayISO } from './api';

/**
 * Phòng chống CSV / Excel formula injection (Lỗi #31)
 */
function safeCell(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

/**
 * Xuất danh sách giao dịch ra file Excel (.xlsx)
 */
export function exportToExcel(transactions: Transaction[], filename = 'Giao_Dich_Thu_Chi'): void {
  if (!transactions || transactions.length === 0) {
    alert('Không có dữ liệu giao dịch nào để xuất.');
    return;
  }

  const rows = transactions.map((t, index) => ({
    'STT': index + 1,
    'Ngày giao dịch': t.date.split('-').reverse().join('/'),
    'Loại giao dịch': t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
    'Số tiền (₫)': t.amount,
    'Danh mục': safeCell(t.category || 'Khác'),
    'Mô tả': safeCell(t.description),
    'Ghi chú': safeCell(t.note || '')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Đặt độ rộng cho các cột để khi mở Excel nhìn đẹp, không bị co rút
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Ngày
    { wch: 14 }, // Loại
    { wch: 18 }, // Số tiền
    { wch: 22 }, // Danh mục
    { wch: 32 }, // Mô tả
    { wch: 25 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoDich');

  const todayStr = todayISO();
  XLSX.writeFile(workbook, `${filename}_${todayStr}.xlsx`);
}

/**
 * Xuất danh sách giao dịch ra file CSV chuẩn UTF-8 (mở được trên mọi phần mềm bảng tính)
 */
export function exportToCSV(transactions: Transaction[], filename = 'Giao_Dich_Thu_Chi'): void {
  if (!transactions || transactions.length === 0) {
    alert('Không có dữ liệu giao dịch nào để xuất.');
    return;
  }

  const headers = ['STT', 'Ngay', 'Loai', 'So_Tien', 'Danh_Muc', 'Mo_Ta', 'Ghi_Chu'];
  const csvRows = [headers.join(',')];

  transactions.forEach((t, index) => {
    const row = [
      index + 1,
      `"${t.date.split('-').reverse().join('/')}"`,
      `"${t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}"`,
      t.amount,
      `"${safeCell(t.category || 'Khác').replace(/"/g, '""')}"`,
      `"${safeCell(t.description || '').replace(/"/g, '""')}"`,
      `"${safeCell(t.note || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  // UTF-8 BOM (\uFEFF) giúp Excel tự động nhận diện tiếng Việt có dấu chuẩn 100%
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const todayStr = todayISO();

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
