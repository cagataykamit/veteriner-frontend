import { Component, computed, input } from '@angular/core';
import { mapExampleClinicSummaryToRows } from '@/app/features/example-clinic/data/example-clinic.mapper';
import type { ExampleClinicCounts } from '@/app/features/example-clinic/models/example-clinic-api.model';

/**
 * "Yüklenen örnek içerik" sayaçları (ADR-002): kayıt tamamlandı ekranı, abonelik kartı ve temizlik onayı aynı bileşeni kullanır.
 * Veri sentetiktir; işaret notu burada tek yerde yazılır.
 */
@Component({
    selector: 'app-example-clinic-summary',
    standalone: true,
    template: `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="example-clinic-summary">
            @for (row of rows(); track row.key) {
                <div class="rounded-lg bg-surface-100 dark:bg-surface-800 px-3 py-2" [attr.data-testid]="'example-clinic-count-' + row.key">
                    <div class="text-lg font-semibold text-surface-900 dark:text-surface-0 leading-tight">{{ row.count }}</div>
                    <div class="text-xs text-muted-color">{{ row.label }}</div>
                </div>
            }
        </div>
        @if (note()) {
            <p class="text-xs text-muted-color m-0 mt-3">Örnek veriler tamamen sentetiktir, gerçek müşteri verisi içermez ve kayıtlarda "ÖRNEK" olarak işaretlidir.</p>
        }
    `
})
export class ExampleClinicSummaryComponent {
    readonly summary = input.required<ExampleClinicCounts>();
    /** Sentetik veri notu; temizlik onayında/sonucunda gizlenir. */
    readonly note = input(true);

    readonly rows = computed(() => mapExampleClinicSummaryToRows(this.summary()));
}
