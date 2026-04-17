import { HttpParams } from '@angular/common/http';
import type { TenantInviteCreateRequestDto } from '@/app/features/tenant-invites/models/tenant-invite-api.model';
import type { TenantInvitesListQuery } from '@/app/features/tenant-invites/models/tenant-invite-list-query.model';
import type { OperationClaimOptionVm, TenantInviteCreatedVm, TenantInviteListItemVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';

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

export function mapOperationClaimItem(raw: unknown): OperationClaimOptionVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['id', 'Id', 'operationClaimId', 'OperationClaimId']);
    const name =
        firstString(raw, [
            'name',
            'Name',
            'claimName',
            'ClaimName',
            'operationClaimName',
            'OperationClaimName',
            'title',
            'Title'
        ]) ?? id;
    if (!id) {
        return null;
    }
    return { id, name: name ?? id };
}

export function mapOperationClaimsListResponse(raw: unknown): OperationClaimOptionVm[] {
    return extractArray(raw).map(mapOperationClaimItem).filter((x): x is OperationClaimOptionVm => !!x);
}

export function mapTenantInviteCreatedDto(raw: unknown): TenantInviteCreatedVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    let o: Record<string, unknown> = raw;
    for (const wrap of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const inner = raw[wrap];
        if (isRecord(inner)) {
            o = inner;
            break;
        }
    }
    const inviteId = firstString(o, ['inviteId', 'InviteId', 'id', 'Id']);
    const token = firstString(o, ['token', 'Token', 'inviteToken', 'InviteToken']);
    const email = firstString(o, ['email', 'Email']);
    const tenantId = firstString(o, ['tenantId', 'TenantId']);
    const clinicId = firstString(o, ['clinicId', 'ClinicId']);
    const expiresAtUtc = firstString(o, ['expiresAtUtc', 'ExpiresAtUtc']);
    if (!token) {
        return null;
    }
    return {
        inviteId: inviteId ?? '—',
        token,
        email: email ?? '—',
        tenantId: tenantId ?? '—',
        clinicId: clinicId ?? '—',
        expiresAtUtc: expiresAtUtc ?? null
    };
}

export function mapCreateInviteFormToApiDto(input: {
    email: string;
    clinicId: string;
    operationClaimId: string;
    expiresAtUtc: string | null;
}): TenantInviteCreateRequestDto {
    const dto: TenantInviteCreateRequestDto = {
        email: input.email.trim(),
        clinicId: input.clinicId.trim(),
        operationClaimId: input.operationClaimId.trim()
    };
    if (input.expiresAtUtc?.trim()) {
        dto.expiresAtUtc = input.expiresAtUtc.trim();
    }
    return dto;
}

function numFromRecord(o: Record<string, unknown>, keys: string[], fallback: number): number {
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

function unwrapPagedInviteRoot(raw: unknown): Record<string, unknown> | null {
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

export function mapTenantInviteListItemRaw(raw: unknown): TenantInviteListItemVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['id', 'Id', 'inviteId', 'InviteId']);
    if (!id) {
        return null;
    }
    const email = firstString(raw, ['email', 'Email']) ?? '—';
    const statusLabel =
        firstString(raw, ['status', 'Status', 'state', 'State', 'inviteStatus', 'InviteStatus']) ?? '—';
    const expiresAtUtc = firstString(raw, ['expiresAtUtc', 'ExpiresAtUtc']);
    const clinicName = firstString(raw, ['clinicName', 'ClinicName']);
    const clinicId = firstString(raw, ['clinicId', 'ClinicId']);
    const clinicSummary = clinicName?.trim() ? clinicName : clinicId ? `Klinik (${clinicId})` : '—';
    const roleName = firstString(raw, [
        'operationClaimName',
        'OperationClaimName',
        'roleName',
        'RoleName',
        'claimName',
        'ClaimName'
    ]);
    const roleId = firstString(raw, ['operationClaimId', 'OperationClaimId']);
    const roleSummary = roleName?.trim() ? roleName : roleId ? `Rol (${roleId})` : '—';
    return {
        id,
        email,
        statusLabel,
        expiresAtUtc: expiresAtUtc ?? null,
        clinicSummary,
        roleSummary
    };
}

export function mapPagedTenantInvitesToVm(raw: unknown): {
    items: TenantInviteListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const root = unwrapPagedInviteRoot(raw);
    if (!root) {
        return { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
    }
    const items = extractArray(root['items'] ?? root['Items'])
        .map((x) => mapTenantInviteListItemRaw(x))
        .filter((x): x is TenantInviteListItemVm => !!x);

    const page = numFromRecord(root, ['page', 'Page'], 1);
    const pageSize = numFromRecord(root, ['pageSize', 'PageSize'], 10);
    const totalItems = numFromRecord(root, ['totalItems', 'TotalItems', 'totalCount', 'TotalCount'], items.length);
    const totalPages = numFromRecord(root, ['totalPages', 'TotalPages'], Math.max(1, Math.ceil(totalItems / Math.max(pageSize, 1))));

    return { items, page, pageSize, totalItems, totalPages };
}

export function tenantInvitesListQueryToHttpParams(query: TenantInvitesListQuery): HttpParams {
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
