import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    extractCreatedClientIdFromPostResponse,
    mapClientDetailDtoToVm,
    mapClientKvkkConsentDtoToVm,
    mapClientKvkkConsentUpdateToApiBody,
    mapClientPaymentSummaryDtoToVm,
    mapClientRecentSummaryDtoToVm,
    mapCreateClientToApiBody,
    mapPagedClientsToVm,
    mapQuickRegisterResultDtoToVm,
    mapQuickRegisterToApiBody,
    clientsQueryToHttpParams
} from '@/app/features/clients/data/client.mapper';
import type {
    ClientDetailDto,
    ClientKvkkConsentDto,
    ClientListItemDtoPagedResult,
    ClientPaymentSummaryDto,
    ClientRecentSummaryDto,
    QuickRegisterResultDto
} from '@/app/features/clients/models/client-api.model';
import type { CreateClientRequest, QuickRegisterRequest, QuickRegisterResult } from '@/app/features/clients/models/client-create.model';
import type { ClientsListQuery } from '@/app/features/clients/models/client-query.model';
import type {
    ClientDetailVm,
    ClientKvkkConsentUpdateRequest,
    ClientKvkkConsentUpdateResult,
    ClientListItemVm,
    ClientPaymentSummaryVm,
    ClientRecentSummaryVm
} from '@/app/features/clients/models/client-vm.model';
import { mapClientBalanceDtoToVm } from '@/app/features/clients/data/client-balance.mapper';
import type { ClientBalanceDto } from '@/app/features/clients/models/client-balance-api.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ClientDataExportDto } from '@/app/features/clients/models/client-data-export-api.model';
import type { ClientPortalAccessDto, ClientPortalInviteDto } from '@/app/features/clients/models/client-portal-access-api.model';
import { AuthService } from '@/app/core/auth/auth.service';
import { messageFromHttpError, toUserError } from '@/app/shared/utils/api-error.utils';

export interface ClientsPagedVm {
    items: ClientListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getClients(query: ClientsListQuery): Observable<ClientsPagedVm> {
        const params = clientsQueryToHttpParams(query);

        return this.api.get<ClientListItemDtoPagedResult>(ApiEndpoints.clients.list(), params).pipe(
            map((res) => mapPagedClientsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Müşteri listesi yüklenemedi.')))
            )
        );
    }

    getClientById(id: string): Observable<ClientDetailVm> {
        return this.api.get<ClientDetailDto>(ApiEndpoints.clients.byId(id)).pipe(
            map((dto) => mapClientDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Müşteri bulunamadı veya yüklenemedi.')))
            )
        );
    }

    /** Panel müşteri detay — son randevular + son muayeneler (tek istek). */
    getClientRecentSummary(clientId: string): Observable<ClientRecentSummaryVm> {
        return this.api.get<ClientRecentSummaryDto>(ApiEndpoints.clients.recentSummary(clientId)).pipe(
            map((dto) => mapClientRecentSummaryDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Müşteri özeti yüklenemedi.')))
            )
        );
    }

    /** Finance+ — ödeme sayıları, para birimi toplamları ve son ödemeler (tek istek). */
    getClientPaymentSummary(clientId: string): Observable<ClientPaymentSummaryVm> {
        return this.api.get<ClientPaymentSummaryDto>(ApiEndpoints.clients.paymentSummary(clientId)).pipe(
            map((dto) => mapClientPaymentSummaryDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ödeme özeti yüklenemedi.')))
            )
        );
    }

    /** `Charges.Read` — müşterinin açık ücretleri ve toplam borcu (aktif klinik kapsamı). */
    getClientBalance(clientId: string): Observable<ClientBalanceVm> {
        return this.api.get<ClientBalanceDto>(ApiEndpoints.clients.balance(clientId)).pipe(
            map(mapClientBalanceDtoToVm),
            toUserError('Müşteri bakiyesi yüklenemedi.')
        );
    }

    /** `Clients.Read` — KVKK veri kopyası (salt okunur; sunucu her çağrıyı audit'e yazar). Yanıt "JSON indir" için olduğu gibi döner. */
    getClientDataExport(clientId: string): Observable<ClientDataExportDto> {
        return this.api.get<ClientDataExportDto>(ApiEndpoints.clients.dataExport(clientId)).pipe(toUserError('Veri kopyası hazırlanamadı.'));
    }

