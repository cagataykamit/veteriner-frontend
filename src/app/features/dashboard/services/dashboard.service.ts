import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly api = inject(ApiClient);

    getSummary(): Observable<DashboardSummaryDto> {
        return this.api.get<DashboardSummaryDto>(ApiEndpoints.dashboard.summary()).pipe(
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Özet yüklenemedi.'))))
        );
    }
}
