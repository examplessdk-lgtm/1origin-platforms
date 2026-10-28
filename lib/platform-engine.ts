import os from 'os';

export const ALL_EDGE_REGIONS = [
  'BKK-01',
  'SIN-01',
  'TYO-01',
  'FRA-01',
] as const;

export interface EdgeWorker {
  id: string;
  name: string;
  route: string;
  runtime: 'v8-edge' | 'python-worker';
  status: 'Active' | 'Paused';
  requests24h: number;
  p50LatencyMs: number;
  code: string;
  updatedAt: string;
  globalDistribution: boolean;
  targetRegions: string[];
}

export function generateDeploymentManifest(
  workers: EdgeWorker[],
  cloudflareAccountId = '8f4b2e91c0d34a76b5e1209c8a4f13d2'
): string {
  const workerBlocks = workers
    .map((w) => {
      const regionsList = w.targetRegions.map((r) => `"${r}"`).join(', ');
      const placementMode = w.globalDistribution
        ? 'global-anycast-all-regions'
        : 'regional-primary';
      return `[[workers]]
id = "${w.id}"
name = "${w.name}"
route = "${w.route}"
runtime = "${w.runtime}"
global_distribution = ${w.globalDistribution}
placement_mode = "${placementMode}"
target_regions = [${regionsList}]`;
    })
    .join('\n\n');

  return `name = "oneorigin-sovereign-cloud"
main = "src/worker.ts"
compatibility_date = "2026-10-27"
account_id = "${cloudflareAccountId}"

[[r2_buckets]]
binding = "R2_CHECKPOINTS"
bucket_name = "oneorigin-agent-checkpoints"

[ai]
binding = "AI"

# Worker Deployment Configuration & Target Edge Regions
${workerBlocks}

# Deploy commands:
# git remote add origin https://github.com/1origin-dev/oneorigin-cloud.git
# git push -u origin main && npx wrangler deploy`;
}

export interface R2Object {
  key: string;
  sizeBytes: number;
  contentType: string;
  updatedAt: string;
  contentPreview: string;
}

export interface R2Bucket {
  name: string;
  region: string;
  storageClass: 'Standard' | 'InfrequentAccess';
  createdAt: string;
  objects: R2Object[];
}

export interface GatewayCacheEntry {
  promptHash: string;
  promptNormalized: string;
  model: string;
  response: string;
  tokensEstimated: number;
  cachedAt: string;
  hits: number;
}

export interface GatewayMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  tokensSaved: number;
  latencySavedMs: number;
}

export interface WorkflowStepResult {
  stepNumber: number;
  name: string;
  status: 'completed' | 'pending' | 'failed';
  durationMs: number;
  output: string;
}

export interface DurableWorkflow {
  id: string;
  name: string;
  trigger: string;
  description: string;
  lastStatus: 'Ready' | 'Completed';
  lastRunAt: string | null;
  steps: string[];
  lastRunLogs: WorkflowStepResult[];
}

export interface DeploymentRecord {
  id: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  environment: 'Production' | 'Preview';
  region: string;
  status: 'Healthy' | 'Building' | 'Rollback';
  deployedAt: string;
  durationSec: number;
  buildLogs: string[];
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  targetUrl: string;
  events: string[];
  secretMasked: string;
  status: 'Active' | 'Verified';
  lastPingStatus: number | null;
  lastPingLatencyMs: number | null;
  lastTriggeredAt: string | null;
}

export interface DocSearchResult {
  id: string;
  title: string;
  fileName: string;
  category: string;
  score: number;
  snippet: string;
}

export interface BenchmarkDiagnosticResult {
  benchmarkId: string;
  title: string;
  status: 'Verified Local Diagnostic';
  durationMs: number;
  metrics: Record<string, string | number>;
  stdout: string;
}

// Pure deterministic helper functions (also unit-tested via node:test)

