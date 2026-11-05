import { Injectable } from '@angular/core';

/** Sözleşme §14.2 `platform` değeri. */
export type PortalPushPlatform = 'Android' | 'Ios' | 'Web';

/**
 * Bu cihazın push jetonu kaynağı (MOBILE-003). Gerçek uygulama mağaza paketiyle gelir (MOBILE-002: Capacitor push eklentisi ve
 * FCM yapılandırması); o gün `{ provide: PortalPushDevice, useClass: … }` ile değiştirilir, ekranlar etkilenmez. SDK bağımlılığı
 * burada yoktur.
 */
@Injectable({ providedIn: 'root', useFactory: () => new UnsupportedPortalPushDevice() })
export abstract class PortalPushDevice {
    /** Bu ortam push jetonu üretebilir mi (izin istenmeden önce bilinen destek). */
    abstract readonly supported: boolean;

    abstract readonly platform: PortalPushPlatform;

    /** İşletim sisteminden izin ister ve jetonu döner; izin verilmezse ya da jeton alınamazsa hata fırlatır. */
    abstract obtainToken(): Promise<string>;
}

/** Varsayılan: tarayıcı ve henüz push eklentisi olmayan mobil paket. Jeton üretmez. */
export class UnsupportedPortalPushDevice extends PortalPushDevice {
    readonly supported = false;
    readonly platform: PortalPushPlatform = 'Web';

    obtainToken(): Promise<string> {
        return Promise.reject(new Error('Bu cihazda anlık bildirim desteklenmiyor.'));
    }
}
