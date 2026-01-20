'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';

interface MigrationResult {
  message: string;
  results: {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    errorDetails: string[];
  };
}

export default function MigratePage() {
  const router = useRouter();
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [backlogResult, setBacklogResult] = useState<MigrationResult | null>(null);
  const [sprintResult, setSprintResult] = useState<MigrationResult | null>(null);
  const [recoveryResult, setRecoveryResult] = useState<any | null>(null);
  const [slugResult, setSlugResult] = useState<any | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserRole(user.role);
      if (user.role !== 'super-admin') {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const migrateBacklogs = async () => {
    setLoading(true);
    setBacklogResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/migrate/backlogs-project', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setBacklogResult(data);
      } else {
        alert(data.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed');
    } finally {
      setLoading(false);
    }
  };

  const migrateSprints = async () => {
    setLoading(true);
    setSprintResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/migrate/sprints-project', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSprintResult(data);
      } else {
        alert(data.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed');
    } finally {
      setLoading(false);
    }
  };

  const runAllMigrations = async () => {
    await migrateBacklogs();
    await migrateSprints();
  };

  const recoverProjects = async () => {
    setLoading(true);
    setRecoveryResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/migrate/recover-projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRecoveryResult(data);
      } else {
        alert(data.message || 'Recovery failed');
      }
    } catch (error) {
      console.error('Recovery error:', error);
      alert('Recovery failed');
    } finally {
      setLoading(false);
    }
  };

  const migrateProjectSlugs = async () => {
    setLoading(true);
    setSlugResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/migrate/project-slugs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSlugResult(data);
      } else {
        alert(data.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed');
    } finally {
      setLoading(false);
    }
  };

  if (currentUserRole !== 'super-admin') {
    return (
      <AppLayout>
        <div style={styles.container}>
          <p>Access denied. Only super-admin can access this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Database Migrations</h2>
          <button style={styles.backButton} onClick={() => router.push('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>

        <div style={styles.warning}>
          <strong>Warning:</strong> Migrations update database records. Make sure you have a backup before proceeding.
        </div>

        {/* Recovery Card - Full Width */}
        <div style={styles.recoveryCard}>
          <h3 style={styles.cardTitle}>Recover Past Projects</h3>
          <p style={styles.cardDescription}>
            This will find all old project names stored as strings in your backlogs and sprints,
            automatically create Project documents for them, and link everything together.
            <strong> Run this first if you have old data with project names as strings.</strong>
          </p>
          <button
            style={{ ...styles.primaryButton, background: '#16a34a' }}
            onClick={recoverProjects}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Recover Past Projects'}
          </button>
          {recoveryResult && (
            <div style={styles.result}>
              <h4>Results:</h4>
              <ul style={styles.resultList}>
                <li>Project strings found: {recoveryResult.results.projectStringsFound.length}</li>
                <li style={{ color: '#16a34a' }}>Projects created: {recoveryResult.results.projectsCreated.length}</li>
                <li style={{ color: '#48bb78' }}>Backlogs migrated: {recoveryResult.results.backlogsMigrated}</li>
                <li style={{ color: '#48bb78' }}>Sprints migrated: {recoveryResult.results.sprintsMigrated}</li>
              </ul>
              {recoveryResult.results.projectStringsFound.length > 0 && (
                <div style={styles.projectList}>
                  <strong>Project names found:</strong>
                  <ul>
                    {recoveryResult.results.projectStringsFound.map((name: string, i: number) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Project Slugs Card */}
        <div style={{...styles.recoveryCard, borderColor: '#879BFF'}}>
          <h3 style={styles.cardTitle}>Generate Project Slugs</h3>
          <p style={styles.cardDescription}>
            This will generate URL-friendly slugs for all existing projects that don't have one.
            After running this, project URLs will use names like <code>/projects/my-project</code> instead of IDs.
          </p>
          <button
            style={{ ...styles.primaryButton, background: '#879BFF' }}
            onClick={migrateProjectSlugs}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Generate Project Slugs'}
          </button>
          {slugResult && (
            <div style={styles.result}>
              <h4>Results:</h4>
              <p style={{ color: '#16a34a', fontWeight: 600 }}>
                {slugResult.message}
              </p>
            </div>
          )}
        </div>

        <div style={styles.migrationCards}>
          {/* Backlogs Migration */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Migrate Backlogs</h3>
            <p style={styles.cardDescription}>
              Converts project field from string (project name) to ObjectId reference.
              This links existing backlogs to their projects.
            </p>
            <button
              style={styles.primaryButton}
              onClick={migrateBacklogs}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Run Migration'}
            </button>
            {backlogResult && (
              <div style={styles.result}>
                <h4>Results:</h4>
                <ul style={styles.resultList}>
                  <li>Total backlogs: {backlogResult.results.total}</li>
                  <li style={{ color: '#48bb78' }}>Migrated: {backlogResult.results.migrated}</li>
                  <li>Skipped: {backlogResult.results.skipped}</li>
                  <li style={{ color: backlogResult.results.errors > 0 ? '#f56565' : 'inherit' }}>
                    Errors: {backlogResult.results.errors}
                  </li>
                </ul>
                {backlogResult.results.errorDetails.length > 0 && (
                  <div style={styles.errorDetails}>
                    <strong>Error Details:</strong>
                    <ul>
                      {backlogResult.results.errorDetails.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sprints Migration */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Migrate Sprints</h3>
            <p style={styles.cardDescription}>
              Converts project field from string (project name) to ObjectId reference.
              This links existing sprints to their projects.
            </p>
            <button
              style={styles.primaryButton}
              onClick={migrateSprints}
              disabled={loading}
            >
              {loading ? 'Running...' : 'Run Migration'}
            </button>
            {sprintResult && (
              <div style={styles.result}>
                <h4>Results:</h4>
                <ul style={styles.resultList}>
                  <li>Total sprints: {sprintResult.results.total}</li>
                  <li style={{ color: '#48bb78' }}>Migrated: {sprintResult.results.migrated}</li>
                  <li>Skipped: {sprintResult.results.skipped}</li>
                  <li style={{ color: sprintResult.results.errors > 0 ? '#f56565' : 'inherit' }}>
                    Errors: {sprintResult.results.errors}
                  </li>
                </ul>
                {sprintResult.results.errorDetails.length > 0 && (
                  <div style={styles.errorDetails}>
                    <strong>Error Details:</strong>
                    <ul>
                      {sprintResult.results.errorDetails.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={styles.runAll}>
          <button
            style={{ ...styles.primaryButton, background: '#667eea' }}
            onClick={runAllMigrations}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run All Migrations'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    cursor: 'pointer',
  },
  warning: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#92400e',
  },
  migrationCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.6',
    marginBottom: '20px',
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
    width: '100%',
  },
  result: {
    marginTop: '20px',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
  },
  resultList: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0',
  },
  errorDetails: {
    marginTop: '12px',
    padding: '12px',
    background: '#fed7d7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#c53030',
  },
  runAll: {
    textAlign: 'center',
  },
  recoveryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    border: '2px solid #16a34a',
  },
  projectList: {
    marginTop: '12px',
    padding: '12px',
    background: '#f0fdf4',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#166534',
  },
};
