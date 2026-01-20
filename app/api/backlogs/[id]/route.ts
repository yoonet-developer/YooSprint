import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, checkAndUpdateSprintStatus, updateProjectProgress } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const backlog = await Backlog.findById(id)
      .populate('project', 'name slug category estimatedTime timeConsumed progress')
      .populate('assignee', 'name email position department avatar')
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

    // Check if this backlog is part of a sprint and if taskStatus was updated
    if (updatedBacklog.sprint && body.taskStatus) {
      // Check if all backlog items in the sprint are completed
      // and auto-update sprint status if needed
      await checkAndUpdateSprintStatus(updatedBacklog.sprint.toString());
    }

    // Update project progress if taskStatus was updated or project changed
    if (updatedBacklog.project && (body.taskStatus || body.project)) {
      await updateProjectProgress(updatedBacklog.project.toString());
      // If project changed, also update the old project's progress
      if (body.project && existingBacklog.project &&
          existingBacklog.project.toString() !== body.project) {
        await updateProjectProgress(existingBacklog.project.toString());
      }
    }

    // Now populate the backlog for the response
    const backlog = await Backlog.findById(id)
      .populate('project', 'name slug category estimatedTime timeConsumed progress')
      .populate('assignee', 'name email position department avatar')
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

    // Update project progress after deleting backlog
    if (backlog.project) {
      await updateProjectProgress(backlog.project.toString());
    }

    return successResponse({ message: 'Backlog deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
