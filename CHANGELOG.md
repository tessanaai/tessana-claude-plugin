# Changelog

## 0.6.1

- `/tessana:setup` in a cloud session now tells you to keep **Bearer token** selected in the secure form, since Tessana does not accept a username and password. If the key is still rejected after saving, it opens the form again so you can save it as a bearer token.
- README: the same note in the cloud sessions section.

## 0.6.0

- Works in Claude Code cloud sessions. With no key set there, the server sends a placeholder that the session's proxy replaces with the key saved for app.tessanaai.com. `.mcp.json` sets `NODE_USE_ENV_PROXY=1` so Node sends requests through the proxy.
- `/tessana:setup` in a cloud session opens a secure form to save the key as a network secret, instead of pointing to `/plugin`.
- In cloud sessions, a rejected or missing key says to run `/tessana:setup`. Messages on your own computer are unchanged.

## 0.5.1

- The API key is now asked for when the plugin is installed (a sensitive `api_key` plugin option kept in Claude Code's secure storage) instead of being read from `TESSANA_API_KEY` in your shell. The OS keychain is still read as a fallback for existing installs.
- MCP tool: `wait_for_batch` waits inside the MCP server until a batch finishes. `/tessana:run` now uses it from a background subagent instead of running `server/wait-for-batch.mjs` through Bash, which has been removed.
- `/tessana:setup` now checks the connection and explains how to fix a missing or rejected key.
- README: "Data and privacy" section; no more shell examples that export the API key.
- Homepage is now https://tessanaai.com.

## 0.5.0

- Skill: `edit-test`.
- MCP tool: `update_test` (backed by the new `/update_test` endpoint): change a test's title, objective or steps, url, start mode and tags.
- `create_test` takes `app_mode`. The API now defaults it to `custom_url` when a url is given, so tests start at their own url (previously `auto`, which ignores the url).

## 0.4.0

- Skill: `test-info` (a test's definition, run history and generation history).
- MCP tools: `get_test_details`, `get_test_run_history`, `get_test_gen_history` (backed by the new `/get_test_details`, `/get_test_run_history` and `/get_test_gen_history` API endpoints). Stored login passwords are never returned.
- `create-test` can base a new test on an existing one.

## 0.3.0

- Skills: `create-test`, `create-test-suite`.
- MCP tools: `list_projects`, `list_tests`, `create_test`, `create_test_suite` (backed by the new `/get_projects`, `/get_tests`, `/create_test` and `/create_test_suite` API endpoints).
- `create_test_suite` returns a `test_suite_config_id` that can be passed straight to `run_test_suites`.

## 0.2.0

- Skills: `setup`, `run`, `batch-results`, `test-results`.
- MCP tools: `check_connection`, `run_test_suites`, `get_batch_run_results`, `get_test_results`.
- API key from `TESSANA_API_KEY` or the OS keychain.
- Runs wait in the background; starting a run requires approval and is capped per session.
