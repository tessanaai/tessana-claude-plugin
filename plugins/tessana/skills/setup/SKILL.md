---
name: setup
description: Check that Claude Code is connected to a Tessana account and help fix a missing or rejected API key. Use when the user wants to set up, connect, sign in to or configure Tessana, or when Tessana calls fail because the API key is missing or rejected.
allowed-tools: mcp__plugin_tessana_tessana__check_connection
---

Check the Tessana connection. Claude Code asks for the Tessana API key when the plugin is installed and stores it in secure storage, so usually there is nothing to set up.

1. Call `check_connection`. If it succeeds, tell the user Tessana is connected, suggest a first run (step 6) and stop.
2. Never ask the user to paste their API key into this chat. If they paste one anyway, do not repeat it, and tell them to rotate it in Tessana.
3. If they don't have a key yet, tell them to request one from hello@tessanaai.com.
4. If the key is missing ("No Tessana API key found") or rejected ("API key was rejected"), tell them to enter or replace it in the plugin settings: run `/plugin`, select the tessana plugin, and set its API key. Then restart Claude Code so the Tessana server picks up the new key. If no settings option is shown, they can uninstall and reinstall the plugin, which asks for the key again.
5. If the error says Tessana could not be reached, or shows an unexpected response, show the error. Suggest checking their network, and `TESSANA_BASE_URL` if they set it to use a different Tessana server.
6. When they say it's done, call `check_connection` again and report the result. Once connected, suggest a first run: `/tessana:run <suite-id>`. Suite IDs are shown on the Scheduled Configs page in the Tessana web app.

Optional fallback: if the API key setting is left empty, the plugin also looks for a key in the OS keychain (service `tessana`, account `api-key`). Only mention this if the user asks for it or already stores the key there. They add it **in a separate terminal**, which prompts for the key so it stays out of the chat and shell history:
- macOS: `security add-generic-password -U -s tessana -a api-key -w`
- Linux (libsecret): `secret-tool store --label="Tessana API key" service tessana account api-key`
