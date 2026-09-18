import { v4 as uuid } from 'uuid';
import { type LLMConfig, type LLMMessage, type LLMTool, streamLLM } from '../llm/index.js';
import { AGENT_TOOLS, executeTool, needsApproval, type ToolResult } from './tools.js';
import { getDb, saveDb } from '../../db/db.js';
import type { UserSettings } from '../../db/schema.js';

export interface AgentEvent {
  type: 'text_delta' | 'tool_call' | 'tool_result' | 'approval_request' | 'usage' | 'error' | 'done' | 'title_update';
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

export interface ApprovalRequest {
  id: string;
  kind: string;
  detail: string;
  decision?: string;
  resolve: (decision: string) => void;
}

const pendingApprovals = new Map<string, ApprovalRequest>();

export function approveRequest(requestId: string, decision: string): boolean {
  const request = pendingApprovals.get(requestId);
  if (!request) return false;
  request.decision = decision;
  request.resolve(decision);
  pendingApprovals.delete(requestId);
  return true;
}

const MAX_ITERATIONS = 25;

export async function runAgentLoop(
  config: LLMConfig,
  messages: LLMMessage[],
  projectRoot: string,
  settings: UserSettings,
  conversationId: string,
  userId: string,
  sendEvent: (event: AgentEvent) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  const tools: LLMTool[] = [...AGENT_TOOLS];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    if (abortSignal?.aborted) {
      sendEvent({ type: 'error', message: 'Aborted by user' });
      break;
    }

    let finalText = '';
    const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];

    await streamLLM(
      config,
      messages,
      tools,
      {
        onTextDelta: (text) => {
          finalText += text;
          sendEvent({ type: 'text_delta', text });
        },
        onToolCall: (id, name, args) => {
          toolCalls.push({ id, name, args });
          sendEvent({ type: 'tool_call', id, name, args });
        },
        onUsage: (tokensIn, tokensOut) => {
          sendEvent({ type: 'usage', tokensIn, tokensOut });
        },
        onError: (error) => {
          sendEvent({ type: 'error', message: error });
        },
      },
      abortSignal
    );

    if (toolCalls.length === 0) {
      if (finalText) {
        const db = getDb();
        const assistantMsg = {
          id: uuid(),
          conversationId,
          role: 'assistant' as const,
          content: finalText,
          tokensIn: 0,
          tokensOut: 0,
          createdAt: new Date().toISOString(),
        };
        db.messages.push(assistantMsg);
        await saveDb(db);
      }

      sendEvent({ type: 'done', messageId: uuid() });
      return finalText;
    }

    messages.push({
      role: 'assistant',
      content: finalText || '[Tool calls]',
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.args) },
      })),
    });

    const db = getDb();
    const assistantMsg = {
      id: uuid(),
      conversationId,
      role: 'assistant' as const,
      content: finalText || '',
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        args: tc.args,
      })),
      tokensIn: 0,
      tokensOut: 0,
      createdAt: new Date().toISOString(),
    };
    db.messages.push(assistantMsg);
    await saveDb(db);

    for (const tc of toolCalls) {
      if (abortSignal?.aborted) break;

      const shouldApprove = needsApproval(tc.name, tc.args, {
        autoApproveReads: settings.autoApproveReads,
        autoApproveWrites: settings.autoApproveWrites,
        autoApproveCommands: settings.autoApproveCommands,
      });

      if (shouldApprove) {
        const requestId = uuid();
        const result = await new Promise<string>((resolve) => {
          const request: ApprovalRequest = {
            id: requestId,
            kind: tc.name,
            detail: JSON.stringify({ tool: tc.name, args: tc.args }),
            resolve,
          };
          pendingApprovals.set(requestId, request);

          sendEvent({
            type: 'approval_request',
            id: requestId,
            kind: tc.name,
            detail: JSON.stringify({ tool: tc.name, args: tc.args }),
          });

          setTimeout(() => {
            if (pendingApprovals.has(requestId)) {
              pendingApprovals.delete(requestId);
              resolve('reject');
            }
          }, 5 * 60 * 1000);
        });

        if (result === 'reject') {
          messages.push({
            role: 'tool',
            content: 'User rejected this action.',
            tool_call_id: tc.id,
          });
          sendEvent({
            type: 'tool_result',
            id: tc.id,
            ok: false,
            output: 'User rejected this action.',
          });

          const rejectDb = getDb();
          const rejectMsg = {
            id: uuid(),
            conversationId,
            role: 'tool' as const,
            content: 'User rejected this action.',
            toolCallId: tc.id,
            tokensIn: 0,
            tokensOut: 0,
            createdAt: new Date().toISOString(),
          };
          rejectDb.messages.push(rejectMsg);
          await saveDb(rejectDb);
          continue;
        }
      }

      const result: ToolResult = await executeTool(tc.name, tc.args, projectRoot);

      sendEvent({
        type: 'tool_result',
        id: tc.id,
        ok: result.ok,
        output: result.output,
      });

      messages.push({
        role: 'tool',
        content: result.output,
        tool_call_id: tc.id,
      });

      const resultDb = getDb();
      const toolMsg = {
        id: uuid(),
        conversationId,
        role: 'tool' as const,
        content: result.output,
        toolCallId: tc.id,
        tokensIn: 0,
        tokensOut: 0,
        createdAt: new Date().toISOString(),
      };
      resultDb.messages.push(toolMsg);
      await saveDb(resultDb);

      if (result.needsApproval) {
        sendEvent({
          type: 'approval_request',
          id: uuid(),
          kind: 'command',
          detail: result.approvalDetail || 'Command requires approval',
        });
      }
    }

    iterations++;
  }

  sendEvent({ type: 'done', messageId: uuid() });
  return '';
}
