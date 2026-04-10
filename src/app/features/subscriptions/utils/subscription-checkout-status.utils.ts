import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SubscriptionCheckoutStatusKey } from '@/app/features/subscriptions/models/subscription-vm.model';

interface SubscriptionCheckoutStatusDef {
    readonly key: SubscriptionCheckoutStatusKey;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    readonly aliases: readonly string[];
}

const STATUS_DEFS: readonly SubscriptionCheckoutStatusDef[] = [
    { key: 'open', label: 'Açık', severity: 'info', aliases: ['open', 'pending', 'created'] },
    { key: 'finalized', label: 'Tamamlandı', severity: 'success', aliases: ['finalized', 'completed', 'activated', 'success'] },
    { key: 'expired', label: 'Süresi doldu', severity: 'warn', aliases: ['expired', 'timeout'] },
    { key: 'failed', label: 'Başarısız', severity: 'danger', aliases: ['failed', 'error'] },
    { key: 'cancelled', label: 'İptal', severity: 'secondary', aliases: ['cancelled', 'canceled'] },
    { key: 'unknown', label: 'Bilinmiyor', severity: 'secondary', aliases: ['unknown'] }
];

const byAlias = new Map<string, SubscriptionCheckoutStatusDef>();
const byKey = new Map<SubscriptionCheckoutStatusKey, SubscriptionCheckoutStatusDef>();

for (const def of STATUS_DEFS) {
    byKey.set(def.key, def);
    byAlias.set(normalize(def.key), def);
    for (const alias of def.aliases) {
        byAlias.set(normalize(alias), def);
    }
}

export function parseSubscriptionCheckoutStatus(raw: unknown): SubscriptionCheckoutStatusKey {
    if (typeof raw !== 'string') {
        return 'unknown';
    }
    const n = normalize(raw);
    if (!n) {
        return 'unknown';
    }
    return byAlias.get(n)?.key ?? 'unknown';
}

export function subscriptionCheckoutStatusLabel(status: SubscriptionCheckoutStatusKey): string {
    return byKey.get(status)?.label ?? 'Bilinmiyor';
}

export function subscriptionCheckoutStatusSeverity(status: SubscriptionCheckoutStatusKey): StatusTagSeverity {
    return byKey.get(status)?.severity ?? 'secondary';
}

function normalize(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
