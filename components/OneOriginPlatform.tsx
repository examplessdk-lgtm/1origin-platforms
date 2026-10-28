'use client';

import React, {useState, useEffect} from 'react';
import {
  Terminal,
  Database,
  Shield,
  Cpu,
  Globe,
  GitBranch,
  Webhook,
  Search,
  Play,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
  Upload,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Layers,
  Code2,
  Server,
  FileText,
  Sliders,
} from 'lucide-react';
import type {
  EdgeWorker,
  R2Bucket,
  DurableWorkflow,
  DeploymentRecord,
  WebhookEndpoint,
  DocSearchResult,
  BenchmarkDiagnosticResult,
} from '@/lib/platform-engine';

interface TelemetryResponse {
  status: string;
  domain: string;
  timestamp: string;
  hostEnvironment: {
    label: string;
    hostname: string;
    platform: string;
    nodeVersion: string;
    usedMemMB: number;
    totalMemMB: number;
    cpuLoad1m: number;
    uptimeSeconds: number;
    geminiConfigured: boolean;
  };
  federatedEdgeMesh: {
    label: string;
    edgePoPs: number;
    anycastLatencyMs: number;
    regions: Array<{
      code: string;
      city: string;
      status: string;
      latencyMs: number;
      replicas: number;
    }>;
  };
  workers: EdgeWorker[];
  deploymentManifest: string;
  buckets: R2Bucket[];
  gateway: {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    tokensSaved: number;
    latencySavedMs: number;
    hitRatioPercent: number;
    cachedEntriesCount: number;
  };
  workflows: DurableWorkflow[];
  deployments: DeploymentRecord[];
  webhooks: WebhookEndpoint[];
  settings: {
    cloudflareAccountId: string;
    remoteSandboxUrl: string;
    webhookSigningSecretConfigured: boolean;
    lastVerifiedAt: string | null;
  };
}

const CODE_SNIPPETS: Record<'typescript' | 'python' | 'eve' | 'manifests', {title: string; filename: string; code: string}> = {
  typescript: {
    title: 'TypeScript — Edge Worker + AI Gateway',
    filename: 'src/worker.ts',
    code: `export interface Env {
  R2_CHECKPOINTS: R2Bucket;
  AI_GATEWAY_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/v1/agent/run") {
      const payload = await request.json();
      const response = await fetch(env.AI_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-semantic-cache": "true" },
        body: JSON.stringify({ model: "gemini-3.8-flash", prompt: payload.prompt }),
      });
      const result = await response.json();
      await env.R2_CHECKPOINTS.put(\`runs/\${Date.now()}.json\`, JSON.stringify(result));
      return Response.json(result);
    }
    return Response.json({ service: "1origin.dev", pop: "SIN-01", status: "nominal" });
  }
};`,
  },
  python: {
    title: 'Python 3.12 — Autonomous Agent Worker',
    filename: 'workers/agent_router.py',
    code: `from js import Response, fetch, Headers
import json

async def on_fetch(request, env):
    body = await request.json()
    query = body.get("query", "Sovereign AI Cloud Architecture")

    # Query local HNSW Vectorize index before invoking Gemini
    rag_context = await env.VECTORIZE_INDEX.query(query, top_k=3)
    return Response.new(
        json.dumps({
            "domain": "1origin.dev",
            "runtime": "python-worker-3.12",
            "matched_docs": len(rag_context),
            "egress_fee": "$0.00"
        }),
        headers=Headers.new({"content-type": "application/json"}.items())
    )`,
  },
  eve: {
    title: 'Eve Extension — Durable GitHub Tools',
    filename: 'agent/extensions/github.ts',
    code: `import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/oneorigin-connector',
  preset: 'code-review',
  include: ['createIssue', 'mergePullRequest'],
  requireApproval: {
    addPullRequestComment: ({ toolInput }) => toolInput?.owner !== '1origin-dev',
    mergePullRequest: 'always',
  },
})`,
  },
  manifests: {
    title: 'Deployment Manifests — Wrangler & Docker',
    filename: 'wrangler.toml',
    code: `name = "oneorigin-sovereign-cloud"
main = "src/worker.ts"
compatibility_date = "2026-10-27"
account_id = "8f4b2e91c0d34a76b5e1209c8a4f13d2"

[[r2_buckets]]
binding = "R2_CHECKPOINTS"
bucket_name = "oneorigin-agent-checkpoints"

[ai]
binding = "AI"

# Deploy commands:
# git remote add origin https://github.com/1origin-dev/oneorigin-cloud.git
# git push -u origin main && npx wrangler deploy`,
  },
};

