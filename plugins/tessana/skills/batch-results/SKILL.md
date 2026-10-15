---
name: batch-results
description: Show the status of every test run in a Tessana batch. Use when the user asks for the status or results of a Tessana run batch, a run_batch_id, or whether a batch of Tessana tests has finished or passed.
argument-hint: <run_batch_id>
allowed-tools: mcp__plugin_tessana_tessana__get_batch_run_results, mcp__plugin_tessana_tessana__get_test_results
---

Show Tessana batch results. Arguments: `$ARGUMENTS`

1. Get `run_batch_id` from the arguments or the user's request. If missing, ask for it and stop.
2. Call `get_batch_run_results`. Show a table of `testrun_id`, `run_status`, `status`, `start_time`, `end_time`.
3. Summarize: total runs, passed, failed, still running (`status` null). If any are still running, say the batch is not finished.
4. For failed runs, offer `/tessana:test-results <testrun_id>` for details.
