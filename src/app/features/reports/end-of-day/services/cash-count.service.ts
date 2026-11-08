import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { CashCountAmountsBody, CashCountDayDto, CashCountDto, CashCountPageDto } from '@/app/features/reports/end-of-day/models/cash-count.model';

/** Günlük kasa kontrolü uçları (TIER-008). Klinik her çağrıda açıkça gönderilir; kasa verilmezse sunucu Ana kasayı kullanır. */
@Injectable({ providedIn: 'root' })
export class CashCountService {
    private readonly api = inject(ApiClient);

    loadDay(date: string, clinicId: string, cashRegisterId: string | null = null): Observable<CashCountDayDto> {
        return this.api.get<CashCountDayDto>(ApiEndpoints.cashCounts.day(), withRegister(new HttpParams().set('date', date).set('clinicId', clinicId), cashRegisterId));
    }

    /** Geçerli sayımlar, gün azalan. */
    loadHistory(from: string, to: string, clinicId: string, pageSize = 30, cashRegisterId: string | null = null): Observable<CashCountDto[]> {
        const params = new HttpParams().set('from', from).set('to', to).set('clinicId', clinicId).set('page', '1').set('pageSize', String(pageSize));

        return this.api.get<CashCountPageDto>(ApiEndpoints.cashCounts.list(), withRegister(params, cashRegisterId)).pipe(map((res) => res.items ?? []));
    }

    create(clinicId: string, businessDate: string, body: CashCountAmountsBody, cashRegisterId: string | null = null): Observable<CashCountDto> {
        return this.api.post<CashCountDto>(ApiEndpoints.cashCounts.list(), { clinicId, businessDate, ...body, ...(cashRegisterId ? { cashRegisterId } : {}) });
    }

    /** Eski kayıt gerekçeyle iptal edilir, yerine geçen kayıt döner. */
    correct(id: string, body: CashCountAmountsBody, reason: string): Observable<CashCountDto> {
        return this.api.post<CashCountDto>(ApiEndpoints.cashCounts.correct(id), { ...body, reason });
    }

    void(id: string, reason: string): Observable<void> {
        return this.api.post<void>(ApiEndpoints.cashCounts.void(id), { reason });
    }
}

function withRegister(params: HttpParams, cashRegisterId: string | null): HttpParams {
    return cashRegisterId ? params.set('cashRegisterId', cashRegisterId) : params;
}
