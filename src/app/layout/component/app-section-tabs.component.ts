import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { MENU_GROUPS, tabsForUrl, type MenuBadgeKey } from '@/app/core/routing/panel-navigation';
import { MenuBadgeService, menuBadgeLabel } from '@/app/layout/service/menu-badge.service';

/**
 * Birleşik menü öğelerinin (Hastalar, Randevular, Para, Stok, Kayıtlar) sekme çubuğu. Sekmeler mevcut liste sayfalarıdır;
 * çubuk yalnız bu liste adreslerinde ve en az iki sekme yetkiliyken görünür, detay ve form sayfalarında çıkmaz.
 * Dar ekranda sekmeler satır atlamaz, yatay kayar (G-03): etkin sekme görünür alana getirilir, sağda daha fazla sekme
 * varken kenarda soluk geçiş belirir.
 */
@Component({
    selector: 'app-section-tabs',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (view(); as v) {
            <nav #tabsNav class="section-tabs flex flex-nowrap gap-1 mb-6 overflow-x-auto" aria-label="Bölüm sekmeleri">
                @for (tab of v.tabs; track tab.route) {
                    <a
                        [routerLink]="tab.route"
                        class="shrink-0 whitespace-nowrap px-4 py-2 border-b-2 font-medium no-underline touch:flex touch:items-center touch:min-h-(--touch-target)"
                        [class.border-primary]="tab === v.active"
                        [class.text-primary]="tab === v.active"
                        [class.border-transparent]="tab !== v.active"
                        [class.text-muted-color]="tab !== v.active"
                        [attr.aria-current]="tab === v.active ? 'page' : null"
                        [attr.title]="ro.planLockHint(tab.planFeature)"
                    >
                        {{ tab.label }}
                        @if (ro.planLockHint(tab.planFeature); as hint) {
                            <i class="pi pi-lock text-sm text-muted-color" aria-hidden="true"></i><span class="sr-only"> ({{ hint }})</span>
                        }
                        @if (badge(tab.badge); as count) {
                            <span class="ml-1 text-sm">({{ count }}<span class="sr-only"> bekleyen</span>)</span>
                        }
                    </a>
                }
                <span class="section-tabs-fade" aria-hidden="true"></span>
            </nav>
        }
    `,
    styles: `
        .section-tabs {
            /* Alt çizgi kutunun gölgesi: kayan kapta negatif kenar boşluğu dikey kaydırma çubuğu açardı. Etkin sekmenin çizgisi üstüne biner. */
            box-shadow: inset 0 -1px 0 var(--surface-border);
            scrollbar-width: none;
            container-type: scroll-state;
        }

        .section-tabs-fade {
            position: sticky;
            right: 0;
            flex: none;
            width: 2rem;
            margin-left: -2rem;
            pointer-events: none;
            background: linear-gradient(to right, transparent, var(--surface-ground));
            opacity: 0;
        }

        @container scroll-state(scrollable: inline-end) {
            .section-tabs-fade {
                opacity: 1;
            }
        }
    `
})
export class AppSectionTabsComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly badges = inject(MenuBadgeService);
    protected readonly ro = inject(TenantReadOnlyContextService);

    private readonly url = signal(this.router.url);
    private readonly tabsNav = viewChild<ElementRef<HTMLElement>>('tabsNav');

    protected readonly view = computed(() => tabsForUrl(MENU_GROUPS, this.url(), (claim) => this.auth.hasOperationClaim(claim)));

    constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((event) => this.url.set(event.urlAfterRedirects));

        // Etkin sekme kayan çubukta görünmüyorsa yalnız yatayda kaydırılır (sayfa dikeyde oynamaz).
        afterRenderEffect(() => {
            this.view();
            const nav = this.tabsNav()?.nativeElement;
            const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');

            if (!nav || !active) {
                return;
            }

            const left = active.offsetLeft - nav.offsetLeft;

            if (left < nav.scrollLeft || left + active.offsetWidth > nav.scrollLeft + nav.clientWidth) {
                nav.scrollLeft = left - (nav.clientWidth - active.offsetWidth) / 2;
            }
        });
    }

    protected badge(key: MenuBadgeKey | undefined): string | null {
        return key ? menuBadgeLabel(this.badges.count(key)) : null;
    }
}
