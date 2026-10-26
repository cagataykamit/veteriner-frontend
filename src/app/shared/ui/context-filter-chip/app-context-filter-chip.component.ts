import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

/** Detay sayfasından gelen petId/clientId süzgecini gösterir; tek tıkla kaldırılır. */
@Component({
    selector: 'app-context-filter-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="inline-flex items-center gap-2 rounded-border border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-1 mb-3 text-sm" data-testid="context-filter-chip">
            <i class="pi pi-filter text-muted-color"></i>
            <span>{{ label() }}</span>
            <button type="button" class="p-0 border-none bg-transparent text-primary font-medium cursor-pointer" data-testid="context-filter-clear" (click)="clear.emit()">Süzgeci kaldır</button>
        </div>
    `
})
export class AppContextFilterChipComponent {
    readonly label = input.required<string>();
    readonly clear = output<void>();
}
