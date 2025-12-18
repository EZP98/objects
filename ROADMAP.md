# Design Editor

> Visual AI Builder = Figma + Bolt + Framer Motion

## Cosa Fa

Editor visuale che genera codice React + Tailwind tramite AI. L'utente modifica visualmente, l'AI scrive il codice.

```
┌─────────────────┐         ┌─────────────────┐
│  VISUAL EDITOR  │ ◄─ AI ─►│     CODICE      │
│  click, slider  │         │   React + TW    │
└─────────────────┘         └─────────────────┘
```

---

## Stack

| Layer | Tecnologia |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | TailwindCSS |
| Preview | WebContainers (Node.js nel browser) |
| AI | Claude API (streaming SSE) |
| Hosting | Cloudflare Pages + Workers |
| Auth | GitHub OAuth |

---

## Stato Attuale

### Fatto ✅

| Feature | File |
|---------|------|
| Canvas drag & drop | `DesignEditor.tsx` |
| Layers panel | `components/LayersPanel` |
| Properties/Style panel | `components/StylePanel` |
| Pages system | `DesignEditor.tsx` |
| File explorer | `components/FileExplorer.tsx` |
| Code panel (Monaco) | `components/CodePanel.tsx` |
| Responsive breakpoints | `DesignEditor.tsx` |
| AI Chat streaming | `components/AIChatPanel.tsx` |
| `<boltArtifact>` parser | `lib/artifactParser.ts` |
| WebContainers preview | `components/WebContainerPreview.tsx` |
| GitHub OAuth | `lib/hooks/useGit.ts` |
| Edit mode + selection | `components/EditablePreview/` |
| CSS → Tailwind mapping | `lib/prompts/system-prompt.ts` |

### Da Fare ❌

| Feature | Priorità |
|---------|----------|
| **StylePanel → AI → Code** | 🔴 |
| **Source mapping (DOM → riga codice)** | 🔴 |
| Component registration (tipo Plasmic) | 🟡 |
| Animation panel | 🟡 |
| Template library | 🟡 |
| Undo/Redo | 🟢 |
| Export ZIP | 🟢 |

---

## Prossimo Step: Visual → AI → Code

### Flusso Target

```
1. User clicca elemento nel preview
2. StylePanel mostra props
3. User cambia padding 12px → 24px
4. Click "Apply to Code"
5. AI riceve: "cambia padding a 24px nel componente Hero"
6. AI genera file aggiornato in <boltArtifact>
7. WebContainer scrive file
8. Hot Reload → preview aggiornata
```

### File da Modificare

```
src/components/StylePanel/StylePanel.tsx  → onApplyToCode()
src/lib/design-to-code/DesignToCodeEngine.ts → queueChange() → buildPrompt()
src/DesignEditor.tsx → collegare tutto
```

### Source Mapping

Problema: quando clicchi un div, come sai quale riga di codice modificare?

Soluzione: `data-objects-*` attributes

```tsx
<div data-objects-id="hero-1" data-objects-file="src/App.tsx" data-objects-line="42">
```

---

## Test

```bash
npm install -D @playwright/test
npx playwright install chromium
npx playwright test
```

Risultati attuali: 15/22 passati
- ✅ Artifact parser (7/7)
- ✅ Homepage (3/3)
- ⚠️ Editor page (timeout WebContainers)

---

## Progetti Correlati

### ALF Portfolio (`/Documents/alf/artist-portfolio`)

Backoffice CMS completo con 30+ pagine:
- CollectionManagement, MediaStorage, OrdersManagement
- Pattern: List → Detail → Form
- Auth, i18n, upload media

### Artemis Portfolio (`/Documents/artemis-portfolio`)

Prototipo `/back` con slider CSS:
- useState → preview live → output CSS/Tailwind
- Manca: connessione ad AI

---

## Riferimenti

- [bolt.diy](https://github.com/stackblitz-labs/bolt.diy) - AI code gen
- [Plasmic](https://github.com/plasmicapp/plasmic) - Visual builder
- [WebContainers](https://webcontainers.io/) - Node.js in browser
- [Framer Motion](https://motion.dev/) - Animazioni