    /** `OwnerPortal.Manage` — müşterinin portal bağ durumu ve son davetleri (`PORTAL_API_CONTRACT.md` §4.1). */
    getPortalAccess(clientId: string): Observable<ClientPortalAccessDto> {
        return this.api.get<ClientPortalAccessDto>(ApiEndpoints.clients.portalAccess(clientId)).pipe(toUserError('Portal erişim durumu yüklenemedi.'));
    }

    /**
     * Davet e-postası müşteri kaydındaki adrese gider; bekleyen eski davet sunucuda iptal edilir (§4.2).
     * Klinik context-first: aktif klinik varsa gövdeye aynı `clinicId` yazılır (çok klinikli kullanıcı), yoksa gövde boş.
     */
    sendPortalInvite(clientId: string): Observable<ClientPortalInviteDto> {
        const clinicId = this.auth.getClinicId()?.trim();

        return this.api
            .post<ClientPortalInviteDto>(ApiEndpoints.clients.portalInvites(clientId), clinicId ? { clinicId } : {})
            .pipe(toUserError('Portal daveti gönderilemedi.'));
    }

    /** Bekleyen daveti iptal eder; 204 (§4.3). Abonelik salt okunurken de çalışır. */
    revokePortalInvite(clientId: string, inviteId: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.clients.portalInviteRevoke(clientId, inviteId), {}).pipe(
            map(() => void 0),
            toUserError('Davet iptal edilemedi.')
        );
    }

    /** Bu kliniğin portal bağını kapatır (silinmez); 204 (§4.4). Abonelik salt okunurken de çalışır. */
    closePortalLink(clientId: string, linkId: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.clients.portalLinkClose(clientId, linkId), {}).pipe(
            map(() => void 0),
            toUserError('Portal erişimi kapatılamadı.')
        );
    }

    /**
     * POST liste endpoint’i.
     * Yanıt: düz `ClientDetailDto`, sarmalayıcı veya PascalCase `id` — `extractCreatedClientIdFromPostResponse`.
     * HTTP hataları (400 alan doğrulama vb.) bileşende `parseClientCreateHttpError` için olduğu gibi iletilir (pets create ile aynı desen).
     */
    createClient(payload: CreateClientRequest): Observable<{ id: string }> {
        const body = mapCreateClientToApiBody(payload);

        return this.api.post<unknown>(ApiEndpoints.clients.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedClientIdFromPostResponse(raw);

                if (!id) {
                    throw new Error('CLIENT_CREATE_NO_ID_IN_RESPONSE');
                }

                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }

                if (err instanceof Error && err.message === 'CLIENT_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında müşteri kimliği okunamadı. Kayıt oluşmuş olabilir; müşteri listesini kontrol edin.'
                            )
                    );
                }

                return throwError(() =>
                    err instanceof Error ? err : new Error('Müşteri oluşturulamadı.')
                );
            })
        );
    }

    /**
     * Müşteri + hayvan tek işlemde (yarım kayıt oluşmaz). Visit açmaz: çağıran `petId` ile `POST /visits` yapar.
     * HTTP hataları (400 alan, 403, 404 tür, 409 `Clients.DuplicateClient`) bileşende ayrıştırılabilsin diye ham iletilir.
     */
    quickRegister(payload: QuickRegisterRequest): Observable<QuickRegisterResult> {
        return this.api.post<QuickRegisterResultDto>(ApiEndpoints.clients.quickRegister(), mapQuickRegisterToApiBody(payload)).pipe(
            map((dto) => {
                const result = mapQuickRegisterResultDtoToVm(dto);

                if (!result) {
                    throw new Error('Sunucu yanıtında müşteri/hasta kimliği okunamadı. Kayıt oluşmuş olabilir; müşteri listesini kontrol edin.');
                }

                return result;
            })
        );
    }

    /**
     * `PUT /clients/{id}/kvkk-consent` (`Clients.Update`): imzalı formun sonucu ve tarihi; `None` geri alır.
     * HTTP hatası ham iletilir: 409 `Clients.ConcurrencyConflict` çağıranda detay yenilemesi gerektirir.
     */
    updateKvkkConsent(id: string, req: ClientKvkkConsentUpdateRequest): Observable<ClientKvkkConsentUpdateResult> {
        return this.api
            .put<ClientKvkkConsentDto>(ApiEndpoints.clients.kvkkConsent(id), mapClientKvkkConsentUpdateToApiBody(req))
            .pipe(map(mapClientKvkkConsentDtoToVm));
    }

    updateClient(id: string, payload: CreateClientRequest): Observable<void> {
        const body = mapCreateClientToApiBody(payload);

        return this.api.put<unknown>(ApiEndpoints.clients.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Müşteri güncellenemedi.')))
            )
        );
    }
}
