/**
 * Visual Editor Inspector Script
 * Add this script to your project to enable live visual editing
 *
 * Usage: Add to your index.html:
 * <script src="http://localhost:5174/inspector.js"></script>
 */

(function() {
  'use strict';

  let currentElement = null;
  let highlightOverlay = null;

  // Create highlight overlay
  function createHighlightOverlay() {
    if (highlightOverlay) return;

    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'visual-editor-highlight';
    highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 2px;
      display: none;
    `;
    document.body.appendChild(highlightOverlay);
  }

  // Get computed styles for an element
  function getComputedStylesForElement(el) {
    const computed = window.getComputedStyle(el);
    return {
      width: computed.width,
      height: computed.height,
      padding: computed.padding,
      margin: computed.margin,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      borderRadius: computed.borderRadius,
      border: computed.border,
      display: computed.display,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      position: computed.position,
      top: computed.top,
      left: computed.left,
      right: computed.right,
      bottom: computed.bottom,
    };
  }

  // Get XPath for element
  function getXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    if (element === document.body) {
      return '/html/body';
    }

    let ix = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        const parentPath = element.parentNode ? getXPath(element.parentNode) : '';
        return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
    return '';
  }

  // Get element info
  function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName,
      className: el.className || '',
      id: el.id || '',
      rect: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      styles: getComputedStylesForElement(el),
      xpath: getXPath(el),
    };
  }

  // Find element at coordinates
  function getElementAtPoint(x, y) {
    // Temporarily hide our overlay
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }

    const el = document.elementFromPoint(x, y);

    if (highlightOverlay) {
      highlightOverlay.style.display = 'block';
    }

    return el;
  }

  // Handle messages from the editor
  function handleMessage(event) {
    const data = event.data;

    if (data.type === 'init-inspector') {
      createHighlightOverlay();
      console.log('[Visual Editor] Inspector initialized');

      // Send acknowledgment
      window.parent.postMessage({ type: 'inspector-ready' }, '*');
    }

    else if (data.type === 'inspect-at') {
      const el = getElementAtPoint(data.x, data.y);

      if (el && el !== document.body && el !== document.documentElement) {
        currentElement = el;

        // Update highlight
        if (highlightOverlay) {
          const rect = el.getBoundingClientRect();
          highlightOverlay.style.left = rect.left + 'px';
          highlightOverlay.style.top = rect.top + 'px';
          highlightOverlay.style.width = rect.width + 'px';
          highlightOverlay.style.height = rect.height + 'px';
          highlightOverlay.style.display = 'block';
        }

        // Send element info to editor
        window.parent.postMessage({
          type: 'element-hover',
          element: getElementInfo(el),
        }, '*');
      } else {
        if (highlightOverlay) {
          highlightOverlay.style.display = 'none';
        }
        window.parent.postMessage({ type: 'element-leave' }, '*');
      }
    }

    else if (data.type === 'select-element') {
      if (currentElement) {
        window.parent.postMessage({
          type: 'element-select',
          element: getElementInfo(currentElement),
        }, '*');
      }
    }

    else if (data.type === 'update-style') {
      if (currentElement && data.property && data.value !== undefined) {
        currentElement.style[data.property] = data.value;

        // Send updated info back
        window.parent.postMessage({
          type: 'element-updated',
          element: getElementInfo(currentElement),
        }, '*');
      }
    }
  }

  // Initialize
  window.addEventListener('message', handleMessage);

  // Auto-initialize if loaded directly
  createHighlightOverlay();
  console.log('[Visual Editor] Inspector script loaded. Waiting for editor connection...');

  // Notify parent that we're ready
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'inspector-ready' }, '*');
  }
})();
