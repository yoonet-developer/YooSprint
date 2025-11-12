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
  availableBacklogs: number;
  inSprintBacklogs: number;
  completedBacklogs: number;
  teamMembers?: number;
  totalTasks?: number;
  completedTasks?: number;
}

interface Backlog {
  _id: string;
  title: string;
  project: string;
  taskStatus: string;
  status: string;
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
    availableBacklogs: 0,
    inSprintBacklogs: 0,
    completedBacklogs: 0,
  });
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [tasksNearingDeadline, setTasksNearingDeadline] = useState<TaskNearingDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineTasksPage, setDeadlineTasksPage] = useState(1);
  const deadlineTasksPerPage = 4;
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
          // Team members see only their assigned backlogs in active or completed sprints
          filteredBacklogs = backlogs.filter(
            (b: Backlog) =>
              b.assignee?._id === user?.id &&
              b.sprint &&
              (b.sprint.status === 'active' || b.sprint.status === 'completed')
          );
        } else if (isManager) {
          // Managers see only backlogs from their managed sprints
          filteredBacklogs = backlogs.filter((b: Backlog) =>
            b.sprint && filteredSprintIds.has(b.sprint._id)
          );
        } else {
          // Admins see all backlogs
          filteredBacklogs = backlogs;
        }

        // Filter users for managers - only show users assigned to backlogs in their sprints
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
        const availableBacklogs = filteredBacklogs.filter((b: Backlog) => b.status === 'backlog').length;
        const inSprintBacklogs = filteredBacklogs.filter((b: Backlog) => b.status === 'in-sprint').length;
        const completedBacklogs = filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'completed').length;

        const isAdminOrManager = isAdmin || isManager;

        // For team members, calculate active tasks (pending + in-progress)
        const activeTasks = isTeamMember
          ? filteredBacklogs.filter((b: Backlog) => b.taskStatus === 'pending' || b.taskStatus === 'in-progress').length
          : 0;

        setStats({
          totalProjects: projects.size,
          activeSprints,
          plannedSprints,
          availableBacklogs,
          inSprintBacklogs,
          completedBacklogs,
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
          // Only check incomplete tasks in active sprints
          if (
            backlog.sprint &&
            backlog.sprint.status === 'active' &&
            backlog.sprint.endDate &&
            backlog.taskStatus !== 'completed'
          ) {
            const endDate = new Date(backlog.sprint.endDate);
            const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // For admin/manager: 7 days, for team members: 3 days
            const threshold = isAdminOrManager ? 7 : 3;
            if (daysUntilEnd >= 0 && daysUntilEnd <= threshold) {
              tasksNearing.push({
                backlog,
                daysUntilEnd,
              });
            }
          }
        });

        // Sort by days until end (closest first)
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

  return (
    <AppLayout>
      <div style={styles.container}>
        <h2 style={styles.title}>Hello, {user.name}!</h2>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Projects</h3>
            <p style={styles.statNumber}>{stats.totalProjects}</p>
          </div>
          {(user.role === 'admin' || user.role === 'manager') && (
            <div style={styles.statCard}>
              <h3 style={styles.statTitle}>Team Members</h3>
              <p style={styles.statNumber}>{stats.teamMembers}</p>
            </div>
          )}
          {user.role === 'member' && (
            <>
              <div style={styles.statCard}>
                <h3 style={styles.statTitle}>Total Tasks</h3>
                <p style={styles.statNumber}>{stats.totalTasks}</p>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statTitle}>Completed Tasks</h3>
                <p style={styles.statNumber}>{stats.completedTasks}</p>
              </div>
            </>
          )}
        </div>

        {/* Tasks and Project Progress - Side by Side */}
        {(user.role === 'admin' || user.role === 'manager') && (
          <div style={styles.teamMemberTasksWrapper}>
            {/* Tasks Nearing Sprint End Date */}
            <div style={styles.teamMemberTaskSection}>
              <h2 style={styles.sectionTitle}>Tasks Nearing Sprint End</h2>
              <div style={styles.teamMemberTasksBackground}>
                <div style={styles.scrollableTaskContainer}>
                  {tasksNearingDeadline.length === 0 ? (
                    <div style={styles.emptyTaskListInline}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '16px', color: '#a0aec0' }}>
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                      </svg>
                      <p style={styles.emptyDeadlineText}>No tasks nearing sprint end within 7 days</p>
                      <p style={styles.emptyDeadlineSubtext}>All active sprint tasks are on track!</p>
                    </div>
                  ) : (
                    <div style={styles.deadlineListVertical}>
                      {tasksNearingDeadline.map((task) => {
                        const isUrgent = task.daysUntilEnd <= 3;
                        return (
                          <div
                            key={task.backlog._id}
                            style={{
                              ...styles.deadlineCard,
                              borderLeft: `4px solid ${isUrgent ? '#f56565' : '#ed8936'}`,
                            }}
                          >
                            <div style={styles.deadlineCardHeader}>
                              <h3 style={styles.deadlineCardTitle}>{task.backlog.title}</h3>
                              <span
                                style={{
                                  ...styles.deadlineBadge,
                                  backgroundColor: isUrgent ? '#f56565' : '#ed8936',
                                }}
                              >
                                {task.daysUntilEnd === 0
                                  ? 'Today'
                                  : task.daysUntilEnd === 1
                                  ? '1 day'
                                  : `${task.daysUntilEnd} days`}
                              </span>
                            </div>
                            <div style={styles.deadlineCardMeta}>
                              <div style={styles.deadlineMetaItem}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                </svg>
                                <strong>Assigned:</strong> {task.backlog.assignee?.name || 'Unassigned'}
                              </div>
                              <div style={styles.deadlineMetaItem}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                  <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                                </svg>
                                <strong>Sprint:</strong> {task.backlog.sprint?.name}
                              </div>
                              <div style={styles.deadlineMetaItem}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                                </svg>
                                <strong>Project:</strong> {task.backlog.project}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Progress */}
            <div style={styles.teamMemberTaskSection}>
              <h2 style={styles.sectionTitle}>Project Progress</h2>
              <div style={styles.teamMemberTasksBackground}>
                <div style={styles.projectFilterContainer}>
                  <select
                    style={styles.projectFilter}
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    <option value="all">All Projects</option>
                    {(() => {
                      const projects = new Set(backlogs.map((b) => b.project));
                      return Array.from(projects).map((project) => (
                        <option key={project} value={project}>{project}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div style={styles.scrollableTaskContainer}>
                  {(() => {
                    // Calculate project completion data
                    const projectData = new Map<string, { total: number; completed: number }>();

                    backlogs.forEach((backlog) => {
                      const project = backlog.project;
                      if (!projectData.has(project)) {
                        projectData.set(project, { total: 0, completed: 0 });
                      }
                      const data = projectData.get(project)!;
                      data.total++;
                      if (backlog.taskStatus === 'completed') {
                        data.completed++;
                      }
                    });

                    const projectColors = [
                      '#FF6495', '#4299e1', '#48bb78', '#ed8936',
                      '#9f7aea', '#38b2ac', '#f56565', '#667eea'
                    ];

                    // Filter projects based on selection
                    const filteredProjects = selectedProject === 'all'
                      ? Array.from(projectData.entries())
                      : Array.from(projectData.entries()).filter(([project]) => project === selectedProject);

                    if (filteredProjects.length === 0) {
                      return (
                        <div style={styles.emptyTaskListInline}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '16px', color: '#a0aec0' }}>
                            <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                          </svg>
                          <p style={styles.emptyDeadlineText}>No projects found</p>
                        </div>
                      );
                    }

                    return (
                      <div style={styles.projectCardsScrollable}>
                        {filteredProjects.map(([project, data], index) => {
                          const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                          const color = projectColors[index % projectColors.length];
                          const circumference = 2 * Math.PI * 45;
                          const strokeDashoffset = circumference - (percentage / 100) * circumference;

                          return (
                            <Link
                              key={project}
                              href={`/timeline?project=${encodeURIComponent(project)}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <div
                                style={styles.projectCardCompact}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <h3 style={styles.projectCardTitle}>{project}</h3>
                                <div style={styles.pieChartContainer}>
                                  <svg width="120" height="120" style={styles.pieChart}>
                                    {/* Background circle */}
                                    <circle
                                      cx="60"
                                      cy="60"
                                      r="45"
                                      fill="none"
                                      stroke="#e2e8f0"
                                      strokeWidth="12"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                      cx="60"
                                      cy="60"
                                      r="45"
                                      fill="none"
                                      stroke={color}
                                      strokeWidth="12"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={strokeDashoffset}
                                      strokeLinecap="round"
                                      transform="rotate(-90 60 60)"
                                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                    {/* Center text */}
                                    <text
                                      x="60"
                                      y="60"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        fill: '#2d3748',
                                      }}
                                    >
                                      {percentage}%
                                    </text>
                                  </svg>
                                </div>
                                <div style={styles.projectStats}>
                                  <div style={styles.projectStatItem}>
                                    <span style={styles.projectStatLabel}>Total Tasks:</span>
                                    <span style={styles.projectStatValue}>{data.total}</span>
                                  </div>
                                  <div style={styles.projectStatItem}>
                                    <span style={styles.projectStatLabel}>Completed:</span>
                                    <span style={{...styles.projectStatValue, color: '#48bb78'}}>{data.completed}</span>
                                  </div>
                                  <div style={styles.projectStatItem}>
                                    <span style={styles.projectStatLabel}>Remaining:</span>
                                    <span style={{...styles.projectStatValue, color: '#718096'}}>{data.total - data.completed}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Task Overview - Side by Side Layout */}
        {user.role === 'member' && (
          <div style={styles.teamMemberTasksWrapper}>
            {/* Tasks Nearing Deadline (3 days) */}
            <div style={styles.teamMemberTaskSection}>
              <h2 style={styles.sectionTitle}>Tasks Nearing Deadline</h2>
              <div style={styles.teamMemberTasksBackground}>
                <div style={styles.scrollableTaskContainer}>
                  {tasksNearingDeadline.length === 0 ? (
                    <div style={styles.emptyTaskListInline}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '16px', color: '#a0aec0' }}>
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>
                      </svg>
                      <p style={styles.emptyDeadlineText}>No tasks nearing deadline within 3 days</p>
                      <p style={styles.emptyDeadlineSubtext}>Great job! Keep up the good work!</p>
                    </div>
                  ) : (
                    <div style={styles.deadlineListVertical}>
                      {tasksNearingDeadline.map((task) => {
                        const isUrgent = task.daysUntilEnd <= 1;
                        return (
                          <Link
                            key={task.backlog._id}
                            href={`/tasks?taskId=${task.backlog._id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <div
                              style={{
                                ...styles.deadlineCard,
                                borderLeft: `4px solid ${isUrgent ? '#f56565' : '#ed8936'}`,
                              }}
                            >
                              <div style={styles.deadlineCardHeader}>
                                <h3 style={styles.deadlineCardTitle}>{task.backlog.title}</h3>
                                <span
                                  style={{
                                    ...styles.deadlineBadge,
                                    backgroundColor: isUrgent ? '#f56565' : '#ed8936',
                                  }}
                                >
                                  {task.daysUntilEnd === 0
                                    ? 'Today'
                                    : task.daysUntilEnd === 1
                                    ? '1 day'
                                    : `${task.daysUntilEnd} days`}
                                </span>
                              </div>
                              <div style={styles.deadlineCardMeta}>
                                <div style={styles.deadlineMetaItem}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                    <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                                  </svg>
                                  <strong>Sprint:</strong> {task.backlog.sprint?.name}
                                </div>
                                <div style={styles.deadlineMetaItem}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                                    <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                                  </svg>
                                  <strong>Project:</strong> {task.backlog.project}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* My Tasks Overview */}
            <div style={styles.teamMemberTaskSection}>
              <h2 style={styles.sectionTitle}>My Tasks</h2>
              <div style={styles.teamMemberTasksBackground}>
                <div style={styles.scrollableTaskContainer}>
                  {(() => {
                    // Filter for only pending and in-progress tasks
                    const activeTasks = backlogs.filter(
                      (b) => b.taskStatus === 'pending' || b.taskStatus === 'in-progress'
                    );

                    if (activeTasks.length === 0) {
                      return (
                        <div style={styles.emptyTaskListInline}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" style={{ marginBottom: '16px', color: '#a0aec0' }}>
                            <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
                            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
                          </svg>
                          <p style={styles.emptyDeadlineText}>No pending or in-progress tasks</p>
                          <p style={styles.emptyDeadlineSubtext}>You're all caught up!</p>
                        </div>
                      );
                    }

                    return (
                      <div style={styles.taskListContainer}>
                        {activeTasks.map((backlog) => (
                          <Link
                            key={backlog._id}
                            href={`/tasks?taskId=${backlog._id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <div
                              style={styles.taskListItem}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={styles.taskListItemLeft}>
                                <div style={{
                                  ...styles.taskStatusIndicator,
                                  backgroundColor: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096'
                                }}></div>
                                <div style={styles.taskListItemContent}>
                                  <h3 style={styles.taskListItemTitle}>{backlog.title}</h3>
                                  <div style={styles.taskListItemMeta}>
                                    <span style={styles.taskListItemMetaText}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                        <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                                      </svg>
                                      {backlog.project}
                                    </span>
                                    {backlog.sprint && (
                                      <span style={styles.taskListItemMetaText}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                          <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                                        </svg>
                                        {backlog.sprint.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div style={styles.taskListItemRight}>
                                <span
                                  style={{
                                    ...styles.taskStatusBadgeSmall,
                                    backgroundColor: backlog.taskStatus === 'in-progress' ? '#4299e1' : '#718096',
                                  }}
                                >
                                  {backlog.taskStatus.replace('-', ' ')}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {(user.role === 'admin' || user.role === 'manager') && (
          <div style={styles.chartsSection}>
            <h2 style={styles.sectionTitle}>Overview</h2>
            <div style={styles.chartsGrid}>
              {/* Sprint Status Chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Sprint Status</h3>
                <div style={styles.chartContainer}>
                  <div style={styles.barChart}>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((stats.activeSprints / Math.max(stats.activeSprints + stats.plannedSprints, 1)) * 200, 200)}px`,
                          backgroundColor: '#FF6495',
                        }}
                      ></div>
                      <span style={styles.barLabel}>Active<br/>({stats.activeSprints})</span>
                    </div>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((stats.plannedSprints / Math.max(stats.activeSprints + stats.plannedSprints, 1)) * 200, 200)}px`,
                          backgroundColor: '#4299e1',
                        }}
                      ></div>
                      <span style={styles.barLabel}>Planned<br/>({stats.plannedSprints})</span>
                    </div>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((sprints.filter(s => s.status === 'completed').length / Math.max(sprints.length, 1)) * 200, 200)}px`,
                          backgroundColor: '#48bb78',
                        }}
                      ></div>
                      <span style={styles.barLabel}>Completed<br/>({sprints.filter(s => s.status === 'completed').length})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backlog Status Chart */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Backlog Status</h3>
                <div style={styles.chartContainer}>
                  <div style={styles.barChart}>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((stats.availableBacklogs / Math.max(backlogs.length, 1)) * 200, 200)}px`,
                          backgroundColor: '#718096',
                        }}
                      ></div>
                      <span style={styles.barLabel}>Available<br/>({stats.availableBacklogs})</span>
                    </div>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((stats.inSprintBacklogs / Math.max(backlogs.length, 1)) * 200, 200)}px`,
                          backgroundColor: '#CDE5F380',
                        }}
                      ></div>
                      <span style={styles.barLabel}>In Sprint<br/>({stats.inSprintBacklogs})</span>
                    </div>
                    <div style={styles.barGroup}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.min((stats.completedBacklogs / Math.max(backlogs.length, 1)) * 200, 200)}px`,
                          backgroundColor: '#48bb78',
                        }}
                      ></div>
                      <span style={styles.barLabel}>Completed<br/>({stats.completedBacklogs})</span>
                    </div>
                  </div>
                </div>
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
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '30px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statTitle: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '10px',
    fontWeight: '500',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
  },
  chartsSection: {
    marginTop: '40px',
    marginBottom: '40px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  chartCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
  },
  chartContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: '250px',
  },
  barChart: {
    display: 'flex',
    gap: '40px',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  bar: {
    width: '60px',
    minHeight: '20px',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.3s ease',
  },
  barLabel: {
    fontSize: '12px',
    color: '#718096',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  deadlineSection: {
    marginTop: '40px',
    marginBottom: '40px',
  },
  deadlineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  deadlineCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  deadlineCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px',
  },
  deadlineCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  deadlineBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  deadlineCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  deadlineMetaItem: {
    fontSize: '14px',
    color: '#4a5568',
    display: 'flex',
    alignItems: 'center',
  },
  emptyDeadlineCard: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDeadlineText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4a5568',
    margin: '0 0 8px 0',
  },
  emptyDeadlineSubtext: {
    fontSize: '14px',
    color: '#a0aec0',
    margin: 0,
  },
  teamMemberTasksWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '40px',
    marginBottom: '40px',
  },
  teamMemberTaskSection: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  teamMemberTasksBackground: {
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column',
  },
  scrollableTaskContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '4px',
  },
  deadlineListVertical: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskOverviewSection: {
    marginTop: '40px',
    marginBottom: '40px',
  },
  taskListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskListItem: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  taskListItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },
  taskStatusIndicator: {
    width: '4px',
    height: '40px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  taskListItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  taskListItemTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  taskListItemMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  taskListItemMetaText: {
    fontSize: '13px',
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
  },
  taskListItemRight: {
    display: 'flex',
    alignItems: 'center',
  },
  taskStatusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  taskStatusBadgeSmall: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  emptyTaskList: {
    textAlign: 'center',
    padding: '60px 40px',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTaskListInline: {
    textAlign: 'center',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  paginationContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paginationButton: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#4a5568',
    transition: 'all 0.2s',
    fontWeight: '600',
    minWidth: '36px',
  },
  paginationButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
    padding: '0 4px',
  },
  projectCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  projectCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  projectCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
    textAlign: 'center',
    width: '100%',
  },
  pieChartContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  },
  pieChart: {
    transform: 'rotate(0deg)',
  },
  projectStats: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  projectStatItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  projectStatLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  projectStatValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  projectFilterContainer: {
    padding: '0 0 16px 0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  projectFilter: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'white',
    outline: 'none',
    color: '#4a5568',
    fontWeight: '500',
  },
  projectCardsScrollable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  projectCardCompact: {
    background: '#f7fafc',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};