import http from 'http';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PERF_CONFIG } from '../config';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_super_secret_jwt_key_98765';

interface BenchmarkStat {
  actionName: string;
  concurrency: number;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  errorRatePct: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  avgMs: number;
  method: string;
}

function calculatePercentiles(latencies: number[]): { min: number; p50: number; p95: number; p99: number; max: number; avg: number } {
  if (latencies.length === 0) return { min: 0, p50: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  const p50Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.50));
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p99Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));

  return {
    min: sorted[0],
    p50: sorted[p50Idx],
    p95: sorted[p95Idx],
    p99: sorted[p99Idx],
    max: sorted[sorted.length - 1],
    avg: Math.round(total / sorted.length),
  };
}

async function sendServerActionRequest(
  baseUrl: string,
  actionId: string,
  args: any[],
  token?: string
): Promise<{ status: number; durationMs: number }> {
  return new Promise((resolve) => {
    const parsed = new URL(baseUrl);
    const bodyStr = JSON.stringify(args);

    const headers: Record<string, string> = {
      'Next-Action': actionId,
      'Content-Type': 'application/json',
      'Accept': 'text/x-component',
      'Content-Length': Buffer.byteLength(bodyStr).toString(),
    };

    if (token) {
      headers['Cookie'] = `admin_token=${token}`;
    }

    const start = Date.now();
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: '/admin/orders',
        method: 'POST',
        headers,
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, durationMs: Date.now() - start });
        });
      }
    );

    req.on('error', () => {
      resolve({ status: 500, durationMs: Date.now() - start });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 504, durationMs: Date.now() - start });
    });

    req.write(bodyStr);
    req.end();
  });
}

async function runBenchmarkForAction(
  baseUrl: string,
  actionName: string,
  actionId: string,
  args: any[],
  token?: string,
  numCalls = 200
): Promise<{ sequential: BenchmarkStat; concurrent: BenchmarkStat }> {
  console.log(`\n------------------------------------------------`);
  console.log(`Benchmarking Action: [${actionName}] (ID: ${actionId.substring(0, 8)}...)`);
  console.log(`------------------------------------------------`);

  // 1. Sequential Run (200 times)
  console.log(`  -> Running 200 sequential calls...`);
  const seqLatencies: number[] = [];
  let seqErrors = 0;

  for (let i = 0; i < numCalls; i++) {
    const res = await sendServerActionRequest(baseUrl, actionId, args, token);
    if (res.status >= 200 && res.status < 400) {
      seqLatencies.push(res.durationMs);
    } else {
      seqErrors++;
      seqLatencies.push(res.durationMs);
    }
    if ((i + 1) % 50 === 0) {
      process.stdout.write(`     Completed ${i + 1}/${numCalls} sequential calls...\r`);
    }
  }
  console.log(`\n     ✓ Finished sequential.`);

  const seqStats = calculatePercentiles(seqLatencies);
  const sequentialResult: BenchmarkStat = {
    actionName,
    concurrency: 1,
    totalCalls: numCalls,
    successCount: numCalls - seqErrors,
    errorCount: seqErrors,
    errorRatePct: parseFloat(((seqErrors / numCalls) * 100).toFixed(2)),
    minMs: seqStats.min,
    p50Ms: seqStats.p50,
    p95Ms: seqStats.p95,
    p99Ms: seqStats.p99,
    maxMs: seqStats.max,
    avgMs: seqStats.avg,
    method: 'MEASURED (External HTTP Client)',
  };

  // 2. Concurrent Run (10 concurrent workers, 200 total calls)
  console.log(`  -> Running 200 calls at 10 concurrent requests...`);
  const conLatencies: number[] = [];
  let conErrors = 0;
  const CONCURRENCY = 10;
  const callsPerWorker = Math.floor(numCalls / CONCURRENCY);

  const workerPromises = Array.from({ length: CONCURRENCY }, async () => {
    for (let j = 0; j < callsPerWorker; j++) {
      const res = await sendServerActionRequest(baseUrl, actionId, args, token);
      if (res.status >= 200 && res.status < 400) {
        conLatencies.push(res.durationMs);
      } else {
        conErrors++;
        conLatencies.push(res.durationMs);
      }
    }
  });

  await Promise.all(workerPromises);
  console.log(`     ✓ Finished 10-concurrent.`);

  const conStats = calculatePercentiles(conLatencies);
  const concurrentResult: BenchmarkStat = {
    actionName,
    concurrency: 10,
    totalCalls: conLatencies.length,
    successCount: conLatencies.length - conErrors,
    errorCount: conErrors,
    errorRatePct: parseFloat(((conErrors / conLatencies.length) * 100).toFixed(2)),
    minMs: conStats.min,
    p50Ms: conStats.p50,
    p95Ms: conStats.p95,
    p99Ms: conStats.p99,
    maxMs: conStats.max,
    avgMs: conStats.avg,
    method: 'MEASURED (External HTTP Client, Concurrency 10)',
  };

  return { sequential: sequentialResult, concurrent: concurrentResult };
}

