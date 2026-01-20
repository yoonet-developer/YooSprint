// Card frame styles that can be applied across the app

export interface FrameStyle {
  border: string;
  boxShadow?: string;
  background?: string;
  accentColor: string; // Color for the top bar on cards
  accentGradient?: string; // Optional gradient for rainbow effect
  animation?: string; // Optional animation name (e.g., 'rainbow', 'frost')
}

export const cardFrames: { [key: string]: FrameStyle } = {
  default: {
    border: '1px solid #e2e8f0',
    accentColor: '#879BFF',
  },
  golden: {
    border: '2px solid #fbbf24',
    boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
    accentColor: '#fbbf24',
  },
  emerald: {
    border: '2px solid #10b981',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
    accentColor: '#10b981',
  },
  purple: {
    border: '2px solid #8b5cf6',
    boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
    accentColor: '#8b5cf6',
  },
  rainbow: {
    border: '2px solid transparent',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd) border-box',
    accentColor: '#ff6b6b',
    accentGradient: 'linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd)',
  },
  neon: {
    border: '2px solid #00ff88',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.5), inset 0 0 15px rgba(0, 255, 136, 0.1)',
    accentColor: '#00ff88',
  },
  diamond: {
    border: '2px solid #60a5fa',
    boxShadow: '0 0 20px rgba(96, 165, 250, 0.4)',
    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.05) 0%, white 50%, rgba(96, 165, 250, 0.05) 100%)',
    accentColor: '#60a5fa',
  },
  fire: {
    border: '2px solid #f97316',
    boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)',
    background: 'linear-gradient(to top, rgba(249, 115, 22, 0.1), white)',
    accentColor: '#f97316',
  },
  // Hero Frames
  frost: {
    border: '2px solid #06b6d4',
    boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, white 50%, rgba(14, 165, 233, 0.08) 100%)',
    accentColor: '#06b6d4',
  },
  shadow: {
    border: '2px solid #374151',
    boxShadow: '0 0 20px rgba(55, 65, 81, 0.5)',
    background: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.05), white)',
    accentColor: '#374151',
  },
  rose: {
    border: '2px solid #f43f5e',
    boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)',
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, white 100%)',
    accentColor: '#f43f5e',
  },
  sunset: {
    border: '2px solid transparent',
    boxShadow: '0 0 15px rgba(251, 146, 60, 0.4)',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #fb923c, #f43f5e, #a855f7) border-box',
    accentColor: '#fb923c',
    accentGradient: 'linear-gradient(90deg, #fb923c, #f43f5e, #a855f7)',
  },
  ocean: {
    border: '2px solid #0284c7',
    boxShadow: '0 0 18px rgba(2, 132, 199, 0.4)',
    background: 'linear-gradient(to bottom, rgba(2, 132, 199, 0.08), white 60%, rgba(14, 165, 233, 0.05))',
    accentColor: '#0284c7',
  },
  cosmic: {
    border: '2px solid transparent',
    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7, #ec4899) border-box',
    accentColor: '#8b5cf6',
    accentGradient: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #ec4899)',
  },
};

// Get the selected frame from localStorage
export const getSelectedFrame = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedCardFrame') || 'default';
  }
  return 'default';
};

// Get the frame style for the selected frame
export const getSelectedFrameStyle = (): FrameStyle => {
  const frameId = getSelectedFrame();
  return cardFrames[frameId] || cardFrames.default;
};

// CSS animation for rainbow frame
export const rainbowAnimation = `
  @keyframes rainbowShift {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }
`;

// Check if rainbow animation should be applied
export const isRainbowFrame = (): boolean => {
  return getSelectedFrame() === 'rainbow';
};
