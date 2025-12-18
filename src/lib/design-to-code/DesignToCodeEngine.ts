/**
 * DesignToCodeEngine
 *
 * IL CUORE DI OBJECTS:
 * Traduce ogni modifica visuale in codice React + Tailwind.
 *
 * FLUSSO:
 * 1. User modifica → queueChange()
 * 2. Debounce 500ms (accumula modifiche)
 * 3. AI riceve file + modifiche
 * 4. AI risponde con file completo
 * 5. WebContainer scrive → Hot Reload
 *
 * IL CODICE È SEMPRE LA SOURCE OF TRUTH.
 */

export type ChangeType =
  | 'style'      // backgroundColor, color, padding...
  | 'content'    // children text
  | 'prop'       // variant, size, onClick...
  | 'animation'  // whileInView, whileHover...
  | 'move'       // drag & drop reorder
  | 'add'        // add new element
  | 'delete';    // remove element

export interface DesignChange {
  type: ChangeType;
  elementId: string;
  file: string;
  component: string;
  change: Record<string, unknown>;
  timestamp: number;
}

export interface DesignToCodeCallbacks {
  /** Called to send message to AI */
  sendToAI: (prompt: string) => Promise<void>;
  /** Called for instant visual preview (before AI responds) */
  applyInstantPreview?: (elementId: string, styles: Record<string, string>) => void;
  /** Called when AI response is processed */
  onCodeUpdated?: (files: Record<string, string>) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export class DesignToCodeEngine {
  private pendingChanges: DesignChange[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;
  private callbacks: DesignToCodeCallbacks;
  private isProcessing = false;

  constructor(callbacks: DesignToCodeCallbacks, debounceMs = 500) {
    this.callbacks = callbacks;
    this.debounceMs = debounceMs;
  }

  /**
   * Queue a design change
   * Will debounce and batch multiple changes together
   */
  queueChange(change: Omit<DesignChange, 'timestamp'>): void {
    this.pendingChanges.push({
      ...change,
      timestamp: Date.now(),
    });

    // Apply instant preview for style changes
    if (change.type === 'style' && this.callbacks.applyInstantPreview) {
      this.callbacks.applyInstantPreview(
        change.elementId,
        change.change as Record<string, string>
      );
    }

    // Reset debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Start new debounce
    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, this.debounceMs);
  }

  /**
   * Force immediate processing (skip debounce)
   */
  async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.processChanges();
  }

  /**
   * Clear pending changes without processing
   */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges = [];
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.pendingChanges.length > 0;
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Process all queued changes
   */
  private async processChanges(): Promise<void> {
    if (this.pendingChanges.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const changesToProcess = [...this.pendingChanges];
    this.pendingChanges = [];

    try {
      // Group changes by file
      const changesByFile = this.groupByFile(changesToProcess);

      // Build prompt for AI
      const prompt = this.buildPrompt(changesByFile);

      // Send to AI
      await this.callbacks.sendToAI(prompt);

    } catch (error) {
      this.callbacks.onError?.(error as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Group changes by file path
   */
  private groupByFile(changes: DesignChange[]): Map<string, DesignChange[]> {
    const grouped = new Map<string, DesignChange[]>();

    for (const change of changes) {
      const existing = grouped.get(change.file) || [];
      existing.push(change);
      grouped.set(change.file, existing);
    }

    return grouped;
  }

  /**
   * Build the AI prompt from grouped changes
   */
  private buildPrompt(changesByFile: Map<string, DesignChange[]>): string {
    const parts: string[] = [];

    parts.push('Apply the following visual design changes to the code:\n');

    for (const [file, changes] of changesByFile) {
      parts.push(`\n## File: ${file}\n`);

      // Group by element
      const byElement = new Map<string, DesignChange[]>();
      for (const change of changes) {
        const existing = byElement.get(change.elementId) || [];
        existing.push(change);
        byElement.set(change.elementId, existing);
      }

      for (const [elementId, elementChanges] of byElement) {
        const component = elementChanges[0].component;
        parts.push(`\n### Element: ${elementId} (${component})\n`);

        for (const change of elementChanges) {
          parts.push(this.formatChange(change));
        }
      }
    }

    parts.push('\n---\n');
    parts.push('Update the code to reflect these changes.');
    parts.push('Use Tailwind CSS classes for styling.');
    parts.push('Return the complete updated file(s).');

    return parts.join('\n');
  }

  /**
   * Format a single change for the prompt
   */
  private formatChange(change: DesignChange): string {
    switch (change.type) {
      case 'style':
        return this.formatStyleChange(change);
      case 'content':
        return this.formatContentChange(change);
      case 'prop':
        return this.formatPropChange(change);
      case 'animation':
        return this.formatAnimationChange(change);
      case 'move':
        return this.formatMoveChange(change);
      case 'add':
        return this.formatAddChange(change);
      case 'delete':
        return this.formatDeleteChange(change);
      default:
        return `- Unknown change: ${JSON.stringify(change.change)}`;
    }
  }

  private formatStyleChange(change: DesignChange): string {
    const entries = Object.entries(change.change);
    return entries
      .map(([prop, value]) => `- Style: ${prop} = ${value}`)
      .join('\n');
  }

  private formatContentChange(change: DesignChange): string {
    return `- Content: "${change.change.text || change.change.children}"`;
  }

  private formatPropChange(change: DesignChange): string {
    const entries = Object.entries(change.change);
    return entries
      .map(([prop, value]) => `- Prop: ${prop} = ${JSON.stringify(value)}`)
      .join('\n');
  }

  private formatAnimationChange(change: DesignChange): string {
    const anim = change.change;
    const parts = ['- Animation:'];

    if (anim.trigger) parts.push(`  trigger: ${anim.trigger}`);
    if (anim.initial) parts.push(`  initial: ${JSON.stringify(anim.initial)}`);
    if (anim.animate) parts.push(`  animate: ${JSON.stringify(anim.animate)}`);
    if (anim.transition) parts.push(`  transition: ${JSON.stringify(anim.transition)}`);

    return parts.join('\n');
  }

  private formatMoveChange(change: DesignChange): string {
    const { from, to } = change.change as {
      from: { parent: string; index: number };
      to: { parent: string; index: number };
    };
    return `- Move: from ${from.parent}[${from.index}] to ${to.parent}[${to.index}]`;
  }

  private formatAddChange(change: DesignChange): string {
    const { component, props, parent, index } = change.change as {
      component: string;
      props: Record<string, unknown>;
      parent: string;
      index: number;
    };
    return `- Add: <${component} ${Object.entries(props).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')} /> at ${parent}[${index}]`;
  }

  private formatDeleteChange(change: DesignChange): string {
    return `- Delete: Remove element ${change.elementId}`;
  }
}

/**
 * Create a DesignToCodeEngine instance connected to the chat
 */
export function createDesignToCodeEngine(
  sendToChat: (message: string) => Promise<void>,
  applyInstantPreview?: (elementId: string, styles: Record<string, string>) => void
): DesignToCodeEngine {
  return new DesignToCodeEngine({
    sendToAI: sendToChat,
    applyInstantPreview,
    onError: (error) => {
      console.error('[DesignToCodeEngine] Error:', error);
    },
  });
}
