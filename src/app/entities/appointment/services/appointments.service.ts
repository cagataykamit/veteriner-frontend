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
} from '@/app/entities/appointment/data/appointment.mapper';
import {
    appointmentCalendarQueryToHttpParams,
    mapAppointmentCalendarItemsToVm
} from '@/app/entities/appointment/data/appointment-calendar.mapper';
import type { AppointmentCancelResultDto, AppointmentDetailDto, AppointmentListItemDtoPagedResult } from '@/app/entities/appointment/models/appointment-api.model';
import type {
    AppointmentCalendarItemDto,
    AppointmentCalendarQuery
} from '@/app/entities/appointment/models/appointment-calendar-api.model';
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from '@/app/entities/appointment/models/appointment-create.model';
import type { AppointmentsListQuery } from '@/app/entities/appointment/models/appointment-query.model';
import type { AppointmentDetailVm, AppointmentEditVm, AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { type CalendarDaySummaryDto, type CalendarDaySummaryVm, mapCalendarDaySummaries } from '@/app/entities/appointment/models/calendar-day-summary.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** İptal sonucu: `undoWindowSeconds` > 0 ise "Geri al" bu süre gösterilir. */
export interface AppointmentCancelResult {
    undoWindowSeconds: number;
}

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

    /** Ay görünümü: takvimle aynı filtreler, gün başına sayı (BE sözleşmesi §7). */
    getCalendarSummary(query: AppointmentCalendarQuery): Observable<Map<string, CalendarDaySummaryVm>> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const params = appointmentCalendarQueryToHttpParams({ ...query, clinicId: query.clinicId?.trim() || clinicFromAuth || undefined });

        return this.api.get<CalendarDaySummaryDto[]>(ApiEndpoints.appointments.calendarSummary(), params).pipe(
            map((res) => mapCalendarDaySummaries(res)),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Takvim özeti yüklenemedi.'))))
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

    /**
     * `Appointments.Cancel`. PUT ile durum geçişi kapatıldı; iptal kendi ucuyla yapılır. Gerekçe opsiyonel (en çok 500).
     * Yanıttaki süre kadar "Geri al" gösterilir; süre sunucudadır, yanıtta yoksa 0 (geri alma sunulmaz).
     */
    cancelAppointment(id: string, reason?: string): Observable<AppointmentCancelResult> {
        const trimmed = reason?.trim();

        return this.postCommand<AppointmentCancelResultDto | null>(ApiEndpoints.appointments.cancel(id), trimmed ? { reason: trimmed } : {}, 'Randevu iptal edilemedi.').pipe(
            map((dto) => ({ undoWindowSeconds: Math.max(0, Math.floor(dto?.undoWindowSeconds ?? 0)) }))
        );
    }

    /** `Appointments.Cancel`; iptalden kısa süre sonra `Cancelled → Scheduled` ("Geri al"). */
    revertCancellation(id: string): Observable<void> {
        return this.postTransition(ApiEndpoints.appointments.cancelRevert(id), {}, 'İptal geri alınamadı.');
    }

    /** `Appointments.Complete`. */
    completeAppointment(id: string): Observable<void> {
        return this.postTransition(ApiEndpoints.appointments.complete(id), {}, 'Randevu tamamlanamadı.');
    }

    /** `Appointments.NoShow`; yalnızca saati geçmiş `Scheduled` randevu. Idempotent; gerekçe opsiyonel (en çok 500). */
    markNoShow(id: string, reason?: string): Observable<void> {
        const trimmed = reason?.trim();

        return this.postTransition(ApiEndpoints.appointments.noShow(id), trimmed ? { reason: trimmed } : {}, 'Randevu gelmedi olarak işaretlenemedi.');
    }

    /** `Appointments.NoShow`; `NoShow → Scheduled`, gerekçe zorunlu (5–500). */
    revertNoShow(id: string, reason: string): Observable<void> {
        return this.postTransition(ApiEndpoints.appointments.noShowRevert(id), { reason: reason.trim() }, 'Gelmedi işareti geri alınamadı.');
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

    private postTransition(path: string, body: object, fallback: string): Observable<void> {
        return this.postCommand<unknown>(path, body, fallback).pipe(map(() => void 0));
    }

    private postCommand<T>(path: string, body: object, fallback: string): Observable<T> {
        return this.api.post<T>(path, body).pipe(
            catchError((err: unknown) =>
                throwError(() => (err instanceof HttpErrorResponse ? new Error(messageFromHttpError(err, fallback)) : err))
            )
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
