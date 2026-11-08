import { ChangeDetectionStrategy, Component, computed, inject, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { isClinicPortalClosed, isPortalServiceUnavailable } from '@portal/app/core/auth/portal-auth.models';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_CLINIC_CLOSED_MESSAGE, PORTAL_SERVICE_UNAVAILABLE_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { PortalEmptyState } from '@portal/app/shared/ui/portal-states.component';
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

/** Klinik portalı kapattığında (§12) yalnız hesap düzeyi sayfalar açılır; bağ kapsamlı sayfaların yerine durum notu çıkar. */
const ACCOUNT_LEVEL_PATHS: readonly string[] = ['/account', '/account/delete'];

/** Klinik portal hizmetini sunmuyorsa (§12.1) hesap sayfalarına ek olarak veri talebi de açık kalır. */
const OWNER_RIGHTS_PATHS: readonly string[] = [...ACCOUNT_LEVEL_PATHS, '/account/data-requests'];

@Component({
    selector: 'portal-shell',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, PortalBrandHeader, PortalFooter, PortalEmptyState],
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
            @if (showClosedNotice()) {
                <portal-empty-state title="Portal geçici olarak kapalı" [message]="closedMessage" icon="fa-door-closed" data-testid="clinic-portal-closed">
                    <div class="portal-actions">
                        <a class="portal-link-button" routerLink="/account">Hesabım</a>
                        @if (session.links().length > 1) {
                            <a class="portal-link-button" routerLink="/clinics">Başka klinik seç</a>
                        }
                    </div>
                </portal-empty-state>
            } @else if (showServiceUnavailableNotice()) {
                <portal-empty-state title="Bu hizmet şu an sunulmuyor" [message]="serviceUnavailableMessage" icon="fa-circle-info" data-testid="portal-service-unavailable">
                    <div class="portal-actions">
                        <a class="portal-link-button" routerLink="/account">Hesabım</a>
                        @if (session.links().length > 1) {
                            <a class="portal-link-button" routerLink="/clinics">Başka klinik seç</a>
                        }
                    </div>
                </portal-empty-state>
            } @else {
                <router-outlet />
            }
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
    private readonly router = inject(Router);
    protected readonly navItems = NAV_ITEMS;
    protected readonly closedMessage = PORTAL_CLINIC_CLOSED_MESSAGE;
    protected readonly serviceUnavailableMessage = PORTAL_SERVICE_UNAVAILABLE_MESSAGE;

    private readonly path = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    protected readonly showClosedNotice = computed(() => isClinicPortalClosed(this.session.activeLink()) && !ACCOUNT_LEVEL_PATHS.includes(this.path().split(/[?#]/)[0]));

    protected readonly showServiceUnavailableNotice = computed(
        () => isPortalServiceUnavailable(this.session.activeLink()) && !OWNER_RIGHTS_PATHS.includes(this.path().split(/[?#]/)[0])
    );
}
