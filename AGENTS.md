# CNM-MCP Knowledge Base

**Generated:** 2026-02-02
**Commit:** 06abf11
**Branch:** main

## OVERVIEW

MCP server exposing ContractorsNearMe.ai (Brilliant Directories) API to Claude Code. Single-file TypeScript server with 14 tools for contractor CRUD, leads, reviews, albums, and posts.

## STRUCTURE

```
cnm-mcp/
├── src/
│   └── index.ts      # ALL server logic (374 lines) - tools, API client, transport
├── dist/             # Compiled output (npm run build)
├── package.json      # Entry: dist/index.js, bin: cnm-mcp
└── tsconfig.json     # ES2022, NodeNext modules
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new tool | `src/index.ts` | Use `server.tool()` pattern with zod schema |
| Fix API request | `src/index.ts:17-63` | `apiRequest()` handles proxy vs direct mode |
| Change proxy URL | `src/index.ts:8` | `PROXY_URL` constant |
| Update tool descriptions | `src/index.ts` | Second arg to `server.tool()` |

## EXPOSED TOOLS

| Tool | Endpoint | Purpose |
|------|----------|---------|
| `get_user` | GET /user/get/:id | Fetch contractor profile |
| `update_user` | PUT /user/update | Update profile (active=2 for public) |
| `search_users` | POST /user/search | Search by keyword/location |
| `create_user` | POST /user/create | New contractor (subscription_id=8 for free) |
| `create_lead` | POST /leads/create | Submit inquiry to contractor |
| `get_lead` | GET /leads/get/:id | Fetch lead details |
| `create_album` | POST /users_portfolio_groups/create | Create photo album |
| `get_albums` | POST /users_portfolio_groups/search | List albums |
| `upload_photo_instructions` | N/A | Returns curl command (multipart) |
| `create_review` | POST /users_reviews/create | Add review (1-5 rating) |
| `get_reviews` | POST /users_reviews/search | List reviews |
| `create_post` | POST /data_posts/create | Create job/article post |
| `get_profile_url` | GET /user/get/:id | Extract public profile URL |
| `verify_api_key` | POST /user/search | Health check |

## CONVENTIONS

- **Proxy mode**: Set `CNM_USE_PROXY=true` to route through n8n (bypasses Cloudflare)
- **Direct mode**: Requires `CNM_API_KEY` and whitelisted IP
- **Tool pattern**: `server.tool(name, description, zodSchema, handler)`
- **Response format**: Always `{ content: [{ type: "text", text: JSON.stringify(...) }] }`

## ANTI-PATTERNS

- **No multipart uploads**: `upload_photo_instructions` returns curl command instead
- **No DELETE endpoint**: Use `update_user` with `active=0` to hide listings
- **No batch operations**: Each tool handles single entity

## ENV VARS

| Variable | Required | Purpose |
|----------|----------|---------|
| `CNM_API_KEY` | Yes (unless proxy) | Brilliant Directories API key |
| `CNM_USE_PROXY` | No | Set `true` to use n8n proxy |

## COMMANDS

```bash
# Development
npm run dev          # Watch mode (tsc --watch)
npm run build        # Compile to dist/

# Run server
npm start            # node dist/index.js
npx cnm-mcp          # Via bin entry

# Test in Claude Code
# Add to ~/.config/Claude/Claude.json:
# "cnm": { "type": "local", "command": ["env", "CNM_USE_PROXY=true", "node", "/path/to/dist/index.js"] }
```

## NOTES

- API base: `https://www.contractorsnearme.ai/api/v2`
- Proxy URL: `https://lab.buildx.pro/webhook/cnm-api-proxy`
- Cloudflare Bot Fight Mode blocks direct local requests - use proxy mode
- `subscription_id=8` = "Claim Listing" (free tier)
- `active=2` = public listing, `active=1` = hidden

## Convex + Clerk Baseline (2026-03)

- Default stack for active BuildX products: Convex for app data and Clerk for authentication.
- Keep `/sign-in` and `/sign-up` routes available (or explicit redirects) in every web app.
- Client-safe env vars: `VITE_CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL` and Clerk publishable keys.
- Server-only secrets: `CLERK_SECRET_KEY`, `CONVEX_DEPLOY_KEY`, provider API keys.
- Treat legacy Supabase-only auth/data paths as migration/backfill scope, not net-new architecture.
