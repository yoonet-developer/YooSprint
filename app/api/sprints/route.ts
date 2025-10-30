import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const sprints = await Sprint.find()
      .populate('backlogItems')
      .populate('managers', 'name email position')
      .sort({ createdAt: -1 });
    return successResponse({ sprints });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const sprint = await Sprint.create({
      ...body,
      createdBy: user._id,
    });

    const populatedSprint = await Sprint.findById(sprint._id).populate('backlogItems');
    return successResponse({ sprint: populatedSprint }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
