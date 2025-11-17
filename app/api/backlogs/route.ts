import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';
import { logAudit } from '@/lib/utils/auditLogger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Filter by department unless user is super-admin
    const filter = getDepartmentFilter(user);

    const backlogs = await Backlog.find(filter)
      .populate('assignee', 'name email position department')
      .populate('sprint', 'name status startDate endDate')
      .sort({ createdAt: -1 });

    return successResponse({ backlogs });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Backlogs GET] Error:', error);
    return errorResponse('Server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Automatically set department from user if not provided
    const department = body.department || user.department || '';

    const backlog = await Backlog.create({
      ...body,
      department,
      createdBy: user._id,
    });

    // Log audit
    await logAudit({
      user,
      action: 'backlog_created',
      resourceType: 'backlog',
      resourceId: backlog._id.toString(),
      resourceName: backlog.title,
      details: `Created new backlog: ${backlog.title} (${backlog.priority} priority)`,
      request
    });

    const populatedBacklog = await Backlog.findById(backlog._id)
      .populate('assignee', 'name email position department')
      .populate('sprint', 'name status startDate endDate');

    return successResponse({ backlog: populatedBacklog }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Backlogs POST] Error:', error);
    return errorResponse('Server error');
  }
}
