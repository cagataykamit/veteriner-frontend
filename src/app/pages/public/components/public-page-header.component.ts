import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/** Ana sayfa dışı sayfa başlığı kalıbı (tasarım belgesi bölüm 4): teal üst etiket, h1, 1–2 cümle; açık teal yüzey, gradient yok. */
@Component({
    selector: 'app-public-page-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="public-soft-surface border-b border-[var(--public-border)]">
            <div class="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
                <p class="public-eyebrow m-0 mb-3">{{ eyebrow() }}</p>
                <h1 class="public-h1 m-0 max-w-3xl">{{ title() }}</h1>
                @if (lead()) {
                    <p class="public-lead m-0 mt-4 max-w-2xl">{{ lead() }}</p>
                }
            </div>
        </div>
    `
})
export class PublicPageHeaderComponent {
    readonly eyebrow = input.required<string>();
    readonly title = input.required<string>();
    readonly lead = input<string>('');
}
