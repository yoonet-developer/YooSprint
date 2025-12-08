import UserAchievement, { BADGES } from '@/lib/models/Achievement';
import Backlog from '@/lib/models/Backlog';
import User from '@/lib/models/User';
import connectDB from '@/lib/db';

// Get or create user achievement record
export async function getOrCreateUserAchievement(userId: string) {
  await connectDB();

  let userAchievement = await UserAchievement.findOne({ user: userId });

  if (!userAchievement) {
    // Get user details for visible fields
    const user = await User.findById(userId);
    userAchievement = await UserAchievement.create({
      user: userId,
      visibleName: user?.name || '',
      visibleDepartment: user?.department || '',
      visiblePosition: user?.position || '',
      badges: [],
      stats: {
        tasksCompleted: 0,
        backlogsCreated: 0,
        sprintsJoined: [],
        currentStreak: 0,
        longestStreak: 0,
        lastTaskCompletedAt: null,
        lastActiveAt: null,
        sprintsWithCompletions: [],
        speedDemonCount: 0,
        sprintFinisherCount: 0,
        topPerformerCount: 0
      }
    });
  }

  return userAchievement;
}

// Check if user has a specific badge
export function hasBadge(userAchievement: any, badgeId: string): boolean {
  return userAchievement.badges.some((b: any) => b.badgeId === badgeId);
}

// Award a badge to user
export async function awardBadge(userAchievement: any, badgeId: string): Promise<boolean> {
  if (hasBadge(userAchievement, badgeId)) {
    return false; // Already has badge
  }

  userAchievement.badges.push({
    badgeId,
    earnedAt: new Date()
  });

  await userAchievement.save();
  return true;
}

// Check and award badges based on current stats
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const userAchievement = await getOrCreateUserAchievement(userId);
  const newBadges: string[] = [];
  const stats = userAchievement.stats;

  // Check Beginner Badges
  if (stats.tasksCompleted >= 1 && !hasBadge(userAchievement, BADGES.FIRST_STEP.id)) {
    if (await awardBadge(userAchievement, BADGES.FIRST_STEP.id)) {
      newBadges.push(BADGES.FIRST_STEP.id);
    }
  }

  if (stats.sprintsJoined.length >= 1 && !hasBadge(userAchievement, BADGES.GETTING_STARTED.id)) {
    if (await awardBadge(userAchievement, BADGES.GETTING_STARTED.id)) {
      newBadges.push(BADGES.GETTING_STARTED.id);
    }
  }

  if (stats.backlogsCreated >= 1 && !hasBadge(userAchievement, BADGES.CONTRIBUTOR.id)) {
    if (await awardBadge(userAchievement, BADGES.CONTRIBUTOR.id)) {
      newBadges.push(BADGES.CONTRIBUTOR.id);
    }
  }

  // Check Progress Badges
  if (stats.tasksCompleted >= 10 && !hasBadge(userAchievement, BADGES.ON_FIRE.id)) {
    if (await awardBadge(userAchievement, BADGES.ON_FIRE.id)) {
      newBadges.push(BADGES.ON_FIRE.id);
    }
  }

  if (stats.sprintFinisherCount >= 1 && !hasBadge(userAchievement, BADGES.SPRINT_FINISHER.id)) {
    if (await awardBadge(userAchievement, BADGES.SPRINT_FINISHER.id)) {
      newBadges.push(BADGES.SPRINT_FINISHER.id);
    }
  }

  if (stats.speedDemonCount >= 1 && !hasBadge(userAchievement, BADGES.SPEED_DEMON.id)) {
    if (await awardBadge(userAchievement, BADGES.SPEED_DEMON.id)) {
      newBadges.push(BADGES.SPEED_DEMON.id);
    }
  }

  // Check for Consistent badge (3 consecutive sprints with completions)
  if (stats.sprintsWithCompletions.length >= 3 && !hasBadge(userAchievement, BADGES.CONSISTENT.id)) {
    if (await awardBadge(userAchievement, BADGES.CONSISTENT.id)) {
      newBadges.push(BADGES.CONSISTENT.id);
    }
  }

  // Check Elite Badges
  if (stats.topPerformerCount >= 1 && !hasBadge(userAchievement, BADGES.SPRINT_CHAMPION.id)) {
    if (await awardBadge(userAchievement, BADGES.SPRINT_CHAMPION.id)) {
      newBadges.push(BADGES.SPRINT_CHAMPION.id);
    }
  }

  if (stats.tasksCompleted >= 50 && !hasBadge(userAchievement, BADGES.TASK_MASTER.id)) {
    if (await awardBadge(userAchievement, BADGES.TASK_MASTER.id)) {
      newBadges.push(BADGES.TASK_MASTER.id);
    }
  }

  if (stats.tasksCompleted >= 100 && !hasBadge(userAchievement, BADGES.LEGEND.id)) {
    if (await awardBadge(userAchievement, BADGES.LEGEND.id)) {
      newBadges.push(BADGES.LEGEND.id);
    }
  }

  // Check Streak Badges
  if (stats.currentStreak >= 3 && !hasBadge(userAchievement, BADGES.STREAK_3_DAY.id)) {
    if (await awardBadge(userAchievement, BADGES.STREAK_3_DAY.id)) {
      newBadges.push(BADGES.STREAK_3_DAY.id);
    }
  }

  if (stats.currentStreak >= 7 && !hasBadge(userAchievement, BADGES.STREAK_7_DAY.id)) {
    if (await awardBadge(userAchievement, BADGES.STREAK_7_DAY.id)) {
      newBadges.push(BADGES.STREAK_7_DAY.id);
    }
  }

  if (stats.currentStreak >= 30 && !hasBadge(userAchievement, BADGES.STREAK_30_DAY.id)) {
    if (await awardBadge(userAchievement, BADGES.STREAK_30_DAY.id)) {
      newBadges.push(BADGES.STREAK_30_DAY.id);
    }
  }

  return newBadges;
}

