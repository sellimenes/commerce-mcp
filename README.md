# commerce-mcp

**Model Context Protocol (MCP) servers for Turkish e-commerce marketplaces.** Connect a server to Claude Desktop, Claude Code, or ChatGPT and let sellers run their store from a chat window — list orders, update stock and prices, ship packages, reply to customer questions, and analyze returns.

> **Status: Work in progress, not yet production-ready.** The repo currently ships a complete Trendyol tool surface (21 tools) backed by a deterministic SQLite mock adapter, plus an HTTP MCP server scaffolded for the ChatGPT Apps Developer Mode flow. The real Trendyol HTTP adapter is partially stubbed — most methods throw `UpstreamError` until the API integration is finished. Treat this as a developer preview.

## Why

Most marketplace seller dashboards in Turkey are slow, multi-step, and built for desktop. Sellers spend a lot of time in repetitive flows: checking new orders, updating prices and stock across thousands of SKUs, shipping packages, answering customer questions, dealing with returns. An MCP server lets the same seller describe what they want in plain language ("son 7 gündeki iadeleri özetle ve sebepleri grupla") and have the LLM call the right tools — with explicit confirmation before anything mutates.

This repository is the open-source foundation:

- A **shared core abstraction** (`MarketplaceAdapter`) so the same chat surface can fan out to multiple marketplaces.
- A **per-marketplace package** that implements the adapter twice — once against a SQLite mock for local dev, once against the real REST API.
- A **stdio MCP server** for Claude Desktop / Claude Code, and an **HTTP MCP server** for ChatGPT Apps.
- A **safe write model** — every mutating tool is split into `preview_*` (returns a signed token) and `execute_*` (verifies the token), so the LLM cannot mutate state without an explicit human-confirmed second turn.

## Goals

- **One tool surface, many marketplaces.** Today: Trendyol. Planned: Hepsiburada, n11, Pazarama. Adding a marketplace means a new workspace package — the chat-side experience stays identical.
- **Mock-first development.** A new contributor can clone the repo, run `npm run seed:trendyol`, and have a fully working MCP server with realistic data in under a minute, with no API credentials required.
- **Production-ready safety.** Preview/execute write split, OAuth-aware HTTP transport, MCP tool annotations (`readOnlyHint`, `destructiveHint`), per-supplier rate limiting, and stderr-only logging that keeps the MCP stdio framing clean.
- **Bilingual UX.** Tool titles and descriptions are written in English and Turkish so the LLM can reason about both languages naturally.

## Packages

| Package | Description | Binary |
|---|---|---|
| `@commerce-mcp/core` | Platform-agnostic `MarketplaceAdapter` interface, MCP server factory, preview-token primitives, error types, logger, rate limiter | — |
| `@commerce-mcp/trendyol` | Trendyol Marketplace adapter (mock + HTTP) and tool registry | `trendyol-mcp` (stdio) |
| `@commerce-mcp/app-server` | ChatGPT Apps-compatible HTTP MCP server with OAuth resource metadata | `commerce-mcp-app` (HTTP) |

Planned: `@commerce-mcp/hepsiburada`, `@commerce-mcp/n11`, `@commerce-mcp/pazarama`.

## Quickstart (mock mode, no credentials)

Requires Node.js 20+.

```bash
git clone https://github.com/<your-org>/commerce-mcp.git
cd commerce-mcp
npm install
npm run build
npm run db:generate:trendyol   # one-time: emit Drizzle migration SQL
npm run seed:trendyol          # populate ~/.commerce-mcp/trendyol.db with demo data
npm run inspect:trendyol       # MCP Inspector UI for manual tool calls
```

`TRENDYOL_USE_MOCK=1` (default in `.env.example`) routes everything to the SQLite mock — no API keys needed.

