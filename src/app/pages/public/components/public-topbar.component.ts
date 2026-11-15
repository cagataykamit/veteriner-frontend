import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
 * Herkese açık üst çubuk: krem zemin üstünde yüzen hap (`public-site.scss`). Masaüstünde (≥1200 px, `xl`) bağlantılar ve
 * düğmeler, altında logo + hamburger.
 * 992–1199 px arasında beş öğe, Veteriner bul ve iki düğme tek satıra sığmadığı için eşik `lg` değil `xl`.
 * Menü öğeleri düz bağlantıdır; açılır alt menü yok (kullanıcı kararı 2026-11-12). Mobil menü tam ekran açılır; odak
 * içeride kalır, Escape ile kapanır, rota değişince kapanır. Veteriner bul hasta sahibine yöneliktir: klinik menüsünden
 * ayrı, sağda ikincil bağlantı.
 */
@Component({
    selector: 'app-public-topbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    changeDetection: ChangeDetectionStrategy.OnPush,
    /* Yapışkan konum bileşenin kendisinde: iskeletin flex sütununda bileşen kutusu header'ın kapsayıcısıdır, içerideki sticky tutmaz */
    host: { class: 'sticky top-0 z-40 block' },
    template: `
        <a [href]="'#' + mainContentId" class="public-skip-link" (click)="skipToContent($event)">İçeriğe atla</a>

        <header class="ps-topbar w-full">
            <div class="ps-topbar-row">
                <a routerLink="/" class="ps-topbar-logo no-underline" aria-label="Vetinity ana sayfa">
                    <img [src]="brand.compactLockup" alt="Vetinity" class="block h-[38px] w-auto object-contain dark:hidden md:h-[40px]" width="168" height="42" />
                    <img [src]="brand.compactLockupDark" alt="Vetinity" class="hidden h-[38px] w-auto object-contain dark:block md:h-[40px]" width="168" height="42" />
                </a>

                <nav class="ps-topbar-nav hidden xl:flex" aria-label="Ana navigasyon">
                    <ul class="ps-list">
                        @for (item of navItems; track item.label) {
                            <li>
                                <a [routerLink]="item.routerLink" routerLinkActive="router-link-active" class="ps-topbar-link">{{ item.label }}</a>
                            </li>
                        }
                    </ul>
                </nav>

                <div class="ps-topbar-actions hidden items-center xl:flex">
                    <a [href]="vetFinderHref" class="ps-topbar-finder"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ vetFinderLabel }}</a>
                    <a routerLink="/auth/login" class="ps-topbar-login">Giriş yap</a>
                    <a routerLink="/auth/signup" class="public-btn public-btn-primary">Ücretsiz dene</a>
                    <button type="button" class="public-topbar-theme-toggle ps-topbar-icon" [attr.aria-label]="themeToggleLabel()" (click)="toggleDarkMode()">
                        <i [class]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="ps-topbar-compact flex items-center gap-1 xl:hidden">
                    <button type="button" class="public-topbar-theme-toggle ps-topbar-icon" [attr.aria-label]="themeToggleLabel()" (click)="toggleDarkMode()">
                        <i [class]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'" aria-hidden="true"></i>
                    </button>
                    <button
                        #menuButton
                        type="button"
                        class="ps-topbar-icon"
                        aria-controls="public-mobile-menu"
                        [attr.aria-expanded]="menuOpen()"
                        [attr.aria-label]="menuOpen() ? 'Menüyü kapat' : 'Menüyü aç'"
                        (click)="toggleMenu()"
                    >
                        <i [class]="menuOpen() ? 'pi pi-times' : 'pi pi-bars'" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </header>

        @if (menuOpen()) {
            <div
                #mobileMenu
                id="public-mobile-menu"
                class="ps-mobile-menu fixed inset-0 z-50 flex flex-col xl:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menü"
                (keydown)="onMenuKeydown($event)"
            >
                <div class="ps-mobile-menu-row">
                    <a routerLink="/" class="ps-topbar-logo no-underline" aria-label="Vetinity ana sayfa" (click)="closeMenu()">
                        <img [src]="brand.compactLockup" alt="" class="block h-[38px] w-auto dark:hidden" width="168" height="42" />
                        <img [src]="brand.compactLockupDark" alt="" class="hidden h-[38px] w-auto dark:block" width="168" height="42" />
                    </a>
                    <button #closeButton type="button" class="ps-topbar-icon" aria-label="Menüyü kapat" (click)="closeMenu()">
                        <i class="pi pi-times" aria-hidden="true"></i>
                    </button>
                </div>

                <nav class="flex-1 overflow-y-auto px-6 pt-4" aria-label="Ana navigasyon">
                    <ul class="ps-list">
                        @for (item of navItems; track item.label) {
                            <li>
                                <a [routerLink]="item.routerLink" class="ps-mobile-menu-link" (click)="closeMenu()">{{ item.label }}</a>
                            </li>
                        }
                    </ul>
                </nav>

                <div class="flex flex-col gap-3 px-6 pb-6 pt-4">
                    <a [href]="vetFinderHref" class="ps-mobile-menu-finder" (click)="closeMenu()"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ vetFinderLabel }}</a>
                    <a routerLink="/auth/login" class="public-btn public-btn-secondary w-full" (click)="closeMenu()">Giriş yap</a>
                    <a routerLink="/auth/signup" class="public-btn public-btn-primary w-full" (click)="closeMenu()">Ücretsiz dene</a>
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
    private readonly router = inject(Router);

    readonly brand = VETINITY_BRAND_LOGOS;
    readonly navItems = PUBLIC_NAV_ITEMS;
    readonly vetFinderHref = PUBLIC_VET_FINDER_HREF;
    readonly vetFinderLabel = PUBLIC_VET_FINDER_LABEL;
    readonly mainContentId = PUBLIC_MAIN_CONTENT_ID;

    readonly isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);
    readonly themeToggleLabel = this.layoutService.themeToggleLabel;

    readonly menuOpen = signal(false);

    constructor() {
        this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
            if (e instanceof NavigationStart) {
                this.closeMenu();
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
