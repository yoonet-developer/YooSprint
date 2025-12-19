'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/shared/AppLayout';

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
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface Sprint {
  _id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'active' | 'completed';
  managers?: Array<{ _id: string; name: string; email: string }>;
}

export default function TimelinePage() {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [showGanttChart, setShowGanttChart] = useState(false);
  const [highlightedSprintId, setHighlightedSprintId] = useState<string | null>(null);
  const sprintRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Get unique projects for filter
  const uniqueProjects = [...new Set(backlogs.map(b => b.project))];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        setUserRole(user.role);
      }

      const backlogsRes = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const backlogsData = await backlogsRes.json();

      const sprintsRes = await fetch('/api/sprints', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sprintsData = await sprintsRes.json();

      if (backlogsData.success) {
        setBacklogs(backlogsData.backlogs);
      }
      if (sprintsData.success) {
        const sprintsWithDetails = await Promise.all(
          sprintsData.sprints.map(async (sprint: Sprint) => {
            const detailsRes = await fetch(`/api/sprints/${sprint._id}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const detailsData = await detailsRes.json();
            if (detailsData.success) {
              return detailsData.sprint;
            }
            return sprint;
          })
        );
        setSprints(sprintsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleProjectExpansion = (projectName: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectName]: !prev[projectName],
    }));
  };

  const scrollToSprint = (sprintId: string) => {
    const sprintElement = sprintRefs.current[sprintId];
    if (sprintElement) {
      setTimeout(() => {
        sprintElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setHighlightedSprintId(sprintId);
        setTimeout(() => {
          setHighlightedSprintId(null);
        }, 2000);
      }, 100);
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high': return { color: '#1e293b', bg: '#f1f5f9', label: 'High' };
      case 'medium': return { color: '#64748b', bg: '#f8fafc', label: 'Medium' };
      case 'low': return { color: '#94a3b8', bg: '#f8fafc', label: 'Low' };
      default: return { color: '#64748b', bg: '#f8fafc', label: 'Unknown' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
      case 'done':
        return { color: '#16a34a', bg: '#f0fdf4', label: 'Completed' };
      case 'in-progress':
        return { color: '#879BFF', bg: '#E8ECFF', label: 'In Progress' };
      case 'pending':
        return { color: '#64748b', bg: '#f1f5f9', label: 'To Do' };
      default:
        return { color: '#64748b', bg: '#f1f5f9', label: status };
    }
  };

  const getSprintStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { color: '#879BFF', bg: '#E8ECFF', label: 'Active' };
      case 'completed': return { color: '#16a34a', bg: '#f0fdf4', label: 'Completed' };
      case 'planned': return { color: '#64748b', bg: '#f1f5f9', label: 'Planned' };
      default: return { color: '#64748b', bg: '#f1f5f9', label: status };
    }
  };

  const renderProjectTimeline = () => {
    const managedSprints = userRole === 'admin' || userRole === 'super-admin'
      ? sprints
      : sprints.filter((sprint) => {
          if (!sprint.managers || sprint.managers.length === 0) return false;
          return sprint.managers.some((manager) => manager._id === currentUserId);
        });

    const managedSprintIds = managedSprints.map(s => s._id);

    let filteredBacklogs = backlogs.filter((b) => {
      if (userRole === 'admin' || userRole === 'super-admin') return true;
      if (!b.sprint) return true;
      const sprintId = typeof b.sprint === 'string' ? b.sprint : b.sprint?._id;
      return sprintId ? managedSprintIds.includes(sprintId) : false;
    });

    if (projectFilter !== 'all') {
      filteredBacklogs = filteredBacklogs.filter((b) => b.project === projectFilter);
    }

    if (filteredBacklogs.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p style={styles.emptyText}>No projects found</p>
          <p style={styles.emptySubtext}>Add backlog items to see them here</p>
        </div>
      );
    }

    const projectGroups: { [key: string]: Backlog[] } = {};
    filteredBacklogs.forEach((backlog) => {
      const projectName = backlog.project || 'Unnamed Project';
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = [];
      }
      projectGroups[projectName].push(backlog);
    });

    const sortedProjectNames = Object.keys(projectGroups).sort();

    return sortedProjectNames.map((projectName) => {
      const projectBacklogs = projectGroups[projectName];
      const totalProjectTasks = projectBacklogs.length;
      const completedProjectTasks = projectBacklogs.filter(
        (b) => b.taskStatus === 'completed' || b.status === 'done'
      ).length;
      const inProgressTasks = projectBacklogs.filter(
        (b) => b.taskStatus === 'in-progress'
      ).length;
      const progressPercentage = totalProjectTasks > 0 ? Math.round((completedProjectTasks / totalProjectTasks) * 100) : 0;

      const assignees = new Set<string>();
      projectBacklogs.forEach((b) => {
        if (b.assignee?.name) {
          assignees.add(b.assignee.name);
        }
      });

      const sprintSet = new Set<string>();
      projectBacklogs.forEach((b) => {
        if (b.sprint) {
          sprintSet.add(b.sprint.name || 'Unnamed Sprint');
        }
      });

      let projectStatus = 'in-progress';
      let statusColor = '#879BFF';
      if (completedProjectTasks === totalProjectTasks && totalProjectTasks > 0) {
        projectStatus = 'completed';
        statusColor = '#16a34a';
      } else if (inProgressTasks === 0 && completedProjectTasks === 0) {
        projectStatus = 'planned';
        statusColor = '#64748b';
      }

      const isExpanded = expandedProjects[projectName] === true;

      return (
        <div
          key={projectName}
          style={styles.projectCard}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.borderColor = '#879BFF';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 155, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            }
          }}
        >
          {/* Status Indicator Line */}
          <div style={{ ...styles.projectStatusLine, backgroundColor: statusColor }} />

          {/* Project Header */}
          <div
            style={styles.projectHeader}
            onClick={() => toggleProjectExpansion(projectName)}
          >
            <div style={styles.projectHeaderLeft}>
              <div style={styles.projectTitleRow}>
                <h3 style={styles.projectName}>{projectName}</h3>
                <span style={{
                  ...styles.projectStatusBadge,
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                }}>
                  {projectStatus}
                </span>
              </div>
              <div style={styles.projectMeta}>
                <span style={styles.projectMetaItem}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="#64748b">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>
                  </svg>
                  {assignees.size} assignee{assignees.size !== 1 ? 's' : ''}
                </span>
                <span style={styles.projectMetaDivider}>|</span>
                <span style={styles.projectMetaItem}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="#64748b">
                    <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11z"/>
                  </svg>
                  {sprintSet.size} sprint{sprintSet.size !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div style={styles.projectHeaderRight}>
              <div style={styles.projectStats}>
                <div style={styles.projectStatItem}>
                  <span style={styles.projectStatValue}>{totalProjectTasks}</span>
                  <span style={styles.projectStatLabel}>TASKS</span>
                </div>
                <div style={styles.projectStatDivider} />
                <div style={styles.projectStatItem}>
                  <span style={styles.projectStatValue}>{completedProjectTasks}</span>
                  <span style={styles.projectStatLabel}>DONE</span>
                </div>
                <div style={styles.projectStatDivider} />
                <div style={styles.projectStatItem}>
                  <span style={{ ...styles.projectStatValue, color: statusColor }}>{progressPercentage}%</span>
                  <span style={styles.projectStatLabel}>PROGRESS</span>
                </div>
              </div>
              <button style={styles.expandButton}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={styles.projectProgressContainer}>
            <div style={styles.projectProgressBar}>
              <div
                style={{
                  ...styles.projectProgressFill,
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div style={styles.projectContent}>
              {(() => {
                const sprintGroups: { [key: string]: { sprint: any, backlogs: Backlog[] } } = {};
                const noSprintBacklogs: Backlog[] = [];

                projectBacklogs.forEach((backlog) => {
                  if (backlog.sprint) {
                    const sprintId = typeof backlog.sprint === 'string' ? backlog.sprint : backlog.sprint._id;
                    if (!sprintGroups[sprintId]) {
                      sprintGroups[sprintId] = { sprint: backlog.sprint, backlogs: [] };
                    }
                    sprintGroups[sprintId].backlogs.push(backlog);
                  } else {
                    noSprintBacklogs.push(backlog);
                  }
                });

                const sortedSprints = Object.values(sprintGroups).sort((a, b) => {
                  const nameA = a.sprint?.name || '';
                  const nameB = b.sprint?.name || '';
                  return nameA.localeCompare(nameB);
                });

                return (
                  <>
                    {sortedSprints.map((sprintGroup) => {
                      const sprint = sprintGroup.sprint;
                      const sprintBacklogs = sprintGroup.backlogs;
                      const sprintId = sprint._id || sprint;
                      const completedInSprint = sprintBacklogs.filter(b =>
                        b.taskStatus === 'completed' || b.status === 'done'
                      ).length;
                      const completionRate = sprintBacklogs.length > 0
                        ? Math.round((completedInSprint / sprintBacklogs.length) * 100)
                        : 0;

                      const sprintStatusConfig = getSprintStatusConfig(sprint.status || 'planned');

                      return (
                        <div
                          key={sprintId}
                          style={{
                            ...styles.sprintGroup,
                            ...(highlightedSprintId === sprintId ? styles.highlightedSprint : {})
                          }}
                          ref={(el) => { sprintRefs.current[sprintId] = el; }}
                        >
                          <div style={{
                            ...styles.sprintHeader,
                            borderLeftColor: sprintStatusConfig.color,
                          }}>
                            <div style={styles.sprintInfo}>
                              <div style={styles.sprintTitleRow}>
                                <span style={styles.sprintName}>{sprint.name || 'Unnamed Sprint'}</span>
                                <span style={{
                                  ...styles.sprintStatusBadge,
                                  backgroundColor: sprintStatusConfig.bg,
                                  color: sprintStatusConfig.color,
                                }}>
                                  {sprintStatusConfig.label}
                                </span>
                              </div>
                              <span style={styles.sprintMeta}>
                                {sprintBacklogs.length} task{sprintBacklogs.length !== 1 ? 's' : ''} | {completionRate}% complete
                              </span>
                            </div>
                          </div>

                          {sprintBacklogs.map((backlog) => {
                            const priorityConfig = getPriorityConfig(backlog.priority);
                            const statusConfig = getStatusConfig(backlog.taskStatus);

                            return (
                              <div key={backlog._id} style={styles.backlogItem}>
                                <div style={{ ...styles.backlogPriorityLine, backgroundColor: priorityConfig.color }} />
                                <div style={styles.backlogContent}>
                                  <div style={styles.backlogHeader}>
                                    <div style={styles.backlogBadges}>
                                      <span style={{
                                        ...styles.priorityBadge,
                                        backgroundColor: priorityConfig.bg,
                                        color: priorityConfig.color,
                                      }}>
                                        {priorityConfig.label}
                                      </span>
                                      <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: statusConfig.bg,
                                        color: statusConfig.color,
                                      }}>
                                        {statusConfig.label}
                                      </span>
                                    </div>
                                  </div>
                                  <h4 style={styles.backlogTitle}>{backlog.title}</h4>
                                  {backlog.description && (
                                    <p style={styles.backlogDescription}>{backlog.description}</p>
                                  )}
                                  <div style={styles.backlogFooter}>
                                    <div style={styles.backlogAssignee}>
                                      <div style={styles.assigneeAvatar}>
                                        {(backlog.assignee?.name || 'U')[0].toUpperCase()}
                                      </div>
                                      <span style={styles.assigneeName}>
                                        {backlog.assignee?.name || 'Unassigned'}
                                      </span>
                                    </div>
                                    <span style={styles.backlogDate}>
                                      {formatDate(backlog.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {noSprintBacklogs.length > 0 && (
                      <div style={styles.sprintGroup}>
                        <div style={{
                          ...styles.sprintHeader,
                          borderLeftColor: '#cbd5e1',
                        }}>
                          <div style={styles.sprintInfo}>
                            <div style={styles.sprintTitleRow}>
                              <span style={styles.sprintName}>Backlog</span>
                              <span style={{
                                ...styles.sprintStatusBadge,
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                              }}>
                                No Sprint
                              </span>
                            </div>
                            <span style={styles.sprintMeta}>
                              {noSprintBacklogs.length} task{noSprintBacklogs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {noSprintBacklogs.map((backlog) => {
                          const priorityConfig = getPriorityConfig(backlog.priority);
                          const statusConfig = getStatusConfig(backlog.taskStatus || backlog.status);

                          return (
                            <div key={backlog._id} style={styles.backlogItem}>
                              <div style={{ ...styles.backlogPriorityLine, backgroundColor: priorityConfig.color }} />
                              <div style={styles.backlogContent}>
                                <div style={styles.backlogHeader}>
                                  <div style={styles.backlogBadges}>
                                    <span style={{
                                      ...styles.priorityBadge,
                                      backgroundColor: priorityConfig.bg,
                                      color: priorityConfig.color,
                                    }}>
                                      {priorityConfig.label}
                                    </span>
                                    <span style={{
                                      ...styles.statusBadge,
                                      backgroundColor: statusConfig.bg,
                                      color: statusConfig.color,
                                    }}>
                                      {statusConfig.label}
                                    </span>
                                  </div>
                                </div>
                                <h4 style={styles.backlogTitle}>{backlog.title}</h4>
                                {backlog.description && (
                                  <p style={styles.backlogDescription}>{backlog.description}</p>
                                )}
                                <div style={styles.backlogFooter}>
                                  <div style={styles.backlogAssignee}>
                                    <div style={styles.assigneeAvatar}>
                                      {(backlog.assignee?.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <span style={styles.assigneeName}>
                                      {backlog.assignee?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                  <span style={styles.backlogDate}>
                                    {formatDate(backlog.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      );
    });
  };

  const renderGanttChart = () => {
    const managedSprints = userRole === 'admin' || userRole === 'super-admin'
      ? sprints
      : sprints.filter((sprint) => {
          if (!sprint.managers || sprint.managers.length === 0) return false;
          return sprint.managers.some((manager) => manager._id === currentUserId);
        });

    const managedSprintIds = managedSprints.map(s => s._id);

    let filteredBacklogs = backlogs.filter((b) => {
      if (userRole === 'admin' || userRole === 'super-admin') return true;
      if (!b.sprint) return true;
      const sprintId = b.sprint._id;
      return managedSprintIds.includes(sprintId);
    });

    if (projectFilter !== 'all') {
      filteredBacklogs = filteredBacklogs.filter((b) => b.project === projectFilter);
    }

    const projectGroups: { [key: string]: { backlogs: Backlog[], sprints: Sprint[] } } = {};
    filteredBacklogs.forEach((backlog) => {
      const projectName = backlog.project || 'Unnamed Project';
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = { backlogs: [], sprints: [] };
      }
      projectGroups[projectName].backlogs.push(backlog);

      if (backlog.sprint) {
        const sprintId = backlog.sprint._id || backlog.sprint;
        const fullSprint = sprints.find(s => s._id === sprintId);
        if (fullSprint && !projectGroups[projectName].sprints.find(s => s._id === fullSprint._id)) {
          projectGroups[projectName].sprints.push(fullSprint);
        }
      }
    });

    const projectNames = Object.keys(projectGroups).sort();

    if (projectNames.length === 0) {
      return <div style={styles.emptyState}><p style={styles.emptyText}>No projects to display in Gantt chart</p></div>;
    }

    const allSprints = projectNames.flatMap(name => projectGroups[name].sprints);
    if (allSprints.length === 0) {
      return <div style={styles.emptyState}><p style={styles.emptyText}>No sprints found for selected projects</p></div>;
    }

    const allDates = allSprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
      <div style={styles.ganttContainer}>
        {/* Gantt Header */}
        <div style={styles.ganttHeader}>
          <div style={styles.ganttLabelColumn}>PROJECT / SPRINT</div>
          <div style={styles.ganttTimelineColumn}>
            <div style={styles.ganttMonthsRow}>
              {(() => {
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
                return months.map((m, i) => (
                  <div key={i} style={{ ...styles.ganttMonth, flex: m.days }}>{m.month}</div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Gantt Rows */}
        {projectNames.map((projectName) => {
          const projectData = projectGroups[projectName];
          const projectSprints = projectData.sprints.sort((a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );

          if (projectSprints.length === 0) return null;

          return (
            <div key={projectName} style={styles.ganttProjectGroup}>
              {/* Project Row */}
              <div style={styles.ganttProjectRow}>
                <div style={styles.ganttLabelColumn}>
                  <span style={styles.ganttProjectName}>{projectName}</span>
                  <span style={styles.ganttProjectMeta}>{projectSprints.length} sprint{projectSprints.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={styles.ganttTimelineColumn} />
              </div>

              {/* Sprint Rows */}
              {projectSprints.map((sprint) => {
                const sprintStart = new Date(sprint.startDate);
                const sprintEnd = new Date(sprint.endDate);
                const startOffset = Math.ceil((sprintStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                const sprintDuration = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const leftPercent = (startOffset / totalDays) * 100;
                const widthPercent = (sprintDuration / totalDays) * 100;

                const sprintBacklogs = projectData.backlogs.filter((b) => {
                  const backlogSprintId = b.sprint?._id || b.sprint;
                  return String(backlogSprintId) === String(sprint._id);
                });

                const completedTasks = sprintBacklogs.filter(
                  (b) => b.taskStatus === 'completed' || b.status === 'done'
                ).length;
                const completionRate = sprintBacklogs.length > 0 ? Math.round((completedTasks / sprintBacklogs.length) * 100) : 0;

                const sprintStatusConfig = getSprintStatusConfig(sprint.status);

                return (
                  <div key={sprint._id} style={styles.ganttSprintRow}>
                    <div style={styles.ganttLabelColumn}>
                      <span style={styles.ganttSprintName}>{sprint.name}</span>
                      <span style={styles.ganttSprintDates}>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                    </div>
                    <div style={styles.ganttTimelineColumn}>
                      <div style={styles.ganttBarContainer}>
                        <div
                          style={{
                            ...styles.ganttBar,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: sprintStatusConfig.color,
                          }}
                          onClick={() => {
                            setExpandedProjects((prev) => ({ ...prev, [projectName]: true }));
                            scrollToSprint(sprint._id);
                          }}
                        >
                          <span style={styles.ganttBarLabel}>{completionRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading timeline...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Timeline</h1>
            <p style={styles.subtitle}>Track project progress and sprint timelines</p>
          </div>
          <div style={styles.headerActions}>
            <button
              style={{
                ...styles.ganttButton,
                ...(showGanttChart ? styles.ganttButtonActive : {}),
              }}
              onClick={() => setShowGanttChart(!showGanttChart)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '8px' }}>
                <path d="M2 0h12v2H2z"/>
                <path d="M2 4h4v1H2z"/>
                <path d="M7 4h5v1H7z"/>
                <path d="M2 6h3v1H2z"/>
                <path d="M6 6h6v1H6z"/>
              </svg>
              {showGanttChart ? 'Hide Gantt' : 'View Gantt'}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={styles.controlsRow}>
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>PROJECT</label>
            <select
              style={styles.projectSelect}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects ({uniqueProjects.length})</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gantt Chart */}
        {showGanttChart && renderGanttChart()}

        {/* Timeline Container */}
        <div style={styles.timelineContainer}>
          {renderProjectTimeline()}
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
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  ganttButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #879BFF',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#879BFF',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  ganttButtonActive: {
    background: '#879BFF',
    color: 'white',
  },
  controlsRow: {
    marginBottom: '24px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  projectSelect: {
    padding: '10px 16px',
    paddingRight: '40px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    background: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: '220px',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  projectCard: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  projectStatusLine: {
    height: '4px',
    width: '100%',
  },
  projectHeader: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '24px',
  },
  projectHeaderLeft: {
    flex: 1,
  },
  projectTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  projectName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
  },
  projectStatusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  projectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  projectMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  projectMetaDivider: {
    color: '#cbd5e1',
  },
  projectHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  projectStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  projectStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  projectStatValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
  },
  projectStatLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: '0.5px',
  },
  projectStatDivider: {
    width: '1px',
    height: '32px',
    background: '#e2e8f0',
  },
  expandButton: {
    padding: '8px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectProgressContainer: {
    padding: '0 24px 16px',
  },
  projectProgressBar: {
    height: '1px',
    background: '#e2e8f0',
    overflow: 'hidden',
  },
  projectProgressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    backgroundColor: '#cbd5e1',
  },
  projectContent: {
    borderTop: '1px solid #e2e8f0',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  sprintGroup: {
    borderBottom: '1px solid #f1f5f9',
  },
  sprintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#f8fafc',
    borderLeft: '3px solid',
  },
  sprintInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sprintTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sprintName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  sprintStatusBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sprintMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  highlightedSprint: {
    boxShadow: '0 0 0 3px rgba(135, 155, 255, 0.3)',
    background: '#f0f4ff',
  },
  backlogItem: {
    display: 'flex',
    background: 'white',
    borderBottom: '1px solid #f1f5f9',
  },
  backlogPriorityLine: {
    width: '3px',
    flexShrink: 0,
  },
  backlogContent: {
    flex: 1,
    padding: '16px 24px',
  },
  backlogHeader: {
    marginBottom: '8px',
  },
  backlogBadges: {
    display: 'flex',
    gap: '8px',
  },
  priorityBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  backlogTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  backlogDescription: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: '0 0 12px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  backlogFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backlogAssignee: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  assigneeAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #879BFF 0%, #FF6495 100%)',
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeName: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  backlogDate: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  emptyState: {
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
  ganttContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
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
  ganttProjectGroup: {
    marginBottom: '16px',
  },
  ganttProjectRow: {
    display: 'flex',
    padding: '12px 0',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
    paddingLeft: '12px',
    borderLeft: '4px solid #879BFF',
  },
  ganttProjectName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    display: 'block',
  },
  ganttProjectMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  ganttSprintRow: {
    display: 'flex',
    padding: '12px 0 12px 24px',
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
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  ganttBarLabel: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
  },
};
