export interface User {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  ip: string;
}

export interface UserSettings {
  providerLabel: string;
  modelName: string;
  apiBaseUrl: string;
  apiToken: string;
  apiFormat: 'openai' | 'anthropic' | 'other';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  autoApproveReads: boolean;
  autoApproveWrites: boolean;
  autoApproveCommands: boolean;
  commandTimeoutMs: number;
  theme: 'dark' | 'light';
  customHeaders: Record<string, string>;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  absPath: string;
  gitBranch: string;
  openedAt: string;
  lastUsedAt: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  detail: Record<string, unknown>;
  at: string;
}

export interface Database {
  meta: { version: number; createdAt: string };
  users: User[];
  sessions: Session[];
  settings: Record<string, UserSettings>;
  projects: Project[];
  conversations: Conversation[];
  messages: Message[];
  auditLog: AuditLogEntry[];
}

export function createEmptyDatabase(): Database {
  return {
    meta: { version: 1, createdAt: new Date().toISOString() },
    users: [],
    sessions: [],
    settings: {},
    projects: [],
    conversations: [],
    messages: [],
    auditLog: [],
  };
}
