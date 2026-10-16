import type { CapacitorConfig } from '@capacitor/cli';
import { environment as productionEnv } from './projects/portal/src/environments/environment';
import { environment as stagingEnv } from './projects/portal/src/environments/environment.staging';

/**
 * Hasta sahibi portalının iOS/Android mağaza paketi (ADR-031 K5/AK-4, Dilim 3). Yalnız portalı sarar (`dist/portal`);
 * klinik paneli mobilde tarayıcı/PWA ile kullanılır (AK-1b), bu pakete girmez. Ayrıntı: `docs/PORTAL_MOBIL_PAKET.md`.
 *
 * Ortam: `VETINITY_PORTAL_ENV=staging` ise staging, aksi halde üretim. Adresler portal ortam dosyalarından türetilir
 * (ADR-033); burada adres yazılmaz. Web paketi aynı ortamla derlenmelidir (`ng build portal --configuration staging`).
 */
const portalEnv = process.env['VETINITY_PORTAL_ENV'] === 'staging' ? stagingEnv : productionEnv;

const hostname = (url: string): string => new URL(url).hostname;

const config: CapacitorConfig = {
    // Öneri; mağazaya ilk yüklemeden sonra değiştirilemez — kullanıcı onayı bekler (docs/PORTAL_MOBIL_PAKET.md).
    appId: 'com.vetinity.portal',
    // Geçici ad (ADR-031 AK-12): mağaza öncesi netleşir.
    appName: 'Vetinity',
    webDir: 'dist/portal/browser',
    server: {
        // Uygulama `https://localhost` (Android) / `capacitor://localhost` (iOS) origin'inden açılır; backend CORS bunlara izin vermeli.
        androidScheme: 'https',
        // WebView yalnız portal ve portal API alan adlarına gezinebilir; diğer bağlantılar sistem tarayıcısında açılır.
        allowNavigation: [hostname(portalEnv.portalBaseUrl), hostname(portalEnv.portalApiBaseUrl)]
    },
    plugins: {
        // Açılış ekranı ilk yönlendirme bitince kapanır (`PortalNativeShell`); arka plan PWA manifest `background_color` ile aynı.
        SplashScreen: {
            launchAutoHide: false,
            backgroundColor: '#ffffff',
            showSpinner: false
        },
        // Capacitor 8 çekirdeği: kenardan kenara görünüm, `env(safe-area-inset-*)` doğru değer taşır. Portal açık zeminli
        // (koyu tema yok): sistem çubuğu içeriği koyu. Android 15+ durum çubuğu arka plan rengi verilemez; zemin sayfa başlığıdır.
        SystemBars: {
            insetsHandling: 'native',
            style: 'LIGHT',
            initialViewportFitValueHint: 'cover'
        }
        // v1 (ADR-031 K7, AK-6 — v0 dışı): `@capacitor/push-notifications` ayarı ve biyometrik kilit eklentisi buraya eklenir.
    }
};

export default config;
