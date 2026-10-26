import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { PUBLIC_MAIN_CONTENT_ID, PUBLIC_NAV_LINKS } from '@/app/features/public/utils/public-navigation.utils';
import { LayoutService } from '@/app/layout/service/layout.service';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Herkese açık üst çubuk: masaüstünde (≥992 px) bağlantılar ve düğmeler, altında logo + hamburger.
 * Mobil menü tam ekran açılır; odak içeride kalır, Escape ile kapanır, rota değişince kapanır.
 */
@Component({
    selector: 'app-public-topbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, ButtonModule, RippleModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <a [href]="'#' + mainContentId" class="public-skip-link" (click)="skipToContent($event)">İçeriğe atla</a>

        <header class="public-topbar sticky top-0 z-40 w-full">
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

                <nav class="hidden min-w-0 flex-1 items-center justify-center gap-x-1 lg:flex" aria-label="Ana navigasyon">
                    @for (link of navLinks; track link.label) {
                        <a
                            [routerLink]="link.routerLink"
                            routerLinkActive="router-link-active"
                            class="public-topbar-nav-link inline-flex min-h-[44px] items-center whitespace-nowrap px-2 text-sm xl:px-3 font-medium text-surface-700 no-underline dark:text-surface-300"
                        >
                            {{ link.label }}
                        </a>
                    }
                </nav>

                <div class="hidden items-center gap-2 lg:flex">
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

                <div class="flex items-center gap-1 lg:hidden">
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
                class="public-mobile-menu fixed inset-0 z-50 flex flex-col bg-surface-0 dark:bg-surface-950 lg:hidden"
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
                        @for (link of navLinks; track link.label) {
                            <li>
                                <a
                                    [routerLink]="link.routerLink"
                                    class="public-mobile-menu-link flex min-h-[48px] items-center border-b border-surface-200 text-lg font-semibold text-surface-900 no-underline dark:border-surface-800 dark:text-surface-0"
                                    (click)="closeMenu()"
                                >
                                    {{ link.label }}
                                </a>
                            </li>
                        }
                    </ul>
                </nav>

                <div class="flex flex-col gap-3 px-4 pb-6 pt-4">
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

    readonly brand = VETINITY_BRAND_LOGOS;
    readonly navLinks = PUBLIC_NAV_LINKS;
    readonly mainContentId = PUBLIC_MAIN_CONTENT_ID;

    readonly isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);
    readonly themeToggleLabel = this.layoutService.themeToggleLabel;

    readonly menuOpen = signal(false);

    constructor() {
        inject(Router)
            .events.pipe(
                filter((e) => e instanceof NavigationStart),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.closeMenu());
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

    closeMenu(): void {
        if (!this.menuOpen()) {
            return;
        }

        this.menuOpen.set(false);
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

    private setBodyScrollLocked(locked: boolean): void {
        this.document.body.style.overflow = locked ? 'hidden' : '';
    }
}
