#!/usr/bin/env node
// Zero-dependency stdio MCP server wrapping the Tessana public API.
import readline from 'node:readline';
import { BASE_URL, MISSING_KEY_MESSAGE, callApi, getApiKey } from './lib.mjs';

// One server process per Claude Code session, so this caps batches started per session.
const MAX_RUNS = Number.parseInt(process.env.TESSANA_MAX_RUNS_PER_SESSION || '', 10) || 10;
let runsStarted = 0;

const TOOLS = [
  {
    name: 'check_connection',
    description:
      'Check that the Tessana API is reachable and the API key is valid. Starts no runs. ' +
      'Use during setup or when other Tessana calls fail with authentication errors.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'run_test_suites',
    method: 'POST',
    path: '/run_test_suites',
    description:
      'Queue one or more Tessana test suites (test schedule config IDs) for execution as a single batch. ' +
      'All IDs must belong to the same project. Returns {"run_batch_id": <int>} on success; pass it to get_batch_run_results.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          minItems: 1,
          description: 'Test suite IDs to run. Order does not guarantee execution order.',
        },
      },
      required: ['ids'],
    },
  },
  {
    name: 'get_batch_run_results',
    method: 'GET',
    path: '/get_batch_run_results',
    description:
      'Get the status of every test run in a batch. Returns {"results": [{testrun_id, start_time, end_time, ' +
      'run_status (Active|Pending|Paused|Completed), status (Success|Failed|null)}]}. ' +
      'A batch is finished when every result has a non-null status.',
    inputSchema: {
      type: 'object',
      properties: {
        run_batch_id: { type: 'integer', description: 'Batch ID returned by run_test_suites.' },
      },
      required: ['run_batch_id'],
    },
  },
  {
    name: 'get_test_results',
    method: 'GET',
    path: '/get_test_results',
    description:
      'Get per-test results for one test run. Returns {"results": [{ui_test_id, title, objective, status, ' +
      'screenshot_urls, audio_urls, video_urls}]}. Final statuses: Success, Failed, Canceled, Terminated; ' +
      'transitional: Running, Pending, Paused.',
    inputSchema: {
      type: 'object',
      properties: {
        testrun_id: { type: 'integer', description: 'Test run ID from get_batch_run_results.' },
      },
      required: ['testrun_id'],
    },
  },
];

// POST {} passes auth then fails on missing ids, so 400 means the key works and nothing was queued.
async function checkConnection() {
  try {
    const res = await callApi('POST', '/run_test_suites', {});
    if (res.status === 400) return { content: [{ type: 'text', text: `Connected to ${BASE_URL}; API key is valid.` }] };
    if (res.status === 401) return toolError(`API key was rejected by ${BASE_URL}.`);
    return toolError(`Unexpected response from ${BASE_URL}: HTTP ${res.status}\n${res.body}`);
  } catch (e) {
    return toolError(`Could not reach ${BASE_URL}: ${e.message}`);
  }
}

function validate(tool, args) {
  for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
    const v = args?.[key];
    if (schema.type === 'integer' && !Number.isInteger(v)) return `${key} must be an integer`;
    if (schema.type === 'array' && (!Array.isArray(v) || !v.length || !v.every(Number.isInteger)))
      return `${key} must be a non-empty array of integers`;
  }
  return null;
}

async function callTool(name, args) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return toolError(`Unknown tool: ${name}`);
  if (!getApiKey()) return toolError(MISSING_KEY_MESSAGE);
  if (name === 'check_connection') return checkConnection();
  const invalid = validate(tool, args);
  if (invalid) return toolError(invalid);
  if (name === 'run_test_suites' && runsStarted >= MAX_RUNS)
    return toolError(
      `Run limit reached: ${MAX_RUNS} batches already started this session. ` +
        'Raise TESSANA_MAX_RUNS_PER_SESSION or start a new session to run more.',
    );

  // Reserve the slot before the request so concurrent calls can't overshoot the cap.
  const countsAsRun = name === 'run_test_suites';
  if (countsAsRun) runsStarted++;
  const body = Object.fromEntries(Object.keys(tool.inputSchema.properties).map((k) => [k, args[k]]));
  try {
    const res = await callApi(tool.method, tool.path, body);
    const ok = res.status >= 200 && res.status < 300;
    if (countsAsRun && !ok) runsStarted--;
    return { content: [{ type: 'text', text: `HTTP ${res.status}\n${res.body}` }], isError: !ok };
  } catch (e) {
    if (countsAsRun) runsStarted--;
    return toolError(`Request to ${tool.path} failed: ${e.message}`);
  }
}

const toolError = (text) => ({ content: [{ type: 'text', text }], isError: true });

const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications need no reply
  switch (method) {
    case 'initialize':
      return send({
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'tessana', version: '0.2.0' },
        },
      });
    case 'ping':
      return send({ id, result: {} });
    case 'tools/list':
      return send({
        id,
        result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) },
      });
    case 'tools/call':
      return send({ id, result: await callTool(params?.name, params?.arguments || {}) });
    default:
      return send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: 'Parse error' } });
  }
  handle(msg).catch((e) => send({ id: msg.id ?? null, error: { code: -32603, message: e.message } }));
});
