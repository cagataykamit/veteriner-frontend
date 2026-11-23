import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';

/** Telefonda arama yanındaki "Filtre (n)" düğmesi; geniş ekranda gizli. Liste başlığı ve rapor filtre çubuğu kullanır. */
@Component({
    selector: 'app-list-filter-toggle',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'sm:hidden shrink-0' },
    template: `
        @let f = filters();
        <button
            pButton
            type="button"
            severity="secondary"
            [outlined]="!f.open()"
            [attr.aria-expanded]="f.open()"
            [attr.aria-controls]="f.panelId"
            [attr.aria-label]="f.count() > 0 ? 'Filtre, ' + f.count() + ' etkin' : 'Filtre'"
            (click)="f.open.set(!f.open())"
            data-testid="list-filter-toggle"
        >
            <i class="p-button-icon pi pi-filter"></i>Filtre
            @if (f.count() > 0) {
                <span class="inline-grid place-items-center min-w-5 h-5 px-1 rounded-full text-xs font-semibold bg-primary text-primary-contrast tabular-nums">{{ f.count() }}</span>
            }
        </button>
    `
})
export class AppListFilterToggleComponent {
    readonly filters = input.required<AppListFiltersComponent>();
}
