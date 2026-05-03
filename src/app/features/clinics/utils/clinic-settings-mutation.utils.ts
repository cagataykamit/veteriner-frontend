import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

function extractProblemCode(err: HttpErrorResponse): string | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const ext =
        o['extensions'] && typeof o['extensions'] === 'object' && !Array.isArray(o['extensions'])
            ? (o['extensions'] as Record<string, unknown>)
            : null;
    const pickExt = (key: string): string | null => {
        if (!ext) {
            return null;
        }
        const v = ext[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    };
    return (
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        pickExt('code') ||
        pickExt('Code')
    );
}

const CLINIC_MESSAGES: Record<string, string> = {
    'Clinics.AccessDenied': 'Bu kliniğe erişim yetkiniz yok.',
    ClinicsAccessDenied: 'Bu kliniğe erişim yetkiniz yok.',
    'Clinics.NotFound': 'Klinik bulunamadı veya erişilemiyor.',
    ClinicsNotFound: 'Klinik bulunamadı veya erişilemiyor.',
    'Clinics.DuplicateName': 'Bu klinik adı bu kurumda zaten kullanılıyor.',
    ClinicsDuplicateName: 'Bu klinik adı bu kurumda zaten kullanılıyor.',
    'Clinics.RouteIdMismatch': 'İstek adresi ile gönderilen klinik bilgisi uyuşmuyor.',
    ClinicsRouteIdMismatch: 'İstek adresi ile gönderilen klinik bilgisi uyuşmuyor.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok.',
    AuthPermissionDenied: 'Bu işlem için yetkiniz yok.',
    'Subscriptions.TenantReadOnly':
        'Bu işletme salt okunur moddadır; yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    SubscriptionsTenantReadOnly:
        'Bu işletme salt okunur moddadır; yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik üzerinden devam edebilirsiniz.',
    'Subscriptions.TenantCancelled':
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.',
    SubscriptionsTenantCancelled:
        'Bu işletmenin aboneliği iptal edildiği için yazma işlemleri kapalıdır. Yöneticiyseniz Hesap → Abonelik ekranından durumu yönetin.'
};

export function clinicSettingsMutationMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = CLINIC_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const norm = code.replace(/\./g, '');
        const fuzzy = CLINIC_MESSAGES[norm];
        if (fuzzy) {
            return fuzzy;
        }
    }
    return messageFromHttpError(err, fallback);
}

export function isClinicActivateAlreadyActive(err: HttpErrorResponse): boolean {
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    return code.includes('alreadyactive') || code.includes('already_active');
}

export function isClinicDeactivateAlreadyInactive(err: HttpErrorResponse): boolean {
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    return code.includes('alreadyinactive') || code.includes('already_inactive');
}
