import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import AuditLog from '@/lib/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Only admins and super-admins can view audit logs
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return errorResponse('Not authorized to view audit logs', 403);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};

    // Super-admin sees all logs, admin sees only their department
    if (user.role === 'admin' && user.department) {
      filter.department = user.department;
    }

    // Apply filters
    if (action) {
      filter.action = action;
    }

    if (resourceType) {
      filter.resourceType = resourceType;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name username role department')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Audit Logs GET] Error:', error);
    return errorResponse('Server error');
  }
}
