import { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface FileTreeProps {
  projectId: string;
  rootPath: string;
}

function TreeItem({
  node,
  projectId,
  level,
  onSelect,
}: {
  node: TreeNode;
  projectId: string;
  level: number;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const isDir = node.type === 'directory';

  return (
    <div>
      <div
        className="flex items-center py-0.5 px-2 hover:bg-bg-tertiary cursor-pointer text-sm group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (isDir) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path);
          }
        }}
      >
        <span className="mr-1 text-xs text-text-muted w-4 text-center">
          {isDir ? (expanded ? '▼' : '▶') : '📄'}
        </span>
        <span className={`truncate ${isDir ? 'text-text' : 'text-text-muted'}`}>
          {node.name}
        </span>
      </div>
      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              projectId={projectId}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ projectId, rootPath }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTree();
  }, [projectId]);

  const loadTree = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.fs.tree(projectId);
      setTree(data.tree as TreeNode[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (path: string) => {
    // TODO: Open file in editor
    console.log('Open file:', path);
  };

  if (loading) {
    return <div className="p-4 text-text-muted text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-danger text-sm">{error}</div>;
  }

  return (
    <div className="py-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          projectId={projectId}
          level={0}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
