import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const backlogs = await Backlog.find()
      .populate('assignee', 'name email position')
      .populate('sprint', 'name status startDate endDate')
      .sort({ createdAt: -1 });
    return successResponse({ backlogs });
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

    const backlog = await Backlog.create({
      ...body,
      createdBy: user._id,
    });

    const populatedBacklog = await Backlog.findById(backlog._id)
      .populate('assignee', 'name email position')
      .populate('sprint', 'name status startDate endDate');
    return successResponse({ backlog: populatedBacklog }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
