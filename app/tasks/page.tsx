'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';

interface Backlog {
  _id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  project: string;
  storyPoints: number;
  taskStatus: 'pending' | 'in-progress' | 'completed';
  sprint?: {
    _id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  createdAt: string;
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [tasks, setTasks] = useState<Backlog[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const itemsPerPage = 4;
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);
    }
    fetchMyTasks();
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [tasks, filter]);

  // Handle taskId parameter - scroll to and highlight specific task
  useEffect(() => {
    if (taskId && tasks.length > 0) {
      // Find the task in all tasks
      const task = tasks.find(t => t._id === taskId);
      if (task) {
        // Set the appropriate filter based on task status
        const statusMap: { [key: string]: string } = {
          'pending': 'todo',
          'in-progress': 'in-progress',
          'completed': 'completed',
        };
        setFilter(statusMap[task.taskStatus] || 'all');

        // Highlight the task
        setHighlightedTaskId(taskId);

        // Wait for the DOM to update, then scroll to the task
        setTimeout(() => {
          const taskElement = taskRefs.current[taskId];
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedTaskId(null);
          }, 3000);
        }, 100);
      }
    }
  }, [taskId, tasks]);

  const fetchMyTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backlogs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          // Filter backlogs assigned to current user in active or completed sprints
          const myTasks = data.backlogs.filter(
            (b: Backlog) =>
              b.assignee?._id === user.id &&
              b.sprint &&
              (b.sprint.status === 'active' || b.sprint.status === 'completed')
          );
          setTasks(myTasks);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredTasks(tasks);
    } else {
      const statusMap: { [key: string]: string } = {
        'todo': 'pending',
        'in-progress': 'in-progress',
        'completed': 'completed',
      };
      setFilteredTasks(tasks.filter(t => t.taskStatus === statusMap[filter]));
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
  const showPagination = true; // Always show pagination

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ taskStatus: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchMyTasks();
      } else {
        alert(data.message || 'Error updating task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f56565';
      case 'medium': return '#ed8936';
      case 'low': return '#48bb78';
      default: return '#718096';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#48bb78';
      case 'in-progress': return '#CDE5F380';
      case 'pending': return '#718096';
      default: return '#718096';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed': return 'white';
      case 'in-progress': return '#879BFF';
      case 'pending': return 'white';
      default: return 'white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading your tasks...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>My Tasks</h2>
            <p style={styles.subtitle}>Tasks assigned to you in active sprints</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'todo', label: 'To Do' },
            { key: 'in-progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.key}
              style={{
                ...styles.filterButton,
                ...(filter === f.key ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Pagination */}
        {showPagination && (
          <div style={styles.paginationContainer}>
            <button
              style={{
                ...styles.paginationButton,
                ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            <span style={styles.paginationInfo}>
              {currentPage} / {totalPages}
            </span>
            <button
              style={{
                ...styles.paginationButton,
                ...(currentPage === totalPages ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        )}

        {/* Tasks Grid */}
        <div style={styles.tasksGrid}>
          {filteredTasks.length === 0 ? (
            <div style={styles.empty}>No tasks found</div>
          ) : (
            paginatedTasks.map((task) => (
              <div
                key={task._id}
                ref={(el) => { taskRefs.current[task._id] = el; }}
                style={{
                  ...styles.taskCard,
                  ...(highlightedTaskId === task._id ? styles.highlightedCard : {}),
                }}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{task.title}</h3>
                  <div style={styles.badges}>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        backgroundColor: getPriorityColor(task.priority),
                      }}
                    >
                      {task.priority}
                    </span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(task.taskStatus),
                        color: getStatusTextColor(task.taskStatus),
                      }}
                    >
                      {task.taskStatus.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p style={styles.description}>{task.description}</p>
                )}

                <div style={styles.cardMeta}>
                  <div style={styles.metaItem}>
                    <strong>Project:</strong> {task.project}
                  </div>
                  {task.sprint && (
                    <div style={styles.metaItem}>
                      <strong>Sprint:</strong> {task.sprint.name}
                    </div>
                  )}
                  {task.sprint && task.sprint.endDate && (
                    <div style={styles.metaItem}>
                      <strong>Sprint End:</strong> {formatDate(task.sprint.endDate)}
                    </div>
                  )}
                </div>

                <div style={styles.cardActions}>
                  <label style={styles.statusLabel}>Update Status:</label>
                  <select
                    style={styles.statusSelect}
                    value={task.taskStatus}
                    onChange={(e) => updateTaskStatus(task._id, e.target.value as any)}
                  >
                    <option value="pending">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  filterButton: {
    padding: '8px 16px',
    border: '1px solid #d3d3d3',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
    transition: 'all 0.2s',
    outline: 'none',
  },
  filterButtonActive: {
    background: '#FF6495',
    color: 'white',
    border: '1px solid #d3d3d3',
    outline: 'none',
  },
  tasksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  taskCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  badges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4a5568',
  },
  metaItem: {
    display: 'flex',
    gap: '8px',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  statusLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  statusSelect: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'white',
    outline: 'none',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px',
    fontSize: '16px',
    color: '#a0aec0',
  },
  paginationContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginBottom: '20px',
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
  highlightedCard: {
    border: '2px solid #FF6495',
    boxShadow: '0 0 0 4px rgba(255, 100, 149, 0.2), 0 4px 12px rgba(0,0,0,0.15)',
    animation: 'pulse 2s ease-in-out',
  },
};
