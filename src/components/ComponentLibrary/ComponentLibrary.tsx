/**
 * ComponentLibrary
 *
 * Drag & drop component library inspired by Plasmic.
 * Pre-built UI components organized by category.
 */

import React, { useState } from 'react';

export interface ComponentTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  code: string;
  preview?: string;
  props?: Record<string, any>;
}

// Component categories
export const COMPONENT_CATEGORIES = [
  { id: 'layout', name: 'Layout', icon: '⬜' },
  { id: 'typography', name: 'Typography', icon: '✏️' },
  { id: 'buttons', name: 'Buttons', icon: '🔘' },
  { id: 'forms', name: 'Forms', icon: '📝' },
  { id: 'navigation', name: 'Navigation', icon: '🧭' },
  { id: 'media', name: 'Media', icon: '🖼️' },
  { id: 'feedback', name: 'Feedback', icon: '💬' },
  { id: 'data', name: 'Data Display', icon: '📊' },
];

// Pre-built component templates
export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  // Layout
  {
    id: 'container',
    name: 'Container',
    category: 'layout',
    icon: <LayoutIcon />,
    description: 'Centered container with max-width',
    code: `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {children}
</div>`,
  },
  {
    id: 'flex-row',
    name: 'Flex Row',
    category: 'layout',
    icon: <FlexRowIcon />,
    description: 'Horizontal flex container',
    code: `<div className="flex items-center gap-4">
  {children}
</div>`,
  },
  {
    id: 'flex-col',
    name: 'Flex Column',
    category: 'layout',
    icon: <FlexColIcon />,
    description: 'Vertical flex container',
    code: `<div className="flex flex-col gap-4">
  {children}
</div>`,
  },
  {
    id: 'grid-2',
    name: 'Grid 2 Cols',
    category: 'layout',
    icon: <GridIcon />,
    description: '2 column responsive grid',
    code: `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {children}
</div>`,
  },
  {
    id: 'grid-3',
    name: 'Grid 3 Cols',
    category: 'layout',
    icon: <GridIcon />,
    description: '3 column responsive grid',
    code: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {children}
</div>`,
  },
  {
    id: 'card',
    name: 'Card',
    category: 'layout',
    icon: <CardIcon />,
    description: 'Card with shadow and padding',
    code: `<div className="bg-white rounded-xl shadow-lg p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Title</h3>
  <p className="text-gray-600">Card content goes here.</p>
</div>`,
  },
  {
    id: 'section',
    name: 'Section',
    category: 'layout',
    icon: <SectionIcon />,
    description: 'Page section with padding',
    code: `<section className="py-16 px-4">
  <div className="max-w-7xl mx-auto">
    {children}
  </div>
</section>`,
  },

  // Typography
  {
    id: 'heading-1',
    name: 'Heading 1',
    category: 'typography',
    icon: <HeadingIcon />,
    description: 'Large page heading',
    code: `<h1 className="text-4xl md:text-5xl font-bold text-gray-900">
  Page Heading
</h1>`,
  },
  {
    id: 'heading-2',
    name: 'Heading 2',
    category: 'typography',
    icon: <HeadingIcon />,
    description: 'Section heading',
    code: `<h2 className="text-3xl font-bold text-gray-900">
  Section Heading
</h2>`,
  },
  {
    id: 'paragraph',
    name: 'Paragraph',
    category: 'typography',
    icon: <TextIcon />,
    description: 'Body text paragraph',
    code: `<p className="text-gray-600 leading-relaxed">
  Your paragraph text goes here. Make it as long or short as you need.
</p>`,
  },
  {
    id: 'link',
    name: 'Link',
    category: 'typography',
    icon: <LinkIcon />,
    description: 'Text link with hover',
    code: `<a href="#" className="text-blue-600 hover:text-blue-800 underline transition-colors">
  Click here
</a>`,
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'typography',
    icon: <BadgeIcon />,
    description: 'Small label badge',
    code: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  Badge
</span>`,
  },

  // Buttons
  {
    id: 'button-primary',
    name: 'Primary Button',
    category: 'buttons',
    icon: <ButtonIcon />,
    description: 'Primary action button',
    code: `<button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
  Click me
</button>`,
  },
  {
    id: 'button-secondary',
    name: 'Secondary Button',
    category: 'buttons',
    icon: <ButtonIcon />,
    description: 'Secondary action button',
    code: `<button className="px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors">
  Click me
</button>`,
  },
  {
    id: 'button-outline',
    name: 'Outline Button',
    category: 'buttons',
    icon: <ButtonIcon />,
    description: 'Outlined button',
    code: `<button className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors">
  Click me
</button>`,
  },
  {
    id: 'button-icon',
    name: 'Icon Button',
    category: 'buttons',
    icon: <ButtonIcon />,
    description: 'Button with icon',
    code: `<button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  Add Item
</button>`,
  },

  // Forms
  {
    id: 'input-text',
    name: 'Text Input',
    category: 'forms',
    icon: <InputIcon />,
    description: 'Text input field',
    code: `<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
  <input
    type="text"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="Enter text..."
  />
</div>`,
  },
  {
    id: 'input-email',
    name: 'Email Input',
    category: 'forms',
    icon: <InputIcon />,
    description: 'Email input field',
    code: `<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
  <input
    type="email"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="you@example.com"
  />
</div>`,
  },
  {
    id: 'textarea',
    name: 'Textarea',
    category: 'forms',
    icon: <TextareaIcon />,
    description: 'Multi-line text input',
    code: `<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
  <textarea
    rows={4}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    placeholder="Type your message..."
  />
</div>`,
  },
  {
    id: 'select',
    name: 'Select',
    category: 'forms',
    icon: <SelectIcon />,
    description: 'Dropdown select',
    code: `<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Select</label>
  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
    <option>Option 1</option>
    <option>Option 2</option>
    <option>Option 3</option>
  </select>
</div>`,
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'forms',
    icon: <CheckboxIcon />,
    description: 'Checkbox input',
    code: `<label className="flex items-center gap-3 cursor-pointer">
  <input type="checkbox" className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
  <span className="text-gray-700">Accept terms and conditions</span>
</label>`,
  },
  {
    id: 'radio',
    name: 'Radio Group',
    category: 'forms',
    icon: <RadioIcon />,
    description: 'Radio button group',
    code: `<div className="space-y-2">
  <label className="flex items-center gap-3 cursor-pointer">
    <input type="radio" name="option" className="w-5 h-5 text-blue-600" />
    <span className="text-gray-700">Option A</span>
  </label>
  <label className="flex items-center gap-3 cursor-pointer">
    <input type="radio" name="option" className="w-5 h-5 text-blue-600" />
    <span className="text-gray-700">Option B</span>
  </label>
</div>`,
  },
  {
    id: 'toggle',
    name: 'Toggle Switch',
    category: 'forms',
    icon: <ToggleIcon />,
    description: 'On/off toggle switch',
    code: `<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" className="sr-only peer" />
  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
  <span className="ml-3 text-gray-700">Enable feature</span>
</label>`,
  },

  // Navigation
  {
    id: 'navbar',
    name: 'Navbar',
    category: 'navigation',
    icon: <NavIcon />,
    description: 'Navigation bar with logo and links',
    code: `<nav className="bg-white shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16 items-center">
      <div className="font-bold text-xl text-gray-900">Logo</div>
      <div className="flex gap-8">
        <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
        <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
        <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
      </div>
    </div>
  </div>
</nav>`,
  },
  {
    id: 'breadcrumb',
    name: 'Breadcrumb',
    category: 'navigation',
    icon: <BreadcrumbIcon />,
    description: 'Navigation breadcrumb',
    code: `<nav className="flex" aria-label="Breadcrumb">
  <ol className="flex items-center gap-2">
    <li><a href="#" className="text-gray-500 hover:text-gray-700">Home</a></li>
    <li className="text-gray-400">/</li>
    <li><a href="#" className="text-gray-500 hover:text-gray-700">Products</a></li>
    <li className="text-gray-400">/</li>
    <li className="text-gray-900 font-medium">Current</li>
  </ol>
</nav>`,
  },
  {
    id: 'tabs',
    name: 'Tabs',
    category: 'navigation',
    icon: <TabsIcon />,
    description: 'Tab navigation',
    code: `<div className="border-b border-gray-200">
  <nav className="flex gap-8">
    <button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium">Tab 1</button>
    <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700">Tab 2</button>
    <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700">Tab 3</button>
  </nav>
</div>`,
  },

  // Media
  {
    id: 'image',
    name: 'Image',
    category: 'media',
    icon: <ImageIcon />,
    description: 'Responsive image',
    code: `<img
  src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800"
  alt="Description"
  className="w-full h-auto rounded-lg object-cover"
/>`,
  },
  {
    id: 'avatar',
    name: 'Avatar',
    category: 'media',
    icon: <AvatarIcon />,
    description: 'User avatar',
    code: `<img
  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
  alt="User"
  className="w-12 h-12 rounded-full object-cover"
/>`,
  },
  {
    id: 'video',
    name: 'Video',
    category: 'media',
    icon: <VideoIcon />,
    description: 'Video embed',
    code: `<div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
  <iframe
    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    className="w-full h-full"
    allowFullScreen
  />
</div>`,
  },

  // Feedback
  {
    id: 'alert-info',
    name: 'Info Alert',
    category: 'feedback',
    icon: <AlertIcon />,
    description: 'Information alert',
    code: `<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-blue-800">This is an informational message.</p>
</div>`,
  },
  {
    id: 'alert-success',
    name: 'Success Alert',
    category: 'feedback',
    icon: <AlertIcon />,
    description: 'Success alert',
    code: `<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
  <p className="text-green-800">Operation completed successfully!</p>
</div>`,
  },
  {
    id: 'alert-error',
    name: 'Error Alert',
    category: 'feedback',
    icon: <AlertIcon />,
    description: 'Error alert',
    code: `<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <p className="text-red-800">Something went wrong. Please try again.</p>
</div>`,
  },
  {
    id: 'spinner',
    name: 'Spinner',
    category: 'feedback',
    icon: <SpinnerIcon />,
    description: 'Loading spinner',
    code: `<div className="flex items-center justify-center">
  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
</div>`,
  },
  {
    id: 'progress',
    name: 'Progress Bar',
    category: 'feedback',
    icon: <ProgressIcon />,
    description: 'Progress indicator',
    code: `<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
</div>`,
  },

  // Data Display
  {
    id: 'table',
    name: 'Table',
    category: 'data',
    icon: <TableIcon />,
    description: 'Data table',
    code: `<table className="w-full border-collapse">
  <thead>
    <tr className="bg-gray-50">
      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-200">
    <tr>
      <td className="px-4 py-3 text-gray-900">John Doe</td>
      <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span></td>
      <td className="px-4 py-3 text-gray-600">Admin</td>
    </tr>
    <tr>
      <td className="px-4 py-3 text-gray-900">Jane Smith</td>
      <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span></td>
      <td className="px-4 py-3 text-gray-600">User</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'stat-card',
    name: 'Stat Card',
    category: 'data',
    icon: <StatsIcon />,
    description: 'Statistics display card',
    code: `<div className="bg-white rounded-xl shadow p-6">
  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
  <p className="text-3xl font-bold text-gray-900 mt-2">$45,231</p>
  <p className="text-sm text-green-600 mt-2">↑ 12% from last month</p>
</div>`,
  },
  {
    id: 'list',
    name: 'List',
    category: 'data',
    icon: <ListIcon />,
    description: 'Simple list',
    code: `<ul className="divide-y divide-gray-200">
  <li className="py-3 flex items-center gap-3">
    <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
    <div>
      <p className="font-medium text-gray-900">Item Title</p>
      <p className="text-sm text-gray-500">Description text</p>
    </div>
  </li>
  <li className="py-3 flex items-center gap-3">
    <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
    <div>
      <p className="font-medium text-gray-900">Another Item</p>
      <p className="text-sm text-gray-500">More description</p>
    </div>
  </li>
</ul>`,
  },
];

// Icon components
function LayoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}

function FlexRowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="5" height="8" rx="1" />
      <rect x="10" y="8" width="5" height="8" rx="1" />
      <rect x="17" y="8" width="4" height="8" rx="1" />
    </svg>
  );
}

function FlexColIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="3" width="12" height="5" rx="1" />
      <rect x="6" y="10" width="12" height="5" rx="1" />
      <rect x="6" y="17" width="12" height="4" rx="1" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="6" width="20" height="12" rx="1" />
    </svg>
  );
}

function HeadingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4v16M18 4v16M6 12h12" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="8" width="16" height="8" rx="4" />
    </svg>
  );
}

function ButtonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="7" width="16" height="10" rx="2" />
    </svg>
  );
}

function InputIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 12h4" />
    </svg>
  );
}

function TextareaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M15 11l2 2 2-2" />
    </svg>
  );
}

function CheckboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function RadioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="8" width="20" height="8" rx="4" />
      <circle cx="16" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function NavIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function BreadcrumbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function TabsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 3v6" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function AvatarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="10" width="20" height="4" rx="2" />
      <rect x="2" y="10" width="12" height="4" rx="2" fill="currentColor" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

interface ComponentLibraryProps {
  onInsertComponent: (code: string, name: string) => void;
  searchQuery?: string;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  onInsertComponent,
  searchQuery = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);

  // Filter components
  const filteredComponents = COMPONENT_TEMPLATES.filter(comp => {
    const matchesSearch = search === '' ||
      comp.name.toLowerCase().includes(search.toLowerCase()) ||
      comp.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || comp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedComponents = filteredComponents.reduce((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {} as Record<string, ComponentTemplate[]>);

  return (
    <div className="flex flex-col h-full bg-[#141414]">
      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-white/10">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            !selectedCategory
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          All
        </button>
        {COMPONENT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-violet-500/20 text-violet-400'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(groupedComponents).map(([category, components]) => {
          const categoryInfo = COMPONENT_CATEGORIES.find(c => c.id === category);
          return (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {categoryInfo?.icon} {categoryInfo?.name}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {components.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => onInsertComponent(comp.code, comp.name)}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 rounded-lg text-left transition-all group"
                  >
                    <div className="text-gray-400 group-hover:text-violet-400 mb-2">
                      {comp.icon}
                    </div>
                    <div className="text-xs font-medium text-white truncate">{comp.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{comp.description}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No components found
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentLibrary;
