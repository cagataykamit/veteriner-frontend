import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { PublicDemoRequestDto } from '@/app/features/public/models/public-demo-request.model';

@Injectable({ providedIn: 'root' })
export class PublicDemoRequestService {
    private readonly api = inject(ApiClient);

    /** 204; tuzak alan doluysa da başarı döner (sözleşme §2). */
    create(body: PublicDemoRequestDto): Observable<void> {
        return this.api.post<void>(ApiEndpoints.public.demoRequests(), body);
    }
}
