import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api.ts';
import ToolCallBlock from './ToolCallBlock.tsx';
import ApprovalModal from './ApprovalModal.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import { Sparkles, Square, ArrowUp, Command } from 'lucide-react';

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp' && !e.shiftKey && !input.includes('\n')) {
      // only hijack history when not editing multiline
      if (commandHistory.length > 0) {
        e.preventDefault();
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        const next = commandHistory[commandHistory.length - 1 - newIndex] || '';
        setInput(next);
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 144) + 'px';
          }
        });
      }
    } else if (e.key === 'ArrowDown' && !input.includes('\n')) {
      if (historyIndex >= 0) {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          const next = commandHistory[commandHistory.length - 1 - newIndex] || '';
          setInput(next);
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.style.height = 'auto';
              inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 144) + 'px';
            }
          });
        } else {
          setHistoryIndex(-1);
          setInput('');
          if (inputRef.current) inputRef.current.style.height = 'auto';
        }
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

      {/* Modern Composer */}
      <div className="border-t border-border/60 bg-bg-secondary/60 backdrop-blur-xl p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            {/* soft glow on focus */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-accent/20 via-accent/5 to-accent/20 rounded-[18px] blur-[6px] opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />
            <div className="relative flex items-end gap-3 bg-bg-tertiary/90 border border-border group-focus-within:border-accent/25 rounded-2xl px-3.5 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)] group-focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(88,166,255,0.12)] transition-all duration-300">
              {/* leading spark */}
              <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/15 text-accent shrink-0 mb-[2px]">
                <Sparkles className="w-[15px] h-[15px]" />
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, or type / for commands…"
                rows={1}
                className="flex-1 max-h-36 min-h-[24px] bg-transparent text-[14px] leading-6 text-text placeholder:text-text-muted/60 focus:outline-none resize-none py-1.5 font-mono scrollbar-thin"
                disabled={isStreaming}
                autoFocus
                style={{ height: 'auto' }}
              />

              {/* actions */}
              <div className="flex items-center gap-2 shrink-0 mb-0.5">
                {isStreaming ? (
                  <button
                    onClick={handleStop}
                    aria-label="Stop generation"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-danger text-white shadow-[0_2px_10px_rgba(248,81,73,0.35)] hover:bg-danger/90 hover:shadow-[0_4px_16px_rgba(248,81,73,0.45)] active:scale-[0.97] transition-all duration-200"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Send message"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent text-white shadow-[0_2px_10px_rgba(88,166,255,0.35)] hover:bg-accent-hover hover:shadow-[0_4px_16px_rgba(88,166,255,0.45)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-accent transition-all duration-200 group/btn"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5] group-enabled:group-hover/btn:translate-y-[-1px] transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* hints bar */}
          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="flex items-center gap-3 text-[11px] leading-none text-text-muted">
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-md bg-bg-tertiary border border-border/80 text-[10px] font-mono text-text-muted shadow-sm">↵</kbd>
                <span>send</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-bg-tertiary border border-border/80 text-[10px] font-mono text-text-muted shadow-sm">Shift ↵</kbd>
                <span>new line</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Command className="w-3 h-3 opacity-70" />
                <span className="hidden xs:inline">type</span> / for commands
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-warning animate-pulse shadow-[0_0_8px_rgba(210,153,34,0.6)]' : 'bg-success shadow-[0_0_6px_rgba(63,185,80,0.5)]'}`} />
              <span className="hidden sm:inline">{isStreaming ? 'Generating…' : 'Ready'}</span>
              {!isStreaming && input.length > 0 && (
                <span className="hidden sm:inline text-text-muted/60">• {input.length} chars</span>
              )}
            </div>
          </div>
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
