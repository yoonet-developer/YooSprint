'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';
import { cardFrames, getSelectedFrame } from '@/lib/utils/cardFrames';

interface User {
  _id: string;
  name: string;
  yoonetId: string;
  position: string;
}

interface Project {
  _id: string;
  slug?: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: number;
  timeConsumed: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  assignedUsers: User[];
  department: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

interface Backlog {
  _id: string;
  project?: { _id: string };
  taskStatus: string;
  timeTracked?: number; // Time tracked in seconds
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<string>('default');
  const categories = ['Budget-friendly', 'Balanced', 'High-end'];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Balanced',
    estimatedTime: 0,
    startDate: '',
    endDate: '',
    assignedUsers: [] as string[],
    department: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: '',
    estimatedTime: 0,
    timeConsumed: 0,
    startDate: '',
    endDate: '',
    assignedUsers: [] as string[],
    department: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserRole(user.role);
      // Redirect members away from projects page
      if (user.role === 'member') {
        router.push('/dashboard');
        return;
      }
    }
    // Load theme frame
    const savedFrame = getSelectedFrame();
    setSelectedFrame(savedFrame);

    fetchProjects();
    fetchBacklogs();
  }, [router]);

  const fetchBacklogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setBacklogs(data.backlogs);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    }
  };

  // Calculate progress for a project based on its backlogs
  const getProjectProgress = (projectId: string) => {
    const projectBacklogs = backlogs.filter(b => b.project?._id === projectId);
    if (projectBacklogs.length === 0) return null;
    const completed = projectBacklogs.filter(b => b.taskStatus === 'completed').length;
    return Math.round((completed / projectBacklogs.length) * 100);
  };

  // Calculate time consumed for a project based on its backlogs (sum of timeTracked in seconds)
  const getProjectTimeConsumed = (projectId: string) => {
    const projectBacklogs = backlogs.filter(b => b.project?._id === projectId);
    const totalSeconds = projectBacklogs.reduce((sum, backlog) => sum + (backlog.timeTracked || 0), 0);
    const hours = totalSeconds / 3600;
    return hours % 1 === 0 ? `${hours}` : hours.toFixed(2);
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
        // Extract unique departments
        const uniqueDepts = Array.from(new Set(
          data.projects.map((p: Project) => p.department).filter((d: string) => d)
        )).sort() as string[];
        setDepartments(uniqueDepts);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        resetForm();
        fetchProjects();
      } else {
        alert(data.message || 'Error adding project');
      }
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Error adding project');
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${editingProject._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingProject(null);
        fetchProjects();
      } else {
        alert(data.message || 'Error updating project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Error updating project');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteModal(false);
        setProjectToDelete(null);
        fetchProjects();
      } else {
        alert(data.message || 'Error deleting project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditFormData({
      name: project.name,
      description: project.description,
      category: project.category,
      estimatedTime: project.estimatedTime,
      timeConsumed: project.timeConsumed,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      assignedUsers: project.assignedUsers.map(u => u._id),
      department: project.department
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Balanced',
      estimatedTime: 0,
      startDate: '',
      endDate: '',
      assignedUsers: [],
      department: ''
    });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return '#48bb78';
    if (progress >= 50) return '#4299e1';
    if (progress >= 25) return '#ed8936';
    return '#f56565';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'super-admin' || currentUserRole === 'manager';

  // Get the frame style for the selected frame
  const frameStyle = cardFrames[selectedFrame] || cardFrames.default;

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading projects...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Frame animations for theme */}
      {(selectedFrame === 'rainbow' || selectedFrame === 'frost') && (
        <style>{`
          @keyframes rainbowShift {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
          }
          .rainbow-frame { animation: rainbowShift 3s linear infinite; }
        `}</style>
      )}
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Projects</h2>
          {isManagerOrAdmin && (
            <button style={styles.primaryButton} onClick={() => setShowAddModal(true)}>
              + New Project
            </button>
          )}
        </div>

        <div style={styles.projectGrid}>
          {projects.map((project) => (
            <div
              key={project._id}
              className={selectedFrame === 'rainbow' ? 'rainbow-frame' : selectedFrame === 'frost' ? 'frost-frame' : ''}
              style={{
                ...styles.projectCard,
                cursor: 'pointer',
                border: frameStyle.border,
                boxShadow: frameStyle.boxShadow || styles.projectCard.boxShadow,
                background: frameStyle.background || 'white',
              }}
              onClick={() => router.push(`/projects/${project.slug || project._id}`)}
            >
              <div style={styles.cardHeader}>
                <span style={styles.category}>{project.category}</span>
              </div>

              <h3 style={styles.projectName}>{project.name}</h3>
              <p style={{
                ...styles.description,
                ...(project.description ? {} : styles.noDescription)
              }}>
                {project.description || 'No description'}
              </p>

              <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                  <span>Progress</span>
                  {getProjectProgress(project._id) !== null ? (
                    <span style={{ color: getProgressColor(getProjectProgress(project._id) || 0) }}>
                      {getProjectProgress(project._id)}%
                    </span>
                  ) : (
                    <span style={styles.noItemsText}>No items</span>
                  )}
                </div>
                {getProjectProgress(project._id) !== null ? (
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${getProjectProgress(project._id)}%`,
                        backgroundColor: getProgressColor(getProjectProgress(project._id) || 0)
                      }}
                    />
                  </div>
                ) : (
                  <div style={{...styles.progressBar, background: '#f3f4f6'}} />
                )}
              </div>

              <div style={styles.timeSection}>
                <div style={styles.timeItem}>
                  <span style={styles.timeLabel}>Estimated Time</span>
                  <span style={styles.timeValue}>{project.estimatedTime}h</span>
                </div>
                <div style={styles.timeSeparator}>|</div>
                <div style={styles.timeItem}>
                  <span style={styles.timeLabel}>Consumed Time</span>
                  <span style={styles.timeValue}>{getProjectTimeConsumed(project._id)}h</span>
                </div>
              </div>

              <div style={styles.dateSection}>
                <div style={styles.dateItem}>
                  <span style={styles.dateLabel}>Start:</span>
                  <span>{formatDate(project.startDate)}</span>
                </div>
                <div style={styles.dateItem}>
                  <span style={styles.dateLabel}>End:</span>
                  <span>{formatDate(project.endDate)}</span>
                </div>
              </div>

              {isManagerOrAdmin && (
                <div style={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                  <button style={styles.editButton} onClick={() => openEditModal(project)}>
                    Edit
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={() => {
                      setProjectToDelete(project);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div style={styles.emptyState}>
            <p>No projects found. {isManagerOrAdmin && 'Click "New Project" to create one.'}</p>
          </div>
        )}

        {/* Add Project Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Create New Project</h2>
              <form onSubmit={handleAddProject} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Project Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter project description"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    style={styles.input}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Estimated Time *</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData({ ...formData, estimatedTime: Number(e.target.value) })}
                      required
                      min="0"
                      placeholder="Hours"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Consumed Time</label>
                    <input
                      type="number"
                      style={{...styles.input, background: '#f7fafc'}}
                      value={0}
                      disabled
                      placeholder="Hours"
                    />
                    <small style={styles.helpText}>Updated when editing</small>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>Create Project</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditModal && editingProject && (
          <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Project</h2>
              <form onSubmit={handleEditProject} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Project Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    style={styles.input}
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Estimated Time</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={editFormData.estimatedTime}
                      onChange={(e) => setEditFormData({ ...editFormData, estimatedTime: Number(e.target.value) })}
                      min="0"
                      placeholder="Hours"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Consumed Time</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={editFormData.timeConsumed}
                      onChange={(e) => setEditFormData({ ...editFormData, timeConsumed: Number(e.target.value) })}
                      min="0"
                      placeholder="Hours"
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>Update Project</button>
                  <button type="button" style={styles.secondaryButton} onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && projectToDelete && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Delete Project</h2>
              <p style={styles.confirmText}>
                Are you sure you want to delete <strong>{projectToDelete.name}</strong>?
              </p>
              <p style={styles.dangerText}>This action cannot be undone.</p>
              <div style={styles.formActions}>
                <button
                  style={{ ...styles.primaryButton, background: '#f56565' }}
                  onClick={handleDeleteProject}
                >
                  Delete
                </button>
                <button style={styles.secondaryButton} onClick={() => setShowDeleteModal(false)}>
                  Cancel
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
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
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
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  },
  projectCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  category: {
    fontSize: '12px',
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  projectName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  noDescription: {
    fontStyle: 'italic',
    color: '#a0aec0',
  },
  noItemsText: {
    fontStyle: 'italic',
    color: '#9ca3af',
    fontSize: '13px',
  },
  progressSection: {
    marginBottom: '16px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#4a5568',
    marginBottom: '6px',
  },
  progressBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  timeSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
    alignItems: 'center',
  },
  timeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timeSeparator: {
    color: '#cbd5e0',
    fontSize: '20px',
    fontWeight: '300',
  },
  timeLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  dateSection: {
    display: 'flex',
    gap: '24px',
    marginBottom: '12px',
    fontSize: '13px',
    color: '#4a5568',
  },
  dateItem: {
    display: 'flex',
    gap: '6px',
  },
  dateLabel: {
    color: '#a0aec0',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    marginTop: '8px',
  },
  editButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #f56565',
    background: 'white',
    color: '#f56565',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096',
    fontSize: '16px',
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
    maxWidth: '550px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  confirmModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
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
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
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
  },
  helpText: {
    fontSize: '12px',
    color: '#a0aec0',
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
  confirmText: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '12px',
  },
  dangerText: {
    fontSize: '14px',
    color: '#f56565',
    marginBottom: '24px',
  },
};
