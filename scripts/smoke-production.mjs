#!/usr/bin/env node

const [baseUrlArg, expectedCommitArg] = process.argv.slice(2);

if (!baseUrlArg) {
  console.error('Usage: npm run smoke:production -- <base-url> [expected-commit]');
  process.exit(2);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');

async function fetchOk(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'follow',
    headers: { 'user-agent': 'rafay-production-smoke/1.0' }
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response;
}

try {
  const healthResponse = await fetchOk('/api/health');
  const healthText = await healthResponse.text();
  let health;
  try {
    health = JSON.parse(healthText);
  } catch {
    throw new Error('/api/health returned invalid JSON');
  }

  if (!health || health.ok !== true || typeof health.commit !== 'string') {
    throw new Error('/api/health returned an invalid health payload');
  }

  if (expectedCommitArg && health.commit !== expectedCommitArg && !health.commit.startsWith(expectedCommitArg)) {
    throw new Error(`Live commit ${health.commit} does not match expected ${expectedCommitArg}`);
  }

  await fetchOk('/');
  await fetchOk('/booking');

  console.log(`RAFAY smoke passed: runtime=${health.runtime || 'unknown'} commit=${health.commit}`);
} catch (error) {
  console.error(`RAFAY smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
