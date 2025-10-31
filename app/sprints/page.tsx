'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface Backlog {
  _id: string;
  title: string;
  description?: string;
  priority: string;
  project: string;
  taskStatus: string;
  assignee?: {
    name: string;
    email: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  position: string;
  role: string;
}

interface Sprint {
  _id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  project?: string;
  managers?: User[];
  createdAt: string;
  backlogItems?: Backlog[];
}

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [filteredSprints, setFilteredSprints] = useState<Sprint[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [backlogSearch, setBacklogSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [expandedSprints, setExpandedSprints] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'planned' as 'planned' | 'active' | 'completed',
    backlogIds: [] as string[],
    managerIds: [] as string[],
  });

  useEffect(() => {
    fetchSprints();
    fetchBacklogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [sprints, filter]);

  const fetchSprints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sprints', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Fetch detailed info for each sprint (including backlogs)
        const sprintsWithBacklogs = await Promise.all(
          data.sprints.map(async (sprint: Sprint) => {
            const detailsRes = await fetch(`/api/sprints/${sprint._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            const detailsData = await detailsRes.json();
            if (detailsData.success) {
              return detailsData.sprint;
            }
            return sprint;
          })
        );
        setSprints(sprintsWithBacklogs);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBacklogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backlogs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setBacklogs(data.backlogs);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Filter for admins and managers only
        setUsers(data.users.filter((u: User) => u.role === 'admin' || u.role === 'manager'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredSprints(sprints);
    } else {
      setFilteredSprints(sprints.filter(s => s.status === filter));
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingSprint ? `/api/sprints/${editingSprint._id}` : '/api/sprints';
      const method = editingSprint ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          goal: formData.goal,
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: formData.status,
          managers: formData.managerIds,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const sprintId = editingSprint ? editingSprint._id : data.sprint._id;

        // Update backlog items for this sprint
        if (formData.backlogIds.length > 0) {
          // Add selected backlogs to sprint
          await Promise.all(
            formData.backlogIds.map(backlogId =>
              fetch(`/api/backlogs/${backlogId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ sprint: sprintId, status: 'in-sprint' }),
              })
            )
          );
        }

        // If editing, remove backlogs that were deselected
        if (editingSprint && editingSprint.backlogItems) {
          const removedBacklogs = editingSprint.backlogItems
            .filter(b => !formData.backlogIds.includes(b._id))
            .map(b => b._id);

          if (removedBacklogs.length > 0) {
            await Promise.all(
              removedBacklogs.map(backlogId =>
                fetch(`/api/backlogs/${backlogId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({ sprint: null, status: 'backlog' }),
                })
              )
            );
          }
        }

        setShowModal(false);
        resetForm();
        fetchSprints();
        fetchBacklogs();
      } else {
        alert(data.message || 'Error saving sprint');
      }
    } catch (error) {
      console.error('Error saving sprint:', error);
      alert('Error saving sprint');
    }
  };

  const handleEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      goal: sprint.goal || '',
      startDate: sprint.startDate.split('T')[0],
      endDate: sprint.endDate.split('T')[0],
      status: sprint.status,
      backlogIds: sprint.backlogItems?.map(b => b._id) || [],
      managerIds: sprint.managers?.map(m => m._id) || [],
    });
    setShowModal(true);
  };

  const toggleSprintExpansion = (sprintId: string) => {
    setExpandedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  const openDeleteModal = (sprint: Sprint) => {
    setDeletingSprint(sprint);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingSprint) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sprints/${deletingSprint._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteModal(false);
        setDeletingSprint(null);
        fetchSprints();
        fetchBacklogs();
      } else {
        alert(data.message || 'Error deleting sprint');
      }
    } catch (error) {
      console.error('Error deleting sprint:', error);
      alert('Error deleting sprint');
    }
  };


  const resetForm = () => {
    setFormData({
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
      status: 'planned',
      backlogIds: [],
      managerIds: [],
    });
    setEditingSprint(null);
    setBacklogSearch('');
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const toggleBacklogSelection = (backlogId: string) => {
    setFormData(prev => ({
      ...prev,
      backlogIds: prev.backlogIds.includes(backlogId)
        ? prev.backlogIds.filter(id => id !== backlogId)
        : [...prev.backlogIds, backlogId]
    }));
  };

  const toggleManagerSelection = (managerId: string) => {
    setFormData(prev => ({
      ...prev,
      managerIds: prev.managerIds.includes(managerId)
        ? prev.managerIds.filter(id => id !== managerId)
        : [...prev.managerIds, managerId]
    }));
  };

  const getFilteredBacklogs = () => {
    return backlogs
      .filter(b => b.taskStatus !== 'in-sprint' || (editingSprint && editingSprint.backlogItems?.some(item => item._id === b._id)))
      .filter(b => b.taskStatus !== 'completed') // Exclude completed backlogs
      .filter(b =>
        backlogSearch === '' ||
        b.title.toLowerCase().includes(backlogSearch.toLowerCase()) ||
        b.project.toLowerCase().includes(backlogSearch.toLowerCase())
      );
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredSprints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSprints = filteredSprints.slice(startIndex, endIndex);
  const showPagination = true; // Always show pagination

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#FF6495';
      case 'planned': return '#4299e1';
      case 'completed': return '#48bb78';
      default: return '#718096';
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
        <div style={styles.loading}>Loading sprints...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Sprints</h2>
          <button style={styles.primaryButton} onClick={openAddModal}>
            + Create Sprint
          </button>
        </div>

        <div style={styles.filterRow}>
          {['all', 'planned', 'active', 'completed'].map((f) => (
            <button
              key={f}
              style={{
                ...styles.filterButton,
                ...(filter === f ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
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

        <div style={styles.sprintsList}>
          {filteredSprints.length === 0 ? (
            <div style={styles.empty}>No sprints found</div>
          ) : (
            paginatedSprints.map((sprint) => {
              const isExpanded = expandedSprints[sprint._id] === true; // Default to collapsed

              return (
              <div key={sprint._id} style={styles.sprintCard}>
                <div style={styles.sprintHeader}>
                  <div style={styles.sprintHeaderLeft}>
                    <h3 style={styles.sprintName}>{sprint.name}</h3>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(sprint.status),
                      }}
                    >
                      {sprint.status}
                    </span>
                  </div>
                  <div style={styles.sprintActions}>
                    <button
                      style={styles.toggleButton}
                      onClick={() => toggleSprintExpansion(sprint._id)}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <button style={styles.actionButton} onClick={() => handleEdit(sprint)}>
                      Edit
                    </button>
                    <button style={styles.deleteButton} onClick={() => openDeleteModal(sprint)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div style={styles.sprintInfo}>
                  <div style={styles.infoItem}>
                    <strong>Start Date:</strong> {formatDate(sprint.startDate)}
                  </div>
                  <div style={styles.infoItem}>
                    <strong>End Date:</strong> {formatDate(sprint.endDate)}
                  </div>
                  <div style={styles.infoItem}>
                    <strong>Backlog Items:</strong> {sprint.backlogItems?.length || 0}
                  </div>
                  {sprint.goal && (
                    <div style={styles.infoItem}>
                      <strong>Goal:</strong> {sprint.goal}
                    </div>
                  )}
                  {sprint.managers && sprint.managers.length > 0 && (
                    <div style={styles.infoItem}>
                      <strong>Managers:</strong> {sprint.managers.map(m => m.name).join(', ')}
                    </div>
                  )}
                </div>

                {isExpanded && sprint.backlogItems && sprint.backlogItems.length > 0 && (
                  <div style={styles.backlogItemsSection}>
                    <h4 style={styles.backlogItemsTitle}>Backlog Items:</h4>
                    <div style={styles.backlogItemsList}>
                      {sprint.backlogItems.map((backlog, index) => (
                        <div
                          key={backlog._id}
                          style={{
                            ...styles.backlogItem,
                            borderBottom: index === sprint.backlogItems.length - 1 ? 'none' : '1px solid #e2e8f0',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                          <div style={styles.backlogItemHeader}>
                            <span style={styles.backlogItemTitle}>{backlog.title}</span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span
                                style={{
                                  ...styles.priorityDot,
                                  backgroundColor:
                                    backlog.priority === 'high'
                                      ? '#f56565'
                                      : backlog.priority === 'medium'
                                      ? '#ed8936'
                                      : '#48bb78',
                                }}
                                title={`Priority: ${backlog.priority}`}
                              ></span>
                              <span
                                style={{
                                  ...styles.taskStatusBadge,
                                  backgroundColor:
                                    backlog.taskStatus === 'completed'
                                      ? '#48bb78'
                                      : backlog.taskStatus === 'in-progress'
                                      ? '#CDE5F380'
                                      : '#718096',
                                  color:
                                    backlog.taskStatus === 'completed'
                                      ? 'white'
                                      : backlog.taskStatus === 'in-progress'
                                      ? '#879BFF'
                                      : 'white',
                                }}
                              >
                                {backlog.taskStatus.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                          {backlog.description && (
                            <p style={styles.backlogItemDesc}>{backlog.description}</p>
                          )}
                          <div style={styles.backlogItemMeta}>
                            {backlog.assignee && (
                              <span style={styles.backlogMetaText}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                </svg>
                                {backlog.assignee.name}
                              </span>
                            )}
                            <span style={styles.backlogMetaText}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                              </svg>
                              {backlog.project}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
            <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.deleteModalTitle}>Delete Sprint?</h2>
              <p style={styles.deleteModalMessage}>
                Are you sure you want to delete <strong>{deletingSprint.name}</strong>?
                All backlog items will be moved back to the backlog.
              </p>
              <div style={styles.deleteModalActions}>
                <button
                  style={styles.deleteConfirmButton}
                  onClick={handleDelete}
                >
                  Delete Sprint
                </button>
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingSprint(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {editingSprint ? 'Edit Sprint' : 'Create Sprint'}
              </h2>
              <form onSubmit={handleCreateSprint} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Sprint Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Sprint 1, Q1 2024 Sprint"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Sprint Goal</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    rows={2}
                    placeholder="What do you want to achieve in this sprint?"
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date *</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date *</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    style={styles.input}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Assign Managers ({formData.managerIds.length} selected)
                  </label>

                  {/* Manager List with Checkboxes */}
                  <div style={styles.managerSelectionContainer}>
                    {users.length === 0 ? (
                      <div style={styles.noBacklogsText}>No managers available</div>
                    ) : (
                      users.map((user) => (
                        <label
                          key={user._id}
                          style={styles.checkboxLabel}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.managerIds.includes(user._id)}
                            onChange={() => toggleManagerSelection(user._id)}
                            style={styles.checkbox}
                          />
                          <div style={styles.backlogOptionContent}>
                            <div style={styles.backlogOptionTitle}>{user.name}</div>
                            <div style={styles.backlogOptionMeta}>
                              <span style={styles.backlogOptionProject}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                </svg>
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Add Backlogs to Sprint ({formData.backlogIds.length} selected)
                  </label>

                  {/* Search Filter */}
                  <input
                    type="text"
                    style={styles.searchInput}
                    placeholder="Search backlogs by title or project..."
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                  />

                  {/* Backlog List with Checkboxes */}
                  <div style={styles.backlogSelectionContainer}>
                    {getFilteredBacklogs().length === 0 ? (
                      <div style={styles.noBacklogsText}>No backlogs available</div>
                    ) : (
                      getFilteredBacklogs().map((backlog) => (
                        <label
                          key={backlog._id}
                          style={styles.checkboxLabel}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#667eea';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.backlogIds.includes(backlog._id)}
                            onChange={() => toggleBacklogSelection(backlog._id)}
                            style={styles.checkbox}
                          />
                          <div style={styles.backlogOptionContent}>
                            <div style={styles.backlogOptionTitle}>{backlog.title}</div>
                            <div style={styles.backlogOptionMeta}>
                              <span style={styles.backlogOptionProject}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
                                </svg>
                                {backlog.project}
                              </span>
                              <span
                                style={{
                                  ...styles.priorityBadge,
                                  backgroundColor:
                                    backlog.priority === 'high'
                                      ? '#f56565'
                                      : backlog.priority === 'medium'
                                      ? '#ed8936'
                                      : '#48bb78',
                                }}
                              >
                                {backlog.priority}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>
                    {editingSprint ? 'Update Sprint' : 'Create Sprint'}
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  primaryButton: {
    background: '#FF6495',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
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
  sprintsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sprintCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sprintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sprintHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sprintName: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  sprintActions: {
    display: 'flex',
    gap: '8px',
  },
  toggleButton: {
    padding: '6px 10px',
    border: '1px solid #d3d3d3',
    background: 'white',
    color: '#4a5568',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    outline: 'none',
  },
  actionButton: {
    padding: '6px 14px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  deleteButton: {
    padding: '6px 14px',
    border: '1px solid #f56565',
    background: 'white',
    color: '#f56565',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  sprintInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    fontSize: '14px',
    color: '#4a5568',
  },
  infoItem: {
    display: 'flex',
    gap: '8px',
  },
  backlogItemsSection: {
    marginTop: '24px',
    borderTop: '2px solid #e2e8f0',
    paddingTop: '20px',
  },
  backlogItemsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '16px',
  },
  noBacklogs: {
    color: '#a0aec0',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  backlogItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  backlogItem: {
    background: 'white',
    padding: '18px 20px',
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  backlogItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  backlogItemTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  taskStatusBadge: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  backlogItemDesc: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '12px',
    lineHeight: '1.5',
    margin: 0,
  },
  backlogItemAssignee: {
    fontSize: '13px',
    color: '#4a5568',
    margin: 0,
  },
  backlogItemMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4a5568',
    marginTop: '10px',
  },
  backlogMetaText: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priorityDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '16px',
    color: '#a0aec0',
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
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#2d3748',
  },
  deleteModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '450px',
  },
  deleteModalTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2d3748',
  },
  deleteModalMessage: {
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  deleteModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  deleteConfirmButton: {
    padding: '12px 24px',
    border: 'none',
    background: '#f56565',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  secondaryButton: {
    padding: '12px 24px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  searchInput: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
  },
  backlogSelectionContainer: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px',
    background: '#f7fafc',
  },
  managerSelectionContainer: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px',
    background: '#f7fafc',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
  },
  backlogOptionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  backlogOptionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  backlogOptionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
  },
  backlogOptionProject: {
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  priorityBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  noBacklogsText: {
    textAlign: 'center',
    padding: '20px',
    color: '#a0aec0',
    fontSize: '14px',
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
  paginationButtonActive: {
    background: '#667eea',
    color: 'white',
    borderColor: '#667eea',
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
};
