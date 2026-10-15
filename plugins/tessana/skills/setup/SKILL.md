---
name: setup
description: Connect Claude Code to a Tessana account by storing the API key securely and checking the connection. Use when the user wants to set up, connect, sign in to or configure Tessana, or when Tessana calls fail because the API key is missing or rejected.
allowed-tools: mcp__plugin_tessana_tessana__check_connection
---

Set up the Tessana connection.

1. Call `check_connection`. If it succeeds, tell the user Tessana is already connected and stop.
2. Never ask the user to paste their API key into this chat. If they paste one anyway, do not repeat it, and tell them to rotate it in Tessana.
3. If they don't have a key yet, tell them to request one from hello@tessanaai.com.
4. Tell them to store the key in their OS keychain by running this **in a separate terminal** (it prompts for the key, so it stays out of the chat and shell history):
   - macOS: `security add-generic-password -U -s tessana -a api-key -w`
   - Linux (libsecret): `secret-tool store --label="Tessana API key" service tessana account api-key`
   - Windows (WSL) or anything else: add `export TESSANA_API_KEY=...` to their shell profile, then restart Claude Code.
5. When they say it's done, call `check_connection` again and report the result. If it still fails, show the error and suggest checking the key or `TESSANA_BASE_URL`.
6. Once connected, suggest a first run: `/tessana:run <suite-id>`. Suite IDs are shown on the Scheduled Configs page in the Tessana web app.
