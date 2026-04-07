/**
 * JWT içinden tenant kimliği — subscription / tenant-scoped panel uçları için.
 * Claim adları backend ile uyumlu olmalıdır.
 */
export function resolveTenantIdFromJwt(accessToken: string | null | undefined): string | null {
    if (!accessToken?.trim()) {
        return null;
    }
    const payload = decodeJwtPayload(accessToken);
    if (!payload) {
        return null;
    }
    const direct = firstString(
        payload['tenant_id'],
        payload['tenantId'],
        payload['TenantId'],
        payload['resolvedTenantId'],
        payload['ResolvedTenantId'],
        payload['tenant']
    );
    if (direct) {
        return direct.trim();
    }
    for (const [key, value] of Object.entries(payload)) {
        if (!key.toLowerCase().includes('tenant')) {
            continue;
        }
        const asText = firstString(value);
        if (asText) {
            return asText.trim();
        }
    }
    return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const json = atob(padded);
        const parsed = JSON.parse(json) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function firstString(...values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }
    return null;
}
