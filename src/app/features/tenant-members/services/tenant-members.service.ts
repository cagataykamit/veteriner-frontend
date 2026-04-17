import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import {
    mapPagedTenantMembersToVm,
    tenantMembersQueryToHttpParams
} from '@/app/features/tenant-members/data/tenant-members.mapper';
import type { TenantMemberListItemDtoPagedResult } from '@/app/features/tenant-members/models/tenant-members-api.model';
import type { TenantMembersListQuery } from '@/app/features/tenant-members/models/tenant-members-query.model';
import type { TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface TenantMembersPagedVm {
    items: TenantMemberListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TenantMembersService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /**
     * `GET /api/v1/tenants/{tenantId}/members`
     */
    getMembers(query: TenantMembersListQuery): Observable<TenantMembersPagedVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const params = tenantMembersQueryToHttpParams(query);
        return this.api.get<TenantMemberListItemDtoPagedResult | unknown>(ApiEndpoints.tenants.members(tenantId), params).pipe(
            map((raw) => mapPagedTenantMembersToVm(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kiracı üyeleri yüklenemedi.')))
            )
        );
    }
}
