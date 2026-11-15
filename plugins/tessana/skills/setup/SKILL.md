---
name: setup
description: Connect Claude Code to a Tessana account by signing in to the Tessana MCP server, then check the connection. Use when the user wants to set up, connect, sign in to or configure Tessana, or when Tessana calls fail because the user is not signed in or their sign-in was rejected.
allowed-tools: mcp__plugin_tessana_tessana__check_connection
---

Connect the user's Tessana account. The plugin talks to Tessana's hosted MCP server at https://mcp.tessanaai.com/mcp, and the user signs in with their Tessana account. Nothing is stored in this project and nothing runs on the user's computer.

1. Call `check_connection`. If it succeeds, tell the user Tessana is connected, suggest a first run (step 5) and stop.
2. If the Tessana tools are not available, or `check_connection` fails because the user is not signed in (or their sign-in expired or was rejected), tell them how to sign in:
   1. Run `/mcp` in Claude Code.
   2. Select the Tessana server (listed as `plugin:tessana:tessana`).
   3. Choose **Authenticate** (or **Re-authenticate** if it was signed in before).
   4. A browser window opens. Sign in with the same account they use for the Tessana web app at app.tessanaai.com, and allow access.
   5. Come back to Claude Code. The server shows as connected in `/mcp`.
   If the Tessana server is not listed in `/mcp`, the plugin may be disabled: they can turn it on in `/plugin`.
3. In a Claude Code cloud session or on claude.ai, there is no browser sign-in from inside the session. Tell the user to add Tessana as a connector in their claude.ai settings (Connectors), with the URL `https://mcp.tessanaai.com/mcp`, sign in there, and then start a new session.
4. If they don't have a Tessana account yet, tell them to contact hello@tessanaai.com. Never ask the user to paste a password or token into this chat.
5. When they say they've signed in, call `check_connection` again and report the result. If it still fails, show the error and suggest signing in again from `/mcp`, or checking their network if Tessana could not be reached. Once connected, suggest a first run: `/tessana:run <suite-id>`. Suite IDs are shown on the Scheduled Configs page in the Tessana web app.
