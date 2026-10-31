import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { formatDate } from '../lib/dateParser';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { getEquivalentCategories } from '../lib/classifier';

const router = Router();

// ── GET /api/stats/summary ─────────────────────────────────────────────────
router.get('/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, category, type } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, category, type });

  const row = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS "totalIncome",
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS "totalExpense",
      COUNT(*) AS count,
      COALESCE(SUM(CASE WHEN type='income'  THEN 1 ELSE 0 END), 0) AS "incomeCount",
      COALESCE(SUM(CASE WHEN type='expense' THEN 1 ELSE 0 END), 0) AS "expenseCount"
    FROM transactions ${where}
  `).get<{
    totalIncome: string | number;
    totalExpense: string | number;
    count: string | number;
    incomeCount: string | number;
    expenseCount: string | number;
  }>(...params);

  const totalIncome = Number(row?.totalIncome || 0);
  const totalExpense = Number(row?.totalExpense || 0);
  const count = Number(row?.count || 0);
  const incomeCount = Number(row?.incomeCount || 0);
  const expenseCount = Number(row?.expenseCount || 0);
  const balance = totalIncome - totalExpense;

  // Tính so sánh kỳ này với kỳ trước & tỷ lệ tiết kiệm
  let comparison = null;

  if (dateFrom && dateTo) {
    const dFrom = new Date(dateFrom);
    const dTo = new Date(dateTo);
    const diffTime = dTo.getTime() - dFrom.getTime();
    if (diffTime >= 0) {
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const prevTo = new Date(dFrom);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - (diffDays - 1));

      const pad = (n: number) => String(n).padStart(2, '0');
      const prevDateToStr = `${prevTo.getFullYear()}-${pad(prevTo.getMonth() + 1)}-${pad(prevTo.getDate())}`;
      const prevDateFromStr = `${prevFrom.getFullYear()}-${pad(prevFrom.getMonth() + 1)}-${pad(prevFrom.getDate())}`;

      const { where: prevWhere, params: prevParams } = buildWhere({
        userId,
        dateFrom: prevDateFromStr,
        dateTo: prevDateToStr,
        category,
        type
      });

      const prevRow = await db.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS "totalIncome",
          COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS "totalExpense"
        FROM transactions ${prevWhere}
      `).get<{ totalIncome: string | number; totalExpense: string | number }>(...prevParams);

      const prevIncome = Number(prevRow?.totalIncome || 0);
      const prevExpense = Number(prevRow?.totalExpense || 0);
      const prevBalance = prevIncome - prevExpense;

      const expenseChangePct = prevExpense > 0
        ? Math.round(((totalExpense - prevExpense) / prevExpense) * 1000) / 10
        : null;

      const incomeChangePct = prevIncome > 0
        ? Math.round(((totalIncome - prevIncome) / prevIncome) * 1000) / 10
        : null;

      const expenseToIncomeRatio = totalIncome > 0
        ? Math.round((totalExpense / totalIncome) * 1000) / 10
        : null;

      const savingsRate = totalIncome > 0
        ? Math.round((balance / totalIncome) * 1000) / 10
        : (totalExpense > 0 ? -100 : 0);

      comparison = {
        prevIncome,
        prevExpense,
        prevBalance,
        expenseChangePct,
        incomeChangePct,
        expenseToIncomeRatio,
        savingsRate,
        prevDateFrom: prevDateFromStr,
        prevDateTo: prevDateToStr
      };
    }
  }

  if (!comparison) {
    const savingsRate = totalIncome > 0
      ? Math.round((balance / totalIncome) * 1000) / 10
      : 0;
    const expenseToIncomeRatio = totalIncome > 0
      ? Math.round((totalExpense / totalIncome) * 1000) / 10
      : null;

    comparison = {
      prevIncome: 0,
      prevExpense: 0,
      prevBalance: 0,
      expenseChangePct: null,
      incomeChangePct: null,
      expenseToIncomeRatio,
      savingsRate,
      prevDateFrom: '',
      prevDateTo: ''
    };
  }

  res.json({
    totalIncome,
    totalExpense,
    balance,
    count,
    incomeCount,
    expenseCount,
    comparison
  });
});

