import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, checkAndUpdateSprintStatus } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';
import { onTaskCompleted, checkSprintFinisher } from '@/lib/utils/achievementService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const backlog = await Backlog.findById(id)
      .populate('assignee', 'name email position department')
      .populate('sprint', 'name status startDate endDate');

    if (!backlog) {
      return errorResponse('Backlog not found', 404);
    }

    // Check department access (only super-admin can see all)
    if (user.role !== 'super-admin' && user.department && backlog.department !== user.department) {
      return errorResponse('Not authorized to access this backlog', 403);
    }

    return successResponse({ backlog });
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
    const existingBacklog = await Backlog.findById(id);
    if (!existingBacklog) {
      return errorResponse('Backlog not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingBacklog.department !== user.department) {
      return errorResponse('Not authorized to update this backlog', 403);
    }

    // Update the backlog
    const updatedBacklog = await Backlog.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedBacklog) {
      return errorResponse('Backlog not found', 404);
    }

    // Check if task was just completed - track achievements
    if (body.taskStatus === 'completed' && existingBacklog.taskStatus !== 'completed') {
      const assigneeId = updatedBacklog.assignee?.toString() || user._id.toString();
      const sprintId = updatedBacklog.sprint?.toString() || null;

      // Track task completion for achievements
      await onTaskCompleted(assigneeId, id, sprintId, existingBacklog.startedAt);

      // Check if user completed all tasks in sprint
      if (sprintId) {
        await checkSprintFinisher(assigneeId, sprintId);
      }
    }

    // Check if this backlog is part of a sprint and if taskStatus was updated
    if (updatedBacklog.sprint && body.taskStatus) {
      // Check if all backlog items in the sprint are completed
      // and auto-update sprint status if needed
      await checkAndUpdateSprintStatus(updatedBacklog.sprint.toString());
    }

    // Now populate the backlog for the response
    const backlog = await Backlog.findById(id)
      .populate('assignee', 'name email position department')
      .populate('sprint', 'name status startDate endDate');

    return successResponse({ backlog });
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
    const existingBacklog = await Backlog.findById(id);
    if (!existingBacklog) {
      return errorResponse('Backlog not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingBacklog.department !== user.department) {
      return errorResponse('Not authorized to delete this backlog', 403);
    }

    const backlog = await Backlog.findByIdAndDelete(id);

    if (!backlog) {
      return errorResponse('Backlog not found', 404);
    }

    // If this backlog was part of a sprint, check if remaining items are all completed
    if (backlog.sprint) {
      await checkAndUpdateSprintStatus(backlog.sprint.toString());
    }

    return successResponse({ message: 'Backlog deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
