# Tessana plugin for Claude Code

Create, edit, inspect and run [Tessana](https://tessanaai.com) end-to-end tests and test suites from Claude Code, and get results, screenshots and recordings back in your session. The plugin wraps the [Tessana API](https://funky-summer-98a.notion.site/Tessana-API-Reference-Documents-7f5731d4a58044dc94fdba752d70b064) in a small local MCP server.

## MCP tools

| Tool | Endpoint | Input |
|------|----------|-------|
| `check_connection` | `POST /run_test_suites` with no IDs (queues nothing) | none |
| `run_test_suites` | `POST /run_test_suites` | `ids: int[]` |
| `get_batch_run_results` | `GET /get_batch_run_results` | `run_batch_id: int` |
| `wait_for_batch` | `GET /get_batch_run_results`, every 15 seconds until the batch finishes | `run_batch_id: int`, `timeout_seconds?: int` (default 300, max 600) |
| `get_test_results` | `GET /get_test_results` | `testrun_id: int` |
| `list_projects` | `GET /get_projects` | none |
| `list_tests` | `GET /get_tests` | `project_id: int`, `search?: string` |
| `create_test` | `POST /create_test` | `project_id: int`, `title: string`, `objective: string` or `steps: string[]`, `url?`, `app_mode?`, `tags?: string[]` |
| `update_test` | `POST /update_test` | `ui_test_id: int` and any of `title`, `objective` or `steps`, `url`, `app_mode`, `tags` (replaces all) |
| `get_test_details` | `GET /get_test_details` | `ui_test_id: int` |
| `get_test_run_history` | `GET /get_test_run_history` | `ui_test_id: int`, `limit?: int` |
| `get_test_gen_history` | `GET /get_test_gen_history` | `ui_test_id: int`, `platform?`, `include_actions?: bool`, `limit?: int` |
| `create_test_suite` | `POST /create_test_suite` | `project_id: int`, `name: string`, `test_ids: int[]`, `platform?`, `behavior_after_test?`, `description?`, `environment?`, `tags?: string[]` |

`run_test_suites`, `create_test`, `update_test` and `create_test_suite` always ask for approval. `create_test_suite` returns a `test_suite_config_id`, which is the ID `run_test_suites` takes. `run_test_suites` is capped at 10 batches per session (`TESSANA_MAX_RUNS_PER_SESSION`).

## Skills

Claude uses these automatically when a request matches (e.g. "run Tessana suite 34 and tell me what failed", or "write Tessana tests for the signup flow and put them in a suite"), or invoke them directly:

- `/tessana:setup`: check the connection and help fix a missing or wrong API key
- `/tessana:run 34 36 [--no-wait]`: queue suites, wait in the background, drill into failures
- `/tessana:batch-results <run_batch_id>`: batch status table
- `/tessana:test-results <testrun_id>`: per-test results with screenshot/video URLs
- `/tessana:test-info <ui_test_id or title> [--runs] [--gen] [--actions]`: a test's definition, run history and generation history
- `/tessana:create-test <what to test> [--project <id>] [--url <url>]`: draft tests from a description or the code in context, confirm, then create them
- `/tessana:edit-test <ui_test_id or title> <what to change>`: change a test's title, instructions, start URL/mode or tags
- `/tessana:create-test-suite <name> [test_id ...] [--platform <p>] [--run]`: group tests into a runnable suite

## Setup

Requires Node 18+. Install:

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```

Claude Code asks for your Tessana API key when you install the plugin and keeps it in secure storage. If you don't have a key, request one from hello@tessanaai.com. To change the key later, open `/plugin`, select the tessana plugin and update its API key, then restart Claude Code. Run `/tessana:setup` to check the connection.

`TESSANA_BASE_URL` overrides the default server, `https://app.tessanaai.com`.

## Using Tessana in Claude Code cloud sessions

In cloud sessions (claude.ai/code, the mobile app, and cloud mode in the desktop app) there is no `/plugin` menu. Run `/tessana:setup` instead. It opens a secure form where you enter your Tessana API key. The key is not shown to Claude. It is stored as a network secret on that cloud environment, and the environment's proxy adds it to requests sent to app.tessanaai.com. If the environment is shared with your organization, everyone who uses that environment will use the same key.

## Data and privacy

- **What is sent.** When you use a tool, the plugin sends the request to the Tessana API at `https://app.tessanaai.com`, with your API key in the `Authorization` header. In a cloud session the plugin sends a placeholder instead, and the session's proxy replaces it with the key saved for app.tessanaai.com. Requests contain what that tool needs: project, test, suite, run and batch IDs, and, when you create or change tests and suites, their titles, objectives, steps, URLs, tags and other settings. No source code is uploaded unless you put it in one of those fields.
- **What comes back.** Results can include links to screenshots, audio and video recordings of test runs. These are hosted by Tessana. The plugin passes the links to Claude and does not download them.
- **Another server.** If you set `TESSANA_BASE_URL`, the plugin sends everything to that Tessana server instead.
- **Where the key is kept.** On your own computer, in Claude Code's secure storage. In a cloud session, as a network secret on that cloud environment, shared by everyone who uses the environment.
- **Keychain fallback.** If no API key is set in the plugin settings, the plugin reads one from the macOS Keychain or Linux libsecret (service `tessana`, account `api-key`), if one is stored there. This is for people who set up an earlier version. It only reads that one entry and never writes to the keychain.
- **In the background.** `/tessana:run` waits for a run to finish by having a background Claude subagent call the `wait_for_batch` tool. The local MCP server then checks the batch status with the Tessana API every 15 seconds, for up to 30 minutes. It does not start a separate script, and the API key stays inside the MCP server.
- **Nothing else.** The plugin does not send data anywhere other than the Tessana server, collects no analytics, and writes no files. It has no third-party dependencies: the server uses only Node.js built-in modules.
- **Approvals and limits.** Starting a run, and creating or changing tests or suites, always asks for your approval. Runs are capped per session.
