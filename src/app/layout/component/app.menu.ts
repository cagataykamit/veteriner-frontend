import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';
import { AppMenuitem } from './app.menuitem';
import { readMenuGroupPreferences, writeMenuGroupPreferences } from './menu-group-state';
import { AuthService } from '@/app/core/auth/auth.service';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuBadgeService, menuBadgeLabel } from '@/app/layout/service/menu-badge.service';
import { MenuFlyoutService } from '@/app/layout/service/menu-flyout.service';
import { entryForUrl, flyoutTabsFor, groupForUrl, MENU_GROUPS, menuLinkRoute, visibleGroups, type MenuBadgeKey, type MenuEntry } from '@/app/core/routing/panel-navigation';
import type { MenuFlyoutTab } from './app-menu-flyout.component';

interface MenuSection {
    /** Yoksa başlıksız: öğeler her zaman görünür. */
    readonly label?: string;
    /** Açılıp kapanmayan küçük bölüm başlığı; simge şeridinde ince ayırıcı olur. */
    readonly heading?: string;
    readonly items: MenuItem[];
    readonly open: boolean;
    readonly pinned: boolean;
}

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    providers: [MenuFlyoutService],
    template: `
        <ul class="layout-menu">
            @for (section of scrollingSections(); track $index) {
                @if (section.label && rail()) {
                    <li class="layout-menu-divider" role="separator"></li>
                    @for (item of section.items; track item.label) {
                        <li app-menuitem [item]="item" [root]="false"></li>
                    }
                } @else if (section.label) {
                    <li class="layout-menu-group">
                        <button
                            type="button"
                            class="layout-menu-group-toggle"
                            [attr.aria-expanded]="section.open"
                            [attr.aria-controls]="groupId(section.label)"
                            (click)="toggle(section.label)"
                        >
                            <span>{{ section.label }}</span>
                            <i class="pi pi-angle-down layout-menu-group-chevron" [class.is-open]="section.open" aria-hidden="true"></i>
                        </button>
                        @if (section.open) {
                            <ul [id]="groupId(section.label)">
                                @for (item of section.items; track item.label) {
                                    <li app-menuitem [item]="item" [root]="false"></li>
                                }
                            </ul>
                        }
                    </li>
                } @else {
                    <ng-container *ngTemplateOutlet="flatSection; context: { $implicit: section }" />
                }
            }
        </ul>
        @if (pinnedSections().length) {
            <ul class="layout-menu layout-menu-pinned">
                @for (section of pinnedSections(); track $index) {
                    <ng-container *ngTemplateOutlet="flatSection; context: { $implicit: section }" />
                }
            </ul>
        }

        <ng-template #flatSection let-section>
            @if (section.heading && rail()) {
                <li class="layout-menu-divider" role="separator"></li>
            } @else if (section.heading) {
                <li class="layout-menu-heading" role="presentation">{{ section.heading }}</li>
            }
            @for (item of section.items; track item.label) {
                <li app-menuitem [item]="item" [root]="false"></li>
            }
        </ng-template>
    `
})
export class AppMenu {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly badges = inject(MenuBadgeService);
    private readonly flyout = inject(MenuFlyoutService);

    /** Simge şeridinde tüm öğeler görünür; grup başlıkları ince ayırıcıya dönüşür. */
    protected readonly rail = inject(LayoutService).isMenuRail;

    private readonly preferences = signal(readMenuGroupPreferences());

    /** Öğe, sekmelerinden herhangi birinin (ve alt yollarının) sayfasındayken vurgulanır. */
    private readonly currentUrl = signal(this.router.url);

    private readonly sections = computed<MenuSection[]>(() => {
        const preferences = this.preferences();
        const url = this.currentUrl();
        const current = entryForUrl(MENU_GROUPS, url);
        const hasClaim = (claim: string) => this.auth.hasOperationClaim(claim);

        return visibleGroups(MENU_GROUPS, hasClaim).map((group) => ({
            label: group.label,
            heading: group.heading,
            pinned: group.pinned ?? false,
            open: !group.label || (preferences[group.label] ?? group.defaultOpen ?? false),
            items: group.entries.map((entry) => ({
                label: entry.label,
                icon: entry.icon,
                routerLink: [menuLinkRoute(entry, hasClaim)],
                badge: this.badgeLabel(entry.badge) || undefined,
                badgeText: entry.badgeText,
                active: entry === current,
                flyoutTabs: this.flyoutTabs(entry, url, hasClaim)
            }))
        }));
    });

    protected readonly scrollingSections = computed(() => this.sections().filter((s) => !s.pinned));
    protected readonly pinnedSections = computed(() => this.sections().filter((s) => s.pinned));

    constructor() {
        this.badges.connect(inject(DestroyRef));
        this.openGroupOf(this.router.url);
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((event) => {
                this.flyout.close();
                this.currentUrl.set(event.urlAfterRedirects);
                this.openGroupOf(event.urlAfterRedirects);
            });
    }

    /** Alt sayfa paneli sekmeleri: menü verisindeki yetkili sekmeler (sekme çubuğuyla aynı kural), etkin sekme ve sayaçları. */
    private flyoutTabs(entry: MenuEntry, url: string, hasClaim: (claim: string) => boolean): MenuFlyoutTab[] | undefined {
        const flyout = flyoutTabsFor(entry, url, hasClaim);

        return flyout?.tabs.map((tab) => ({ label: tab.label, route: tab.route, badge: this.badgeLabel(tab.badge), active: tab === flyout.active }));
    }

    private badgeLabel(key: MenuBadgeKey | undefined): string | null {
        return key ? menuBadgeLabel(this.badges.count(key)) : null;
    }

    protected groupId(label: string): string {
        return `layout-menu-group-${label.toLocaleLowerCase('tr').replace(/\s+/g, '-')}`;
    }

    protected toggle(label: string): void {
        const open = this.sections().find((s) => s.label === label)?.open ?? false;

        this.setOpen(label, !open);
    }

    /** Gezilen sayfanın grubu açık değilse açar; kullanıcının kapattığı diğer gruplara dokunmaz. */
    private openGroupOf(url: string): void {
        const label = groupForUrl(MENU_GROUPS, url)?.label;

        if (label && this.sections().find((s) => s.label === label)?.open === false) {
            this.setOpen(label, true);
        }
    }

    private setOpen(label: string, open: boolean): void {
        this.preferences.update((current) => ({ ...current, [label]: open }));
        writeMenuGroupPreferences(this.preferences());
    }
}
