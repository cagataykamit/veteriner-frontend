import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { CashCountAmountsBody, CashCountDayDto, CashCountDto, CashCountPageDto } from '@/app/features/reports/end-of-day/models/cash-count.model';

/** Günlük kasa kontrolü uçları (TIER-008). Klinik her çağrıda açıkça gönderilir; tek klinik zorunludur. */
@Injectable({ providedIn: 'root' })
export class CashCountService {
    private readonly api = inject(ApiClient);

    loadDay(date: string, clinicId: string): Observable<CashCountDayDto> {
        return this.api.get<CashCountDayDto>(ApiEndpoints.cashCounts.day(), new HttpParams().set('date', date).set('clinicId', clinicId));
    }

    /** Geçerli sayımlar, gün azalan. */
    loadHistory(from: string, to: string, clinicId: string, pageSize = 30): Observable<CashCountDto[]> {
        const params = new HttpParams().set('from', from).set('to', to).set('clinicId', clinicId).set('page', '1').set('pageSize', String(pageSize));

        return this.api.get<CashCountPageDto>(ApiEndpoints.cashCounts.list(), params).pipe(map((res) => res.items ?? []));
    }

    create(clinicId: string, businessDate: string, body: CashCountAmountsBody): Observable<CashCountDto> {
        return this.api.post<CashCountDto>(ApiEndpoints.cashCounts.list(), { clinicId, businessDate, ...body });
    }

    /** Eski kayıt gerekçeyle iptal edilir, yerine geçen kayıt döner. */
    correct(id: string, body: CashCountAmountsBody, reason: string): Observable<CashCountDto> {
        return this.api.post<CashCountDto>(ApiEndpoints.cashCounts.correct(id), { ...body, reason });
    }

    void(id: string, reason: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.cashCounts.void(id), { reason });
    }
}