// Called when a task is completed
export async function onTaskCompleted(userId: string, taskId: string, sprintId: string | null, startedAt: Date | null) {
  const userAchievement = await getOrCreateUserAchievement(userId);
  const now = new Date();

  // Update tasks completed count
  userAchievement.stats.tasksCompleted += 1;

  // Check for Speed Demon (completed within 24 hours)
  if (startedAt) {
    const hoursElapsed = (now.getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed <= 24) {
      userAchievement.stats.speedDemonCount += 1;
    }
  }

  // Update streak
  const lastActive = userAchievement.stats.lastTaskCompletedAt;
  if (lastActive) {
    const lastActiveDate = new Date(lastActive);
    const daysDiff = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check for Comeback badge (inactive for 7+ days)
    if (daysDiff >= 7 && !hasBadge(userAchievement, BADGES.COMEBACK.id)) {
      await awardBadge(userAchievement, BADGES.COMEBACK.id);
    }

    // Update streak
    if (daysDiff === 0) {
      // Same day, streak continues
    } else if (daysDiff === 1) {
      // Next day, increment streak
      userAchievement.stats.currentStreak += 1;
    } else {
      // Streak broken, reset to 1
      userAchievement.stats.currentStreak = 1;
    }
  } else {
    // First task ever
    userAchievement.stats.currentStreak = 1;
  }

  // Update longest streak if current is higher
  if (userAchievement.stats.currentStreak > userAchievement.stats.longestStreak) {
    userAchievement.stats.longestStreak = userAchievement.stats.currentStreak;
  }

  userAchievement.stats.lastTaskCompletedAt = now;
  userAchievement.stats.lastActiveAt = now;

  // Track sprint completion
  if (sprintId && !userAchievement.stats.sprintsWithCompletions.includes(sprintId)) {
    userAchievement.stats.sprintsWithCompletions.push(sprintId);
  }

  await userAchievement.save();

  // Check and award any new badges
  return await checkAndAwardBadges(userId);
}

// Called when a backlog item is created
export async function onBacklogCreated(userId: string) {
  const userAchievement = await getOrCreateUserAchievement(userId);

  userAchievement.stats.backlogsCreated += 1;
  userAchievement.stats.lastActiveAt = new Date();

  await userAchievement.save();

  return await checkAndAwardBadges(userId);
}

