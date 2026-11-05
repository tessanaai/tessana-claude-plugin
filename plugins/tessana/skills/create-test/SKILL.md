---
name: create-test
description: Create Tessana UI tests from a description, user story, acceptance criteria, or the code being worked on. Use when the user asks to create, write, add or generate a Tessana test or test case, or to cover a flow or feature with a Tessana test.
argument-hint: <what to test> [--project <project_id>] [--url <start-url>]
allowed-tools: mcp__plugin_tessana_tessana__list_projects, mcp__plugin_tessana_tessana__list_tests
---

Create Tessana tests. Arguments: `$ARGUMENTS`

1. **Project.** Use `--project` if given. Otherwise call `list_projects`: if there is exactly one, use it; if several, show them (id and name) and ask which one, then stop.
2. **What to test.** Work out the flow(s) from the arguments, the user's request, and any code or spec in context. If it is unclear what the user wants covered, ask one short question and stop. One test should cover one user goal; split a request covering several goals into several tests.
3. **Draft each test** with:
   - `title`: short and specific, e.g. "Checkout with saved card".
   - Either `objective` or `steps`, never both:
     - `objective` (default): the goal in plain language plus how to tell it succeeded, e.g. "Add any in-stock item to the cart and complete checkout with the saved Visa card. Success: the order confirmation page shows an order number." The Tessana agent works out the clicks.
     - `steps`: only when the user gave an exact sequence or the order matters. One action per step, e.g. `["Click 'Sign in'", "Enter [[login_email]] in Email", ...]`.
   - `url`: the start page, from `--url`, the request, or the app's config. Ask if a web test has no start URL.
   - `tags`: only if the user asked for them.
   Never put real passwords, tokens or other secrets in a test. Use content variables instead (`[[variable_name]]`), and tell the user to define them in the Tessana project.
4. **Avoid duplicates.** Call `list_tests` with `search` set to a key word from each title. If a close match exists, show it and ask whether to still create the new one.
5. **Confirm.** Show the drafted test(s) (title, objective or numbered steps, URL, tags) and the project, and ask the user to confirm or edit. Skip this only if they already said to go ahead without review.
6. **Create.** Call `create_test` once per test. Report each `ui_test_id` with its title, or the error body if a call failed.
7. **Next step.** Offer `/tessana:create-test-suite` to put the new tests in a suite so they can be run with `/tessana:run`.
