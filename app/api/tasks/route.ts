import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse, getDepartmentFilter } from '@/lib/utils/apiHelpers';
import Task from '@/lib/models/Task';

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Filter by department unless user is super-admin
    const filter = getDepartmentFilter(user);

    const tasks = await Task.find(filter).populate('assignee', 'name email department').sort({ createdAt: -1 });
    return successResponse({ tasks });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get tasks error:', error);
    return errorResponse('Server error');
  }
}

// CREATE new task
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Automatically set department from user if not provided
    const department = body.department || user.department || '';

    const task = await Task.create({
      ...body,
      department,
      createdBy: user._id,
    });

    const populatedTask = await Task.findById(task._id).populate('assignee', 'name email department');
    return successResponse({ task: populatedTask }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Create task error:', error);
    return errorResponse('Server error');
  }
}
