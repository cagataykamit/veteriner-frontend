import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalBrandHeader, PortalFooter } from './portal-brand.component';

interface PortalNavItem {
    readonly label: string;
    readonly icon: string;
    readonly path: string;
    readonly exact: boolean;
}

/**
 * Oturumlu kabuk: klinik markalı başlık (çok klinikte "Değiştir"), içerik, alt gezinme çubuğu.
 * Alt gezinme 375 px'te beş öğeyi taşır; klinik bilgisi ana ekrandaki klinik kartından ve bakiye sayfasından açılır.
 */
const NAV_ITEMS: readonly PortalNavItem[] = [
    { label: 'Ana sayfa', icon: 'fa-house', path: '/', exact: true },
    { label: 'Hayvanlarım', icon: 'fa-paw', path: '/pets', exact: false },
    { label: 'Randevular', icon: 'fa-calendar-days', path: '/appointments', exact: false },
    { label: 'Bakiye', icon: 'fa-wallet', path: '/balance', exact: false },
    { label: 'Hesabım', icon: 'fa-user', path: '/account', exact: false }
];

@Component({
    selector: 'portal-shell',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, PortalBrandHeader, PortalFooter],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // İçerik sayfalarının ortak stilleri kabukla bir kez yüklenir (bkz. dosya başı).
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./portal-content.scss', './portal-list.scss'],
    template: `
        <a class="portal-skip-link" href="#portal-main">İçeriğe geç</a>
        <div class="portal-shell-header">
            <portal-brand-header [clinicName]="session.activeLink()?.clinicName ?? null">
                @if (session.links().length > 1) {
                    <a class="portal-header-action" routerLink="/clinics" aria-label="Klinik değiştir">
                        <i class="fa-solid fa-arrow-right-arrow-left" aria-hidden="true"></i>
                        <span>Değiştir</span>
                    </a>
                }
            </portal-brand-header>
        </div>
        <main id="portal-main" class="portal-page portal-page--with-nav" tabindex="-1">
            <router-outlet />
            <portal-footer />
        </main>
        <nav class="portal-bottom-nav" aria-label="Ana gezinme">
            @for (item of navItems; track item.path) {
                <a
                    [routerLink]="item.path"
                    routerLinkActive="is-active"
                    [routerLinkActiveOptions]="{ exact: item.exact }"
                    ariaCurrentWhenActive="page"
                >
                    <i class="fa-solid" [class]="item.icon" aria-hidden="true"></i>
                    <span>{{ item.label }}</span>
                </a>
            }
        </nav>
    `
})
export class PortalShell {
    protected readonly session = inject(PortalSessionService);
    protected readonly navItems = NAV_ITEMS;
}
