import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { App, type AppPlugin } from '@capacitor/app';
import { NativeBiometric, type NativeBiometricPlugin } from '@capgo/capacitor-native-biometric';
import { PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { isPortalNativePlatform } from './portal-native';

/** Kullanılan eklenti yüzeyi; spec'lerde sahte nesneyle değiştirilir. */
export interface PortalAppLockPlugins {
    readonly app: Pick<AppPlugin, 'addListener'>;
    readonly biometric: Pick<NativeBiometricPlugin, 'isAvailable' | 'verifyIdentity'>;
}

export const PORTAL_APP_LOCK_PLUGINS = new InjectionToken<PortalAppLockPlugins>('PORTAL_APP_LOCK_PLUGINS', {
    factory: () => ({ app: App, biometric: NativeBiometric })
});

/** Kilit tercihi bu cihaza özeldir; gizli değer değil, `localStorage`'da durur. */
export const PORTAL_APP_LOCK_KEY = 'vetinity.portal.appLock';

/** Uygulama bu süreden uzun arka planda kalırsa dönüşte yeniden kilitlenir. */
export const PORTAL_APP_RELOCK_AFTER_MS = 5 * 60_000;

const VERIFY_OPTIONS = {
    reason: "Vetinity'yi açmak için kimliğinizi doğrulayın",
    title: 'Vetinity kilidi',
    subtitle: 'Parmak izi ya da yüz tanıma',
    negativeButtonText: 'Vazgeç'
};

/**
 * Uygulama kilidi (MOBILE-002, ADR-031 K7): hasta sahibi açarsa uygulama açılışında ve 5 dakikadan uzun arka plandan dönüşte
 * parmak izi ya da yüz tanıma ister. Yalnız mağaza paketinde ve oturum varken kilitler; varsayılan kapalıdır. Kilit
 * ekranından çıkış yapılabilir (kimliğini doğrulayamayan kişi oturumu kapatıp kodla yeniden girer).
 */
@Injectable({ providedIn: 'root' })
export class PortalAppLock {
    private readonly plugins = inject(PORTAL_APP_LOCK_PLUGINS);
    private readonly tokens = inject(PortalTokenStore);
    private readonly enabledSignal = signal(readPreference());
    private readonly lockedSignal = signal(false);
    private pausedAt: number | null = null;
    private started = false;

    readonly enabled = this.enabledSignal.asReadonly();
    readonly locked = this.lockedSignal.asReadonly();

    /** Açılışta (oturum anahtarı okunduktan sonra) çağrılır: kilit açıksa ve oturum varsa uygulama kilitli başlar. */
    start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        this.lockIfNeeded();
        this.plugins.app
            .addListener('pause', () => (this.pausedAt = Date.now()))
            .catch(() => undefined);
        this.plugins.app
            .addListener('resume', () => {
                if (this.pausedAt !== null && Date.now() - this.pausedAt >= PORTAL_APP_RELOCK_AFTER_MS) {
                    this.lockIfNeeded();
                }

                this.pausedAt = null;
            })
            .catch(() => undefined);
    }

    /** Cihazda kayıtlı parmak izi ya da yüz tanıma var mı (ayar yalnız o zaman gösterilir). */
    async available(): Promise<boolean> {
        if (!isPortalNativePlatform()) {
            return false;
        }

        try {
            return (await this.plugins.biometric.isAvailable({ useFallback: false })).isAvailable;
        } catch {
            return false;
        }
    }

    /** Kimlik doğrulanırsa kilit açılır; vazgeçilir ya da doğrulanamazsa kilitli kalır. */
    async unlock(): Promise<boolean> {
        if (!(await this.verify())) {
            return false;
        }

        this.lockedSignal.set(false);

        return true;
    }

    /** Kilidi açmadan önce kimlik bir kez doğrulanır (yanlış kişi açmasın, parmak izinin çalıştığı görülsün). */
    async enable(): Promise<boolean> {
        if (!(await this.verify())) {
            return false;
        }

        this.setPreference(true);

        return true;
    }

    disable(): void {
        this.setPreference(false);
        this.lockedSignal.set(false);
    }

    /** Çıkışta: kilit ekranı kapanır (giriş ekranı zaten kimlik ister); tercih cihazda kalır. */
    release(): void {
        this.lockedSignal.set(false);
    }

    private lockIfNeeded(): void {
        if (this.enabledSignal() && this.tokens.refreshToken() !== null) {
            this.lockedSignal.set(true);
        }
    }

    private async verify(): Promise<boolean> {
        try {
            await this.plugins.biometric.verifyIdentity(VERIFY_OPTIONS);

            return true;
        } catch {
            return false;
        }
    }

    private setPreference(enabled: boolean): void {
        this.enabledSignal.set(enabled);

        try {
            if (enabled) {
                localStorage.setItem(PORTAL_APP_LOCK_KEY, '1');
            } else {
                localStorage.removeItem(PORTAL_APP_LOCK_KEY);
            }
        } catch {
            // Depolama kapalıysa tercih bu açılışta geçerli kalır.
        }
    }
}

function readPreference(): boolean {
    try {
        return localStorage.getItem(PORTAL_APP_LOCK_KEY) === '1';
    } catch {
        return false;
    }
}