// ── GET /api/stats/by-category ─────────────────────────────────────────────
router.get('/by-category', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, type } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, type });

  const rows = await db.prepare(`
    SELECT
      category,
      type,
      COUNT(*) AS count,
      SUM(amount) AS total
    FROM transactions ${where}
    GROUP BY category, type
    ORDER BY total DESC
  `).all<{ category: string; type: string; count: string | number; total: string | number }>(...params);

  const allCategories = await db.prepare('SELECT name, icon FROM categories').all<{ name: string; icon: string }>();
  const iconMap = new Map(allCategories.map(c => [c.name, c.icon]));

  const withIcons = rows.map(r => ({
    category: r.category,
    type: r.type,
    count: Number(r.count),
    total: Number(r.total),
    icon: iconMap.get(r.category) ?? '❓'
  }));

  res.json(withIcons);
});

// ── GET /api/stats/by-date ─────────────────────────────────────────────────
router.get('/by-date', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { dateFrom, dateTo, type, group = 'day' } = req.query as Record<string, string>;
  const { where, params } = buildWhere({ userId, dateFrom, dateTo, type });

  // substr() chuẩn ANSI SQL hỗ trợ cả SQLite và PostgreSQL
  let dateExpr = 'date';
  if (group === 'month') {
    dateExpr = 'substr(date, 1, 7)';
  } else if (group === 'quarter') {
    dateExpr = `(CASE 
      WHEN substr(date, 6, 2) IN ('01','02','03') THEN substr(date, 1, 4) || '-Q1'
      WHEN substr(date, 6, 2) IN ('04','05','06') THEN substr(date, 1, 4) || '-Q2'
      WHEN substr(date, 6, 2) IN ('07','08','09') THEN substr(date, 1, 4) || '-Q3'
      ELSE substr(date, 1, 4) || '-Q4'
    END)`;
  } else if (group === 'year') {
    dateExpr = 'substr(date, 1, 4)';
  }

  const rows = await db.prepare(`
    SELECT
      ${dateExpr} AS period,
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions ${where}
    GROUP BY ${dateExpr}
    ORDER BY period ASC
  `).all<{ period: string; income: string | number; expense: string | number }>(...params);

  const formatted = rows.map(r => ({
    period: r.period,
    income: Number(r.income),
    expense: Number(r.expense)
  }));

  res.json(formatted);
});

// ── POST /api/stats/query ──────────────────────────────────────────────────
router.post('/query', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.body as { query: string };
  if (!query) return res.status(400).json({ error: 'query is required' });

  const result = await parseNaturalQuery(query);
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
    const equivs = getEquivalentCategories(opts.category);
    if (equivs.length > 1) {
      const placeholders = equivs.map(() => '?').join(', ');
      conditions.push(`category IN (${placeholders})`);
      params.push(...equivs);
    } else {
      conditions.push('category = ?');
      params.push(opts.category);
    }
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
  minAmount?: number;
  maxAmount?: number;
  description: string;
}

function parseVnAmountToken(raw: string): number | null {
  if (!raw) return null;
  const str = raw.trim().toLowerCase().replace(/[,.](\d{3})/g, '$1').replace(/\s+/g, '');
  if (str.includes('/') || str.includes(':')) return null;

  const trMatch = str.match(/^(\d+(?:[.,]\d+)?)(?:tr|triệu|m)$/);
  if (trMatch) return Math.round(parseFloat(trMatch[1].replace(',', '.')) * 1000000);

  const cuMatch = str.match(/^(\d+(?:[.,]\d+)?)(?:củ)$/);
  if (cuMatch) return Math.round(parseFloat(cuMatch[1].replace(',', '.')) * 1000000);

  const litMatch = str.match(/^(\d+(?:[.,]\d+)?)(?:lít)$/);
  if (litMatch) return Math.round(parseFloat(litMatch[1].replace(',', '.')) * 100000);

  const kMatch = str.match(/^(\d+(?:[.,]\d+)?)(?:k|nghìn|ngàn)$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);

  const num = parseFloat(str.replace(/,/g, '.'));
  if (!isNaN(num) && num > 0) return num;
  return null;
}