export default function OneOriginPlatform({
  initialData,
}: {
  initialData: TelemetryResponse;
}) {
  const [data, setData] = useState<TelemetryResponse>(initialData);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Studio Tabs (Hero / Showcase)
  const [studioTab, setStudioTab] = useState<
    'agent' | 'vector' | 'sandbox' | 'mcp'
  >('agent');

  // Interactive Cloud Console Tabs (6 Full Primitives + Settings)
  const [cloudTab, setCloudTab] = useState<
    | 'workers'
    | 'r2'
    | 'gateway'
    | 'workflows'
    | 'deployments'
    | 'webhooks'
    | 'settings'
  >('workers');

  // 1. Agent Studio State
  const [agentModel, setAgentModel] = useState<string>('gemini-3.8-flash');
  const [agentPrompt, setAgentPrompt] = useState<string>(
    'Explain ONEORIGIN edge routing and semantic caching in 2 sentences'
  );
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentOutput, setAgentOutput] = useState<{
    status: 'ok' | 'error';
    text?: string;
    cacheStatus?: string;
    latencyMs?: number;
    tokensEstimated?: number;
    code?: number;
    statusText?: string;
    message?: string;
    suggestion?: string;
  } | null>({
    status: 'ok',
    cacheStatus: 'HIT',
    latencyMs: 1.4,
    tokensEstimated: 48,
    text: 'ONEORIGIN routes incoming inference calls across Anycast edge PoPs directly to the nearest AI Gateway node, inspecting normalized prompt embeddings before hitting upstream models. Repeated or semantically identical requests return directly from edge memory in ~1.4ms, cutting token costs and upstream latency.',
  });

  // 2. Vectorize Search State
  const [vectorQuery, setVectorQuery] = useState<string>(
    'gVisor sandbox security container escape'
  );
  const [vectorResults, setVectorResults] = useState<DocSearchResult[]>([]);
  const [vectorSearching, setVectorSearching] = useState(false);

  // 3. Micro-VM Sandbox State
  const [selectedBenchmark, setSelectedBenchmark] =
    useState<string>('prime-sieve');
  const [benchmarkResult, setBenchmarkResult] =
    useState<BenchmarkDiagnosticResult | null>(null);
  const [sandboxLockError, setSandboxLockError] = useState<string | null>(null);
  const [sandboxRunning, setSandboxRunning] = useState(false);

  // 4. MCP Hub State
  const [mcpResult, setMcpResult] = useState<{
    toolName: string;
    source: string;
    latencyMs: number;
    payload: unknown;
  } | null>(null);
  const [mcpRunningTool, setMcpRunningTool] = useState<string | null>(null);

  // 5. Workers Hosting State
  const [workerName, setWorkerName] = useState('');
  const [workerRoute, setWorkerRoute] = useState('');
  const [workerRuntime, setWorkerRuntime] = useState<
    'v8-edge' | 'python-worker'
  >('v8-edge');
  const [workerGlobalDistribution, setWorkerGlobalDistribution] =
    useState<boolean>(true);
  const [workerCode, setWorkerCode] = useState(
    `export default {\n  async fetch(request, env) {\n    return Response.json({ status: "ok", pop: "BKK-01" });\n  }\n};`
  );
  const [workerInvokeLog, setWorkerInvokeLog] = useState<string | null>(null);
  const [workerFormError, setWorkerFormError] = useState<string | null>(null);

  // 6. R2 Object Storage State
  const [selectedBucketName, setSelectedBucketName] = useState<string>(
    initialData.buckets[0]?.name || 'oneorigin-agent-checkpoints'
  );
  const [newBucketName, setNewBucketName] = useState('');
  const [newObjectKey, setNewObjectKey] = useState('');
  const [newObjectContent, setNewObjectContent] = useState('');
  const [r2StatusMessage, setR2StatusMessage] = useState<string | null>(null);

  // 7. AI Gateway State
  const [gatewayPrompt, setGatewayPrompt] = useState(
    'Explain ONEORIGIN edge routing and semantic caching in 2 sentences'
  );
  const [gatewayResult, setGatewayResult] = useState<{
    cacheStatus: string;
    latencyMs: number;
    text: string;
  } | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);

  // 8. Workflows State
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>(
    initialData.workflows[0]?.id || 'wf-rag-indexer'
  );
  const [workflowRunning, setWorkflowRunning] = useState(false);

  // 9. Deployments State
  const [commitMessage, setCommitMessage] = useState('');
  const [deployBranch, setDeployBranch] = useState('main');
  const [deployEnv, setDeployEnv] = useState<'Production' | 'Preview'>(
    'Production'
  );
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);

  // 10. Webhooks State
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookPingNotice, setWebhookPingNotice] = useState<string | null>(
    null
  );

  // 11. Settings State
  const [cfAccountId, setCfAccountId] = useState(
    initialData.settings.cloudflareAccountId
  );
  const [remoteSandboxUrl, setRemoteSandboxUrl] = useState(
    initialData.settings.remoteSandboxUrl
  );
  const [settingsFeedback, setSettingsFeedback] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

  // 12. Code Viewer Tab
  const [codeTab, setCodeTab] = useState<
    'typescript' | 'python' | 'eve' | 'manifests'
  >('typescript');
  const [copiedCode, setCopiedCode] = useState(false);

  // Load initial vector search results
  useEffect(() => {
    let active = true;
    fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'vector_search',
        query: 'gVisor sandbox security container escape',
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (active && json.results) {
          setVectorResults(json.results);
        }
      })
      .catch(() => {
        // ignore transient error
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshTelemetry() {
    try {
      const res = await fetch('/api/platform');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch {
      // ignore transient network errors
    }
  }

  async function handleRunAgent(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!agentPrompt.trim()) return;
    setAgentLoading(true);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'agent_inference',
          prompt: agentPrompt,
          model: agentModel,
          useSemanticCache: false,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        setAgentOutput({
          status: 'error',
          code: json.code || res.status,
          statusText: json.statusText || 'NOT_FOUND',
          latencyMs: json.latencyMs || 42,
          message: json.message || 'Upstream inference failed',
          suggestion: json.suggestion,
        });
      } else {
        setAgentOutput({
          status: 'ok',
          text: json.text,
          cacheStatus: json.cacheStatus,
          latencyMs: json.latencyMs,
          tokensEstimated: json.tokensEstimated,
        });
      }
      await refreshTelemetry();
    } catch (err: unknown) {
      setAgentOutput({
        status: 'error',
        code: 500,
        statusText: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setAgentLoading(false);
    }
  }

  async function handleVectorSearch(overrideQuery?: string) {
    const q = overrideQuery !== undefined ? overrideQuery : vectorQuery;
    setVectorSearching(true);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'vector_search', query: q}),
      });
      const json = await res.json();
      if (json.results) {
        setVectorResults(json.results);
      }
    } finally {
      setVectorSearching(false);
    }
  }

  async function handleRunBenchmark() {
    setSandboxRunning(true);
    setSandboxLockError(null);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'sandbox_execute',
          benchmarkId: selectedBenchmark,
        }),
      });
      const json = await res.json();
      if (json.result) {
        setBenchmarkResult(json.result);
      }
    } finally {
      setSandboxRunning(false);
    }
  }

  async function handleTestArbitraryCodeLock() {
    setSandboxRunning(true);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'sandbox_execute',
          customCode: 'import os; os.system("cat /etc/shadow")',
        }),
      });
      const json = await res.json();
      setSandboxLockError(`${json.error} — ${json.message}`);
    } finally {
      setSandboxRunning(false);
    }
  }

  async function handleInvokeMcpTool(toolName: string) {
    setMcpRunningTool(toolName);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'mcp_invoke',
          toolName,
          city: 'Bangkok',
          query: 'Model Context Protocol (MCP) Federation',
        }),
      });
      const json = await res.json();
      setMcpResult({
        toolName,
        source: json.source || 'MCP Verification Gate',
        latencyMs: json.latencyMs || 1.2,
        payload: json.payload || {error: json.message},
      });
    } finally {
      setMcpRunningTool(null);
    }
  }

  async function handleCreateWorker(e: React.FormEvent) {
    e.preventDefault();
    setWorkerFormError(null);
    if (!workerName.trim() || !workerRoute.trim() || !workerCode.trim()) {
      setWorkerFormError(
        'Worker name, route pattern, and script code are required.'
      );
      return;
    }
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'worker_create',
        name: workerName,
        route: workerRoute,
        runtime: workerRuntime,
        code: workerCode,
        globalDistribution: workerGlobalDistribution,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setWorkerFormError(json.error || 'Failed to deploy worker');
      return;
    }
    setWorkerName('');
    setWorkerRoute('');
    if (json.workers && json.deploymentManifest) {
      setData((prev) => ({
        ...prev,
        workers: json.workers,
        deploymentManifest: json.deploymentManifest,
      }));
    }
    setWorkerInvokeLog(
      `Deployed worker '${json.worker.name}' (${json.worker.id}) to route ${json.worker.route} — Target Regions: [${json.worker.targetRegions.join(', ')}]`
    );
    await refreshTelemetry();
  }

  async function handleToggleGlobalDistribution(
    workerId: string,
    nextGlobal: boolean
  ) {
    const allRegions = ['BKK-01', 'SIN-01', 'TYO-01', 'FRA-01'];
    // Immediate optimistic update so checkbox & UI reflect the toggle synchronously
    setData((prev) => ({
      ...prev,
      workers: prev.workers.map((w) =>
        w.id === workerId
          ? {
              ...w,
              globalDistribution: nextGlobal,
              targetRegions: nextGlobal ? allRegions : ['BKK-01'],
            }
          : w
      ),
    }));

    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'worker_toggle_global_distribution',
        workerId,
        globalDistribution: nextGlobal,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setData((prev) => ({
        ...prev,
        workers: json.workers || prev.workers,
        deploymentManifest: json.deploymentManifest || prev.deploymentManifest,
      }));
      setWorkerInvokeLog(
        `Updated deployment manifest for '${json.worker.name}' — Global Distribution: ${json.worker.globalDistribution ? 'Enabled (All 4 Edge Regions)' : 'Disabled (Primary Region Only)'} -> [${json.worker.targetRegions.join(', ')}]`
      );
    }
  }

  async function handleInvokeWorker(workerId: string) {
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'worker_invoke', workerId}),
    });
    const json = await res.json();
    if (res.ok) {
      setWorkerInvokeLog(
        `[200 OK · ${json.latencyMs}ms] ${json.workerName} (${json.route}) -> ${JSON.stringify(json.output)}`
      );
      await refreshTelemetry();
    }
  }

  async function handleDeleteWorker(workerId: string) {
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'worker_delete', workerId}),
    });
    const json = await res.json();
    if (res.ok && json.workers) {
      setData((prev) => ({
        ...prev,
        workers: json.workers,
        deploymentManifest: json.deploymentManifest || prev.deploymentManifest,
      }));
    }
  }

  async function handleCreateBucket(e: React.FormEvent) {
    e.preventDefault();
    if (!newBucketName.trim()) {
      setR2StatusMessage('Error: Please provide a valid bucket name.');
      return;
    }
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'r2_create_bucket', name: newBucketName}),
    });
    const json = await res.json();
    if (!res.ok) {
      setR2StatusMessage(`Error: ${json.error}`);
      return;
    }
    setNewBucketName('');
    setSelectedBucketName(json.bucket.name);
    setR2StatusMessage(`Created R2 bucket '${json.bucket.name}' ($0 Egress)`);
    await refreshTelemetry();
  }

  async function handleUploadR2Object(e: React.FormEvent) {
    e.preventDefault();
    if (!newObjectKey.trim()) {
      setR2StatusMessage('Error: Object key filename is required.');
      return;
    }
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'r2_upload_object',
        bucketName: selectedBucketName,
        key: newObjectKey,
        content:
          newObjectContent ||
          '{"uploadedBy":"1origin-console","verified":true}',
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setNewObjectKey('');
      setNewObjectContent('');
      setR2StatusMessage(
        `Uploaded object '${json.object.key}' (${json.object.sizeBytes} B) to ${selectedBucketName}`
      );
      await refreshTelemetry();
    }
  }

  async function handleDeleteR2Object(bucketName: string, key: string) {
    await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'r2_delete_object', bucketName, key}),
    });
    await refreshTelemetry();
  }

  async function handleGatewayTest(e: React.FormEvent) {
    e.preventDefault();
    if (!gatewayPrompt.trim()) return;
    setGatewayLoading(true);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'gateway_inference',
          prompt: gatewayPrompt,
          model: 'gemini-3.8-flash',
          useSemanticCache: true,
        }),
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setGatewayResult({
          cacheStatus: json.cacheStatus,
          latencyMs: json.latencyMs,
          text: json.text,
        });
      }
      await refreshTelemetry();
    } finally {
      setGatewayLoading(false);
    }
  }

  async function handlePurgeGatewayCache() {
    await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'gateway_purge'}),
    });
    setGatewayResult(null);
    await refreshTelemetry();
  }

  async function handleRunWorkflow(workflowId: string) {
    setWorkflowRunning(true);
    setActiveWorkflowId(workflowId);
    try {
      await fetch('/api/platform', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'workflow_run', workflowId}),
      });
      await refreshTelemetry();
    } finally {
      setWorkflowRunning(false);
    }
  }

  async function handleTriggerDeployment(e: React.FormEvent) {
    e.preventDefault();
    if (!commitMessage.trim()) {
      setDeployFeedback('Error: Commit message is required to trigger build.');
      return;
    }
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'deployment_trigger',
        commitMessage,
        branch: deployBranch,
        environment: deployEnv,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setCommitMessage('');
      setDeployFeedback(
        `Triggered deployment ${json.deployment.id} (commit ${json.deployment.commitSha}) — Status: Healthy`
      );
      await refreshTelemetry();
    }
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookName.trim() || !webhookUrl.startsWith('http')) {
      setWebhookPingNotice(
        'Error: Webhook name and a valid http/https Target URL are required.'
      );
      return;
    }
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'webhook_create',
        name: webhookName,
        targetUrl: webhookUrl,
        events: ['deployment.success', 'r2.upload', 'workflow.completed'],
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setWebhookName('');
      setWebhookUrl('');
      setWebhookPingNotice(
        `Registered webhook '${json.webhook.name}' (${json.webhook.id})`
      );
      await refreshTelemetry();
    }
  }

  async function handlePingWebhook(webhookId: string) {
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'webhook_ping', webhookId}),
    });
    const json = await res.json();
    if (res.ok) {
      setWebhookPingNotice(
        `Pinged ${json.webhook.targetUrl} -> HTTP ${json.responseCode} OK (${json.latencyMs}ms)`
      );
      await refreshTelemetry();
    }
  }

  async function handleVerifySettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsFeedback(null);
    const res = await fetch('/api/platform', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'settings_verify_save',
        cloudflareAccountId: cfAccountId,
        remoteSandboxUrl,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setSettingsFeedback({
        type: 'error',
        text: json.error || 'Validation failed',
      });
    } else {
      setSettingsFeedback({type: 'ok', text: json.message});
      await refreshTelemetry();
    }
  }

  function copySnippet() {
    navigator.clipboard?.writeText(CODE_SNIPPETS[codeTab].code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  }

  const activeBucket =
    data.buckets.find((b) => b.name === selectedBucketName) || data.buckets[0];
  const activeWorkflow =
    data.workflows.find((w) => w.id === activeWorkflowId) || data.workflows[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/[0.14] px-6 py-4">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            ONEORIGIN
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#888888]"
          >
            <a
              href="#interactive-studio"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Agent Studio
            </a>
            <a
              href="#cloud-console"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Cloud Console
            </a>
            <a
              href="#capabilities"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#sdk-primitives"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              SDK & Manifests
            </a>
            <a
              href="#telemetry"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Telemetry
            </a>
          </nav>

          {/* Zone 3: 1 primary action + mobile menu button */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#cloud-console"
              className="px-4 py-2 text-xs font-medium text-white bg-[#f38020] hover:bg-[#e06d10] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Open Cloud Console
            </a>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#888888] hover:text-white rounded-md border border-white/[0.14]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden pt-4 pb-2 mt-4 border-t border-white/[0.14] flex flex-col gap-3 text-sm text-[#888888]"
          >
            <a
              href="#interactive-studio"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white py-1"
            >
              Agent Studio
            </a>
            <a
              href="#cloud-console"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white py-1"
            >
              Cloud Console (Workers, R2, AI Gateway, Workflows)
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white py-1"
            >
              Full-Stack Capabilities
            </a>
            <a
              href="#sdk-primitives"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white py-1"
            >
              SDK & Deployment Manifests
            </a>
            <a
              href="#telemetry"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-white py-1"
            >
              Host vs Edge Telemetry
            </a>
          </nav>
        )}
      </header>

      <main id="top" className="flex-1">
        {/* 1. HERO SECTION + INTERACTIVE DEVELOPER STUDIO */}
        <section className="py-16 md:py-20 px-6 border-b border-white/[0.14] bg-[radial-gradient(ellipse_at_top,_rgba(243,128,32,0.12),_transparent_65%)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#888888] font-mono mb-4">
                <span className="whitespace-nowrap">1origin.dev</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">Sovereign AI Cloud Platform</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">Next.js 15 + Geist Dark Architecture</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-white leading-[1.1] [text-wrap:balance]">
                Deploy Autonomous Agents, Edge Workers &amp; Zero-Egress Storage at Global Scale
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[#888888] leading-relaxed max-w-2xl">
                Inspired by Cloudflare AI Solutions and engineered for sovereign control. Run real-time inference through our semantic AI Gateway, host V8 and Python Workers, store checkpoints in R2 buckets, and orchestrate durable multi-step workflows.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#cloud-console"
                  className="px-5 py-2.5 text-sm font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                >
                  Launch Cloud Console
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#interactive-studio"
                  className="px-5 py-2.5 text-sm font-medium bg-[#171717] hover:bg-[#222222] text-white border border-white/[0.14] rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Test Live Gemini &amp; MCP Studio
                </a>
                <a
                  href="#sdk-primitives"
                  className="px-4 py-2.5 text-sm font-medium text-[#888888] hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  View Git &amp; Wrangler Manifests
                </a>
              </div>
            </div>

            {/* Quantitative Rigor Metrics Row */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-5">
                <div className="text-xs text-[#888888]">Live Host Memory (/proc &amp; OS)</div>
                <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-white">
                  {data.hostEnvironment.usedMemMB} MB / {data.hostEnvironment.totalMemMB} MB
                </div>
                <div className="mt-1 text-xs text-[#888888] font-mono tabular-nums">
                  1m Load: {data.hostEnvironment.cpuLoad1m} · Node {data.hostEnvironment.nodeVersion}
                </div>
              </div>

              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-5">
                <div className="text-xs text-[#888888]">AI Gateway Semantic Cache</div>
                <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-white">
                  {data.gateway.hitRatioPercent}% Hit Rate
                </div>
                <div className="mt-1 text-xs text-[#888888] font-mono tabular-nums">
                  {data.gateway.tokensSaved.toLocaleString()} tokens saved · ~1.4ms HIT
                </div>
              </div>

              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-5">
                <div className="text-xs text-[#888888]">Active Edge Workers &amp; R2</div>
                <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-white">
                  {data.workers.length} Workers · {data.buckets.length} Buckets
                </div>
                <div className="mt-1 text-xs text-[#888888] font-mono tabular-nums">
                  $0.00 Egress Fee · S3-Compatible API
                </div>
              </div>

              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-5">
                <div className="text-xs text-[#888888]">Federated Mesh Blueprint</div>
                <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-white">
                  {data.federatedEdgeMesh.edgePoPs} Edge PoPs
                </div>
                <div className="mt-1 text-xs text-[#888888] font-mono tabular-nums">
                  Reference Architecture · {data.federatedEdgeMesh.anycastLatencyMs}ms Global P50
                </div>
              </div>
            </div>

            {/* Interactive Developer Studio Console (4 Tabs: Agent Studio, Vectorize, Sandbox, MCP Hub) */}
            <div
              id="interactive-studio"
              className="mt-12 bg-[#171717] border border-white/[0.14] rounded-lg overflow-hidden scroll-mt-24"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-[#0a0a0a] border-b border-white/[0.14]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#888888]">
                  <span>console.1origin.dev</span>
                  <span aria-hidden="true">/</span>
                  <span className="text-white">Interactive Developer Workbench</span>
                </div>

                {/* Interactive Filter Tabs */}
                <div
                  role="tablist"
                  aria-label="Developer Workbench Modules"
                  className="flex flex-wrap items-center gap-1 bg-[#171717] p-1 rounded-md border border-white/[0.14]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'agent'}
                    onClick={() => setStudioTab('agent')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      studioTab === 'agent'
                        ? 'bg-[#0a72ef] text-white'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    1. Live Agent Studio
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'vector'}
                    onClick={() => setStudioTab('vector')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      studioTab === 'vector'
                        ? 'bg-[#0a72ef] text-white'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    2. Vectorize &amp; RAG
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'sandbox'}
                    onClick={() => setStudioTab('sandbox')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      studioTab === 'sandbox'
                        ? 'bg-[#0a72ef] text-white'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    3. Micro-VM Sandbox
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'mcp'}
                    onClick={() => setStudioTab('mcp')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      studioTab === 'mcp'
                        ? 'bg-[#0a72ef] text-white'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    4. MCP Protocol Hub
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* TAB 1: LIVE AGENT STUDIO */}
                {studioTab === 'agent' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <form
                      onSubmit={handleRunAgent}
                      className="lg:col-span-5 flex flex-col gap-4"
                    >
                      <div>
                        <label
                          htmlFor="agent-model-select"
                          className="block text-xs font-medium text-[#888888] mb-1.5"
                        >
                          Select Target Model (Live vs Upstream 404 Error Diagnostic)
                        </label>
                        <select
                          id="agent-model-select"
                          value={agentModel}
                          onChange={(e) => setAgentModel(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#0a72ef]"
                        >
                          <option value="gemini-3.8-flash">
                            gemini-3.8-flash — Active Default (Real Inference)
                          </option>
                          <option value="gemini-3.1-flash-lite">
                            gemini-3.1-flash-lite — High-Speed Edge Inference
                          </option>
                          <option value="gemini-2.5-flash">
                            gemini-2.5-flash — Deprecated (Upstream 404 Error Test)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="agent-prompt-input"
                          className="block text-xs font-medium text-[#888888] mb-1.5"
                        >
                          Agent Prompt / Task Instruction
                        </label>
                        <textarea
                          id="agent-prompt-input"
                          rows={4}
                          value={agentPrompt}
                          onChange={(e) => setAgentPrompt(e.target.value)}
                          placeholder="Enter instructions for the ONEORIGIN autonomous agent..."
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded-md p-3 text-sm text-white focus:outline-none focus:border-[#0a72ef]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="submit"
                          disabled={agentLoading}
                          className="px-4 py-2 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {agentLoading ? 'Calling Gemini API...' : 'Run Live Inference'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgentModel('gemini-2.5-flash');
                          }}
                          className="px-3 py-2 text-xs font-medium bg-[#222222] hover:bg-[#2a2a2a] text-[#888888] hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          Select 404 Diagnostic Model
                        </button>
                      </div>
                    </form>

                    <div className="lg:col-span-7 bg-[#0a0a0a] border border-white/[0.14] rounded-md p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/[0.14] pb-3 mb-4 text-xs font-mono text-[#888888]">
                          <span>Model Output &amp; Upstream Telemetry</span>
                          {agentOutput && (
                            <span className="tabular-nums">
                              Latency: {agentOutput.latencyMs}ms
                              {agentOutput.tokensEstimated
                                ? ` · ~${agentOutput.tokensEstimated} tokens`
                                : ''}
                            </span>
                          )}
                        </div>

                        {agentOutput?.status === 'error' ? (
                          <div className="p-4 rounded-md bg-[#ff5b4f]/10 border border-[#ff5b4f]/40 text-sm">
                            <div className="flex items-center gap-2 text-[#ff5b4f] font-mono font-semibold">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>
                                HTTP {agentOutput.code} {agentOutput.statusText} — Upstream Error
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-mono text-white/90 break-words">
                              {agentOutput.message}
                            </p>
                            {agentOutput.suggestion && (
                              <p className="mt-2 text-xs text-[#888888]">
                                Diagnostic Suggestion: {agentOutput.suggestion}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-sans">
                            {agentOutput?.text ||
                              'Submit a prompt to execute live server-side Gemini inference.'}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-3 border-t border-white/[0.14] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#888888]">
                        <span>Endpoint: POST /api/platform (action: agent_inference)</span>
                        <span>
                          Auth: Server-Side GEMINI_API_KEY (Zero Client Secret Exposure)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: VECTORIZE & HYBRID RAG */}
                {studioTab === 'vector' && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <label htmlFor="vector-search-input" className="sr-only">
                          Search Knowledge Corpus
                        </label>
                        <input
                          id="vector-search-input"
                          type="text"
                          value={vectorQuery}
                          onChange={(e) => setVectorQuery(e.target.value)}
                          placeholder="Search 5 indexed architecture markdown documents (e.g., R2 zero egress, MCP tools, gVisor sandbox)..."
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded-md px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#0a72ef]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVectorSearch()}
                        disabled={vectorSearching}
                        className="px-4 py-2 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {vectorSearching ? 'Searching Index...' : 'Query Vector Index'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#888888]">
                      <span>Quick Corpus Queries:</span>
                      {[
                        'gVisor sandbox security container escape',
                        'eve-extension durable approval GitHub tools',
                        'R2 zero egress S3 object storage',
                        'MCP weather telemetry tool schema',
                      ].map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => {
                            setVectorQuery(sample);
                            handleVectorSearch(sample);
                          }}
                          className="px-2.5 py-1 bg-[#0a0a0a] hover:bg-[#222222] text-white/80 rounded border border-white/[0.14] font-mono text-xs transition-colors"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vectorResults.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-[#0a0a0a] border border-white/[0.14] rounded-md p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#888888] mb-1.5">
                              <span>
                                {doc.fileName} · {doc.category}
                              </span>
                              <span className="text-[#0a72ef] font-semibold tabular-nums">
                                Match: {(doc.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-white">
                              {doc.title}
                            </h3>
                            <p className="mt-1.5 text-xs text-[#888888] leading-relaxed">
                              {doc.snippet}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: MICRO-VM SANDBOX */}
                {studioTab === 'sandbox' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="p-4 rounded-md bg-[#0a0a0a] border border-white/[0.14]">
                        <div className="text-xs font-mono text-[#f38020] font-semibold">
                          Host Protection Active (HTTP 403 Gate)
                        </div>
                        <p className="mt-1.5 text-xs text-[#888888] leading-relaxed">
                          To guarantee container isolation, arbitrary unverified user code execution on the application host is locked. You can execute verified in-process diagnostics below, test the 403 security gate, or bind a dedicated remote gVisor Micro-VM Worker URL in Settings.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="benchmark-select"
                          className="block text-xs font-medium text-[#888888] mb-1.5"
                        >
                          Select Verified Local Diagnostic Benchmark
                        </label>
                        <select
                          id="benchmark-select"
                          value={selectedBenchmark}
                          onChange={(e) => setSelectedBenchmark(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#0a72ef]"
                        >
                          <option value="prime-sieve">
                            System Math &amp; Prime Sieve (N=25,000 CPU Benchmark)
                          </option>
                          <option value="memory-buffer">
                            Memory Buffer Allocation &amp; 4KB Page Stride (RAM Benchmark)
                          </option>
                          <option value="corpus-io">
                            Local Corpus I/O Read Throughput (5 Markdown Docs)
                          </option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleRunBenchmark}
                          disabled={sandboxRunning}
                          className="px-4 py-2 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          {sandboxRunning
                            ? 'Executing Benchmark...'
                            : 'Run Verified Diagnostic'}
                        </button>
                        <button
                          type="button"
                          onClick={handleTestArbitraryCodeLock}
                          disabled={sandboxRunning}
                          className="px-4 py-2 text-xs font-medium bg-[#222222] hover:bg-[#2a2a2a] text-white border border-white/[0.14] rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          Simulate Untrusted Payload (Verify 403 Lock)
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-6 bg-[#0a0a0a] border border-white/[0.14] rounded-md p-5 font-mono text-xs">
                      <div className="text-[#888888] pb-2 mb-3 border-b border-white/[0.14] flex justify-between">
                        <span>Sandbox Execution STDOUT / Security Telemetry</span>
                        <span>Status: Isolated</span>
                      </div>
                      {sandboxLockError ? (
                        <div className="text-[#ff5b4f] whitespace-pre-wrap leading-relaxed">
                          {sandboxLockError}
                        </div>
                      ) : benchmarkResult ? (
                        <div className="space-y-2 text-white/90">
                          <div className="text-[#0a72ef] font-semibold">
                            {benchmarkResult.title} — {benchmarkResult.status} (
                            {benchmarkResult.durationMs} ms)
                          </div>
                          <pre className="whitespace-pre-wrap text-xs text-[#888888] leading-relaxed">
                            {benchmarkResult.stdout}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-[#888888]">
                          Click &quot;Run Verified Diagnostic&quot; to measure real host CPU/RAM performance or test the 403 Untrusted Code Lock.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: MCP PROTOCOL HUB */}
                {studioTab === 'mcp' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          name: 'weather_telemetry_fetch',
                          status: 'Live Tool · HTTP JSON',
                          desc: 'Fetches real-time atmospheric telemetry (temperature, humidity, wind) for Bangkok Edge PoP.',
                        },
                        {
                          name: 'system_telemetry',
                          status: 'Live Tool · Host /proc',
                          desc: 'Reads real container memory usage, 1-minute CPU load average, and Node runtime uptime.',
                        },
                        {
                          name: 'vector_rag_query',
                          status: 'Live Tool · Corpus Index',
                          desc: 'Queries the local 5-document architecture corpus with lexical + cosine similarity scoring.',
                        },
                        {
                          name: 'isolated_sandbox_runner',
                          status: 'Restricted · Remote Worker Required',
                          desc: 'Gated behind remote gVisor Micro-VM Worker URL to protect primary container memory.',
                        },
                      ].map((tool) => (
                        <div
                          key={tool.name}
                          className="bg-[#0a0a0a] border border-white/[0.14] rounded-md p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="text-xs font-mono text-[#888888]">
                              {tool.status}
                            </div>
                            <div className="mt-1 text-sm font-mono font-semibold text-white">
                              {tool.name}
                            </div>
                            <p className="mt-1.5 text-xs text-[#888888] leading-relaxed">
                              {tool.desc}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInvokeMcpTool(tool.name)}
                            disabled={mcpRunningTool === tool.name}
                            className="mt-4 px-3 py-1.5 text-xs font-medium bg-[#171717] hover:bg-[#222222] text-white border border-white/[0.14] rounded transition-colors self-start whitespace-nowrap shrink-0"
                          >
                            {mcpRunningTool === tool.name
                              ? 'Invoking...'
                              : `Test Run ${tool.name}`}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-5 bg-[#0a0a0a] border border-white/[0.14] rounded-md p-5 font-mono text-xs">
                      <div className="text-[#888888] pb-2 mb-3 border-b border-white/[0.14]">
                        MCP Tool JSON Response Inspector
                      </div>
                      {mcpResult ? (
                        <div className="space-y-2">
                          <div className="text-white">
                            Tool: <span className="text-[#0a72ef]">{mcpResult.toolName}</span> ·{' '}
                            {mcpResult.latencyMs}ms
                          </div>
                          <div className="text-[#888888]">Source: {mcpResult.source}</div>
                          <pre className="p-3 bg-[#171717] rounded border border-white/[0.14] overflow-x-auto text-white/90">
                            {JSON.stringify(mcpResult.payload, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-[#888888]">
                          Select any MCP tool on the left to execute a live server-side invocation and inspect the structured JSON payload.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE SOVEREIGN CLOUD CONSOLE (ALL 6 CLOUD PLATFORM PRIMITIVES + SETTINGS) */}
        <section
          id="cloud-console"
          className="py-16 px-6 border-b border-white/[0.14] scroll-mt-20"
        >
          <div className="max-w-[1280px] mx-auto">
            <div className="flex flex-col gap-5 mb-8">
              <div>
                <div className="text-xs font-mono text-[#f38020]">
                  01. Interactive Cloud Primitives Control Plane
                </div>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Manage Workers, R2 Storage, AI Gateway, Workflows, Deployments &amp; Webhooks
                </h2>
                <p className="mt-2 text-sm text-[#888888] max-w-2xl">
                  Every module below is wired directly to the server-side platform engine. Create edge workers, upload objects to R2 buckets, test AI Gateway semantic cache hits, run 5-step durable workflows, and trigger CI/CD builds.
                </p>
              </div>

              {/* 7 Cloud Console Module Tabs */}
              <div
                role="tablist"
                aria-label="Sovereign Cloud Console Primitives"
                className="flex flex-wrap items-center gap-1.5 bg-[#171717] p-1.5 rounded-md border border-white/[0.14] w-fit"
              >
                {[
                  {id: 'workers', label: `Edge Workers (${data.workers.length})`},
                  {id: 'r2', label: `R2 Buckets (${data.buckets.length})`},
                  {id: 'gateway', label: 'AI Gateway'},
                  {id: 'workflows', label: `Workflows (${data.workflows.length})`},
                  {id: 'deployments', label: `Deployments (${data.deployments.length})`},
                  {id: 'webhooks', label: `Webhooks (${data.webhooks.length})`},
                  {id: 'settings', label: 'Connect & Settings'},
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={cloudTab === tab.id}
                    onClick={() =>
                      setCloudTab(tab.id as typeof cloudTab)
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      cloudTab === tab.id
                        ? 'bg-[#f38020] text-white'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MODULE 1: EDGE WORKERS HOSTING PLATFORM */}
            {cloudTab === 'workers' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#171717] border border-white/[0.14] rounded-md overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-white/[0.14] flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Deployed Edge Workers &amp; Global Distribution Config
                      </span>
                      <span className="text-xs font-mono text-[#888888] tabular-nums">
                        {data.workers.length} Active Routes
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.14]">
                      {data.workers.map((w) => (
                        <div
                          key={w.id}
                          className="p-4 flex flex-col gap-3 hover:bg-[#222222]/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#888888]">
                                <span className="text-white font-semibold whitespace-nowrap">
                                  {w.name}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="whitespace-nowrap">{w.runtime}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#0a72ef] whitespace-nowrap">
                                  {w.route}
                                </span>
                              </div>
                              <div className="mt-1 text-xs font-mono text-[#888888] tabular-nums">
                                ID: {w.id} · Requests (24h):{' '}
                                {w.requests24h.toLocaleString()} · P50:{' '}
                                {w.p50LatencyMs}ms
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleInvokeWorker(w.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded transition-colors whitespace-nowrap shrink-0"
                              >
                                Test Invoke {w.name}
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete worker ${w.name}`}
                                onClick={() => handleDeleteWorker(w.id)}
                                className="p-1.5 text-[#888888] hover:text-[#ff5b4f] rounded border border-white/[0.14] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Deployment Configuration Row: Global Distribution Toggle & Target Edge Regions */}
                          <div className="pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                            <label
                              htmlFor={`global-dist-${w.id}`}
                              className="inline-flex items-center gap-2.5 cursor-pointer select-none text-white"
                            >
                              <input
                                id={`global-dist-${w.id}`}
                                type="checkbox"
                                checked={Boolean(w.globalDistribution)}
                                onChange={(e) =>
                                  handleToggleGlobalDistribution(
                                    w.id,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 accent-[#f38020] rounded cursor-pointer"
                              />
                              <span className="font-medium">
                                Global Distribution ({w.name})
                              </span>
                            </label>
                            <div className="text-[#888888] tabular-nums">
                              Target Edge Regions:{' '}
                              <span
                                className={
                                  w.globalDistribution
                                    ? 'text-[#f38020] font-semibold'
                                    : 'text-white'
                                }
                              >
                                {(w.targetRegions || ['BKK-01']).join(' · ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {workerInvokeLog && (
                    <div className="p-4 rounded-md bg-[#171717] border border-white/[0.14] font-mono text-xs text-white/90">
                      {workerInvokeLog}
                    </div>
                  )}

                  {/* Live Synchronized Deployment Manifest (wrangler.toml) */}
                  <div className="bg-[#171717] border border-white/[0.14] rounded-md overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0a0a0a] border-b border-white/[0.14] flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-semibold">
                        Live Deployment Manifest (wrangler.toml)
                      </span>
                      <span className="text-[#888888]">
                        Target Regions: BKK-01 · SIN-01 · TYO-01 · FRA-01
                      </span>
                    </div>
                    <pre
                      data-testid="worker-deployment-manifest"
                      className="p-4 text-xs font-mono text-white/90 overflow-x-auto leading-relaxed max-h-64"
                    >
                      {data.deploymentManifest}
                    </pre>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateWorker}
                  className="lg:col-span-5 bg-[#171717] border border-white/[0.14] rounded-md p-5 space-y-4 h-fit"
                >
                  <h3 className="text-sm font-semibold text-white">
                    Deploy New Candidate Edge Worker
                  </h3>

                  {workerFormError && (
                    <div className="p-3 rounded bg-[#ff5b4f]/10 border border-[#ff5b4f]/40 text-xs text-[#ff5b4f]">
                      {workerFormError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="worker-name"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Worker Script Name
                    </label>
                    <input
                      id="worker-name"
                      type="text"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      placeholder="e.g., candidate-inference-proxy"
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="worker-route"
                        className="block text-xs text-[#888888] mb-1"
                      >
                        Route Pattern
                      </label>
                      <input
                        id="worker-route"
                        type="text"
                        value={workerRoute}
                        onChange={(e) => setWorkerRoute(e.target.value)}
                        placeholder="edge.1origin.dev/v2/*"
                        className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="worker-runtime"
                        className="block text-xs text-[#888888] mb-1"
                      >
                        Isolate Runtime
                      </label>
                      <select
                        id="worker-runtime"
                        value={workerRuntime}
                        onChange={(e) =>
                          setWorkerRuntime(
                            e.target.value as 'v8-edge' | 'python-worker'
                          )
                        }
                        className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                      >
                        <option value="v8-edge">v8-edge (TypeScript/JS)</option>
                        <option value="python-worker">
                          python-worker (Python 3.12)
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Deployment Configuration UI: Toggle Global Distribution for New Worker */}
                  <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14] space-y-1.5">
                    <label
                      htmlFor="new-worker-global-distribution"
                      className="flex items-center justify-between cursor-pointer text-xs font-medium text-white"
                    >
                      <span>Global Distribution (Target All Edge Regions)</span>
                      <input
                        id="new-worker-global-distribution"
                        type="checkbox"
                        checked={workerGlobalDistribution}
                        onChange={(e) =>
                          setWorkerGlobalDistribution(e.target.checked)
                        }
                        className="w-4 h-4 accent-[#f38020] rounded cursor-pointer"
                      />
                    </label>
                    <div className="text-xs font-mono text-[#888888]">
                      {workerGlobalDistribution
                        ? 'Targets all 4 architecture edge regions: BKK-01 · SIN-01 · TYO-01 · FRA-01'
                        : 'Targets single regional primary: BKK-01'}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="worker-code"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Worker Handler Code
                    </label>
                    <textarea
                      id="worker-code"
                      rows={4}
                      value={workerCode}
                      onChange={(e) => setWorkerCode(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded p-3 text-xs text-white font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded transition-colors"
                  >
                    Deploy Worker to Edge Mesh
                  </button>
                </form>
              </div>
            )}

            {/* MODULE 2: R2 OBJECT STORAGE */}
            {cloudTab === 'r2' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#171717] border border-white/[0.14] rounded-md p-4 space-y-3">
                    <div className="text-sm font-semibold text-white">
                      R2 Storage Buckets ($0 Egress)
                    </div>
                    <div className="space-y-2">
                      {data.buckets.map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => setSelectedBucketName(b.name)}
                          className={`w-full text-left p-3 rounded border transition-colors ${
                            selectedBucketName === b.name
                              ? 'bg-[#222222] border-[#0a72ef] text-white'
                              : 'bg-[#0a0a0a] border-white/[0.14] text-[#888888] hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-mono font-semibold text-white">
                            {b.name}
                          </div>
                          <div className="mt-1 text-xs font-mono text-[#888888] tabular-nums">
                            {b.region} · {b.objects.length} objects
                          </div>
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={handleCreateBucket}
                      className="pt-3 border-t border-white/[0.14] space-y-2"
                    >
                      <label
                        htmlFor="new-bucket-name"
                        className="block text-xs text-[#888888]"
                      >
                        Create New R2 Bucket
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="new-bucket-name"
                          type="text"
                          value={newBucketName}
                          onChange={(e) => setNewBucketName(e.target.value)}
                          placeholder="model-weights-v2"
                          className="flex-1 bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-1.5 text-xs text-white font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded whitespace-nowrap shrink-0"
                        >
                          Create Bucket
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-[#171717] border border-white/[0.14] rounded-md p-5">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.14]">
                      <div>
                        <h3 className="text-sm font-semibold text-white font-mono">
                          Bucket: {activeBucket?.name}
                        </h3>
                        <p className="text-xs text-[#888888]">
                          Region: {activeBucket?.region} · Storage Class: {activeBucket?.storageClass}
                        </p>
                      </div>
                      {r2StatusMessage && (
                        <span className="text-xs font-mono text-[#0a72ef]">
                          {r2StatusMessage}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-6">
                      {activeBucket?.objects.length === 0 ? (
                        <div className="text-xs text-[#888888] py-4">
                          No objects in this bucket yet. Upload a JSON or text artifact below.
                        </div>
                      ) : (
                        activeBucket?.objects.map((obj) => (
                          <div
                            key={obj.key}
                            className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-mono font-semibold text-white">
                                {obj.key}
                              </div>
                              <div className="text-xs font-mono text-[#888888] tabular-nums">
                                {obj.sizeBytes.toLocaleString()} Bytes · {obj.contentType}
                              </div>
                              <div className="mt-1 text-xs font-mono text-[#888888] truncate max-w-md">
                                {obj.contentPreview}
                              </div>
                            </div>
                            <button
                              type="button"
                              aria-label={`Delete object ${obj.key}`}
                              onClick={() =>
                                handleDeleteR2Object(activeBucket.name, obj.key)
                              }
                              className="px-2.5 py-1 text-xs font-mono text-[#888888] hover:text-[#ff5b4f] border border-white/[0.14] rounded self-start sm:self-center"
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      onSubmit={handleUploadR2Object}
                      className="pt-4 border-t border-white/[0.14] grid grid-cols-1 sm:grid-cols-12 gap-3"
                    >
                      <div className="sm:col-span-4">
                        <label
                          htmlFor="r2-object-key"
                          className="block text-xs text-[#888888] mb-1"
                        >
                          Object Key / Path
                        </label>
                        <input
                          id="r2-object-key"
                          type="text"
                          value={newObjectKey}
                          onChange={(e) => setNewObjectKey(e.target.value)}
                          placeholder="configs/agent-policy.json"
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label
                          htmlFor="r2-object-content"
                          className="block text-xs text-[#888888] mb-1"
                        >
                          Payload Content (JSON / Text)
                        </label>
                        <input
                          id="r2-object-content"
                          type="text"
                          value={newObjectContent}
                          onChange={(e) => setNewObjectContent(e.target.value)}
                          placeholder='{"preset":"maintainer","requireApproval":"auto"}'
                          className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-end">
                        <button
                          type="submit"
                          className="w-full py-2 text-xs font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded transition-colors whitespace-nowrap"
                        >
                          Upload to R2
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 3: AI GATEWAY & SEMANTIC CACHE */}
            {cloudTab === 'gateway' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-[#171717] border border-white/[0.14] rounded-md p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      AI Gateway Telemetry &amp; Cache Control
                    </h3>
                    <button
                      type="button"
                      onClick={handlePurgeGatewayCache}
                      className="px-3 py-1 text-xs font-medium bg-[#222222] hover:bg-[#ff5b4f] text-white rounded transition-colors"
                    >
                      Purge Semantic Cache
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14]">
                      <div className="text-xs text-[#888888]">Cache Hit Ratio</div>
                      <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                        {data.gateway.hitRatioPercent}%
                      </div>
                    </div>
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14]">
                      <div className="text-xs text-[#888888]">Total Requests</div>
                      <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                        {data.gateway.totalRequests}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14]">
                      <div className="text-xs text-[#888888]">Tokens Saved</div>
                      <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                        {data.gateway.tokensSaved.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14]">
                      <div className="text-xs text-[#888888]">Latency Saved</div>
                      <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                        {(data.gateway.latencySavedMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleGatewayTest}
                  className="lg:col-span-7 bg-[#171717] border border-white/[0.14] rounded-md p-5 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-white">
                    Test Semantic Cache HIT (~1.4ms) vs Upstream MISS
                  </h3>
                  <div>
                    <label
                      htmlFor="gateway-prompt-input"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Gateway Prompt (Run twice to verify deterministic cache HIT)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="gateway-prompt-input"
                        type="text"
                        value={gatewayPrompt}
                        onChange={(e) => setGatewayPrompt(e.target.value)}
                        className="flex-1 bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="submit"
                        disabled={gatewayLoading}
                        className="px-4 py-2 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded whitespace-nowrap shrink-0"
                      >
                        {gatewayLoading ? 'Routing...' : 'Send via AI Gateway'}
                      </button>
                    </div>
                  </div>

                  {gatewayResult && (
                    <div className="p-4 rounded bg-[#0a0a0a] border border-white/[0.14] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#0a72ef] font-semibold">
                          Cache Status: {gatewayResult.cacheStatus}
                        </span>
                        <span className="text-[#888888] tabular-nums">
                          Gateway Latency: {gatewayResult.latencyMs} ms
                        </span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed">
                        {gatewayResult.text}
                      </p>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* MODULE 4: DURABLE WORKFLOWS ENGINE */}
            {cloudTab === 'workflows' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  {data.workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className={`p-4 rounded-md border transition-colors ${
                        activeWorkflowId === wf.id
                          ? 'bg-[#171717] border-[#0a72ef]'
                          : 'bg-[#171717] border-white/[0.14]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-[#888888]">
                        <span>Trigger: {wf.trigger}</span>
                        <span className="text-white">{wf.lastStatus}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-white">
                        {wf.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#888888] leading-relaxed">
                        {wf.description}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunWorkflow(wf.id)}
                          disabled={workflowRunning}
                          className="px-3 py-1.5 text-xs font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded transition-colors"
                        >
                          {workflowRunning && activeWorkflowId === wf.id
                            ? 'Executing Steps...'
                            : `Run Workflow (${wf.steps.length} Steps)`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-7 bg-[#171717] border border-white/[0.14] rounded-md p-5">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.14]">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Durable Step Execution Log: {activeWorkflow?.name}
                      </h3>
                      <p className="text-xs font-mono text-[#888888]">
                        Last Run: {activeWorkflow?.lastRunAt || 'Ready'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeWorkflow?.lastRunLogs &&
                    activeWorkflow.lastRunLogs.length > 0 ? (
                      activeWorkflow.lastRunLogs.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14] font-mono text-xs"
                        >
                          <div className="flex items-center justify-between text-white">
                            <span>{step.name}</span>
                            <span className="text-[#0a72ef] tabular-nums">
                              {step.status.toUpperCase()} · {step.durationMs}ms
                            </span>
                          </div>
                          <div className="mt-1 text-[#888888]">{step.output}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#888888] py-4">
                        Click &quot;Run Workflow&quot; to execute all durable steps and commit state checkpoints.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 5: CI/CD DEPLOYMENTS PIPELINE */}
            {cloudTab === 'deployments' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  {data.deployments.map((dep) => (
                    <div
                      key={dep.id}
                      className="bg-[#171717] border border-white/[0.14] rounded-md p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-white font-semibold">
                          {dep.environment} · Commit {dep.commitSha} ({dep.branch})
                        </span>
                        <span className="text-[#0a72ef] tabular-nums">
                          {dep.status} · {dep.durationSec}s
                        </span>
                      </div>
                      <div className="text-sm text-white">{dep.commitMessage}</div>
                      <div className="text-xs font-mono text-[#888888]">
                        Region: {dep.region} · Deployed: {dep.deployedAt}
                      </div>
                      <div className="p-2.5 rounded bg-[#0a0a0a] border border-white/[0.14] font-mono text-xs text-[#888888] space-y-1">
                        {dep.buildLogs.map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleTriggerDeployment}
                  className="lg:col-span-5 bg-[#171717] border border-white/[0.14] rounded-md p-5 space-y-4 h-fit"
                >
                  <h3 className="text-sm font-semibold text-white">
                    Trigger New CI/CD Deployment
                  </h3>
                  {deployFeedback && (
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/[0.14] text-xs font-mono text-[#0a72ef]">
                      {deployFeedback}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="deploy-commit-msg"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Commit Message
                    </label>
                    <input
                      id="deploy-commit-msg"
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="feat: update R2 vector index binding"
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="deploy-branch"
                        className="block text-xs text-[#888888] mb-1"
                      >
                        Git Branch
                      </label>
                      <input
                        id="deploy-branch"
                        type="text"
                        value={deployBranch}
                        onChange={(e) => setDeployBranch(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="deploy-env"
                        className="block text-xs text-[#888888] mb-1"
                      >
                        Target Environment
                      </label>
                      <select
                        id="deploy-env"
                        value={deployEnv}
                        onChange={(e) =>
                          setDeployEnv(
                            e.target.value as 'Production' | 'Preview'
                          )
                        }
                        className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                      >
                        <option value="Production">Production</option>
                        <option value="Preview">Preview</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded transition-colors"
                  >
                    Trigger Build &amp; Rollout
                  </button>
                </form>
              </div>
            )}

            {/* MODULE 6: WEBHOOKS & EVENT TRIGGERS */}
            {cloudTab === 'webhooks' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  {data.webhooks.map((wh) => (
                    <div
                      key={wh.id}
                      className="bg-[#171717] border border-white/[0.14] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">
                          {wh.name}
                        </div>
                        <div className="text-xs font-mono text-[#0a72ef]">
                          {wh.targetUrl}
                        </div>
                        <div className="text-xs font-mono text-[#888888]">
                          Events: {wh.events.join(', ')} · Secret: {wh.secretMasked}
                        </div>
                        {wh.lastPingStatus && (
                          <div className="text-xs font-mono text-[#888888] tabular-nums">
                            Last Ping: HTTP {wh.lastPingStatus} OK ({wh.lastPingLatencyMs}ms)
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePingWebhook(wh.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded whitespace-nowrap shrink-0"
                      >
                        Test Ping {wh.name}
                      </button>
                    </div>
                  ))}

                  {webhookPingNotice && (
                    <div className="p-3 rounded bg-[#171717] border border-white/[0.14] font-mono text-xs text-white">
                      {webhookPingNotice}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleCreateWebhook}
                  className="lg:col-span-5 bg-[#171717] border border-white/[0.14] rounded-md p-5 space-y-4 h-fit"
                >
                  <h3 className="text-sm font-semibold text-white">
                    Register Outgoing HMAC Webhook
                  </h3>
                  <div>
                    <label
                      htmlFor="webhook-name"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Webhook Label
                    </label>
                    <input
                      id="webhook-name"
                      type="text"
                      value={webhookName}
                      onChange={(e) => setWebhookName(e.target.value)}
                      placeholder="PagerDuty Incident Dispatch"
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="webhook-url"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Target Endpoint URL (HTTPS)
                    </label>
                    <input
                      id="webhook-url"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://events.1origin.dev/webhook"
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-medium bg-[#f38020] hover:bg-[#e06d10] text-white rounded transition-colors"
                  >
                    Register Webhook Endpoint
                  </button>
                </form>
              </div>
            )}

            {/* MODULE 7: CONNECT & SETTINGS VALIDATION */}
            {cloudTab === 'settings' && (
              <div className="max-w-2xl bg-[#171717] border border-white/[0.14] rounded-md p-6 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Cloudflare Account &amp; Remote Micro-VM Sandbox Connection
                  </h3>
                  <p className="mt-1 text-xs text-[#888888]">
                    Server-side secrets (`GEMINI_API_KEY`) are managed automatically by the platform runtime without exposing keys in the browser. Validate your 32-character hexadecimal Cloudflare Account ID and Remote Sandbox Worker endpoint below.
                  </p>
                </div>

                {settingsFeedback && (
                  <div
                    className={`p-3 rounded border text-xs font-mono ${
                      settingsFeedback.type === 'ok'
                        ? 'bg-[#0a72ef]/10 border-[#0a72ef]/40 text-white'
                        : 'bg-[#ff5b4f]/10 border-[#ff5b4f]/40 text-[#ff5b4f]'
                    }`}
                  >
                    {settingsFeedback.text}
                  </div>
                )}

                <form onSubmit={handleVerifySettings} className="space-y-4">
                  <div>
                    <label
                      htmlFor="cf-account-id"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Cloudflare Account ID (32-Character Hexadecimal)
                    </label>
                    <input
                      id="cf-account-id"
                      type="text"
                      value={cfAccountId}
                      onChange={(e) => setCfAccountId(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="remote-sandbox-url"
                      className="block text-xs text-[#888888] mb-1"
                    >
                      Dedicated Remote Micro-VM Sandbox Worker URL
                    </label>
                    <input
                      id="remote-sandbox-url"
                      type="url"
                      value={remoteSandboxUrl}
                      onChange={(e) => setRemoteSandboxUrl(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/[0.14] rounded px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium bg-[#0a72ef] hover:bg-[#0860ca] text-white rounded transition-colors"
                  >
                    Test Connection First &amp; Save Configuration
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* 3. FULL-STACK CAPABILITIES BENTO GRID (INSPIRED BY CLOUDFLARE AI SOLUTIONS) */}
        <section
          id="capabilities"
          className="py-16 px-6 border-b border-white/[0.14] scroll-mt-20"
        >
          <div className="max-w-[1280px] mx-auto">
            <div className="max-w-2xl mb-10">
              <div className="text-xs font-mono text-[#f38020]">
                02. The Sovereign Full-Stack for Autonomous Systems
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Six Integrated Primitives Engineered for Production AI Workloads
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  index: '01. Edge Workers & Model Catalog',
                  state: 'Live & Connected',
                  desc: 'Execute serverless V8 and Python 3.12 workers alongside multi-model Gemini inference with deterministic routing and zero cold starts.',
                  targetTab: 'workers' as const,
                },
                {
                  index: '02. Autonomous Agents SDK & Eve',
                  state: 'Live & Connected',
                  desc: 'Mount @github-tools/eve-extension with 84 GitHub tools, durable workflow replay, and predicate-based human approval gates.',
                  targetTab: 'workflows' as const,
                },
                {
                  index: '03. R2 Zero-Egress Object Storage',
                  state: 'Live & Connected',
                  desc: 'Store agent checkpoints, RAG embeddings, and model artifacts across multi-region buckets without outbound bandwidth charges.',
                  targetTab: 'r2' as const,
                },
                {
                  index: '04. AI Gateway & Semantic Cache',
                  state: 'Live & Connected',
                  desc: 'Intercept duplicate and semantically equivalent prompts at the edge, serving cached responses in ~1.4ms while tracking token savings.',
                  targetTab: 'gateway' as const,
                },
                {
                  index: '05. Host-Isolated Micro-VM Sandboxes',
                  state: '403 Host Lock Active',
                  desc: 'Prevent container escape by locking arbitrary code execution on the host while running verified diagnostics and routing untrusted code to gVisor isolates.',
                  targetTab: 'settings' as const,
                },
                {
                  index: '06. CI/CD Deployments & HMAC Webhooks',
                  state: 'Live & Connected',
                  desc: 'Trigger zero-downtime builds with full commit logs and dispatch HMAC-SHA256 signed webhook events to external pipelines.',
                  targetTab: 'deployments' as const,
                },
              ].map((card) => (
                <div
                  key={card.index}
                  className="bg-[#171717] border border-white/[0.14] rounded-md p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-xs font-mono text-[#888888]">
                      {card.state}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white">
                      {card.index}
                    </h3>
                    <p className="mt-2 text-sm text-[#888888] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <a
                    href="#cloud-console"
                    onClick={() => setCloudTab(card.targetTab)}
                    className="mt-5 text-xs font-medium text-[#f38020] hover:underline inline-flex items-center gap-1.5"
                  >
                    Open in Cloud Console
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. SDK PRIMITIVES & DEPLOYMENT MANIFESTS */}
        <section
          id="sdk-primitives"
          className="py-16 px-6 border-b border-white/[0.14] scroll-mt-20"
        >
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-mono text-[#f38020]">
                03. Code Primitives &amp; Production Deployment
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Write Once, Deploy to Cloudflare Workers, Docker or Cloud Run
              </h2>
              <p className="text-sm text-[#888888] leading-relaxed">
                Inspect our production TypeScript and Python Worker handlers, `@github-tools/eve-extension` configuration, and ready-to-deploy `wrangler.toml` manifests.
              </p>

              <div className="pt-2 space-y-2 text-xs font-mono text-[#888888]">
                <div>1. Download project snapshot or clone repository (`main` branch)</div>
                <div>2. Push to GitHub: `git push -u origin main`</div>
                <div>3. Deploy to Edge: `npx wrangler deploy` or `docker compose up -d`</div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#171717] border border-white/[0.14] rounded-md overflow-hidden">
              <div className="px-4 py-3 bg-[#0a0a0a] border-b border-white/[0.14] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {(['typescript', 'python', 'eve', 'manifests'] as const).map(
                    (lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setCodeTab(lang)}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                          codeTab === lang
                            ? 'bg-[#222222] text-white'
                            : 'text-[#888888] hover:text-white'
                        }`}
                      >
                        {CODE_SNIPPETS[lang].filename}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={copySnippet}
                  className="px-2.5 py-1 text-xs font-mono text-[#888888] hover:text-white border border-white/[0.14] rounded inline-flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#0a72ef]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 text-xs font-mono text-white/90 overflow-x-auto leading-relaxed">
                {codeTab === 'manifests'
                  ? data.deploymentManifest || CODE_SNIPPETS.manifests.code
                  : CODE_SNIPPETS[codeTab].code}
              </pre>
            </div>
          </div>
        </section>

        {/* 5. TRANSPARENT HOST TELEMETRY VS FEDERATED EDGE BLUEPRINT */}
        <section
          id="telemetry"
          className="py-16 px-6 border-b border-white/[0.14] scroll-mt-20"
        >
          <div className="max-w-[1280px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs font-mono text-[#f38020]">
                  04. Verified System Transparency
                </div>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Live Container Host Metrics vs. Federated Edge Architecture Blueprint
                </h2>
              </div>
              <button
                type="button"
                onClick={refreshTelemetry}
                className="px-3.5 py-2 text-xs font-medium bg-[#171717] hover:bg-[#222222] text-white border border-white/[0.14] rounded-md inline-flex items-center gap-2 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Live Telemetry
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Container Host */}
              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-6">
                <div className="text-xs font-mono text-[#0a72ef]">
                  {data.hostEnvironment.label}
                </div>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Real-Time Application Server Telemetry
                </h3>
                <div className="mt-4 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.08]">
                    <span className="text-[#888888]">OS &amp; Kernel Platform</span>
                    <span className="text-white">{data.hostEnvironment.platform}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.08]">
                    <span className="text-[#888888]">Memory Allocated / Total</span>
                    <span className="text-white tabular-nums">
                      {data.hostEnvironment.usedMemMB} MB / {data.hostEnvironment.totalMemMB} MB
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.08]">
                    <span className="text-[#888888]">CPU 1-Minute Load Average</span>
                    <span className="text-white tabular-nums">
                      {data.hostEnvironment.cpuLoad1m}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#888888]">Container Uptime</span>
                    <span className="text-white tabular-nums">
                      {data.hostEnvironment.uptimeSeconds.toLocaleString()} seconds
                    </span>
                  </div>
                </div>
              </div>

              {/* Federated Edge Blueprint */}
              <div className="bg-[#171717] border border-white/[0.14] rounded-md p-6">
                <div className="text-xs font-mono text-[#f38020]">
                  {data.federatedEdgeMesh.label}
                </div>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Global Anycast Regional Replicas (328 PoPs)
                </h3>
                <div className="mt-4 space-y-2.5 text-xs font-mono">
                  {data.federatedEdgeMesh.regions.map((reg) => (
                    <div
                      key={reg.code}
                      className="flex items-center justify-between py-1.5 border-b border-white/[0.08] last:border-none"
                    >
                      <span className="text-white">
                        {reg.code} · {reg.city}
                      </span>
                      <span className="text-[#888888] tabular-nums">
                        {reg.status} · {reg.replicas} Replicas · {reg.latencyMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-[#0a0a0a] px-6 py-10 text-xs text-[#888888]">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-white">ONEORIGIN — 1origin.dev</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Sovereign AI Cloud Platform</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#interactive-studio" className="hover:text-white transition-colors">
              Agent Studio
            </a>
            <a href="#cloud-console" className="hover:text-white transition-colors">
              Cloud Console
            </a>
            <a href="#sdk-primitives" className="hover:text-white transition-colors">
              Deployment Manifests
            </a>
            <a href="#telemetry" className="hover:text-white transition-colors">
              System Telemetry
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
