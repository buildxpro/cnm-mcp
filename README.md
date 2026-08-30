# Contractors Near Me MCP

MCP server for [ContractorsNearMe.ai](https://contractorsnearme.ai), a directory of 141,000+ licensed US contractors. Available as a hosted remote server or a local stdio package.

## Remote MCP Server (recommended)

Connect any MCP client to the hosted endpoint:

```
https://contractorsnearme.ai/api/mcp
```

Streamable HTTP, stateless JSON mode. Read tools are public; write tools require an API key passed as the `x-api-key` header.

```bash
claude mcp add contractors-near-me --transport http https://contractorsnearme.ai/api/mcp
```

Or reference it from a client config:

```json
{
  "mcpServers": {
    "contractors-near-me": {
      "url": "https://contractorsnearme.ai/api/mcp"
    }
  }
}
```

## Local stdio server

```bash
npm install -g cnm-mcp   # not yet published; build from source below
git clone https://github.com/buildxpro/cnm-mcp.git
cd cnm-mcp && npm install && npm run build
npx cnm-mcp
```

| Variable         | Required              | Purpose                       |
| ---------------- | --------------------- | ----------------------------- |
| `CNM_API_KEY`    | Yes (unless proxy)    | Brilliant Directories API key |
| `CNM_USE_PROXY`  | No                    | Set `true` to use n8n proxy   |

## Tools (hosted endpoint)

| Tool                | Auth      | Purpose                                                                 |
| ------------------- | --------- | ----------------------------------------------------------------------- |
| `search_contractors` | public    | Search by trade, state, city, keyword, or geo-radius                    |
| `get_contractor`     | public    | Full profile: about, contact info, rating                               |
| `get_reviews`        | public    | Reviews for a contractor                                                |
| `list_trades`        | public    | Trade/profession taxonomy                                              |
| `submit_lead`        | API key   | Submit a service request into the directory pipeline                   |
| `submit_review`      | API key   | Submit a review (held for moderation)                                  |

Request an API key via [contractorsnearme.ai](https://contractorsnearme.ai).

## Discovery documents

- MCP manifest: `https://contractorsnearme.ai/.well-known/mcp.json`
- Registry entry: `ai.contractorsnearme/contractors-near-me` on the [official MCP Registry](https://registry.modelcontextprotocol.io)
- OpenAPI (agent REST API): `https://contractorsnearme.ai/.well-known/openapi.yaml`

## License

MIT
