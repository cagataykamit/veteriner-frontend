import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Liste kartının başlık satırı ve sayfanın tek başlığı (h1). Solda ad ve kayıt sayısı; sağda arama alanı (içerik)
 * ve `actions` ile işaretli düğmeler (Temizle, birincil "Yeni …"); dar ekranda sağ blok alta iner.
 * Sekmeli bölümlerin liste sayfalarında ayrı sayfa başlığı ve kategori satırı yoktur; bağlamı sekme çubuğu verir.
 */
@Component({
    selector: 'app-list-header',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
            <div class="min-w-0">
                <h1 class="m-0 text-xl leading-normal">{{ title() }}</h1>
                <ng-content select="[hint]" />
                @if (count()) {
                    <span class="text-sm text-muted-color whitespace-nowrap">{{ count() }} kayıt</span>
                }
            </div>
            <div class="flex flex-col sm:flex-row sm:justify-end gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-3xl">
                <ng-content />
                <div class="flex flex-wrap gap-2 shrink-0">
                    <ng-content select="[actions]" />
                </div>
            </div>
        </div>
    `
})
export class AppListHeaderComponent {
    readonly title = input.required<string>();
    /** Sıfır ya da verilmemişse sayı satırı gösterilmez. */
    readonly count = input<number | null>();
}
