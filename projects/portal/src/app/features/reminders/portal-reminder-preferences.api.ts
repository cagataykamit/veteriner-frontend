import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `GET/PUT /links/{linkId}/reminder-preferences` (sözleşme §5.11): müşteri kaydındaki hatırlatma bayrağı. */
export interface PortalReminderPreferences {
    /** `true` → aşı/randevu hatırlatması gönderilmez. */
    readonly remindersOptedOut: boolean;
    /** `false` → klinikte KVKK "Ret" kaydı var; sahip hatırlatmayı açamaz. */
    readonly canEnableReminders: boolean;
}

@Injectable({ providedIn: 'root' })
export class PortalReminderPreferencesApi {
    private readonly api = inject(PortalApiClient);

    get(linkId: string): Observable<PortalReminderPreferences> {
        return this.api.get<PortalReminderPreferences>(PORTAL_ENDPOINTS.reminderPreferences(linkId));
    }

    update(linkId: string, remindersOptedOut: boolean): Observable<PortalReminderPreferences> {
        return this.api.put<PortalReminderPreferences>(PORTAL_ENDPOINTS.reminderPreferences(linkId), { remindersOptedOut });
    }
}
