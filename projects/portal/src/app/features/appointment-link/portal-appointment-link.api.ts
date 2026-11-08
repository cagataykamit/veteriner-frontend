import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `POST /appointment-link/preview` (APPOINTMENT_OWNER_LINK_API_CONTRACT.md §3): asgari veri, durum değişmez. */
export interface PortalAppointmentLinkPage {
    readonly clinicName: string;
    readonly scheduledAtUtc: string;
    readonly petName: string;
    readonly cancelEnabled: boolean;
}

/** E-postadaki `islem` değeri; bilinmeyen değer onay görünümüne düşer. */
export type PortalAppointmentLinkAction = 'onayla' | 'iptal';

/** Hatırlatmadaki "onayla / iptal et" bağlantısı. Token gövdede gider; yolda ve günlükte görünmez. */
@Injectable({ providedIn: 'root' })
export class PortalAppointmentLinkApi {
    private readonly api = inject(PortalApiClient);

    preview(token: string): Observable<PortalAppointmentLinkPage> {
        return this.api.post<PortalAppointmentLinkPage>(PORTAL_ENDPOINTS.appointmentLinkPreview, { token });
    }

    confirm(token: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.appointmentLinkConfirm, { token });
    }

    cancel(token: string): Observable<void> {
        return this.api.post<void>(PORTAL_ENDPOINTS.appointmentLinkCancel, { token });
    }
}
