'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface Backlog {
  _id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  project: string;
  storyPoints: number;
  status: 'backlog' | 'in-sprint' | 'done';
  taskStatus: 'pending' | 'in-progress' | 'completed';
  assignee?: {
    _id: string;
    name: string;
    email: string;
    position: string;
  };
  sprint?: {
    _id: string;
    name: string;
    status: string;
  };
  createdAt: string;
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
  status: string;
  startDate: string;
  endDate: string;
}

export default function BacklogsPage() {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [filteredBacklogs, setFilteredBacklogs] = useState<Backlog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingBacklog, setEditingBacklog] = useState<Backlog | null>(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [backlogToRemove, setBacklogToRemove] = useState<Backlog | null>(null);
  const [showDeleteWarningModal, setShowDeleteWarningModal] = useState(false);
  const [backlogDeleteWarning, setBacklogDeleteWarning] = useState<Backlog | null>(null);
  const [showAddToSprintModal, setShowAddToSprintModal] = useState(false);
  const [backlogToAddToSprint, setBacklogToAddToSprint] = useState<Backlog | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [sprintSearchQuery, setSprintSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const itemsPerPage = viewMode === 'grid' ? 8 : 4;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    storyPoints: 0,
    assignee: '',
  });
  const [projects, setProjects] = useState<string[]>([]);
  const [isAddingNewProject, setIsAddingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    fetchBacklogs();
    fetchUsers();
    fetchSprints();
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1); // Reset to page 1 when filter or search changes
  }, [backlogs, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when view mode changes
  }, [viewMode]);

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
        // Extract unique projects
        const uniqueProjects = Array.from(new Set(data.backlogs.map((b: Backlog) => b.project)));
        setProjects(uniqueProjects as string[]);
      } else {
        console.error('[Frontend] Failed to fetch backlogs:', data.message);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    } finally {
      setLoading(false);
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
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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
        setSprints(data.sprints.filter((s: Sprint) => s.status === 'active' || s.status === 'planned'));
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const applyFilter = () => {
    let filtered = backlogs;

    // Apply status filter
    if (filter === 'all') {
      filtered = backlogs;
    } else if (filter === 'done') {
      // Show items where status is 'done' OR taskStatus is 'completed'
      filtered = backlogs.filter(b => b.status === 'done' || b.taskStatus === 'completed');
    } else if (filter === 'in-sprint') {
      // Show items in sprint that are NOT completed
      filtered = backlogs.filter(b => b.status === 'in-sprint' && b.taskStatus !== 'completed');
    } else {
      filtered = backlogs.filter(b => b.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.project.toLowerCase().includes(query) ||
        b.assignee?.name.toLowerCase().includes(query)
      );
    }

    setFilteredBacklogs(filtered);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredBacklogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBacklogs = filteredBacklogs.slice(startIndex, endIndex);
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

  const handleCreateBacklog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingBacklog ? `/api/backlogs/${editingBacklog._id}` : '/api/backlogs';
      const method = editingBacklog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        resetForm();
        await fetchBacklogs();
        showSuccess(editingBacklog ? 'Backlog item updated successfully!' : 'Backlog item created successfully!');
      } else {
        console.error('[Frontend] Failed to save backlog:', data.message);
        alert(data.message || 'Error saving backlog');
      }
    } catch (error) {
      console.error('Error saving backlog:', error);
      alert('Error saving backlog');
    }
  };

  const handleEdit = (backlog: Backlog) => {
    setEditingBacklog(backlog);
    setFormData({
      title: backlog.title,
      description: backlog.description || '',
      project: backlog.project,
      priority: backlog.priority,
      storyPoints: backlog.storyPoints,
      assignee: backlog.assignee?._id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (backlog: Backlog) => {
    // Check if backlog is in a sprint
    if (backlog.sprint) {
      setBacklogDeleteWarning(backlog);
      setShowDeleteWarningModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${backlog._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchBacklogs();
        showSuccess('Backlog item deleted successfully!');
      } else {
        alert(data.message || 'Error deleting backlog');
      }
    } catch (error) {
      console.error('Error deleting backlog:', error);
      alert('Error deleting backlog');
    }
  };

  const openAddToSprintModal = (backlog: Backlog) => {
    setBacklogToAddToSprint(backlog);
    setSelectedSprintId('');
    setSprintSearchQuery('');
    setShowAddToSprintModal(true);
  };

  const handleMoveToSprint = async () => {
    if (!backlogToAddToSprint || !selectedSprintId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${backlogToAddToSprint._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sprint: selectedSprintId, status: 'in-sprint' }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddToSprintModal(false);
        setBacklogToAddToSprint(null);
        setSelectedSprintId('');
        fetchBacklogs();
        showSuccess('Backlog item added to sprint successfully!');
      } else {
        alert(data.message || 'Error moving to sprint');
      }
    } catch (error) {
      console.error('Error moving to sprint:', error);
      alert('Error moving to sprint');
    }
  };

  const openRemoveConfirmModal = (backlog: Backlog) => {
    setBacklogToRemove(backlog);
    setShowRemoveConfirmModal(true);
  };

  const handleRemoveFromSprint = async () => {
    if (!backlogToRemove) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${backlogToRemove._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sprint: null, status: 'backlog' }),
      });

      const data = await response.json();
      if (data.success) {
        setShowRemoveConfirmModal(false);
        setBacklogToRemove(null);
        fetchBacklogs();
        showSuccess('Backlog item removed from sprint successfully!');
      } else {
        alert(data.message || 'Error removing from sprint');
      }
    } catch (error) {
      console.error('Error removing from sprint:', error);
      alert('Error removing from sprint');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project: '',
      priority: 'medium',
      storyPoints: 0,
      assignee: '',
    });
    setEditingBacklog(null);
    setIsAddingNewProject(false);
    setNewProjectName('');
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f56565';
      case 'medium': return '#ed8936';
      case 'low': return '#48bb78';
      default: return '#718096';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading backlogs...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Product Backlogs</h2>
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
                + Add Backlog Item
              </button>
            )}
          </div>
        </div>

        <div style={styles.filterAndSearchRow}>
          <div style={styles.filterRow}>
            {['all', 'backlog', 'in-sprint', 'done'].map((f) => (
              <button
                key={f}
                style={{
                  ...styles.filterButton,
                  ...(filter === f ? styles.filterButtonActive : {}),
                }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'backlog' ? 'Available' : f === 'in-sprint' ? 'In Sprint' : 'Completed'}
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
              placeholder="Search backlogs"
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

        <div style={viewMode === 'grid' ? styles.backlogGridView : styles.backlogGrid}>
          {filteredBacklogs.length === 0 ? (
            <div style={styles.empty}>No backlog items found</div>
          ) : (
            paginatedBacklogs.map((backlog) => (
              <div
                key={backlog._id}
                style={{
                  ...(viewMode === 'grid' ? styles.backlogCardGrid : styles.backlogCard),
                  borderLeft: `4px solid ${getPriorityColor(backlog.priority)}`,
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
                    <h3 style={styles.cardTitle}>{backlog.title}</h3>
                    <p style={styles.cardProject}>{backlog.project}</p>
                    {backlog.sprint && (
                      <span style={styles.sprintNameBadge}>
                        {backlog.sprint.name}
                      </span>
                    )}
                  </div>
                </div>

                {backlog.description ? (
                  <p style={styles.description}>{backlog.description}</p>
                ) : (
                  viewMode === 'grid' && (
                    <p style={styles.noDescription}>No description</p>
                  )
                )}

                <div style={viewMode === 'grid' ? styles.cardMetaGrid : styles.cardMeta}>
                  <div style={viewMode === 'grid' ? styles.metaLeftGrid : styles.metaLeft}>
                    <div style={styles.metaItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: '#718096', flexShrink: 0 }}>
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                      </svg>
                      <span>{backlog.assignee?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  {currentUser?.role !== 'member' && (
                    <div style={viewMode === 'grid' ? styles.cardActionsGrid : styles.cardActions}>
                      {backlog.status === 'backlog' && sprints.length > 0 && (
                        <button
                          style={viewMode === 'grid' ? styles.sprintSelectGrid : styles.sprintSelect}
                          onClick={() => openAddToSprintModal(backlog)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                          </svg>
                          Add to Sprint
                        </button>
                      )}
                      {backlog.sprint && (
                        <button
                          style={viewMode === 'grid' ? styles.removeSprintButtonGrid : styles.removeSprintButton}
                          onClick={() => openRemoveConfirmModal(backlog)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                          </svg>
                          Remove
                        </button>
                      )}
                      <button style={viewMode === 'grid' ? styles.actionButtonGrid : styles.actionButton} onClick={() => handleEdit(backlog)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                        </svg>
                        Edit
                      </button>
                      <button style={viewMode === 'grid' ? styles.deleteButtonGrid : styles.deleteButton} onClick={() => handleDelete(backlog)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {editingBacklog ? 'Edit Backlog Item' : 'Add Backlog Item'}
              </h2>
              <form onSubmit={handleCreateBacklog} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Title *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Project *</label>
                  {!isAddingNewProject ? (
                    <div ref={projectDropdownRef} style={{ position: 'relative' }}>
                      <input
                        type="text"
                        style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                        value={projectSearchQuery || formData.project}
                        onChange={(e) => {
                          setProjectSearchQuery(e.target.value);
                          setShowProjectDropdown(true);
                        }}
                        onFocus={() => setShowProjectDropdown(true)}
                        placeholder="Search or select project..."
                        required={!formData.project}
                      />
                      {showProjectDropdown && (
                        <div style={styles.searchableDropdown}>
                          {projects
                            .filter((p) =>
                              p.toLowerCase().includes(projectSearchQuery.toLowerCase())
                            )
                            .map((p) => (
                              <div
                                key={p}
                                style={styles.dropdownItem}
                                onClick={() => {
                                  setFormData({ ...formData, project: p });
                                  setProjectSearchQuery('');
                                  setShowProjectDropdown(false);
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f7fafc';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                {p}
                              </div>
                            ))}
                          <div
                            style={{ ...styles.dropdownItem, color: '#667eea', fontWeight: '500' }}
                            onClick={() => {
                              setIsAddingNewProject(true);
                              setFormData({ ...formData, project: '' });
                              setProjectSearchQuery('');
                              setShowProjectDropdown(false);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f7fafc';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                            }}
                          >
                            + Add New Project
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
                        placeholder="Enter new project name"
                        value={formData.project}
                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        style={{ ...styles.backToSelectButton, marginTop: 0, whiteSpace: 'nowrap', padding: '10px 12px' }}
                        onClick={() => {
                          setIsAddingNewProject(false);
                          setFormData({ ...formData, project: '' });
                        }}
                      >
                        ← Back to select
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority</label>
                    <select
                      style={styles.input}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Assign To</label>
                  <select
                    style={styles.input}
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter(user => user.role !== 'super admin' && user.role !== 'super-admin' && user.role !== 'admin')
                      .map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.position})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>
                    {editingBacklog ? 'Update' : 'Create'}
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

        {/* Delete Warning Modal */}
        {showDeleteWarningModal && backlogDeleteWarning && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteWarningModal(false)}>
            <div style={styles.warningModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.warningIcon}>⚠</div>
              <h2 style={styles.warningModalTitle}>Cannot Delete</h2>
              <p style={styles.warningModalMessage}>
                <strong>{backlogDeleteWarning.title}</strong> is currently in the <strong>{backlogDeleteWarning.sprint?.name}</strong> sprint. Please remove it from the sprint before deleting.
              </p>
              <div style={styles.confirmModalActions}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowDeleteWarningModal(false);
                    setBacklogDeleteWarning(null);
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Confirmation Modal */}
        {showRemoveConfirmModal && backlogToRemove && (
          <div style={styles.modalOverlay} onClick={() => setShowRemoveConfirmModal(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.confirmModalTitle}>Remove from Sprint?</h2>
              <p style={styles.confirmModalMessage}>
                Are you sure you want to remove <strong>{backlogToRemove.title}</strong> from the <strong>{backlogToRemove.sprint?.name}</strong> sprint?
              </p>
              <div style={styles.confirmModalActions}>
                <button
                  style={styles.confirmButton}
                  onClick={handleRemoveFromSprint}
                >
                  Yes, Remove
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowRemoveConfirmModal(false);
                    setBacklogToRemove(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Sprint Modal */}
        {showAddToSprintModal && backlogToAddToSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowAddToSprintModal(false)}>
            <div style={styles.addToSprintModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.addToSprintModalTitle}>Add to Sprint</h2>
              <p style={styles.addToSprintModalSubtitle}>
                Select a sprint for <strong>{backlogToAddToSprint.title}</strong>
              </p>

              {/* Search Bar */}
              <div style={styles.sprintSearchContainer}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  style={styles.sprintSearchIcon}
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input
                  type="text"
                  style={styles.sprintSearchInput}
                  placeholder="Search sprints by name..."
                  value={sprintSearchQuery}
                  onChange={(e) => setSprintSearchQuery(e.target.value)}
                />
                {sprintSearchQuery && (
                  <button
                    style={styles.clearSprintSearchButton}
                    onClick={() => setSprintSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={styles.sprintsList}>
                {sprints.filter((sprint) =>
                  sprint.name.toLowerCase().includes(sprintSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div style={styles.noSprintsText}>
                    {sprints.length === 0 ? 'No active or planned sprints available' : 'No sprints match your search'}
                  </div>
                ) : (
                  sprints
                    .filter((sprint) =>
                      sprint.name.toLowerCase().includes(sprintSearchQuery.toLowerCase())
                    )
                    .map((sprint) => (
                    <label
                      key={sprint._id}
                      style={{
                        ...styles.sprintRadioLabel,
                        ...(selectedSprintId === sprint._id ? styles.sprintRadioLabelSelected : {}),
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSprintId !== sprint._id) {
                          e.currentTarget.style.borderColor = '#879BFF';
                          e.currentTarget.style.backgroundColor = '#f7fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSprintId !== sprint._id) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="sprint"
                        value={sprint._id}
                        checked={selectedSprintId === sprint._id}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        style={styles.radioInput}
                      />
                      <div style={styles.sprintOptionContent}>
                        <div style={styles.sprintOptionHeader}>
                          <span style={styles.sprintOptionName}>{sprint.name}</span>
                          <span
                            style={{
                              ...styles.sprintStatusBadge,
                              backgroundColor: sprint.status === 'active' ? '#48bb78' : '#4299e1',
                            }}
                          >
                            {sprint.status}
                          </span>
                        </div>
                        <div style={styles.sprintOptionMeta}>
                          <span style={styles.sprintMetaItem}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                            </svg>
                            {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div style={styles.addToSprintModalActions}>
                <button
                  style={{
                    ...styles.primaryButton,
                    ...((!selectedSprintId) ? styles.primaryButtonDisabled : {}),
                  }}
                  onClick={handleMoveToSprint}
                  disabled={!selectedSprintId}
                >
                  Add to Sprint
                </button>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowAddToSprintModal(false);
                    setBacklogToAddToSprint(null);
                    setSelectedSprintId('');
                    setSprintSearchQuery('');
                  }}
                >
                  Cancel
                </button>
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
  backlogGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  backlogGridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    columnGap: '24px',
    rowGap: '70px',
  },
  backlogCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  backlogCardGrid: {
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
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
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
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  cardActionsGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    width: '100%',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '7px 14px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonGrid: {
    padding: '9px 14px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    flex: '1',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintSelect: {
    padding: '7px 14px',
    border: '1px solid #879BFF',
    background: 'white',
    color: '#879BFF',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprintSelectGrid: {
    padding: '9px 14px',
    border: '1px solid #879BFF',
    background: 'white',
    color: '#879BFF',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    flex: '1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOption: {
    padding: '10px 12px',
    minHeight: '40px',
    lineHeight: '1.5',
  },
  deleteButton: {
    padding: '7px 14px',
    border: '1px solid #f56565',
    background: 'white',
    color: '#f56565',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonGrid: {
    padding: '9px 14px',
    border: '1px solid #f56565',
    background: 'white',
    color: '#f56565',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    flex: '1',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSprintButton: {
    padding: '7px 14px',
    border: '1px solid #879BFF',
    background: 'white',
    color: '#879BFF',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSprintButtonGrid: {
    padding: '9px 14px',
    border: '1px solid #879BFF',
    background: 'white',
    color: '#879BFF',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    flex: '1',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  helpText: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
  backToSelectButton: {
    marginTop: '8px',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  searchableDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  dropdownItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '14px',
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
  confirmModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '480px',
    textAlign: 'center',
  },
  confirmModalTitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#2d3748',
  },
  confirmModalMessage: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '28px',
    lineHeight: '1.6',
  },
  confirmModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  confirmButton: {
    padding: '12px 28px',
    background: '#f56565',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  cancelButton: {
    padding: '12px 28px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  warningModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '480px',
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
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '28px',
    lineHeight: '1.6',
  },
  addToSprintModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '540px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  addToSprintModalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#2d3748',
  },
  addToSprintModalSubtitle: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '20px',
  },
  sprintSearchContainer: {
    position: 'relative',
    marginBottom: '20px',
  },
  sprintSearchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a0aec0',
    pointerEvents: 'none' as const,
  },
  sprintSearchInput: {
    width: '100%',
    padding: '10px 40px 10px 36px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  clearSprintSearchButton: {
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
  sprintsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '4px',
  },
  sprintRadioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid #e2e8f0',
  },
  sprintRadioLabelSelected: {
    borderColor: '#879BFF',
    backgroundColor: '#F0F4FF',
    boxShadow: '0 2px 8px rgba(135, 155, 255, 0.15)',
  },
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
    accentColor: '#879BFF',
  },
  sprintOptionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sprintOptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  sprintOptionName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  sprintStatusBadge: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  sprintOptionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#718096',
  },
  sprintMetaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  noSprintsText: {
    textAlign: 'center',
    padding: '32px',
    color: '#a0aec0',
    fontSize: '14px',
  },
  addToSprintModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
