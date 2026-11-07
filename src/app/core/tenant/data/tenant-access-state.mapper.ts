import type { TenantAccessStateVm, TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';

function firstString(...values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function toBoolLoose(v: unknown): boolean {
    if (v === true || v === 1) {
        return true;
    }

    if (typeof v === 'string') {
        const n = v.trim().toLowerCase();

        return n === 'true' || n === '1';
    }

    return false;
}

function mapPlanFeatures(raw: unknown): TenantPlanFeatureVm[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.flatMap((item: unknown) => {
        const o = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const feature = firstString(o['feature']);
        const requiredPlanCode = firstString(o['requiredPlanCode']);

        return feature && requiredPlanCode ? [{ feature, isEnabled: toBoolLoose(o['isEnabled']), requiredPlanCode }] : [];
    });
}

export function mapTenantAccessStateDtoToVm(raw: unknown): TenantAccessStateVm {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    return {
        tenantId: firstString(o['tenantId'], o['TenantId'], o['tenant_id']) ?? '',
        isReadOnly: toBoolLoose(o['isReadOnly'] ?? o['IsReadOnly'] ?? o['is_read_only']),
        reasonCode: firstString(o['reasonCode'], o['ReasonCode'], o['reason_code']),
        message: firstString(o['message'], o['Message']),
        planCode: firstString(o['planCode']),
        planFeatures: mapPlanFeatures(o['planFeatures'])
    };
}
