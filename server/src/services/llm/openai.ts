export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMStreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolCall: (id: string, name: string, args: Record<string, unknown>) => void;
  onUsage: (tokensIn: number, tokensOut: number) => void;
  onError: (error: string) => void;
}

export async function streamOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  tools: LLMTool[],
  temperature: number,
  maxTokens: number,
  callbacks: LLMStreamCallbacks,
  signal?: AbortSignal,
  customHeaders: Record<string, string> = {}
): Promise<void> {
  let url = baseUrl.replace(/\/+$/, '');
  if (!url.endsWith('/chat/completions')) {
    if (!url.endsWith('/v1')) {
      url += '/v1';
    }
    url += '/chat/completions';
  }

  // Support query parameter auth for proxy providers
  if (customHeaders['X-Auth-As-Query'] === 'true') {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}api_key=${encodeURIComponent(apiKey)}`;
    delete customHeaders['X-Auth-As-Query'];
  } else {
    delete customHeaders['X-Auth-As-Query'];
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...customHeaders,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`OpenAI API error ${response.status}: ${errorText.slice(0, 500)}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          // Flush any remaining tool calls
          for (const [, tc] of toolCallBuffers) {
            try {
              const args = JSON.parse(tc.args || '{}');
              callbacks.onToolCall(tc.id, tc.name, args);
            } catch {
              callbacks.onToolCall(tc.id, tc.name, {});
            }
          }
          toolCallBuffers.clear();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.delta?.content) {
            callbacks.onTextDelta(choice.delta.content);
          }

          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallBuffers.has(idx)) {
                toolCallBuffers.set(idx, { id: tc.id || '', name: tc.function?.name || '', args: '' });
              }
              const buf = toolCallBuffers.get(idx)!;
              if (tc.id) buf.id = tc.id;
              if (tc.function?.name) buf.name = tc.function.name;
              if (tc.function?.arguments) buf.args += tc.function.arguments;
            }
          }

          if (parsed.usage) {
            callbacks.onUsage(parsed.usage.prompt_tokens || 0, parsed.usage.completion_tokens || 0);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
