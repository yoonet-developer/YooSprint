import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, pin } = await request.json();

    if (!userId || !pin) {
      return NextResponse.json(
        { success: false, message: 'User ID and PIN are required' },
        { status: 400 }
      );
    }

    // Find user with PIN
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a PIN set
    if (!user.pin) {
      return NextResponse.json(
        { success: false, message: 'No PIN set for this account' },
        { status: 400 }
      );
    }

    // Verify PIN (direct comparison since PIN is stored as plain text for simplicity)
    if (user.pin !== pin) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PIN verified successfully',
    });
  } catch (error) {
    console.error('PIN verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during PIN verification' },
      { status: 500 }
    );
  }
}
