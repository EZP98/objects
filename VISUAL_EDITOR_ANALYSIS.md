# Visual Editor Pro - Analisi Competitiva e Roadmap

## Competitor Principale: Cursor Browser Visual Editor

**URL**: cursor.com/blog/browser-visual-editor

---

## Analisi UI di Cursor (Screenshots Dicembre 2024)

### Layout a 3 Pannelli

```
┌────────────────┬──────────────────────────┬─────────────────┐
│   CHAT/AI      │      LIVE PREVIEW        │   PROPERTIES    │
│                │                          │                 │
│ - Agent mode   │  - Sito reale renderiz.  │ - Components    │
│ - Comandi NL   │  - URL localhost:4001    │ - Design/CSS    │
│ - History      │  - Selezione elementi    │ - Position      │
│                │                          │ - Layout        │
│                │                          │ - Dimensions    │
│                │                          │ - Padding       │
│                │                          │ - Appearance    │
└────────────────┴──────────────────────────┴─────────────────┘
```

### Cosa Fa Bene Cursor

#### 1. Chat-Driven Editing
- Input testuale: `set border`, `change heading color to red`
- AI interpreta e applica le modifiche
- History delle chat/modifiche con tabs

#### 2. Component Tree
- Mostra gerarchia DOM con classi CSS
- Es: `div.text-left max-w-pro` → `small.type-ba` → `h1.type-lg text-balance mb-v1`
- Click per selezionare elemento nel preview

#### 3. Properties Panel Completo
```
┌─────────────────────────────┐
│ Components                  │
│ └─ div.text-left           │
│    └─ small.type-ba        │
│       └─ h1.type-lg        │
├─────────────────────────────┤
│ [Design] [CSS]              │  ← Tab Design/CSS
├─────────────────────────────┤
│ Position                    │
│ X: 650px  Y: 14px  Z: 0     │
│ Rotation: 0°                │
├─────────────────────────────┤
│ Layout                      │
│ Flow: [row] [col] [wrap]    │
├─────────────────────────────┤
│ Dimensions                  │
│ W: 84px  H: 27px            │
├─────────────────────────────┤
│ Alignment    Gap: 0px       │
├─────────────────────────────┤
│ Padding: 6px 11px           │
│ Margin: 0px                 │
│ ☑ Border box                │
├─────────────────────────────┤
│ Appearance                  │
│ Opacity: 100%               │
│ Corner Radius: 2px          │
├─────────────────────────────┤
│ Background                  │
│ Border                      │
│ Shadow & Blur               │
│   Layer Blur: 1.88px        │
└─────────────────────────────┘
```

#### 4. Typography Controls
- Font family selector (berkeleyMono)
- Weight: 400, size: 33.8px
- Line Height: 40.5px
- Letter Spacing: -0.675px
- Alignment buttons

