import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, MonoTypeOperatorFunction, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { DuplicatePaymentDto } from '@/app/features/duplicate-payments/models/duplicate-payment.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const DUPLICATE_PAYMENT_PROBLEM_MESSAGES: Record<string, string> = {
    'Billing.DuplicatePaymentRefundInProgress': 'Otomatik iade hâlâ sürüyor; sonuçlanınca durum güncellenir.'
};

function toDuplicatePaymentError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        return throwError(() => new Error(messageFromHttpError(err, fallback, DUPLICATE_PAYMENT_PROBLEM_MESSAGES)));
    });
}

/** Platform yöneticisi: çift ödemeler ve iade durumları. */
@Injectable({ providedIn: 'root' })
export class DuplicatePaymentsService {
    private readonly api = inject(ApiClient);

    list(): Observable<DuplicatePaymentDto[]> {
        return this.api.get<DuplicatePaymentDto[]>(ApiEndpoints.duplicatePayments.list()).pipe(toDuplicatePaymentError('Çift ödemeler yüklenemedi.'));
    }

    /** iyzico panelinden elle yapılan iadeyi kaydeder; zaten iade edilmişse de başarılı döner. */
    markRefunded(checkoutSessionId: string): Observable<void> {
        return this.api
            .post<void>(ApiEndpoints.duplicatePayments.markRefunded(checkoutSessionId), {})
            .pipe(toDuplicatePaymentError('İade edildi olarak işaretlenemedi.'));
    }
}
