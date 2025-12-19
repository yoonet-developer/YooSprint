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

  const baseNavItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Backlogs', href: '/backlogs' },
    { label: 'Sprints', href: '/sprints' },
    { label: 'My Tasks', href: '/tasks' },
    { label: 'File Management', href: '/files' },
  ];

  const adminManagerItems = [
    { label: 'Board', href: '/board' },
    { label: 'Team', href: '/team' },
  ];

  const navItems = user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager'
    ? [...baseNavItems, ...adminManagerItems]
    : baseNavItems;

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
            <span style={styles.userName}>{user.name}</span>
            <span style={{...styles.dropdownArrow, transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}}>▼</span>
          </div>
          {showUserDropdown && (
            <div style={styles.userDropdown}>
              <button onClick={handleChangePassword} style={styles.dropdownItem}>
                Change Password
              </button>
              <button onClick={handleLogout} style={styles.dropdownItem}>
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

          {(user.role === 'admin' || user.role === 'super-admin' || user.role === 'manager') && (
            <li style={styles.navItem}>
              <Link
                href="/timeline"
                style={{
                  ...styles.navLink,
                  ...(pathname === '/timeline' ? styles.navLinkActive : {}),
                }}
              >
                Timeline
                {pathname === '/timeline' && <div style={styles.activeIndicator} />}
              </Link>
            </li>
          )}
        </ul>
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
};
