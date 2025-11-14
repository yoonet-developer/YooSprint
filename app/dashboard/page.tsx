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
  const [loading, setLoading] = useState(true);
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
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      // Fetch backlogs
      const backlogsRes = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const backlogsData = await backlogsRes.json();

      // Fetch sprints
      const sprintsRes = await fetch('/api/sprints', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sprintsData = await sprintsRes.json();

      // Fetch users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersRes.json();

      if (backlogsData.success && sprintsData.success && usersData.success) {
        const backlogs = backlogsData.backlogs;
        const sprints = sprintsData.sprints;
        const users = usersData.users;

        // Filter data based on user role
        const isTeamMember = user?.role === 'member';
        const isManager = user?.role === 'manager';
        const isAdmin = user?.role === 'admin';

        // Filter sprints for managers
        const filteredSprints = isManager
          ? sprints.filter((s: Sprint) =>
              s.managers?.some((m) => m._id === user?.id)
            )
          : sprints;

        // Get sprint IDs for filtered sprints
        const filteredSprintIds = new Set(filteredSprints.map((s: Sprint) => s._id));

        // Filter backlogs based on user role
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

        // Filter users for managers
        const filteredUsers = isManager
          ? users.filter((u: any) =>
              filteredBacklogs.some((b: Backlog) => b.assignee?._id === u._id)
            )
          : users;

        setBacklogs(filteredBacklogs);
        setSprints(filteredSprints);

        // Calculate stats
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

        // For team members, calculate active tasks
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

        // Calculate tasks nearing sprint end date
        const now = new Date();
        const tasksNearing: TaskNearingDeadline[] = [];

        filteredBacklogs.forEach((backlog: Backlog) => {
          if (
            backlog.sprint &&
            backlog.sprint.status === 'active' &&
            backlog.sprint.endDate &&
            backlog.taskStatus !== 'completed'
          ) {
            const endDate = new Date(backlog.sprint.endDate);
            const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            const threshold = isAdminOrManager ? 7 : 3;
            if (daysUntilEnd >= 0 && daysUntilEnd <= threshold) {
              tasksNearing.push({
                backlog,
                daysUntilEnd,
              });
            }
          }
        });

        tasksNearing.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
        setTasksNearingDeadline(tasksNearing);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

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

        {/* Key Metrics - Modern Cards */}
        {isAdminOrManager && (
          <div style={styles.metricsGrid}>
            {/* Total Projects */}
            <div style={styles.metricCard}>
              <div style={styles.metricIcon} className="projects">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Total Projects</span>
                <span style={styles.metricValue}>{stats.totalProjects}</span>
              </div>
            </div>

            {/* Active Sprints */}
            <div style={styles.metricCard}>
              <div style={{...styles.metricIcon, background: '#FF649515'}} className="sprints">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#FF6495" viewBox="0 0 16 16">
                  <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Active Sprints</span>
                <span style={styles.metricValue}>{stats.activeSprints}</span>
              </div>
            </div>

            {/* Team Members */}
            <div style={styles.metricCard}>
              <div style={{...styles.metricIcon, background: '#48bb7815'}} className="team">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#48bb78" viewBox="0 0 16 16">
                  <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Team Members</span>
                <span style={styles.metricValue}>{stats.teamMembers}</span>
              </div>
            </div>

            {/* Completed Tasks */}
            <div style={styles.metricCard}>
              <div style={{...styles.metricIcon, background: '#4299e115'}} className="tasks">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#4299e1" viewBox="0 0 16 16">
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Completed Tasks</span>
                <span style={styles.metricValue}>{stats.completedBacklogs}</span>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Stats */}
        {user.role === 'member' && (
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923z"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Total Projects</span>
                <span style={styles.metricValue}>{stats.totalProjects}</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{...styles.metricIcon, background: '#ed893615'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ed8936" viewBox="0 0 16 16">
                  <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Total Tasks</span>
                <span style={styles.metricValue}>{stats.totalTasks}</span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={{...styles.metricIcon, background: '#48bb7815'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#48bb78" viewBox="0 0 16 16">
                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                </svg>
              </div>
              <div style={styles.metricContent}>
                <span style={styles.metricLabel}>Completed Tasks</span>
                <span style={styles.metricValue}>{stats.completedTasks}</span>
              </div>
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
                <Link href="/backlogs" style={styles.viewAllLink}>
                  View All →
                </Link>
              </div>
              <div style={styles.taskStatusList}>
                <div style={styles.taskStatusItem}>
                  <div style={styles.taskStatusLeft}>
                    <div style={{...styles.taskStatusDot, background: '#879BFF'}}></div>
                    <span style={styles.taskStatusLabel}>In Progress</span>
                  </div>
                  <span style={styles.taskStatusCount}>{stats.inProgressTasks}</span>
                </div>
                <div style={styles.taskStatusItem}>
                  <div style={styles.taskStatusLeft}>
                    <div style={{...styles.taskStatusDot, background: '#718096'}}></div>
                    <span style={styles.taskStatusLabel}>Pending</span>
                  </div>
                  <span style={styles.taskStatusCount}>{stats.pendingTasks}</span>
                </div>
                <div style={styles.taskStatusItem}>
                  <div style={styles.taskStatusLeft}>
                    <div style={{...styles.taskStatusDot, background: '#48bb78'}}></div>
                    <span style={styles.taskStatusLabel}>Completed</span>
                  </div>
                  <span style={styles.taskStatusCount}>{stats.completedBacklogs}</span>
                </div>
                <div style={styles.taskStatusItem}>
                  <div style={styles.taskStatusLeft}>
                    <div style={{...styles.taskStatusDot, background: '#e2e8f0'}}></div>
                    <span style={styles.taskStatusLabel}>Backlog</span>
                  </div>
                  <span style={styles.taskStatusCount}>{stats.availableBacklogs}</span>
                </div>
              </div>

              {/* Task Breakdown Chart */}
              <div style={styles.taskBreakdownSection}>
                <div style={styles.taskBreakdownBar}>
                  {backlogs.length > 0 && (
                    <>
                      <div
                        style={{
                          ...styles.taskBreakdownSegment,
                          width: `${(stats.inProgressTasks! / backlogs.length) * 100}%`,
                          background: '#879BFF',
                        }}
                      ></div>
                      <div
                        style={{
                          ...styles.taskBreakdownSegment,
                          width: `${(stats.pendingTasks! / backlogs.length) * 100}%`,
                          background: '#718096',
                        }}
                      ></div>
                      <div
                        style={{
                          ...styles.taskBreakdownSegment,
                          width: `${(stats.completedBacklogs / backlogs.length) * 100}%`,
                          background: '#48bb78',
                        }}
                      ></div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Nearing Deadline - Scrollable */}
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{color: '#cbd5e0', marginBottom: '12px'}}>
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
                    const priorityColor = task.backlog.priority === 'high' ? '#f56565' :
                                         task.backlog.priority === 'medium' ? '#ed8936' : '#48bb78';

                    return (
                      <div
                        key={task.backlog._id}
                        style={{
                          ...styles.urgentTaskCardCompact,
                          borderLeft: `4px solid ${isUrgent ? '#f56565' : '#ed8936'}`,
                        }}
                      >
                        <div style={styles.urgentTaskCompactHeader}>
                          <h4 style={styles.urgentTaskTitleCompact}>{task.backlog.title}</h4>
                          <span
                            style={{
                              ...styles.urgentTaskBadgeCompact,
                              background: isUrgent ? '#f5656515' : '#ed893615',
                              color: isUrgent ? '#f56565' : '#ed8936',
                            }}
                          >
                            {task.daysUntilEnd === 0 ? 'Today' :
                             task.daysUntilEnd === 1 ? '1 day' :
                             `${task.daysUntilEnd}d`}
                          </span>
                        </div>
                        <div style={styles.urgentTaskMetaCompact}>
                          <span style={styles.urgentTaskMetaItemCompact}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" style={{marginRight: '4px'}}>
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                            </svg>
                            {task.backlog.assignee?.name || 'Unassigned'}
                          </span>
                          <span style={{...styles.priorityDotCompact, background: priorityColor}}></span>
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
                <Link href="/sprints" style={styles.viewAllLink}>
                  View All →
                </Link>
              </div>
              <div style={styles.sprintStatsGridVertical}>
                <div style={styles.sprintStatItemVertical}>
                  <div style={{...styles.sprintStatCircleSmall, borderColor: '#FF6495', background: '#FF649515'}}>
                    <span style={{...styles.sprintStatNumberSmall, color: '#FF6495'}}>{stats.activeSprints}</span>
                  </div>
                  <div style={styles.sprintStatTextGroup}>
                    <span style={styles.sprintStatLabelHorizontal}>Active</span>
                    <span style={styles.sprintStatDescription}>Currently running</span>
                  </div>
                </div>
                <div style={styles.sprintStatItemVertical}>
                  <div style={{...styles.sprintStatCircleSmall, borderColor: '#4299e1', background: '#4299e115'}}>
                    <span style={{...styles.sprintStatNumberSmall, color: '#4299e1'}}>{stats.plannedSprints}</span>
                  </div>
                  <div style={styles.sprintStatTextGroup}>
                    <span style={styles.sprintStatLabelHorizontal}>Planned</span>
                    <span style={styles.sprintStatDescription}>Ready to start</span>
                  </div>
                </div>
                <div style={styles.sprintStatItemVertical}>
                  <div style={{...styles.sprintStatCircleSmall, borderColor: '#48bb78', background: '#48bb7815'}}>
                    <span style={{...styles.sprintStatNumberSmall, color: '#48bb78'}}>{stats.completedSprints}</span>
                  </div>
                  <div style={styles.sprintStatTextGroup}>
                    <span style={styles.sprintStatLabelHorizontal}>Completed</span>
                    <span style={styles.sprintStatDescription}>Successfully finished</span>
                  </div>
                </div>
              </div>
              <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                  <span style={styles.progressLabel}>Overall Progress</span>
                  <span style={styles.progressPercentage}>
                    {sprints.length > 0 ? Math.round((stats.completedSprints / sprints.length) * 100) : 0}%
                  </span>
                </div>
                <div style={styles.progressBarContainer}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${sprints.length > 0 ? (stats.completedSprints / sprints.length) * 100 : 0}%`,
                    }}
                  ></div>
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
                    if (backlog.taskStatus === 'completed') {
                      data.completed++;
                    } else if (backlog.taskStatus === 'in-progress') {
                      data.inProgress++;
                    }
                  });

                  const filteredProjects = selectedProject === 'all'
                    ? Array.from(projectData.entries())
                    : Array.from(projectData.entries()).filter(([project]) => project === selectedProject);

                  if (filteredProjects.length === 0) {
                    return (
                      <div style={styles.emptyState}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16" style={{color: '#cbd5e0', marginBottom: '16px'}}>
                          <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923z"/>
                        </svg>
                        <p style={styles.emptyStateText}>No projects found</p>
                      </div>
                    );
                  }

                  return filteredProjects.map(([project, data]) => {
                    const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

                    return (
                      <Link
                        key={project}
                        href={`/timeline?view=project&project=${encodeURIComponent(project)}`}
                        style={{textDecoration: 'none'}}
                      >
                        <div
                          style={styles.projectProgressCardCompact}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <div style={styles.projectProgressHeaderCompact}>
                            <h4 style={styles.projectProgressTitleCompact}>{project}</h4>
                            <span style={styles.projectProgressPercentageCompact}>{percentage}%</span>
                          </div>

                          <div style={styles.projectProgressBar}>
                            <div
                              style={{
                                ...styles.projectProgressFill,
                                width: `${percentage}%`,
                                background: percentage === 100 ? '#48bb78' :
                                           percentage >= 50 ? '#4299e1' : '#879BFF',
                              }}
                            ></div>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{color: '#cbd5e0', marginBottom: '12px'}}>
                    <path d="M10.854 8.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 10.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                  </svg>
                  <p style={styles.emptyStateText}>No urgent deadlines</p>
                  <p style={styles.emptyStateSubtext}>Keep up the great work!</p>
                </div>
              ) : (
                <div style={styles.memberTaskList}>
                  {tasksNearingDeadline.map((task) => (
                    <Link
                      key={task.backlog._id}
                      href={`/tasks?taskId=${task.backlog._id}`}
                      style={{textDecoration: 'none'}}
                    >
                      <div style={styles.memberTaskItem}>
                        <div style={styles.memberTaskLeft}>
                          <div style={{
                            ...styles.memberTaskIndicator,
                            background: task.daysUntilEnd <= 1 ? '#f56565' : '#ed8936',
                          }}></div>
                          <div>
                            <h4 style={styles.memberTaskTitle}>{task.backlog.title}</h4>
                            <span style={styles.memberTaskMeta}>{task.backlog.project}</span>
                          </div>
                        </div>
                        <span style={{
                          ...styles.memberTaskBadge,
                          background: task.daysUntilEnd <= 1 ? '#f5656515' : '#ed893615',
                          color: task.daysUntilEnd <= 1 ? '#f56565' : '#ed8936',
                        }}>
                          {task.daysUntilEnd === 0 ? 'Today' :
                           task.daysUntilEnd === 1 ? '1 day' :
                           `${task.daysUntilEnd} days`}
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
                <Link href="/tasks" style={styles.viewAllLink}>
                  View All →
                </Link>
              </div>
              {(() => {
                const activeTasks = backlogs.filter(
                  (b) => b.taskStatus === 'pending' || b.taskStatus === 'in-progress'
                );

                if (activeTasks.length === 0) {
                  return (
                    <div style={styles.emptyState}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{color: '#cbd5e0', marginBottom: '12px'}}>
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
                      <Link
                        key={backlog._id}
                        href={`/tasks?taskId=${backlog._id}`}
                        style={{textDecoration: 'none'}}
                      >
                        <div style={styles.memberTaskItem}>
                          <div style={styles.memberTaskLeft}>
                            <div style={{
                              ...styles.memberTaskIndicator,
                              background: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096',
                            }}></div>
                            <div>
                              <h4 style={styles.memberTaskTitle}>{backlog.title}</h4>
                              <span style={styles.memberTaskMeta}>{backlog.project}</span>
                            </div>
                          </div>
                          <span style={{
                            ...styles.memberTaskBadge,
                            background: backlog.taskStatus === 'in-progress' ? '#4299e115' : '#71809615',
                            color: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096',
                          }}>
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
  container: {
    width: '100%',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  welcomeSection: {
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  metricCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid #f1f5f9',
  },
  metricIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    background: '#879BFF15',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2d3748',
    lineHeight: '1',
  },
  mainContentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  contentCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
  },
  contentCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  contentCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  viewAllLink: {
    fontSize: '14px',
    color: '#879BFF',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
  sprintStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  sprintStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  sprintStatCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#FF649515',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid #FF6495',
  },
  sprintStatNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FF6495',
  },
  sprintStatLabel: {
    fontSize: '13px',
    color: '#718096',
    fontWeight: '600',
  },
  sprintStatsGridVertical: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  sprintStatItemVertical: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#fafbfc',
    borderRadius: '8px',
  },
  sprintStatsGridHorizontal: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    padding: '20px',
    background: '#fafbfc',
    borderRadius: '8px',
  },
  sprintStatItemHorizontal: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sprintStatCircleSmall: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid',
    flexShrink: 0,
  },
  sprintStatNumberSmall: {
    fontSize: '24px',
    fontWeight: '700',
  },
  sprintStatTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  sprintStatLabelHorizontal: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '600',
  },
  sprintStatDescription: {
    fontSize: '11px',
    color: '#a0aec0',
  },
  sprintStatDivider: {
    width: '1px',
    height: '50px',
    background: '#e2e8f0',
  },
  sprintProgressContainer: {
    flex: 1,
    minWidth: '200px',
  },
  progressSectionHorizontal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressSection: {
    marginTop: '20px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: '8px',
    background: '#f1f5f9',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: '#48bb78',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  taskStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  taskStatusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  taskStatusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  taskStatusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  taskStatusLabel: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
  },
  taskStatusCount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d3748',
  },
  taskBreakdownSection: {
    marginTop: '16px',
  },
  taskBreakdownBar: {
    height: '12px',
    background: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
  },
  taskBreakdownSegment: {
    height: '100%',
  },
  taskCountBadge: {
    padding: '4px 10px',
    background: '#f5656515',
    color: '#f56565',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
  },
  scrollableTaskList: {
    maxHeight: '400px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  urgentTaskCardCompact: {
    background: '#fafbfc',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  urgentTaskCompactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },
  urgentTaskTitleCompact: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    lineHeight: '1.4',
    flex: 1,
  },
  urgentTaskBadgeCompact: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  urgentTaskMetaCompact: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#718096',
  },
  urgentTaskMetaItemCompact: {
    display: 'flex',
    alignItems: 'center',
  },
  priorityDotCompact: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  emptyStateCompact: {
    textAlign: 'center',
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  urgentTasksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  urgentTaskCard: {
    background: '#fafbfc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  urgentTaskHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '12px',
  },
  urgentTaskBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  urgentTaskTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 12px 0',
    lineHeight: '1.4',
  },
  urgentTaskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#718096',
  },
  urgentTaskMetaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  priorityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginLeft: 'auto',
  },
  projectFilterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
  },
  scrollableProjectList: {
    maxHeight: '400px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  projectProgressCardCompact: {
    background: '#fafbfc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  projectProgressHeaderCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  projectProgressTitleCompact: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  projectProgressPercentageCompact: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#879BFF',
  },
  projectProgressStatsCompact: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  },
  projectProgressStatItemCompact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  projectProgressStatLabelCompact: {
    fontSize: '11px',
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  projectProgressStatValueCompact: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2d3748',
  },
  projectProgressGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  projectProgressCard: {
    background: '#fafbfc',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  projectProgressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  projectProgressTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  projectProgressPercentage: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#879BFF',
  },
  projectProgressBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  projectProgressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  projectProgressStats: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  projectProgressStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  projectProgressStatValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d3748',
  },
  projectProgressStatLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    margin: '0 0 4px 0',
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#a0aec0',
    margin: 0,
  },
  memberTaskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  memberTaskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#fafbfc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  memberTaskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  memberTaskIndicator: {
    width: '4px',
    height: '40px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  memberTaskTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 4px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  memberTaskMeta: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  memberTaskBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  },
};
