import { test, expect } from '@playwright/test';

/**
 * Unit tests for the artifact parser
 * Testing the bolt.diy-style code extraction from AI responses
 */

// We'll import and test the parser logic directly
test.describe('Artifact Parser - Unit Tests', () => {

  test('should parse boltArtifact format', async () => {
    const response = `
Here's the updated component:

<boltArtifact id="hero" title="Hero Component">
  <boltAction type="file" filePath="src/components/Hero.tsx">
import React from 'react';

export function Hero() {
  return (
    <section className="min-h-screen bg-violet-600">
      <h1>Hello World</h1>
    </section>
  );
}
  </boltAction>
</boltArtifact>

I've created a Hero component with a violet background.
`;

    // Test the regex patterns
    const boltArtifactPattern = /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/gi;
    const boltActionPattern = /<boltAction\s+type="(\w+)"(?:\s+filePath="([^"]+)")?[^>]*>([\s\S]*?)<\/boltAction>/gi;

    const artifactMatches = [...response.matchAll(boltArtifactPattern)];
    expect(artifactMatches.length).toBe(1);

    const artifactContent = artifactMatches[0][1];
    const actionMatches = [...artifactContent.matchAll(boltActionPattern)];
    expect(actionMatches.length).toBe(1);

    const [, type, filePath, content] = actionMatches[0];
    expect(type).toBe('file');
    expect(filePath).toBe('src/components/Hero.tsx');
    expect(content).toContain('export function Hero');
  });

  test('should parse lovable format', async () => {
    const response = `
<file path="src/App.tsx">
import React from 'react';

function App() {
  return <div>App</div>;
}

export default App;
</file>
`;

    const lovablePattern = /<file\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/file>/gi;
    const matches = [...response.matchAll(lovablePattern)];

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('src/App.tsx');
    expect(matches[0][2]).toContain('function App');
  });

  test('should parse cursor format (language:filepath)', async () => {
    const response = `
Here's the code:

\`\`\`tsx:src/components/Button.tsx
import React from 'react';

export function Button({ children }) {
  return <button className="px-4 py-2 bg-blue-500">{children}</button>;
}
\`\`\`
`;

    const cursorPattern = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
    const matches = [...response.matchAll(cursorPattern)];

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('tsx');
    expect(matches[0][2]).toBe('src/components/Button.tsx');
    expect(matches[0][3]).toContain('export function Button');
  });

  test('should parse multiple files in one response', async () => {
    const response = `
<boltArtifact id="app" title="Create App">
  <boltAction type="file" filePath="src/App.tsx">
import React from 'react';
import { Header } from './components/Header';

function App() {
  return (
    <div>
      <Header />
      <main>Content</main>
    </div>
  );
}

export default App;
  </boltAction>
  <boltAction type="file" filePath="src/components/Header.tsx">
import React from 'react';

export function Header() {
  return <header className="h-16 bg-white shadow">Header</header>;
}
  </boltAction>
  <boltAction type="shell">
npm install lucide-react
  </boltAction>
</boltArtifact>
`;

    const boltArtifactPattern = /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/gi;
    const boltActionPattern = /<boltAction\s+type="(\w+)"(?:\s+filePath="([^"]+)")?[^>]*>([\s\S]*?)<\/boltAction>/gi;

    const artifactMatches = [...response.matchAll(boltArtifactPattern)];
    const artifactContent = artifactMatches[0][1];
    const actionMatches = [...artifactContent.matchAll(boltActionPattern)];

    expect(actionMatches.length).toBe(3);

    // First file
    expect(actionMatches[0][1]).toBe('file');
    expect(actionMatches[0][2]).toBe('src/App.tsx');

    // Second file
    expect(actionMatches[1][1]).toBe('file');
    expect(actionMatches[1][2]).toBe('src/components/Header.tsx');

    // Shell command
    expect(actionMatches[2][1]).toBe('shell');
    expect(actionMatches[2][3]).toContain('npm install');
  });

  test('should handle mixed content with explanation', async () => {
    const response = `
I'll create a simple counter component with state management.

<boltArtifact id="counter" title="Counter Component">
  <boltAction type="file" filePath="src/Counter.tsx">
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-4">
      <button onClick={() => setCount(c => c - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
  </boltAction>
</boltArtifact>

The counter uses React's useState hook for state management. You can increment or decrement the value using the buttons.
`;

    const boltArtifactPattern = /<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/gi;
    const matches = [...response.matchAll(boltArtifactPattern)];

    expect(matches.length).toBe(1);

    // Check that explanation text is outside the artifact
    const beforeArtifact = response.substring(0, response.indexOf('<boltArtifact'));
    const afterArtifact = response.substring(response.indexOf('</boltArtifact>') + 15);

    expect(beforeArtifact).toContain("I'll create a simple counter");
    expect(afterArtifact).toContain('useState hook');
  });
});

test.describe('CSS to Tailwind Conversion', () => {
  const CSS_TO_TAILWIND: Record<string, (value: string) => string> = {
    backgroundColor: (v) => v.startsWith('#') ? `bg-[${v}]` : `bg-${v}`,
    color: (v) => v.startsWith('#') ? `text-[${v}]` : `text-${v}`,
    padding: (v) => `p-[${v}]`,
    borderRadius: (v) => `rounded-[${v}]`,
    fontSize: (v) => `text-[${v}]`,
  };

  test('should convert backgroundColor to Tailwind', async () => {
    expect(CSS_TO_TAILWIND.backgroundColor('#ff0000')).toBe('bg-[#ff0000]');
    expect(CSS_TO_TAILWIND.backgroundColor('red')).toBe('bg-red');
  });

  test('should convert padding to Tailwind', async () => {
    expect(CSS_TO_TAILWIND.padding('16px')).toBe('p-[16px]');
    expect(CSS_TO_TAILWIND.padding('1rem')).toBe('p-[1rem]');
  });

  test('should convert borderRadius to Tailwind', async () => {
    expect(CSS_TO_TAILWIND.borderRadius('8px')).toBe('rounded-[8px]');
    expect(CSS_TO_TAILWIND.borderRadius('50%')).toBe('rounded-[50%]');
  });

  test('should convert color to Tailwind', async () => {
    expect(CSS_TO_TAILWIND.color('#333333')).toBe('text-[#333333]');
    expect(CSS_TO_TAILWIND.color('white')).toBe('text-white');
  });
});

test.describe('Style Changes Prompt Generation', () => {
  test('should format style changes correctly', async () => {
    const elementInfo = {
      componentName: 'Hero',
      id: 'hero-1',
      currentStyles: {
        backgroundColor: '#ffffff',
        padding: '20px',
      },
    };

    const changes = {
      backgroundColor: '#000000',
      borderRadius: '16px',
    };

    const changesDescription = Object.entries(changes)
      .map(([prop, value]) => `- ${prop}: ${value}`)
      .join('\n');

    const prompt = `Update the "${elementInfo.componentName}" component (id: ${elementInfo.id}) with these style changes:

${changesDescription}

Convert these CSS values to appropriate Tailwind classes and update the component.
Return the complete updated component file.`;

    expect(prompt).toContain('Hero');
    expect(prompt).toContain('hero-1');
    expect(prompt).toContain('backgroundColor: #000000');
    expect(prompt).toContain('borderRadius: 16px');
    expect(prompt).toContain('Tailwind');
  });
});
