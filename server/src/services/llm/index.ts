import { streamOpenAI, type LLMMessage, type LLMTool, type LLMStreamCallbacks } from './openai.js';
import { streamAnthropic } from './anthropic.js';

export type { LLMMessage, LLMTool, LLMStreamCallbacks };

export interface LLMConfig {
  format: 'openai' | 'anthropic' | 'other';
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  customHeaders: Record<string, string>;
}

export async function streamLLM(
  config: LLMConfig,
  messages: LLMMessage[],
  tools: LLMTool[],
  callbacks: LLMStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (config.format === 'anthropic') {
    await streamAnthropic(
      config.baseUrl,
      config.apiKey,
      config.model,
      messages,
      tools,
      config.temperature,
      config.maxTokens,
      config.systemPrompt,
      callbacks,
      signal
    );
  } else {
    // Both 'openai' and 'other' use OpenAI-compatible format
    const fullMessages: LLMMessage[] = [];
    if (config.systemPrompt) {
      fullMessages.push({ role: 'system', content: config.systemPrompt });
    }
    fullMessages.push(...messages);

    await streamOpenAI(
      config.baseUrl,
      config.apiKey,
      config.model,
      fullMessages,
      tools,
      config.temperature,
      config.maxTokens,
      callbacks,
      signal,
      config.customHeaders
    );
  }
}
