import type { TenantInviteCreateRequestDto } from '@/app/features/tenant-invites/models/tenant-invite-api.model';
import type { OperationClaimOptionVm, TenantInviteCreatedVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';

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
