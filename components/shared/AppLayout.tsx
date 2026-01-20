'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
  avatar?: string;
}

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/login');
        return;
      }

      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    import('@/lib/utils/sessionTimeout').then(({ initializeInactivityMonitoring }) => {
      const cleanup = initializeInactivityMonitoring(() => {
        alert('Your session has expired due to inactivity. Please log in again.');
        handleLogout();
      });

      return () => cleanup();
    });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const handleChangePassword = () => {
    setShowUserDropdown(false);
    setShowChangePasswordModal(true);
    setPasswordError('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password changed successfully!');
        setShowChangePasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowChangePasswordModal(false);
    setPasswordError('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || '');

      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        // Update local user state and localStorage
        const updatedUser = { ...user, avatar: data.avatar };
        setUser(updatedUser as User);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileModal(false);
        alert('Profile picture updated successfully!');
      } else {
        alert(data.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
    }
  };

  const openProfileModal = () => {
    setShowUserDropdown(false);
    setShowProfileModal(true);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={styles.spinner} />
          <span style={styles.loader}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdminOrManager = user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    ...(isAdminOrManager ? [
      { label: 'Projects', href: '/projects' },
      { label: 'Board', href: '/board' },
    ] : []),
    { label: 'Backlogs', href: '/backlogs' },
    { label: 'Sprints', href: '/sprints' },
    { label: 'My Tasks', href: '/tasks' },
    { label: 'File Management', href: '/files' },
    ...(isAdminOrManager ? [{ label: 'Team', href: '/team' }] : []),
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>YooSprint</h1>
        <div style={styles.userInfoContainer}>
          <div
            style={styles.userInfo}
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={styles.headerAvatar} />
            ) : (
              <div style={styles.headerAvatarPlaceholder}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={styles.userName}>{user.name}</span>
            <span style={{...styles.dropdownArrow, transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}}>▼</span>
          </div>
          {showUserDropdown && (
            <div style={styles.userDropdown}>
              <button onClick={openProfileModal} style={styles.dropdownItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                  <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                </svg>
                Profile Picture
              </button>
              <button onClick={handleChangePassword} style={styles.dropdownItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
                </svg>
                Change Password
              </button>
              <button onClick={handleLogout} style={styles.dropdownItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                  <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <ul style={styles.navMenu}>
          {navItems.map((item) => (
            <li key={item.href} style={styles.navItem}>
              <Link
                href={item.href}
                style={{
                  ...styles.navLink,
                  ...(pathname === item.href ? styles.navLinkActive : {}),
                }}
              >
                {item.label}
                {pathname === item.href && <div style={styles.activeIndicator} />}
              </Link>
            </li>
          ))}
        </ul>

        {/* Theme Link at Bottom */}
        <div style={styles.themeContainer}>
          <Link
            href="/theme"
            style={{
              ...styles.themeLink,
              ...(pathname === '/theme' ? styles.themeLinkActive : {}),
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={styles.themeLinkText}>Theme</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.mainContent}>{children}</main>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div style={styles.modalOverlay} onClick={closePasswordModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Change Password</h2>
              <button style={styles.closeButton} onClick={closePasswordModal}>×</button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={styles.form}>
              {passwordError && (
                <div style={styles.errorMessage}>{passwordError}</div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password *</label>
                <input
                  type="password"
                  style={styles.input}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>New Password *</label>
                <input
                  type="password"
                  style={styles.input}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  disabled={passwordLoading}
                />
                <small style={styles.helpText}>Password must be at least 6 characters</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password *</label>
                <input
                  type="password"
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div style={styles.formActions}>
                <button
                  type="submit"
                  style={{
                    ...styles.primaryButton,
                    opacity: passwordLoading ? 0.6 : 1,
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  }}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Picture Upload Modal */}
      {showProfileModal && (
        <div style={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div style={styles.profileModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Profile Picture</h2>
              <button style={styles.closeButton} onClick={() => setShowProfileModal(false)}>×</button>
            </div>

            <div style={styles.profileModalContent}>
              <div style={styles.profilePreview}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} style={styles.profilePreviewImage} />
                ) : (
                  <div style={styles.profilePreviewPlaceholder}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <p style={styles.profileHelpText}>
                Upload a new profile picture. Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.
              </p>

              <label style={styles.uploadButton}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleProfileUpload}
                  disabled={uploadingProfile}
                  style={{ display: 'none' }}
                />
                {uploadingProfile ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                      <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
                    </svg>
                    <span>Choose Photo</span>
                  </>
                )}
              </label>

              <button
                style={styles.secondaryButton}
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gridTemplateRows: 'auto 1fr',
    height: '100vh',
    fontFamily: "'Poppins', sans-serif",
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #879BFF20',
    borderTop: '3px solid #879BFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loader: {
    fontSize: '18px',
    color: '#879BFF',
    fontWeight: 500,
  },
  header: {
    gridColumn: '1 / -1',
    background: 'linear-gradient(135deg, #879BFF 0%, #a78bfa 100%)',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(135, 155, 255, 0.3)',
    position: 'relative',
  },
  headerTitle: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  userInfoContainer: {
    position: 'relative',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '10px 18px',
    borderRadius: '10px',
    transition: 'background 0.3s',
    background: 'rgba(255,255,255,0.1)',
  },
  userName: {
    fontSize: '15px',
    fontWeight: 500,
  },
  dropdownArrow: {
    fontSize: '10px',
    display: 'inline-block',
    transition: 'transform 0.2s',
  },
  userDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '10px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    minWidth: '220px',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownItem: {
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2d3748',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background 0.2s',
  },
  sidebar: {
    background: 'linear-gradient(180deg, #879BFF 0%, #7c8fff 100%)',
    color: 'white',
    padding: '20px 0',
    boxShadow: '4px 0 20px rgba(135, 155, 255, 0.2)',
    display: 'flex',
    flexDirection: 'column',
  },
  navMenu: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    margin: 0,
    position: 'relative',
  },
  navLink: {
    display: 'block',
    padding: '16px 25px',
    color: 'white',
    textDecoration: 'none',
    transition: 'all 0.3s',
    position: 'relative',
  },
  navLinkActive: {
    background: 'white',
    color: '#879BFF',
    fontWeight: 600,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    background: '#FF6495',
    borderRadius: '0 4px 4px 0',
  },
  mainContent: {
    padding: '30px',
    background: '#f7fafc',
    overflowY: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '0',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#718096',
    cursor: 'pointer',
    padding: 0,
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '24px 32px',
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
    padding: '12px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
  },
  errorMessage: {
    padding: '12px 16px',
    background: '#fee',
    color: '#c53030',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fc8181',
    overflow: 'hidden',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    padding: '14px 28px',
    border: '2px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  themeContainer: {
    marginTop: 'auto',
    padding: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  themeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  themeLinkActive: {
    background: 'white',
    color: '#879BFF',
  },
  themeLinkText: {
    fontWeight: 500,
  },
  headerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(255, 255, 255, 0.5)',
  },
  headerAvatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF6495 0%, #FFB347 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    border: '2px solid rgba(255, 255, 255, 0.5)',
  },
  profileModal: {
    background: 'white',
    borderRadius: '16px',
    padding: '0',
    width: '90%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
  },
  profileModalContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '32px',
  },
  profilePreview: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '4px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
  },
  profilePreviewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  profilePreviewPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    fontWeight: 600,
  },
  profileHelpText: {
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
    margin: 0,
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
};
