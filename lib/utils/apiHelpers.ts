import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';
import dbConnect from '@/lib/db';
import Sprint from '@/lib/models/Sprint';
import Backlog from '@/lib/models/Backlog';

export async function requireAuth(request: NextRequest) {
  await dbConnect();
  const user = await verifyAuth(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}

/**
 * Check if all backlog items in a sprint are completed
 * and automatically update the sprint status to 'completed'
 * OR revert to 'active' if sprint is completed but has incomplete tasks
 */
export async function checkAndUpdateSprintStatus(sprintId: string) {
  try {
    console.log('[checkAndUpdateSprintStatus] Checking sprint:', sprintId);

    // Get the sprint
    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      console.log('[checkAndUpdateSprintStatus] Sprint not found');
      return;
    }

    console.log('[checkAndUpdateSprintStatus] Sprint status:', sprint.status);

    // Get all backlog items for this sprint
    const backlogItems = await Backlog.find({ sprint: sprintId });

    console.log('[checkAndUpdateSprintStatus] Found', backlogItems.length, 'backlog items');

    // If there are no backlog items, don't auto-complete
    if (backlogItems.length === 0) {
      console.log('[checkAndUpdateSprintStatus] No backlog items, skipping auto-update');
      return;
    }

    // Log each backlog item's status
    backlogItems.forEach((item, index) => {
      console.log(`[checkAndUpdateSprintStatus] Backlog ${index + 1}: ${item.title} - taskStatus: ${item.taskStatus}`);
    });

    // Check if all backlog items are completed
    const allCompleted = backlogItems.every(
      (item) => item.taskStatus === 'completed'
    );

    console.log('[checkAndUpdateSprintStatus] All completed?', allCompleted);

    // If all are completed and sprint is not completed, mark as completed
    if (allCompleted && sprint.status !== 'completed') {
      console.log('[checkAndUpdateSprintStatus] Updating sprint to completed');
      await Sprint.findByIdAndUpdate(sprintId, { status: 'completed' });
      console.log('[checkAndUpdateSprintStatus] Sprint updated to completed');
    }
    // If NOT all completed but sprint IS completed, revert to active
    else if (!allCompleted && sprint.status === 'completed') {
      console.log('[checkAndUpdateSprintStatus] Sprint is completed but has incomplete tasks, reverting to active');
      await Sprint.findByIdAndUpdate(sprintId, { status: 'active' });
      console.log('[checkAndUpdateSprintStatus] Sprint reverted to active');
    }
  } catch (error) {
    console.error('[checkAndUpdateSprintStatus] Error:', error);
    // Don't throw error - this should not break the main operation
  }
}
