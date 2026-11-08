import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    CreateCustomDevelopmentRequestBody,
    CustomDevelopmentRequestDto,
    CustomDevelopmentRequestListDto
} from '@/app/entities/custom-development/models/custom-development-request.model';

/** Size özel geliştirme talepleri, kiracı tarafı (TIER-010, sözleşme §3); kiracı oturumdan gelir. */
@Injectable({ providedIn: 'root' })
export class CustomDevelopmentRequestsService {
    private readonly api = inject(ApiClient);

    list(): Observable<CustomDevelopmentRequestListDto> {
        return this.api.get<CustomDevelopmentRequestListDto>(ApiEndpoints.customDevelopmentRequests.list());
    }

    create(body: CreateCustomDevelopmentRequestBody): Observable<CustomDevelopmentRequestDto> {
        return this.api.post<CustomDevelopmentRequestDto>(ApiEndpoints.customDevelopmentRequests.list(), body);
    }
}
