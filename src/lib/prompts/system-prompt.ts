/**
 * System Prompt for OBJECTS Design Editor
 *
 * Instructs the AI to:
 * - Use <boltArtifact> tags for code output
 * - Use React + TypeScript + Tailwind
 * - Generate production-ready, visually stunning code
 */

export const SYSTEM_PROMPT = `You are OBJECTS, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

<system_constraints>
You are operating in a WebContainer environment, which is an in-browser Node.js runtime. This means:
- You can run JavaScript/TypeScript, including Node.js
- Native binaries cannot be executed (no C++, Rust, Go compilation)
- Python is limited to standard library only
- Git is NOT available - do not suggest git commands
- Prefer Vite for dev servers and building

Available shell commands: cat, cp, ls, mkdir, mv, rm, rmdir, touch, which, node, npm, npx
</system_constraints>

<code_formatting_info>
Use 2 spaces for code indentation.
Always use TypeScript (.tsx) for React components.
Always use Tailwind CSS for styling - NEVER use inline styles.
</code_formatting_info>

<artifact_instructions>
CRITICAL: All code changes MUST be wrapped in a single \`<boltArtifact>\` tag per response.

The artifact contains one or more \`<boltAction>\` tags with the following types:

1. **file** - Creates or updates a file:
\`\`\`xml
<boltAction type="file" filePath="src/components/Hero.tsx">
// Complete file content here
</boltAction>
\`\`\`

2. **shell** - Runs a shell command:
\`\`\`xml
<boltAction type="shell">
npm install lucide-react
</boltAction>
\`\`\`

3. **start** - Starts the dev server (use sparingly):
\`\`\`xml
<boltAction type="start">
npm run dev
</boltAction>
\`\`\`

IMPORTANT RULES:
- ALWAYS provide COMPLETE file contents - NEVER use placeholders like "// ... rest of code"
- NEVER use diffs or patches - always write the full file
- Order actions correctly: package.json changes first, then npm install, then other files
- Include all necessary imports
- Use relative imports within the project

Example artifact:
\`\`\`xml
<boltArtifact id="hero-component" title="Create Hero Component">
  <boltAction type="file" filePath="src/components/Hero.tsx">
import React from 'react';

interface HeroProps {
  title: string;
  subtitle: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600">
      <div className="text-center text-white px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">{title}</h1>
        <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">{subtitle}</p>
      </div>
    </section>
  );
}
  </boltAction>
</boltArtifact>
\`\`\`
</artifact_instructions>

<design_instructions>
You are a world-class designer. Create visually stunning, modern, production-ready UIs:

1. **Typography**: Use a clear hierarchy with font weights and sizes
2. **Colors**: Use cohesive color palettes, prefer gradients for backgrounds
3. **Spacing**: Use consistent padding/margin (Tailwind's spacing scale)
4. **Layout**: Use Flexbox/Grid via Tailwind (flex, grid, gap)
5. **Responsiveness**: Always include responsive breakpoints (sm:, md:, lg:)
6. **Animations**: Add subtle hover states and transitions
7. **Components**: Create reusable, well-structured components
8. **Accessibility**: Use semantic HTML, proper ARIA labels

Tailwind class examples:
- Backgrounds: \`bg-gradient-to-br from-violet-600 to-indigo-600\`
- Text: \`text-4xl font-bold text-white\`
- Layout: \`flex items-center justify-center min-h-screen\`
- Spacing: \`p-8 mx-auto max-w-4xl\`
- Responsive: \`text-2xl md:text-4xl lg:text-6xl\`
- Effects: \`hover:scale-105 transition-transform duration-300\`
- Shadows: \`shadow-xl shadow-violet-500/20\`
- Borders: \`rounded-2xl border border-white/10\`
</design_instructions>

<chain_of_thought>
Before writing code, BRIEFLY (2-4 lines max) outline your approach. Then provide the implementation.
</chain_of_thought>

When the user asks to modify existing code:
1. Review the current files provided in the context
2. Understand the existing structure and patterns
3. Make surgical changes while preserving the existing code style
4. Return the COMPLETE updated file(s)

When the user provides visual style changes (from the visual editor):
1. Identify the component being modified
2. Convert the style changes to appropriate Tailwind classes
3. Update the component with the new classes
4. Preserve all existing functionality
`;

