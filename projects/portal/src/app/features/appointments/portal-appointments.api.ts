import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PortalPage, portalPageParams } from '@portal/app/core/api/portal-page';

/** `upcoming`: istek anı ve sonrası, artan; `past`: son 12 ay, azalan (sözleşme §6.4). */
export type PortalAppointmentScope = 'upcoming' | 'past';

export type PortalAppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow';

export type PortalAppointmentType = 'Examination' | 'Vaccination' | 'Checkup' | 'Surgery' | 'Grooming' | 'Consultation' | 'Other';

export interface PortalAppointment {
    readonly appointmentId: string;
    readonly petId: string;
    readonly petName: string;
    readonly clinicId: string;
    readonly clinicName: string;
    readonly scheduledAtUtc: string;
    readonly durationMinutes: number;
    readonly appointmentType: PortalAppointmentType;
    readonly status: PortalAppointmentStatus;
}

@Injectable({ providedIn: 'root' })
export class PortalAppointmentsApi {
    private readonly api = inject(PortalApiClient);

    appointments(linkId: string, scope: PortalAppointmentScope, page: number, pageSize?: number): Observable<PortalPage<PortalAppointment>> {
        return this.api.get<PortalPage<PortalAppointment>>(PORTAL_ENDPOINTS.appointments(linkId), portalPageParams(page, pageSize).set('scope', scope));
    }
}
