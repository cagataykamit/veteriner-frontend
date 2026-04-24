import { HttpParams } from '@angular/common/http';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import type { TenantMemberListItemDtoPagedResult } from '@/app/features/tenant-members/models/tenant-members-api.model';
import type { TenantMembersListQuery } from '@/app/features/tenant-members/models/tenant-members-query.model';
import type {
    TenantMemberClaimVm,
    TenantMemberClinicVm,
    TenantMemberDetailVm,
    TenantMemberListItemVm,
    TenantRoleMatrixPermissionVm,
    TenantRolePermissionMatrixRowVm
} from '@/app/features/tenant-members/models/tenant-members-vm.model';

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
    const name =
        firstString(raw, [
            'name',
            'Name',
            'fullName',
            'FullName',
            'displayName',
            'DisplayName',
            'userName',
            'UserName',
            'firstName',
            'FirstName'
        ]) ?? null;
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
        name,
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

function unwrapDetailRoot(raw: unknown): Record<string, unknown> | null {
    if (!isRecord(raw)) {
        return null;
    }
    for (const k of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const inner = raw[k];
        if (isRecord(inner)) {
            return inner;
        }
    }
    return raw;
}

function pickFirstArrayProperty(o: Record<string, unknown>, keys: string[]): { present: boolean; items: unknown[] } {
    for (const k of keys) {
        if (!(k in o)) {
            continue;
        }
        const v = o[k];
        if (v === null || v === undefined) {
            return { present: true, items: [] };
        }
        if (Array.isArray(v)) {
            return { present: true, items: v };
        }
        return { present: true, items: [] };
    }
    return { present: false, items: [] };
}

const CLAIM_ARRAY_KEYS = [
    'roles',
    'Roles',
    'operationClaims',
    'OperationClaims',
    'claims',
    'Claims',
    'roleClaims',
    'RoleClaims',
    'whitelistOperationClaims',
    'WhitelistOperationClaims',
    'assignableClaims',
    'AssignableClaims',
    'tenantOperationClaims',
    'TenantOperationClaims'
];

const CLINIC_ARRAY_KEYS = [
    'clinicMemberships',
    'ClinicMemberships',
    'clinics',
    'Clinics',
    'tenantClinics',
    'TenantClinics',
    'memberClinics',
    'MemberClinics',
    'clinicMembers',
    'ClinicMembers'
];

function mergeArrayPick(layers: Record<string, unknown>[], keys: string[]): { present: boolean; items: unknown[] } {
    for (const layer of layers) {
        const r = pickFirstArrayProperty(layer, keys);
        if (r.present) {
            return r;
        }
    }
    return { present: false, items: [] };
}

function detailRecordLayers(o: Record<string, unknown>): Record<string, unknown>[] {
    const layers: Record<string, unknown>[] = [o];
    for (const k of ['tenantMembership', 'TenantMembership', 'membership', 'Membership', 'member', 'Member']) {
        const v = o[k];
        if (isRecord(v)) {
            layers.push(v);
        }
    }
    return layers;
}

function mapClaimRow(raw: unknown): TenantMemberClaimVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id =
        firstString(raw, ['id', 'Id', 'operationClaimId', 'OperationClaimId', 'claimId', 'ClaimId']) ?? '';
    const name =
        firstString(raw, [
            'name',
            'Name',
            'operationClaimName',
            'OperationClaimName',
            'claimName',
            'ClaimName',
            'title',
            'Title'
        ]) ?? '';
    if (!id && !name) {
        return null;
    }
    const removable = readTriBool(raw, ['canRemove', 'CanRemove', 'isRemovable', 'IsRemovable', 'allowRemove', 'AllowRemove']);
    const canRemove = removable !== false;
    return { id: id || name, name: name || id || '—', canRemove };
}

function readTriBool(raw: Record<string, unknown>, keys: string[]): boolean | null {
    for (const k of keys) {
        const v = raw[k];
        if (typeof v === 'boolean') {
            return v;
        }
        if (typeof v === 'string') {
            const t = v.trim().toLowerCase();
            if (t === 'true' || t === '1') {
                return true;
            }
            if (t === 'false' || t === '0') {
                return false;
            }
        }
    }
    return null;
}

