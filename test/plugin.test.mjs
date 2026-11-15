// Checks the plugin's manifests and skills. Usage: node --test
// The MCP server is hosted by Tessana at https://mcp.tessanaai.com/mcp, so nothing here runs a server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const PLUGIN_DIR = fileURLToPath(new URL('../plugins/tessana/', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(PLUGIN_DIR + rel, 'utf8'));

// The tools the hosted server offers. The skills refer to them as mcp__plugin_tessana_tessana__<name>.
const TOOLS = [
  'check_connection',
  'run_test_suites',
  'get_batch_run_results',
  'wait_for_batch',
  'get_test_results',
  'list_projects',
  'list_tests',
  'create_test',
  'update_test',
  'create_test_suite',
  'get_test_details',
  'get_test_run_history',
  'get_test_gen_history',
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const skills = readdirSync(PLUGIN_DIR + 'skills').map((name) => ({
  name,
  text: readFileSync(`${PLUGIN_DIR}skills/${name}/SKILL.md`, 'utf8'),
}));

test('.mcp.json points the tessana server at the hosted endpoint', () => {
  const { mcpServers } = readJson('.mcp.json');
  assert.deepEqual(Object.keys(mcpServers), ['tessana']);
  assert.deepEqual(mcpServers.tessana, { type: 'http', url: 'https://mcp.tessanaai.com/mcp' });
});

test('plugin.json has no API key option and has the directory URLs', () => {
  const m = readJson('.claude-plugin/plugin.json');
  assert.equal(m.name, 'tessana');
  assert.match(m.version, /^\d+\.\d+\.\d+$/);
  assert.equal(m.userConfig, undefined);
  for (const key of ['homepage', 'privacyPolicyUrl', 'supportUrl']) assert.match(m[key], /^https:\/\//, key);
});

test('the changelog has an entry for the current version', () => {
  const { version } = readJson('.claude-plugin/plugin.json');
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.match(changelog, new RegExp(`^## ${version.replace(/\./g, '\\.')}$`, 'm'));
});

test('the plugin ships no code that runs on the user\'s computer', () => {
  const shipped = files(PLUGIN_DIR).map((p) => relative(PLUGIN_DIR, p));
  const code = shipped.filter((p) => /\.(m?js|cjs|ts|py|sh|bash|zsh|ps1|rb|exe)$/i.test(p) || p.startsWith('hooks/') || p.startsWith('bin/'));
  assert.deepEqual(code, []);
  const { mcpServers } = readJson('.mcp.json');
  for (const s of Object.values(mcpServers)) assert.equal(s.command, undefined);
});

test('skills only use tools the server offers', () => {
  for (const { name, text } of skills) {
    for (const [, tool] of text.matchAll(/mcp__plugin_tessana_tessana__(\w+)/g))
      assert.ok(TOOLS.includes(tool), `${name} uses unknown tool ${tool}`);
  }
});

test('skills do not mention API keys, env vars or the local server', () => {
  const banned = /api[ _-]?key|request_credential|keychain|local (MCP )?server|server\/index|user_config/i;
  const envVar = /\b(TESSANA_[A-Z_]+|NODE_USE_ENV_PROXY)\b/;
  for (const { name, text } of skills) {
    assert.doesNotMatch(text, banned, name);
    assert.doesNotMatch(text, envVar, name);
  }
});

test('setup has the user sign in and then checks the connection', () => {
  const setup = skills.find((s) => s.name === 'setup').text;
  assert.match(setup, /\/mcp/);
  assert.match(setup, /allowed-tools: mcp__plugin_tessana_tessana__check_connection\n/);
});

test('run keeps calling wait_for_batch for up to 30 minutes', () => {
  const run = skills.find((s) => s.name === 'run').text;
  assert.match(run, /wait_for_batch/);
  assert.match(run, /30 minutes/);
  assert.doesNotMatch(run, /timeout_seconds 600/);
});
