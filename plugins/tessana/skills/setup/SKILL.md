---
name: setup
description: Check that Claude Code is connected to a Tessana account and help fix a missing or rejected API key. Use when the user wants to set up, connect, sign in to or configure Tessana, or when Tessana calls fail because the API key is missing or rejected.
allowed-tools: mcp__plugin_tessana_tessana__check_connection, mcp__claude-code-remote__request_credential
---

Check the Tessana connection. On the user's own computer, Claude Code asks for the Tessana API key when the plugin is installed. In a Claude Code cloud session, the key is saved as a network secret for app.tessanaai.com instead.

1. Call `check_connection`. If it succeeds, tell the user Tessana is connected, suggest a first run (step 7) and stop.
2. Never ask the user to paste their API key into this chat. If they paste one anyway, do not repeat it, and tell them to rotate it in Tessana.
3. If they don't have a key yet, tell them to request one from hello@tessanaai.com.
4. **Cloud session** (a `request_credential` tool is available): if the key is missing or rejected ("No valid Tessana API key for this cloud session"), say in one line that you're opening a secure form to save the Tessana API key for app.tessanaai.com, and that they should keep **Bearer token** selected and paste the key into **Token** (Tessana does not accept a username and password). Call `request_credential` with host `app.tessanaai.com`, suggested_type `bearer`, display_name `Tessana API key`, and a short reason such as "The Tessana plugin needs your API key to call the Tessana API." Do not set header_name or prefix.
   - When the result says `saved`, call `check_connection` again. If it still fails with a rejected key, wait about a minute and try once more, because the proxy can take a moment to pick up the key.
   - If it still fails after that, tell them they may have chosen **Username and password**, or the key may be wrong. Call `request_credential` again with the same values, so they can save the key as a **Bearer token**. Do this once; if it still fails, suggest checking the key with hello@tessanaai.com.
   - If the user declines the form, tell them they can add the key in the environment's settings, under network secrets for app.tessanaai.com.
   - In a cloud session, never tell the user to run `/plugin` or restart Claude Code.
5. **Own computer** (no `request_credential` tool): if the key is missing ("No Tessana API key found") or rejected ("API key was rejected"), tell them to enter or replace it in the plugin settings: run `/plugin`, select the tessana plugin, and set its API key. Then restart Claude Code so the Tessana server picks up the new key. If no settings option is shown, they can uninstall and reinstall the plugin, which asks for the key again.
6. If the error says Tessana could not be reached, or shows an unexpected response, show the error. Suggest checking their network, and `TESSANA_BASE_URL` if they set it to use a different Tessana server.
7. When they say it's done, call `check_connection` again and report the result. Once connected, suggest a first run: `/tessana:run <suite-id>`. Suite IDs are shown on the Scheduled Configs page in the Tessana web app.

Optional fallback on their own computer: if the API key setting is left empty, the plugin also looks for a key in the OS keychain (service `tessana`, account `api-key`). Only mention this if the user asks for it or already stores the key there. They add it **in a separate terminal**, which prompts for the key so it stays out of the chat and shell history:
- macOS: `security add-generic-password -U -s tessana -a api-key -w`
- Linux (libsecret): `secret-tool store --label="Tessana API key" service tessana account api-key`
