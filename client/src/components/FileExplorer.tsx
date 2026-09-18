import { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';

interface DirEntry {
  name: string;
  path: string;
}

interface FileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function FileExplorer({ isOpen, onClose, onSelect }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [directories, setDirectories] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      browse('');
    }
  }, [isOpen]);

  const browse = async (path?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fs.browse(path || undefined);
      setCurrentPath(data.path);
      setDirectories(data.directories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const goUp = () => {
    const parts = currentPath.replace(/\\/g, '/').split('/');
    parts.pop();
    const parent = parts.join('/') || '/';
    browse(parent);
  };

  const handleSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bg-primary border border-border rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-text font-medium">Open Project</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded hover:bg-bg-tertiary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-2">
            <button
              onClick={goUp}
              disabled={loading || !currentPath}
              className="p-1.5 text-text-muted hover:text-text rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              title="Go to parent directory"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className="flex-1 px-2 py-1 bg-bg-primary border border-border rounded text-text text-sm font-mono truncate">
              {currentPath || '/'}
            </div>
            <button
              onClick={() => browse(currentPath)}
              disabled={loading}
              className="p-1.5 text-text-muted hover:text-text rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
            {error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-muted text-sm">
              Loading...
            </div>
          ) : directories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              No directories found
            </div>
          ) : (
            <div className="py-1">
              {directories.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => browse(dir.path)}
                  className="w-full text-left px-4 py-2.5 hover:bg-bg-tertiary text-text text-sm flex items-center gap-3 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                  </svg>
                  <span className="truncate">{dir.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text bg-bg-tertiary hover:bg-border rounded transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSelect(currentPath)}
            disabled={loading || !currentPath}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors disabled:opacity-50 text-sm"
          >
            Open This Folder
          </button>
        </div>
      </div>
    </div>
  );
}
