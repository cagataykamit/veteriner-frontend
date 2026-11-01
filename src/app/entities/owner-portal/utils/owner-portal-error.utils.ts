import { HttpErrorResponse } from '@angular/common/http';
import { catchError, type MonoTypeOperatorFunction, throwError } from 'rxjs';
import { messageFromHttpError, problemCodeFromHttpError, type ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Portal gelen kutusu ve klinik portal ayarı kodları (`PORTAL_API_CONTRACT.md` §11.2, §12) → kullanıcı mesajı. */
const PORTAL_INBOX_PROBLEM_MESSAGES: ProblemMessages = {
    'PortalInbox.DataRequestNotFound': 'Talep bulunamadı; liste yenilendi.',
    'PortalInbox.InvalidStatusTransition': 'Talebin durumu bu sırada değişti; liste yenilendi.',
    'PortalInbox.ConcurrencyConflict': 'Talep aynı anda başka biri tarafından güncellendi; liste yenilendi, tekrar deneyin.',
    'PortalInbox.ResponseNoteRequired': 'Tamamlamak ya da reddetmek için hasta sahibine gidecek yanıt notunu yazın.',
    'PortalInbox.Validation': 'Yanıt notu en fazla 2000 karakter olabilir.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu klinik için yetkiniz yok.'
};

const STALE_CODES = new Set(['PortalInbox.DataRequestNotFound', 'PortalInbox.InvalidStatusTransition', 'PortalInbox.ConcurrencyConflict']);

/** Kullanıcıya gösterilecek mesaj ve sunucu kodu; `isStale` liste yenilemesi ister. */
export class PortalInboxError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        readonly isStale: boolean
    ) {
        super(message);
    }
}

export function toPortalInboxError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);

        return throwError(() => new PortalInboxError(messageFromHttpError(err, fallback, PORTAL_INBOX_PROBLEM_MESSAGES), code, !!code && STALE_CODES.has(code)));
    });
}
