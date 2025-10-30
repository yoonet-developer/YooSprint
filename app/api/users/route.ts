import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return successResponse({ users });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get users error:', error);
    return errorResponse('Server error');
  }
}
