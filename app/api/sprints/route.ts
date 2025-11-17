import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';
import Backlog from '@/lib/models/Backlog';
import { logAudit } from '@/lib/utils/auditLogger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    let sprints;

    // For members: find sprints that have backlogs assigned to them
    if (user.role === 'member') {
      // Find all backlogs assigned to this member
      const userBacklogs = await Backlog.find({
        assignee: user._id,
        department: user.department,
        taskStatus: { $in: ['active', 'completed'] } // Only active or completed
      }).select('sprint');

      // Get unique sprint IDs
      const sprintIds = [...new Set(userBacklogs.map(b => b.sprint).filter(Boolean))];

      // Find sprints that are either:
      // 1. Created by the member
      // 2. Contain backlogs assigned to the member
      // 3. Have active or completed status
      sprints = await Sprint.find({
        $and: [
          { department: user.department },
          { status: { $in: ['active', 'completed'] } },
          {
            $or: [
              { _id: { $in: sprintIds } },
              { createdBy: user._id },
              { managers: user._id }
            ]
          }
        ]
      })
        .populate('backlogItems')
        .populate('managers', 'name email position department')
        .sort({ createdAt: -1 });
    } else {
      // For other roles (admin, manager, super-admin), use the standard filter
      const filter = getDepartmentFilter(user);
      sprints = await Sprint.find(filter)
        .populate('backlogItems')
        .populate('managers', 'name email position department')
        .sort({ createdAt: -1 });
    }

    return successResponse({ sprints });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Automatically set department from user if not provided
    const department = body.department || user.department || '';

    const sprint = await Sprint.create({
      ...body,
      department,
      createdBy: user._id,
    });

    // Log audit
    await logAudit({
      user,
      action: 'sprint_created',
      resourceType: 'sprint',
      resourceId: sprint._id.toString(),
      resourceName: sprint.name,
      details: `Created new sprint: ${sprint.name} (${sprint.status})`,
      request
    });

    const populatedSprint = await Sprint.findById(sprint._id).populate('backlogItems');
    return successResponse({ sprint: populatedSprint }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
