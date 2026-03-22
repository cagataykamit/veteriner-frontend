import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapClientDetailDtoToVm,
    mapPagedClientsToVm,
    clientsQueryToHttpParams
} from '@/app/features/clients/data/client.mapper';
import type { ClientDetailDto, ClientListItemDtoPagedResult } from '@/app/features/clients/models/client-api.model';
import type { ClientsListQuery } from '@/app/features/clients/models/client-query.model';
import type { ClientDetailVm, ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
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
}
