'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/shared/AppLayout';

// SVG Icons
const Icons = {
  target: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  star: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  trophy: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  bolt: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  medal: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/>
      <path d="M11 12 5.12 2.2"/>
      <path d="m13 12 5.88-9.8"/>
      <path d="M8 7h8"/>
      <circle cx="12" cy="17" r="5"/>
      <path d="M12 18v-2h-.5"/>
    </svg>
  ),
  clock: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  flame: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  ),
  rocket: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  check: (color: string) => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  lock: (color: string) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  // Frame Icons (Heroicons style)
  sparkles: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd"/>
    </svg>
  ),
  sun: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
    </svg>
  ),
  moon: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
    </svg>
  ),
  heart: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/>
    </svg>
  ),
  beaker: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 01-.879 2.121l-2.377 2.377a9.845 9.845 0 015.091 1.013 8.315 8.315 0 005.713.636l.285-.071-3.954-3.955a3 3 0 01-.879-2.121v-5.02a23.614 23.614 0 00-3 0zm4.5.138a.75.75 0 00.093-1.495A24.837 24.837 0 0012 2.25a25.048 25.048 0 00-3.093.191A.75.75 0 009 3.936v4.882a1.5 1.5 0 01-.44 1.06l-6.293 6.294c-1.62 1.621-.903 4.475 1.471 4.88 2.686.46 5.447.698 8.262.698 2.816 0 5.576-.239 8.262-.697 2.373-.406 3.092-3.26 1.471-4.881L15.44 9.879A1.5 1.5 0 0115 8.818V3.936z" clipRule="evenodd"/>
    </svg>
  ),
  globe: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z"/>
    </svg>
  ),
  bolt2: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd"/>
    </svg>
  ),
  // More frame icons
  squares: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd"/>
    </svg>
  ),
  crown: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17l2-8 5 4 3-6 3 6 5-4 2 8z"/>
      <path d="M2 17h20v2H2z"/>
    </svg>
  ),
  leaf: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd"/>
    </svg>
  ),
  gem: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 18 3 22 9 12 22 2 9"/>
      <path d="M2 9h20"/>
      <path d="M12 22L6 9"/>
      <path d="M12 22l6-13"/>
      <path d="M12 3v6"/>
    </svg>
  ),
  paintbrush: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M20.599 1.5c-.376 0-.743.111-1.055.32l-5.08 3.385a18.747 18.747 0 00-3.471 2.987 10.04 10.04 0 014.815 4.815 18.748 18.748 0 002.987-3.472l3.386-5.079A1.902 1.902 0 0020.599 1.5zm-8.3 14.025a18.76 18.76 0 001.896-1.207 8.026 8.026 0 00-4.513-4.513A18.75 18.75 0 008.475 11.7l-.278.5a5.26 5.26 0 013.601 3.602l.5-.278zM6.75 13.5A3.75 3.75 0 003 17.25a1.5 1.5 0 01-1.601 1.497.75.75 0 00-.7 1.123 5.25 5.25 0 009.8-2.62 3.75 3.75 0 00-3.75-3.75z" clipRule="evenodd"/>
    </svg>
  ),
  zap: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} stroke="none">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd"/>
    </svg>
  ),
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Icons;
  iconColor: string;
  requirement: number;
  current: number;
  unlocked: boolean;
}

interface CardFrame {
  id: string;
  name: string;
  description: string;
  icon?: keyof typeof Icons;
  iconColor?: string;
  style: React.CSSProperties;
  animation?: string;
  unlockRequirement?: string;
  unlocked: boolean;
}

interface Stats {
  tasksCompleted: number;
  sprintsCompleted: number;
  projectsCreated: number;
  totalTimeTracked: number;
  backlogsCreated: number;
}

