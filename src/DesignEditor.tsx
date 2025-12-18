import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import './DesignEditor.css';
import CodePanel from './components/CodePanel';
import FileExplorer, { FileNode } from './components/FileExplorer';
import AIChatPanel, { AIChatPanelRef } from './components/AIChatPanel';
import WebContainerPreview, { WebContainerPreviewRef } from './components/WebContainerPreview';
import VisualPropsPanel, { SelectedElement } from './components/VisualPropsPanel';
import { PreviewManager } from './components/EditablePreview';
import type { PreviewManagerRef, SelectedElement as EditableSelectedElement } from './components/EditablePreview/PreviewManager';
import { StylePanel, ElementToolbar, type ElementStyles, type SelectedElementInfo } from './components/StylePanel';
import { RightSidebar } from './components/RightSidebar';
import { formatStyleChangesPrompt } from './lib/prompts/system-prompt';
import { DesignToCodeEngine, createDesignToCodeEngine } from './lib/design-to-code';
import { ErrorAlertsContainer, AlertError } from './components/ActionableAlert';
import { DesignElement as CodeElement } from './utils/codeGenerator';
import { discoverPages, DiscoveredPage } from './lib/pageDiscovery';
import { getProjectById, type Project } from './ProjectsPage';
import { useWebContainer } from './lib/hooks/useWebContainer';
import { useGit } from './lib/hooks/useGit';
import { getWebContainer } from './lib/webcontainer';
import { useAgenticErrors, buildErrorContext } from './lib/hooks/useAgenticErrors';

// API URL for production/development
const API_URL = import.meta.env.PROD
  ? 'https://design-editor-api.eziopappalardo98.workers.dev'
  : 'http://localhost:3333';

// ==========================================
// TYPES
// ==========================================

interface AutoLayout {
  enabled: boolean;
  type: 'stack' | 'grid';
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  align: 'start' | 'center' | 'end' | 'stretch';
  distribute: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  wrap: boolean;
}

interface DesignElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'text' | 'image' | 'frame' | 'component';
  name: string;
  x: number;
  y: number;
  width: number | 'auto' | 'fill';
  height: number | 'auto' | 'fill';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  rotation: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  src?: string;
  locked: boolean;
  visible: boolean;
  parentId: string | null;
  childrenIds: string[];
  autoLayout?: AutoLayout;
  constraints?: {
    horizontal: 'left' | 'right' | 'center' | 'scale' | 'left-right';
    vertical: 'top' | 'bottom' | 'center' | 'scale' | 'top-bottom';
  };
  overflow?: 'visible' | 'hidden' | 'scroll';
  animation?: AnimationKeyframes;
  responsiveOverrides?: ResponsiveOverrides;
}

interface AnimationKeyframes {
  enabled: boolean;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'scroll' | 'hover' | 'click' | 'load';
  keyframes: Keyframe[];
}

// Device Presets
interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'desktop' | 'tablet' | 'phone';
}

const DEVICE_PRESETS: DevicePreset[] = [
  // Desktop
  { id: 'macbook-pro-16', name: 'MacBook Pro 16"', width: 1728, height: 1117, category: 'desktop' },
  { id: 'macbook-pro-14', name: 'MacBook Pro 14"', width: 1512, height: 982, category: 'desktop' },
  { id: 'macbook-air', name: 'MacBook Air', width: 1470, height: 956, category: 'desktop' },
  { id: 'imac-24', name: 'iMac 24"', width: 2048, height: 1152, category: 'desktop' },
  { id: 'desktop-hd', name: 'Desktop HD', width: 1920, height: 1080, category: 'desktop' },
  { id: 'desktop-lg', name: 'Desktop Large', width: 1440, height: 900, category: 'desktop' },
  { id: 'desktop-md', name: 'Desktop', width: 1280, height: 800, category: 'desktop' },
  // Tablet
  { id: 'ipad-pro-13', name: 'iPad Pro 13"', width: 1032, height: 1376, category: 'tablet' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, category: 'tablet' },
  { id: 'ipad-air', name: 'iPad Air', width: 820, height: 1180, category: 'tablet' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 744, height: 1133, category: 'tablet' },
  { id: 'ipad', name: 'iPad', width: 810, height: 1080, category: 'tablet' },
  // Phone - iPhone
  { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932, category: 'phone' },
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852, category: 'phone' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, category: 'phone' },
  { id: 'iphone-14-plus', name: 'iPhone 14 Plus', width: 428, height: 926, category: 'phone' },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, category: 'phone' },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, category: 'phone' },
  // Phone - Android
  { id: 'pixel-8-pro', name: 'Pixel 8 Pro', width: 448, height: 998, category: 'phone' },
  { id: 'pixel-8', name: 'Pixel 8', width: 412, height: 915, category: 'phone' },
  { id: 'galaxy-s24-ultra', name: 'Galaxy S24 Ultra', width: 384, height: 854, category: 'phone' },
  { id: 'galaxy-s24', name: 'Galaxy S24', width: 360, height: 780, category: 'phone' },
  { id: 'galaxy-fold', name: 'Galaxy Z Fold 5', width: 344, height: 882, category: 'phone' },
  { id: 'oneplus-12', name: 'OnePlus 12', width: 412, height: 915, category: 'phone' },
];

// Category icons for toolbar
type DeviceCategory = 'desktop' | 'tablet' | 'phone';

interface Breakpoint {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: DeviceCategory;
}

// Default breakpoints for quick toggle
const BREAKPOINTS: Breakpoint[] = [
  { id: 'desktop', name: 'Desktop', width: 1440, height: 900, icon: 'desktop' },
  { id: 'tablet', name: 'Tablet', width: 810, height: 1080, icon: 'tablet' },
  { id: 'phone', name: 'Phone', width: 393, height: 852, icon: 'phone' },
];

// Responsive overrides for elements
interface ResponsiveOverrides {
  [breakpointId: string]: Partial<{
    width: number | 'auto' | 'fill';
    height: number | 'auto' | 'fill';
    x: number;
    y: number;
    visible: boolean;
    fontSize: number;
    padding: { top: number; right: number; bottom: number; left: number };
    gap: number;
    direction: 'horizontal' | 'vertical';
  }>;
}

// Pages system
interface Page {
  id: string;
  name: string;
  elements: DesignElement[];
}

// Component Library
interface ComponentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail?: string;
  elements: Partial<DesignElement>[];
}

interface ComponentCategory {
  id: string;
  name: string;
  icon: keyof typeof Icons;
  components: ComponentTemplate[];
}

// Component Library Data
const COMPONENT_LIBRARY: ComponentCategory[] = [
  {
    id: 'sections',
    name: 'Sections',
    icon: 'layoutStack',
    components: [
      {
        id: 'hero-section',
        name: 'Hero Section',
        category: 'sections',
        description: 'Full-width hero with title and CTA',
        elements: [{
          type: 'frame',
          name: 'Hero Section',
          width: 'fill' as const,
          height: 500,
          fill: '#1a1a1a',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'vertical' as const,
            gap: 24,
            padding: { top: 80, right: 48, bottom: 80, left: 48 },
            align: 'center' as const,
            distribute: 'center' as const,
            wrap: false,
          },
        }],
      },
      {
        id: 'features-grid',
        name: 'Features Grid',
        category: 'sections',
        description: '3-column feature cards',
        elements: [{
          type: 'frame',
          name: 'Features Grid',
          width: 'fill' as const,
          height: 400,
          fill: '#111111',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'grid' as const,
            direction: 'horizontal' as const,
            gap: 24,
            padding: { top: 48, right: 48, bottom: 48, left: 48 },
            align: 'stretch' as const,
            distribute: 'start' as const,
            wrap: true,
          },
        }],
      },
      {
        id: 'cta-section',
        name: 'CTA Section',
        category: 'sections',
        description: 'Call-to-action with button',
        elements: [{
          type: 'frame',
          name: 'CTA Section',
          width: 'fill' as const,
          height: 300,
          fill: '#3b82f6',
          borderRadius: 16,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'vertical' as const,
            gap: 20,
            padding: { top: 48, right: 48, bottom: 48, left: 48 },
            align: 'center' as const,
            distribute: 'center' as const,
            wrap: false,
          },
        }],
      },
    ],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    icon: 'hand',
    components: [
      {
        id: 'navbar',
        name: 'Navbar',
        category: 'navigation',
        description: 'Top navigation bar',
        elements: [{
          type: 'frame',
          name: 'Navbar',
          width: 'fill' as const,
          height: 64,
          fill: '#111111',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'horizontal' as const,
            gap: 24,
            padding: { top: 16, right: 24, bottom: 16, left: 24 },
            align: 'center' as const,
            distribute: 'space-between' as const,
            wrap: false,
          },
        }],
      },
      {
        id: 'footer',
        name: 'Footer',
        category: 'navigation',
        description: 'Page footer with links',
        elements: [{
          type: 'frame',
          name: 'Footer',
          width: 'fill' as const,
          height: 200,
          fill: '#0a0a0a',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'horizontal' as const,
            gap: 48,
            padding: { top: 48, right: 48, bottom: 48, left: 48 },
            align: 'start' as const,
            distribute: 'start' as const,
            wrap: false,
          },
        }],
      },
    ],
  },
  {
    id: 'elements',
    name: 'Elements',
    icon: 'rectangle',
    components: [
      {
        id: 'button-primary',
        name: 'Primary Button',
        category: 'elements',
        description: 'Primary action button',
        elements: [{
          type: 'frame',
          name: 'Button',
          width: 160,
          height: 48,
          fill: '#ffffff',
          borderRadius: 8,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'horizontal' as const,
            gap: 8,
            padding: { top: 12, right: 24, bottom: 12, left: 24 },
            align: 'center' as const,
            distribute: 'center' as const,
            wrap: false,
          },
        }],
      },
      {
        id: 'card',
        name: 'Card',
        category: 'elements',
        description: 'Content card with padding',
        elements: [{
          type: 'frame',
          name: 'Card',
          width: 300,
          height: 200,
          fill: '#1a1a1a',
          borderRadius: 12,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'vertical' as const,
            gap: 16,
            padding: { top: 24, right: 24, bottom: 24, left: 24 },
            align: 'stretch' as const,
            distribute: 'start' as const,
            wrap: false,
          },
        }],
      },
      {
        id: 'avatar',
        name: 'Avatar',
        category: 'elements',
        description: 'Circular avatar placeholder',
        elements: [{
          type: 'ellipse',
          name: 'Avatar',
          width: 48,
          height: 48,
          fill: '#8b5cf6',
          borderRadius: 24,
        }],
      },
      {
        id: 'badge',
        name: 'Badge',
        category: 'elements',
        description: 'Status badge',
        elements: [{
          type: 'frame',
          name: 'Badge',
          width: 80,
          height: 28,
          fill: '#22c55e',
          borderRadius: 14,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'horizontal' as const,
            gap: 4,
            padding: { top: 6, right: 12, bottom: 6, left: 12 },
            align: 'center' as const,
            distribute: 'center' as const,
            wrap: false,
          },
        }],
      },
    ],
  },
  {
    id: 'layout',
    name: 'Layout',
    icon: 'layoutGrid',
    components: [
      {
        id: 'container',
        name: 'Container',
        category: 'layout',
        description: 'Centered content container',
        elements: [{
          type: 'frame',
          name: 'Container',
          width: 1200,
          height: 'auto' as const,
          fill: 'transparent',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'vertical' as const,
            gap: 0,
            padding: { top: 0, right: 24, bottom: 0, left: 24 },
            align: 'stretch' as const,
            distribute: 'start' as const,
            wrap: false,
          },
        }],
      },
      {
        id: 'two-column',
        name: 'Two Column',
        category: 'layout',
        description: '50/50 split layout',
        elements: [{
          type: 'frame',
          name: 'Two Column',
          width: 'fill' as const,
          height: 400,
          fill: 'transparent',
          borderRadius: 0,
          autoLayout: {
            enabled: true,
            type: 'stack' as const,
            direction: 'horizontal' as const,
            gap: 24,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            align: 'stretch' as const,
            distribute: 'start' as const,
            wrap: false,
          },
        }],
      },
    ],
  },
];

interface Keyframe {
  time: number;
  properties: {
    x?: number;
    y?: number;
    opacity?: number;
    scale?: number;
    rotation?: number;
  };
}

// ==========================================
// ICONS
// ==========================================

