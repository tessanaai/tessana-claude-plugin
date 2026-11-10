// Runs the MCP server against a mock Tessana API. Usage: node --test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PLUGIN_DIR = fileURLToPath(new URL('../plugins/tessana/', import.meta.url));
const SERVER_DIR = PLUGIN_DIR + 'server/';
const readJson = (rel) => JSON.parse(readFileSync(PLUGIN_DIR + rel, 'utf8'));
const GOOD_KEY = 'good-key';

let api;
let baseUrl;
let batchPolls = 0;
let lastAuth;

before(async () => {
  api = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      lastAuth = req.headers.authorization;
      if (req.headers.authorization !== `Bearer ${GOOD_KEY}`) return send(401, { error: 'Authentication failed' });
      const body = raw ? JSON.parse(raw) : {};
      if (req.url === '/run_test_suites') {
        if (!body.ids) return send(400, { error: 'ids required' });
        if (body.ids[0] === 0) return send(500, { message: 'Failed to schedule Testrun' });
        return send(200, { run_batch_id: 99, echo: { method: req.method, body } });
      }
      if (req.url === '/get_batch_run_results') {
        batchPolls++;
        if (body.run_batch_id === 404) return send(404, { error: 'Batch not found' });
        const done = body.run_batch_id === 99 && batchPolls >= 2;
        return send(200, {
          results: [
            { testrun_id: 1, run_status: done ? 'Completed' : 'Active', status: done ? 'Success' : null },
            { testrun_id: 2, run_status: done ? 'Completed' : 'Active', status: done ? 'Failed' : null },
          ],
        });
      }
      if (req.url === '/get_test_results') return send(200, { results: [], echo: { method: req.method, body } });
      if (['/get_projects', '/get_tests', '/create_test', '/create_test_suite', '/get_test_details', '/get_test_run_history', '/get_test_gen_history', '/update_test'].includes(req.url))
        return send(req.method === 'POST' ? 201 : 200, { ok: true, echo: { method: req.method, body } });
      send(404, {});
    });
  });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${api.address().port}`;
});

after(() => api.close());

function env(extra) {
  // HOME is pointed away so a developer's real keychain entry can't leak into tests on Linux.
  return { PATH: process.env.PATH, HOME: '/nonexistent', TESSANA_BASE_URL: baseUrl, TESSANA_POLL_INTERVAL_MS: '50', ...extra };
}

// Sends JSON-RPC requests concurrently and collects responses by id.
async function mcp(extraEnv, requests) {
  const proc = spawn('node', [SERVER_DIR + 'index.mjs'], { env: env(extraEnv) });
  let out = '';
  proc.stdout.on('data', (d) => (out += d));
  const want = requests.filter((r) => r.id !== undefined).length;
  for (const r of requests) proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...r }) + '\n');
  const deadline = Date.now() + 5000;
  // Only responses (with an id) count; progress notifications are collected separately.
  const lines = () => out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  while (lines().filter((m) => m.id !== undefined).length < want && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 20));
  proc.kill();
  const msgs = lines();
  return {
    ...Object.fromEntries(msgs.filter((m) => m.id !== undefined).map((m) => [m.id, m])),
    notifications: msgs.filter((m) => m.id === undefined),
  };
}

const call = (id, name, args = {}) => ({ id, method: 'tools/call', params: { name, arguments: args } });
const text = (msg) => msg.result.content[0].text;
const responses = (r) => Object.values(r).filter((m) => m.id !== undefined);

test('initialize and list tools', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    { id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
  ]);
  assert.equal(r[1].result.serverInfo.name, 'tessana');
  assert.deepEqual(
    r[2].result.tools.map((t) => t.name),
    [
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
    ],
  );
});

test('requests use the right method, auth and JSON body', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'run_test_suites', { ids: [34, 36] }),
    call(2, 'get_test_results', { testrun_id: 7 }),
  ]);
  assert.equal(r[1].result.isError, false);
  assert.match(text(r[1]), /"method":"POST","body":\{"ids":\[34,36\]\}/);
  assert.match(text(r[2]), /"method":"GET","body":\{"testrun_id":7\}/);
});

test('rejects invalid input without calling the API', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'get_test_results', { testrun_id: 'x' }),
    call(2, 'run_test_suites', { ids: [] }),
  ]);
  assert.equal(text(r[1]), 'testrun_id must be an integer');
  assert.equal(text(r[2]), 'ids must be a non-empty array of integers');
});

test('authoring tools send only the fields given', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'list_projects'),
    call(2, 'list_tests', { project_id: 3 }),
    call(3, 'create_test', { project_id: 3, title: 'Login', objective: 'Log in', tags: ['smoke'] }),
    call(4, 'create_test', { project_id: 3, title: 'Buy', steps: ['Open shop', 'Click Buy'] }),
    call(5, 'create_test_suite', { project_id: 3, name: 'Smoke', test_ids: [5, 4], platform: 'mobile_web' }),
  ]);
  for (const m of responses(r)) assert.equal(m.result.isError, false, text(m));
  assert.match(text(r[1]), /"method":"GET","body":\{\}/);
  assert.match(text(r[2]), /"method":"GET","body":\{"project_id":3\}/);
  assert.match(text(r[3]), /HTTP 201/);
  assert.match(text(r[3]), /"body":\{"project_id":3,"title":"Login","objective":"Log in","tags":\["smoke"\]\}/);
  assert.match(text(r[4]), /"steps":\["Open shop","Click Buy"\]/);
  assert.match(text(r[5]), /"method":"POST","body":\{"project_id":3,"name":"Smoke","test_ids":\[5,4\],"platform":"mobile_web"\}/);
});

test('authoring tools reject invalid input without calling the API', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'create_test', { project_id: 3, title: 'x' }),
    call(2, 'create_test', { project_id: 3, title: 'x', objective: 'o', steps: ['s'] }),
    call(3, 'create_test', { title: 'x', objective: 'o' }),
    call(4, 'create_test_suite', { project_id: 3, name: 'S', test_ids: [] }),
    call(5, 'create_test_suite', { project_id: 3, name: 'S', test_ids: [1], platform: 'tv' }),
    call(6, 'create_test', { project_id: 3, title: 'x', steps: ['ok', ''] }),
  ]);
  assert.equal(text(r[1]), 'pass exactly one of objective or steps');
  assert.equal(text(r[2]), 'pass exactly one of objective or steps');
  assert.equal(text(r[3]), 'project_id is required');
  assert.equal(text(r[4]), 'test_ids must be a non-empty array of integers');
  assert.match(text(r[5]), /platform must be one of desktop/);
  assert.equal(text(r[6]), 'steps must be an array of non-empty strings');
});

test('read tools send the right query', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'get_test_details', { ui_test_id: 2826 }),
    call(2, 'get_test_run_history', { ui_test_id: 2826, limit: 5 }),
    call(3, 'get_test_gen_history', { ui_test_id: 2826, include_actions: true, platform: 'desktop' }),
    call(4, 'get_test_gen_history', { ui_test_id: 2826, include_actions: 'yes' }),
    call(5, 'get_test_details', {}),
  ]);
  assert.match(text(r[1]), /"method":"GET","body":\{"ui_test_id":2826\}/);
  assert.match(text(r[2]), /"body":\{"ui_test_id":2826,"limit":5\}/);
  assert.match(text(r[3]), /"body":\{"ui_test_id":2826,"platform":"desktop","include_actions":true\}/);
  assert.equal(text(r[4]), 'include_actions must be a boolean');
  assert.equal(text(r[5]), 'ui_test_id is required');
});

test('update_test sends only changed fields and rejects empty or conflicting updates', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'update_test', { ui_test_id: 2828, app_mode: 'custom_url' }),
    call(2, 'update_test', { ui_test_id: 2828 }),
    call(3, 'update_test', { ui_test_id: 2828, objective: 'o', steps: ['s'] }),
    call(4, 'update_test', { ui_test_id: 2828, app_mode: 'sideways' }),
    call(5, 'create_test', { project_id: 3, title: 'x', objective: 'o', url: 'https://a.example', app_mode: 'auto' }),
  ]);
  assert.match(text(r[1]), /"method":"POST","body":\{"ui_test_id":2828,"app_mode":"custom_url"\}/);
  assert.equal(text(r[2]), 'nothing to update: pass at least one field to change');
  assert.equal(text(r[3]), 'pass either objective or steps, not both');
  assert.match(text(r[4]), /app_mode must be one of custom_url/);
  assert.match(text(r[5]), /"app_mode":"auto"/);
});

test('check_connection reports valid, rejected and missing keys', async () => {
  const ok = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [call(1, 'check_connection')]);
  assert.match(text(ok[1]), /API key is valid/);
  const bad = await mcp({ TESSANA_API_KEY: 'wrong' }, [call(1, 'check_connection')]);
  assert.equal(text(bad[1]), `API key was rejected by ${baseUrl}.`);
  assert.equal(bad[1].result.isError, true);
  const other = await mcp({ TESSANA_API_KEY: 'wrong' }, [call(1, 'list_projects')]);
  assert.doesNotMatch(text(other[1]), /cloud session/);
});

test('missing key gives setup instructions', { skip: process.platform === 'darwin' && 'reads the real macOS keychain' }, async () => {
  const r = await mcp({}, [call(1, 'check_connection')]);
  assert.match(text(r[1]), /^No Tessana API key found\. .*run \/plugin.*Run \/tessana:setup/);
});

test('run cap holds under concurrent calls and refunds failed runs', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY, TESSANA_MAX_RUNS_PER_SESSION: '2' }, [
    call(1, 'run_test_suites', { ids: [0] }),
    call(2, 'run_test_suites', { ids: [1] }),
    call(3, 'run_test_suites', { ids: [1] }),
    call(4, 'run_test_suites', { ids: [1] }),
  ]);
  const ok = responses(r).filter((m) => !m.result.isError).length;
  const capped = responses(r).filter((m) => /Run limit reached/.test(text(m))).length;
  assert.ok(ok >= 1 && ok <= 2, `expected 1-2 successful runs, got ${ok}`);
  assert.ok(capped >= 1, 'expected at least one run to hit the cap');
});

test('wait_for_batch waits until every run has a final status', async () => {
  batchPolls = 0;
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    { id: 1, method: 'tools/call', params: { name: 'wait_for_batch', arguments: { run_batch_id: 99 }, _meta: { progressToken: 't' } } },
  ]);
  assert.equal(r[1].result.isError, undefined);
  assert.match(text(r[1]), /Batch 99 finished/);
  assert.match(text(r[1]), /"status":"Failed"/);
  assert.equal(batchPolls, 2);
  assert.equal(r.notifications[0].method, 'notifications/progress');
});

test('wait_for_batch returns still running at the timeout, and errors on a rejected key or unknown batch', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [
    call(1, 'wait_for_batch', { run_batch_id: 7, timeout_seconds: 1 }),
    call(2, 'wait_for_batch', { run_batch_id: 404 }),
    call(3, 'wait_for_batch', { run_batch_id: 'x' }),
  ]);
  assert.match(text(r[1]), /Batch 7 still running after 1s/);
  assert.equal(r[2].result.isError, true);
  assert.match(text(r[2]), /HTTP 404/);
  assert.equal(text(r[3]), 'run_batch_id must be an integer');
  const bad = await mcp({ TESSANA_API_KEY: 'wrong' }, [call(1, 'wait_for_batch', { run_batch_id: 99 })]);
  assert.equal(bad[1].result.isError, true);
  assert.match(text(bad[1]), /HTTP 401/);
});

test('an unfilled user_config placeholder counts as no key', { skip: process.platform === 'darwin' && 'reads the real macOS keychain' }, async () => {
  const r = await mcp({ TESSANA_API_KEY: '${user_config.api_key}' }, [call(1, 'check_connection')]);
  assert.match(text(r[1]), /No Tessana API key found/);
});

test('API key comes from the sensitive api_key plugin option', () => {
  const manifest = readJson('.claude-plugin/plugin.json');
  const opt = manifest.userConfig.api_key;
  assert.equal(opt.type, 'string');
  assert.equal(opt.sensitive, true);
  assert.ok(opt.title && opt.description);
  const server = readJson('.mcp.json').mcpServers.tessana;
  assert.equal(server.env.TESSANA_API_KEY, '${user_config.api_key}');
  assert.ok(server.args.every((a) => a.startsWith('${CLAUDE_PLUGIN_ROOT}/')));
});

test('MCP server reports the plugin version', async () => {
  const r = await mcp({}, [{ id: 1, method: 'initialize', params: {} }]);
  assert.equal(r[1].result.serverInfo.version, readJson('.claude-plugin/plugin.json').version);
});

// Imports lib.mjs in a fresh process with the given env and runs a snippet that prints JSON.
function inLib(extraEnv, snippet) {
  return new Promise((resolve, reject) => {
    const code = `import * as lib from ${JSON.stringify(SERVER_DIR + 'lib.mjs')}; console.log(JSON.stringify(${snippet}));`;
    const proc = spawn('node', ['--input-type=module', '-e', code], { env: env(extraEnv) });
    let out = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (out += d));
    proc.on('exit', (c) => (c === 0 ? resolve(JSON.parse(out)) : reject(new Error(out))));
  });
}

const noKeychain = { skip: process.platform === 'darwin' && 'reads the real macOS keychain' };

test('getApiKey returns empty locally with no key', noKeychain, async () => {
  assert.equal(await inLib({}, 'lib.getApiKey()'), '');
  assert.equal(await inLib({ CLAUDE_CODE_REMOTE: 'false' }, 'lib.getApiKey()'), '');
});

test('getApiKey returns the proxy placeholder in a cloud session with no key', noKeychain, async () => {
  assert.equal(await inLib({ CLAUDE_CODE_REMOTE: 'true' }, 'lib.getApiKey()'), 'proxy-injected');
  assert.equal(await inLib({ CLAUDE_CODE_REMOTE: 'true', TESSANA_API_KEY: '${user_config.api_key}' }, 'lib.getApiKey()'), 'proxy-injected');
});

test('a real key always wins over the placeholder, even after the placeholder was used', noKeychain, async () => {
  assert.equal(await inLib({ CLAUDE_CODE_REMOTE: 'true', TESSANA_API_KEY: 'real' }, 'lib.getApiKey()'), 'real');
  const seq = await inLib(
    { CLAUDE_CODE_REMOTE: 'true' },
    '[lib.getApiKey(), (process.env.TESSANA_API_KEY = "real", lib.getApiKey())]',
  );
  assert.deepEqual(seq, ['proxy-injected', 'real']);
});

test('error wording: cloud says run /tessana:setup and never /plugin; local is unchanged', async () => {
  const cloud = await inLib({ CLAUDE_CODE_REMOTE: 'true' }, '[lib.MISSING_KEY_MESSAGE, lib.REJECTED_KEY_MESSAGE]');
  for (const m of cloud) {
    assert.equal(m, 'No valid Tessana API key for this cloud session. Run /tessana:setup to add one.');
    assert.doesNotMatch(m, /\/plugin|restart/i);
  }
  const local = await inLib({}, '[lib.MISSING_KEY_MESSAGE, lib.REJECTED_KEY_MESSAGE]');
  assert.match(local[0], /^No Tessana API key found\. .*run \/plugin/);
  assert.equal(local[1], `API key was rejected by ${baseUrl}.`);
});

test('cloud session with no key sends the placeholder and explains a 401', noKeychain, async () => {
  const cloud = { CLAUDE_CODE_REMOTE: 'true' };
  const r = await mcp(cloud, [call(1, 'check_connection')]);
  assert.equal(lastAuth, 'Bearer proxy-injected');
  assert.equal(text(r[1]), 'No valid Tessana API key for this cloud session. Run /tessana:setup to add one.');
  const other = await mcp(cloud, [call(1, 'list_projects'), call(2, 'wait_for_batch', { run_batch_id: 99 })]);
  for (const m of responses(other)) {
    assert.equal(m.result.isError, true);
    assert.match(text(m), /HTTP 401[\s\S]*No valid Tessana API key for this cloud session/);
  }
});

test('a real key works in a cloud session', noKeychain, async () => {
  const r = await mcp({ CLAUDE_CODE_REMOTE: 'true', TESSANA_API_KEY: GOOD_KEY }, [call(1, 'check_connection')]);
  assert.match(text(r[1]), /API key is valid/);
});

test('.mcp.json routes Node requests through the session proxy', () => {
  assert.equal(readJson('.mcp.json').mcpServers.tessana.env.NODE_USE_ENV_PROXY, '1');
});
