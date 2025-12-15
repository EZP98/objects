// Project Storage - Salva i progetti in localStorage

export interface StoredProject {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  lastModified: string;
  type: 'react' | 'html' | 'design';
  path?: string; // Percorso su disco
}

const STORAGE_KEY = 'design-editor-projects';

// Progetti di esempio (solo design, senza path)
const defaultProjects: StoredProject[] = [
  {
    id: 'landing-page',
    name: 'Landing Page Template',
    description: 'Template per landing page con hero, features e CTA',
    lastModified: new Date().toISOString().split('T')[0],
    type: 'design',
  },
];

// Ottieni tutti i progetti
export function getProjects(): StoredProject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading projects from localStorage:', e);
  }

  // Prima volta: salva i progetti di default
  saveProjects(defaultProjects);
  return defaultProjects;
}

// Salva tutti i progetti
export function saveProjects(projects: StoredProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving projects to localStorage:', e);
  }
}

// Ottieni un singolo progetto per ID
export function getProjectById(id: string): StoredProject | undefined {
  const projects = getProjects();
  return projects.find(p => p.id === id);
}

// Aggiungi un nuovo progetto
export function addProject(project: Omit<StoredProject, 'id' | 'lastModified'>): StoredProject {
  const projects = getProjects();

  const newProject: StoredProject = {
    ...project,
    id: `project-${Date.now()}`,
    lastModified: new Date().toISOString().split('T')[0],
  };

  projects.unshift(newProject); // Aggiungi all'inizio
  saveProjects(projects);

  return newProject;
}

// Aggiorna un progetto esistente
export function updateProject(id: string, updates: Partial<StoredProject>): StoredProject | undefined {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);

  if (index === -1) return undefined;

  projects[index] = {
    ...projects[index],
    ...updates,
    lastModified: new Date().toISOString().split('T')[0],
  };

  saveProjects(projects);
  return projects[index];
}

// Elimina un progetto
export function deleteProject(id: string): boolean {
  const projects = getProjects();
  const filtered = projects.filter(p => p.id !== id);

  if (filtered.length === projects.length) return false;

  saveProjects(filtered);
  return true;
}

// Importa un progetto React da una cartella
export function importReactProject(path: string, name?: string): StoredProject {
  // Estrai il nome dalla cartella se non fornito
  const folderName = path.split('/').pop() || 'Progetto';

  return addProject({
    name: name || folderName,
    description: `Progetto React importato da ${path}`,
    type: 'react',
    path: path,
  });
}
