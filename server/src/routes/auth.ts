import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../lib/db';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthenticatedRequest } from '../lib/auth';
import { sendPasswordResetOtp } from '../lib/mailer';

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'email của bạn';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

// ── POST /api/auth/register (Đăng ký tài khoản) ───────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, name, email } = req.body as {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
  };

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Tên đăng nhập chỉ gồm chữ cái, số, gạch dưới (_) hoặc gạch nối (-)' });
  }

  if (!cleanPassword || cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
  }

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Địa chỉ Gmail không đúng định dạng (ví dụ: yourname@gmail.com)' });
  }

  // Kiểm tra tên đăng nhập đã tồn tại chưa
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'Tên đăng nhập này đã có người sử dụng' });
  }

  // Kiểm tra email nếu có
  if (cleanEmail) {
    const existingEmail = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Địa chỉ email này đã được liên kết với một tài khoản khác' });
    }
  }

  const { hash, salt } = hashPassword(cleanPassword);
  const result = await db.prepare(`
    INSERT INTO users (username, password, salt, name, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanUsername, hash, salt, cleanName || cleanUsername, cleanEmail);

  const userId = result.lastInsertRowid;
  const token = generateToken();
  await db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);

  return res.status(201).json({
    token,
    user: {
      id: userId,
      username: cleanUsername,
      name: cleanName || cleanUsername,
      avatar: '',
      email: cleanEmail
    }
  });
});

// ── POST /api/auth/login (Đăng nhập) ───────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
  }

  const user = await db.prepare(`
    SELECT id, username, password, salt, name, avatar, email
    FROM users
    WHERE username = ?
  `).get<{ id: number; username: string; password: string; salt: string; name: string; avatar?: string; email?: string }>(cleanUsername);

  if (!user || !verifyPassword(cleanPassword, user.password, user.salt)) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  }

  const token = generateToken();
  await db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name || user.username,
      avatar: user.avatar || '',
      email: user.email || ''
    }
  });
});

// ── GET /api/auth/me (Lấy thông tin tài khoản hiện tại) ────────────────────
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// ── PUT /api/auth/profile (Cập nhật tên, avatar, email) ───────────────────
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, avatar, email } = req.body as {
    name?: string;
    avatar?: string;
    email?: string;
  };

  const currentUser = await db.prepare('SELECT * FROM users WHERE id = ?').get<any>(userId);
  if (!currentUser) {
    return res.status(404).json({ error: 'Người dùng không tồn tại' });
  }

  const newName = name !== undefined ? name.trim() : (currentUser.name || currentUser.username);
  const newAvatar = avatar !== undefined ? avatar.trim() : (currentUser.avatar || '');
  const newEmail = email !== undefined ? email.trim().toLowerCase() : (currentUser.email || '');

  if (newEmail && !isValidEmail(newEmail)) {
    return res.status(400).json({ error: 'Địa chỉ Gmail không đúng định dạng (ví dụ: yourname@gmail.com)' });
  }

  // Nếu thay đổi email, kiểm tra xem email này đã thuộc về tài khoản khác chưa
  if (newEmail && newEmail !== (currentUser.email || '').toLowerCase()) {
    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?').get(newEmail, userId);
    if (existing) {
      return res.status(400).json({ error: 'Địa chỉ email này đã được liên kết với một tài khoản khác' });
    }
  }

  await db.prepare(`
    UPDATE users
    SET name = ?, avatar = ?, email = ?
    WHERE id = ?
  `).run(newName, newAvatar, newEmail, userId);

  const updated = await db.prepare(`
    SELECT id, username, name, avatar, email
    FROM users
    WHERE id = ?
  `).get<any>(userId);

  return res.json({
    user: {
      id: updated.id,
      username: updated.username,
      name: updated.name || updated.username,
      avatar: updated.avatar || '',
      email: updated.email || ''
    }
  });
});

// ── POST /api/auth/forgot-password (Yêu cầu gửi OTP lấy lại mật khẩu) ─────
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { identifier } = req.body as { identifier?: string };
  const cleanIdentifier = (identifier || '').trim().toLowerCase();

  if (!cleanIdentifier) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập hoặc địa chỉ Gmail đã liên kết' });
  }

  // Tìm user theo username hoặc email
  const user = await db.prepare(`
    SELECT id, username, email, name
    FROM users
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get<{ id: number; username: string; email: string; name: string }>(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng với tên đăng nhập hoặc email này' });
  }

  if (!user.email || !isValidEmail(user.email)) {
    return res.status(400).json({
      error: `Tài khoản "@${user.username}" chưa liên kết địa chỉ Gmail để khôi phục mật khẩu. Vui lòng liên hệ quản trị viên để được hỗ trợ.`
    });
  }

  // Tạo mã OTP ngẫu nhiên 6 chữ số bằng crypto an toàn
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 phút hiệu lực

  // Lưu OTP vào bảng password_resets
  await db.prepare(`
    INSERT INTO password_resets (user_id, email, otp, expires_at, used, attempts)
    VALUES (?, ?, ?, ?, 0, 0)
  `).run(user.id, user.email, otp, expiresAt);

  // Gửi email qua mailer
  const mailResult = await sendPasswordResetOtp(user.email, otp, user.name || user.username);
  if (!mailResult.success) {
    return res.status(500).json({
      error: mailResult.error || 'Không thể gửi email lúc này. Vui lòng thử lại sau giây lát hoặc liên hệ hỗ trợ.'
    });
  }

  const isDev = process.env.NODE_ENV !== 'production';

  return res.json({
    success: true,
    message: `Mã OTP đã được gửi về Gmail ${maskEmail(user.email)}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam).`,
    maskedEmail: maskEmail(user.email),
    identifier: user.username,
    simulated: isDev ? mailResult.simulated : undefined,
    simulatedOtp: isDev ? mailResult.simulatedOtp : undefined
  });
});

