import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_secret_key_12345';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { email: string; restaurantId: string; restaurantName: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { email: string; restaurantId: string; restaurantName: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && typeof decoded === 'object') {
      return {
        email: decoded.email || '',
        restaurantId: decoded.restaurantId || '',
        restaurantName: decoded.restaurantName || '',
        role: decoded.role || 'restaurant_admin',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: NextRequest): { email: string; restaurantId: string; restaurantName: string; role: string } | null {
  // Try to read from cookie first
  let token = req.cookies.get('admin_token')?.value;

  // Fallback to Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return null;
  }

  return verifyToken(token);
}
