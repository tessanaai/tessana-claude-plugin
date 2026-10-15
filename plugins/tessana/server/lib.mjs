// Shared by the MCP server and the background batch poller.
// Uses node:https because the GET endpoints take a JSON body, which fetch() rejects.
import https from 'node:https';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

export const BASE_URL = (process.env.TESSANA_BASE_URL || 'https://app.tessanaai.com').replace(/\/+$/, '');

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

// Env var wins; otherwise the OS keychain. Re-checked on each call until found so /tessana:setup works without a restart.
export function getApiKey() {
  if (!cachedKey) cachedKey = process.env.TESSANA_API_KEY || readKeychain();
  return cachedKey;
}

export const MISSING_KEY_MESSAGE =
  'No Tessana API key found. Run /tessana:setup, or set TESSANA_API_KEY before starting Claude Code.';

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
