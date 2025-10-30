import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const user = await User.findById(params.id).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
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
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth(request);
    const body = await request.json();

    // Only admin can update other users
    if (currentUser._id.toString() !== params.id && currentUser.role !== 'admin') {
      return errorResponse('Not authorized to update this user', 403);
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ user });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth(request);

    // Only admin can delete users
    if (currentUser.role !== 'admin') {
      return errorResponse('Not authorized', 403);
    }

    const user = await User.findByIdAndDelete(params.id);

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
