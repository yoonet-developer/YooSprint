'use client';

let inactivityTimer: NodeJS.Timeout | null = null;
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

export function resetInactivityTimer(onTimeout: () => void) {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(() => {
    console.log('Session expired due to inactivity');
    onTimeout();
  }, INACTIVITY_TIMEOUT);
}

export function initializeInactivityMonitoring(onTimeout: () => void) {
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  const handleActivity = () => resetInactivityTimer(onTimeout);

  activityEvents.forEach((event) => {
    document.addEventListener(event, handleActivity, true);
  });

  // Start the timer
  resetInactivityTimer(onTimeout);

  // Return cleanup function
  return () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    activityEvents.forEach((event) => {
      document.removeEventListener(event, handleActivity, true);
    });
  };
}

export function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}
