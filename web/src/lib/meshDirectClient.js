import { createClient } from '@base44/sdk';

/**
 * Constructs a Base44 SDK client targeting a sibling app for direct
 * cross-app function invocation (e.g. meshReceive).
 *
 * @param {string} target_app_id — The destination app's app_id
 * @param {string} workspaceKey — BASE44_WORKSPACE_API_KEY
 * @returns {import('@base44/sdk').Base44Client}
 * @throws {Error} if workspaceKey is missing or target_app_id is invalid
 */
export function getDirectClient(target_app_id, workspaceKey) {
  if (!workspaceKey) throw new Error('workspace_key_required');
  if (!target_app_id || target_app_id === 'TBC') throw new Error('invalid_target_app_id');
  return createClient({
    appId: target_app_id,
    headers: { api_key: workspaceKey },
  });
}