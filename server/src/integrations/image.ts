import { env } from '../lib/env.js';

export type GenerateImageArgs = { prompt: string; size?: string };

/** Replaces base44.integrations.Core.GenerateImage. Returns { url }. */
export async function generateImage(args: GenerateImageArgs): Promise<{ url: string }> {
  if (!env.IMAGE_GEN_API_KEY) {
    throw new Error('GenerateImage is not configured: set OPENAI_API_KEY or IMAGE_GEN_API_KEY');
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.IMAGE_GEN_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: args.prompt,
      size: args.size || '1024x1024',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GenerateImage failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  const item = data.data?.[0];
  if (item?.url) return { url: item.url };
  if (item?.b64_json) return { url: `data:image/png;base64,${item.b64_json}` };
  throw new Error('GenerateImage: no image returned');
}
