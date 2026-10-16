import { Component, input } from '@angular/core';

/**
 * Ekran görüntüsü yer tutucu (WEB-005 gelene kadar): gerçek görselle aynı oran ve çerçeve, açıkça "ekran görüntüsü gelecek".
 * Görsel gelince aynı yerde `<img>` olur; `label` o görselin `alt` metnidir.
 */
@Component({
    selector: 'app-public-screenshot-placeholder',
    standalone: true,
    template: `
        <figure
            class="public-screenshot-frame m-0 flex flex-col items-center justify-center gap-2 p-6 text-center"
            [style.aspect-ratio]="ratio()"
            role="img"
            [attr.aria-label]="'Ekran görüntüsü gelecek: ' + label()"
        >
            <i class="pi pi-image text-3xl text-[var(--public-accent)]" aria-hidden="true"></i>
            <figcaption class="text-sm font-semibold text-surface-700 dark:text-surface-200">Ekran görüntüsü gelecek</figcaption>
            <p class="m-0 max-w-sm text-xs text-muted-color">{{ label() }}</p>
        </figure>
    `
})
export class PublicScreenshotPlaceholderComponent {
    readonly label = input.required<string>();
    /** CSS `aspect-ratio`; masaüstü ekran için 16/10, telefon için 9/16. */
    readonly ratio = input<string>('16 / 10');
}
