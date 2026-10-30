import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { Pool, types } from 'pg';
import path from 'path';
import fs from 'fs';

// Đảm bảo pg parse các cột NUMERIC và BIGINT thành number trong JavaScript
types.setTypeParser(1700, (val: string) => parseFloat(val));
types.setTypeParser(20, (val: string) => parseInt(val, 10));

// ── Định nghĩa Interface chung cho cả SQLite và PostgreSQL ───────────────
export interface IDatabase {
  isPostgres: boolean;
  all<T = any>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T = any>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  run(sql: string, ...params: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
  exec(sql: string): Promise<void>;
  prepare(sql: string): {
    all<T = any>(...params: unknown[]): Promise<T[]>;
    get<T = any>(...params: unknown[]): Promise<T | undefined>;
    run(...params: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
  };
}

// ── SQLite Engine (dùng khi chạy cục bộ trên máy) ─────────────────────────
class SqliteDatabase implements IDatabase {
  isPostgres = false;
  constructor(private sqlDb: SqlJsDatabase, private dbPath: string) {}

  private flatten(args: unknown[]): unknown[] {
    const res: unknown[] = [];
    for (const a of args) {
      if (Array.isArray(a)) res.push(...a);
      else res.push(a);
    }
    return res;
  }

  private normalizeRow(row: Record<string, any>): any {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Uint8Array) res[k] = Buffer.from(v).toString('utf8');
      else res[k] = v;
    }
    return res;
  }

