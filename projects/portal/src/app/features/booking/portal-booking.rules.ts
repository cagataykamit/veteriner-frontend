import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import type { PortalBookingReason } from './portal-booking.api';

/** Talep alanı uzunlukları (backend `AppointmentRequest` sabitleriyle aynı); sunucu yine doğrular. */
export const PORTAL_BOOKING_LIMITS = {
    contactName: 150,
    phone: 30,
    petName: 100,
    petSpecies: 60,
    petBreed: 100,
    note: 500,
    /** Not zorunlu nedende ("Diğer") en az uzunluk; backend `AppointmentRequests.NoteRequired` ile aynı. */
    requiredNoteMin: 3
} as const;

/** Seçim anahtarı: "Diğer" seçeneğinin kimliği yoktur, radyo seçiminde bu anahtarla tutulur. */
export const OTHER_REASON_KEY = 'other';

export function reasonKey(reason: PortalBookingReason): string {
    return reason.id ?? OTHER_REASON_KEY;
}

/** Kırpılmış not en az `requiredNoteMin` karakter (yalnız boşluk yazmak geçmez). */
const requiredNote: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
    (control.value ?? '').trim().length >= PORTAL_BOOKING_LIMITS.requiredNoteMin ? null : { noteRequired: true };

/** Seçilen nedene göre not kuralı: "Diğer"de zorunlu, diğerlerinde isteğe bağlı. */
export function bookingNoteValidators(reason: PortalBookingReason | null): ValidatorFn[] {
    const max = Validators.maxLength(PORTAL_BOOKING_LIMITS.note);

    return reason?.requiresNote ? [requiredNote, max] : [max];
}

export const NOTE_REQUIRED_MESSAGE = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.noteRequired];

/** Bekleyen talep sınırı mesajı; sayfa sınırı biliniyorsa sayıyla. */
export function pendingLimitMessage(maxPending: number | null | undefined): string {
    return maxPending && maxPending > 0
        ? `Bu klinikte aynı anda en fazla ${maxPending} bekleyen talebiniz olabilir. Klinik mevcut taleplerinizi yanıtladıktan sonra yeni talep oluşturabilirsiniz.`
        : PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.pendingLimitReached];
}
