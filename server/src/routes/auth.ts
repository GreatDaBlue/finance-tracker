import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// ── POST /api/auth/register (Đăng ký tài khoản) ───────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, name } = req.body as {
    username?: string;
    password?: string;
    name?: string;
  };

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanName = (name || '').trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Tên đăng nhập chỉ gồm chữ cái, số, gạch dưới (_) hoặc gạch nối (-)' });
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự' });
  }

  // Kiểm tra tên đăng nhập đã tồn tại chưa
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'Tên đăng nhập này đã có người sử dụng' });
  }

  const { hash, salt } = hashPassword(cleanPassword);
  const result = await db.prepare(`
    INSERT INTO users (username, password, salt, name)
    VALUES (?, ?, ?, ?)
  `).run(cleanUsername, hash, salt, cleanName || cleanUsername);

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
      email: ''
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
  const newEmail = email !== undefined ? email.trim() : (currentUser.email || '');

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

  if (newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
  }

  const user = await db.prepare('SELECT password, salt FROM users WHERE id = ?').get<any>(userId);
  if (!user || !verifyPassword(oldPassword.trim(), user.password, user.salt)) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  }

  const { hash, salt } = hashPassword(newPassword.trim());
  await db.prepare('UPDATE users SET password = ?, salt = ? WHERE id = ?').run(hash, salt, userId);

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
