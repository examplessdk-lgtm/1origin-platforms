# ONEORIGIN — 1origin.dev | Sovereign AI Cloud Platform

Production-ready Sovereign AI Cloud Platform built on **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, and **Google GenAI SDK (`@google/genai`)**, inspired by [Cloudflare AI Solutions](https://www.cloudflare.com/solutions/ai/) and the **Geist Dark Aesthetic**.

## Live Verified Capabilities

1. **Autonomous Agent Studio (`/api/platform`)**:
   - Server-side Gemini inference (`gemini-3.8-flash` & `gemini-3.1-flash-lite`) with real latency and token telemetry.
   - Transparent upstream error propagation (selecting deprecated `gemini-2.5-flash` surfaces real `404 NOT_FOUND` diagnostics).
2. **Edge Workers Hosting Platform**:
   - Deploy, inspect, invoke, and delete `v8-edge` (TypeScript/JS) and `python-worker` (Python 3.12) scripts bound to custom routes (`auth.1origin.dev/v1/*`, `api.1origin.dev/mcp/*`).
3. **R2 Object Storage ($0 Egress)**:
   - Create buckets (`oneorigin-agent-checkpoints`, `sovereign-rag-embeddings`), inspect objects, and upload/delete JSON or text artifacts.
4. **AI Gateway & Semantic Cache**:
   - Normalizes incoming prompts and serves repeated requests from edge cache in `~1.4ms` (`HIT`), tracking total requests, hit ratio, and tokens saved.
5. **Durable Workflows Engine**:
   - Multi-step stateful pipelines (`RAG Document Indexing Pipeline` and `Eve GitHub PR Security & Approval Gate`) with step-by-step execution logs.
6. **CI/CD Deployments & HMAC Webhooks**:
   - Trigger deployments with commit logs and register/ping outgoing HMAC-SHA256 webhooks.
7. **Micro-VM Sandbox Security Gate**:
   - Arbitrary external code execution on the host is locked (`403 Locked`) to prevent container escape; provides verified local CPU/RAM/IO diagnostic benchmarks.
