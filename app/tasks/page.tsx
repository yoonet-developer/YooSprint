'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  sprint?: {
    _id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt?: string;
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const [tasks, setTasks] = useState<Backlog[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Dynamic items per page: 4 for list view, 8 for grid view (2 rows x 4 columns)
  const itemsPerPage = viewMode === 'grid' ? 8 : 4;

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
    setCurrentPage(1); // Reset to page 1 when filter or search changes
  }, [tasks, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when view mode changes
  }, [viewMode]);

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

        // Calculate which page the task is on after filtering
        setTimeout(() => {
          const statusKey = statusMap[task.taskStatus] || 'all';
          const filtered = statusKey === 'all'
            ? tasks
            : tasks.filter(t => t.taskStatus === task.taskStatus);

          const taskIndex = filtered.findIndex(t => t._id === taskId);
          if (taskIndex !== -1) {
            const correctPage = Math.floor(taskIndex / itemsPerPage) + 1;
            setCurrentPage(correctPage);
          }

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
    let filtered = tasks;

    // Apply status filter
    if (filter === 'all') {
      filtered = tasks;
    } else {
      const statusMap: { [key: string]: string } = {
        'todo': 'pending',
        'in-progress': 'in-progress',
        'completed': 'completed',
      };
      filtered = tasks.filter(t => t.taskStatus === statusMap[filter]);
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.project.toLowerCase().includes(query) ||
        t.sprint?.name.toLowerCase().includes(query)
      );
    }

    // Sort completed tasks by most recent first
    if (filter === 'completed') {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA; // Descending order (most recent first)
      });
    }

    setFilteredTasks(filtered);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
  const showPagination = true; // Always show pagination

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
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
        const statusLabel = newStatus === 'pending' ? 'To Do' : newStatus === 'in-progress' ? 'In Progress' : 'Completed';
        showSuccess(`Task status updated to ${statusLabel}!`);
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
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'list' ? styles.viewButtonActive : {}),
              }}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
              </svg>
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
              }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={styles.filterAndSearchRow}>
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

          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a0aec0',
                pointerEvents: 'none'
              }}
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                style={styles.clearSearchButton}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
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
        <div style={viewMode === 'grid' ? styles.tasksGridView : styles.tasksGrid}>
          {filteredTasks.length === 0 ? (
            <div style={styles.empty}>No tasks found</div>
          ) : (
            paginatedTasks.map((task) => (
              <div
                key={task._id}
                ref={(el) => { taskRefs.current[task._id] = el; }}
                style={{
                  ...(viewMode === 'grid' ? styles.taskCardGrid : styles.taskCard),
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                  ...(highlightedTaskId === task._id ? styles.highlightedCard : {}),
                }}
                onMouseEnter={(e) => {
                  if (viewMode === 'grid') {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode === 'grid') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                  }
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderContent}>
                    <h3 style={styles.cardTitle}>{task.title}</h3>
                    <p style={styles.cardProject}>{task.project}</p>
                    {task.sprint && (
                      <span style={styles.sprintNameBadge}>
                        {task.sprint.name}
                      </span>
                    )}
                  </div>
                  {viewMode === 'list' && (
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(task.taskStatus),
                        color: getStatusTextColor(task.taskStatus),
                      }}
                    >
                      {task.taskStatus.replace('-', ' ')}
                    </span>
                  )}
                </div>

                {task.description ? (
                  <p style={styles.description}>{task.description}</p>
                ) : (
                  viewMode === 'grid' && (
                    <p style={styles.noDescription}>No description</p>
                  )
                )}

                <div style={viewMode === 'grid' ? styles.cardMetaGrid : styles.cardMeta}>
                  <div style={viewMode === 'grid' ? styles.metaLeftGrid : styles.metaLeft}>
                    {viewMode === 'grid' && (
                      <div style={styles.metaItem}>
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
                    )}
                    {task.sprint && task.sprint.endDate && (
                      <div style={styles.metaItem}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: '#718096', flexShrink: 0 }}>
                          <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/>
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                        </svg>
                        <span>Sprint end: {formatDate(task.sprint.endDate)}</span>
                      </div>
                    )}
                  </div>
                  <div style={viewMode === 'grid' ? styles.cardActionsGrid : styles.cardActions}>
                    <div style={styles.statusUpdateContainer}>
                      <label style={styles.statusUpdateLabel}>
                        Update Status:
                      </label>
                      <select
                        style={viewMode === 'grid' ? styles.statusSelectGrid : styles.statusSelect}
                        value={task.taskStatus}
                        onChange={(e) => updateTaskStatus(task._id, e.target.value as any)}
                      >
                        <option value="pending">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={styles.successModalOverlay}>
            <div style={styles.successModal}>
              <div style={styles.successIcon}>✓</div>
              <p style={styles.successMessage}>{successMessage}</p>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  viewToggle: {
    display: 'flex',
    gap: '8px',
    background: '#f7fafc',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  viewButton: {
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#718096',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonActive: {
    background: 'white',
    color: '#FF6495',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
  filterAndSearchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flex: 1,
    minWidth: '0',
    flexWrap: 'wrap',
  },
  searchContainer: {
    position: 'relative',
    width: '25%',
    minWidth: '200px',
    maxWidth: '300px',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  searchInput: {
    width: '100%',
    padding: '8px 40px 8px 36px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  clearSearchButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tasksGridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    columnGap: '24px',
    rowGap: '70px',
  },
  taskCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  taskCardGrid: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '280px',
    border: '1px solid #f0f0f0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px',
  },
  cardHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0,
    lineHeight: '1.4',
  },
  cardProject: {
    fontSize: '13px',
    color: '#718096',
    margin: 0,
    fontWeight: '500',
  },
  sprintNameBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: '#879BFF',
    color: 'white',
    alignSelf: 'flex-start',
    marginTop: '2px',
    maxWidth: '100%',
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    lineHeight: '1.6',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  noDescription: {
    fontSize: '14px',
    color: '#a0aec0',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    gap: '16px',
  },
  cardMetaGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: 'auto',
    paddingTop: '16px',
  },
  metaLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
    color: '#4a5568',
  },
  metaLeftGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
    color: '#4a5568',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'stretch',
  },
  cardActionsGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    width: '100%',
    flexWrap: 'wrap',
  },
  statusUpdateContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  statusUpdateLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  statusSelect: {
    padding: '10px 14px',
    border: '2px solid #e2e8f0',
    background: 'white',
    color: '#2d3748',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    outline: 'none',
    flex: '1',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%234a5568\' d=\'M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  },
  statusSelectGrid: {
    padding: '10px 14px',
    border: '2px solid #e2e8f0',
    background: 'white',
    color: '#2d3748',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    flex: '1',
    transition: 'all 0.2s',
    outline: 'none',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%234a5568\' d=\'M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
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
  successModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2000,
    paddingTop: '100px',
    pointerEvents: 'none',
  },
  successModal: {
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    padding: '24px 32px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(72, 187, 120, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    animation: 'slideDown 0.3s ease-out',
    pointerEvents: 'auto',
  },
  successIcon: {
    fontSize: '32px',
    fontWeight: 'bold',
    background: 'white',
    color: '#48bb78',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMessage: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
};

export default function TasksPage() {
  return (
    <Suspense fallback={<AppLayout><div style={styles.loading}>Loading your tasks...</div></AppLayout>}>
      <TasksPageContent />
    </Suspense>
  );
}