const Icons = {
  cursor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    </svg>
  ),
  frame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
  rectangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18"/>
    </svg>
  ),
  ellipse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="9" ry="9"/>
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  unlock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  arrowDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  alignStart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="4" x2="4" y2="20"/>
      <rect x="8" y="6" width="12" height="4"/>
      <rect x="8" y="14" width="8" height="4"/>
    </svg>
  ),
  alignCenter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="4" x2="12" y2="20"/>
      <rect x="6" y="6" width="12" height="4"/>
      <rect x="8" y="14" width="8" height="4"/>
    </svg>
  ),
  alignEnd: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="20" y1="4" x2="20" y2="20"/>
      <rect x="4" y="6" width="12" height="4"/>
      <rect x="8" y="14" width="8" height="4"/>
    </svg>
  ),
  layoutStack: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="6" rx="1"/>
      <rect x="3" y="11" width="18" height="4" rx="1"/>
      <rect x="3" y="17" width="18" height="4" rx="1"/>
    </svg>
  ),
  layoutGrid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  hand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6"/>
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>
  ),
  desktop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  tablet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  ),
  page: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
};

// ==========================================
// SAMPLE DATA
// ==========================================

const sampleProjectFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        name: 'components',
        type: 'folder',
        path: '/src/components',
        children: [
          { name: 'Header.tsx', type: 'file', path: '/src/components/Header.tsx' },
          { name: 'Hero.tsx', type: 'file', path: '/src/components/Hero.tsx' },
          { name: 'Gallery.tsx', type: 'file', path: '/src/components/Gallery.tsx' },
          { name: 'Footer.tsx', type: 'file', path: '/src/components/Footer.tsx' },
        ]
      },
      {
        name: 'pages',
        type: 'folder',
        path: '/src/pages',
        children: [
          { name: 'Home.tsx', type: 'file', path: '/src/pages/Home.tsx' },
          { name: 'Bio.tsx', type: 'file', path: '/src/pages/Bio.tsx' },
          { name: 'Collections.tsx', type: 'file', path: '/src/pages/Collections.tsx' },
        ]
      },
      { name: 'App.tsx', type: 'file', path: '/src/App.tsx' },
      { name: 'main.tsx', type: 'file', path: '/src/main.tsx' },
      { name: 'index.css', type: 'file', path: '/src/index.css' },
    ]
  },
  { name: 'package.json', type: 'file', path: '/package.json' },
  { name: 'vite.config.ts', type: 'file', path: '/vite.config.ts' },
  { name: 'tsconfig.json', type: 'file', path: '/tsconfig.json' },
];

// Default Auto Layout
const defaultAutoLayout: AutoLayout = {
  enabled: false,
  type: 'stack',
  direction: 'vertical',
  gap: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  align: 'start',
  distribute: 'start',
  wrap: false,
};

// ==========================================
// MAIN COMPONENT
// ==========================================

// Initial sample elements for pages
const sampleHomeElements: DesignElement[] = [
  {
    id: 'frame-1',
    type: 'frame',
    name: 'Frame 1',
    x: 100,
    y: 50,
    width: 400,
    height: 600,
    rotation: 0,
    opacity: 1,
    fill: '#1a1a1a',
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 8,
    locked: false,
    visible: true,
    parentId: null,
    childrenIds: ['rect-1', 'rect-2', 'rect-3'],
    autoLayout: {
      enabled: true,
      type: 'stack',
      direction: 'vertical',
      gap: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      align: 'stretch',
      distribute: 'start',
      wrap: false,
    },
    overflow: 'hidden',
  },
  {
    id: 'rect-1',
    type: 'rectangle',
    name: 'Header',
    x: 0,
    y: 0,
    width: 'fill',
    height: 60,
    rotation: 0,
    opacity: 1,
    fill: '#3b82f6',
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 8,
    locked: false,
    visible: true,
    parentId: 'frame-1',
    childrenIds: [],
  },
  {
    id: 'rect-2',
    type: 'rectangle',
    name: 'Content',
    x: 0,
    y: 0,
    width: 'fill',
    height: 200,
    rotation: 0,
    opacity: 1,
    fill: '#8b5cf6',
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 8,
    locked: false,
    visible: true,
    parentId: 'frame-1',
    childrenIds: [],
  },
  {
    id: 'rect-3',
    type: 'rectangle',
    name: 'Footer',
    x: 0,
    y: 0,
    width: 'fill',
    height: 80,
    rotation: 0,
    opacity: 1,
    fill: '#22c55e',
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 8,
    locked: false,
    visible: true,
    parentId: 'frame-1',
    childrenIds: [],
  },
];

const sampleAboutElements: DesignElement[] = [
  {
    id: 'frame-about',
    type: 'frame',
    name: 'About Frame',
    x: 100,
    y: 50,
    width: 400,
    height: 500,
    rotation: 0,
    opacity: 1,
    fill: '#1a1a1a',
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 8,
    locked: false,
    visible: true,
    parentId: null,
    childrenIds: [],
    autoLayout: {
      enabled: true,
      type: 'stack',
      direction: 'vertical',
      gap: 24,
      padding: { top: 32, right: 32, bottom: 32, left: 32 },
      align: 'center',
      distribute: 'start',
      wrap: false,
    },
    overflow: 'hidden',
  },
];

