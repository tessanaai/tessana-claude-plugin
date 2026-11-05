---
name: edit-test
description: Edit an existing Tessana test: change its title, objective or steps, start URL, start mode, or tags. Use when the user asks to edit, update, change, fix, rename or retag a Tessana test, or to change where it starts.
argument-hint: <ui_test_id or title> <what to change>
allowed-tools: mcp__plugin_tessana_tessana__list_projects, mcp__plugin_tessana_tessana__list_tests, mcp__plugin_tessana_tessana__get_test_details
---

Edit a Tessana test. Arguments: `$ARGUMENTS`

1. **Find the test.** Use a numeric ID if given. Otherwise pick the project (`--project`, or `list_projects`: use it if there is only one, otherwise ask) and call `list_tests` with `search`. If several tests match, list them and ask which one, then stop.
2. **Read it.** Call `get_test_details` so the change starts from what is stored now.
3. **Work out the change.** Only fields the user wants changed go in the update; everything else stays as it is.
   - Instructions: pass `objective` (plain-language goal and how to tell it succeeded) or `steps` (ordered list), not both. For a small change, edit the stored text rather than rewriting it.
   - Start: `url` plus `app_mode`. Use `custom_url` to open the test's own URL; `auto` opens the project's configured app instead and ignores the test's URL. If the test has a URL but `app_mode` is `auto`, point this out: it probably isn't starting where the user expects.
   - `tags` replaces the whole tag set, so include the tags to keep.
   - Never put real passwords, tokens or other secrets in a test; use `[[content_variables]]`. Success criteria and login settings can't be changed through the API: tell the user to change those in the web app.
4. **Confirm.** Show each changed field as before → after and ask the user to confirm. Skip this only if they already said to go ahead without review.
5. **Update.** Call `update_test` with `ui_test_id` and only the changed fields. Report the `updated` list, or the error body if it failed.
6. If the objective or steps changed, mention that existing generated actions were made from the old text; the next generation or self-heal uses the new text.
