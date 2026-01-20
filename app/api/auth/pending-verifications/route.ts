import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import dbConnect from '@/lib/db';
import VerificationCode from '@/lib/models/VerificationCode';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Only managers, admins, and super-admins can view pending verifications
    if (!['super-admin', 'admin', 'manager'].includes(user.role)) {
      return errorResponse('Not authorized', 403);
    }

    // Build filter based on role
    let filter: any = { status: 'pending' };

    // Managers and admins only see their department's verifications
    // Super-admin sees all
    if (user.role !== 'super-admin' && user.department) {
      filter.department = user.department;
    }

    const pendingVerifications = await VerificationCode.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse({ verifications: pendingVerifications });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get pending verifications error:', error);
    return errorResponse('Server error');
  }
}
