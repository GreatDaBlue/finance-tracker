import { Router, Response } from 'express';
import { db } from '../lib/db';
import { classify } from '../lib/classifier';
import { parseDateFromText, formatDate } from '../lib/dateParser';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { processRecurringForUser } from './recurring';

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  user_id: number;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  note: string;
  created_at: string;
}

// ── GET /api/transactions ──────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    await processRecurringForUser(userId);
  } catch (err) {
    console.error('Error processing recurring transactions:', err);
  }
  const {
    type,
    category,
    dateFrom,
    dateTo,
    search,
    minAmount,
    maxAmount,
    limit = '50',
    offset = '0',
    sortBy = 'date',
    sortDir = 'DESC'
  } = req.query as Record<string, string>;

  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (type && (type === 'income' || type === 'expense')) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (dateFrom) {
    conditions.push('date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('date <= ?');
    params.push(dateTo);
  }
  if (search) {
    conditions.push('(description LIKE ? OR note LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (minAmount !== undefined && minAmount !== '') {
    const min = Number(minAmount);
    if (!isNaN(min)) {
      conditions.push('amount >= ?');
      params.push(min);
    }
  }
  if (maxAmount !== undefined && maxAmount !== '') {
    const max = Number(maxAmount);
    if (!isNaN(max)) {
      conditions.push('amount <= ?');
      params.push(max);
    }
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const validSortCols = ['date', 'amount', 'created_at', 'category'];
  const col = validSortCols.includes(sortBy) ? sortBy : 'date';
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  const off = parseInt(offset, 10) || 0;

  const rows = await db.prepare(
    `SELECT * FROM transactions ${where} ORDER BY ${col} ${dir}, id DESC LIMIT ? OFFSET ?`
  ).all<Transaction>(...params, lim, off);

  const countRow = await db.prepare(
    `SELECT COUNT(*) as c FROM transactions ${where}`
  ).get<{ c: string | number }>(...params);

  const total = Number(countRow?.c || 0);

  const normalizedRows = rows.map(r => ({
    ...r,
    amount: Number(r.amount)
  }));

  res.json({ data: normalizedRows, total, limit: lim, offset: off });
});

function sanitizeDescription(desc: string): string {
  return (desc || '')
    .replace(/(?:(?:vào|hôm|ngày)\s+)?\b\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{4})?\b/iu, ' ')
    .replace(/[\s:\-\u2013\u2014]+(?:đồng|dong|đ|vnd)(?![a-zA-Z0-9\p{L}])/giu, '')
    .replace(/(?:^|\s)(?:đồng|dong|đ|vnd)$/giu, '')
    .replace(/^\s*\d+[\.\)\-:]\s*/, '')
    .replace(/[\-\u2013\u2014\s]{2,}/g, ' - ')
    .replace(/^[\s,;:\-\u2013\u2014\•\*]+/, '')
    .replace(/[\s,;:\-\u2013\u2014\•\*]+$/, '')
    .trim();
}

