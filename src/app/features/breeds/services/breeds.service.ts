import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    breedListQueryToHttpParams,
    extractCreatedBreedIdFromPostResponse,
    mapBreedCreateToApiBody,
    mapBreedDetailDtoToVm,
    mapBreedListResponseToVm,
    mapBreedUpdateToApiBody
} from '@/app/features/breeds/data/breed.mapper';
import type { BreedDetailDto } from '@/app/features/breeds/models/breed-api.model';
import type { BreedUpsertRequest } from '@/app/features/breeds/models/breed-upsert.model';
import type { BreedDetailVm, BreedListItemVm } from '@/app/features/breeds/models/breed-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class BreedsService {
    private readonly api = inject(ApiClient);

    getBreedList(options?: { activeOnly?: boolean; speciesId?: string }): Observable<BreedListItemVm[]> {
        const params = breedListQueryToHttpParams(options);
        return this.api.get<unknown>(ApiEndpoints.breeds.list(), params).pipe(
            map((raw) => mapBreedListResponseToVm(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Irk listesi yüklenemedi.')))
            )
        );
    }

    getBreedById(id: string): Observable<BreedDetailVm> {
        return this.api.get<BreedDetailDto>(ApiEndpoints.breeds.byId(id)).pipe(
            map((dto) => mapBreedDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Irk kaydı bulunamadı veya yüklenemedi.')))
            )
        );
    }

    createBreed(payload: BreedUpsertRequest): Observable<{ id: string }> {
        return this.api.post<unknown>(ApiEndpoints.breeds.list(), mapBreedCreateToApiBody(payload)).pipe(
            map((raw) => {
                const id = extractCreatedBreedIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('BREED_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                if (err instanceof Error && err.message === 'BREED_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında ırk kimliği okunamadı. Kayıt oluşmuş olabilir; ırk listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Irk kaydı oluşturulamadı.')
                );
            })
        );
    }

    updateBreed(id: string, payload: BreedUpsertRequest): Observable<void> {
        return this.api.put<unknown>(ApiEndpoints.breeds.byId(id), mapBreedUpdateToApiBody(id, payload)).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Irk kaydı güncellenemedi.')
                );
            })
        );
    }
}
