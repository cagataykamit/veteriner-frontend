import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { DATA_PROCESSING_AGREEMENT_DOCUMENT, PUBLIC_LEGAL_LINKS } from '@/app/features/public/utils/legal-documents.utils';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_LEGAL_ENTITY_NAME } from '@/app/features/public/utils/public-contact-content.utils';
import { PUBLIC_FOOTER_PRODUCT_LINKS, PUBLIC_FOOTER_SUPPORT_LINKS } from '@/app/features/public/utils/public-navigation.utils';

/** Alt bilgi (tasarım belgesi bölüm 4): lacivert zemin, 4 sütun; altta © yıl, tüzel kişi adı (AK-6) ve e-posta. */
@Component({
    selector: 'app-public-footer',
    standalone: true,
    imports: [RouterLink],
    template: `
        <footer class="public-footer mt-16 md:mt-24">
            <div class="mx-auto max-w-6xl px-4 pb-8 pt-12 md:px-6 md:pt-14">
                <div class="grid grid-cols-1 gap-10 md:grid-cols-12">
                    <div class="md:col-span-5">
                        <img [src]="brand.compactLockupDark" alt="Vetinity" class="h-8 w-auto md:h-9" width="200" height="40" />
                        <p class="public-on-brand-muted m-0 mt-4 max-w-sm text-sm leading-relaxed">
                            Küçük veteriner klinikleri için bulut klinik programı: gününüz, kayıt defterleriniz ve KVKK evrakınız tek yerde.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-7">
                        <div>
                            <p class="public-on-brand-text m-0 mb-3 text-sm font-semibold">Ürün</p>
                            <ul class="m-0 list-none p-0 text-sm md:space-y-2">
                                @for (link of productLinks; track link.routerLink) {
                                    <li><a [routerLink]="link.routerLink" class="public-footer-link">{{ link.label }}</a></li>
                                }
                            </ul>
                        </div>
                        <div>
                            <p class="public-on-brand-text m-0 mb-3 text-sm font-semibold">Destek</p>
                            <ul class="m-0 list-none p-0 text-sm md:space-y-2">
                                @for (link of supportLinks; track link.routerLink) {
                                    <li><a [routerLink]="link.routerLink" class="public-footer-link">{{ link.label }}</a></li>
                                }
                                <li><a routerLink="/auth/login" class="public-footer-link">Giriş yap</a></li>
                            </ul>
                        </div>
                        <div>
                            <p class="public-on-brand-text m-0 mb-3 text-sm font-semibold">Hukuki</p>
                            <ul class="m-0 list-none p-0 text-sm md:space-y-2">
                                @for (doc of legalLinks; track doc.path) {
                                    <li><a [routerLink]="doc.path" class="public-footer-link">{{ doc.shortTitle }}</a></li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <p class="public-on-brand-subtle m-0">© {{ year }} {{ legalEntityName ?? 'Vetinity' }}.</p>
                    @if (contactEmail) {
                        <p class="public-on-brand-subtle m-0">
                            <a [href]="'mailto:' + contactEmail" class="public-footer-link">{{ contactEmail }}</a>
                        </p>
                    }
                </div>
            </div>
        </footer>
    `
})
export class PublicFooterComponent {
    readonly brand = VETINITY_BRAND_LOGOS;
    readonly year = new Date().getFullYear();
    readonly productLinks = PUBLIC_FOOTER_PRODUCT_LINKS;
    readonly supportLinks = PUBLIC_FOOTER_SUPPORT_LINKS;
    /** Gizlilik, kullanım şartları ve veri işleme sözleşmesi. */
    readonly legalLinks = [...PUBLIC_LEGAL_LINKS, DATA_PROCESSING_AGREEMENT_DOCUMENT];
    readonly legalEntityName = PUBLIC_LEGAL_ENTITY_NAME;
    readonly contactEmail = PUBLIC_CONTACT_EMAIL;
}
