import { getModelDelegate } from './lib/prisma.js';
import { parseSort } from './lib/sort.js';
import { HttpError } from './lib/httpError.js';
import { rlsWhere, rlsAllows, extractCreateStamps, type CurrentUser } from './rls.js';
import { ENTITY_NAMES } from './entityMeta.generated.js';
import { invokeLLM } from './integrations/llm.js';
import { generateImage } from './integrations/image.js';
import { uploadFile, extractDataFromUploadedFile } from './integrations/storage.js';
import { sendEmail } from './integrations/email.js';
import { getConnection } from './integrations/connectors.js';

/**
 * Server-side stand-in for the `base44` client object that every ported
 * Deno function (`base44/functions/<name>/entry.ts`) was written against:
 *   base44.entities.<Name>.list/filter/get/create/update/delete
 *   base44.asServiceRole.entities.<Name>.*           (RLS bypassed)
 *   base44.asServiceRole.integrations.Core.*
 *   base44.integrations.Core.*
 *   base44.asServiceRole.connectors.getConnection
 *   base44.auth.me()
 *
 * Keeping the exact same method names/shapes lets each function's business
 * logic be ported near-verbatim instead of rewritten.
 */

function makeEntityClient(entityName: string, user: CurrentUser, bypassRls: boolean) {
  const delegate = getModelDelegate(entityName);
  if (!delegate) {
    throw new HttpError(500, `Unknown entity "${entityName}" — not present in the merged schema`);
  }
  const model = delegate; // narrowed non-null, safe to capture in nested closures below

  async function assertRow(id: string, action: 'read' | 'update' | 'delete') {
    const where = bypassRls ? { id } : { AND: [rlsWhere(entityName, action, user), { id }] };
    const row = await model.findMany({ where, take: 1 });
    if (!row[0]) throw new HttpError(404, `${entityName} ${id} not found or not permitted`);
    return row[0];
  }

  return {
    async list(sort?: string, limit?: number) {
      const where = bypassRls ? {} : rlsWhere(entityName, 'read', user);
      return model.findMany({ where, orderBy: parseSort(sort) ?? [{ created_date: 'desc' }], ...(limit ? { take: limit } : {}) });
    },
    async filter(query: Record<string, any> = {}, sort?: string, limit?: number) {
      const rlsPart = bypassRls ? {} : rlsWhere(entityName, 'read', user);
      return model.findMany({
        where: { AND: [rlsPart, query] },
        orderBy: parseSort(sort) ?? [{ created_date: 'desc' }],
        ...(limit ? { take: limit } : {}),
      });
    },
    async get(id: string) {
      const rlsPart = bypassRls ? {} : rlsWhere(entityName, 'read', user);
      const rows = await model.findMany({ where: { AND: [rlsPart, { id }] }, take: 1 });
      return rows[0] ?? null;
    },
    async create(data: Record<string, any>) {
      if (!bypassRls && !rlsAllows(entityName, 'create', user)) throw new HttpError(403, `Not permitted to create ${entityName}`);
      const stamps = bypassRls ? {} : extractCreateStamps(entityName, user);
      const provenance =
        user && data.created_by_id === undefined && data.created_by === undefined
          ? { created_by_id: user.id, created_by: user.email }
          : {};
      return model.create({ data: { ...data, ...provenance, ...stamps } });
    },
    async bulkCreate(items: Record<string, any>[]) {
      const out = [];
      for (const item of items) out.push(await this.create(item));
      return out;
    },
    async update(id: string, data: Record<string, any>) {
      await assertRow(id, 'update');
      return model.update({ where: { id }, data });
    },
    async delete(id: string) {
      await assertRow(id, 'delete');
      return model.delete({ where: { id } });
    },
  };
}

export type Base44Compat = ReturnType<typeof createBase44Compat>;

const integrationsCore = {
  InvokeLLM: invokeLLM,
  GenerateImage: generateImage,
  UploadFile: uploadFile,
  ExtractDataFromUploadedFile: extractDataFromUploadedFile,
  SendEmail: sendEmail,
};

/**
 * @param user            the acting user (for RLS evaluation + created_by stamping)
 * @param trustedContext  true when this compat object backs a *function* route
 *                        (routes/functions/**) rather than the direct
 *                        `/api/entities/:name` REST endpoint. Base44 functions
 *                        run server-side with backend trust — `base44.entities.X`
 *                        inside a function is not RLS-checked the way a
 *                        browser-originated call is, regardless of whether the
 *                        original source wrote `.entities.X` or
 *                        `.asServiceRole.entities.X`. So inside a trusted
 *                        function context both aliases bypass RLS identically;
 *                        only the plain frontend-facing entities REST router
 *                        (routes/entities.ts) enforces RLS.
 */
export function createBase44Compat(user: CurrentUser, trustedContext = false) {
  const entities: Record<string, ReturnType<typeof makeEntityClient>> = {};
  const serviceEntities: Record<string, ReturnType<typeof makeEntityClient>> = {};
  for (const name of ENTITY_NAMES) {
    entities[name] = makeEntityClient(name, user, trustedContext);
    serviceEntities[name] = makeEntityClient(name, user, true);
  }

  return {
    entities: entities as any,
    integrations: { Core: integrationsCore },
    auth: {
      async me() {
        return user;
      },
    },
    asServiceRole: {
      entities: serviceEntities as any,
      integrations: { Core: integrationsCore },
      connectors: { getConnection },
    },
  };
}
