import { Component, computed, DestroyRef, inject, input, signal, viewChild, OnInit, AfterViewInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuFlyoutService } from '@/app/layout/service/menu-flyout.service';
import { AppMenuFlyout } from './app-menu-flyout.component';
import { filter } from 'rxjs/operators';

@Component({
    selector: '[appMenuitem]',
    imports: [CommonModule, RouterModule, RippleModule, TooltipModule, AppMenuFlyout],
    template: `
        @if (root() && isVisible()) {
            <div class="layout-menuitem-root-text">{{ item().label }}</div>
        }
        @if ((!hasRouterLink() || hasChildren()) && isVisible()) {
            <a [attr.href]="item().url" (click)="itemClick($event)" [ngClass]="item().class" [attr.target]="item().target" tabindex="0" pRipple>
                <i [ngClass]="item().icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-text">{{ item().label }}</span>
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                }
            </a>
        }
        @if (hasRouterLink() && !hasChildren() && isVisible()) {
            <a
                (click)="itemClick($event)"
                [ngClass]="item().class"
                [routerLink]="item().routerLink"
                [class.active-route]="item().active"
                [attr.aria-current]="item().active ? 'page' : null"
                [fragment]="item().fragment"
                [queryParamsHandling]="item().queryParamsHandling"
                [preserveFragment]="item().preserveFragment"
                [skipLocationChange]="item().skipLocationChange"
                [replaceUrl]="item().replaceUrl"
                [state]="item().state"
                [queryParams]="item().queryParams"
                [attr.target]="item().target"
                [attr.aria-label]="layoutService.isMenuRail() ? railTooltip() : null"
                [attr.aria-haspopup]="hasFlyout() ? 'menu' : null"
                [attr.aria-expanded]="hasFlyout() ? flyoutOpen() : null"
                [attr.aria-controls]="flyoutOpen() ? flyoutId() : null"
                (focusout)="onLinkFocusOut($event)"
                (keydown)="onLinkKeydown($event)"
                tabindex="0"
                pRipple
                [pTooltip]="railTooltip()"
                [tooltipDisabled]="!layoutService.isMenuRail() || flyoutOpen()"
                tooltipPosition="right"
                [tooltipEvent]="hasFlyout() ? 'focus' : 'both'"
                appendTo="body"
                #link
            >
                <i [ngClass]="item().icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-text">{{ item().label }}</span>
                @if (item().badge) {
                    <span class="layout-menuitem-badge">{{ item().badge }}<span class="sr-only"> {{ item().badgeText || 'bekleyen' }}</span></span>
                }
                @if (hasFlyout()) {
                    <i class="fa-solid fa-angle-right layout-menuitem-flyout-toggler" aria-hidden="true"></i>
                }
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                }
            </a>
            @if (flyoutOpen()) {
                <app-menu-flyout
                    [anchor]="link"
                    [tabs]="item().flyoutTabs"
                    [label]="item().label"
                    [heading]="layoutService.isMenuRail()"
                    [panelId]="flyoutId()"
                    [focusFirst]="flyoutFocusFirst()"
                    (selected)="onFlyoutSelected()"
                />
            }
        }
        @if (hasChildren() && isVisible() && (root() || isActive())) {
            <ul [animate.enter]="initialized() ? 'p-submenu-enter' : null" [animate.leave]="'p-submenu-leave'" [class.layout-root-submenulist]="root()">
                @for (child of item().items; track child?.label) {
                    <li appMenuitem [item]="child" [parentPath]="fullPath()" [root]="false" [class]="child['badgeClass']"></li>
                }
            </ul>
        }
    `,
    host: {
        '[class.active-menuitem]': 'isActive()',
        '[class.layout-root-menuitem]': 'root()',
        '(pointerenter)': 'onPointer($event, true)',
        '(pointerleave)': 'onPointer($event, false)'
    },
    styles: [
        `
            .p-submenu-enter {
                animation: p-animate-submenu-expand 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }

            .p-submenu-leave {
                animation: p-animate-submenu-collapse 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }

            @keyframes p-animate-submenu-expand {
                from {
                    max-height: 0;
                    overflow: hidden;
                }
                to {
                    max-height: 1000px;
                    overflow: visible;
                }
            }

            @keyframes p-animate-submenu-collapse {
                from {
                    max-height: 1000px;
                    overflow: hidden;
                }
                to {
                    max-height: 0;
                    overflow: hidden;
                }
            }
        `
    ]
})
export class AppMenuitem implements OnInit, AfterViewInit {
    layoutService = inject(LayoutService);

    router = inject(Router);

    item = input<any>(null);

    root = input<boolean>(false);

    parentPath = input<string | null>(null);

    isVisible = computed(() => this.item()?.visible !== false);

    hasChildren = computed(() => this.item()?.items && this.item()?.items.length > 0);

    /** Simge şeridinde metin görünmez; ad ve sayaç ipucunda (hover/odak) verilir. */
    railTooltip = computed(() => {
        const item = this.item();

        return item?.badge ? `${item.label} · ${item.badge} ${item.badgeText || 'bekleyen'}` : (item?.label ?? '');
    });

    hasRouterLink = computed(() => !!this.item()?.routerLink);

