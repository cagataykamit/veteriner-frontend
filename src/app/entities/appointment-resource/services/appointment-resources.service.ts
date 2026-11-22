import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, type MonoTypeOperatorFunction, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { AppointmentResourceFormValue, AppointmentResourceType, AppointmentResourceVm } from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Tanım uçlarının kodları (sözleşme §1) → kullanıcı mesajı. */
const APPOINTMENT_RESOURCE_PROBLEM_MESSAGES: Record<string, string> = {
    'AppointmentResources.DuplicateName': 'Bu klinikte bu adda aktif bir oda ya da cihaz zaten var.',
    'AppointmentResources.NotFound': 'Oda ya da cihaz bulunamadı; liste yenilendi.',
    'AppointmentResources.RouteIdMismatch': 'İstek kimliği kayıtla uyuşmuyor; sayfayı yenileyip tekrar deneyin.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu kliniğin tanımlarına erişim yetkiniz yok.'
};

/** Kullanıcıya gösterilecek mesaj; `isNotFound` liste yenilemesi ister. */
export class AppointmentResourceError extends Error {
    constructor(
        message: string,
        readonly isNotFound: boolean
    ) {
        super(message);
    }
}

function toAppointmentResourceError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);

        return throwError(() => new AppointmentResourceError(messageFromHttpError(err, fallback, APPOINTMENT_RESOURCE_PROBLEM_MESSAGES), code === 'AppointmentResources.NotFound'));
    });
}

function normalize(dto: AppointmentResourceVm): AppointmentResourceVm {
    const type: AppointmentResourceType = String(dto.type) === 'Equipment' || String(dto.type) === '2' ? 'Equipment' : 'Room';

    return { ...dto, name: (dto.name ?? '').trim(), type, capacity: Number(dto.capacity) || 1, sortOrder: Number(dto.sortOrder) || 0 };
}

function body(value: AppointmentResourceFormValue): Record<string, unknown> {
    return { name: value.name.trim(), type: value.type, capacity: Math.trunc(value.capacity), sortOrder: value.sortOrder ?? 0 };
}

/** Oda ve cihazlar (ADR-053; Veteriner `docs/APPOINTMENT_RESOURCES_API_CONTRACT.md`): Tanımlar ekranı, randevu formu ve takvim sütunları. */
@Injectable({ providedIn: 'root' })
export class AppointmentResourcesService {
    private readonly api = inject(ApiClient);

    list(clinicId: string): Observable<AppointmentResourceVm[]> {
        return this.api.get<AppointmentResourceVm[]>(ApiEndpoints.appointmentResources.list(clinicId)).pipe(
            map((list) => (list ?? []).map(normalize)),
            toAppointmentResourceError('Oda ve cihazlar yüklenemedi.')
        );
    }

    create(clinicId: string, value: AppointmentResourceFormValue): Observable<AppointmentResourceVm> {
        return this.api.post<AppointmentResourceVm>(ApiEndpoints.appointmentResources.list(clinicId), body(value)).pipe(map(normalize), toAppointmentResourceError('Kayıt eklenemedi.'));
    }

    update(clinicId: string, resourceId: string, value: AppointmentResourceFormValue): Observable<AppointmentResourceVm> {
        return this.api.put<AppointmentResourceVm>(ApiEndpoints.appointmentResources.byId(clinicId, resourceId), body(value)).pipe(map(normalize), toAppointmentResourceError('Kayıt güncellenemedi.'));
    }

    setActive(clinicId: string, resourceId: string, active: boolean): Observable<AppointmentResourceVm> {
        const path = active ? ApiEndpoints.appointmentResources.activate(clinicId, resourceId) : ApiEndpoints.appointmentResources.deactivate(clinicId, resourceId);

        return this.api.post<AppointmentResourceVm>(path, {}).pipe(map(normalize), toAppointmentResourceError(active ? 'Etkinleştirilemedi.' : 'Pasife alınamadı.'));
    }
}
