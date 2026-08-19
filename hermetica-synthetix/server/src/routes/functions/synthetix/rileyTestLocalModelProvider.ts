// Ported from synthetix-ai/base44/functions/rileyTestLocalModelProvider/entry.ts
import { registerFunction } from '../registry.js';

function isSafeExternalUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return false;
    if (/^0\./.test(host)) return false;
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;
    if (host === '169.254.169.254' || host.includes('metadata.google')) return false;
    return true;
  } catch { return false; }
}

registerFunction('rileyTestLocalModelProvider', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { provider_id, test_prompt } = req.body || {};

    const providers: any[] = await base44.entities.LocalModelProvider.list();
    const provider = providers.find((p: any) => p.id === provider_id);

    if (!provider) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    if (!provider.endpoint_url || provider.connection_status === 'Endpoint Not Configured' || provider.connection_status === 'Manual Workflow') {
      await base44.entities.LocalModelProvider.update(provider_id, {
        last_test_result: 'Manual Workflow — endpoint not configured. Copy your prompt and paste it directly into your local Ollama/LM Studio interface.',
        last_checked_at: new Date().toISOString(),
        connection_status: 'Manual Workflow'
      });

      res.json({
        status: 'manual_workflow',
        message: 'Endpoint not configured. Use manual workflow: copy your prompt → paste into local Ollama → paste result back.',
        manual_instructions: [
          '1. Open your local Ollama interface (usually http://localhost:11434)',
          '2. Copy your prompt from Riley Forge',
          '3. Run: ollama run <model_name> "<your prompt>"',
          '4. Paste the result back into Riley Forge',
          'Note: Riley Forge is hosted — it cannot directly access localhost on your machine without a secure tunnel.'
        ],
        test_prompt: test_prompt || provider.test_prompt
      });
      return;
    }

    // SAFETY NOTE: Do not send secrets, credentials, or sensitive data to local models.
    // This endpoint attempts a basic connection test only.
    // SSRF guard: block internal/private/metadata endpoints
    if (!isSafeExternalUrl(provider.endpoint_url)) {
      await base44.entities.LocalModelProvider.update(provider_id, {
        last_test_result: 'Blocked: endpoint URL is internal or invalid. Only public HTTPS endpoints are allowed for remote testing.',
        last_checked_at: new Date().toISOString(),
        connection_status: 'Blocked'
      });
      res.json({
        status: 'blocked',
        message: 'Endpoint URL failed SSRF validation. Use Manual Workflow for local models.',
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${provider.endpoint_url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model_name || 'llama2',
          prompt: test_prompt || provider.test_prompt || 'Hello. Respond with one sentence only.',
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        await base44.entities.LocalModelProvider.update(provider_id, {
          last_test_result: data.response || 'Connected — response received',
          last_checked_at: new Date().toISOString(),
          connection_status: 'Connected'
        });
        res.json({ status: 'connected', result: data.response });
        return;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (connError: any) {
      await base44.entities.LocalModelProvider.update(provider_id, {
        last_test_result: `Connection failed: ${connError.message}. This is expected if Riley Forge is hosted — localhost refers to the server, not your machine.`,
        last_checked_at: new Date().toISOString(),
        connection_status: 'Failed'
      });
      res.json({
        status: 'failed',
        message: 'Connection failed. Use Manual Workflow instead.',
        error: connError.message
      });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
