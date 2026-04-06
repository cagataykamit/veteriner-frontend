import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SubscriptionStatusKey } from '@/app/features/subscriptions/models/subscription-vm.model';

interface SubscriptionStatusDef {
    readonly key: SubscriptionStatusKey;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    readonly numeric?: number;
    readonly aliases: readonly string[];
}

const STATUS_DEFS: readonly SubscriptionStatusDef[] = [
    { key: 'trialing', label: 'Trialing', severity: 'info', numeric: 0, aliases: ['trial', 'deneme'] },
    { key: 'active', label: 'Active', severity: 'success', numeric: 1, aliases: ['aktif'] },
    { key: 'readonly', label: 'ReadOnly', severity: 'warn', numeric: 2, aliases: ['read-only', 'read_only', 'saltokunur'] },
    { key: 'cancelled', label: 'Cancelled', severity: 'danger', numeric: 3, aliases: ['canceled', 'iptal'] },
    { key: 'unknown', label: 'Bilinmiyor', severity: 'secondary', aliases: ['unknown'] }
];

const statusByNumeric = new Map<number, SubscriptionStatusDef>();
const statusByAlias = new Map<string, SubscriptionStatusDef>();
const statusByKey = new Map<SubscriptionStatusKey, SubscriptionStatusDef>();

for (const def of STATUS_DEFS) {
    statusByKey.set(def.key, def);
    if (typeof def.numeric === 'number') {
        statusByNumeric.set(def.numeric, def);
    }
    for (const alias of def.aliases) {
        statusByAlias.set(normalize(alias), def);
    }
    statusByAlias.set(normalize(def.key), def);
}

export function parseSubscriptionStatus(raw: unknown): SubscriptionStatusKey {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return statusByNumeric.get(Math.trunc(raw))?.key ?? 'unknown';
    }
    if (typeof raw === 'string') {
        const text = normalize(raw);
        if (!text) {
            return 'unknown';
        }
        if (/^-?\d+$/.test(text)) {
            const parsed = Number.parseInt(text, 10);
            return statusByNumeric.get(parsed)?.key ?? 'unknown';
        }
        return statusByAlias.get(text)?.key ?? 'unknown';
    }
    return 'unknown';
}

export function subscriptionStatusLabel(status: SubscriptionStatusKey): string {
    return statusByKey.get(status)?.label ?? 'Bilinmiyor';
}

export function subscriptionStatusSeverity(status: SubscriptionStatusKey): StatusTagSeverity {
    return statusByKey.get(status)?.severity ?? 'secondary';
}

function normalize(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
