'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

interface AuditLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    username: string;
    role: string;
    department: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  details: string;
  changes: any;
  ipAddress: string;
  userAgent: string;
  department: string;
  timestamp: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      });

      if (filters.action) params.append('action', filters.action);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        console.error('[Audit Trail] Failed to fetch logs:', data.message);
        if (response.status === 403) {
          alert('You do not have permission to view audit logs');
        }
      }
    } catch (error) {
      console.error('[Audit Trail] Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const openDetailsModal = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return '#48bb78';
    if (action.includes('updated')) return '#4299e1';
    if (action.includes('deleted')) return '#f56565';
    if (action.includes('activated')) return '#48bb78';
    if (action.includes('deactivated')) return '#ed8936';
    if (action.includes('login')) return '#9f7aea';
    return '#718096';
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'user': return '#9f7aea';
      case 'sprint': return '#4299e1';
      case 'backlog': return '#ed8936';
      case 'task': return '#48bb78';
      case 'auth': return '#f56565';
      default: return '#718096';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading && logs.length === 0) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading audit logs...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Audit Trail</h2>
            <p style={styles.subtitle}>Track all system activities and changes</p>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Action</label>
              <select
                style={styles.filterSelect}
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_deleted">User Deleted</option>
                <option value="user_activated">User Activated</option>
                <option value="user_deactivated">User Deactivated</option>
                <option value="user_password_changed">Password Changed</option>
                <option value="sprint_created">Sprint Created</option>
                <option value="sprint_updated">Sprint Updated</option>
                <option value="sprint_deleted">Sprint Deleted</option>
                <option value="sprint_status_changed">Sprint Status Changed</option>
                <option value="backlog_created">Backlog Created</option>
                <option value="backlog_updated">Backlog Updated</option>
                <option value="backlog_deleted">Backlog Deleted</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Resource Type</label>
              <select
                style={styles.filterSelect}
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="user">User</option>
                <option value="sprint">Sprint</option>
                <option value="backlog">Backlog</option>
                <option value="task">Task</option>
                <option value="auth">Authentication</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Start Date</label>
              <input
                type="date"
                style={styles.filterInput}
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>End Date</label>
              <input
                type="date"
                style={styles.filterInput}
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div style={styles.filterActions}>
            <button style={styles.clearButton} onClick={clearFilters}>
              Clear Filters
            </button>
            <span style={styles.totalCount}>{total} total entries</span>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Resource</th>
                <th style={styles.th}>Details</th>
                <th style={styles.th}>IP Address</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyCell}>
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.timestampCell}>
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.userName}>{log.user.name}</div>
                        <div style={styles.userMeta}>
                          {log.user.username} • {log.user.role}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.actionBadge,
                          backgroundColor: getActionBadgeColor(log.action)
                        }}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.resourceCell}>
                        <span
                          style={{
                            ...styles.resourceBadge,
                            backgroundColor: getResourceTypeColor(log.resourceType)
                          }}
                        >
                          {log.resourceType}
                        </span>
                        {log.resourceName && (
                          <div style={styles.resourceName}>{log.resourceName}</div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.detailsCell}>
                        {log.details || '-'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {log.ipAddress || '-'}
                    </td>
                    <td style={styles.td}>
                      {log.changes && (
                        <button
                          style={styles.viewButton}
                          onClick={() => openDetailsModal(log)}
                        >
                          View Changes
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.pageButtonDisabled : {})
              }}
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
              }}
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedLog && (
          <div style={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Change Details</h2>
                <button
                  style={styles.closeButton}
                  onClick={() => setShowDetailsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div style={styles.modalContent}>
                <div style={styles.modalSection}>
                  <strong>Action:</strong> {formatAction(selectedLog.action)}
                </div>
                <div style={styles.modalSection}>
                  <strong>User:</strong> {selectedLog.user.name} ({selectedLog.user.username})
                </div>
                <div style={styles.modalSection}>
                  <strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}
                </div>
                <div style={styles.modalSection}>
                  <strong>IP Address:</strong> {selectedLog.ipAddress}
                </div>

                {selectedLog.changes && (
                  <>
                    <div style={styles.changesSectionTitle}>Changes Made:</div>
                    <div style={styles.changesGrid}>
                      {Object.keys(selectedLog.changes.before || {}).map((key) => (
                        <div key={key} style={styles.changeItem}>
                          <div style={styles.changeField}>{key}</div>
                          <div style={styles.changeValues}>
                            <div style={styles.beforeValue}>
                              <strong>Before:</strong>{' '}
                              {JSON.stringify(selectedLog.changes.before[key])}
                            </div>
                            <div style={styles.afterValue}>
                              <strong>After:</strong>{' '}
                              {JSON.stringify(selectedLog.changes.after[key])}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  filtersCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  clearButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  totalCount: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#2d3748',
  },
  timestampCell: {
    fontSize: '13px',
    color: '#718096',
  },
  userCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userName: {
    fontWeight: '600',
    color: '#2d3748',
  },
  userMeta: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  actionBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block',
  },
  resourceCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  resourceBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    display: 'inline-block',
    width: 'fit-content',
  },
  resourceName: {
    fontSize: '13px',
    color: '#4a5568',
  },
  detailsCell: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  viewButton: {
    padding: '6px 12px',
    border: '1px solid #4299e1',
    background: 'white',
    color: '#4299e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  emptyCell: {
    textAlign: 'center',
    padding: '40px',
    color: '#a0aec0',
    fontSize: '14px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageButton: {
    padding: '10px 20px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#4a5568',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
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
    padding: '0',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '2px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalContent: {
    padding: '24px',
  },
  modalSection: {
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4a5568',
  },
  changesSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginTop: '24px',
    marginBottom: '16px',
  },
  changesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  changeItem: {
    background: '#f7fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  changeField: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
    textTransform: 'capitalize',
  },
  changeValues: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  beforeValue: {
    fontSize: '13px',
    color: '#f56565',
  },
  afterValue: {
    fontSize: '13px',
    color: '#48bb78',
  },
};
