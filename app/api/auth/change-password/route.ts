import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { verifyAuth } from '@/lib/middleware/auth';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Password confirmation does not match' },
        { status: 400 }
      );
    }

    // Get user with password
    const userWithPassword = await User.findById(user._id).select('+password');

    if (!userWithPassword) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isMatch = await userWithPassword.comparePassword(currentPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during password change' },
      { status: 500 }
    );
  }
}
