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

interface SprintGroup {
  sprint: any;
  items: Backlog[];
}

export default function TimelinePage() {
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const [expandedSprints, setExpandedSprints] = useState<{ [key: string]: boolean }>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [showGanttChart, setShowGanttChart] = useState(false);
  const [highlightedSprintId, setHighlightedSprintId] = useState<string | null>(null);
  const sprintRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get current user ID and role
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        setUserRole(user.role);
      }

      // Fetch backlogs
      const backlogsRes = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const backlogsData = await backlogsRes.json();

      // Fetch sprints
      const sprintsRes = await fetch('/api/sprints', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sprintsData = await sprintsRes.json();

      if (backlogsData.success) {
        setBacklogs(backlogsData.backlogs);
      }
      if (sprintsData.success) {
        // Fetch detailed sprint info with managers populated
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'just now';
  };

  const calculateDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt || !completedAt) return null;

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();

    // Calculate total hours and days
    const totalHours = diffMs / (1000 * 60 * 60);
    const totalDays = diffMs / (1000 * 60 * 60 * 24);

    // If less than 24 hours, show in hours
    if (totalHours < 24) {
      const hours = Math.floor(totalHours);
      const minutes = Math.floor((totalHours - hours) * 60);
      if (hours === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
    }

    // If less than 30 days, show in days and hours
    if (totalDays < 30) {
      const days = Math.floor(totalDays);
      const remainingHours = Math.floor((totalDays - days) * 24);
      return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hr` : ''}`;
    }

    // If more than 30 days, show in months and days
    const months = Math.floor(totalDays / 30);
    const remainingDays = Math.floor(totalDays % 30);
    return `${months} month${months !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}`;
  };

  const adjustColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  };

  const toggleSprintExpansion = (sprintId: string) => {
    setExpandedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
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
      // Expand the sprint if it's not already expanded
      setExpandedSprints((prev) => ({
        ...prev,
        [sprintId]: true,
      }));

      // Scroll to the sprint with smooth behavior
      setTimeout(() => {
        sprintElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        // Highlight the sprint
        setHighlightedSprintId(sprintId);

        // Remove highlight after 2 seconds
        setTimeout(() => {
          setHighlightedSprintId(null);
        }, 2000);
      }, 100);
    }
  };

  const renderProjectTimeline = () => {
    // Filter sprints: admins see all, managers see only their sprints
    const managedSprints = userRole === 'admin'
      ? sprints
      : sprints.filter((sprint) => {
          if (!sprint.managers || sprint.managers.length === 0) return false;
          return sprint.managers.some((manager) => manager._id === currentUserId);
        });

    // Get sprint IDs that the user can manage
    const managedSprintIds = managedSprints.map(s => s._id);

    // Filter backlogs - include both backlogs in sprints AND backlogs not in any sprint
    let filteredBacklogs = backlogs.filter((b) => {
      // Admins see all backlogs (with or without sprint)
      if (userRole === 'admin') {
        return true;
      }

      // Managers see:
      // 1. Backlogs in their managed sprints
      // 2. Backlogs not in any sprint (available backlogs)
      if (!b.sprint) {
        return true; // Include backlogs not in sprint
      }

      const sprintId = typeof b.sprint === 'string' ? b.sprint : b.sprint?._id;
      return sprintId ? managedSprintIds.includes(sprintId) : false;
    });

    // Apply project filter if a specific project is selected
    if (projectFilter !== 'all') {
      filteredBacklogs = filteredBacklogs.filter((b) => b.project === projectFilter);
    }

    if (filteredBacklogs.length === 0) {
      return (
        <div style={styles.empty}>
          No projects found. Add backlog items to see them here.
        </div>
      );
    }

    // Group by project name
    const projectGroups: { [key: string]: Backlog[] } = {};
    filteredBacklogs.forEach((backlog) => {
      const projectName = backlog.project || 'Unnamed Project';
      if (!projectGroups[projectName]) {
        projectGroups[projectName] = [];
      }
      projectGroups[projectName].push(backlog);
    });

    // Sort projects alphabetically
    const sortedProjectNames = Object.keys(projectGroups).sort();

    return sortedProjectNames.map((projectName) => {
      const projectBacklogs = projectGroups[projectName];

      // Calculate progress
      const totalTasks = projectBacklogs.length;
      const completedTasks = projectBacklogs.filter(
        (b) => b.taskStatus === 'completed' || b.status === 'done'
      ).length;
      const inProgressTasks = projectBacklogs.filter(
        (b) => b.taskStatus === 'in-progress'
      ).length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get unique assignees
      const assignees = new Set<string>();
      projectBacklogs.forEach((b) => {
        if (b.assignee?.name) {
          assignees.add(b.assignee.name);
        }
      });

      // Get unique sprints
      const sprintSet = new Set<string>();
      const sprintDetails: { [key: string]: any } = {};
      projectBacklogs.forEach((b) => {
        if (b.sprint) {
          const sprintId = b.sprint._id || b.sprint;
          const sprintName = b.sprint.name || 'Unnamed Sprint';
          sprintSet.add(sprintName);
          sprintDetails[sprintName] = b.sprint;
        }
      });

      // Determine overall project status
      let projectStatus = 'in-progress';
      let statusColor = '#FF6495';
      if (completedTasks === totalTasks && totalTasks > 0) {
        projectStatus = 'completed';
        statusColor = '#48bb78';
      } else if (inProgressTasks === 0 && completedTasks === 0) {
        projectStatus = 'planned';
        statusColor = '#6B7094';
      }

      const isExpanded = expandedProjects[projectName] === true;

      return (
        <div key={projectName} style={styles.sprintSection}>
          <div
            style={{
              ...styles.sprintHeaderMinimal,
              borderLeft: `4px solid ${statusColor}`,
            }}
            onClick={() => toggleProjectExpansion(projectName)}
          >
            <div style={styles.sprintMainInfo}>
              <div style={styles.sprintTopRow}>
                <h3 style={styles.sprintNameMinimal}>{projectName}</h3>
                <div style={styles.sprintMetaRow}>
                  <span style={{
                    ...styles.sprintStatusBadgeMinimal,
                    background: `${statusColor}15`,
                    color: statusColor
                  }}>
                    {projectStatus}
                  </span>
                  <span style={styles.sprintDateMinimal}>
                    {assignees.size} assignee{assignees.size !== 1 ? 's' : ''} • {sprintSet.size} sprint{sprintSet.size !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={styles.sprintStatsRow}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{totalTasks}</span>
                  <span style={styles.statLabel}>Tasks</span>
                </div>
                <div style={styles.statDivider}></div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{completedTasks}</span>
                  <span style={styles.statLabel}>Completed</span>
                </div>
                <div style={styles.statDivider}></div>
                <div style={styles.statItem}>
                  <span style={{ ...styles.statValue, color: statusColor }}>{progressPercentage}%</span>
                  <span style={styles.statLabel}>Progress</span>
                </div>
                <div style={{ flex: 1 }}></div>
                <span style={{ ...styles.chevronMinimal, color: statusColor }}>{isExpanded ? '−' : '+'}</span>
              </div>
              <div style={styles.progressBarMinimal}>
                <div
                  style={{
                    ...styles.progressBarFillMinimal,
                    width: `${progressPercentage}%`,
                    background: statusColor,
                  }}
                ></div>
              </div>
            </div>
          </div>
          {isExpanded && (
            <div style={styles.timelineItemsMinimal}>
              {(() => {
                // Group backlogs by sprint
                const sprintGroups: { [key: string]: { sprint: any, backlogs: Backlog[] } } = {};
                const noSprintBacklogs: Backlog[] = [];

                projectBacklogs.forEach((backlog) => {
                  if (backlog.sprint) {
                    const sprintId = typeof backlog.sprint === 'string' ? backlog.sprint : backlog.sprint._id;
                    if (!sprintGroups[sprintId]) {
                      sprintGroups[sprintId] = {
                        sprint: backlog.sprint,
                        backlogs: []
                      };
                    }
                    sprintGroups[sprintId].backlogs.push(backlog);
                  } else {
                    noSprintBacklogs.push(backlog);
                  }
                });

                // Get sprint groups sorted by sprint name
                const sortedSprints = Object.values(sprintGroups).sort((a, b) => {
                  const nameA = a.sprint?.name || '';
                  const nameB = b.sprint?.name || '';
                  return nameA.localeCompare(nameB);
                });

                return (
                  <>
                    {/* Render each sprint group */}
                    {sortedSprints.map((sprintGroup) => {
                      const sprint = sprintGroup.sprint;
                      const sprintBacklogs = sprintGroup.backlogs;
                      const sprintId = sprint._id || sprint;

                      // Calculate sprint completion
                      const completedInSprint = sprintBacklogs.filter(b =>
                        b.taskStatus === 'completed' || b.status === 'done'
                      ).length;
                      const completionRate = sprintBacklogs.length > 0
                        ? Math.round((completedInSprint / sprintBacklogs.length) * 100)
                        : 0;

                      // Sprint status color
                      let sprintStatusColor = '#6B7094';
                      if (sprint.status === 'active') sprintStatusColor = '#FF6495';
                      else if (sprint.status === 'completed') sprintStatusColor = '#48bb78';

                      return (
                        <div
                          key={sprintId}
                          style={{
                            ...styles.sprintGroupContainer,
                            ...(highlightedSprintId === sprintId ? styles.highlightedSprint : {})
                          }}
                          ref={(el) => { sprintRefs.current[sprintId] = el; }}
                        >
                          {/* Sprint Header */}
                          <div style={{
                            ...styles.sprintGroupHeader,
                            borderLeft: `3px solid ${sprintStatusColor}`
                          }}>
                            <div style={styles.sprintGroupInfo}>
                              <span style={styles.sprintGroupName}>{sprint.name || 'Unnamed Sprint'}</span>
                              <span style={styles.sprintGroupMeta}>
                                {sprintBacklogs.length} task{sprintBacklogs.length !== 1 ? 's' : ''} • {completionRate}% complete
                              </span>
                            </div>
                            <span style={{
                              ...styles.sprintGroupBadge,
                              background: `${sprintStatusColor}15`,
                              color: sprintStatusColor
                            }}>
                              {sprint.status || 'planned'}
                            </span>
                          </div>

                          {/* Backlogs in this sprint */}
                          {sprintBacklogs.map((backlog) => {
                            const assigneeName = backlog.assignee?.name || 'Unassigned';
                            const assigneePosition = backlog.assignee?.position || '';
                            const createdDate = new Date(backlog.createdAt);

                            const displayStatus = backlog.taskStatus || 'pending';
                            let statusLabel = displayStatus.replace('-', ' ');
                            if (displayStatus === 'pending') {
                              statusLabel = 'to do';
                            } else if (displayStatus === 'completed') {
                              statusLabel = 'completed';
                            }

                            // Status color
                            let statusColor = '#e2e8f0';
                            let statusTextColor = '#4a5568';
                            if (displayStatus === 'in-progress') {
                              statusColor = '#879BFF';
                              statusTextColor = 'white';
                            } else if (displayStatus === 'completed') {
                              statusColor = '#48bb78';
                              statusTextColor = 'white';
                            }

                            // Priority color
                            let priorityColor = '#22543d';
                            if (backlog.priority === 'high') priorityColor = '#c53030';
                            else if (backlog.priority === 'medium') priorityColor = '#c05621';

                            return (
                              <div key={backlog._id} style={styles.backlogItemMinimalNested}>
                                <div style={styles.backlogItemHeader}>
                                  <div style={styles.backlogTitleRow}>
                                    <div style={styles.backlogTitleSection}>
                                      <span style={{
                                        ...styles.priorityIndicator,
                                        background: priorityColor
                                      }}></span>
                                      <h4 style={styles.backlogTitleMinimal}>{backlog.title}</h4>
                                    </div>
                                    <span style={{
                                      ...styles.statusBadgeMinimal,
                                      background: statusColor,
                                      color: statusTextColor
                                    }}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  {backlog.description && (
                                    <p style={styles.descriptionMinimal}>{backlog.description}</p>
                                  )}
                                </div>
                                <div style={styles.backlogItemFooter}>
                                  <div style={styles.backlogMetaItems}>
                                    <div style={styles.backlogMetaItem}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.6 }}>
                                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
                                      </svg>
                                      <span>{assigneeName}</span>
                                      {assigneePosition && <span style={styles.metaDivider}>·</span>}
                                      {assigneePosition && <span style={styles.metaSecondary}>{assigneePosition}</span>}
                                    </div>
                                  </div>
                                  <div style={styles.backlogDateInfo}>
                                    <span style={styles.backlogDate}>
                                      {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Backlogs without sprint */}
                    {noSprintBacklogs.length > 0 && (
                      <div style={styles.sprintGroupContainer}>
                        <div style={{
                          ...styles.sprintGroupHeader,
                          borderLeft: '3px solid #cbd5e0'
                        }}>
                          <div style={styles.sprintGroupInfo}>
                            <span style={styles.sprintGroupName}>No Sprint</span>
                            <span style={styles.sprintGroupMeta}>
                              {noSprintBacklogs.length} task{noSprintBacklogs.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span style={{
                            ...styles.sprintGroupBadge,
                            background: '#f1f5f9',
                            color: '#718096'
                          }}>
                            backlog
                          </span>
                        </div>

                        {noSprintBacklogs.map((backlog) => {
                          const assigneeName = backlog.assignee?.name || 'Unassigned';
                          const assigneePosition = backlog.assignee?.position || '';
                          const createdDate = new Date(backlog.createdAt);

                          const displayStatus: string = backlog.taskStatus || backlog.status || 'pending';
                          let statusLabel = displayStatus.replace('-', ' ');
                          if (displayStatus === 'pending') {
                            statusLabel = 'to do';
                          } else if (displayStatus === 'done') {
                            statusLabel = 'completed';
                          }

                          let statusColor = '#e2e8f0';
                          let statusTextColor = '#4a5568';
                          if (displayStatus === 'in-progress') {
                            statusColor = '#879BFF';
                            statusTextColor = 'white';
                          } else if (displayStatus === 'completed' || displayStatus === 'done') {
                            statusColor = '#48bb78';
                            statusTextColor = 'white';
                          }

                          let priorityColor = '#22543d';
                          if (backlog.priority === 'high') priorityColor = '#c53030';
                          else if (backlog.priority === 'medium') priorityColor = '#c05621';

                          return (
                            <div key={backlog._id} style={styles.backlogItemMinimalNested}>
                              <div style={styles.backlogItemHeader}>
                                <div style={styles.backlogTitleRow}>
                                  <div style={styles.backlogTitleSection}>
                                    <span style={{
                                      ...styles.priorityIndicator,
                                      background: priorityColor
                                    }}></span>
                                    <h4 style={styles.backlogTitleMinimal}>{backlog.title}</h4>
                                  </div>
                                  <span style={{
                                    ...styles.statusBadgeMinimal,
                                    background: statusColor,
                                    color: statusTextColor
                                  }}>
                                    {statusLabel}
                                  </span>
                                </div>
                                {backlog.description && (
                                  <p style={styles.descriptionMinimal}>{backlog.description}</p>
                                )}
                              </div>
                              <div style={styles.backlogItemFooter}>
                                <div style={styles.backlogMetaItems}>
                                  <div style={styles.backlogMetaItem}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.6 }}>
                                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
                                    </svg>
                                    <span>{assigneeName}</span>
                                    {assigneePosition && <span style={styles.metaDivider}>·</span>}
                                    {assigneePosition && <span style={styles.metaSecondary}>{assigneePosition}</span>}
                                  </div>
                                </div>
                                <div style={styles.backlogDateInfo}>
                                  <span style={styles.backlogDate}>
                                    {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        <div style={styles.header}>
          <h2 style={styles.title}>Timeline</h2>
          <div style={styles.headerControls}>
            <button
              style={{
                ...styles.ganttButton,
                ...(showGanttChart ? styles.ganttButtonActive : {}),
              }}
              onClick={() => setShowGanttChart(!showGanttChart)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px' }}>
                <path d="M2 0h12v2H2z"/>
                <path d="M2 4h4v1H2z"/>
                <path d="M7 4h5v1H7z"/>
                <path d="M2 6h3v1H2z"/>
                <path d="M6 6h6v1H6z"/>
              </svg>
              {showGanttChart ? 'Hide Gantt Chart' : 'View Gantt Chart'}
            </button>
            <select
              style={styles.filterSelect}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {Array.from(
                new Set(
                  backlogs
                    .filter((b) => {
                      // Admins see all projects
                      if (userRole === 'admin') {
                        return true;
                      }
                      // Managers see projects with backlogs in their sprints OR not in any sprint
                      if (!b.sprint) return true;
                      const sprintId = b.sprint?._id || b.sprint;
                      const managedSprints = sprints.filter((sprint) => {
                        if (!sprint.managers || sprint.managers.length === 0) return false;
                        return sprint.managers.some((manager) => manager._id === currentUserId);
                      });
                      return managedSprints.some((sprint) => sprint._id === sprintId);
                    })
                    .map((b) => b.project)
                )
              )
                .sort()
                .map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {showGanttChart && (
          <div style={styles.ganttContainer}>
            {(() => {
              // Get all projects with their backlogs
              const managedSprints = userRole === 'admin'
                ? sprints
                : sprints.filter((sprint) => {
                    if (!sprint.managers || sprint.managers.length === 0) return false;
                    return sprint.managers.some((manager) => manager._id === currentUserId);
                  });

              const managedSprintIds = managedSprints.map(s => s._id);

              let filteredBacklogs = backlogs.filter((b) => {
                if (userRole === 'admin') return true;
                if (!b.sprint) return true;
                const sprintId = b.sprint._id;
                return managedSprintIds.includes(sprintId);
              });

              if (projectFilter !== 'all') {
                filteredBacklogs = filteredBacklogs.filter((b) => b.project === projectFilter);
              }

              // Group by project and get sprints for each project
              const projectGroups: { [key: string]: { backlogs: Backlog[], sprints: Sprint[] } } = {};
              filteredBacklogs.forEach((backlog) => {
                const projectName = backlog.project || 'Unnamed Project';
                if (!projectGroups[projectName]) {
                  projectGroups[projectName] = { backlogs: [], sprints: [] };
                }
                projectGroups[projectName].backlogs.push(backlog);

                // Add unique sprints for this project
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
                return <div style={styles.empty}>No projects to display in Gantt chart</div>;
              }

              // Get all sprint dates for timeline range
              const allSprints = projectNames.flatMap(name => projectGroups[name].sprints);
              if (allSprints.length === 0) {
                return <div style={styles.empty}>No sprints found for selected projects</div>;
              }

              const allDates = allSprints.flatMap(s => [new Date(s.startDate), new Date(s.endDate)]);
              const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
              const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

              return (
                <>
                  <div style={styles.ganttHeader}>
                    <div style={styles.ganttSprintColumn}>Project Name</div>
                    <div style={styles.ganttTimelineColumn}>
                      <div style={styles.ganttTimelineHeader}>
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
                            const days = endDay - startDay + 1;

                            months.push({ month: monthYear, days });
                            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                          }

                          return months.map((m, i) => (
                            <div key={i} style={{ ...styles.ganttMonth, flex: m.days }}>
                              {m.month}
                            </div>
                          ));
                        })()}
                      </div>
                      <div style={styles.ganttDatesRow}>
                        {(() => {
                          const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          const dates = [];
                          for (let i = 0; i < totalDays; i++) {
                            const date = new Date(minDate);
                            date.setDate(date.getDate() + i);
                            dates.push(date);
                          }

                          const showEvery = totalDays <= 30 ? 1 : 5;

                          return dates.map((date, i) => {
                            const cellWidth = `${100 / totalDays}%`;
                            if (i % showEvery !== 0 && i !== 0 && i !== totalDays - 1) {
                              return <div key={i} style={{ ...styles.ganttDateCell, width: cellWidth, minWidth: '30px' }}></div>;
                            }
                            return (
                              <div key={i} style={{ ...styles.ganttDateCell, width: cellWidth, minWidth: '30px', fontWeight: '600' }}>
                                {date.getDate()}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                  {projectNames.map((projectName) => {
                    const projectData = projectGroups[projectName];
                    const projectSprints = projectData.sprints.sort((a, b) =>
                      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                    );

                    if (projectSprints.length === 0) return null;

                    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <div key={projectName} style={{ marginBottom: '24px' }}>
                        {/* Project Header */}
                        <div style={{
                          ...styles.ganttRow,
                          background: '#f7fafc',
                          borderLeft: '4px solid #879BFF',
                          fontWeight: '600',
                        }}>
                          <div style={styles.ganttSprintColumn}>
                            <div style={{ ...styles.ganttSprintName, fontSize: '16px', color: '#2d3748' }}>
                              {projectName}
                            </div>
                            <div style={{ ...styles.ganttSprintDates, color: '#718096' }}>
                              {projectSprints.length} sprint{projectSprints.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div style={styles.ganttTimelineColumn}>
                          </div>
                        </div>

                        {/* Sprint Rows */}
                        {projectSprints.map((sprint) => {
                          const sprintStart = new Date(sprint.startDate);
                          const sprintEnd = new Date(sprint.endDate);
                          const startOffset = Math.ceil((sprintStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                          const sprintDuration = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                          const leftPercent = (startOffset / totalDays) * 100;
                          const widthPercent = (sprintDuration / totalDays) * 100;

                          // Get backlogs for this sprint
                          const sprintBacklogs = projectData.backlogs.filter((b) => {
                            const backlogSprintId = b.sprint?._id || b.sprint;
                            return String(backlogSprintId) === String(sprint._id);
                          });

                          // Calculate completion
                          const totalTasks = sprintBacklogs.length;
                          const completedTasks = sprintBacklogs.filter(
                            (b) => b.taskStatus === 'completed' || b.status === 'done'
                          ).length;
                          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                          // Get status color
                          let statusColor = '#6B7094'; // planned
                          if (sprint.status === 'active') statusColor = '#FF6495';
                          else if (sprint.status === 'completed') statusColor = '#48bb78';

                          return (
                            <div key={sprint._id} style={{
                              ...styles.ganttRow,
                              paddingLeft: '24px',
                              background: 'white',
                            }}>
                              <div style={styles.ganttSprintColumn}>
                                <div style={{ ...styles.ganttSprintName, fontSize: '14px' }}>
                                  {sprint.name}
                                </div>
                                <div style={styles.ganttSprintDates}>
                                  {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                                </div>
                              </div>
                              <div style={styles.ganttTimelineColumn}>
                                <div style={styles.ganttBarContainer}>
                                  <div
                                    style={{
                                      ...styles.ganttBar,
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      backgroundColor: statusColor,
                                    }}
                                    onClick={() => {
                                      // Expand the project first
                                      setExpandedProjects((prev) => ({
                                        ...prev,
                                        [projectName]: true,
                                      }));
                                      // Then scroll to the sprint
                                      scrollToSprint(sprint._id);
                                    }}
                                  >
                                    <span style={styles.ganttBarLabel}>{completionRate}% complete</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  viewToggle: {
    display: 'flex',
    gap: '8px',
    background: '#f7fafc',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  toggleButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'transparent',
    color: '#718096',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    background: 'white',
    color: '#879BFF',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #d3d3d3',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'white',
    outline: 'none',
  },
  projectMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
    opacity: 0.95,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  assigneeList: {
    fontSize: '14px',
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  sprintSection: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  sprintHeader: {
    padding: '24px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sprintTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sprintNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sprintName: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    color: 'white',
  },
  sprintStatusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    background: 'rgba(255, 255, 255, 0.25)',
  },
  sprintDateRange: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    opacity: 0.95,
  },
  sprintCount: {
    fontSize: '18px',
    fontWeight: '600',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
  },
  timelineItems: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  timelineItem: {
    display: 'grid',
    gridTemplateColumns: '140px 40px 1fr',
    gap: '20px',
    position: 'relative',
  },
  dateColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  dateBox: {
    background: '#f7fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
    minWidth: '100px',
  },
  dateMonth: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#879BFF',
    letterSpacing: '0.5px',
  },
  dateDay: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2d3748',
    lineHeight: '1',
    margin: '4px 0',
  },
  dateYear: {
    fontSize: '13px',
    color: '#718096',
    fontWeight: '500',
  },
  durationBox: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '2px solid #e2e8f0',
    textAlign: 'center',
  },
  durationLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  durationValue: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#16a34a',
    lineHeight: '1.2',
  },
  timeAgo: {
    fontSize: '12px',
    color: '#a0aec0',
    fontWeight: '500',
  },
  timelineMarker: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#879BFF',
    border: '4px solid #e2e8f0',
    position: 'relative',
    top: '24px',
  },
  timelineContent: {
    background: '#f7fafc',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '16px',
  },
  contentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  fullDateTime: {
    fontSize: '12px',
    color: '#a0aec0',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  dateBoxTimestamps: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dateBoxTimestamp: {
    textAlign: 'center',
  },
  timestampLabelSmall: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#879BFF',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  timestampDateSmall: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1px',
  },
  timestampTimeSmall: {
    fontSize: '10px',
    color: '#718096',
    fontWeight: '500',
  },
  timelineMeta: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priority_high: {
    background: '#fed7d7',
    color: '#c53030',
  },
  priority_medium: {
    background: '#feebc8',
    color: '#c05621',
  },
  priority_low: {
    background: '#c6f6d5',
    color: '#22543d',
  },
  status_pending: {
    background: '#e2e8f0',
    color: '#4a5568',
  },
  'status_in-progress': {
    background: '#CDE5F380',
    color: '#879BFF',
  },
  status_completed: {
    background: '#48bb78',
    color: 'white',
  },
  status_done: {
    background: '#48bb78',
    color: 'white',
  },
  status_active: {
    background: 'rgba(255, 255, 255, 0.25)',
  },
  status_planned: {
    background: 'rgba(255, 255, 255, 0.25)',
  },
  info: {
    padding: '6px 12px',
    background: 'white',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#4a5568',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px',
    color: '#a0aec0',
  },
  progressBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
  },
  progressBarBackground: {
    flex: 1,
    height: '8px',
    background: 'rgba(226, 232, 240, 0.5)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  sprintHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  chevron: {
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
  },
  ganttButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #879BFF',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#879BFF',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  ganttButtonActive: {
    background: '#879BFF',
    color: 'white',
  },
  ganttContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflowX: 'auto',
    overflowY: 'visible',
    marginBottom: '32px',
  },
  ganttHeader: {
    display: 'flex',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '12px',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#4a5568',
  },
  ganttSprintColumn: {
    width: '250px',
    flexShrink: 0,
    paddingRight: '16px',
  },
  ganttTimelineColumn: {
    flex: 1,
    minWidth: 0,
  },
  ganttTimelineHeader: {
    display: 'flex',
    gap: '1px',
    background: '#f7fafc',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  ganttMonth: {
    padding: '8px',
    textAlign: 'center',
    background: 'white',
    borderRight: '1px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: '500',
  },
  ganttDatesRow: {
    display: 'flex',
    background: '#f7fafc',
    borderTop: '1px solid #e2e8f0',
  },
  ganttDateCell: {
    padding: '6px 2px',
    textAlign: 'center',
    fontSize: '11px',
    color: '#718096',
    borderRight: '1px solid #e2e8f0',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  ganttRow: {
    display: 'flex',
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  ganttSprintName: {
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '4px',
    fontSize: '14px',
  },
  ganttSprintDates: {
    fontSize: '12px',
    color: '#718096',
  },
  ganttBarContainer: {
    position: 'relative',
    height: '36px',
    background: '#f7fafc',
    borderRadius: '6px',
    overflow: 'visible',
  },
  ganttBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  ganttBarLabel: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  },
  sprintHeaderMinimal: {
    padding: '20px 24px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sprintMainInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sprintTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  sprintNameMinimal: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  sprintMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sprintStatusBadgeMinimal: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sprintDateMinimal: {
    fontSize: '13px',
    color: '#718096',
    fontWeight: '500',
  },
  sprintStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2d3748',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  statDivider: {
    width: '1px',
    height: '32px',
    background: '#e2e8f0',
  },
  chevronMinimal: {
    fontSize: '24px',
    fontWeight: '300',
    transition: 'transform 0.2s',
  },
  progressBarMinimal: {
    height: '4px',
    background: '#f1f5f9',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarFillMinimal: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  timelineItemsMinimal: {
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    borderTop: '1px solid #f1f5f9',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  backlogItemMinimal: {
    padding: '16px 24px',
    borderBottom: '1px solid #f1f5f9',
    background: 'white',
    transition: 'background 0.2s ease',
  },
  backlogItemHeader: {
    marginBottom: '12px',
  },
  backlogTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
  },
  backlogTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  priorityIndicator: {
    width: '3px',
    height: '20px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  backlogTitleMinimal: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  statusBadgeMinimal: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 0,
  },
  descriptionMinimal: {
    fontSize: '13px',
    color: '#718096',
    lineHeight: '1.5',
    margin: 0,
    paddingLeft: '13px',
  },
  backlogItemFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    paddingLeft: '13px',
  },
  backlogMetaItems: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  backlogMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#4a5568',
    fontWeight: '500',
  },
  metaDivider: {
    color: '#cbd5e0',
    margin: '0 2px',
  },
  metaSecondary: {
    color: '#a0aec0',
    fontSize: '11px',
  },
  backlogDateInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  backlogDate: {
    fontSize: '11px',
    color: '#a0aec0',
    fontWeight: '500',
  },
  sprintGroupContainer: {
    marginBottom: '16px',
  },
  sprintGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
    borderRadius: '6px 6px 0 0',
  },
  sprintGroupInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sprintGroupName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  sprintGroupMeta: {
    fontSize: '12px',
    color: '#718096',
  },
  sprintGroupBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  backlogItemMinimalNested: {
    padding: '16px 24px 16px 32px',
    borderBottom: '1px solid #f1f5f9',
    background: 'white',
    transition: 'background 0.2s ease',
  },
  highlightedSprint: {
    boxShadow: '0 0 0 3px #879BFF40, 0 4px 16px rgba(135, 155, 255, 0.3)',
    transform: 'scale(1.01)',
    transition: 'all 0.3s ease',
  },
};
