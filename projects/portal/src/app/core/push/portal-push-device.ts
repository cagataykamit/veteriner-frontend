import { Injectable } from '@angular/core';

/** Sözleşme §14.2 `platform` değeri. */
export type PortalPushPlatform = 'Android' | 'Ios' | 'Web';

/**
 * Bu cihazın push jetonu kaynağı (MOBILE-003). Mağaza paketinde `CapacitorPortalPushDevice` sağlanır (`app.config.ts`);
 * tarayıcıda jeton üretilmez. Ekranlar yalnız bu soyutlamayı bilir.
 */
@Injectable({ providedIn: 'root', useFactory: () => new UnsupportedPortalPushDevice() })
export abstract class PortalPushDevice {
    /** Bu ortam push jetonu üretebilir mi (izin istenmeden önce bilinen destek). */
    abstract readonly supported: boolean;

    abstract readonly platform: PortalPushPlatform;

    /** İşletim sisteminden izin ister ve jetonu döner; izin verilmezse ya da jeton alınamazsa hata fırlatır. */
    abstract obtainToken(): Promise<string>;

    /** İzin zaten verilmişse jetonu döner, izin istemez; izin yoksa ya da jeton alınamazsa `null`. */
    abstract silentToken(): Promise<string | null>;
}

/** Varsayılan: tarayıcı. Jeton üretmez. */
export class UnsupportedPortalPushDevice extends PortalPushDevice {
    readonly supported = false;
    readonly platform: PortalPushPlatform = 'Web';

    obtainToken(): Promise<string> {
        return Promise.reject(new Error('Bu cihazda anlık bildirim desteklenmiyor.'));
    }

    silentToken(): Promise<string | null> {
        return Promise.resolve(null);
    }
}
