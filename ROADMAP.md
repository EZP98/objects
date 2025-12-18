# Design Editor - Roadmap & Ideas

> Un Visual AI Builder che combina Figma + Bolt + Framer Motion

---

## Vision

Costruire un editor visuale che unisce:
- **Cursor Browser Visual Editor** → drag-and-drop, point-and-prompt
- **Bolt/Lovable** → AI code generation
- **Framer Motion/GSAP** → libreria animazioni
- **Timeline Panel** → controllo visuale delle animazioni

---

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                     DESIGN EDITOR                           │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ VISUAL CANVAS │  │  AI CHAT/     │  │  ANIMATION     │  │
│  │ (Drag&Drop)   │  │  PROMPT       │  │  TIMELINE      │  │
│  │               │  │               │  │  PANEL         │  │
│  └───────────────┘  └───────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    TEMPLATE LIBRARY                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Hero    │ │ Cards   │ │ Scroll  │ │ Parallax│          │
│  │ Sections│ │ Stack   │ │ Reveal  │ │ Effects │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    ANIMATION ENGINE                         │
│  Motion (Framer Motion) / GSAP / CSS Animations            │
├─────────────────────────────────────────────────────────────┤
│                    CODE OUTPUT                              │
│  React + TailwindCSS + Motion                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Risorse Open Source

### Editor Visuali (tipo Figma)

