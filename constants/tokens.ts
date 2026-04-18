export const TOKENS = {
  colors: {
    // Brand Shades
    primary: 'hsl(145, 100%, 39%)', // Vivid Green
    primaryGlow: 'hsl(145, 100%, 45%)',
    primarySoft: 'hsl(145, 30%, 96%)',
    
    white: '#FFFFFF',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#F1F5F9',
    
    // Status Tones
    success: {
      bg: 'hsl(145, 100%, 96%)',
      text: 'hsl(145, 100%, 30%)',
      border: 'hsl(145, 50%, 90%)',
    },
    warning: {
      bg: 'hsl(35, 100%, 96%)',
      text: 'hsl(35, 100%, 35%)',
      border: 'hsl(35, 50%, 90%)',
    },
    danger: {
      bg: 'hsl(0, 100%, 97%)',
      text: 'hsl(0, 80%, 45%)',
      border: 'hsl(0, 50%, 92%)',
    },
    info: {
      bg: 'hsl(210, 100%, 97%)',
      text: 'hsl(210, 80%, 40%)',
      border: 'hsl(210, 50%, 92%)',
    },
    
    // Grayscale
    text: {
      primary: '#0D1B2A',
      secondary: '#64748B',
      muted: '#94A3B8',
    },
  },
  
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    glow: {
      shadowColor: 'hsl(145, 100%, 39%)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 999,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};
