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
            <a
                [routerLink]="link()"
                [queryParams]="queryParams()"
                class="flex items-center justify-center gap-2 mt-3 px-3 py-2 rounded-border text-sm font-semibold no-underline text-color bg-surface-50 hover:bg-primary-50 hover:text-primary-700 dark:bg-surface-800 dark:hover:bg-primary-900/40 dark:hover:text-primary-200 transition-colors"
                data-testid="see-all-link"
            >
                <span>
                    Tümünü gör
                    @if (total() !== null) {
                        <span class="text-muted-color font-medium">({{ total() }})</span>
                    }
                </span>
                <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
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
