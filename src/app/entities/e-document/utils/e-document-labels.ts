import type { EDocumentOrigin, EDocumentStatus, EDocumentType } from '@/app/entities/e-document/models/e-document.model';

export type EDocumentTagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const TYPE_LABELS: Record<EDocumentType, string> = {
    ESmm: 'e-SMM',
    EArchive: 'e-Arşiv',
    EInvoice: 'e-Fatura'
};

const STATUS: Record<EDocumentStatus, { label: string; severity: EDocumentTagSeverity }> = {
    Draft: { label: 'Taslak', severity: 'secondary' },
    Sending: { label: 'Gönderiliyor', severity: 'info' },
    Issued: { label: 'Kesildi', severity: 'success' },
    Failed: { label: 'Hata', severity: 'danger' },
    Discarded: { label: 'Vazgeçildi', severity: 'secondary' },
    CancelRequested: { label: 'İptal ediliyor', severity: 'warn' },
    Cancelled: { label: 'İptal edildi', severity: 'secondary' },
    CancelRejected: { label: 'İptal reddedildi', severity: 'danger' },
    RejectedByBuyer: { label: 'Alıcı reddetti', severity: 'danger' }
};

/**
 * Kesilmiş e-Fatura uygulamadan iptal edilemediğinde gösterilen düzeltme yolu (vergi tavsiyesi değildir; ADR-036, 2026-11-13).
 * Gün sayısı backend kuralıyla aynı (`EDocumentRules.BuyerAnswerWindowDays`, DOĞRULANMADI).
 */
export const EINVOICE_CORRECTION_GUIDE =
    'Kesilmiş e-Fatura buradan iptal edilemez. Ticari senaryoda alıcı faturayı 8 gün içinde sistem üzerinden reddedebilir; ' +
    'temel senaryoda itiraz KEP, noter veya GİB e-Fatura İptal/İtiraz Portalı üzerinden yapılır; ya da alıcı iade faturası keser. ' +
    'Ardından doğru fatura yeniden kesilir. Uygulama için mali müşavirinize danışın.';

export const EDOCUMENT_STATUS_FILTER_OPTIONS = (Object.keys(STATUS) as EDocumentStatus[]).filter((s) => s !== 'Draft').map((value) => ({ value, label: STATUS[value].label }));

export const EDOCUMENT_TYPE_FILTER_OPTIONS = (Object.keys(TYPE_LABELS) as EDocumentType[]).map((value) => ({ value, label: TYPE_LABELS[value] }));

export function eDocumentTypeLabel(type: EDocumentType): string {
    return TYPE_LABELS[type] ?? type;
}

export function eDocumentStatusLabel(status: EDocumentStatus): string {
    return STATUS[status]?.label ?? status;
}

export function eDocumentStatusSeverity(status: EDocumentStatus): EDocumentTagSeverity {
    return STATUS[status]?.severity ?? 'secondary';
}

/** Belgeyi kimin başlattığı; elle kesilen için etiket yok. */
export function eDocumentOriginLabel(origin: EDocumentOrigin | null | undefined): string | null {
    switch (origin) {
        case 'Automatic':
            return 'Otomatik';
        case 'Payment':
            return 'Ödemeden';
        default:
            return null;
    }
}

/** Sağlayıcı sonucu bekleyen durumlar: kullanıcı "Yenile" ile hemen sorabilir. */
export function isEDocumentPending(status: EDocumentStatus): boolean {
    return status === 'Sending' || status === 'CancelRequested';
}
