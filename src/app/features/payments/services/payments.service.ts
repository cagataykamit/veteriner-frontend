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
        return this.api.post<PaymentDetailDto>(ApiEndpoints.payments.list(), body).pipe(
            map((dto) => {
                if (!dto?.id) {
                    throw new Error('Sunucu yanıtında ödeme kimliği yok.');
                }
                return { id: dto.id };
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ödeme oluşturulamadı.')))
            )
        );
    }
}
