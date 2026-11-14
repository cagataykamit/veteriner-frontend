import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { isEmbeddableRoute, PORTAL_FRAMED } from './core/embed/portal-embed';
import { isPortalNativePlatform } from './core/native/portal-native';
import { PortalAppLockScreen } from './core/native/portal-app-lock-screen.component';
import { PortalNetworkStatus } from './core/network/portal-network-status.service';

/**
 * Kök. Başka bir sitenin çerçevesinde açılınca yalnız gömülebilir rota çizilir (APPT-021, sözleşme §15); diğer sayfalar (giriş,
 * oturumlu sayfalar) içerik yerine yeni sekmede açma bağlantısı gösterir. Rota çözülene kadar çerçevede hiçbir şey çizilmez.
 */
@Component({
    selector: 'portal-root',
    standalone: true,
    imports: [RouterOutlet, PortalAppLockScreen],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (frameBlocked()) {
            @if (frameChecked()) {
                <main class="portal-page portal-stack" data-testid="frame-blocked">
                    <section class="portal-card portal-stack portal-center">
                        <h1 class="portal-title">Bu sayfa başka bir sitenin içinde açılmaz</h1>
                        <p class="portal-muted">Güvenliğiniz için portal yalnız kendi adresinde açılır.</p>
                        <a [href]="currentUrl()" target="_blank" rel="noopener">Yeni sekmede aç</a>
                    </section>
                </main>
            }
        } @else {
            @if (!network.online()) {
                <div class="portal-offline-band" role="status">
                    <i class="fa-solid fa-wifi" aria-hidden="true"></i>
                    Çevrimdışısınız. Bilgiler bağlantı gelince güncellenir.
                </div>
            }
            <router-outlet />
            @if (native) {
                <portal-app-lock-screen />
            }
        }
    `
})
export class PortalAppComponent {
    protected readonly network = inject(PortalNetworkStatus);
    /** Uygulama kilidi yalnız mağaza paketinde (MOBILE-002). */
    protected readonly native = isPortalNativePlatform();
    private readonly router = inject(Router);
    private readonly framed = inject(PORTAL_FRAMED);

    /** Çerçevede ve rota gömülebilir değilse (ya da henüz çözülmediyse) içerik çizilmez. */
    readonly frameBlocked = signal(this.framed);
    readonly frameChecked = signal(false);
    readonly currentUrl = signal('/');

    constructor() {
        if (!this.framed) {
            return;
        }

        const sub = this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
            this.currentUrl.set(e.urlAfterRedirects);
            this.frameBlocked.set(!isEmbeddableRoute(this.router.routerState.snapshot.root));
            this.frameChecked.set(true);
        });

        inject(DestroyRef).onDestroy(() => sub.unsubscribe());
    }
}
