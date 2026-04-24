import type { TenantRolePermissionMatrixRowVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';

export type TenantFixedRoleKey = 'admin' | 'clinicadmin' | 'veteriner' | 'sekreter';

interface FixedRoleDef {
    key: TenantFixedRoleKey;
    label: string;
    aliases: readonly string[];
}

export const TENANT_FIXED_ROLE_DEFS: readonly FixedRoleDef[] = [
    { key: 'clinicadmin', label: 'ClinicAdmin', aliases: ['clinicadmin', 'clinic admin'] },
    { key: 'admin', label: 'Admin', aliases: ['admin'] },
    { key: 'veteriner', label: 'Veteriner', aliases: ['veteriner', 'veterinarian', 'doctor'] },
    { key: 'sekreter', label: 'Sekreter', aliases: ['sekreter', 'secretary'] }
] as const;

/** Rol adı / kimliği eşlemesi için normalize (boşluk ve tire birleştirilir). */
export function normalizeTenantRoleLabel(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
}

/**
 * Rol adı + kimlik üzerinden sabit rol anahtarı (Admin, ClinicAdmin, …).
 * Matrix satırı ve üye claim eşlemesinde ortak kullanılır.
 */
export function roleKeyFromHaystack(roleName: string, roleId: string): TenantFixedRoleKey | null {
    const nameNorm = normalizeTenantRoleLabel(roleName);
    const idNorm = normalizeTenantRoleLabel(roleId);
    const compactCandidates = new Set([nameNorm, idNorm]);
    const tokenCandidates = new Set(
        `${roleName} ${roleId}`
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .map((x) => x.trim())
            .filter((x) => !!x)
    );
    for (const def of TENANT_FIXED_ROLE_DEFS) {
        if (
            def.aliases.some((alias) => {
                const aliasNorm = normalizeTenantRoleLabel(alias);
                return compactCandidates.has(aliasNorm) || tokenCandidates.has(aliasNorm);
            })
        ) {
            return def.key;
        }
    }
    return null;
}

export function roleKeyFromMatrixRow(row: TenantRolePermissionMatrixRowVm): TenantFixedRoleKey | null {
    return roleKeyFromHaystack(row.roleName, row.roleId);
}

/** Matrix sayfası: dört rol kartı sabit sıra; eksik satırlar boş yetki ile doldurulur. */
export function buildFixedRoleMatrixRows(rows: TenantRolePermissionMatrixRowVm[]): TenantRolePermissionMatrixRowVm[] {
    const byKey = new Map<TenantFixedRoleKey, TenantRolePermissionMatrixRowVm>();
    for (const row of rows) {
        const key = roleKeyFromMatrixRow(row);
        if (!key || byKey.has(key)) {
            continue;
        }
        byKey.set(key, row);
    }
    return TENANT_FIXED_ROLE_DEFS.map((def) => {
        const existing = byKey.get(def.key);
        if (existing) {
            return existing;
        }
        return {
            roleId: def.key,
            roleName: def.label,
            permissions: []
        };
    });
}
