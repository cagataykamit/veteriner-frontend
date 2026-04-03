import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    extractCreatedClientIdFromPostResponse,
    mapClientDetailDtoToVm,
    mapClientRecentSummaryDtoToVm,
    mapCreateClientToApiBody,
    mapPagedClientsToVm,
    clientsQueryToHttpParams
} from '@/app/features/clients/data/client.mapper';
import type { ClientDetailDto, ClientListItemDtoPagedResult, ClientRecentSummaryDto } from '@/app/features/clients/models/client-api.model';
import type { CreateClientRequest } from '@/app/features/clients/models/client-create.model';
import type { ClientsListQuery } from '@/app/features/clients/models/client-query.model';
import type { ClientDetailVm, ClientListItemVm, ClientRecentSummaryVm } from '@/app/features/clients/models/client-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

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
