import { Router, Response } from 'express';
import { db } from '../lib/db';
import { classify, getEquivalentCategories } from '../lib/classifier';
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

const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;

export function isValidISODate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

interface TransactionFilters {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
}

function buildTransactionWhere(userId: number, filters: TransactionFilters): { where: string; params: unknown[] } {
  const conditions: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (filters.type && (filters.type === 'income' || filters.type === 'expense')) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.category) {
    const equivs = getEquivalentCategories(filters.category);
    if (equivs.length > 1) {
      const placeholders = equivs.map(() => '?').join(', ');
      conditions.push(`category IN (${placeholders})`);
      params.push(...equivs);
    } else {
      conditions.push('category = ?');
      params.push(filters.category);
    }
  }
  if (filters.dateFrom) {
    conditions.push('date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.search) {
    const rawSearch = filters.search.trim();
    if (rawSearch) {
      const escaped = rawSearch.replace(/([\\%_])/g, '\\$1');
      conditions.push('(LOWER(description) LIKE LOWER(?) ESCAPE \'\\\' OR LOWER(note) LIKE LOWER(?) ESCAPE \'\\\')');
      params.push(`%${escaped}%`, `%${escaped}%`);
    }
  }
  if (filters.minAmount !== undefined && filters.minAmount !== '') {
    const min = Number(filters.minAmount);
    if (!isNaN(min) && min >= 0) {
      conditions.push('amount >= ?');
      params.push(min);
    }
  }
  if (filters.maxAmount !== undefined && filters.maxAmount !== '') {
    const max = Number(filters.maxAmount);
    if (!isNaN(max) && max >= 0) {
      conditions.push('amount <= ?');
      params.push(max);
    }
  }

  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    params
  };
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

  const { where, params } = buildTransactionWhere(userId, {
    type,
    category,
    dateFrom,
    dateTo,
    search,
    minAmount,
    maxAmount
  });

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

  if (!type || amount === undefined || !description) {
    return res.status(400).json({ error: 'Vui lòng nhập loại, số tiền và mô tả' });
  }
  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Loại giao dịch phải là income hoặc expense' });
  }
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || amount > MAX_TRANSACTION_AMOUNT) {
    return res.status(400).json({ error: `Số tiền phải là số hợp lệ từ 1 đến ${MAX_TRANSACTION_AMOUNT.toLocaleString('vi-VN')} ₫` });
  }

  let resolvedDate: string;
  let cleanDescription: string;

  if (manualDate) {
    if (!isValidISODate(manualDate)) {
      return res.status(400).json({ error: 'Ngày giao dịch không đúng định dạng YYYY-MM-DD hợp lệ' });
    }
    resolvedDate = manualDate;
    cleanDescription = description.trim();
  } else {
    const parsed = parseDateFromText(description, new Date());
    resolvedDate = formatDate(parsed.date);
    cleanDescription = sanitizeDescription(parsed.cleanText || description);
  }

  if (!cleanDescription) {
    return res.status(400).json({ error: 'Mô tả giao dịch không được để trống' });
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

  if (transactions.length > 500) {
    return res.status(400).json({ error: 'Chỉ được nhập tối đa 500 giao dịch mỗi lần' });
  }

  const createdList: Transaction[] = [];
  const errors: Array<{ index: number; description: string; error: string }> = [];

  for (let i = 0; i < transactions.length; i++) {
    const item = transactions[i];
    if (!item.type || item.amount === undefined || !item.description) {
      errors.push({ index: i, description: item.description || '', error: 'Thiếu thông tin bắt buộc (loại, số tiền hoặc mô tả)' });
      continue;
    }
    if (item.type !== 'income' && item.type !== 'expense') {
      errors.push({ index: i, description: item.description, error: 'Loại phải là income hoặc expense' });
      continue;
    }
    const numAmount = Number(item.amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > MAX_TRANSACTION_AMOUNT) {
      errors.push({ index: i, description: item.description, error: `Số tiền không hợp lệ (1 - ${MAX_TRANSACTION_AMOUNT.toLocaleString('vi-VN')} ₫)` });
      continue;
    }

    let resolvedDate: string;
    let cleanDescription: string;

    if (item.date) {
      if (!isValidISODate(item.date)) {
        errors.push({ index: i, description: item.description, error: 'Ngày YYYY-MM-DD không hợp lệ' });
        continue;
      }
      resolvedDate = item.date;
      cleanDescription = item.description.trim();
    } else {
      const parsed = parseDateFromText(item.description, new Date());
      resolvedDate = formatDate(parsed.date);
      cleanDescription = sanitizeDescription(parsed.cleanText || item.description);
    }

    if (!cleanDescription) {
      errors.push({ index: i, description: item.description, error: 'Mô tả không được để trống' });
      continue;
    }

    const category = item.category || (await classify(cleanDescription, item.type));

    const result = await db.prepare(
      `INSERT INTO transactions (user_id, date, type, amount, description, category, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, resolvedDate, item.type, numAmount, cleanDescription, category, item.note || '');

    const created = await db.prepare('SELECT * FROM transactions WHERE id = ?').get<Transaction>(result.lastInsertRowid);
    if (created) {
      created.amount = Number(created.amount);
      createdList.push(created);
    }
  }

  return res.status(201).json({
    data: createdList,
    count: createdList.length,
    errors: errors.length > 0 ? errors : undefined
  });
});

// ── POST /api/transactions/classify ───────────────────────────────────────
router.post('/classify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  if (amount !== undefined) {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0 || num > MAX_TRANSACTION_AMOUNT) {
      return res.status(400).json({ error: `Số tiền phải là số lớn hơn 0 và nhỏ hơn ${MAX_TRANSACTION_AMOUNT.toLocaleString('vi-VN')} ₫` });
    }
  }

  if (type !== undefined && type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Loại giao dịch phải là income hoặc expense' });
  }

  if (date !== undefined && !isValidISODate(date)) {
    return res.status(400).json({ error: 'Ngày giao dịch không đúng định dạng YYYY-MM-DD hợp lệ' });
  }

  const finalDesc = description !== undefined ? description.trim() : existing.description;
  if (!finalDesc) {
    return res.status(400).json({ error: 'Mô tả không được để trống' });
  }

  const updated = {
    date: date ?? existing.date,
    type: type ?? existing.type,
    amount: amount !== undefined ? Number(amount) : Number(existing.amount),
    description: finalDesc,
    category: category ?? existing.category,
    note: note ?? existing.note
  };

  await db.prepare(
    `UPDATE transactions SET date=?, type=?, amount=?, description=?, category=?, note=? WHERE id=? AND user_id=?`
  ).run(updated.date, updated.type, updated.amount, updated.description, updated.category, updated.note, id, userId);

  const result = await db.prepare('SELECT * FROM transactions WHERE id = ?').get<Transaction>(id);
  if (result) result.amount = Number(result.amount);
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
  const filters = (req.body || {}) as TransactionFilters;
  const { where, params } = buildTransactionWhere(userId, filters);

  const result = await db.prepare(`DELETE FROM transactions ${where}`).run(...params);
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
