import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    appointmentsQueryToHttpParams,
    mapAppointmentDetailDtoToVm,
    mapAppointmentDetailDtoToEditVm,
    mapCreateAppointmentToApiBody,
    mapUpdateAppointmentToApiBody,
    mapPagedAppointmentsToVm
} from '@/app/features/appointments/data/appointment.mapper';
import {
    appointmentCalendarQueryToHttpParams,
    mapAppointmentCalendarItemsToVm
} from '@/app/features/appointments/data/appointment-calendar.mapper';
import type { AppointmentDetailDto, AppointmentListItemDtoPagedResult } from '@/app/features/appointments/models/appointment-api.model';
import type {
    AppointmentCalendarItemDto,
    AppointmentCalendarQuery
} from '@/app/features/appointments/models/appointment-calendar-api.model';
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from '@/app/features/appointments/models/appointment-create.model';
import type { AppointmentsListQuery } from '@/app/features/appointments/models/appointment-query.model';
import type { AppointmentDetailVm, AppointmentEditVm, AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { AppointmentCalendarItemVm } from '@/app/features/appointments/models/appointment-calendar-vm.model';
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
    private readonly auth = inject(AuthService);

    getAppointments(query: AppointmentsListQuery): Observable<AppointmentsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: AppointmentsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = appointmentsQueryToHttpParams(merged);
        return this.api.get<AppointmentListItemDtoPagedResult>(ApiEndpoints.appointments.list(), params).pipe(
            map((res) => mapPagedAppointmentsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Randevu listesi yüklenemedi.')))
            )
        );
    }

    getCalendarAppointments(query: AppointmentCalendarQuery): Observable<AppointmentCalendarItemVm[]> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: AppointmentCalendarQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = appointmentCalendarQueryToHttpParams(merged);
        return this.api.get<AppointmentCalendarItemDto[]>(ApiEndpoints.appointments.calendar(), params).pipe(
            map((res) => mapAppointmentCalendarItemsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Takvim randevuları yüklenemedi.')))
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

    getAppointmentForEditById(id: string): Observable<AppointmentEditVm> {
        return this.api.get<AppointmentDetailDto>(ApiEndpoints.appointments.byId(id)).pipe(
            map((dto) => mapAppointmentDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Randevu düzenleme bilgileri yüklenemedi.')))
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
                    return throwError(() => err);
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

    updateAppointment(id: string, payload: UpdateAppointmentRequest): Observable<void> {
        const body = mapUpdateAppointmentToApiBody(payload);
        return this.api.put<unknown>(ApiEndpoints.appointments.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Randevu güncellenemedi.')
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
