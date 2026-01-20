import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed', 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse('File too large. Maximum size is 5MB', 400);
    }

    // Check permissions
    const targetUserId = userId || currentUser._id.toString();
    if (targetUserId !== currentUser._id.toString() &&
        currentUser.role !== 'super-admin' &&
        currentUser.role !== 'admin') {
      return errorResponse('Not authorized to update this profile', 403);
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${targetUserId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update user's avatar in database
    const avatarUrl = `/uploads/profiles/${filename}`;
    await User.findByIdAndUpdate(targetUserId, { avatar: avatarUrl });

    // Update localStorage user data if updating self
    const updatedUser = await User.findById(targetUserId).select('-password');

    return successResponse({
      message: 'Profile picture uploaded successfully',
      avatar: avatarUrl,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Failed to upload profile picture');
  }
}
