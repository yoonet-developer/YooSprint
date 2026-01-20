'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
}

interface Project {
  _id: string;
  name: string;
  category: string;
  estimatedTime: number;
  timeConsumed: number;
  progress: number;
}

interface Backlog {
  _id: string;
  title: string;
  description?: string;
  project?: Project;
  taskStatus: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  sprint?: {
    _id: string;
    name: string;
    status: string;
  };
}

export default function BoardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedSprint, setSelectedSprint] = useState<string>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchBacklogs();
  }, []);

  const fetchBacklogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setBacklogs(data.backlogs);

        // Find the active sprint and set it as default filter
        const activeSprint = data.backlogs.find(
          (b: Backlog) => b.sprint?.status === 'active'
        )?.sprint?.name;

        if (activeSprint) {
          setSelectedSprint(activeSprint);
        }
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (backlogId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${backlogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ taskStatus: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setBacklogs(backlogs.map(b =>
          b._id === backlogId ? { ...b, taskStatus: newStatus } : b
        ));
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading board...</div>
      </AppLayout>
    );
  }

  const projects = Array.from(
    new Map(
      backlogs
        .filter(b => b.project && b.project._id)
        .map(b => [b.project!._id, b.project!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter sprints based on selected project
  const projectBacklogs = selectedProject === 'all'
    ? backlogs
    : backlogs.filter(b => b.project?._id === selectedProject);
  const sprints = Array.from(new Set(projectBacklogs.map(b => b.sprint?.name).filter(Boolean))).sort();
  const hasBacklogsWithoutSprint = projectBacklogs.some(b => !b.sprint);

  let filteredBacklogs = backlogs;
  if (selectedProject !== 'all') {
    filteredBacklogs = filteredBacklogs.filter(b => b.project?._id === selectedProject);
  }
  if (selectedSprint === 'no-sprint') {
    filteredBacklogs = filteredBacklogs.filter(b => !b.sprint);
  } else if (selectedSprint !== 'all') {
    filteredBacklogs = filteredBacklogs.filter(b => b.sprint?.name === selectedSprint);
  }

  const pendingTasks = filteredBacklogs.filter(b => b.taskStatus === 'pending');
  const inProgressTasks = filteredBacklogs.filter(b => b.taskStatus === 'in-progress');
  const completedTasks = filteredBacklogs.filter(b => b.taskStatus === 'completed');

  const totalTasks = filteredBacklogs.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': return { color: '#dc2626', bg: '#fef2f2', label: 'High' };
      case 'medium': return { color: '#d97706', bg: '#fffbeb', label: 'Medium' };
      case 'low': return { color: '#16a34a', bg: '#f0fdf4', label: 'Low' };
      default: return { color: '#6b7280', bg: '#f9fafb', label: 'None' };
    }
  };

  const renderTaskCard = (task: Backlog) => {
    const priority = getPriorityConfig(task.priority);

    return (
      <div key={task._id} style={styles.taskCard}>
        {/* Priority indicator line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: priority.color,
          borderRadius: '8px 8px 0 0',
        }} />

        <div style={styles.taskContent}>
          <div style={styles.taskMeta}>
            <span style={styles.projectTag}>{task.project?.name || 'No Project'}</span>
            <span style={{
              ...styles.priorityBadge,
              background: priority.bg,
              color: priority.color,
            }}>
              {priority.label}
            </span>
          </div>

          <h4 style={styles.taskTitle}>{task.title}</h4>

          {task.sprint && (
            <div style={styles.sprintTag}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#879BFF">
                <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1z"/>
              </svg>
              <span>{task.sprint.name}</span>
            </div>
          )}

          <div style={styles.taskFooter}>
            {task.assignee ? (
              <div style={styles.assigneeChip}>
                {task.assignee.avatar ? (
                  <img
                    src={task.assignee.avatar}
                    alt={task.assignee.name}
                    style={styles.avatarImage}
                  />
                ) : (
                  <div style={styles.avatar}>
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{task.assignee.name}</span>
              </div>
            ) : (
              <span style={styles.unassigned}>Unassigned</span>
            )}
          </div>
        </div>

        <div style={styles.taskActions}>
          {task.taskStatus === 'pending' && (
            <button
              style={{...styles.actionBtn, ...styles.startBtn}}
              onClick={() => updateTaskStatus(task._id, 'in-progress')}
            >
              Start →
            </button>
          )}
          {task.taskStatus === 'in-progress' && (
            <>
              <button
                style={{...styles.actionBtn, ...styles.backBtn}}
                onClick={() => updateTaskStatus(task._id, 'pending')}
              >
                ← To Do
              </button>
              <button
                style={{...styles.actionBtn, ...styles.completeBtn}}
                onClick={() => updateTaskStatus(task._id, 'completed')}
              >
                Done →
              </button>
            </>
          )}
          {task.taskStatus === 'completed' && (
            <button
              style={{...styles.actionBtn, ...styles.reopenBtn}}
              onClick={() => updateTaskStatus(task._id, 'in-progress')}
            >
              ← In Progress
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderColumn = (
    title: string,
    tasks: Backlog[],
    accentColor: string,
    icon: React.ReactNode
  ) => (
    <div style={styles.column}>
      <div style={styles.columnHeader}>
        <div style={styles.columnTitleRow}>
          <div style={{...styles.columnIcon, background: `${accentColor}15`, color: accentColor}}>
            {icon}
          </div>
          <h3 style={styles.columnTitle}>{title}</h3>
        </div>
        <span style={{...styles.columnCount, background: `${accentColor}15`, color: accentColor}}>
          {tasks.length}
        </span>
      </div>
      <div style={styles.columnBody}>
        {tasks.length === 0 ? (
          <div style={styles.emptyColumn}>
            <p style={styles.emptyColumnText}>No tasks</p>
          </div>
        ) : (
          tasks.map(renderTaskCard)
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.headerSection}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>Task Board</h1>
            <p style={styles.pageSubtitle}>Manage and track your sprint tasks</p>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.statsCard}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{totalTasks}</span>
                <span style={styles.statLabel}>Total Tasks</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={{...styles.statValue, color: '#879BFF'}}>{inProgressTasks.length}</span>
                <span style={styles.statLabel}>In Progress</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={{...styles.statValue, color: '#16a34a'}}>{completionRate}%</span>
                <span style={styles.statLabel}>Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div style={styles.filtersSection}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Project</label>
            <select
              style={styles.filterSelect}
              value={selectedProject}
              onChange={(e) => {
                const newProject = e.target.value;
                setSelectedProject(newProject);
                // Reset sprint filter if current sprint not available for new project
                const newProjectBacklogs = newProject === 'all'
                  ? backlogs
                  : backlogs.filter(b => b.project?._id === newProject);
                const availableSprints = newProjectBacklogs.map(b => b.sprint?.name).filter(Boolean);
                if (selectedSprint !== 'all' && selectedSprint !== 'no-sprint' && !availableSprints.includes(selectedSprint)) {
                  setSelectedSprint('all');
                }
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Sprint</label>
            <select
              style={styles.filterSelect}
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
            >
              <option value="all">All Backlogs</option>
              {hasBacklogsWithoutSprint && (
                <option value="no-sprint">No Sprint</option>
              )}
              {sprints.map(sprint => (
                <option key={sprint} value={sprint}>{sprint}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Board */}
        {filteredBacklogs.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#879BFF" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>No Active Tasks</h3>
            <p style={styles.emptyText}>Tasks from active sprints will appear here organized by status</p>
          </div>
        ) : (
          <div style={styles.boardGrid}>
            {renderColumn('To Do', pendingTasks, '#6b7280',
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              </svg>
            )}
            {renderColumn('In Progress', inProgressTasks, '#879BFF',
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
            )}
            {renderColumn('Completed', completedTasks, '#16a34a',
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
              </svg>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },

  // Header
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerLeft: {},
  headerRight: {},
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    margin: '0 0 4px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  statsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    background: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  statDivider: {
    width: '1px',
    height: '32px',
    background: '#e2e8f0',
  },

  // Filters
  filtersSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterSelect: {
    padding: '10px 14px',
    paddingRight: '32px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1a202c',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '160px',
    transition: 'border-color 0.2s',
  },

  // Board
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    alignItems: 'flex-start',
  },
  column: {
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  columnTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  columnIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0,
  },
  columnCount: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  columnBody: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '200px',
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  emptyColumn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
  },
  emptyColumnText: {
    fontSize: '13px',
    color: '#a0aec0',
    margin: 0,
  },

  // Task Card
  taskCard: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s, transform 0.2s',
    flexShrink: 0,
  },
  taskContent: {
    padding: '14px',
  },
  taskMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  projectTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#879BFF',
    background: '#879BFF10',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  priorityBadge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0 0 10px 0',
    lineHeight: '1.4',
  },
  sprintTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#718096',
    marginBottom: '12px',
  },
  taskFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assigneeChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#4a5568',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '600',
  },
  avatarImage: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '1px solid #e5e7eb',
  },
  unassigned: {
    fontSize: '12px',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  taskActions: {
    display: 'flex',
    gap: '8px',
    padding: '10px 14px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  actionBtn: {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  startBtn: {
    background: '#879BFF',
    color: 'white',
  },
  backBtn: {
    background: '#e2e8f0',
    color: '#4a5568',
  },
  completeBtn: {
    background: '#16a34a',
    color: 'white',
  },
  reopenBtn: {
    background: '#e2e8f0',
    color: '#4a5568',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '80px 40px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  emptyIcon: {
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
};