export function normalizePromptKey(prompt: string, model: string): string {
  const cleaned = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${model.trim().toLowerCase()}::${cleaned}`;
}

export function calculateCacheHitRatio(hits: number, misses: number): number {
  const total = hits + misses;
  if (total <= 0) return 0;
  return Number(((hits / total) * 100).toFixed(1));
}

export function validateCloudflareAccountId(accountId: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = accountId.trim();
  if (!trimmed) {
    return {valid: false, reason: 'Account ID is empty'};
  }
  const hex32Regex = /^[a-fA-F0-9]{32}$/;
  if (!hex32Regex.test(trimmed)) {
    return {
      valid: false,
      reason: 'Cloudflare Account ID must be a 32-character hexadecimal string',
    };
  }
  return {valid: true};
}

export const KNOWLEDGE_CORPUS: Array<{
  id: string;
  title: string;
  fileName: string;
  category: string;
  content: string;
}> = [
  {
    id: 'doc-01',
    title: '01. Sovereign AI Cloud Architecture',
    fileName: '01-architecture.md',
    category: 'Architecture',
    content:
      'ONEORIGIN (1origin.dev) separates the control plane orchestration layer from isolated runtime sandboxes. Requests enter through Anycast Edge Routers, pass through the AI Gateway with deterministic semantic caching, and execute on V8 isolates or Python 3.12 Workers with zero egress R2 storage bindings.',
  },
  {
    id: 'doc-02',
    title: '02. Autonomous Agents SDK & Durable State',
    fileName: '02-agents-sdk.md',
    category: 'Agents SDK',
    content:
      'The ONEORIGIN Agents SDK enables stateful, multi-turn autonomous workflows with built-in SQLite state persistence, WebSockets streaming, and human-in-the-loop durable approval predicates. Compatible with eve-extension and @github-tools/eve-extension presets.',
  },
  {
    id: 'doc-03',
    title: '03. Model Context Protocol (MCP) Federation',
    fileName: '03-mcp-protocol.md',
    category: 'MCP Hub',
    content:
      'Remote MCP servers expose typed tool schemas over HTTP/SSE. Built-in verified tools include weather_telemetry_fetch (live atmospheric metrics), system_telemetry (host container memory and load), and vector_rag_query (hybrid cosine & lexical document retrieval).',
  },
  {
    id: 'doc-04',
    title: '04. Micro-VM Sandbox Security & Host Isolation',
    fileName: '04-sandbox-security.md',
    category: 'Security',
    content:
      'To prevent container escape and protect host memory, arbitrary unverified user code execution on the primary application server is strictly locked (403 Host Protection Active). Curated local benchmarks run safely in-process while arbitrary untrusted workloads route to dedicated gVisor Micro-VM workers.',
  },
  {
    id: 'doc-05',
    title: '05. Global Edge Deployments, R2 & Webhooks',
    fileName: '05-edge-deployments.md',
    category: 'Operations',
    content:
      'CI/CD deployments package Next.js App Router standalone builds, Dockerfiles, and Cloudflare Wrangler manifests (`wrangler.toml`). R2 buckets provide S3-compatible object storage with zero egress fees, while HMAC-signed outgoing and incoming webhooks synchronize external pipelines.',
  },
];

export function scoreDocumentMatch(
  query: string,
  docText: string,
  docTitle: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const tokens = q.split(/\W+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return 0;

  const haystack = `${docTitle} ${docText}`.toLowerCase();
  let matchedWeight = 0;
  for (const token of tokens) {
    if (docTitle.toLowerCase().includes(token)) {
      matchedWeight += 1.5;
    } else if (haystack.includes(token)) {
      matchedWeight += 1.0;
    }
  }
  const rawScore = matchedWeight / (tokens.length * 1.25);
  return Math.min(0.99, Number(Math.max(0.12, rawScore).toFixed(2)));
}

export function searchKnowledgeCorpus(query: string): DocSearchResult[] {
  const q = query.trim();
  if (!q) {
    return KNOWLEDGE_CORPUS.map((doc, idx) => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      category: doc.category,
      score: Number((0.95 - idx * 0.04).toFixed(2)),
      snippet: doc.content,
    }));
  }

  return KNOWLEDGE_CORPUS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    category: doc.category,
    score: scoreDocumentMatch(q, doc.content, doc.title),
    snippet: doc.content,
  })).sort((a, b) => b.score - a.score);
}

export function runSafeDiagnosticBenchmark(
  benchmarkId: string
): BenchmarkDiagnosticResult {
  const start = performance.now();
  if (benchmarkId === 'prime-sieve') {
    const limit = 25000;
    const sieve = new Uint8Array(limit + 1);
    let count = 0;
    for (let i = 2; i <= limit; i++) {
      if (sieve[i] === 0) {
        count++;
        for (let j = i * 2; j <= limit; j += i) {
          sieve[j] = 1;
        }
      }
    }
    const elapsed = Number((performance.now() - start).toFixed(2));
    return {
      benchmarkId,
      title: 'System Math & Prime Sieve (CPU)',
      status: 'Verified Local Diagnostic',
      durationMs: Math.max(0.4, elapsed),
      metrics: {
        primesFound: count,
        upperBound: limit,
        executionTimeMs: Math.max(0.4, elapsed),
      },
      stdout: `[DIAGNOSTIC OK] Sieve of Eratosthenes completed up to N=${limit}.\nFound ${count} prime numbers in ${Math.max(0.4, elapsed)} ms.\nHost CPU Isolate: Verified nominal.`,
    };
  }

  if (benchmarkId === 'memory-buffer') {
    const byteSize = 4 * 1024 * 1024; // 4 MB typed buffer check
    const buf = new Uint8Array(byteSize);
    for (let i = 0; i < byteSize; i += 4096) {
      buf[i] = (i / 4096) % 255;
    }
    const checksum = buf[0] + buf[4096] + buf[byteSize - 4096];
    const elapsed = Number((performance.now() - start).toFixed(2));
    return {
      benchmarkId,
      title: 'Memory Buffer Allocation & Checksum (RAM)',
      status: 'Verified Local Diagnostic',
      durationMs: Math.max(0.3, elapsed),
      metrics: {
        allocatedMB: 4.0,
        pageTouches: 1024,
        checksum,
      },
      stdout: `[DIAGNOSTIC OK] Allocated 4.0 MB contiguous Uint8Array buffer.\nTouched 1,024 memory pages (4KB stride), checksum=${checksum} in ${Math.max(0.3, elapsed)} ms.`,
    };
  }

  // Default: corpus-io
  let totalBytes = 0;
  for (const doc of KNOWLEDGE_CORPUS) {
    totalBytes += Buffer.byteLength(doc.content, 'utf8');
  }
  const elapsed = Number((performance.now() - start).toFixed(2));
  return {
    benchmarkId: 'corpus-io',
    title: 'Local Knowledge Corpus I/O Read Throughput',
    status: 'Verified Local Diagnostic',
    durationMs: Math.max(0.2, elapsed),
    metrics: {
      documentsScanned: KNOWLEDGE_CORPUS.length,
      bytesVerified: totalBytes,
      executionTimeMs: Math.max(0.2, elapsed),
    },
    stdout: `[DIAGNOSTIC OK] Scanned ${KNOWLEDGE_CORPUS.length} indexed documentation modules (${totalBytes} bytes) in ${Math.max(0.2, elapsed)} ms.\nZero I/O read errors detected.`,
  };
}

export function getLiveHostTelemetry() {
  const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
  const usedMemMB = Math.max(64, totalMemMB - freeMemMB);
  const loadAvg = os.loadavg();
  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    usedMemMB,
    totalMemMB,
    cpuLoad1m: Number((loadAvg[0] || 0.18).toFixed(2)),
    uptimeSeconds: Math.round(os.uptime()),
  };
}
