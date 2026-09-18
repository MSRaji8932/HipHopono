const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data as T;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ user: { id: string; username: string; role: string; mustChangePassword: boolean } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ id: string; username: string; role: string; mustChangePassword: boolean }>(
        '/auth/me'
      ),
    changePassword: (currentPassword: string, newPassword: string) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  settings: {
    get: () => request<Record<string, unknown>>('/settings'),
    update: (settings: Record<string, unknown>) =>
      request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    testConnection: () => request<{ ok: boolean; error?: string }>('/settings/test-connection', { method: 'POST' }),
    reset: () => request('/settings/reset', { method: 'POST' }),
  },

  fs: {
    browse: (path?: string) =>
      request<{ path: string; directories: Array<{ name: string; path: string }> }>(
        `/fs/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`
      ),
    tree: (projectId: string, path?: string) =>
      request<{ tree: unknown[] }>(
        `/fs/tree?projectId=${projectId}${path ? `&path=${encodeURIComponent(path)}` : ''}`
      ),
    file: (projectId: string, path: string) =>
      request<{ content: string; path: string }>(
        `/fs/file?projectId=${projectId}&path=${encodeURIComponent(path)}`
      ),
  },

  project: {
    open: (path: string) =>
      request<{ project: { id: string; name: string; absPath: string; gitBranch: string } }>(
        '/project/open',
        { method: 'POST', body: JSON.stringify({ path }) }
      ),
    recent: () =>
      request<{ projects: Array<{ id: string; name: string; absPath: string; gitBranch: string; lastUsedAt: string }> }>(
        '/project/recent'
      ),
    close: (projectId: string) =>
      request('/project/close', { method: 'POST', body: JSON.stringify({ projectId }) }),
  },

  skills: {
    list: (projectId: string) =>
      request<{ skills: Array<{ name: string; description: string; sourcePath: string; scope: string; enabled: boolean }> }>(
        `/skills?projectId=${projectId}`
      ),
  },

  conversations: {
    list: (projectId?: string) =>
      request<{ conversations: Array<{ id: string; title: string; createdAt: string; updatedAt: string }> }>(
        `/conversations${projectId ? `?projectId=${projectId}` : ''}`
      ),
    create: (projectId: string, title?: string) =>
      request<{ conversation: { id: string; title: string } }>(
        '/conversations',
        { method: 'POST', body: JSON.stringify({ projectId, title }) }
      ),
    messages: (conversationId: string) =>
      request<{ messages: Array<{ id: string; role: string; content: string; createdAt: string }> }>(
        `/conversations/${conversationId}/messages`
      ),
    delete: (conversationId: string) =>
      request(`/conversations/${conversationId}`, { method: 'DELETE' }),
    rename: (conversationId: string, title: string) =>
      request(`/conversations/${conversationId}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }),
  },

  chat: {
    send: async function* (
      conversationId: string,
      projectId: string,
      content: string,
      signal?: AbortSignal
    ) {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, projectId, content }),
        signal,
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              yield event;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    },

    approve: (requestId: string, decision: string) =>
      request('/chat/approve', {
        method: 'POST',
        body: JSON.stringify({ requestId, decision }),
      }),
  },
};
