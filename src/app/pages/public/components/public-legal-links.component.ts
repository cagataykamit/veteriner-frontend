import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_LEGAL_LINKS } from '@/app/entities/legal-document/utils/legal-documents.utils';

/** Giriş/kayıt sayfalarının altındaki sade hukuki bağlantı satırı ("Gizlilik Politikası · Kullanım Şartları"). */
@Component({
    selector: 'app-public-legal-links',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <nav class="public-legal-links mt-6 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted-color" aria-label="Hukuki metinler">
            @for (link of links; track link.path; let last = $last) {
                <a [routerLink]="link.path" class="text-muted-color no-underline hover:underline">{{ link.shortTitle }}</a>
                @if (!last) {
                    <span aria-hidden="true">·</span>
                }
            }
        </nav>
    `
})
export class PublicLegalLinksComponent {
    readonly links = PUBLIC_LEGAL_LINKS;
}
