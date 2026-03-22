import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';

const EM = '—';

const LABELS: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale / EFT',
    eft: 'Havale / EFT',
    pos: 'POS',
    online: 'Online',
    other: 'Diğer'
};

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
