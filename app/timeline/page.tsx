'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
}

interface SprintGroup {
  sprint: any;
  items: Backlog[];
}

export default function TimelinePage() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'project';

  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'project' | 'sprint'>(view as 'project' | 'sprint');
  const [sprintFilter, setSprintFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState<{ [key: string]: boolean }>({});
  const [expandedSprints, setExpandedSprints] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update viewMode when URL parameter changes
    if (view === 'sprint' || view === 'project') {
      setViewMode(view);
    }
  }, [view]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

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
        setSprints(sprintsData.sprints);
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

  const renderProjectTimeline = () => {
    // Show all backlogs, not just ongoing ones
    let filteredBacklogs = backlogs;

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
              ...styles.sprintHeader,
              background: 'white',
              borderLeft: `6px solid ${statusColor}`,
              color: 'rgb(45, 55, 72)',
              cursor: 'pointer',
            }}
            onClick={() => toggleProjectExpansion(projectName)}
          >
            <div style={styles.sprintTitle}>
              <div style={styles.sprintNameRow}>
                <h3 style={{ ...styles.sprintName, color: 'rgb(45, 55, 72)' }}>{projectName}</h3>
                <span style={{
                  ...styles.sprintStatusBadge,
                  background: statusColor,
                  color: 'white'
                }}>
                  {projectStatus}
                </span>
              </div>
              <div style={styles.projectMeta}>
                <div style={styles.metaItem}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    style={{ marginRight: '6px' }}
                  >
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
                  </svg>
                  <span style={styles.assigneeList}>
                    {assignees.size > 0
                      ? Array.from(assignees).join(', ')
                      : 'No assignees'}
                  </span>
                </div>
                <div style={styles.metaItem}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    style={{ marginRight: '6px' }}
                  >
                    <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                  </svg>
                  <span>
                    Sprint{sprintSet.size !== 1 ? 's' : ''}: {sprintSet.size > 0
                      ? Array.from(sprintSet).join(', ')
                      : 'No sprint assigned'}
                  </span>
                </div>
              </div>
              <div style={styles.progressBarContainer}>
                <div style={styles.progressBarBackground}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${progressPercentage}%`,
                      background: statusColor,
                    }}
                  ></div>
                </div>
                <span style={{ ...styles.progressText, color: 'rgb(45, 55, 72)' }}>
                  {completedTasks} / {totalTasks} tasks completed ({progressPercentage}%)
                </span>
              </div>
            </div>
            <div style={styles.sprintHeaderRight}>
              <span style={{ ...styles.sprintCount, color: 'rgb(45, 55, 72)', background: 'rgba(226, 232, 240, 0.5)' }}>
                {totalTasks} task{totalTasks !== 1 ? 's' : ''}
              </span>
              <span style={{ ...styles.chevron, color: 'rgb(45, 55, 72)' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>
          </div>
          {isExpanded && (
            <div style={styles.timelineItems}>
              {projectBacklogs.map((backlog) => {
                const assigneeName = backlog.assignee?.name || 'Unassigned';
                const assigneePosition = backlog.assignee?.position || 'Team Member';
                const createdDate = new Date(backlog.createdAt);
                const timeAgo = getTimeAgo(createdDate);
                const fullDate = formatDateTime(backlog.createdAt);

                const displayStatus = backlog.taskStatus || backlog.status || 'pending';
                let statusLabel = displayStatus.replace('-', ' ');
                if (displayStatus === 'pending') {
                  statusLabel = 'to do';
                } else if (displayStatus === 'done') {
                  statusLabel = 'completed';
                }

                const sprintName = backlog.sprint?.name || 'No Sprint';
                const sprintStatus = backlog.sprint?.status || '';

                return (
                  <div key={backlog._id} style={styles.timelineItem}>
                    <div style={styles.dateColumn}>
                      <div style={styles.dateBox}>
                        <div style={styles.dateMonth}>
                          {createdDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                        </div>
                        <div style={styles.dateDay}>{createdDate.getDate()}</div>
                        <div style={styles.dateYear}>{createdDate.getFullYear()}</div>
                      </div>
                      <div style={styles.timeAgo}>{timeAgo}</div>
                    </div>
                    <div style={styles.timelineMarker}></div>
                    <div style={styles.timelineContent}>
                      <div style={styles.contentHeader}>
                        <h4 style={styles.contentTitle}>{backlog.title}</h4>
                        <span style={styles.fullDateTime}>{fullDate}</span>
                      </div>
                      <p style={styles.description}>{backlog.description || 'No description'}</p>

                      <div style={styles.timelineMeta}>
                        <span style={{ ...styles.badge, ...styles[`priority_${backlog.priority}`] }}>
                          {backlog.priority}
                        </span>
                        <span style={{ ...styles.badge, ...styles[`status_${displayStatus}`] }}>
                          {statusLabel}
                        </span>
                        <span style={styles.info}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            style={{ marginRight: '4px', verticalAlign: 'middle' }}
                          >
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
                          </svg>
                          {assigneeName} ({assigneePosition})
                        </span>
                        <span style={styles.info}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            style={{ marginRight: '4px', verticalAlign: 'middle' }}
                          >
                            <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                          </svg>
                          {sprintName} {sprintStatus && `(${sprintStatus})`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  const renderSprintTimeline = () => {
    // Get all backlogs that are in a sprint
    let filteredBacklogs = backlogs.filter((b) => b.sprint);

    if (sprintFilter !== 'all') {
      filteredBacklogs = filteredBacklogs.filter((b) => {
        const sprintId = b.sprint?._id || b.sprint;
        return String(sprintId) === String(sprintFilter);
      });
    }

    // Sort by creation date (oldest first)
    const sortedBacklogs = [...filteredBacklogs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (sortedBacklogs.length === 0) {
      return (
        <div style={styles.empty}>
          No sprint items found. Add backlog items to a sprint to see them here.
        </div>
      );
    }

    // Group backlogs by sprint
    const backlogsBySprint: { [key: string]: SprintGroup } = {};
    sortedBacklogs.forEach((backlog) => {
      const sprintId = backlog.sprint?._id || backlog.sprint;
      if (sprintId && !backlogsBySprint[sprintId]) {
        // Find the full sprint details from the sprints array
        const fullSprintDetails = sprints.find(s => s._id === sprintId);
        backlogsBySprint[sprintId] = {
          sprint: fullSprintDetails || backlog.sprint,
          items: [],
        };
      }
      if (sprintId) {
        backlogsBySprint[sprintId].items.push(backlog);
      }
    });

    // Sort sprints by start date
    const sortedSprintIds = Object.keys(backlogsBySprint).sort((a, b) => {
      const sprintA = backlogsBySprint[a].sprint;
      const sprintB = backlogsBySprint[b].sprint;
      const dateA = sprintA.startDate ? new Date(sprintA.startDate) : new Date(0);
      const dateB = sprintB.startDate ? new Date(sprintB.startDate) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedSprintIds.map((sprintId) => {
      const sprintGroup = backlogsBySprint[sprintId];
      const sprint = sprintGroup.sprint;
      const sprintBacklogs = sprintGroup.items;

      const sprintName = sprint.name || 'Unnamed Sprint';
      const sprintStatus = sprint.status || 'unknown';
      const startDate = sprint.startDate ? formatDate(sprint.startDate) : 'No start date';
      const endDate = sprint.endDate ? formatDate(sprint.endDate) : 'No end date';
      const dateRangeText = `${startDate} - ${endDate}`;

      // Calculate progress
      const totalTasks = sprintBacklogs.length;
      const completedTasks = sprintBacklogs.filter(
        (b) => b.taskStatus === 'completed' || b.status === 'done'
      ).length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Status color for sprint header
      let statusColor = '#6B7094'; // planned
      if (sprintStatus === 'active') statusColor = '#FF6495';
      else if (sprintStatus === 'completed') statusColor = '#48bb78';

      const isExpanded = expandedSprints[sprintId] === true; // Default to collapsed

      return (
        <div key={sprintId} style={styles.sprintSection}>
          <div
            style={{
              ...styles.sprintHeader,
              background: 'white',
              borderLeft: `6px solid ${statusColor}`,
              color: 'rgb(45, 55, 72)',
              cursor: 'pointer',
            }}
            onClick={() => toggleSprintExpansion(sprintId)}
          >
            <div style={styles.sprintTitle}>
              <div style={styles.sprintNameRow}>
                <h3 style={{ ...styles.sprintName, color: 'rgb(45, 55, 72)' }}>{sprintName}</h3>
                <span style={{
                  ...styles.sprintStatusBadge,
                  background: statusColor,
                  color: 'white'
                }}>
                  {sprintStatus}
                </span>
              </div>
              <span style={{ ...styles.sprintDateRange, color: 'rgb(45, 55, 72)' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  style={{ marginRight: '8px' }}
                >
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                </svg>
                {dateRangeText}
              </span>
              <div style={styles.progressBarContainer}>
                <div style={styles.progressBarBackground}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${progressPercentage}%`,
                      background: statusColor,
                    }}
                  ></div>
                </div>
                <span style={{ ...styles.progressText, color: 'rgb(45, 55, 72)' }}>
                  {completedTasks} / {totalTasks} completed ({progressPercentage}%)
                </span>
              </div>
            </div>
            <div style={styles.sprintHeaderRight}>
              <span style={{ ...styles.sprintCount, color: 'rgb(45, 55, 72)', background: 'rgba(226, 232, 240, 0.5)' }}>
                {sprintBacklogs.length} item{sprintBacklogs.length !== 1 ? 's' : ''}
              </span>
              <span style={{ ...styles.chevron, color: 'rgb(45, 55, 72)' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>
          </div>
          {isExpanded && <div style={styles.timelineItems}>
            {sprintBacklogs.map((backlog) => {
              const assigneeName = backlog.assignee?.name || 'Unassigned';
              const createdDate = new Date(backlog.createdAt);
              const timeAgo = getTimeAgo(createdDate);
              const fullDate = formatDateTime(backlog.createdAt);

              const displayStatus = backlog.taskStatus || backlog.status || 'pending';
              let statusLabel = displayStatus.replace('-', ' ');
              if (displayStatus === 'pending') {
                statusLabel = 'to do';
              } else if (displayStatus === 'done') {
                statusLabel = 'completed';
              }

              const projectName = backlog.project || 'No Project';

              return (
                <div key={backlog._id} style={styles.timelineItem}>
                  <div style={styles.dateColumn}>
                    <div style={styles.dateBox}>
                      <div style={styles.dateMonth}>
                        {createdDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                      <div style={styles.dateDay}>{createdDate.getDate()}</div>
                      <div style={styles.dateYear}>{createdDate.getFullYear()}</div>
                    </div>
                    <div style={styles.timeAgo}>{timeAgo}</div>
                  </div>
                  <div style={styles.timelineMarker}></div>
                  <div style={styles.timelineContent}>
                    <div style={styles.contentHeader}>
                      <h4 style={styles.contentTitle}>{backlog.title}</h4>
                      <span style={styles.fullDateTime}>{fullDate}</span>
                    </div>
                    <p style={styles.description}>{backlog.description || 'No description'}</p>

                    <div style={styles.timelineMeta}>
                      <span style={{ ...styles.badge, ...styles[`priority_${backlog.priority}`] }}>
                        {backlog.priority}
                      </span>
                      <span style={{ ...styles.badge, ...styles[`status_${displayStatus}`] }}>
                        {statusLabel}
                      </span>
                      <span style={styles.info}>{assigneeName}</span>
                      <span style={styles.info}>{projectName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>}
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
          <h2 style={styles.title}>
            {viewMode === 'project' ? 'Project Timeline' : 'Sprint Timeline'}
          </h2>
          {viewMode === 'project' && (
            <select
              style={styles.filterSelect}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {Array.from(new Set(backlogs.map((b) => b.project))).sort().map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          )}
          {viewMode === 'sprint' && (
            <select
              style={styles.filterSelect}
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
            >
              <option value="all">All Sprints</option>
              {sprints.map((sprint) => (
                <option key={sprint._id} value={sprint._id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.timelineContainer}>
          {viewMode === 'project' ? renderProjectTimeline() : renderSprintTimeline()}
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
  status_completed: {
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
};
