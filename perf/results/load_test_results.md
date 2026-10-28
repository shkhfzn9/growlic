# Load Testing Results & Tenant Isolation Verification

**Target Base URL:** `http://localhost:3005`  
**SLA Thresholds:**
- Error Rate: `< 1%`
- `createOrder` p95: `< 1500 ms`
- Kitchen Read p95: `< 1000 ms`
- Atlas Connection Saturation: `< 80%` (400 on M0/M2/M5)

---

## 1. Stepped Ramp Load Progression

| Simulated Restaurants | RPS (Req/s) | Total Requests | Error Rate (%) | createOrder p95 (ms) | kitchenRead p95 (ms) | analytics p95 (ms) | Est. DB Connections | Stop Condition? |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | 21.34 | 643 | 0% | 84 ms | 23 ms | 60 ms | 7 | ✅ PASS |
| **5** | 35.13 | 1066 | 0% | 409 ms | 86 ms | 350 ms | 33 | ✅ PASS |
| **10** | 44.68 | 1365 | 0% | 777 ms | 194 ms | 838 ms | 65 | ✅ PASS |
| **20** | 46.35 | 1423 | 0% | 2377 ms | 334 ms | 1644 ms | 130 | 🛑 **createOrder p95 2377ms > 1500ms SLA** |

---

## 2. Resource Saturation Analysis

- **Saturation Point:** **20 restaurants**
- **First Saturated Resource:** **createOrder p95 2377ms > 1500ms SLA**
- **Tenant Isolation Verification:** **PASSED (0 violations detected across all responses)**. Every returned order, customer, and menu dataset strictly matched the authenticated tenant ID with zero cross-tenant data leakage.
