import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Detay sayfalarındaki gömülü liste satırlarının "Detay" bağlantısı: küçük yeşil hap + ok (eylem şeridindeki düğme diline yakın).
 * `app-detail-see-all-link` ile birlikte kullanılır; satır hizası için `self-center`.
 */
@Component({
    selector: 'app-detail-row-link',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'inline-flex shrink-0 self-center' },
    template: `
        <a
            [routerLink]="link()"
            class="inline-flex items-center gap-0.5 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs font-semibold no-underline whitespace-nowrap bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-200 dark:hover:bg-primary-900/70 transition-colors max-sm:touch-hit"
            [attr.aria-label]="ariaLabel()"
            data-testid="detail-row-link"
        >
            {{ label() }}
            <i class="pi pi-angle-right text-xs" aria-hidden="true"></i>
        </a>
    `
})
export class AppDetailRowLinkComponent {
    readonly link = input.required<string | readonly unknown[]>();
    readonly label = input('Detay');
    /** Ekran okuyucu için satırı adlandıran metin (ör. "Randevu detayı: 12.10.2026"); boşsa görünen etiket okunur. */
    readonly ariaLabel = input<string | null>(null);
}
