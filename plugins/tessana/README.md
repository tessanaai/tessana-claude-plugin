# Tessana plugin for Claude Code

Exposes the [Tessana API](https://funky-summer-98a.notion.site/Tessana-API-Reference-Documents-7f5731d4a58044dc94fdba752d70b064) to Claude Code.

## MCP tools

| Tool | Endpoint | Input |
|------|----------|-------|
| `check_connection` | `POST /run_test_suites` with no IDs (queues nothing) | none |
| `run_test_suites` | `POST /run_test_suites` | `ids: int[]` |
| `get_batch_run_results` | `GET /get_batch_run_results` | `run_batch_id: int` |
| `get_test_results` | `GET /get_test_results` | `testrun_id: int` |

`run_test_suites` always asks for approval, and is capped at 10 batches per session (`TESSANA_MAX_RUNS_PER_SESSION`).

## Skills

Claude uses these automatically when a request matches (e.g. "run Tessana suite 34 and tell me what failed"), or invoke them directly:

- `/tessana:setup`: store the API key in the OS keychain and check the connection
- `/tessana:run 34 36 [--no-wait]`: queue suites, wait in the background, drill into failures
- `/tessana:batch-results <run_batch_id>`: batch status table
- `/tessana:test-results <testrun_id>`: per-test results with screenshot/video URLs

## Setup

Requires Node 18+. Get an API key from hello@tessanaai.com, then run `/tessana:setup`.

The key is read from `TESSANA_API_KEY` if set, otherwise from the OS keychain (service `tessana`, account `api-key`):

```sh
# macOS
security add-generic-password -U -s tessana -a api-key -w
# Linux (libsecret)
secret-tool store --label="Tessana API key" service tessana account api-key
```

`TESSANA_BASE_URL` overrides the default `https://app.tessanaai.com`.

Install:

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```
