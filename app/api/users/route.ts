import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // For users endpoint: managers and admins can see all users in their department
    let filter: any = {};

    if (user.role === 'super-admin') {
      // Super-admin sees all users
      filter = {};
    } else if (user.role === 'admin' || user.role === 'manager') {
      // Admin and Manager see all users in their department
      if (user.department) {
        filter.department = user.department;
      }
    } else {
      // Members only see themselves (or use regular getDepartmentFilter)
      filter = getDepartmentFilter(user);
    }

    const users = await User.find(filter).select('-password -pin').sort({ createdAt: -1 });
    return successResponse({ users });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get users error:', error);
    return errorResponse('Server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    // Only super-admin, admin and managers can add users
    if (authUser.role !== 'super-admin' && authUser.role !== 'admin' && authUser.role !== 'manager') {
      return errorResponse('Not authorized to add users', 403);
    }

    const body = await request.json();
    const { yoonetId, username, name, email, position, department, password, role, pin } = body;

    // Validate required fields
    if (!yoonetId || !username || !name || !position || !password) {
      return errorResponse('Missing required fields', 400);
    }

    // Check if yoonetId already exists
    const existingYoonetId = await User.findOne({ yoonetId });
    if (existingYoonetId) {
      return errorResponse('Yoonet ID already exists', 400);
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return errorResponse('Username already exists', 400);
    }

    // Automatically set department from auth user if not provided (for non-super-admins)
    const userDepartment = department || (authUser.role !== 'super-admin' ? authUser.department : '');

    // Determine user role
    const userRole = role || 'member';
    const isPrivilegedRole = ['super-admin', 'admin', 'manager'].includes(userRole);

    // Create user data
    const userData: any = {
      yoonetId,
      username,
      name,
      email: email || `${username}@company.com`, // Default email if not provided
      position,
      department: userDepartment,
      password, // Will be hashed by model pre-save hook
      role: userRole,
      isActive: true,
    };

    // Add PIN for privileged roles if provided
    if (isPrivilegedRole && pin) {
      userData.pin = pin;
    }

    // Create user (password will be hashed by the pre-save hook in the model)
    const user = await User.create(userData);

    // Return user without password and pin
    const userWithoutPassword = await User.findById(user._id).select('-password -pin');
    return successResponse({ user: userWithoutPassword }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Create user error:', error);
    return errorResponse(error.message || 'Server error');
  }
}
