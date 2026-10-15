# Tessana for Claude Code

Run [Tessana](https://tessanaai.com) end-to-end test suites from Claude Code and get the results, screenshots and recordings back in your session.

## Install

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```

Then run `/tessana:setup` to connect your Tessana API key. See [plugins/tessana/README.md](plugins/tessana/README.md) for the full list of skills and tools.

## Security and privacy

- Your API key is read from the `TESSANA_API_KEY` environment variable or your OS keychain. It is never written to the repo or sent to Claude.
- The plugin sends only suite and run IDs to the Tessana API. No source code leaves your machine.
- Starting a test run always asks for your approval, and runs are capped per session.

## Development

Requires Node 18+.

```sh
node --test                                   # tests against a mock Tessana API
claude plugin validate . && claude plugin validate plugins/tessana
claude --plugin-dir ./plugins/tessana         # try local changes without installing
```
