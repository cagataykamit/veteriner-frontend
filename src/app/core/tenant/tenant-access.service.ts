import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import { mapTenantAccessStateDtoToVm } from '@/app/core/tenant/data/tenant-access-state.mapper';
import type { TenantAccessStateVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class TenantAccessService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** `GET /api/v1/tenants/{tenantId}/access-state` — kiracı salt okunur durumu (abonelik özetinden bağımsız). */
    getTenantAccessState(): Observable<TenantAccessStateVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId?.trim()) {
            return throwError(() => new Error('Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.get<unknown>(ApiEndpoints.tenants.accessState(tenantId)).pipe(
            map(mapTenantAccessStateDtoToVm),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Erişim durumu alınamadı.')))
            )
        );
    }
}
