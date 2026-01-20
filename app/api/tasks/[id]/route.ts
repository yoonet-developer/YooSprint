import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Task from '@/lib/models/Task';

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const task = await Task.findById(id).populate('assignee', 'name email department avatar');

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    // Check department access (only super-admin can see all)
    if (user.role !== 'super-admin' && user.department && task.department !== user.department) {
      return errorResponse('Not authorized to access this task', 403);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    // Check department access before updating
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return errorResponse('Task not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingTask.department !== user.department) {
      return errorResponse('Not authorized to update this task', 403);
    }

    const task = await Task.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email department avatar');

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check department access before deleting
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return errorResponse('Task not found', 404);
    }

    if (user.role !== 'super-admin' && user.department && existingTask.department !== user.department) {
      return errorResponse('Not authorized to delete this task', 403);
    }

    const task = await Task.findByIdAndDelete(id);

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
