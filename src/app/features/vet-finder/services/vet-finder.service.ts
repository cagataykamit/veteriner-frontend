import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, type Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ClinicVetFinderListingDto, VetFinderListingInput } from '@/app/features/vet-finder/models/vet-finder.model';
import { type ProblemMessages, userErrorFromHttp } from '@/app/shared/utils/api-error.utils';

/** Sözleşme §7 kodları → kullanıcı mesajı. `VetFinder.Validation` backend `detail` ile gösterilir. */
const VET_FINDER_PROBLEM_MESSAGES: ProblemMessages = {
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu klinik için yetkiniz yok.'
};

function toUserError<T>(fallback: string) {
    return catchError<T, Observable<never>>((err: unknown) =>
        throwError(() => (err instanceof HttpErrorResponse ? userErrorFromHttp(err, fallback, VET_FINDER_PROBLEM_MESSAGES) : err))
    );
}

/** Kliniğin Veteriner bul kaydı (Veteriner `docs/VET_FINDER_API_CONTRACT.md` §2). */
@Injectable({ providedIn: 'root' })
export class VetFinderService {
    private readonly api = inject(ApiClient);

    get(clinicId: string): Observable<ClinicVetFinderListingDto> {
        return this.api.get<ClinicVetFinderListingDto>(ApiEndpoints.vetFinder.listing(clinicId)).pipe(toUserError('Veteriner bul ayarları yüklenemedi.'));
    }

    save(clinicId: string, input: VetFinderListingInput): Observable<ClinicVetFinderListingDto> {
        return this.api.put<ClinicVetFinderListingDto>(ApiEndpoints.vetFinder.listing(clinicId), input).pipe(toUserError('Veteriner bul ayarları kaydedilemedi.'));
    }
}
