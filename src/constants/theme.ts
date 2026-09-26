/** App colours for light and dark mode. Paper, ink, outline and grid are used by the tracing canvas. */

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FAF7F2',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFE9DF',
    textSecondary: '#6B645A',
    border: '#E4DDD2',
    tint: '#C8372D',
    tintText: '#FFFFFF',
    success: '#2F9E55',
    error: '#D93025',
    hint: '#2F6FDB',
    paper: '#FFFDF8',
    ink: '#1A1A1A',
    outline: '#E2DDD5',
    grid: '#EBC3BD',
  },
  dark: {
    text: '#F4F1EC',
    background: '#121212',
    backgroundElement: '#1E1E1F',
    backgroundSelected: '#2C2B29',
    textSecondary: '#A8A29A',
    border: '#34322F',
    tint: '#E5574B',
    tintText: '#FFFFFF',
    success: '#4CC47A',
    error: '#FF5A4E',
    hint: '#6A9DF5',
    paper: '#1C1B1A',
    ink: '#F4F1EC',
    outline: '#3A3835',
    grid: '#5A3A36',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
