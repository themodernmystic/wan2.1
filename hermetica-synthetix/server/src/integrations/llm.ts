import { env } from '../lib/env.js';

export type InvokeLLMArgs = {
  prompt: string;
  response_json_schema?: Record<string, any>;
  add_context_from_internet?: boolean; // accepted for source-shape parity; not implemented (no search provider configured)
  file_urls?: string[];
};

/**
 * Replaces base44.integrations.Core.InvokeLLM. Same contract: returns a plain
 * string normally, or a parsed object matching `response_json_schema` when
 * one is provided — exactly what every ported function already expects.
 */
export async function invokeLLM(args: InvokeLLMArgs): Promise<any> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('InvokeLLM is not configured: set ANTHROPIC_API_KEY');
  }

  let prompt = args.prompt;
  if (args.response_json_schema) {
    prompt += `\n\nRespond with ONLY valid JSON matching this JSON Schema (no markdown fences, no commentary):\n${JSON.stringify(args.response_json_schema)}`;
  }

  const messages: any[] = [{ role: 'user', content: prompt }];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 4096,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`InvokeLLM failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = (data.content || []).map((b) => b.text || '').join('');

  if (args.response_json_schema) {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`InvokeLLM: model response was not valid JSON: ${text.slice(0, 200)}`);
    }
  }
  return text;
}
