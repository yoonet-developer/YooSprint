import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';
import Backlog from '@/lib/models/Backlog';
import { logAudit, getChanges } from '@/lib/utils/auditLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const sprint = await Sprint.findById(id)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email position department');

    if (!sprint) {
      return errorResponse('Sprint not found', 404);
    }

    // Check department access (only super-admin can see all)
    if (user.role !== 'super-admin' && user.department && sprint.department !== user.department) {
      return errorResponse('Not authorized to access this sprint', 403);
    }

    // Fetch backlog items for this sprint
    const backlogItems = await Backlog.find({ sprint: id })
      .populate('assignee', 'name email position department')
      .populate('createdBy', 'name email');

    return successResponse({
      sprint: {
        ...sprint.toObject(),
        backlogItems
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { id } = await params;

    // Check department access before updating
    const existingSprint = await Sprint.findById(id);
    if (!existingSprint) {
      return errorResponse('Sprint not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingSprint.department !== user.department) {
      return errorResponse('Not authorized to update this sprint', 403);
    }

    // Capture old values for audit
    const oldData = {
      name: existingSprint.name,
      status: existingSprint.status,
      startDate: existingSprint.startDate,
      endDate: existingSprint.endDate,
      goal: existingSprint.goal
    };

    // If trying to manually set status to 'completed', validate that all backlogs are completed
    // Only validate if status is being changed (not on other field updates)
    if (body.status === 'completed') {
      // Check current sprint status
      const currentSprint = existingSprint;

      // Only validate if sprint is NOT already completed (prevents blocking automatic updates)
      if (currentSprint && currentSprint.status !== 'completed') {
        const backlogItems = await Backlog.find({ sprint: id });
        const incompleteTasks = backlogItems.filter(
          (backlog) => backlog.taskStatus !== 'completed'
        );

        if (incompleteTasks.length > 0) {
          return errorResponse(
            `Cannot mark sprint as completed. There are ${incompleteTasks.length} incomplete task(s) in this sprint. Please complete all tasks before marking the sprint as completed.`,
            400
          );
        }
      }
    }

    const sprint = await Sprint.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate('backlogItems');

    if (!sprint) {
      return errorResponse('Sprint not found', 404);
    }

    // Capture new values for audit
    const newData = {
      name: sprint.name,
      status: sprint.status,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      goal: sprint.goal
    };

    // Determine specific action for better audit trail
    let action = 'sprint_updated';
    let details = `Updated sprint: ${sprint.name}`;

    if (oldData.status !== newData.status) {
      action = 'sprint_status_changed';
      details = `Changed sprint status from ${oldData.status} to ${newData.status}: ${sprint.name}`;
    }

    // Log audit
    await logAudit({
      user,
      action,
      resourceType: 'sprint',
      resourceId: sprint._id.toString(),
      resourceName: sprint.name,
      details,
      changes: getChanges(oldData, newData),
      request
    });

    return successResponse({ sprint });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check department access before deleting
    const existingSprint = await Sprint.findById(id);
    if (!existingSprint) {
      return errorResponse('Sprint not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingSprint.department !== user.department) {
      return errorResponse('Not authorized to delete this sprint', 403);
    }

    // Log audit before deletion
    await logAudit({
      user,
      action: 'sprint_deleted',
      resourceType: 'sprint',
      resourceId: existingSprint._id.toString(),
      resourceName: existingSprint.name,
      details: `Deleted sprint: ${existingSprint.name} (${existingSprint.status})`,
      request
    });

    const sprint = await Sprint.findByIdAndDelete(id);

    if (!sprint) {
      return errorResponse('Sprint not found', 404);
    }

    return successResponse({ message: 'Sprint deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
