---
name: test-results
description: Show per-test results, screenshots and recordings for a Tessana test run. Use when the user asks why a Tessana test run failed, for the results of a testrun_id, or for its screenshots, audio or video recordings.
argument-hint: <testrun_id>
allowed-tools: mcp__plugin_tessana_tessana__get_test_results
---

Show Tessana test results. Arguments: `$ARGUMENTS`

1. Get `testrun_id` from the arguments or the user's request. If missing, ask for it and stop.
2. Call `get_test_results`. For each test show `ui_test_id`, `title`, `objective`, `status`, the number of screenshots, and the audio/video URLs.
3. List failed, canceled or terminated tests first. If any test is still Running, Pending or Paused, say the run is not finished.
