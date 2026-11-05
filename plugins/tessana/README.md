# Tessana plugin for Claude Code

Exposes the [Tessana API](https://funky-summer-98a.notion.site/Tessana-API-Reference-Documents-7f5731d4a58044dc94fdba752d70b064) to Claude Code.

## MCP tools

| Tool | Endpoint | Input |
|------|----------|-------|
| `check_connection` | `POST /run_test_suites` with no IDs (queues nothing) | none |
| `run_test_suites` | `POST /run_test_suites` | `ids: int[]` |
| `get_batch_run_results` | `GET /get_batch_run_results` | `run_batch_id: int` |
| `get_test_results` | `GET /get_test_results` | `testrun_id: int` |
| `list_projects` | `GET /get_projects` | none |
| `list_tests` | `GET /get_tests` | `project_id: int`, `search?: string` |
| `create_test` | `POST /create_test` | `project_id: int`, `title: string`, `objective: string` or `steps: string[]`, `url?`, `tags?: string[]` |
| `get_test_details` | `GET /get_test_details` | `ui_test_id: int` |
| `get_test_run_history` | `GET /get_test_run_history` | `ui_test_id: int`, `limit?: int` |
| `get_test_gen_history` | `GET /get_test_gen_history` | `ui_test_id: int`, `platform?`, `include_actions?: bool`, `limit?: int` |
| `create_test_suite` | `POST /create_test_suite` | `project_id: int`, `name: string`, `test_ids: int[]`, `platform?`, `behavior_after_test?`, `description?`, `environment?`, `tags?: string[]` |

`run_test_suites`, `create_test` and `create_test_suite` always ask for approval. `create_test_suite` returns a `test_suite_config_id`, which is the ID `run_test_suites` takes. `run_test_suites` and is capped at 10 batches per session (`TESSANA_MAX_RUNS_PER_SESSION`).

## Skills

Claude uses these automatically when a request matches (e.g. "run Tessana suite 34 and tell me what failed", or "write Tessana tests for the signup flow and put them in a suite"), or invoke them directly:

- `/tessana:setup`: store the API key in the OS keychain and check the connection
- `/tessana:run 34 36 [--no-wait]`: queue suites, wait in the background, drill into failures
- `/tessana:batch-results <run_batch_id>`: batch status table
- `/tessana:test-results <testrun_id>`: per-test results with screenshot/video URLs
- `/tessana:test-info <ui_test_id or title> [--runs] [--gen] [--actions]`: a test's definition, run history and generation history
- `/tessana:create-test <what to test> [--project <id>] [--url <url>]`: draft tests from a description or the code in context, confirm, then create them
- `/tessana:create-test-suite <name> [test_id ...] [--platform <p>] [--run]`: group tests into a runnable suite

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
