import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Tipi
interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  cloneUrl: string;
  htmlUrl: string;
  updatedAt: string;
  language: string | null;
  homepage: string | null;
}

interface LocalProject {
  name: string;
  path: string;
  description: string;
}

// Re-export per DesignEditor
export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  type: 'react';
}

export const getProjectById = (id: string): Project | undefined => {
  const projects = JSON.parse(localStorage.getItem('design-editor-projects') || '[]');
  return projects.find((p: Project) => p.id === id);
};

// Use production Worker API or local dev server
const API_URL = import.meta.env.PROD
  ? 'https://design-editor-api.eziopappalardo98.workers.dev'
  : 'http://localhost:3333';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [githubUser, setGithubUser] = useState<string | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloning, setCloning] = useState<string | null>(null);
  const [cloneLogs, setCloneLogs] = useState<string[]>([]);

  // Check GitHub connection on mount
  useEffect(() => {
    // Check URL params for GitHub callback
    const githubConnected = searchParams.get('github_connected');
    const user = searchParams.get('github_user');
    const error = searchParams.get('github_error');

    if (githubConnected && user) {
      setGithubUser(user);
      localStorage.setItem('github_user', user);
      // Clean URL
      window.history.replaceState({}, '', '/');
      fetchRepos(user);
    } else if (error) {
      console.error('GitHub error:', error);
      window.history.replaceState({}, '', '/');
    } else {
      // Check localStorage for existing session
      const savedUser = localStorage.getItem('github_user');
      if (savedUser) {
        setGithubUser(savedUser);
        fetchRepos(savedUser);
      }
    }

    // Load local projects
    fetchLocalProjects();
  }, [searchParams]);

  const fetchRepos = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/github/repos?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      } else if (res.status === 401) {
        // Token expired, clear session
        setGithubUser(null);
        localStorage.removeItem('github_user');
      }
    } catch (err) {
      console.error('Error fetching repos:', err);
    }
    setLoading(false);
  };

  const fetchLocalProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/local`);
      if (res.ok) {
        const data = await res.json();
        setLocalProjects(data);
      }
    } catch (err) {
      console.error('Error fetching local projects:', err);
    }
  };

  const connectGitHub = async () => {
    try {
      const res = await fetch(`${API_URL}/api/github/auth`);
      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.error) {
        alert(data.help || data.error);
      }
    } catch (err) {
      console.error('Error starting GitHub auth:', err);
    }
  };

  const disconnectGitHub = async () => {
    try {
      await fetch(`${API_URL}/api/github/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: githubUser }),
      });
    } catch {}
    setGithubUser(null);
    setRepos([]);
    localStorage.removeItem('github_user');
  };

  const openProject = (project: LocalProject) => {
    // Save to localStorage for DesignEditor to pick up
    const projects = JSON.parse(localStorage.getItem('design-editor-projects') || '[]');
    const existingIndex = projects.findIndex((p: Project) => p.path === project.path);

    const projectData: Project = {
      id: project.name.toLowerCase().replace(/\s+/g, '-'),
      name: project.name,
      description: project.description,
      path: project.path,
      type: 'react',
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = projectData;
    } else {
      projects.unshift(projectData);
    }

    localStorage.setItem('design-editor-projects', JSON.stringify(projects));
    navigate(`/editor/${projectData.id}`);
  };

  const openRepo = (repo: GitHubRepo) => {
    // Save repo info to localStorage for the editor
    const repoData = {
      id: repo.name,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description || '',
      type: 'github',
      owner: repo.fullName.split('/')[0],
      userId: githubUser,
      homepage: repo.homepage || null,
    };
    localStorage.setItem('current-github-repo', JSON.stringify(repoData));

    // Navigate to editor
    navigate(`/editor/${repo.name}`);
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            Design Editor
          </span>
        </div>

        {/* GitHub Connection */}
        {githubUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{githubUser}</span>
            </div>
            <button
              onClick={disconnectGitHub}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Disconnetti
            </button>
          </div>
        ) : (
          <button
            onClick={connectGitHub}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: '#fff',
              border: 'none',
              borderRadius: 10,
              color: '#0a0a0a',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Connetti GitHub
          </button>
        )}
      </header>

      <main style={{ padding: '48px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Hero */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <h1 style={{
              color: '#fff',
              fontSize: 36,
              fontWeight: 600,
              marginBottom: 12,
              letterSpacing: '-0.03em',
            }}>
              I tuoi progetti
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 16,
              maxWidth: 500,
              margin: '0 auto 24px',
            }}>
              {githubUser
                ? 'Seleziona un repository o crea un nuovo progetto'
                : 'Crea un nuovo progetto o connetti GitHub'
              }
            </p>
            {/* New Project Button */}
            <button
              onClick={() => navigate('/editor/new')}
              style={{
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(139, 92, 246, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuovo Progetto
            </button>
          </div>

          {/* Local Projects */}
          {localProjects.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <h2 style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Progetti Locali
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {localProjects.map(project => (
                  <div
                    key={project.path}
                    onClick={() => openProject(project)}
                    style={{
                      padding: 20,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <path d="M3 3h18v18H3z" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                      </div>
                      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>{project.name}</h3>
                    </div>
                    {project.description && (
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>
                        {project.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Repos */}
          {githubUser && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <h2 style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Repository GitHub
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  width: 280,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cerca repository..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px',
                  }} />
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>Caricamento repository...</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}>
                  {filteredRepos.map(repo => (
                    <div
                      key={repo.id}
                      onClick={() => openRepo(repo)}
                      style={{
                        padding: 20,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                    >
                      {/* Cloning overlay */}
                      {cloning === repo.name && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(10,10,10,0.8)',
                          borderRadius: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 12,
                        }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            border: '3px solid rgba(255,255,255,0.1)',
                            borderTopColor: '#3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                          }} />
                          <span style={{ color: '#fff', fontSize: 13 }}>Cloning...</span>
                          {cloneLogs.length > 0 && (
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                              {cloneLogs[cloneLogs.length - 1]?.slice(0, 50)}
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}>
                        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>{repo.name}</h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {repo.private && (
                            <span style={{
                              padding: '3px 8px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: 6,
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: 10,
                              fontWeight: 500,
                            }}>
                              PRIVATE
                            </span>
                          )}
                          {repo.language && (
                            <span style={{
                              padding: '3px 8px',
                              background: 'rgba(139, 92, 246, 0.2)',
                              borderRadius: 6,
                              color: '#a78bfa',
                              fontSize: 10,
                              fontWeight: 500,
                            }}>
                              {repo.language}
                            </span>
                          )}
                        </div>
                      </div>
                      {repo.description && (
                        <p style={{
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          marginBottom: 12,
                        }}>
                          {repo.description.slice(0, 100)}{repo.description.length > 100 ? '...' : ''}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 11,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {new Date(repo.updatedAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!githubUser && localProjects.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 16,
              border: '1px dashed rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                Connetti GitHub per iniziare
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>
                Importa i tuoi progetti React direttamente da GitHub
              </p>
              <button
                onClick={connectGitHub}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  background: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  color: '#0a0a0a',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Connetti GitHub
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProjectsPage;
