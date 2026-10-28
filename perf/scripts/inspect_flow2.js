const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve('perf/results/frontend_metrics.json'), 'utf8'));
const flow2 = data.find((d) => d.flowName.includes('2. /admin/orders') && d.sessionType === 'cold');

if (!flow2) {
  console.log('Flow 2 cold not found');
  process.exit(1);
}

console.log('=== FLOW 2 (/admin/orders) RESOURCE AUDIT ===');
console.log(`Total Requests: ${flow2.requestCount}`);
console.log(`Total Bytes Transferred: ${flow2.totalBytes} bytes (${(flow2.totalBytes / (1024 * 1024)).toFixed(2)} MB)`);

// Breakdown by type
const byType = {};
flow2.requests.forEach((r) => {
  const type = r.resourceType || 'other';
  byType[type] = byType[type] || { count: 0, bytes: 0 };
  byType[type].count++;
  byType[type].bytes += r.sizeBytes;
});

console.log('\n--- BREAKDOWN BY RESOURCE TYPE ---');
for (const [t, stats] of Object.entries(byType)) {
  const kb = (stats.bytes / 1024).toFixed(1);
  const mb = (stats.bytes / (1024 * 1024)).toFixed(2);
  const pct = ((stats.bytes / flow2.totalBytes) * 100).toFixed(1);
  console.log(`* ${t.toUpperCase()}: ${stats.count} requests | ${mb} MB (${kb} KB) | ${pct}% of total`);
}

console.log('\n--- TOP 10 LARGEST RESOURCES ---');
const sorted = [...flow2.requests].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10);
sorted.forEach((r, idx) => {
  const kb = (r.sizeBytes / 1024).toFixed(1);
  const urlPath = r.url.replace(/^http:\/\/localhost:3005/, '');
  console.log(`${idx + 1}. [${r.resourceType.toUpperCase()}] ${kb} KB | Status: ${r.status} | URL: ${urlPath}`);
});
