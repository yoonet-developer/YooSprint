'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';

interface User {
  _id: string;
  name: string;
  yoonetId: string;
  position: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  category: string;
  estimatedTime: number;
  timeConsumed: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  department: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

interface Sprint {
  _id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  project?: {
    _id: string;
    name: string;
  };
}

interface Backlog {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'backlog' | 'in-sprint' | 'done';
  taskStatus: 'pending' | 'in-progress' | 'completed';
  assignee?: User;
  sprint?: {
    _id: string;
    name: string;
  };
  timeTracked?: number; // Time tracked in seconds
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'sprints'>('timeline');
  const [highlightedSprintId, setHighlightedSprintId] = useState<string | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<{ [key: string]: boolean }>({});
  const sprintRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    // Check user role and redirect members
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'member') {
        router.push('/dashboard');
        return;
      }
    }

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId, router]);

  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
        // Now fetch sprints and backlogs using the actual project _id
        fetchProjectSprints(data.project._id);
        fetchProjectBacklogs(data.project._id);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSprints = async (actualProjectId: string) => {
    try {
      const token = localStorage.getItem('token');
      // Fetch all sprints first
      const response = await fetch(`/api/sprints`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Filter sprints that have backlogs for this project
        setSprints(data.sprints);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const fetchProjectBacklogs = async (actualProjectId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backlogs?project=${actualProjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // API already filters by project ID server-side
        setBacklogs(data.backlogs);
      }
    } catch (error) {
      console.error('Error fetching backlogs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#48bb78';
      case 'in-progress':
      case 'active': return '#4299e1';
      case 'pending':
      case 'planned': return '#ed8936';
      case 'on-hold': return '#a0aec0';
      case 'cancelled': return '#f56565';
      default: return '#718096';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f56565';
      case 'medium': return '#ed8936';
      case 'low': return '#48bb78';
      default: return '#718096';
    }
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

  const formatTimeTracked = (seconds: number) => {
    if (!seconds || seconds === 0) return '0h';
    const hours = seconds / 3600;
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(2)}h`;
  };

  const scrollToSprint = (sprintId: string) => {
    setActiveTab('sprints');
    setHighlightedSprintId(sprintId);
    setExpandedSprints(prev => ({ ...prev, [sprintId]: true }));
    setTimeout(() => {
      sprintRefs.current[sprintId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedSprintId(null), 2000);
    }, 100);
  };

  const toggleSprintExpand = (sprintId: string) => {
    setExpandedSprints(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading project...</div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div style={styles.notFound}>
          <h2>Project not found</h2>
          <button style={styles.backButton} onClick={() => router.push('/projects')}>
            Back to Projects
          </button>
        </div>
      </AppLayout>
    );
  }

  // Compute sprints that belong to this project (have backlogs in this project or are directly linked)
  const sprintIdsWithProjectBacklogs = new Set(
    backlogs.filter(b => b.sprint?._id).map(b => b.sprint!._id)
  );
  const projectSprints = sprints.filter(s =>
    sprintIdsWithProjectBacklogs.has(s._id) || s.project?._id === projectId
  );

  // Calculate actual progress based on backlog statuses
  const completedBacklogs = backlogs.filter(b => b.taskStatus === 'completed').length;
  const calculatedProgress = backlogs.length > 0
    ? Math.round((completedBacklogs / backlogs.length) * 100)
    : 0;

  // Calculate consumed time from all backlogs (sum of timeTracked in seconds, converted to hours)
  const totalTimeTrackedSeconds = backlogs.reduce((sum, backlog) => sum + (backlog.timeTracked || 0), 0);
  const calculatedTimeConsumed = (totalTimeTrackedSeconds / 3600).toFixed(1); // Convert seconds to hours

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => router.push('/projects')}>
            ← Back to Projects
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{project.name}</h1>
            </div>
            <span style={styles.category}>{project.category}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'timeline' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'sprints' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('sprints')}
          >
            Sprints ({projectSprints.length})
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.content}>
          {activeTab === 'sprints' && (
            <div style={styles.listContainer}>
              {projectSprints.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No sprints linked to this project yet.</p>
                </div>
              ) : (
                <div style={styles.sprintList}>
                  {[...projectSprints].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((sprint) => {
                    const sprintBacklogs = backlogs.filter(b => b.sprint?._id === sprint._id);
                    const completedCount = sprintBacklogs.filter(b => b.taskStatus === 'completed').length;

                    return (
                      <div
                        key={sprint._id}
                        ref={(el) => { sprintRefs.current[sprint._id] = el; }}
                        style={{
                          ...styles.sprintCardExpanded,
                          ...(highlightedSprintId === sprint._id ? styles.highlightedSprint : {}),
                        }}
                      >
                        <div
                          style={styles.sprintCardHeader}
                          onClick={() => toggleSprintExpand(sprint._id)}
                        >
                          <div style={styles.sprintHeaderLeft}>
                            <h4 style={styles.sprintName}>{sprint.name}</h4>
                            <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(sprint.status) }}>
                              {sprint.status}
                            </span>
                          </div>
                          <div style={styles.sprintHeaderRight}>
                            <span style={styles.sprintStat}>{sprintBacklogs.length} tasks</span>
                            <span style={styles.sprintStatDivider}>|</span>
                            <span style={styles.sprintStat}>{completedCount} done</span>
                            <button style={styles.expandBtn}>
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="2"
                                style={{
                                  transform: expandedSprints[sprint._id] ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                }}
                              >
                                <polyline points="6,9 12,15 18,9" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedSprints[sprint._id] && (
                          <>
                            {sprint.goal && (
                              <div style={styles.sprintInfoSection}>
                                <p style={styles.sprintGoalText}>{sprint.goal}</p>
                                <div style={styles.sprintDates}>
                                  <span>{formatDate(sprint.startDate)}</span>
                                  <span> → </span>
                                  <span>{formatDate(sprint.endDate)}</span>
                                </div>
                              </div>
                            )}

                            {/* Backlogs in Sprint */}
                            {sprintBacklogs.length > 0 ? (
                              <div style={styles.sprintBacklogList}>
                                {sprintBacklogs.map((backlog) => (
                                  <div key={backlog._id} style={styles.sprintBacklogItem}>
                                    <div style={{ ...styles.backlogStatusDot, backgroundColor: getStatusColor(backlog.taskStatus) }} />
                                    <div style={styles.sprintBacklogContent}>
                                      <span style={styles.sprintBacklogTitle}>{backlog.title}</span>
                                      <div style={styles.sprintBacklogMeta}>
                                        <span style={{ ...styles.smallBadge, backgroundColor: `${getPriorityColor(backlog.priority)}20`, color: getPriorityColor(backlog.priority) }}>
                                          {backlog.priority}
                                        </span>
                                        <span style={{ ...styles.smallBadge, backgroundColor: `${getStatusColor(backlog.taskStatus)}20`, color: getStatusColor(backlog.taskStatus) }}>
                                          {backlog.taskStatus}
                                        </span>
                                        <span style={styles.timeTrackedBadge}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="#64748b" viewBox="0 0 16 16">
                                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
                                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
                                          </svg>
                                          {formatTimeTracked(backlog.timeTracked || 0)}
                                        </span>
                                        {backlog.assignee && (
                                          <span style={styles.sprintBacklogAssignee}>{backlog.assignee.name}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={styles.noBacklogsMessage}>
                                <p>No backlogs in this sprint</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={styles.timelineSection}>
              {/* Project Details */}
              <div style={styles.projectDetailsBar}>
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Category</span>
                  <span style={styles.projectDetailValue}>{project.category}</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Department</span>
                  <span style={styles.projectDetailValue}>{project.department || '-'}</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Start Date</span>
                  <span style={styles.projectDetailValue}>{formatDate(project.startDate)}</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>End Date</span>
                  <span style={styles.projectDetailValue}>{formatDate(project.endDate)}</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Progress</span>
                  <span style={{ ...styles.projectDetailValue, color: getProgressColor(calculatedProgress) }}>{calculatedProgress}%</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Estimated Time</span>
                  <span style={styles.projectDetailValue}>{project.estimatedTime}h</span>
                </div>
                <div style={styles.projectDetailDivider} />
                <div style={styles.projectDetailItem}>
                  <span style={styles.projectDetailLabel}>Time Consumed</span>
                  <span style={styles.projectDetailValue}>{calculatedTimeConsumed}h</span>
                </div>
              </div>

              {projectSprints.length === 0 ? (
                <div style={styles.emptyTimeline}>
                  <p>No sprints found for this project</p>
                </div>
              ) : (
                <div style={styles.ganttContainer}>
                  {/* Gantt Header */}
                  <div style={styles.ganttHeader}>
                    <div style={styles.ganttLabelColumn}>SPRINT</div>
                    <div style={styles.ganttTimelineColumn}>
                      {(() => {
                        const allDates = projectSprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)]);
                        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

                        // Generate month labels
                        const months: { month: string; days: number }[] = [];
                        let currentDate = new Date(minDate);
                        while (currentDate <= maxDate) {
                          const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                          const startDay = currentDate.getDate();
                          const endDay = currentDate.getMonth() === maxDate.getMonth() && currentDate.getFullYear() === maxDate.getFullYear()
                            ? maxDate.getDate()
                            : daysInMonth;
                          months.push({ month: monthYear, days: endDay - startDay + 1 });
                          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                        }

                        return (
                          <div style={styles.ganttMonthsRow}>
                            {months.map((m, i) => (
                              <div key={i} style={{ ...styles.ganttMonth, flex: m.days }}>{m.month}</div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sprint Rows */}
                  {(() => {
                    // Sort sprints by start date (old to new)
                    const sortedSprints = [...projectSprints].sort((a, b) =>
                      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                    );

                    const allDates = sortedSprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)]);
                    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
                    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return sortedSprints.map((sprint) => {
                      const sprintStart = new Date(sprint.startDate);
                      const sprintEnd = new Date(sprint.endDate);
                      const startOffset = Math.ceil((sprintStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                      const duration = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const leftPercent = (startOffset / totalDays) * 100;
                      const widthPercent = (duration / totalDays) * 100;

                      // Calculate completion rate
                      const sprintBacklogs = backlogs.filter(b => b.sprint?._id === sprint._id);
                      const completedTasks = sprintBacklogs.filter(b => b.taskStatus === 'completed').length;
                      const completionRate = sprintBacklogs.length > 0 ? Math.round((completedTasks / sprintBacklogs.length) * 100) : 0;

                      return (
                        <div key={sprint._id} style={styles.ganttSprintRow}>
                          <div style={styles.ganttLabelColumn}>
                            <span style={styles.ganttSprintName}>{sprint.name}</span>
                            <span style={styles.ganttSprintDates}>
                              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                            </span>
                          </div>
                          <div style={styles.ganttTimelineColumn}>
                            <div style={styles.ganttBarContainer}>
                              <div
                                style={{
                                  ...styles.ganttBar,
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                  backgroundColor: getStatusColor(sprint.status),
                                  cursor: 'pointer',
                                }}
                                onClick={() => scrollToSprint(sprint._id)}
                              >
                                <span style={styles.ganttBarLabel}>{completionRate}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
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
    padding: '60px',
    fontSize: '18px',
    color: '#718096',
  },
  notFound: {
    textAlign: 'center',
    padding: '60px',
  },
  header: {
    marginBottom: '24px',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '16px',
    display: 'inline-block',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
  },
  category: {
    fontSize: '14px',
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    fontWeight: '600',
    color: '#718096',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#667eea',
    borderBottomColor: '#667eea',
  },
  content: {
    minHeight: '400px',
  },
  listContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
  },
  sprintList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sprintCardExpanded: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s',
    background: 'white',
  },
  sprintCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  sprintHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sprintHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sprintStat: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  sprintStatDivider: {
    color: '#cbd5e1',
  },
  sprintInfoSection: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  sprintGoalText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  sprintBacklogList: {
    display: 'flex',
    flexDirection: 'column',
  },
  sprintBacklogItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  backlogStatusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  sprintBacklogContent: {
    flex: 1,
  },
  sprintBacklogTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    display: 'block',
    marginBottom: '6px',
  },
  sprintBacklogMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  smallBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sprintBacklogAssignee: {
    fontSize: '12px',
    color: '#64748b',
  },
  timeTrackedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: '500',
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
  },
  noBacklogsMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  highlightedSprint: {
    border: '2px solid #667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.2)',
    background: '#f8faff',
  },
  sprintName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  sprintDates: {
    fontSize: '13px',
    color: '#a0aec0',
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  projectDetailsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '16px 24px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  projectDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  projectDetailLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  projectDetailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  projectDetailDivider: {
    width: '1px',
    height: '32px',
    background: '#e2e8f0',
  },
  ganttContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    overflowX: 'auto',
  },
  ganttHeader: {
    display: 'flex',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  ganttLabelColumn: {
    width: '240px',
    flexShrink: 0,
    paddingRight: '16px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  ganttTimelineColumn: {
    flex: 1,
    minWidth: '400px',
  },
  ganttMonthsRow: {
    display: 'flex',
    background: '#f8fafc',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  ganttMonth: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    borderRight: '1px solid #e2e8f0',
  },
  ganttSprintRow: {
    display: 'flex',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  ganttSprintName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    display: 'block',
  },
  ganttSprintDates: {
    fontSize: '11px',
    color: '#64748b',
  },
  ganttBarContainer: {
    position: 'relative',
    height: '32px',
    background: '#f8fafc',
    borderRadius: '6px',
  },
  ganttBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  ganttBarLabel: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
  },
  emptyTimeline: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
    background: 'white',
    borderRadius: '12px',
  },
};
