// API client — kết nối với Express backend

export interface User {
  id: number;
  username: string;
  name: string;
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
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount' | 'created_at';
  sortDir?: 'ASC' | 'DESC';
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  count: number;
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
  description: string;
}

const BASE = '/api';
const TOKEN_KEY = 'financetracker_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
  register(data: { username: string; password: string; name?: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
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

  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
    return request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteTransaction(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' });
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

  getDateStats(params: FilterParams & { group?: 'day' | 'month' | 'year' } = {}): Promise<DateStat[]> {
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
