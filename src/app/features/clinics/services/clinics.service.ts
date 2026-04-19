import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapClinicDetailRaw,
    mapClinicsListRaw,
    clinicUpsertToUpdateDto
} from '@/app/features/clinics/data/clinic.mapper';
import type { ClinicDetailDto, ClinicUpdateRequestDto } from '@/app/features/clinics/models/clinic-api.model';
import type { ClinicDetailVm, ClinicListItemVm } from '@/app/features/clinics/models/clinic-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ClinicsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** `GET /api/v1/clinics` */
    listClinics(): Observable<ClinicListItemVm[]> {
        if (!this.auth.getAccessToken()?.trim()) {
            return throwError(() => new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.'));
        }
        return this.api.get<unknown>(ApiEndpoints.clinics.list()).pipe(
            map((raw) => mapClinicsListRaw(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Klinik listesi yüklenemedi.')))
            )
        );
    }

    /** `GET /api/v1/clinics/{id}` */
    getClinicById(clinicId: string): Observable<ClinicDetailVm> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        if (!this.auth.getAccessToken()?.trim()) {
            return throwError(() => new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.'));
        }
        return this.api.get<unknown>(ApiEndpoints.clinics.byId(id)).pipe(
            map((raw) => {
                const vm = mapClinicDetailRaw(raw);
                if (!vm) {
                    throw new Error('Klinik yanıtı okunamadı.');
                }
                return vm;
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Klinik bilgileri yüklenemedi.')))
            )
        );
    }

    /** `PUT /api/v1/clinics/{id}` — 200 + ClinicDetailDto */
    updateClinic(clinicId: string, body: ClinicUpdateRequestDto): Observable<ClinicDetailVm> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        return this.api.put<ClinicDetailDto | unknown>(ApiEndpoints.clinics.byId(id), body).pipe(
            map((raw) => {
                const vm = mapClinicDetailRaw(raw);
                if (!vm) {
                    throw new Error('Klinik yanıtı okunamadı.');
                }
                return vm;
            }),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }

    /**
     * Form değerinden PUT — `clinicUpsertToUpdateDto` ile gövde.
     */
    updateClinicFromForm(clinicId: string, name: string, city: string): Observable<ClinicDetailVm> {
        return this.updateClinic(clinicId, clinicUpsertToUpdateDto(name, city));
    }

    /** `POST .../deactivate` — gövde boş. */
    deactivateClinic(clinicId: string): Observable<void> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        return this.api.post<unknown>(ApiEndpoints.clinics.deactivate(id), {}).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }

    /** `POST .../activate` — gövde boş. */
    activateClinic(clinicId: string): Observable<void> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        return this.api.post<unknown>(ApiEndpoints.clinics.activate(id), {}).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }
}
