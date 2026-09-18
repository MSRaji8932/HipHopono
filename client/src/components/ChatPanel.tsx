import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.ts';
import ToolCallBlock from './ToolCallBlock.tsx';
import ApprovalModal from './ApprovalModal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface ChatPanelProps {
  conversationId: string;
  projectId: string;
  onTitleUpdate?: (conversationId: string, title: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string }>;
  createdAt: string;
}

interface ChatEvent {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  ok?: boolean;
  output?: string;
  tokensIn?: number;
  tokensOut?: number;
  message?: string;
  messageId?: string;
  kind?: string;
  detail?: string;
  title?: string;
}

interface ApprovalRequest {
  id: string;
  kind: string;
  detail: string;
}

const BUILTIN_COMMANDS = [
  { name: '/help', desc: 'Show available commands' },
  { name: '/clear', desc: 'Clear terminal output' },
  { name: '/skills', desc: 'List available skills' },
  { name: '/model', desc: 'Show current model' },
  { name: '/new', desc: 'New conversation' },
  { name: '/history', desc: 'Command history' },
];

export default function ChatPanel({ conversationId, projectId, onTitleUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<Array<{ id: string; name: string; args: Record<string, unknown>; status?: string }>>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [messages, streamingText]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await api.conversations.messages(conversationId);
      setMessages(data.messages as Message[]);
    } catch {
      // Ignore
    }
  };

  const handleCommand = (cmd: string): boolean => {
    const trimmed = cmd.trim();

    if (trimmed === '/help') {
      setShowHelp(true);
      return true;
    }

    if (trimmed === '/clear') {
      setMessages([]);
      setStreamingText('');
      setStreamingToolCalls([]);
      return true;
    }

    if (trimmed === '/skills') {
      const helpMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: 'Loading skills...',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, helpMsg]);
      return false; // Let it pass through to AI
    }

    if (trimmed === '/model') {
      const modelMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: 'Use the Settings page to view/change the model configuration.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, modelMsg]);
      return true;
    }

    if (trimmed === '/new') {
      window.location.reload();
      return true;
    }

    if (trimmed === '/history') {
      const historyMsg: Message = {
        id: `cmd-${Date.now()}`,
        role: 'assistant',
        content: commandHistory.length > 0
          ? commandHistory.map((h, i) => `${i + 1}. ${h}`).join('\n')
          : 'No command history yet.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, historyMsg]);
      return true;
    }

    return false;
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const cmd = input.trim();
    setInput('');
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Handle built-in commands
    if (cmd.startsWith('/')) {
      const handled = handleCommand(cmd);
      if (handled) return;
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: cmd,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingToolCalls([]);

    abortRef.current = new AbortController();

    try {
      const stream = api.chat.send(
        conversationId,
        projectId,
        userMessage.content,
        abortRef.current.signal
      );

      let finalText = '';
      const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown>; status?: string; output?: string }> = [];
      let lastMessageId = '';

      for await (const event of stream) {
        const e = event as ChatEvent;

        switch (e.type) {
          case 'text_delta':
            finalText += e.text || '';
            setStreamingText(finalText);
            break;

          case 'tool_call':
            toolCalls.push({
              id: e.id || '',
              name: e.name || '',
              args: e.args || {},
              status: 'running',
            });
            setStreamingToolCalls([...toolCalls]);
            break;

          case 'tool_result':
            const tcIndex = toolCalls.findIndex(tc => tc.id === e.id);
            if (tcIndex >= 0) {
              toolCalls[tcIndex].status = e.ok ? 'done' : 'error';
              toolCalls[tcIndex].output = e.output || '';
              setStreamingToolCalls([...toolCalls]);
            }
            break;

          case 'approval_request':
            setApprovalRequest({
              id: e.id || '',
              kind: e.kind || '',
              detail: e.detail || '',
            });
            break;

          case 'error':
            setStreamingText(prev => prev + `\n\nError: ${e.message}`);
            break;

          case 'done':
            if (e.messageId) lastMessageId = e.messageId;
            break;

          case 'title_update':
            if (e.title && onTitleUpdate) {
              onTitleUpdate(conversationId, e.title);
            }
            break;
        }
      }

      if (finalText) {
        setMessages(prev => [...prev, {
          id: lastMessageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: finalText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStreamingText(`Error: ${(err as Error).message}`);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingToolCalls([]);
    }
  };

  const handleApproval = async (decision: string) => {
    if (!approvalRequest) return;
    try {
      await api.chat.approve(approvalRequest.id, decision);
      setApprovalRequest(null);
    } catch {
      // Ignore
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      handleStop();
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg font-mono">
      {/* Output area */}
      <div ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {showHelp && (
          <div className="mb-4 p-3 bg-bg-secondary border border-border rounded">
            <div className="text-accent font-bold mb-2">Available Commands:</div>
            {BUILTIN_COMMANDS.map(cmd => (
              <div key={cmd.name} className="flex gap-4 text-sm">
                <span className="text-text-bright w-24">{cmd.name}</span>
                <span className="text-text-muted">{cmd.desc}</span>
              </div>
            ))}
            <div className="mt-2 text-text-muted text-xs">
              Type any message to chat with the AI. Use ↑/↓ for command history. Ctrl+C to stop.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            {msg.role === 'user' ? (
              <div className="flex">
                <span className="text-accent mr-2">{'>'}</span>
                <span className="text-text-bright whitespace-pre-wrap">{msg.content}</span>
              </div>
            ) : (
              <div className="ml-0">
                <div className="text-text leading-relaxed">
                  <MarkdownRenderer content={msg.content} />
                </div>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolCalls.map((tc) => (
                      <ToolCallBlock key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streamingText && (
          <div className="text-sm">
            <div className="text-text leading-relaxed">
              <MarkdownRenderer content={streamingText} />
            </div>
          </div>
        )}

        {streamingToolCalls.length > 0 && (
          <div className="space-y-1 text-sm">
            {streamingToolCalls.map((tc) => (
              <ToolCallBlock key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {isStreaming && (
          <div className="text-text-muted text-sm animate-pulse">...</div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 bg-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="text-accent font-bold">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or message..."
            className="flex-1 bg-transparent text-text focus:outline-none text-sm font-mono placeholder-text-muted"
            disabled={isStreaming}
            autoFocus
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-danger/20 hover:bg-danger/30 text-danger rounded text-xs"
            >
              [stop]
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-3 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded text-xs disabled:opacity-30"
            >
              [send]
            </button>
          )}
        </div>
      </div>

      {approvalRequest && (
        <ApprovalModal
          request={approvalRequest}
          onApprove={() => handleApproval('approve')}
          onReject={() => handleApproval('reject')}
        />
      )}
    </div>
  );
}
