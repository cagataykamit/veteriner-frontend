import type { SubscriptionCheckoutProviderSlug, SubscriptionCheckoutSessionVm } from '@/app/features/subscriptions/models/subscription-vm.model';

function normalizeName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/**
 * API’den gelen provider: sayı (0 None, 1 Manual, 2 Stripe, 3 Iyzico) veya isim string.
 * Tanınmayan sayı / string → `null` (UI: Tanımsız).
 */
export function parseSubscriptionCheckoutProvider(raw: unknown): SubscriptionCheckoutProviderSlug | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const i = Math.trunc(raw);
        const byNum: Record<number, SubscriptionCheckoutProviderSlug> = {
            0: 'none',
            1: 'manual',
            2: 'stripe',
            3: 'iyzico'
        };
        return byNum[i] ?? null;
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (/^-?\d+$/.test(t)) {
            return parseSubscriptionCheckoutProvider(Number.parseInt(t, 10));
        }
        const n = normalizeName(t);
        const byName: Record<string, SubscriptionCheckoutProviderSlug> = {
            none: 'none',
            manual: 'manual',
            stripe: 'stripe',
            iyzico: 'iyzico'
        };
        return byName[n] ?? null;
    }
    return null;
}

export function subscriptionCheckoutProviderDisplayLabel(slug: SubscriptionCheckoutProviderSlug | null): string {
    if (slug === null) {
        return 'Tanımsız';
    }
    const labels: Record<SubscriptionCheckoutProviderSlug, string> = {
        none: 'Yok',
        manual: 'Manual',
        stripe: 'Stripe',
        iyzico: 'İyzico'
    };
    return labels[slug];
}

export function expectsHostedCheckoutUrl(slug: SubscriptionCheckoutProviderSlug | null): boolean {
    return slug === 'stripe' || slug === 'iyzico';
}

/**
 * UI’da manuel finalize: yalnızca Manual; Stripe/İyzico’da asla (URL yoksa bile yanıltıcı olmamak için).
 * Diğer bilinmeyen / Yok / parse edilemeyen + URL yok: geliştirme fallback’ı.
 */
export function shouldOfferManualCheckoutFinalize(session: SubscriptionCheckoutSessionVm): boolean {
    if (!session.canContinue) {
        return false;
    }
    if (session.provider === 'manual') {
        return true;
    }
    if (session.provider === 'stripe' || session.provider === 'iyzico') {
        return false;
    }
    return session.checkoutUrl == null || session.checkoutUrl.trim() === '';
}
