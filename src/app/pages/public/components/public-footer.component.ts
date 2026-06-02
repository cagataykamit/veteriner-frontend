import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-public-footer',
    standalone: true,
    imports: [RouterLink],
    template: `
        <footer class="px-4 pb-8 pt-4">
            <div
                class="max-w-6xl mx-auto rounded-3xl lg:rounded-[2rem] overflow-hidden public-footer-gradient shadow-xl relative"
            >
                <div
                    class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_45%)]"
                    aria-hidden="true"
                ></div>
                <div class="relative px-6 lg:px-10 pt-10 pb-8">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div class="md:col-span-5">
                            <div class="flex items-center gap-3 mb-4">
                                <span
                                    class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-primary-contrast border border-white/20"
                                    aria-hidden="true"
                                >
                                    <i class="pi pi-building text-lg"></i>
                                </span>
                                <span class="text-primary-contrast font-bold text-lg">Veteriner SaaS</span>
                            </div>
                            <p class="text-primary-contrast/75 text-sm m-0 max-w-sm leading-relaxed">
                                Veteriner klinikleri için randevu, hasta kayıtları, klinik operasyonları ve raporlama
                                platformu. Çok klinikli yapı ve rol bazlı erişim ile güvenli panel deneyimi.
                            </p>
                        </div>

                        <div class="md:col-span-3">
                            <p class="text-primary-contrast font-semibold text-sm m-0 mb-4">Keşfet</p>
                            <ul class="list-none p-0 m-0 space-y-2.5 text-sm">
                                <li>
                                    <a href="#features" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors"
                                        >Özellikler</a
                                    >
                                </li>
                                <li>
                                    <a href="#modules" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors"
                                        >Modüller</a
                                    >
                                </li>
                                <li>
                                    <a href="#faq" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors">SSS</a>
                                </li>
                            </ul>
                        </div>

                        <div class="md:col-span-4">
                            <p class="text-primary-contrast font-semibold text-sm m-0 mb-4">Hesap</p>
                            <ul class="list-none p-0 m-0 space-y-2.5 text-sm">
                                <li>
                                    <a routerLink="/pricing" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors"
                                        >Paketler</a
                                    >
                                </li>
                                <li>
                                    <a routerLink="/auth/login" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors"
                                        >Giriş yap</a
                                    >
                                </li>
                                <li>
                                    <a routerLink="/auth/signup" class="text-primary-contrast/75 no-underline hover:text-primary-contrast transition-colors"
                                        >Ücretsiz kayıt</a
                                    >
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div
                        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-10 pt-6 border-t border-white/15"
                    >
                        <p class="text-primary-contrast/65 text-xs m-0">© {{ year }} Veteriner SaaS. Tüm hakları saklıdır.</p>
                        <p class="text-primary-contrast/65 text-xs m-0">Veteriner klinik yönetimi için tasarlandı.</p>
                    </div>
                </div>
            </div>
        </footer>
    `,
    styles: `
        .public-footer-gradient {
            background: linear-gradient(
                to bottom right,
                var(--primary-color),
                var(--primary-color),
                color-mix(in srgb, var(--primary-color) 85%, transparent)
            );
            box-shadow: 0 20px 25px -5px color-mix(in srgb, var(--primary-color) 20%, transparent);
        }
    `
})
export class PublicFooterComponent {
    readonly year = new Date().getFullYear();
}