    private readonly flyout = inject(MenuFlyoutService);

    private readonly flyoutPanel = viewChild(AppMenuFlyout);

    /** Satırın alt sayfa paneli (flyout) var mı: yalnız en az iki yetkili sekmesi olan öğe (`flyoutTabs`, `AppMenu` doldurur). */
    hasFlyout = computed(() => !!this.item()?.flyoutTabs?.length && !this.hasChildren());

    flyoutOpen = computed(() => this.hasFlyout() && this.flyout.openKey() === this.item().label);

    flyoutId = computed(() => `layout-menu-flyout-${String(this.item()?.label ?? '').toLocaleLowerCase('tr').replace(/\s+/g, '-')}`);

    /** Klavyeyle açılan panelde odak ilk sekmeye geçer; fareyle ya da odakla açılanda satırda kalır. */
    flyoutFocusFirst = signal(false);

    /** Fareyle üzerine gelince açılır. Dokunmatikte (hover yok) panel açılmaz; dokunuş mevcut gezinmeyi (ilk sekme) yapar. */
    onPointer(event: PointerEvent, entered: boolean) {
        if (!this.hasFlyout() || event.pointerType !== 'mouse') {
            return;
        }

        if (entered) {
            this.openFlyout(false);
        } else {
            this.flyout.scheduleClose();
        }
    }

    onLinkFocusOut(event: FocusEvent) {
        // Panel body'dedir; odak satırdan panele geçiyorsa açık kalır.
        const next = event.relatedTarget;
        const intoPanel = next instanceof Node && !!document.getElementById(this.flyoutId())?.contains(next);

        if (this.flyoutOpen() && !intoPanel) {
            this.flyout.close();
        }
    }

    /**
     * Sekmeli satırda (WAI-ARIA menü düğmesi): Enter ve Boşluk paneli açıp kapatır (odak satırda kalır), Aşağı/Sağ ok açıp ilk sekmeye
     * odaklanır, Escape kapatır. Değiştirici tuşlu Enter (yeni sekmede aç) ve fare tıklaması satırın kendi gezinmesini (ilk sekme) yapar.
     */
    onLinkKeydown(event: KeyboardEvent) {
        if (!this.hasFlyout()) {
            return;
        }

        const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;

        if ((event.key === 'Enter' && !modified) || event.key === ' ') {
            event.preventDefault();

            if (this.flyoutOpen()) {
                this.flyout.close();
            } else {
                this.openFlyout(false);
            }
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            event.preventDefault();
            const panel = this.flyoutPanel();

            if (panel) {
                panel.focusItem(0);
            } else {
                this.openFlyout(true);
            }
        } else if (event.key === 'Escape' && this.flyoutOpen()) {
            event.preventDefault();
            this.flyout.close();
        }
    }

    onFlyoutSelected() {
        this.flyout.close();
        this.closeOverlayMenus();
    }

    private openFlyout(focusFirst: boolean) {
        this.flyoutFocusFirst.set(focusFirst);
        this.flyout.open(this.item().label);
    }

    fullPath = computed(() => {
        const itemPath = this.item()?.path;

        if (!itemPath) return this.parentPath();
        const parent = this.parentPath();

        if (parent && !itemPath.startsWith(parent)) {
            return parent + itemPath;
        }

        return itemPath;
    });

    isActive = computed(() => {
        const activePath = this.layoutService.layoutState().activePath;

        if (this.item()?.path) {
            return activePath?.startsWith(this.fullPath() ?? '') ?? false;
        }

        return false;
    });

    initialized = signal<boolean>(false);

    constructor() {
        // Öğeler bölüm/yetki değişiminde yeniden yaratılır; abonelik bileşenle birlikte kapanmalı.
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe(() => {
                if (this.item()?.routerLink) {
                    this.updateActiveStateFromRoute();
                }
            });
    }

    ngOnInit() {
        if (this.item()?.routerLink) {
            this.updateActiveStateFromRoute();
        }
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.initialized.set(true);
        });
    }

    updateActiveStateFromRoute() {
        const item = this.item();

        if (!item?.routerLink) return;

        const isRouteActive = this.router.isActive(item.routerLink[0], {
            paths: 'exact',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored'
        });

        if (isRouteActive) {
            const parentPath = this.parentPath();

            if (parentPath) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: parentPath
                }));
            }
        }
    }

    itemClick(event: Event) {
        const item = this.item();

        if (item?.disabled) {
            event.preventDefault();

            return;
        }

        if (item?.command) {
            item.command({ originalEvent: event, item: item });
        }

        if (this.hasChildren()) {
            if (this.isActive()) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: this.parentPath()
                }));
            } else {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: this.fullPath(),
                    menuHoverActive: true
                }));
            }
        } else {
            this.flyout.close();
            this.closeOverlayMenus();
        }
    }

    /** Gezinmeden sonra çekmece/overlay menü kapanır. */
    private closeOverlayMenus() {
        this.layoutService.layoutState.update((val) => ({
            ...val,
            overlayMenuActive: false,
            staticMenuMobileActive: false,
            mobileMenuActive: false,
            menuHoverActive: false
        }));
    }
}
