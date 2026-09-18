import { useState } from 'react';

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status?: string;
  output?: string;
}

interface ToolCallBlockProps {
  toolCall: ToolCall;
}

export default function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'running':
        return <span className="text-warning animate-pulse">⟳</span>;
      case 'done':
        return <span className="text-success">✓</span>;
      case 'error':
        return <span className="text-danger">✗</span>;
      default:
        return <span className="text-text-muted">○</span>;
    }
  };

  const formatArgs = (args: Record<string, unknown>): string => {
    const entries = Object.entries(args);
    if (entries.length === 0) return '';
    return entries
      .map(([key, value]) => {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        return `${key}: ${val.length > 50 ? val.slice(0, 50) + '...' : val}`;
      })
      .join(', ');
  };

  return (
    <div className="border border-border rounded bg-bg-secondary">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-tertiary"
        onClick={() => setExpanded(!expanded)}
      >
        {getStatusIcon()}
        <span className="text-text text-sm font-mono">{toolCall.name}</span>
        <span className="text-text-muted text-xs truncate flex-1">
          {formatArgs(toolCall.args)}
        </span>
        <span className="text-text-muted text-xs">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-border px-3 py-2">
          <pre className="text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
          {toolCall.output && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-text-muted mb-1">Output:</div>
              <pre className="text-xs text-text font-mono overflow-x-auto whitespace-pre-wrap">{toolCall.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
