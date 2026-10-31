import { Router, Response } from 'express';
import { db } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

export interface RecurringTransaction {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  note: string;
  day_of_month: number;
  is_active: number;
  last_generated_month: string;
  created_at: string;
}

const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Quét và tự động sinh giao dịch định kỳ đến hạn cho người dùng
 */
export async function processRecurringForUser(userId: number): Promise<number> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const rules = await db.prepare(
    'SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1'
  ).all<RecurringTransaction>(userId);

  let generatedCount = 0;

  for (const rule of rules) {
    const lastDayOfCurMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    // Lỗi #16: Dùng actualDay đã kẹp theo số ngày trong tháng thực tế
    const actualDay = Math.min(rule.day_of_month, lastDayOfCurMonth);

    // Nếu tháng hiện tại chưa sinh và hôm nay >= ngày đến hạn thực tế
    if (rule.last_generated_month !== currentMonthStr && currentDay >= actualDay) {
      // Lỗi #4: Atomic claim trước để chống sinh trùng do race condition
      const claim = await db.prepare(
        'UPDATE recurring_transactions SET last_generated_month = ? WHERE id = ? AND (last_generated_month IS NULL OR last_generated_month != ?)'
      ).run(currentMonthStr, rule.id, currentMonthStr);

      if (claim.changes > 0) {
        const txDate = `${currentMonthStr}-${String(actualDay).padStart(2, '0')}`;
        const note = rule.note ? `${rule.note} [Định kỳ hàng tháng]` : '[Định kỳ hàng tháng]';

        await db.prepare(
          `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(userId, txDate, rule.type, rule.amount, rule.description, rule.category, note);

        generatedCount++;
      }
    }
  }

  return generatedCount;
}

// ── GET /api/recurring ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  await processRecurringForUser(userId);
  const rows = await db.prepare(
    'SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY day_of_month ASC, id DESC'
  ).all<RecurringTransaction>(userId);
  res.json({ data: rows });
});

// ── POST /api/recurring ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, amount, description, category, note, day_of_month } = req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'Vui lòng điền đủ loại, số tiền và mô tả' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Loại giao dịch phải là thu (income) hoặc chi (expense)' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > MAX_AMOUNT) {
    return res.status(400).json({ error: `Số tiền phải là số hợp lệ từ 1 đến ${MAX_AMOUNT.toLocaleString('vi-VN')} ₫` });
  }

  const rawDom = parseInt(day_of_month, 10);
  const dom = Number.isInteger(rawDom) ? Math.max(1, Math.min(31, rawDom)) : new Date().getDate();
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db.prepare(
    `INSERT INTO recurring_transactions (user_id, type, amount, description, category, note, day_of_month, is_active, last_generated_month)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(userId, type, numAmount, description.trim(), category || 'Khác', note || '', dom, currentMonthStr);

  const created = await db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get<RecurringTransaction>(result.lastInsertRowid);
  res.status(201).json(created);
});

// ── PUT /api/recurring/:id ─────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { type, amount, description, category, note, day_of_month, is_active } = req.body;

  const existing = await db.prepare(
    'SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?'
  ).get<RecurringTransaction>(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy khoản lặp lại' });
  }

  if (type !== undefined && type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Loại giao dịch phải là thu (income) hoặc chi (expense)' });
  }

  let finalAmount = existing.amount;
  if (amount !== undefined) {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0 || num > MAX_AMOUNT) {
      return res.status(400).json({ error: `Số tiền phải là số hợp lệ từ 1 đến ${MAX_AMOUNT.toLocaleString('vi-VN')} ₫` });
    }
    finalAmount = num;
  }

  let finalDom = existing.day_of_month;
  if (day_of_month !== undefined) {
    const rawDom = parseInt(day_of_month, 10);
    if (Number.isInteger(rawDom)) {
      finalDom = Math.max(1, Math.min(31, rawDom));
    }
  }

  const updated = {
    type: type ?? existing.type,
    amount: finalAmount,
    description: description !== undefined ? description.trim() : existing.description,
    category: category ?? existing.category,
    note: note ?? existing.note,
    day_of_month: finalDom,
    is_active: is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active
  };

  await db.prepare(
    `UPDATE recurring_transactions
     SET type = ?, amount = ?, description = ?, category = ?, note = ?, day_of_month = ?, is_active = ?
     WHERE id = ? AND user_id = ?`
  ).run(updated.type, updated.amount, updated.description, updated.category, updated.note, updated.day_of_month, updated.is_active, id, userId);

  const result = await db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get<RecurringTransaction>(id);
  res.json(result);
});

// ── DELETE /api/recurring/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  await db.prepare('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
