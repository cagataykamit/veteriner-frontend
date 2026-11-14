import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications, type PushNotificationsPlugin } from '@capacitor/push-notifications';
import { PortalPushDevice, type PortalPushPlatform } from './portal-push-device';

/** Kullanılan eklenti yüzeyi; spec'lerde sahte nesneyle değiştirilir. */
export type PortalPushPlugin = Pick<PushNotificationsPlugin, 'checkPermissions' | 'requestPermissions' | 'register' | 'addListener'>;

/** FCM/APNs jetonu bu sürede gelmezse kayıt başarısız sayılır (ağ yok, Firebase yapılandırması eksik). */
const REGISTRATION_TIMEOUT_MS = 20_000;

/**
 * Mağaza paketinde (Capacitor) push jetonu: Android FCM, iOS APNs üzerinden FCM (MOBILE-002, sözleşme §14).
 * İzin yalnız `obtainToken` ile istenir (kullanıcı "Anlık bildirim"i açınca); açılıştaki eşitleme `silentToken` ile izin sormaz.
 */
export class CapacitorPortalPushDevice extends PortalPushDevice {
    readonly supported = true;
    readonly platform: PortalPushPlatform;

    constructor(
        private readonly plugin: PortalPushPlugin = PushNotifications,
        nativePlatform: string = Capacitor.getPlatform()
    ) {
        super();
        this.platform = nativePlatform === 'ios' ? 'Ios' : 'Android';
    }

    async obtainToken(): Promise<string> {
        let permission = await this.plugin.checkPermissions();

        if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
            permission = await this.plugin.requestPermissions();
        }

        if (permission.receive !== 'granted') {
            throw new Error('Bildirim izni verilmedi.');
        }

        return this.register();
    }

    async silentToken(): Promise<string | null> {
        try {
            const permission = await this.plugin.checkPermissions();

            return permission.receive === 'granted' ? await this.register() : null;
        } catch {
            return null;
        }
    }

    /** `register()` jetonu olayla döner; olay dinleyicisi çağrıdan önce eklenir, sonuçtan sonra kaldırılır. */
    private async register(): Promise<string> {
        const handles: Promise<PluginListenerHandle>[] = [];
        let timer: ReturnType<typeof setTimeout> | undefined;

        const token = new Promise<string>((resolve, reject) => {
            handles.push(this.plugin.addListener('registration', ({ value }) => resolve(value)));
            handles.push(this.plugin.addListener('registrationError', ({ error }) => reject(new Error(error))));
            timer = setTimeout(() => reject(new Error('Bildirim jetonu alınamadı.')), REGISTRATION_TIMEOUT_MS);
        });

        try {
            await this.plugin.register();

            return await token;
        } finally {
            clearTimeout(timer);

            for (const handle of handles) {
                void handle.then((h) => h.remove()).catch(() => undefined);
            }
        }
    }
}
