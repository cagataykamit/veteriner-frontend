import { HttpParams } from '@angular/common/http';
import type { TenantMemberListItemDtoPagedResult } from '@/app/features/tenant-members/models/tenant-members-api.model';
import type { TenantMembersListQuery } from '@/app/features/tenant-members/models/tenant-members-query.model';
import type { TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

function firstString(o: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    return null;
}

function extractArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (!isRecord(raw)) {
        return [];
    }
    for (const k of ['items', 'Items', 'data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const v = raw[k];
        if (Array.isArray(v)) {
            return v;
        }
    }
    return [];
}

function num(o: Record<string, unknown>, keys: string[], fallback: number): number {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return v;
        }
        if (typeof v === 'string' && v.trim()) {
            const n = Number(v);
            if (!Number.isNaN(n)) {
                return n;
            }
        }
    }
    return fallback;
}

function unwrapPagedRoot(raw: unknown): Record<string, unknown> | null {
    if (!isRecord(raw)) {
        return null;
    }
    for (const k of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const inner = raw[k];
        if (isRecord(inner) && (inner['items'] !== undefined || inner['Items'] !== undefined)) {
            return inner;
        }
    }
    return raw;
}

function mapMemberItemDto(raw: unknown): TenantMemberListItemVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['id', 'Id', 'userId', 'UserId']);
    if (!id) {
        return null;
    }
    const email = firstString(raw, ['email', 'Email']);
    let emailConfirmed: boolean | null = null;
    const ec = raw['emailConfirmed'] ?? raw['EmailConfirmed'] ?? raw['isEmailConfirmed'] ?? raw['IsEmailConfirmed'];
    if (typeof ec === 'boolean') {
        emailConfirmed = ec;
    } else if (typeof ec === 'string') {
        const t = ec.trim().toLowerCase();
        if (t === 'true' || t === '1') {
            emailConfirmed = true;
        } else if (t === 'false' || t === '0') {
            emailConfirmed = false;
        }
    }
    const createdAtUtc = firstString(raw, ['createdAtUtc', 'CreatedAtUtc', 'createdAt', 'CreatedAt']);
    return {
        id,
        email: email ?? '—',
        emailConfirmed,
        createdAtUtc: createdAtUtc ?? null
    };
}

export function mapPagedTenantMembersToVm(raw: unknown): {
    items: TenantMemberListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const root = unwrapPagedRoot(raw);
    if (!root) {
        return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
    }
    const items = extractArray(root['items'] ?? root['Items'])
        .map((x) => mapMemberItemDto(x))
        .filter((x): x is TenantMemberListItemVm => !!x);

    const page = num(root, ['page', 'Page'], 1);
    const pageSize = num(root, ['pageSize', 'PageSize'], 10);
    const totalItems = num(root, ['totalItems', 'TotalItems', 'totalCount', 'TotalCount'], items.length);
    const totalPages = num(root, ['totalPages', 'TotalPages'], Math.max(1, Math.ceil(totalItems / Math.max(pageSize, 1))));

    return { items, page, pageSize, totalItems, totalPages };
}

export function tenantMembersQueryToHttpParams(query: TenantMembersListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    return p;
}
