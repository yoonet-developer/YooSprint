import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';
import Backlog from '@/lib/models/Backlog';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');

    let sprints;

    // If filtering by project ID
    if (projectId) {
      const filter: any = { project: projectId };
      // Add department filter unless super-admin
      if (user.role !== 'super-admin' && user.department) {
        filter.department = user.department;
      }
      sprints = await Sprint.find(filter)
        .populate('managers', 'name email position department avatar')
        .populate('project', 'name category estimatedTime timeConsumed progress')
        .sort({ createdAt: -1 });
    }
    // For members: find sprints that have backlogs assigned to them
    else if (user.role === 'member') {
      // Find all backlogs assigned to this member in active/completed sprints
      const userBacklogs = await Backlog.find({
        assignee: user._id,
        department: user.department
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
        .populate('managers', 'name email position department avatar')
        .sort({ createdAt: -1 });
    } else {
      // For other roles (admin, manager, super-admin), use the standard filter
      const filter = getDepartmentFilter(user);
      sprints = await Sprint.find(filter)
        .populate('managers', 'name email position department avatar')
        .sort({ createdAt: -1 });
    }

    // Fetch backlog items for all sprints in a single query
    const sprintIds = sprints.map((s: any) => s._id);
    const allBacklogs = await Backlog.find({ sprint: { $in: sprintIds } })
      .populate('assignee', 'name email position department avatar')
      .populate('createdBy', 'name email');

    // Group backlogs by sprint ID
    const backlogsBySprint = allBacklogs.reduce((acc: any, backlog: any) => {
      const sprintId = backlog.sprint.toString();
      if (!acc[sprintId]) {
        acc[sprintId] = [];
      }
      acc[sprintId].push(backlog);
      return acc;
    }, {});

    // Attach backlog items to each sprint
    const sprintsWithBacklogs = sprints.map((sprint: any) => ({
      ...sprint.toObject(),
      backlogItems: backlogsBySprint[sprint._id.toString()] || []
    }));

    return successResponse({ sprints: sprintsWithBacklogs });
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

    const populatedSprint = await Sprint.findById(sprint._id).populate('backlogItems');
    return successResponse({ sprint: populatedSprint }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('No sprint IDs provided', 400);
    }

    // Verify department access for all sprints
    const sprints = await Sprint.find({ _id: { $in: ids } });

    if (user.role !== 'super-admin' && user.department) {
      const unauthorized = sprints.some(sprint => sprint.department !== user.department);
      if (unauthorized) {
        return errorResponse('Not authorized to delete some of these sprints', 403);
      }
    }

    // Remove sprint reference from all associated backlogs
    await Backlog.updateMany(
      { sprint: { $in: ids } },
      { $set: { sprint: null, status: 'backlog' } }
    );

    // Delete all sprints
    const result = await Sprint.deleteMany({ _id: { $in: ids } });

    return successResponse({
      message: `${result.deletedCount} sprint(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
