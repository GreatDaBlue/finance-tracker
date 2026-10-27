import { Router, Response } from 'express';
import { db } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

export interface DebtRow {
  id: number;
  user_id: number;
  type: 'lend' | 'borrow'; // 'lend': Cho vay (Người ta nợ mình) | 'borrow': Đi vay (Mình nợ người ta)
  person: string;
  amount: number;
  paid_amount: number;
  description: string;
  date: string;
  due_date: string;
  status: 'pending' | 'settled';
  created_at: string;
}

// ── GET /api/debts ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const rows = await db.prepare(
    `SELECT * FROM debts WHERE user_id = ? ORDER BY status ASC, date DESC, id DESC`
  ).all<DebtRow>(userId);

  // Tính toán tổng nợ cần thu hồi & tổng nợ phải trả
  let totalLendRemaining = 0;   // Người khác nợ mình (chưa thu hết)
  let totalBorrowRemaining = 0; // Mình nợ người khác (chưa trả hết)
  let settledCount = 0;

  const list = rows.map(r => {
    const amount = Number(r.amount);
    const paid = Number(r.paid_amount || 0);
    const remaining = Math.max(0, amount - paid);

    if (r.status === 'pending') {
      if (r.type === 'lend') {
        totalLendRemaining += remaining;
      } else {
        totalBorrowRemaining += remaining;
      }
    } else {
      settledCount++;
    }

    return {
      ...r,
      amount,
      paid_amount: paid,
      remaining
    };
  });

  res.json({
    data: list,
    summary: {
      totalLendRemaining,
      totalBorrowRemaining,
      settledCount,
      pendingCount: rows.length - settledCount
    }
  });
});

// ── POST /api/debts ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, person, amount, description, date, due_date } = req.body as {
    type: 'lend' | 'borrow';
    person: string;
    amount: number;
    description?: string;
    date?: string;
    due_date?: string;
  };

  if (!type || (type !== 'lend' && type !== 'borrow')) {
    return res.status(400).json({ error: 'Loại nợ phải là "lend" (Cho vay) hoặc "borrow" (Đi vay)' });
  }
  if (!person || !person.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập tên người vay / người cho vay' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const debtDate = date || todayStr;

  const result = await db.prepare(
    `INSERT INTO debts (user_id, type, person, amount, paid_amount, description, date, due_date, status)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'pending')`
  ).run(userId, type, person.trim(), amount, (description || '').trim(), debtDate, (due_date || '').trim());

  const created = await db.prepare('SELECT * FROM debts WHERE id = ?').get<DebtRow>(result.lastInsertRowid);
  res.status(201).json(created);
});

// ── PUT /api/debts/:id ────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { paid_amount, status, description, due_date, person, amount } = req.body as Partial<DebtRow>;

  const existing = await db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get<DebtRow>(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy khoản nợ' });
  }

  const newAmount = typeof amount === 'number' && amount > 0 ? amount : Number(existing.amount);
  const newPaid = typeof paid_amount === 'number' && paid_amount >= 0 ? paid_amount : Number(existing.paid_amount);
  const newStatus = status ? status : (newPaid >= newAmount ? 'settled' : 'pending');

  await db.prepare(
    `UPDATE debts SET person = ?, amount = ?, paid_amount = ?, description = ?, due_date = ?, status = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    person ?? existing.person,
    newAmount,
    newPaid,
    description ?? existing.description,
    due_date ?? existing.due_date,
    newStatus,
    id,
    userId
  );

  const updated = await db.prepare('SELECT * FROM debts WHERE id = ?').get<DebtRow>(id);
  res.json(updated);
});

// ── DELETE /api/debts/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  await db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
