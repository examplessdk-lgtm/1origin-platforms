import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePromptKey,
  calculateCacheHitRatio,
  validateCloudflareAccountId,
  searchKnowledgeCorpus,
  runSafeDiagnosticBenchmark,
  ALL_EDGE_REGIONS,
  generateDeploymentManifest,
} from './platform-engine';

test('normalizePromptKey normalizes whitespace and casing deterministically', () => {
  const key1 = normalizePromptKey('  Hello   World  ', 'Gemini-3.8-Flash');
  const key2 = normalizePromptKey('hello world', 'gemini-3.8-flash');
  assert.equal(key1, key2);
  assert.equal(key1, 'gemini-3.8-flash::hello world');
});

test('calculateCacheHitRatio computes accurate percentage', () => {
  assert.equal(calculateCacheHitRatio(0, 0), 0);
  assert.equal(calculateCacheHitRatio(3, 5), 37.5);
  assert.equal(calculateCacheHitRatio(10, 10), 50.0);
});

test('validateCloudflareAccountId enforces 32-char hex string format', () => {
  assert.equal(validateCloudflareAccountId('').valid, false);
  assert.equal(validateCloudflareAccountId('invalid-short-id').valid, false);
  assert.equal(
    validateCloudflareAccountId('8f4b2e91c0d34a76b5e1209c8a4f13d2').valid,
    true
  );
});

test('searchKnowledgeCorpus ranks matching documents highest', () => {
  const results = searchKnowledgeCorpus('gVisor sandbox security container escape');
  assert.ok(results.length >= 5);
  assert.equal(results[0].fileName, '04-sandbox-security.md');
  assert.ok(results[0].score >= results[results.length - 1].score);
});

test('runSafeDiagnosticBenchmark executes prime sieve and returns verified metrics', () => {
  const res = runSafeDiagnosticBenchmark('prime-sieve');
  assert.equal(res.status, 'Verified Local Diagnostic');
  assert.equal(res.metrics.primesFound, 2762);
  assert.ok(res.stdout.includes('2762 prime numbers'));
});

test('generateDeploymentManifest targets all edge regions when globalDistribution is enabled', () => {
  const manifest = generateDeploymentManifest([
    {
      id: 'wkr-test',
      name: 'global-router',
      route: 'api.1origin.dev/*',
      runtime: 'v8-edge',
      status: 'Active',
      requests24h: 10,
      p50LatencyMs: 1.1,
      code: 'export default {}',
      updatedAt: '2026-10-27T18:00:00Z',
      globalDistribution: true,
      targetRegions: [...ALL_EDGE_REGIONS],
    },
  ]);
  assert.ok(manifest.includes('global_distribution = true'));
  assert.ok(manifest.includes('placement_mode = "global-anycast-all-regions"'));
  assert.ok(
    manifest.includes('target_regions = ["BKK-01", "SIN-01", "TYO-01", "FRA-01"]')
  );
});
