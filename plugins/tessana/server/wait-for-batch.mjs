#!/usr/bin/env node
// Polls a batch until every run has a final status, then prints the batch results and exits.
// Meant to run as a background Bash task so the Claude Code session isn't blocked.
// Usage: wait-for-batch.mjs <run_batch_id> [interval_seconds=30] [timeout_minutes=30]
// Exit codes: 0 all passed, 1 some failed, 2 timed out, 3 error.
import { MISSING_KEY_MESSAGE, callApi, getApiKey } from './lib.mjs';

const [batchArg, intervalArg = '30', timeoutArg = '30'] = process.argv.slice(2);
const runBatchId = Number.parseInt(batchArg, 10);
const intervalMs = Number.parseInt(intervalArg, 10) * 1000;
const deadline = Date.now() + Number.parseInt(timeoutArg, 10) * 60_000;

if (!Number.isInteger(runBatchId)) {
  console.error('usage: wait-for-batch.mjs <run_batch_id> [interval_seconds] [timeout_minutes]');
  process.exit(3);
}
if (!getApiKey()) {
  console.error(MISSING_KEY_MESSAGE);
  process.exit(3);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (;;) {
  let res;
  try {
    res = await callApi('GET', '/get_batch_run_results', { run_batch_id: runBatchId });
  } catch (e) {
    res = { status: 0, body: e.message };
  }
  if (res.status === 401 || res.status === 404) {
    console.error(`HTTP ${res.status}\n${res.body}`);
    process.exit(3);
  }
  if (res.status === 200) {
    const results = JSON.parse(res.body).results || [];
    if (results.length && results.every((r) => r.status != null)) {
      console.log(`Batch ${runBatchId} finished.\n${res.body}`);
      process.exit(results.some((r) => r.status !== 'Success') ? 1 : 0);
    }
  }
  if (Date.now() + intervalMs > deadline) {
    console.log(`Batch ${runBatchId} still running at timeout. Last response: HTTP ${res.status}\n${res.body}`);
    process.exit(2);
  }
  await sleep(intervalMs);
}
