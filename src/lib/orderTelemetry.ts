/**
 * Order Lifecycle Telemetry & Request Monitoring Service
 * 
 * Tracks requests fired at each stage of an order's lifecycle (from placement to completion)
 * and logs structured summaries to the server terminal.
 */

interface OrderTelemetryData {
  orderId: string;
  restaurantId: string;
  currentStatus: string;
  stageCounts: Record<string, number>; // e.g. { received: 4, accepted: 1, preparing: 1, ready: 1 }
  totalRequests: number;
  createdAt: number;
  lastUpdatedAt: number;
}

class OrderTelemetryTracker {
  private telemetryMap = new Map<string, OrderTelemetryData>();

  /**
   * Initializes or increments request count for an order at its current status stage.
   */
  public recordRequest(orderId: string, restaurantId: string, currentStatus: string) {
    if (!orderId) return;

    let data = this.telemetryMap.get(orderId);
    if (!data) {
      data = {
        orderId,
        restaurantId,
        currentStatus,
        stageCounts: {},
        totalRequests: 0,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };
      this.telemetryMap.set(orderId, data);
    }

    data.currentStatus = currentStatus;
    data.stageCounts[currentStatus] = (data.stageCounts[currentStatus] || 0) + 1;
    data.totalRequests += 1;
    data.lastUpdatedAt = Date.now();

    const shortId = orderId.length > 8 ? orderId.slice(-8) : orderId;
    console.log(
      `📊 [ORDER_TELEMETRY] Order #${shortId} (${restaurantId}) | Stage: '${currentStatus}' | Stage Requests: ${data.stageCounts[currentStatus]} | Total Reqs: ${data.totalRequests}`
    );
  }

  /**
   * Logs stage transitions and prints stage summary.
   */
  public recordStatusChange(orderId: string, oldStatus: string, newStatus: string) {
    if (!orderId) return;

    const data = this.telemetryMap.get(orderId);
    const shortId = orderId.length > 8 ? orderId.slice(-8) : orderId;

    if (data) {
      const prevStageCount = data.stageCounts[oldStatus] || 0;
      data.currentStatus = newStatus;
      data.lastUpdatedAt = Date.now();

      console.log(
        `🔀 [STAGE_TRANSITION] Order #${shortId} | Transition: '${oldStatus}' ➔ '${newStatus}' | Stage '${oldStatus}' Total Requests: ${prevStageCount}`
      );

      if (['completed', 'cancelled', 'rejected'].includes(newStatus)) {
        this.printCompletionSummary(orderId);
      }
    } else {
      console.log(`🔀 [STAGE_TRANSITION] Order #${shortId} | Transition: '${oldStatus}' ➔ '${newStatus}'`);
    }
  }

  /**
   * Prints final lifecycle summary when order is completed or cancelled.
   */
  public printCompletionSummary(orderId: string) {
    const data = this.telemetryMap.get(orderId);
    if (!data) return;

    const shortId = orderId.length > 8 ? orderId.slice(-8) : orderId;
    const durationSec = Math.round((Date.now() - data.createdAt) / 1000);

    console.log(`\n════════════════════════════════════════════════════════════════════`);
    console.log(`🎉 [ORDER_LIFECYCLE_COMPLETE] Summary for Order #${shortId} (${data.restaurantId})`);
    console.log(`   ├─ Duration           : ${durationSec} seconds`);
    console.log(`   ├─ Final Status       : ${data.currentStatus}`);
    Object.entries(data.stageCounts).forEach(([stage, count]) => {
      console.log(`   ├─ Stage '${stage.padEnd(12)}' : ${count} request(s)`);
    });
    console.log(`   └─ 🏆 TOTAL LIFECYCLE REQUESTS : ${data.totalRequests} request(s)`);
    console.log(`════════════════════════════════════════════════════════════════════\n`);
  }
}

export const orderTelemetry = new OrderTelemetryTracker();
