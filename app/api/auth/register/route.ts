import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { generateToken, verifyAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { username, name, password, role, position } = await request.json();

    // Validation
    if (!username || !name || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide username, name, and password' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if any users exist
    const userCount = await User.countDocuments();

    // If users exist, require admin authentication
    if (userCount > 0) {
      const user = await verifyAuth(request);

      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Only administrators can add new users' },
          { status: 403 }
        );
      }
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: 'Username already taken' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await User.create({
      username,
      name,
      email: '',
      password,
      role: role || 'member',
      position: position || 'Team Member',
    });

    // Generate token
    const token = generateToken(newUser._id.toString());

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        position: newUser.position,
      },
    }, { status: 201 });

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
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during registration' },
      { status: 500 }
    );
  }
}
