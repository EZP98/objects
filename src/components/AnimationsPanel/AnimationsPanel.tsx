/**
 * AnimationsPanel
 *
 * Create and manage animations for elements.
 * Like Plasmic's animation system but optimized for Framer Motion.
 *
 * Features:
 * - Preset animations (fade, slide, scale, etc.)
 * - Custom keyframe animations
 * - Trigger selection (mount, hover, scroll)
 * - Easing curves
 * - Duration & delay controls
 */

import React, { useState } from 'react';

// Animation types
export type AnimationTrigger = 'mount' | 'hover' | 'click' | 'scroll' | 'inView';
export type EasingFunction = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';

export interface AnimationKeyframe {
  offset: number; // 0-100
  properties: Record<string, string | number>;
}

export interface Animation {
  id: string;
  name: string;
  trigger: AnimationTrigger;
  duration: number; // ms
  delay: number; // ms
  easing: EasingFunction;
  keyframes: AnimationKeyframe[];
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate';
}

// Preset animations
export const PRESET_ANIMATIONS: Omit<Animation, 'id'>[] = [
  {
    name: 'Fade In',
    trigger: 'mount',
    duration: 500,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0 } },
      { offset: 100, properties: { opacity: 1 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Fade Out',
    trigger: 'mount',
    duration: 500,
    delay: 0,
    easing: 'easeIn',
    keyframes: [
      { offset: 0, properties: { opacity: 1 } },
      { offset: 100, properties: { opacity: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Slide Up',
    trigger: 'mount',
    duration: 600,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, translateY: 20 } },
      { offset: 100, properties: { opacity: 1, translateY: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Slide Down',
    trigger: 'mount',
    duration: 600,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, translateY: -20 } },
      { offset: 100, properties: { opacity: 1, translateY: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Slide Left',
    trigger: 'mount',
    duration: 600,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, translateX: 20 } },
      { offset: 100, properties: { opacity: 1, translateX: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Slide Right',
    trigger: 'mount',
    duration: 600,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, translateX: -20 } },
      { offset: 100, properties: { opacity: 1, translateX: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Scale Up',
    trigger: 'mount',
    duration: 500,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, scale: 0.9 } },
      { offset: 100, properties: { opacity: 1, scale: 1 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Scale Down',
    trigger: 'mount',
    duration: 500,
    delay: 0,
    easing: 'easeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 0, scale: 1.1 } },
      { offset: 100, properties: { opacity: 1, scale: 1 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Bounce',
    trigger: 'mount',
    duration: 800,
    delay: 0,
    easing: 'spring',
    keyframes: [
      { offset: 0, properties: { translateY: -20 } },
      { offset: 50, properties: { translateY: 0 } },
      { offset: 70, properties: { translateY: -10 } },
      { offset: 100, properties: { translateY: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Pulse',
    trigger: 'hover',
    duration: 1000,
    delay: 0,
    easing: 'easeInOut',
    keyframes: [
      { offset: 0, properties: { scale: 1 } },
      { offset: 50, properties: { scale: 1.05 } },
      { offset: 100, properties: { scale: 1 } },
    ],
    iterations: 'infinite',
    direction: 'normal',
  },
  {
    name: 'Shake',
    trigger: 'click',
    duration: 500,
    delay: 0,
    easing: 'linear',
    keyframes: [
      { offset: 0, properties: { translateX: 0 } },
      { offset: 20, properties: { translateX: -10 } },
      { offset: 40, properties: { translateX: 10 } },
      { offset: 60, properties: { translateX: -10 } },
      { offset: 80, properties: { translateX: 10 } },
      { offset: 100, properties: { translateX: 0 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
  {
    name: 'Rotate',
    trigger: 'hover',
    duration: 600,
    delay: 0,
    easing: 'easeInOut',
    keyframes: [
      { offset: 0, properties: { rotate: 0 } },
      { offset: 100, properties: { rotate: 360 } },
    ],
    iterations: 1,
    direction: 'normal',
  },
];

interface AnimationsPanelProps {
  elementId: string | null;
  animations: Animation[];
  onAddAnimation: (animation: Omit<Animation, 'id'>) => void;
  onUpdateAnimation: (id: string, updates: Partial<Animation>) => void;
  onRemoveAnimation: (id: string) => void;
}

// Trigger icon
const TriggerIcon: React.FC<{ trigger: AnimationTrigger }> = ({ trigger }) => {
  switch (trigger) {
    case 'mount':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'hover':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2L11 7L7 8L6 12L3 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      );
    case 'click':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
        </svg>
      );
    case 'scroll':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="7" y1="4" x2="7" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'inView':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Animation preview thumbnail
const AnimationPreview: React.FC<{ animation: Omit<Animation, 'id'> }> = ({ animation }) => {
  return (
    <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
      <div
        className="w-3 h-3 bg-violet-500 rounded-sm"
        style={{
          animation: `preview-${animation.name.toLowerCase().replace(' ', '-')} 1s infinite`,
        }}
      />
    </div>
  );
};

// Animation item in the list
const AnimationItem: React.FC<{
  animation: Animation;
  onUpdate: (updates: Partial<Animation>) => void;
  onRemove: () => void;
}> = ({ animation, onUpdate, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-xs font-medium text-white">{animation.name}</span>
        <span className="ml-auto flex items-center gap-1 text-gray-500">
          <TriggerIcon trigger={animation.trigger} />
          <span className="text-[10px]">{animation.duration}ms</span>
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Trigger */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Trigger</label>
            <select
              value={animation.trigger}
              onChange={(e) => onUpdate({ trigger: e.target.value as AnimationTrigger })}
              className="w-full h-7 px-2 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="mount">On Mount</option>
              <option value="hover">On Hover</option>
              <option value="click">On Click</option>
              <option value="scroll">On Scroll</option>
              <option value="inView">In View</option>
            </select>
          </div>

          {/* Duration & Delay */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Duration</label>
              <div className="relative">
                <input
                  type="number"
                  value={animation.duration}
                  onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
                  className="w-full h-7 px-2 pr-8 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">ms</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Delay</label>
              <div className="relative">
                <input
                  type="number"
                  value={animation.delay}
                  onChange={(e) => onUpdate({ delay: parseInt(e.target.value) || 0 })}
                  className="w-full h-7 px-2 pr-8 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">ms</span>
              </div>
            </div>
          </div>

          {/* Easing */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Easing</label>
            <select
              value={animation.easing}
              onChange={(e) => onUpdate({ easing: e.target.value as EasingFunction })}
              className="w-full h-7 px-2 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
              <option value="spring">Spring</option>
            </select>
          </div>

          {/* Iterations */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Repeat</label>
              <select
                value={animation.iterations === 'infinite' ? 'infinite' : animation.iterations}
                onChange={(e) => onUpdate({
                  iterations: e.target.value === 'infinite' ? 'infinite' : parseInt(e.target.value)
                })}
                className="w-full h-7 px-2 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
              >
                <option value="1">Once</option>
                <option value="2">Twice</option>
                <option value="3">3 times</option>
                <option value="infinite">Infinite</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase mb-1">Direction</label>
              <select
                value={animation.direction}
                onChange={(e) => onUpdate({ direction: e.target.value as Animation['direction'] })}
                className="w-full h-7 px-2 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
              >
                <option value="normal">Normal</option>
                <option value="reverse">Reverse</option>
                <option value="alternate">Alternate</option>
              </select>
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={onRemove}
            className="w-full h-7 flex items-center justify-center gap-1 text-red-400 hover:bg-red-500/10 rounded transition-colors text-xs"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3H10M4 3V2C4 1.5 4.5 1 5 1H7C7.5 1 8 1.5 8 2V3M9 3V10C9 10.5 8.5 11 8 11H4C3.5 11 3 10.5 3 10V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Remove Animation
          </button>
        </div>
      )}
    </div>
  );
};

export const AnimationsPanel: React.FC<AnimationsPanelProps> = ({
  elementId,
  animations,
  onAddAnimation,
  onUpdateAnimation,
  onRemoveAnimation,
}) => {
  const [showPresets, setShowPresets] = useState(false);

  if (!elementId) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Animations</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-50">
            <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16 10V16L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-xs text-center">Select an element to<br/>add animations</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Animations</span>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Current animations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {animations.length > 0 ? (
          animations.map(animation => (
            <AnimationItem
              key={animation.id}
              animation={animation}
              onUpdate={(updates) => onUpdateAnimation(animation.id, updates)}
              onRemove={() => onRemoveAnimation(animation.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2 opacity-50">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8V12L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-xs">No animations</span>
            <button
              onClick={() => setShowPresets(true)}
              className="mt-2 text-xs text-violet-400 hover:text-violet-300"
            >
              Add animation
            </button>
          </div>
        )}
      </div>

      {/* Preset animations dropdown */}
      {showPresets && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPresets(false)}
          />
          <div className="absolute bottom-16 left-3 right-3 z-50 bg-[#252525] border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            <div className="px-3 py-2 border-b border-white/10 sticky top-0 bg-[#252525]">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Preset Animations</span>
            </div>
            <div className="p-2 space-y-1">
              {PRESET_ANIMATIONS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onAddAnimation(preset);
                    setShowPresets(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 hover:bg-white/10 rounded transition-colors"
                >
                  <span className="text-gray-500">
                    <TriggerIcon trigger={preset.trigger} />
                  </span>
                  <span className="text-xs text-white">{preset.name}</span>
                  <span className="ml-auto text-[10px] text-gray-500">{preset.duration}ms</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tips */}
      <div className="px-3 py-2 border-t border-white/10 bg-white/5">
        <p className="text-[10px] text-gray-500">
          Tip: Animations are converted to Framer Motion code.
        </p>
      </div>
    </div>
  );
};

export default AnimationsPanel;
