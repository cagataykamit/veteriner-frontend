import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { type Params, RouterLink } from '@angular/router';

/**
 * Detay sayfalarındaki gömülü listelerin "Tümünü gör →" bağlantısı; listenin altında, sola hizalı.
 * Liste boşsa çizilmez (boş listeye götüren bağlantı olmaz). Sayı yalnız sunucu toplamı biliniyorsa yazılır: "Tümünü gör (12) →".
 */
@Component({
    selector: 'app-detail-see-all-link',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        @if (itemCount() > 0) {
            <a [routerLink]="link()" [queryParams]="queryParams()" class="inline-block mt-3 text-sm font-medium text-primary no-underline" data-testid="see-all-link">
                Tümünü gör
                @if (total() !== null) {
                    ({{ total() }})
                }
                →
            </a>
        }
    `
})
export class AppDetailSeeAllLinkComponent {
    readonly link = input.required<string | readonly unknown[]>();
    readonly queryParams = input<Params | null>(null);
    /** Listede gösterilen kayıt sayısı; 0 ise bağlantı çizilmez. */
    readonly itemCount = input.required<number>();
    /** Sunucu toplamı (`totalItems`); bilinmiyorsa null bırakılır, sayı yazılmaz. */
    readonly total = input<number | null>(null);
}
