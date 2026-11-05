---
name: test-info
description: Show a Tessana test's full definition, its run history, and its test-generation history. Use when the user asks what a Tessana test does, for its objective, steps, success criteria or settings, how often it has passed or failed, when it last ran, or how its generation attempts went.
argument-hint: <ui_test_id or title> [--runs] [--gen] [--actions] [--project <project_id>]
allowed-tools: mcp__plugin_tessana_tessana__list_projects, mcp__plugin_tessana_tessana__list_tests, mcp__plugin_tessana_tessana__get_test_details, mcp__plugin_tessana_tessana__get_test_run_history, mcp__plugin_tessana_tessana__get_test_gen_history, mcp__plugin_tessana_tessana__get_test_results
---

Show a Tessana test. Arguments: `$ARGUMENTS`

1. **Find the test.** If given a numeric ID, use it. If given a title or description, pick the project (from `--project`, or `list_projects`: use it if there is exactly one, otherwise ask), then call `list_tests` with `search`. If several tests match, list them and ask which one, then stop. "The latest test" means the first result of `list_tests` (newest first).
2. **Definition.** Call `get_test_details`. Show the title, URL, and the objective (or numbered steps when `is_prescribe` is true), then tags, success criteria (group operator and each criterion), platforms with working generated actions, and whether it logs in (`login_email`; say only whether a password is set).
3. **Run history** (always summarize; show the full table with `--runs` or when the user asked about runs): call `get_test_run_history`. Summarize the pass rate over the returned runs, the last run's status and time, and any streak of failures. The table has `test_run_id`, platform, `test_status`, start time, duration, retry number. For a failed run the user asks about, call `get_test_results` with its `test_run_id` for screenshots and recordings.
4. **Generation history** (with `--gen`, `--actions`, or when the user asked about generation): call `get_test_gen_history`, with `include_actions: true` for `--actions` or when the user asked for the generated steps. Show each attempt's status, platform, time, and which is the default. When showing actions, list the steps of the default attempt (or the newest successful one) in order.
5. Keep the output compact: lead with the answer to what the user asked, then the details.
