import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import DesignEditor from './DesignEditor'
import ProjectsPage from './ProjectsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/editor" element={<DesignEditor />} />
        <Route path="/editor/:projectId" element={<DesignEditor />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
