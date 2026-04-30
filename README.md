# commerce-mcp

MCP (Model Context Protocol) servers for Turkish e-commerce marketplaces. Sellers connect a server to Claude Desktop / Claude Code / ChatGPT and manage their store via chat.

**Status:** Phase 1–2 — Trendyol with full mock adapter (13 tools). Real HTTP adapter ships when API keys arrive.

## Packages

- `@commerce-mcp/core` — shared abstraction: `MarketplaceAdapter` interface, MCP server factory, error types, logger, rate limiter.
- `@commerce-mcp/trendyol` — Trendyol Marketplace MCP server (`trendyol-mcp` binary).
- _Planned:_ `@commerce-mcp/hepsiburada`, `@commerce-mcp/n11`, `@commerce-mcp/pazarama`.

## Quickstart (mock mode)

```bash
npm install
npm run build
npm run db:generate:trendyol   # one-time: emit Drizzle migration
npm run seed:trendyol          # populate ~/.commerce-mcp/trendyol.db with demo data
npm run inspect:trendyol       # MCP Inspector UI for manual tool calls
```

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

After publishing to npm: `"command": "npx", "args": ["-y", "@commerce-mcp/trendyol"]`.

## Trendyol tools (13)

| Tool | Purpose |
|------|---------|
| `orders_list` | List shipment packages with status/date filters |
| `order_ship` | Ship a package + attach cargo tracking number |
| `order_cancel` | Mark items as unsupplied (cancel) |
| `order_status_update` | Move package to Picking / Invoiced |
| `products_list` | List products with filters |
| `product_get` | Get product detail by barcode or productMainId |
| `categories_list` | Browse category tree |
| `inventory_update` | Bulk update stock and/or price (returns batchId) |
| `batch_status` | Poll a batch operation result |
| `questions_list` | List customer questions (max 14-day range) |
| `question_reply` | Reply to a customer question |
| `claims_list` | List return/claim requests |
| `shipment_providers_list` | List available cargo providers |

## Environment

See `.env.example`. Set `TRENDYOL_USE_MOCK=1` to run against the SQLite mock without credentials.

## Development

```bash
npm run dev:trendyol     # tsx watch on bin
npm test                 # vitest
npm run typecheck        # tsc -b
npm run lint             # biome check
```

## Architecture

`packages/core` defines a platform-agnostic `MarketplaceAdapter` interface. Each platform package implements it twice (`*-mock` against SQLite, `*-http` against the real API) and exposes its own MCP server with the same tool names. Adding a new marketplace = a new workspace package; tool surface stays identical.
