import type {
    TenantMemberClaimVm,
    TenantRoleMatrixPermissionVm,
    TenantRolePermissionMatrixRowVm
} from '@/app/features/tenant-members/models/tenant-members-vm.model';
import {
    normalizeTenantRoleLabel,
    roleKeyFromHaystack,
    roleKeyFromMatrixRow
} from '@/app/features/tenant-members/utils/tenant-role-fixed-role.utils';

function matrixPermissionDedupeKey(p: TenantRoleMatrixPermissionVm): string {
    const c = p.code?.trim();
    if (c) {
        return `c:${c.toLowerCase()}`;
    }
    const id = p.id?.trim();
    if (id) {
        return `i:${id.toLowerCase()}`;
    }
    return `n:${(p.name || '').trim().toLowerCase()}`;
}

function claimMatchesMatrixRow(claim: TenantMemberClaimVm, row: TenantRolePermissionMatrixRowVm): boolean {
    const cid = claim.id.trim();
    const rid = row.roleId.trim();
    if (cid && rid && cid === rid) {
        return true;
    }
    if (normalizeTenantRoleLabel(claim.name) === normalizeTenantRoleLabel(row.roleName)) {
        return true;
    }
    const ck = roleKeyFromHaystack(claim.name, claim.id);
    const rk = roleKeyFromMatrixRow(row);
    if (ck && rk && ck === rk) {
        return true;
    }
    return false;
}

/**
 * Üyenin atanmış rollerine göre matrix satırlarından birleşik yetki listesi (kod bazlı tekilleştirilmiş).
 * Ham matrix yanıtı kullanılır (sabit dörtlü doldurma değil).
 */
export function mergeEffectiveMatrixPermissions(
    matrixRows: TenantRolePermissionMatrixRowVm[],
    claims: TenantMemberClaimVm[]
): TenantRoleMatrixPermissionVm[] {
    const seen = new Set<string>();
    const out: TenantRoleMatrixPermissionVm[] = [];
    for (const claim of claims) {
        for (const row of matrixRows) {
            if (!claimMatchesMatrixRow(claim, row)) {
                continue;
            }
            for (const p of row.permissions) {
                const k = matrixPermissionDedupeKey(p);
                if (seen.has(k)) {
                    continue;
                }
                seen.add(k);
                out.push(p);
            }
        }
    }
    return out;
}

export interface TenantMemberEffectivePermissionSummaryVm {
    assignedRoleCount: number;
    uniquePermissionCount: number;
    groupCount: number;
    permissions: TenantRoleMatrixPermissionVm[];
}

export function buildTenantMemberEffectivePermissionSummary(
    matrixRows: TenantRolePermissionMatrixRowVm[],
    claims: TenantMemberClaimVm[],
    /** `buildPermissionGroupPanels` ile aynı “Diğer” anahtarı; grup sayısı tutarlı olsun. */
    otherGroupFallback: string
): TenantMemberEffectivePermissionSummaryVm {
    const permissions = mergeEffectiveMatrixPermissions(matrixRows, claims);
    const groupKeys = new Set<string>();
    for (const p of permissions) {
        groupKeys.add(p.group?.trim() || otherGroupFallback);
    }
    return {
        assignedRoleCount: claims.length,
        uniquePermissionCount: permissions.length,
        groupCount: groupKeys.size,
        permissions
    };
}
