import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VerificationCode from '@/lib/models/VerificationCode';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email, userId, userName, department } = body;

    if (!email || !userId || !userName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing pending codes for this user
    await VerificationCode.deleteMany({ userId, status: 'pending' });

    // Save the new verification code
    await VerificationCode.create({
      userId,
      userName,
      userEmail: email,
      department: department || '',
      code,
      status: 'pending',
    });

    console.log(`Verification code for ${userName} (${email}): ${code}`);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      code
    });
  } catch (error: any) {
    console.error('Send verification code error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
