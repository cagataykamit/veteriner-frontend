import { InjectionToken } from '@angular/core';
import { NativeBiometric, type NativeBiometricPlugin } from '@capgo/capacitor-native-biometric';
import { isPortalNativePlatform } from './portal-native';

/** Cihazın anahtar deposunda (iOS Keychain, Android Keystore ile şifreli) metin saklama. */
export interface PortalSecureStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}

type SecureDataPlugin = Pick<NativeBiometricPlugin, 'getData' | 'setData' | 'deleteData' | 'isDataSaved'>;

/**
 * Biyometrik eklentinin veri deposu, biyometrik koşul olmadan (`AccessControl.NONE`): değer şifreli saklanır, okumak için
 * parmak izi istenmez. Uygulama kilidi ayrıdır (`PortalAppLock`).
 */
export function nativeSecureStorage(plugin: SecureDataPlugin): PortalSecureStorage {
    return {
        async get(key) {
            try {
                const { isSaved } = await plugin.isDataSaved({ key });

                return isSaved ? (await plugin.getData({ key })).value : null;
            } catch {
                return null;
            }
        },
        set: (key, value) => plugin.setData({ key, value }),
        async remove(key) {
            try {
                await plugin.deleteData({ key });
            } catch {
                // Kayıt yoksa silinecek bir şey de yoktur.
            }
        }
    };
}

/** Mağaza paketinde anahtar deposu; tarayıcıda `null` (oturum `localStorage`'da kalır). */
export const PORTAL_SECURE_STORAGE = new InjectionToken<PortalSecureStorage | null>('PORTAL_SECURE_STORAGE', {
    factory: () => (isPortalNativePlatform() ? nativeSecureStorage(NativeBiometric) : null)
});
