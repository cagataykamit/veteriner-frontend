import { HttpErrorResponse } from '@angular/common/http';

export interface AuthTenantOption {
    id: string;
    name: string;
}

interface TenantLike {
    id?: unknown;
    tenantId?: unknown;
    name?: unknown;
    tenantName?: unknown;
    displayName?: unknown;
    code?: unknown;
}

function toTenantOption(v: unknown): AuthTenantOption | null {
    if (!v || typeof v !== 'object') {
        return null;
    }
    const o = v as TenantLike;
    const idRaw = typeof o.id === 'string' ? o.id : typeof o.tenantId === 'string' ? o.tenantId : '';
    const id = idRaw.trim();
    if (!id) {
        return null;
    }
    const nameRaw =
        typeof o.name === 'string'
            ? o.name
            : typeof o.tenantName === 'string'
              ? o.tenantName
              : typeof o.displayName === 'string'
                ? o.displayName
                : typeof o.code === 'string'
                  ? o.code
                  : id;
    return { id, name: nameRaw.trim() || id };
}

function tenantArrayFromBody(body: unknown): AuthTenantOption[] {
    if (!body || typeof body !== 'object') {
        return [];
    }
    const o = body as Record<string, unknown>;
    const candidates: unknown[] = [
        o['tenants'],
        o['availableTenants'],
        o['tenantOptions'],
        o['data'],
        o['result'],
        o['value']
    ];
    for (const c of candidates) {
        if (Array.isArray(c)) {
            return c.map(toTenantOption).filter((x): x is AuthTenantOption => !!x);
        }
        if (c && typeof c === 'object') {
            const inner = c as Record<string, unknown>;
            if (Array.isArray(inner['tenants'])) {
                return inner['tenants'].map(toTenantOption).filter((x): x is AuthTenantOption => !!x);
            }
        }
    }
    return [];
}

function textSuggestsTenantSelection(body: unknown): boolean {
    if (!body || typeof body !== 'object') {
        return false;
    }
    const o = body as Record<string, unknown>;
    const texts: string[] = [];
    const detail = o['detail'];
    const title = o['title'];
    const message = o['message'];
    if (typeof detail === 'string') texts.push(detail);
    if (typeof title === 'string') texts.push(title);
    if (typeof message === 'string') texts.push(message);
    const blob = texts.join(' ').toLowerCase();
    return blob.includes('tenant') || blob.includes('kiracı');
}

export function parseTenantRequirement(err: HttpErrorResponse): {
    tenantRequired: boolean;
    tenants: AuthTenantOption[];
} {
    const body = err.error as unknown;
    const tenants = tenantArrayFromBody(body);
    const explicit = !!(
        body &&
        typeof body === 'object' &&
        ((body as Record<string, unknown>)['tenantRequired'] === true ||
            (body as Record<string, unknown>)['requiresTenantSelection'] === true)
    );
    const implied = tenants.length > 0 || textSuggestsTenantSelection(body);
    const tenantRequired = explicit || ((err.status === 400 || err.status === 401) && implied);
    return { tenantRequired, tenants };
}
