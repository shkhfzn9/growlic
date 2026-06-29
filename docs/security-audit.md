# Security & Vulnerability Audit Report

This document evaluates the security posture, authentication protocols, permission models, and potential security hazards of the Growlic platform.

---

## 1. Authentication & Session Validation Architecture

### Stateful Token Revocation
Growlic uses a hybrid cookie/session validation architecture to authenticate administrative requests:
1.  **JWT Tokens**: Cryptographically signed tokens are stored in a secure, `httpOnly`, `sameSite: "lax"` cookie named `admin_token`.
2.  **Stateful Verification**: Every request checked via `checkAdminAuth()` extracts this token, hashes it using `SHA256`, and queries the database:
    ```typescript
    const isValid = await validateSession(decoded.restaurantId, token);
    ```
    This approach addresses the main vulnerability of stateless JWTs: if a token is leaked, it can be revoked instantly by setting the `revoked` flag to `true` on the database session record.

---

## 2. Role-Based Access Control (RBAC)

Growlic enforces granular role-based permissions at the Server Action controller level:
*   **Roles**: `owner`, `manager`, `staff`.
*   **Permission Mapping**:
    *   `change_pricing` -> Restricted to `owner`.
    *   `edit_menu` -> Restricted to `owner`, `manager`.
    *   `manage_orders` -> Allowed for `owner`, `manager`.
    *   `update_order_status` -> Allowed for all roles (`owner`, `manager`, `staff`).

### Server-Side Enforcement Example
Permissions are checked before executing critical database writes:
```typescript
const isPriceAllowed = await can('change_pricing', admin.token, admin.restaurantId);
if (!isPriceAllowed) {
  throw new Error('Forbidden: Only owners are allowed to change pricing');
}
```

---

## 3. Potential Security Hazards & Vulnerabilities

### 1. Missing Rate Limiting on Authentication Endpoints
*   **Vulnerability**: The `/api/auth` login endpoint lacks rate limiting.
*   **Risk**: Attackers could execute brute-force dictionary attacks against admin emails.
*   **Remediation**: Implement a rate limiter in the Next.js middleware (e.g. using `upstash/ratelimit` or a local Redis bucket) to restrict authentication requests to 5 attempts per IP address per minute.

### 2. Validation Constraints
*   **Vulnerability**: Inputs are validated at the service layer, but schema enforcement is manual.
*   **Risk**: Potential injection vulnerabilities or malformed payloads if validation checks are missed in new features.
*   **Remediation**: Introduce a validation library like **Zod** to validate request payloads before they reach the service and repository layers.

### 3. Cross-Site Scripting (XSS) in Menu Customization
*   **Vulnerability**: Restaurant custom messages are rendered on the menu page.
*   **Risk**: An admin with compromised credentials could inject malicious `<script>` tags into custom messages.
*   **Remediation**: Sanitize custom message inputs on the server using a library like `dompurify` before writing them to the database.