## Use it from Claude Desktop / Claude Code

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "trendyol": {
      "command": "node",
      "args": ["/absolute/path/to/commerce-mcp/packages/trendyol/dist/bin/trendyol-mcp.js"],
      "env": { "TRENDYOL_USE_MOCK": "1" }
    }
  }
}
```

Once published to npm, this becomes `"command": "npx", "args": ["-y", "@commerce-mcp/trendyol"]`.

## Use it from ChatGPT (Developer Mode)

```bash
npm install
npm run build
npm run seed:trendyol
npm run dev:app
```

The HTTP server exposes:

- `POST /mcp` — Streamable HTTP MCP endpoint for ChatGPT Developer Mode.
- `GET /.well-known/oauth-protected-resource` — OAuth 2.1 protected-resource metadata.
- `GET /healthz` — local health check.

For local Developer Mode testing, expose `http://127.0.0.1:2091/mcp` over an HTTPS tunnel (e.g. ngrok, cloudflared) and paste the tunneled `/mcp` URL into ChatGPT.

For a production submission you will additionally need:

- A stable HTTPS origin.
- `COMMERCE_MCP_AUTH_REQUIRED=1` and a real OAuth 2.1 authorization server that supports dynamic client registration and PKCE (set via `COMMERCE_MCP_AUTH_ISSUER`).
- Per-user storage of Trendyol API credentials (out of scope for this repo today).

See `docs/submission/chatgpt-app-v1.md` for the full submission checklist.

## Trendyol tools

| Tool | Purpose |
|------|---------|
| `orders_list` | List shipment packages with status/date filters |
| `preview_order_ship` / `execute_order_ship` | Preview, then confirm shipping a package + attaching a tracking number |
| `preview_order_cancel` / `execute_order_cancel` | Preview, then confirm cancelling shipment line items |
| `preview_order_status_update` / `execute_order_status_update` | Preview, then confirm moving a package to Picking / Invoiced |
| `products_list` | List products with filters |
| `product_get` | Get product detail by barcode or productMainId |
| `categories_list` | Browse the category tree |
| `preview_inventory_update` / `execute_inventory_update` | Preview, then confirm bulk stock and/or price updates (returns batchId) |
| `batch_status` | Poll a batch operation result |
| `questions_list` | List customer questions (max 14-day range) |
| `draft_question_reply` / `send_question_reply` | Draft, then confirm a customer question reply |
| `claims_list` | List return/claim requests |
| `shipment_providers_list` | List available cargo providers |
| `analyze_store_performance` | Aggregate orders, revenue, returns, Q&A, low-stock signals |
| `analyze_returns` | Group return/claim reasons and affected products |
| `analyze_product_health` | Flag low stock, approval, and pricing issues |

## Architecture

```
                ┌──────────────────────────┐
                │   Claude / ChatGPT LLM   │
                └────────────┬─────────────┘
                             │ MCP (stdio or HTTP)
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼──────────┐                  ┌───────────▼────────────┐
│  trendyol-mcp    │                  │  commerce-mcp-app      │
│  (stdio binary)  │                  │  (Express, POST /mcp)  │
└───────┬──────────┘                  └───────────┬────────────┘
        │                                         │
        └───────────────────┬─────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Tool registry     │  (preview / execute pairs,
                  │  (21 tools)        │   read-only annotations,
                  └─────────┬──────────┘   OAuth scope metadata)
                            │
                  ┌─────────▼──────────┐
                  │ MarketplaceAdapter │  ← @commerce-mcp/core interface
                  └─────────┬──────────┘
              ┌─────────────┴─────────────┐
              │                           │
   ┌──────────▼────────┐       ┌──────────▼─────────┐
   │ TrendyolMock      │       │ TrendyolHttp       │
   │ (SQLite + Drizzle)│       │ (axios, partial)   │
   └───────────────────┘       └────────────────────┘
```

`packages/core` defines a platform-agnostic `MarketplaceAdapter` interface (`orders`, `products`, `inventory`, `qna`, `claims`, `shipmentProviders`) with unified domain types like `UnifiedOrder` and `UnifiedProduct`. Each marketplace package implements that interface twice — mock and HTTP — and registers the same set of MCP tools. **Adding a new marketplace = a new workspace package; the user-facing tool surface stays identical.**

