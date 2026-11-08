import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { CustomDevelopmentRequestDto, CustomDevelopmentRequestStatus } from '@/app/entities/custom-development/models/custom-development-request.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Platform satırı (sözleşme §4): talep, kiracı ve geçerli sonraki durumlar (akış backend'de). */
export interface AdminCustomDevelopmentRequestDto {
    readonly tenantId: string;
    readonly tenantName: string;
    readonly request: CustomDevelopmentRequestDto;
    readonly nextStatuses: readonly CustomDevelopmentRequestStatus[];
}

export interface AdminCustomDevelopmentRequestPage {
    readonly items: readonly AdminCustomDevelopmentRequestDto[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
}

/** `open` yalnız sonuçlanmamışlar, `all` hepsi, diğerleri tek durum. */
export type AdminCustomDevelopmentFilter = 'open' | 'all' | CustomDevelopmentRequestStatus;

export interface ChangeCustomDevelopmentStatusBody {
    readonly status: CustomDevelopmentRequestStatus;
    readonly decisionReason: string | null;
    readonly responseNote: string | null;
}

const PROBLEM_MESSAGES = {
    'CustomDevelopment.NotFound': 'Talep bulunamadı; liste yenilendi.',
    'CustomDevelopment.InvalidStatusTransition': 'Talep bu duruma geçemez; başka biri değiştirmiş olabilir, liste yenilendi.',
    'CustomDevelopment.ConcurrencyConflict': 'Talep aynı anda değişti; liste yenilendi, yeniden deneyin.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok. Yalnız Vetinity platform yöneticisi talepleri yönetir.'
};

export const ADMIN_CUSTOM_DEVELOPMENT_PAGE_SIZE = 50;

/** Platform yöneticisi: tüm kiracıların size özel geliştirme talepleri (TIER-010). */
@Injectable({ providedIn: 'root' })
export class CustomDevelopmentAdminService {
    private readonly api = inject(ApiClient);

    list(filter: AdminCustomDevelopmentFilter, page: number): Observable<AdminCustomDevelopmentRequestPage> {
        let params = new HttpParams().set('page', page).set('pageSize', ADMIN_CUSTOM_DEVELOPMENT_PAGE_SIZE);

        if (filter === 'open') {
            params = params.set('openOnly', true);
        } else if (filter !== 'all') {
            params = params.set('status', filter);
        }

        return this.api
            .get<AdminCustomDevelopmentRequestPage>(ApiEndpoints.customDevelopmentRequestsAdmin.list(), params)
            .pipe(toUserError<AdminCustomDevelopmentRequestPage>('Talepler yüklenemedi.', PROBLEM_MESSAGES));
    }

    changeStatus(id: string, body: ChangeCustomDevelopmentStatusBody): Observable<AdminCustomDevelopmentRequestDto> {
        return this.api
            .post<AdminCustomDevelopmentRequestDto>(ApiEndpoints.customDevelopmentRequestsAdmin.changeStatus(id), body)
            .pipe(toUserError<AdminCustomDevelopmentRequestDto>('Durum değiştirilemedi.', PROBLEM_MESSAGES));
    }
}
