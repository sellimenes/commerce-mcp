# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All scripts run from the repo root (npm workspaces).

```bash
npm install
npm run build           # tsc -b across all packages (project references)
npm run clean           # tsc -b --clean + rm -rf packages/*/dist
npm run typecheck       # same as build (tsc -b)
npm run lint            # biome check .
npm run lint:fix        # biome check --write .
npm test                # vitest run (15s timeout)
npm run test:watch      # vitest

# Trendyol mock workflow
npm run db:generate:trendyol   # drizzle-kit generate (regenerate ./packages/trendyol/drizzle SQL)
npm run seed:trendyol          # tsx packages/trendyol/src/db/seed.ts → ~/.commerce-mcp/trendyol.db
npm run dev:trendyol           # tsx watch on the stdio bin
npm run inspect:trendyol       # MCP Inspector against the built stdio server

# ChatGPT App HTTP server
npm run dev:app                # tsx watch packages/app-server/src/bin/commerce-mcp-app.ts
```

Run a single test file: `npx vitest run packages/core/src/mcp/confirmation.test.ts`. Vitest discovers `packages/*/src/**/*.test.ts` and `packages/*/__tests__/**/*.test.ts` (`vitest.config.ts`).

End-to-end smoke tests live in `scripts/`: `tsx scripts/smoke-test.ts` exercises the mock adapter directly; `tsx scripts/mcp-stdio-smoke.ts` spawns the built `trendyol-mcp` binary, drives it over JSON-RPC, asserts the tool count is exactly 21, and fails if anything non-JSON ever leaks to stdout. Both require `npm run build` first because they import from `dist/`.

## Architecture

Monorepo of three workspaces under `packages/*`. Build via TypeScript project references — `packages/app-server` references `core` and `trendyol`; `packages/trendyol` references `core`. After editing `core`, you usually need `npm run build` for downstream packages to see the new types.

### `@commerce-mcp/core` — platform-agnostic abstractions

- `MarketplaceAdapter` (`adapter/base-adapter.ts`) is the contract every marketplace must implement: `orders`, `products`, `inventory`, `qna`, `claims`, `shipmentProviders`. Domain types in `domain/*.ts` are platform-neutral (`UnifiedOrder`, `UnifiedProduct`, `OrderStatus`…). Adding a new marketplace means a new workspace package implementing this interface — the tool surface stays identical across platforms.
- `mcp/create-server.ts` wraps `McpServer` so each platform package can pass its own `registerTools` callback.
- `mcp/confirmation.ts` is the preview/execute primitive (see "Write tools" below).
- `logger.ts` is a pino logger pinned to **stderr (`dest: 2`)**. Stdout is reserved for MCP framing — any direct `console.log` in stdio servers will corrupt the protocol. Always log through `logger` or `process.stderr.write`.
- `errors.ts` defines `AdapterError` subclasses; tools surface them via `toLLMErrorMessage` + `errorResult`.
- `env.ts` exports `loadEnvWith(zodShape)` — every package validates env with this and lets the error propagate so the bin script writes one readable message.
- `rate-limit.ts` has a sliding-window `TokenBucket` sized for Trendyol's 50-req/10s shared limit.

### `@commerce-mcp/trendyol` — Trendyol implementation

- `adapter/index.ts` chooses `TrendyolMockAdapter` (SQLite via drizzle + better-sqlite3) when `TRENDYOL_USE_MOCK=1`, else `TrendyolHttpAdapter` (axios). **The HTTP adapter is largely stubbed — most methods throw `UpstreamError('… not implemented yet (Phase 3).')`. The mock is the source of truth for current dev/testing.**
- `db/client.ts` opens SQLite at `~/.commerce-mcp/trendyol.db` (override with `TRENDYOL_DB_PATH`), with WAL + foreign keys ON.
- `db/migrate.ts` applies the SQL files generated into `./drizzle` by `drizzle-kit`, splitting on `--> statement-breakpoint`. The stdio bin auto-applies migrations on start when in mock mode.
- `db/seed.ts` (run via `npm run seed:trendyol`) populates demo categories, brands, products, orders, questions, claims, shipment providers.
- `tools/index.ts` registers all 21 MCP tools — adding a tool means adding a `register()` call here AND updating the count assertion in `scripts/mcp-stdio-smoke.ts`.
- `tools/shared/metadata.ts` exports the canonical MCP `annotations` (`readOnlyAnnotations`, `previewAnnotations`, `writeAnnotations`, `destructiveWriteAnnotations`) and `_meta` builders (`readMeta()`, `writeMeta()`) carrying ChatGPT Apps `securitySchemes` (OAuth scopes `trendyol.read`, `trendyol.write`) plus `openai/toolInvocation/*` strings. **Always use these helpers — do not inline annotation/meta objects.**
- `tools/shared/preview.ts` wraps `createConfirmationToken` / `verifyConfirmationToken` for the preview/execute flow.
- `bin/trendyol-mcp.ts` is the stdio entrypoint published as the `trendyol-mcp` binary.

### `@commerce-mcp/app-server` — ChatGPT Apps HTTP MCP server

- `server.ts` builds an Express app via `createMcpExpressApp` and exposes `POST /mcp` (Streamable HTTP transport, stateless — `sessionIdGenerator: undefined`), `GET /healthz`, `GET /privacy`, and the OAuth `/.well-known/oauth-protected-resource` route. A new `McpServer` + transport is created per request and closed in `finally`.
- `auth/oauth-resource.ts` handles bearer enforcement. When `COMMERCE_MCP_AUTH_REQUIRED=1`, requests must present `Authorization: Bearer <COMMERCE_MCP_DEV_BEARER_TOKEN>` (dev) or a real OAuth 2.1 token (prod). Failures respond with `WWW-Authenticate` pointing at the resource metadata URL — required by the ChatGPT Apps OAuth spec.
- The HTTP server **reuses Trendyol's `registerTools` and adapter as-is**, so any new Trendyol tool automatically appears over both transports.

## Key invariants

- **Stdio purity**: `bin/trendyol-mcp.ts` writes only JSON-RPC to stdout. Logs, banners, errors → stderr. The stdio smoke test fails the build if any non-JSON line appears on stdout.
- **Mutating tools follow preview → execute**: every write action is two tools — `preview_<action>` (read-only annotations, returns an HMAC-signed `previewToken` with 10-min TTL) and `execute_<action>` (verifies token signature, action name, expiry, AND that the args canonically match what was previewed). HMAC secret comes from `COMMERCE_MCP_CONFIRMATION_SECRET`. Never add a write tool without this split, and never call the execute side without a fresh preview token whose args are byte-identical (after stable-stringify) to the request.
- **Tool count contract**: `scripts/mcp-stdio-smoke.ts` asserts `tools.length === 21`. Update both the registration and the assertion together.
- **Bilingual tool surface**: titles and descriptions are written in both English and Turkish (the target users are Turkish marketplace sellers). Match this style when adding tools.
- **Drizzle migrations are checked in**: never edit files in `packages/trendyol/drizzle/` by hand — change `db/schema.ts` and rerun `npm run db:generate:trendyol`.

## Code style

Biome enforces single quotes, 2-space indent, trailing commas, semicolons, 100-char lines (`biome.json`). TypeScript is strict with `noUncheckedIndexedAccess` and `noImplicitOverride` enabled (`tsconfig.base.json`) — be explicit about possibly-undefined array/object accesses. Use `.js` extensions in imports (NodeNext module resolution).
