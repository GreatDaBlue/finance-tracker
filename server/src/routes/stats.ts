import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { parseDateFromText, formatDate } from '../lib/dateParser';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// ── GET /api/stats/summary ─────────────────────────────────────────────────
// Returns total income, expense, balance for given filter
router.get('/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, category, type } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, category, type });

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS totalIncome,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS totalExpense,
      COUNT(*) AS count
    FROM transactions ${where}
  `).get(...params) as { totalIncome: number; totalExpense: number; count: number };

  res.json({
    totalIncome: row.totalIncome,
    totalExpense: row.totalExpense,
    balance: row.totalIncome - row.totalExpense,
    count: row.count
  });
});

// ── GET /api/stats/by-category ─────────────────────────────────────────────
router.get('/by-category', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, type } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, type });

  const rows = db.prepare(`
    SELECT
      category,
      type,
      COUNT(*) AS count,
      SUM(amount) AS total
    FROM transactions ${where}
    GROUP BY category, type
    ORDER BY total DESC
  `).all(...params) as Array<{ category: string; type: string; count: number; total: number }>;

  const withIcons = rows.map(r => {
    const cat = db.prepare('SELECT icon FROM categories WHERE name = ?').get(r.category) as
      { icon: string } | undefined;
    return { ...r, icon: cat?.icon ?? '❓' };
  });

  res.json(withIcons);
});

// ── GET /api/stats/by-date ─────────────────────────────────────────────────
router.get('/by-date', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, type, group = 'day' } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, type });

  let dateExpr: string;
  if (group === 'month') {
    dateExpr = "strftime('%Y-%m', date)";
  } else if (group === 'year') {
    dateExpr = "strftime('%Y', date)";
  } else {
    dateExpr = 'date';
  }

  const rows = db.prepare(`
    SELECT
      ${dateExpr} AS period,
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions ${where}
    GROUP BY period
    ORDER BY period ASC
  `).all(...params) as Array<{ period: string; income: number; expense: number }>;

  res.json(rows);
});

// ── POST /api/stats/query ──────────────────────────────────────────────────
router.post('/query', (req: Request, res: Response) => {
  const { query } = req.body as { query: string };
  if (!query) return res.status(400).json({ error: 'query is required' });

  const result = parseNaturalQuery(query);
  return res.json(result);
});

// ── Helpers ────────────────────────────────────────────────────────────────

interface FilterOpts {
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  type?: string;
}

function buildWhere(opts: FilterOpts): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.userId !== undefined) {
    conditions.push('user_id = ?');
    params.push(opts.userId);
  }
  if (opts.type && (opts.type === 'income' || opts.type === 'expense')) {
    conditions.push('type = ?');
    params.push(opts.type);
  }
  if (opts.category) {
    conditions.push('category = ?');
    params.push(opts.category);
  }
  if (opts.dateFrom) {
    conditions.push('date >= ?');
    params.push(opts.dateFrom);
  }
  if (opts.dateTo) {
    conditions.push('date <= ?');
    params.push(opts.dateTo);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

interface QueryResult {
  type?: 'income' | 'expense';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  description: string;
}

/**
 * Parse Vietnamese natural-language queries into filter params.
 * Examples:
 *   "thực phẩm từ 1/1/2026 đến nay"
 *   "chi tiêu tháng 10"
 *   "thu nhập năm 2026"
 *   "ăn uống tuần này"
 */
function parseNaturalQuery(query: string): QueryResult {
  const text = query.toLowerCase().trim();
  const today = new Date();
  const result: QueryResult = { description: query };

  // ── Detect type ──────────────────────────────────────────────────────────
  if (/\b(chi tiêu|chi phí|tiêu xài|chi|expense)\b/.test(text)) {
    result.type = 'expense';
  } else if (/\b(thu nhập|thu|tiền vào|income)\b/.test(text)) {
    result.type = 'income';
  }

  // ── Detect category by name / keyword ────────────────────────────────────
  const categories = db.prepare('SELECT name, keywords FROM categories').all() as Array<{
    name: string; keywords: string;
  }>;

  for (const cat of categories) {
    const kws: string[] = JSON.parse(cat.keywords);
    const catNameNorm = cat.name.toLowerCase();

    // Check category name itself
    if (text.includes(catNameNorm)) {
      result.category = cat.name;
      break;
    }
    // Check keywords
    for (const kw of kws) {
      if (text.includes(kw.toLowerCase())) {
        result.category = cat.name;
        break;
      }
    }
    if (result.category) break;
  }

  // Manual overrides for common query terms
  const categoryAliases: Record<string, string> = {
    'ăn uống': 'Thực phẩm & Ăn uống',
    'thực phẩm': 'Thực phẩm & Ăn uống',
    'đồ ăn': 'Thực phẩm & Ăn uống',
    'tiền ăn': 'Thực phẩm & Ăn uống',
    'di chuyển': 'Di chuyển & Xăng xe',
    'xăng xe': 'Di chuyển & Xăng xe',
    'xe cộ': 'Di chuyển & Xăng xe',
    'sức khỏe': 'Y tế & Sức khỏe',
    'y tế': 'Y tế & Sức khỏe',
    'giải trí': 'Giải trí & Mua sắm',
    'mua sắm': 'Giải trí & Mua sắm',
    'giáo dục': 'Giáo dục',
    'học phí': 'Giáo dục',
    'tiết kiệm': 'Tiết kiệm & Đầu tư',
    'đầu tư': 'Tiết kiệm & Đầu tư',
    'sửa chữa': 'Sửa chữa & Bảo trì',
    'bảo trì': 'Sửa chữa & Bảo trì',
    'lương': 'Thu nhập lương',
    'tiền lương': 'Thu nhập lương',
    'nhà ở': 'Nhà ở & Tiện ích',
    'tiền nhà': 'Nhà ở & Tiện ích',
    'điện nước': 'Nhà ở & Tiện ích',
  };

  if (!result.category) {
    for (const [alias, catName] of Object.entries(categoryAliases)) {
      if (text.includes(alias)) {
        result.category = catName;
        break;
      }
    }
  }

  // ── Detect date range ────────────────────────────────────────────────────

  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  // "từ DD/MM/YYYY đến DD/MM/YYYY"
  const fromToRx = /từ\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?)\s+đến\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?|nay|hiện tại|giờ)/i;
  const fromToMatch = text.match(fromToRx);
  if (fromToMatch) {
    result.dateFrom = resolveShortDate(fromToMatch[1], today);
    const toStr = fromToMatch[2];
    result.dateTo = /^(nay|hiện tại|giờ)/.test(toStr) ? formatDate(today) : resolveShortDate(toStr, today);
  }

  // "từ đầu năm YYYY đến nay" / "từ 1/1/YYYY đến nay"
  const fromYearRx = /từ\s+(?:đầu\s+năm|1\/1\/?)\s*(\d{4})\s+đến\s+(?:nay|hiện tại|giờ)/i;
  const fromYearMatch = text.match(fromYearRx);
  if (!result.dateFrom && fromYearMatch) {
    result.dateFrom = `${fromYearMatch[1]}-01-01`;
    result.dateTo = formatDate(today);
  }

  // "tháng X" or "tháng X/YYYY" or "tháng X năm YYYY"
  if (!result.dateFrom) {
    const monthRx = /tháng\s+(\d{1,2})(?:\s*[\/\-]\s*|\s+năm\s+)(\d{4})?/i;
    const monthMatch = text.match(monthRx);
    if (monthMatch) {
      const mon = parseInt(monthMatch[1], 10) - 1; // 0-indexed
      const yr = monthMatch[2] ? parseInt(monthMatch[2], 10) : y;
      result.dateFrom = formatDate(new Date(yr, mon, 1));
      result.dateTo = formatDate(new Date(yr, mon + 1, 0)); // last day of month
    } else if (/\btháng này\b/.test(text)) {
      result.dateFrom = formatDate(new Date(y, m, 1));
      result.dateTo = formatDate(today);
    } else if (/\btháng trước\b/.test(text)) {
      result.dateFrom = formatDate(new Date(y, m - 1, 1));
      result.dateTo = formatDate(new Date(y, m, 0));
    }
  }

  // "năm YYYY"
  if (!result.dateFrom) {
    const yearRx = /\bnăm\s+(\d{4})\b/i;
    const yearMatch = text.match(yearRx);
    if (yearMatch) {
      const yr = parseInt(yearMatch[1], 10);
      result.dateFrom = `${yr}-01-01`;
      result.dateTo = yr === y ? formatDate(today) : `${yr}-12-31`;
    } else if (/\bnăm nay\b/.test(text)) {
      result.dateFrom = `${y}-01-01`;
      result.dateTo = formatDate(today);
    } else if (/\bnăm ngoái\b/.test(text)) {
      result.dateFrom = `${y - 1}-01-01`;
      result.dateTo = `${y - 1}-12-31`;
    }
  }

  // "tuần này"
  if (!result.dateFrom && /\btuần này\b/.test(text)) {
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    result.dateFrom = formatDate(monday);
    result.dateTo = formatDate(today);
  }

  // "tuần trước"
  if (!result.dateFrom && /\btuần trước\b/.test(text)) {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    result.dateFrom = formatDate(lastMonday);
    result.dateTo = formatDate(lastSunday);
  }

  // "hôm nay" / "hôm qua"
  if (!result.dateFrom) {
    if (/\bhôm nay\b/.test(text)) {
      result.dateFrom = formatDate(today);
      result.dateTo = formatDate(today);
    } else if (/\bhôm qua\b/.test(text)) {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      result.dateFrom = formatDate(yesterday);
      result.dateTo = formatDate(yesterday);
    }
  }

  return result;
}

function resolveShortDate(dateStr: string, today: Date): string {
  const full = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(dateStr);
  if (full) {
    return `${full[3]}-${full[2].padStart(2, '0')}-${full[1].padStart(2, '0')}`;
  }
  const short = /(\d{1,2})[\/\-](\d{1,2})/.exec(dateStr);
  if (short) {
    const day = short[1].padStart(2, '0');
    const mon = short[2].padStart(2, '0');
    return `${today.getFullYear()}-${mon}-${day}`;
  }
  return formatDate(today);
}

export default router;
