import { Router, Response } from 'express';
import { db } from '../lib/db';
import { classify } from '../lib/classifier';
import { parseDateFromText, formatDate } from '../lib/dateParser';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

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
// Lấy danh sách giao dịch của riêng người dùng đang đăng nhập
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    type,
    category,
    dateFrom,
    dateTo,
    search,
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

  const where = `WHERE ${conditions.join(' AND ')}`;
  const validSortCols = ['date', 'amount', 'created_at', 'category'];
  const col = validSortCols.includes(sortBy) ? sortBy : 'date';
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  const off = parseInt(offset, 10) || 0;

  const rows = db.prepare(
    `SELECT * FROM transactions ${where} ORDER BY ${col} ${dir}, id DESC LIMIT ? OFFSET ?`
  ).all(...params, lim, off) as Transaction[];

  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM transactions ${where}`).get(...params) as { c: number }
  ).c;

  res.json({ data: rows, total, limit: lim, offset: off });
});

// ── POST /api/transactions ─────────────────────────────────────────────────
// Thêm giao dịch mới cho người dùng
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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
  let cleanDescription = description.trim();

  if (manualDate) {
    resolvedDate = manualDate;
  } else {
    const parsed = parseDateFromText(description, new Date());
    resolvedDate = formatDate(parsed.date);
    cleanDescription = parsed.cleanText || description.trim();
  }

  const category = manualCategory || classify(cleanDescription, type);

  const result = db.prepare(
    `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, resolvedDate, type, amount, cleanDescription, category, note || '');

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;
  return res.status(201).json(created);
});

// ── POST /api/transactions/classify ───────────────────────────────────────
// Xem trước phân loại
router.post('/classify', (req: AuthenticatedRequest, res: Response) => {
  const { description, type } = req.body as { description: string; type: 'income' | 'expense' };
  if (!description || !type) {
    return res.status(400).json({ error: 'Cần có description và type' });
  }

  const parsed = parseDateFromText(description, new Date());
  const category = classify(parsed.cleanText || description, type);

  return res.json({
    category,
    suggestedDate: formatDate(parsed.date),
    cleanDescription: parsed.cleanText
  });
});

// ── PUT /api/transactions/:id ─────────────────────────────────────────────
// Cập nhật giao dịch (chỉ sửa được giao dịch của chính mình)
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { type, amount, description, category, note, date } = req.body as Partial<Transaction>;

  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as Transaction | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giao dịch hoặc bạn không có quyền sửa' });
  }

  const updated = {
    date: date ?? existing.date,
    type: type ?? existing.type,
    amount: amount ?? existing.amount,
    description: description ?? existing.description,
    category: category ?? existing.category,
    note: note ?? existing.note
  };

  db.prepare(
    `UPDATE transactions SET date=?, type=?, amount=?, description=?, category=?, note=? WHERE id=? AND user_id=?`
  ).run(updated.date, updated.type, updated.amount, updated.description, updated.category, updated.note, id, userId);

  const result = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  return res.json(result);
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────────
// Xóa giao dịch (chỉ xóa được giao dịch của chính mình)
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Không tìm thấy giao dịch hoặc bạn không có quyền xóa' });
  }
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
  return res.json({ success: true });
});

export default router;
