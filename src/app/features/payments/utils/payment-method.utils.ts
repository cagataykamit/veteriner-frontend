import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

/** Backend PaymentMethod enum (0/1/2) ile form select değerleri (cash/card/transfer) — tek canonical küme. */
export const CANONICAL_PAYMENT_METHODS = ['cash', 'card', 'transfer'] as const;
export type CanonicalPaymentMethod = (typeof CANONICAL_PAYMENT_METHODS)[number];

const LABELS: Record<CanonicalPaymentMethod, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale / EFT'
};

/** Ek string alias (read path; normalize sonrası) */
const EXTRA_LABELS: Record<string, string> = {
    creditcard: 'Kart',
    debitcard: 'Kart',
    bankcard: 'Kart',
    banktransfer: 'Havale / EFT',
    wiretransfer: 'Havale / EFT',
    eft: 'Havale / EFT',
    pos: 'POS',
    virtualpos: 'POS',
    qr: 'QR',
    online: 'Online',
    wallet: 'Cüzdan',
    other: 'Diğer'
};

export const PAYMENT_WRITE_METHOD_OPTIONS = CANONICAL_PAYMENT_METHODS.map((value) => ({
    label: LABELS[value],
    value
})) as readonly { label: string; value: CanonicalPaymentMethod }[];

/**
 * API / form ham değerini canonical forma çevirir (0 / "0" / "cash" → "cash").
 * Bilinmeyen veya boş → null (sessizce yanlış canonical üretmez).
 */
export function resolvePaymentMethodFormValue(raw: unknown): CanonicalPaymentMethod | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'number') {
        if (!Number.isFinite(raw) || Number.isNaN(raw)) {
            return null;
        }
        if (raw === 0) {
            return 'cash';
        }
        if (raw === 1) {
            return 'card';
        }
        if (raw === 2) {
            return 'transfer';
        }
        return null;
    }
    const s = String(raw).trim();
    if (s === '') {
        return null;
    }
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        return resolvePaymentMethodFormValue(Number(s));
    }
    const k = normalizeFilterKey(s);
    if (k === 'cash') {
        return 'cash';
    }
    if (k === 'card' || k === 'creditcard' || k === 'debitcard' || k === 'bankcard' || k === 'pos' || k === 'virtualpos') {
        return 'card';
    }
    if (k === 'transfer' || k === 'banktransfer' || k === 'wiretransfer' || k === 'eft') {
        return 'transfer';
    }
    return null;
}

/** Create/update body: canonical string → backend numeric enum. */
export function paymentMethodCanonicalToApiEnum(method: string): number {
    const k = normalizeFilterKey(method.trim());
    if (k === 'cash') {
        return 0;
    }
    if (k === 'card' || k === 'creditcard' || k === 'debitcard' || k === 'bankcard' || k === 'pos' || k === 'virtualpos') {
        return 1;
    }
    if (k === 'transfer' || k === 'banktransfer' || k === 'wiretransfer' || k === 'eft') {
        return 2;
    }
    throw new Error('PAYMENT_WRITE_METHOD_UNSUPPORTED');
}

export function normalizePaymentMethodKey(method: string): string {
    return normalizeFilterKey(method);
}

/**
 * Liste / detay etiketi: numeric enum, canonical string veya ham string.
 * Çözülemeyen değerlerde EM (veriyi tahmin edip göstermez).
 */
export function paymentMethodLabel(method: unknown): string {
    if (method === null || method === undefined) {
        return EM;
    }
    if (typeof method === 'string' && method.trim() === '') {
        return EM;
    }
    const c = resolvePaymentMethodFormValue(method);
    if (c != null) {
        return LABELS[c];
    }
    if (typeof method === 'string') {
        const k = normalizePaymentMethodKey(method);
        return EXTRA_LABELS[k] ?? EM;
    }
    return EM;
}
