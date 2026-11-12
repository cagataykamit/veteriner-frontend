import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import {
    PUBLIC_MAIN_CONTENT_ID,
    PUBLIC_NAV_ITEMS,
    PUBLIC_VET_FINDER_HREF,
    PUBLIC_VET_FINDER_LABEL
} from '@/app/features/public/utils/public-navigation.utils';
import { LayoutService } from '@/app/layout/service/layout.service';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Herkese açık üst çubuk: masaüstünde (≥1200 px, `xl`) bağlantılar ve düğmeler, altında logo + hamburger.
 * 992–1199 px arasında beş öğe, Veteriner bul ve iki düğme tek satıra sığmadığı için eşik `lg` değil `xl`.
 * Alt öğeli menü (Özellikler) tıklama/klavye ile açılan bir paneldir; üzerine gelince açılmaz. Escape, dışarı tıklama ve
 * odağın panelden çıkması kapatır. Mobil menü tam ekran açılır, alt öğeler akordeondur; odak içeride kalır, Escape ile
 * kapanır, rota değişince kapanır. Veteriner bul hasta sahibine yöneliktir: klinik menüsünden ayrı, sağda ikincil bağlantı.
 */
@Component({
    selector: 'app-public-topbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, ButtonModule, RippleModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    /* Yapışkan konum bileşenin kendisinde: iskeletin flex sütununda bileşen kutusu header'ın kapsayıcısıdır, içerideki sticky tutmaz */
    host: { class: 'sticky top-0 z-40 block', '(document:click)': 'onDocumentClick($event)' },
    template: `
        <a [href]="'#' + mainContentId" class="public-skip-link" (click)="skipToContent($event)">İçeriğe atla</a>

        <header class="public-topbar w-full">
            <div class="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
                <a routerLink="/" class="public-topbar-logo-link flex h-[44px] shrink-0 items-center no-underline" aria-label="Vetinity ana sayfa">
                    <img
                        [src]="brand.compactLockup"
                        alt="Vetinity"
                        class="block h-[38px] w-auto object-contain dark:hidden md:h-[42px]"
                        width="168"
                        height="42"
                    />
                    <img
                        [src]="brand.compactLockupDark"
                        alt="Vetinity"
                        class="hidden h-[38px] w-auto object-contain dark:block md:h-[42px]"
                        width="168"
                        height="42"
                    />
                </a>

                <nav class="hidden min-w-0 flex-1 items-center justify-center xl:flex" aria-label="Ana navigasyon">
                    <ul class="m-0 flex list-none items-center p-0">
                        @for (item of navItems; track item.label) {
                            @if (item.children) {
                                <li #dropdownRoot class="relative" (focusout)="onDropdownFocusOut($event)" (keydown.escape)="closeDropdown(true)">
                                    <button
                                        #dropdownButton
                                        type="button"
                                        class="public-topbar-nav-link inline-flex min-h-[44px] cursor-pointer items-center gap-1 whitespace-nowrap border-0 bg-transparent px-2 text-sm font-medium text-surface-700 dark:text-surface-300 2xl:px-3"
                                        [class.router-link-active]="featuresActive()"
                                        aria-controls="public-nav-dropdown"
                                        [attr.aria-expanded]="dropdownOpen()"
                                        (click)="toggleDropdown()"
                                    >
                                        {{ item.label }}
                                        <i class="pi pi-chevron-down public-nav-chevron text-xs" [class.public-nav-chevron-open]="dropdownOpen()" aria-hidden="true"></i>
                                    </button>
                                    @if (dropdownOpen()) {
                                        <div id="public-nav-dropdown" class="public-nav-dropdown absolute left-0 top-full mt-2 w-[22rem] p-2">
                                            <ul class="m-0 list-none p-0">
                                                @for (child of item.children; track child.label; let last = $last) {
                                                    <li [class.public-nav-dropdown-last]="last">
                                                        <a
                                                            [routerLink]="child.routerLink"
                                                            [fragment]="child.fragment"
                                                            class="public-nav-dropdown-link flex min-h-[44px] flex-col justify-center rounded-md px-3 py-2 no-underline"
                                                            (click)="closeDropdown(false)"
                                                        >
                                                            <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">{{ child.label }}</span>
                                                            @if (child.description) {
                                                                <span class="mt-0.5 text-xs leading-snug text-surface-600 dark:text-surface-400">{{ child.description }}</span>
                                                            }
                                                        </a>
                                                    </li>
                                                }
                                            </ul>
                                        </div>
                                    }
                                </li>
                            } @else {
                                <li>
                                    <a
                                        [routerLink]="item.routerLink"
                                        routerLinkActive="router-link-active"
                                        class="public-topbar-nav-link inline-flex min-h-[44px] items-center whitespace-nowrap px-2 text-sm 2xl:px-3 font-medium text-surface-700 no-underline dark:text-surface-300"
                                    >
                                        {{ item.label }}
                                    </a>
                                </li>
                            }
                        }
                    </ul>
                </nav>

                <div class="hidden items-center gap-2 xl:flex">
                    <a
                        [href]="vetFinderHref"
                        class="public-vet-finder-link inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap px-1 text-sm font-medium no-underline"
                    >
                        <i class="pi pi-map-marker" aria-hidden="true"></i>{{ vetFinderLabel }}
                    </a>
                    <span class="public-topbar-divider h-6 w-px" aria-hidden="true"></span>
                    <a routerLink="/auth/login" class="public-btn public-btn-ghost">Giriş yap</a>
                    <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                    <button
                        pButton
                        pRipple
                        type="button"
                       
                        [rounded]="true"
                        severity="secondary"
                        class="public-topbar-theme-toggle ml-1"
                        [attr.aria-label]="themeToggleLabel()"
                        (click)="toggleDarkMode()"
                    ><i [class]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"></i></button>
                </div>

                <div class="flex items-center gap-1 xl:hidden">
                    <button
                        pButton
                        pRipple
                        type="button"
                       
                        [rounded]="true"
                        severity="secondary"
                        class="public-topbar-theme-toggle"
                        [attr.aria-label]="themeToggleLabel()"
                        (click)="toggleDarkMode()"
                    ><i [class]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"></i></button>
                    <button
                        #menuButton
                        type="button"
                        class="public-topbar-menu-button inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-surface-900 dark:text-surface-0"
                        aria-controls="public-mobile-menu"
                        [attr.aria-expanded]="menuOpen()"
                        [attr.aria-label]="menuOpen() ? 'Menüyü kapat' : 'Menüyü aç'"
                        (click)="toggleMenu()"
                    >
                        <i [class]="menuOpen() ? 'pi pi-times text-xl' : 'pi pi-bars text-xl'" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </header>

        @if (menuOpen()) {
            <div
                #mobileMenu
                id="public-mobile-menu"
                class="public-mobile-menu fixed inset-0 z-50 flex flex-col bg-surface-0 dark:bg-surface-950 xl:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menü"
                (keydown)="onMenuKeydown($event)"
            >
                <div class="flex h-[64px] items-center justify-between px-4">
                    <a routerLink="/" class="flex h-[44px] items-center no-underline" aria-label="Vetinity ana sayfa" (click)="closeMenu()">
                        <img [src]="brand.compactLockup" alt="" class="block h-[38px] w-auto dark:hidden" width="168" height="42" />
                        <img [src]="brand.compactLockupDark" alt="" class="hidden h-[38px] w-auto dark:block" width="168" height="42" />
                    </a>
                    <button
                        #closeButton
                        type="button"
                        class="public-topbar-menu-button inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-surface-900 dark:text-surface-0"
                        aria-label="Menüyü kapat"
                        (click)="closeMenu()"
                    >
                        <i class="pi pi-times text-xl" aria-hidden="true"></i>
                    </button>
                </div>

                <nav class="flex-1 overflow-y-auto px-4 pt-2" aria-label="Ana navigasyon">
                    <ul class="m-0 list-none p-0">
                        @for (item of navItems; track item.label) {
                            <li>
                                @if (item.children) {
                                    <button
                                        type="button"
                                        class="public-mobile-menu-link flex min-h-[48px] w-full cursor-pointer items-center justify-between border-0 border-b border-solid border-surface-200 bg-transparent p-0 text-left text-lg font-semibold text-surface-900 dark:border-surface-800 dark:text-surface-0"
                                        aria-controls="public-mobile-submenu"
                                        [attr.aria-expanded]="mobileSubmenuOpen()"
                                        (click)="toggleMobileSubmenu()"
                                    >
                                        {{ item.label }}
                                        <i class="pi pi-chevron-down public-nav-chevron text-base" [class.public-nav-chevron-open]="mobileSubmenuOpen()" aria-hidden="true"></i>
                                    </button>
                                    @if (mobileSubmenuOpen()) {
                                        <ul id="public-mobile-submenu" class="m-0 list-none border-b border-surface-200 py-1 pl-4 pr-0 dark:border-surface-800">
                                            @for (child of item.children; track child.label) {
                                                <li>
                                                    <a
                                                        [routerLink]="child.routerLink"
                                                        [fragment]="child.fragment"
                                                        class="public-mobile-menu-link flex min-h-[48px] flex-col justify-center py-1 text-base font-medium text-surface-800 no-underline dark:text-surface-100"
                                                        (click)="closeMenu()"
                                                    >
                                                        {{ child.label }}
                                                        @if (child.description) {
                                                            <span class="mt-0.5 text-sm font-normal text-surface-600 dark:text-surface-400">{{ child.description }}</span>
                                                        }
                                                    </a>
                                                </li>
                                            }
                                        </ul>
                                    }
                                } @else {
                                    <a
                                        [routerLink]="item.routerLink"
                                        class="public-mobile-menu-link flex min-h-[48px] items-center border-b border-surface-200 text-lg font-semibold text-surface-900 no-underline dark:border-surface-800 dark:text-surface-0"
                                        (click)="closeMenu()"
                                    >
                                        {{ item.label }}
                                    </a>
                                }
                            </li>
                        }
                    </ul>
                </nav>

                <div class="flex flex-col gap-3 px-4 pb-6 pt-4">
                    <a
                        [href]="vetFinderHref"
                        class="public-vet-finder-link public-mobile-menu-link inline-flex min-h-[48px] items-center justify-center gap-2 text-base font-medium no-underline"
                        (click)="closeMenu()"
                    >
                        <i class="pi pi-map-marker" aria-hidden="true"></i>{{ vetFinderLabel }}
                    </a>
                    <a routerLink="/auth/login" class="public-btn public-btn-secondary w-full !min-h-[48px]" (click)="closeMenu()">Giriş yap</a>
                    <a routerLink="/auth/signup" class="public-btn public-btn-primary w-full !min-h-[48px]" (click)="closeMenu()">Ücretsiz dene</a>
                </div>
            </div>
        }
    `
})
export class PublicTopbarComponent {
    private readonly layoutService = inject(LayoutService);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);

    private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
    private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
    private readonly mobileMenu = viewChild<ElementRef<HTMLElement>>('mobileMenu');
    private readonly dropdownRoot = viewChild<ElementRef<HTMLElement>>('dropdownRoot');
    private readonly dropdownButton = viewChild<ElementRef<HTMLButtonElement>>('dropdownButton');
    private readonly router = inject(Router);
    private readonly dropdownPath = PUBLIC_NAV_ITEMS.find((item) => item.children)?.routerLink;

    readonly brand = VETINITY_BRAND_LOGOS;
    readonly navItems = PUBLIC_NAV_ITEMS;
    readonly vetFinderHref = PUBLIC_VET_FINDER_HREF;
    readonly vetFinderLabel = PUBLIC_VET_FINDER_LABEL;
    readonly mainContentId = PUBLIC_MAIN_CONTENT_ID;

    readonly isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);
    readonly themeToggleLabel = this.layoutService.themeToggleLabel;

    readonly menuOpen = signal(false);
    readonly dropdownOpen = signal(false);
    readonly mobileSubmenuOpen = signal(false);
    /** Açılır menünün düğmesi kendi sayfasındayken (ör. /ozellikler#gelis) etkin görünür; düğmede `routerLinkActive` yok. */
    readonly featuresActive = signal(this.isOnDropdownPath());

    constructor() {
        this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
            if (e instanceof NavigationStart) {
                this.closeMenu();
                this.dropdownOpen.set(false);
            } else if (e instanceof NavigationEnd) {
                this.featuresActive.set(this.isOnDropdownPath());
            }
        });
        this.destroyRef.onDestroy(() => this.setBodyScrollLocked(false));
    }

    toggleDarkMode(): void {
        this.layoutService.toggleDarkMode();
    }

    toggleMenu(): void {
        if (this.menuOpen()) {
            this.closeMenu();

            return;
        }

        this.menuOpen.set(true);
        this.setBodyScrollLocked(true);
        // Panel bir sonraki render'da oluşur; odak kapatma düğmesine taşınır.
        setTimeout(() => this.closeButton()?.nativeElement.focus(), 0);
    }

    toggleDropdown(): void {
        this.dropdownOpen.update((open) => !open);
    }

    /** `restoreFocus`: Escape ile kapanınca odak düğmeye döner; bağlantı tıklanınca odağı gezinme yönetir. */
    closeDropdown(restoreFocus: boolean): void {
        if (!this.dropdownOpen()) {
            return;
        }

        this.dropdownOpen.set(false);

        if (restoreFocus) {
            this.dropdownButton()?.nativeElement.focus();
        }
    }

    /** Odak (Tab ile) açılır menünün dışına çıkınca panel kapanır. */
    onDropdownFocusOut(event: FocusEvent): void {
        const next = event.relatedTarget as Node | null;

        if (next && !this.dropdownRoot()?.nativeElement.contains(next)) {
            this.dropdownOpen.set(false);
        }
    }

    onDocumentClick(event: MouseEvent): void {
        if (this.dropdownOpen() && !this.dropdownRoot()?.nativeElement.contains(event.target as Node)) {
            this.dropdownOpen.set(false);
        }
    }

    toggleMobileSubmenu(): void {
        this.mobileSubmenuOpen.update((open) => !open);
    }

    closeMenu(): void {
        if (!this.menuOpen()) {
            return;
        }

        this.menuOpen.set(false);
        this.mobileSubmenuOpen.set(false);
        this.setBodyScrollLocked(false);
        this.menuButton()?.nativeElement.focus();
    }

    /** Escape kapatır; Tab/Shift+Tab odağı panel içinde döndürür. */
    onMenuKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeMenu();

            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const panel = this.mobileMenu()?.nativeElement;

        if (!panel) {
            return;
        }

        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

        if (focusable.length === 0) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = this.document.activeElement;

        if (event.shiftKey && (active === first || !panel.contains(active))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /** "İçeriğe atla": ana içeriğe odaklanır (tarayıcı hash gezinmesi Angular rotasına düşmesin). */
    skipToContent(event: Event): void {
        const main = this.document.getElementById(this.mainContentId);

        if (!main) {
            return;
        }

        event.preventDefault();

        if (!main.hasAttribute('tabindex')) {
            main.setAttribute('tabindex', '-1');
        }

        main.focus();
        main.scrollIntoView();
    }

    private isOnDropdownPath(): boolean {
        return this.router.url.split(/[?#]/)[0] === this.dropdownPath;
    }

    private setBodyScrollLocked(locked: boolean): void {
        this.document.body.style.overflow = locked ? 'hidden' : '';
    }
}