// ── POST /api/auth/reset-password (Xác nhận OTP và đổi mật khẩu mới) ───────
router.post('/reset-password', async (req: Request, res: Response) => {
  const { identifier, otp, newPassword } = req.body as {
    identifier?: string;
    otp?: string;
    newPassword?: string;
  };

  const cleanIdentifier = (identifier || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim();
  const cleanPassword = (newPassword || '').trim();

  if (!cleanIdentifier || !cleanOtp || !cleanPassword) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin: tài khoản, mã OTP và mật khẩu mới' });
  }

  if (cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
  }

  const user = await db.prepare(`
    SELECT id, username, email, name, avatar
    FROM users
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get<{ id: number; username: string; email: string; name: string; avatar: string }>(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(404).json({ error: 'Tài khoản không tồn tại' });
  }

  const now = Date.now();
  const resetRecord = await db.prepare(`
    SELECT id, otp, expires_at, used, attempts
    FROM password_resets
    WHERE user_id = ?
    ORDER BY id DESC LIMIT 1
  `).get<{ id: number; otp: string; expires_at: number | string; used: number | boolean; attempts: number }>(user.id);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Không tìm thấy yêu cầu đặt lại mật khẩu hợp lệ. Vui lòng gửi lại yêu cầu mới.' });
  }

  if (Number(resetRecord.attempts || 0) >= 5) {
    return res.status(400).json({ error: 'Mã xác thực đã bị khóa do nhập sai quá 5 lần. Vui lòng gửi lại yêu cầu mã OTP mới.' });
  }

  if (resetRecord.used === 1 || resetRecord.used === true) {
    return res.status(400).json({ error: 'Mã xác thực này đã được sử dụng. Vui lòng yêu cầu mã mới.' });
  }

  if (Number(resetRecord.expires_at) < now) {
    return res.status(400).json({ error: 'Mã xác thực đã hết hạn (hiệu lực 15 phút). Vui lòng yêu cầu mã mới.' });
  }

  if (resetRecord.otp !== cleanOtp) {
    const newAttempts = (Number(resetRecord.attempts) || 0) + 1;
    await db.prepare('UPDATE password_resets SET attempts = ? WHERE id = ?').run(newAttempts, resetRecord.id);
    const remaining = Math.max(0, 5 - newAttempts);
    return res.status(400).json({
      error: `Mã xác thực OTP không chính xác. Bạn còn ${remaining} lần thử.`
    });
  }

  // Đánh dấu mã OTP đã được sử dụng
  await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

  // Cập nhật mật khẩu mới
  const { hash, salt } = hashPassword(cleanPassword);
  await db.prepare('UPDATE users SET password = ?, salt = ? WHERE id = ?').run(hash, salt, user.id);

  // Thu hồi các phiên đăng nhập cũ để bảo mật (Lỗi #30)
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  // Tạo phiên đăng nhập mới duy nhất
  const token = generateToken();
  await db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  return res.json({
    success: true,
    message: 'Đặt lại mật khẩu thành công! Bạn đã được tự động đăng nhập.',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name || user.username,
      avatar: user.avatar || '',
      email: user.email || ''
    }
  });
});

// ── PUT /api/auth/change-password (Đổi mật khẩu) ──────────────────────────
router.put('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { oldPassword, newPassword } = req.body as {
    oldPassword?: string;
    newPassword?: string;
  };

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập cả mật khẩu cũ và mật khẩu mới' });
  }

  if (newPassword.trim().length < 8) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
  }

  const user = await db.prepare('SELECT password, salt FROM users WHERE id = ?').get<any>(userId);
  if (!user || !verifyPassword(oldPassword.trim(), user.password, user.salt)) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }

  const { hash, salt } = hashPassword(newPassword.trim());
  await db.prepare('UPDATE users SET password = ?, salt = ? WHERE id = ?').run(hash, salt, userId);

  // Thu hồi các phiên khác ngoại trừ phiên hiện tại (Lỗi #30)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const currentToken = authHeader.substring(7).trim();
    await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, currentToken);
  }

  return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
});

// ── POST /api/auth/logout (Đăng xuất) ─────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  return res.json({ success: true });
});

export default router;
