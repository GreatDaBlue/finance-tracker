import { db } from './db';

// Kiểu dữ liệu cho một danh mục
interface Category {
  id: number;
  name: string;
  type: string;   // 'income' | 'expense' | 'both'
  icon: string;
  keywords: string[];
}

// Lấy tất cả danh mục từ database
function layDanhMuc(): Category[] {
  const rows = db.prepare('SELECT * FROM categories').all() as Array<{
    id: number; name: string; type: string; icon: string; keywords: string;
  }>;
  return rows.map(r => ({ ...r, keywords: JSON.parse(r.keywords) as string[] }));
}

/**
 * Phân loại một giao dịch vào danh mục phù hợp dựa trên từ khóa.
 *
 * Ưu tiên:
 *  1. Danh mục cùng loại (thu hoặc chi) → đối chiếu từ khóa
 *  2. Danh mục loại khác → đối chiếu từ khóa
 *  3. Không khớp → trả về 'Khác'
 */
export function classify(description: string, type: 'income' | 'expense'): string {
  const text = chuanHoaVanBan(description);
  const danhMucList = layDanhMuc();

  // Ưu tiên danh mục cùng loại trước
  const cuungLoai = danhMucList.filter(c => c.type === type || c.type === 'both');
  const khacLoai  = danhMucList.filter(c => c.type !== type && c.type !== 'both');

  for (const cat of [...cuungLoai, ...khacLoai]) {
    for (const kw of cat.keywords) {
      if (text.includes(chuanHoaVanBan(kw))) {
        return cat.name;
      }
    }
  }

  return 'Khác';
}

/**
 * Lấy icon của một danh mục theo tên.
 */
export function layIconDanhMuc(tenDanhMuc: string): string {
  const row = db.prepare('SELECT icon FROM categories WHERE name = ?').get(tenDanhMuc) as
    { icon: string } | undefined;
  return row?.icon ?? '❓';
}

// Chuẩn hóa văn bản: chữ thường, bỏ dấu câu thừa
function chuanHoaVanBan(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[,.\-_!?]/g, ' ')
    .trim();
}
