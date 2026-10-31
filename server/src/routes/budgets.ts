import { Router, Response } from 'express';
import { db } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { getEquivalentCategories } from '../lib/classifier';

const router = Router();

const MAX_AMOUNT = 1_000_000_000_000;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface BudgetRow {
  id: number;
  user_id: number;
  month: string;
  category: string;
  amount: number;
  created_at: string;
}

// ── GET /api/budgets?month=YYYY-MM ─────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let month = (req.query.month as string) || currentMonth;
  if (!MONTH_REGEX.test(month)) {
    month = currentMonth;
  }

  // Lấy danh sách ngân sách của user trong tháng này
  const budgetRows = await db.prepare(
    'SELECT * FROM budgets WHERE user_id = ? AND month = ? ORDER BY category ASC'
  ).all<BudgetRow>(userId, month);

  // Tính số ngày trong tháng và ngày hiện tại
  const [y, m] = month.split('-').map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const isCurrentMonth = month === currentMonth;
  const currentDay = isCurrentMonth ? Math.min(now.getDate(), totalDays) : totalDays;
  const expectedPaceRatio = currentDay / totalDays;

  const results = [];
  let hasOverpacedAlert = false;

  for (const b of budgetRows) {
    let spent = 0;
    if (!b.category || b.category.trim() === '' || b.category === 'Tất cả') {
      const row = await db.prepare(
        "SELECT SUM(amount) as s FROM transactions WHERE user_id = ? AND type = 'expense' AND date LIKE ?"
      ).get<{ s: string | number }>(userId, `${month}%`);
      spent = Number(row?.s || 0);
    } else {
      const equivs = getEquivalentCategories(b.category);
      const placeholders = equivs.map(() => '?').join(', ');
      const row = await db.prepare(
        `SELECT SUM(amount) as s FROM transactions WHERE user_id = ? AND type = 'expense' AND category IN (${placeholders}) AND date LIKE ?`
      ).get<{ s: string | number }>(userId, ...equivs, `${month}%`);
      spent = Number(row?.s || 0);
    }

    const budgetAmount = Number(b.amount);
    const expectedSpendToDate = Math.round(budgetAmount * expectedPaceRatio);
    const actualRatio = budgetAmount > 0 ? spent / budgetAmount : 0;

    let status: 'GOOD' | 'WARNING' | 'EXCEEDED' = 'GOOD';
    let message = '✅ Đang chi tiêu đúng tiến độ';

    if (spent > budgetAmount) {
      status = 'EXCEEDED';
      message = `🚨 Đã tiêu vượt ngân sách: Đã tiêu ${spent.toLocaleString('vi-VN')}₫ / ${budgetAmount.toLocaleString('vi-VN')}₫ (${Math.round(actualRatio * 100)}%)!`;
      hasOverpacedAlert = true;
    } else if (spent === budgetAmount && budgetAmount > 0) {
      status = 'WARNING';
      message = `⚠️ Đã chạm mức tối đa 100% ngân sách: Đã tiêu ${spent.toLocaleString('vi-VN')}₫ / ${budgetAmount.toLocaleString('vi-VN')}₫!`;
      hasOverpacedAlert = true;
    } else if (isCurrentMonth && spent > expectedSpendToDate) {
      status = 'WARNING';
      const catName = b.category || 'Tổng chi tiêu';
      message = `⚠️ Cảnh báo chi tiêu quá tay: ${catName} đã tiêu ${spent.toLocaleString('vi-VN')}₫ / ${budgetAmount.toLocaleString('vi-VN')}₫ (${Math.round(actualRatio * 100)}%) đến ngày ${currentDay} (vượt mức chi dự kiến an toàn là ${expectedSpendToDate.toLocaleString('vi-VN')}₫).`;
      hasOverpacedAlert = true;
    }

    results.push({
      id: b.id,
      category: b.category,
      amount: budgetAmount,
      spent,
      remaining: Math.max(0, budgetAmount - spent),
      actualRatio: Math.min(1, actualRatio),
      percentage: Math.round(actualRatio * 100),
      expectedSpendToDate,
      status,
      message
    });
  }

  res.json({
    month,
    currentDay,
    totalDays,
    expectedPaceRatio,
    hasOverpacedAlert,
    budgets: results
  });
});

// ── POST /api/budgets (Đặt / Cập nhật ngân sách) ───────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { month, category, amount } = req.body as { month: string; category?: string; amount: number };

  if (!month || !MONTH_REGEX.test(month)) {
    return res.status(400).json({ error: 'Định dạng tháng không hợp lệ (yêu cầu dạng YYYY-MM)' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > MAX_AMOUNT) {
    return res.status(400).json({ error: `Số tiền ngân sách phải từ 1 đến ${MAX_AMOUNT.toLocaleString('vi-VN')} ₫` });
  }

  const cat = (category || '').trim();

  const existing = await db.prepare(
    'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category = ?'
  ).get<{ id: number }>(userId, month, cat);

  if (existing) {
    await db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(numAmount, existing.id);
  } else {
    await db.prepare(
      'INSERT INTO budgets (user_id, month, category, amount) VALUES (?, ?, ?, ?)'
    ).run(userId, month, cat, numAmount);
  }

  res.status(201).json({ success: true });
});

// ── DELETE /api/budgets/:id ───────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  await db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
