import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

const APPOINTMENT_CONFLICT_USER_MESSAGE =
    'Randevu kaydedilemedi. Aynı zaman diliminde çakışan bir kayıt olabilir; tarih/saat ve seçimleri kontrol edip tekrar deneyin.';

/** Backend ProblemDetails `code` / `extensions.code` — süre bazlı çakışma ve eski slot kodları. */
const APPOINTMENT_CONFLICT_CODE_MESSAGES: Record<string, string> = {
    'Appointments.ClinicTimeConflict': 'Bu saat aralığında klinikte başka bir randevu var.',
    AppointmentsClinicTimeConflict: 'Bu saat aralığında klinikte başka bir randevu var.',
    'Appointments.PetTimeConflict': 'Bu hayvanın bu saat aralığında başka bir randevusu var.',
    AppointmentsPetTimeConflict: 'Bu hayvanın bu saat aralığında başka bir randevusu var.',
    'Appointments.ClinicSlotDuplicate': 'Bu saatte klinikte başka bir randevu var.',
    AppointmentsClinicSlotDuplicate: 'Bu saatte klinikte başka bir randevu var.',
    'Appointments.PetSlotDuplicate': 'Bu hayvanın bu saatte başka bir randevusu var.',
    AppointmentsPetSlotDuplicate: 'Bu hayvanın bu saatte başka bir randevusu var.',
    'Appointments.OutsideWorkingHours': "Randevu saati kliniğin çalışma saatleri dışında.",
    AppointmentsOutsideWorkingHours: "Randevu saati kliniğin çalışma saatleri dışında.",
    'Appointments.ClinicClosed': 'Seçilen gün klinik kapalı.',
    AppointmentsClinicClosed: 'Seçilen gün klinik kapalı.',
    'Appointments.BreakTimeConflict': "Randevu saati kliniğin mola aralığına denk geliyor.",
    AppointmentsBreakTimeConflict: "Randevu saati kliniğin mola aralığına denk geliyor."
};

function extractAppointmentProblemCode(err: HttpErrorResponse): string | null {
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

function conflictMessageForProblemCode(code: string): string | null {
    const direct = APPOINTMENT_CONFLICT_CODE_MESSAGES[code];
    if (direct) {
        return direct;
    }
    const noDots = code.replace(/\./g, '');
    return APPOINTMENT_CONFLICT_CODE_MESSAGES[noDots] ?? null;
}

function isWeak409ConflictText(s: string): boolean {
    const t = s.trim();
    return /^conflict$/i.test(t) || /^duplicate$/i.test(t) || /^gone$/i.test(t);
}

/**
 * Appointment create/update HTTP hataları:
 * anlamlı `detail`/`title` korunur; 409'da yalnızca zayıf başlık varsa kullanıcı dostu çakışma metnine düşer.
 */
export function messageFromAppointmentUpsertHttpError(err: HttpErrorResponse): string {
    const problemCode = extractAppointmentProblemCode(err);
    if (problemCode) {
        const mapped = conflictMessageForProblemCode(problemCode);
        if (mapped) {
            return mapped;
        }
    }

    const explicit = messageFromHttpError(err, '').trim();
    if (explicit) {
        if (err.status === 409 && isWeak409ConflictText(explicit)) {
            return APPOINTMENT_CONFLICT_USER_MESSAGE;
        }
        return explicit;
    }
    if (err.status === 409) {
        return APPOINTMENT_CONFLICT_USER_MESSAGE;
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
