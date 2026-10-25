import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

// ── Đường dẫn lưu file database ───────────────────────────────────────────
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const DB_PATH = path.join(dataDir, 'finance.db');

// ── Wrapper tương thích với API better-sqlite3 ────────────────────────────
// Mục đích: giữ nguyên code routes, chỉ thay đổi phần lõi database
export class DB {
  constructor(private sqlDb: SqlJsDatabase) {}

  /**
   * Chuẩn bị một câu lệnh SQL có thể tái sử dụng.
   * Trả về object có 3 phương thức: all(), get(), run()
   */
  prepare(sql: string) {
    const sqlDb  = this.sqlDb;
    const saveDB = () => this.save();

    return {
      // Lấy TẤT CẢ kết quả → mảng object
      all(...args: unknown[]): any[] {
        const params = lamPhangThamSo(args);
        const stmt   = sqlDb.prepare(sql);
        if (params.length) stmt.bind(params as any[]);
        const rows: any[] = [];
        while (stmt.step()) rows.push(chuanHoaHang(stmt.getAsObject()));
        stmt.free();
        return rows;
      },

      // Lấy KẾT QUẢ ĐẦU TIÊN → object hoặc undefined
      get(...args: unknown[]): any | undefined {
        const params = lamPhangThamSo(args);
        const stmt   = sqlDb.prepare(sql);
        if (params.length) stmt.bind(params as any[]);
        let hang: any = undefined;
        if (stmt.step()) hang = chuanHoaHang(stmt.getAsObject());
        stmt.free();
        return hang;
      },

      // Thực thi lệnh thay đổi dữ liệu (INSERT / UPDATE / DELETE)
      run(...args: unknown[]): { lastInsertRowid: number; changes: number } {
        const params = lamPhangThamSo(args);
        const stmt   = sqlDb.prepare(sql);
        if (params.length) stmt.bind(params as any[]);
        stmt.step();
        stmt.free();

        // Lấy ID vừa insert và số hàng bị thay đổi
        const lastId  = (sqlDb.exec('SELECT last_insert_rowid()')[0]?.values?.[0]?.[0] ?? 0) as number;
        const changes = (sqlDb.exec('SELECT changes()')[0]?.values?.[0]?.[0] ?? 0) as number;

        // Lưu vào file sau mỗi thao tác ghi
        saveDB();
        return { lastInsertRowid: lastId, changes };
      }
    };
  }

  // Thực thi nhiều câu SQL một lúc (dùng cho CREATE TABLE, v.v.)
  exec(sql: string): void {
    this.sqlDb.exec(sql);
  }

  // Cài đặt PRAGMA (bỏ qua nếu không hỗ trợ)
  pragma(sql: string): void {
    try { this.sqlDb.run(`PRAGMA ${sql}`); } catch { /* bỏ qua */ }
  }

  // Lưu toàn bộ database vào file .db
  save(): void {
    const data = this.sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Biến db được export, sẽ được gán sau khi initDB() hoàn thành
export let db: DB;

/**
 * Khởi tạo database (bất đồng bộ do sql.js cần load file WASM).
 * Phải gọi hàm này và await trước khi server nhận request.
 */
export async function initDB(): Promise<void> {
  // Tìm file WASM của sql.js trong node_modules
  const sqlJsDist = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(sqlJsDist, file)
  });

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    // Tải database đã tồn tại từ file
    console.log('📂 Đang tải database từ file...');
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
  } else {
    // Tạo database mới
    console.log('🆕 Đang tạo database mới...');
    sqlDb = new SQL.Database();
  }

  db = new DB(sqlDb);
  db.pragma('foreign_keys = ON');

  taoTables();
  seedDanhMuc();
}

// ── Tạo bảng dữ liệu ──────────────────────────────────────────────────────

function taoTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      salt        TEXT NOT NULL,
      name        TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL UNIQUE,
      type     TEXT NOT NULL DEFAULT 'both',
      icon     TEXT NOT NULL DEFAULT '❓',
      keywords TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER DEFAULT 1,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL,
      amount      REAL NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL,
      note        TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Đảm bảo cột user_id tồn tại cho database cũ đã tạo trước đó
  try {
    db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER DEFAULT 1;');
  } catch {
    // Cột đã tồn tại
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  `);
}

// ── Tạo dữ liệu danh mục mặc định ────────────────────────────────────────

function seedDanhMuc(): void {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number };
  if (c > 0) return; // Đã có danh mục rồi, không cần tạo lại

  const insert = db.prepare(
    'INSERT OR IGNORE INTO categories (name, type, icon, keywords) VALUES (?, ?, ?, ?)'
  );

  const danhMuc = [
    {
      name: 'Thực phẩm & Ăn uống', type: 'expense', icon: '🍔',
      keywords: [
        'ăn','cơm','phở','bún','bánh','thịt','rau','cá','tôm','trứng',
        'cafe','coffee','trà','nước','sinh tố','kem','bim bim','snack',
        'siêu thị','chợ','winmart','coopmart','bigc','lotte','mm mega',
        'grab food','baemin','shopeefood','now','gofood',
        'nhà hàng','quán','buffet','lẩu','nướng','hải sản',
        'highlands','starbucks','the coffee house','phúc long',
        'pizza','burger','kfc','mcdonalds','lotteria','jollibee'
      ]
    },
    {
      name: 'Nhà ở & Tiện ích', type: 'expense', icon: '🏠',
      keywords: [
        'tiền nhà','thuê nhà','phòng trọ','chung cư','nhà ở',
        'điện','tiền điện','evn','hóa đơn điện',
        'nước','tiền nước','hóa đơn nước',
        'internet','wifi','fpt','viettel home','vnpt','sctv',
        'gas','bình gas','gas lỏng',
        'vệ sinh','rác','phí dịch vụ','quản lý chung cư',
        'nội thất','đồ gia dụng','chăn ga gối đệm'
      ]
    },
    {
      name: 'Di chuyển & Xăng xe', type: 'expense', icon: '🚗',
      keywords: [
        'xăng','đổ xăng','nhiên liệu',
        'grab','be','gojek','taxi','xe ôm','uber',
        'bus','xe buýt','xe khách','tàu','metro','vé tàu','vé xe','vé máy bay',
        'gửi xe','đậu xe','bãi xe','parking',
        'sửa xe','đăng kiểm','bảo hiểm xe','phí đường','vé cầu đường',
        'thuê xe','thuê ô tô','thuê xe máy','grab car','grabbike'
      ]
    },
    {
      name: 'Y tế & Sức khỏe', type: 'expense', icon: '🏥',
      keywords: [
        'thuốc','mua thuốc','nhà thuốc','pharmacy','long châu','pharmacity','guardian',
        'bệnh viện','phòng khám','khám bệnh','bác sĩ','nha sĩ','nha khoa',
        'xét nghiệm','siêu âm','chụp x-quang','phẫu thuật',
        'vitamin','thực phẩm chức năng','bổ sung',
        'gym','thể dục','yoga','fitness','phòng tập','zumba',
        'spa','massage','làm đẹp','tóc','cắt tóc','salon',
        'bảo hiểm y tế','bhyt'
      ]
    },
    {
      name: 'Giải trí & Mua sắm', type: 'expense', icon: '🎬',
      keywords: [
        'shopee','lazada','tiki','sendo','amazon','ebay',
        'quần áo','áo','quần','váy','giày','dép','túi','thắt lưng','phụ kiện',
        'điện thoại','máy tính','laptop','tablet','tai nghe','phụ kiện điện tử',
        'cinema','rạp phim','cgv','lotte cinema','galaxy cinema','bhd','cinestar',
        'netflix','youtube premium','spotify','apple music','game','steam',
        'du lịch','khách sạn','resort','tour','vé tham quan',
        'karaoke','bar','pub','club','nightclub',
        'mỹ phẩm','son môi','kem dưỡng','serum','nước hoa'
      ]
    },
    {
      name: 'Giáo dục', type: 'expense', icon: '📚',
      keywords: [
        'học phí','học','trường','đại học','cao đẳng','trung học',
        'khóa học','course','udemy','coursera','edx','kyna','unica',
        'sách','giáo trình','tài liệu','stationery','văn phòng phẩm',
        'gia sư','luyện thi','học thêm','tiếng anh','tiếng nhật','tiếng hàn',
        'chứng chỉ','thi toeic','thi ielts','thi toefl'
      ]
    },
    {
      name: 'Thu nhập lương', type: 'income', icon: '💼',
      keywords: [
        'lương','salary','tiền lương','lương tháng','lương cơ bản',
        'thưởng','bonus','thưởng tết','thưởng kpi','thưởng dự án',
        'phụ cấp','allowance','trợ cấp','hỗ trợ','tiền xăng','tiền cơm'
      ]
    },
    {
      name: 'Thu nhập khác', type: 'income', icon: '💰',
      keywords: [
        'freelance','dự án','project','cộng tác','hợp đồng',
        'đầu tư','cổ tức','lợi nhuận','profit','lãi',
        'bán hàng','bán đồ','thanh lý','cho thuê',
        'trúng thưởng','quà tặng','nhận tiền','chuyển tiền nhận',
        'hoàn tiền','cashback','refund'
      ]
    },
    {
      name: 'Tiết kiệm & Đầu tư', type: 'expense', icon: '💳',
      keywords: [
        'tiết kiệm','gửi tiết kiệm','tiết kiệm ngân hàng','gửi ngân hàng',
        'mua vàng','vàng sjc','vàng nhẫn',
        'chứng khoán','cổ phiếu','trái phiếu','mua cổ phiếu',
        'crypto','bitcoin','ethereum','usdt','coin',
        'quỹ đầu tư','mfund','tcbf',
        'bảo hiểm nhân thọ','manulife','prudential','dai-ichi','aia'
      ]
    },
    {
      name: 'Sửa chữa & Bảo trì', type: 'expense', icon: '🔧',
      keywords: [
        'sửa chữa','sửa','thay thế','bảo trì','bảo dưỡng','maintain',
        'sửa điện','sửa nước','sửa máy','sửa máy lạnh','sửa tủ lạnh',
        'thợ','thợ điện','thợ nước','thợ hàn',
        'linh kiện','phụ tùng','vật tư','thiết bị'
      ]
    }
  ];

  for (const dm of danhMuc) {
    insert.run(dm.name, dm.type, dm.icon, JSON.stringify(dm.keywords));
  }
  // Lưu sau khi seed xong
  db.save();
  console.log('✅ Đã tạo 10 danh mục mặc định');
}

// ── Hàm hỗ trợ ────────────────────────────────────────────────────────────

// Làm phẳng mảng tham số (xử lý trường hợp spread array hoặc giá trị lẻ)
function lamPhangThamSo(args: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) result.push(...arg);
    else result.push(arg);
  }
  return result;
}

// Chuẩn hóa một hàng kết quả từ sql.js
function chuanHoaHang(row: Record<string, any>): any {
  const ketQua: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    // Chuyển Uint8Array (BLOB) thành string nếu cần
    if (val instanceof Uint8Array) {
      ketQua[key] = Buffer.from(val).toString('utf8');
    } else {
      ketQua[key] = val;
    }
  }
  return ketQua;
}
