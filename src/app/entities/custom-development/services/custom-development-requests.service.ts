import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    CreateCustomDevelopmentRequestBody,
    CreateMigrationSupportRequestBody,
    CustomDevelopmentRequestDto,
    CustomDevelopmentRequestListDto,
    MigrationSupportOverviewDto
} from '@/app/entities/custom-development/models/custom-development-request.model';

/** Size özel geliştirme ve geçiş desteği talepleri, kiracı tarafı (TIER-010 §3, TIER-021 §11); kiracı oturumdan gelir. */
@Injectable({ providedIn: 'root' })
export class CustomDevelopmentRequestsService {
    private readonly api = inject(ApiClient);

    list(): Observable<CustomDevelopmentRequestListDto> {
        return this.api.get<CustomDevelopmentRequestListDto>(ApiEndpoints.customDevelopmentRequests.list());
    }

    create(body: CreateCustomDevelopmentRequestBody): Observable<CustomDevelopmentRequestDto> {
        return this.api.post<CustomDevelopmentRequestDto>(ApiEndpoints.customDevelopmentRequests.list(), body);
    }

    /** Geçiş desteği talepleri, ücret bilgisi ve görüşme süresi (TIER-021, §11.4). */
    getMigrationSupport(): Observable<MigrationSupportOverviewDto> {
        return this.api.get<MigrationSupportOverviewDto>(ApiEndpoints.customDevelopmentRequests.migrationSupport());
    }

    createMigrationSupport(body: CreateMigrationSupportRequestBody): Observable<CustomDevelopmentRequestDto> {
        return this.api.post<CustomDevelopmentRequestDto>(ApiEndpoints.customDevelopmentRequests.migrationSupport(), body);
    }
}
