/**
 * System Prompt for OBJECTS Design Editor
 *
 * Instructs the AI to:
 * - Use <boltArtifact> tags for code output
 * - Use React + TypeScript + Tailwind
 * - Generate production-ready, visually stunning code
 *
 * Enhanced with:
 * - Style presets (Framer Dark, Linear, Stripe, etc.)
 * - Component library (pre-designed beautiful components)
 * - Few-shot examples (concrete examples for AI learning)
 */

// Import design tokens for design scheme injection
import {
  COLOR_PALETTES,
  TYPOGRAPHY_SCALES,
  SPACING_SYSTEMS,
  RADIUS_STYLES,
  DESIGN_PRESETS,
  getPresetByVibe,
  getRandomPreset,
  type ColorPalette,
  type TypographyScale,
  type SpacingSystem,
  type RadiusStyle,
  type DesignPreset,
} from '../design-system/tokens';

// Import new design system components
import {
  STYLE_PRESETS,
  TOPIC_PALETTES,
  getPresetById,
  getPalettesByTopic,
  getPalette,
  formatPaletteForPrompt,
  type StylePreset,
  type TopicPalette,
} from '../designSystem/stylePresets';

import {
  COMPONENT_LIBRARY,
  getComponentsByCategory,
  type ComponentBlock,
  type ComponentCategory,
} from '../designSystem/componentLibrary';

import {
  FEW_SHOT_EXAMPLES,
  formatExamplesForPrompt,
} from '../designSystem/fewShotExamples';

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

<canvas_instructions>
IMPORTANT: When creating UI layouts, generate BOTH visual canvas elements AND React code.

The "canvas" action creates VISUALLY EDITABLE elements that the user can drag, resize, and modify:

\`\`\`xml
<boltAction type="canvas">
{
  "elements": [
    {
      "type": "section",
      "name": "Hero Section",
      "styles": {
        "display": "flex",
        "flexDirection": "column",
        "alignItems": "center",
        "justifyContent": "center",
        "padding": 64,
        "gap": 24,
        "backgroundColor": "#0f172a",
        "minHeight": 600
      },
      "children": [
        {
          "type": "text",
          "name": "Title",
          "content": "Welcome to Our Platform",
          "styles": {
            "fontSize": 48,
            "fontWeight": 700,
            "color": "#ffffff",
            "textAlign": "center"
          }
        },
        {
          "type": "text",
          "name": "Subtitle",
          "content": "Build amazing products with our tools",
          "styles": {
            "fontSize": 20,
            "color": "#94a3b8",
            "textAlign": "center"
          }
        },
        {
          "type": "button",
          "name": "CTA Button",
          "content": "Get Started",
          "styles": {
            "backgroundColor": "#3b82f6",
            "color": "#ffffff",
            "padding": 16,
            "paddingLeft": 32,
            "paddingRight": 32,
            "borderRadius": 8,
            "fontSize": 16,
            "fontWeight": 600
          }
        }
      ]
    }
  ]
}
</boltAction>
\`\`\`

Available element types:
- **frame**: Generic container div
- **section**: Semantic section element
- **stack**: Flex column container
- **grid**: CSS grid container
- **container**: Centered max-width container
- **text**: Text content (p, span, h1-h6)
- **button**: Clickable button
- **link**: Anchor link (use href property)
- **image**: Image element (use src property)
- **input**: Form input (use placeholder, inputType properties)
- **icon**: Lucide icon (use iconName property, e.g., "ArrowRight", "Star")

Style properties (CSS in camelCase):
- Layout: display, flexDirection, justifyContent, alignItems, gap, flexWrap
- Spacing: padding, paddingTop/Right/Bottom/Left, margin, marginTop/Right/Bottom/Left
- Sizing: width, height, minWidth, minHeight, maxWidth, maxHeight
- Background: backgroundColor, backgroundImage
- Typography: fontSize, fontWeight, fontFamily, color, textAlign, lineHeight, letterSpacing
- Border: borderRadius, borderWidth, borderColor, borderStyle
- Effects: boxShadow, opacity, overflow

WORKFLOW:
1. When user asks to create UI, generate canvas elements FIRST
2. Then generate the corresponding React code as a file artifact
3. This allows user to visually edit the design AND have working code

Example response structure:
\`\`\`xml
<boltArtifact id="hero-section" title="Create Hero Section">
  <boltAction type="canvas">
  {
    "elements": [/* canvas elements here */]
  }
  </boltAction>
  <boltAction type="file" filePath="src/components/Hero.tsx">
  // React code here
  </boltAction>
</boltArtifact>
\`\`\`
</canvas_instructions>

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
 * Format templates from Supabase as MANDATORY structures for AI
 *
 * CRITICAL: Templates are not suggestions - they are REQUIRED structures.
 * The AI must copy these structures exactly, only changing content/colors.
 */
export function formatTemplatesForPrompt(templates: Array<{
  name?: string;
  type: string;
  style: string;
  description: string;
  json_structure: Record<string, unknown>;
}>): string {
  if (!templates || templates.length === 0) return '';

  // Count elements recursively
  const countElements = (obj: Record<string, unknown>): number => {
    let count = 1;
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) {
        count += countElements(child as Record<string, unknown>);
      }
    }
    return count;
  };

  // Format each template with MANDATORY language
  const examples = templates.map((t, index) => {
    const structure = ensureLayoutRules(t.json_structure);
    const elementCount = countElements(structure);
    // Compact JSON to save tokens
    const json = JSON.stringify({ elements: [structure] });

    return `▶ ${(t.name || t.type).toUpperCase()} (${elementCount} elements):
