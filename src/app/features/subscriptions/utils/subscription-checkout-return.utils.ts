import type { ParamMap } from '@angular/router';

export type SubscriptionCheckoutReturnOutcome = 'success' | 'cancel' | 'unknown';

export interface ParsedSubscriptionCheckoutReturn {
    readonly outcome: SubscriptionCheckoutReturnOutcome;
    /** Hosted success URL’de sık: `session_id`; backend metadata ile uyum için alternatif anahtarlar. */
    readonly sessionId: string | null;
}

function trimParam(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

function normalizeOutcome(raw: string | null | undefined): 'success' | 'cancel' | null {
    const n = raw?.trim().toLowerCase() ?? '';
    if (!n) {
        return null;
    }
    if (['success', 'succeeded', 'complete', 'completed', 'ok', 'paid'].includes(n)) {
        return 'success';
    }
    if (['cancel', 'cancelled', 'canceled', 'aborted', 'failed'].includes(n)) {
        return 'cancel';
    }
    return null;
}

/**
 * Success/cancel URL’lerinde backend’in ekleyebileceği query anahtarlarını okur.
 * Hosted ödeme success dönüşü çoğunlukla yalnızca `session_id` taşır; bu durumda outcome `success` kabul edilir.
 */
const RETURN_QUERY_KEYS = [
    'session_id',
    'checkoutSessionId',
    'billing_checkout_session_id',
    'checkout',
    'billing',
    'payment_status',
    'payment',
    'status',
    'result',
    /** Sık hosted TR / iyzico benzeri dönüş parametreleri */
    'token',
    'conversationId',
    'conversation_id',
    'paymentConversationId',
    'payment_conversation_id',
    'merchant_oid',
    'merchantOid'
] as const;

/** Success/cancel dönüşü için URL’de anlamlı query var mı (`session_id` dahil). */
export function hasSubscriptionCheckoutReturnQuery(params: ParamMap): boolean {
    return RETURN_QUERY_KEYS.some((k) => {
        const v = params.get(k);
        return v != null && String(v).trim() !== '';
    });
}

/**
 * @param sessionIdFallback — URL’de oturum id yoksa (ör. yalnızca `token` dönüyorsa) `sessionStorage`’daki checkout id.
 */
export function parseSubscriptionCheckoutReturn(
    params: ParamMap,
    sessionIdFallback?: string | null
): ParsedSubscriptionCheckoutReturn {
    const sessionId =
        trimParam(params.get('session_id')) ??
        trimParam(params.get('checkoutSessionId')) ??
        trimParam(params.get('billing_checkout_session_id')) ??
        trimParam(sessionIdFallback ?? undefined);

    const keysToScan = ['checkout', 'billing', 'payment_status', 'payment', 'status', 'result'] as const;
    let explicit: 'success' | 'cancel' | null = null;
    for (const key of keysToScan) {
        const o = normalizeOutcome(params.get(key));
        if (o === 'cancel') {
            explicit = 'cancel';
            break;
        }
        if (o === 'success') {
            explicit = 'success';
        }
    }

    let outcome: SubscriptionCheckoutReturnOutcome = 'unknown';
    if (explicit === 'cancel') {
        outcome = 'cancel';
    } else if (explicit === 'success' || sessionId) {
        outcome = 'success';
    } else if (hasSubscriptionCheckoutReturnQuery(params)) {
        /** Örn. yalnızca `token` / iyzico parametreleri; checkout id sessionStorage’da kalır. */
        outcome = 'success';
    }

    return { outcome, sessionId };
}
