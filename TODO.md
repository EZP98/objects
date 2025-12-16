# Design Editor - TODO & Feature Notes

## Completed
- [x] Git clone via isomorphic-git (like bolt.diy)
- [x] WebContainer integration for live preview
- [x] Responsive viewport controls (Desktop/Tablet/Mobile) with device frames
- [x] Code view with Monaco editor
- [x] File explorer for GitHub projects
- [x] Binary file handling (images, fonts)
- [x] AI Chat integration with Claude
- [x] Hide left sidebar when viewing GitHub project preview
- [x] Remove Live React Code panel from preview (use Code view instead)
- [x] Device frame indicator (shows current device + width)
- [x] Phone notch for mobile preview
- [x] Page/route discovery (auto-detect from Next.js, React Router, Astro, etc.)
- [x] Routes panel for GitHub projects (shows discovered pages)
- [x] Page navigation in preview (click route to navigate iframe)
- [x] Current route indicator in device frame

## In Progress / Known Issues
- [ ] **Images not loading in preview** - Binary files written but may have encoding issues
- [x] **Visual Edit Mode (v1)** - Click to select elements, show bounding box, resize handles
  - SelectionOverlay component
  - Element inspection via iframe
  - Properties panel shows selected element info
  - Toggle Edit button when preview ready
- [ ] **Source Mapping** - Babel plugin to inject data-source-file/line for DOM→code connection

## Future Features
- [ ] **Animation Discovery** - Auto-detect animations from code:
  - Framer Motion (`motion.div`, `variants`, `whileHover`, `animate`)
  - CSS animations (`@keyframes`, `animation`, `transition`)
  - GSAP (`gsap.to`, `gsap.from`, `ScrollTrigger`)
  - React Spring (`useSpring`, `animated`)
  - Show in Animations panel with preview
  - Click to jump to source code
  - Visual timeline editor for keyframes
- [ ] **Visual sitemap** - Show all pages as thumbnails
- [ ] **Multi-page editing** - Edit different pages without full reload
- [ ] **Export to GitHub** - Push changes back to repo
- [ ] **Collaborative editing** - Real-time collaboration
- [ ] **Version history** - Track changes over time
- [ ] **Custom components library** - Save and reuse components
- [ ] **Figma import** - Import designs from Figma
- [ ] **Framer Motion animations** - Visual animation editor

## Technical Debt
- [ ] Code splitting for smaller bundle size
- [ ] Better error handling for git operations
- [ ] Caching for cloned repos
- [ ] Offline support

## Notes
- WebContainer serves files from `/home/project`
- Binary files marked as `[binary file]` in files object but written directly by git clone
- Preview iframe runs on random port assigned by WebContainer
