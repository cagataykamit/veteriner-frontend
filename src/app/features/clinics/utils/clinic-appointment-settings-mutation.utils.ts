import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

function extractProblemCode(err: HttpErrorResponse): string | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const obj = body as Record<string, unknown>;
    const extensions =
        obj['extensions'] && typeof obj['extensions'] === 'object' && !Array.isArray(obj['extensions'])
            ? (obj['extensions'] as Record<string, unknown>)
            : null;

    const extensionValue = (key: string): string | null => {
        if (!extensions) {
            return null;
        }
        const value = extensions[key];
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    };

    return (
        (typeof obj['code'] === 'string' && obj['code'].trim() ? obj['code'].trim() : null) ||
        (typeof obj['Code'] === 'string' && obj['Code'].trim() ? obj['Code'].trim() : null) ||
        extensionValue('code') ||
        extensionValue('Code')
    );
}

const APPOINTMENT_SETTINGS_MESSAGES: Record<string, string> = {
    'Clinics.AccessDenied': 'Bu kliniğe erişim yetkiniz yok.',
    ClinicsAccessDenied: 'Bu kliniğe erişim yetkiniz yok.',
    'Clinics.AppointmentSettings.Validation.InvalidRequestBody': 'Randevu varsayılanları bilgisi geçersiz.',
    ClinicsAppointmentSettingsValidationInvalidRequestBody: 'Randevu varsayılanları bilgisi geçersiz.'
};

export function clinicAppointmentSettingsMutationMessage(err: HttpErrorResponse, fallback: string): string {
    const code = extractProblemCode(err);
    if (code) {
        const direct = APPOINTMENT_SETTINGS_MESSAGES[code];
        if (direct) {
            return direct;
        }
        const normalized = APPOINTMENT_SETTINGS_MESSAGES[code.replace(/\./g, '')];
        if (normalized) {
            return normalized;
        }
        const lowerCode = code.toLowerCase();
        if (lowerCode.includes('validation') || lowerCode.includes('invalid') || err.status === 400 || err.status === 422) {
            return 'Lütfen randevu varsayılanlarını kontrol edin.';
        }
    }
    return messageFromHttpError(err, fallback);
}
