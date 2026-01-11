import { Category, PrimitiveType, ShapeDefinition } from './types';

// Helper for consistent colors
const COLOR_PRIMARY = '#60a5fa'; // Blue-400
const COLOR_DARK = '#3b82f6';    // Blue-500
const COLOR_ACCENT = '#93c5fd';  // Blue-300
const COLOR_WARN = '#fca5a5';    // Red-300 (for cuts/differentiation)

// Empty initial categories as requested
export const SHAPE_CATEGORIES: Category[] = [
  {
    id: 'basic',
    name: '基础组合体',
    shapes: []
  },
  {
    id: 'mechanical',
    name: '机械零件',
    shapes: []
  },
  {
    id: 'custom',
    name: '我的收藏',
    shapes: []
  }
];