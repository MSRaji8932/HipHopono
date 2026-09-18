import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { api } from '../lib/api.ts';

interface Project {
  id: string;
  name: string;
  absPath: string;
  gitBranch: string;
  lastUsedAt: string;
}

interface DirEntry {
  name: string;
  path: string;
}

export default function ProjectPicker() {
  const { user, logout } = useAuth();
  const { setProject } = useProject();
  const navigate = useNavigate();

  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [browsePath, setBrowsePath] = useState('');
  const [directories, setDirectories] = useState<DirEntry[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const data = await api.project.recent();
      setRecentProjects(data.projects);
      if (data.projects.length > 0) {
        const lastProject = data.projects[0];
        setBrowsePath(lastProject.absPath);
      }
    } catch {
      // Ignore
    }
  };

  const browse = async (path?: string) => {
    setBrowseLoading(true);
    setError('');
    try {
      const data = await api.fs.browse(path);
      setBrowsePath(data.path);
      setDirectories(data.directories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBrowseLoading(false);
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

  const openCustomPath = async () => {
    if (customPath.trim()) {
      await openProject(customPath.trim());
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-bg">
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
          <h2 className="text-sm font-medium text-text-muted mb-2">Open by path</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && openCustomPath()}
            />
            <button
              onClick={openCustomPath}
              disabled={loading || !customPath.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Opening...' : 'Open'}
            </button>
          </div>
        </div>

        {recentProjects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-text-muted mb-2">Recent projects</h2>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => openProject(project.absPath)}
                  className="w-full text-left p-3 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded transition-colors"
                  disabled={loading}
                >
                  <div className="text-text font-medium">{project.name}</div>
                  <div className="text-text-muted text-xs font-mono">{project.absPath}</div>
                  <div className="text-text-muted text-xs mt-1">branch: {project.gitBranch}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-text-muted mb-2">Browse server</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={browsePath}
              onChange={(e) => setBrowsePath(e.target.value)}
              placeholder="Browse path..."
              className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && browse(browsePath)}
            />
            <button
              onClick={() => browse(browsePath)}
              disabled={browseLoading}
              className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors disabled:opacity-50"
            >
              {browseLoading ? '...' : 'Browse'}
            </button>
          </div>

          {directories.length > 0 && (
            <div className="max-h-64 overflow-y-auto border border-border rounded bg-bg-secondary">
              {directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => openProject(dir.path)}
                  className="w-full text-left px-3 py-2 hover:bg-bg-tertiary text-text text-sm font-mono border-b border-border/50 last:border-0"
                  disabled={loading}
                >
                  📁 {dir.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
