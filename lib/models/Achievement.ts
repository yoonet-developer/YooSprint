import mongoose from 'mongoose';

// Badge definitions - all available badges in the system
export const BADGES = {
  // Beginner Badges
  FIRST_STEP: {
    id: 'first_step',
    name: 'First Step',
    icon: '⭐',
    description: 'Complete your first task',
    category: 'beginner',
    criteria: { type: 'tasks_completed', count: 1 }
  },
  GETTING_STARTED: {
    id: 'getting_started',
    name: 'Getting Started',
    icon: '🚀',
    description: 'Join your first sprint',
    category: 'beginner',
    criteria: { type: 'sprints_joined', count: 1 }
  },
  CONTRIBUTOR: {
    id: 'contributor',
    name: 'Contributor',
    icon: '📝',
    description: 'Create your first backlog item',
    category: 'beginner',
    criteria: { type: 'backlogs_created', count: 1 }
  },

  // Progress Badges
  ON_FIRE: {
    id: 'on_fire',
    name: 'On Fire',
    icon: '🔥',
    description: 'Complete 10 tasks',
    category: 'progress',
    criteria: { type: 'tasks_completed', count: 10 }
  },
  SPRINT_FINISHER: {
    id: 'sprint_finisher',
    name: 'Sprint Finisher',
    icon: '🏃',
    description: 'Complete all your tasks in a sprint',
    category: 'progress',
    criteria: { type: 'sprint_all_tasks_completed', count: 1 }
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    icon: '⚡',
    description: 'Complete a task within 24 hours',
    category: 'progress',
    criteria: { type: 'task_completed_within_24h', count: 1 }
  },
  CONSISTENT: {
    id: 'consistent',
    name: 'Consistent',
    icon: '💪',
    description: 'Complete tasks in 3 consecutive sprints',
    category: 'progress',
    criteria: { type: 'consecutive_sprints_with_completions', count: 3 }
  },

  // Elite Badges
  SPRINT_CHAMPION: {
    id: 'sprint_champion',
    name: 'Sprint Champion',
    icon: '🏆',
    description: 'Be the top performer in a sprint',
    category: 'elite',
    criteria: { type: 'top_performer_in_sprint', count: 1 }
  },
  TASK_MASTER: {
    id: 'task_master',
    name: 'Task Master',
    icon: '💎',
    description: 'Complete 50 tasks total',
    category: 'elite',
    criteria: { type: 'tasks_completed', count: 50 }
  },
  LEGEND: {
    id: 'legend',
    name: 'Legend',
    icon: '👑',
    description: 'Complete 100 tasks total',
    category: 'elite',
    criteria: { type: 'tasks_completed', count: 100 }
  },

  // Streak Badges
  STREAK_3_DAY: {
    id: 'streak_3_day',
    name: '3-Day Streak',
    icon: '🔥',
    description: 'Complete tasks 3 days in a row',
    category: 'streak',
    criteria: { type: 'daily_streak', count: 3 }
  },
  STREAK_7_DAY: {
    id: 'streak_7_day',
    name: '7-Day Streak',
    icon: '🔥🔥',
    description: 'Complete tasks 7 days in a row',
    category: 'streak',
    criteria: { type: 'daily_streak', count: 7 }
  },
  STREAK_30_DAY: {
    id: 'streak_30_day',
    name: '30-Day Streak',
    icon: '🔥🔥🔥',
    description: 'Complete tasks 30 days in a row',
    category: 'streak',
    criteria: { type: 'daily_streak', count: 30 }
  },
  COMEBACK: {
    id: 'comeback',
    name: 'Comeback',
    icon: '❄️',
    description: 'Return after 7+ days inactive and complete a task',
    category: 'streak',
    criteria: { type: 'comeback_after_inactive', count: 7 }
  }
};

// User Achievement Schema - tracks which badges a user has earned
const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visibleName: {
    type: String,
    default: ''
  },
  visibleDepartment: {
    type: String,
    default: ''
  },
  visiblePosition: {
    type: String,
    default: ''
  },
  badges: [{
    badgeId: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Stats for tracking progress
  stats: {
    tasksCompleted: { type: Number, default: 0 },
    backlogsCreated: { type: Number, default: 0 },
    sprintsJoined: { type: Array, default: [] }, // Array of sprint IDs
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastTaskCompletedAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
    sprintsWithCompletions: { type: Array, default: [] }, // Array of sprint IDs where user completed tasks
    speedDemonCount: { type: Number, default: 0 }, // Tasks completed within 24h
    sprintFinisherCount: { type: Number, default: 0 }, // Sprints where all tasks completed
    topPerformerCount: { type: Number, default: 0 } // Times being top performer
  }
}, {
  timestamps: true
});

// Index for faster queries
userAchievementSchema.index({ user: 1 }, { unique: true });

const UserAchievement = mongoose.models.UserAchievement || mongoose.model('UserAchievement', userAchievementSchema);

export default UserAchievement;
