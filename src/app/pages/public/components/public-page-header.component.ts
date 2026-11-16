import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Ana sayfa dışı sayfa başlığı kalıbı (tasarım belgesi bölüm 4): ortalı; nane tonunda etiket, h1, 1–2 cümle, arkada iki yumuşak
 * ton lekesi. Altına sayfaya özgü kısa öğe (ör. günün durakları) içerik olarak verilebilir.
 */
@Component({
    selector: 'app-public-page-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="ps-page-hero">
            <span class="ps-blob ps-blob--a ps-tone-mint" aria-hidden="true"></span>
            <span class="ps-blob ps-blob--b ps-tone-sun" aria-hidden="true"></span>
            <div class="ps-wrap relative">
                <p class="public-eyebrow ps-tone-mint"><i class="pi pi-heart-fill" aria-hidden="true"></i>{{ eyebrow() }}</p>
                <h1 class="public-h1">{{ title() }}</h1>
                @if (lead()) {
                    <p class="ps-hero-lead">{{ lead() }}</p>
                }
                <ng-content />
            </div>
        </div>
    
    `
})
export class PublicPageHeaderComponent {
    readonly eyebrow = input.required<string>();
    readonly title = input.required<string>();
    readonly lead = input<string>('');
}
