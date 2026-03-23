import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapCreatePaymentToApiBody,
    mapPaymentDetailDtoToVm,
    mapPagedPaymentsToVm,
    paymentsQueryToHttpParams
} from '@/app/features/payments/data/payment.mapper';
import type { PaymentDetailDto, PaymentListItemDtoPagedResult } from '@/app/features/payments/models/payment-api.model';
import type { CreatePaymentRequest } from '@/app/features/payments/models/payment-create.model';
import type { PaymentsListQuery } from '@/app/features/payments/models/payment-query.model';
import type { PaymentDetailVm, PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface PaymentsPagedVm {
    items: PaymentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
    private readonly api = inject(ApiClient);

    getPayments(query: PaymentsListQuery): Observable<PaymentsPagedVm> {
        const params = paymentsQueryToHttpParams(query);
        return this.api.get<PaymentListItemDtoPagedResult>(ApiEndpoints.payments.list(), params).pipe(
            map((res) => mapPagedPaymentsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ödeme listesi yüklenemedi.')))
            )
        );
    }

    getPaymentById(id: string): Observable<PaymentDetailVm> {
        return this.api.get<PaymentDetailDto>(ApiEndpoints.payments.byId(id)).pipe(
            map((dto) => mapPaymentDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ödeme bulunamadı veya yüklenemedi.')))
            )
        );
    }

    createPayment(payload: CreatePaymentRequest): Observable<{ id: string }> {
        const body = mapCreatePaymentToApiBody(payload);
        return this.api.post<unknown>(ApiEndpoints.payments.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedPaymentIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('PAYMENT_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(messageFromHttpError(err, 'Ödeme oluşturulamadı.')));
                }
                if (err instanceof Error && err.message === 'PAYMENT_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error('Sunucu yanıtında ödeme kimliği okunamadı. Kayıt oluşmuş olabilir; ödeme listesini kontrol edin.')
                    );
                }
                return throwError(() => (err instanceof Error ? err : new Error('Ödeme oluşturulamadı.')));
            })
        );
    }
}

function extractCreatedPaymentIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body.trim() || null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'paymentId', 'PaymentId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'payment', 'Payment'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const v = n[k];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return String(v);
                }
            }
        }
    }
    return null;
}
