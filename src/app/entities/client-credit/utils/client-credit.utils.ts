import type { ClientCreditSource, ClientCreditStatus } from '@/app/entities/client-credit/models/client-credit-api.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const SOURCE_LABELS: Record<ClientCreditSource, string> = {
    Overpayment: 'Fazla ödeme',
    Prepayment: 'Avans'
};

const STATUS_LABELS: Record<ClientCreditStatus, { label: string; severity: StatusTagSeverity }> = {
    Open: { label: 'Açık', severity: 'success' },
    Used: { label: 'Kullanıldı', severity: 'secondary' },
    Refunded: { label: 'İade edildi', severity: 'info' },
    Voided: { label: 'İptal edildi', severity: 'danger' }
};

export function clientCreditSourceLabel(source: ClientCreditSource): string {
    return SOURCE_LABELS[source] ?? source;
}

export function clientCreditStatusTag(status: ClientCreditStatus): { label: string; severity: StatusTagSeverity } {
    return STATUS_LABELS[status] ?? { label: status, severity: 'secondary' };
}
