import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter, updateProjectProgress } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');

    // Filter by department unless user is super-admin
    const filter: any = getDepartmentFilter(user);

    // Add project filter if provided
    if (projectId) {
      filter.project = projectId;
    }

    let backlogs = await Backlog.find(filter)
      .populate('project', 'name slug category estimatedTime timeConsumed progress')
      .populate('assignee', 'name email position department avatar')
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
      .populate('project', 'name slug category estimatedTime timeConsumed progress')
      .populate('assignee', 'name email position department avatar')
      .populate('sprint', 'name status startDate endDate');

    // Update project progress after creating backlog
    if (backlog.project) {
      await updateProjectProgress(backlog.project.toString());
    }

    return successResponse({ backlog: populatedBacklog }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Backlogs POST] Error:', error);
    return errorResponse('Server error');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('No backlog IDs provided', 400);
    }

    // Fetch all backlogs to check department access and get project IDs
    const backlogs = await Backlog.find({ _id: { $in: ids } });

    if (user.role !== 'super-admin' && user.department) {
      const unauthorized = backlogs.some(backlog => backlog.department !== user.department);
      if (unauthorized) {
        return errorResponse('Not authorized to delete some of these backlogs', 403);
      }
    }

    // Check if any backlogs are in a sprint
    const inSprintBacklogs = backlogs.filter(b => b.sprint);
    if (inSprintBacklogs.length > 0) {
      return errorResponse(
        `${inSprintBacklogs.length} backlog item(s) are currently in a sprint. Please remove them from the sprint before deleting.`,
        400
      );
    }

    // Collect unique project IDs for progress update
    const projectIds = [...new Set(backlogs.map(b => b.project?.toString()).filter(Boolean))];

    // Delete all backlogs
    const result = await Backlog.deleteMany({ _id: { $in: ids } });

    // Update progress for all affected projects
    for (const projectId of projectIds) {
      if (projectId) {
        await updateProjectProgress(projectId);
      }
    }

    return successResponse({
      message: `${result.deletedCount} backlog item(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Backlogs DELETE] Error:', error);
    return errorResponse('Server error');
  }
}
