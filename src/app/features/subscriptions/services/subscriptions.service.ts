import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapSubscriptionSummaryDtoToVm } from '@/app/features/subscriptions/data/subscription.mapper';
import type { SubscriptionSummaryDto } from '@/app/features/subscriptions/models/subscription-api.model';
import type { SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
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
}
