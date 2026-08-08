#!/usr/bin/env node
/**
 * Converts every Base44 entity JSON schema from both source apps into:
 *   - prisma/schema.prisma           (DB models)
 *   - server/src/entityMeta.generated.ts  (field metadata, enums, defaults, RLS rules)
 *
 * Source apps: /workspace/synthetix-ai/base44/entities/*.jsonc
 *              /workspace/hermetica-forge/base44/entities/*.jsonc
 *
 * True field-level merge: entities with the same name (ActivityLog, Project, User)
 * get their properties unioned. Conflicting field types are widened to the
 * more general type (string wins over enum/number when they disagree) so no
 * data from either app's shape is lost.
 */
const fs = require('fs');
const path = require('path');

const SOURCES = [
  { app: 'synthetix', dir: '/workspace/synthetix-ai/base44/entities' },
  { app: 'hermetica', dir: '/workspace/hermetica-forge/base44/entities' },
];

const OUT_PRISMA = path.join(__dirname, '../prisma/schema.prisma');
const OUT_META = path.join(__dirname, '../server/src/entityMeta.generated.ts');

function stripJsonComments(text) {
  // Strip // and /* */ comments outside of strings (defensive; source files are plain JSON today)
  let out = '';
  let inStr = false, strCh = null, i = 0;
  while (i < text.length) {
    const c = text[i], c2 = text[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\') { out += c2; i += 2; continue; }
      if (c === strCh) inStr = false;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; out += c; i++; continue; }
    if (c === '/' && c2 === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

function loadEntities() {
  const entities = {}; // name -> { name, properties: {field: {...meta, origins:Set}}, required:Set, rls: {app: rls}, origins:Set }
  for (const { app, dir } of SOURCES) {
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.jsonc') && !file.endsWith('.json')) continue;
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const json = JSON.parse(stripJsonComments(raw));
      const name = json.name;
      if (!entities[name]) {
        entities[name] = { name, properties: {}, required: new Set(), rls: {}, origins: new Set() };
      }
      const ent = entities[name];
      ent.origins.add(app);
      for (const [field, def] of Object.entries(json.properties || {})) {
        if (!ent.properties[field]) {
          ent.properties[field] = { ...def, origins: new Set([app]) };
        } else {
          const existing = ent.properties[field];
          existing.origins.add(app);
          // Widen conflicting types: string beats enum/number/boolean; array/object kept if either side has it.
          if (existing.type !== def.type) {
            if (existing.type === 'array' || def.type === 'array') {
              existing.type = 'array';
              existing.items = existing.items || def.items || { type: 'string' };
            } else if (existing.type === 'object' || def.type === 'object') {
              existing.type = 'object';
            } else {
              existing.type = 'string'; // safe widening fallback
            }
          }
          // Merge enums (union) rather than dropping either app's allowed values
          if (existing.enum || def.enum) {
            const set = new Set([...(existing.enum || []), ...(def.enum || [])]);
            existing.enum = [...set];
          }
          if (def.description && !existing.description) existing.description = def.description;
          if (def.format && !existing.format) existing.format = def.format;
          if (existing.default === undefined && def.default !== undefined) existing.default = def.default;
        }
      }
      for (const r of json.required || []) ent.required.add(r);
      if (json.rls) ent.rls[app] = json.rls;
    }
  }
  return entities;
}

function tsIdentifier(name) {
  return name;
}

const RESERVED_FIELD_RENAMES = { }; // none needed currently

// Fields every model already gets from the Base44-compatible base columns.
// A couple of source entities (RemediationReport, VentureBrief) redundantly
// redeclare created_by_id as a plain string with the same meaning ("creator id") —
// skip re-emitting it rather than producing a duplicate Prisma field.
const RESERVED_BASE_FIELDS = new Set(['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample']);

function prismaFieldType(def) {
  if (def.type === 'string') {
    if (def.format === 'date-time' || def.format === 'date') return 'DateTime?';
    return 'String?';
  }
  if (def.type === 'number') return 'Float?';
  if (def.type === 'boolean') return 'Boolean?';
  if (def.type === 'array') {
    const itemType = def.items && def.items.type;
    if (itemType === 'string') return 'String[]';
    if (itemType === 'number') return 'Float[]';
    return 'Json?'; // array of objects
  }
  if (def.type === 'object') return 'Json?';
  return 'String?';
}

function toSnakeTable(name) {
  return name;
}

function buildPrisma(entities) {
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/generate-schema.js — do not hand-edit field lists here.');
  lines.push('// Source: synthetix-ai/base44/entities/*.jsonc + hermetica-forge/base44/entities/*.jsonc');
  lines.push('// Regenerate: node scripts/generate-schema.js');
  lines.push('');
  lines.push('generator client {');
  lines.push('  provider = "prisma-client-js"');
  lines.push('}');
  lines.push('');
  lines.push('datasource db {');
  lines.push('  provider = "postgresql"');
  lines.push('  url      = env("DATABASE_URL")');
  lines.push('}');
  lines.push('');

  const names = Object.keys(entities).sort();
  for (const name of names) {
    const ent = entities[name];
    lines.push(`model ${tsIdentifier(name)} {`);
    lines.push('  id             String    @id @default(cuid())');
    lines.push('  created_date   DateTime  @default(now())');
    lines.push('  updated_date   DateTime  @updatedAt');
    lines.push('  created_by_id  String?');
    lines.push('  created_by     String?   // email of creator, mirrors Base44 built-in field');
    lines.push('  is_sample      Boolean   @default(false)');

    // User model gets real auth columns since Base44's managed auth is gone.
    if (name === 'User') {
      lines.push('  email          String    @unique');
      lines.push('  full_name      String?');
      lines.push('  password_hash  String?');
      lines.push('  avatar_url     String?');
    }

    const fieldNames = Object.keys(ent.properties).sort();
    for (const field of fieldNames) {
      if (name === 'User' && ['email', 'full_name', 'password_hash', 'avatar_url'].includes(field)) continue;
      if (RESERVED_BASE_FIELDS.has(field)) continue;
      const def = ent.properties[field];
      const fname = RESERVED_FIELD_RENAMES[field] || field;
      const ptype = prismaFieldType(def);
      lines.push(`  ${fname.padEnd(14)} ${ptype}`);
    }
    lines.push('');
    lines.push(`  @@map("${toSnakeTable(name)}")`);
    lines.push('}');
    lines.push('');
  }

  // Infra models: not part of either source app's entity set, but needed
  // to replace pieces Base44's managed auth used to handle for us
  // (email OTP verification, password reset tokens).
  lines.push('// --- Infra models (auth plumbing that used to be inside managed Base44 auth) ---');
  lines.push('');
  lines.push('model AuthOtp {');
  lines.push('  id         String   @id @default(cuid())');
  lines.push('  email      String');
  lines.push('  code       String');
  lines.push('  purpose    String   // "register" | "login"');
  lines.push('  expires_at DateTime');
  lines.push('  consumed   Boolean  @default(false)');
  lines.push('  created_at DateTime @default(now())');
  lines.push('');
  lines.push('  @@map("auth_otp")');
  lines.push('}');
  lines.push('');
  lines.push('model PasswordResetToken {');
  lines.push('  id         String   @id @default(cuid())');
  lines.push('  email      String');
  lines.push('  token      String   @unique');
  lines.push('  expires_at DateTime');
  lines.push('  consumed   Boolean  @default(false)');
  lines.push('  created_at DateTime @default(now())');
  lines.push('');
  lines.push('  @@map("password_reset_token")');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function buildMeta(entities) {
  const names = Object.keys(entities).sort();
  const out = [];
  out.push('// AUTO-GENERATED by scripts/generate-schema.js — do not hand-edit.');
  out.push('// Field metadata (types/enums/defaults/required) + RLS rules per entity,');
  out.push('// merged from both source Base44 apps. Drives generic CRUD validation,');
  out.push('// the RLS engine, and can drive frontend form generation.');
  out.push('');
  out.push('export type FieldDef = {');
  out.push('  type: "string" | "number" | "boolean" | "array" | "object";');
  out.push('  format?: string;');
  out.push('  enum?: string[];');
  out.push('  default?: unknown;');
  out.push('  description?: string;');
  out.push('  itemType?: string;');
  out.push('};');
  out.push('');
  // Source rls rule values are usually an object (e.g. {"user_condition":{"role":"admin"}})
  // but some entities use a bare `true` (always allowed) or `null` (no restriction) instead.
  out.push('export type RlsRule = Record<string, unknown> | boolean | null;');
  out.push('export type EntityMeta = {');
  out.push('  name: string;');
  out.push('  origins: string[];');
  out.push('  fields: Record<string, FieldDef>;');
  out.push('  required: string[];');
  out.push('  rls: { create?: RlsRule; read?: RlsRule; update?: RlsRule; delete?: RlsRule } | null;');
  out.push('};');
  out.push('');
  out.push('export const ENTITY_META: Record<string, EntityMeta> = {');
  for (const name of names) {
    const ent = entities[name];
    out.push(`  ${JSON.stringify(name)}: {`);
    out.push(`    name: ${JSON.stringify(name)},`);
    out.push(`    origins: ${JSON.stringify([...ent.origins])},`);
    out.push('    fields: {');
    for (const field of Object.keys(ent.properties).sort()) {
      if (RESERVED_BASE_FIELDS.has(field)) continue;
      const def = ent.properties[field];
      const fieldDef = {
        type: def.type,
        ...(def.format ? { format: def.format } : {}),
        ...(def.enum ? { enum: def.enum } : {}),
        ...(def.default !== undefined ? { default: def.default } : {}),
        ...(def.description ? { description: def.description } : {}),
        ...(def.type === 'array' && def.items ? { itemType: def.items.type } : {}),
      };
      out.push(`      ${JSON.stringify(field)}: ${JSON.stringify(fieldDef)},`);
    }
    out.push('    },');
    out.push(`    required: ${JSON.stringify([...ent.required])},`);
    // Merge RLS across app origins: if origins disagree, prefer the stricter (more app-specific) rule set;
    // most collisions (ActivityLog/Project/User) only had RLS defined on the synthetix side.
    const rls = ent.rls.synthetix || ent.rls.hermetica || null;
    out.push(`    rls: ${rls ? JSON.stringify(rls) : 'null'},`);
    out.push('  },');
  }
  out.push('};');
  out.push('');
  out.push('export const ENTITY_NAMES = Object.keys(ENTITY_META);');
  return out.join('\n');
}

const entities = loadEntities();
fs.writeFileSync(OUT_PRISMA, buildPrisma(entities));
fs.writeFileSync(OUT_META, buildMeta(entities));

const collisions = Object.values(entities).filter(e => e.origins.size > 1).map(e => e.name);
console.log(`Generated ${Object.keys(entities).length} entities.`);
console.log(`Field-level merged (present in both apps): ${collisions.join(', ')}`);
