import type { LLMMessage, LLMTool, LLMStreamCallbacks } from './openai.js';

export async function streamAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  tools: LLMTool[],
  temperature: number,
  maxTokens: number,
  systemPrompt: string,
  callbacks: LLMStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const url = `${baseUrl}/messages`;

  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: anthropicMessages,
    stream: true,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  if (tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`Anthropic API error ${response.status}: ${errorText.slice(0, 500)}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let toolCallId = '';
  let toolCallName = '';

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

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta') {
              callbacks.onTextDelta(parsed.delta.text);
            }
            if (parsed.delta?.type === 'input_json_delta') {
              // Accumulate tool call args
            }
          }

          if (parsed.type === 'content_block_start') {
            if (parsed.content_block?.type === 'tool_use') {
              toolCallId = parsed.content_block.id;
              toolCallName = parsed.content_block.name;
              callbacks.onToolCall(toolCallId, toolCallName, {});
            }
          }

          if (parsed.type === 'message_delta') {
            if (parsed.usage) {
              callbacks.onUsage(parsed.usage.input_tokens || 0, parsed.usage.output_tokens || 0);
            }
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