${json}`;
  });

  return examples.join('\n\n');
}

/**
 * Ensure template follows our layout rules (resizeX: 'fill' for row children)
 */
function ensureLayoutRules(structure: Record<string, unknown>): Record<string, unknown> {
  const result = { ...structure };

  // If this is a row, ensure children have resizeX: 'fill'
  if (result.type === 'row' && Array.isArray(result.children)) {
    result.children = (result.children as Record<string, unknown>[]).map(child => {
      const childCopy = { ...child };
      if (!childCopy.styles) childCopy.styles = {};
      if (typeof childCopy.styles === 'object') {
        (childCopy.styles as Record<string, unknown>).resizeX = 'fill';
      }
      // Recursively apply to nested children
      if (childCopy.children) {
        childCopy.children = (childCopy.children as Record<string, unknown>[]).map(
          c => ensureLayoutRules(c as Record<string, unknown>)
        );
      }
      return childCopy;
    });
  }

  // Recursively process children
  if (Array.isArray(result.children)) {
    result.children = (result.children as Record<string, unknown>[]).map(
      child => ensureLayoutRules(child as Record<string, unknown>)
    );
  }

  return result;
}

/**
 * Animation presets for design elements
 */
export const ANIMATION_PRESETS = {
  fadeIn: { name: 'Fade In', duration: 0.5 },
  slideUp: { name: 'Slide Up', duration: 0.5 },
  slideDown: { name: 'Slide Down', duration: 0.5 },
  slideLeft: { name: 'Slide Left', duration: 0.5 },
  slideRight: { name: 'Slide Right', duration: 0.5 },
  scaleIn: { name: 'Scale In', duration: 0.4 },
  bounce: { name: 'Bounce', duration: 0.6 },
  pulse: { name: 'Pulse', duration: 0.5 },
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

/**
 * Design Mode System Prompt - BOLT ARTIFACT FORMAT
 * Uses <boltArtifact> and <boltAction> tags for structured output
 * Supports both canvas elements (JSON) and React code files
 */
export const DESIGN_MODE_PROMPT = `You are a world-class designer. Generate designs using boltArtifact format with nested JSON elements.

<critical_rules>
1. WRAP output in <boltArtifact> tags
2. Children must be FULL OBJECTS with type, name, content, styles - NOT string references
3. Use numeric values for spacing (padding: 64, not "64px")
4. Colors in HEX format: "#0f172a"
5. Text content must match user's language (Italian → Italian text)
</critical_rules>

<element_types>
- section: Full-width container (use for hero, features, etc.)
- frame: Generic flex container
- row: Horizontal flex container
- text: Text content (requires "content" property)
- button: Clickable button (requires "content" property)
- image: Image (set "src" to Unsplash URL)
</element_types>

<structure_example>
CORRECT - children are FULL OBJECTS:
{
  "type": "section",
  "name": "Hero",
  "styles": { "backgroundColor": "#1a1a1a", "padding": 80 },
  "children": [
    { "type": "text", "name": "Title", "content": "Welcome", "styles": { "fontSize": 64, "color": "#fff" } },
    { "type": "button", "name": "CTA", "content": "Get Started", "styles": { "backgroundColor": "#8B5CF6" } }
  ]
}

WRONG - children as strings (DO NOT DO THIS):
"children": ["title", "subtitle", "button"]
</structure_example>

<full_example>
User: "crea un hero per una cantina"

<boltArtifact id="wine-hero" title="Cantina Hero">
<boltAction type="canvas">
{"elements":[{"type":"section","name":"Hero","styles":{"display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":80,"gap":32,"minHeight":600,"backgroundColor":"#1a0a0a"},"children":[{"type":"text","name":"Headline","content":"Scopri i Nostri Vini Pregiati","styles":{"fontSize":56,"fontWeight":700,"color":"#ffffff","textAlign":"center"}},{"type":"text","name":"Subtitle","content":"Tradizione e passione dal 1920","styles":{"fontSize":18,"color":"#a1a1aa","textAlign":"center"}},{"type":"button","name":"CTA","content":"Esplora la Cantina","styles":{"backgroundColor":"#722F37","color":"#ffffff","padding":16,"paddingLeft":32,"paddingRight":32,"borderRadius":8,"fontSize":16,"fontWeight":600}}]}]}
</boltAction>
</boltArtifact>
</full_example>

Generate designs with NESTED children objects. Never use string references.`;

/**
 * Format a compact design scheme for AI injection
 * Keep it SHORT - long prompts confuse the AI
 */
export function formatDesignScheme(presetName?: DesignPreset | string): string {
  // Get preset (or random if not specified)
  const preset = presetName && presetName in DESIGN_PRESETS
    ? DESIGN_PRESETS[presetName as DesignPreset]
    : DESIGN_PRESETS[getRandomPreset()];

  const colors = COLOR_PALETTES[preset.colors as ColorPalette];

  // ULTRA COMPACT - just the essential colors
  return `
COLORS: bg="${colors.bg}" text="${colors.primary}" accent="${colors.accent}" muted="${colors.muted}"`;
}

/**
 * Get design prompt with dynamic templates from Supabase
 * Templates are passed in, not hardcoded
 */
export function getDesignPromptWithTemplates(options?: {
  style?: string;
  pageType?: string;
  designPreset?: DesignPreset | string;
  templates?: Array<{
    type: string;
    style: string;
    description: string;
    json_structure: Record<string, unknown>;
  }>;
}): string {
  let prompt = DESIGN_MODE_PROMPT;

  // Determine design preset from style or use random
  let presetName: DesignPreset | string | undefined = options?.designPreset;
  if (!presetName && options?.style) {
    presetName = getPresetByVibe(options.style);
  }

  // Add the complete design scheme (like Bolt DIY)
  prompt += formatDesignScheme(presetName);

  // DISABLED: Supabase templates make the prompt too long and confuse the AI
  // The hardcoded templates in DESIGN_MODE_PROMPT are sufficient
  // if (options?.templates && options.templates.length > 0) { ... }

  return prompt;
}

/**
 * Document Types - All types of design documents AI can generate
 */
export type DocumentType =
  | 'website'      // Web pages, landing pages
  | 'brand-manual' // Brand guidelines, style guides
  | 'pitch-deck'   // Presentation slides
  | 'social-media' // Instagram, Stories, LinkedIn posts
  | 'print'        // Poster, flyer, business card, brochure
  | 'ui-kit'       // Component library, design system
  | 'editorial'    // Magazine, article layouts
  | 'marketing'    // Banner, ads, email templates
  | 'packaging'    // Label, box design
  | 'menu'         // Restaurant menus, price lists
  | 'resume'       // CV, portfolio
  | 'infographic'; // Data visualization, charts

/**
 * Document type configurations with specific rules
 */
export const DOCUMENT_TYPE_CONFIGS: Record<DocumentType, {
  name: string;
  keywords: string[];
  pageSize?: { width: number; height: number };
  aspectRatio?: string;
  prompt: string;
}> = {
  'website': {
    name: 'Website / Landing Page',
    keywords: ['sito', 'website', 'landing', 'homepage', 'web', 'pagina'],
    prompt: `DOCUMENT TYPE: Website / Landing Page
