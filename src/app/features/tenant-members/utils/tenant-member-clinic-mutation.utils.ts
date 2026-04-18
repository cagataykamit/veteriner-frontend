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

const MEMBER_CLINIC_MESSAGES: Record<string, string> = {
    'Members.NotFound': 'Üye bulunamadı.',
    MembersNotFound: 'Üye bulunamadı.',
    'Clinics.NotFound': 'Seçilen klinik bulunamadı.',
    ClinicsNotFound: 'Seçilen klinik bulunamadı.',
    'Clinics.Inactive': 'Bu klinik pasif veya kullanılamıyor; üyelik eklenemez veya kaldırılamaz.',
    ClinicsInactive: 'Bu klinik pasif veya kullanılamıyor; üyelik eklenemez veya kaldırılamaz.',
    'Clinics.SelfClinicRemoveForbidden': 'Kendi klinik üyeliğinizi bu ekrandan kaldıramazsınız.',
    ClinicsSelfClinicRemoveForbidden: 'Kendi klinik üyeliğinizi bu ekrandan kaldıramazsınız.',
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

/** Üye klinik üyeliği ekleme / kaldırma — ProblemDetails `code` ve genel HTTP mesajı. */
export function memberClinicAssignRemoveMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = MEMBER_CLINIC_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const norm = code.replace(/\./g, '');
        const fuzzy = MEMBER_CLINIC_MESSAGES[norm];
        if (fuzzy) {
            return fuzzy;
        }
    }
    return messageFromHttpError(err, fallback);
}

export function isMemberClinicAlreadyAssignedConflict(err: HttpErrorResponse): boolean {
    if (err.status !== 409 && err.status !== 400) {
        return false;
    }
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    if (!code) {
        return false;
    }
    return (
        code.includes('alreadyassigned') ||
        code.includes('already_assigned') ||
        code.includes('duplicate') ||
        code.includes('exists')
    );
}

export function isMemberClinicAlreadyRemoved(err: HttpErrorResponse): boolean {
    const code = extractProblemCode(err)?.toLowerCase() ?? '';
    return code.includes('alreadyremoved') || code.includes('already_removed') || code.includes('notfound');
}
