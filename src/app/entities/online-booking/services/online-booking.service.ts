import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    APPOINTMENT_REQUEST_EMAIL_KIND_NAMES,
    type AppointmentReasonFormValue,
    type AppointmentReasonVm,
    type AppointmentRequestChannelSummaryVm,
    type AppointmentRequestDetailVm,
    type AppointmentRequestEmailKind,
    type AppointmentRequestEmailTemplatesVm,
    type AppointmentRequestEmailTemplateVm,
    type AppointmentRequestListItemVm,
    type AppointmentRequestListQuery,
    type ApproveAppointmentRequestInput,
    type EmailMessageVm,
    type OnlineBookingSettingsVm,
    type PagedResultDto,
    type PagedVm,
    type StaffAvailabilityDayVm,
    toPagedVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { toOnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';

function reasonBody(value: AppointmentReasonFormValue): Record<string, unknown> {
    return {
        name: value.name.trim(),
        defaultDurationMinutes: Math.trunc(value.defaultDurationMinutes),
        isOnlineBookable: value.isOnlineBookable,
        sortOrder: value.sortOrder ?? 0,
        veterinarianUserIds: value.veterinarianUserIds
    };
}

function normalizeReason(dto: AppointmentReasonVm): AppointmentReasonVm {
    return { ...dto, name: (dto.name ?? '').trim(), veterinarianUserIds: dto.veterinarianUserIds ?? [] };
}

/** Randevu nedenleri (sözleşme §2): Tanımlar ekranı ve randevu formu süre önerisi. */
@Injectable({ providedIn: 'root' })
export class AppointmentReasonsService {
    private readonly api = inject(ApiClient);

    list(clinicId: string): Observable<AppointmentReasonVm[]> {
        return this.api.get<AppointmentReasonVm[]>(ApiEndpoints.appointmentReasons.list(clinicId)).pipe(
            map((list) => (list ?? []).map(normalizeReason)),
            toOnlineBookingError('Randevu nedenleri yüklenemedi.')
        );
    }

    create(clinicId: string, value: AppointmentReasonFormValue): Observable<AppointmentReasonVm> {
        return this.api
            .post<AppointmentReasonVm>(ApiEndpoints.appointmentReasons.list(clinicId), reasonBody(value))
            .pipe(map(normalizeReason), toOnlineBookingError('Neden eklenemedi.'));
    }

    update(clinicId: string, reasonId: string, value: AppointmentReasonFormValue): Observable<AppointmentReasonVm> {
        return this.api
            .put<AppointmentReasonVm>(ApiEndpoints.appointmentReasons.byId(clinicId, reasonId), reasonBody(value))
            .pipe(map(normalizeReason), toOnlineBookingError('Neden güncellenemedi.'));
    }

    setActive(clinicId: string, reasonId: string, active: boolean): Observable<AppointmentReasonVm> {
        const path = active ? ApiEndpoints.appointmentReasons.activate(clinicId, reasonId) : ApiEndpoints.appointmentReasons.deactivate(clinicId, reasonId);

        return this.api.post<AppointmentReasonVm>(path, {}).pipe(map(normalizeReason), toOnlineBookingError(active ? 'Neden etkinleştirilemedi.' : 'Neden pasife alınamadı.'));
    }
}

/** Klinik online randevu ayarları, bağlantı kodu, personel müsaitliği ve e-posta şablonları (sözleşme §3, §7). */
@Injectable({ providedIn: 'root' })
export class OnlineBookingService {
    private readonly api = inject(ApiClient);

    getSettings(clinicId: string): Observable<OnlineBookingSettingsVm> {
        return this.api.get<OnlineBookingSettingsVm>(ApiEndpoints.onlineBooking.settings(clinicId)).pipe(toOnlineBookingError('Online randevu ayarları yüklenemedi.'));
    }

    saveSettings(clinicId: string, value: Pick<OnlineBookingSettingsVm, 'isEnabled' | 'minLeadMinutes' | 'maxAdvanceDays' | 'showNextAvailableSlots'>): Observable<OnlineBookingSettingsVm> {
        return this.api.put<OnlineBookingSettingsVm>(ApiEndpoints.onlineBooking.settings(clinicId), value).pipe(toOnlineBookingError('Ayarlar kaydedilemedi.'));
    }

    regenerateCode(clinicId: string): Observable<OnlineBookingSettingsVm> {
        return this.api.post<OnlineBookingSettingsVm>(ApiEndpoints.onlineBooking.regenerateCode(clinicId), {}).pipe(toOnlineBookingError('Bağlantı yenilenemedi.'));
    }

    /** `reasonId` boşsa ("Diğer / emin değilim" talebi) sunucu varsayılan süre ve tüm hekimlerle hesaplar (ADR-042 eki). */
    availability(clinicId: string, reasonId: string | null, fromYmd: string | null, days = 7): Observable<StaffAvailabilityDayVm[]> {
        let params = new HttpParams().set('days', String(days));

        if (reasonId) {
            params = params.set('reasonId', reasonId);
        }

        if (fromYmd) {
            params = params.set('from', fromYmd);
        }

        return this.api
            .get<StaffAvailabilityDayVm[]>(ApiEndpoints.onlineBooking.availability(clinicId), params)
            .pipe(map((d) => d ?? []), toOnlineBookingError('Müsait saatler yüklenemedi.'));
    }

    getEmailTemplates(clinicId: string): Observable<AppointmentRequestEmailTemplatesVm> {
        return this.api.get<AppointmentRequestEmailTemplatesVm>(ApiEndpoints.onlineBooking.emailTemplates(clinicId)).pipe(toOnlineBookingError('E-posta şablonları yüklenemedi.'));
    }

    saveEmailTemplate(clinicId: string, kind: AppointmentRequestEmailKind, value: EmailMessageVm): Observable<AppointmentRequestEmailTemplateVm> {
        return this.api
            .put<AppointmentRequestEmailTemplateVm>(ApiEndpoints.onlineBooking.emailTemplate(clinicId, APPOINTMENT_REQUEST_EMAIL_KIND_NAMES[kind]), value)
            .pipe(toOnlineBookingError('Şablon kaydedilemedi.'));
    }

    resetEmailTemplate(clinicId: string, kind: AppointmentRequestEmailKind): Observable<AppointmentRequestEmailTemplateVm> {
        return this.api
            .delete<AppointmentRequestEmailTemplateVm>(ApiEndpoints.onlineBooking.emailTemplate(clinicId, APPOINTMENT_REQUEST_EMAIL_KIND_NAMES[kind]))
            .pipe(toOnlineBookingError('Şablon varsayılana döndürülemedi.'));
    }

    previewEmailTemplate(clinicId: string, kind: AppointmentRequestEmailKind, value: EmailMessageVm): Observable<EmailMessageVm> {
        return this.api
            .post<EmailMessageVm>(ApiEndpoints.onlineBooking.emailTemplatePreview(clinicId, APPOINTMENT_REQUEST_EMAIL_KIND_NAMES[kind]), value)
            .pipe(toOnlineBookingError('Önizleme oluşturulamadı.'));
    }
}

/** Talep kuyruğu (sözleşme §4); `AppointmentRequests.Manage`. */
@Injectable({ providedIn: 'root' })
export class AppointmentRequestsService {
    private readonly api = inject(ApiClient);

    list(query: AppointmentRequestListQuery): Observable<PagedVm<AppointmentRequestListItemVm>> {
        let params = new HttpParams().set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));

        if (query.clinicId) {
            params = params.set('clinicId', query.clinicId);
        }

        if (query.status !== null && query.status !== undefined) {
            params = params.set('status', String(query.status));
        }

        if (query.fromUtc) {
            params = params.set('fromUtc', query.fromUtc);
        }

        if (query.toUtc) {
            params = params.set('toUtc', query.toUtc);
        }

        return this.api.get<PagedResultDto<AppointmentRequestListItemVm>>(ApiEndpoints.appointmentRequests.list(), params).pipe(
            map((r) => toPagedVm(r, query.page ?? 1, query.pageSize ?? 20)),
            toOnlineBookingError('Randevu talepleri yüklenemedi.')
        );
    }

    /** Kaynağa göre özet (TIER-016); `from`/`to` İstanbul günleri (yyyy-MM-dd), ikisi de dahil. */
    channelSummary(from: string, to: string): Observable<AppointmentRequestChannelSummaryVm> {
        const params = new HttpParams().set('from', from).set('to', to);

        return this.api
            .get<AppointmentRequestChannelSummaryVm>(ApiEndpoints.appointmentRequests.channelSummary(), params)
            .pipe(toOnlineBookingError('Kaynak özeti yüklenemedi.'));
    }

    get(id: string): Observable<AppointmentRequestDetailVm> {
        return this.api.get<AppointmentRequestDetailVm>(ApiEndpoints.appointmentRequests.byId(id)).pipe(toOnlineBookingError('Talep yüklenemedi.'));
    }

    approve(id: string, input: ApproveAppointmentRequestInput): Observable<AppointmentRequestDetailVm> {
        return this.api.post<AppointmentRequestDetailVm>(ApiEndpoints.appointmentRequests.approve(id), input).pipe(toOnlineBookingError('Talep onaylanamadı.'));
    }

    reject(id: string, reason: string, email: EmailMessageVm | null): Observable<AppointmentRequestDetailVm> {
        return this.api
            .post<AppointmentRequestDetailVm>(ApiEndpoints.appointmentRequests.reject(id), { reason: reason.trim(), email })
            .pipe(toOnlineBookingError('Talep reddedilemedi.'));
    }

    previewEmail(id: string, kind: AppointmentRequestEmailKind, scheduledAtUtc: string | null, rejectionReason: string | null): Observable<EmailMessageVm> {
        let params = new HttpParams().set('kind', APPOINTMENT_REQUEST_EMAIL_KIND_NAMES[kind]);

        if (scheduledAtUtc) {
            params = params.set('scheduledAtUtc', scheduledAtUtc);
        }

        if (rejectionReason?.trim()) {
            params = params.set('rejectionReason', rejectionReason.trim());
        }

        return this.api.get<EmailMessageVm>(ApiEndpoints.appointmentRequests.emailPreview(id), params).pipe(toOnlineBookingError('E-posta önizlemesi yüklenemedi.'));
    }
}