| Progetto | Link | Note |
|----------|------|------|
| **Penpot** | [penpot/penpot](https://github.com/penpot/penpot) | Il migliore, SVG/CSS/HTML nativo, Clojure |
| **Plasmic** | [plasmicapp/plasmic](https://github.com/plasmicapp/plasmic) | Visual builder per React, TypeScript |
| **GrapesJS** | [GrapesJS/grapesjs](https://github.com/GrapesJS/grapesjs) | Page builder drag-and-drop |
| **OpenChakra** | [premieroctet/openchakra](https://github.com/premieroctet/openchakra) | Visual editor per Chakra UI |
| **Quant-UX** | [KlausSchaefers/quant-ux](https://github.com/KlausSchaefers/quant-ux) | Prototyping + testing |

### AI Code Generation (tipo Bolt)

| Progetto | Link | Note |
|----------|------|------|
| **bolt.diy** | [stackblitz-labs/bolt.diy](https://github.com/stackblitz-labs/bolt.diy) | Versione ufficiale open source, WebContainers |
| **Dyad** | [dyad-sh/dyad](https://github.com/dyad-sh/dyad) | App builder locale, alternativa a v0/Lovable |
| **Adorable** | [freestyle-sh/Adorable](https://github.com/freestyle-sh/Adorable) | Open Source Lovable |
| **open-lovable** | [firecrawl/open-lovable](https://github.com/firecrawl/open-lovable) | Clona siti → React |
| **v0.diy** | [SujalXplores/v0.diy](https://github.com/SujalXplores/v0.diy) | Clone di v0 con streaming |

### Animation Libraries

| Progetto | Link | Note |
|----------|------|------|
| **Motion** | [framer/motion](https://github.com/framer/motion) | MIT, React-first, 12M+ downloads |
| **GSAP** | gsap.com | Timeline potente (licenza restrittiva) |
| **AutoAnimate** | [formkit/auto-animate](https://github.com/formkit/auto-animate) | Animazioni automatiche |
| **React Spring** | [pmndrs/react-spring](https://github.com/pmndrs/react-spring) | Physics-based animations |

### Timeline Editor per Animazioni

| Progetto | Link | Note |
|----------|------|------|
| **gsap-visual-timeline-editor** | [tengweiherr/gsap-visual-timeline-editor](https://github.com/tengweiherr/gsap-visual-timeline-editor) | Timeline visuale per GSAP |
| **Aphalina Animator** | [aphalina.com](https://aphalina.com/) | Genera GSAP code |
| **Theatre.js** | [theatre-js/theatre](https://github.com/theatre-js/theatre) | Animation editor per Three.js/React |

### Low-Code Builders

| Progetto | Link | Note |
|----------|------|------|
| **Builder.io** | [BuilderIO/builder](https://github.com/BuilderIO/builder) | Headless CMS + visual |
| **ToolJet** | [ToolJet/ToolJet](https://github.com/ToolJet/ToolJet) | App builder con AI |
| **Appsmith** | [appsmithorg/appsmith](https://github.com/appsmithorg/appsmith) | Internal tools |
| **NocoBase** | [nocobase/nocobase](https://github.com/nocobase/nocobase) | No-code con plugin |

---

## Animation Panel Design

```
┌─────────────────────────────────────────────────────────────┐
│  ANIMATION TIMELINE PANEL                                   │
├─────────────────────────────────────────────────────────────┤
│  Element: Hero Title                                        │
│  ├── Trigger: [onScroll ▼] at [50%] viewport               │
│  ├── Animation: [fadeInUp ▼]                               │
│  ├── Duration: [0.8s] ════════●══════                      │
│  ├── Delay: [0.2s]                                         │
│  └── Easing: [easeOut ▼]                                   │
├─────────────────────────────────────────────────────────────┤
│  TIMELINE VIEW                                              │
│  0s      0.5s      1s       1.5s      2s                   │
│  ├────────┼────────┼────────┼────────┤                     │
│  │████████│        │        │        │  Hero Title         │
│  │        │███████████      │        │  Subtitle           │
│  │        │        │████████████████ │  CTA Button         │
│  │        │        │        │████████│  Image              │
├─────────────────────────────────────────────────────────────┤
│  SCROLL MARKERS                                             │
│  [+] Add trigger point                                      │
│  • 0% - Page load                                          │
│  • 30% - Hero exits                                        │
│  • 50% - Features section                                  │
│  • 80% - Footer reveal                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Animation Presets "AI Aesthetic"

| Effetto | Descrizione | Codice Motion |
|---------|-------------|---------------|
| **Fade In Up** | Elemento appare dal basso | `initial={{opacity:0, y:50}} animate={{opacity:1, y:0}}` |
| **Stagger Children** | Elementi figli appaiono in sequenza | `staggerChildren: 0.1` |
| **Scroll Reveal** | Appare quando entra nel viewport | `whileInView={{opacity:1}}` |
| **Parallax** | Movimento diverso basato su scroll | `useScroll() + useTransform()` |
| **Card Stack** | Cards che si impilano | Custom con `useScroll` |
| **Text Split** | Lettere che appaiono una alla volta | `splitText()` |
| **Magnetic Cursor** | Elementi che seguono il mouse | Motion+ components |
| **Horizontal Scroll** | Sezione che scrolla orizzontalmente | `useScroll({container})` |
| **Morph** | Transizione shape-to-shape | `layout` prop |
| **Blur In** | Appare con blur che si dissolve | `filter: blur()` animation |

---

## Killer Features Ideas

### 1. Animation Presets from URL
L'utente incolla un URL (es. stripe.com) e l'AI:
1. Analizza le animazioni presenti
2. Le replica nel tuo editor
3. Le rende customizzabili

### 2. Point and Animate
- Click su elemento nel canvas
- Descrivi l'animazione a voce/testo
- L'AI genera il codice Motion

### 3. Animation Templates Gallery
- Libreria di effetti pronti all'uso
- Categorie: Hero, Cards, Scroll, Hover, Loading
- Preview live + one-click apply

### 4. Responsive Animation
- Animazioni diverse per breakpoint
- Mobile-first animation design
- Reduced motion support automatico

### 5. Performance Analyzer
- Analizza le animazioni per performance
- Suggerisce ottimizzazioni
- GPU vs CPU animation tips

### 6. Export Options
- React + Motion
- Vue + Motion
- Vanilla JS + CSS
- React Native (Motion)

---

## Tech Stack Attuale

```
Frontend:
├── React 18 + TypeScript
├── Vite
├── TailwindCSS (in progress)
├── @webcontainer/api (Node.js nel browser)
└── Cloudflare Pages

Backend:
├── Cloudflare Workers
├── Anthropic Claude API (streaming)
└── KV Storage (auth tokens)

Integrations:
├── GitHub OAuth
├── StackBlitz embed (fallback)
└── WebContainers (primary preview)
```

---

## Roadmap

### Fase 1: Core Editor ✅
- [x] Canvas con elementi drag & drop
- [x] Layers panel con gerarchia
- [x] Properties panel per styling
- [x] Pages system multi-pagina
- [x] File explorer con tree view
- [x] Code panel Monaco-style
- [x] Responsive breakpoints (Desktop/Tablet/Phone)
- [x] Zoom e pan controls

### Fase 2: AI Integration ✅
- [x] AI Chat panel stile Bolt
- [x] Streaming responses SSE
- [x] Code generation con Claude Sonnet
- [x] System prompt ottimizzato per React + Tailwind
- [x] Estrazione automatica codice da response

### Fase 3: Preview System ✅
- [x] WebContainers API integration
- [x] StackBlitz fallback per GitHub repos
- [x] Auto-start preview
- [x] Vite + React + Tailwind template
- [x] Hot reload del codice generato

### Fase 4: GitHub Integration ✅
- [x] OAuth flow
- [x] Repository browser
- [x] File tree loading
- [x] File content fetching
- [ ] Commit changes back to repo
- [ ] Branch management

### Fase 4.5: Visual Editing System ✅ (NEW)
- [x] Editable Runtime (EditableProvider, Editable wrapper)
- [x] PreviewManager component (postMessage bridge)
- [x] PropsPanel component (visual property editor)
- [x] Edit Mode toggle
- [x] Element selection via click
- [x] Live props update via postMessage
- [x] `createEditableViteProject()` - inline runtime template
- [x] Protocollo messaggi: `objects:enable-edit-mode`, `objects:selected`, `objects:hover`, `objects:update-props`

**Architettura Visual Editing:**
```
┌─────────────────────────────────────────────────────────────┐
│                      DesignEditor                            │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │  PreviewManager  │◄──►│  WebContainer iframe        │    │
│  │  (overlay mode)  │    │  ┌─────────────────────────┐│    │
│  │                  │    │  │  editable-runtime.js    ││    │
│  │ - sends enable   │    │  │  ├─ EditableProvider    ││    │
│  │ - receives       │    │  │  └─ Editable wrappers   ││    │
│  │   selected/hover │    │  └─────────────────────────┘│    │
│  └──────────────────┘    └─────────────────────────────┘    │
│            │                                                  │
│            ▼                                                  │
│  ┌──────────────────┐                                        │
│  │    PropsPanel    │ Shows when element selected            │
│  │  - title         │ User edits -> sends update-props       │
│  │  - subtitle      │ Preview re-renders live                │
│  │  - buttonText    │                                        │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

**File Chiave:**
- `src/lib/webcontainer.ts` -> `createEditableViteProject()`
- `src/components/EditablePreview/PreviewManager.tsx`
- `src/components/EditablePreview/PropsPanel.tsx`
- `src/DesignEditor.tsx` -> integrazione completa

### Fase 5: Point-and-Prompt AI (Next)
- [ ] AI modifica codice basato su selezione elemento
- [ ] Streaming AI response
- [ ] Parser per `<objects-file>` tags
- [ ] Persistenza modifiche nel codice sorgente
- [ ] Context-aware prompts (elemento selezionato)

### Fase 7: Animation System
- [ ] Motion library integration
- [ ] Animation panel UI
- [ ] Timeline editor
- [ ] Preset library (fadeIn, slideUp, etc.)
- [ ] Scroll triggers con useInView

### Fase 8: Template Library
- [ ] Hero sections (5+ variants)
- [ ] Feature sections
- [ ] Card layouts
- [ ] Navigation components
- [ ] Footer templates
- [ ] Full page templates

### Fase 9: Polish & Launch
- [ ] Onboarding flow
- [ ] Keyboard shortcuts
- [ ] Undo/Redo system
- [ ] Export to ZIP
- [ ] Deploy to Vercel/Netlify
- [ ] Documentation

### Fase 10: Advanced Features (Future)
- [ ] Real-time collaboration
- [ ] Version history
- [ ] Custom components library
- [ ] Plugin system
- [ ] Figma import

---

## References

- [Framer Motion Docs](https://motion.dev/)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Theatre.js](https://www.theatrejs.com/)
- [bolt.diy Source](https://github.com/stackblitz-labs/bolt.diy)
- [WebContainers API](https://webcontainers.io/)

---

## Notes

- WebContainers richiede headers COOP/COEP per funzionare
- Motion è MIT licensed, GSAP ha licenza restrittiva per SaaS
- Considerare Theatre.js per timeline editor avanzato
- Penpot usa Clojure, difficile da integrare direttamente
