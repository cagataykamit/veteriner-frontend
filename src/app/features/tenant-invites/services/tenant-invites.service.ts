import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import {
    mapOperationClaimsListResponse,
    mapPagedTenantInvitesToVm,
    mapTenantInviteCreatedDto,
    tenantInvitesListQueryToHttpParams
} from '@/app/features/tenant-invites/data/tenant-invite.mapper';
import type { TenantInviteCreateRequestDto, TenantInviteListItemDtoPagedResult } from '@/app/features/tenant-invites/models/tenant-invite-api.model';
import type { TenantInvitesListQuery } from '@/app/features/tenant-invites/models/tenant-invite-list-query.model';
import type { OperationClaimOptionVm, TenantInviteCreatedVm, TenantInviteListItemVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface TenantInvitesPagedVm {
    items: TenantInviteListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TenantInvitesService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /**
     * Davet formu rol seçenekleri (whitelist).
     * `GET /api/v1/tenants/{tenantId}/assignable-operation-claims`
     */
    listOperationClaims(): Observable<OperationClaimOptionVm[]> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api
            .get<unknown>(ApiEndpoints.tenants.assignableOperationClaims(tenantId))
            .pipe(map(mapOperationClaimsListResponse));
    }

    /**
     * `GET /api/v1/tenants/{tenantId}/invites` — sayfalı liste.
     */
    getInvitesList(query: TenantInvitesListQuery): Observable<TenantInvitesPagedVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        const params = tenantInvitesListQueryToHttpParams(query);
        return this.api.get<TenantInviteListItemDtoPagedResult | unknown>(ApiEndpoints.tenants.invites(tenantId), params).pipe(
            map((raw) => mapPagedTenantInvitesToVm(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Davet listesi yüklenemedi.')))
            )
        );
    }

    createInvite(body: TenantInviteCreateRequestDto): Observable<TenantInviteCreatedVm> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        if (!tenantId) {
            return throwError(() => new Error('Kiracı bilgisi okunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api.post<unknown>(ApiEndpoints.tenants.invites(tenantId), body).pipe(
            map((raw) => {
                const vm = mapTenantInviteCreatedDto(raw);
                if (!vm) {
                    throw new Error('Davet yanıtı okunamadı (token veya inviteId eksik).');
                }
                return vm;
            })
        );
    }
}
