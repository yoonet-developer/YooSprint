'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  earned: boolean;
  earnedAt: string | null;
}

interface Stats {
  tasksCompleted: number;
  backlogsCreated: number;
  currentStreak: number;
  longestStreak: number;
  sprintsJoined: string[];
  sprintsWithCompletions: string[];
}

interface BadgeInfo {
  icon: string;
  name: string;
  description: string;
}

interface LeaderboardEntry {
  rank: number;
  visibleName: string;
  visibleDepartment: string;
  visiblePosition: string;
  visibleId: string;
  badgeCount: number;
  badges: BadgeInfo[];
  tasksCompleted: number;
  currentStreak: number;
}

interface Achievements {
  userId: string;
  stats: Stats;
  allBadges: Badge[];
  earnedCount: number;
  totalBadges: number;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievements | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Default badges to show if API fails
  const defaultBadges: Badge[] = [
    { id: 'first_step', name: 'First Step', icon: '⭐', description: 'Complete your first task', category: 'beginner', earned: false, earnedAt: null },
    { id: 'getting_started', name: 'Getting Started', icon: '🚀', description: 'Join your first sprint', category: 'beginner', earned: false, earnedAt: null },
    { id: 'contributor', name: 'Contributor', icon: '📝', description: 'Create your first backlog item', category: 'beginner', earned: false, earnedAt: null },
    { id: 'on_fire', name: 'On Fire', icon: '🔥', description: 'Complete 10 tasks', category: 'progress', earned: false, earnedAt: null },
    { id: 'sprint_finisher', name: 'Sprint Finisher', icon: '🏃', description: 'Complete all your tasks in a sprint', category: 'progress', earned: false, earnedAt: null },
    { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Complete a task within 24 hours', category: 'progress', earned: false, earnedAt: null },
    { id: 'consistent', name: 'Consistent', icon: '💪', description: 'Complete tasks in 3 consecutive sprints', category: 'progress', earned: false, earnedAt: null },
    { id: 'sprint_champion', name: 'Sprint Champion', icon: '🏆', description: 'Be the top performer in a sprint', category: 'elite', earned: false, earnedAt: null },
    { id: 'task_master', name: 'Task Master', icon: '💎', description: 'Complete 50 tasks total', category: 'elite', earned: false, earnedAt: null },
    { id: 'legend', name: 'Legend', icon: '👑', description: 'Complete 100 tasks total', category: 'elite', earned: false, earnedAt: null },
    { id: 'streak_3_day', name: '3-Day Streak', icon: '🔥', description: 'Complete tasks 3 days in a row', category: 'streak', earned: false, earnedAt: null },
    { id: 'streak_7_day', name: '7-Day Streak', icon: '🔥🔥', description: 'Complete tasks 7 days in a row', category: 'streak', earned: false, earnedAt: null },
    { id: 'streak_30_day', name: '30-Day Streak', icon: '🔥🔥🔥', description: 'Complete tasks 30 days in a row', category: 'streak', earned: false, earnedAt: null },
    { id: 'comeback', name: 'Comeback', icon: '❄️', description: 'Return after 7+ days inactive and complete a task', category: 'streak', earned: false, earnedAt: null },
  ];

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch user achievements and leaderboard in parallel
      const [achievementsRes, leaderboardRes] = await Promise.all([
        fetch('/api/achievements?type=user', { headers }),
        fetch('/api/achievements?type=leaderboard', { headers })
      ]);

      const achievementsData = await achievementsRes.json();
      const leaderboardData = await leaderboardRes.json();

      console.log('Achievements response:', achievementsData);

      if (achievementsData.success && achievementsData.data?.achievements) {
        setAchievements(achievementsData.data.achievements);
      } else {
        // Use default badges if API fails
        setAchievements({
          userId: '',
          stats: { tasksCompleted: 0, backlogsCreated: 0, currentStreak: 0, longestStreak: 0, sprintsJoined: [], sprintsWithCompletions: [] },
          allBadges: defaultBadges,
          earnedCount: 0,
          totalBadges: 14
        });
      }
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      // Use default badges on error
      setAchievements({
        userId: '',
        stats: { tasksCompleted: 0, backlogsCreated: 0, currentStreak: 0, longestStreak: 0, sprintsJoined: [], sprintsWithCompletions: [] },
        allBadges: defaultBadges,
        earnedCount: 0,
        totalBadges: 14
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'beginner': return '#4CAF50';
      case 'progress': return '#2196F3';
      case 'elite': return '#9C27B0';
      case 'streak': return '#FF5722';
      default: return '#757575';
    }
  };

  const groupBadgesByCategory = (badges: Badge[]) => {
    const groups: { [key: string]: Badge[] } = {
      beginner: [],
      progress: [],
      elite: [],
      streak: []
    };

    badges.forEach(badge => {
      if (groups[badge.category]) {
        groups[badge.category].push(badge);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.loader}>Loading achievements...</div>
        </div>
      </AppLayout>
    );
  }

  const badgeGroups = achievements ? groupBadgesByCategory(achievements.allBadges) : {};

  return (
    <AppLayout>
      <style>{`
        .badge-tooltip-wrapper:hover .badge-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .badge-tooltip-wrapper:hover .small-badge {
          transform: scale(1.2);
        }
        .badge-card:hover {
          border-color: #879BFF !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 155, 255, 0.2);
        }
      `}</style>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Achievements</h1>
          {achievements && (
            <div style={styles.progressSummary}>
              <span style={styles.badgeCount}>
                {achievements.earnedCount} / {achievements.totalBadges} Badges Unlocked
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {achievements && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>✅</div>
              <div style={styles.statValue}>{achievements.stats.tasksCompleted}</div>
              <div style={styles.statLabel}>Tasks Completed</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>🔥</div>
              <div style={styles.statValue}>{achievements.stats.currentStreak}</div>
              <div style={styles.statLabel}>Current Streak</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>⚡</div>
              <div style={styles.statValue}>{achievements.stats.longestStreak}</div>
              <div style={styles.statLabel}>Longest Streak</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>🏃</div>
              <div style={styles.statValue}>{achievements.stats.sprintsWithCompletions.length}</div>
              <div style={styles.statLabel}>Sprints Completed</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'badges' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('badges')}
          >
            My Badges
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'leaderboard' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {/* Badges Tab */}
        {activeTab === 'badges' && achievements && (
          <div style={styles.badgesContainer}>
            {Object.entries(badgeGroups).map(([category, badges]) => (
              <div key={category} style={styles.categorySection}>
                <h3 style={{
                  ...styles.categoryTitle,
                  borderLeftColor: getCategoryColor(category)
                }}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Badges
                </h3>
                <div style={styles.badgeGrid}>
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="badge-card"
                      style={{
                        ...styles.badgeCard,
                        ...(badge.earned ? styles.earnedBadge : styles.lockedBadge)
                      }}
                      onClick={() => setSelectedBadge(badge)}
                    >
                      <div style={{
                        ...styles.badgeIcon,
                        ...(badge.earned ? {} : styles.lockedBadgeIcon)
                      }}>
                        {badge.icon}
                      </div>
                      <div style={{
                        ...styles.badgeName,
                        ...(badge.earned ? {} : styles.lockedText)
                      }}>{badge.name}</div>
                      <div style={{
                        ...styles.badgeDescription,
                        ...(badge.earned ? {} : styles.lockedText)
                      }}>{badge.description}</div>
                      {badge.earned && badge.earnedAt ? (
                        <div style={styles.earnedDate}>
                          Earned {formatDate(badge.earnedAt)}
                        </div>
                      ) : (
                        <div style={styles.notEarnedText}>Not yet earned</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div style={styles.leaderboardContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Member</th>
                  <th style={styles.th}>Badges</th>
                  <th style={styles.th}>Tasks</th>
                  <th style={styles.th}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.visibleId} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.rank,
                        ...(entry.rank === 1 ? styles.goldRank : {}),
                        ...(entry.rank === 2 ? styles.silverRank : {}),
                        ...(entry.rank === 3 ? styles.bronzeRank : {})
                      }}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.memberInfo}>
                        <div style={styles.memberName}>{entry.visibleName}</div>
                        <div style={styles.memberPosition}>{entry.visiblePosition}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.badgeIcons}>
                        {entry.badges.slice(0, 5).map((badge, i) => (
                          <div key={i} className="badge-tooltip-wrapper" style={styles.badgeTooltipWrapper}>
                            <span className="small-badge" style={styles.smallBadge}>{badge.icon}</span>
                            <div className="badge-tooltip" style={styles.badgeTooltip}>
                              <div style={styles.tooltipName}>{badge.name}</div>
                              <div style={styles.tooltipDesc}>{badge.description}</div>
                            </div>
                          </div>
                        ))}
                        {entry.badges.length > 5 && (
                          <span style={styles.moreBadges}>+{entry.badges.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>{entry.tasksCompleted}</td>
                    <td style={styles.td}>
                      {entry.currentStreak > 0 ? `🔥 ${entry.currentStreak}` : '-'}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} style={styles.emptyState}>
                      No achievements yet. Start completing tasks to earn badges!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div style={styles.modalOverlay} onClick={() => setSelectedBadge(null)}>
            <div style={{
              ...styles.modal,
              ...(selectedBadge.earned ? styles.modalEarned : styles.modalLocked)
            }} onClick={(e) => e.stopPropagation()}>
              <button style={styles.closeButton} onClick={() => setSelectedBadge(null)}>
                ×
              </button>
              <div style={styles.modalContent}>
                <div style={{
                  ...styles.modalBadgeIcon,
                  ...(selectedBadge.earned ? {} : styles.modalLockedIcon)
                }}>
                  {selectedBadge.icon}
                </div>
                <h2 style={styles.modalBadgeName}>{selectedBadge.name}</h2>
                <span style={{
                  ...styles.categoryTag,
                  backgroundColor: selectedBadge.earned ? getCategoryColor(selectedBadge.category) : '#9e9e9e'
                }}>
                  {selectedBadge.category}
                </span>
                <p style={styles.modalDescription}>{selectedBadge.description}</p>
                {selectedBadge.earned ? (
                  <div style={styles.earnedInfo}>
                    Earned on {formatDate(selectedBadge.earnedAt)}
                  </div>
                ) : (
                  <div style={styles.lockedInfo}>
                    Keep working to unlock this badge!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
  },
  loader: {
    fontSize: '18px',
    color: '#879BFF',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
  },
  progressSummary: {
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    padding: '12px 24px',
    borderRadius: '20px',
  },
  badgeCount: {
    color: 'white',
    fontWeight: '600',
    fontSize: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#2d3748',
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    fontSize: '16px',
    fontWeight: '500',
    color: '#718096',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: '#879BFF',
    color: 'white',
  },
  badgesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  categorySection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  categoryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
    paddingLeft: '12px',
    borderLeft: '4px solid',
  },
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '16px',
  },
  badgeCard: {
    background: '#f7fafc',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
  },
  earnedBadge: {
    background: 'linear-gradient(135deg, #f0f9ff 0%, #fff0f5 100%)',
    border: '2px solid #879BFF',
    boxShadow: '0 4px 12px rgba(135, 155, 255, 0.2)',
  },
  lockedBadge: {
    background: '#f1f1f1',
    border: '2px solid #e0e0e0',
  },
  lockedBadgeIcon: {
    filter: 'grayscale(100%)',
    opacity: 0.4,
  },
  lockedText: {
    color: '#9e9e9e',
  },
  notEarnedText: {
    fontSize: '11px',
    color: '#bdbdbd',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  badgeIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  badgeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  badgeDescription: {
    fontSize: '11px',
    color: '#718096',
    marginTop: '4px',
    lineHeight: '1.3',
  },
  earnedDate: {
    fontSize: '11px',
    color: '#48BB78',
    marginTop: '8px',
    fontWeight: '500',
  },
  leaderboardContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '2px solid #e2e8f0',
    color: '#4a5568',
    fontWeight: '600',
    fontSize: '14px',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  rank: {
    fontSize: '18px',
    fontWeight: '700',
  },
  goldRank: {
    color: '#FFD700',
  },
  silverRank: {
    color: '#C0C0C0',
  },
  bronzeRank: {
    color: '#CD7F32',
  },
  memberInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  memberName: {
    fontWeight: '600',
    color: '#2d3748',
  },
  memberPosition: {
    fontSize: '12px',
    color: '#718096',
  },
  badgeIcons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  badgeTooltipWrapper: {
    position: 'relative' as const,
    display: 'inline-block',
    cursor: 'pointer',
  },
  smallBadge: {
    fontSize: '24px',
    display: 'block',
    transition: 'transform 0.2s',
  },
  badgeTooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#2d3748',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    opacity: 0,
    visibility: 'hidden' as const,
    transition: 'opacity 0.2s, visibility 0.2s',
    zIndex: 100,
    marginBottom: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    textAlign: 'center' as const,
  },
  tooltipName: {
    fontWeight: '600',
    marginBottom: '2px',
  },
  tooltipDesc: {
    fontSize: '11px',
    color: '#cbd5e0',
  },
  moreBadges: {
    fontSize: '12px',
    color: '#718096',
    marginLeft: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
    position: 'relative',
    textAlign: 'center',
  },
  modalEarned: {
    background: 'linear-gradient(135deg, #f0f9ff 0%, #fff0f5 100%)',
    border: '3px solid #879BFF',
  },
  modalLocked: {
    background: '#f5f5f5',
    border: '3px solid #e0e0e0',
  },
  modalLockedIcon: {
    filter: 'grayscale(100%)',
    opacity: 0.4,
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#718096',
    cursor: 'pointer',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  modalBadgeIcon: {
    fontSize: '64px',
  },
  modalBadgeName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
  },
  categoryTag: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalDescription: {
    color: '#4a5568',
    fontSize: '16px',
    margin: '8px 0',
  },
  earnedInfo: {
    color: '#48BB78',
    fontWeight: '600',
  },
  lockedInfo: {
    color: '#718096',
    fontStyle: 'italic',
  },
};
