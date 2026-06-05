import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@Component({
    selector: 'app-public-topbar',
    standalone: true,
    imports: [RouterLink, ButtonModule, RippleModule],
    template: `
        <header class="w-full">
            <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 md:px-6">
                <a routerLink="/" class="group flex shrink-0 items-center gap-3 no-underline">
                    <span
                        class="public-topbar-logo inline-flex h-9 w-9 items-center justify-center rounded-xl lg:h-10 lg:w-10"
                        aria-hidden="true"
                    >
                        <i class="pi pi-building text-lg lg:text-xl"></i>
                    </span>
                    <span class="flex flex-col leading-tight">
                        <span class="text-base font-bold tracking-tight text-surface-900 dark:text-surface-0 lg:text-lg"
                            >Veteriner SaaS</span
                        >
                        <span class="hidden text-[11px] font-medium text-surface-600 dark:text-surface-400 sm:block lg:text-xs"
                            >Klinik yönetim platformu</span
                        >
                    </span>
                </a>

                <nav
                    class="order-3 flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm md:order-2 md:w-auto md:flex-1 md:justify-center"
                    aria-label="Ana navigasyon"
                >
                    @for (link of navLinks; track link.label) {
                        <a
                            [routerLink]="link.routerLink"
                            [fragment]="link.fragment"
                            class="public-topbar-nav-link px-3 py-1.5 font-medium text-surface-700 no-underline dark:text-surface-300"
                        >
                            {{ link.label }}
                        </a>
                    }
                </nav>

                <div class="order-2 flex shrink-0 flex-wrap items-center gap-2 md:order-3">
                    <a
                        routerLink="/auth/login"
                        pButton
                        pRipple
                        label="Giriş yap"
                        [text]="true"
                        severity="secondary"
                        class="p-button-sm !font-medium"
                    ></a>
                    <a routerLink="/auth/signup" pButton pRipple label="Ücretsiz başla" class="p-button-sm !font-semibold"></a>
                </div>
            </div>
        </header>
    `,
    styles: `
        .public-topbar-logo {
            background: linear-gradient(
                to bottom right,
                var(--primary-color),
                color-mix(in srgb, var(--primary-color) 75%, transparent)
            );
            color: var(--primary-contrast-color);
        }

        .public-topbar-nav-link {
            box-sizing: border-box;
            border: 0 solid transparent;
            font-weight: 500;
            transition: color 0.15s ease;
        }

        .public-topbar-nav-link:hover,
        .public-topbar-nav-link.router-link-active {
            color: var(--primary-color);
            font-weight: 500;
            border-width: 0;
        }
    `
})
export class PublicTopbarComponent {
    readonly navLinks = [
        { label: 'Özellikler', routerLink: ['/'], fragment: 'features' },
        { label: 'Modüller', routerLink: ['/'], fragment: 'modules' },
        { label: 'SSS', routerLink: ['/'], fragment: 'faq' },
        { label: 'Paketler', routerLink: ['/pricing'] }
    ];
}