- Full-width sections stacked vertically
- Header (72px height), Hero, Features, CTA, Footer
- Responsive layout, mobile-first
- Navigation with logo and menu items
- Call-to-action buttons prominent`
  },
  'brand-manual': {
    name: 'Brand Manual / Guidelines',
    keywords: ['brand', 'manual', 'guidelines', 'linee guida', 'brand book', 'identity', 'marchio'],
    pageSize: { width: 1920, height: 1080 },
    prompt: `DOCUMENT TYPE: Brand Manual / Guidelines
Generate structured brand documentation with these sections:

1. COVER PAGE
- Large logo centered
- Brand name in brand typography
- "Brand Guidelines" or "Brand Manual" subtitle
- Version/date

2. BRAND OVERVIEW
- Mission statement
- Brand values (3-5 values with icons)
- Brand personality keywords
- Tone of voice description

3. LOGO USAGE
- Primary logo (large, centered)
- Logo variations (horizontal, vertical, icon-only)
- Clear space rules (show minimum margins)
- Minimum size specifications
- Incorrect usage examples (crossed out)

4. COLOR PALETTE
- Primary colors with:
  - Large color swatch (100x100px minimum)
  - Color name
  - HEX code
  - RGB values
  - CMYK values (for print)
- Secondary colors same format
- Color combinations/pairings
- Do's and Don'ts for color usage

5. TYPOGRAPHY
- Primary typeface with specimen (Aa Bb Cc... 0-9)
- Font weights showcase (Light, Regular, Medium, Bold)
- Heading styles (H1, H2, H3 with sizes)
- Body text specifications
- Line height and spacing rules

6. IMAGERY STYLE
- Photo style examples (mood, lighting, subjects)
- Illustration style if applicable
- Icon style guidelines
- Image treatment (filters, overlays)

7. APPLICATIONS
- Business card mockup
- Letterhead mockup
- Social media templates
- Signage examples

LAYOUT RULES:
- Use consistent grid (12-column)
- Generous white space
- Section headers clearly marked
- Page numbers
- Consistent margins (80-100px)`
  },
  'pitch-deck': {
    name: 'Pitch Deck / Presentation',
    keywords: ['pitch', 'deck', 'presentation', 'presentazione', 'slides', 'investor'],
    pageSize: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
    prompt: `DOCUMENT TYPE: Pitch Deck / Presentation
Generate slides with 16:9 aspect ratio (1920x1080):

SLIDE TYPES TO INCLUDE:
1. TITLE SLIDE - Company name, tagline, logo
2. PROBLEM - The problem you're solving
3. SOLUTION - Your product/service
4. MARKET SIZE - TAM/SAM/SOM with numbers
5. BUSINESS MODEL - How you make money
6. TRACTION - Key metrics, growth charts
7. TEAM - Founders with photos and titles
8. ASK - Funding amount and use of funds
9. CONTACT - CTA and contact info

LAYOUT RULES:
- One key message per slide
- Large headlines (48-72px)
- Minimal text, maximum impact
- Consistent header/footer placement
- Slide numbers
- Icons and visuals over text
- Dark or gradient backgrounds work well
- Accent color for key numbers`
  },
  'social-media': {
    name: 'Social Media Content',
    keywords: ['instagram', 'social', 'post', 'story', 'stories', 'linkedin', 'twitter', 'facebook', 'tiktok', 'reel'],
    prompt: `DOCUMENT TYPE: Social Media Content

INSTAGRAM POST (1080x1080):
- Bold headline
- Clean imagery
- Brand colors
- CTA or hashtags

INSTAGRAM STORY (1080x1920):
- Vertical full-screen
- Interactive elements space
- Swipe up CTA area
- Text safe zone (top 15%, bottom 20% clear)

LINKEDIN POST (1200x627):
- Professional tone
- Clear value proposition
- Author info area

CAROUSEL (1080x1080 per slide):
- Hook on first slide
- One point per slide
- Clear progression
- CTA on last slide

LAYOUT RULES:
- Eye-catching first frame
- Brand elements (logo, colors)
- Readable text (min 24px)
- Safe zones for UI elements`
  },
  'print': {
    name: 'Print Materials',
    keywords: ['poster', 'flyer', 'volantino', 'business card', 'biglietto', 'brochure', 'stampa', 'print', 'manifesto'],
    prompt: `DOCUMENT TYPE: Print Materials

POSTER (A3/A2):
- Strong visual hierarchy
- One focal point
- Event details clear
- Brand elements

FLYER (A5/A4):
- Front: Hero image + headline
- Back: Details, contact, map
- QR code for digital link

BUSINESS CARD (85x55mm):
- Front: Logo, name, title
- Back: Contact details, QR
- Minimal, elegant

BROCHURE (A4 tri-fold):
- Cover: Hero + headline
- Inside panels: Features/benefits
- Back: Contact + CTA

LAYOUT RULES:
- CMYK color space
- Bleed area (3mm)
- High contrast for readability
- Print-safe fonts
- Consider fold lines`
  },
  'ui-kit': {
    name: 'UI Kit / Design System',
    keywords: ['ui kit', 'design system', 'component', 'componenti', 'library', 'libreria'],
    prompt: `DOCUMENT TYPE: UI Kit / Design System

SECTIONS TO INCLUDE:
1. COLOR TOKENS
- Primary, secondary, accent
- Semantic colors (success, warning, error, info)
- Neutral scale (gray-50 to gray-900)
- Each with hex and usage note

2. TYPOGRAPHY SCALE
- Display (48-72px)
- Headings (H1-H6)
- Body (16px, 14px)
- Caption (12px)
- Show font-weight variants

