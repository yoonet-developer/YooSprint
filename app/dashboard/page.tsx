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
  activeTasks: number;
  teamMembers?: number;
  completedTasks?: number;
}

interface Backlog {
  _id: string;
  title: string;
  project: string;
  status: 'backlog' | 'in-sprint' | 'done';
  taskStatus: string;
  createdAt: string;
  assignee?: {
    _id: string;
    name: string;
    email: string;
    position: string;
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeTasks: 0,
  });
  const [myTasks, setMyTasks] = useState<Backlog[]>([]);
  const [recentBacklogs, setRecentBacklogs] = useState<Backlog[]>([]);
  const [inProgress, setInProgress] = useState<Backlog[]>([]);
  const [completed, setCompleted] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const usersData = await usersRes.json();

      if (backlogsData.success && usersData.success) {
        const backlogs = backlogsData.backlogs;
        const users = usersData.users;

        // Filter backlogs based on user role
        const isTeamMember = user?.role === 'member';
        const filteredBacklogs = isTeamMember
          ? backlogs.filter((b: Backlog) => b.assignee?._id === user?.id)
          : backlogs;

        // Calculate stats
        const projects = new Set(filteredBacklogs.map((b: Backlog) => b.project));
        const activeTasks = filteredBacklogs.filter(
          (b: Backlog) => b.taskStatus !== 'completed'
        ).length;
        const completedTasks = filteredBacklogs.filter(
          (b: Backlog) => b.taskStatus === 'completed'
        ).length;

        const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

        setStats({
          totalProjects: projects.size,
          activeTasks,
          ...(isAdminOrManager && {
            teamMembers: users.length,
            completedTasks,
          }),
        });

        // My tasks
        const myTasks = filteredBacklogs.filter(
          (b: Backlog) => b.assignee?._id === user?.id && b.taskStatus !== 'completed'
        ).slice(0, 5);
        setMyTasks(myTasks);

        // Recent backlogs (for admin/manager)
        if (isAdminOrManager) {
          const recentBacklogs = filteredBacklogs
            .filter((b: Backlog) => b.status === 'backlog')
            .slice(0, 5);
          setRecentBacklogs(recentBacklogs);
        }

        // In progress
        const inProgress = filteredBacklogs
          .filter((b: Backlog) => b.taskStatus === 'in-progress')
          .slice(0, 5);
        setInProgress(inProgress);

        // Recently completed (for admin/manager)
        if (isAdminOrManager) {
          const completed = filteredBacklogs
            .filter((b: Backlog) => b.taskStatus === 'completed')
            .sort((a: Backlog, b: Backlog) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 5);
          setCompleted(completed);
        }
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
        <h2 style={styles.title}>Dashboard</h2>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Total Projects</h3>
            <p style={styles.statNumber}>{stats.totalProjects}</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statTitle}>Active Tasks</h3>
            <p style={styles.statNumber}>{stats.activeTasks}</p>
          </div>
          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <div style={styles.statCard}>
                <h3 style={styles.statTitle}>Team Members</h3>
                <p style={styles.statNumber}>{stats.teamMembers}</p>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statTitle}>Completed</h3>
                <p style={styles.statNumber}>{stats.completedTasks}</p>
              </div>
            </>
          )}
        </div>

        {/* Task Overview Section */}
        <div style={styles.overviewSection}>
          <h2 style={styles.sectionTitle}>Task Overview</h2>
          <div style={styles.overviewGrid}>
            {/* My Tasks */}
            <div style={styles.overviewPanel}>
              <h3 style={styles.panelTitle}>My Tasks</h3>
              <div style={styles.panelContent}>
                {myTasks.length === 0 ? (
                  <p style={styles.emptyText}>No tasks assigned</p>
                ) : (
                  myTasks.map((task) => (
                    <div key={task._id} style={styles.taskItem}>
                      <Link href="/tasks" style={styles.taskLink}>
                        {task.title}
                      </Link>
                      <span style={styles.taskProject}>{task.project}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Backlogs (Admin/Manager only) */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <div style={styles.overviewPanel}>
                <h3 style={styles.panelTitle}>Backlogs</h3>
                <div style={styles.panelContent}>
                  {recentBacklogs.length === 0 ? (
                    <p style={styles.emptyText}>No backlog items</p>
                  ) : (
                    recentBacklogs.map((backlog) => (
                      <div key={backlog._id} style={styles.taskItem}>
                        <Link href="/backlogs" style={styles.taskLink}>
                          {backlog.title}
                        </Link>
                        <span style={styles.taskProject}>{backlog.project}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* In Progress */}
            <div style={styles.overviewPanel}>
              <h3 style={styles.panelTitle}>In Progress</h3>
              <div style={styles.panelContent}>
                {inProgress.length === 0 ? (
                  <p style={styles.emptyText}>No tasks in progress</p>
                ) : (
                  inProgress.map((task) => (
                    <div key={task._id} style={styles.taskItem}>
                      <Link href="/tasks" style={styles.taskLink}>
                        {task.title}
                      </Link>
                      <span style={styles.taskProject}>{task.project}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recently Completed (Admin/Manager only) */}
            {(user.role === 'admin' || user.role === 'manager') && (
              <div style={styles.overviewPanel}>
                <h3 style={styles.panelTitle}>Recently Completed</h3>
                <div style={styles.panelContent}>
                  {completed.length === 0 ? (
                    <p style={styles.emptyText}>No completed tasks</p>
                  ) : (
                    completed.map((task) => (
                      <div key={task._id} style={styles.taskItem}>
                        <Link href="/tasks" style={styles.taskLink}>
                          {task.title}
                        </Link>
                        <span style={styles.taskProject}>{task.project}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
  overviewSection: {
    marginTop: '30px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  overviewPanel: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
  },
  panelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  taskItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px',
    background: '#f7fafc',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  taskLink: {
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '500',
  },
  taskProject: {
    fontSize: '12px',
    color: '#718096',
  },
  emptyText: {
    fontSize: '14px',
    color: '#a0aec0',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px 0',
  },
};
