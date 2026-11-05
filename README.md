# Tessana for Claude Code

Create and run [Tessana](https://tessanaai.com) end-to-end tests and test suites from Claude Code and get the results, screenshots and recordings back in your session.

## Install

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```

Claude Code asks for your Tessana API key during install (request one from hello@tessanaai.com). Run `/tessana:setup` to check the connection. See [plugins/tessana/README.md](plugins/tessana/README.md) for the full list of skills and tools.

## Security and privacy

- Your API key is entered when you install the plugin and kept in Claude Code's secure storage. It is only passed to the plugin's local MCP server, never written to the repo, and never shown to Claude.
- The plugin sends IDs, and the test titles, objectives/steps, URLs and tags you approve, only to the Tessana API. Results can include links to screenshots and recordings. No source code is uploaded.
- Creating tests or suites and starting a test run always ask for your approval, and runs are capped per session.

See [Data and privacy](plugins/tessana/README.md#data-and-privacy) for the full details.

## Development

Requires Node 18+.

```sh
node --test                                   # tests against a mock Tessana API
claude plugin validate . && claude plugin validate plugins/tessana
claude --plugin-dir ./plugins/tessana         # try local changes without installing
```

## License

[Apache-2.0](LICENSE). "Tessana" is a trademark of Tessana AI.
