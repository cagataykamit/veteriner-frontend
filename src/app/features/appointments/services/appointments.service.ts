import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    appointmentsQueryToHttpParams,
    mapAppointmentDetailDtoToVm,
    mapCreateAppointmentToApiBody,
    mapPagedAppointmentsToVm
} from '@/app/features/appointments/data/appointment.mapper';
import type { AppointmentDetailDto, AppointmentListItemDtoPagedResult } from '@/app/features/appointments/models/appointment-api.model';
import type { CreateAppointmentRequest } from '@/app/features/appointments/models/appointment-create.model';
import type { AppointmentsListQuery } from '@/app/features/appointments/models/appointment-query.model';
import type { AppointmentDetailVm, AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface AppointmentsPagedVm {
    items: AppointmentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
    private readonly api = inject(ApiClient);

    getAppointments(query: AppointmentsListQuery): Observable<AppointmentsPagedVm> {
        const params = appointmentsQueryToHttpParams(query);
        return this.api.get<AppointmentListItemDtoPagedResult>(ApiEndpoints.appointments.list(), params).pipe(
            map((res) => mapPagedAppointmentsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Randevu listesi yüklenemedi.')))
            )
        );
    }

    getAppointmentById(id: string): Observable<AppointmentDetailVm> {
        return this.api.get<AppointmentDetailDto>(ApiEndpoints.appointments.byId(id)).pipe(
            map((dto) => mapAppointmentDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Randevu bulunamadı veya yüklenemedi.')))
            )
        );
    }

    /**
     * POST liste endpoint’ine gönderir (muayene/ödeme ile aynı varsayım).
     * Yanıt gövdesinde `id` beklenir; yalnızca `{ id }` dönen sarmalayıcılar için mapper genişletilir.
     */
    createAppointment(payload: CreateAppointmentRequest): Observable<{ id: string }> {
        const body = mapCreateAppointmentToApiBody(payload);
        return this.api.post<unknown>(ApiEndpoints.appointments.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedAppointmentIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('APPOINTMENT_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(messageFromHttpError(err, 'Randevu oluşturulamadı.')));
                }
                if (err instanceof Error && err.message === 'APPOINTMENT_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında randevu kimliği okunamadı. Kayıt oluşmuş olabilir; randevu listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Randevu oluşturulamadı.')
                );
            })
        );
    }
}

function extractCreatedAppointmentIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body.trim() || null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'appointmentId', 'AppointmentId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'appointment', 'Appointment'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const v = n[k];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return String(v);
                }
            }
        }
    }
    return null;
}