#### 5. Gradient Editor
- Visual gradient bar con stops
- Stop position (0%, 100%)
- Color hex per ogni stop (#26251E, #BD4C4C)
- Rotation (90°)

#### 6. Undo/Apply System
- Counter "9 Edits"
- Bottoni [Undo] [Apply]
- Applica le modifiche al codice sorgente

---

## Gap Analysis: Noi vs Cursor

| Feature | Cursor | Noi | Status |
|---------|--------|-----|--------|
| Live Preview iframe | ✅ | ✅ | DONE |
| Element selection/hover | ✅ | ✅ | DONE |
| Chat-driven AI editing | ✅ | ❌ | TODO |
| Component tree | ✅ | ❌ | TODO |
| Design/CSS tabs | ✅ | ❌ | TODO |
| Position controls (X,Y,Z) | ✅ | ⚠️ Parziale | TODO |
| Layout flow controls | ✅ | ❌ | TODO |
| Padding/Margin controls | ✅ | ⚠️ Parziale | TODO |
| Border box toggle | ✅ | ❌ | TODO |
| Opacity slider | ✅ | ⚠️ Parziale | TODO |
| Corner radius | ✅ | ⚠️ Parziale | TODO |
| Gradient editor | ✅ | ❌ | TODO |
| Shadow & Blur controls | ✅ | ❌ | TODO |
| Undo/Apply system | ✅ | ❌ | TODO |
| Edit counter | ✅ | ❌ | TODO |
| Multiple chat tabs | ✅ | ❌ | TODO |
| GitHub integration | ❌ | ✅ | DONE |
| Auto-start projects | ❌ | ✅ | DONE |

---

## Cosa Dobbiamo Battere Assolutamente

### 1. Chat AI per Editing (PRIORITÀ MASSIMA)
```
User: "set border"
→ AI aggiunge border all'elemento selezionato
→ Preview si aggiorna live
→ Codice sorgente modificato
```

### 2. Component Tree (PRIORITÀ ALTA)
- Visualizza DOM gerarchico
- Classi CSS visibili
- Click = selezione

### 3. Properties Panel Avanzato (PRIORITÀ ALTA)
Sezioni necessarie:
- Position (X, Y, Z, Rotation)
- Layout (Flow direction)
- Dimensions (W, H)
- Spacing (Padding, Margin)
- Appearance (Opacity, Border Radius)
- Typography (Font, Size, Weight, Line Height, Letter Spacing)
- Colors (Background, Border, Text)
- Effects (Shadow, Blur)

### 4. Undo/Apply System (PRIORITÀ MEDIA)
- Traccia tutte le modifiche
- Counter visibile
- Undo singolo o multiplo
- Apply = scrive nel file sorgente

---

## Il Nostro Vantaggio Competitivo

### Features che Cursor NON ha:

1. **GitHub Integration Nativa**
   - Connetti account GitHub
   - Vedi tutti i tuoi repo
   - Clone automatico
   - (Cursor richiede progetto locale già esistente)

2. **Auto-Start Projects**
   - npm install automatico
   - npm run dev automatico
   - Rileva porta automaticamente
   - (Cursor richiede progetto già in running)

3. **Multi-Page Navigation** (TODO)
   - Vedi tutte le routes del progetto
   - Naviga tra pagine
   - Edit multi-pagina

4. **Cloudflare Storage** (TODO)
   - Progetti salvati in cloud
   - Accesso da qualsiasi device
   - No perdita dati localStorage

---

## Architettura Storage (Cloudflare)

```
┌─────────────────────────────────────────────────────────────┐
│                     DESIGN EDITOR                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React)                                           │
│       │                                                     │
│       ▼                                                     │
│  Backend Server (Node/Express)                              │
│       │                                                     │
│       ├─────────────────┬─────────────────┐                │
│       ▼                 ▼                 ▼                │
│  GitHub API      Cloudflare KV      Local Projects        │
│  (OAuth/Repos)   (User Data)        (~/.design-editor)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cloudflare KV Schema
```json
{
  "users/{github_id}": {
    "id": "github_user_id",
    "username": "eziopappalardo",
    "email": "...",
    "created_at": "...",
    "settings": {...}
  },
  "projects/{user_id}/{project_id}": {
    "id": "project_123",
    "name": "My Portfolio",
    "github_repo": "user/repo",
    "local_path": "/Users/.../projects/repo",
    "last_opened": "...",
    "edits_history": [...]
  }
}
```

---

## Flow Utente Ideale

```
1. HOMEPAGE
   └─> "Connetti GitHub" (OAuth)

2. DASHBOARD
   └─> Vedi tutti i tuoi repo GitHub
   └─> Vedi progetti già clonati

3. CLICK SU REPO
   └─> Clone automatico (se nuovo)
   └─> npm install (se necessario)
   └─> npm run dev
   └─> Loading screen con progress

4. EDITOR
   └─> Sito renderizzato in iframe
   └─> Click su elemento = selezione
   └─> Properties panel mostra CSS
   └─> Chat AI per modifiche
   └─> Modifiche applicate al codice sorgente

5. SAVE
   └─> Git commit automatico
   └─> Push opzionale
```

---

## Roadmap Prioritaria

### Sprint 1: Properties Panel Avanzato
- [ ] Component tree con gerarchia DOM
- [ ] Tab Design/CSS
- [ ] Position controls completi
- [ ] Layout flow controls
- [ ] Padding/Margin editor
- [ ] Border radius slider
- [ ] Opacity slider

### Sprint 2: Chat AI Editing
- [ ] Input chat nel pannello sinistro
- [ ] Integrazione Claude API
- [ ] Comandi: "change color", "add border", "make bigger"
- [ ] History modifiche

### Sprint 3: Undo/Apply System
- [ ] Track di tutte le modifiche
- [ ] Counter "N Edits"
- [ ] Undo singolo/multiplo
- [ ] Apply = modifica file sorgente

### Sprint 4: Cloudflare Storage
- [ ] Setup Cloudflare KV
- [ ] API per user data
- [ ] Sync progetti tra devices
- [ ] Backup automatico

### Sprint 5: Polish & Launch
- [ ] Gradient editor
- [ ] Shadow/Blur controls
- [ ] Typography avanzata
- [ ] Responsive preview
- [ ] Performance optimization

---

## Note Tecniche

### Modifica Codice Sorgente
Per applicare le modifiche CSS al codice:
1. Parse del file sorgente (Babel AST)
2. Trova il componente/elemento
3. Modifica style/className
4. Rigenera il codice
5. Scrivi il file
6. Hot reload automatico

### Cloudflare Workers per API
```javascript
// workers/api.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/user') {
      const userId = // from JWT
      const user = await env.KV.get(`users/${userId}`);
      return new Response(user);
    }
  }
}
```

---

## Riferimenti

- [Cursor Blog: Browser Visual Editor](https://cursor.com/blog/browser-visual-editor)
- [Figma Dev Mode](https://www.figma.com/dev-mode/)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)
- [Cloudflare Workers](https://workers.cloudflare.com/)

---

*Documento creato: Dicembre 2024*
*Ultimo aggiornamento: 15 Dicembre 2024*
*Versione: 2.0 - Post analisi competitor*
