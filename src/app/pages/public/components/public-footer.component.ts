import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VETINITY_BRAND_LOGOS } from '@/app/core/brand/vetinity-brand.constants';
import { DATA_PROCESSING_AGREEMENT_DOCUMENT, PUBLIC_LEGAL_LINKS } from '@/app/entities/legal-document/utils/legal-documents.utils';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_LEGAL_ENTITY_NAME } from '@/app/features/public/utils/public-contact-content.utils';
import {
    PUBLIC_FOOTER_PRODUCT_LINKS,
    PUBLIC_FOOTER_SUPPORT_LINKS,
    PUBLIC_VET_FINDER_HREF,
    PUBLIC_VET_FINDER_LABEL
} from '@/app/features/public/utils/public-navigation.utils';

/** Alt bilgi (tasarım belgesi bölüm 4): sayfa zemininde 4 sütun; altta © yıl, tüzel kişi adı (AK-6) ve e-posta. */
@Component({
    selector: 'app-public-footer',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <footer class="ps-footer">
            <div class="ps-wrap">
                <div class="ps-footer-grid">
                    <div class="ps-footer-brand">
                        <img [src]="brand.compactLockup" alt="Vetinity" class="block h-9 w-auto dark:hidden" width="200" height="40" />
                        <img [src]="brand.compactLockupDark" alt="Vetinity" class="hidden h-9 w-auto dark:block" width="200" height="40" />
                        <p>Veteriner klinikleri için bulut klinik programı: gününüz, kayıt defterleriniz ve KVKK evrakınız tek yerde.</p>
                    </div>
                    <div>
                        <p class="ps-footer-title">Ürün</p>
                        <ul class="ps-list">
                            @for (link of productLinks; track link.routerLink) {
                                <li><a [routerLink]="link.routerLink">{{ link.label }}</a></li>
                            }
                            <!-- Hasta sahibine yönelik sayfa ayrı sunucuda; Angular rotası değil -->
                            <li><a [href]="vetFinderHref">{{ vetFinderLabel }}</a></li>
                        </ul>
                    </div>
                    <div>
                        <p class="ps-footer-title">Destek</p>
                        <ul class="ps-list">
                            @for (link of supportLinks; track link.routerLink) {
                                <li><a [routerLink]="link.routerLink">{{ link.label }}</a></li>
                            }
                            <li><a routerLink="/auth/login">Giriş yap</a></li>
                        </ul>
                    </div>
                    <div>
                        <p class="ps-footer-title">Hukuki</p>
                        <ul class="ps-list">
                            @for (doc of legalLinks; track doc.path) {
                                <li><a [routerLink]="doc.path">{{ doc.shortTitle }}</a></li>
                            }
                        </ul>
                    </div>
                </div>

                <div class="ps-footer-base">
                    <p>© {{ year }} {{ legalEntityName ?? 'Vetinity' }}.</p>
                    @if (contactEmail) {
                        <p><a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a></p>
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
    readonly vetFinderHref = PUBLIC_VET_FINDER_HREF;
    readonly vetFinderLabel = PUBLIC_VET_FINDER_LABEL;
    /** Gizlilik, kullanım şartları ve veri işleme sözleşmesi. */
    readonly legalLinks = [...PUBLIC_LEGAL_LINKS, DATA_PROCESSING_AGREEMENT_DOCUMENT];
    readonly legalEntityName = PUBLIC_LEGAL_ENTITY_NAME;
    readonly contactEmail = PUBLIC_CONTACT_EMAIL;
}