// Called when a user joins a sprint
export async function onSprintJoined(userId: string, sprintId: string) {
  const userAchievement = await getOrCreateUserAchievement(userId);

  if (!userAchievement.stats.sprintsJoined.includes(sprintId)) {
    userAchievement.stats.sprintsJoined.push(sprintId);
    userAchievement.stats.lastActiveAt = new Date();
    await userAchievement.save();
  }

  return await checkAndAwardBadges(userId);
}

// Check if user completed all tasks in a sprint
export async function checkSprintFinisher(userId: string, sprintId: string) {
  await connectDB();

  // Get all tasks assigned to user in this sprint
  const userTasks = await Backlog.find({
    sprint: sprintId,
    assignee: userId
  });

  if (userTasks.length === 0) return [];

  // Check if all are completed
  const allCompleted = userTasks.every(task => task.taskStatus === 'completed');

  if (allCompleted) {
    const userAchievement = await getOrCreateUserAchievement(userId);
    userAchievement.stats.sprintFinisherCount += 1;
    await userAchievement.save();

    return await checkAndAwardBadges(userId);
  }

  return [];
}

// Check for top performer in a sprint (called when sprint is completed)
export async function checkTopPerformer(sprintId: string) {
  await connectDB();

  // Get all completed tasks in sprint grouped by assignee
  const tasks = await Backlog.find({
    sprint: sprintId,
    taskStatus: 'completed',
    assignee: { $ne: null }
  });

  if (tasks.length === 0) return;

  // Count tasks per user
  const userTaskCounts: { [key: string]: number } = {};
  tasks.forEach(task => {
    const assigneeId = task.assignee.toString();
    userTaskCounts[assigneeId] = (userTaskCounts[assigneeId] || 0) + 1;
  });

  // Find top performer
  let topUserId = '';
  let maxTasks = 0;

  Object.entries(userTaskCounts).forEach(([userId, count]) => {
    if (count > maxTasks) {
      maxTasks = count;
      topUserId = userId;
    }
  });

  if (topUserId && maxTasks > 0) {
    const userAchievement = await getOrCreateUserAchievement(topUserId);
    userAchievement.stats.topPerformerCount += 1;
    await userAchievement.save();

    await checkAndAwardBadges(topUserId);
  }
}

// Get user's achievement data with badge details
export async function getUserAchievements(userId: string) {
  await connectDB();
  const userAchievement = await getOrCreateUserAchievement(userId);

  // Map badges with full details
  const earnedBadges = userAchievement.badges.map((badge: any) => {
    const badgeDetails = Object.values(BADGES).find(b => b.id === badge.badgeId);
    return {
      ...badgeDetails,
      earnedAt: badge.earnedAt
    };
  });

  // Get all available badges with earned status
  const allBadges = Object.values(BADGES).map(badge => ({
    ...badge,
    earned: userAchievement.badges.some((b: any) => b.badgeId === badge.id),
    earnedAt: userAchievement.badges.find((b: any) => b.badgeId === badge.id)?.earnedAt || null
  }));

  return {
    userId,
    stats: userAchievement.stats,
    earnedBadges,
    allBadges,
    totalBadges: Object.keys(BADGES).length,
    earnedCount: earnedBadges.length
  };
}

// Get leaderboard data
export async function getLeaderboard(department?: string) {
  await connectDB();

  let query: any = {};
  if (department) {
    query.visibleDepartment = department;
  }

  const achievements = await UserAchievement.find(query)
    .sort({ 'badges.length': -1, 'stats.tasksCompleted': -1 })
    .limit(20);

  return achievements.map((achievement: any, index: number) => ({
    rank: index + 1,
    visibleName: achievement.visibleName,
    visibleDepartment: achievement.visibleDepartment,
    visiblePosition: achievement.visiblePosition,
    visibleId: achievement.user,
    badgeCount: achievement.badges.length,
    badges: achievement.badges.map((b: any) => {
      const badgeDetails = Object.values(BADGES).find(badge => badge.id === b.badgeId);
      return {
        icon: badgeDetails?.icon || '',
        name: badgeDetails?.name || '',
        description: badgeDetails?.description || ''
      };
    }),
    tasksCompleted: achievement.stats.tasksCompleted,
    currentStreak: achievement.stats.currentStreak
  }));
}
