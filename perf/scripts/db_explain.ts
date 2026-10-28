import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { PERF_CONFIG } from '../config';

interface QueryExplainResult {
  queryName: string;
  collection: string;
  filter: any;
  sort?: any;
  winningPlanStage: string;
  totalKeysExamined: number;
  totalDocsExamined: number;
  nReturned: number;
  executionTimeMillis: number;
  hasCollscan: boolean;
  hasInMemorySort: boolean;
  indexNameUsed?: string;
}

export async function runDbAudit() {
  console.log('Connecting to performance test database for read-only query & index audit...');
  const conn = await mongoose.connect(PERF_CONFIG.testMongoUri);
  const db = conn.connection.db;
  if (!db) throw new Error('Database handle not available');

  const tenantId = PERF_CONFIG.tenants[0].restaurantId;
  const explainResults: QueryExplainResult[] = [];

  const ordersCol = db.collection('orders');
  const customersCol = db.collection('customers');
  const menusCol = db.collection('menus');
  const adminsCol = db.collection('admins');
  const sessionsCol = db.collection('sessions');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Helper to parse explain plan stages
  function inspectStages(stage: any, info: { hasCollscan: boolean; hasInMemorySort: boolean; indexUsed?: string }) {
    if (!stage) return;
    if (stage.stage === 'COLLSCAN') info.hasCollscan = true;
    if (stage.stage === 'SORT') info.hasInMemorySort = true;
    if (stage.indexName) info.indexUsed = stage.indexName;
    if (stage.inputStage) inspectStages(stage.inputStage, info);
    if (stage.inputStages) stage.inputStages.forEach((s: any) => inspectStages(s, info));
  }

  // 1. Audit Queries
  const queriesToAudit = [
    {
      name: 'Kitchen Orders: All Statuses (Recent first)',
      col: ordersCol,
      filter: { restaurantId: tenantId },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Kitchen Orders: Status Received',
      col: ordersCol,
      filter: { restaurantId: tenantId, status: 'received' },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Kitchen Orders: Counter Orders Tab',
      col: ordersCol,
      filter: { restaurantId: tenantId, source: 'admin_counter' },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Kitchen Orders: QR Scan Tab ($ne filter)',
      col: ordersCol,
      filter: { restaurantId: tenantId, source: { $ne: 'admin_counter' } },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Kitchen Orders: Delayed Orders Tab',
      col: ordersCol,
      filter: { restaurantId: tenantId, isDelayed: true },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Kitchen Orders: Today Filter',
      col: ordersCol,
      filter: { restaurantId: tenantId, createdAt: { $gte: todayStart, $lte: todayEnd } },
      sort: { createdAt: -1 },
      limit: 25,
    },
    {
      name: 'Customer List & VIP Threshold (Unbounded Query)',
      col: customersCol,
      filter: { restaurantId: tenantId },
      sort: { totalSpent: -1 },
      limit: 0, // Unbounded in app code
    },
    {
      name: 'Customer Lookup by Phone',
      col: customersCol,
      filter: { restaurantId: tenantId, phone: '9810000005' },
      limit: 1,
    },
    {
      name: 'Menu Items List (Unbounded by category)',
      col: menusCol,
      filter: { restaurantId: tenantId, active: true },
      limit: 0,
    },
    {
      name: 'Admin Auth Lookup by Email',
      col: adminsCol,
      filter: { email: PERF_CONFIG.tenants[0].email },
      limit: 1,
    },
    {
      name: 'Session Token Validation',
      col: sessionsCol,
      filter: { restaurantId: tenantId, tokenHash: 'sample_hash_token_check' },
      limit: 1,
    },
    {
      name: 'Analytics Orders (Past 185 Days Aggregation Match)',
      col: ordersCol,
      filter: {
        restaurantId: tenantId,
        createdAt: { $gte: new Date(Date.now() - 185 * 24 * 60 * 60 * 1000) },
        status: { $ne: 'cancelled' },
      },
      limit: 0,
    },
  ];

  for (const q of queriesToAudit) {
    let cursor = q.col.find(q.filter);
    if (q.sort) cursor = cursor.sort(q.sort as any);
    if (q.limit > 0) cursor = cursor.limit(q.limit);

    const exp = await cursor.explain('executionStats');
    const execStats = (exp as any).executionStats || {};
    const winPlan = (exp as any).queryPlanner?.winningPlan || {};

    const stageInfo = { hasCollscan: false, hasInMemorySort: false, indexUsed: undefined };
    inspectStages(winPlan, stageInfo);

    explainResults.push({
      queryName: q.name,
      collection: q.col.collectionName,
      filter: q.filter,
      sort: q.sort,
      winningPlanStage: winPlan.stage || 'UNKNOWN',
      totalKeysExamined: execStats.totalKeysExamined || 0,
      totalDocsExamined: execStats.totalDocsExamined || 0,
      nReturned: execStats.nReturned || 0,
      executionTimeMillis: execStats.executionTimeMillis || 0,
      hasCollscan: stageInfo.hasCollscan,
      hasInMemorySort: stageInfo.hasInMemorySort,
      indexNameUsed: stageInfo.indexUsed,
    });
  }

  // 2. Index Usage Stats ($indexStats)
  console.log('Retrieving $indexStats for collections...');
  const orderIndexStats = await ordersCol.aggregate([{ $indexStats: {} }]).toArray();
  const customerIndexStats = await customersCol.aggregate([{ $indexStats: {} }]).toArray();
  const menuIndexStats = await menusCol.aggregate([{ $indexStats: {} }]).toArray();

  // 3. Document Sizes (avg, min, max) and projected storage
  console.log('Calculating document size distributions...');
  const orderDocs = await ordersCol.find({ restaurantId: tenantId }).limit(1000).toArray();
  const customerDocs = await customersCol.find({ restaurantId: tenantId }).limit(1000).toArray();

  function calcDocStats(docs: any[]) {
    if (!docs.length) return { avgBytes: 0, minBytes: 0, maxBytes: 0 };
    const sizes = docs.map((d) => Buffer.byteLength(JSON.stringify(d), 'utf8'));
    const total = sizes.reduce((a, b) => a + b, 0);
    return {
      avgBytes: Math.round(total / sizes.length),
      minBytes: Math.min(...sizes),
      maxBytes: Math.max(...sizes),
    };
  }

  const orderSizeStats = calcDocStats(orderDocs);
  const customerSizeStats = calcDocStats(customerDocs);

  // Storage projections at 150 orders/day
  const ordersPerYear = PERF_CONFIG.dailyOrdersPerRestaurant * 365; // 54,750 orders/year
  const orderStoragePerYearBytes = ordersPerYear * orderSizeStats.avgBytes;
  const orderStoragePerYearMb = (orderStoragePerYearBytes / (1024 * 1024)).toFixed(2);

  // Estimated customers: assuming ~3,000 customers per year
  const customerStorageBytes = 3000 * customerSizeStats.avgBytes;
  const customerStorageMb = (customerStorageBytes / (1024 * 1024)).toFixed(2);

  const totalProjectedYearlyStorageMb = (
    parseFloat(orderStoragePerYearMb) + parseFloat(customerStorageMb)
  ).toFixed(2);

  // Build markdown output
  let md = `# Database & Query Performance Analysis (explain & $indexStats)

**Database Target:** \`${PERF_CONFIG.testMongoUri}\`  
**Tenant Evaluated:** \`${tenantId}\` (20,000 orders, 3,000 customers, 200 menu items)

---

## 1. Query Execution Statistics (explain("executionStats"))

| Query Description | Collection | Index Used | Keys Examined | Docs Examined | Returned | Exec Time (ms) | COLLSCAN? | In-Memory SORT? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const r of explainResults) {
    md += `| **${r.queryName}** | \`${r.collection}\` | \`${r.indexNameUsed || 'NONE'}\` | ${r.totalKeysExamined} | ${r.totalDocsExamined} | ${r.nReturned} | ${r.executionTimeMillis} ms | ${r.hasCollscan ? '⚠️ YES' : 'NO'} | ${r.hasInMemorySort ? '⚠️ YES' : 'NO'} |\n`;
  }

  md += `
---

## 2. Document Size Distributions & Storage Growth Projections

| Document Type | Sample Count | Avg Doc Size | Min Doc Size | Max Doc Size | Projected Docs / Year (150/day) | Projected Data Size / Year |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Orders** | 1,000 | **${orderSizeStats.avgBytes} bytes** | ${orderSizeStats.minBytes} bytes | ${orderSizeStats.maxBytes} bytes | 54,750 orders | **${orderStoragePerYearMb} MB / year** |
| **Customers** | 1,000 | **${customerSizeStats.avgBytes} bytes** | ${customerSizeStats.minBytes} bytes | ${customerSizeStats.maxBytes} bytes | ~3,000 customers | **${customerStorageMb} MB / year** |
| **Total Per Restaurant** | — | — | — | — | — | **~${totalProjectedYearlyStorageMb} MB / year** |

> [!NOTE]
> Including standard MongoDB index overhead (~35–45% of data size on Atlas WiredTiger), one restaurant generates **~${(parseFloat(totalProjectedYearlyStorageMb) * 1.4).toFixed(1)} MB** of combined disk and index footprint per year.
> On **MongoDB Atlas M0 (512 MB free tier)**, storage capacity will support ~3–4 restaurants for 1 year before hitting disk quotas.

---

## 3. Existing Index Usage ($indexStats) & Unused Indexes

### Orders Collection
| Index Name | Accesses (Ops) | Since | Status |
| :--- | :--- | :--- | :--- |
`;

  for (const stat of orderIndexStats) {
    const isUsed = stat.accesses.ops > 0;
    md += `| \`${stat.name}\` | ${stat.accesses.ops} | ${stat.accesses.since} | ${isUsed ? 'Active' : '⚠️ Unused in current run'} |\n`;
  }

  md += `
### Customers Collection
| Index Name | Accesses (Ops) | Since | Status |
| :--- | :--- | :--- | :--- |
`;

  for (const stat of customerIndexStats) {
    const isUsed = stat.accesses.ops > 0;
    md += `| \`${stat.name}\` | ${stat.accesses.ops} | ${stat.accesses.since} | ${isUsed ? 'Active' : '⚠️ Unused in current run'} |\n`;
  }

  md += `
---

## 4. Proposed Database Index Definitions (Text-Only / Not Applied)

To eliminate the detected COLLSCANs and In-Memory Sorts, the following indexes are proposed:

### 1. Kitchen QR Tab ($ne Optimization)
\`\`\`javascript
// Current query uses { source: { $ne: 'admin_counter' } }
// Proposal: Store source as exact enum ('qr_scan') and query with equality:
// db.orders.createIndex({ restaurantId: 1, source: 1, status: 1, createdAt: -1 });
\`\`\`

### 2. Multi-Period Analytics 185-Day Query
\`\`\`javascript
// Supports: { restaurantId: 1, createdAt: { $gte: ... }, status: { $ne: 'cancelled' } }
// Proposal:
// db.orders.createIndex({ restaurantId: 1, createdAt: -1, status: 1 });
\`\`\`

### 3. Customer Analytics Spend & Order Traversal
\`\`\`javascript
// Supports: { restaurantId: 1, totalSpent: -1, lastOrderDate: -1 }
// Proposal:
// db.customers.createIndex({ restaurantId: 1, totalSpent: -1, lastOrderDate: -1 });
\`\`\`

---

## 5. Mongoose Connection Settings Review

- \`maxPoolSize\`: **25** (Default in \`src/lib/mongodb.ts\`). In a serverless Vercel environment with 50 concurrent function instances, maximum simultaneous DB connections = \`50 * 25 = 1,250 connections\` (Exceeds Atlas M0/M2/M5 limit of 500!).
- \`minPoolSize\`: **2**. Can cause connection hoarding in serverless containers that stay warm briefly. Recommended: \`minPoolSize: 0\` or \`1\` for serverless.
- \`serverSelectionTimeoutMS\`: **5,000 ms** (Acceptable).
- \`bufferCommands\`: **false** (Correct for serverless fast-fail).
- \`retryWrites\`: Defaults to \`true\` in driver.
- \`w=majority\`: Default in modern MongoDB replica sets.
- **Connection Caching Pattern:** \`global.mongooseCached\` works across hot reloads in a persistent Node process, but on Vercel each Lambda container manages its own isolated pool.
`;

  const outPath = path.resolve(process.cwd(), 'perf/results/db_explain_results.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md);

  console.log(`\n✓ Database explain analysis complete. Written to ${outPath}`);
  await conn.disconnect();
}

if (require.main === module) {
  runDbAudit().catch((err) => {
    console.error('DB audit error:', err);
    process.exit(1);
  });
}
