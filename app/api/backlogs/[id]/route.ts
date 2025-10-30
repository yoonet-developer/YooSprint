import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const backlog = await Backlog.findById(params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);
    const body = await request.json();

    const backlog = await Backlog.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);

    const backlog = await Backlog.findByIdAndDelete(params.id);

    if (!backlog) {
      return errorResponse('Backlog not found', 404);
    }

    return successResponse({ message: 'Backlog deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
