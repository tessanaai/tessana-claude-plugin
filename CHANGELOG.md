# Changelog

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
