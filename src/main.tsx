import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import DesignEditor from './DesignEditor'
import BoltEditor from './BoltEditor'
import ProjectsPage from './ProjectsPage'

const LAST_PATH_KEY = 'objects-last-path';

// Component to save current path (no auto-redirect)
function RouteTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Save current path when it changes (only for editor routes)
  useEffect(() => {
    if (location.pathname.startsWith('/editor')) {
      localStorage.setItem(LAST_PATH_KEY, location.pathname);
    }
  }, [location.pathname]);

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteTracker>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/bolt" element={<BoltEditor />} />
          <Route path="/editor" element={<DesignEditor />} />
          <Route path="/editor/:projectId" element={<DesignEditor />} />
        </Routes>
      </RouteTracker>
    </BrowserRouter>
  </StrictMode>,
)
