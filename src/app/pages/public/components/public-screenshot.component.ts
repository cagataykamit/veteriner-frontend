import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { PUBLIC_SCREENSHOTS, publicScreenshotSrc, type PublicScreenshotKey } from '@/app/features/public/utils/public-screenshots.utils';

/**
 * Gerçek ürün ekran görüntüsü (WEB-005): ince çerçeve, 16 px köşe, tek gölge (tasarım belgesi bölüm 3).
 * Açık ve koyu tema görselleri ayrı; yalnız etkin temanınki görünür ve tembel yüklenir. `width`/`height` CLS için.
 */
@Component({
    selector: 'app-public-screenshot',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <figure class="public-shot m-0">
            <img
                class="public-shot-img public-shot-img--light"
                [src]="lightSrc()"
                [alt]="def().alt"
                [attr.width]="def().width"
                [attr.height]="def().height"
                [attr.loading]="eager() ? 'eager' : 'lazy'"
                [attr.fetchpriority]="eager() ? 'high' : null"
                decoding="async"
            />
            <img
                class="public-shot-img public-shot-img--dark"
                [src]="darkSrc()"
                [alt]="def().alt"
                [attr.width]="def().width"
                [attr.height]="def().height"
                loading="lazy"
                decoding="async"
            />
        </figure>
    `
})
export class PublicScreenshotComponent {
    readonly shot = input.required<PublicScreenshotKey>();
    /** İlk ekrandaki (kahraman) görsel: tembel yükleme yok, yüksek öncelik. */
    readonly eager = input<boolean>(false);

    readonly def = computed(() => PUBLIC_SCREENSHOTS[this.shot()]);
    readonly lightSrc = computed(() => publicScreenshotSrc(this.def(), 'light'));
    readonly darkSrc = computed(() => publicScreenshotSrc(this.def(), 'dark'));
}
