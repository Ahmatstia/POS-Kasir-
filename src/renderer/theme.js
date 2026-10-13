// ─── CENTRAL THEME — Google-style Indigo Light ─────────────────────────────────
// All components import { T } from this file.
// To switch themes, only change values here.

export const T = {
  // Backgrounds
  bg:       '#F8FAFC',     // crisp slate-50 page background
  surface:  '#FFFFFF',     // card / panel background
  card:     '#F1F5F9',     // slate-100, nested cards

  // Borders
  border:   '#E2E8F0',     // slate-200, crisp border
  border2:  '#CBD5E1',     // slate-300, clear border

  // Text - high contrast & WCAG-compliant
  text:     '#0F172A',     // slate-900 (ultra crisp primary text)
  sub:      '#334155',     // slate-700 (sharp secondary text)
  muted:    '#64748B',     // slate-500 (WCAG-compliant muted text, never washed out)

  // Primary — Indigo (Google-inspired)
  accent:   '#4F46E5',     // indigo-600
  accentL:  '#6366F1',     // indigo-500 (lighter variant)
  accentBg: '#EEF2FF',     // indigo-50  (tint background)

  // Semantic colors
  green:    '#16A34A',     // success
  red:      '#DC2626',     // error / danger
  blue:     '#2563EB',     // info
  purple:   '#7C3AED',     // misc
  orange:   '#EA580C',     // warning / bulk

  // Sidebar
  sidebarBg:   '#1E1B4B',  // indigo-950 (dark sidebar for contrast)
  sidebarText: '#C7D2FE',  // indigo-200
  sidebarHover:'#312E81',  // indigo-900
  sidebarActive:'#4F46E5', // indigo-600
};

export default T;
