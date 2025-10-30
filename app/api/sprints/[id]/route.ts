import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';
import Backlog from '@/lib/models/Backlog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const sprint = await Sprint.findById(id)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email position');

    if (!sprint) {
      return errorResponse('Sprint not found', 404);
    }

    // Fetch backlog items for this sprint
    const backlogItems = await Backlog.find({ sprint: id })
      .populate('assignee', 'name email position')
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
    await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const sprint = await Sprint.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate('backlogItems');

    if (!sprint) {
      return errorResponse('Sprint not found', 404);
    }

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
    await requireAuth(request);
    const { id } = await params;

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
