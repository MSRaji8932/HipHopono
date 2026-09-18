import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-accent/20 text-text'
            : 'bg-bg-secondary text-text border border-border'
        }`}
      >
        {!isUser && (
          <div className="text-xs text-accent mb-2 font-medium">HipHopono</div>
        )}

        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                if (match) {
                  return (
                    <div className="relative">
                      <div className="absolute top-0 right-0 px-2 py-1 text-xs text-text-muted bg-bg-tertiary rounded-bl">
                        {match[1]}
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded !bg-bg-tertiary"
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code
                    className="px-1 py-0.5 bg-bg-tertiary rounded text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc list-inside mb-2">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal list-inside mb-2">{children}</ol>;
              },
              li({ children }) {
                return <li className="mb-1">{children}</li>;
              },
              h1({ children }) {
                return <h1 className="text-xl font-bold mb-2 text-text-bright">{children}</h1>;
              },
              h2({ children }) {
                return <h2 className="text-lg font-bold mb-2 text-text-bright">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-base font-bold mb-2 text-text-bright">{children}</h3>;
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {children}
                  </a>
                );
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-2 border-accent pl-4 text-text-muted italic">
                    {children}
                  </blockquote>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto">
                    <table className="border-collapse border border-border">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-border px-3 py-1 bg-bg-tertiary text-text-bright text-left">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-border px-3 py-1">{children}</td>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <div className="text-xs text-text-muted mt-2">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
