import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    clinicProfileToWriteDto,
    extractCreatedClinicIdFromPostResponse,
    mapClinicDetailRaw,
    mapClinicsListRaw
} from '@/app/features/clinics/data/clinic.mapper';
import { mapClinicWorkingHoursResponse } from '@/app/features/clinics/data/clinic-working-hours.mapper';
import type { UpdateClinicWorkingHoursRequestDto } from '@/app/features/clinics/models/clinic-working-hours-api.model';
import type { ClinicWorkingHourVm } from '@/app/features/clinics/models/clinic-working-hours-vm.model';
import type { ClinicCreateRequestDto, ClinicDetailDto, ClinicUpdateRequestDto } from '@/app/features/clinics/models/clinic-api.model';
import type { ClinicUpsertFormValue } from '@/app/features/clinics/models/clinic-upsert.model';
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
     * Form değerinden PUT — tüm profil alanları gövdede gönderilir.
     */
    updateClinicFromForm(clinicId: string, value: ClinicUpsertFormValue): Observable<ClinicDetailVm> {
        return this.updateClinic(clinicId, clinicProfileToWriteDto(value));
    }

    /**
     * `POST /api/v1/clinics` — yanıtta ID yoksa `createdId` null olur; çağıran listeye yönlendirir.
     */
    createClinic(value: ClinicUpsertFormValue): Observable<{ createdId: string | null }> {
        if (!this.auth.getAccessToken()?.trim()) {
            return throwError(() => new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.'));
        }
        const body: ClinicCreateRequestDto = clinicProfileToWriteDto(value);
        return this.api.post<unknown>(ApiEndpoints.clinics.list(), body).pipe(
            map((raw) => ({ createdId: extractCreatedClinicIdFromPostResponse(raw) })),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
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

    /** `GET /api/v1/clinics/{id}/working-hours` */
    getWorkingHours(clinicId: string): Observable<ClinicWorkingHourVm[]> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        if (!this.auth.getAccessToken()?.trim()) {
            return throwError(() => new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.'));
        }
        return this.api.get<unknown>(ApiEndpoints.clinics.workingHours(id)).pipe(
            map((raw) => mapClinicWorkingHoursResponse(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Çalışma saatleri yüklenemedi.')))
            )
        );
    }

    /** `PUT /api/v1/clinics/{id}/working-hours` */
    updateWorkingHours(
        clinicId: string,
        body: UpdateClinicWorkingHoursRequestDto
    ): Observable<ClinicWorkingHourVm[]> {
        const id = clinicId.trim();
        if (!id) {
            return throwError(() => new Error('Geçersiz klinik kimliği.'));
        }
        return this.api.put<unknown>(ApiEndpoints.clinics.workingHours(id), body).pipe(
            map((raw) => mapClinicWorkingHoursResponse(raw)),
            catchError((err: HttpErrorResponse) => throwError(() => err))
        );
    }
}
