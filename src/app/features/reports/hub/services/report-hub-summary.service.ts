import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ReportHubPeriod, ReportHubSummaryDto } from '@/app/features/reports/hub/models/report-hub-summary.model';

/** Rapor Merkezi ana ekran özeti; klinik gönderilmez, sunucu panelin aktif klinik bağlamını kullanır (sayılar seçili şubeye göre). */
@Injectable({ providedIn: 'root' })
export class ReportHubSummaryService {
    private readonly api = inject(ApiClient);

    get(period: ReportHubPeriod): Observable<ReportHubSummaryDto> {
        return this.api.get<ReportHubSummaryDto>(ApiEndpoints.reports.hubSummary(), new HttpParams().set('period', period));
    }
}
