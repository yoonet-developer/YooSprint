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
    setCurrentPage(1);
  }, [sprints, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
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

    if (filter === 'all') {
      filtered = sprints;
    } else {
      filtered = sprints.filter(s => s.status === filter);
    }

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

        if (formData.backlogIds.length > 0) {
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
        showSuccess('Sprint deleted successfully!');
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
        if (!b.sprint) {
          return true;
        }
        if (formData.backlogIds.includes(b._id)) {
          return true;
        }
        if (editingSprint && editingSprint.backlogItems) {
          return editingSprint.backlogItems.some(item => item._id === b._id);
        }
        return false;
      })
      .filter(b => {
        if (editingSprint) {
          return true;
        }
        return b.taskStatus !== 'completed';
      })
      .filter(b =>
        backlogSearch === '' ||
        b.title.toLowerCase().includes(backlogSearch.toLowerCase()) ||
        b.project.toLowerCase().includes(backlogSearch.toLowerCase())
      );
  };

  const totalPages = Math.ceil(filteredSprints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSprints = filteredSprints.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: '#16a34a', bg: '#f0fdf4', label: 'Active' };
      case 'planned': return { color: '#879BFF', bg: '#F0F4FF', label: 'Planned' };
      case 'completed': return { color: '#6b7280', bg: '#f3f4f6', label: 'Completed' };
      default: return { color: '#6b7280', bg: '#f3f4f6', label: status };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Stats calculations
  const totalSprints = sprints.length;
  const activeSprints = sprints.filter(s => s.status === 'active').length;
  const plannedSprints = sprints.filter(s => s.status === 'planned').length;
  const completedSprints = sprints.filter(s => s.status === 'completed').length;

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
        {/* Header Section */}
        <div style={styles.headerSection}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>Sprints</h1>
            <p style={styles.pageSubtitle}>Plan and manage your development sprints</p>
          </div>
          <div style={styles.headerRight}>
            {currentUser?.role !== 'member' && (
              <button style={styles.addButton} onClick={openAddModal}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                </svg>
                Create Sprint
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{totalSprints}</span>
              <span style={styles.statLabel}>Total Sprints</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#16a34a" viewBox="0 0 16 16">
                <path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5M13.991 3l.024.001a1.5 1.5 0 0 1 .538.143.76.76 0 0 1 .302.254c.067.1.145.277.145.602v5.991l-.001.024a1.5 1.5 0 0 1-.143.538.76.76 0 0 1-.254.302c-.1.067-.277.145-.602.145H2.009l-.024-.001a1.5 1.5 0 0 1-.538-.143.76.76 0 0 1-.302-.254C1.078 10.502 1 10.325 1 10V4.009l.001-.024a1.5 1.5 0 0 1 .143-.538.76.76 0 0 1 .254-.302C1.498 3.078 1.675 3 2 3zM0 4.009C0 3.17.54 2.452 1.145 2.145A2.5 2.5 0 0 1 2 2h12a2.5 2.5 0 0 1 .855.145C15.46 2.452 16 3.17 16 4.01v5.983C16 10.83 15.46 11.548 14.855 11.855A2.5 2.5 0 0 1 14 12H2a2.5 2.5 0 0 1-.855-.145C.54 11.548 0 10.83 0 9.991z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{activeSprints}</span>
              <span style={styles.statLabel}>Active</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#F0F4FF'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{plannedSprints}</span>
              <span style={styles.statLabel}>Planned</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#f3f4f6'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b7280" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{completedSprints}</span>
              <span style={styles.statLabel}>Completed</span>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div style={styles.controlsRow}>
          {/* Filter Tabs */}
          <div style={styles.filterTabs}>
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'planned', label: 'Planned' },
              { key: 'completed', label: 'Completed' }
            ].map((f) => (
              <button
                key={f.key}
                style={{
                  ...styles.filterTab,
                  ...(filter === f.key ? styles.filterTabActive : {}),
                }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === 'all' && <span style={styles.tabCount}>{totalSprints}</span>}
                {f.key === 'active' && <span style={styles.tabCount}>{activeSprints}</span>}
                {f.key === 'planned' && <span style={styles.tabCount}>{plannedSprints}</span>}
                {f.key === 'completed' && <span style={styles.tabCount}>{completedSprints}</span>}
              </button>
            ))}
          </div>

          {/* Right Controls */}
          <div style={styles.rightControls}>
            {/* View Toggle */}
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewBtn,
                  ...(viewMode === 'list' ? styles.viewBtnActive : {}),
                }}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
                </svg>
              </button>
              <button
                style={{
                  ...styles.viewBtn,
                  ...(viewMode === 'grid' ? styles.viewBtnActive : {}),
                }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div style={styles.searchBox}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#9ca3af" viewBox="0 0 16 16" style={styles.searchIcon}>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input
                type="text"
                style={styles.searchInput}
                placeholder="Search sprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button style={styles.clearSearch} onClick={() => setSearchQuery('')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div style={styles.paginationRow}>
            <span style={styles.resultCount}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSprints.length)} of {filteredSprints.length} sprints
            </span>
            <div style={styles.paginationControls}>
              <button
                style={{...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {})}}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
                </svg>
              </button>
              <span style={styles.pageInfo}>{currentPage} / {totalPages || 1}</span>
              <button
                style={{...styles.pageBtn, ...(currentPage === totalPages || totalPages === 0 ? styles.pageBtnDisabled : {})}}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Sprint Items */}
        {filteredSprints.length === 0 ? (
          <div style={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#d1d5db" viewBox="0 0 16 16">
              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
            </svg>
            <p style={styles.emptyText}>No sprints found</p>
            <p style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create a new sprint to get started'}
            </p>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? styles.gridView : styles.listView}>
            {paginatedSprints.map((sprint) => {
              const statusConfig = getStatusConfig(sprint.status);
              const daysRemaining = getDaysRemaining(sprint.endDate);

              return (
                <div
                  key={sprint._id}
                  style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#879BFF';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 155, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Status Indicator */}
                  <div style={{...styles.statusLine, backgroundColor: statusConfig.color}} />

                  <div style={styles.cardContent}>
                    {/* Card Header */}
                    <div style={styles.cardHeader}>
                      <div style={styles.cardTitleRow}>
                        <h3 style={styles.cardTitle}>{sprint.name}</h3>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Goal */}
                    {sprint.goal && (
                      <p style={styles.cardGoal}>{sprint.goal}</p>
                    )}

                    {/* Sprint Info */}
                    <div style={styles.sprintInfo}>
                      <div style={styles.infoItem}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                        </svg>
                        <span>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                          <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                        </svg>
                        <span>{sprint.backlogItems?.length || 0} items</span>
                      </div>
                      {sprint.status === 'active' && (
                        <div style={{
                          ...styles.daysRemaining,
                          color: daysRemaining <= 3 ? '#dc2626' : daysRemaining <= 7 ? '#f59e0b' : '#16a34a'
                        }}>
                          {daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Ends today' : 'Overdue'}
                        </div>
                      )}
                    </div>

                    {/* Managers */}
                    {sprint.managers && sprint.managers.length > 0 && (
                      <div style={styles.managersRow}>
                        <span style={styles.managersLabel}>Managers:</span>
                        <div style={styles.managerAvatars}>
                          {sprint.managers.slice(0, 3).map((manager, idx) => (
                            <div key={manager._id} style={{...styles.avatar, marginLeft: idx > 0 ? '-8px' : 0}}>
                              {manager.name.charAt(0)}
                            </div>
                          ))}
                          {sprint.managers.length > 3 && (
                            <span style={styles.moreManagers}>+{sprint.managers.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={styles.cardActions}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => openBacklogsModal(sprint)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                        </svg>
                        View Details
                      </button>
                      {currentUser?.role !== 'member' && (
                        <button
                          style={{...styles.actionBtn, ...styles.actionBtnDelete}}
                          onClick={() => openDeleteModal(sprint)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                          </svg>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Backlogs Modal with Sprint Edit */}
        {showBacklogsModal && editingSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowBacklogsModal(false)}>
            <div style={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>Sprint Details</h2>
                  <p style={styles.modalSubtitle}>
                    {currentUser?.role === 'member' ? 'View sprint information' : 'View and edit sprint information'}
                  </p>
                </div>
                <button
                  style={styles.modalClose}
                  onClick={() => { setShowBacklogsModal(false); resetForm(); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              </div>

              <div style={styles.modalContent}>
                <form onSubmit={handleCreateSprint}>
                  {/* Sprint Details Section */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Sprint Information</h3>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>SPRINT NAME</label>
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
                      <label style={styles.label}>GOAL</label>
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
                        <label style={styles.label}>START DATE</label>
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
                        <label style={styles.label}>END DATE</label>
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
                      <label style={styles.label}>STATUS</label>
                      <select
                        style={styles.select}
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
                        MANAGERS ({formData.managerIds.length} selected)
                      </label>
                      <div style={styles.selectionContainer}>
                        {users.length === 0 ? (
                          <div style={styles.noItems}>No managers available</div>
                        ) : (
                          users.map((user) => (
                            <label
                              key={user._id}
                              style={{
                                ...styles.checkboxItem,
                                ...(formData.managerIds.includes(user._id) ? styles.checkboxItemSelected : {})
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.managerIds.includes(user._id)}
                                onChange={() => toggleManagerSelection(user._id)}
                                style={styles.checkbox}
                                disabled={currentUser?.role === 'member'}
                              />
                              <div style={styles.checkboxContent}>
                                <span style={styles.checkboxTitle}>{user.name}</span>
                                <span style={styles.checkboxMeta}>{user.position}</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Backlogs Section */}
                  <div style={styles.section}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        BACKLOG ITEMS ({formData.backlogIds.length} selected)
                      </label>

                      <div style={styles.searchBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#9ca3af" viewBox="0 0 16 16" style={styles.searchIcon}>
                          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                        <input
                          type="text"
                          style={styles.searchInput}
                          placeholder="Search backlogs..."
                          value={backlogSearch}
                          onChange={(e) => setBacklogSearch(e.target.value)}
                          disabled={currentUser?.role === 'member'}
                        />
                      </div>

                      <div style={styles.selectionContainer}>
                        {getFilteredBacklogs().length === 0 ? (
                          <div style={styles.noItems}>No backlogs available</div>
                        ) : (
                          getFilteredBacklogs().map((backlog) => (
                            <label
                              key={backlog._id}
                              style={{
                                ...styles.checkboxItem,
                                ...(formData.backlogIds.includes(backlog._id) ? styles.checkboxItemSelected : {})
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.backlogIds.includes(backlog._id)}
                                onChange={() => toggleBacklogSelection(backlog._id)}
                                style={styles.checkbox}
                                disabled={currentUser?.role === 'member'}
                              />
                              <div style={styles.checkboxContent}>
                                <div style={styles.backlogHeader}>
                                  <span style={styles.checkboxTitle}>{backlog.title}</span>
                                  <span style={{
                                    ...styles.taskStatusBadge,
                                    backgroundColor:
                                      backlog.taskStatus === 'completed' ? '#f0fdf4' :
                                      backlog.taskStatus === 'in-progress' ? '#F0F4FF' : '#f3f4f6',
                                    color:
                                      backlog.taskStatus === 'completed' ? '#16a34a' :
                                      backlog.taskStatus === 'in-progress' ? '#879BFF' : '#6b7280'
                                  }}>
                                    {backlog.taskStatus.replace('-', ' ')}
                                  </span>
                                </div>
                                <div style={styles.backlogMeta}>
                                  <span style={styles.projectTag}>{backlog.project}</span>
                                  <span style={{
                                    ...styles.priorityBadge,
                                    backgroundColor:
                                      backlog.priority === 'high' ? '#fef2f2' :
                                      backlog.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                                    color:
                                      backlog.priority === 'high' ? '#dc2626' :
                                      backlog.priority === 'medium' ? '#f59e0b' : '#16a34a'
                                  }}>
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
                        <button
                          type="button"
                          style={styles.cancelBtn}
                          onClick={() => { setShowBacklogsModal(false); resetForm(); }}
                        >
                          Cancel
                        </button>
                        <button type="submit" style={styles.submitBtn}>
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

        {/* Create Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingSprint ? 'Edit Sprint' : 'Create Sprint'}
                </h2>
                <button style={styles.modalClose} onClick={() => { setShowModal(false); resetForm(); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateSprint} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SPRINT NAME</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Sprint 1"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>GOAL</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    rows={2}
                    placeholder="What do you want to achieve?"
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>START DATE</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>END DATE</label>
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
                  <label style={styles.label}>STATUS</label>
                  <select
                    style={styles.select}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>MANAGERS ({formData.managerIds.length} selected)</label>
                  <div style={styles.selectionContainer}>
                    {users.length === 0 ? (
                      <div style={styles.noItems}>No managers available</div>
                    ) : (
                      users.map((user) => (
                        <label
                          key={user._id}
                          style={{
                            ...styles.checkboxItem,
                            ...(formData.managerIds.includes(user._id) ? styles.checkboxItemSelected : {})
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.managerIds.includes(user._id)}
                            onChange={() => toggleManagerSelection(user._id)}
                            style={styles.checkbox}
                          />
                          <div style={styles.checkboxContent}>
                            <span style={styles.checkboxTitle}>{user.name}</span>
                            <span style={styles.checkboxMeta}>{user.position}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>BACKLOGS ({formData.backlogIds.length} selected)</label>
                  <input
                    type="text"
                    style={{...styles.input, marginBottom: '12px'}}
                    placeholder="Search backlogs..."
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                  />
                  <div style={styles.selectionContainer}>
                    {getFilteredBacklogs().length === 0 ? (
                      <div style={styles.noItems}>No backlogs available</div>
                    ) : (
                      getFilteredBacklogs().map((backlog) => (
                        <label
                          key={backlog._id}
                          style={{
                            ...styles.checkboxItem,
                            ...(formData.backlogIds.includes(backlog._id) ? styles.checkboxItemSelected : {})
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.backlogIds.includes(backlog._id)}
                            onChange={() => toggleBacklogSelection(backlog._id)}
                            style={styles.checkbox}
                          />
                          <div style={styles.checkboxContent}>
                            <span style={styles.checkboxTitle}>{backlog.title}</span>
                            <div style={styles.backlogMeta}>
                              <span style={styles.projectTag}>{backlog.project}</span>
                              <span style={{
                                ...styles.priorityBadge,
                                backgroundColor:
                                  backlog.priority === 'high' ? '#fef2f2' :
                                  backlog.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                                color:
                                  backlog.priority === 'high' ? '#dc2626' :
                                  backlog.priority === 'medium' ? '#f59e0b' : '#16a34a'
                              }}>
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
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitBtn}>
                    {editingSprint ? 'Update Sprint' : 'Create Sprint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.warningIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#ef4444" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>
              </div>
              <h3 style={styles.confirmTitle}>Delete Sprint?</h3>
              <p style={styles.confirmText}>
                Are you sure you want to delete <strong>{deletingSprint.name}</strong>? All backlog items will be moved back to the backlog.
              </p>
              <div style={styles.confirmActions}>
                <button
                  style={styles.cancelBtn}
                  onClick={() => { setShowDeleteModal(false); setDeletingSprint(null); }}
                >
                  Cancel
                </button>
                <button style={styles.deleteBtn} onClick={handleDelete}>
                  Delete Sprint
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {showIncompleteWarningModal && (
          <div style={styles.modalOverlay} onClick={() => setShowIncompleteWarningModal(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.warningIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#f59e0b" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                </svg>
              </div>
              <h3 style={styles.confirmTitle}>Cannot Complete Sprint</h3>
              <p style={styles.confirmText}>{incompleteWarningMessage}</p>
              <div style={styles.confirmActions}>
                <button style={styles.submitBtn} onClick={() => setShowIncompleteWarningModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessModal && (
          <div style={styles.successToast}>
            <div style={styles.successIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
            <span style={styles.successText}>{successMessage}</span>
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
  // Header Section
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  // Stats Row
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: '#F0F4FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  // Controls Row
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    background: '#f3f4f6',
    padding: '4px',
    borderRadius: '10px',
  },
  filterTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterTabActive: {
    background: 'white',
    color: '#1f2937',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tabCount: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    background: '#f3f4f6',
    padding: '4px',
    borderRadius: '8px',
  },
  viewBtn: {
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {
    background: 'white',
    color: '#879BFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  searchBox: {
    position: 'relative',
    width: '280px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  clearSearch: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pagination
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  resultCount: {
    fontSize: '14px',
    color: '#6b7280',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pageBtn: {
    padding: '6px 10px',
    border: '1px solid #e5e7eb',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#4b5563',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#4b5563',
    fontWeight: 500,
    minWidth: '60px',
    textAlign: 'center',
  },
  // Views
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  gridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '16px',
  },
  // Cards
  listCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  gridCard: {
    position: 'relative',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  statusLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
  },
  cardContent: {
    padding: '20px',
    paddingTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    flex: 1,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  cardGoal: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  sprintInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#6b7280',
  },
  daysRemaining: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
  },
  managersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  managersLabel: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  managerAvatars: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    border: '2px solid white',
  },
  moreManagers: {
    fontSize: '12px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid #879BFF',
    background: 'white',
    color: '#879BFF',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionBtnDelete: {
    borderColor: '#ef4444',
    color: '#ef4444',
  },
  // Empty State
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#4b5563',
    margin: '16px 0 4px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
  // Modal
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
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  detailsModal: {
    background: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 24px 0',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0',
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    cursor: 'pointer',
  },
  selectionContainer: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
    background: '#f9fafb',
    marginTop: '8px',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #e5e7eb',
  },
  checkboxItemSelected: {
    borderColor: '#879BFF',
    background: '#F0F4FF',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px',
    accentColor: '#879BFF',
  },
  checkboxContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  checkboxTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  checkboxMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  backlogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  backlogMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  projectTag: {
    padding: '2px 8px',
    background: '#F0F4FF',
    color: '#879BFF',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  taskStatusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  noItems: {
    textAlign: 'center',
    padding: '20px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelBtn: {
    padding: '12px 24px',
    border: '1px solid #e5e7eb',
    background: 'white',
    color: '#4b5563',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Confirm Modal
  confirmModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    width: '90%',
    maxWidth: '420px',
    textAlign: 'center',
  },
  warningIcon: {
    marginBottom: '16px',
  },
  confirmTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 12px',
  },
  confirmText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  confirmActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: '12px 24px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Success Toast
  successToast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    color: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(22, 163, 74, 0.3)',
    zIndex: 2000,
    animation: 'slideIn 0.3s ease-out',
  },
  successIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: '14px',
    fontWeight: 600,
  },
};