3. SPACING SCALE
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- Visual representation

4. BUTTON COMPONENTS
- Primary, Secondary, Outline, Ghost, Link
- States: default, hover, active, disabled
- Sizes: sm, md, lg

5. INPUT COMPONENTS
- Text input with label
- States: empty, filled, focus, error
- Textarea, select, checkbox, radio

6. CARD COMPONENTS
- Basic card
- Card with image
- Card with actions
- Interactive card

7. NAVIGATION
- Navbar variants
- Sidebar
- Breadcrumbs
- Tabs

LAYOUT RULES:
- Organized in a grid
- Clear labeling
- Consistent spacing
- Dark/light mode variants`
  },
  'editorial': {
    name: 'Editorial / Magazine',
    keywords: ['magazine', 'rivista', 'article', 'articolo', 'editorial', 'blog', 'journal'],
    prompt: `DOCUMENT TYPE: Editorial / Magazine Layout

ELEMENTS:
- Feature headline (large, dramatic)
- Subheadline/deck
- Byline (author, date)
- Body text columns
- Pull quotes (large, styled)
- Drop caps
- Image with caption
- Sidebar/callout boxes

LAYOUT RULES:
- Multi-column grid (2-3 columns)
- Generous margins
- Clear hierarchy
- Pull quotes break monotony
- Images full-bleed or with margins
- Page numbers
- Running headers`
  },
  'marketing': {
    name: 'Marketing Materials',
    keywords: ['banner', 'ad', 'ads', 'email', 'newsletter', 'marketing', 'advertising', 'pubblicità'],
    prompt: `DOCUMENT TYPE: Marketing Materials

BANNER AD (various sizes):
- 728x90 (leaderboard)
- 300x250 (medium rectangle)
- 160x600 (skyscraper)
- Clear CTA button
- Logo visible
- Minimal text

EMAIL TEMPLATE:
- Header with logo
- Hero image
- Main message
- CTA button (prominent)
- Secondary content
- Footer with unsubscribe

LAYOUT RULES:
- Instant message clarity
- Strong CTA
- Brand colors
- Mobile-friendly
- Fast loading (simple design)`
  },
  'packaging': {
    name: 'Packaging Design',
    keywords: ['packaging', 'label', 'etichetta', 'box', 'scatola', 'bottle', 'bottiglia', 'confezione'],
    prompt: `DOCUMENT TYPE: Packaging Design

ELEMENTS:
- Product name (prominent)
- Brand logo
- Product description
- Key benefits/features
- Ingredients/specs
- Barcode area
- Regulatory info area
- Visual/illustration

LAYOUT RULES:
- 360° consideration
- Hierarchy at shelf
- Legibility at distance
- Die-cut awareness
- Color for category`
  },
  'menu': {
    name: 'Menu / Price List',
    keywords: ['menu', 'menù', 'price list', 'listino', 'ristorante', 'restaurant', 'food'],
    prompt: `DOCUMENT TYPE: Menu / Price List

SECTIONS:
- Header (restaurant name, logo)
- Categories (Antipasti, Primi, Secondi, etc.)
- Items with:
  - Name (prominent)
  - Description (italic, smaller)
  - Price (aligned right)
  - Dietary icons (V, VG, GF)
- Specials/featured items
- Footer (allergen info, contact)

LAYOUT RULES:
- Easy scanning
- Clear price alignment
- Category separation
- Elegant typography
- Consider single-page or multi-page`
  },
  'resume': {
    name: 'Resume / CV / Portfolio',
    keywords: ['resume', 'cv', 'curriculum', 'portfolio', 'portfolio'],
    pageSize: { width: 595, height: 842 }, // A4
    prompt: `DOCUMENT TYPE: Resume / CV

SECTIONS:
- Header (name, title, contact, photo optional)
- Summary/objective
- Experience (company, role, dates, achievements)
- Education
- Skills (visual bars or tags)
- Languages
- Projects/portfolio links

LAYOUT RULES:
- Clean, scannable
- Reverse chronological
- Quantified achievements
- Consistent formatting
- One-two pages max
- ATS-friendly structure`
  },
  'infographic': {
    name: 'Infographic',
    keywords: ['infographic', 'infografica', 'data', 'dati', 'visualization', 'visualizzazione', 'chart', 'grafico', 'statistics'],
    prompt: `DOCUMENT TYPE: Infographic

ELEMENTS:
- Strong title/headline
- Key statistics (large numbers)
- Icons representing concepts
- Flow/process diagrams
- Comparison charts
- Timeline if applicable
- Source citations
- Brand footer

LAYOUT RULES:
- Vertical scroll-friendly
- Visual hierarchy
- Color-coded sections
- Minimal text
- Data visualization focus
- Shareable dimensions`
  },
};

/**
 * Detect document type from user message
 */
export function detectDocumentType(message: string): DocumentType {
  const lowerMessage = message.toLowerCase();

  for (const [type, config] of Object.entries(DOCUMENT_TYPE_CONFIGS) as [DocumentType, typeof DOCUMENT_TYPE_CONFIGS[DocumentType]][]) {
    if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return type;
    }
  }

  // Default to website
  return 'website';
}

/**
 * Get document-specific prompt section
 */
export function getDocumentTypePrompt(type: DocumentType): string {
  const config = DOCUMENT_TYPE_CONFIGS[type];

  let prompt = `\n═══════════════════════════════════════════════════════════════
📄 ${config.name.toUpperCase()}
═══════════════════════════════════════════════════════════════
${config.prompt}
`;

  if (config.pageSize) {
    prompt += `\nPAGE SIZE: ${config.pageSize.width}x${config.pageSize.height}px`;
  }
  if (config.aspectRatio) {
    prompt += `\nASPECT RATIO: ${config.aspectRatio}`;
  }

  return prompt;
}

/**
 * Design Style Presets
 * Users can select a style and the AI will generate designs in that style
 */
export type DesignStyle = 'modern-dark' | 'minimal-light' | 'bold-gradient' | 'elegant-luxury' | 'playful-colorful' | 'corporate-clean';

export const DESIGN_STYLE_PRESETS: Record<DesignStyle, { name: string; description: string; prompt: string }> = {
  'modern-dark': {
    name: 'Modern Dark',
    description: 'Sleek dark theme with subtle accents',
    prompt: `STYLE: Modern Dark
