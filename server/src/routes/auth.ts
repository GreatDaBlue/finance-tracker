import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthenticatedRequest } from '../lib/auth';

const router = Router();

// ── POST /api/auth/register (Đăng ký tài khoản) ───────────────────────────
router.post('/register', (req: Request, res: Response) => {
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
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'Tên đăng nhập này đã có người sử dụng' });
  }

  const { hash, salt } = hashPassword(cleanPassword);
  const result = db.prepare(`
    INSERT INTO users (username, password, salt, name)
    VALUES (?, ?, ?, ?)
  `).run(cleanUsername, hash, salt, cleanName || cleanUsername);

  const userId = result.lastInsertRowid;
  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);

  return res.status(201).json({
    token,
    user: {
      id: userId,
      username: cleanUsername,
      name: cleanName || cleanUsername
    }
  });
});

// ── POST /api/auth/login (Đăng nhập) ───────────────────────────────────────
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
  }

  const user = db.prepare(`
    SELECT id, username, password, salt, name
    FROM users
    WHERE username = ?
  `).get(cleanUsername) as { id: number; username: string; password: string; salt: string; name: string } | undefined;

  if (!user || !verifyPassword(cleanPassword, user.password, user.salt)) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  }

  const token = generateToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name || user.username
    }
  });
});

// ── GET /api/auth/me (Lấy thông tin tài khoản hiện tại) ────────────────────
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// ── POST /api/auth/logout (Đăng xuất) ─────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  return res.json({ success: true });
});

export default router;
