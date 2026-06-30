import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    OrganizationBillingProfile,
    OrganizationBillingProfileUpdateRequest
} from '@/app/features/organization/models/organization-billing-profile.model';

@Injectable({ providedIn: 'root' })
export class OrganizationBillingProfileService {
    private readonly api = inject(ApiClient);

    getBillingProfile(): Observable<OrganizationBillingProfile> {
        return this.api.get<OrganizationBillingProfile>(ApiEndpoints.organization.billingProfile());
    }

    updateBillingProfile(
        payload: OrganizationBillingProfileUpdateRequest
    ): Observable<OrganizationBillingProfile> {
        return this.api.put<OrganizationBillingProfile>(ApiEndpoints.organization.billingProfile(), payload);
    }
}
