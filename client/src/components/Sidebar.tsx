interface SidebarProps {
  width: number;
  activeTab: 'files' | 'conversations' | 'skills';
  onTabChange: (tab: 'files' | 'conversations' | 'skills') => void;
  conversations: Array<{ id: string; title: string; updatedAt: string }>;
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  skills: Array<{ name: string; description: string; enabled: boolean }>;
  onResizeStart: () => void;
}

export default function Sidebar({
  width,
  activeTab,
  onTabChange,
  conversations,
  activeConversation,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  skills,
  onResizeStart,
}: SidebarProps) {
  return (
    <div className="flex flex-col bg-bg-secondary border-r border-border" style={{ width }}>
      <div className="flex border-b border-border">
        <button
          onClick={() => onTabChange('files')}
          className={`flex-1 py-2 text-xs font-medium ${
            activeTab === 'files'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => onTabChange('conversations')}
          className={`flex-1 py-2 text-xs font-medium ${
            activeTab === 'conversations'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => onTabChange('skills')}
          className={`flex-1 py-2 text-xs font-medium ${
            activeTab === 'skills'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Skills
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'conversations' && (
          <div className="p-2">
            <button
              onClick={onCreateConversation}
              className="w-full mb-2 px-3 py-2 bg-bg-tertiary hover:bg-border text-text text-sm rounded transition-colors"
            >
              + New Conversation
            </button>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm ${
                    activeConversation === conv.id
                      ? 'bg-accent/20 text-accent'
                      : 'text-text hover:bg-bg-tertiary'
                  }`}
                >
                  <span className="truncate">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="p-2">
            {skills.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No skills found</p>
            ) : (
              <div className="space-y-1">
                {skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="px-3 py-2 bg-bg-tertiary rounded text-sm"
                  >
                    <div className="text-text font-medium">{skill.name}</div>
                    <div className="text-text-muted text-xs mt-1">{skill.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="w-1 cursor-col-resize hover:bg-accent transition-colors"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}
