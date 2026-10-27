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
    // Nếu tháng hiện tại chưa sinh và hôm nay >= ngày hẹn
    if (rule.last_generated_month !== currentMonthStr && currentDay >= rule.day_of_month) {
      const lastDayOfCurMonth = new Date(currentYear, currentMonthNum, 0).getDate();
      const actualDay = Math.min(rule.day_of_month, lastDayOfCurMonth);
      const txDate = `${currentMonthStr}-${String(actualDay).padStart(2, '0')}`;
      const note = rule.note ? `${rule.note} [Định kỳ hàng tháng]` : '[Định kỳ hàng tháng]';

      await db.prepare(
        `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(userId, txDate, rule.type, rule.amount, rule.description, rule.category, note);

      await db.prepare(
        'UPDATE recurring_transactions SET last_generated_month = ? WHERE id = ?'
      ).run(currentMonthStr, rule.id);

      generatedCount++;
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

  const dom = Math.max(1, Math.min(31, parseInt(day_of_month, 10) || new Date().getDate()));
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const result = await db.prepare(
    `INSERT INTO recurring_transactions (user_id, type, amount, description, category, note, day_of_month, is_active, last_generated_month)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(userId, type, amount, description.trim(), category || 'Khác', note || '', dom, currentMonthStr);

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

  const updated = {
    type: type ?? existing.type,
    amount: amount ?? existing.amount,
    description: description ?? existing.description,
    category: category ?? existing.category,
    note: note ?? existing.note,
    day_of_month: day_of_month !== undefined ? Math.max(1, Math.min(31, Number(day_of_month))) : existing.day_of_month,
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
