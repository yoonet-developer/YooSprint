import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';
import dbConnect from '@/lib/db';

export async function requireAuth(request: NextRequest) {
  await dbConnect();
  const user = await verifyAuth(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}
