import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { PerformanceSummaryDto } from '@/app/features/reports/performance/models/performance-summary.model';

/** İşletme performansı özeti; klinik gönderilmez, sunucu panelin aktif klinik bağlamını kullanır. */
@Injectable({ providedIn: 'root' })
export class PerformanceSummaryService {
    private readonly api = inject(ApiClient);

    get(from: string, to: string, compare: boolean): Observable<PerformanceSummaryDto> {
        const params = new HttpParams().set('from', from).set('to', to).set('compare', String(compare));

        return this.api.get<PerformanceSummaryDto>(ApiEndpoints.reports.performanceSummary(), params);
    }
}
