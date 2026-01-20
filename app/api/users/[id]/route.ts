import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const user = await User.findById(id).select('-password -pin');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check department access (only super-admin can see all)
    if (currentUser.role !== 'super-admin' && currentUser.department && user.department !== currentUser.department) {
      return errorResponse('Not authorized to access this user', 403);
    }

    return successResponse({ user });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    // Check existing user for department access
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Check permissions:
    // - User can update themselves
    // - Super-admin can update anyone
    // - Admin/Manager can update users in their department
    const isSelf = currentUser._id.toString() === id;
    const isSuperAdmin = currentUser.role === 'super-admin';
    const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';
    const isSameDepartment = currentUser.department && existingUser.department === currentUser.department;

    if (!isSelf && !isSuperAdmin && !(isAdminOrManager && isSameDepartment)) {
      return errorResponse('Not authorized to update this user', 403);
    }

    const passwordChanged = body.password !== undefined && body.password.trim() !== '';

    // Update user fields
    if (body.yoonetId !== undefined) existingUser.yoonetId = body.yoonetId;
    if (body.username !== undefined) existingUser.username = body.username;
    if (body.name !== undefined) existingUser.name = body.name;
    if (body.email !== undefined) existingUser.email = body.email;
    if (body.position !== undefined) existingUser.position = body.position;
    if (body.department !== undefined) existingUser.department = body.department;
    if (body.role !== undefined) existingUser.role = body.role;
    if (body.isActive !== undefined) existingUser.isActive = body.isActive;
    if (body.avatar !== undefined) existingUser.avatar = body.avatar;

    // Only update password if provided (this will trigger the pre-save hook for hashing)
    if (passwordChanged) {
      existingUser.password = body.password;
    }

    // Save the user (this triggers the pre-save hook for password hashing)
    await existingUser.save();

    // Handle PIN update for privileged roles separately (since pin has select: false)
    const isPrivilegedRole = ['super-admin', 'admin', 'manager'].includes(existingUser.role);
    if (isPrivilegedRole && body.pin !== undefined && body.pin !== '') {
      // Use findByIdAndUpdate to set PIN directly since it's not selected by default
      await User.findByIdAndUpdate(id, { $set: { pin: body.pin } });
    }

    // Return user without password and pin
    const user = await User.findById(id).select('-password -pin');

    return successResponse({ user });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    if (error.name === 'ValidationError') {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Server error');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;

    // Check existing user for department access
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Check permissions:
    // - Super-admin can delete anyone
    // - Admin/Manager can delete users in their department
    const isSuperAdmin = currentUser.role === 'super-admin';
    const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';
    const isSameDepartment = currentUser.department && existingUser.department === currentUser.department;

    if (!isSuperAdmin && !(isAdminOrManager && isSameDepartment)) {
      return errorResponse('Not authorized to delete this user', 403);
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
