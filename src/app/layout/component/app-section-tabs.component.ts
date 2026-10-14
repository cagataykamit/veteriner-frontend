import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { MENU_GROUPS, tabsForUrl, type MenuBadgeKey } from '@/app/core/routing/panel-navigation';
import { MenuBadgeService, menuBadgeLabel } from '@/app/layout/service/menu-badge.service';

/**
 * Birleşik menü öğelerinin (Hastalar, Randevular, Para, Stok, Kayıtlar) sekme çubuğu. Sekmeler mevcut liste sayfalarıdır;
 * çubuk yalnız bu liste adreslerinde ve en az iki sekme yetkiliyken görünür, detay ve form sayfalarında çıkmaz.
 */
@Component({
    selector: 'app-section-tabs',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (view(); as v) {
            <nav class="flex flex-wrap gap-1 mb-6 border-b border-surface" aria-label="Bölüm sekmeleri">
                @for (tab of v.tabs; track tab.route) {
                    <a
                        [routerLink]="tab.route"
                        class="px-4 py-2 -mb-px border-b-2 font-medium no-underline"
                        [class.border-primary]="tab === v.active"
                        [class.text-primary]="tab === v.active"
                        [class.border-transparent]="tab !== v.active"
                        [class.text-muted-color]="tab !== v.active"
                        [attr.aria-current]="tab === v.active ? 'page' : null"
                    >
                        {{ tab.label }}
                        @if (badge(tab.badge); as count) {
                            <span class="ml-1 text-sm">({{ count }}<span class="sr-only"> bekleyen</span>)</span>
                        }
                    </a>
                }
            </nav>
        }
    `
})
export class AppSectionTabsComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly badges = inject(MenuBadgeService);

    private readonly url = signal(this.router.url);

    protected readonly view = computed(() => tabsForUrl(MENU_GROUPS, this.url(), (claim) => this.auth.hasOperationClaim(claim)));

    constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((event) => this.url.set(event.urlAfterRedirects));
    }

    protected badge(key: MenuBadgeKey | undefined): string | null {
        return key ? menuBadgeLabel(this.badges.count(key)) : null;
    }
}
