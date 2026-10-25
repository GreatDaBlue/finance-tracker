# 💰 FinanceTracker — Thống kê Thu Chi Cá Nhân

## Yêu cầu
- **Node.js v18+** — Tải tại https://nodejs.org/ (chọn LTS)

## Cài đặt lần đầu
Double-click vào file **`setup.bat`** để cài đặt tự động.

Hoặc chạy thủ công:
```bash
# Terminal 1 — Backend
cd server
npm install

# Terminal 2 — Frontend
cd client
npm install
```

## Khởi động

**Cách 1 — Double click:**
1. Double-click `start-server.bat` (chờ hiện "🚀 server running")
2. Double-click `start-client.bat`
3. Mở trình duyệt: **http://localhost:5173**

**Cách 2 — Terminal:**
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

## Cấu trúc thư mục
```
finance-tracker/
├── server/          # Backend Node.js + Express
│   ├── src/
│   │   ├── index.ts
│   │   ├── lib/
│   │   │   ├── db.ts          # SQLite setup & seed data
│   │   │   ├── classifier.ts  # Phân loại danh mục bằng keyword
│   │   │   └── dateParser.ts  # Parse ngày từ tiếng Việt
│   │   └── routes/
│   │       ├── transactions.ts
│   │       └── stats.ts
│   └── data/
│       └── finance.db         # Database (tự tạo khi chạy)
└── client/          # Frontend React + TypeScript + Vite
    └── src/
        ├── components/
        │   ├── TransactionForm.tsx
        │   ├── TransactionList.tsx
        │   ├── FilterBar.tsx
        │   └── Dashboard.tsx
        └── pages/
            └── HomePage.tsx
```

## Tính năng
- ✅ Nhập thu/chi hàng ngày
- ✅ Tự động phân loại danh mục bằng keyword tiếng Việt
- ✅ Tự động nhận diện ngày từ mô tả ("hôm qua", "23/10", ...)
- ✅ Lọc bằng ô lệnh tự nhiên ("thực phẩm từ 1/1/2026 đến nay")
- ✅ Bộ lọc UI: danh mục, khoảng ngày, loại thu/chi
- ✅ Biểu đồ tròn phân bổ chi tiêu
- ✅ Biểu đồ cột thu/chi theo ngày/tháng
- ✅ Chỉnh sửa và xóa giao dịch
- ✅ Lưu trữ bền vững qua SQLite
