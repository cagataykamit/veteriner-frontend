import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';

@Component({
    selector: 'app-public-footer',
    standalone: true,
    imports: [RouterLink],
    template: `
        <footer class="px-4 pb-8 pt-4">
            <div
                class="max-w-6xl mx-auto rounded-3xl lg:rounded-[2rem] overflow-hidden public-footer-gradient relative"
            >
                <div
                    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_45%)]"
                    aria-hidden="true"
                ></div>
                <div class="relative px-6 lg:px-10 pt-10 pb-8">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div class="md:col-span-5">
                            <div class="mb-4">
                                <img
                                    [src]="brand.logoDark"
                                    alt="Vetinity"
                                    class="h-8 w-auto md:h-9"
                                    width="200"
                                    height="40"
                                />
                            </div>
                            <p class="public-on-brand-muted text-sm m-0 max-w-sm leading-relaxed">
                                Veteriner klinikleri için randevu, hasta kayıtları, klinik operasyonları ve raporlama
                                platformu. Çok klinikli yapı ve rol bazlı erişim ile güvenli panel deneyimi.
                            </p>
                        </div>

                        <div
                            class="grid grid-cols-1 gap-10 md:col-span-7 md:grid md:grid-cols-7 lg:translate-x-[72px]"
                        >
                            <div class="md:col-span-3">
                                <p class="public-on-brand-text font-semibold text-sm m-0 mb-4">Keşfet</p>
                                <ul class="list-none p-0 m-0 space-y-2.5 text-sm">
                                    <li>
                                        <a
                                            routerLink="/"
                                            fragment="features"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >Özellikler</a
                                        >
                                    </li>
                                    <li>
                                        <a
                                            routerLink="/"
                                            fragment="modules"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >Modüller</a
                                        >
                                    </li>
                                    <li>
                                        <a
                                            routerLink="/"
                                            fragment="faq"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >SSS</a
                                        >
                                    </li>
                                </ul>
                            </div>

                            <div class="md:col-span-4">
                                <p class="public-on-brand-text font-semibold text-sm m-0 mb-4">Hesap</p>
                                <ul class="list-none p-0 m-0 space-y-2.5 text-sm">
                                    <li>
                                        <a
                                            routerLink="/pricing"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >Paketler</a
                                        >
                                    </li>
                                    <li>
                                        <a
                                            routerLink="/auth/login"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >Giriş yap</a
                                        >
                                    </li>
                                    <li>
                                        <a
                                            routerLink="/auth/signup"
                                            class="public-on-brand-muted no-underline hover:text-[var(--public-on-brand)] transition-colors"
                                            >Ücretsiz kayıt</a
                                        >
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div
                        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-10 pt-6 border-t border-white/15"
                    >
                        <p class="public-on-brand-subtle text-xs m-0">© {{ year }} Vetinity. Tüm hakları saklıdır.</p>
                        <p class="public-on-brand-subtle text-xs m-0">Veteriner klinik yönetimi için tasarlandı.</p>
                    </div>
                </div>
            </div>
        </footer>
    `
})
export class PublicFooterComponent {
    readonly brand = VETINITY_BRAND_LOGOS;
    readonly year = new Date().getFullYear();
}
