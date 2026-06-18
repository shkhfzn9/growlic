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

export function signToken(payload: { email: string; restaurantId: string; restaurantName: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { email: string; restaurantId: string; restaurantName: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { email: string; restaurantId: string; restaurantName: string };
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: NextRequest): { email: string; restaurantId: string; restaurantName: string } | null {
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
