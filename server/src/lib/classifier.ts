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
async function layDanhMuc(): Promise<Category[]> {
  const rows = await db.prepare('SELECT * FROM categories').all<{
    id: number; name: string; type: string; icon: string; keywords: string | string[];
  }>();

  return rows.map(r => ({
    ...r,
    keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : (r.keywords || [])
  }));
}

/**
 * Phân loại một giao dịch vào danh mục phù hợp dựa trên từ khóa.
 */
export async function classify(description: string, type: 'income' | 'expense'): Promise<string> {
  const trimmed = description.trim();

  // Nhận diện Quà tặng / Cho biếu & Tiền được cho:
  if (type === 'income') {
    if (
      /^(?:được|nhận)\s+(?:(?:tiền\s+)?(?:thừa|thối|dư\s+)?(?:cho|tặng|lì xì|biếu|thưởng)|quà)/iu.test(trimmed) ||
      /^(?:tiền\s+)?(?:thừa|thối|dư|bo|tip)\b/iu.test(trimmed) ||
      /\bkhách\s+(?:bo|tip|cho|tặng)\b/iu.test(trimmed) ||
      /(?:^(?:tiền(?:\s+(?:thừa|thối|dư))?\s+)?|(?:^được\s+))[^\d,.;]+?\s+(?:cho|lì xì|tặng|biếu|thưởng)/iu.test(trimmed)
    ) {
      if (/^(?:tiền\s+)?(?:bo|tip)\b/iu.test(trimmed) || /\bkhách\s+(?:bo|tip)\b/iu.test(trimmed)) {
        return 'Thu nhập khác';
      }
      return 'Được tặng & Cho';
    }
  } else {
    if (/^(?:tôi\s+|mình\s+|tao\s+)?(?:cho(?:\s+tiền)?|biếu|tặng|lì xì|mừng|từ thiện)\b/iu.test(trimmed)) {
      return 'Quà tặng & Cho biếu';
    }
  }

  // Ưu tiên các từ khóa thông dụng theo yêu cầu chuẩn:
  if (/(?:^|[^\p{L}\p{N}])(cơm|phở|trà sữa|cafe|cà phê|ăn|uống|bún|bánh|mì|cháo|thịt|cá|rau|lẩu|nướng|buffet|chợ|siêu thị)(?:[^\p{L}\p{N}]|$)/iu.test(description)) {
    return 'Ăn uống';
  }
  if (/(?:^|[^\p{L}\p{N}])(xăng|xe|gửi xe|đổ xăng|bãi xe|đậu xe|rửa xe|sửa xe|thay nhớt|grab|taxi|bus)(?:[^\p{L}\p{N}]|$)/iu.test(description)) {
    return 'Xe cộ';
  }
  if (/(?:^|[^\p{L}\p{N}])(gym|thuốc|mua thuốc|khám|bệnh viện|bác sĩ|nha khoa|răng|fitness|yoga|spa)(?:[^\p{L}\p{N}]|$)/iu.test(description)) {
    return 'Sức khỏe';
  }

  const text = chuanHoaVanBan(description);
  const danhMucList = await layDanhMuc();

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
 * Lấy icon trực quan của một danh mục theo tên (đồng bộ).
 */
export function layIconDanhMucSync(tenDanhMuc: string): string {
  if (!tenDanhMuc) return '🏷️';
  if (/Ăn uống|Thực phẩm/i.test(tenDanhMuc)) return '🍜';
  if (/Xe cộ|Di chuyển|Xăng/i.test(tenDanhMuc)) return '🛵';
  if (/Sức khỏe|Y tế/i.test(tenDanhMuc)) return '💊';
  if (/Nhà/i.test(tenDanhMuc)) return '🏠';
  if (/Mua sắm|Giải trí/i.test(tenDanhMuc)) return '🛍️';
  if (/Giáo dục|Học/i.test(tenDanhMuc)) return '📚';
  if (/Lương/i.test(tenDanhMuc)) return '💵';
  if (/Quà|Tặng|Cho|Biếu/i.test(tenDanhMuc)) return '🎁';
  if (/Thu nhập/i.test(tenDanhMuc)) return '💰';
  if (/Tiết kiệm|Đầu tư/i.test(tenDanhMuc)) return '📈';
  if (/Sửa chữa|Bảo trì/i.test(tenDanhMuc)) return '🔧';
  return '🏷️';
}

/**
 * Lấy icon của một danh mục theo tên.
 */
export async function layIconDanhMuc(tenDanhMuc: string): Promise<string> {
  const syncIcon = layIconDanhMucSync(tenDanhMuc);
  if (syncIcon !== '🏷️') return syncIcon;
  const row = await db.prepare('SELECT icon FROM categories WHERE name = ?').get<{ icon: string }>(tenDanhMuc);
  return row?.icon ?? '🏷️';
}

const CATEGORY_GROUPS: { canonical: string; aliases: string[] }[] = [
  {
    canonical: 'Ăn uống',
    aliases: ['Ăn uống', 'Thực phẩm & Ăn uống', 'Thực phẩm', 'Đồ ăn', 'Tiền ăn', 'Ăn sáng', 'Ăn trưa', 'Ăn tối', 'Ăn vặt']
  },
  {
    canonical: 'Xe cộ & Đi lại',
    aliases: ['Xe cộ & Đi lại', 'Xe cộ', 'Di chuyển & Xăng xe', 'Xăng xe', 'Di chuyển', 'Đi lại', 'Xăng', 'Gửi xe']
  },
  {
    canonical: 'Sức khỏe & Y tế',
    aliases: ['Sức khỏe & Y tế', 'Sức khỏe', 'Y tế & Sức khỏe', 'Y tế', 'Thuốc men', 'Khám bệnh']
  },
  {
    canonical: 'Nhà cửa & Hóa đơn',
    aliases: ['Nhà cửa & Hóa đơn', 'Nhà cửa', 'Nhà ở & Tiện ích', 'Nhà ở', 'Tiền nhà', 'Điện nước', 'Hóa đơn']
  },
  {
    canonical: 'Mua sắm & Giải trí',
    aliases: ['Mua sắm & Giải trí', 'Giải trí & Mua sắm', 'Mua sắm', 'Giải trí', 'Mua sắm giải trí']
  },
  {
    canonical: 'Giáo dục & Học tập',
    aliases: ['Giáo dục & Học tập', 'Giáo dục', 'Học tập', 'Học phí', 'Sách vở']
  },
  {
    canonical: 'Thu nhập lương',
    aliases: ['Thu nhập lương', 'Lương', 'Tiền lương', 'Thu nhập từ lương']
  },
  {
    canonical: 'Quà tặng & Cho biếu',
    aliases: ['Quà tặng & Cho biếu', 'Quà tặng', 'Cho biếu', 'Biếu tặng', 'Lì xì', 'Từ thiện', 'Mừng cưới']
  },
  {
    canonical: 'Được tặng & Cho',
    aliases: ['Được tặng & Cho', 'Được cho', 'Được tặng', 'Lì xì nhận']
  },
  {
    canonical: 'Thu nhập khác',
    aliases: ['Thu nhập khác', 'Thưởng', 'Tiền thưởng', 'Trúng thưởng', 'Thu nhập ngoài']
  },
  {
    canonical: 'Tiết kiệm & Đầu tư',
    aliases: ['Tiết kiệm & Đầu tư', 'Đầu tư', 'Tiết kiệm', 'Đầu tư & Tiết kiệm']
  },
  {
    canonical: 'Sửa chữa & Bảo trì',
    aliases: ['Sửa chữa & Bảo trì', 'Bảo trì', 'Sửa chữa', 'Bảo dưỡng']
  },
  {
    canonical: 'Khác',
    aliases: ['Khác']
  }
];

/**
 * Trả về danh sách tất cả các tên gọi tương đương của một danh mục.
 * Ví dụ:
 *   "Thực phẩm & Ăn uống" -> ["Thực phẩm & Ăn uống", "Ăn uống", "Thực phẩm", "Đồ ăn", ...]
 *   "Ăn uống"            -> ["Ăn uống", "Thực phẩm & Ăn uống", "Thực phẩm", "Đồ ăn", ...]
 */
export function getEquivalentCategories(categoryName: string): string[] {
  if (!categoryName) return [];
  const trimmed = categoryName.trim();
  const lower = trimmed.toLowerCase();

  for (const group of CATEGORY_GROUPS) {
    const isMatch = group.aliases.some(item => item.toLowerCase() === lower);
    if (isMatch) {
      // Đảm bảo tên danh mục gốc được xếp đầu tiên
      const remaining = group.aliases.filter(item => item.toLowerCase() !== lower);
      return [trimmed, ...remaining];
    }
  }

  return [trimmed];
}

/**
 * Quy đổi một tên danh mục bất kỳ về tên danh mục chuẩn (Canonical Category).
 * Giúp gom nhóm thống kê, biểu đồ không bị phân tách nhỏ lẻ.
 */
export function getCanonicalCategory(categoryName: string): string {
  if (!categoryName) return 'Khác';
  const trimmed = categoryName.trim();
  const lower = trimmed.toLowerCase();

  for (const group of CATEGORY_GROUPS) {
    if (group.aliases.some(item => item.toLowerCase() === lower)) {
      return group.canonical;
    }
  }

  return trimmed;
}

function chuanHoaVanBan(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[,.\-_!?]/g, ' ')
    .trim();
}
