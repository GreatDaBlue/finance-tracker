import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Mã hóa mật khẩu an toàn bằng Scrypt (chuẩn mã hóa của Node.js crypto)
 */
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Xác thực mật khẩu
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const newHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Tạo token ngẫu nhiên cho phiên đăng nhập
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware bắt buộc phải đăng nhập mới được truy cập dữ liệu
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
  }

  const token = authHeader.substring(7).trim();
  const session = db.prepare(`
    SELECT s.token, u.id, u.username, u.name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as { token: string; id: number; username: string; name: string } | undefined;

  if (!session) {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
  }

  req.user = {
    id: session.id,
    username: session.username,
    name: session.name || session.username
  };

  next();
}