- Background: #0a0a0a, #111111, #1a1a1a
- Text: #ffffff (primary), rgba(255,255,255,0.6) (secondary)
- Accents: #c9a962 (gold) or #3b82f6 (blue)
- Typography: Clean, bold headlines with tight letter-spacing
- Borders: Subtle rgba(255,255,255,0.1) borders
- Buttons: Solid white or accent color, pill-shaped (borderRadius 50)`
  },
  'minimal-light': {
    name: 'Minimal Light',
    description: 'Clean white space with black typography',
    prompt: `STYLE: Minimal Light
- Background: #ffffff, #fafafa, #f5f5f5
- Text: #1a1a1a (primary), #666666 (secondary)
- Accents: #000000 or single brand color
- Typography: Elegant, lots of white space, generous line-height
- Borders: Light #e5e5e5 or none
- Buttons: Black with white text, subtle rounded corners (borderRadius 8-12)`
  },
  'bold-gradient': {
    name: 'Bold Gradient',
    description: 'Vibrant gradients with high contrast',
    prompt: `STYLE: Bold Gradient
- Background: Vibrant gradients like linear-gradient(135deg, #667eea 0%, #764ba2 100%) or linear-gradient(135deg, #f093fb 0%, #f5576c 100%)
- Text: #ffffff with subtle text shadows for depth
- Accents: White or contrasting bright colors
- Typography: Extra bold headlines (fontWeight 800-900), large sizes
- Buttons: White with gradient text, or solid white
- Effects: Consider backdrop blur for glass effects`
  },
  'elegant-luxury': {
    name: 'Elegant Luxury',
    description: 'Sophisticated with gold accents',
    prompt: `STYLE: Elegant Luxury
- Background: #0a0a0a (deep black), #1c1917 (warm dark)
- Text: #ffffff, #f5f5f4 (warm white)
- Accents: #c9a962 (gold), #d4af37 (metallic gold)
- Typography: Elegant serif-like feel, generous letter-spacing on labels
- Borders: Gold accents rgba(201,169,98,0.3)
- Buttons: Gold accents, refined rounded corners
- Labels: Uppercase, spaced-out letters`
  },
  'playful-colorful': {
    name: 'Playful Colorful',
    description: 'Fun, bright colors with rounded shapes',
    prompt: `STYLE: Playful Colorful
- Background: Bright colors like #fef3c7, #dbeafe, #fce7f3, or multi-color gradients
- Text: Dark contrasting colors #1f2937, #7c3aed
- Accents: Multiple bright colors - purple, pink, yellow, teal
- Typography: Rounded, friendly fonts, bouncy feel
- Borders: Thick colorful borders, large border-radius (16-24)
- Buttons: Colorful with shadows, very rounded (borderRadius 20+)
- Effects: Playful shadows, slight rotations`
  },
  'corporate-clean': {
    name: 'Corporate Clean',
    description: 'Professional, trustworthy business look',
    prompt: `STYLE: Corporate Clean
- Background: #ffffff, #f8fafc, #f1f5f9
- Text: #0f172a (primary), #475569 (secondary)
- Accents: Professional blue #2563eb, or teal #0d9488
- Typography: Clear, readable, professional hierarchy
- Borders: Clean #e2e8f0 borders
- Buttons: Solid accent color, moderate rounding (borderRadius 6-8)
- Cards: White with subtle shadows`
  }
};

/**
 * Get style-enhanced design prompt
 */
export function getStyledDesignPrompt(style?: DesignStyle): string {
  let prompt = DESIGN_MODE_PROMPT;

  if (style && DESIGN_STYLE_PRESETS[style]) {
    prompt += `\n\n═══════════════════════════════════════════════════════════════
SELECTED DESIGN STYLE
═══════════════════════════════════════════════════════════════
${DESIGN_STYLE_PRESETS[style].prompt}

Apply this style consistently to all generated elements.`;
  }

  return prompt;
}

/**
 * Format design tokens for AI context
 */
export function formatDesignTokensForAI(tokens: {
  colors: Array<{ id: string; name: string; value: string; group?: string }>;
  radii: Array<{ id: string; name: string; value: number }>;
  spacing: Array<{ id: string; name: string; value: number }>;
}): string {
  const brandColors = tokens.colors.filter(c => c.group === 'brand');

  if (brandColors.length === 0) return '';

  return `
BRAND COLORS (use for accents, buttons, highlights):
${brandColors.map(c => `- ${c.name}: "${c.value}"`).join('\n')}
`;
}

/**
 * Format current canvas elements as context for AI
 * Pass FULL JSON so AI can modify existing elements
 */
export function formatCanvasContextForAI(elements: Array<{
  id: string;
  type: string;
  name: string;
  styles?: Record<string, unknown>;
  content?: string;
  children?: string[];
}>, userMessage?: string): string {
  // Filter out page elements - only show actual content
  const contentElements = elements.filter(el => el.type !== 'page');

  if (contentElements.length === 0) return '';

  // Detect if user wants to MODIFY existing elements
  const modifyKeywords = ['modifica', 'cambia', 'change', 'update', 'edit', 'colore', 'color', 'testo', 'text', 'dimensione', 'size'];
  const isModifyRequest = userMessage && modifyKeywords.some(kw => userMessage.toLowerCase().includes(kw));

  // Build a simplified representation of current canvas
  const elementsInfo = contentElements.map(el => ({
    id: el.id,
    type: el.type,
    name: el.name,
    content: el.content || undefined,
  }));

  if (isModifyRequest) {
    return `
═══════════════════════════════════════════════════════════════════════════════
🎯 MODIFY EXISTING ELEMENTS - DO NOT CREATE NEW SECTIONS
═══════════════════════════════════════════════════════════════════════════════

The user wants to MODIFY existing elements, not create new ones.

CURRENT CANVAS ELEMENTS:
${JSON.stringify(elementsInfo, null, 2)}

INSTRUCTIONS:
1. Find the element the user wants to modify
2. Output ONLY the modified element(s) with their ID
3. Keep the same structure, only change what the user asked
4. Output format: {"elements": [{"id": "existing-id", ...modified properties...}]}

DO NOT create new sections. ONLY modify existing elements.
`;
  }

  // For new content requests, just mention existing sections
  const sectionNames = contentElements
    .filter(el => el.type === 'section')
    .map(el => el.name);

  if (sectionNames.length === 0) return '';

  return `\nExisting sections on canvas: ${sectionNames.join(', ')}. Create new sections that complement these.`;
}

/**
 * Get the system prompt with optional context
 */
export function getSystemPrompt(options?: {
  mode?: 'design' | 'code';
  projectFiles?: string;
  designStyle?: DesignStyle;
  /** Design preset from tokens.ts (e.g., 'noir-impact', 'candy-playful') */
  designPreset?: DesignPreset | string;
  /** User message - used to detect if they want to modify existing elements */
  userMessage?: string;
  designTokens?: {
    colors: Array<{ id: string; name: string; value: string; group?: string }>;
    radii: Array<{ id: string; name: string; value: number }>;
    spacing: Array<{ id: string; name: string; value: number }>;
  };
  selectedElement?: {
    componentName: string;
    className: string;
    filePath?: string;
  };
  currentCanvas?: Array<{
    id: string;
    type: string;
    name: string;
    styles?: Record<string, unknown>;
    content?: string;
    children?: string[];
  }>;
  // Templates fetched from Supabase
  templates?: Array<{
    type: string;
    style: string;
    description: string;
    json_structure: Record<string, unknown>;
  }>;
}): string {
  // Use design prompt for design mode
  if (options?.mode === 'design') {
    // Start with dynamic template-based prompt including design scheme
    let prompt = getDesignPromptWithTemplates({
      style: options.designStyle,
      designPreset: options.designPreset,
      templates: options.templates,
    });

    // Detect document type from user message and add specific instructions
    if (options.userMessage) {
      const documentType = detectDocumentType(options.userMessage);
      if (documentType !== 'website') {
        // Add document-specific instructions for non-website documents
        prompt += getDocumentTypePrompt(documentType);
        console.log(`[SystemPrompt] Detected document type: ${documentType}`);
      }
    }

    // Add design tokens context if provided
    if (options.designTokens) {
      prompt += '\n\n' + formatDesignTokensForAI(options.designTokens);
    }

    // Add current canvas context if provided
    if (options.currentCanvas && options.currentCanvas.length > 0) {
      prompt += '\n\n' + formatCanvasContextForAI(options.currentCanvas, options.userMessage);
    }

    return prompt;
  }

  // Default to code mode with full system prompt
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

// ============================================
// ENHANCED DESIGN SYSTEM INTEGRATION
// ============================================

/**
 * Format a style preset for AI prompt injection
 * Provides the AI with a complete design system to follow
 */
export function formatStylePresetForAI(presetId: string): string {
  const preset = getPresetById(presetId);
  if (!preset) return '';

  return `
═══════════════════════════════════════════════════════════════
🎨 DESIGN SYSTEM: ${preset.name.toUpperCase()}
═══════════════════════════════════════════════════════════════

${preset.description}

COLOR PALETTE:
- Background Primary: "${preset.colors.bgPrimary}"
- Background Secondary: "${preset.colors.bgSecondary}"
- Background Tertiary: "${preset.colors.bgTertiary}"
- Text Primary: "${preset.colors.textPrimary}"
- Text Secondary: "${preset.colors.textSecondary}"
- Text Tertiary: "${preset.colors.textTertiary}"
- Primary Accent: "${preset.colors.primary}"
- Secondary Accent: "${preset.colors.secondary}"
- Border: "${preset.colors.border}"

TYPOGRAPHY:
- Font Family: "${preset.typography.fontFamily.heading}"
- Display: ${preset.typography.scale.display.size}px, weight ${preset.typography.scale.display.weight}
- H1: ${preset.typography.scale.h1.size}px, weight ${preset.typography.scale.h1.weight}
- H2: ${preset.typography.scale.h2.size}px, weight ${preset.typography.scale.h2.weight}
- Body: ${preset.typography.scale.body.size}px, weight ${preset.typography.scale.body.weight}

SPACING:
- Section Padding: ${preset.spacing.section}px
- Large Gap: ${preset.spacing.xxl}px
- Medium Gap: ${preset.spacing.lg}px
- Small Gap: ${preset.spacing.md}px

BORDER RADIUS:
- Cards: ${preset.radius.lg}px
- Buttons: ${preset.radius.md}px
- Badges: ${preset.radius.sm}px

SHADOWS:
- Card Shadow: "${preset.shadows.md}"
- Large Shadow: "${preset.shadows.lg}"

BUTTON STYLES:
- Primary: bg="${preset.components.button.primary.backgroundColor}", color="${preset.components.button.primary.color}", radius=${preset.components.button.primary.borderRadius}
- Secondary: bg="${preset.components.button.secondary.backgroundColor}", color="${preset.components.button.secondary.color}"

APPLY THIS DESIGN SYSTEM TO ALL GENERATED ELEMENTS.
`;
}

/**
 * Get available style preset IDs for user selection with color preview
 */
export interface StylePresetOption {
  id: string;
  name: string;
  description: string;
  colors: {
    bg: string;
    primary: string;
    accent: string;
    text: string;
  };
  preview: string;
}

export function getAvailableStylePresets(): StylePresetOption[] {
  return STYLE_PRESETS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    colors: {
      bg: p.colors.bgPrimary,
      primary: p.colors.primary,
      accent: p.colors.accent,
      text: p.colors.textPrimary,
    },
    preview: p.preview,
  }));
}

/**
 * Get topic palettes for UI selection
 */
export function getTopicPalettes(): Array<{ topic: string; palettes: TopicPalette[] }> {
  return Object.entries(TOPIC_PALETTES).map(([topic, palettes]) => ({
    topic,
    palettes,
  }));
}

/**
 * Get a specific topic's color palettes
 */
export function getTopicColorOptions(topic: string): TopicPalette[] {
  return TOPIC_PALETTES[topic] || [];
}

/**
 * Format component library examples for AI reference
 * Shows the AI what beautiful components look like
 */
export function formatComponentExamplesForAI(categories?: ComponentCategory[]): string {
  const components = categories
    ? categories.flatMap(cat => getComponentsByCategory(cat))
    : COMPONENT_LIBRARY.slice(0, 5); // Default to first 5 components

  if (components.length === 0) return '';

  return `
═══════════════════════════════════════════════════════════════
📦 COMPONENT REFERENCE LIBRARY
═══════════════════════════════════════════════════════════════

Use these pre-designed components as TEMPLATES. Copy their structure
and adapt the content for the user's request.

${components.map(comp => `
▶ ${comp.name.toUpperCase()} (${comp.category})
${comp.description}
${JSON.stringify(comp.element, null, 2)}
`).join('\n---\n')}
`;
}

/**
 * Format few-shot examples for AI learning
 * Shows concrete input → output examples
 */
export function formatFewShotExamplesForAI(category?: string): string {
  const examples = category
    ? FEW_SHOT_EXAMPLES.filter(e => e.category === category)
    : FEW_SHOT_EXAMPLES.slice(0, 2); // Default to first 2 examples

  if (examples.length === 0) return '';

  return `
═══════════════════════════════════════════════════════════════
📐 STRUCTURAL REFERENCE - ADAPT CONTENT TO USER'S REQUEST
═══════════════════════════════════════════════════════════════

⚠️ CRITICAL: These are STRUCTURE examples only!

YOU MUST:
1. Use the JSON structure and layout patterns from examples
2. COMPLETELY REWRITE all text content for the user's specific topic
3. Choose colors that match the user's theme (NOT the example colors)
4. Select relevant images for the user's topic
5. Create unique, contextual content - NEVER copy example text

EXAMPLE ADAPTATION:
- If user says "wine theme" → headlines like "Discover Our Finest Wines", burgundy/gold colors
- If user says "fitness app" → headlines like "Transform Your Body", energetic colors
- If user says "restaurant" → headlines like "A Culinary Journey", warm appetizing colors

The example text like "Build Something Beautiful" is PLACEHOLDER ONLY.
Your output must have completely different, topic-specific content.

${formatExamplesForPrompt(examples)}
`;
}

/**
 * Get enhanced design prompt with full design system
 * This is the main function to use for high-quality AI design generation
 */
export function getEnhancedDesignPrompt(options?: {
  /** Style preset to use (e.g., 'framer-dark', 'linear-dark', 'minimal-light') */
  stylePreset?: string;
  /** Categories of components to include as examples */
  componentCategories?: ComponentCategory[];
  /** Include few-shot examples for this category */
  fewShotCategory?: 'landing' | 'portfolio' | 'saas' | 'ecommerce' | 'blog';
  /** User's message for context */
  userMessage?: string;
  /** Current canvas elements */
  currentCanvas?: Array<{
    id: string;
    type: string;
    name: string;
    styles?: Record<string, unknown>;
    content?: string;
    children?: string[];
  }>;
}): string {
  // Start with base design prompt
  let prompt = DESIGN_MODE_PROMPT;

  // Add style preset if specified
  if (options?.stylePreset) {
    prompt += '\n\n' + formatStylePresetForAI(options.stylePreset);
  }

  // Add component examples if categories specified
  if (options?.componentCategories && options.componentCategories.length > 0) {
    prompt += '\n\n' + formatComponentExamplesForAI(options.componentCategories);
  }

  // Add few-shot examples if category specified
  if (options?.fewShotCategory) {
    prompt += '\n\n' + formatFewShotExamplesForAI(options.fewShotCategory);
  }

  // Add canvas context for modification requests
  if (options?.currentCanvas && options.currentCanvas.length > 0) {
    prompt += '\n\n' + formatCanvasContextForAI(options.currentCanvas, options.userMessage);
  }

  return prompt;
}

/**
 * Quick helper to get a production-ready design prompt
 * with sensible defaults for common use cases
 */
export function getQuickDesignPrompt(type: 'saas' | 'portfolio' | 'ecommerce' | 'blog' = 'saas'): string {
  const presetMap: Record<string, string> = {
    saas: 'framer-dark',
    portfolio: 'minimal-light',
    ecommerce: 'stripe-gradient',
    blog: 'linear-dark',
  };

  const categoryMap: Record<string, ComponentCategory[]> = {
    saas: ['hero', 'features', 'pricing', 'cta'],
    portfolio: ['hero', 'cards'],
    ecommerce: ['hero', 'cards', 'cta'],
    blog: ['navbar', 'cards', 'footer'],
  };

  return getEnhancedDesignPrompt({
    stylePreset: presetMap[type],
    componentCategories: categoryMap[type],
    fewShotCategory: type as 'saas' | 'portfolio' | 'ecommerce' | 'blog',
  });
}

// ============================================
// DESIGN INTENT EXTRACTION
// ============================================

/**
 * Design intent extracted from user message
 */
export interface DesignIntent {
  topic: string;
  mood: string[];
  suggestedColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  suggestedImages: string[];
  language: 'it' | 'en';
  palette?: TopicPalette;
}

/**
 * Extract design intent from user message
 * This pre-processes the user's request to help the AI generate contextual content
 */
export function extractDesignIntent(userMessage: string): DesignIntent {
  const lowerMessage = userMessage.toLowerCase();

  // Detect language
  const italianKeywords = ['crea', 'tema', 'pagina', 'sito', 'per', 'con', 'stile', 'elegante', 'moderno'];
  const isItalian = italianKeywords.some(kw => lowerMessage.includes(kw));
  const language = isItalian ? 'it' : 'en';

  // Detect topic
  let topic = 'general';
  const topicKeywords: Record<string, string[]> = {
    wine: ['vino', 'wine', 'cantina', 'winery', 'enoteca', 'sommelier', 'vitigno'],
    restaurant: ['ristorante', 'restaurant', 'cucina', 'chef', 'menu', 'food', 'cibo', 'trattoria'],
    fitness: ['fitness', 'gym', 'palestra', 'workout', 'yoga', 'sport', 'wellness'],
    tech: ['tech', 'software', 'app', 'saas', 'startup', 'ai', 'tecnologia', 'tool'],
    fashion: ['moda', 'fashion', 'abbigliamento', 'luxury', 'brand'],
    portfolio: ['portfolio', 'designer', 'artista', 'creativo', 'personale'],
    coffee: ['caffe', 'coffee', 'cafe', 'bar', 'bakery'],
    travel: ['viaggio', 'travel', 'hotel', 'turismo', 'vacanza'],
    music: ['musica', 'music', 'band', 'dj', 'festival', 'concerto'],
    realestate: ['immobiliare', 'real estate', 'casa', 'appartamento', 'architettura'],
    medical: ['medico', 'medical', 'salute', 'healthcare', 'clinica'],
    education: ['educazione', 'education', 'corso', 'scuola', 'learning'],
    finance: ['finanza', 'finance', 'banca', 'investimenti', 'crypto'],
    nature: ['natura', 'nature', 'eco', 'green', 'sostenibile'],
  };

  for (const [topicName, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      topic = topicName;
      break;
    }
  }

  // Detect mood
  const moodKeywords: Record<string, string[]> = {
    elegante: ['elegante', 'elegant', 'raffinato', 'sofisticato', 'chic'],
    moderno: ['moderno', 'modern', 'contemporaneo', 'contemporary', 'minimal'],
    energico: ['energico', 'energetic', 'dinamico', 'bold', 'vivace'],
    lussuoso: ['lusso', 'luxury', 'premium', 'esclusivo', 'exclusive'],
    caldo: ['caldo', 'warm', 'accogliente', 'cozy', 'inviting'],
    fresco: ['fresco', 'fresh', 'clean', 'pulito', 'leggero'],
    professionale: ['professionale', 'professional', 'corporate', 'business'],
    creativo: ['creativo', 'creative', 'artistico', 'artistic'],
  };

  const detectedMoods: string[] = [];
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      detectedMoods.push(mood);
    }
  }

  // Get color palette based on topic
  const palette = getPalette(topic);
  const suggestedColors = palette ? {
    primary: palette.colors.primary,
    secondary: palette.colors.secondary,
    accent: palette.colors.accent,
    background: palette.colors.background,
    text: palette.colors.text,
  } : {
    // Default tech colors
    primary: '#6366F1',
    secondary: '#818CF8',
    accent: '#22D3EE',
    background: '#0D0D0D',
    text: '#FFFFFF',
  };

  const suggestedImages = palette?.suggestedImages || ['abstract', 'product', 'team'];

  return {
    topic,
    mood: detectedMoods.length > 0 ? detectedMoods : ['moderno'],
    suggestedColors,
    suggestedImages,
    language,
    palette,
  };
}

/**
 * Format design intent for AI prompt injection
 */
export function formatDesignIntentForPrompt(intent: DesignIntent): string {
  const paletteInfo = intent.palette ? formatPaletteForPrompt(intent.palette) : '';

  return `
═══════════════════════════════════════════════════════════════
DETECTED DESIGN INTENT - USE THIS FOR YOUR DESIGN
═══════════════════════════════════════════════════════════════

TOPIC: ${intent.topic.toUpperCase()}
MOOD: ${intent.mood.join(', ')}
LANGUAGE: ${intent.language === 'it' ? 'Italian' : 'English'}

${paletteInfo}

CONTENT GUIDELINES:
- Write headlines in ${intent.language === 'it' ? 'Italian' : 'English'}
- Use colors from the palette above
- Include imagery related to: ${intent.suggestedImages.join(', ')}
- Match the mood: ${intent.mood.join(', ')}

REMEMBER: Create UNIQUE, CONTEXTUAL content for "${intent.topic}"!
Do NOT use generic placeholder text.
`;
}

/**
 * Get enhanced design prompt with design intent injection
 * This is the main function for design mode that ensures contextual generation
 */
export interface DesignPromptOptions {
  userMessage: string;
  stylePresetId?: string;
  selectedPalette?: TopicPalette;
}

export function getDesignPromptWithIntent(userMessage: string, options?: { stylePresetId?: string; selectedPalette?: TopicPalette }): string {
  const intent = extractDesignIntent(userMessage);

  if (options?.selectedPalette) {
    intent.suggestedColors = options.selectedPalette.colors;
  }

  const colors = intent.suggestedColors;
  const lang = intent.language === 'it' ? 'Italian' : 'English';

  return `You are a world-class designer. Generate React + Tailwind code.

TOPIC: ${intent.topic.toUpperCase()}
LANGUAGE: ${lang} - ALL text content must be in ${lang}

COLORS:
- Background: ${colors.background}
- Primary: ${colors.primary}
- Accent: ${colors.accent}
- Text: ${colors.text}

OUTPUT FORMAT - Return ONLY a code block:
\`\`\`tsx
export default function Component() {
  return (
    // Your JSX here with Tailwind classes
  );
}
\`\`\`

RULES:
1. Use Tailwind CSS - NO inline styles
2. Use the colors above with bg-[${colors.background}], text-[${colors.text}], etc.
3. Content must be in ${lang} and specific to "${intent.topic}"
4. Create beautiful, production-ready UI
5. NO generic text like "Welcome", "Get Started", "Lorem ipsum"

${intent.topic === 'wine' ? 'Wine examples: "Scopri i Nostri Vini Pregiati", "Tradizione dal 1920"' : ''}
${intent.topic === 'restaurant' ? 'Restaurant examples: "Un Viaggio nei Sapori", "Cucina Autentica"' : ''}
${intent.topic === 'fitness' ? 'Fitness examples: "Trasforma il Tuo Corpo", "Allenati con Noi"' : ''}
${intent.topic === 'tech' ? 'Tech examples: "Soluzioni Innovative", "Automatizza il Business"' : ''}

Generate a complete, beautiful React component.`;
}

// Export types for external use
export type { StylePreset, ComponentBlock, ComponentCategory, TopicPalette };
