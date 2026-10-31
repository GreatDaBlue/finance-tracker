import dotenv from 'dotenv';
import path from 'path';

// Nạp biến môi trường từ .env.local và .env ở cả thư mục gốc dự án và thư mục server
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import fs from 'fs';
import { initDB } from './lib/db';
import authRouter from './routes/auth';
import transactionsRouter from './routes/transactions';
import statsRouter from './routes/stats';
import budgetsRouter from './routes/budgets';
import debtsRouter from './routes/debts';
import recurringRouter from './routes/recurring';
import creditCardsRouter from './routes/creditCards';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Cấu hình middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Đăng ký các routes API ────────────────────────────────────────────────
app.use('/api/auth', authRouter);                 // Đăng ký, đăng nhập, tài khoản
app.use('/api/transactions', transactionsRouter); // Quản lý giao dịch thu chi
app.use('/api/stats', statsRouter);               // Thống kê & báo cáo
app.use('/api/budgets', budgetsRouter);           // Quản lý ngân sách & cảnh báo chi tiêu
app.use('/api/debts', debtsRouter);               // Quản lý sổ nợ (không tính vào thu chi)
app.use('/api/recurring', recurringRouter);       // Quản lý khoản chi lặp lại định kỳ
app.use('/api/credit-cards', creditCardsRouter);   // Quản lý nợ thẻ tín dụng

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

// ── Error handling middleware bắt mọi lỗi async và DB ───────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ [Unhandled Server Error]:', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err?.message || 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [Unhandled Rejection]:', reason, 'at:', promise);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});

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
