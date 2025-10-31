import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, checkAndUpdateSprintStatus } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const backlog = await Backlog.findById(id)
      .populate('assignee', 'name email position')
      .populate('sprint', 'name status startDate endDate');

    if (!backlog) {
      return errorResponse('Backlog not found', 404);
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
    await requireAuth(request);
    const body = await request.json();
    const { id } = await params;

    // First update the backlog without populating to get the sprint ID
    const updatedBacklog = await Backlog.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedBacklog) {
      return errorResponse('Backlog not found', 404);
    }

    // Check if this backlog is part of a sprint and if taskStatus was updated
    console.log('[Backlog PUT] Updated backlog:', {
      id: updatedBacklog._id,
      title: updatedBacklog.title,
      sprint: updatedBacklog.sprint,
      taskStatus: updatedBacklog.taskStatus,
      bodyTaskStatus: body.taskStatus
    });

    if (updatedBacklog.sprint && body.taskStatus) {
      console.log('[Backlog PUT] Triggering sprint auto-completion check');
      // Check if all backlog items in the sprint are completed
      // and auto-update sprint status if needed
      await checkAndUpdateSprintStatus(updatedBacklog.sprint.toString());
    } else {
      console.log('[Backlog PUT] NOT triggering auto-completion. Sprint:', updatedBacklog.sprint, 'body.taskStatus:', body.taskStatus);
    }

    // Now populate the backlog for the response
    const backlog = await Backlog.findById(id)
      .populate('assignee', 'name email position')
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
    await requireAuth(request);
    const { id } = await params;

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