// ── POST /api/transactions ─────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { type, amount, description, category: manualCategory, note, date: manualDate } = req.body as {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category?: string;
    note?: string;
    date?: string;
  };

  if (!type || !amount || !description) {
    return res.status(400).json({ error: 'Vui lòng nhập loại, số tiền và mô tả' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Loại giao dịch phải là income hoặc expense' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
  }

  let resolvedDate: string;
  let cleanDescription = sanitizeDescription(description);

  if (manualDate) {
    resolvedDate = manualDate;
  } else {
    const parsed = parseDateFromText(description, new Date());
    resolvedDate = formatDate(parsed.date);
    cleanDescription = sanitizeDescription(parsed.cleanText || description);
  }

  const category = manualCategory || (await classify(cleanDescription, type));

  const result = await db.prepare(
    `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, resolvedDate, type, amount, cleanDescription, category, note || '');

  const created = await db.prepare('SELECT * FROM transactions WHERE id = ?').get<Transaction>(result.lastInsertRowid);
  if (created) created.amount = Number(created.amount);
  return res.status(201).json(created);
});

// ── POST /api/transactions/batch (Lưu nhiều giao dịch cùng lúc) ───────────
router.post('/batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { transactions } = req.body as {
    transactions: Array<{
      type: 'income' | 'expense';
      amount: number;
      description: string;
      category?: string;
      note?: string;
      date?: string;
    }>;
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'Danh sách giao dịch không hợp lệ' });
  }

  const createdList: Transaction[] = [];

  for (const item of transactions) {
    if (!item.type || !item.amount || !item.description) continue;
    if (typeof item.amount !== 'number' || item.amount <= 0) continue;

    let resolvedDate: string;
    let cleanDescription = sanitizeDescription(item.description);

    if (item.date) {
      resolvedDate = item.date;
    } else {
      const parsed = parseDateFromText(item.description, new Date());
      resolvedDate = formatDate(parsed.date);
      cleanDescription = sanitizeDescription(parsed.cleanText || item.description);
    }

    const category = item.category || (await classify(cleanDescription, item.type));

    const result = await db.prepare(
      `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, resolvedDate, item.type, item.amount, cleanDescription, category, item.note || '');

    const created = await db.prepare('SELECT * FROM transactions WHERE id = ?').get<Transaction>(result.lastInsertRowid);
    if (created) {
      created.amount = Number(created.amount);
      createdList.push(created);
    }
  }

  return res.status(201).json({ data: createdList, count: createdList.length });
});

// ── POST /api/transactions/classify ───────────────────────────────────────
router.post('/classify', async (req: AuthenticatedRequest, res: Response) => {
  const { description, type } = req.body as { description: string; type: 'income' | 'expense' };
  if (!description || !type) {
    return res.status(400).json({ error: 'Cần có description và type' });
  }

  const parsed = parseDateFromText(description, new Date());
  const category = await classify(parsed.cleanText || description, type);

  return res.json({
    category,
    suggestedDate: formatDate(parsed.date),
    cleanDescription: parsed.cleanText
  });
});

// ── PUT /api/transactions/:id ─────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { type, amount, description, category, note, date } = req.body as Partial<Transaction>;

  const existing = await db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get<Transaction>(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giao dịch hoặc bạn không có quyền sửa' });
  }

  const updated = {
    date: date ?? existing.date,
    type: type ?? existing.type,
    amount: amount !== undefined ? Number(amount) : Number(existing.amount),
    description: description !== undefined ? sanitizeDescription(description) : existing.description,
    category: category ?? existing.category,
    note: note ?? existing.note
  };

  await db.prepare(
    `UPDATE transactions SET date=?, type=?, amount=?, description=?, category=?, note=? WHERE id=? AND user_id=?`
  ).run(updated.date, updated.type, updated.amount, updated.description, updated.category, updated.note, id, userId);

  const result = await db.prepare('SELECT * FROM transactions WHERE id = ?').get<Transaction>(id);
  return res.json(result);
});

// ── DELETE /api/transactions/batch ────────────────────────────────────────
router.delete('/batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { ids } = req.body as { ids?: number[] };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Danh sách ID cần xóa không hợp lệ' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM transactions WHERE user_id = ? AND id IN (${placeholders})`;
  const result = await db.prepare(query).run(userId, ...ids);

  return res.json({ success: true, count: result.changes });
});

// ── DELETE /api/transactions/all ──────────────────────────────────────────
router.delete('/all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, type, category, search } = (req.body || {}) as any;

  let sql = 'DELETE FROM transactions WHERE user_id = ?';
  const params: any[] = [userId];

  if (dateFrom) {
    sql += ' AND date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND date <= ?';
    params.push(dateTo);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (description LIKE ? OR note LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const result = await db.prepare(sql).run(...params);
  return res.json({ success: true, deletedCount: result.changes });
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const existing = await db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giao dịch hoặc bạn không có quyền xóa' });
  }
  await db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
  return res.json({ success: true });
});

export default router;