export async function runAllBackendBenchmarks(baseUrl: string) {
  const tenant = PERF_CONFIG.tenants[0];
  const token = jwt.sign(
    {
      email: tenant.email,
      restaurantId: tenant.restaurantId,
      restaurantName: tenant.restaurantName,
      role: 'owner',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const actionsToTest = [
    {
      name: 'getRestaurantDetails (Includes Session + Admin Auth)',
      id: '00c3eefa1d6b241181410e3dda87eb068e7139267b',
      args: [],
      useToken: true,
    },
    {
      name: 'getMenuItems (Public Catalog Load)',
      id: '40bfdc420887f65515621753d52c61a36760db8286',
      args: [tenant.restaurantId],
      useToken: false,
    },
    {
      name: 'getAdminOrders (Kitchen Orders Query + Stats)',
      id: '7e90c7dea399a56716845edaf5f14e06791a4e1bd0',
      args: [25, 0, 'all', 'all', 'today'],
      useToken: true,
    },
    {
      name: 'createOrder (POS / QR Place Order)',
      id: '40aef8b7dd88a1e5026737c51ba0d55f2deb8f62d5',
      args: [
        {
          restaurantId: tenant.restaurantId,
          customerName: 'Benchmark Guest',
          customerPhone: '9819999999',
          orderType: 'takeaway',
          paymentMode: 'cash',
          items: [
            {
              menuItemId: '6682f9d8f1b2c4c8d5d90111',
              name: 'Benchmark Item 1',
              price: 180,
              quantity: 2,
            },
          ],
          subtotal: 360,
          total: 360,
        },
      ],
      useToken: false,
    },
    {
      name: 'getCustomersWithSegmentsAction (Customer List)',
      id: '40fc6fb7a6746859fc41449a381503a79d492a8717',
      args: [{ search: '', segment: 'ALL' }],
      useToken: true,
    },
    {
      name: 'getCustomerDetailAction (Customer RFM Details)',
      id: '4078969161103e04034c65e3283c5b4c2a8862e324',
      args: ['9810000005'],
      useToken: true,
    },
    {
      name: 'getCustomerAnalyticsAction (Cohort & Pareto)',
      id: '40b5122601b0d5d74431b865dae691ea57b0a5a5d6',
      args: [],
      useToken: true,
    },
  ];

  const allResults: { sequential: BenchmarkStat[]; concurrent: BenchmarkStat[] } = {
    sequential: [],
    concurrent: [],
  };

  for (const act of actionsToTest) {
    const res = await runBenchmarkForAction(
      baseUrl,
      act.name,
      act.id,
      act.args,
      act.useToken ? token : undefined,
      200
    );
    allResults.sequential.push(res.sequential);
    allResults.concurrent.push(res.concurrent);
  }

  const outPath = path.resolve(process.cwd(), 'perf/results/backend_metrics.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));

  console.log(`\n======================================================`);
  console.log(`✓ All Phase 3 backend benchmarks completed successfully.`);
  console.log(`Results written to: ${outPath}`);
  console.log(`======================================================\n`);

  return allResults;
}

if (require.main === module) {
  const targetUrl = process.argv[2] || PERF_CONFIG.baseUrl;
  runAllBackendBenchmarks(targetUrl).catch((err) => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
}
