import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

const LABELS: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    creditcard: 'Kart',
    debitcard: 'Kart',
    bankcard: 'Kart',
    transfer: 'Havale / EFT',
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

export const PAYMENT_WRITE_METHOD_OPTIONS = [
    { label: 'Nakit', value: 'cash' },
    { label: 'Kart', value: 'card' },
    { label: 'Havale / EFT', value: 'transfer' }
] as const;

export function normalizePaymentMethodKey(method: string): string {
    return normalizeFilterKey(method);
}

export function paymentMethodLabel(method: string | null | undefined): string {
    if (method == null || method === '') {
        return EM;
    }
    const k = normalizePaymentMethodKey(method);
    return LABELS[k] ?? method;
}
