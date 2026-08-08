# Hermetica Synthetix

A single, self-hosted app combining **Synthetix AI** (Riley — agent fleet
orchestration, content/media generation, the mesh multi-agent network,
security/QA/build tooling) and **Hermetica Forge** (venture validation,
project/task management, the Crystal commerce platform, the Sovereign Forge
ops control centre) — the two source apps at
`themodernmystic/synthetix-ai` and `themodernmystic/hermetica-forge`,
merged into one codebase with no Base44 dependency.

Everything each app could do, it can still do here: same 115 data entities
(with field-level merges where both apps defined `Project`, `ActivityLog`, or
`User`), same ~107 backend functions, same UI feature set — just running on a
plain Postgres database and a plain Node server instead of Base44's managed
platform, so it can deploy anywhere (including appdeploy.ai) that runs a
Node process against a Postgres connection string.

## Architecture

```
prisma/schema.prisma        Generated DB schema — one model per source entity
scripts/generate-schema.js  Regenerates schema.prisma + entityMeta.generated.ts
                             from both apps' base44/entities/*.jsonc files

server/                     Express + TypeScript + Prisma API
  src/base44Compat.ts        The core piece: a server-side object with the
                              SAME method surface as the real @base44/sdk
                              client (base44.entities.X.*, base44.auth.me(),
                              base44.integrations.Core.*, base44.asServiceRole.*)
                              backed by real Prisma/Postgres. This is what let
                              every backend function be ported near-verbatim.
  src/rls.ts                  Translates each entity's Base44 `rls` rules
                              (create/read/update/delete, $or, user_condition,
                              {{user.id}} templates) into Prisma `where` filters.
  src/routes/entities.ts      Generic REST CRUD for all 115 entities
                              (/api/entities/:name), RLS-enforced.
  src/routes/functions/       Every ported backend function, one file per
    synthetix/*.ts             function, auto-registered by directory scan.
    hermetica/*.ts              Mirrors base44/functions/<name>/entry.ts 1:1.
  src/integrations/           LLM (Anthropic), image gen, email, file storage
                              (local disk or S3), Stripe, Google Drive —
                              replacing Base44's built-in integrations.

web/                         The merged React/Vite frontend
  src/api/base44Client.js     Drop-in replacement for @base44/sdk on the
                              frontend — same method names, talks to our
                              Express API instead of Base44's backend.
  src/App.jsx                 Merged route tree (see "Routing map" below).
```

### Why this shape

Both source apps were full Base44 exports: a React/Vite SPA whose `base44`
client talked to Base44's managed backend for auth, a per-entity CRUD+RLS
data layer, file storage, and ~150 serverless "functions" (Deno handlers).
Removing Base44 meant replacing all of that — not just copying UI code — while
keeping every function's actual business logic, every entity's fields, and
every access rule intact. `base44Compat.ts` is the piece that makes that
tractable: it's a real implementation of the exact same client shape, so a
ported function is a near line-for-line copy of the original with only the
`Deno.serve` wrapper swapped for an Express route.

## Entity merge

115 entities total (80 from Synthetix AI + 38 from Hermetica Forge, 3 name
collisions field-merged): `Project`, `ActivityLog`, and `User` each got a
**true field-level merge** — every field from both apps' version is present
on one table (e.g. merged `Project` has both apps' status/category/priority
enums as a widened `status: String` etc., with the full original enum values
preserved in `server/src/entityMeta.generated.ts` for validation). Nothing
from either app's shape was dropped.

## Routing map (frontend)

Both apps used `/`, `/projects`, `/forge`, etc. for different things, so the
merge keeps every page reachable at a distinct path instead of overwriting:

| Path | Section |
|---|---|
| `/`, `/content`, `/media`, `/riley`, `/agents`, `/mesh`, `/security`, ... | Synthetix AI main app (unchanged) |
| `/forge/*` | Synthetix AI's Riley Forge builder tools (unchanged) |
| `/hermetica`, `/hermetica/projects`, `/hermetica/validate`, `/hermetica/agents`, `/hermetica/knowledge`, `/hermetica/tasks` | Hermetica Forge's core workspace (was `/`, `/projects`, etc. in the source app) |
| `/crystal/*` | Crystal commerce platform (unchanged) |
| `/venture/*` | Venture Studio (unchanged) |
| `/ops/*` | Sovereign Forge ops control centre (was `/forge/*` in Hermetica Forge — renamed to avoid colliding with Synthetix's own `/forge`) |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Shared auth (Hermetica Forge had a real login UI; Synthetix relied on Base44's hosted login, which no longer exists, so the whole merged app now uses this) |

## What changed vs. the original apps

- **Auth**: email/password + OTP verification + password reset, JWT-based.
  Google OAuth login works if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
- **LLM**: `InvokeLLM` calls Anthropic's API. Set `ANTHROPIC_API_KEY`.
- **Image generation**: OpenAI's image API. Set `OPENAI_API_KEY`.
- **Video generation** (`generateVideo` function): the source app called a
  Base44-hosted Veo integration with no self-hosted equivalent — this one
  function needs a video-gen API wired into `server/src/integrations/` before
  it will work (currently throws a clear "not implemented" error rather than
  failing silently).
- **File storage**: local disk by default (`STORAGE_DRIVER=local`), or S3 /
  S3-compatible (`STORAGE_DRIVER=s3`).
- **Cross-app calls**: several functions originally called *other* Base44
  apps (Prime Gen Suite, the standalone Hermetica app) over Base44's hosted
  API using workspace API keys. Since all that data now lives in this one
  merged database, those calls were rewired to query the local database
  directly instead. One function (`meshSend`'s calls to genuinely external
  sibling agent apps not part of this merge) still calls out to Base44's
  hosted API and only works while those apps remain live there.
- **`OAuthConsent.jsx`** (Hermetica Forge): implemented Base44's own hosted
  MCP-OAuth consent screen — platform infrastructure, not app functionality,
  and it was never wired into that app's routes either. Dropped rather than
  fabricated.

Every deviation from a pure mechanical port is marked with a `// TODO(port):`
comment in the relevant file in `server/src/routes/functions/`.

## Local development

```bash
npm install                    # installs all 3 workspaces (root, server, web)
docker compose up -d db        # or point DATABASE_URL at any Postgres you have
cp .env.example .env           # fill in DATABASE_URL + JWT_SECRET at minimum
npm run prisma:migrate         # creates all 115 tables + auth infra tables
npm run dev:server             # http://localhost:8080 — the API
npm run dev:web                # http://localhost:5173 — the frontend (proxies /api to :8080)
```

## Deploying (appdeploy.ai or any Node+Postgres host)

The `Dockerfile` builds both the frontend and backend into one image that
serves the built React app *and* the `/api/*` routes from a single Node
process on `$PORT` (default 8080) — the most portable shape for a platform
whose exact runtime contract isn't known in advance.

1. Provision a Postgres database, get its connection string.
2. Set env vars (see `.env.example`) — at minimum `DATABASE_URL` and
   `JWT_SECRET`. Add integration keys as you need those features.
3. Point appdeploy.ai at this repo/Dockerfile. On boot the container runs
   `prisma migrate deploy` (safe to run every deploy — no-ops once the schema
   is current) and then starts the server.
4. If appdeploy.ai instead wants a plain buildpack (no Dockerfile): build
   command `npm install && npm run build`, start command
   `npm start` (from the repo root — this runs `server/dist/index.js`, which
   serves `web/dist` itself, so no separate static-site step is needed).

`docker-compose.yml` is provided for local Docker-based development/testing
(`docker compose up --build`) and as a reference for what env vars a
production deploy needs.
