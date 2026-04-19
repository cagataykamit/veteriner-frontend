import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import type { TenantSettingsUpdateRequestDto } from '@/app/features/organization/models/tenant-settings-api.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class OrganizationSettingsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    updateTenantDisplayName(tenantName: string): Observable<void> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const trimmed = tenantName.trim();
        const body: TenantSettingsUpdateRequestDto = { name: trimmed };
        return this.api.put<unknown>(ApiEndpoints.tenants.settings(tenantId), body).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kurum bilgileri güncellenemedi.')))
            )
        );
    }
}
