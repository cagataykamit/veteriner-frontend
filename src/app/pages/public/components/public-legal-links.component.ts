import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_LEGAL_LINKS } from '@/app/entities/legal-document/utils/legal-documents.utils';

/** Giriş/kayıt sayfalarında kartın altındaki sade hukuki bağlantı satırı (Gizlilik Politikası, Kullanım Şartları). Görünüş `public-page-theme.scss`. */
@Component({
    selector: 'app-public-legal-links',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <nav class="public-legal-links" aria-label="Hukuki metinler">
            @for (link of links; track link.path) {
                <a [routerLink]="link.path">{{ link.shortTitle }}</a>
            }
        </nav>
    `
})
export class PublicLegalLinksComponent {
    readonly links = PUBLIC_LEGAL_LINKS;
}
