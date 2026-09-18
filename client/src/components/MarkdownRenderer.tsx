import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-1.5 bg-bg-secondary border-b border-border">
        <span className="text-xs text-text-muted font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-text-muted hover:text-text-bright transition-colors"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0d1117',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          const codeString = String(children).replace(/\n$/, '');

          if (isInline) {
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 bg-bg-secondary text-accent rounded text-[0.8125rem] font-mono border border-border"
                {...props}
              >
                {children}
              </code>
            );
          }

          return <CodeBlock language={match?.[1] || ''} children={codeString} />;
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        h1({ children }) {
          return <h1 className="text-2xl font-bold mb-4 mt-6 text-text-bright border-b border-border pb-2">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mb-3 mt-5 text-text-bright">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-bold mb-2 mt-4 text-text-bright">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="text-base font-bold mb-2 mt-3 text-text-bright">{children}</h4>;
        },
        ul({ children }) {
          return <ul className="mb-3 ml-4 list-disc space-y-1 text-text">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 ml-4 list-decimal space-y-1 text-text">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-accent pl-4 my-3 text-text-muted italic bg-bg-secondary py-2 pr-2 rounded-r">
              {children}
            </blockquote>
          );
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
        strong({ children }) {
          return <strong className="font-bold text-text-bright">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        hr() {
          return <hr className="my-4 border-border" />;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-bg-secondary border-b border-border">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-border">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-bg-secondary/50">{children}</tr>;
        },
        th({ children }) {
          return <th className="px-4 py-2 text-left font-semibold text-text-bright">{children}</th>;
        },
        td({ children }) {
          return <td className="px-4 py-2 text-text">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
