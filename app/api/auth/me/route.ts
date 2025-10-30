import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
