import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `GET/PUT /me/notification-preferences` (sözleşme §10.1, §14.4): hesap düzeyi push tercihi. */
export interface PortalAccountNotificationPreferences {
    readonly push: {
        readonly enabled: boolean;
        /** Sunucuda push sağlayıcısı (FCM) yapılandırılmış mı; `false` iken tercih ve cihaz kaydı saklanır, gönderim yapılmaz. */
        readonly available: boolean;
        /** Hesaba kayıtlı push cihazı sayısı; tercih kapanınca sunucu cihazları siler (0). */
        readonly deviceCount: number;
    };
}

/** `GET/PUT /links/{linkId}/notification-preferences` (sözleşme §10.2): seçili klinikteki hatırlatma ve ticari ileti tercihi. */
export interface PortalLinkNotificationPreferences {
    /** `true` → aşı/randevu hatırlatması gönderilmez (§5.11 ile aynı alan). */
    readonly remindersOptedOut: boolean;
    /** `false` → klinikte KVKK "Ret" kaydı var; sahip hatırlatmayı açamaz. */
    readonly canEnableReminders: boolean;
    readonly marketingConsented: boolean;
    readonly marketingConsentedAtUtc: string | null;
    /** Bu bağın kliniği ticari ileti gönderimini açtı mı (ADR-046, klinik başına; varsayılan kapalı). Onay her durumda kaydedilir. */
    readonly marketingSendingEnabled: boolean;
}

/** Kısmi güncelleme: verilmeyen alana dokunulmaz. */
export interface PortalLinkNotificationPreferencesPatch {
    readonly remindersOptedOut?: boolean;
    readonly marketingConsented?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PortalNotificationPreferencesApi {
    private readonly api = inject(PortalApiClient);

    getAccount(): Observable<PortalAccountNotificationPreferences> {
        return this.api.get<PortalAccountNotificationPreferences>(PORTAL_ENDPOINTS.myNotificationPreferences);
    }

    updateAccount(pushEnabled: boolean): Observable<PortalAccountNotificationPreferences> {
        return this.api.put<PortalAccountNotificationPreferences>(PORTAL_ENDPOINTS.myNotificationPreferences, { pushEnabled });
    }

    getLink(linkId: string): Observable<PortalLinkNotificationPreferences> {
        return this.api.get<PortalLinkNotificationPreferences>(PORTAL_ENDPOINTS.notificationPreferences(linkId));
    }

    updateLink(linkId: string, patch: PortalLinkNotificationPreferencesPatch): Observable<PortalLinkNotificationPreferences> {
        return this.api.put<PortalLinkNotificationPreferences>(PORTAL_ENDPOINTS.notificationPreferences(linkId), patch);
    }
}
