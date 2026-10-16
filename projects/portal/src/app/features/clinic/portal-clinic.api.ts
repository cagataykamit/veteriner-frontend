import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

export type PortalDayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** Haftalık satır; saatler `HH:mm:ss`, kapalı günde `null` (sözleşme §6.1). */
export interface PortalWorkingHours {
    readonly dayOfWeek: PortalDayOfWeek;
    readonly isClosed: boolean;
    readonly opensAt: string | null;
    readonly closesAt: string | null;
    readonly breakStartsAt: string | null;
    readonly breakEndsAt: string | null;
}

/** `GET /links/{linkId}/clinic`: bağın kliniği; boş alanlar `null`. */
export interface PortalClinic {
    readonly clinicId: string;
    readonly name: string;
    readonly city: string | null;
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: string | null;
    readonly workingHours: readonly PortalWorkingHours[];
}

@Injectable({ providedIn: 'root' })
export class PortalClinicApi {
    private readonly api = inject(PortalApiClient);

    clinic(linkId: string): Observable<PortalClinic> {
        return this.api.get<PortalClinic>(PORTAL_ENDPOINTS.clinic(linkId));
    }
}
