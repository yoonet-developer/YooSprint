import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';
import { logAudit, getChanges } from '@/lib/utils/auditLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request);
    const { id } = await params;
    const user = await User.findById(id).select('-password');

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

    // Capture old values for audit
    const oldData = {
      username: existingUser.username,
      name: existingUser.name,
      position: existingUser.position,
      department: existingUser.department,
      role: existingUser.role,
      isActive: existingUser.isActive
    };

    const passwordChanged = body.password !== undefined && body.password.trim() !== '';

    // Update user fields
    if (body.username !== undefined) existingUser.username = body.username;
    if (body.name !== undefined) existingUser.name = body.name;
    if (body.position !== undefined) existingUser.position = body.position;
    if (body.department !== undefined) existingUser.department = body.department;
    if (body.role !== undefined) existingUser.role = body.role;
    if (body.isActive !== undefined) existingUser.isActive = body.isActive;

    // Only update password if provided (this will trigger the pre-save hook for hashing)
    if (passwordChanged) {
      existingUser.password = body.password;
    }

    // Save the user (this triggers the pre-save hook for password hashing)
    await existingUser.save();

    // Capture new values for audit
    const newData = {
      username: existingUser.username,
      name: existingUser.name,
      position: existingUser.position,
      department: existingUser.department,
      role: existingUser.role,
      isActive: existingUser.isActive
    };

    // Determine the specific action for better audit trail
    let action = 'user_updated';
    let details = `Updated user: ${existingUser.username}`;

    if (passwordChanged) {
      action = 'user_password_changed';
      details = `Changed password for user: ${existingUser.username}`;
    } else if (oldData.isActive !== newData.isActive) {
      action = newData.isActive ? 'user_activated' : 'user_deactivated';
      details = `${newData.isActive ? 'Activated' : 'Deactivated'} user: ${existingUser.username}`;
    }

    // Log audit
    await logAudit({
      user: currentUser,
      action,
      resourceType: 'user',
      resourceId: existingUser._id.toString(),
      resourceName: existingUser.name,
      details,
      changes: getChanges(oldData, newData),
      request
    });

    // Return user without password
    const user = await User.findById(id).select('-password');

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

    // Log audit before deletion
    await logAudit({
      user: currentUser,
      action: 'user_deleted',
      resourceType: 'user',
      resourceId: existingUser._id.toString(),
      resourceName: existingUser.name,
      details: `Deleted user: ${existingUser.username} (${existingUser.role})`,
      request
    });

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
