---
name: create-test-suite
description: Create a Tessana test suite from existing tests so they can be run together. Use when the user asks to create, build or make a Tessana test suite, group Tessana tests into a suite, or set up tests so they can be run with /tessana:run.
argument-hint: <suite name> [test_id ...] [--project <project_id>] [--platform desktop|mobile_web|android_app|ios_app] [--run]
allowed-tools: mcp__plugin_tessana_tessana__list_projects, mcp__plugin_tessana_tessana__list_tests
---

Create a Tessana test suite. Arguments: `$ARGUMENTS`

1. **Project.** Use `--project` if given. Otherwise call `list_projects`: if there is exactly one, use it; if several, show them and ask which one, then stop.
2. **Tests.** Use test IDs from the arguments or ones created earlier in this conversation. If the user described the tests instead ("all the checkout tests"), call `list_tests` (with `search` where it helps) and pick the matches. If no tests match or exist yet, offer `/tessana:create-test` first and stop.
3. **Order.** Tests run in the order given. Put setup tests (sign up, log in, seed data) first and cleanup tests last. With the default `continuous` behavior, browser state such as a logged-in session carries over to the next test; use `behavior_after_test: fresh_instance` only if the user wants each test isolated.
4. **Details.**
   - `name`: from the arguments, or a short name that describes the group of tests.
   - `platform`: `--platform`, else `desktop`. All tests in the suite run on this platform.
   - `description`, `environment` and `tags`: only if the user gave them.
5. **Confirm.** Show the suite name, project, platform and the ordered list of tests (ID and title), and ask the user to confirm or reorder. Skip this only if they already said to go ahead without review.
6. **Create.** Call `create_test_suite`. If it returns `missing_test_ids`, those tests are not in the project or are archived: say so and ask how to proceed.
7. **Report** the `test_suite_id` and the `test_suite_config_id`. Explain that the config ID is what `/tessana:run` takes, and that the suite is on-demand only (no schedule; schedules can be added in the Tessana web app).
8. If `--run` was passed, or the user asked to run it, continue with `/tessana:run <test_suite_config_id>`. Otherwise offer that command.
