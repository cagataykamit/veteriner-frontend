import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapPendingPlanChangeDtoToVm,
    mapSubscriptionCheckoutSessionDtoToVm,
    mapSubscriptionSummaryDtoToVm
} from '@/app/features/subscriptions/data/subscription.mapper';
import type {
    FinalizeSubscriptionCheckoutRequestDto,
    PendingPlanChangeDto,
    ScheduleSubscriptionDowngradeRequestDto,
    StartSubscriptionCheckoutRequestDto,
    SubscriptionCheckoutSessionDto,
    SubscriptionSummaryDto
} from '@/app/features/subscriptions/models/subscription-api.model';
import type { PendingPlanChangeVm, SubscriptionCheckoutSessionVm, SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getSubscriptionSummary(): Observable<SubscriptionSummaryVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.get<SubscriptionSummaryDto>(ApiEndpoints.tenants.subscriptionSummary(tenantId)).pipe(
            map(mapSubscriptionSummaryDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Abonelik özeti yüklenemedi.')))
            )
        );
    }

    startCheckout(targetPlanCode: string): Observable<SubscriptionCheckoutSessionVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const body: StartSubscriptionCheckoutRequestDto = { targetPlanCode };
        return this.api.post<SubscriptionCheckoutSessionDto>(ApiEndpoints.tenants.subscriptionCheckout(tenantId), body).pipe(
            map(mapSubscriptionCheckoutSessionDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Checkout oturumu başlatılamadı.')))
            )
        );
    }

    getCheckout(checkoutSessionId: string): Observable<SubscriptionCheckoutSessionVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api
            .get<SubscriptionCheckoutSessionDto>(ApiEndpoints.tenants.subscriptionCheckoutById(tenantId, checkoutSessionId))
            .pipe(
                map(mapSubscriptionCheckoutSessionDtoToVm),
                catchError((err: HttpErrorResponse) =>
                    throwError(() => new Error(messageFromHttpError(err, 'Checkout oturumu yüklenemedi.')))
                )
            );
    }

    finalizeCheckout(checkoutSessionId: string, externalReference?: string | null): Observable<SubscriptionCheckoutSessionVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const body: FinalizeSubscriptionCheckoutRequestDto = {
            externalReference: externalReference?.trim() ? externalReference.trim() : null
        };
        return this.api
            .post<SubscriptionCheckoutSessionDto>(ApiEndpoints.tenants.finalizeSubscriptionCheckout(tenantId, checkoutSessionId), body)
            .pipe(
                map(mapSubscriptionCheckoutSessionDtoToVm),
                catchError((err: HttpErrorResponse) =>
                    throwError(() => new Error(messageFromHttpError(err, 'Checkout aktivasyonu tamamlanamadı.')))
                )
            );
    }

    scheduleDowngrade(targetPlanCode: string, reason?: string | null): Observable<SubscriptionSummaryVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const body: ScheduleSubscriptionDowngradeRequestDto = {
            targetPlanCode,
            reason: reason?.trim() ? reason.trim() : null
        };
        return this.api.post<SubscriptionSummaryDto>(ApiEndpoints.tenants.scheduleSubscriptionDowngrade(tenantId), body).pipe(
            map(mapSubscriptionSummaryDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Paket geçişi planlanamadı.')))
            )
        );
    }

    getPendingPlanChange(): Observable<PendingPlanChangeVm | null> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.get<PendingPlanChangeDto | null>(ApiEndpoints.tenants.pendingSubscriptionPlanChange(tenantId)).pipe(
            map((dto) => mapPendingPlanChangeDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                err.status === 404
                    ? of(null)
                    : throwError(() => new Error(messageFromHttpError(err, 'Plan değişikliği bilgisi alınamadı.')))
            )
        );
    }

    cancelPendingPlanChange(): Observable<SubscriptionSummaryVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.delete<SubscriptionSummaryDto>(ApiEndpoints.tenants.pendingSubscriptionPlanChange(tenantId)).pipe(
            map(mapSubscriptionSummaryDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Bekleyen plan değişikliği iptal edilemedi.')))
            )
        );
    }
}
