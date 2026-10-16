import { Capacitor } from '@capacitor/core';

/**
 * Mobil paket (Capacitor, ADR-031 AK-4) kuralları — saf fonksiyonlar; yerel köprüye dokunan kod `PortalNativeShell`'de.
 * Aynı web paketi tarayıcıda (PWA) ve mağaza uygulamasında çalışır; ayrım yalnız burada yapılır.
 */

/** Uygulama Capacitor kabuğunda (iOS/Android) mı çalışıyor? Tarayıcıda ve testlerde `false`. */
export function isPortalNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
}

/**
 * Service worker yalnız tarayıcı derlemesinde kayıtlanır. Mobil pakette web varlıkları zaten uygulamanın içinde
 * (çevrimdışı açılır); SW önbelleği mağaza güncellemesinden sonra eski paketi sunabilir, iOS WKWebView özel şemada
 * (`capacitor://`) SW desteklemez.
 */
export function portalServiceWorkerEnabled(devMode: boolean, nativePlatform: boolean): boolean {
    return !devMode && !nativePlatform;
}

/**
 * Derin bağlantı (App Links / Universal Links, `appUrlOpen`) → uygulama içi yol. Yalnız portalın kendi origin'inden
 * gelen bağlantı kabul edilir (`environment.portalBaseUrl`); başka her adres `null` (yok sayılır).
 * Örnek: `https://portal.vetinity.com/invite?token=abc` → `/invite?token=abc`.
 */
export function portalDeepLinkPath(url: string, portalBaseUrl: string): string | null {
    let target: URL;
    let portal: URL;

    try {
        target = new URL(url);
        portal = new URL(portalBaseUrl);
    } catch {
        return null;
    }

    // Origin şema + alan adı + bağlantı noktasıdır: `http://`, alt alan adı veya benzer görünen alan adı reddedilir.
    if (target.origin !== portal.origin) {
        return null;
    }

    return `${target.pathname}${target.search}${target.hash}`;
}

/** Geri tuşunda uygulamadan çıkılan kök sayfalar (gidilecek önceki ekran yok). */
const PORTAL_ROOT_PATHS: ReadonlySet<string> = new Set(['/', '/login']);

export type PortalBackButtonAction = 'back' | 'exit';

/**
 * Android donanım geri tuşu: kök sayfada (ana sayfa, giriş) uygulamadan çıkar; diğer sayfalarda WebView geçmişi
 * varsa bir önceki ekrana döner, yoksa (derin bağlantıyla açılmış ilk ekran) çıkar.
 */
export function portalBackButtonAction(currentUrl: string, canGoBack: boolean): PortalBackButtonAction {
    const path = currentUrl.split(/[?#]/, 1)[0] || '/';

    if (PORTAL_ROOT_PATHS.has(path) || !canGoBack) {
        return 'exit';
    }

    return 'back';
}
