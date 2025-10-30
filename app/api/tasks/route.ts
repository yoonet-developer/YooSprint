import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Task from '@/lib/models/Task';

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const tasks = await Task.find().populate('assignee', 'name email').sort({ createdAt: -1 });
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

    const task = await Task.create({
      ...body,
      createdBy: user._id,
    });

    const populatedTask = await Task.findById(task._id).populate('assignee', 'name email');
    return successResponse({ task: populatedTask }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Create task error:', error);
    return errorResponse('Server error');
  }
}
