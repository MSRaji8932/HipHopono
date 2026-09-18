import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { api } from '../lib/api.ts';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';
import { FileExplorer } from '../components/FileExplorer.tsx';

interface Project {
  id: string;
  name: string;
  absPath: string;
  gitBranch: string;
  lastUsedAt: string;
}

export default function ProjectPicker() {
  const { user, logout } = useAuth();
  const { setProject } = useProject();
  const navigate = useNavigate();

  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const data = await api.project.recent();
      setRecentProjects(data.projects);
    } catch {
      // Ignore
    }
  };

  const openProject = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.project.open(path);
      setProject(data.project);
      navigate('/workspace');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const editProject = async (project: Project) => {
    const newName = prompt('Edit project name:', project.name);
    if (newName !== null && newName.trim() !== '' && newName !== project.name) {
      try {
        await api.project.rename(project.id, newName.trim());
        setRecentProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, name: newName.trim() } : p))
        );
      } catch (err) {
        setError((err as Error).message);
      }
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Remove "${project.name}" from recent projects?`)) return;
    try {
      await api.project.remove(project.id);
      setRecentProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-2xl p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-bright">HipHopono</h1>
            <p className="text-text-muted text-sm">Open a project to get started</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm">{user?.username}</span>
            <button
              onClick={() => navigate('/setting')}
              className="text-text-muted hover:text-text text-sm"
            >
              Settings
            </button>
            <button
              onClick={logout}
              className="text-text-muted hover:text-danger text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setFileExplorerOpen(true)}
            disabled={loading}
            className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors disabled:opacity-50"
          >
            Browse & Open Project
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-text-muted mb-2">Recent projects</h2>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 p-3 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded transition-colors group"
                >
                  <button
                    onClick={() => openProject(project.absPath)}
                    className="flex-1 text-left"
                    disabled={loading}
                  >
                    <div className="text-text font-medium">{project.name}</div>
                    <div className="text-text-muted text-xs font-mono">{project.absPath}</div>
                    <div className="text-text-muted text-xs mt-1">branch: {project.gitBranch}</div>
                  </button>
                  <button
                    onClick={() => editProject(project)}
                    className="p-2 text-text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-tertiary"
                    title="Edit project"
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button
                    onClick={() => deleteProject(project)}
                    className="p-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-bg-tertiary"
                    title="Remove from recent"
                    disabled={loading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      <FileExplorer
        isOpen={fileExplorerOpen}
        onClose={() => setFileExplorerOpen(false)}
        onSelect={openProject}
      />
    </div>
  );
}
