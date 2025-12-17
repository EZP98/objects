/**
 * Visual Edit Bridge Script
 *
 * This script is injected into the WebContainer preview iframe to enable
 * visual editing capabilities. It communicates with the parent window
 * via postMessage to:
 * - Track mouse hover over elements
 * - Handle element selection
 * - Extract React component info from Fiber
 * - Read data-source attributes for source mapping
 * - Apply style changes
 * - Report element information back to the parent
 *
 * Based on Cursor's visual editor approach and React DevTools techniques.
 */

export const VISUAL_EDIT_BRIDGE_SCRIPT = `
(function() {
  // IMMEDIATE LOG - this should appear if script runs at all
  console.log('%c[VisualEditBridge] Script starting...', 'color: #8b5cf6; font-weight: bold;');

  // Prevent multiple injections
  if (window.__VISUAL_EDIT_BRIDGE__) {
    console.log('[VisualEditBridge] Already initialized, skipping');
    return;
  }
  window.__VISUAL_EDIT_BRIDGE__ = true;
  window.__VISUAL_EDIT_BRIDGE_VERSION__ = '1.0.0';

  let editModeEnabled = false;
  let selectedElement = null;
  let hoveredElement = null;

  // ==========================================
  // REACT FIBER UTILITIES
  // ==========================================

  /**
   * Find React Fiber node on a DOM element
   * React stores fiber references with keys like __reactFiber$ or __reactInternalInstance$
   */
  function getReactFiber(element) {
    if (!element) return null;

    const key = Object.keys(element).find(key =>
      key.startsWith('__reactFiber$') ||
      key.startsWith('__reactInternalInstance$')
    );

    return key ? element[key] : null;
  }

  /**
   * Get React component info from Fiber
   * Walks up the fiber tree to find component names and source info
   */
  function getReactComponentInfo(element) {
    const fiber = getReactFiber(element);
    if (!fiber) return null;

    const info = {
      componentName: null,
      componentStack: [],
      debugSource: null,
      props: {},
    };

    // Walk up the fiber tree
    let current = fiber;
    while (current) {
      // Check for _debugSource (contains file:line info in dev mode)
      if (current._debugSource && !info.debugSource) {
        info.debugSource = {
          fileName: current._debugSource.fileName,
          lineNumber: current._debugSource.lineNumber,
          columnNumber: current._debugSource.columnNumber,
        };
      }

      // Get component name
      if (current.type) {
        let name = null;

        if (typeof current.type === 'function') {
          name = current.type.displayName || current.type.name;
        } else if (typeof current.type === 'string') {
          // HTML element
          if (!info.componentName) {
            name = current.type;
          }
        } else if (current.type && current.type.$$typeof) {
          // Forward ref, memo, etc.
          const innerType = current.type.type || current.type.render;
          if (innerType) {
            name = innerType.displayName || innerType.name;
          }
        }

        if (name && name !== 'div' && name !== 'span' && name !== 'p') {
          if (!info.componentName) {
            info.componentName = name;
          }
          info.componentStack.push(name);
        }
      }

      // Get props from the nearest component
      if (current.memoizedProps && info.componentStack.length <= 1) {
        // Filter out children and internal props
        const props = current.memoizedProps;
        for (const key in props) {
          if (key !== 'children' && !key.startsWith('__') && typeof props[key] !== 'function') {
            const value = props[key];
            // Only include primitive values
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              info.props[key] = value;
            }
          }
        }
      }

      current = current.return;

      // Stop after finding 5 components
      if (info.componentStack.length >= 5) break;
    }

    return info;
  }

  // ==========================================
  // SOURCE LOCATION UTILITIES
  // ==========================================

  /**
   * Get source location from data-source attribute or React fiber
   */
  function getSourceLocation(element) {
    // First try data-source attribute (injected by our Vite plugin)
    const dataSource = element.getAttribute('data-source');
    if (dataSource) {
      const parts = dataSource.split(':');
      return {
        fileName: parts[0],
        lineNumber: parseInt(parts[1]) || 0,
        columnNumber: parseInt(parts[2]) || 0,
        source: 'attribute',
      };
    }

    // Walk up to find nearest data-source
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      const parentSource = parent.getAttribute('data-source');
      if (parentSource) {
        const parts = parentSource.split(':');
        return {
          fileName: parts[0],
          lineNumber: parseInt(parts[1]) || 0,
          columnNumber: parseInt(parts[2]) || 0,
          source: 'parent',
        };
      }
      parent = parent.parentElement;
      depth++;
    }

    // Try React fiber _debugSource
    const reactInfo = getReactComponentInfo(element);
    if (reactInfo?.debugSource) {
      return {
        ...reactInfo.debugSource,
        source: 'fiber',
      };
    }

    return null;
  }

  // ==========================================
  // ELEMENT INFO EXTRACTION
  // ==========================================

  /**
   * Generate XPath for an element
   */
  function getXPath(element) {
    if (!element) return '';
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const part = index > 1 ? tagName + '[' + index + ']' : tagName;
      parts.unshift(part);

      current = current.parentElement;
    }

    return '/' + parts.join('/');
  }

  /**
   * Get comprehensive element info to send to parent
   */
  function getElementInfo(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const reactInfo = getReactComponentInfo(element);
    const sourceLocation = getSourceLocation(element);

    // Get relevant computed styles
    const styles = {
      // Layout
      display: computedStyle.display,
      position: computedStyle.position,
      width: computedStyle.width,
      height: computedStyle.height,
      minWidth: computedStyle.minWidth,
      maxWidth: computedStyle.maxWidth,
      minHeight: computedStyle.minHeight,
      maxHeight: computedStyle.maxHeight,

      // Spacing
      padding: computedStyle.padding,
      paddingTop: computedStyle.paddingTop,
      paddingRight: computedStyle.paddingRight,
      paddingBottom: computedStyle.paddingBottom,
      paddingLeft: computedStyle.paddingLeft,
      margin: computedStyle.margin,
      marginTop: computedStyle.marginTop,
      marginRight: computedStyle.marginRight,
      marginBottom: computedStyle.marginBottom,
      marginLeft: computedStyle.marginLeft,

      // Flexbox
      flexDirection: computedStyle.flexDirection,
      justifyContent: computedStyle.justifyContent,
      alignItems: computedStyle.alignItems,
      gap: computedStyle.gap,
      flexWrap: computedStyle.flexWrap,

      // Grid
      gridTemplateColumns: computedStyle.gridTemplateColumns,
      gridTemplateRows: computedStyle.gridTemplateRows,

      // Colors
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,

      // Typography
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      fontFamily: computedStyle.fontFamily,
      lineHeight: computedStyle.lineHeight,
      textAlign: computedStyle.textAlign,
      letterSpacing: computedStyle.letterSpacing,

      // Border
      borderRadius: computedStyle.borderRadius,
      border: computedStyle.border,
      borderWidth: computedStyle.borderWidth,
      borderColor: computedStyle.borderColor,
      borderStyle: computedStyle.borderStyle,

      // Effects
      boxShadow: computedStyle.boxShadow,
      opacity: computedStyle.opacity,
      overflow: computedStyle.overflow,
      zIndex: computedStyle.zIndex,

      // Transform
      transform: computedStyle.transform,
      transition: computedStyle.transition,
    };

    return {
      // Basic info
      tagName: element.tagName.toLowerCase(),
      className: element.className || '',
      id: element.id || '',

      // Bounding rect
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },

      // Computed styles
      styles: styles,

      // XPath for targeting
      xpath: getXPath(element),

      // Text content (if simple text node)
      textContent: element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE
        ? element.textContent?.trim().substring(0, 100)
        : null,

      // React component info
      componentName: reactInfo?.componentName || null,
      componentStack: reactInfo?.componentStack || [],
      componentProps: reactInfo?.props || {},

      // Source location (file:line)
      sourceLocation: sourceLocation,

      // HTML attributes
      attributes: getElementAttributes(element),
    };
  }

  /**
   * Get element attributes
   */
  function getElementAttributes(element) {
    const attrs = {};
    for (const attr of element.attributes) {
      if (!attr.name.startsWith('__') && !attr.name.startsWith('data-reactroot')) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Handle mouse move for hover effect
   */
  function handleMouseMove(e) {
    if (!editModeEnabled) return;

    const target = e.target;
    if (target === document.body || target === document.documentElement) {
      if (hoveredElement) {
        hoveredElement = null;
        window.parent.postMessage({
          type: 'visual-edit-hover',
          element: null,
        }, '*');
      }
      return;
    }

    if (target !== hoveredElement) {
      hoveredElement = target;
      window.parent.postMessage({
        type: 'visual-edit-hover',
        element: getElementInfo(target),
      }, '*');
    }
  }

  /**
   * Handle click for selection
   */
  function handleClick(e) {
    if (!editModeEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target === document.body || target === document.documentElement) {
      selectedElement = null;
      window.parent.postMessage({
        type: 'visual-edit-select',
        element: null,
      }, '*');
      return;
    }

    selectedElement = target;
    window.parent.postMessage({
      type: 'visual-edit-select',
      element: getElementInfo(target),
    }, '*');
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(e) {
    if (!editModeEnabled) return;

    // Escape to deselect
    if (e.key === 'Escape') {
      selectedElement = null;
      window.parent.postMessage({
        type: 'visual-edit-select',
        element: null,
      }, '*');
    }

    // Arrow keys for nudging
    if (selectedElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;

      switch (e.key) {
        case 'ArrowUp': dy = -delta; break;
        case 'ArrowDown': dy = delta; break;
        case 'ArrowLeft': dx = -delta; break;
        case 'ArrowRight': dx = delta; break;
      }

      window.parent.postMessage({
        type: 'visual-edit-nudge',
        element: getElementInfo(selectedElement),
        dx: dx,
        dy: dy,
      }, '*');
    }

    // Delete key to delete element
    if (selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      window.parent.postMessage({
        type: 'visual-edit-delete',
        element: getElementInfo(selectedElement),
      }, '*');
    }
  }

  // ==========================================
  // STYLE APPLICATION
  // ==========================================

  /**
   * Apply style changes from parent
   */
  function applyStyleChange(xpath, property, value) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue;

      if (element && element.style) {
        element.style[property] = value;

        // Send updated element info back
        window.parent.postMessage({
          type: 'visual-edit-updated',
          element: getElementInfo(element),
        }, '*');
      }
    } catch (e) {
      console.error('[VisualEditBridge] Error applying style:', e);
    }
  }

  /**
   * Apply multiple style changes
   */
  function applyStyles(xpath, styles) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue;

      if (element && element.style) {
        for (const [property, value] of Object.entries(styles)) {
          element.style[property] = value;
        }

        // Send updated element info back
        window.parent.postMessage({
          type: 'visual-edit-updated',
          element: getElementInfo(element),
        }, '*');
      }
    } catch (e) {
      console.error('[VisualEditBridge] Error applying styles:', e);
    }
  }

  /**
   * Update element text content
   */
  function updateTextContent(xpath, text) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const element = result.singleNodeValue;

      if (element) {
        element.textContent = text;

        window.parent.postMessage({
          type: 'visual-edit-updated',
          element: getElementInfo(element),
        }, '*');
      }
    } catch (e) {
      console.error('[VisualEditBridge] Error updating text:', e);
    }
  }

  // ==========================================
  // MESSAGE HANDLER
  // ==========================================

  /**
   * Listen for messages from parent
   */
  window.addEventListener('message', function(event) {
    const data = event.data;

    // Log ALL incoming messages for debugging
    if (data && typeof data === 'object' && data.type) {
      console.log('[VisualEditBridge] Received message:', data.type, data);
    }

    if (!data || !data.type) return;

    switch (data.type) {
      case 'visual-edit-enable':
        editModeEnabled = true;
        document.body.style.cursor = 'crosshair';
        // Add highlight styles
        addHighlightStyles();
        console.log('[VisualEditBridge] Edit mode enabled');
        break;

      case 'visual-edit-disable':
        editModeEnabled = false;
        selectedElement = null;
        hoveredElement = null;
        document.body.style.cursor = '';
        console.log('[VisualEditBridge] Edit mode disabled');
        break;

      case 'visual-edit-apply-style':
        if (data.xpath && data.property && data.value !== undefined) {
          applyStyleChange(data.xpath, data.property, data.value);
        }
        break;

      case 'visual-edit-apply-styles':
        if (data.xpath && data.styles) {
          applyStyles(data.xpath, data.styles);
        }
        break;

      case 'visual-edit-update-text':
        if (data.xpath && data.text !== undefined) {
          updateTextContent(data.xpath, data.text);
        }
        break;

      case 'visual-edit-ping':
        // Respond to ping to confirm bridge is loaded
        window.parent.postMessage({ type: 'visual-edit-pong' }, '*');
        break;

      case 'visual-edit-get-element':
        // Get info for a specific element by xpath
        if (data.xpath) {
          try {
            const result = document.evaluate(data.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            const element = result.singleNodeValue;
            window.parent.postMessage({
              type: 'visual-edit-element-info',
              element: element ? getElementInfo(element) : null,
            }, '*');
          } catch (e) {
            console.error('[VisualEditBridge] Error getting element:', e);
          }
        }
        break;
    }
  });

  /**
   * Add CSS for hover highlighting
   */
  function addHighlightStyles() {
    if (document.getElementById('visual-edit-styles')) return;

    const style = document.createElement('style');
    style.id = 'visual-edit-styles';
    style.textContent = '/* Visual edit mode styles */ ' +
      '[data-visual-edit-hover] { outline: 2px solid #60a5fa !important; outline-offset: 2px !important; } ' +
      '[data-visual-edit-selected] { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; }';
    document.head.appendChild(style);
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function initialize() {
    console.log('%c[VisualEditBridge] Initializing...', 'color: #8b5cf6; font-weight: bold;');
    console.log('[VisualEditBridge] window.parent:', window.parent);
    console.log('[VisualEditBridge] window.parent === window:', window.parent === window);
    console.log('[VisualEditBridge] In iframe:', window !== window.parent);
    console.log('[VisualEditBridge] document.location:', document.location.href);

    // Add a visible indicator that bridge loaded (for debugging)
    const indicator = document.createElement('div');
    indicator.id = 'visual-edit-bridge-indicator';
    indicator.style.cssText = 'position:fixed;bottom:4px;right:4px;background:#8b5cf6;color:#fff;padding:4px 8px;border-radius:4px;font-size:10px;z-index:99999;opacity:0.7;pointer-events:none;';
    indicator.textContent = 'Bridge Ready';
    document.body.appendChild(indicator);
    // Hide after 3 seconds
    setTimeout(() => { indicator.style.display = 'none'; }, 3000);

    // Add event listeners with capture to intercept before app handlers
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Notify parent that bridge is ready - retry a few times to ensure parent receives it
    function sendReady() {
      try {
        console.log('[VisualEditBridge] Sending ready message to parent...');
        window.parent.postMessage({ type: 'visual-edit-ready', timestamp: Date.now() }, '*');
        console.log('[VisualEditBridge] Message sent successfully');
      } catch (e) {
        console.error('[VisualEditBridge] Failed to send message:', e);
      }
    }

    // Send immediately
    sendReady();

    // Also send after short delays in case parent isn't listening yet
    setTimeout(sendReady, 100);
    setTimeout(sendReady, 500);
    setTimeout(sendReady, 1000);
    setTimeout(sendReady, 2000);
    setTimeout(sendReady, 5000);

    console.log('%c[VisualEditBridge] READY - Initialized with React Fiber support', 'color: #10b981; font-weight: bold;');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM already ready
    initialize();
  }
})();
`;

/**
 * Generate a script tag string to inject the bridge
 */
export function generateBridgeScriptTag(): string {
  return `<script>${VISUAL_EDIT_BRIDGE_SCRIPT}</script>`;
}

/**
 * Inject bridge script into an iframe via postMessage
 * (for cases where we can't modify the HTML directly)
 */
export function injectBridgeViaEval(iframe: HTMLIFrameElement): void {
  try {
    iframe.contentWindow?.postMessage({
      type: 'eval-script',
      script: VISUAL_EDIT_BRIDGE_SCRIPT,
    }, '*');
  } catch (e) {
    console.error('[VisualEditBridge] Failed to inject via postMessage:', e);
  }
}