export default function ThemePage() {
  const [selectedFrame, setSelectedFrame] = useState<string>('default');
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    sprintsCompleted: 0,
    projectsCreated: 0,
    totalTimeTracked: 0,
    backlogsCreated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    // Load selected frame from localStorage
    const savedFrame = localStorage.getItem('selectedCardFrame');
    if (savedFrame) {
      setSelectedFrame(savedFrame);
    }

    // Fetch user stats for achievements
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Fetch backlogs to calculate stats
      const backlogsRes = await fetch('/api/backlogs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const backlogsData = await backlogsRes.json();

      // Fetch sprints
      const sprintsRes = await fetch('/api/sprints', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const sprintsData = await sprintsRes.json();

      // Fetch projects
      const projectsRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const projectsData = await projectsRes.json();

      if (backlogsData.success && sprintsData.success && projectsData.success) {
        const myBacklogs = backlogsData.backlogs.filter(
          (b: any) => b.assignee?._id === user.id
        );
        const completedTasks = myBacklogs.filter(
          (b: any) => b.taskStatus === 'completed'
        ).length;
        const totalTime = myBacklogs.reduce(
          (sum: number, b: any) => sum + (b.timeTracked || 0),
          0
        );
        const completedSprints = sprintsData.sprints.filter(
          (s: any) => s.status === 'completed'
        ).length;

        setStats({
          tasksCompleted: completedTasks,
          sprintsCompleted: completedSprints,
          projectsCreated: projectsData.projects.length,
          totalTimeTracked: totalTime,
          backlogsCreated: backlogsData.backlogs.length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievements: Achievement[] = [
    {
      id: 'first-task',
      name: 'First Steps',
      description: 'Complete your first task',
      icon: 'target',
      iconColor: '#879BFF',
      requirement: 1,
      current: stats.tasksCompleted,
      unlocked: stats.tasksCompleted >= 1,
    },
    {
      id: 'task-master',
      name: 'Task Master',
      description: 'Complete 10 tasks',
      icon: 'star',
      iconColor: '#fbbf24',
      requirement: 10,
      current: stats.tasksCompleted,
      unlocked: stats.tasksCompleted >= 10,
    },
    {
      id: 'task-legend',
      name: 'Task Legend',
      description: 'Complete 50 tasks',
      icon: 'trophy',
      iconColor: '#f59e0b',
      requirement: 50,
      current: stats.tasksCompleted,
      unlocked: stats.tasksCompleted >= 50,
    },
    {
      id: 'sprint-champion',
      name: 'Sprint Champion',
      description: 'Complete a sprint',
      icon: 'bolt',
      iconColor: '#8b5cf6',
      requirement: 1,
      current: stats.sprintsCompleted,
      unlocked: stats.sprintsCompleted >= 1,
    },
    {
      id: 'sprint-veteran',
      name: 'Sprint Veteran',
      description: 'Complete 5 sprints',
      icon: 'medal',
      iconColor: '#ec4899',
      requirement: 5,
      current: stats.sprintsCompleted,
      unlocked: stats.sprintsCompleted >= 5,
    },
    {
      id: 'time-tracker',
      name: 'Time Tracker',
      description: 'Track 10+ hours of work',
      icon: 'clock',
      iconColor: '#10b981',
      requirement: 36000,
      current: stats.totalTimeTracked,
      unlocked: stats.totalTimeTracked >= 36000,
    },
    {
      id: 'dedicated',
      name: 'Dedicated',
      description: 'Track 100+ hours of work',
      icon: 'flame',
      iconColor: '#f97316',
      requirement: 360000,
      current: stats.totalTimeTracked,
      unlocked: stats.totalTimeTracked >= 360000,
    },
    {
      id: 'project-pioneer',
      name: 'Project Pioneer',
      description: 'Have 5+ projects created',
      icon: 'rocket',
      iconColor: '#60a5fa',
      requirement: 5,
      current: stats.projectsCreated,
      unlocked: stats.projectsCreated >= 5,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const cardFrames: CardFrame[] = [
    {
      id: 'default',
      name: 'Default',
      description: 'Clean and simple border',
      icon: 'squares',
      iconColor: '#6b7280',
      style: { border: '1px solid #e2e8f0' },
      unlocked: true,
    },
    {
      id: 'golden',
      name: 'Golden',
      description: 'Elegant gold border with glow',
      icon: 'crown',
      iconColor: '#fbbf24',
      style: {
        border: '2px solid #fbbf24',
        boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
      },
      unlockRequirement: 'Complete 1 task',
      unlocked: stats.tasksCompleted >= 1,
    },
    {
      id: 'emerald',
      name: 'Emerald',
      description: 'Fresh green border',
      icon: 'leaf',
      iconColor: '#10b981',
      style: {
        border: '2px solid #10b981',
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
      },
      unlockRequirement: 'Complete 5 tasks',
      unlocked: stats.tasksCompleted >= 5,
    },
    {
      id: 'purple',
      name: 'Royal Purple',
      description: 'Majestic purple border',
      icon: 'star',
      iconColor: '#8b5cf6',
      style: {
        border: '2px solid #8b5cf6',
        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
      },
      unlockRequirement: 'Complete 10 tasks',
      unlocked: stats.tasksCompleted >= 10,
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      description: 'Animated rainbow border',
      icon: 'paintbrush',
      iconColor: '#ec4899',
      style: {
        border: '2px solid transparent',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd) border-box',
      },
      animation: 'rainbow',
      unlockRequirement: 'Complete 25 tasks',
      unlocked: stats.tasksCompleted >= 25,
    },
    {
      id: 'neon',
      name: 'Neon Glow',
      description: 'Bright neon effect',
      icon: 'zap',
      iconColor: '#00ff88',
      style: {
        border: '2px solid #00ff88',
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.5), inset 0 0 15px rgba(0, 255, 136, 0.1)',
      },
      unlockRequirement: 'Complete a sprint',
      unlocked: stats.sprintsCompleted >= 1,
    },
    {
      id: 'diamond',
      name: 'Diamond',
      description: 'Premium diamond pattern',
      icon: 'gem',
      iconColor: '#60a5fa',
      style: {
        border: '2px solid #60a5fa',
        boxShadow: '0 0 20px rgba(96, 165, 250, 0.4)',
        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.05) 0%, transparent 50%, rgba(96, 165, 250, 0.05) 100%)',
      },
      unlockRequirement: 'Track 10+ hours',
      unlocked: stats.totalTimeTracked >= 36000,
    },
    {
      id: 'fire',
      name: 'Fire',
      description: 'Blazing fire effect',
      icon: 'flame',
      iconColor: '#f97316',
      style: {
        border: '2px solid #f97316',
        boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)',
        background: 'linear-gradient(to top, rgba(249, 115, 22, 0.1), transparent)',
      },
      unlockRequirement: 'Complete 50 tasks',
      unlocked: stats.tasksCompleted >= 50,
    },
    // Hero Frames
    {
      id: 'frost',
      name: 'Frost',
      description: 'Falling snowflakes effect',
      icon: 'sparkles',
      iconColor: '#06b6d4',
      style: {
        border: '2px solid #06b6d4',
        boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, transparent 50%, rgba(14, 165, 233, 0.08) 100%)',
      },
      animation: 'frost',
      unlockRequirement: 'Complete 15 tasks',
      unlocked: stats.tasksCompleted >= 15,
    },
    {
      id: 'shadow',
      name: 'Shadow',
      description: 'Dark mysterious aura',
      icon: 'moon',
      iconColor: '#374151',
      style: {
        border: '2px solid #374151',
        boxShadow: '0 0 20px rgba(55, 65, 81, 0.5)',
        background: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.05), transparent)',
      },
      unlockRequirement: 'Complete 3 sprints',
      unlocked: stats.sprintsCompleted >= 3,
    },
    {
      id: 'rose',
      name: 'Rose',
      description: 'Elegant rose bloom',
      icon: 'heart',
      iconColor: '#f43f5e',
      style: {
        border: '2px solid #f43f5e',
        boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, transparent 100%)',
      },
      unlockRequirement: 'Track 5+ hours',
      unlocked: stats.totalTimeTracked >= 18000,
    },
    {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm gradient glow',
      icon: 'sun',
      iconColor: '#fb923c',
      style: {
        border: '2px solid transparent',
        boxShadow: '0 0 15px rgba(251, 146, 60, 0.4)',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #fb923c, #f43f5e, #a855f7) border-box',
      },
      unlockRequirement: 'Complete 30 tasks',
      unlocked: stats.tasksCompleted >= 30,
    },
    {
      id: 'ocean',
      name: 'Ocean',
      description: 'Deep sea waves',
      icon: 'globe',
      iconColor: '#0284c7',
      style: {
        border: '2px solid #0284c7',
        boxShadow: '0 0 18px rgba(2, 132, 199, 0.4)',
        background: 'linear-gradient(to bottom, rgba(2, 132, 199, 0.08), transparent 60%, rgba(14, 165, 233, 0.05))',
      },
      unlockRequirement: 'Track 50+ hours',
      unlocked: stats.totalTimeTracked >= 180000,
    },
    {
      id: 'cosmic',
      name: 'Cosmic',
      description: 'Galaxy gradient effect',
      icon: 'bolt2',
      iconColor: '#8b5cf6',
      style: {
        border: '2px solid transparent',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
        background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7, #ec4899) border-box',
      },
      unlockRequirement: 'Complete 100 tasks',
      unlocked: stats.tasksCompleted >= 100,
    },
  ];

  const handleSelectFrame = (frameId: string) => {
    const frame = cardFrames.find(f => f.id === frameId);
    if (frame && frame.unlocked) {
      setSelectedFrame(frameId);
      localStorage.setItem('selectedCardFrame', frameId);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>Loading theme settings...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes rainbowShift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .rainbow-frame {
          animation: rainbowShift 3s linear infinite;
        }

      `}</style>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Theme & Achievements</h1>
            <p style={styles.subtitle}>Unlock achievements and customize your card frames</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={styles.statsSummary}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>{Icons.trophy('#f59e0b')}</div>
            <div style={styles.summaryContent}>
              <span style={styles.summaryValue}>{unlockedCount}/{achievements.length}</span>
              <span style={styles.summaryLabel}>Achievements</span>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>{Icons.check('#10b981')}</div>
            <div style={styles.summaryContent}>
              <span style={styles.summaryValue}>{stats.tasksCompleted}</span>
              <span style={styles.summaryLabel}>Tasks Completed</span>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>{Icons.bolt('#8b5cf6')}</div>
            <div style={styles.summaryContent}>
              <span style={styles.summaryValue}>{stats.sprintsCompleted}</span>
              <span style={styles.summaryLabel}>Sprints Done</span>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>{Icons.clock('#60a5fa')}</div>
            <div style={styles.summaryContent}>
              <span style={styles.summaryValue}>{formatTime(stats.totalTimeTracked)}</span>
              <span style={styles.summaryLabel}>Time Tracked</span>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Achievements</h2>
          <p style={styles.sectionSubtitle}>Complete milestones to unlock new card frames</p>

          <div style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                style={{
                  ...styles.achievementCard,
                  ...(achievement.unlocked ? styles.achievementUnlocked : styles.achievementLocked),
                }}
              >
                <div style={styles.achievementIcon}>
                  {achievement.unlocked
                    ? Icons[achievement.icon](achievement.iconColor)
                    : Icons.lock('#9ca3af')
                  }
                </div>
                <div style={styles.achievementInfo}>
                  <h3 style={styles.achievementName}>{achievement.name}</h3>
                  <p style={styles.achievementDesc}>{achievement.description}</p>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min((achievement.current / achievement.requirement) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span style={styles.progressText}>
                    {achievement.id.includes('time') || achievement.id === 'dedicated'
                      ? `${formatTime(achievement.current)} / ${formatTime(achievement.requirement)}`
                      : `${Math.min(achievement.current, achievement.requirement)} / ${achievement.requirement}`
                    }
                  </span>
                </div>
                {achievement.unlocked && (
                  <div style={styles.unlockedBadge}>Unlocked!</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card Frames Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Card Frames</h2>
          <p style={styles.sectionSubtitle}>Select a frame to apply to all cards in YooSprint</p>

          <div style={styles.framesGrid}>
            {cardFrames.map((frame) => (
              <div
                key={frame.id}
                onClick={() => handleSelectFrame(frame.id)}
                style={{
                  ...styles.frameCard,
                  ...frame.style,
                  ...(selectedFrame === frame.id ? styles.frameSelected : {}),
                  ...(frame.unlocked ? {} : styles.frameLocked),
                  cursor: frame.unlocked ? 'pointer' : 'not-allowed',
                }}
                className={
                  frame.unlocked && frame.animation
                    ? frame.animation === 'rainbow'
                      ? 'rainbow-frame'
                      : frame.animation === 'frost'
                      ? 'frost-frame'
                      : ''
                    : ''
                }
              >
                {!frame.unlocked && (
                  <div style={styles.lockOverlay}>
                    <div style={styles.lockIcon}>{Icons.lock('#6b7280')}</div>
                    <span style={styles.lockText}>{frame.unlockRequirement}</span>
                  </div>
                )}
                <div style={styles.frameContent}>
                  <div style={styles.frameNameRow}>
                    {frame.icon && frame.iconColor && (
                      <div style={styles.frameIcon}>
                        {Icons[frame.icon](frame.iconColor)}
                      </div>
                    )}
                    <h3 style={styles.frameName}>{frame.name}</h3>
                  </div>
                  <p style={styles.frameDesc}>{frame.description}</p>
                </div>
                {selectedFrame === frame.id && frame.unlocked && (
                  <div style={styles.selectedBadge}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    Active
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div style={styles.successToast}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            Frame applied successfully!
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#718096',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0',
  },
  statsSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  summaryIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px',
  },
  achievementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  achievementCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s',
  },
  achievementUnlocked: {
    borderColor: '#fbbf24',
    boxShadow: '0 0 0 1px #fbbf24, 0 4px 12px rgba(251, 191, 36, 0.15)',
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '40px',
    height: '40px',
  },
  achievementInfo: {
    flex: 1,
    minWidth: 0,
  },
  achievementName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px',
  },
  achievementDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 12px',
  },
  progressBar: {
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #879BFF, #FF6495)',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  unlockedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 10px',
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    color: 'white',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  framesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  frameCard: {
    position: 'relative',
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    transition: 'all 0.2s',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  frameSelected: {
    transform: 'scale(1.02)',
  },
  frameLocked: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    zIndex: 1,
  },
  lockIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    padding: '0 16px',
  },
  frameContent: {
    textAlign: 'center',
  },
  frameNameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  frameIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  frameDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  selectedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: '#10b981',
    color: 'white',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  successToast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
    zIndex: 1000,
  },
};
