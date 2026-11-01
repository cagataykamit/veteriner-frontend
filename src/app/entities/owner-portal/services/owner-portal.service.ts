import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ClinicPortalSettingsVm,
    DataRequestListQuery,
    DataRequestPageVm,
    DataRequestStaffStatus,
    OwnerNotificationRuleVm,
    PortalInboxSummaryVm,
    StaffDataRequestVm
} from '@/app/entities/owner-portal/models/owner-portal.model';
import { toPortalInboxError } from '@/app/entities/owner-portal/utils/owner-portal-error.utils';

interface PagedResultDto<T> {
    items?: T[] | null;
    page?: number;
    pageSize?: number;
    totalItems?: number;
}

/** Portal gelen kutusu (sözleşme §11.2); `OwnerPortal.Manage`. Klinik kapsamı aktif bağlamdan gelir. */
@Injectable({ providedIn: 'root' })
export class PortalInboxService {
    private readonly api = inject(ApiClient);

    listDataRequests(query: DataRequestListQuery): Observable<DataRequestPageVm> {
        let params = new HttpParams().set('page', String(query.page)).set('pageSize', String(query.pageSize));

        if (query.status) {
            params = params.set('status', query.status);
        }

        return this.api.get<PagedResultDto<StaffDataRequestVm>>(ApiEndpoints.portalInbox.dataRequests(), params).pipe(
            map((r) => ({ items: r?.items ?? [], totalItems: r?.totalItems ?? 0, page: r?.page ?? query.page, pageSize: r?.pageSize ?? query.pageSize })),
            toPortalInboxError('Veri talepleri yüklenemedi.')
        );
    }

    summary(): Observable<PortalInboxSummaryVm> {
        return this.api.get<PortalInboxSummaryVm>(ApiEndpoints.portalInbox.summary()).pipe(
            map((r) => ({ openDataRequestCount: r?.openDataRequestCount ?? 0, overdueDataRequestCount: r?.overdueDataRequestCount ?? 0 })),
            toPortalInboxError('Gelen kutusu özeti yüklenemedi.')
        );
    }

    /** `Completed`/`Rejected`'de not zorunlu ve sahibe e-postayla gider; `InProgress`'te not gönderilmez. */
    updateDataRequestStatus(id: string, status: DataRequestStaffStatus, responseNote: string | null): Observable<StaffDataRequestVm> {
        const note = responseNote?.trim() || null;

        return this.api
            .post<StaffDataRequestVm>(ApiEndpoints.portalInbox.dataRequestStatus(id), { status, responseNote: status === 'InProgress' ? null : note })
            .pipe(toPortalInboxError('Talep güncellenemedi.'));
    }
}

/** Klinik düzeyinde portal aç/kapat (§12) ve bildirim türü × kanal matrisi (§13); `Clinics.Read` / `Clinics.Update`. */
@Injectable({ providedIn: 'root' })
export class ClinicPortalSettingsService {
    private readonly api = inject(ApiClient);

    get(clinicId: string): Observable<ClinicPortalSettingsVm> {
        return this.api.get<ClinicPortalSettingsVm>(ApiEndpoints.clinics.portalSettings(clinicId)).pipe(toPortalInboxError('Portal ayarı yüklenemedi.'));
    }

    save(clinicId: string, isEnabled: boolean): Observable<ClinicPortalSettingsVm> {
        return this.api.put<ClinicPortalSettingsVm>(ApiEndpoints.clinics.portalSettings(clinicId), { isEnabled }).pipe(toPortalInboxError('Portal ayarı kaydedilemedi.'));
    }

    notificationRules(): Observable<OwnerNotificationRuleVm[]> {
        return this.api.get<OwnerNotificationRuleVm[]>(ApiEndpoints.portalInbox.notificationRules()).pipe(
            map((rows) => rows ?? []),
            toPortalInboxError('Bildirim kanalları yüklenemedi.')
        );
    }
}
