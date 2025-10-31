'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  position: string;
  isActive: boolean;
  createdAt: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [addFormData, setAddFormData] = useState({
    username: '',
    name: '',
    position: '',
    password: '',
    role: 'member' as 'admin' | 'manager' | 'member',
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    name: '',
    position: '',
    role: 'member' as 'admin' | 'manager' | 'member',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserRole(user.role);
    }
    fetchUsers();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: addFormData.username,
          name: addFormData.name,
          position: addFormData.position,
          password: addFormData.password,
          role: addFormData.role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        resetAddForm();
        fetchUsers();
      } else {
        alert(data.message || 'Error adding member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member');
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${editingUser._id}`, {
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
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.message || 'Error updating membefr');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Error updating member');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Error updating user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Error deleting member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      name: user.name,
      position: user.position,
      role: user.role,
    });
    setShowEditModal(true);
  };

  const resetAddForm = () => {
    setAddFormData({
      username: '',
      name: '',
      position: '',
      password: '',
      role: 'member',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return '#f56565';
      case 'manager': return '#ed8936';
      case 'member': return '#4299e1';
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

  const isAdmin = currentUserRole === 'admin';
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading team members...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Team Members</h2>
          {isManagerOrAdmin && (
            <button style={styles.primaryButton} onClick={() => setShowAddModal(true)}>
              + Add Member
            </button>
          )}
        </div>

        <div style={styles.teamGrid}>
          {users.map((user) => (
            <div key={user._id} style={styles.userCard}>
              <div style={styles.userHeader}>
                <div style={styles.userAvatar}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    ...styles.roleBadge,
                    backgroundColor: getRoleBadgeColor(user.role),
                  }}
                >
                  {user.role}
                </span>
              </div>

              <h3 style={styles.userName}>{user.name}</h3>
              <p style={styles.userPosition}>{user.position}</p>

              <div style={styles.userInfo}>
                <div style={styles.infoItem}>
                  <strong>Username:</strong> {user.username}
                </div>
                <div style={styles.infoItem}>
                  <strong>Joined:</strong> {formatDate(user.createdAt)}
                </div>
                <div style={styles.infoItem}>
                  <strong>Status:</strong>{' '}
                  <span style={{ color: user.isActive ? '#48bb78' : '#f56565' }}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {isManagerOrAdmin && (
                <div style={styles.userActions}>
                  <button style={styles.actionButton} onClick={() => openEditModal(user)}>
                    Edit
                  </button>
                  <button
                    style={styles.toggleButton}
                    onClick={() => handleToggleActive(user._id, user.isActive)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {isAdmin && (
                    <button style={styles.deleteButton} onClick={() => handleDelete(user._id)}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Member Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Add Team Member</h2>
              <form onSubmit={handleAddMember} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Username *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={addFormData.username}
                    onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9_]+"
                    placeholder="e.g., john_doe"
                  />
                  <small style={styles.helpText}>Letters, numbers, and underscores only</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    required
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Position/Role *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={addFormData.position}
                    onChange={(e) => setAddFormData({ ...addFormData, position: e.target.value })}
                    required
                    placeholder="e.g., Frontend Developer"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Initial Password *</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                  <small style={styles.helpText}>User can change this after first login</small>
                </div>

                {isAdmin && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Access Level</label>
                    <select
                      style={styles.input}
                      value={addFormData.role}
                      onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as any })}
                    >
                      <option value="member">Team Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>
                    Add Member
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      setShowAddModal(false);
                      resetAddForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {showEditModal && editingUser && (
          <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Team Member</h2>
              <form onSubmit={handleEditMember} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Username *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    required
                    minLength={3}
                    pattern="[a-zA-Z0-9_]+"
                  />
                  <small style={styles.helpText}>Letters, numbers, and underscores only</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Position/Role *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.position}
                    onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                    required
                  />
                </div>

                {isAdmin && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Access Level</label>
                    <select
                      style={styles.input}
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    >
                      <option value="member">Team Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}

                <div style={styles.formActions}>
                  <button type="submit" style={styles.primaryButton}>
                    Update Member
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
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
    transition: 'transform 0.2s',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  userCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  userAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#FF6495',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  roleBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '4px',
  },
  userPosition: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4a5568',
  },
  infoItem: {
    display: 'flex',
    gap: '8px',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
  },
  actionButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #667eea',
    background: 'white',
    color: '#667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  toggleButton: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ed8936',
    background: 'white',
    color: '#ed8936',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
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
    transition: 'all 0.2s',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
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
    maxWidth: '500px',
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
  disabledInput: {
    background: '#f7fafc',
    color: '#a0aec0',
    cursor: 'not-allowed',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
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
};
