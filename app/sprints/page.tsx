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
  sprint?: string | { _id: string; name: string };
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBacklogsModal, setShowBacklogsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showIncompleteWarningModal, setShowIncompleteWarningModal] = useState(false);
  const [incompleteWarningMessage, setIncompleteWarningMessage] = useState('');
  const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [backlogSearch, setBacklogSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const itemsPerPage = viewMode === 'grid' ? 8 : 4;
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
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    fetchSprints();
    fetchBacklogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1); // Reset to page 1 when filter or search changes
  }, [sprints, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when view mode changes
  }, [viewMode]);

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
        setSprints(data.sprints);
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
        // Filter for managers only
        setUsers(data.users.filter((u: User) => u.role === 'manager'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
  };

  const applyFilter = () => {
    let filtered = sprints;

    // Apply status filter
    if (filter === 'all') {
      filtered = sprints;
    } else {
      filtered = sprints.filter(s => s.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.goal?.toLowerCase().includes(query) ||
        s.project?.toLowerCase().includes(query) ||
        s.managers?.some(m => m.name.toLowerCase().includes(query))
      );
    }

    setFilteredSprints(filtered);
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
        setShowBacklogsModal(false);
        resetForm();
        fetchSprints();
        fetchBacklogs();
        showSuccess(editingSprint ? 'Sprint updated successfully!' : 'Sprint created successfully!');
      } else {
        // Show warning modal for incomplete tasks error
        if (data.message && data.message.includes('incomplete task')) {
          setIncompleteWarningMessage(data.message);
          setShowIncompleteWarningModal(true);
        } else {
          alert(data.message || 'Error saving sprint');
        }
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

  const openBacklogsModal = (sprint: Sprint) => {
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
    setShowBacklogsModal(true);
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
      .filter(b => {
        // Show backlogs that are:
        // 1. Not in any sprint (!b.sprint), OR
        // 2. Already selected in the current form (being added/edited in this sprint), OR
        // 3. Were originally in this sprint when editing (from editingSprint.backlogItems)
        if (!b.sprint) {
          return true; // Show backlogs not in any sprint
        }
        // If backlog is in a sprint, show it if:
        // - It's currently selected in the form, OR
        // - It was originally in this sprint (when editing)
        if (formData.backlogIds.includes(b._id)) {
          return true;
        }
        // If editing, also show backlogs that were originally in this sprint
        if (editingSprint && editingSprint.backlogItems) {
          return editingSprint.backlogItems.some(item => item._id === b._id);
        }
        return false;
      })
      .filter(b => {
        // When editing a sprint (editingSprint exists), show completed backlogs
        // When creating a new sprint, exclude completed backlogs
        if (editingSprint) {
          return true; // Show all backlogs including completed when editing
        }
        return b.taskStatus !== 'completed'; // Exclude completed backlogs when creating
      })
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
      case 'active': return '#48bb78';
      case 'planned': return '#4299e1';
      case 'completed': return '#718096';
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
          <div style={styles.headerRight}>
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
            {currentUser?.role !== 'member' && (
              <button style={styles.primaryButton} onClick={openAddModal}>
                + Create Sprint
              </button>
            )}
          </div>
        </div>

        <div style={styles.filterAndSearchRow}>
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

          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              style={styles.searchIcon}
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              type="text"
              style={styles.searchInput}
              placeholder="Search sprints"
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

        <div style={viewMode === 'grid' ? styles.sprintsGridView : styles.sprintsList}>
          {filteredSprints.length === 0 ? (
            <div style={styles.empty}>No sprints found</div>
          ) : (
            paginatedSprints.map((sprint) => (
              <div key={sprint._id} style={viewMode === 'grid' ? styles.sprintCardGrid : styles.sprintCard}>
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
                  {viewMode === 'list' && (
                    <div style={styles.sprintActions}>
                      <button
                        style={styles.viewBacklogsButton}
                        onClick={() => openBacklogsModal(sprint)}
                      >
                        View
                      </button>
                      {currentUser?.role !== 'member' && (
                        <button style={styles.deleteButton} onClick={() => openDeleteModal(sprint)}>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {viewMode === 'grid' && sprint.goal && (
                  <p style={styles.sprintGoal}>{sprint.goal}</p>
                )}

                <div style={viewMode === 'grid' ? styles.sprintInfoGrid : styles.sprintInfo}>
                  <div style={styles.infoItem}>
                    <strong>Start Date:</strong> {formatDate(sprint.startDate)}
                  </div>
                  <div style={styles.infoItem}>
                    <strong>End Date:</strong> {formatDate(sprint.endDate)}
                  </div>
                  <div style={styles.infoItem}>
                    <strong>Backlog Items:</strong> {sprint.backlogItems?.length || 0}
                  </div>
                </div>

                {viewMode === 'grid' && (
                  <div style={styles.sprintActionsGrid}>
                    <button
                      style={styles.viewBacklogsButtonGrid}
                      onClick={() => openBacklogsModal(sprint)}
                    >
                      View
                    </button>
                    {currentUser?.role !== 'member' && (
                      <button
                        style={styles.deleteButtonGrid}
                        onClick={() => openDeleteModal(sprint)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Backlogs Modal with Sprint Edit */}
        {showBacklogsModal && editingSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowBacklogsModal(false)}>
            <div style={styles.backlogsModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.backlogsModalHeader}>
                <div>
                  <h2 style={styles.backlogsModalTitle}>Sprint Details</h2>
                  <p style={styles.backlogsModalSubtitle}>
                    {currentUser?.role === 'member' ? 'View sprint information' : 'View and edit sprint information'}
                  </p>
                </div>
                <button
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowBacklogsModal(false);
                    resetForm();
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div style={styles.backlogsModalContent}>
                <form onSubmit={handleCreateSprint}>
                  {/* Sprint Details Section */}
                  <div style={styles.sprintEditSection}>
                    <h3 style={styles.sectionTitle}>Sprint Information</h3>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Sprint Name *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={currentUser?.role === 'member'}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Sprint Goal</label>
                      <textarea
                        style={styles.textarea}
                        value={formData.goal}
                        onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                        rows={2}
                        disabled={currentUser?.role === 'member'}
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
                          disabled={currentUser?.role === 'member'}
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
                          disabled={currentUser?.role === 'member'}
                        />
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Status</label>
                      <select
                        style={styles.input}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        disabled={currentUser?.role === 'member'}
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
                                disabled={currentUser?.role === 'member'}
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
                  </div>

                  {/* Backlogs Section - Editable */}
                  <div style={styles.backlogsSection}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Manage Backlogs ({formData.backlogIds.length} selected)
                      </label>

                      {/* Search Filter */}
                      <input
                        type="text"
                        style={styles.modalSearchInput}
                        placeholder="Search backlogs by title or project..."
                        value={backlogSearch}
                        onChange={(e) => setBacklogSearch(e.target.value)}
                        disabled={currentUser?.role === 'member'}
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
                                disabled={currentUser?.role === 'member'}
                              />
                              <div style={styles.backlogOptionContent}>
                                <div style={styles.backlogItemHeader}>
                                  <span style={styles.backlogOptionTitle}>{backlog.title}</span>
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
                                <div style={styles.backlogOptionMeta}>
                                  {backlog.assignee && (
                                    <span style={styles.backlogOptionProject}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                      </svg>
                                      {backlog.assignee.name}
                                    </span>
                                  )}
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

                    {currentUser?.role !== 'member' && (
                      <div style={styles.formActions}>
                        <button type="submit" style={styles.primaryButton}>
                          Update Sprint
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={styles.successModalOverlay}>
            <div style={styles.successModal}>
              <div style={styles.successIcon}>✓</div>
              <p style={styles.successMessage}>{successMessage}</p>
            </div>
          </div>
        )}

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
                    style={styles.modalSearchInput}
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

        {/* Incomplete Tasks Warning Modal */}
        {showIncompleteWarningModal && (
          <div style={styles.modalOverlay} onClick={() => setShowIncompleteWarningModal(false)}>
            <div style={styles.warningModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.warningIcon}>⚠</div>
              <h2 style={styles.warningModalTitle}>Cannot Complete Sprint</h2>
              <p style={styles.warningModalMessage}>
                {incompleteWarningMessage}
              </p>
              <div style={styles.confirmModalActions}>
                <button
                  style={styles.primaryButton}
                  onClick={() => setShowIncompleteWarningModal(false)}
                >
                  OK
                </button>
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a0aec0',
    pointerEvents: 'none' as const,
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
  modalSearchInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
    marginTop: '8px',
    boxSizing: 'border-box',
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
  sprintsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sprintsGridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    columnGap: '32px',
    rowGap: '60px',
  },
  sprintCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sprintCardGrid: {
    background: 'white',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '300px',
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
    flexWrap: 'wrap',
  },
  sprintGoal: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    lineHeight: '1.5',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
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
  sprintActionsGrid: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    width: '100%',
  },
  viewBacklogsButton: {
    padding: '6px 14px',
    border: '1px solid #4299e1',
    background: 'white',
    color: '#4299e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  viewBacklogsButtonGrid: {
    padding: '8px 14px',
    border: '1px solid #4299e1',
    background: 'white',
    color: '#4299e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    flex: '1',
    textAlign: 'center',
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
  deleteButtonGrid: {
    padding: '8px 14px',
    border: '1px solid #f56565',
    background: 'white',
    color: '#f56565',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    flex: '1',
    textAlign: 'center',
  },
  sprintInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    fontSize: '14px',
    color: '#4a5568',
  },
  sprintInfoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
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
    gridColumn: '1 / -1',
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
  backlogsModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  backlogsModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 32px',
    borderBottom: '2px solid #e2e8f0',
    background: '#f7fafc',
    borderRadius: '12px 12px 0 0',
  },
  backlogsModalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    marginBottom: '4px',
  },
  backlogsModalSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  closeModalButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    lineHeight: '1',
  },
  backlogsModalContent: {
    padding: '24px 32px',
    overflowY: 'auto',
    flex: 1,
  },
  sprintEditSection: {
    marginBottom: '32px',
    paddingBottom: '32px',
    borderBottom: '2px solid #e2e8f0',
  },
  backlogsSection: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '20px',
    marginTop: 0,
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
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
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
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
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
  backlogSelectionContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    background: '#f7fafc',
    marginTop: '8px',
  },
  managerSelectionContainer: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    background: '#f7fafc',
    marginTop: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '10px',
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
  warningModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    textAlign: 'center',
  },
  warningIcon: {
    fontSize: '48px',
    color: '#ed8936',
    marginBottom: '16px',
  },
  warningModalTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2d3748',
  },
  warningModalMessage: {
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  confirmModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
};