### Safe write model

Every mutating action is two MCP tools:

1. `preview_<action>` — read-only, returns a payload describing what will happen plus an HMAC-signed `previewToken` (10-minute TTL).
2. `execute_<action>` — verifies the token's signature, action name, expiry, AND that the supplied arguments byte-match (after canonical stable-stringify) what the preview was issued for.

This means the LLM cannot mutate marketplace state in a single turn — it must surface the preview, get explicit confirmation, then call execute with the same arguments. The HMAC secret comes from `COMMERCE_MCP_CONFIRMATION_SECRET`.

## Configuration

All env vars live in `.env.example`. Highlights:

| Variable | Purpose |
|---|---|
| `TRENDYOL_USE_MOCK` | `1` (default) routes to the SQLite mock; unset/`0` routes to the real Trendyol API |
| `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET` | Required when not in mock mode (https://partner.trendyol.com) |
| `TRENDYOL_DB_PATH` | Override the SQLite mock path (default `~/.commerce-mcp/trendyol.db`) |
| `COMMERCE_MCP_HOST`, `COMMERCE_MCP_PORT` | HTTP server bind address (default `127.0.0.1:2091`) |
| `COMMERCE_MCP_AUTH_REQUIRED` | Set to `1` in hosted environments to enforce bearer auth on `/mcp` |
| `COMMERCE_MCP_AUTH_ISSUER` | OAuth 2.1 issuer URL for the protected-resource metadata |
| `COMMERCE_MCP_CONFIRMATION_SECRET` | HMAC secret for preview tokens — change this in any deployed environment |

## Development

```bash
npm run dev:trendyol     # tsx watch on the stdio binary
npm run dev:app          # tsx watch on the HTTP server
npm test                 # vitest run (15s timeout)
npm run typecheck        # tsc -b across all packages
npm run lint             # biome check .
npm run lint:fix         # biome check --write .
```

End-to-end smoke scripts (require `npm run build` first):

```bash
tsx scripts/smoke-test.ts        # exercises the mock adapter directly
tsx scripts/mcp-stdio-smoke.ts   # spawns the stdio binary, drives JSON-RPC, checks stdout cleanliness
```

See `CLAUDE.md` for project-specific conventions (stdio purity rules, drizzle migration workflow, the preview/execute invariant).

## Roadmap

- [ ] Finish the Trendyol HTTP adapter (orders, products, inventory, Q&A, claims).
- [ ] First-class OAuth 2.1 authorization server integration (per-user Trendyol credential storage).
- [ ] `@commerce-mcp/hepsiburada` package.
- [ ] `@commerce-mcp/n11` package.
- [ ] `@commerce-mcp/pazarama` package.
- [ ] Published npm artifacts (`npx -y @commerce-mcp/trendyol`).
- [ ] Hosted multi-tenant deployment for ChatGPT Apps submission.

## Contributing

Contributions are welcome. The most valuable areas right now:

1. **Real Trendyol HTTP adapter** — fill in the stub methods in `packages/trendyol/src/adapter/trendyol-http.adapter.ts` against the endpoint paths already documented in that file.
2. **Additional marketplaces** — copy `packages/trendyol`, swap the schema and the API client, keep the tool surface identical.
3. **Mock data realism** — better seeded data in `packages/trendyol/src/db/seed.ts` makes the analysis tools more useful for demos and tests.

Please run `npm run lint` and `npm test` before opening a PR. New write tools must follow the preview/execute split — see `packages/trendyol/src/tools/orders/order-ship.ts` as the reference.

## License

Not yet specified. A license file will be added before the first tagged release. Until then, please open an issue if you want to use this code in a product.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) — the open standard this server implements.
- [Trendyol Partner API](https://developers.trendyol.com/) — the underlying marketplace API.
