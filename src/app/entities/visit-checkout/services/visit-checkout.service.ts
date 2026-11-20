import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { toUserError } from '@/app/shared/utils/api-error.utils';
import type { VisitCheckoutSummaryDto } from '@/app/entities/visit-checkout/models/visit-checkout.model';

/** "Hesabı kapat" okuması. Yazma mevcut uçlarla yapılır (kalem, kredi, ödeme, geliş servisleri). */
@Injectable({ providedIn: 'root' })
export class VisitCheckoutService {
    private readonly api = inject(ApiClient);

    getSummary(visitId: string): Observable<VisitCheckoutSummaryDto> {
        return this.api.get<VisitCheckoutSummaryDto>(ApiEndpoints.visits.checkoutSummary(visitId)).pipe(toUserError('Hesap bilgisi yüklenemedi.'));
    }
}
