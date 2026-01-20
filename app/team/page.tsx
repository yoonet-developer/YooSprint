'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface User {
  _id: string;
  yoonetId: string;
  username: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'manager' | 'member';
  position: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  avatar?: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [showAddDepartmentInput, setShowAddDepartmentInput] = useState(false);
  const [showEditDepartmentInput, setShowEditDepartmentInput] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [addFormData, setAddFormData] = useState({
    yoonetId: '',
    username: '',
    name: '',
    email: '',
    position: '',
    department: '',
    password: '',
    role: 'member' as 'super-admin' | 'admin' | 'manager' | 'member',
    pin: '',
  });
  const [editFormData, setEditFormData] = useState({
    yoonetId: '',
    username: '',
    name: '',
    email: '',
    position: '',
    department: '',
    role: 'member' as 'super-admin' | 'admin' | 'manager' | 'member',
    newPassword: '',
    newPin: '',
  });
  const [showToggleConfirmModal, setShowToggleConfirmModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState<{ id: string; name: string; currentStatus: boolean } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserRole(user.role);
      setCurrentUserDepartment(user.department || '');
      setAddFormData(prev => ({...prev, department: user.department || ''}));
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
        // Extract unique departments from users
        const uniqueDepartments = Array.from(new Set(
          data.users
            .map((u: User) => u.department)
            .filter((d: string) => d && d.trim() !== '')
        )).sort();
        setDepartments(uniqueDepartments as string[]);
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
          yoonetId: addFormData.yoonetId,
          username: addFormData.username,
          name: addFormData.name,
          email: addFormData.email,
          position: addFormData.position,
          department: addFormData.department,
          password: addFormData.password,
          role: addFormData.role,
          pin: addFormData.pin || undefined,
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

      // Prepare update data - only include password if it's been set
      const updateData: any = {
        yoonetId: editFormData.yoonetId,
        username: editFormData.username,
        name: editFormData.name,
        email: editFormData.email,
        position: editFormData.position,
        department: editFormData.department,
        role: editFormData.role,
      };

      // Only include password if a new one was provided
      if (editFormData.newPassword && editFormData.newPassword.trim() !== '') {
        updateData.password = editFormData.newPassword;
      }

      // Only include PIN for privileged roles if a new PIN was entered
      const isPrivilegedRole = ['super-admin', 'admin', 'manager'].includes(editFormData.role);
      if (isPrivilegedRole && editFormData.newPin && editFormData.newPin.trim() !== '') {
        updateData.pin = editFormData.newPin;
      }

      const response = await fetch(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingUser(null);
        fetchUsers();

        // Show success message based on what was updated
        if (updateData.pin && updateData.password) {
          setSuccessMessage('Member updated successfully! Password and PIN have been changed.');
          setShowSuccessModal(true);
        } else if (updateData.pin) {
          setSuccessMessage('Member updated successfully! PIN has been changed.');
          setShowSuccessModal(true);
        } else if (updateData.password) {
          setSuccessMessage('Member updated successfully! Password has been changed.');
          setShowSuccessModal(true);
        }
      } else {
        alert(data.message || 'Error updating member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Error updating member');
    }
  };

  const openToggleConfirmModal = (userId: string, userName: string, currentStatus: boolean) => {
    setUserToToggle({ id: userId, name: userName, currentStatus });
    setShowToggleConfirmModal(true);
  };

  const handleToggleActive = async () => {
    if (!userToToggle) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userToToggle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !userToToggle.currentStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setShowToggleConfirmModal(false);
        setUserToToggle(null);
        fetchUsers();
      } else {
        alert(data.message || 'Error updating user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const openDeleteConfirmModal = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirmModal(false);
        setUserToDelete(null);
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
      yoonetId: user.yoonetId || '',
      username: user.username,
      name: user.name,
      email: user.email || '',
      position: user.position,
      department: user.department || '',
      role: user.role,
      newPassword: '',
      newPin: '',
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setAddFormData({
      yoonetId: '',
      username: '',
      name: '',
      email: '',
      position: '',
      department: currentUserRole === 'super-admin' ? '' : currentUserDepartment,
      password: '',
      role: 'member',
      pin: '',
    });
    setShowAddDepartmentInput(false);
    setNewDepartment('');
    setShowAddModal(true);
  };

  const resetAddForm = () => {
    setAddFormData({
      yoonetId: '',
      username: '',
      name: '',
      email: '',
      position: '',
      department: currentUserRole === 'super-admin' ? '' : currentUserDepartment,
      password: '',
      role: 'member',
      pin: '',
    });
    setShowAddDepartmentInput(false);
    setNewDepartment('');
  };

  const handleAddDepartmentChange = (value: string) => {
    if (value === '__add_new__') {
      setShowAddDepartmentInput(true);
      setAddFormData({ ...addFormData, department: '' });
    } else {
      setShowAddDepartmentInput(false);
      setAddFormData({ ...addFormData, department: value });
    }
  };

  const handleEditDepartmentChange = (value: string) => {
    if (value === '__add_new__') {
      setShowEditDepartmentInput(true);
      setEditFormData({ ...editFormData, department: '' });
    } else {
      setShowEditDepartmentInput(false);
      setEditFormData({ ...editFormData, department: value });
    }
  };

  const handleAddNewDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      const updatedDepartments = [...departments, newDepartment.trim()].sort();
      setDepartments(updatedDepartments);
    }
    if (showAddDepartmentInput) {
      setAddFormData({ ...addFormData, department: newDepartment.trim() });
      setShowAddDepartmentInput(false);
    } else if (showEditDepartmentInput) {
      setEditFormData({ ...editFormData, department: newDepartment.trim() });
      setShowEditDepartmentInput(false);
    }
    setNewDepartment('');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin': return '#9b2c2c';
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

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super-admin';
  const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'super-admin' || currentUserRole === 'manager';
  const canDelete = currentUserRole === 'admin' || currentUserRole === 'super-admin' || currentUserRole === 'manager';

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
            <button style={styles.primaryButton} onClick={openAddModal}>
              + Add Member
            </button>
          )}
        </div>

        <div style={styles.teamGrid}>
          {users
            .filter((user) => {
              // Hide super-admin from everyone except super-admins themselves
              if (user.role === 'super-admin' && currentUserRole !== 'super-admin') {
                return false;
              }
              // Hide admin from managers
              if (user.role === 'admin' && currentUserRole === 'manager') {
                return false;
              }
              return true;
            })
            .map((user) => (
            <div key={user._id} style={styles.userCard}>
              <div style={styles.userHeader}>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <div style={styles.userAvatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
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
              {user.department && <p style={styles.userDepartment}>{user.department}</p>}

              <div style={styles.userInfo}>
                <div style={styles.infoItem}>
                  <strong>Yoonet ID:</strong> {user.yoonetId}
                </div>
                <div style={styles.infoItem}>
                  <strong>Username:</strong> {user.username}
                </div>
                {user.email && (
                  <div style={styles.infoItem}>
                    <strong>Email:</strong> {user.email}
                  </div>
                )}
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
                    onClick={() => openToggleConfirmModal(user._id, user.name, user.isActive)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {canDelete && (
                    <button style={styles.deleteButton} onClick={() => openDeleteConfirmModal(user._id, user.name)}>
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
          <div style={styles.modalOverlay} onClick={() => { setShowAddModal(false); resetAddForm(); }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Add Team Member</h2>
              <form onSubmit={handleAddMember} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Yoonet ID *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={addFormData.yoonetId}
                    onChange={(e) => setAddFormData({ ...addFormData, yoonetId: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., YN001"
                  />
                  <small style={styles.helpText}>Unique identifier for this user</small>
                </div>

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
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    placeholder="e.g., john@company.com"
                  />
                  <small style={styles.helpText}>Used for login verification code</small>
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
                  <label style={styles.label}>Department</label>
                  {currentUserRole === 'super-admin' ? (
                    !showAddDepartmentInput ? (
                      <select
                        style={styles.input}
                        value={addFormData.department}
                        onChange={(e) => handleAddDepartmentChange(e.target.value)}
                      >
                        <option value="">Select department...</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                        <option value="__add_new__">+ Add New Department</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          style={{ ...styles.input, flex: 1 }}
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          placeholder="Enter new department name"
                          autoFocus
                        />
                        <button
                          type="button"
                          style={styles.addButton}
                          onClick={handleAddNewDepartment}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          style={styles.cancelButton}
                          onClick={() => {
                            setShowAddDepartmentInput(false);
                            setNewDepartment('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      <input
                        type="text"
                        style={{...styles.input, ...styles.disabledInput}}
                        value={addFormData.department || 'No department assigned'}
                        disabled
                        readOnly
                      />
                      <small style={styles.helpText}>Department is automatically set to your department</small>
                    </>
                  )}
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
                      onChange={(e) => setAddFormData({ ...addFormData, role: e.target.value as any, pin: '' })}
                    >
                      <option value="member">Team Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </div>
                )}

                {['super-admin', 'admin', 'manager'].includes(addFormData.role) && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Login PIN</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={addFormData.pin}
                      onChange={(e) => setAddFormData({ ...addFormData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="4-digit PIN"
                      maxLength={4}
                    />
                    <small style={styles.helpText}>4-digit PIN for secure login (optional)</small>
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
          <div style={styles.modalOverlay} onClick={() => { setShowEditModal(false); setShowEditDepartmentInput(false); setNewDepartment(''); }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Edit Team Member</h2>
              <form onSubmit={handleEditMember} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Yoonet ID *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={editFormData.yoonetId}
                    onChange={(e) => setEditFormData({ ...editFormData, yoonetId: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., YN001"
                  />
                  <small style={styles.helpText}>Unique identifier for this user</small>
                </div>

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
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="e.g., john@company.com"
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

                <div style={styles.formGroup}>
                  <label style={styles.label}>Department</label>
                  {currentUserRole === 'super-admin' ? (
                    !showEditDepartmentInput ? (
                      <select
                        style={styles.input}
                        value={editFormData.department}
                        onChange={(e) => handleEditDepartmentChange(e.target.value)}
                      >
                        <option value="">Select department...</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                        <option value="__add_new__">+ Add New Department</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          style={{ ...styles.input, flex: 1 }}
                          value={newDepartment}
                          onChange={(e) => setNewDepartment(e.target.value)}
                          placeholder="Enter new department name"
                          autoFocus
                        />
                        <button
                          type="button"
                          style={styles.addButton}
                          onClick={handleAddNewDepartment}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          style={styles.cancelButton}
                          onClick={() => {
                            setShowEditDepartmentInput(false);
                            setNewDepartment('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      <input
                        type="text"
                        style={{...styles.input, ...styles.disabledInput}}
                        value={editFormData.department || 'No department assigned'}
                        disabled
                        readOnly
                      />
                      <small style={styles.helpText}>Department cannot be changed</small>
                    </>
                  )}
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
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Change Password</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={editFormData.newPassword}
                    onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                  />
                  <small style={styles.helpText}>
                    {editFormData.newPassword ? 'New password must be at least 6 characters' : 'Only fill this if you want to change the password'}
                  </small>
                </div>

                {['super-admin', 'admin', 'manager'].includes(editFormData.role) && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Change PIN</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={editFormData.newPin}
                      onChange={(e) => setEditFormData({ ...editFormData, newPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="Leave blank to keep current PIN"
                      maxLength={4}
                    />
                    <small style={styles.helpText}>
                      {editFormData.newPin ? 'PIN must be 4 digits' : 'Only fill this to set or change the PIN'}
                    </small>
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
                      setShowEditDepartmentInput(false);
                      setNewDepartment('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toggle Active/Inactive Confirmation Modal */}
        {showToggleConfirmModal && userToToggle && (
          <div style={styles.modalOverlay} onClick={() => { setShowToggleConfirmModal(false); setUserToToggle(null); }}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>
                {userToToggle.currentStatus ? 'Deactivate' : 'Activate'} User
              </h2>
              <p style={styles.confirmText}>
                Are you sure you want to {userToToggle.currentStatus ? 'deactivate' : 'activate'}{' '}
                <strong>{userToToggle.name}</strong>?
              </p>
              {userToToggle.currentStatus && (
                <p style={styles.warningText}>
                  Deactivating this user will prevent them from logging in.
                </p>
              )}
              <div style={styles.formActions}>
                <button
                  style={{
                    ...styles.primaryButton,
                    background: userToToggle.currentStatus ? '#f56565' : '#48bb78',
                  }}
                  onClick={handleToggleActive}
                >
                  {userToToggle.currentStatus ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    setShowToggleConfirmModal(false);
                    setUserToToggle(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteConfirmModal && userToDelete && (
          <div style={styles.modalOverlay} onClick={() => { setShowDeleteConfirmModal(false); setUserToDelete(null); }}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Delete User</h2>
              <p style={styles.confirmText}>
                Are you sure you want to permanently delete{' '}
                <strong>{userToDelete.name}</strong>?
              </p>
              <p style={styles.dangerText}>
                ⚠️ This action cannot be undone. All data associated with this user will be permanently removed.
              </p>
              <div style={styles.formActions}>
                <button
                  style={{
                    ...styles.primaryButton,
                    background: '#9b2c2c',
                  }}
                  onClick={handleDelete}
                >
                  Delete Permanently
                </button>
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setUserToDelete(null);
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
          <div style={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
            <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.successIcon}>✓</div>
              <h2 style={styles.successTitle}>Success!</h2>
              <p style={styles.successText}>{successMessage}</p>
              <button
                style={styles.successButton}
                onClick={() => setShowSuccessModal(false)}
              >
                OK
              </button>
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
  userAvatarImage: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '3px solid #e5e7eb',
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
    marginBottom: '4px',
  },
  userDepartment: {
    fontSize: '13px',
    color: '#a0aec0',
    marginBottom: '16px',
    fontStyle: 'italic',
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
  addButton: {
    padding: '10px 16px',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  cancelButton: {
    padding: '10px 16px',
    background: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  confirmModal: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  confirmText: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '16px',
    lineHeight: '1.6',
  },
  warningText: {
    fontSize: '14px',
    color: '#f56565',
    marginBottom: '24px',
    padding: '12px',
    background: '#fff5f5',
    borderRadius: '6px',
    borderLeft: '3px solid #f56565',
  },
  dangerText: {
    fontSize: '14px',
    color: '#9b2c2c',
    marginBottom: '24px',
    padding: '12px',
    background: '#fff5f5',
    borderRadius: '6px',
    borderLeft: '3px solid #9b2c2c',
    fontWeight: '600',
  },
  successModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center' as const,
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  successText: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  successButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};
