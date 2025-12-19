'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
}

interface Stats {
  totalProjects: number;
  activeSprints: number;
  plannedSprints: number;
  completedSprints: number;
  availableBacklogs: number;
  inSprintBacklogs: number;
  completedBacklogs: number;
  teamMembers?: number;
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
  pendingTasks?: number;
}

interface Backlog {
  _id: string;
  title: string;
  project: string;
  taskStatus: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  sprint?: {
    _id: string;
    name: string;
    status: string;
    endDate: string;
  };
}

interface Sprint {
  _id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  managers?: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
}

interface TaskNearingDeadline {
  backlog: Backlog;
  daysUntilEnd: number;
}

interface OverdueItem {
  backlog: Backlog;
  daysOverdue: number;
}

interface UpcomingTask {
  backlog: Backlog;
  dueDate: Date;
  daysUntil: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeSprints: 0,
    plannedSprints: 0,
    completedSprints: 0,
    availableBacklogs: 0,
    inSprintBacklogs: 0,
    completedBacklogs: 0,
  });
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [tasksNearingDeadline, setTasksNearingDeadline] = useState<TaskNearingDeadline[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const backlogsRes = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const backlogsData = await backlogsRes.json();

      const sprintsRes = await fetch('/api/sprints', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sprintsData = await sprintsRes.json();

      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersRes.json();

      const errors: string[] = [];
      if (!backlogsData.success) errors.push(`Backlogs: ${backlogsData.message || 'Failed to load'}`);
      if (!sprintsData.success) errors.push(`Sprints: ${sprintsData.message || 'Failed to load'}`);
      if (!usersData.success) errors.push(`Users: ${usersData.message || 'Failed to load'}`);

      if (errors.length > 0) {
        setError(errors.join(', '));
        console.error('Dashboard API errors:', errors);
      }

      if (backlogsData.success && sprintsData.success && usersData.success) {
        const backlogs = backlogsData.backlogs;
        const sprints = sprintsData.sprints;
        const users = usersData.users;

        const isTeamMember = user?.role === 'member';
        const isManager = user?.role === 'manager';
        const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

        const filteredSprints = isManager
          ? sprints.filter((s: Sprint) =>
              s.managers?.some((m) => m._id === user?.id)
            )
          : sprints;

        const filteredSprintIds = new Set(filteredSprints.map((s: Sprint) => s._id));

        let filteredBacklogs: Backlog[];
        if (isTeamMember) {
          filteredBacklogs = backlogs.filter(
            (b: Backlog) =>
              b.assignee?._id === user?.id &&
              b.sprint &&
              (b.sprint.status === 'active' || b.sprint.status === 'completed')
          );
        } else if (isManager) {
          filteredBacklogs = backlogs.filter((b: Backlog) =>
            b.sprint && filteredSprintIds.has(b.sprint._id)
          );
        } else {
          filteredBacklogs = backlogs;
        }

        const filteredUsers = isManager
          ? users.filter((u: any) =>
              filteredBacklogs.some((b: Backlog) => b.assignee?._id === u._id)
            )
          : users;

        setBacklogs(filteredBacklogs);
        setSprints(filteredSprints);

        const projects = new Set(filteredBacklogs.map((b: Backlog) => b.project));
        const activeSprints = filteredSprints.filter((s: Sprint) => s.status === 'active').length;
        const plannedSprints = filteredSprints.filter((s: Sprint) => s.status === 'planned').length;
        const completedSprints = filteredSprints.filter((s: Sprint) => s.status === 'completed').length;
        const availableBacklogs = filteredBacklogs.filter((b: Backlog) => b.status === 'backlog').length;
        const inSprintBacklogs = filteredBacklogs.filter((b: Backlog) => b.status === 'in-sprint').length;
        const completedBacklogs = filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'completed').length;
        const inProgressTasks = filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'in-progress').length;
        const pendingTasks = filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'pending').length;

        const isAdminOrManager = isAdmin || isManager;

        const activeTasks = isTeamMember
          ? filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'pending' || b.taskStatus === 'in-progress').length
          : 0;

        setStats({
          totalProjects: projects.size,
          activeSprints,
          plannedSprints,
          completedSprints,
          availableBacklogs,
          inSprintBacklogs,
          completedBacklogs,
          inProgressTasks,
          pendingTasks,
          ...(isAdminOrManager && {
            teamMembers: filteredUsers.length,
          }),
          ...(isTeamMember && {
            totalTasks: activeTasks,
            completedTasks: completedBacklogs,
          }),
        });

        const now = new Date();
        const tasksNearing: TaskNearingDeadline[] = [];
        const overdue: OverdueItem[] = [];
        const upcoming: UpcomingTask[] = [];

        filteredBacklogs.forEach((backlog: Backlog) => {
          if (
            backlog.sprint &&
            backlog.sprint.endDate &&
            backlog.taskStatus !== 'completed'
          ) {
            const endDate = new Date(backlog.sprint.endDate);
            const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Check for overdue items (past end date)
            if (daysUntilEnd < 0) {
              overdue.push({
                backlog,
                daysOverdue: Math.abs(daysUntilEnd),
              });
            } else if (backlog.sprint.status === 'active') {
              // Add to upcoming tasks (next 7 days)
              if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
                upcoming.push({
                  backlog,
                  dueDate: endDate,
                  daysUntil: daysUntilEnd,
                });
              }
              // Only show nearing deadline for active sprints
              const threshold = isAdminOrManager ? 7 : 3;
              if (daysUntilEnd >= 0 && daysUntilEnd <= threshold) {
                tasksNearing.push({
                  backlog,
                  daysUntilEnd,
                });
              }
            }
          }
        });

        overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
        setOverdueItems(overdue);

        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
        setUpcomingTasks(upcoming);

        tasksNearing.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
        setTasksNearingDeadline(tasksNearing);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading dashboard...</div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  const isAdminOrManager = user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager';

  if (error) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#f56565" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
            </svg>
          </div>
          <h3 style={styles.errorTitle}>Failed to Load Dashboard</h3>
          <p style={styles.errorMessage}>{error}</p>
          <button
            style={styles.retryButton}
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
            }}
          >
            Try Again
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.welcomeSection}>
          <div>
            <h2 style={styles.welcomeTitle}>Welcome back, {user.name}!</h2>
            <p style={styles.welcomeSubtitle}>Here's what's happening with your projects today</p>
          </div>
        </div>

        {/* Key Metrics - Admin/Manager */}
        {isAdminOrManager && (
          <div style={styles.metricsGrid}>
            {[
              { label: 'Total Projects', value: stats.totalProjects, icon: 'projects', color: '#879BFF' },
              { label: 'Active Sprints', value: stats.activeSprints, icon: 'sprints', color: '#FF6495' },
              { label: 'Team Members', value: stats.teamMembers, icon: 'team', color: '#48bb78' },
              { label: 'Completed Tasks', value: stats.completedBacklogs, icon: 'tasks', color: '#4299e1' },
            ].map((metric) => (
              <div key={metric.label} style={styles.metricCard}>
                <div style={{...styles.metricIcon, background: `${metric.color}15`}}>
                  {metric.icon === 'projects' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={metric.color} viewBox="0 0 16 16">
                      <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                    </svg>
                  )}
                  {metric.icon === 'sprints' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={metric.color} viewBox="0 0 16 16">
                      <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                    </svg>
                  )}
                  {metric.icon === 'team' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={metric.color} viewBox="0 0 16 16">
                      <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                    </svg>
                  )}
                  {metric.icon === 'tasks' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={metric.color} viewBox="0 0 16 16">
                      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                    </svg>
                  )}
                </div>
                <div style={styles.metricContent}>
                  <span style={styles.metricLabel}>{metric.label}</span>
                  <span style={styles.metricValue}>{metric.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Member Stats */}
        {user.role === 'member' && (
          <div style={styles.metricsGrid}>
            {[
              { label: 'Total Projects', value: stats.totalProjects, color: '#879BFF' },
              { label: 'Total Tasks', value: stats.totalTasks, color: '#ed8936' },
              { label: 'Completed Tasks', value: stats.completedTasks, color: '#48bb78' },
            ].map((metric) => (
              <div key={metric.label} style={styles.metricCard}>
                <div style={{...styles.metricIcon, background: `${metric.color}15`}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill={metric.color} viewBox="0 0 16 16">
                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                  </svg>
                </div>
                <div style={styles.metricContent}>
                  <span style={styles.metricLabel}>{metric.label}</span>
                  <span style={styles.metricValue}>{metric.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts Row - Overdue & Upcoming */}
        {(overdueItems.length > 0 || upcomingTasks.length > 0) && (
          <div style={styles.alertsRow}>
            {/* Overdue Items */}
            <div style={{...styles.alertCard, ...(overdueItems.length > 0 ? styles.overdueAlert : styles.alertCardEmpty)}}>
              <div style={styles.alertCardHeader}>
                <div style={{...styles.alertCardIcon, background: overdueItems.length > 0 ? '#ef4444' : '#e2e8f0'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 16 16">
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                  </svg>
                </div>
                <div style={styles.alertCardTextGroup}>
                  <h3 style={{...styles.alertCardTitle, color: overdueItems.length > 0 ? '#991b1b' : '#64748b'}}>Overdue</h3>
                  <span style={{...styles.alertCardCount, color: overdueItems.length > 0 ? '#dc2626' : '#94a3b8'}}>{overdueItems.length}</span>
                </div>
              </div>
              {overdueItems.length > 0 ? (
                <div style={styles.alertItemsList}>
                  {overdueItems.slice(0, 4).map((item) => (
                    <div key={item.backlog._id} style={styles.overdueItemRow}>
                      <div style={styles.alertItemContent}>
                        <span style={styles.alertItemTitle}>{item.backlog.title}</span>
                        <div style={styles.alertItemMeta}>
                          <span style={styles.alertItemAssignee}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>
                            </svg>
                            {item.backlog.assignee?.name || 'Unassigned'}
                          </span>
                          <span style={styles.alertItemDate}>
                            Due: {new Date(item.backlog.sprint?.endDate || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <span style={styles.overdueItemBadge}>{item.daysOverdue}d overdue</span>
                    </div>
                  ))}
                  {overdueItems.length > 4 && (
                    <Link href="/tasks" style={styles.alertViewMore}>+{overdueItems.length - 4} more</Link>
                  )}
                </div>
              ) : (
                <div style={styles.alertEmptyState}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#22c55e" viewBox="0 0 16 16">
                    <path d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                    <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
                  </svg>
                  <span style={styles.alertEmptyText}>All caught up!</span>
                </div>
              )}
            </div>

            {/* Planned Sprints */}
            <div style={styles.upcomingCard}>
              <div style={styles.alertCardHeader}>
                <div style={{...styles.alertCardIcon, background: '#879BFF'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 16 16">
                    <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1z"/>
                  </svg>
                </div>
                <div style={styles.alertCardTextGroup}>
                  <h3 style={{...styles.alertCardTitle, color: '#1e293b'}}>Planned Sprints</h3>
                  <span style={{...styles.alertCardCount, color: '#879BFF'}}>{sprints.filter(s => s.status === 'planned').length}</span>
                </div>
              </div>
              {(() => {
                const plannedSprints = sprints.filter(s => s.status === 'planned');

                if (plannedSprints.length === 0) {
                  return (
                    <div style={styles.alertEmptyState}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#879BFF" viewBox="0 0 16 16">
                        <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1z"/>
                      </svg>
                      <span style={styles.alertEmptyText}>No planned sprints</span>
                    </div>
                  );
                }

                return (
                  <div style={styles.plannedSprintsList}>
                    {plannedSprints.slice(0, 4).map((sprint) => {
                      const startDate = new Date(sprint.startDate || '');
                      const endDate = new Date(sprint.endDate || '');
                      const daysUntilStart = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <div key={sprint._id} style={styles.plannedSprintItem}>
                          <div style={styles.plannedSprintLeft}>
                            <div style={styles.plannedSprintDot} />
                            <div style={styles.plannedSprintInfo}>
                              <span style={styles.plannedSprintName}>{sprint.name}</span>
                              <span style={styles.plannedSprintDate}>
                                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <span style={styles.plannedSprintBadge}>
                            {daysUntilStart <= 0 ? 'Ready' : `In ${daysUntilStart}d`}
                          </span>
                        </div>
                      );
                    })}
                    {plannedSprints.length > 4 && (
                      <Link href="/sprints" style={styles.alertViewMore}>+{plannedSprints.length - 4} more sprints</Link>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        {isAdminOrManager && (
          <div style={styles.mainContentGrid}>
            {/* Task Status */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>Task Status</h3>
                <Link href="/backlogs" style={styles.viewAllLink}>View All →</Link>
              </div>
              <div style={styles.taskStatusList}>
                {[
                  { label: 'In Progress', count: stats.inProgressTasks, color: '#879BFF' },
                  { label: 'Pending', count: stats.pendingTasks, color: '#718096' },
                  { label: 'Completed', count: stats.completedBacklogs, color: '#48bb78' },
                  { label: 'Backlog', count: stats.availableBacklogs, color: '#e2e8f0' },
                ].map((status) => (
                  <div key={status.label} style={styles.taskStatusItem}>
                    <div style={styles.taskStatusLeft}>
                      <div style={{...styles.taskStatusDot, background: status.color}} />
                      <span style={styles.taskStatusLabel}>{status.label}</span>
                    </div>
                    <span style={styles.taskStatusCount}>{status.count}</span>
                  </div>
                ))}
              </div>
              <div style={styles.taskBreakdownSection}>
                <div style={styles.taskBreakdownBar}>
                  {backlogs.length > 0 && (
                    <>
                      <div style={{...styles.taskBreakdownSegment, background: '#879BFF', width: `${(stats.inProgressTasks! / backlogs.length) * 100}%`}} />
                      <div style={{...styles.taskBreakdownSegment, background: '#718096', width: `${(stats.pendingTasks! / backlogs.length) * 100}%`}} />
                      <div style={{...styles.taskBreakdownSegment, background: '#48bb78', width: `${(stats.completedBacklogs / backlogs.length) * 100}%`}} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Nearing Deadline */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                  </svg>
                  Tasks Nearing Deadline
                </h3>
                <span style={styles.taskCountBadge}>{tasksNearingDeadline.length}</span>
              </div>
              {tasksNearingDeadline.length === 0 ? (
                <div style={styles.emptyStateCompact}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#48bb78" viewBox="0 0 16 16" style={{marginBottom: '12px'}}>
                    <path d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                    <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
                  </svg>
                  <p style={styles.emptyStateText}>No urgent tasks</p>
                  <p style={styles.emptyStateSubtext}>All tasks are on track!</p>
                </div>
              ) : (
                <div style={styles.scrollableTaskList}>
                  {tasksNearingDeadline.map((task) => {
                    const isUrgent = task.daysUntilEnd <= 2;
                    const priorityColor = task.backlog.priority === 'high' ? '#f56565' : task.backlog.priority === 'medium' ? '#ed8936' : '#48bb78';
                    return (
                      <div key={task.backlog._id} style={{...styles.urgentTaskCardCompact, borderLeft: `4px solid ${isUrgent ? '#f56565' : '#ed8936'}`}}>
                        <div style={styles.urgentTaskCompactHeader}>
                          <h4 style={styles.urgentTaskTitleCompact}>{task.backlog.title}</h4>
                          <span style={{...styles.urgentTaskBadgeCompact, background: isUrgent ? '#f5656515' : '#ed893615', color: isUrgent ? '#f56565' : '#ed8936'}}>
                            {task.daysUntilEnd === 0 ? 'Today' : task.daysUntilEnd === 1 ? '1 day' : `${task.daysUntilEnd}d`}
                          </span>
                        </div>
                        <div style={styles.urgentTaskMetaCompact}>
                          <span style={styles.urgentTaskMetaItemCompact}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '4px'}}>
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                            </svg>
                            {task.backlog.assignee?.name || 'Unassigned'}
                          </span>
                          <span style={{...styles.priorityDotCompact, background: priorityColor}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sprint Overview */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>Sprint Overview</h3>
                <Link href="/sprints" style={styles.viewAllLink}>View All →</Link>
              </div>
              <div style={styles.sprintStatsGridVertical}>
                {[
                  { label: 'Active', desc: 'Currently running', value: stats.activeSprints, color: '#FF6495' },
                  { label: 'Planned', desc: 'Ready to start', value: stats.plannedSprints, color: '#4299e1' },
                  { label: 'Completed', desc: 'Successfully finished', value: stats.completedSprints, color: '#48bb78' },
                ].map((sprint) => (
                  <div key={sprint.label} style={styles.sprintStatItemVertical}>
                    <div style={{...styles.sprintStatCircleSmall, borderColor: sprint.color, background: `${sprint.color}15`}}>
                      <span style={{...styles.sprintStatNumberSmall, color: sprint.color}}>{sprint.value}</span>
                    </div>
                    <div style={styles.sprintStatTextGroup}>
                      <span style={styles.sprintStatLabelHorizontal}>{sprint.label}</span>
                      <span style={styles.sprintStatDescription}>{sprint.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                  <span style={styles.progressLabel}>Overall Progress</span>
                  <span style={styles.progressPercentage}>
                    {sprints.length > 0 ? Math.round((stats.completedSprints / sprints.length) * 100) : 0}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: `${sprints.length > 0 ? (stats.completedSprints / sprints.length) * 100 : 0}%`}} />
                </div>
              </div>
            </div>

            {/* Project Progress */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>Project Progress</h3>
                <select
                  style={styles.projectFilterSelect}
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {Array.from(new Set(backlogs.map((b) => b.project))).sort().map((project) => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div style={styles.scrollableProjectList}>
                {(() => {
                  const projectData = new Map<string, { total: number; completed: number; inProgress: number }>();
                  backlogs.forEach((backlog) => {
                    const project = backlog.project;
                    if (!projectData.has(project)) {
                      projectData.set(project, { total: 0, completed: 0, inProgress: 0 });
                    }
                    const data = projectData.get(project)!;
                    data.total++;
                    if (backlog.taskStatus === 'completed') data.completed++;
                    else if (backlog.taskStatus === 'in-progress') data.inProgress++;
                  });
                  const filteredProjects = selectedProject === 'all'
                    ? Array.from(projectData.entries())
                    : Array.from(projectData.entries()).filter(([project]) => project === selectedProject);
                  if (filteredProjects.length === 0) {
                    return (
                      <div style={styles.emptyState}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#cbd5e0" viewBox="0 0 16 16" style={{marginBottom: '16px'}}>
                          <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923z"/>
                        </svg>
                        <p style={styles.emptyStateText}>No projects found</p>
                      </div>
                    );
                  }
                  return filteredProjects.map(([project, data]) => {
                    const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                    return (
                      <Link key={project} href={`/timeline?view=project&project=${encodeURIComponent(project)}`} style={{textDecoration: 'none'}}>
                        <div style={styles.projectProgressCardCompact}>
                          <div style={styles.projectProgressHeaderCompact}>
                            <h4 style={styles.projectProgressTitleCompact}>{project}</h4>
                            <span style={styles.projectProgressPercentageCompact}>{percentage}%</span>
                          </div>
                          <div style={styles.projectProgressBar}>
                            <div style={{...styles.projectProgressFill, width: `${percentage}%`, background: percentage === 100 ? '#48bb78' : percentage >= 50 ? '#4299e1' : '#879BFF'}} />
                          </div>
                          <div style={styles.projectProgressStatsCompact}>
                            <div style={styles.projectProgressStatItemCompact}>
                              <span style={styles.projectProgressStatLabelCompact}>Total</span>
                              <span style={styles.projectProgressStatValueCompact}>{data.total}</span>
                            </div>
                            <div style={styles.projectProgressStatItemCompact}>
                              <span style={styles.projectProgressStatLabelCompact}>Active</span>
                              <span style={{...styles.projectProgressStatValueCompact, color: '#879BFF'}}>{data.inProgress}</span>
                            </div>
                            <div style={styles.projectProgressStatItemCompact}>
                              <span style={styles.projectProgressStatLabelCompact}>Done</span>
                              <span style={{...styles.projectProgressStatValueCompact, color: '#48bb78'}}>{data.completed}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Team Member Dashboard */}
        {user.role === 'member' && (
          <div style={styles.mainContentGrid}>
            {/* Tasks Nearing Deadline */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>Tasks Nearing Deadline</h3>
              </div>
              {tasksNearingDeadline.length === 0 ? (
                <div style={styles.emptyState}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#48bb78" viewBox="0 0 16 16" style={{marginBottom: '12px'}}>
                    <path d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                  </svg>
                  <p style={styles.emptyStateText}>No urgent deadlines</p>
                  <p style={styles.emptyStateSubtext}>Keep up the great work!</p>
                </div>
              ) : (
                <div style={styles.memberTaskList}>
                  {tasksNearingDeadline.map((task) => (
                    <Link key={task.backlog._id} href={`/tasks?taskId=${task.backlog._id}`} style={{textDecoration: 'none'}}>
                      <div style={styles.memberTaskItem}>
                        <div style={styles.memberTaskLeft}>
                          <div style={{...styles.memberTaskIndicator, background: task.daysUntilEnd <= 1 ? '#f56565' : '#ed8936'}} />
                          <div>
                            <h4 style={styles.memberTaskTitle}>{task.backlog.title}</h4>
                            <span style={styles.memberTaskMeta}>{task.backlog.project}</span>
                          </div>
                        </div>
                        <span style={{...styles.memberTaskBadge, background: task.daysUntilEnd <= 1 ? '#f5656515' : '#ed893615', color: task.daysUntilEnd <= 1 ? '#f56565' : '#ed8936'}}>
                          {task.daysUntilEnd === 0 ? 'Today' : task.daysUntilEnd === 1 ? '1 day' : `${task.daysUntilEnd} days`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* My Active Tasks */}
            <div style={styles.contentCard}>
              <div style={styles.contentCardHeader}>
                <h3 style={styles.contentCardTitle}>My Active Tasks</h3>
                <Link href="/tasks" style={styles.viewAllLink}>View All →</Link>
              </div>
              {(() => {
                const activeTasks = backlogs.filter((b) => b.taskStatus === 'pending' || b.taskStatus === 'in-progress');
                if (activeTasks.length === 0) {
                  return (
                    <div style={styles.emptyState}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#48bb78" viewBox="0 0 16 16" style={{marginBottom: '12px'}}>
                        <path d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                      </svg>
                      <p style={styles.emptyStateText}>No active tasks</p>
                      <p style={styles.emptyStateSubtext}>You're all caught up!</p>
                    </div>
                  );
                }
                return (
                  <div style={styles.memberTaskList}>
                    {activeTasks.slice(0, 5).map((backlog) => (
                      <Link key={backlog._id} href={`/tasks?taskId=${backlog._id}`} style={{textDecoration: 'none'}}>
                        <div style={styles.memberTaskItem}>
                          <div style={styles.memberTaskLeft}>
                            <div style={{...styles.memberTaskIndicator, background: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096'}} />
                            <div>
                              <h4 style={styles.memberTaskTitle}>{backlog.title}</h4>
                              <span style={styles.memberTaskMeta}>{backlog.project}</span>
                            </div>
                          </div>
                          <span style={{...styles.memberTaskBadge, background: backlog.taskStatus === 'in-progress' ? '#4299e115' : '#71809615', color: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096'}}>
                            {backlog.taskStatus.replace('-', ' ')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { width: '100%', maxWidth: '1400px', margin: '0 auto' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#718096' },
  welcomeSection: { marginBottom: '32px' },
  welcomeTitle: { fontSize: '32px', fontWeight: '700', color: '#2d3748', margin: 0, marginBottom: '8px' },
  welcomeSubtitle: { fontSize: '16px', color: '#718096', margin: 0 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' },
  metricCard: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f1f5f9' },
  metricIcon: { width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metricContent: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metricLabel: { fontSize: '14px', color: '#718096', fontWeight: '500' },
  metricValue: { fontSize: '32px', fontWeight: '700', color: '#2d3748', lineHeight: '1' },
  alertsRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' },
  alertCard: { background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' },
  alertCardEmpty: { background: '#f8fafc' },
  overdueAlert: { background: '#fef2f2', border: '1px solid #fecaca' },
  upcomingCard: { background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' },
  alertCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  alertCardIcon: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alertCardTextGroup: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 },
  alertCardTitle: { fontSize: '15px', fontWeight: '600', margin: 0 },
  alertCardCount: { fontSize: '20px', fontWeight: '700' },
  alertItemsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  overdueItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #fecaca', gap: '12px' },
  alertItemContent: { flex: 1, minWidth: 0 },
  alertItemTitle: { fontSize: '13px', fontWeight: '600', color: '#1e293b', display: 'block', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  alertItemMeta: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' },
  alertItemAssignee: { display: 'flex', alignItems: 'center', gap: '4px' },
  alertItemDate: { color: '#dc2626' },
  overdueItemBadge: { fontSize: '10px', fontWeight: '600', color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 },
  alertViewMore: { fontSize: '12px', color: '#879BFF', textDecoration: 'none', fontWeight: '500', textAlign: 'center', paddingTop: '8px' },
  alertEmptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '8px' },
  alertEmptyText: { fontSize: '13px', color: '#64748b' },
  plannedSprintsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  plannedSprintItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' },
  plannedSprintLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 },
  plannedSprintDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#879BFF', flexShrink: 0 },
  plannedSprintInfo: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  plannedSprintName: { fontSize: '13px', fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  plannedSprintDate: { fontSize: '11px', color: '#64748b' },
  plannedSprintBadge: { fontSize: '11px', fontWeight: '600', color: '#879BFF', background: '#E8ECFF', padding: '4px 10px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 },
  mainContentGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  contentCard: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  contentCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  contentCardTitle: { fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: 0, display: 'flex', alignItems: 'center' },
  viewAllLink: { fontSize: '14px', color: '#879BFF', textDecoration: 'none', fontWeight: '600' },
  taskStatusList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  taskStatusItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f7fafc', borderRadius: '10px' },
  taskStatusLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  taskStatusDot: { width: '10px', height: '10px', borderRadius: '50%' },
  taskStatusLabel: { fontSize: '14px', color: '#4a5568', fontWeight: '500' },
  taskStatusCount: { fontSize: '18px', fontWeight: '700', color: '#2d3748' },
  taskBreakdownSection: { marginTop: '16px' },
  taskBreakdownBar: { height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex' },
  taskBreakdownSegment: { height: '100%' },
  taskCountBadge: { padding: '4px 12px', background: '#f5656515', color: '#f56565', borderRadius: '8px', fontSize: '13px', fontWeight: '700' },
  scrollableTaskList: { maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  urgentTaskCardCompact: { background: '#fafbfc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' },
  urgentTaskCompactHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' },
  urgentTaskTitleCompact: { fontSize: '14px', fontWeight: '600', color: '#2d3748', margin: 0, lineHeight: '1.4', flex: 1 },
  urgentTaskBadgeCompact: { padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 },
  urgentTaskMetaCompact: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#718096' },
  urgentTaskMetaItemCompact: { display: 'flex', alignItems: 'center' },
  priorityDotCompact: { width: '8px', height: '8px', borderRadius: '50%' },
  emptyStateCompact: { textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sprintStatsGridVertical: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  sprintStatItemVertical: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fafbfc', borderRadius: '10px' },
  sprintStatCircleSmall: { width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid', flexShrink: 0 },
  sprintStatNumberSmall: { fontSize: '20px', fontWeight: '700' },
  sprintStatTextGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sprintStatLabelHorizontal: { fontSize: '14px', color: '#2d3748', fontWeight: '600' },
  sprintStatDescription: { fontSize: '11px', color: '#a0aec0' },
  progressSection: { marginTop: '20px' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  progressLabel: { fontSize: '14px', color: '#718096', fontWeight: '500' },
  progressPercentage: { fontSize: '14px', color: '#2d3748', fontWeight: '700' },
  progressBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#48bb78', borderRadius: '4px', transition: 'width 0.3s' },
  projectFilterSelect: { padding: '8px 14px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '500', color: '#4a5568', background: 'white', cursor: 'pointer', outline: 'none' },
  scrollableProjectList: { maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  projectProgressCardCompact: { background: '#fafbfc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  projectProgressHeaderCompact: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  projectProgressTitleCompact: { fontSize: '15px', fontWeight: '600', color: '#2d3748', margin: 0 },
  projectProgressPercentageCompact: { fontSize: '18px', fontWeight: '700', color: '#879BFF' },
  projectProgressBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' },
  projectProgressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  projectProgressStatsCompact: { display: 'flex', gap: '20px', marginTop: '12px' },
  projectProgressStatItemCompact: { display: 'flex', flexDirection: 'column', gap: '4px' },
  projectProgressStatLabelCompact: { fontSize: '11px', color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase' },
  projectProgressStatValueCompact: { fontSize: '16px', fontWeight: '700', color: '#2d3748' },
  emptyState: { textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  emptyStateText: { fontSize: '16px', fontWeight: '600', color: '#4a5568', margin: '0 0 4px 0' },
  emptyStateSubtext: { fontSize: '14px', color: '#a0aec0', margin: 0 },
  memberTaskList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  memberTaskItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#fafbfc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  memberTaskLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 },
  memberTaskIndicator: { width: '4px', height: '40px', borderRadius: '2px', flexShrink: 0 },
  memberTaskTitle: { fontSize: '14px', fontWeight: '600', color: '#2d3748', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  memberTaskMeta: { fontSize: '12px', color: '#a0aec0' },
  memberTaskBadge: { padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', whiteSpace: 'nowrap' },
  errorContainer: { textAlign: 'center', padding: '80px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' },
  errorIcon: { marginBottom: '24px' },
  errorTitle: { fontSize: '24px', fontWeight: '600', color: '#2d3748', margin: '0 0 12px 0' },
  errorMessage: { fontSize: '14px', color: '#718096', margin: '0 0 24px 0', lineHeight: '1.6' },
  retryButton: { background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
