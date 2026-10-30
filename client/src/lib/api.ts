// API client — kết nối với Express backend

export interface User {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Transaction {
  id: number;
  user_id?: number;
  date: string;         // YYYY-MM-DD
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  note: string;
  created_at: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface FilterParams {
  type?: 'income' | 'expense';
  category?: string;
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount' | 'created_at';
  sortDir?: 'ASC' | 'DESC';
}

export interface PeriodComparison {
  prevIncome: number;
  prevExpense: number;
  prevBalance: number;
  expenseChangePct: number | null;
  incomeChangePct: number | null;
  expenseToIncomeRatio: number | null;
  savingsRate: number;
  prevDateFrom: string;
  prevDateTo: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
  incomeCount?: number;
  expenseCount?: number;
  comparison?: PeriodComparison;
}

export interface RecurringTransaction {
  id: number;
  user_id?: number;
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

export interface CategoryStat {
  category: string;
  type: string;
  count: number;
  total: number;
  icon: string;
}

export interface DateStat {
  period: string;
  income: number;
  expense: number;
}

export interface ClassifyPreview {
  category: string;
  suggestedDate: string;
  cleanDescription: string;
}

export interface NaturalQueryResult {
  type?: 'income' | 'expense';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  description: string;
}

export interface BudgetItem {
  id: number;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  actualRatio: number;
  percentage: number;
  expectedSpendToDate: number;
  status: 'GOOD' | 'WARNING' | 'EXCEEDED';
  message: string;
}

export interface BudgetResponse {
  month: string;
  currentDay: number;
  totalDays: number;
  expectedPaceRatio: number;
  hasOverpacedAlert: boolean;
  budgets: BudgetItem[];
}

export interface Debt {
  id: number;
  user_id?: number;
  type: 'lend' | 'borrow'; // 'lend': Cho vay (Người khác nợ mình) | 'borrow': Đi vay (Mình nợ người khác)
  person: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  description: string;
  date: string;
  due_date: string;
  status: 'pending' | 'settled';
  created_at: string;
}

export interface DebtSummary {
  totalLendRemaining: number;
  totalBorrowRemaining: number;
  settledCount: number;
  pendingCount: number;
}

export interface DebtListResponse {
  data: Debt[];
  summary: DebtSummary;
}

export interface CreditCard {
  id: number;
  user_id: number;
  card_name: string;
  bank_name: string;
  balance: number;
  paid_amount: number;
  remaining: number;
  credit_limit: number;
  due_date: string;
  statement_day: number;
  status: 'pending' | 'settled';
  note: string;
  daysRemaining?: number;
  created_at: string;
}

export interface CreditCardSummary {
  totalDebtRemaining: number;
  totalPaid: number;
  settledCount: number;
  pendingCount: number;
  dueSoonCount: number;
  overdueCount: number;
}

export interface CreditCardListResponse {
  data: CreditCard[];
  summary: CreditCardSummary;
}

const BASE = '/api';
const TOKEN_KEY = 'financetracker_token';
const USER_KEY = 'financetracker_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null, remember = true): void {
  if (token) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } else {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): User | null {
  const str = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null, remember = true): void {
  if (user) {
    const json = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(USER_KEY, json);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, json);
      localStorage.removeItem(USER_KEY);
    }
  } else {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}

export function getUserDisplayName(user?: User | null): string {
  if (user?.name?.trim()) return user.name.trim();
  if (user?.username?.trim()) return user.username.trim();
  const stored = getStoredUser();
  if (stored?.name?.trim()) return stored.name.trim();
  if (stored?.username?.trim()) return stored.username.trim();
  return 'bạn';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers
  });

  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    setStoredToken(null);
    window.dispatchEvent(new Event('auth_logout'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── API Methods ────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  register(data: { username: string; password: string; name?: string; email?: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  forgotPassword(identifier: string): Promise<{
    success: boolean;
    message: string;
    maskedEmail: string;
    identifier: string;
    simulated?: boolean;
    simulatedOtp?: string;
  }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  resetPassword(data: {
    identifier: string;
    otp: string;
    newPassword: string;
  }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  login(data: { username: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  updateProfile(data: { name?: string; avatar?: string; email?: string }): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  changePassword(data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' }).finally(() => {
      setStoredToken(null);
    });
  },

  // ── Transactions ──────────────────────────────────────────────────────────
  getTransactions(params: FilterParams = {}): Promise<TransactionListResponse> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.category) qs.set('category', params.category);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.search) qs.set('search', params.search);
    if (params.minAmount !== undefined) qs.set('minAmount', String(params.minAmount));
    if (params.maxAmount !== undefined) qs.set('maxAmount', String(params.maxAmount));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    if (params.sortBy) qs.set('sortBy', params.sortBy);
    if (params.sortDir) qs.set('sortDir', params.sortDir);
    const query = qs.toString();
    return request<TransactionListResponse>(`/transactions${query ? `?${query}` : ''}`);
  },

  createTransaction(data: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category?: string;
    note?: string;
    date?: string;
  }): Promise<Transaction> {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createBatchTransactions(transactions: Array<{
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category?: string;
    note?: string;
    date?: string;
  }>): Promise<{ data: Transaction[]; count: number }> {
    return request<{ data: Transaction[]; count: number }>('/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions })
    });
  },

  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    return request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteTransaction(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' });
  },

  deleteTransactionsBatch(ids: number[]): Promise<{ success: boolean; count: number }> {
    return request<{ success: boolean; count: number }>('/transactions/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    });
  },

  deleteAllTransactions(filters: FilterParams = {}): Promise<{ success: boolean; deletedCount: number }> {
    return request<{ success: boolean; deletedCount: number }>('/transactions/all', {
      method: 'DELETE',
      body: JSON.stringify(filters)
    });
  },

  classifyPreview(description: string, type: 'income' | 'expense'): Promise<ClassifyPreview> {
    return request<ClassifyPreview>('/transactions/classify', {
      method: 'POST',
      body: JSON.stringify({ description, type })
    });
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  getSummary(params: FilterParams = {}): Promise<SummaryStats> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.category) qs.set('category', params.category);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    const query = qs.toString();
    return request<SummaryStats>(`/stats/summary${query ? `?${query}` : ''}`);
  },

  getCategoryStats(params: FilterParams = {}): Promise<CategoryStat[]> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    const query = qs.toString();
    return request<CategoryStat[]>(`/stats/by-category${query ? `?${query}` : ''}`);
  },

  getDateStats(params: FilterParams & { group?: 'day' | 'month' | 'quarter' | 'year' } = {}): Promise<DateStat[]> {
    const qs = new URLSearchParams();
    if (params.type) qs.set('type', params.type);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.group) qs.set('group', params.group);
    const query = qs.toString();
    return request<DateStat[]>(`/stats/by-date${query ? `?${query}` : ''}`);
  },

  parseNaturalQuery(query: string): Promise<NaturalQueryResult> {
    return request<NaturalQueryResult>('/stats/query', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  },

  // ── Budgets ──────────────────────────────────────────────────────────────
  getBudgets(month?: string): Promise<BudgetResponse> {
    const qs = month ? `?month=${month}` : '';
    return request<BudgetResponse>(`/budgets${qs}`);
  },

  setBudget(data: { month: string; category?: string; amount: number }): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteBudget(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/budgets/${id}`, {
      method: 'DELETE'
    });
  },

  // ── Debts (Sổ nợ — không tính vào thu chi) ────────────────────────────────
  getDebts(): Promise<DebtListResponse> {
    return request<DebtListResponse>('/debts');
  },

  createDebt(data: {
    type: 'lend' | 'borrow';
    person: string;
    amount: number;
    description?: string;
    date?: string;
    due_date?: string;
  }): Promise<Debt> {
    return request<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateDebt(id: number, data: Partial<Debt>): Promise<Debt> {
    return request<Debt>(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteDebt(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/debts/${id}`, {
      method: 'DELETE'
    });
  },

  // ── Credit Cards (Nợ thẻ tín dụng) ─────────────────────────────────────────
  getCreditCards(): Promise<CreditCardListResponse> {
    return request<CreditCardListResponse>('/credit-cards');
  },

  createCreditCard(data: {
    card_name: string;
    bank_name?: string;
    balance: number;
    credit_limit?: number;
    due_date: string;
    statement_day?: number;
    note?: string;
  }): Promise<CreditCard> {
    return request<CreditCard>('/credit-cards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateCreditCard(id: number, data: Partial<CreditCard>): Promise<CreditCard> {
    return request<CreditCard>(`/credit-cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  payCreditCard(id: number, data: {
    amount: number;
    payment_date?: string;
    note?: string;
    create_expense?: boolean;
  }): Promise<{ card: CreditCard; message: string }> {
    return request<{ card: CreditCard; message: string }>(`/credit-cards/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteCreditCard(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/credit-cards/${id}`, {
      method: 'DELETE'
    });
  },

  getRecurring(): Promise<{ data: RecurringTransaction[] }> {
    return request<{ data: RecurringTransaction[] }>('/recurring');
  },

  createRecurring(data: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category?: string;
    note?: string;
    day_of_month?: number;
  }): Promise<RecurringTransaction> {
    return request<RecurringTransaction>('/recurring', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateRecurring(id: number, data: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    return request<RecurringTransaction>(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteRecurring(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/recurring/${id}`, {
      method: 'DELETE'
    });
  }
};

// ── Format helpers ─────────────────────────────────────────────────────────

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function thisMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dateFrom = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const dateTo = todayISO();
  return { dateFrom, dateTo };
}
