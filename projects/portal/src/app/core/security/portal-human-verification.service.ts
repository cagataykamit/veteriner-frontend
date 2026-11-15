import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

/** `GET /api/portal/v1/human-verification` (`TRIAL_SIGNUP_ABUSE_API_CONTRACT.md` §4). */
export interface PortalHumanVerificationSettings {
    turnstileSiteKey: string | null;
    /** Giriş kodu, parola sıfırlama ve online randevu kodu korunuyor mu (`Turnstile:EnforcePortal`). */
    portalProtected: boolean;
}

/** Widget jetonu henüz yokken (doğrulama sürüyor) kod istenirse. */
export const HUMAN_CHECK_PENDING_MESSAGE = 'Güvenlik doğrulamasının tamamlanmasını bekleyin.';

/** Sunucudaki `HumanVerificationActions` ile aynı. */
export const PORTAL_TURNSTILE_ACTIONS = {
    signInCode: 'portal-signin-code',
    passwordReset: 'portal-password-reset',
    bookingCode: 'booking-email-code'
} as const;

/**
 * İnsan doğrulaması ayarları (Cloudflare Turnstile): site anahtarı koddan değil sunucudan gelir, oturum boyunca bir kez okunur.
 * Okunamazsa widget çizilmez; sunucu gerekiyorsa isteği sade hatayla reddeder.
 */
@Injectable({ providedIn: 'root' })
export class PortalHumanVerificationService {
    private readonly api = inject(PortalApiClient);
    private readonly settings$ = this.api.get<PortalHumanVerificationSettings>(PORTAL_ENDPOINTS.humanVerification).pipe(
        catchError(() => of<PortalHumanVerificationSettings>({ turnstileSiteKey: null, portalProtected: false })),
        shareReplay({ bufferSize: 1, refCount: false })
    );

    /** Giriş, parola sıfırlama ve online randevu kodu için site anahtarı; korunmuyorsa ya da anahtar girilmemişse `null` (widget yok). */
    siteKey(): Observable<string | null> {
        return this.settings$.pipe(map((s) => (s.portalProtected ? s.turnstileSiteKey : null)));
    }
}
