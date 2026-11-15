# Tessana for Claude Code

Create and run [Tessana](https://tessanaai.com) end-to-end tests and test suites from Claude Code and get the results, screenshots and recordings back in your session.

## Install

```
/plugin marketplace add tessanaai/tessana-claude-plugin
/plugin install tessana@tessana
```

Then connect your Tessana account: run `/mcp`, select the Tessana server (`plugin:tessana:tessana`), choose **Authenticate**, and sign in with your Tessana account in the browser. Run `/tessana:setup` to check the connection. If you don't have a Tessana account, contact hello@tessanaai.com. See [plugins/tessana/README.md](plugins/tessana/README.md) for the full list of skills and tools.

## Security and privacy

- The plugin connects to Tessana's hosted MCP server at `mcp.tessanaai.com`, which calls the Tessana API at `app.tessanaai.com`. Nothing runs on your computer: the plugin contains only skills and the server address.
- Access comes from your Tessana sign-in. There is no API key to store, and the server can only see and change what your Tessana account can.
- The plugin sends IDs, and the test titles, objectives/steps, URLs and tags you approve. Results can include links to screenshots and recordings. No source code is uploaded.
- Tessana keeps your tests and run history until you delete them.
- Starting a run, and creating or changing tests or suites, asks for your approval unless you have allowed those tools. The hosted server allows each user up to 10 test runs per hour.

See [Data and privacy](plugins/tessana/README.md#data-and-privacy) for the full details, and Tessana's [privacy policy](https://app.tessanaai.com/privacy-policy). For help, go to [Tessana support](https://app.tessanaai.com/support).

## Development

```sh
node --test                                   # checks the manifests and skills (Node 18+)
claude plugin validate . && claude plugin validate plugins/tessana
claude --plugin-dir ./plugins/tessana         # try local changes without installing
```

## License

[Apache-2.0](LICENSE). "Tessana" is a trademark of Tessana AI.