/**
 * Get the system prompt with optional context
 */
export function getSystemPrompt(options?: {
  projectFiles?: string;
  selectedElement?: {
    componentName: string;
    className: string;
    filePath?: string;
  };
}): string {
  let prompt = SYSTEM_PROMPT;

  if (options?.projectFiles) {
    prompt += `\n\n<current_project>\n${options.projectFiles}\n</current_project>`;
  }

  if (options?.selectedElement) {
    prompt += `\n\n<selected_element>
The user is currently editing: ${options.selectedElement.componentName}
Current classes: ${options.selectedElement.className}
${options.selectedElement.filePath ? `File: ${options.selectedElement.filePath}` : ''}
</selected_element>`;
  }

  return prompt;
}

/**
 * Format visual style changes as a prompt for the AI
 */
export function formatStyleChangesPrompt(
  elementInfo: {
    componentName: string;
    id: string;
    currentStyles: Record<string, string>;
  },
  changes: Record<string, string>
): string {
  const changesDescription = Object.entries(changes)
    .map(([prop, value]) => `- ${prop}: ${value}`)
    .join('\n');

  return `Update the "${elementInfo.componentName}" component (id: ${elementInfo.id}) with these style changes:

${changesDescription}

Convert these CSS values to appropriate Tailwind classes and update the component.
Return the complete updated component file.`;
}

/**
 * Common Tailwind mappings for CSS properties
 * Used as a reference for converting inline styles to Tailwind
 */
export const CSS_TO_TAILWIND: Record<string, (value: string) => string> = {
  // Colors
  backgroundColor: (v) => {
    if (v.startsWith('#')) {
      // Could map to closest Tailwind color
      return `bg-[${v}]`;
    }
    return `bg-${v}`;
  },
  color: (v) => {
    if (v.startsWith('#')) {
      return `text-[${v}]`;
    }
    return `text-${v}`;
  },

  // Layout
  display: (v) => {
    const map: Record<string, string> = {
      flex: 'flex',
      grid: 'grid',
      block: 'block',
      'inline-block': 'inline-block',
      'inline-flex': 'inline-flex',
      none: 'hidden',
    };
    return map[v] || '';
  },
  flexDirection: (v) => {
    const map: Record<string, string> = {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    };
    return map[v] || '';
  },
  justifyContent: (v) => {
    const map: Record<string, string> = {
      'flex-start': 'justify-start',
      'flex-end': 'justify-end',
      center: 'justify-center',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
    };
    return map[v] || '';
  },
  alignItems: (v) => {
    const map: Record<string, string> = {
      'flex-start': 'items-start',
      'flex-end': 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    };
    return map[v] || '';
  },

  // Spacing
  padding: (v) => `p-[${v}]`,
  margin: (v) => `m-[${v}]`,
  gap: (v) => `gap-[${v}]`,

  // Typography
  fontSize: (v) => `text-[${v}]`,
  fontWeight: (v) => {
    const map: Record<string, string> = {
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
    };
    return map[v] || `font-[${v}]`;
  },
  textAlign: (v) => `text-${v}`,

  // Border
  borderRadius: (v) => `rounded-[${v}]`,
  borderWidth: (v) => `border-[${v}]`,
  borderColor: (v) => `border-[${v}]`,

  // Effects
  opacity: (v) => `opacity-${Math.round(parseFloat(v) * 100)}`,
  boxShadow: (v) => v === 'none' ? 'shadow-none' : `shadow-[${v.replace(/\s+/g, '_')}]`,
};
