// Runs the MCP server and batch poller against a mock Tessana API. Usage: node --test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = fileURLToPath(new URL('../plugins/tessana/server/', import.meta.url));
const GOOD_KEY = 'good-key';

let api;
let baseUrl;
let batchPolls = 0;

before(async () => {
  api = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.headers.authorization !== `Bearer ${GOOD_KEY}`) return send(401, { error: 'Authentication failed' });
      const body = raw ? JSON.parse(raw) : {};
      if (req.url === '/run_test_suites') {
        if (!body.ids) return send(400, { error: 'ids required' });
        if (body.ids[0] === 0) return send(500, { message: 'Failed to schedule Testrun' });
        return send(200, { run_batch_id: 99, echo: { method: req.method, body } });
      }
      if (req.url === '/get_batch_run_results') {
        batchPolls++;
        const done = batchPolls >= 2;
        return send(200, {
          results: [
            { testrun_id: 1, run_status: done ? 'Completed' : 'Active', status: done ? 'Success' : null },
            { testrun_id: 2, run_status: done ? 'Completed' : 'Active', status: done ? 'Failed' : null },
          ],
        });
      }
      if (req.url === '/get_test_results') return send(200, { results: [], echo: { method: req.method, body } });
      if (['/get_projects', '/get_tests', '/create_test', '/create_test_suite', '/get_test_details', '/get_test_run_history', '/get_test_gen_history'].includes(req.url))
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
  return { PATH: process.env.PATH, HOME: '/nonexistent', TESSANA_BASE_URL: baseUrl, ...extra };
}

// Sends JSON-RPC requests concurrently and collects responses by id.
async function mcp(extraEnv, requests) {
  const proc = spawn('node', [SERVER_DIR + 'index.mjs'], { env: env(extraEnv) });
  let out = '';
  proc.stdout.on('data', (d) => (out += d));
  const want = requests.filter((r) => r.id !== undefined).length;
  for (const r of requests) proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...r }) + '\n');
  const deadline = Date.now() + 5000;
  while (out.trim().split('\n').filter(Boolean).length < want && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 20));
  proc.kill();
  return Object.fromEntries(out.trim().split('\n').filter(Boolean).map((l) => [JSON.parse(l).id, JSON.parse(l)]));
}

const call = (id, name, args = {}) => ({ id, method: 'tools/call', params: { name, arguments: args } });
const text = (msg) => msg.result.content[0].text;

function runPoller(extraEnv, args) {
  return new Promise((resolve) => {
    const proc = spawn('node', [SERVER_DIR + 'wait-for-batch.mjs', ...args], { env: env(extraEnv) });
    let out = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (out += d));
    proc.on('exit', (code) => resolve({ code, out }));
  });
}

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
      'get_test_results',
      'list_projects',
      'list_tests',
      'create_test',
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
  for (const m of Object.values(r)) assert.equal(m.result.isError, false, text(m));
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

test('check_connection reports valid, rejected and missing keys', async () => {
  const ok = await mcp({ TESSANA_API_KEY: GOOD_KEY }, [call(1, 'check_connection')]);
  assert.match(text(ok[1]), /API key is valid/);
  const bad = await mcp({ TESSANA_API_KEY: 'wrong' }, [call(1, 'check_connection')]);
  assert.match(text(bad[1]), /rejected/);
  assert.equal(bad[1].result.isError, true);
});

test('missing key gives setup instructions', { skip: process.platform === 'darwin' && 'reads the real macOS keychain' }, async () => {
  const r = await mcp({}, [call(1, 'check_connection')]);
  assert.match(text(r[1]), /Run \/tessana:setup/);
});

test('run cap holds under concurrent calls and refunds failed runs', async () => {
  const r = await mcp({ TESSANA_API_KEY: GOOD_KEY, TESSANA_MAX_RUNS_PER_SESSION: '2' }, [
    call(1, 'run_test_suites', { ids: [0] }),
    call(2, 'run_test_suites', { ids: [1] }),
    call(3, 'run_test_suites', { ids: [1] }),
    call(4, 'run_test_suites', { ids: [1] }),
  ]);
  const ok = Object.values(r).filter((m) => !m.result.isError).length;
  const capped = Object.values(r).filter((m) => /Run limit reached/.test(text(m))).length;
  assert.ok(ok >= 1 && ok <= 2, `expected 1-2 successful runs, got ${ok}`);
  assert.ok(capped >= 1, 'expected at least one run to hit the cap');
});

test('poller exits 1 when a run fails', async () => {
  batchPolls = 0;
  const { code, out } = await runPoller({ TESSANA_API_KEY: GOOD_KEY }, ['99', '1', '1']);
  assert.equal(code, 1);
  assert.match(out, /Batch 99 finished/);
});

test('poller exits 3 on a rejected key', async () => {
  const { code } = await runPoller({ TESSANA_API_KEY: 'wrong' }, ['99', '1', '1']);
  assert.equal(code, 3);
});
