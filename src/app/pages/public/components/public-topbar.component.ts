import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-public-topbar',
    standalone: true,
    imports: [RouterLink, ButtonModule, RippleModule],
    template: `
        <header class="w-full overflow-x-hidden">
            <div
                class="mx-auto flex max-w-6xl min-w-0 flex-col gap-2 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-2 md:px-6 md:py-4"
            >
                <div class="flex w-full min-h-[2.5rem] items-center md:w-auto md:min-h-0 md:justify-start">
                    <a routerLink="/" class="public-topbar-logo-link group flex shrink-0 items-center gap-3 no-underline">
                        <img
                            [src]="brand.compactLockup"
                            alt="Vetinity"
                            class="public-topbar-logo-img block h-[38px] w-auto shrink-0 object-contain dark:hidden md:h-[42px]"
                            width="168"
                            height="42"
                        />
                        <img
                            [src]="brand.compactLockupDark"
                            alt="Vetinity"
                            class="public-topbar-logo-img hidden h-[38px] w-auto shrink-0 object-contain dark:block md:h-[42px]"
                            width="168"
                            height="42"
                        />
                    </a>
                    <p-button
                        type="button"
                        (onClick)="toggleDarkMode()"
                        [rounded]="true"
                        [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"
                        severity="secondary"
                        class="public-topbar-theme-toggle public-topbar-theme-toggle-mobile ml-auto mr-3 shrink-0 md:!hidden"
                        [attr.aria-label]="themeToggleLabel()"
                    />
                </div>

                <nav
                    class="hidden w-full min-w-0 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 text-xs md:flex md:flex-1 md:justify-center md:gap-x-1 md:text-sm"
                    aria-label="Ana navigasyon"
                >
                    @for (link of navLinks; track link.label) {
                        <a
                            [routerLink]="link.routerLink"
                            [fragment]="link.fragment"
                            class="public-topbar-nav-link shrink-0 px-2 py-1.5 font-medium text-surface-700 no-underline md:px-3 dark:text-surface-300"
                        >
                            {{ link.label }}
                        </a>
                    }
                </nav>

                <div class="hidden w-full min-w-0 items-stretch gap-1.5 md:flex md:w-auto md:items-center md:gap-2 md:pr-2">
                    <a
                        routerLink="/auth/login"
                        class="public-topbar-login-outline flex-1 md:flex-none"
                    >
                        Giriş yap
                    </a>
                    <a
                        routerLink="/auth/signup"
                        pButton
                        pRipple
                        label="Ücretsiz başla"
                        class="public-topbar-cta p-button-sm !flex-1 !justify-center !font-semibold md:!flex-none"
                    ></a>
                    <p-button
                        type="button"
                        (onClick)="toggleDarkMode()"
                        [rounded]="true"
                        [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"
                        severity="secondary"
                        class="public-topbar-theme-toggle !hidden shrink-0 md:!inline-flex md:ml-3"
                        [attr.aria-label]="themeToggleLabel()"
                    />
                </div>
            </div>
        </header>
    `
})
export class PublicTopbarComponent {
    private readonly layoutService = inject(LayoutService);

    readonly brand = VETINITY_BRAND_LOGOS;

    readonly isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

    readonly themeToggleLabel = computed(() =>
        this.isDarkTheme() ? 'Açık temaya geç' : 'Koyu temaya geç'
    );

    readonly navLinks = [
        { label: 'Özellikler', routerLink: ['/'], fragment: 'features' },
        { label: 'Modüller', routerLink: ['/'], fragment: 'modules' },
        { label: 'SSS', routerLink: ['/'], fragment: 'faq' },
        { label: 'Paketler', routerLink: ['/pricing'] }
    ];

    toggleDarkMode(): void {
        this.layoutService.toggleDarkMode();
    }
}
