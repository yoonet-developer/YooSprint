import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import User from '@/lib/models/User';

export interface AuthenticatedRequest extends NextRequest {
  user?: any;
}

export async function verifyAuth(request: NextRequest) {
  let token: string | null = null;

  // Check for token in cookies
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    token = cookieToken;
  }

  // Check for token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id);
    return user;
  } catch (error) {
    return null;
  }
}

export function generateToken(id: string): string {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '20m',
  });
}
