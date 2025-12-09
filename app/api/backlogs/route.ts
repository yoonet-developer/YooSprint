import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Filter by department unless user is super-admin
    const filter = getDepartmentFilter(user);

    let backlogs = await Backlog.find(filter)
      .populate('assignee', 'name email position department')
      .populate('sprint', 'name status startDate endDate')
      .sort({ createdAt: -1 });

    // For members: only show backlogs in sprints with 'active' or 'completed' status
    // or backlogs not in any sprint
    if (user.role === 'member') {
      backlogs = backlogs.filter((backlog: any) => {
        // Show backlogs not in any sprint
        if (!backlog.sprint) {
          return true;
        }
        // Show backlogs in active or completed sprints
        return backlog.sprint.status === 'active' || backlog.sprint.status === 'completed';
      });
    }

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
