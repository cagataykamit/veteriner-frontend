import { HttpErrorResponse } from '@angular/common/http';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Online randevu uçlarının kodları (Veteriner `docs/ONLINE_APPOINTMENT_API_CONTRACT.md`) → kullanıcı mesajı. */
const ONLINE_BOOKING_PROBLEM_MESSAGES: Record<string, string> = {
    'AppointmentReasons.DuplicateName': 'Bu klinikte bu adda aktif bir randevu nedeni zaten var.',
    'AppointmentReasons.NotFound': 'Randevu nedeni bulunamadı; liste yenilendi.',
    'AppointmentReasons.Validation': 'Neden bilgisi geçersiz: ad zorunlu, süre 5–240 dakika, uygun hekimler kliniğin hekimi olmalı.',
    'AppointmentReasons.RouteIdMismatch': 'İstek kimliği kayıtla uyuşmuyor; sayfayı yenileyip tekrar deneyin.',
    'OnlineBooking.Validation': 'En erken talep süresi en geç talep süresinden kısa olmalı (en geç 1–180 gün).',
    'AppointmentRequests.NotFound': 'Talep bulunamadı; liste yenilendi.',
    'AppointmentRequests.NotPending': 'Talep artık beklemede değil; liste yenilendi.',
    'AppointmentRequests.SlotUnavailable': 'Bu saatte uygun hekim yok; farklı saat ya da hekim seçin.',
    'AppointmentRequests.ConcurrencyConflict': 'Talep aynı anda başka biri tarafından değiştirildi; yenileyip tekrar deneyin.',
    'AppointmentRequests.Validation': 'Onay için müşteri ve hayvan seçilmeli; red gerekçesi 3–500 karakter olmalı.',
    'Appointments.ClinicTimeConflict': 'Bu saatte klinikte başka bir planlı randevu var.',
    'Appointments.PetTimeConflict': 'Bu saatte hayvanın başka bir planlı randevusu var.',
    'Appointments.VeterinarianTimeConflict': 'Bu saatte hekimin başka bir planlı randevusu var.',
    'Appointments.OutsideWorkingHours': 'Seçilen saat klinik çalışma saatleri dışında.',
    'Appointments.ClinicClosed': 'Seçilen gün klinik kapalı.',
    'Appointments.BreakTimeConflict': 'Seçilen saat mola zamanına denk geliyor.',
    'Appointments.NotAlignedToSlotInterval': 'Seçilen saat klinik slot aralığına uygun değil.',
    'Pets.NotFound': 'Hayvan bulunamadı ya da seçilen müşteriye ait değil.',
    'Notifications.NotFound': 'Bildirim bulunamadı.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu klinik için yetkiniz yok.'
};

const STALE_CODES = new Set(['AppointmentReasons.NotFound', 'AppointmentRequests.NotFound', 'AppointmentRequests.NotPending']);

/** Kullanıcıya gösterilecek mesaj ve sunucu kodu; `isStale` liste yenilemesi ister. */
export class OnlineBookingError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        readonly isStale: boolean
    ) {
        super(message);
    }
}

export function toOnlineBookingError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);

        return throwError(() => new OnlineBookingError(messageFromHttpError(err, fallback, ONLINE_BOOKING_PROBLEM_MESSAGES), code, !!code && STALE_CODES.has(code)));
    });
}
