import { inject, Injectable } from '@angular/core';
import { catchError, defer, from, map, Observable, of, switchMap, tap } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PortalPushDevice } from './portal-push-device';

/**
 * Bu cihazın push kaydı (sözleşme §14.2, §14.3). Kayıt yalnız hesabın push tercihi açıkken kabul edilir (aksi 409
 * `Portal.Push.Disabled`); tercih kapanınca sunucu tüm jetonları siler. Tek oturum çıkışında istemci önce jetonu kaldırır.
 */
@Injectable({ providedIn: 'root' })
export class PortalPushRegistration {
    private readonly api = inject(PortalApiClient);
    private readonly device = inject(PortalPushDevice);
    private registeredToken: string | null = null;

    /** "Anlık bildirim" açılınca: izin ister, jetonu kaydeder; izin yoksa hata döner. */
    registerWithPermission(): Observable<void> {
        return from(this.device.obtainToken()).pipe(switchMap((token) => this.register(token)));
    }

    /**
     * Oturum açıkken uygulama açılışında: izin zaten verilmişse jetonu yeniler (jeton değişmiş olabilir; uç idempotent).
     * İzin sormaz; tercih kapalıysa ya da ağ yoksa sessizce vazgeçer.
     */
    syncThisDevice(): Observable<void> {
        return defer(() => from(this.device.silentToken())).pipe(
            switchMap((token) => (token ? this.register(token) : of(undefined))),
            catchError(() => of(undefined))
        );
    }

    /** Bu cihazdan çıkışta: kayıtlı jetonu kaldırır (§14.3). Hata çıkışı engellemez. */
    revokeThisDevice(): Observable<void> {
        if (!this.device.supported) {
            return of(undefined);
        }

        return defer(() => from(this.registeredToken ? Promise.resolve(this.registeredToken) : this.device.silentToken())).pipe(
            switchMap((token) => (token ? this.api.post<void>(PORTAL_ENDPOINTS.myPushDevicesRevoke, { token }) : of(undefined))),
            tap(() => (this.registeredToken = null)),
            map(() => undefined),
            catchError(() => of(undefined))
        );
    }

    private register(token: string): Observable<void> {
        return this.api
            .put<void>(PORTAL_ENDPOINTS.myPushDevices, { platform: this.device.platform, token })
            .pipe(tap(() => (this.registeredToken = token)));
    }
}
