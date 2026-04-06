import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    PublicOwnerSignupRequestDto,
    PublicOwnerSignupResultDto
} from '@/app/features/public/models/public-owner-signup-api.model';

@Injectable({ providedIn: 'root' })
export class PublicOwnerSignupService {
    private readonly api = inject(ApiClient);

    signup(body: PublicOwnerSignupRequestDto): Observable<PublicOwnerSignupResultDto> {
        return this.api.post<PublicOwnerSignupResultDto>(ApiEndpoints.public.ownerSignup(), body);
    }
}