  save(): void {
    const data = this.sqlDb.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  async all<T = any>(sql: string, ...args: unknown[]): Promise<T[]> {
    const params = this.flatten(args);
    const stmt = this.sqlDb.prepare(sql);
    if (params.length) stmt.bind(params as any[]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(this.normalizeRow(stmt.getAsObject()));
    stmt.free();
    return rows as T[];
  }

  async get<T = any>(sql: string, ...args: unknown[]): Promise<T | undefined> {
    const params = this.flatten(args);
    const stmt = this.sqlDb.prepare(sql);
    if (params.length) stmt.bind(params as any[]);
    let row: any = undefined;
    if (stmt.step()) row = this.normalizeRow(stmt.getAsObject());
    stmt.free();
    return row as T | undefined;
  }

  async run(sql: string, ...args: unknown[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const params = this.flatten(args);
    const stmt = this.sqlDb.prepare(sql);
    if (params.length) stmt.bind(params as any[]);
    stmt.step();
    stmt.free();
    const lastId = (this.sqlDb.exec('SELECT last_insert_rowid()')[0]?.values?.[0]?.[0] ?? 0) as number;
    const changes = (this.sqlDb.exec('SELECT changes()')[0]?.values?.[0]?.[0] ?? 0) as number;
    this.save();
    return { lastInsertRowid: lastId, changes };
  }

  async exec(sql: string): Promise<void> {
    this.sqlDb.exec(sql);
    this.save();
  }

  prepare(sql: string) {
    return {
      all: <T = any>(...params: unknown[]) => this.all<T>(sql, ...params),
      get: <T = any>(...params: unknown[]) => this.get<T>(sql, ...params),
      run: (...params: unknown[]) => this.run(sql, ...params)
    };
  }
}

// ── PostgreSQL Engine (dùng khi deploy lên Render / Cloud) ────────────────
class PostgresDatabase implements IDatabase {
  isPostgres = true;
  constructor(private pool: Pool) {}

  private flatten(args: unknown[]): unknown[] {
    const res: unknown[] = [];
    for (const a of args) {
      if (Array.isArray(a)) res.push(...a);
      else res.push(a);
    }
    return res;
  }

  // Chuyển dấu ? của SQLite thành $1, $2 của PostgreSQL
  private convertSql(sql: string): string {
    let i = 1;
    let converted = sql.replace(/\?/g, () => `$${i++}`);
    // Thay thế hàm lấy thời gian tương thích
    converted = converted.replace(/datetime\('now','localtime'\)/gi, 'NOW()');
    return converted;
  }

  async all<T = any>(sql: string, ...args: unknown[]): Promise<T[]> {
    const params = this.flatten(args);
    const cleanSql = this.convertSql(sql);
    const res = await this.pool.query(cleanSql, params);
    return res.rows as T[];
  }

  async get<T = any>(sql: string, ...args: unknown[]): Promise<T | undefined> {
    const rows = await this.all<T>(sql, ...args);
    return rows[0];
  }

  async run(sql: string, ...args: unknown[]): Promise<{ lastInsertRowid: number; changes: number }> {
    const params = this.flatten(args);
    let cleanSql = this.convertSql(sql);

    // Nếu là lệnh INSERT và chưa có RETURNING id, tự thêm vào để lấy lastId (trừ bảng sessions không có cột id)
    const isInsert = /^\s*INSERT\s+INTO/i.test(cleanSql);
    let addedReturningId = false;
    if (isInsert && !/RETURNING/i.test(cleanSql)) {
      if (!/INSERT\s+INTO\s+sessions\b/i.test(cleanSql)) {
        cleanSql = `${cleanSql.replace(/;\s*$/, '')} RETURNING id`;
        addedReturningId = true;
      }
    }

    const res = await this.pool.query(cleanSql, params);
    const lastId = addedReturningId ? (res.rows?.[0]?.id ?? 0) : 0;
    return { lastInsertRowid: Number(lastId), changes: res.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  prepare(sql: string) {
    return {
      all: <T = any>(...params: unknown[]) => this.all<T>(sql, ...params),
      get: <T = any>(...params: unknown[]) => this.get<T>(sql, ...params),
      run: (...params: unknown[]) => this.run(sql, ...params)
    };
  }
}

// ── Khởi tạo Database ─────────────────────────────────────────────────────
export let db: IDatabase;

export async function initDB(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

  if (databaseUrl) {
    const isNeon = databaseUrl.includes('neon.tech');
    if (isNeon) {
      console.log('⚡ Đang kết nối tới Neon Serverless Postgres Database...');
    } else {
      console.log('🐘 Đang kết nối tới PostgreSQL Database...');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Kiểm tra kết nối
    await pool.query('SELECT 1');
    console.log(`✅ Kết nối ${isNeon ? 'Neon Postgres' : 'PostgreSQL'} thành công! Dữ liệu sẽ được lưu vĩnh viễn trên đám mây.`);

    db = new PostgresDatabase(pool);
    await initPostgresTables();
  } else {
    // 📁 Dùng SQLite (khi chạy local trên máy tính)
    console.log('📁 Đang khởi tạo SQLite Database nội bộ...');
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'finance.db');

    const sqlJsDist = path.dirname(require.resolve('sql.js'));
    const SQL = await initSqlJs({
      locateFile: (file: string) => path.join(sqlJsDist, file)
    });

    let sqlDb: SqlJsDatabase;
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buf);
    } else {
      sqlDb = new SQL.Database();
    }

    db = new SqliteDatabase(sqlDb, dbPath);
    await initSqliteTables();
  }

  await seedDanhMuc();
}

// ── Bảng cho PostgreSQL ───────────────────────────────────────────────────
async function initPostgresTables(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(20) DEFAULT 'both',
      icon VARCHAR(20) DEFAULT '❓',
      keywords TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date VARCHAR(20) NOT NULL,
      type VARCHAR(20) NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month VARCHAR(10) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT '',
      amount NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      person VARCHAR(150) NOT NULL,
      amount NUMERIC NOT NULL,
      paid_amount NUMERIC NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      date VARCHAR(20) NOT NULL,
      due_date VARCHAR(20) DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      note TEXT DEFAULT '',
      day_of_month INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_generated_month VARCHAR(10) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_name VARCHAR(150) NOT NULL,
      bank_name VARCHAR(100) DEFAULT '',
      balance NUMERIC NOT NULL,
      paid_amount NUMERIC NOT NULL DEFAULT 0,
      credit_limit NUMERIC DEFAULT 0,
      due_date VARCHAR(20) NOT NULL,
      statement_day INTEGER DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credit_card_payments (
      id SERIAL PRIMARY KEY,
      card_id INTEGER NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      payment_date VARCHAR(20) NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month    ON budgets(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_debts_user            ON debts(user_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_user        ON recurring_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_user     ON credit_cards(user_id);

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at BIGINT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_otp ON password_resets(otp);
  `);
}

// ── Bảng cho SQLite ───────────────────────────────────────────────────────
async function initSqliteTables(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      salt        TEXT NOT NULL,
      name        TEXT DEFAULT '',
      avatar      TEXT DEFAULT '',
      email       TEXT DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      month       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT '',
      amount      REAL NOT NULL,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      type        TEXT NOT NULL,
      person      TEXT NOT NULL,
      amount      REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      date        TEXT NOT NULL,
      due_date    TEXT DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id              INTEGER NOT NULL,
      type                 TEXT NOT NULL,
      amount               REAL NOT NULL,
      description          TEXT NOT NULL,
      category             TEXT NOT NULL,
      note                 TEXT DEFAULT '',
      day_of_month         INTEGER NOT NULL DEFAULT 1,
      is_active            INTEGER NOT NULL DEFAULT 1,
      last_generated_month TEXT DEFAULT '',
      created_at           TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      card_name    TEXT NOT NULL,
      bank_name    TEXT DEFAULT '',
      balance      REAL NOT NULL,
      paid_amount  REAL NOT NULL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      due_date     TEXT NOT NULL,
      statement_day INTEGER DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'pending',
      note         TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_card_payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id      INTEGER NOT NULL,
      user_id      INTEGER NOT NULL,
      amount       REAL NOT NULL,
      payment_date TEXT NOT NULL,
      note         TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(card_id) REFERENCES credit_cards(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER DEFAULT 1;');
  } catch {
    // Đã tồn tại
  }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT "";');
  } catch {
    // Đã tồn tại
  }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN email TEXT DEFAULT "";');
  } catch {
    // Đã tồn tại
  }

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month    ON budgets(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_debts_user            ON debts(user_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_user        ON recurring_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_user     ON credit_cards(user_id);

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_otp ON password_resets(otp);
  `);
}

// ── Seed 10 danh mục mặc định ─────────────────────────────────────────────
async function seedDanhMuc(): Promise<void> {
  const row = await db.get<{ c: string | number }>('SELECT COUNT(*) as c FROM categories');
  if (row && Number(row.c) > 0) return;

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
    if (db.isPostgres) {
      await db.run(
        'INSERT INTO categories (name, type, icon, keywords) VALUES (?, ?, ?, ?) ON CONFLICT (name) DO NOTHING',
        dm.name, dm.type, dm.icon, JSON.stringify(dm.keywords)
      );
    } else {
      await db.run(
        'INSERT OR IGNORE INTO categories (name, type, icon, keywords) VALUES (?, ?, ?, ?)',
        dm.name, dm.type, dm.icon, JSON.stringify(dm.keywords)
      );
    }
  }

  console.log('✅ Đã tạo 10 danh mục mặc định');
}
