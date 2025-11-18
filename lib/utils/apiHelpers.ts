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

/**
 * Get department filter for queries
 * - Super-admin: See everything
 * - Admin: See everything in their department
 * - Manager: See everything in their department
 * - Member: Only see what they created or what is assigned to them
 */
export function getDepartmentFilter(user: any) {
  const filter: any = {};

  if (user.role === 'super-admin') {
    // Super-admin sees everything
    return filter;
  }

  if (user.role === 'admin' || user.role === 'manager') {
    // Admin and Manager see everything in their department
    if (user.department) {
      // Show items in their department OR items with no department (empty string)
      filter.$or = [
        { department: user.department },
        { department: '' },
        { department: { $exists: false } }
      ];
    }
    // If user has no department, show everything (empty filter)
    return filter;
  }

  // Member: only see what they created or what is assigned to them
  const conditions: any[] = [
    { createdBy: user._id }, // Items they created
    { assignee: user._id },  // Items assigned to them (for backlogs/tasks)
    { managers: user._id }   // Sprints where they are a manager
  ];

  // Members can only see items they created or are assigned to
  if (user.role === 'member') {
    filter.$or = conditions;
  }

  // Also filter by department if user has one
  if (user.department) {
    filter.department = user.department;
  }

  return filter;
}

/**
 * Check if user has access to a resource based on department
 * Only super-admin can access resources from any department
 * All other roles can only access resources from their own department
 */
export function canAccessDepartment(user: any, resourceDepartment: string): boolean {
  if (user.role === 'super-admin') {
    return true;
  }
  return user.department === resourceDepartment;
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
    // Get the sprint
    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      return;
    }

    // Get all backlog items for this sprint
    const backlogItems = await Backlog.find({ sprint: sprintId });

    // If there are no backlog items, don't auto-complete
    if (backlogItems.length === 0) {
      return;
    }

    // Check if all backlog items are completed
    const allCompleted = backlogItems.every(
      (item) => item.taskStatus === 'completed'
    );

    // If all are completed and sprint is not completed, mark as completed
    if (allCompleted && sprint.status !== 'completed') {
      await Sprint.findByIdAndUpdate(sprintId, { status: 'completed' });
    }
    // If NOT all completed but sprint IS completed, revert to active
    else if (!allCompleted && sprint.status === 'completed') {
      await Sprint.findByIdAndUpdate(sprintId, { status: 'active' });
    }
  } catch (error) {
    console.error('[checkAndUpdateSprintStatus] Error:', error);
    // Don't throw error - this should not break the main operation
  }
}
