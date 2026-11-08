import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** Müsaitlik isteği gün sayısı (sözleşme: 1–14). */
export const PORTAL_BOOKING_DAYS = 14;

/**
 * Online akışta seçilebilen neden (`ONLINE_APPOINTMENT_API_CONTRACT.md` §5). Listenin sonunda her zaman sistemin
 * "Diğer / emin değilim" seçeneği vardır: `id` boştur ve not zorunludur (ADR-042 eki).
 */
export interface PortalBookingReason {
    readonly id: string | null;
    readonly name: string;
    readonly durationMinutes: number;
    readonly requiresNote: boolean;
}

/** Talep sayfası: klinik iletişim bilgisi, talep sınırları ve nedenler (§5, §6 aynı yanıt). */
export interface PortalBookingPage {
    readonly clinicName: string;
    readonly clinicCity: string;
    readonly clinicPhone: string | null;
    readonly clinicAddress: string | null;
    readonly minLeadMinutes: number;
    readonly maxAdvanceDays: number;
    readonly maxPendingRequests: number;
    readonly reasons: readonly PortalBookingReason[];
}

export interface PortalBookingSlot {
    readonly startUtc: string;
    readonly endUtc: string;
}

/** Müsait gün: `date` İstanbul takvim günü (`yyyy-MM-dd`). */
export interface PortalBookingDay {
    readonly date: string;
    readonly slots: readonly PortalBookingSlot[];
}

/** Talep durumu metindir (sözleşme §13.4); eski sayısal yanıt (0–4) da okunur. */
export type PortalAppointmentRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Expired' | 0 | 1 | 2 | 3 | 4;

export interface PortalAppointmentRequestCreated {
    readonly id: string;
    readonly status: PortalAppointmentRequestStatus;
    readonly requestedStartUtc: string;
}

/** Portal "taleplerim" satırı (§6). */
export interface PortalAppointmentRequest {
    readonly id: string;
    readonly status: PortalAppointmentRequestStatus;
    readonly reasonName: string;
    readonly requestedStartUtc: string;
    readonly durationMinutes: number;
    readonly petId: string | null;
    readonly petName: string | null;
    readonly approvedStartUtc: string | null;
    readonly wasRescheduled: boolean;
    readonly rejectionReason: string | null;
    readonly createdAtUtc: string;
    readonly canCancel: boolean;
}

/** Kimliksiz bağlantıdan talep gövdesi (§5). */
export interface PortalPublicBookingRequest {
    readonly email: string;
    readonly verificationCode: string;
    readonly contactName: string;
    readonly phone: string;
    readonly petName: string;
    readonly petSpecies: string | null;
    readonly petBreed: string | null;
    readonly reasonId: string | null;
    readonly requestedStartUtc: string;
    readonly note: string | null;
    /** Bağlantının `?kaynak=` değeri olduğu gibi (TIER-016, §14); izinli değilse sunucu klinik bağlantısı sayar. */
    readonly channel: string | null;
}

/** Oturumlu talep gövdesi (§6): kayıtlı hayvan ya da serbest metin hayvan. */
export interface PortalLinkBookingRequest {
    readonly petId: string | null;
    readonly petName: string | null;
    readonly petSpecies: string | null;
    readonly petBreed: string | null;
    readonly reasonId: string | null;
    readonly requestedStartUtc: string;
    readonly phone: string | null;
    readonly note: string | null;
}

/** "Diğer" seçiliyse (`reasonId` boş) parametre gönderilmez; sunucu varsayılan süre ve tüm hekimlerle hesaplar. */
function availabilityParams(reasonId: string | null): HttpParams {
    const params = new HttpParams().set('days', PORTAL_BOOKING_DAYS);

    return reasonId ? params.set('reasonId', reasonId) : params;
}

/** Online randevu talebi uçları: kimliksiz bağlantı (§5) ve oturumlu bağ (§6). */
@Injectable({ providedIn: 'root' })
export class PortalBookingApi {
    private readonly api = inject(PortalApiClient);

    publicPage(code: string): Observable<PortalBookingPage> {
        return this.api.get<PortalBookingPage>(PORTAL_ENDPOINTS.publicBooking(code));
    }

    publicAvailability(code: string, reasonId: string | null): Observable<PortalBookingDay[]> {
        return this.api.get<PortalBookingDay[]>(PORTAL_ENDPOINTS.publicBookingAvailability(code), availabilityParams(reasonId));
    }

    requestPublicCode(code: string, email: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.publicBookingCode(code), { email });
    }

    createPublicRequest(code: string, body: PortalPublicBookingRequest): Observable<PortalAppointmentRequestCreated> {
        return this.api.post<PortalAppointmentRequestCreated>(PORTAL_ENDPOINTS.publicBookingRequests(code), body);
    }

    linkPage(linkId: string): Observable<PortalBookingPage> {
        return this.api.get<PortalBookingPage>(PORTAL_ENDPOINTS.linkBooking(linkId));
    }

    linkAvailability(linkId: string, reasonId: string | null): Observable<PortalBookingDay[]> {
        return this.api.get<PortalBookingDay[]>(PORTAL_ENDPOINTS.linkBookingAvailability(linkId), availabilityParams(reasonId));
    }

    myRequests(linkId: string): Observable<PortalAppointmentRequest[]> {
        return this.api.get<PortalAppointmentRequest[]>(PORTAL_ENDPOINTS.appointmentRequests(linkId));
    }

    createLinkRequest(linkId: string, body: PortalLinkBookingRequest): Observable<PortalAppointmentRequestCreated> {
        return this.api.post<PortalAppointmentRequestCreated>(PORTAL_ENDPOINTS.appointmentRequests(linkId), body);
    }

    cancelRequest(linkId: string, requestId: string): Observable<PortalAppointmentRequest> {
        return this.api.post<PortalAppointmentRequest>(PORTAL_ENDPOINTS.cancelAppointmentRequest(linkId, requestId));
    }
}
