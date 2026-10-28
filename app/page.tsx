import OneOriginPlatform from '@/components/OneOriginPlatform';
import {
  getLiveHostTelemetry,
  calculateCacheHitRatio,
} from '@/lib/platform-engine';
import {getPlatformStore} from '@/lib/platform-store';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const store = getPlatformStore();
  const host = getLiveHostTelemetry();
  const hitRatio = calculateCacheHitRatio(
    store.gatewayMetrics.cacheHits,
    store.gatewayMetrics.cacheMisses
  );

  const initialData = {
    status: 'operational',
    domain: '1origin.dev',
    timestamp: new Date().toISOString(),
    hostEnvironment: {
      label: 'Live Container Host (/proc & os telemetry)',
      ...host,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    },
    federatedEdgeMesh: {
      label: 'Reference Blueprint / Architecture Showcase',
      edgePoPs: 328,
      anycastLatencyMs: 32,
      regions: [
        {
          code: 'BKK-01',
          city: 'Bangkok',
          status: 'Healthy',
          latencyMs: 14,
          replicas: 4,
        },
        {
          code: 'SIN-01',
          city: 'Singapore',
          status: 'Healthy',
          latencyMs: 19,
          replicas: 6,
        },
        {
          code: 'TYO-01',
          city: 'Tokyo',
          status: 'Healthy',
          latencyMs: 34,
          replicas: 4,
        },
        {
          code: 'FRA-01',
          city: 'Frankfurt',
          status: 'Healthy',
          latencyMs: 88,
          replicas: 3,
        },
      ],
    },
    workers: store.workers,
    deploymentManifest: store.deploymentManifest,
    buckets: store.buckets,
    gateway: {
      ...store.gatewayMetrics,
      hitRatioPercent: hitRatio,
      cachedEntriesCount: store.gatewayCache.size,
    },
    workflows: store.workflows,
    deployments: store.deployments,
    webhooks: store.webhooks,
    settings: store.connectedSettings,
  };

  return <OneOriginPlatform initialData={initialData} />;
}