function mapClinicRow(raw: unknown): TenantMemberClinicVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['clinicId', 'ClinicId', 'id', 'Id']) ?? '';
    const name =
        firstString(raw, ['clinicName', 'ClinicName', 'name', 'Name', 'title', 'Title']) ?? '';
    const isActive = readTriBool(raw, ['isActive', 'IsActive', 'active', 'Active']);
    if (!id && !name) {
        return null;
    }
    const removable = readTriBool(raw, ['canRemove', 'CanRemove', 'isRemovable', 'IsRemovable', 'allowRemove', 'AllowRemove']);
    const canRemove = removable !== false;
    return { id: id || name, name: name || id || '—', isActive, canRemove };
}

export function mapTenantMemberDetailRaw(raw: unknown): TenantMemberDetailVm | null {
    const root = unwrapDetailRoot(raw);
    if (!root) {
        return null;
    }
    let base = mapMemberItemDto(root);
    if (!base) {
        const user = root['user'] ?? root['User'];
        if (isRecord(user)) {
            base = mapMemberItemDto(user);
        }
    }
    if (!base) {
        return null;
    }

    if (!base.name?.trim()) {
        const user = root['user'] ?? root['User'];
        if (isRecord(user)) {
            const fromUser = mapMemberItemDto(user);
            const picked = fromUser?.name?.trim() ?? null;
            if (picked) {
                base = { ...base, name: picked };
            }
        }
    }

    const layers = detailRecordLayers(root);

    let membershipAt = firstString(root, [
        'tenantMembershipCreatedAtUtc',
        'TenantMembershipCreatedAtUtc',
        'tenantMemberCreatedAtUtc',
        'TenantMemberCreatedAtUtc',
        'membershipCreatedAtUtc',
        'MembershipCreatedAtUtc',
        'joinedAtUtc',
        'JoinedAtUtc'
    ]);
    if (!membershipAt) {
        membershipAt = firstString(root, ['createdAtUtc', 'CreatedAtUtc', 'createdAt', 'CreatedAt']);
    }
    if (!membershipAt) {
        for (const layer of layers) {
            membershipAt = firstString(layer, ['createdAtUtc', 'CreatedAtUtc', 'joinedAtUtc', 'JoinedAtUtc']);
            if (membershipAt) {
                break;
            }
        }
    }

    const claimsPick = mergeArrayPick(layers, CLAIM_ARRAY_KEYS);
    const clinicsPick = mergeArrayPick(layers, CLINIC_ARRAY_KEYS);

    const claims = claimsPick.items.map(mapClaimRow).filter((x): x is TenantMemberClaimVm => !!x);
    const clinics = clinicsPick.items.map(mapClinicRow).filter((x): x is TenantMemberClinicVm => !!x);

    let isCurrentUser = readTriBool(root, ['isCurrentUser', 'IsCurrentUser']) === true;
    if (!isCurrentUser) {
        const user = root['user'] ?? root['User'];
        if (isRecord(user)) {
            isCurrentUser = readTriBool(user, ['isCurrentUser', 'IsCurrentUser']) === true;
        }
    }

    return {
        id: base.id,
        name: base.name,
        email: base.email,
        emailConfirmed: base.emailConfirmed,
        tenantMembershipCreatedAtUtc: membershipAt ?? null,
        isCurrentUser,
        claims,
        clinics,
        claimsSectionPresent: claimsPick.present,
        clinicsSectionPresent: clinicsPick.present
    };
}

