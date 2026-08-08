import { ENTITY_META, RlsRule } from './entityMeta.generated.js';

export type RlsAction = 'create' | 'read' | 'update' | 'delete';
export type CurrentUser = { id: string; email: string; role: string } | null;

const DENY = { OR: [] as any[] };

function isDeny(where: any): boolean {
  return !!where && Array.isArray(where.OR) && where.OR.length === 0 && Object.keys(where).length === 1;
}

/**
 * Translates a Base44 `rls` rule (create/read/update/delete block from the
 * source entity .jsonc) into a Prisma `where` fragment.
 *
 * `{ OR: [] }` is used as the "matches nothing" sentinel — Prisma treats an
 * empty OR array as always-false, so it composes naturally inside further
 * $or/$and nesting without needing a special deny type.
 */
function evalToWhere(rule: RlsRule, user: CurrentUser): any {
  // Some source entities use a bare boolean instead of a rule object:
  // `create: true` = always allowed, `create: false` = always denied.
  if (rule === true) return {};
  if (rule === false) return DENY;
  if (!rule || Object.keys(rule).length === 0) return {};

  if (Array.isArray((rule as any).$or)) {
    return { OR: (rule as any).$or.map((r: RlsRule) => evalToWhere(r, user)) };
  }
  if (Array.isArray((rule as any).$and)) {
    return { AND: (rule as any).$and.map((r: RlsRule) => evalToWhere(r, user)) };
  }
  if ((rule as any).user_condition) {
    if (!user) return DENY;
    const ok = Object.entries((rule as any).user_condition).every(([k, v]) => (user as any)[k] === v);
    return ok ? {} : DENY;
  }

  const where: Record<string, any> = {};
  for (const [field, value] of Object.entries(rule)) {
    if (value === '{{user.id}}') {
      if (!user) return DENY;
      where[field] = user.id;
    } else if (value === '{{user.email}}') {
      if (!user) return DENY;
      where[field] = user.email;
    } else {
      where[field] = value;
    }
  }
  return where;
}

/**
 * Prisma `where` fragment enforcing the entity's rule for this action + user.
 * Entities with no `rls` block declared in either source app default to
 * "any authenticated user" — that was Base44's implicit behavior for
 * entities that never set explicit RLS, and matches how those entities'
 * pages/functions behaved in the original apps.
 */
export function rlsWhere(entityName: string, action: RlsAction, user: CurrentUser): any {
  const meta = ENTITY_META[entityName];
  const rule = meta?.rls?.[action];
  if (!rule) {
    return user ? {} : DENY;
  }
  return evalToWhere(rule, user);
}

export function rlsAllows(entityName: string, action: RlsAction, user: CurrentUser): boolean {
  return !isDeny(rlsWhere(entityName, action, user));
}

/**
 * For `create`, the same rule doubles as instructions for which fields to
 * auto-stamp from the current user (e.g. created_by_id: "{{user.id}}").
 * Only handles the simple top-level field-template shape actually used by
 * these entities' create rules (no $or nesting in create rules in practice).
 */
export function extractCreateStamps(entityName: string, user: CurrentUser): Record<string, any> {
  const meta = ENTITY_META[entityName];
  const rule = meta?.rls?.create;
  const stamps: Record<string, any> = {};
  if (!rule || typeof rule !== 'object' || !user) return stamps;
  for (const [field, value] of Object.entries(rule)) {
    if (value === '{{user.id}}') stamps[field] = user.id;
    if (value === '{{user.email}}') stamps[field] = user.email;
  }
  return stamps;
}

export { isDeny };
