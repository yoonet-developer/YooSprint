import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';

// Start or stop timer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'start' or 'stop'

    const backlog = await Backlog.findById(id);
    if (!backlog) {
      return errorResponse('Backlog not found', 404);
    }

    // Check department access
    if (user.role !== 'super-admin' && user.department && backlog.department !== user.department) {
      return errorResponse('Not authorized', 403);
    }

    if (action === 'start') {
      // Start timer
      if (backlog.isTimerRunning) {
        return errorResponse('Timer is already running', 400);
      }

      // Use updateOne to ensure fields are saved
      await Backlog.updateOne(
        { _id: id },
        {
          $set: {
            isTimerRunning: true,
            timerStartedAt: new Date()
          },
          $push: {
            timeEntries: { startTime: new Date() }
          }
        }
      );

      // Fetch updated backlog
      const updatedBacklog = await Backlog.findById(id);

      return successResponse({
        message: 'Timer started',
        backlog: {
          _id: updatedBacklog?._id,
          isTimerRunning: updatedBacklog?.isTimerRunning,
          timerStartedAt: updatedBacklog?.timerStartedAt,
          timeTracked: updatedBacklog?.timeTracked
        }
      });

    } else if (action === 'stop') {
      // Stop timer
      if (!backlog.isTimerRunning) {
        return errorResponse('Timer is not running', 400);
      }

      const now = new Date();
      const startTime = new Date(backlog.timerStartedAt);
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000); // Duration in seconds
      const newTimeTracked = (backlog.timeTracked || 0) + duration;

      // Use updateOne to ensure fields are saved
      await Backlog.updateOne(
        { _id: id },
        {
          $set: {
            isTimerRunning: false,
            timerStartedAt: null,
            timeTracked: newTimeTracked,
            'timeEntries.$[last].endTime': now,
            'timeEntries.$[last].duration': duration
          }
        },
        {
          arrayFilters: [{ 'last.endTime': null }]
        }
      );

      return successResponse({
        message: 'Timer stopped',
        duration,
        backlog: {
          _id: backlog._id,
          isTimerRunning: false,
          timerStartedAt: null,
          timeTracked: newTimeTracked
        }
      });

    } else {
      return errorResponse('Invalid action. Use "start" or "stop"', 400);
    }

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('[Timer API] Error:', error.message || error);
    return errorResponse(error.message || 'Server error');
  }
}

// Get timer status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const backlog = await Backlog.findById(id).select('isTimerRunning timerStartedAt timeTracked timeEntries');
    if (!backlog) {
      return errorResponse('Backlog not found', 404);
    }

    // Calculate current elapsed time if timer is running
    let currentElapsed = 0;
    if (backlog.isTimerRunning && backlog.timerStartedAt) {
      currentElapsed = Math.floor((new Date().getTime() - new Date(backlog.timerStartedAt).getTime()) / 1000);
    }

    return successResponse({
      isTimerRunning: backlog.isTimerRunning,
      timerStartedAt: backlog.timerStartedAt,
      timeTracked: backlog.timeTracked,
      currentElapsed,
      totalTime: (backlog.timeTracked || 0) + currentElapsed,
      timeEntries: backlog.timeEntries
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
