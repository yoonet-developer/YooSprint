'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';
import { cardFrames, getSelectedFrame, isRainbowFrame, rainbowAnimation } from '@/lib/utils/cardFrames';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
  priority: 'low' | 'medium' | 'high';
  project?: Project;
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
  startDate?: string;
  endDate?: string;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt?: string;
  // Time tracking
  timeTracked?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string;
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const taskRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Timer states
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [elapsedTimes, setElapsedTimes] = useState<{ [key: string]: number }>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  // Theme state
  const [selectedFrame, setSelectedFrame] = useState<string>('default');

  // Dynamic items per page: 4 for list view, 8 for grid view
  const itemsPerPage = viewMode === 'grid' ? 8 : 4;

  // Stats calculations
  const totalTasks = tasks.length;
  const todoCount = tasks.filter(t => t.taskStatus === 'pending').length;
  const inProgressCount = tasks.filter(t => t.taskStatus === 'in-progress').length;
  const completedCount = tasks.filter(t => t.taskStatus === 'completed').length;
  const totalTimeTracked = tasks.reduce((sum, t) => sum + (elapsedTimes[t._id] || t.timeTracked || 0), 0);

  // Filter counts for badges
  const getFilterCount = (filterKey: string) => {
    switch (filterKey) {
      case 'all': return tasks.length;
      case 'todo': return todoCount;
      case 'in-progress': return inProgressCount;
      case 'completed': return completedCount;
      default: return 0;
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);
    }
    fetchMyTasks();

    // Load selected frame from localStorage
    const savedFrame = getSelectedFrame();
    setSelectedFrame(savedFrame);
  }, []);

  useEffect(() => {
    applyFilter();
    setCurrentPage(1);
  }, [tasks, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // Handle taskId parameter - scroll to and highlight specific task
  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t._id === taskId);
      if (task) {
        const statusMap: { [key: string]: string } = {
          'pending': 'todo',
          'in-progress': 'in-progress',
          'completed': 'completed',
        };
        setFilter(statusMap[task.taskStatus] || 'all');
        setHighlightedTaskId(taskId);

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

          setTimeout(() => {
            const taskElement = taskRefs.current[taskId];
            if (taskElement) {
              taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

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

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.project?.name?.toLowerCase().includes(query) ||
        t.sprint?.name.toLowerCase().includes(query)
      );
    }

    if (filter === 'completed') {
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    setFilteredTasks(filtered);
  };

  // Format time from seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time for display (shorter format)
  const formatTimeShort = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Track active timer ID in a ref to avoid stale closure issues
  const activeTimerIdRef = useRef<string | null>(null);
  activeTimerIdRef.current = activeTimerId;

  // Initialize elapsed times from tasks and resume running timer
  useEffect(() => {
    if (tasks.length === 0) return;

    // Find if any task has a running timer from server
    const runningTask = tasks.find(task => task.isTimerRunning === true && task.timerStartedAt);

    // Build initial elapsed times
    const newElapsed: { [key: string]: number } = {};
    tasks.forEach(task => {
      if (task.isTimerRunning === true && task.timerStartedAt) {
        // Calculate elapsed time from when timer started
        const startTime = new Date(task.timerStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        newElapsed[task._id] = (task.timeTracked || 0) + elapsed;
      } else {
        // Use stored time or keep current if already set
        newElapsed[task._id] = task.timeTracked || 0;
      }
    });

    setElapsedTimes(prev => {
      // Merge with previous to preserve any actively counting timer
      const merged = { ...newElapsed };
      // If there's an active local timer, keep its value
      if (activeTimerIdRef.current && prev[activeTimerIdRef.current] !== undefined) {
        merged[activeTimerIdRef.current] = prev[activeTimerIdRef.current];
      }
      return merged;
    });

    // Resume timer if one was running on server and we don't have one locally
    if (runningTask && !activeTimerIdRef.current) {
      setActiveTimerId(runningTask._id);
    }
  }, [tasks.length]); // Run when tasks are loaded

  // Timer tick effect
  useEffect(() => {
    if (activeTimerId) {
      // Clear any existing interval first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        setElapsedTimes(prev => ({
          ...prev,
          [activeTimerId]: (prev[activeTimerId] || 0) + 1
        }));
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTimerId]);

  // Start/Stop timer
  const toggleTimer = async (taskId: string) => {
    const token = localStorage.getItem('token');
    const task = tasks.find(t => t._id === taskId);
    // Use local state to determine action (will auto-correct if out of sync)
    const isRunning = activeTimerId === taskId;

    try {
      // If clicking a different task while one is running, stop the current one first
      if (activeTimerId && activeTimerId !== taskId) {
        await fetch(`/api/backlogs/${activeTimerId}/timer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'stop' }),
        });
        // Clear the old timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }

      const response = await fetch(`/api/backlogs/${taskId}/timer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: isRunning ? 'stop' : 'start' }),
      });

      const data = await response.json();

      if (data.success) {
        if (isRunning) {
          // Stopped timer
          setActiveTimerId(null);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          // Update the task's timeTracked and sync elapsedTimes
          const savedTime = data.backlog.timeTracked || 0;
          setTasks(prev => prev.map(t =>
            t._id === taskId
              ? { ...t, isTimerRunning: false, timeTracked: savedTime }
              : t
          ));
          // Sync elapsed time with server value
          setElapsedTimes(prev => ({
            ...prev,
            [taskId]: savedTime
          }));
          setSuccessMessage('Timer stopped');
        } else {
          // Started timer - set activeTimerId which triggers the interval useEffect
          setActiveTimerId(taskId);
          // Update task state to reflect timer is running
          setTasks(prev => prev.map(t =>
            t._id === taskId
              ? {
                  ...t,
                  isTimerRunning: true,
                  timerStartedAt: data.backlog.timerStartedAt || new Date().toISOString(),
                  timeTracked: data.backlog.timeTracked || t.timeTracked || 0
                }
              : t
          ));
          // Continue from current elapsed time (don't reset)
          setElapsedTimes(prev => ({
            ...prev,
            [taskId]: prev[taskId] ?? data.backlog.timeTracked ?? task?.timeTracked ?? 0
          }));
          setSuccessMessage('Timer started');
        }
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      } else {
        // API returned an error
        console.error('Timer API error:', data.message);

        // Handle specific errors by resetting state
        if (data.message === 'Timer is not running' || data.message === 'Timer is already running') {
          // State is out of sync - reset and retry
          setActiveTimerId(null);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          // Refetch tasks to sync state
          fetchMyTasks();
          setSuccessMessage('Syncing timer state...');
        } else {
          setSuccessMessage(data.message || 'Error with timer');
        }
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
      setSuccessMessage('Failed to toggle timer');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  // Parse time string (HH:MM:SS) to seconds
  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr, 10) || 0;
  };

  // Start editing time for a task
  const startEditingTime = (taskId: string) => {
    // Don't allow editing while timer is running
    if (activeTimerId === taskId) return;

    const currentTime = elapsedTimes[taskId] || 0;
    setEditingTimeId(taskId);
    setEditTimeValue(formatTime(currentTime));
  };

  // Save edited time
  const saveEditedTime = async (taskId: string) => {
    const newSeconds = parseTimeToSeconds(editTimeValue);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/backlogs/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeTracked: newSeconds }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setElapsedTimes(prev => ({
          ...prev,
          [taskId]: newSeconds
        }));
        setTasks(prev => prev.map(t =>
          t._id === taskId ? { ...t, timeTracked: newSeconds } : t
        ));
        setSuccessMessage('Time updated');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      } else {
        setSuccessMessage(data.message || 'Failed to update time');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error('Error updating time:', error);
      setSuccessMessage('Failed to update time');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }

    setEditingTimeId(null);
    setEditTimeValue('');
  };

  // Cancel editing
  const cancelEditingTime = () => {
    setEditingTimeId(null);
    setEditTimeValue('');
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
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
        showSuccess(`Task moved to ${statusLabel}`);
      } else {
        alert(data.message || 'Error updating task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    }
  };

  const toggleChecklistItem = async (taskId: string, checklistItemId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.map(item =>
      item.id === checklistItemId ? { ...item, completed: !item.completed } : item
    );

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ checklist: updatedChecklist }),
      });

      const data = await response.json();
      if (data.success) {
        fetchMyTasks();
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': return { color: '#ef4444', bg: '#fef2f2', label: 'High' };
      case 'medium': return { color: '#f59e0b', bg: '#fffbeb', label: 'Medium' };
      case 'low': return { color: '#22c55e', bg: '#f0fdf4', label: 'Low' };
      default: return { color: '#6b7280', bg: '#f9fafb', label: 'Unknown' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { color: '#16a34a', bg: '#dcfce7', label: 'Completed' };
      case 'in-progress': return { color: '#879BFF', bg: '#E8ECFF', label: 'In Progress' };
      case 'pending': return { color: '#6b7280', bg: '#f3f4f6', label: 'To Do' };
      default: return { color: '#6b7280', bg: '#f3f4f6', label: 'Unknown' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading your tasks...</div>
      </AppLayout>
    );
  }

  // Get current frame style
  const frameStyle = cardFrames[selectedFrame] || cardFrames.default;

  return (
    <AppLayout>
      {/* Rainbow animation for theme */}
      {(selectedFrame === 'rainbow' || selectedFrame === 'frost') && (
        <style>{`
          @keyframes rainbowShift {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
          }
          .rainbow-frame {
            animation: rainbowShift 3s linear infinite;
          }
        `}</style>
      )}

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={{...styles.title, color: '#2d3748'}}>My Tasks</h1>
            <p style={{...styles.subtitle, color: '#718096'}}>Tasks assigned to you in active sprints</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <div style={{...styles.statCard, background: 'white', border: '1px solid #e2e8f0'}}>
            <div style={{ ...styles.statIcon, background: '#E8ECFF' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={{...styles.statValue, color: '#2d3748'}}>{totalTasks}</span>
              <span style={{...styles.statLabel, color: '#718096'}}>TOTAL TASKS</span>
            </div>
          </div>

          <div style={{...styles.statCard, background: 'white', border: '1px solid #e2e8f0'}}>
            <div style={{ ...styles.statIcon, background: '#f3f4f6' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6b7280" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={{...styles.statValue, color: '#2d3748'}}>{todoCount}</span>
              <span style={{...styles.statLabel, color: '#718096'}}>TO DO</span>
            </div>
          </div>

          <div style={{...styles.statCard, background: 'white', border: '1px solid #e2e8f0'}}>
            <div style={{ ...styles.statIcon, background: '#E8ECFF' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#879BFF" viewBox="0 0 16 16">
                <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={{...styles.statValue, color: '#2d3748'}}>{inProgressCount}</span>
              <span style={{...styles.statLabel, color: '#718096'}}>IN PROGRESS</span>
            </div>
          </div>

          <div style={{...styles.statCard, background: 'white', border: '1px solid #e2e8f0'}}>
            <div style={{ ...styles.statIcon, background: '#dcfce7' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#16a34a" viewBox="0 0 16 16">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={{...styles.statValue, color: '#2d3748'}}>{completedCount}</span>
              <span style={{...styles.statLabel, color: '#718096'}}>COMPLETED</span>
            </div>
          </div>

          {/* Time Tracked Stat */}
          <div style={{...styles.statCard, background: 'white', border: '1px solid #e2e8f0'}}>
            <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
              </svg>
            </div>
            <div style={styles.statContent}>
              <span style={{...styles.statValue, color: '#2d3748'}}>{formatTimeShort(totalTimeTracked)}</span>
              <span style={{...styles.statLabel, color: '#718096'}}>TIME TRACKED</span>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div style={styles.controlsRow}>
          <div style={styles.filterTabs}>
            {[
              { key: 'all', label: 'All' },
              { key: 'todo', label: 'To Do' },
              { key: 'in-progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
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
                <span style={{
                  ...styles.filterBadge,
                  ...(filter === f.key ? styles.filterBadgeActive : {}),
                }}>
                  {getFilterCount(f.key)}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.rightControls}>
            <div style={styles.viewToggle}>
              <button
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'list' ? styles.viewButtonActive : {}),
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
                  ...styles.viewButton,
                  ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
                }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>
                </svg>
              </button>
            </div>

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
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  style={styles.clearSearchButton}
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div style={styles.paginationRow}>
          <span style={styles.paginationText}>
            Showing {filteredTasks.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
          </span>
          <div style={styles.paginationButtons}>
            <button
              style={{
                ...styles.paginationButton,
                ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </button>
            <span style={styles.pageNumber}>{currentPage}</span>
            <button
              style={{
                ...styles.paginationButton,
                ...(currentPage === totalPages ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        <div style={viewMode === 'grid' ? styles.tasksGridView : styles.tasksList}>
          {filteredTasks.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#cbd5e1" viewBox="0 0 16 16">
                  <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                  <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
                </svg>
              </div>
              <p style={styles.emptyText}>No tasks found</p>
              <p style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Tasks assigned to you will appear here'}
              </p>
            </div>
          ) : (
            paginatedTasks.map((task) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const statusConfig = getStatusConfig(task.taskStatus);
              const daysRemaining = task.sprint?.endDate ? getDaysRemaining(task.sprint.endDate) : null;

              return (
                <div
                  key={task._id}
                  ref={(el) => { taskRefs.current[task._id] = el; }}
                  className={selectedFrame === 'rainbow' ? 'rainbow-frame' : selectedFrame === 'frost' ? 'frost-frame' : ''}
                  style={{
                    ...(viewMode === 'grid' ? styles.taskCardGrid : styles.taskCard),
                    ...(highlightedTaskId === task._id ? styles.highlightedCard : {}),
                    ...frameStyle,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFrame === 'default') {
                      e.currentTarget.style.borderColor = '#879BFF';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 155, 255, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (highlightedTaskId !== task._id && selectedFrame === 'default') {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                    }
                  }}
                >
                  {/* Theme Accent Line */}
                  <div style={{
                    ...styles.priorityLine,
                    backgroundColor: frameStyle.accentGradient ? undefined : frameStyle.accentColor,
                    background: frameStyle.accentGradient || frameStyle.accentColor,
                  }} />

                  {/* Card Content */}
                  <div style={styles.cardBody}>
                    {/* Header Row */}
                    <div style={styles.cardHeader}>
                      <div style={styles.cardHeaderLeft}>
                        <span style={{
                          ...styles.priorityBadge,
                          color: priorityConfig.color,
                          backgroundColor: priorityConfig.bg,
                        }}>
                          {priorityConfig.label}
                        </span>
                        <span style={{
                          ...styles.statusBadge,
                          color: statusConfig.color,
                          backgroundColor: statusConfig.bg,
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                      {daysRemaining !== null && task.sprint?.status === 'active' && (
                        <span style={{
                          ...styles.daysLeftBadge,
                          backgroundColor: daysRemaining <= 3 ? '#fef2f2' : daysRemaining <= 7 ? '#fffbeb' : '#f0fdf4',
                          color: daysRemaining <= 3 ? '#ef4444' : daysRemaining <= 7 ? '#f59e0b' : '#22c55e',
                        }}>
                          {daysRemaining <= 0 ? 'Overdue' : `${daysRemaining}d left`}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={styles.cardTitle}>{task.title}</h3>

                    {/* Project Tag */}
                    <div style={styles.projectTag}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#879BFF" viewBox="0 0 16 16">
                        <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z"/>
                      </svg>
                      <span>{task.project?.name || 'No Project'}</span>
                    </div>

                    {/* Description */}
                    {task.description ? (
                      <p style={styles.description}>{task.description}</p>
                    ) : (
                      <p style={styles.noDescription}>No description provided</p>
                    )}

                    {/* Checklist */}
                    {task.checklist && task.checklist.length > 0 && (
                      <div style={styles.taskChecklist}>
                        <div style={styles.checklistHeader}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                            <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                          </svg>
                          <span style={styles.checklistHeaderText}>
                            {task.checklist.filter(item => item.completed).length}/{task.checklist.length} completed
                          </span>
                        </div>
                        <div style={styles.checklistProgressBar}>
                          <div
                            style={{
                              ...styles.checklistProgressFill,
                              width: `${(task.checklist.filter(item => item.completed).length / task.checklist.length) * 100}%`,
                            }}
                          />
                        </div>
                        <div style={styles.checklistItemsList}>
                          {task.checklist.map((item) => (
                            <label key={item.id} style={styles.checklistItemLabel}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => toggleChecklistItem(task._id, item.id)}
                                style={styles.checklistItemCheckbox}
                              />
                              <span style={{
                                ...styles.checklistItemText,
                                textDecoration: item.completed ? 'line-through' : 'none',
                                color: item.completed ? '#9ca3af' : '#4b5563',
                              }}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task Due Date */}
                    {task.endDate && (
                      <div style={styles.dueDateRow}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6b7280" viewBox="0 0 16 16">
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
                        </svg>
                        <span style={styles.dueDateLabel}>Due:</span>
                        <span style={styles.dueDateValue}>{formatDate(task.endDate)}</span>
                      </div>
                    )}

                    {/* Time Tracker */}
                    <div style={styles.timerSection}>
                      <div style={styles.timerDisplay}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={activeTimerId === task._id ? '#22c55e' : '#6b7280'} viewBox="0 0 16 16">
                          <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                        </svg>
                        {editingTimeId === task._id ? (
                          <div style={styles.timeEditContainer}>
                            <input
                              type="text"
                              value={editTimeValue}
                              onChange={(e) => setEditTimeValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedTime(task._id);
                                if (e.key === 'Escape') cancelEditingTime();
                              }}
                              style={styles.timeEditInput}
                              autoFocus
                              placeholder="HH:MM:SS"
                            />
                            <button
                              onClick={() => saveEditedTime(task._id)}
                              style={styles.timeEditSaveBtn}
                              title="Save"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16">
                                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditingTime}
                              style={styles.timeEditCancelBtn}
                              title="Cancel"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              ...styles.timerText,
                              color: activeTimerId === task._id ? '#22c55e' : '#4b5563',
                              fontWeight: activeTimerId === task._id ? '600' : '400',
                            }}
                          >
                            {formatTime(elapsedTimes[task._id] || 0)}
                          </span>
                        )}
                      </div>
                      <div style={styles.timerButtonGroup}>
                        <button
                          onClick={() => toggleTimer(task._id)}
                          disabled={task.taskStatus !== 'in-progress'}
                          style={{
                            ...styles.timerBtn,
                            backgroundColor: task.taskStatus !== 'in-progress'
                              ? '#d1d5db'
                              : activeTimerId === task._id ? '#ef4444' : '#22c55e',
                            cursor: task.taskStatus !== 'in-progress' ? 'not-allowed' : 'pointer',
                            opacity: task.taskStatus !== 'in-progress' ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (task.taskStatus === 'in-progress') {
                              e.currentTarget.style.opacity = '0.9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (task.taskStatus === 'in-progress') {
                              e.currentTarget.style.opacity = '1';
                            }
                          }}
                        >
                          {activeTimerId === task._id ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="white" viewBox="0 0 16 16">
                                <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                              </svg>
                              Stop
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="white" viewBox="0 0 16 16">
                                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                              </svg>
                              Start
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => startEditingTime(task._id)}
                          disabled={activeTimerId === task._id || task.taskStatus === 'pending'}
                          style={{
                            ...styles.editTimeBtn,
                            opacity: (activeTimerId === task._id || task.taskStatus === 'pending') ? 0.5 : 1,
                            cursor: (activeTimerId === task._id || task.taskStatus === 'pending') ? 'not-allowed' : 'pointer',
                          }}
                          title={task.taskStatus === 'pending' ? 'Start task first' : activeTimerId === task._id ? 'Stop timer to edit' : 'Edit time'}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Card Footer - Action Buttons */}
                    <div style={styles.cardFooter}>
                      <div style={styles.actionButtons}>
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
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div style={styles.successToast}>
            <div style={styles.successToastIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
              </svg>
            </div>
            <span style={styles.successToastText}>{successMessage}</span>
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
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid #e2e8f0',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    background: '#f1f5f9',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterTabActive: {
    background: '#879BFF',
    color: 'white',
  },
  filterBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600',
    background: 'white',
    color: '#64748b',
  },
  filterBadgeActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    background: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
  },
  viewButton: {
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonActive: {
    background: 'white',
    color: '#879BFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  searchContainer: {
    position: 'relative',
    width: '240px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 36px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  clearSearchButton: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    padding: '4px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  paginationText: {
    fontSize: '14px',
    color: '#64748b',
  },
  paginationButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paginationButton: {
    padding: '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  pageNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    padding: '0 8px',
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tasksGridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: '20px',
  },
  taskCard: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  taskCardGrid: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
  },
  priorityLine: {
    height: '4px',
    width: '100%',
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    display: 'flex',
    gap: '8px',
  },
  priorityBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  daysLeftBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.4',
  },
  projectTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#879BFF',
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  noDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    fontStyle: 'italic',
    margin: 0,
  },
  dueDateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  dueDateLabel: {
    fontWeight: '500',
    color: '#64748b',
  },
  dueDateValue: {
    fontWeight: '600',
    color: '#1e293b',
  },
  // Checklist styles
  taskChecklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  checklistHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checklistHeaderText: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  checklistProgressBar: {
    width: '100%',
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  checklistProgressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  checklistItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  checklistItemLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px 0',
  },
  checklistItemCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#879BFF',
  },
  checklistItemText: {
    fontSize: '13px',
    lineHeight: '1.4',
  },
  sprintInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  sprintName: {
    fontWeight: '500',
  },
  sprintDate: {
    color: '#94a3b8',
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
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
    fontFamily: 'inherit',
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
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  emptyIcon: {
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  highlightedCard: {
    borderColor: '#FF6495',
    boxShadow: '0 0 0 3px rgba(255, 100, 149, 0.2), 0 4px 12px rgba(0,0,0,0.15)',
  },
  successToast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 2000,
    animation: 'slideIn 0.3s ease-out',
  },
  successToastIcon: {
    width: '32px',
    height: '32px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successToastText: {
    fontSize: '14px',
    fontWeight: '600',
  },
  // Timer styles
  timerSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timerText: {
    fontSize: '16px',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
  },
  timerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: 'none',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  timerDisplayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  timerButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editTimeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: '1px solid #6b7280',
    borderTopLeftRadius: '6px',
    borderTopRightRadius: '6px',
    borderBottomLeftRadius: '6px',
    borderBottomRightRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  timeEditContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  timeEditInput: {
    width: '90px',
    padding: '4px 8px',
    fontSize: '14px',
    fontFamily: 'monospace',
    border: '1px solid #879BFF',
    borderRadius: '4px',
    outline: 'none',
    textAlign: 'center',
  },
  timeEditSaveBtn: {
    padding: '4px 6px',
    background: '#22c55e',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeEditCancelBtn: {
    padding: '4px 6px',
    background: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default function TasksPage() {
  return (
    <Suspense fallback={<AppLayout><div style={styles.loading}>Loading your tasks...</div></AppLayout>}>
      <TasksPageContent />
    </Suspense>
  );
}
