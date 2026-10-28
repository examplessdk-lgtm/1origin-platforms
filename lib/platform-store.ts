import {
  EdgeWorker,
  R2Bucket,
  GatewayCacheEntry,
  GatewayMetrics,
  DurableWorkflow,
  DeploymentRecord,
  WebhookEndpoint,
  ALL_EDGE_REGIONS,
  generateDeploymentManifest,
} from './platform-engine';

interface PlatformStoreState {
  workers: EdgeWorker[];
  buckets: R2Bucket[];
  gatewayCache: Map<string, GatewayCacheEntry>;
  gatewayMetrics: GatewayMetrics;
  workflows: DurableWorkflow[];
  deployments: DeploymentRecord[];
  webhooks: WebhookEndpoint[];
  deploymentManifest: string;
  connectedSettings: {
    cloudflareAccountId: string;
    remoteSandboxUrl: string;
    webhookSigningSecretConfigured: boolean;
    lastVerifiedAt: string | null;
  };
}

const globalForStore = globalThis as unknown as {
  __oneoriginStore?: PlatformStoreState;
};

function createInitialState(): PlatformStoreState {
  const initialCache = new Map<string, GatewayCacheEntry>();
  initialCache.set(
    'gemini-3.8-flash::explain oneorigin edge routing and semantic caching in 2 sentences',
    {
      promptHash: 'cache-seed-01',
      promptNormalized:
        'explain oneorigin edge routing and semantic caching in 2 sentences',
      model: 'gemini-3.8-flash',
      response:
        'ONEORIGIN routes incoming inference calls across Anycast edge PoPs directly to the nearest AI Gateway node, inspecting normalized prompt embeddings before hitting upstream models. Repeated or semantically identical requests return directly from edge memory in ~1.4ms, cutting token costs and upstream latency.',
      tokensEstimated: 48,
      cachedAt: '2026-10-27T18:00:00Z',
      hits: 14,
    }
  );

  const initialWorkers: EdgeWorker[] = [
    {
      id: 'wkr-edge-auth',
      name: 'sovereign-jwt-verifier',
      route: 'auth.1origin.dev/v1/*',
      runtime: 'v8-edge',
      status: 'Active',
      requests24h: 148920,
      p50LatencyMs: 1.18,
      code: `export default {\n  async fetch(request, env) {\n    const token = request.headers.get('Authorization');\n    return Response.json({ verified: Boolean(token), pop: 'SIN-01', latencyMs: 1.18 });\n  }\n};`,
      updatedAt: '2026-10-27T17:45:00Z',
      globalDistribution: true,
      targetRegions: [...ALL_EDGE_REGIONS],
    },
    {
      id: 'wkr-ai-router',
      name: 'agent-tool-dispatcher',
      route: 'api.1origin.dev/mcp/*',
      runtime: 'python-worker',
      status: 'Active',
      requests24h: 64210,
      p50LatencyMs: 2.04,
      code: `async def on_fetch(request, env):\n    return Response.json({"service": "mcp-router", "tools_active": 3, "status": "nominal"})`,
      updatedAt: '2026-10-27T18:05:00Z',
      globalDistribution: false,
      targetRegions: ['BKK-01'],
    },
    {
      id: 'wkr-r2-presign',
      name: 'r2-zero-egress-cdn',
      route: 'cdn.1origin.dev/assets/*',
      runtime: 'v8-edge',
      status: 'Active',
      requests24h: 312400,
      p50LatencyMs: 0.92,
      code: `export default {\n  async fetch(req, env) {\n    return new Response('R2 Object Stream OK', { headers: { 'x-egress-fee': '$0.00' } });\n  }\n};`,
      updatedAt: '2026-10-27T18:12:00Z',
      globalDistribution: true,
      targetRegions: [...ALL_EDGE_REGIONS],
    },
  ];

  return {
    workers: initialWorkers,
    deploymentManifest: generateDeploymentManifest(
      initialWorkers,
      '8f4b2e91c0d34a76b5e1209c8a4f13d2'
    ),
    buckets: [
      {
        name: 'oneorigin-agent-checkpoints',
        region: 'APAC-Multi (BKK / SIN / TYO)',
        storageClass: 'Standard',
        createdAt: '2026-10-20T09:00:00Z',
        objects: [
          {
            key: 'checkpoints/session-9841a.json',
            sizeBytes: 18432,
            contentType: 'application/json',
            updatedAt: '2026-10-27T17:50:00Z',
            contentPreview: '{"sessionId":"9841a","turn":4,"durableApproval":"verified"}',
          },
          {
            key: 'schemas/eve-github-tools-v0.64.json',
            sizeBytes: 42180,
            contentType: 'application/json',
            updatedAt: '2026-10-27T18:01:00Z',
            contentPreview: '{"extension":"@github-tools/eve-extension","preset":"code-review","tools":84}',
          },
        ],
      },
      {
        name: 'sovereign-rag-embeddings',
        region: 'Global-Anycast',
        storageClass: 'Standard',
        createdAt: '2026-10-22T14:30:00Z',
        objects: [
          {
            key: 'indices/hnsw-corpus-v3.bin',
            sizeBytes: 1048576,
            contentType: 'application/octet-stream',
            updatedAt: '2026-10-27T16:15:00Z',
            contentPreview: 'HNSW_BINARY_INDEX_HEADER_DIM_768_DOCS_5',
          },
          {
            key: 'manifests/corpus-metadata.json',
            sizeBytes: 4120,
            contentType: 'application/json',
            updatedAt: '2026-10-27T17:20:00Z',
            contentPreview: '{"documents":5,"chunkSize":512,"metric":"cosine"}',
          },
        ],
      },
    ],
    gatewayCache: initialCache,
    gatewayMetrics: {
      totalRequests: 48,
      cacheHits: 19,
      cacheMisses: 29,
      tokensSaved: 9120,
      latencySavedMs: 26450,
    },
    workflows: [
      {
        id: 'wf-rag-indexer',
        name: 'RAG Document Indexing Pipeline',
        trigger: 'r2.object.created',
        description:
          'Extracts uploaded markdown/JSON from R2, chunks tokens, computes embeddings, updates HNSW index, and dispatches webhook confirmation.',
        lastStatus: 'Completed',
        lastRunAt: '2026-10-27T18:10:00Z',
        steps: [
          '1. Extract Document Text (R2 Read)',
          '2. Chunk & Tokenize (512-token sliding window)',
          '3. Compute Vector Embeddings (768-dim)',
          '4. Commit to HNSW Vector Index',
          '5. Dispatch Signed Webhook Notification',
        ],
        lastRunLogs: [
          {
            stepNumber: 1,
            name: 'Extract Document Text (R2 Read)',
            status: 'completed',
            durationMs: 14,
            output: 'Read 5 markdown files (28.4 KB) from bucket sovereign-rag-embeddings.',
          },
          {
            stepNumber: 2,
            name: 'Chunk & Tokenize (512-token sliding window)',
            status: 'completed',
            durationMs: 22,
            output: 'Generated 42 normalized semantic chunks with 64-token overlap.',
          },
          {
            stepNumber: 3,
            name: 'Compute Vector Embeddings (768-dim)',
            status: 'completed',
            durationMs: 68,
            output: 'Computed L2-normalized vectors for 42 chunks.',
          },
          {
            stepNumber: 4,
            name: 'Commit to HNSW Vector Index',
            status: 'completed',
            durationMs: 19,
            output: 'Upserted 42 vectors into index hnsw-corpus-v3 (0 collisions).',
          },
          {
            stepNumber: 5,
            name: 'Dispatch Signed Webhook Notification',
            status: 'completed',
            durationMs: 11,
            output: 'Delivered event workflow.completed (HMAC-SHA256 200 OK).',
          },
        ],
      },
      {
        id: 'wf-eve-pr-audit',
        name: 'Eve GitHub PR Security & Approval Gate',
        trigger: 'webhook.github.pull_request',
        description:
          'Mounts @github-tools/eve-extension (preset: code-review), inspects PR diffs, and parks write actions behind durable human approval.',
        lastStatus: 'Ready',
        lastRunAt: '2026-10-27T17:30:00Z',
        steps: [
          '1. Verify GitHub App Installation Token via Connect',
          '2. Fetch PR Diff & Changed Files (github__getPullRequest)',
          '3. Evaluate Write Risk & Intent Score',
          '4. Persist Durable Approval Checkpoint',
        ],
        lastRunLogs: [],
      },
    ],
    deployments: [
      {
        id: 'dep-5376e4f',
        commitSha: '5376e4f',
        commitMessage:
          'chore: add deployment manifests (Docker, Compose, Wrangler, Vercel)',
        branch: 'main',
        environment: 'Production',
        region: 'Global Edge + Cloud Run (asia-northeast1)',
        status: 'Healthy',
        deployedAt: '2026-10-27T18:20:00Z',
        durationSec: 24,
        buildLogs: [
          '[18:19:36] Cloning repository 1origin.dev (branch: main, sha: 5376e4f)',
          '[18:19:41] Compiling Next.js 15 App Router standalone bundle...',
          '[18:19:52] Validating wrangler.toml, Dockerfile, and R2 bindings...',
          '[18:19:58] Health check 200 OK on port 3000 — Traffic shifted 100%.',
        ],
      },
      {
        id: 'dep-010bd8b',
        commitSha: '010bd8b',
        commitMessage:
          'feat: complete ONEORIGIN sovereign cloud platform (Workers, R2, AI Gateway, Workflows, Deployments, Webhooks)',
        branch: 'main',
        environment: 'Production',
        region: 'APAC Mesh (BKK / SIN / TYO)',
        status: 'Healthy',
        deployedAt: '2026-10-27T17:55:00Z',
        durationSec: 29,
        buildLogs: [
          '[17:54:31] Building commit 010bd8b on branch main',
          '[17:54:50] Registered 6 cloud platform primitives and API endpoints',
          '[17:55:00] Deployment verified healthy across 3 regional replicas.',
        ],
      },
    ],
    webhooks: [
      {
        id: 'wh-ops-slack',
        name: 'Production Deployment & Alert Relay',
        targetUrl: 'https://hooks.1origin.dev/events/ops-channel',
        events: ['deployment.success', 'workflow.completed', 'agent.alert'],
        secretMasked: 'whsec_9f8a••••••••••••4c21',
        status: 'Verified',
        lastPingStatus: 200,
        lastPingLatencyMs: 18,
        lastTriggeredAt: '2026-10-27T18:20:05Z',
      },
      {
        id: 'wh-r2-indexer',
        name: 'R2 Object Ingest Trigger',
        targetUrl: 'https://api.1origin.dev/webhooks/r2-ingest',
        events: ['r2.upload', 'r2.delete'],
        secretMasked: 'whsec_3d1b••••••••••••8e09',
        status: 'Active',
        lastPingStatus: 200,
        lastPingLatencyMs: 12,
        lastTriggeredAt: '2026-10-27T18:01:12Z',
      },
    ],
    connectedSettings: {
      cloudflareAccountId: '8f4b2e91c0d34a76b5e1209c8a4f13d2',
      remoteSandboxUrl: 'https://sandbox-isolate.1origin.dev/v1/exec',
      webhookSigningSecretConfigured: true,
      lastVerifiedAt: '2026-10-27T18:15:00Z',
    },
  };
}

export function getPlatformStore(): PlatformStoreState {
  if (!globalForStore.__oneoriginStore) {
    globalForStore.__oneoriginStore = createInitialState();
  }
  return globalForStore.__oneoriginStore;
}
