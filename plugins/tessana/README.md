# Tessana plugin for Claude Code

Create, edit, inspect and run [Tessana](https://tessanaai.com) end-to-end tests and test suites from Claude Code, and get results, screenshots and recordings back in your session. The plugin connects Claude Code to Tessana's hosted MCP server at `https://mcp.tessanaai.com/mcp`, which uses the [Tessana API](https://funky-summer-98a.notion.site/Tessana-API-Reference-Documents-7f5731d4a58044dc94fdba752d70b064). You sign in with your Tessana account.

## MCP tools

| Tool | What it does | Input |
|------|--------------|-------|
| `check_connection` | Checks that Tessana is reachable and your sign-in works | none |
| `run_test_suites` | Starts runs of one or more test suites | `ids: int[]` |
| `get_batch_run_results` | Status of every run in a batch | `run_batch_id: int` |
| `wait_for_batch` | Waits for a batch to finish, for up to 90 seconds per call; call again to keep waiting | `run_batch_id: int`, `timeout_seconds?: int` (default and max 90) |
| `get_test_results` | Per-test results, screenshots and recordings for a run | `testrun_id: int` |
| `list_projects` | Projects you can access | none |
| `list_tests` | Tests in a project, newest first | `project_id: int`, `search?: string` |
| `create_test` | Creates a test | `project_id: int`, `title: string`, `objective: string` or `steps: string[]`, `url?`, `app_mode?`, `tags?: string[]` |
| `update_test` | Changes a test | `ui_test_id: int` and any of `title`, `objective` or `steps`, `url`, `app_mode`, `tags` (replaces all) |
| `get_test_details` | A test's full definition | `ui_test_id: int` |
| `get_test_run_history` | A test's past runs | `ui_test_id: int`, `limit?: int` |
| `get_test_gen_history` | A test's generation attempts | `ui_test_id: int`, `platform?`, `include_actions?: bool`, `limit?: int` |
| `create_test_suite` | Groups tests into a runnable suite | `project_id: int`, `name: string`, `test_ids: int[]`, `platform?`, `behavior_after_test?`, `description?`, `environment?`, `tags?: string[]` |

`create_test_suite` returns a `test_suite_config_id`, which is the ID `run_test_suites` takes.

## Skills

Claude uses these automatically when a request matches (e.g. "run Tessana suite 34 and tell me what failed", or "write Tessana tests for the signup flow and put them in a suite"), or invoke them directly:

- `/tessana:setup`: connect your Tessana account and check the connection
- `/tessana:run 34 36 [--no-wait]`: queue suites, wait in the background, drill into failures
- `/tessana:batch-results <run_batch_id>`: batch status table
- `/tessana:test-results <testrun_id>`: per-test results with screenshot/video URLs
- `/tessana:test-info <ui_test_id or title> [--runs] [--gen] [--actions]`: a test's definition, run history and generation history
- `/tessana:create-test <what to test> [--project <id>] [--url <url>]`: draft tests from a description or the code in context, confirm, then create them
- `/tessana:edit-test <ui_test_id or title> <what to change>`: change a test's title, instructions, start URL/mode or tags
- `/tessana:create-test-suite <name> [test_id ...] [--platform <p>] [--run]`: group tests into a runnable suite

## Setup

Install:

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```

Then connect your Tessana account:

1. Run `/mcp` in Claude Code.
2. Select the Tessana server (`plugin:tessana:tessana`) and choose **Authenticate**.
3. Sign in in the browser window that opens, with the same account you use at app.tessanaai.com, and allow access.

Run `/tessana:setup` to check the connection, or if you need to sign in again later. If you don't have a Tessana account, contact hello@tessanaai.com.

## Cloud sessions and claude.ai

Cloud sessions (claude.ai/code, the mobile app, and cloud mode in the desktop app) can't open a browser sign-in from inside the session. Add Tessana as a connector in your claude.ai settings (Connectors) with the URL `https://mcp.tessanaai.com/mcp`, sign in there, and start a new session.

## Data and privacy

- **Where data goes.** The plugin connects Claude Code to Tessana's hosted MCP server at `mcp.tessanaai.com`, which calls the Tessana API at `app.tessanaai.com`. Requests contain what each tool needs: project, test, suite, run and batch IDs, and, when you create or change tests and suites, their titles, objectives, steps, URLs, tags and other settings. No source code is uploaded unless you put it in one of those fields.
- **Access.** Access comes from your Tessana sign-in. The server can only see and change what your Tessana account can. You can sign out at any time from `/mcp` (**Clear authentication**). There is no API key to create, store or rotate.
- **Nothing runs on your computer.** The plugin is a set of skills and a pointer to the hosted server. It installs no local server, scripts or hooks, and writes no files.
- **What comes back.** Results can include links to screenshots, audio and video recordings of test runs. These are hosted by Tessana. Claude gets the links; the plugin does not download them.
- **Retention.** Tessana keeps your tests, suites and run history (including screenshots and recordings) until you delete them.
- **Approvals.** Claude Code asks for your approval before starting a run or creating or changing tests or suites, unless you have allowed those tools.