const DesignEditor: React.FC = () => {
  // DEBUG: Global message listener to catch ALL postMessage events
  useEffect(() => {
    const globalMessageHandler = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        console.log('%c[GLOBAL] postMessage received:', 'color: #f59e0b; font-weight: bold;', {
          type: event.data.type,
          origin: event.origin,
          data: event.data,
        });
      }
    };
    window.addEventListener('message', globalMessageHandler);
    console.log('%c[GLOBAL] Message listener attached', 'color: #10b981; font-weight: bold;');
    return () => window.removeEventListener('message', globalMessageHandler);
  }, []);

  // Get project ID from URL
  const { projectId } = useParams<{ projectId: string }>();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isAutoStarting, setIsAutoStarting] = useState(false);

  // Pages state
  const [pages, setPages] = useState<Page[]>([
    { id: 'page-home', name: 'Home', elements: sampleHomeElements },
    { id: 'page-about', name: 'About', elements: sampleAboutElements },
    { id: 'page-contact', name: 'Contact', elements: [] },
  ]);
  const [currentPageId, setCurrentPageId] = useState<string>('page-home');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  // Get current page and its elements
  const currentPage = useMemo(() =>
    pages.find(p => p.id === currentPageId) || pages[0],
    [pages, currentPageId]
  );

  const elements = currentPage.elements;

  // Update elements for current page
  const setElements = useCallback((updater: DesignElement[] | ((prev: DesignElement[]) => DesignElement[])) => {
    setPages(prev => prev.map(page => {
      if (page.id === currentPageId) {
        const newElements = typeof updater === 'function' ? updater(page.elements) : updater;
        return { ...page, elements: newElements };
      }
      return page;
    }));
  }, [currentPageId]);

  // Page management functions
  const addPage = useCallback(() => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      elements: [],
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
  }, [pages.length]);

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return; // Keep at least one page
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      setCurrentPageId(pages[0].id !== pageId ? pages[0].id : pages[1]?.id || pages[0].id);
    }
  }, [pages, currentPageId]);

  const renamePage = useCallback((pageId: string, newName: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name: newName } : p
    ));
    setEditingPageId(null);
  }, []);

  const duplicatePage = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: `${page.name} Copy`,
      elements: page.elements.map(el => ({
        ...el,
        id: `${el.id}-copy-${Date.now()}`,
      })),
    };
    setPages(prev => [...prev, newPage]);
  }, [pages]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'hand' | 'rectangle' | 'ellipse' | 'text' | 'image' | 'frame'>('select');
  const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('sections');
  const [componentSearch, setComponentSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [projectFiles, setProjectFiles] = useState<FileNode[]>(sampleProjectFiles);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [githubRepo, setGithubRepo] = useState<{ owner: string; name: string; userId: string } | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [webcontainerReady, setWebcontainerReady] = useState(false);
  const [webcontainerUrl, setWebcontainerUrl] = useState<string>('');
  const [useWebContainer, setUseWebContainer] = useState(false);
  const [webcontainerFiles, setWebcontainerFiles] = useState<Record<string, string> | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'design' | 'code' | 'pages'>('design');
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('desktop');
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICE_PRESETS.find(d => d.id === 'desktop-lg')!);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [projectUrl, setProjectUrl] = useState<string>('');
  const [iframeLoading, setIframeLoading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectStatus, setProjectStatus] = useState<'idle' | 'installing' | 'starting' | 'ready' | 'error'>('idle');
  const [projectLogs, setProjectLogs] = useState<string[]>([]);
  const [loaderTab, setLoaderTab] = useState<'url' | 'path'>('path');
  const [discoveredPages, setDiscoveredPages] = useState<DiscoveredPage[]>([]);
  const [currentPreviewPath, setCurrentPreviewPath] = useState<string>('/');
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [isApplyingStyles, setIsApplyingStyles] = useState(false);
  const designEngineRef = useRef<DesignToCodeEngine | null>(null);
  const [visualSelectedElement, setVisualSelectedElement] = useState<SelectedElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const webContainerPreviewRef = useRef<WebContainerPreviewRef>(null);
  const chatPanelRef = useRef<AIChatPanelRef>(null);
  const previewManagerRef = useRef<PreviewManagerRef>(null);

  // State for new editable-runtime selected element
  const [editableSelectedElement, setEditableSelectedElement] = useState<EditableSelectedElement | null>(null);

  // Stable iframe ref for PreviewManager overlay
  // This ref is synced with the WebContainerPreview's iframe when it becomes ready
  const wcIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Get iframe ref from WebContainerPreview
  const getPreviewIframe = useCallback(() => {
    return webContainerPreviewRef.current?.getIframe() || null;
  }, []);

  // Sync wcIframeRef when WebContainer becomes ready
  // Use retry mechanism because iframe might not be in DOM immediately
  useEffect(() => {
    if (!webcontainerReady) return;

    let retryCount = 0;
    const maxRetries = 20;

    const syncIframeRef = () => {
      const iframe = getPreviewIframe();
      if (iframe) {
        wcIframeRef.current = iframe;
        console.log('[DesignEditor] WebContainer iframe ref synced:', iframe.src);
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[DesignEditor] Iframe not ready, retry ${retryCount}/${maxRetries}...`);
        setTimeout(syncIframeRef, 100);
      } else {
        console.warn('[DesignEditor] Could not get iframe ref after max retries');
      }
    };

    // Small delay to let React render the iframe
    setTimeout(syncIframeRef, 50);
  }, [webcontainerReady, getPreviewIframe]);

  // Initialize DesignToCodeEngine
  useEffect(() => {
    if (!designEngineRef.current && chatPanelRef.current) {
      designEngineRef.current = createDesignToCodeEngine(
        // Send to AI chat
        async (prompt) => {
          setIsApplyingStyles(true);
          try {
            await chatPanelRef.current?.sendMessage(prompt);
          } finally {
            setIsApplyingStyles(false);
          }
        },
        // Instant preview
        (elementId, styles) => {
          if (previewManagerRef.current) {
            previewManagerRef.current.updateStyle(elementId, styles as React.CSSProperties);
          }
        }
      );
    }
  }, []);

  // Toggle edit mode on PreviewManager when visualEditMode changes
  useEffect(() => {
    if (!previewManagerRef.current) return;

    if (visualEditMode) {
      previewManagerRef.current.enableEditMode();
    } else {
      previewManagerRef.current.disableEditMode();
      setEditableSelectedElement(null);
    }
  }, [visualEditMode]);

  // Handle element selection from PreviewManager
  const handleEditableElementSelect = useCallback((element: EditableSelectedElement | null) => {
    setEditableSelectedElement(element);
    console.log('[DesignEditor] Editable element selected:', element);
  }, []);

  // Handle props change from PreviewManager - update source code
  const handleEditablePropsChange = useCallback((id: string, props: Record<string, unknown>) => {
    console.log('[DesignEditor] Props changed for', id, ':', props);
    // TODO: Update source code with new props
    // This will require finding the component in the code and updating its props
  }, []);

  const [hoveredElement, setHoveredElement] = useState<{
    tagName: string;
    className: string;
    id: string;
    rect: { x: number; y: number; width: number; height: number };
    styles: Record<string, string>;
  } | null>(null);
  const [selectedLiveElement, setSelectedLiveElement] = useState<{
    tagName: string;
    className: string;
    id: string;
    rect: { x: number; y: number; width: number; height: number };
    styles: Record<string, string>;
    xpath: string;
  } | null>(null);
  const [isInspecting, setIsInspecting] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const deviceSelectorRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Container dimensions for auto-scaling device preview
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });

  // Track canvas area dimensions with ResizeObserver for responsive device scaling
  useEffect(() => {
    const canvasArea = canvasAreaRef.current;
    if (!canvasArea) return;

    const updateDimensions = () => {
      setContainerDimensions({
        width: canvasArea.clientWidth,
        height: canvasArea.clientHeight,
      });
    };

    // Initial measurement
    updateDimensions();

    // Watch for size changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(canvasArea);

    return () => resizeObserver.disconnect();
  }, []);

  // Close device dropdown when clicking outside
  useEffect(() => {
    if (!showDeviceDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is inside dropdown or device selector
      if (
        deviceSelectorRef.current?.contains(target) ||
        target.closest('.device-dropdown-scroll')
      ) {
        return;
      }
      setShowDeviceDropdown(false);
    };

    // Delay to avoid immediate close from the open click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeviceDropdown]);

  // Get current breakpoint data
  const activeBreakpoint = useMemo(() =>
    BREAKPOINTS.find(bp => bp.id === currentBreakpoint) || BREAKPOINTS[0],
    [currentBreakpoint]
  );

  const selectedElement = useMemo(() =>
    elements.find(el => el.id === selectedId),
    [elements, selectedId]
  );

  // Get children of an element
  const getChildren = useCallback((parentId: string) => {
    return elements.filter(el => el.parentId === parentId);
  }, [elements]);

  // Get element with responsive overrides applied
  const getResponsiveElement = useCallback((el: DesignElement): DesignElement => {
    if (!el.responsiveOverrides || !el.responsiveOverrides[currentBreakpoint]) {
      return el;
    }
    const overrides = el.responsiveOverrides[currentBreakpoint];
    return {
      ...el,
      ...overrides,
      autoLayout: el.autoLayout ? {
        ...el.autoLayout,
        ...(overrides.gap !== undefined ? { gap: overrides.gap } : {}),
        ...(overrides.direction ? { direction: overrides.direction } : {}),
        ...(overrides.padding ? { padding: overrides.padding } : {}),
      } : undefined,
    };
  }, [currentBreakpoint]);

  // Get root elements (no parent)
  const rootElements = useMemo(() =>
    elements.filter(el => el.parentId === null),
    [elements]
  );

  // ==========================================
  // ELEMENT OPERATIONS
  // ==========================================

  const generateId = () => `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => {
      // Get all descendant IDs
      const getDescendants = (parentId: string): string[] => {
        const children = prev.filter(el => el.parentId === parentId);
        return children.flatMap(child => [child.id, ...getDescendants(child.id)]);
      };

      const toDelete = [id, ...getDescendants(id)];

      // Remove from parent's childrenIds
      const element = prev.find(el => el.id === id);
      if (element?.parentId) {
        const parent = prev.find(el => el.id === element.parentId);
        if (parent) {
          return prev
            .filter(el => !toDelete.includes(el.id))
            .map(el => el.id === element.parentId
              ? { ...el, childrenIds: el.childrenIds.filter(cid => cid !== id) }
              : el
            );
        }
      }

      return prev.filter(el => !toDelete.includes(el.id));
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const addChildToParent = useCallback((parentId: string, childId: string) => {
    setElements(prev => prev.map(el => {
      if (el.id === parentId) {
        return { ...el, childrenIds: [...el.childrenIds, childId] };
      }
      if (el.id === childId) {
        return { ...el, parentId };
      }
      return el;
    }));
  }, []);

  // Add component from library
  const addComponentFromLibrary = useCallback((template: ComponentTemplate) => {
    const newElements: DesignElement[] = template.elements.map((partial, index) => ({
      id: generateId(),
      type: partial.type || 'frame',
      name: partial.name || `${template.name} ${index + 1}`,
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      width: partial.width ?? 200,
      height: partial.height ?? 200,
      rotation: 0,
      opacity: 1,
      fill: partial.fill || '#1a1a1a',
      stroke: 'transparent',
      strokeWidth: 0,
      borderRadius: partial.borderRadius ?? 8,
      locked: false,
      visible: true,
      parentId: null,
      childrenIds: [],
      autoLayout: partial.autoLayout,
      overflow: 'hidden',
    }));

    setElements(prev => [...prev, ...newElements]);
    if (newElements.length > 0) {
      setSelectedId(newElements[0].id);
    }
    setShowComponentLibrary(false);
  }, []);

  // ==========================================
  // CANVAS INTERACTIONS
  // ==========================================

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only handle if clicking directly on canvas, not on elements
    if (e.target !== canvasRef.current) return;

    if (tool === 'select' || tool === 'hand') {
      setSelectedId(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newElement: DesignElement = {
      id: generateId(),
      type: tool,
      name: `${tool.charAt(0).toUpperCase() + tool.slice(1)} ${elements.length + 1}`,
      x,
      y,
      width: tool === 'text' ? 200 : 100,
      height: tool === 'text' ? 40 : 100,
      rotation: 0,
      opacity: 1,
      fill: tool === 'text' ? 'transparent' : '#3b82f6',
      stroke: 'transparent',
      strokeWidth: 0,
      borderRadius: tool === 'ellipse' ? 50 : 8,
      content: tool === 'text' ? 'Text' : undefined,
      fontSize: tool === 'text' ? 16 : undefined,
      fontWeight: tool === 'text' ? '400' : undefined,
      locked: false,
      visible: true,
      parentId: null,
      childrenIds: [],
      autoLayout: tool === 'frame' ? { ...defaultAutoLayout, enabled: true } : undefined,
    };

    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setTool('select');
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const element = elements.find(el => el.id === elementId);
    if (element?.locked) return;

    setSelectedId(elementId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!selectedElement) return;

    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;

    if (isDragging && !selectedElement.locked && !selectedElement.parentId) {
      updateElement(selectedElement.id, {
        x: selectedElement.x + dx,
        y: selectedElement.y + dy,
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (isResizing && resizeHandle) {
      const updates: Partial<DesignElement> = {};
      const currentWidth = typeof selectedElement.width === 'number' ? selectedElement.width : 100;
      const currentHeight = typeof selectedElement.height === 'number' ? selectedElement.height : 100;

      if (resizeHandle.includes('e')) {
        updates.width = Math.max(20, currentWidth + dx);
      }
      if (resizeHandle.includes('w')) {
        updates.width = Math.max(20, currentWidth - dx);
        if (!selectedElement.parentId) updates.x = selectedElement.x + dx;
      }
      if (resizeHandle.includes('s')) {
        updates.height = Math.max(20, currentHeight + dy);
      }
      if (resizeHandle.includes('n')) {
        updates.height = Math.max(20, currentHeight - dy);
        if (!selectedElement.parentId) updates.y = selectedElement.y + dy;
      }

      updateElement(selectedElement.id, updates);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, selectedElement, dragStart, zoom, resizeHandle, updateElement]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Auto-start WebContainer for new projects
  useEffect(() => {
    if (projectId === 'new') {
      localStorage.removeItem('current-github-repo');
      setGithubRepo(null);
      setProjectFiles([]);
      setProjectUrl('');
      // Auto-start WebContainer with editable template for new projects
      setUseWebContainer(true);
    }
  }, [projectId]);

  // useGit hook for cloning repos
  const { ready: gitReady, cloning: gitCloning, progress: gitProgress, gitClone } = useGit();

  // Agentic error handling (bolt.diy pattern)
  const {
    errors: agenticErrors,
    addError,
    addBuildError,
    addRuntimeError,
    dismissError,
    dismissAllErrors,
    fixingErrorId,
    setFixingErrorId,
  } = useAgenticErrors();

  // Handle "Fix with AI" for errors
  const handleFixWithAI = useCallback(async (error: AlertError) => {
    if (!chatPanelRef.current) return;

    setFixingErrorId(error.id);

    // Build context with error info and relevant files
    const errorFileContent = error.file ? fileContents[error.file] || fileContents[error.file.replace(/^\//, '')] : undefined;

    try {
      await chatPanelRef.current.sendErrorForFix(
        error.message,
        error.file,
        errorFileContent
      );
      // Don't dismiss immediately - wait to see if fix works
      setTimeout(() => {
        dismissError(error.id);
        setFixingErrorId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to send error to AI:', err);
      setFixingErrorId(null);
    }
  }, [fileContents, dismissError, setFixingErrorId]);

  // Listen for iframe errors (runtime errors from preview)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle error messages from iframe
      if (event.data?.type === 'error' || event.data?.type === 'runtime-error') {
        addRuntimeError(event.data.message || event.data.error, event.data.source);
      }
    };

    // Handle global unhandled errors that might come from iframe context
    const handleError = (event: ErrorEvent) => {
      // Only capture if it looks like it's from our preview
      if (event.filename?.includes('localhost:') || event.filename?.includes('webcontainer')) {
        addRuntimeError(event.message, event.filename);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('error', handleError);
    };
  }, [addRuntimeError]);

  // Listen for WebContainer build errors from logs
  useEffect(() => {
    const handleWebContainerError = (e: CustomEvent<{ error: string }>) => {
      addError(e.detail.error);
    };

    window.addEventListener('webcontainer:error', handleWebContainerError as EventListener);
    return () => {
      window.removeEventListener('webcontainer:error', handleWebContainerError as EventListener);
    };
  }, [addError]);

  // Load GitHub repo using git clone (like bolt.diy)
  useEffect(() => {
    if (projectId === 'new') return;

    const repoData = localStorage.getItem('current-github-repo');
    if (!repoData) return;

    const loadProject = async () => {
      try {
        const repo = JSON.parse(repoData);
        if (!repo.owner || !repo.name) return;

        setGithubRepo({ owner: repo.owner, name: repo.name, userId: repo.userId || '' });
        setProjectLogs(['Loading project...']);

        // Check if repo has a deployed homepage URL (instant preview)
        // NOTE: Skip this for now - always use WebContainer for visual editing support
        // TODO: Add a "quick preview" vs "edit mode" toggle
        // if (repo.homepage && repo.homepage.startsWith('http')) {
        //   setProjectUrl(repo.homepage);
        //   setProjectStatus('ready');
        //   setLiveMode(true);
        //   setProjectLogs(['Site loaded from deployed URL']);
        //   return;
        // }

        // Enable WebContainer mode and show loading UI
        setUseWebContainer(true);
        setProjectLogs(prev => [...prev, 'Preparing to clone repository...']);

        // Wait for git to be ready
        if (!gitReady) {
          setProjectLogs(prev => [...prev, 'Waiting for WebContainer...']);
          return; // Will retry when gitReady becomes true
        }

        // Clone the repository using isomorphic-git
        const repoUrl = `https://github.com/${repo.owner}/${repo.name}.git`;
        setProjectLogs(prev => [...prev, `Cloning ${repo.owner}/${repo.name}...`]);

        const { files } = await gitClone(repoUrl);

        setProjectLogs(prev => [...prev, `Cloned ${Object.keys(files).length} files`]);

        // NOTE: Visual edit bridge injection removed - now using editable-runtime
        // The new system generates code with Editable wrappers instead of injecting

        // Build file tree for sidebar
        const fileTree: FileNode[] = [];
        const pathMap: Record<string, FileNode> = {};

        Object.keys(files).sort().forEach(filePath => {
          const parts = filePath.split('/').filter(Boolean);
          let currentPath = '';

          parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!pathMap[currentPath]) {
              const node: FileNode = {
                name: part,
                type: isLast ? 'file' : 'folder',
                path: '/' + currentPath,
                children: isLast ? undefined : [],
              };
              pathMap[currentPath] = node;

              if (index === 0) {
                fileTree.push(node);
              } else {
                const parentPath = parts.slice(0, index).join('/');
                const parent = pathMap[parentPath];
                if (parent?.children) {
                  parent.children.push(node);
                }
              }
            }
          });
        });

        setProjectFiles(fileTree);
        setFileContents(files);
        setWebcontainerFiles(files);
        setShowUrlInput(false);

      } catch (e) {
        console.error('Error loading project:', e);
        setProjectStatus('error');
        setProjectLogs(prev => [...prev, `Error: ${e instanceof Error ? e.message : e}`]);
      }
    };

    loadProject();
  }, [projectId, gitReady, gitClone]);

  // Safety net: Ensure WebContainer is started when githubRepo is loaded
  useEffect(() => {
    if (githubRepo && !useWebContainer && Object.keys(fileContents).length > 0) {
      setUseWebContainer(true);
      setWebcontainerFiles(fileContents);
      setProjectStatus('installing');
    }
  }, [githubRepo, useWebContainer, fileContents]);

  // Discover pages/routes when files are loaded
  useEffect(() => {
    // Use webcontainerFiles for new projects, fileContents for GitHub projects
    const files = Object.keys(fileContents).length > 0 ? fileContents : webcontainerFiles;
    if (files && Object.keys(files).length > 0) {
      const pages = discoverPages(files);
      setDiscoveredPages(pages);
      console.log('Discovered pages:', pages);
    }
  }, [fileContents, webcontainerFiles]);

  // Set iframe loading state when URL changes
  useEffect(() => {
    if (projectUrl) {
      setIframeLoading(true);
    }
  }, [projectUrl]);

  // Auto-start project when editor loads
  useEffect(() => {
    if (!projectId || projectId === 'new' || isAutoStarting) return;

    const project = getProjectById(projectId);
    if (!project) return;

    setCurrentProject(project);

    // Se è un progetto React con path, avvia automaticamente
    if (project.type === 'react' && project.path) {
      setIsAutoStarting(true);
      setProjectPath(project.path);

      // Avvia il progetto automaticamente
      setProjectStatus('installing');
      setProjectLogs([]);

      const eventSource = new EventSource(`http://localhost:3333/api/projects/start-stream?path=${encodeURIComponent(project.path)}`);

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        if (data.phase === 'install') {
          setProjectStatus('installing');
        } else if (data.phase === 'start') {
          setProjectStatus('starting');
        }
        setProjectLogs(prev => [...prev, data.message]);
      });

      eventSource.addEventListener('log', (e) => {
        const data = JSON.parse(e.data);
        setProjectLogs(prev => [...prev.slice(-50), data.message]);
      });

      eventSource.addEventListener('ready', (e) => {
        const data = JSON.parse(e.data);
        setProjectUrl(data.url);
        setProjectStatus('ready');
        setLiveMode(true);
        setIsAutoStarting(false);
        eventSource.close();
      });

      eventSource.addEventListener('error', () => {
        setProjectStatus('error');
        setIsAutoStarting(false);
        eventSource.close();
      });

      return () => {
        eventSource.close();
      };
    }
  }, [projectId]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteElement(selectedId);
      }
      if (e.key === 'Escape') {
        // Exit visual edit mode first, then clear selection
        if (visualEditMode) {
          setVisualEditMode(false);
          setVisualSelectedElement(null);
        } else {
          setSelectedId(null);
          setTool('select');
        }
      }
      // Only allow shortcuts when not in visual edit mode
      if (!visualEditMode) {
        if (e.key === 'v') setTool('select');
        if (e.key === 'h') setTool('hand');
        if (e.key === 'r') setTool('rectangle');
        if (e.key === 'o') setTool('ellipse');
        if (e.key === 't') setTool('text');
        if (e.key === 'f') setTool('frame');
      }
      // Toggle edit mode with 'e' key
      if (e.key === 'e' && !e.metaKey && !e.ctrlKey && webcontainerReady) {
        setVisualEditMode(prev => !prev);
        setVisualSelectedElement(null);
      }
      // Zoom controls: Cmd/Ctrl + 0 = reset, Cmd/Ctrl + +/= = zoom in, Cmd/Ctrl + - = zoom out
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
          setPan({ x: 0, y: 0 });
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(z => Math.min(4, z + 0.25));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(z => Math.max(0.1, z - 0.25));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteElement, visualEditMode, webcontainerReady]);

  // Trackpad/wheel navigation: pinch to zoom, two-finger pan
  useEffect(() => {
    const canvasArea = canvasAreaRef.current;
    if (!canvasArea) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Pinch to zoom (ctrl/meta + wheel)
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(z => Math.min(4, Math.max(0.1, z + delta)));
      } else {
        // Two-finger pan (trackpad scroll)
        setPan(p => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY
        }));
      }
    };

    canvasArea.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasArea.removeEventListener('wheel', handleWheel);
  }, []);

  // Listen for messages from iframe (element inspection)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'element-hover') {
        setHoveredElement(event.data.element);
      } else if (event.data.type === 'element-select') {
        setSelectedLiveElement(event.data.element);
      } else if (event.data.type === 'element-leave') {
        setHoveredElement(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Inject inspector script into iframe when loaded
  useEffect(() => {
    if (!liveMode || !projectUrl || !iframeRef.current) return;

    const iframe = iframeRef.current;

    const injectScript = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return;

        // Send a message to inject the inspector
        iframeWindow.postMessage({ type: 'init-inspector' }, '*');
      } catch (e) {
        // Cross-origin iframe, use overlay mode instead
      }
    };

    iframe.addEventListener('load', injectScript);
    return () => iframe.removeEventListener('load', injectScript);
  }, [liveMode, projectUrl]);

  // Start project via backend server
  const startProject = useCallback((path: string) => {
    setProjectStatus('installing');
    setProjectLogs([]);

    const eventSource = new EventSource(`http://localhost:3333/api/projects/start-stream?path=${encodeURIComponent(path)}`);

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      if (data.phase === 'install') {
        setProjectStatus('installing');
      } else if (data.phase === 'start') {
        setProjectStatus('starting');
      }
      setProjectLogs(prev => [...prev, data.message]);
    });

    eventSource.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setProjectLogs(prev => [...prev.slice(-50), data.message]); // Keep last 50 logs
    });

    eventSource.addEventListener('ready', (e) => {
      const data = JSON.parse(e.data);
      setProjectUrl(data.url);
      setProjectStatus('ready');
      setLiveMode(true);
      setShowUrlInput(false);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      setProjectStatus('error');
      eventSource.close();
    });

    eventSource.addEventListener('stopped', () => {
      setProjectStatus('idle');
      eventSource.close();
    });
  }, []);

  // ==========================================
  // RENDER ELEMENT
  // ==========================================

  const renderElement = useCallback((el: DesignElement, isNested = false): React.ReactNode => {
    // Apply responsive overrides
    const responsiveEl = getResponsiveElement(el);
    const isSelected = el.id === selectedId;
    const children = getChildren(el.id);
    const hasAutoLayout = responsiveEl.autoLayout?.enabled;

    // Calculate dimensions using responsive element
    const width = typeof responsiveEl.width === 'number' ? responsiveEl.width :
                  responsiveEl.width === 'fill' ? '100%' : 'auto';
    const height = typeof responsiveEl.height === 'number' ? responsiveEl.height :
                   responsiveEl.height === 'fill' ? '100%' : 'auto';

    // Check visibility from responsive element
    const isVisible = responsiveEl.visible !== undefined ? responsiveEl.visible : el.visible;

    // Build style
    const style: React.CSSProperties = {
      position: isNested ? 'relative' : 'absolute',
      left: isNested ? undefined : responsiveEl.x,
      top: isNested ? undefined : responsiveEl.y,
      width,
      height,
      minWidth: el.minWidth,
      maxWidth: el.maxWidth,
      minHeight: el.minHeight,
      maxHeight: el.maxHeight,
      backgroundColor: el.fill,
      border: el.stroke !== 'transparent' ? `${el.strokeWidth}px solid ${el.stroke}` : undefined,
      borderRadius: el.type === 'ellipse' ? '50%' : el.borderRadius,
      opacity: el.opacity,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      cursor: el.locked ? 'not-allowed' : (isNested ? 'pointer' : 'move'),
      display: isVisible ? (hasAutoLayout ? 'flex' : 'block') : 'none',
      overflow: el.overflow || 'visible',
      boxSizing: 'border-box',
      // Auto Layout styles (using responsive values)
      ...(hasAutoLayout && responsiveEl.autoLayout ? {
        flexDirection: responsiveEl.autoLayout.direction === 'horizontal' ? 'row' : 'column',
        gap: responsiveEl.autoLayout.gap,
        paddingTop: responsiveEl.autoLayout.padding.top,
        paddingRight: responsiveEl.autoLayout.padding.right,
        paddingBottom: responsiveEl.autoLayout.padding.bottom,
        paddingLeft: responsiveEl.autoLayout.padding.left,
        alignItems: responsiveEl.autoLayout.align === 'stretch' ? 'stretch' :
                    responsiveEl.autoLayout.align === 'start' ? 'flex-start' :
                    responsiveEl.autoLayout.align === 'end' ? 'flex-end' : 'center',
        justifyContent: responsiveEl.autoLayout.distribute === 'start' ? 'flex-start' :
                        responsiveEl.autoLayout.distribute === 'end' ? 'flex-end' :
                        responsiveEl.autoLayout.distribute === 'center' ? 'center' :
                        responsiveEl.autoLayout.distribute === 'space-between' ? 'space-between' : 'space-around',
        flexWrap: responsiveEl.autoLayout.wrap ? 'wrap' : 'nowrap',
      } : {}),
      // Text styles (using responsive fontSize)
      ...(el.type === 'text' ? {
        color: '#fff',
        fontSize: responsiveEl.fontSize || el.fontSize,
        fontWeight: el.fontWeight,
        fontFamily: el.fontFamily || 'Inter, sans-serif',
        textAlign: el.textAlign,
        lineHeight: el.lineHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: el.textAlign === 'center' ? 'center' :
                       el.textAlign === 'right' ? 'flex-end' : 'flex-start',
      } : {}),
    };

    // Child flex item styles (with responsive overrides)
    const childStyle = (child: DesignElement): React.CSSProperties => {
      const responsiveChild = getResponsiveElement(child);
      const w = responsiveChild.width;
      const h = responsiveChild.height;
      return {
        width: w === 'fill' ? '100%' : w === 'auto' ? 'auto' : w,
        height: h === 'fill' ? '100%' : h === 'auto' ? 'auto' : h,
        flexShrink: w === 'fill' ? 1 : 0,
        flexGrow: w === 'fill' ? 1 : 0,
      };
    };

    return (
      <div
        key={el.id}
        style={style}
        className={`canvas-element ${isSelected ? 'selected' : ''}`}
        onMouseDown={(e) => handleElementMouseDown(e, el.id)}
      >
        {/* Text content */}
        {el.type === 'text' && el.content}

        {/* Image content */}
        {el.type === 'image' && el.src && (
          <img src={el.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Children */}
        {children.map(child => (
          <div key={child.id} style={childStyle(child)}>
            {renderElement(child, true)}
          </div>
        ))}

        {/* Selection handles */}
        {isSelected && !el.locked && !isNested && (
          <>
            <div className="resize-handle nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
            <div className="resize-handle n" onMouseDown={(e) => handleResizeMouseDown(e, 'n')} />
            <div className="resize-handle ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
            <div className="resize-handle e" onMouseDown={(e) => handleResizeMouseDown(e, 'e')} />
            <div className="resize-handle se" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
            <div className="resize-handle s" onMouseDown={(e) => handleResizeMouseDown(e, 's')} />
            <div className="resize-handle sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
            <div className="resize-handle w" onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />
          </>
        )}
      </div>
    );
  }, [selectedId, getChildren, getResponsiveElement, handleElementMouseDown]);

  // ==========================================
  // AUTO LAYOUT PANEL
  // ==========================================

  const renderAutoLayoutPanel = () => {
    if (!selectedElement) return null;

    const autoLayout = selectedElement.autoLayout || defaultAutoLayout;

    const updateAutoLayout = (updates: Partial<AutoLayout>) => {
      updateElement(selectedElement.id, {
        autoLayout: { ...autoLayout, ...updates }
      });
    };

    return (
      <div className="de-prop-group">
        <div className="de-prop-group-header">
          <span className="de-prop-group-title">Layout</span>
          <button
            className={`de-btn de-btn-ghost ${autoLayout.enabled ? 'active' : ''}`}
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={() => updateAutoLayout({ enabled: !autoLayout.enabled })}
          >
            {autoLayout.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {autoLayout.enabled && (
          <div className="de-prop-group-content">
            {/* Type: Stack / Grid */}
            <div className="de-prop-field">
              <span className="de-prop-label">Type</span>
              <div className="de-segmented-control">
                <button
                  className={`de-segment ${autoLayout.type === 'stack' ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ type: 'stack' })}
                >
                  Stack
                </button>
                <button
                  className={`de-segment ${autoLayout.type === 'grid' ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ type: 'grid' })}
                >
                  Grid
                </button>
              </div>
            </div>

            {/* Direction */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Direction</span>
              <div className="de-segmented-control">
                <button
                  className={`de-segment ${autoLayout.direction === 'horizontal' ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ direction: 'horizontal' })}
                  title="Horizontal"
                >
                  <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.arrowRight}
                  </span>
                </button>
                <button
                  className={`de-segment ${autoLayout.direction === 'vertical' ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ direction: 'vertical' })}
                  title="Vertical"
                >
                  <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.arrowDown}
                  </span>
                </button>
              </div>
            </div>

            {/* Gap */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Gap</span>
              <div className="de-number-field">
                <input
                  type="number"
                  className="de-number-input"
                  value={autoLayout.gap}
                  onChange={(e) => updateAutoLayout({ gap: Number(e.target.value) })}
                  min={0}
                />
                <span className="de-number-label">px</span>
              </div>
            </div>

            {/* Padding */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Padding</span>
              <div className="de-prop-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="de-number-field">
                  <span className="de-number-label">T</span>
                  <input
                    type="number"
                    className="de-number-input"
                    value={autoLayout.padding.top}
                    onChange={(e) => updateAutoLayout({
                      padding: { ...autoLayout.padding, top: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
                <div className="de-number-field">
                  <span className="de-number-label">R</span>
                  <input
                    type="number"
                    className="de-number-input"
                    value={autoLayout.padding.right}
                    onChange={(e) => updateAutoLayout({
                      padding: { ...autoLayout.padding, right: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
                <div className="de-number-field">
                  <span className="de-number-label">B</span>
                  <input
                    type="number"
                    className="de-number-input"
                    value={autoLayout.padding.bottom}
                    onChange={(e) => updateAutoLayout({
                      padding: { ...autoLayout.padding, bottom: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
                <div className="de-number-field">
                  <span className="de-number-label">L</span>
                  <input
                    type="number"
                    className="de-number-input"
                    value={autoLayout.padding.left}
                    onChange={(e) => updateAutoLayout({
                      padding: { ...autoLayout.padding, left: Number(e.target.value) }
                    })}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Align */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Align</span>
              <div className="de-segmented-control">
                {(['start', 'center', 'end', 'stretch'] as const).map(align => (
                  <button
                    key={align}
                    className={`de-segment ${autoLayout.align === align ? 'active' : ''}`}
                    onClick={() => updateAutoLayout({ align })}
                    title={align.charAt(0).toUpperCase() + align.slice(1)}
                  >
                    {align === 'start' && <span style={{ width: 14 }}>{Icons.alignStart}</span>}
                    {align === 'center' && <span style={{ width: 14 }}>{Icons.alignCenter}</span>}
                    {align === 'end' && <span style={{ width: 14 }}>{Icons.alignEnd}</span>}
                    {align === 'stretch' && <span style={{ fontSize: 10 }}>⇔</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Distribute */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Distribute</span>
              <select
                className="de-input de-select"
                value={autoLayout.distribute}
                onChange={(e) => updateAutoLayout({ distribute: e.target.value as AutoLayout['distribute'] })}
              >
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
                <option value="space-between">Space Between</option>
                <option value="space-around">Space Around</option>
              </select>
            </div>

            {/* Wrap */}
            <div className="de-prop-field" style={{ marginTop: 12 }}>
              <span className="de-prop-label">Wrap</span>
              <div className="de-segmented-control">
                <button
                  className={`de-segment ${!autoLayout.wrap ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ wrap: false })}
                >
                  No
                </button>
                <button
                  className={`de-segment ${autoLayout.wrap ? 'active' : ''}`}
                  onClick={() => updateAutoLayout({ wrap: true })}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER LAYERS TREE
  // ==========================================

  const renderLayerItem = (el: DesignElement, depth: number = 0): React.ReactNode => {
    const children = getChildren(el.id);
    const hasChildren = children.length > 0;
    const isSelected = el.id === selectedId;

    return (
      <div key={el.id}>
        <div
          className={`de-layer-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => setSelectedId(el.id)}
        >
          {hasChildren && (
            <span className="de-layer-chevron">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </span>
          )}
          {!hasChildren && <span style={{ width: 14 }} />}
          <span className="de-layer-icon">
            {el.type === 'frame' && Icons.frame}
            {el.type === 'rectangle' && Icons.rectangle}
            {el.type === 'ellipse' && Icons.ellipse}
            {el.type === 'text' && Icons.text}
            {el.type === 'image' && Icons.image}
          </span>
          <span className="de-layer-name">{el.name}</span>
          <div className="de-layer-actions">
            <button
              className="de-layer-btn"
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, { visible: !el.visible });
              }}
            >
              {el.visible ? Icons.eye : Icons.eyeOff}
            </button>
            <button
              className="de-layer-btn"
              onClick={(e) => {
                e.stopPropagation();
                updateElement(el.id, { locked: !el.locked });
              }}
            >
              {el.locked ? Icons.lock : Icons.unlock}
            </button>
          </div>
        </div>
        {hasChildren && children.map(child => renderLayerItem(child, depth + 1))}
      </div>
    );
  };

  // ==========================================
  // CODE ELEMENTS FOR EXPORT
  // ==========================================

  const codeElements: CodeElement[] = useMemo(() => {
    return elements.map(el => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: typeof el.width === 'number' ? el.width : 100,
      height: typeof el.height === 'number' ? el.height : 100,
      rotation: el.rotation,
      fill: el.fill,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      cornerRadius: el.borderRadius,
      text: el.content,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      imageUrl: el.src,
      children: el.childrenIds,
      parentId: el.parentId,
      animations: [],
      keyframes: [],
    }));
  }, [elements]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="design-editor">
      {/* Header */}
      <header className="de-header">
        <div className="de-header-left">
          <button onClick={() => window.location.href = '/'} className="de-logo">
            OBJECTS
          </button>
          {/* Project indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 16,
            padding: '4px 12px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: 6,
            fontSize: 13,
            color: '#a78bfa',
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: useWebContainer || githubRepo ? '#22c55e' : '#6b7280',
            }} />
            {githubRepo?.name || (projectId === 'new' ? 'Nuovo Progetto' : 'OBJECTS')}
          </div>
        </div>

        <div className="de-header-center">
          {/* Mode Toggle - Icon Style like Bolt */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 4,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Preview/Design Mode */}
            <button
              onClick={() => setViewMode('design')}
              title="Preview"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'design' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: viewMode === 'design' ? '#a78bfa' : '#6b6b6b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {/* Code Mode */}
            <button
              onClick={() => setViewMode('code')}
              title="Code"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'code' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: viewMode === 'code' ? '#a78bfa' : '#6b6b6b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </button>

            {/* Pages/Tree Mode */}
            <button
              onClick={() => setViewMode('pages')}
              title="Pages Tree"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: viewMode === 'pages' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: viewMode === 'pages' ? '#a78bfa' : '#6b6b6b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
              </svg>
            </button>
          </div>

          {/* Responsive Viewport Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 4,
            border: '1px solid rgba(255,255,255,0.08)',
            marginLeft: 12,
          }}>
            {BREAKPOINTS.map(bp => (
              <button
                key={bp.id}
                onClick={() => {
                  setCurrentBreakpoint(bp.id);
                  const defaultDevice = DEVICE_PRESETS.find(d => d.category === bp.icon);
                  if (defaultDevice) setSelectedDevice(defaultDevice);
                }}
                title={`${bp.name} (${bp.width}px)`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: currentBreakpoint === bp.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: currentBreakpoint === bp.id ? '#a78bfa' : '#6b6b6b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {bp.icon === 'desktop' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                )}
                {bp.icon === 'tablet' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                )}
                {bp.icon === 'phone' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Project Name / URL Bar */}
          {githubRepo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              marginLeft: 12,
              minWidth: 200,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#a1a1aa', fontSize: 12 }}>
                {githubRepo.name}
              </span>
            </div>
          )}
        </div>

        <div className="de-header-right">
          <button
            onClick={() => setShowUrlInput(true)}
            className="de-btn de-btn-ghost"
            title="Set Project URL"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            URL
          </button>
          <button
            onClick={() => setShowComponentLibrary(!showComponentLibrary)}
            className={`de-btn de-btn-ghost ${showComponentLibrary ? 'active' : ''}`}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.plus}</span>
            Components
          </button>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`de-btn de-btn-ghost ${showTimeline ? 'active' : ''}`}
          >
            Timeline
          </button>
          {!githubRepo && (
          <button
            onClick={() => setShowCodePanel(!showCodePanel)}
            className={`de-btn de-btn-ghost ${showCodePanel ? 'active' : ''}`}
          >
            <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.code}</span>
            Code
          </button>
          )}
          {/* Run Button - Start WebContainer with editable project */}
          <button
            onClick={() => {
              if (!useWebContainer) {
                setUseWebContainer(true);
                // WebContainer will auto-start with createEditableViteProject() as default
              }
            }}
            className={`de-btn ${useWebContainer ? 'de-btn-primary' : 'de-btn-ghost'}`}
            title="Run editable preview in WebContainer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {useWebContainer ? 'Running' : 'Run'}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="de-btn de-btn-ghost"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Preview
          </button>
          <button className="de-btn de-btn-primary">
            Export
          </button>
        </div>
      </header>

      <div className="de-main">
        {/* Left Sidebar - Pages/Frames (top) + Chat (bottom) */}
        <div style={{
          width: leftPanelCollapsed ? 48 : 320,
          minWidth: leftPanelCollapsed ? 48 : 320,
          background: '#111',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}>
          {/* Collapsed state - just icons */}
          {leftPanelCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 8 }}>
              <button
                onClick={() => setLeftPanelCollapsed(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#a1a1a1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Expand panels"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                onClick={() => { setLeftPanelCollapsed(false); }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#6b6b6b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Pages"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => { setLeftPanelCollapsed(false); setChatCollapsed(false); }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#6b6b6b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          ) : (
          <>
          {/* Top - Pages/Frames as Thumbnails */}
          <div style={{
            flex: chatCollapsed ? 1 : '0 0 40%',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'flex 0.2s ease',
          }}>
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setLeftPanelCollapsed(true)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: 'none',
                    background: 'transparent',
                    color: '#6b6b6b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Collapse panel"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1a1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {(githubRepo || useWebContainer) ? 'Pages' : 'Frames'}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#5a5a5a', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                {(githubRepo || useWebContainer) ? discoveredPages.length : pages.length}
              </span>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              alignContent: 'start',
            }}>
              {(githubRepo || useWebContainer) ? (
                // GitHub/WebContainer project - show discovered routes as thumbnails
                discoveredPages.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: 16,
                    textAlign: 'center',
                    color: '#5a5a5a',
                    fontSize: 12,
                  }}>
                    {webcontainerReady ? 'No pages found' : 'Loading...'}
                  </div>
                ) : (
                  discoveredPages.map(page => (
                    <div
                      key={page.path}
                      onClick={() => setCurrentPreviewPath(page.path)}
                      style={{
                        background: currentPreviewPath === page.path ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: currentPreviewPath === page.path ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: 8,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Thumbnail placeholder */}
                      <div style={{
                        width: '100%',
                        aspectRatio: '16/10',
                        background: '#1a1a1a',
                        borderRadius: 4,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3a3a3a',
                        fontSize: 20,
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#e5e5e5', marginBottom: 2 }}>
                        {page.name}
                      </div>
                      <div style={{ fontSize: 9, color: '#5a5a5a', fontFamily: 'monospace' }}>
                        {page.path}
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Design mode - show pages as thumbnails
                pages.map(page => (
                  <div
                    key={page.id}
                    onClick={() => setCurrentPageId(page.id)}
                    onDoubleClick={() => setEditingPageId(page.id)}
                    style={{
                      background: currentPageId === page.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: currentPageId === page.id ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Thumbnail - mini canvas preview */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      background: '#1a1a1a',
                      borderRadius: 4,
                      marginBottom: 8,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Mini preview of elements */}
                      {page.elements.slice(0, 5).map((el, i) => (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${(typeof el.x === 'number' ? el.x : 0) / 20}%`,
                            top: `${(typeof el.y === 'number' ? el.y : 0) / 20}%`,
                            width: `${(typeof el.width === 'number' ? el.width : 50) / 20}%`,
                            height: `${(typeof el.height === 'number' ? el.height : 50) / 20}%`,
                            background: el.fill || '#333',
                            borderRadius: el.borderRadius ? el.borderRadius / 4 : 2,
                            opacity: 0.7,
                          }}
                        />
                      ))}
                    </div>
                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        defaultValue={page.name}
                        autoFocus
                        onBlur={(e) => renamePage(page.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renamePage(page.id, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingPageId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid #8b5cf6',
                          borderRadius: 4,
                          padding: '4px 6px',
                          fontSize: 11,
                          color: '#e5e5e5',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#e5e5e5', marginBottom: 2 }}>
                          {page.name}
                        </div>
                        <div style={{ fontSize: 9, color: '#5a5a5a' }}>
                          {page.elements.length} elements
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom - AI Chat */}
          <div style={{
            flex: chatCollapsed ? '0 0 40px' : '1 1 60%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            transition: 'flex 0.2s ease',
          }}>
            {/* Chat Header */}
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
            onClick={() => setChatCollapsed(!chatCollapsed)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1a1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Chat
                </span>
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b6b6b"
                strokeWidth="2"
                style={{
                  transform: chatCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {!chatCollapsed && (
            <AIChatPanel
              ref={chatPanelRef}
              currentFile={selectedFile}
              currentCode={selectedFile ? fileContents[selectedFile.replace(/^\//, '')] : undefined}
              projectName={githubRepo?.name || 'Nuovo Progetto'}
              currentFiles={fileContents}
              onFilesUpdate={(updatedFiles) => {
                // Apply file updates from AI artifacts
                setFileContents(prev => ({ ...prev, ...updatedFiles }));
                // Update WebContainer files for live preview (always, not just for GitHub projects)
                setWebcontainerFiles(prev => ({ ...prev, ...updatedFiles }));
                console.log('[DesignEditor] Files updated from AI:', Object.keys(updatedFiles));
              }}
              onRestoreSnapshot={(files) => {
                setFileContents(files);
                // Refresh the preview (always, not just for GitHub projects)
                setWebcontainerFiles(files);
              }}
              onApplyCode={(code, filePath) => {
                if (filePath) {
                  setFileContents(prev => ({
                    ...prev,
                    [filePath.replace(/^\//, '')]: code
                  }));
                }
                if (!githubRepo) {
                  const projectFiles: Record<string, string> = {
                    'package.json': JSON.stringify({
                      name: 'ai-generated-project',
                      private: true,
                      version: '0.0.0',
                      type: 'module',
                      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
                      dependencies: { 'react': '^18.2.0', 'react-dom': '^18.2.0' },
                      devDependencies: {
                        '@vitejs/plugin-react': '^4.2.0',
                        'vite': '^5.0.0',
                        'autoprefixer': '^10.4.16',
                        'postcss': '^8.4.32',
                        'tailwindcss': '^3.4.0'
                      }
                    }, null, 2),
                    'vite.config.js': `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { host: true }\n});`,
                    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n}`,
                    'postcss.config.js': `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}`,
                    'index.html': `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Preview</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>`,
                    'src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
                    'src/index.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
                    'src/App.jsx': code,
                  };
                  setWebcontainerFiles(projectFiles);
                  setUseWebContainer(true);
                }
              }}
            />
            )}
          </div>
          </>
          )}
        </div>

        {/* Center Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'pages' ? (
            /* Pages Mode - Full Site Tree */
            <div style={{ flex: 1, display: 'flex', background: '#0a0a0a' }}>
              <div style={{
                flex: 1,
                padding: 24,
                overflowY: 'auto',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 24,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                  </svg>
                  <h2 style={{ color: '#e5e5e5', fontSize: 18, fontWeight: 600, margin: 0 }}>
                    Site Structure
                  </h2>
                </div>

                {/* File Tree */}
                <div style={{
                  background: '#111',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <FileExplorer
                    files={projectFiles}
                    onFileSelect={(file) => {
                      if (file.type !== 'file') return;
                      setSelectedFile(file.path);
                      setViewMode('code');
                    }}
                    selectedFile={selectedFile}
                    projectName={githubRepo?.name || "Portfolio"}
                  />
                </div>

                {/* Routes/Pages Section */}
                {discoveredPages.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Routes ({discoveredPages.length})
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 12,
                    }}>
                      {discoveredPages.map(page => (
                        <div
                          key={page.path}
                          onClick={() => {
                            setCurrentPreviewPath(page.path);
                            setViewMode('design');
                          }}
                          style={{
                            padding: 16,
                            background: currentPreviewPath === page.path ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                            border: currentPreviewPath === page.path ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span style={{ color: '#e5e5e5', fontWeight: 500, fontSize: 13 }}>{page.name}</span>
                          </div>
                          <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 11 }}>{page.path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'code' ? (
            /* Code Mode - Full Width Editor */
            <div style={{ flex: 1, display: 'flex' }}>
              {/* File Explorer for Code Mode */}
              <div style={{
                width: 240,
                background: '#111',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                overflowY: 'auto',
              }}>
                <FileExplorer
                  files={projectFiles}
                  onFileSelect={(file) => {
                    if (file.type !== 'file') return;
                    setSelectedFile(file.path);
                    if (githubRepo && !fileContents[file.path]) {
                      const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
                      fetch(`${API_URL}/api/github/file/${githubRepo.owner}/${githubRepo.name}/${filePath}?userId=${githubRepo.userId}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.content) {
                            setFileContents(prev => ({ ...prev, [file.path]: data.content }));
                          }
                        })
                        .catch(err => console.error('Error loading file:', err));
                    }
                  }}
                  selectedFile={selectedFile}
                  projectName={githubRepo?.name || "Portfolio"}
                />
              </div>
              {/* Code Editor */}
              <div style={{ flex: 1, background: '#0a0a0a' }}>
                <CodePanel
                  elements={[]}
                  showPanel={true}
                  onClose={() => setViewMode('design')}
                  selectedFile={selectedFile}
                  fileContent={selectedFile ? fileContents[selectedFile.replace(/^\//, '')] : undefined}
                  onFileContentChange={(content) => {
                    if (selectedFile) {
                      setFileContents(prev => ({
                        ...prev,
                        [selectedFile.replace(/^\//, '')]: content
                      }));
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            /* Design Mode - Canvas */
            <div style={{ flex: 1, display: 'flex' }}>
              {/* Component Library Sidebar */}
              {showComponentLibrary && (
                <div className="de-component-library">
                  <div className="de-panel-header">
                    <span className="de-panel-title">Component Library</span>
                    <button
                      className="de-icon-btn"
                      onClick={() => setShowComponentLibrary(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="de-library-search">
                    <input
                      type="text"
                      className="de-input"
                      placeholder="Search components..."
                      value={componentSearch}
                      onChange={(e) => setComponentSearch(e.target.value)}
                    />
                  </div>

                  {/* Categories */}
                  <div className="de-library-categories">
                    {COMPONENT_LIBRARY.map(cat => (
                      <button
                        key={cat.id}
                        className={`de-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <span className="de-category-icon">{Icons[cat.icon]}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Components Grid */}
                  <div className="de-library-grid">
                    {COMPONENT_LIBRARY.find(c => c.id === selectedCategory)?.components
                      .filter(comp =>
                        componentSearch === '' ||
                        comp.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                        comp.description.toLowerCase().includes(componentSearch.toLowerCase())
                      )
                      .map(comp => (
                        <div
                          key={comp.id}
                          className="de-component-card"
                          onClick={() => addComponentFromLibrary(comp)}
                        >
                          <div
                            className="de-component-preview"
                            style={{ backgroundColor: comp.elements[0]?.fill || '#1a1a1a' }}
                          >
                            <div
                              className="de-component-mini"
                              style={{
                                width: '60%',
                                height: '60%',
                                backgroundColor: comp.elements[0]?.fill || '#1a1a1a',
                                borderRadius: comp.elements[0]?.borderRadius || 8,
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            />
                          </div>
                          <div className="de-component-info">
                            <span className="de-component-name">{comp.name}</span>
                            <span className="de-component-desc">{comp.description}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Canvas */}
              <div
                className="de-canvas-area"
                ref={canvasAreaRef}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Pan/Zoom Transform Container */}
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px)`,
                    transition: 'none',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                {/* Device Frame Indicator with Dropdown */}
                {(useWebContainer || projectUrl) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                    position: 'relative',
                    zIndex: 50,
                  }}>
                    {/* Edit Mode Toggle */}
                    {webcontainerReady && (
                      <button
                        onClick={() => {
                          const newMode = !visualEditMode;
                          setVisualEditMode(newMode);
                          if (newMode) {
                            setVisualSelectedElement(null);
                            console.log('Visual Edit Mode ENABLED - Click on elements to select them');
                          } else {
                            setVisualSelectedElement(null);
                            console.log('Visual Edit Mode DISABLED');
                          }
                        }}
                        title={visualEditMode ? 'Exit edit mode (ESC)' : 'Enter visual edit mode - click elements to select and edit'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: visualEditMode ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)' : 'rgba(255,255,255,0.05)',
                          border: visualEditMode ? '1px solid #8b5cf6' : '1px solid transparent',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: visualEditMode ? 600 : 400,
                          color: visualEditMode ? '#c4b5fd' : '#71717a',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: visualEditMode ? '0 0 20px rgba(139, 92, 246, 0.3)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!visualEditMode) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!visualEditMode) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {visualEditMode ? 'Editing' : 'Edit'}
                        {visualEditMode && (
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#22c55e',
                            animation: 'pulse 1.5s infinite',
                          }} />
                        )}
                      </button>
                    )}

                    {/* Element Toolbar - only in edit mode */}
                    {visualEditMode && (
                      <ElementToolbar
                        onAddElement={(element) => {
                          // TODO: Add element to the preview
                          console.log('[DesignEditor] Add element:', element);
                          // For now, just log - will need to implement adding elements to WebContainer
                        }}
                        disabled={!webcontainerReady}
                      />
                    )}

                    {/* Device Selector */}
                    <div
                      ref={deviceSelectorRef}
                      onClick={() => {
                        const newState = !showDeviceDropdown;
                        setShowDeviceDropdown(newState);
                        if (newState && deviceSelectorRef.current) {
                          const rect = deviceSelectorRef.current.getBoundingClientRect();
                          setDropdownPosition({
                            top: rect.bottom + 8,
                            left: rect.left + rect.width / 2,
                          });
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 14px',
                        background: showDeviceDropdown
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
                          : 'rgba(255,255,255,0.04)',
                        border: showDeviceDropdown
                          ? '1px solid rgba(139, 92, 246, 0.4)'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        fontSize: 12,
                        color: '#a1a1aa',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!showDeviceDropdown) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!showDeviceDropdown) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }
                      }}
                    >
                      {/* Device icon */}
                      <span style={{
                        color: showDeviceDropdown ? '#a78bfa' : '#71717a',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        {selectedDevice.category === 'desktop' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                        ) : selectedDevice.category === 'tablet' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                          </svg>
                        )}
                      </span>
                      <span style={{
                        color: showDeviceDropdown ? '#e5e5e5' : '#d4d4d8',
                        fontWeight: 500
                      }}>
                        {selectedDevice.name}
                      </span>
                      <span style={{
                        color: '#52525b',
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}>
                        {selectedDevice.width}×{selectedDevice.height}
                      </span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={showDeviceDropdown ? '#a78bfa' : '#71717a'}
                        strokeWidth="2"
                        style={{
                          transition: 'transform 0.2s ease',
                          transform: showDeviceDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {/* Current Route */}
                    {githubRepo && currentPreviewPath && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          background: 'rgba(74, 222, 128, 0.1)',
                          border: '1px solid rgba(74, 222, 128, 0.2)',
                          borderRadius: 20,
                          fontSize: 12,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span style={{ fontFamily: 'monospace', color: '#4ade80', fontWeight: 500 }}>{currentPreviewPath}</span>
                      </div>
                    )}

                    {/* Device Dropdown - rendered via Portal to escape overflow context */}
                    {showDeviceDropdown && dropdownPosition && createPortal(
                      <div
                        className="device-dropdown-scroll"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: dropdownPosition.top,
                          left: dropdownPosition.left,
                          transform: 'translateX(-50%)',
                          background: '#1a1a1a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 12,
                          padding: 8,
                          minWidth: 280,
                          maxHeight: '60vh',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          zIndex: 10000,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          pointerEvents: 'auto',
                      }}>
                        {(['desktop', 'tablet', 'phone'] as DeviceCategory[]).map(category => (
                          <div key={category}>
                            <div style={{
                              padding: '8px 12px',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#5a5a5a',
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}>
                              {category === 'desktop' ? '💻 Desktop' : category === 'tablet' ? '📱 Tablet' : '📱 Phone'}
                            </div>
                            {DEVICE_PRESETS.filter(d => d.category === category).map(device => (
                              <div
                                key={device.id}
                                onClick={() => {
                                  setSelectedDevice(device);
                                  setCurrentBreakpoint(device.category);
                                  setShowDeviceDropdown(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  background: selectedDevice.id === device.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedDevice.id !== device.id) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = selectedDevice.id === device.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent';
                                }}
                              >
                                <span style={{
                                  color: selectedDevice.id === device.id ? '#a78bfa' : '#e5e5e5',
                                  fontSize: 13,
                                }}>
                                  {device.name}
                                </span>
                                <span style={{
                                  color: '#5a5a5a',
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                }}>
                                  {device.width} × {device.height}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                )}

          {/* Visual Edit Mode Banner */}
          {visualEditMode && (
            <div style={{
              position: 'absolute',
              top: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
              backdropFilter: 'blur(8px)',
              padding: '8px 20px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              zIndex: 100,
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              animation: 'fadeIn 0.2s ease',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse 1.5s infinite',
              }} />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
                Edit Mode - Click elements to select
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                marginLeft: 4,
              }}>
                ESC to exit
              </span>
            </div>
          )}

          {/* Se abbiamo un projectUrl, mostra l'iframe */}
          {projectUrl && !useWebContainer ? (
            <div
              style={{
                width: activeBreakpoint.width,
                minHeight: 'calc(100vh - 200px)',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                background: '#fff',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
            >
              {/* Loading Overlay */}
              {iframeLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      border: '3px solid rgba(255,255,255,0.1)',
                      borderTopColor: '#8b5cf6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div style={{ color: '#a1a1aa', fontSize: 14 }}>
                    Caricamento preview...
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={projectUrl}
                onLoad={() => setIframeLoading(false)}
                style={{
                  width: '100%',
                  height: 'calc(100vh - 200px)',
                  border: 'none',
                }}
                title="Project Preview"
                allow="cross-origin-isolated"
              />
            </div>
          ) : useWebContainer ? (
            /* WebContainer Preview - for AI-generated code */
            (() => {
              // Calculate scale to fit device in container with padding
              const padding = 80; // padding around device frame
              const availableWidth = containerDimensions.width - padding;
              const availableHeight = containerDimensions.height - padding;

              const scaleX = availableWidth / selectedDevice.width;
              const scaleY = availableHeight / selectedDevice.height;
              const autoScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

              // Final scale combines auto-scale with user zoom
              const finalScale = visualEditMode ? 1 : autoScale * zoom;

              return (
                <div
                  style={{
                    width: visualEditMode ? '100%' : selectedDevice.width,
                    maxWidth: visualEditMode ? 1200 : undefined,
                    height: visualEditMode ? 'auto' : selectedDevice.height,
                    minHeight: visualEditMode ? 'calc(100vh - 200px)' : undefined,
                    transform: visualEditMode ? 'none' : `scale(${finalScale})`,
                    transformOrigin: 'top center',
                    borderRadius: visualEditMode ? 8 : selectedDevice.category === 'phone' ? 44 : selectedDevice.category === 'tablet' ? 24 : 12,
                    overflow: 'hidden',
                    boxShadow: selectedDevice.category !== 'desktop'
                      ? '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
                      : '0 8px 32px rgba(0,0,0,0.4)',
                    border: visualEditMode ? '2px solid #8b5cf6' : selectedDevice.category !== 'desktop' ? '12px solid #1a1a1a' : 'none',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    background: selectedDevice.category !== 'desktop' ? '#000' : '#fff',
                  }}
                >
                  {/* Phone notch for mobile view (Dynamic Island style) - hide in edit mode */}
                  {selectedDevice.category === 'phone' && !visualEditMode && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 120,
                      height: 34,
                      background: '#000',
                      borderRadius: 20,
                      zIndex: 10,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                    }} />
                  )}
                  {/* Inner content area with rounded corners */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: selectedDevice.category === 'phone' ? 32 : selectedDevice.category === 'tablet' ? 12 : 0,
                      background: '#fff',
                    }}
                  >
                    <WebContainerPreview
                      ref={webContainerPreviewRef}
                      files={webcontainerFiles}
                      autoStart={true}
                      onStatusChange={(status) => {
                        setWebcontainerReady(status === 'ready');
                      }}
                      onUrlReady={(url) => {
                        setWebcontainerUrl(url);
                      }}
                      currentPath={currentPreviewPath}
                      onPathChange={setCurrentPreviewPath}
                      width="100%"
                      height={visualEditMode ? '100vh' : '100%'}
                    />
                  </div>
                  {/* Visual Edit Overlay - using PreviewManager from EditablePreview */}
                  {webcontainerReady && (
                    <PreviewManager
                      ref={previewManagerRef}
                      previewUrl={webcontainerUrl}
                      externalIframeRef={wcIframeRef}
                      overlayOnly={true}
                      zoom={zoom}
                      onElementSelect={handleEditableElementSelect}
                      onPropsChange={handleEditablePropsChange}
                      onReady={() => {
                        console.log('[DesignEditor] Editable runtime ready!');
                      }}
                    />
                  )}
                </div>
              );
            })()
          ) : (
            /* Design Mode - Canvas with elements */
            <div
              className="de-canvas"
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              style={{
                width: activeBreakpoint.width,
                minHeight: '100%',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Design Mode - Show elements or empty state */}
              {rootElements.length > 0 ? (
                rootElements.map(el => renderElement(el))
              ) : (
                /* Empty state - show options to start */
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 24,
                  color: '#666',
                }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 8 }}>
                      Inizia un nuovo progetto
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                      Usa l'AI per generare codice o avvia un progetto vuoto
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setUseWebContainer(true)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Avvia Preview
                    </button>
                    <button
                      onClick={() => setShowComponentLibrary(true)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                      </svg>
                      Componenti
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
              </div>

          {/* Bottom Toolbar */}
          <div className="de-bottom-toolbar">
            <div className="de-breakpoint-selector">
              {BREAKPOINTS.map(bp => (
                <button
                  key={bp.id}
                  className={`de-tool-btn ${currentBreakpoint === bp.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentBreakpoint(bp.id);
                    const defaultDevice = DEVICE_PRESETS.find(d => d.category === bp.icon);
                    if (defaultDevice) setSelectedDevice(defaultDevice);
                  }}
                  title={`${bp.name} (${bp.width}px)`}
                >
                  {Icons[bp.icon]}
                </button>
              ))}
            </div>

            <div className="de-toolbar-divider" />

            {/* Inspect Toggle - only in live mode */}
            {liveMode && (
              <>
                <button
                  className={`de-tool-btn ${isInspecting ? 'active' : ''}`}
                  onClick={() => setIsInspecting(!isInspecting)}
                  title="Inspect Elements (I)"
                  style={{
                    background: isInspecting ? 'rgba(34, 197, 94, 0.2)' : undefined,
                    color: isInspecting ? '#22c55e' : undefined,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                <div className="de-toolbar-divider" />
              </>
            )}

            <button
              className={`de-tool-btn ${tool === 'select' ? 'active' : ''}`}
              onClick={() => setTool('select')}
              title="Select (V)"
            >
              {Icons.cursor}
            </button>
            <button
              className={`de-tool-btn ${tool === 'hand' ? 'active' : ''}`}
              onClick={() => setTool('hand')}
              title="Hand (H)"
            >
              {Icons.hand}
            </button>
            <button
              className={`de-tool-btn ${tool === 'frame' ? 'active' : ''}`}
              onClick={() => setTool('frame')}
              title="Frame (F)"
            >
              {Icons.frame}
            </button>

            <div className="de-toolbar-divider" />

            <button
              className={`de-tool-btn ${tool === 'rectangle' ? 'active' : ''}`}
              onClick={() => setTool('rectangle')}
              title="Rectangle (R)"
            >
              {Icons.rectangle}
            </button>
            <button
              className={`de-tool-btn ${tool === 'ellipse' ? 'active' : ''}`}
              onClick={() => setTool('ellipse')}
              title="Ellipse (O)"
            >
              {Icons.ellipse}
            </button>
            <button
              className={`de-tool-btn ${tool === 'text' ? 'active' : ''}`}
              onClick={() => setTool('text')}
              title="Text (T)"
            >
              {Icons.text}
            </button>
            <button
              className={`de-tool-btn ${tool === 'image' ? 'active' : ''}`}
              onClick={() => setTool('image')}
              title="Image"
            >
              {Icons.image}
            </button>

            <div className="de-toolbar-divider" />

            <div className="de-zoom-controls">
              <button className="de-zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom out (⌘-)">
                −
              </button>
              <button
                className="de-zoom-value"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                title="Reset zoom (⌘0)"
                style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', font: 'inherit' }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button className="de-zoom-btn" onClick={() => setZoom(z => Math.min(4, z + 0.25))} title="Zoom in (⌘+)">
                +
              </button>
                </div>
              </div>
              </div>

              {/* Right Panel - Properties (only show when editing or has selection) */}
              {(showPropertiesPanel || visualEditMode || selectedElement || (liveMode && selectedLiveElement)) && (
              <div className="de-right-panel" style={{ position: 'relative' }}>
                <div className="de-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="de-panel-title">Properties</span>
                  <button
                    onClick={() => {
                      setShowPropertiesPanel(false);
                      setVisualSelectedElement(null);
                      setSelectedId(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6b6b6b',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#a1a1a1'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b6b6b'}
                    title="Close panel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

          {/* Visual Edit Mode - RightSidebar with tabs */}
          {visualEditMode && editableSelectedElement ? (
            <RightSidebar
              element={editableSelectedElement ? {
                id: editableSelectedElement.id,
                tagName: editableSelectedElement.tagName || 'div',
                className: editableSelectedElement.className || '',
                styles: editableSelectedElement.styles || {},
                computedStyles: editableSelectedElement.computedStyles || {},
                textContent: editableSelectedElement.textContent,
              } : null}
              onStyleChange={(styles) => {
                if (designEngineRef.current && editableSelectedElement) {
                  designEngineRef.current.queueChange({
                    type: 'style',
                    elementId: editableSelectedElement.id,
                    file: 'src/App.tsx',
                    component: editableSelectedElement.componentName,
                    change: styles,
                  });
                }
              }}
              onTextChange={(text) => {
                if (designEngineRef.current && editableSelectedElement) {
                  designEngineRef.current.queueChange({
                    type: 'content',
                    elementId: editableSelectedElement.id,
                    file: 'src/App.tsx',
                    component: editableSelectedElement.componentName,
                    change: { text },
                  });
                }
              }}
              onApplyToCode={async () => {
                if (designEngineRef.current) {
                  await designEngineRef.current.flush();
                }
              }}
              isApplying={isApplyingStyles}
            />
          ) : visualEditMode && visualSelectedElement ? (
            // Fallback to old VisualPropsPanel for non-editable projects
            <VisualPropsPanel
              element={visualSelectedElement}
              zoom={zoom}
              onOpenFile={(sourceLocation) => {
                setSelectedFile(sourceLocation.fileName);
                setShowCodePanel(true);
              }}
              onApplyWithAI={async (element, changes) => {
                const changeDescriptions = changes.map(c =>
                  `- ${c.property}: ${c.oldValue} → ${c.newValue}`
                ).join('\n');

                const sourceInfo = element.sourceLocation
                  ? `\n\nSource file: ${element.sourceLocation.fileName}:${element.sourceLocation.lineNumber}`
                  : '';

                const componentInfo = element.componentName
                  ? `React component: ${element.componentName}`
                  : `HTML element: <${element.tagName}>`;

                const prompt = `Update the styles for ${componentInfo}${element.className ? ` with class "${element.className.split(' ')[0]}"` : ''}${element.id ? ` and id "${element.id}"` : ''}.${sourceInfo}

Make these CSS changes:
${changeDescriptions}

Find the component in the codebase and update the styles. If using Tailwind, convert to Tailwind classes. If using CSS-in-JS or inline styles, update accordingly. Return the complete updated component code.`;

                if (chatPanelRef.current) {
                  await chatPanelRef.current.sendMessage(prompt);
                } else {
                  console.warn('Chat panel ref not available');
                }
              }}
            />
          ) : selectedElement ? (
            <div className="de-properties-scroll">
              {/* Name */}
              <div className="de-prop-group">
                <div className="de-prop-group-content" style={{ paddingTop: 12 }}>
                  <input
                    type="text"
                    value={selectedElement.name}
                    onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                    className="de-input"
                    style={{ fontWeight: 500 }}
                  />
                </div>
              </div>

              {/* Position & Size */}
              <div className="de-prop-group">
                <div className="de-prop-group-header">
                  <span className="de-prop-group-title">Position</span>
                </div>
                <div className="de-prop-group-content">
                  <div className="de-prop-grid">
                    <div className="de-number-field">
                      <span className="de-number-label">X</span>
                      <input
                        type="number"
                        className="de-number-input"
                        value={Math.round(selectedElement.x)}
                        onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                        disabled={!!selectedElement.parentId}
                      />
                    </div>
                    <div className="de-number-field">
                      <span className="de-number-label">Y</span>
                      <input
                        type="number"
                        className="de-number-input"
                        value={Math.round(selectedElement.y)}
                        onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                        disabled={!!selectedElement.parentId}
                      />
                    </div>
                  </div>

                  {/* Width & Height with sizing mode */}
                  <div className="de-prop-field" style={{ marginTop: 12 }}>
                    <span className="de-prop-label">Width</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        className="de-input"
                        style={{ flex: 1 }}
                        value={typeof selectedElement.width === 'number' ? selectedElement.width : ''}
                        onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                        disabled={selectedElement.width === 'fill' || selectedElement.width === 'auto'}
                      />
                      <select
                        className="de-input de-select"
                        style={{ width: 70 }}
                        value={typeof selectedElement.width === 'string' ? selectedElement.width : 'fixed'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateElement(selectedElement.id, {
                            width: val === 'fixed' ? 100 : val as 'auto' | 'fill'
                          });
                        }}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="fill">Fill</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>

                  <div className="de-prop-field" style={{ marginTop: 8 }}>
                    <span className="de-prop-label">Height</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        className="de-input"
                        style={{ flex: 1 }}
                        value={typeof selectedElement.height === 'number' ? selectedElement.height : ''}
                        onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                        disabled={selectedElement.height === 'fill' || selectedElement.height === 'auto'}
                      />
                      <select
                        className="de-input de-select"
                        style={{ width: 70 }}
                        value={typeof selectedElement.height === 'string' ? selectedElement.height : 'fixed'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateElement(selectedElement.id, {
                            height: val === 'fixed' ? 100 : val as 'auto' | 'fill'
                          });
                        }}
                      >
                        <option value="fixed">Fixed</option>
                        <option value="fill">Fill</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Layout - only for frames */}
              {(selectedElement.type === 'frame' || selectedElement.type === 'component') && renderAutoLayoutPanel()}

              {/* Appearance */}
              <div className="de-prop-group">
                <div className="de-prop-group-header">
                  <span className="de-prop-group-title">Appearance</span>
                </div>
                <div className="de-prop-group-content">
                  <div className="de-prop-field">
                    <span className="de-prop-label">Fill</span>
                    <div className="de-color-row">
                      <div className="de-color-swatch" style={{ backgroundColor: selectedElement.fill }}>
                        <input
                          type="color"
                          value={selectedElement.fill}
                          onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        />
                      </div>
                      <input
                        type="text"
                        value={selectedElement.fill}
                        onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        className="de-input de-color-text"
                      />
                    </div>
                  </div>

                  <div className="de-prop-field" style={{ marginTop: 12 }}>
                    <span className="de-prop-label">Corner Radius</span>
                    <div className="de-number-field">
                      <input
                        type="number"
                        className="de-number-input"
                        value={selectedElement.borderRadius}
                        onChange={(e) => updateElement(selectedElement.id, { borderRadius: Number(e.target.value) })}
                        min={0}
                      />
                      <span className="de-number-label">px</span>
                    </div>
                  </div>

                  <div className="de-prop-field" style={{ marginTop: 12 }}>
                    <span className="de-prop-label">Opacity</span>
                    <div className="de-number-field">
                      <input
                        type="number"
                        className="de-number-input"
                        min={0}
                        max={100}
                        value={Math.round(selectedElement.opacity * 100)}
                        onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) / 100 })}
                      />
                      <span className="de-number-label">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography (text only) */}
              {selectedElement.type === 'text' && (
                <div className="de-prop-group">
                  <div className="de-prop-group-header">
                    <span className="de-prop-group-title">Typography</span>
                  </div>
                  <div className="de-prop-group-content">
                    <div className="de-prop-field">
                      <span className="de-prop-label">Content</span>
                      <input
                        type="text"
                        value={selectedElement.content || ''}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="de-input"
                      />
                    </div>
                    <div className="de-prop-grid" style={{ marginTop: 12 }}>
                      <div className="de-prop-field">
                        <span className="de-prop-label">Size</span>
                        <input
                          type="number"
                          value={selectedElement.fontSize || 16}
                          onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                          className="de-input"
                        />
                      </div>
                      <div className="de-prop-field">
                        <span className="de-prop-label">Weight</span>
                        <select
                          value={selectedElement.fontWeight || '400'}
                          onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })}
                          className="de-input de-select"
                        >
                          <option value="300">Light</option>
                          <option value="400">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">Semibold</option>
                          <option value="700">Bold</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="de-prop-group">
                <div className="de-prop-group-content" style={{ paddingTop: 12 }}>
                  <button
                    className="de-delete-btn"
                    onClick={() => deleteElement(selectedElement.id)}
                  >
                    Delete Element
                  </button>
                </div>
              </div>
            </div>
          ) : liveMode && selectedLiveElement ? (
            /* Live Mode Properties */
            <div className="de-properties-scroll">
              {/* Element Info */}
              <div className="de-prop-group">
                <div className="de-prop-group-content" style={{ paddingTop: 12 }}>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>
                        {selectedLiveElement.tagName.toLowerCase()}
                      </span>
                      {selectedLiveElement.className && (
                        <span style={{ color: '#6b6b6b', fontSize: 11 }}>
                          .{selectedLiveElement.className.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b6b6b' }}>
                      {Math.round(selectedLiveElement.rect.width)} × {Math.round(selectedLiveElement.rect.height)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Computed Styles */}
              <div className="de-prop-group">
                <div className="de-prop-group-header">
                  <span className="de-prop-group-title">Computed Styles</span>
                </div>
                <div className="de-prop-group-content">
                  {Object.entries(selectedLiveElement.styles).map(([key, value]) => (
                    value && value !== 'none' && value !== 'normal' && value !== 'auto' && (
                      <div key={key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        fontSize: 12,
                      }}>
                        <span style={{ color: '#6b6b6b' }}>{key}</span>
                        <span style={{ color: '#a1a1a1', fontFamily: 'monospace', fontSize: 11 }}>
                          {String(value).length > 20 ? String(value).substring(0, 20) + '...' : value}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="de-empty-state">
              {liveMode ? 'Click on an element to inspect it' : 'Select an element to edit its properties'}
            </div>
          )}
              </div>
              )}

              {/* Code Panel in Design Mode - Hide when GitHub project is loaded */}
              {showCodePanel && !githubRepo && (
                <div className="de-code-panel">
                  <CodePanel
                    elements={codeElements}
                    showPanel={showCodePanel}
                    onClose={() => setShowCodePanel(false)}
                    componentName="Design"
                    fileContent={selectedFile ? fileContents[selectedFile] : undefined}
                    fileName={selectedFile?.split('/').pop()}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {showTimeline && (
        <div className="de-timeline">
          <div className="de-timeline-header">
            <span className="de-panel-title">Timeline</span>
          </div>
          <div className="de-timeline-content">
            <div className="de-timeline-layers">
              {elements.map(el => (
                <div key={el.id} className="de-timeline-layer">{el.name}</div>
              ))}
            </div>
            <div className="de-timeline-tracks">
              <div className="de-timeline-ruler">
                {[0, 0.5, 1, 1.5, 2].map(t => (
                  <span key={t} style={{ left: `${t * 200}px` }}>{t}s</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Preview Header */}
          <div
            style={{
              height: 48,
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#4ade80', fontWeight: 500, fontSize: 13 }}>Preview Mode</span>
              <span style={{ color: '#5a5a5a', fontSize: 12 }}>{selectedDevice.name} • {selectedDevice.width} × {selectedDevice.height}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {BREAKPOINTS.map(bp => (
                <button
                  key={bp.id}
                  onClick={() => {
                    setCurrentBreakpoint(bp.id);
                    const defaultDevice = DEVICE_PRESETS.find(d => d.category === bp.icon);
                    if (defaultDevice) setSelectedDevice(defaultDevice);
                  }}
                  style={{
                    padding: '6px 10px',
                    background: currentBreakpoint === bp.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: currentBreakpoint === bp.id ? '#fff' : '#6b6b6b',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {Icons[bp.icon]}
                  {bp.name}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Close
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflow: 'auto',
              padding: 40,
              paddingBottom: 80,
            }}
          >
            <div
              style={{
                width: activeBreakpoint.width,
                minHeight: 600,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Render elements in preview mode (no selection, no handles) */}
              {rootElements.map(el => {
                const style: React.CSSProperties = {
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: typeof el.width === 'number' ? el.width : 'auto',
                  height: typeof el.height === 'number' ? el.height : 'auto',
                  backgroundColor: el.fill,
                  borderRadius: el.borderRadius,
                  opacity: el.opacity,
                  display: el.autoLayout ? 'flex' : undefined,
                  flexDirection: el.autoLayout?.direction === 'horizontal' ? 'row' : 'column',
                  gap: el.autoLayout?.gap,
                  padding: el.autoLayout?.padding,
                  alignItems: el.autoLayout?.alignItems,
                  justifyContent: el.autoLayout?.justifyContent,
                  flexWrap: el.autoLayout?.wrap ? 'wrap' : undefined,
                };

                if (el.type === 'text') {
                  return (
                    <div key={el.id} style={{ ...style, color: el.textColor || '#000', fontSize: el.fontSize, fontWeight: el.fontWeight }}>
                      {el.text || 'Text'}
                    </div>
                  );
                }

                return <div key={el.id} style={style} />;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Project Loader Modal */}
      {showUrlInput && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => projectStatus === 'idle' && setShowUrlInput(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: 16,
              padding: 32,
              width: 520,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              Carica Progetto
            </h2>
            <p style={{ color: '#6b6b6b', fontSize: 13, marginBottom: 20 }}>
              Avvia automaticamente il tuo progetto React o inserisci un URL
            </p>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4 }}>
              <button
                onClick={() => setLoaderTab('path')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: loaderTab === 'path' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: loaderTab === 'path' ? '#fff' : '#6b6b6b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                📁 Percorso Progetto
              </button>
              <button
                onClick={() => setLoaderTab('url')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: loaderTab === 'url' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: loaderTab === 'url' ? '#fff' : '#6b6b6b',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                🔗 URL Manuale
              </button>
            </div>

            {loaderTab === 'path' ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: '#a1a1a1', fontSize: 12, marginBottom: 8 }}>
                    Percorso del progetto
                  </label>
                  <input
                    type="text"
                    placeholder="/Users/nome/progetti/mio-progetto"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    disabled={projectStatus !== 'idle'}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      opacity: projectStatus !== 'idle' ? 0.5 : 1,
                    }}
                    autoFocus
                  />
                </div>

                {/* Progress */}
                {projectStatus !== 'idle' && (
                  <div style={{
                    marginBottom: 16,
                    padding: 16,
                    background: '#0a0a0a',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {projectStatus === 'ready' ? (
                        <span style={{ color: '#22c55e', fontSize: 20 }}>✓</span>
                      ) : projectStatus === 'error' ? (
                        <span style={{ color: '#ef4444', fontSize: 20 }}>✗</span>
                      ) : (
                        <div style={{
                          width: 20,
                          height: 20,
                          border: '2px solid #3b82f6',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }} />
                      )}
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                        {projectStatus === 'installing' && 'Installando dipendenze...'}
                        {projectStatus === 'starting' && 'Avviando dev server...'}
                        {projectStatus === 'ready' && 'Progetto avviato!'}
                        {projectStatus === 'error' && 'Errore durante l\'avvio'}
                      </span>
                    </div>

                    {/* Logs */}
                    <div style={{
                      maxHeight: 150,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: '#6b6b6b',
                      lineHeight: 1.6,
                    }}>
                      {projectLogs.slice(-10).map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowUrlInput(false);
                      setProjectStatus('idle');
                      setProjectLogs([]);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#a1a1a1',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => startProject(projectPath)}
                    disabled={!projectPath || projectStatus !== 'idle'}
                    style={{
                      padding: '10px 20px',
                      background: projectPath && projectStatus === 'idle' ? '#22c55e' : '#2a2a2a',
                      border: 'none',
                      borderRadius: 8,
                      color: projectPath && projectStatus === 'idle' ? '#fff' : '#6b6b6b',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: projectPath && projectStatus === 'idle' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    🚀 Avvia Progetto
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', color: '#a1a1a1', fontSize: 12, marginBottom: 8 }}>
                    URL del progetto
                  </label>
                  <input
                    type="url"
                    placeholder="http://localhost:3000"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#0a0a0a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && projectUrl) {
                        setShowUrlInput(false);
                        setLiveMode(true);
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowUrlInput(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#a1a1a1',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      if (projectUrl) {
                        setShowUrlInput(false);
                        setLiveMode(true);
                      }
                    }}
                    disabled={!projectUrl}
                    style={{
                      padding: '10px 20px',
                      background: projectUrl ? '#3b82f6' : '#2a2a2a',
                      border: 'none',
                      borderRadius: 8,
                      color: projectUrl ? '#fff' : '#6b6b6b',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: projectUrl ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Connetti
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Agentic Error Alerts (bolt.diy pattern) */}
      <ErrorAlertsContainer
        errors={agenticErrors}
        onFixWithAI={handleFixWithAI}
        onDismiss={dismissError}
        onDismissAll={dismissAllErrors}
        fixingErrorId={fixingErrorId}
      />

    </div>
  );
};

export default DesignEditor;
