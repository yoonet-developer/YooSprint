'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

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
  startDate?: string;
  endDate?: string;
  checklist?: ChecklistItem[];
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
    startDate: '',
    endDate: '',
    checklist: [] as ChecklistItem[],
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');
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
    setCurrentPage(1);
  }, [backlogs, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
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

    if (filter === 'all') {
      filtered = backlogs;
    } else if (filter === 'done') {
      filtered = backlogs.filter(b => b.status === 'done' || b.taskStatus === 'completed');
    } else if (filter === 'in-sprint') {
      filtered = backlogs.filter(b => b.status === 'in-sprint' && b.taskStatus !== 'completed');
    } else {
      filtered = backlogs.filter(b => b.status === filter);
    }

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

  const totalPages = Math.ceil(filteredBacklogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBacklogs = filteredBacklogs.slice(startIndex, endIndex);

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

      const payload = {
        title: formData.title,
        description: formData.description || null,
        project: formData.project,
        priority: formData.priority,
        storyPoints: formData.storyPoints,
        assignee: formData.assignee || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        checklist: formData.checklist,
      };

      console.log('[Backlog] Saving payload:', payload);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
    console.log('[Backlog] Editing backlog:', backlog);
    setEditingBacklog(backlog);
    setFormData({
      title: backlog.title,
      description: backlog.description || '',
      project: backlog.project,
      priority: backlog.priority,
      storyPoints: backlog.storyPoints,
      assignee: backlog.assignee?._id || '',
      startDate: backlog.startDate ? new Date(backlog.startDate).toISOString().split('T')[0] : '',
      endDate: backlog.endDate ? new Date(backlog.endDate).toISOString().split('T')[0] : '',
      checklist: backlog.checklist || [],
    });
    setNewChecklistItem('');
    setShowModal(true);
  };

  const handleDelete = async (backlog: Backlog) => {
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
      startDate: '',
      endDate: '',
      checklist: [],
    });
    setEditingBacklog(null);
    setIsAddingNewProject(false);
    setNewProjectName('');
    setNewChecklistItem('');
  };

  // Checklist functions
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false,
      };
      setFormData({
        ...formData,
        checklist: [...formData.checklist, newItem],
      });
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter(item => item.id !== id),
    });
  };

  const toggleChecklistItem = (id: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': return { color: '#dc2626', bg: '#fef2f2', label: 'High' };
      case 'medium': return { color: '#f59e0b', bg: '#fffbeb', label: 'Medium' };
      case 'low': return { color: '#16a34a', bg: '#f0fdf4', label: 'Low' };
      default: return { color: '#6b7280', bg: '#f9fafb', label: 'None' };
    }
  };

  const getStatusConfig = (status: string, taskStatus: string) => {
    if (status === 'done' || taskStatus === 'completed') {
      return { color: '#16a34a', bg: '#f0fdf4', label: 'Completed' };
    }
    if (status === 'in-sprint') {
      return { color: '#879BFF', bg: '#F0F4FF', label: 'In Sprint' };
    }
    return { color: '#6b7280', bg: '#f9fafb', label: 'Available' };
  };

  // Stats calculations
  const totalBacklogs = backlogs.length;
  const inSprintCount = backlogs.filter(b => b.status === 'in-sprint' && b.taskStatus !== 'completed').length;
  const completedCount = backlogs.filter(b => b.status === 'done' || b.taskStatus === 'completed').length;
  const availableCount = backlogs.filter(b => b.status === 'backlog').length;

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
        {/* Header Section */}
        <div style={styles.headerSection}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>Product Backlogs</h1>
            <p style={styles.pageSubtitle}>Manage and prioritize your product backlog items</p>
          </div>
          <div style={styles.headerRight}>
            {currentUser?.role !== 'member' && (
              <button style={styles.addButton} onClick={openAddModal}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                </svg>
                Add Backlog
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{totalBacklogs}</span>
              <span style={styles.statLabel}>Total Items</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#16a34a" viewBox="0 0 16 16">
                <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{availableCount}</span>
              <span style={styles.statLabel}>Available</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#F0F4FF'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{inSprintCount}</span>
              <span style={styles.statLabel}>In Sprint</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{...styles.statIcon, backgroundColor: '#fef2f2'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#16a34a" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={styles.statValue}>{completedCount}</span>
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
              { key: 'backlog', label: 'Available' },
              { key: 'in-sprint', label: 'In Sprint' },
              { key: 'done', label: 'Completed' }
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
                {f.key === 'all' && <span style={styles.tabCount}>{totalBacklogs}</span>}
                {f.key === 'backlog' && <span style={styles.tabCount}>{availableCount}</span>}
                {f.key === 'in-sprint' && <span style={styles.tabCount}>{inSprintCount}</span>}
                {f.key === 'done' && <span style={styles.tabCount}>{completedCount}</span>}
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
                placeholder="Search backlogs..."
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredBacklogs.length)} of {filteredBacklogs.length} items
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

        {/* Backlog Items */}
        {filteredBacklogs.length === 0 ? (
          <div style={styles.emptyState}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#d1d5db" viewBox="0 0 16 16">
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
            </svg>
            <p style={styles.emptyText}>No backlog items found</p>
            <p style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create a new backlog item to get started'}
            </p>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? styles.gridView : styles.listView}>
            {paginatedBacklogs.map((backlog) => {
              const priorityConfig = getPriorityConfig(backlog.priority);
              const statusConfig = getStatusConfig(backlog.status, backlog.taskStatus);

              return (
                <div
                  key={backlog._id}
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
                  {/* Priority Indicator */}
                  <div style={{...styles.priorityLine, backgroundColor: priorityConfig.color}} />

                  <div style={styles.cardContent}>
                    {/* Card Header */}
                    <div style={styles.cardHeader}>
                      <div style={styles.cardTitleRow}>
                        <h3 style={styles.cardTitle}>{backlog.title}</h3>
                        <span style={{
                          ...styles.priorityBadge,
                          backgroundColor: priorityConfig.bg,
                          color: priorityConfig.color
                        }}>
                          {priorityConfig.label}
                        </span>
                      </div>
                      <div style={styles.cardMeta}>
                        <span style={styles.projectTag}>{backlog.project}</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {backlog.description && (
                      <p style={styles.cardDescription}>{backlog.description}</p>
                    )}

                    {/* Date Range */}
                    {(backlog.startDate || backlog.endDate) && (
                      <div style={styles.dateRow}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                        </svg>
                        <span style={styles.dateText}>
                          {backlog.startDate && new Date(backlog.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {backlog.startDate && backlog.endDate && ' - '}
                          {backlog.endDate && new Date(backlog.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Sprint Badge */}
                    {backlog.sprint && (
                      <div style={styles.sprintRow}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#879BFF" viewBox="0 0 16 16">
                          <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                        </svg>
                        <span style={styles.sprintName}>{backlog.sprint.name}</span>
                      </div>
                    )}

                    {/* Checklist Count */}
                    {backlog.checklist && backlog.checklist.length > 0 && (
                      <div style={styles.checklistCount}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                          <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                        </svg>
                        <span style={styles.checklistCountText}>
                          {backlog.checklist.filter(item => item.completed).length}/{backlog.checklist.length}
                        </span>
                      </div>
                    )}

                    {/* Assignee */}
                    <div style={styles.assigneeRow}>
                      <div style={styles.avatar}>
                        {backlog.assignee?.name?.charAt(0) || '?'}
                      </div>
                      <span style={styles.assigneeName}>
                        {backlog.assignee?.name || 'Unassigned'}
                      </span>
                    </div>

                    {/* Actions */}
                    {currentUser?.role !== 'member' && (
                      <div style={styles.cardActions}>
                        {backlog.status === 'backlog' && sprints.length > 0 && (
                          <button
                            style={styles.actionBtn}
                            onClick={() => openAddToSprintModal(backlog)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                            </svg>
                            Add to Sprint
                          </button>
                        )}
                        {backlog.sprint && (
                          <button
                            style={{...styles.actionBtn, ...styles.actionBtnSecondary}}
                            onClick={() => openRemoveConfirmModal(backlog)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                            </svg>
                            Remove
                          </button>
                        )}
                        <button
                          style={{...styles.actionBtn, ...styles.actionBtnView}}
                          onClick={() => handleEdit(backlog)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
                            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
                          </svg>
                          View
                        </button>
                        <button
                          style={{...styles.actionBtn, ...styles.actionBtnDelete}}
                          onClick={() => handleDelete(backlog)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingBacklog ? 'View Backlog Item' : 'Add Backlog Item'}
                </h2>
                <button style={styles.modalClose} onClick={() => { setShowModal(false); resetForm(); }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateBacklog} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>TITLE</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter backlog title"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>PROJECT</label>
                  {!isAddingNewProject ? (
                    <div ref={projectDropdownRef} style={{ position: 'relative' }}>
                      <input
                        type="text"
                        style={styles.input}
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
                        <div style={styles.dropdown}>
                          {projects
                            .filter((p) => p.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                            .map((p) => (
                              <div
                                key={p}
                                style={styles.dropdownItem}
                                onClick={() => {
                                  setFormData({ ...formData, project: p });
                                  setProjectSearchQuery('');
                                  setShowProjectDropdown(false);
                                }}
                              >
                                {p}
                              </div>
                            ))}
                          <div
                            style={{...styles.dropdownItem, color: '#879BFF', fontWeight: 500}}
                            onClick={() => {
                              setIsAddingNewProject(true);
                              setFormData({ ...formData, project: '' });
                              setProjectSearchQuery('');
                              setShowProjectDropdown(false);
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
                        style={styles.backBtn}
                        onClick={() => {
                          setIsAddingNewProject(false);
                          setFormData({ ...formData, project: '' });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>DESCRIPTION</label>
                  <textarea
                    style={styles.textarea}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                    rows={3}
                  />
                </div>

                {/* Checklist Section */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>CHECKLIST</label>
                  <div style={styles.checklistInputRow}>
                    <input
                      type="text"
                      style={styles.checklistInput}
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                      placeholder="Add checklist item..."
                    />
                    <button
                      type="button"
                      style={styles.addChecklistBtn}
                      onClick={addChecklistItem}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                      </svg>
                    </button>
                  </div>
                  {formData.checklist.length > 0 && (
                    <div style={styles.checklistItems}>
                      {formData.checklist.map((item) => (
                        <div key={item.id} style={styles.checklistItem}>
                          <label style={styles.checklistLabel}>
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleChecklistItem(item.id)}
                              style={styles.checklistCheckbox}
                            />
                            <span style={{
                              ...styles.checklistText,
                              textDecoration: item.completed ? 'line-through' : 'none',
                              color: item.completed ? '#9ca3af' : '#1f2937',
                            }}>
                              {item.text}
                            </span>
                          </label>
                          <button
                            type="button"
                            style={styles.removeChecklistBtn}
                            onClick={() => removeChecklistItem(item.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>PRIORITY</label>
                    <select
                      style={styles.select}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>ASSIGN TO</label>
                    <select
                      style={styles.select}
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
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>START DATE</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>END DATE</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
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
                    {editingBacklog ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Warning Modal */}
        {showDeleteWarningModal && backlogDeleteWarning && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteWarningModal(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.warningIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#f59e0b" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                </svg>
              </div>
              <h3 style={styles.confirmTitle}>Cannot Delete</h3>
              <p style={styles.confirmText}>
                <strong>{backlogDeleteWarning.title}</strong> is currently in the <strong>{backlogDeleteWarning.sprint?.name}</strong> sprint. Please remove it from the sprint before deleting.
              </p>
              <div style={styles.confirmActions}>
                <button
                  style={styles.confirmOkBtn}
                  onClick={() => { setShowDeleteWarningModal(false); setBacklogDeleteWarning(null); }}
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
              <div style={styles.warningIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#879BFF" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                  <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
                </svg>
              </div>
              <h3 style={styles.confirmTitle}>Remove from Sprint?</h3>
              <p style={styles.confirmText}>
                Are you sure you want to remove <strong>{backlogToRemove.title}</strong> from the <strong>{backlogToRemove.sprint?.name}</strong> sprint?
              </p>
              <div style={styles.confirmActions}>
                <button
                  style={styles.cancelBtn}
                  onClick={() => { setShowRemoveConfirmModal(false); setBacklogToRemove(null); }}
                >
                  Cancel
                </button>
                <button style={styles.confirmRemoveBtn} onClick={handleRemoveFromSprint}>
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Sprint Modal */}
        {showAddToSprintModal && backlogToAddToSprint && (
          <div style={styles.modalOverlay} onClick={() => setShowAddToSprintModal(false)}>
            <div style={styles.sprintModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>Add to Sprint</h2>
                  <p style={styles.modalSubtitle}>Select a sprint for <strong>{backlogToAddToSprint.title}</strong></p>
                </div>
                <button style={styles.modalClose} onClick={() => {
                  setShowAddToSprintModal(false);
                  setBacklogToAddToSprint(null);
                  setSelectedSprintId('');
                  setSprintSearchQuery('');
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                  </svg>
                </button>
              </div>

              {/* Sprint Search */}
              <div style={styles.sprintSearch}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#9ca3af" viewBox="0 0 16 16" style={styles.sprintSearchIcon}>
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input
                  type="text"
                  style={styles.sprintSearchInput}
                  placeholder="Search sprints..."
                  value={sprintSearchQuery}
                  onChange={(e) => setSprintSearchQuery(e.target.value)}
                />
              </div>

              <div style={styles.sprintList}>
                {sprints.filter((sprint) =>
                  sprint.name.toLowerCase().includes(sprintSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div style={styles.noSprints}>
                    {sprints.length === 0 ? 'No active or planned sprints available' : 'No sprints match your search'}
                  </div>
                ) : (
                  sprints
                    .filter((sprint) => sprint.name.toLowerCase().includes(sprintSearchQuery.toLowerCase()))
                    .map((sprint) => (
                      <label
                        key={sprint._id}
                        style={{
                          ...styles.sprintOption,
                          ...(selectedSprintId === sprint._id ? styles.sprintOptionSelected : {})
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
                            <span style={{
                              ...styles.sprintStatusBadge,
                              backgroundColor: sprint.status === 'active' ? '#16a34a' : '#879BFF'
                            }}>
                              {sprint.status}
                            </span>
                          </div>
                          <span style={styles.sprintDates}>
                            {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </label>
                    ))
                )}
              </div>

              <div style={styles.sprintModalActions}>
                <button
                  style={styles.cancelBtn}
                  onClick={() => {
                    setShowAddToSprintModal(false);
                    setBacklogToAddToSprint(null);
                    setSelectedSprintId('');
                    setSprintSearchQuery('');
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.submitBtn,
                    ...((!selectedSprintId) ? styles.submitBtnDisabled : {})
                  }}
                  onClick={handleMoveToSprint}
                  disabled={!selectedSprintId}
                >
                  Add to Sprint
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
  priorityLine: {
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
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  projectTag: {
    padding: '4px 10px',
    background: '#F0F4FF',
    color: '#879BFF',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  cardDescription: {
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
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  sprintRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sprintName: {
    fontSize: '13px',
    color: '#879BFF',
    fontWeight: 500,
  },
  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
  },
  assigneeName: {
    fontSize: '14px',
    color: '#4b5563',
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
  actionBtnSecondary: {
    borderColor: '#9ca3af',
    color: '#6b7280',
  },
  actionBtnView: {
    borderColor: '#879BFF',
    color: '#879BFF',
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
    maxWidth: '560px',
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
  // Checklist styles
  checklistInputRow: {
    display: 'flex',
    gap: '8px',
  },
  checklistInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  addChecklistBtn: {
    padding: '10px 14px',
    background: '#879BFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItems: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  checklistLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    cursor: 'pointer',
  },
  checklistCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#879BFF',
  },
  checklistText: {
    fontSize: '14px',
  },
  removeChecklistBtn: {
    padding: '4px',
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Checklist count on cards
  checklistCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  checklistCountText: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  dropdownItem: {
    padding: '12px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  backBtn: {
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    background: 'white',
    color: '#6b7280',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '8px',
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
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
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
  confirmOkBtn: {
    padding: '12px 32px',
    background: '#879BFF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmRemoveBtn: {
    padding: '12px 24px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Sprint Modal
  sprintModal: {
    background: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  sprintSearch: {
    position: 'relative',
    padding: '0 24px',
    marginBottom: '16px',
  },
  sprintSearchIcon: {
    position: 'absolute',
    left: '36px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  sprintSearchInput: {
    width: '100%',
    padding: '12px 14px 12px 40px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  sprintList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '0 24px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  sprintOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  sprintOptionSelected: {
    borderColor: '#879BFF',
    background: '#F0F4FF',
  },
  radioInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    marginTop: '2px',
    accentColor: '#879BFF',
  },
  sprintOptionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sprintOptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sprintOptionName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
  },
  sprintStatusBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
  },
  sprintDates: {
    fontSize: '13px',
    color: '#6b7280',
  },
  noSprints: {
    textAlign: 'center',
    padding: '32px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  sprintModalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '24px',
    borderTop: '1px solid #f3f4f6',
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
