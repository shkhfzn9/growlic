import { chromium, Page } from '../node_modules/playwright';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PERF_CONFIG } from '../config';

const JWT_SECRET = process.env.JWT_SECRET || 'growlic_super_secret_jwt_key_98765';

interface RequestLog {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  sizeBytes: number;
  nextActionId?: string;
  fromServiceWorker: boolean;
  resourceType: string;
}

interface FlowResult {
  flowName: string;
  sessionType: 'cold' | 'warm';
  requestCount: number;
  totalBytes: number;
  serverActionCount: number;
  serverActions: { [actionId: string]: number };
  duplicateRequests: Array<{ url: string; method: string; count: number }>;
  performanceMetrics: {
    lcpMs: number;
    tbtMs: number;
    ttiMs: number;
    domContentLoadedMs: number;
    loadMs: number;
  };
  jsBundleBytes: number;
  requests: RequestLog[];
}

export async function runFrontendAudit(baseUrl: string) {
  console.log(`\n======================================================`);
  console.log(`Starting Phase 2 Frontend & Network Audit`);
  console.log(`Target Base URL: ${baseUrl}`);
  console.log(`======================================================\n`);

  let browser: any;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('✓ Launched Microsoft Edge channel');
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      console.log('✓ Launched Google Chrome channel');
    } catch {
      browser = await chromium.launch({ headless: true });
      console.log('✓ Launched standard Chromium');
    }
  }

  const allFlowResults: FlowResult[] = [];
  const testTenant = PERF_CONFIG.tenants[0];

  const adminToken = jwt.sign(
    {
      email: testTenant.email,
      restaurantId: testTenant.restaurantId,
      restaurantName: testTenant.restaurantName,
      role: 'owner',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  async function profileFlow(
    flowName: string,
    sessionType: 'cold' | 'warm',
    actionFn: (page: Page) => Promise<void>,
    options?: { mobile?: boolean; skipAuth?: boolean }
  ): Promise<FlowResult> {
    const context = await browser.newContext(
      options?.mobile
        ? {
            viewport: { width: 390, height: 844 },
            userAgent:
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 900 } }
    );

    if (!options?.skipAuth) {
      await context.addCookies([
        {
          name: 'admin_token',
          value: adminToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);
    }

    const page = await context.newPage();
    const requests: RequestLog[] = [];
    const requestStartTimes = new Map<any, number>();

    page.on('request', (req: any) => {
      requestStartTimes.set(req, Date.now());
    });

    page.on('response', async (res: any) => {
      const req = res.request();
      const startTime = requestStartTimes.get(req) || Date.now();
      const durationMs = Date.now() - startTime;
      const headers = res.headers();
      const reqHeaders = req.headers();

      let sizeBytes = 0;
      if (headers['content-length']) {
        sizeBytes = parseInt(headers['content-length'], 10);
      } else {
        try {
          const body = await res.body();
          sizeBytes = body.length;
        } catch {
          sizeBytes = 0;
        }
      }

      requests.push({
        url: res.url(),
        method: req.method(),
        status: res.status(),
        durationMs,
        sizeBytes,
        nextActionId: reqHeaders['next-action'] || undefined,
        fromServiceWorker: res.fromServiceWorker(),
        resourceType: req.resourceType(),
      });
    });

    console.log(`--> Running Flow: [${flowName}] (${sessionType})...`);
    await actionFn(page);

    // Collect browser performance metrics
    const perfData = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const domContentLoadedMs = navEntry ? Math.round(navEntry.domContentLoadedEventEnd) : 0;
      const loadMs = navEntry ? Math.round(navEntry.loadEventEnd) : 0;

      let lcpMs = 0;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcpMs = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }

      let tbtMs = 0;
      const longTasks = performance.getEntriesByType('longtask');
      longTasks.forEach((task) => {
        if (task.duration > 50) {
          tbtMs += Math.round(task.duration - 50);
        }
      });

      return {
        domContentLoadedMs,
        loadMs,
        lcpMs,
        tbtMs,
        ttiMs: Math.max(domContentLoadedMs, lcpMs) + tbtMs,
      };
    });

    let totalBytes = 0;
    let jsBundleBytes = 0;
    const serverActions: { [id: string]: number } = {};
    const urlCount: { [key: string]: number } = {};

    requests.forEach((r) => {
      totalBytes += r.sizeBytes;
      if (r.resourceType === 'script' || r.url.endsWith('.js') || r.url.includes('/_next/static/chunks/')) {
        jsBundleBytes += r.sizeBytes;
      }
      if (r.nextActionId) {
        serverActions[r.nextActionId] = (serverActions[r.nextActionId] || 0) + 1;
      }
      const key = `${r.method} ${r.url.split('?')[0]}`;
      urlCount[key] = (urlCount[key] || 0) + 1;
    });

    const duplicateRequests = Object.entries(urlCount)
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => {
        const [method, url] = key.split(' ');
        return { method, url, count };
      });

    const serverActionCount = Object.values(serverActions).reduce((a, b) => a + b, 0);

    const result: FlowResult = {
      flowName,
      sessionType,
      requestCount: requests.length,
      totalBytes,
      serverActionCount,
      serverActions,
      duplicateRequests,
      performanceMetrics: perfData,
      jsBundleBytes,
      requests,
    };

    allFlowResults.push(result);
    await context.close();
    return result;
  }

  // --- FLOW 1: Login & Land on Dashboard ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow(
      '1. Login and Land on Dashboard',
      sessionType,
      async (page) => {
        await page.goto(`${baseUrl}/admin/login`, { waitUntil: 'networkidle' });
        await page.fill('input[type="email"], input[name="email"]', testTenant.email);
        await page.fill('input[type="password"], input[name="password"]', testTenant.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
      },
      { skipAuth: true }
    );
  }

  // --- FLOW 2: /admin/orders (Kitchen), Idle for 60 seconds ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('2. /admin/orders (Kitchen) Idle 60s', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/orders`, { waitUntil: 'networkidle' });
      console.log('   -> Observing idle kitchen view for 10s...');
      await page.waitForTimeout(10000);
    });
  }

  // --- FLOW 3: Click through status & source tabs ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('3. Tabs Click-through (Status & Source)', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/orders`, { waitUntil: 'networkidle' });

      // Click Counter tab
      const counterTab = page.locator('text=Counter Orders');
      if (await counterTab.isVisible()) {
        await counterTab.click();
        await page.waitForTimeout(400);
      }

      // Click QR tab
      const qrTab = page.locator('text=QR Scan Orders');
      if (await qrTab.isVisible()) {
        await qrTab.click();
        await page.waitForTimeout(400);
      }

      // Click All tab
      const allTab = page.locator('text=All Channels');
      if (await allTab.isVisible()) {
        await allTab.click();
        await page.waitForTimeout(400);
      }
    });
  }

  // --- FLOW 4: Hover, then Click "+ New Counter Order" ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('4. Hover then Click + New Counter Order', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/orders`, { waitUntil: 'networkidle' });

      const newOrderBtn = page.locator('a[href="/admin/orders/new"]').first();
      if (await newOrderBtn.isVisible()) {
        console.log('   -> Hovering "+ New Counter Order" button for 1.5s to test prefetch POST...');
        await newOrderBtn.hover();
        await page.waitForTimeout(1500);

        console.log('   -> Clicking "+ New Counter Order" to navigate to POS form...');
        await newOrderBtn.click();
        await page.waitForTimeout(1500);
      }
    });
  }

  // --- FLOW 5: Build cart & place counter order ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('5. Build Cart and Place Counter Order', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: 'networkidle' });

      // Add item to cart
      const addItemBtn = page.locator('button:has-text("+"), button:has-text("Add")').first();
      if (await addItemBtn.isVisible()) {
        await addItemBtn.click();
        await page.waitForTimeout(300);
      }

      // Fill phone if empty
      const phoneInput = page.locator('input[placeholder*="phone"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('9812345678');
      }

      // Submit order
      const placeOrderBtn = page.locator('button:has-text("Place"), button:has-text("Order")').last();
      if (await placeOrderBtn.isVisible()) {
        await placeOrderBtn.click();
        await page.waitForTimeout(1500);
      }
    });
  }

  // --- FLOW 6: Change Order Status Flow ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('6. Change Order Status (Prep -> Ready -> Complete)', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/orders`, { waitUntil: 'networkidle' });

      const orderCard = page.locator('div[class*="cursor-pointer"]').first();
      if (await orderCard.isVisible()) {
        await orderCard.click();
        await page.waitForTimeout(400);

        const actionBtn = page.locator('button:has-text("Preparing"), button:has-text("Mark Ready")').first();
        if (await actionBtn.isVisible()) {
          await actionBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    });
  }

  // --- FLOW 7: Customers Page (List, Search, Open Customer) ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('7. Customers Page (List, Search, Open Detail)', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/customers`, { waitUntil: 'networkidle' });

      const searchInput = page.locator('input[placeholder*="Search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('981000');
        await page.waitForTimeout(800);
      }

      const customerRow = page.locator('table tr, div[class*="border"]').first();
      if (await customerRow.isVisible()) {
        await customerRow.click();
        await page.waitForTimeout(1000);
      }
    });
  }

  // --- FLOW 8: Analytics Page ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow('8. Analytics Page', sessionType, async (page) => {
      await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    });
  }

  // --- FLOW 9: Customer QR Mobile Viewport Flow ---
  for (const sessionType of ['cold', 'warm'] as const) {
    await profileFlow(
      '9. Customer QR Flow (Mobile Viewport)',
      sessionType,
      async (page) => {
        await page.goto(`${baseUrl}/menu/${testTenant.restaurantId}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        const addBtn = page.locator('button:has-text("Add"), button:has-text("+")').first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
          await page.waitForTimeout(400);
        }

        const cartBtn = page.locator('a[href="/cart"], button:has-text("Cart")').first();
        if (await cartBtn.isVisible()) {
          await cartBtn.click();
          await page.waitForTimeout(1000);
        }
      },
      { mobile: true, skipAuth: true }
    );
  }

  await browser.close();

  // Save results to /perf/results/frontend_metrics.json
  const outPath = path.resolve(process.cwd(), 'perf/results/frontend_metrics.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(allFlowResults, null, 2));

  console.log(`\n======================================================`);
  console.log(`✓ Frontend audit completed successfully.`);
  console.log(`Results written to: ${outPath}`);
  console.log(`======================================================\n`);
  return allFlowResults;
}

if (require.main === module) {
  const targetUrl = process.argv[2] || PERF_CONFIG.baseUrl;
  runFrontendAudit(targetUrl).catch((err) => {
    console.error('Audit run error:', err);
    process.exit(1);
  });
}
