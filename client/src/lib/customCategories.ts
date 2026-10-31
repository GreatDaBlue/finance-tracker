import { getStoredUser } from './api';

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  isDefault?: boolean;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'cat_food', name: 'Ăn uống', icon: '🍔', color: '#f59e0b', type: 'expense', isDefault: true },
  { id: 'cat_transport', name: 'Xe cộ & Đi lại', icon: '🚗', color: '#3b82f6', type: 'expense', isDefault: true },
  { id: 'cat_health', name: 'Sức khỏe & Y tế', icon: '🏥', color: '#10b981', type: 'expense', isDefault: true },
  { id: 'cat_housing', name: 'Nhà cửa & Hóa đơn', icon: '🏠', color: '#6366f1', type: 'expense', isDefault: true },
  { id: 'cat_shopping', name: 'Mua sắm & Giải trí', icon: '🎬', color: '#ec4899', type: 'expense', isDefault: true },
  { id: 'cat_education', name: 'Giáo dục & Học tập', icon: '📚', color: '#8b5cf6', type: 'expense', isDefault: true },
  { id: 'cat_salary', name: 'Thu nhập lương', icon: '💼', color: '#10b981', type: 'income', isDefault: true },
  { id: 'cat_other_income', name: 'Thu nhập khác', icon: '💰', color: '#14b8a6', type: 'income', isDefault: true },
  { id: 'cat_investment', name: 'Tiết kiệm & Đầu tư', icon: '💳', color: '#06b6d4', type: 'both', isDefault: true },
  { id: 'cat_gift_expense', name: 'Quà tặng & Cho biếu', icon: '🎁', color: '#f43f5e', type: 'expense', isDefault: true },
  { id: 'cat_gift_income', name: 'Được tặng & Cho', icon: '🎁', color: '#10b981', type: 'income', isDefault: true },
  { id: 'cat_repair', name: 'Sửa chữa & Bảo trì', icon: '🔧', color: '#f97316', type: 'expense', isDefault: true },
  { id: 'cat_other', name: 'Khác', icon: '❓', color: '#64748b', type: 'both', isDefault: true }
];

function getStorageKey(): string {
  try {
    const user = getStoredUser();
    return user?.id ? `tiendauroi_custom_categories_${user.id}` : 'tiendauroi_custom_categories';
  } catch {
    return 'tiendauroi_custom_categories';
  }
}

export function getCustomCategories(): CustomCategory[] {
  try {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomCategories(cats: CustomCategory[]): void {
  const key = getStorageKey();
  localStorage.setItem(key, JSON.stringify(cats));
}

export function getAllCategories(): CustomCategory[] {
  const custom = getCustomCategories();
  return [...DEFAULT_CATEGORIES, ...custom];
}

export function addCustomCategory(cat: Omit<CustomCategory, 'id' | 'isDefault'>): CustomCategory {
  const custom = getCustomCategories();
  const newCat: CustomCategory = {
    ...cat,
    id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    isDefault: false
  };
  custom.push(newCat);
  saveCustomCategories(custom);
  return newCat;
}

export function updateCustomCategory(id: string, updates: Partial<Omit<CustomCategory, 'id' | 'isDefault'>>): void {
  const custom = getCustomCategories();
  const idx = custom.findIndex(c => c.id === id);
  if (idx >= 0) {
    custom[idx] = { ...custom[idx], ...updates };
    saveCustomCategories(custom);
  }
}

export function deleteCustomCategory(id: string): void {
  const custom = getCustomCategories().filter(c => c.id !== id);
  saveCustomCategories(custom);
}
