// Helpers for the MCP server: API key lookup and HTTP calls to the Tessana API.
// Uses node:https because the GET endpoints take a JSON body, which fetch() rejects.
import https from 'node:https';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

export const BASE_URL = (process.env.TESSANA_BASE_URL || 'https://app.tessanaai.com').replace(/\/+$/, '');

// Claude Code cloud sessions (claude.ai/code, mobile, desktop cloud mode) set CLAUDE_CODE_REMOTE=true.
// There, the key is saved as a network secret and the session's proxy puts it in the Authorization header,
// so the server sends a placeholder that the proxy replaces.
export const IS_CLOUD = process.env.CLAUDE_CODE_REMOTE === 'true';
export const PROXY_PLACEHOLDER_KEY = 'proxy-injected';

const KEYCHAIN_SERVICE = 'tessana';
const KEYCHAIN_ACCOUNT = 'api-key';

let cachedKey = '';

function readKeychain() {
  const lookups = {
    darwin: ['security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', KEYCHAIN_ACCOUNT, '-w']],
    linux: ['secret-tool', ['lookup', 'service', KEYCHAIN_SERVICE, 'account', KEYCHAIN_ACCOUNT]],
  };
  const lookup = lookups[process.platform];
  if (!lookup) return '';
  try {
    return execFileSync(lookup[0], lookup[1], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// TESSANA_API_KEY is set by .mcp.json from the plugin's api_key option (entered when the plugin is installed).
// An unfilled option can arrive as the literal placeholder, so treat that as unset.
function keyFromEnv() {
  const v = (process.env.TESSANA_API_KEY || '').trim();
  return /^\$\{.*\}$/.test(v) ? '' : v;
}

// The option wins; the OS keychain is only a fallback for installs that stored the key there before 0.5.1.
// Re-checked on each call until found, so a key added to the keychain works without a restart.
// In a cloud session with no key, returns the proxy placeholder. It is not cached, so a real key still wins.
export function getApiKey() {
  if (!cachedKey) cachedKey = keyFromEnv() || readKeychain();
  return cachedKey || (IS_CLOUD ? PROXY_PLACEHOLDER_KEY : '');
}

const CLOUD_KEY_MESSAGE = 'No valid Tessana API key for this cloud session. Run /tessana:setup to add one.';

export const MISSING_KEY_MESSAGE = IS_CLOUD
  ? CLOUD_KEY_MESSAGE
  : 'No Tessana API key found. Add your API key in the Tessana plugin settings (run /plugin, select tessana, ' +
    'and set the API key), then restart Claude Code. Run /tessana:setup for help.';

// For an HTTP 401. In a cloud session it most likely means no key is saved for the Tessana host yet.
export const REJECTED_KEY_MESSAGE = IS_CLOUD ? CLOUD_KEY_MESSAGE : `API key was rejected by ${BASE_URL}.`;

export function callApi(method, path, body) {
  const url = new URL(BASE_URL + path);
  const payload = JSON.stringify(body);
  const client = url.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${getApiKey()}`,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
        timeout: 60_000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('request timed out after 60s')));
    req.on('error', reject);
    req.end(payload);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tests shorten this; users don't need to change it.
const POLL_INTERVAL_MS = Number.parseInt(process.env.TESSANA_POLL_INTERVAL_MS || '', 10) || 15_000;

// Polls /get_batch_run_results until every run has a final status or timeoutSeconds pass.
// Returns { done, status, body } with the last response. onPoll is called after each poll (for progress updates).
export async function waitForBatch(runBatchId, timeoutSeconds, onPoll = () => {}) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  for (let poll = 1; ; poll++) {
    let res;
    try {
      res = await callApi('GET', '/get_batch_run_results', { run_batch_id: runBatchId });
    } catch (e) {
      res = { status: 0, body: e.message };
    }
    // Stop at once: waiting can't fix a rejected key (or a missing proxy credential) or an unknown batch.
    if (res.status === 401 || res.status === 404) return { done: false, ...res };
    if (res.status === 200) {
      let results = [];
      try {
        results = JSON.parse(res.body).results || [];
      } catch {}
      if (results.length && results.every((r) => r.status != null)) return { done: true, ...res };
    }
    onPoll(poll);
    const left = deadline - Date.now();
    if (left <= 0) return { done: false, ...res };
    await sleep(Math.min(POLL_INTERVAL_MS, left));
  }
}
