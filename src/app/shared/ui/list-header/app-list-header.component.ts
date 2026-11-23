import { ChangeDetectionStrategy, Component, contentChild, input } from '@angular/core';
import { AppListFilterToggleComponent } from '@/app/shared/ui/list-filters/app-list-filter-toggle.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';

/**
 * Liste kartının başlık satırı ve sayfanın tek başlığı (h1). Solda ad ve kayıt sayısı; sağda arama alanı (içerik)
 * ve `actions` ile işaretli düğmeler (birincil "Yeni …"). Filtre alanları `app-list-filters` içinde başlığın altına yansıtılır.
 * Telefonda (G-02): 1. satır ad, sayı ve eylemler; 2. satır arama ve "Filtre (n)"; filtreler kartın içinde açılan panelde,
 * kapalıyken tek satır özet. Geniş ekranda düzen değişmez.
 * Sekmeli bölümlerin liste sayfalarında ayrı sayfa başlığı ve kategori satırı yoktur; bağlamı sekme çubuğu verir.
 */
@Component({
    selector: 'app-list-header',
    standalone: true,
    imports: [AppListFilterToggleComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 sm:flex sm:flex-col sm:items-stretch xl:flex-row xl:items-end xl:justify-between sm:gap-3">
            <div class="min-w-0 max-sm:col-start-1 max-sm:row-start-1">
                <h1 class="m-0 text-xl! font-semibold! leading-normal">{{ title() }}</h1>
                <ng-content select="[hint]" />
                @if (count()) {
                    <span class="text-sm text-muted-color whitespace-nowrap">{{ count() }} kayıt</span>
                }
            </div>
            <div class="contents sm:flex sm:flex-row sm:justify-end sm:gap-3 sm:items-end sm:w-full xl:w-auto xl:min-w-[22rem] xl:max-w-3xl" data-testid="list-header-tools">
                <div class="contents" [class]="filters() ? 'max-sm:*:col-start-1' : 'max-sm:*:col-span-2'">
                    <ng-content />
                </div>
                @if (filters(); as f) {
                    <app-list-filter-toggle class="max-sm:col-start-2 max-sm:self-end" [filters]="f" />
                }
                <div class="flex flex-wrap justify-end gap-2 shrink-0 max-sm:col-start-2 max-sm:row-start-1 empty:hidden" data-testid="list-header-actions">
                    <ng-content select="[actions]" />
                </div>
            </div>
        </div>
        <ng-content select="app-list-filters" />
    `
})
export class AppListHeaderComponent {
    readonly title = input.required<string>();
    /** Sıfır ya da verilmemişse sayı satırı gösterilmez. */
    readonly count = input<number | null>();

    protected readonly filters = contentChild(AppListFiltersComponent);
}
