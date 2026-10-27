import { Router, Response } from 'express';
import { db } from '../lib/db';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

export interface CreditCardRow {
  id: number;
  user_id: number;
  card_name: string;
  bank_name: string;
  balance: number;
  paid_amount: number;
  credit_limit: number;
  due_date: string;
  statement_day: number;
  status: 'pending' | 'settled';
  note: string;
  created_at: string;
}

function getDaysRemaining(dueDateStr: string): number {
  if (!dueDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ── GET /api/credit-cards ──────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const rows = await db.prepare(
    `SELECT * FROM credit_cards WHERE user_id = ? ORDER BY status ASC, due_date ASC, id DESC`
  ).all<CreditCardRow>(userId);

  let totalDebtRemaining = 0;
  let totalPaid = 0;
  let settledCount = 0;
  let dueSoonCount = 0; // <= 7 ngày
  let overdueCount = 0; // < 0 ngày

  const list = rows.map(r => {
    const balance = Number(r.balance || 0);
    const paid = Number(r.paid_amount || 0);
    const remaining = Math.max(0, balance - paid);
    const credit_limit = Number(r.credit_limit || 0);
    const daysRemaining = getDaysRemaining(r.due_date);

    if (r.status === 'pending' && remaining > 0) {
      totalDebtRemaining += remaining;
      totalPaid += paid;
      if (daysRemaining < 0) {
        overdueCount++;
      } else if (daysRemaining <= 7) {
        dueSoonCount++;
      }
    } else {
      settledCount++;
      totalPaid += paid;
    }

    return {
      ...r,
      balance,
      paid_amount: paid,
      remaining,
      credit_limit,
      daysRemaining
    };
  });

  res.json({
    data: list,
    summary: {
      totalDebtRemaining,
      totalPaid,
      settledCount,
      pendingCount: rows.length - settledCount,
      dueSoonCount,
      overdueCount
    }
  });
});

// ── POST /api/credit-cards ─────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { card_name, bank_name, balance, credit_limit, due_date, statement_day, note } = req.body as {
    card_name: string;
    bank_name?: string;
    balance: number;
    credit_limit?: number;
    due_date: string;
    statement_day?: number;
    note?: string;
  };

  if (!card_name || !card_name.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập tên thẻ tín dụng' });
  }
  if (typeof balance !== 'number' || balance <= 0) {
    return res.status(400).json({ error: 'Dư nợ cần thanh toán phải lớn hơn 0' });
  }
  if (!due_date || !due_date.trim()) {
    return res.status(400).json({ error: 'Vui lòng chọn ngày đến hạn thanh toán' });
  }

  const result = await db.prepare(
    `INSERT INTO credit_cards (user_id, card_name, bank_name, balance, paid_amount, credit_limit, due_date, statement_day, status, note)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'pending', ?)`
  ).run(
    userId,
    card_name.trim(),
    (bank_name || '').trim(),
    balance,
    Number(credit_limit || 0),
    due_date.trim(),
    Number(statement_day || 0),
    (note || '').trim()
  );

  const created = await db.prepare('SELECT * FROM credit_cards WHERE id = ?').get<CreditCardRow>(result.lastInsertRowid);
  res.status(201).json(created);
});

// ── PUT /api/credit-cards/:id ──────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { card_name, bank_name, balance, paid_amount, credit_limit, due_date, statement_day, status, note } = req.body as Partial<CreditCardRow>;

  const existing = await db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get<CreditCardRow>(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy thẻ tín dụng' });
  }

  const newBalance = typeof balance === 'number' && balance > 0 ? balance : Number(existing.balance);
  const newPaid = typeof paid_amount === 'number' && paid_amount >= 0 ? paid_amount : Number(existing.paid_amount);
  const newStatus = status ? status : (newPaid >= newBalance ? 'settled' : 'pending');

  await db.prepare(
    `UPDATE credit_cards 
     SET card_name = ?, bank_name = ?, balance = ?, paid_amount = ?, credit_limit = ?, due_date = ?, statement_day = ?, status = ?, note = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    card_name ? card_name.trim() : existing.card_name,
    bank_name !== undefined ? bank_name.trim() : existing.bank_name,
    newBalance,
    newPaid,
    credit_limit !== undefined ? Number(credit_limit) : existing.credit_limit,
    due_date ? due_date.trim() : existing.due_date,
    statement_day !== undefined ? Number(statement_day) : existing.statement_day,
    newStatus,
    note !== undefined ? note.trim() : existing.note,
    id,
    userId
  );

  const updated = await db.prepare('SELECT * FROM credit_cards WHERE id = ?').get<CreditCardRow>(id);
  res.json(updated);
});

// ── POST /api/credit-cards/:id/pay ─────────────────────────────────────────
router.post('/:id/pay', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { amount, payment_date, note, create_expense } = req.body as {
    amount: number;
    payment_date?: string;
    note?: string;
    create_expense?: boolean;
  };

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Số tiền thanh toán phải lớn hơn 0' });
  }

  const existing = await db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get<CreditCardRow>(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy thẻ tín dụng' });
  }

  const payDate = payment_date || new Date().toISOString().split('T')[0];
  const newPaid = Number(existing.paid_amount || 0) + amount;
  const newStatus = newPaid >= Number(existing.balance) ? 'settled' : 'pending';

  // Cập nhật thẻ
  await db.prepare(
    `UPDATE credit_cards SET paid_amount = ?, status = ? WHERE id = ? AND user_id = ?`
  ).run(newPaid, newStatus, id, userId);

  // Ghi nhật ký thanh toán
  await db.prepare(
    `INSERT INTO credit_card_payments (card_id, user_id, amount, payment_date, note)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, amount, payDate, (note || '').trim());

  // Nếu người dùng chọn tạo giao dịch chi tiêu tương ứng
  if (create_expense) {
    await db.prepare(
      `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
       VALUES (?, ?, 'expense', ?, ?, 'Thanh toán thẻ tín dụng', ?)`
    ).run(
      userId,
      payDate,
      amount,
      `Thanh toán nợ thẻ ${existing.card_name}`,
      note ? `Thanh toán thẻ tín dụng: ${note}` : 'Thanh toán dư nợ thẻ tín dụng'
    );
  }

  const updated = await db.prepare('SELECT * FROM credit_cards WHERE id = ?').get<CreditCardRow>(id);
  res.json({
    card: updated,
    message: newStatus === 'settled' ? 'Đã hoàn tất thanh toán toàn bộ dư nợ thẻ!' : 'Đã ghi nhận thanh toán một phần!'
  });
});

// ── DELETE /api/credit-cards/:id ───────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  await db.prepare('DELETE FROM credit_card_payments WHERE card_id = ? AND user_id = ?').run(id, userId);
  await db.prepare('DELETE FROM credit_cards WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ success: true });
});

export default router;