async function parseNaturalQuery(query: string): Promise<QueryResult> {
  const text = query.toLowerCase().trim();
  const today = new Date();
  const result: QueryResult = { description: query };

  const y = today.getFullYear();
  const m = today.getMonth();

  let textWithoutDates = text;

  // Lỗi #14: Xử lý khoảng thời gian ngày tháng trước để tránh rangeMatch hiểu nhầm khoảng ngày là số tiền
  const fromToRx = /từ\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?)\s+đến\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{4})?|nay|hiện tại|giờ)/i;
  const fromToMatch = text.match(fromToRx);
  if (fromToMatch) {
    result.dateFrom = resolveShortDate(fromToMatch[1], today);
    const toStr = fromToMatch[2];
    result.dateTo = /^(nay|hiện tại|giờ)/.test(toStr) ? formatDate(today) : resolveShortDate(toStr, today);
    textWithoutDates = textWithoutDates.replace(fromToRx, ' ');
  }

  const fromYearRx = /từ\s+(?:đầu\s+năm|1\/1\/?)\s*(\d{4})\s+đến\s+(?:nay|hiện tại|giờ)/i;
  const fromYearMatch = text.match(fromYearRx);
  if (!result.dateFrom && fromYearMatch) {
    result.dateFrom = `${fromYearMatch[1]}-01-01`;
    result.dateTo = formatDate(today);
    textWithoutDates = textWithoutDates.replace(fromYearRx, ' ');
  }

  if (!result.dateFrom) {
    const monthRx = /tháng\s+(\d{1,2})(?:(?:\s*[\/\-]\s*|\s+năm\s+)(\d{4}))?/i;
    const monthMatch = text.match(monthRx);
    if (monthMatch) {
      const mon = parseInt(monthMatch[1], 10) - 1;
      const yr = monthMatch[2] ? parseInt(monthMatch[2], 10) : y;
      result.dateFrom = formatDate(new Date(yr, mon, 1));
      result.dateTo = formatDate(new Date(yr, mon + 1, 0));
      textWithoutDates = textWithoutDates.replace(monthRx, ' ');
    } else if (/(?<![\p{L}\p{N}])tháng này(?![\p{L}\p{N}])/iu.test(text)) {
      result.dateFrom = formatDate(new Date(y, m, 1));
      result.dateTo = formatDate(today);
      textWithoutDates = textWithoutDates.replace(/(?<![\p{L}\p{N}])tháng này(?![\p{L}\p{N}])/iu, ' ');
    } else if (/(?<![\p{L}\p{N}])tháng trước(?![\p{L}\p{N}])/iu.test(text)) {
      result.dateFrom = formatDate(new Date(y, m - 1, 1));
      result.dateTo = formatDate(new Date(y, m, 0));
      textWithoutDates = textWithoutDates.replace(/(?<![\p{L}\p{N}])tháng trước(?![\p{L}\p{N}])/iu, ' ');
    }
  }

  if (!result.dateFrom) {
    const yearRx = /(?<![\p{L}\p{N}])năm\s+(\d{4})(?![\p{L}\p{N}])/iu;
    const yearMatch = text.match(yearRx);
    if (yearMatch) {
      const yr = parseInt(yearMatch[1], 10);
      result.dateFrom = `${yr}-01-01`;
      result.dateTo = yr === y ? formatDate(today) : `${yr}-12-31`;
      textWithoutDates = textWithoutDates.replace(yearRx, ' ');
    } else if (/(?<![\p{L}\p{N}])năm nay(?![\p{L}\p{N}])/iu.test(text)) {
      result.dateFrom = `${y}-01-01`;
      result.dateTo = formatDate(today);
      textWithoutDates = textWithoutDates.replace(/(?<![\p{L}\p{N}])năm nay(?![\p{L}\p{N}])/iu, ' ');
    } else if (/(?<![\p{L}\p{N}])năm ngoái(?![\p{L}\p{N}])/iu.test(text)) {
      result.dateFrom = `${y - 1}-01-01`;
      result.dateTo = `${y - 1}-12-31`;
      textWithoutDates = textWithoutDates.replace(/(?<![\p{L}\p{N}])năm ngoái(?![\p{L}\p{N}])/iu, ' ');
    }
  }

  if (!result.dateFrom && /(?<![\p{L}\p{N}])tuần này(?![\p{L}\p{N}])/iu.test(text)) {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    result.dateFrom = formatDate(monday);
    result.dateTo = formatDate(today);
    textWithoutDates = textWithoutDates.replace(/(?<![\p{L}\p{N}])tuần này(?![\p{L}\p{N}])/iu, ' ');
  }

  // Parse khoảng số tiền hoặc so sánh số tiền trên chuỗi đã bóc tách ngày:
  // 1. Khoảng: 50k..200k, 50k-200k, từ 50k đến 200k
  const rangeMatch = textWithoutDates.match(/(?:từ\s+)?(\d+[\w\.,]+)\s*(?:\.\.|\-|đến)\s*(\d+[\w\.,]+)/i);
  if (rangeMatch) {
    const a1 = parseVnAmountToken(rangeMatch[1]);
    const a2 = parseVnAmountToken(rangeMatch[2]);
    if (a1 !== null && a2 !== null && (a1 >= 1000 || a2 >= 1000 || /[ktrđcủ]/i.test(rangeMatch[0]))) {
      result.minAmount = Math.min(a1, a2);
      result.maxAmount = Math.max(a1, a2);
    }
  }

  // 2. Lớn hơn: > 100k, >= 100k, trên 100k, hơn 100k
  if (result.minAmount === undefined) {
    const gtMatch = textWithoutDates.match(/(?:>=|>|trên|hơn|lớn\s+hơn)\s*(\d+[\w\.,]+)/i);
    if (gtMatch) {
      const a = parseVnAmountToken(gtMatch[1]);
      if (a !== null) result.minAmount = a;
    }
  }

  // 3. Nhỏ hơn: < 200k, <= 200k, dưới 200k, bé hơn 200k
  if (result.maxAmount === undefined) {
    const ltMatch = textWithoutDates.match(/(?:<=|<|dưới|bé\s+hơn|nhỏ\s+hơn)\s*(\d+[\w\.,]+)/i);
    if (ltMatch) {
      const a = parseVnAmountToken(ltMatch[1]);
      if (a !== null) result.maxAmount = a;
    }
  }

  // Lỗi #15: Dùng Unicode boundary để không nhận nhầm "tiền thuê", "thuốc" thành thu hay "chiều" thành chi
  if (/(?<![\p{L}\p{N}])(chi tiêu|chi phí|tiêu xài|chi|expense)(?![\p{L}\p{N}])/iu.test(text)) {
    result.type = 'expense';
  } else if (/(?<![\p{L}\p{N}])(thu nhập|thu|tiền vào|income)(?![\p{L}\p{N}])/iu.test(text)) {
    result.type = 'income';
  }

  // Khớp chính xác các từ khóa thông dụng hàng ngày
  if (/(?:^|[^\p{L}\p{N}])(cơm|phở|trà sữa|cafe|cà phê|bún|bánh|mì|cháo|lẩu|nướng)(?:[^\p{L}\p{N}]|$)/iu.test(text)) {
    result.category = 'Thực phẩm & Ăn uống';
  } else if (/(?:^|[^\p{L}\p{N}])(xăng|xe|gửi xe|đổ xăng|bãi xe|đậu xe|rửa xe|sửa xe|thay nhớt|grab|taxi|bus)(?:[^\p{L}\p{N}]|$)/iu.test(text)) {
    result.category = 'Di chuyển & Xăng xe';
  } else if (/(?:^|[^\p{L}\p{N}])(gym|thuốc|mua thuốc|khám|bệnh viện|bác sĩ|nha khoa|răng|fitness|yoga|spa)(?:[^\p{L}\p{N}]|$)/iu.test(text)) {
    result.category = 'Y tế & Sức khỏe';
  }

  if (!result.category) {
    const categories = await db.prepare('SELECT name, keywords FROM categories').all<{
      name: string;
      keywords: string | string[];
    }>();

    for (const cat of categories) {
      const kws: string[] = typeof cat.keywords === 'string' ? JSON.parse(cat.keywords) : (cat.keywords || []);
      const catNameNorm = cat.name.toLowerCase();

      if (text.includes(catNameNorm)) {
        result.category = cat.name;
        break;
      }
      for (const kw of kws) {
        if (text.includes(kw.toLowerCase())) {
          result.category = cat.name;
          break;
        }
      }
      if (result.category) break;
    }
  }

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
