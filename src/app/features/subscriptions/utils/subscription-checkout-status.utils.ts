import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SubscriptionCheckoutStatusKey } from '@/app/features/subscriptions/models/subscription-vm.model';

interface SubscriptionCheckoutStatusDef {
    readonly key: SubscriptionCheckoutStatusKey;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    readonly aliases: readonly string[];
}

/**
 * Backend sayısal enum (sıra): Pending=0, RedirectReady=1, Completed=2, Failed=3, Expired=4, Cancelled=5, Processing=6.
 * String isimler ve eski API alias’ları da tolere edilir.
 */
const CHECKOUT_STATUS_BY_NUM: Readonly<Record<number, SubscriptionCheckoutStatusKey>> = {
    0: 'processing',
    1: 'redirect_ready',
    2: 'finalized',
    3: 'failed',
    4: 'expired',
    5: 'cancelled',
    6: 'processing'
};

const STATUS_DEFS: readonly SubscriptionCheckoutStatusDef[] = [
    { key: 'open', label: 'Açık', severity: 'info', aliases: ['open', 'created'] },
    {
        key: 'redirect_ready',
        label: 'Yönlendirmeye hazır',
        severity: 'info',
        aliases: ['redirectready', 'redirect_ready', 'readyforredirect', 'awaitingredirect']
    },
    {
        key: 'processing',
        label: 'İşleniyor',
        severity: 'info',
        aliases: [
            'processing',
            'pending',
            'pendingpayment',
            'awaitingwebhook',
            'paidpending',
            'inprogress',
            'in_progress'
        ]
    },
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
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const i = Math.trunc(raw);
        return CHECKOUT_STATUS_BY_NUM[i] ?? 'unknown';
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (/^-?\d+$/.test(t)) {
            return parseSubscriptionCheckoutStatus(Number.parseInt(t, 10));
        }
        const n = normalize(raw);
        if (!n) {
            return 'unknown';
        }
        return byAlias.get(n)?.key ?? 'unknown';
    }
    return 'unknown';
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
