import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
 * Oturumlu kabuk: klinik markalı başlık, içerik, alt gezinme çubuğu.
 * Gezinme öğeleri yalnız var olan sayfalardır; hayvanlarım/randevular/aşılar/bakiye Dilim 2'de eklenir.
 */
const NAV_ITEMS: readonly PortalNavItem[] = [
    { label: 'Ana sayfa', icon: 'fa-house', path: '/', exact: true },
    { label: 'Hesabım', icon: 'fa-user', path: '/account', exact: false }
];

@Component({
    selector: 'portal-shell',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, PortalBrandHeader, PortalFooter],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <a class="portal-skip-link" href="#portal-main">İçeriğe geç</a>
        <div class="portal-shell-header">
            <portal-brand-header [clinicName]="session.activeLink()?.clinicName ?? null" />
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
