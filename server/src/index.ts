import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDB } from './lib/db';
import authRouter from './routes/auth';
import transactionsRouter from './routes/transactions';
import statsRouter from './routes/stats';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Cấu hình middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Đăng ký các routes API ────────────────────────────────────────────────
app.use('/api/auth', authRouter);                 // Đăng ký, đăng nhập, tài khoản
app.use('/api/transactions', transactionsRouter); // Quản lý giao dịch thu chi
app.use('/api/stats', statsRouter);               // Thống kê & báo cáo

// ── Kiểm tra sức khỏe server ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', thoiGian: new Date().toISOString() });
});

// ── Phục vụ giao diện web đã build ─────────────────────────────────────────
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Khởi động server (bất đồng bộ vì initDB cần await) ────────────────────
async function khoiDong() {
  try {
    await initDB();

    app.listen(PORT, () => {
      console.log(`🚀 FinanceTracker đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Lỗi khởi động server:', err);
    process.exit(1);
  }
}

khoiDong();
