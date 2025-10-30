import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Task from '@/lib/models/Task';

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const task = await Task.findById(params.id).populate('assignee', 'name email');

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    return successResponse({ task });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get task error:', error);
    return errorResponse('Server error');
  }
}

// UPDATE task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const body = await request.json();

    const task = await Task.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email');

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    return successResponse({ task });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Update task error:', error);
    return errorResponse('Server error');
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);

    const task = await Task.findByIdAndDelete(params.id);

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    return successResponse({ message: 'Task deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Delete task error:', error);
    return errorResponse('Server error');
  }
}
