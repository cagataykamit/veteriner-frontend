import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { TrialActivationMetricsDto } from '@/app/features/trial-metrics/models/trial-metrics.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const TRIAL_METRICS_PROBLEM_MESSAGES: Record<string, string> = {
    'TrialMetrics.InvalidRange': 'Dönem geçersiz: başlangıç bitişten önce ve aralık en çok 366 gün olmalı.'
};

/** Platform yöneticisi: deneme aktivasyon özeti (TRIAL-008). */
@Injectable({ providedIn: 'root' })
export class TrialMetricsService {
    private readonly api = inject(ApiClient);

    /** `fromUtc` dahil, `toUtc` hariç; ikisi de ISO-8601 UTC. */
    summary(fromUtc: string, toUtc: string): Observable<TrialActivationMetricsDto> {
        const params = new HttpParams().set('fromUtc', fromUtc).set('toUtc', toUtc);

        return this.api.get<TrialActivationMetricsDto>(ApiEndpoints.trialMetrics.summary(), params).pipe(
            catchError((err: unknown) => {
                if (!(err instanceof HttpErrorResponse)) {
                    return throwError(() => err);
                }

                return throwError(() => new Error(messageFromHttpError(err, 'Deneme ölçümleri yüklenemedi.', TRIAL_METRICS_PROBLEM_MESSAGES)));
            })
        );
    }
}
