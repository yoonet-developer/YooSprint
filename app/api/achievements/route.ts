import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import { getUserAchievements, getLeaderboard } from '@/lib/utils/achievementService';
import { BADGES } from '@/lib/models/Achievement';

// GET - Get achievements for current user or leaderboard
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'user', 'leaderboard', or 'badges'
    const userId = searchParams.get('userId');

    if (type === 'leaderboard') {
      // Get leaderboard - filter by department for non-super-admins
      const department = user.role === 'super-admin' ? undefined : user.department;
      const leaderboard = await getLeaderboard(department);
      return successResponse({ leaderboard });
    }

    if (type === 'badges') {
      // Get all available badge definitions
      return successResponse({ badges: Object.values(BADGES) });
    }

    // Default: Get user's achievements
    const targetUserId = userId || user._id.toString();

    // Check permission - users can only view their own or same department (for admins)
    if (targetUserId !== user._id.toString()) {
      if (user.role !== 'super-admin' && user.role !== 'admin' && user.role !== 'manager') {
        return errorResponse('Not authorized to view other user achievements', 403);
      }
    }

    const achievements = await getUserAchievements(targetUserId);
    return successResponse({ achievements });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get achievements error:', error);
    return errorResponse('Server error');
  }
}
