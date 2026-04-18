import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import {
    mapPagedTenantMembersToVm,
    mapTenantMemberDetailRaw,
    tenantMembersQueryToHttpParams
} from '@/app/features/tenant-members/data/tenant-members.mapper';
import type { TenantMemberListItemDtoPagedResult } from '@/app/features/tenant-members/models/tenant-members-api.model';
import type { TenantMembersListQuery } from '@/app/features/tenant-members/models/tenant-members-query.model';
import type { TenantMemberDetailVm, TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
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

    /**
     * `GET /api/v1/tenants/{tenantId}/members/{memberId}`
     */
    getMemberById(memberId: string): Observable<TenantMemberDetailVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const id = memberId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz üye kimliği.'));
        }
        return this.api.get<unknown>(ApiEndpoints.tenants.memberById(tenantId, id)).pipe(
            map((raw) => {
                const vm = mapTenantMemberDetailRaw(raw);
                if (!vm) {
                    throw new Error('Üye yanıtı okunamadı.');
                }
                return vm;
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Üye detayı yüklenemedi.')))
            )
        );
    }

    /**
     * `POST .../members/{memberId}/roles/{operationClaimId}` — whitelist rol atar (gövde boş).
     */
    assignMemberClaim(memberId: string, operationClaimId: string): Observable<void> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const mid = memberId.trim();
        const cid = operationClaimId.trim();
        if (!mid || !cid) {
            return throwError(() => new Error('Geçersiz istek.'));
        }
        return this.api.post<unknown>(ApiEndpoints.tenants.memberAssignClaim(tenantId, mid, cid), {}).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }

    /**
     * `DELETE .../members/{memberId}/roles/{operationClaimId}`
     */
    removeMemberClaim(memberId: string, operationClaimId: string): Observable<void> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const mid = memberId.trim();
        const cid = operationClaimId.trim();
        if (!mid || !cid) {
            return throwError(() => new Error('Geçersiz istek.'));
        }
        return this.api.delete<unknown>(ApiEndpoints.tenants.memberRemoveClaim(tenantId, mid, cid)).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }
}
