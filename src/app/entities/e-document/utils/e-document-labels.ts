import { E_DOCUMENT_SETTINGS_ROUTE, TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import type { EDocumentOrigin, EDocumentPreviewDto, EDocumentSetupIssueCode, EDocumentStatus, EDocumentType } from '@/app/entities/e-document/models/e-document.model';
import { CLINIC_TAXPAYER_TYPE_OPTIONS } from '@/app/entities/clinic/models/clinic-taxpayer-type.model';

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

/** Belge kesmeden önceki klinik ayarı: ne eksik, neden gerekli, hangi düğmeyle nereye gidilir (gerçek ayar o sayfada). */
export interface EDocumentSetupIssueInfo {
    title: string;
    reason: string;
    action: string;
    /** Ayar sayfası; mükellef bilgileri aktif kliniğin sayfasındadır. */
    route: (clinicId: string | null) => string[];
    fragment: string;
}

export const E_DOCUMENT_SETUP_ISSUE: Record<EDocumentSetupIssueCode, EDocumentSetupIssueInfo> = {
    TaxpayerTypeMissing: {
        title: 'Mükellef türü',
        reason: 'Belgenin e-SMM mi fatura mı olacağı bu seçimden çıkar.',
        action: 'Mükellef bilgilerini aç',
        route: (clinicId) => (clinicId ? ['/panel/settings/clinics', clinicId] : ['/panel/settings/clinics']),
        fragment: 'mukellef-bilgileri'
    },
    NotConnected: {
        title: 'e-Belge entegratörü bağlantısı',
        reason: 'Belge GİB’e entegratör hesabınız üzerinden gönderilir.',
        action: 'Entegratörü bağla',
        route: () => [E_DOCUMENT_SETTINGS_ROUTE],
        fragment: 'entegrator'
    }
};

/** Hazırlık listesinin sırası; tamam olanlar da bu sırayla (değeriyle) görünür. */
export const E_DOCUMENT_SETUP_ORDER: readonly EDocumentSetupIssueCode[] = ['TaxpayerTypeMissing', 'NotConnected'];

/** Tamam olan ayarın değeri: seçili mükellef türü ya da bağlı entegratör ve ortamı. */
export function eDocumentSetupDoneValue(code: EDocumentSetupIssueCode, preview: EDocumentPreviewDto): string {
    if (code === 'TaxpayerTypeMissing') {
        return CLINIC_TAXPAYER_TYPE_OPTIONS.find((o) => o.value === preview.taxpayerType)?.label ?? '';
    }

    const environment = preview.connection.environment === 'Live' ? 'canlı ortam' : preview.connection.environment === 'Test' ? 'test ortamı' : null;

    return ['Bağlı', preview.connection.providerName, environment].filter(Boolean).join(' · ');
}

const RETURN_TARGETS: readonly { prefix: string; label: string }[] = [
    { prefix: '/panel/charges', label: 'Ücretlere dön' },
    { prefix: '/panel/e-documents', label: 'e-Belgelere dön' },
    { prefix: '/panel/sales', label: 'Satışa dön' },
    { prefix: TODAY_ROUTE, label: 'Bugün’e dön' }
];

/** Ayar sayfasından belgenin açıldığı sayfaya dönüş düğmesi. */
export function eDocumentReturnLabel(returnTo: string): string {
    return RETURN_TARGETS.find((t) => returnTo === t.prefix || returnTo.startsWith(`${t.prefix}/`) || returnTo.startsWith(`${t.prefix}?`))?.label ?? 'Geri dön';
}