function truncateLabel(s: string, maxLen: number): string {
    const t = s.trim();
    if (t.length <= maxLen) {
        return t;
    }
    return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function mapMatrixPermissionRow(raw: unknown): TenantRoleMatrixPermissionVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const code = firstString(raw, ['code', 'Code']) ?? '';
    const operationClaimName = firstString(raw, ['operationClaimName', 'OperationClaimName']) ?? '';
    const description = firstString(raw, ['description', 'Description']);
    const group = firstString(raw, ['group', 'Group']);
    const id =
        firstString(raw, [
            'id',
            'Id',
            'operationClaimId',
            'OperationClaimId',
            'permissionId',
            'PermissionId',
            'claimId',
            'ClaimId',
            'code',
            'Code'
        ]) ?? '';
    /** Chip metni: okunur kısa etiket önce; açıklama en son ve kısaltılmış. */
    const shortLabel =
        operationClaimName.trim() ||
        code.trim() ||
        firstString(raw, ['name', 'Name', 'permissionName', 'PermissionName', 'claimName', 'ClaimName', 'title', 'Title'])?.trim() ||
        (description?.trim() ? truncateLabel(description, 52) : '') ||
        id.trim();
    if (!id.trim() && !shortLabel.trim()) {
        return null;
    }
    return {
        id: id.trim() || code.trim() || shortLabel.trim(),
        code: code.trim() ? code.trim() : null,
        name: shortLabel.trim() || '—',
        group: group?.trim() ? group.trim() : null,
        description: description?.trim() ? description.trim() : null
    };
}

function permissionArrayKeys(): string[] {
    return [
        'permissions',
        'Permissions',
        'operationClaims',
        'OperationClaims',
        'claims',
        'Claims',
        'items',
        'Items'
    ];
}

function mapMatrixRoleRow(raw: unknown): TenantRolePermissionMatrixRowVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const roleId =
        firstString(raw, [
            'roleId',
            'RoleId',
            'id',
            'Id',
            'operationClaimGroupId',
            'OperationClaimGroupId',
            'operationClaimId',
            'OperationClaimId'
        ]) ?? '';
    const roleName =
        firstString(raw, [
            'roleName',
            'RoleName',
            'name',
            'Name',
            'title',
            'Title',
            'operationClaimName',
            'OperationClaimName'
        ]) ?? roleId;
    let permItems: unknown[] = [];
    for (const k of permissionArrayKeys()) {
        const v = raw[k];
        if (Array.isArray(v)) {
            permItems = v;
            break;
        }
    }
    const permissions = permItems.map(mapMatrixPermissionRow).filter((x): x is TenantRoleMatrixPermissionVm => !!x);
    if (!roleId.trim() && !roleName.trim() && permissions.length === 0) {
        return null;
    }
    return {
        roleId: roleId.trim() || roleName.trim() || '—',
        roleName: roleName.trim() || roleId.trim() || '—',
        permissions
    };
}

/** `GET .../assignable-role-permission-matrix` — kök dizi veya sarılmış koleksiyon. */
export function mapAssignableRolePermissionMatrixRaw(raw: unknown): TenantRolePermissionMatrixRowVm[] {
    let rows: unknown[] = [];
    if (Array.isArray(raw)) {
        rows = raw;
    } else if (isRecord(raw)) {
        for (const k of ['data', 'Data', 'value', 'Value', 'result', 'Result', 'items', 'Items', 'roles', 'Roles', 'matrix', 'Matrix']) {
            const v = raw[k];
            if (Array.isArray(v)) {
                rows = v;
                break;
            }
            if (isRecord(v) && Array.isArray(v['items'] ?? v['Items'])) {
                rows = (v['items'] ?? v['Items']) as unknown[];
                break;
            }
        }
    }
    return rows.map(mapMatrixRoleRow).filter((x): x is TenantRolePermissionMatrixRowVm => !!x);
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

function extractTenantClinicListArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (!isRecord(raw)) {
        return [];
    }
    for (const k of ['items', 'Items', 'data', 'Data', 'value', 'Value', 'result', 'Result', 'clinics', 'Clinics']) {
        const v = raw[k];
        if (Array.isArray(v)) {
            return v;
        }
    }
    return [];
}

function mapClinicSummaryRow(raw: unknown): ClinicSummary | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['id', 'Id', 'clinicId', 'ClinicId']);
    const name = firstString(raw, ['name', 'Name', 'clinicName', 'ClinicName', 'title', 'Title']);
    if (!id?.trim() || !name?.trim()) {
        return null;
    }
    return { id: id.trim(), name: name.trim() };
}

/** `GET /api/v1/clinics` (kiracı kapsamı) — `/me/clinics` ile aynı toleranslı kök/satır şekli. */
export function mapTenantClinicsListRaw(raw: unknown): ClinicSummary[] {
    return extractTenantClinicListArray(raw)
        .map((row) => mapClinicSummaryRow(row))
        .filter((x): x is ClinicSummary => !!x);
}
