import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import Sidebar from '../components/Sidebar.tsx';
import ChatPanel from '../components/ChatPanel.tsx';
import FileTree from '../components/FileTree.tsx';

export default function Workspace() {
  const { project, setProject } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [skills, setSkills] = useState<Array<{ name: string; description: string; enabled: boolean }>>([]);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'conversations' | 'skills'>('files');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!project) {
      navigate('/project');
      return;
    }
    loadConversations();
    loadSkills();
  }, [project]);

  const loadConversations = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.list(project.id);
      setConversations(data.conversations);
    } catch {
      // Ignore
    }
  };

  const loadSkills = async () => {
    if (!project) return;
    try {
      const data = await api.skills.list(project.id);
      setSkills(data.skills);
    } catch {
      // Ignore
    }
  };

  const createConversation = async () => {
    if (!project) return;
    try {
      const data = await api.conversations.create(project.id);
      setConversations(prev => [{ ...data.conversation, updatedAt: new Date().toISOString() }, ...prev]);
      setActiveConversation(data.conversation.id);
    } catch {
      // Ignore
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.conversations.delete(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation === id) {
        setActiveConversation(null);
      }
    } catch {
      // Ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(200, Math.min(400, e.clientX));
    setSidebarWidth(newWidth);
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      const handleUp = () => setIsResizing(false);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('mousemove', handleSidebarResize);
      return () => {
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('mousemove', handleSidebarResize);
      };
    }
  }, [isResizing, handleSidebarResize]);

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div className="h-10 flex items-center justify-between px-4 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-text-bright font-bold text-sm">HipHopono</span>
          {project && (
            <span className="text-text-muted text-xs font-mono">
              {project.name} ({project.gitBranch})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs">{user?.username}</span>
          <button
            onClick={() => navigate('/setting')}
            className="text-text-muted hover:text-text text-xs"
          >
            Settings
          </button>
          <button
            onClick={() => navigate('/project')}
            className="text-text-muted hover:text-text text-xs"
          >
            Projects
          </button>
          <button
            onClick={handleLogout}
            className="text-text-muted hover:text-danger text-xs"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          width={sidebarWidth}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onCreateConversation={createConversation}
          onDeleteConversation={deleteConversation}
          skills={skills}
          onResizeStart={() => setIsResizing(true)}
        />

        {sidebarTab === 'files' && project && (
          <div
            className="border-r border-border overflow-y-auto bg-bg-secondary"
            style={{ width: sidebarWidth }}
          >
            <FileTree projectId={project.id} rootPath={project.absPath} />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {activeConversation ? (
            <ChatPanel
              conversationId={activeConversation}
              projectId={project?.id || ''}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-text-muted mb-4">No conversation selected</p>
                <button
                  onClick={createConversation}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors text-sm"
                >
                  New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
