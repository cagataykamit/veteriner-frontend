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

const WH_MESSAGES: Record<string, string> = {
    'Clinics.AccessDenied': 'Bu kliniğe erişim yetkiniz yok.',
    ClinicsAccessDenied: 'Bu kliniğe erişim yetkiniz yok.',
    'Clinics.WorkingHours.Validation.InvalidRequestBody': 'Çalışma saatleri bilgisi geçersiz.',
    ClinicsWorkingHoursValidationInvalidRequestBody: 'Çalışma saatleri bilgisi geçersiz.',
    'Clinics.WorkingHours.Validation.InvalidSchedule': 'Çalışma saatleri aralığı geçersiz.',
    ClinicsWorkingHoursValidationInvalidSchedule: 'Çalışma saatleri aralığı geçersiz.'
};

export function clinicWorkingHoursMutationMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = WH_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const norm = code.replace(/\./g, '');
        const fuzzy = WH_MESSAGES[norm];
        if (fuzzy) {
            return fuzzy;
        }
        const low = code.toLowerCase();
        if (low.includes('validation') || low.includes('invalid') || err.status === 400 || err.status === 422) {
            return 'Lütfen çalışma saatlerini kontrol edin.';
        }
    }
    return messageFromHttpError(err, fallback);
}
