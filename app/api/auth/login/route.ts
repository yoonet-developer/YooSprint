import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken } from '@/lib/middleware/auth';
import { serialize } from 'cookie';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { yoonetId, username, password } = await request.json();

    if (!yoonetId || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide Yoonet ID and password' },
        { status: 400 }
      );
    }

    // Find user by yoonetId
    const user = await User.findOne({ yoonetId: yoonetId.toUpperCase() }).select('+password');

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get current login attempt data directly from database
    const userData = await User.findById(user._id).lean();
    const currentFailedAttempts = (userData as any)?.failedLoginAttempts || 0;
    const currentLockUntil = (userData as any)?.lockUntil;

    // Check if account is locked
    if (currentLockUntil && new Date(currentLockUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(currentLockUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, message: `Account is locked. Try again in ${remainingTime} minute(s)` },
        { status: 423 }
      );
    }

    // If lock has expired, reset the failed attempts
    if (currentLockUntil && new Date(currentLockUntil) <= new Date()) {
      await User.findByIdAndUpdate(user._id, {
        $set: { failedLoginAttempts: 0, lockUntil: null }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts and get new count
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, lean: true }
      );

      const newAttemptCount = (updatedUser as any)?.failedLoginAttempts || 1;

      // Lock account if max attempts reached
      if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
        await User.findByIdAndUpdate(user._id, {
          $set: { lockUntil: new Date(Date.now() + LOCK_TIME) }
        });
        return NextResponse.json(
          { success: false, message: 'Account locked due to too many failed attempts. Try again in 15 minutes' },
          { status: 423 }
        );
      }

      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - newAttemptCount;
      return NextResponse.json(
        { success: false, message: `Invalid credentials. ${attemptsRemaining} attempt(s) remaining` },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login using atomic update
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0, lockUntil: null } }
      );
    }

    // Check if user is admin/manager - they need PIN verification
    const isPrivilegedUser = ['super-admin', 'admin', 'manager'].includes(user.role);

    // Get user's PIN status
    const userWithPin = await User.findById(user._id).lean();
    const hasPin = !!(userWithPin as any)?.pin;

    console.log('Login - User role:', user.role, 'isPrivilegedUser:', isPrivilegedUser, 'hasPin:', hasPin, 'pin value:', (userWithPin as any)?.pin);

    // Generate token
    const token = generateToken(user._id.toString());

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        yoonetId: user.yoonetId,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        department: user.department,
        avatar: user.avatar,
      },
      isPrivilegedUser,
      hasPin,
    });

    // Set cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 20 * 60, // 20 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during login' },
      { status: 500 }
    );
  }
}
