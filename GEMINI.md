# Quy tắc phát triển dự án (Project Rules & Guidelines)

## 1. Nguyên tắc nghiên cứu & tham khảo
- **Đối với những chức năng chưa quen thuộc hoặc phức tạp, đừng viết từ con số 0.** Hãy chủ động tìm kiếm các dự án mã nguồn mở uy tín trên GitHub, tài liệu chuẩn và thư viện phổ biến để so sánh, đối chiếu ý tưởng, học hỏi kiến trúc tối ưu trước khi bắt tay vào triển khai.

## 2. Tiêu chuẩn mã nguồn & Trải nghiệm người dùng
- **Kiến trúc rõ ràng**: Tách biệt mạch lạc giữa Client (React, TypeScript, Tailwind CSS) và Server (Node.js, Express, Neon Postgres).
- **Trải nghiệm tối ưu**: Đảm bảo responsive mượt mà trên cả điện thoại và máy tính, hỗ trợ đầy đủ Dark Mode / Light Mode.
- **Bảo mật & Ổn định**: Không lưu khóa bí mật hoặc chuỗi kết nối nhạy cảm trực tiếp trong code, luôn tải qua biến môi trường (`.env`).
