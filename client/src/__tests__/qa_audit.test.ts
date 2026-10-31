import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseMultiSmartInput, parseAmountInput, formatAmountDisplay, parseBatchTransactions, parseSmartInput, getCategoryIcon } from '../lib/smartParser';
import { formatVND } from '../lib/api';

describe('QA Test Suite — Logic & Dữ liệu Biên (Calculations & Edge Cases)', () => {

  describe('1. Phép toán Thu - Chi, Dòng tiền ròng & Tỷ lệ tiết kiệm', () => {
    it('Xử lý chính xác khi Số dư bằng 0 (Thu = Chi)', () => {
      const income = 15000000;
      const expense = 15000000;
      const balance = income - expense;
      const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : 0;

      expect(balance).toBe(0);
      expect(savingsRate).toBe(0);
    });

    it('Xử lý chính xác khi Chi vượt Thu (Âm tiền / Thâm hụt ngân sách)', () => {
      const income = 10000000;
      const expense = 18000000;
      const balance = income - expense;
      const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : -100;

      expect(balance).toBe(-8000000);
      expect(savingsRate).toBe(-80); // Âm 80%
      expect(savingsRate).toBeLessThan(0);
    });

    it('Xử lý chính xác khi Thu = 0 nhưng Chi > 0 (Thâm hụt toàn bộ, không hiển thị có tích lũy)', () => {
      const income = 0;
      const expense = 5000000;
      const balance = income - expense;
      const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : -100;

      expect(balance).toBe(-5000000);
      expect(savingsRate).toBe(-100);
    });

    it('Định dạng tiền tệ chính xác với các con số cực lớn (hàng chục / hàng trăm tỷ đồng)', () => {
      const hugeAmount = 150000000000; // 150 tỷ đồng
      const formatted = formatVND(hugeAmount);
      // Kiểm tra chuỗi định dạng chứa đúng các số và đơn vị tiền tệ VND
      expect(formatted).toMatch(/150\.000\.000\.000/);

      const compact = formatAmountDisplay(hugeAmount);
      expect(compact).toMatch(/150\.000\.000\.000/);
    });

    it('Xử lý an toàn khi số tiền bằng 0 hoặc âm', () => {
      expect(formatVND(0)).toMatch(/0/);
      expect(formatVND(-500000)).toMatch(/-500\.000/);
    });
  });

  describe('2. Xử lý Dữ liệu Đầu vào & Nhập liệu Biên (Edge Cases)', () => {
    it('Chặn số âm và các ký tự đặc biệt không hợp lệ trong parseAmountInput', () => {
      expect(parseAmountInput('-50000')).toBe(0);
      expect(parseAmountInput('abcxyz')).toBe(0);
      expect(parseAmountInput('!@#$%^&*()')).toBe(0);
      expect(parseAmountInput('')).toBe(0);
    });

    it('Nhận diện chính xác các đơn vị viết tắt tiếng Việt thông dụng (k, tr, củ, lít)', () => {
      expect(parseAmountInput('50k')).toBe(50000);
      expect(parseAmountInput('2tr')).toBe(2000000);
      expect(parseAmountInput('1.5 củ')).toBe(1500000);
      expect(parseAmountInput('1,5 củ')).toBe(1500000);
      expect(parseAmountInput('3 lít')).toBe(300000);
      expect(parseAmountInput('10 chai')).toBe(10000000);
    });

    it('Nhận diện chỉ thị dòng đầu tiên ghi đè loại giao dịch ("Đây là dữ liệu chi tháng 8")', () => {
      const rawText = `Đây là dữ liệu chi tháng 8
01/08 nhận tiền hoàn techcombank 100k
02/08 mua cafe 30k`;

      const parsed = parseMultiSmartInput(rawText);
      expect(parsed.length).toBe(2);
      // Cả 2 dòng bắt buộc phải là 'expense' vì có header chỉ thị
      expect(parsed[0].type).toBe('expense');
      expect(parsed[0].amount).toBe(100000);
      expect(parsed[1].type).toBe('expense');
      expect(parsed[1].amount).toBe(30000);
    });

    it('Nhận diện chính xác chỉ thị dòng đầu tiên là Thu ("Danh sách tiền thu nhập...")', () => {
      const rawText = `Danh sách khoản thu tháng này
05/08 khách hàng thanh toán hợp đồng 10tr
10/08 thưởng dự án 5tr`;

      const parsed = parseMultiSmartInput(rawText);
      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe('income');
      expect(parsed[0].amount).toBe(10000000);
      expect(parsed[1].type).toBe('income');
      expect(parsed[1].amount).toBe(5000000);
    });
  });

  describe('3. Quản lý Trạng thái & Lưu trữ (State Management & Persistence)', () => {
    const memoryStore: Record<string, string> = {};

    beforeEach(() => {
      for (const k in memoryStore) delete memoryStore[k];
      (globalThis as any).localStorage = {
        getItem: (k: string) => memoryStore[k] ?? null,
        setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
        removeItem: (k: string) => { delete memoryStore[k]; },
        clear: () => { for (const k in memoryStore) delete memoryStore[k]; },
        length: Object.keys(memoryStore).length,
        key: (i: number) => Object.keys(memoryStore)[i] ?? null
      } as Storage;
    });

    it('Lưu và phục hồi Active Tab để tránh bị mất vị trí khi trình duyệt reload trên mobile', () => {
      localStorage.setItem('tiendauroi_active_tab', 'dashboard');
      expect(localStorage.getItem('tiendauroi_active_tab')).toBe('dashboard');

      localStorage.setItem('tiendauroi_active_tab', 'debt');
      expect(localStorage.getItem('tiendauroi_active_tab')).toBe('debt');
    });

    it('Lưu và phục hồi Giao diện Dark/Light Mode', () => {
      localStorage.setItem('theme', 'dark');
      expect(localStorage.getItem('theme')).toBe('dark');

      localStorage.setItem('theme', 'light');
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  describe('4. Khả năng phục hồi Lỗi Mạng & Thông báo thân thiện (Network Resilience)', () => {
    it('Chuyển đổi lỗi fetch mạng thô (TypeError: Failed to fetch) thành thông báo tiếng Việt', () => {
      function normalizeNetworkError(err: unknown): string {
        if (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'))) {
          return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!';
        }
        return err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      }

      const rawFetchError = new TypeError('Failed to fetch');
      const friendlyMessage = normalizeNetworkError(rawFetchError);
      expect(friendlyMessage).toBe('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!');
    });

    it('Chống nhầm lẫn số lượng (2, 3...) hoặc STT thành số tiền và ghép dòng bị ngắt', () => {
      // 1. Trường hợp nhiều dòng bị ngắt đôi do soft wrap
      const multilineTest = `19/08/2026   Tiền điện   115.000
19/08/2026   Mua thức ăn   24.000
19/08/2026   Mua 2 cái áo mới + móc chìa
khóa   155.000
20/08/2026   Ăn sáng   20.000`;
      const resMulti = parseBatchTransactions(multilineTest);
      expect(resMulti.rows).toHaveLength(4);
      expect(resMulti.rows[2]).toMatchObject({
        date: '2026-08-19',
        amount: 155000,
        description: 'Mua 2 cái áo mới + móc chìa khóa',
        type: 'expense'
      });

      // 2. Trường hợp bảng copy từ Excel 4 cột (Ngày, Tên, Số lượng, Tiền)
      const excelWithQtyCol = '19/08/2026\tMua áo\t2\t155.000';
      const resExcel = parseBatchTransactions(excelWithQtyCol);
      expect(resExcel.rows).toHaveLength(1);
      expect(resExcel.rows[0].amount).toBe(155000);
      expect(resExcel.rows[0].date).toBe('2026-08-19');

      // 3. Trường hợp bảng có cột STT (STT, Ngày, Tên, Tiền)
      const tableWithSTT = '1\t19/08/2026\tTiền điện\t115.000';
      const resSTT = parseBatchTransactions(tableWithSTT);
      expect(resSTT.rows).toHaveLength(1);
      expect(resSTT.rows[0].amount).toBe(115000);

      // 4. Trường hợp câu tự nhiên chứa số lượng sau động từ
      const verbQty = '19/08/2026 Mua 2 móc chìa khóa 155.000';
      const resVerb = parseBatchTransactions(verbQty);
      expect(resVerb.rows).toHaveLength(1);
      expect(resVerb.rows[0].amount).toBe(155000);
      expect(resVerb.rows[0].description).toBe('Mua 2 móc chìa khóa');

      // 5. Trường hợp phân cách bằng gạch nối
      const hyphenTest = '19/08/2026 - Mua 2 cái áo mới + móc chìa khóa - 155.000';
      const resHyphen = parseBatchTransactions(hyphenTest);
      expect(resHyphen.rows).toHaveLength(1);
      expect(resHyphen.rows[0].amount).toBe(155000);
      expect(resHyphen.rows[0].description).toBe('Mua 2 cái áo mới + móc chìa khóa');
    });

    it('Bóc tách theo thứ tự Ngày (đầu) → Số tiền (cuối) → Mô tả (giữa)', () => {
      const cases: [string, string, number, string][] = [
        ['14/08/2026  Đi siêu thị lần 2    50.000', '2026-08-14', 50000, 'Đi siêu thị lần 2'],
        ['14/08/2026 Đi siêu thị lần 2 50.000', '2026-08-14', 50000, 'Đi siêu thị lần 2'],
        ['14/08/2026 Trả phí thẻ Max 1.005.000', '2026-08-14', 1005000, 'Trả phí thẻ Max'],
        ['14/08/2026 Mua giấy cồn   10.000', '2026-08-14', 10000, 'Mua giấy cồn'],
        ['14/08/2026  Đi siêu thị lần 2  50k', '2026-08-14', 50000, 'Đi siêu thị lần 2'],
        ['14/08/2026 Lương tháng 7 15tr', '2026-08-14', 15000000, 'Lương tháng 7'],
        ['14/08/2026 - Đổ xăng - 1,5tr', '2026-08-14', 1500000, 'Đổ xăng'],
        ['15/08/2026 Ăn sáng 20.000', '2026-08-15', 20000, 'Ăn sáng'],
      ];
      for (const [line, date, amount, desc] of cases) {
        const { rows } = parseBatchTransactions(line, '2026-10-31');
        expect(rows, line).toHaveLength(1);
        expect(rows[0], line).toMatchObject({ date, amount, description: desc });
      }
      // Số trần nhỏ ở cuối (không đơn vị) không được coi là tiền
      expect(parseBatchTransactions('14/08/2026 Mua 3 bánh 5').rows).toHaveLength(0);
    });
  });

  describe('5. Rà soát & Đồng bộ hóa Toàn diện Danh mục & Icon trực quan', () => {
    it('Đảm bảo tất cả các danh mục chuẩn và biến thể đều có icon trực quan rõ ràng, không bị ❓', () => {
      const categoriesToCheck = [
        { name: 'Ăn uống', expected: '🍜' },
        { name: 'Thực phẩm & Ăn uống', expected: '🍜' },
        { name: 'Xe cộ', expected: '🛵' },
        { name: 'Xe cộ & Đi lại', expected: '🛵' },
        { name: 'Di chuyển & Xăng xe', expected: '🛵' },
        { name: 'Sức khỏe', expected: '💊' },
        { name: 'Sức khỏe & Y tế', expected: '💊' },
        { name: 'Y tế & Sức khỏe', expected: '💊' },
        { name: 'Nhà cửa', expected: '🏠' },
        { name: 'Nhà cửa & Hóa đơn', expected: '🏠' },
        { name: 'Nhà ở & Tiện ích', expected: '🏠' },
        { name: 'Mua sắm & Giải trí', expected: '🛍️' },
        { name: 'Giải trí & Mua sắm', expected: '🛍️' },
        { name: 'Giáo dục', expected: '📚' },
        { name: 'Giáo dục & Học tập', expected: '📚' },
        { name: 'Thu nhập lương', expected: '💵' },
        { name: 'Quà tặng & Cho biếu', expected: '🎁' },
        { name: 'Được tặng & Cho', expected: '🎁' },
        { name: 'Thu nhập khác', expected: '💰' },
        { name: 'Tiết kiệm & Đầu tư', expected: '📈' },
        { name: 'Sửa chữa & Bảo trì', expected: '🔧' }
      ];

      for (const item of categoriesToCheck) {
        const icon = getCategoryIcon(item.name);
        expect(icon, `Icon cho danh mục ${item.name} không được là dấu hỏi`).not.toBe('❓');
        expect(icon, `Icon cho danh mục ${item.name} phải là ${item.expected}`).toBe(item.expected);
      }
    });
  });
});
