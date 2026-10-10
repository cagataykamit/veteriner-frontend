import { HttpErrorResponse } from '@angular/common/http';
import { catchError, MonoTypeOperatorFunction, throwError } from 'rxjs';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Hatayı kullanıcıya gösterilecek Türkçe mesajlı `Error`'a çevirir (backend `code` eşlemesi `messageFromHttpError` içinde). */
export function toUserError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) =>
        throwError(() => (err instanceof HttpErrorResponse ? new Error(messageFromHttpError(err, fallback)) : err))
    );
}
