import { ChangeDetectionStrategy, Component, computed, contentChildren, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';

let nextPanelId = 0;

/**
 * Liste ve rapor ekranlarının filtre alanları (`app-filter-field`) için ortak kap (G-02): geniş ekranda tek satır, telefonda
 * "Filtre (n)" düğmesinin (`app-list-filter-toggle`) arkasında kartın içinde açılan panel. Kapalıyken etkin filtreler tek satırda
 * özetlenir ("Durum: Planlandı · Bitiş: 30.11.2026"). Seçim anında uygulanır (sayfanın kendi davranışı); kap yalnız gösterir.
 * Sayım ve özet alanların `active` değerinden gelir; varsayılan değerdeki alan sayılmaz. "Temizle" sayfanın `clear` olayıdır.
 */
@Component({
    selector: 'app-list-filters',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        @if (!open() && count() > 0) {
            <div class="sm:hidden mt-3 flex items-center gap-2 min-w-0" data-testid="list-filters-summary">
                <span class="flex-1 min-w-0 truncate text-sm text-muted-color" [attr.title]="summary()">{{ summary() }}</span>
                @if (showClear()) {
                    <button pButton type="button" [text]="true" size="small" class="shrink-0" (click)="clear.emit()">{{ copy.buttonClear }}</button>
                }
            </div>
        }
        <div [id]="panelId" class="mt-3 flex flex-wrap items-end gap-3" [class.max-sm:hidden]="!open()" data-testid="list-filters-panel">
            <ng-content />
            @if (showClear()) {
                <button pButton type="button" [text]="true" severity="secondary" class="max-sm:hidden" (click)="clear.emit()" data-testid="list-filters-clear">
                    <i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}
                </button>
                <div class="sm:hidden w-full flex items-center justify-between gap-2 pt-1">
                    <button pButton type="button" [text]="true" severity="secondary" [disabled]="count() === 0" (click)="clear.emit()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                    <button pButton type="button" severity="secondary" [outlined]="true" (click)="open.set(false)">Kapat</button>
                </div>
            } @else {
                <div class="sm:hidden w-full flex justify-end pt-1">
                    <button pButton type="button" severity="secondary" [outlined]="true" (click)="open.set(false)">Kapat</button>
                </div>
            }
        </div>
    `
})
export class AppListFiltersComponent {
    readonly copy = PANEL_COPY;
    /** "Temizle" bu kapta mı (rapor çubuğunda eylem satırında olduğu için kapatılır). */
    readonly showClear = input(true);
    readonly clear = output<void>();

    /** Telefonda panel açık mı (geniş ekranda alanlar hep görünür). */
    readonly open = signal(false);
    readonly panelId = `listFilters${++nextPanelId}`;

    private readonly fields = contentChildren(FilterFieldComponent, { descendants: true });
    private readonly activeFields = computed(() => this.fields().filter((f) => f.active()));
    readonly count = computed(() => this.activeFields().length);
    readonly summary = computed(() => this.activeFields().map((f) => f.summaryText()).join(' · '));
}
