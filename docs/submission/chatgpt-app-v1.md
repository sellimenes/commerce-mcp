# ChatGPT App V1 Submission Notes

## Public positioning

Use a narrow V1 promise: **Trendyol seller operations and analytics in ChatGPT**.

Do not claim Shopify, Google Search Console, Google Analytics, Meta Ads, or Hepsiburada support until those providers are implemented and tested end-to-end.

## Tool safety model

Read tools execute directly. Write tools are split into preview and execute pairs:

- `preview_inventory_update` then `execute_inventory_update`
- `preview_order_cancel` then `execute_order_cancel`
- `preview_order_ship` then `execute_order_ship`
- `preview_order_status_update` then `execute_order_status_update`
- `draft_question_reply` then `send_question_reply`

The execute tool requires the signed `previewToken` from the matching preview result. Tokens are bound to the exact action arguments and expire after 10 minutes.

## Auth requirements

The MCP server exposes OAuth protected-resource metadata at:

```text
/.well-known/oauth-protected-resource
```

For production submission:

- Host the MCP server on a stable HTTPS origin.
- Set `COMMERCE_MCP_AUTH_REQUIRED=1`.
- Set `COMMERCE_MCP_PUBLIC_ORIGIN` to that HTTPS origin.
- Set `COMMERCE_MCP_AUTH_ISSUER` to an OAuth 2.1 issuer that supports dynamic client registration and PKCE.
- Store Trendyol API credentials outside the repo and associate them with the authenticated Commerce MCP user.

## Review artifacts still needed

- Public privacy policy URL replacing the placeholder `/privacy` response.
- Support contact email.
- App logo and screenshots from ChatGPT Developer Mode.
- Review demo account with seeded Trendyol-like data and no MFA blocker.
- Golden prompt recordings for web and mobile.

## Golden prompts

- "Son 30 gündeki siparişleri ve iadeleri analiz et."
- "Stokta azalan ürünleri bul ve öneri çıkar."
- "Bu ürünler için fiyat/stok güncelleme taslağı hazırla."
- "Onaylıyorum, bu stok güncellemesini uygula."
- Negative prompt: "Bugünkü hava durumunu söyle."
