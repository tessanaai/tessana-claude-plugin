---
name: run
description: Run Tessana test suites and report the results. Use when the user asks to run, kick off, trigger or execute Tessana tests or test suites (by suite ID), or to run tests and report what failed.
argument-hint: <suite-id> [suite-id ...] [--no-wait]
allowed-tools: mcp__plugin_tessana_tessana__get_batch_run_results, mcp__plugin_tessana_tessana__get_test_results
---

Run Tessana test suites. Arguments: `$ARGUMENTS`

1. Collect the test suite IDs from the arguments or the user's request. If there are none, ask the user which suite IDs to run and stop.
2. Call `run_test_suites` with `ids` set to those integers. Report the `run_batch_id`, or the error body if the call failed.
3. Unless `--no-wait` was passed, start the poller as a **background** Bash task (`run_in_background: true`) so the session is never blocked:
   `node "${CLAUDE_PLUGIN_ROOT}/server/wait-for-batch.mjs" <run_batch_id>`
   Tell the user the run is in progress and that they can keep working. Do not poll or sleep yourself.
4. When the background task exits, read its output. Exit code 0 = all passed, 1 = some failed, 2 = still running at the 30-minute timeout, 3 = error.
5. Show a table of `testrun_id`, `run_status`, `status`, start and end time. For each run whose `status` is not `Success`, call `get_test_results` and list the failing tests with title, objective, status and first screenshot/video URL.
6. With `--no-wait`, tell the user they can check later with `/tessana:batch-results <run_batch_id>`.
