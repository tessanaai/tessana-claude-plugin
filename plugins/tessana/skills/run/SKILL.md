---
name: run
description: Run Tessana test suites and report the results. Use when the user asks to run, kick off, trigger or execute Tessana tests or test suites (by suite ID), or to run tests and report what failed.
argument-hint: <suite-id> [suite-id ...] [--no-wait]
allowed-tools: mcp__plugin_tessana_tessana__wait_for_batch, mcp__plugin_tessana_tessana__get_batch_run_results, mcp__plugin_tessana_tessana__get_test_results
---

Run Tessana test suites. Arguments: `$ARGUMENTS`

1. Collect the test suite IDs from the arguments or the user's request. If there are none, ask the user which suite IDs to run and stop.
2. Call `run_test_suites` with `ids` set to those integers. Report the `run_batch_id`, or the error body if the call failed.
3. With `--no-wait`, tell the user they can check later with `/tessana:batch-results <run_batch_id>` and stop.
4. Otherwise, wait for the batch without blocking the user. Start a **background** subagent (Agent tool with `run_in_background: true`) and give it this task: "Call the Tessana MCP tool `wait_for_batch` with run_batch_id <run_batch_id> and timeout_seconds 600. If it says the batch is still running, call it again, up to 3 calls in total (30 minutes). Then report the last result text exactly, and whether the batch finished." Tell the user the run is in progress and that they can keep working. Do not wait or poll yourself while the subagent runs.
   If you can't start a background subagent, call `wait_for_batch` yourself (same limits) and tell the user they can stop waiting at any time and check later with `/tessana:batch-results <run_batch_id>`.
   Do not use Bash to wait or poll. The API key is only available to the Tessana MCP server.
5. When the wait ends, read the result. If the batch is still running after 30 minutes, say so and suggest `/tessana:batch-results <run_batch_id>` later. If `wait_for_batch` returned an error (for example HTTP 401), show it and suggest `/tessana:setup`.
6. Show a table of `testrun_id`, `run_status`, `status`, start and end time. For each run whose `status` is not `Success`, call `get_test_results` and list the failing tests with title, objective, status and first screenshot/video URL.
