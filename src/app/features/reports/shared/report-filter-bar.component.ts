import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import type { AnyReportListState } from '@/app/features/reports/shared/report-list-state';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import type { DateInputLimit } from '@/app/shared/forms/date-input/date-input-limits.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';

export interface ReportExtraFilter {
    readonly label: string;
    readonly options: { label: string; value: string }[];
}

/** Rapor sayfalarının ortak süzgeç kartı: tarih aralığı, klinik, rapora özgü açılır süzgeç, müşteri, hayvan, arama ve dışa aktarma. */
@Component({
    selector: 'app-report-filter-bar',
    standalone: true,
    imports: [
        FormsModule,
        ButtonModule,
        SelectModule,
        FilterFieldComponent,
        DateInputComponent,
        ClientSearchComponent,
        PetSearchComponent,
        SearchInputComponent
    ],
    template: `
        @let s = state();
        @if (s.exportError()) {
            <div class="card mb-4 border-red-200 dark:border-red-800">
                <p class="text-red-500 m-0 text-sm" role="alert">{{ s.exportError() }}</p>
            </div>
        }

        <div class="card mb-4">
            @if (s.dateFilterError()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm m-0 mb-3" role="status">{{ s.dateFilterError() }}</p>
            }
            <p class="text-sm text-muted-color m-0 mb-4">{{ periodHint() }}</p>
            <div class="flex flex-wrap items-end gap-3">
                <app-filter-field [label]="copy.reportsFilterDateFrom" [labelFor]="idPrefix() + 'From'" [active]="s.isFromDateActive()" width="date">
                    <app-date-input [inputId]="idPrefix() + 'From'" type="date" min="1900-01-01" [limit]="dateLimit()" [ngModel]="s.fromDateInput" (ngModelChange)="s.fromDateInput = $event; s.scheduleApply()" />
                </app-filter-field>
                <app-filter-field [label]="copy.reportsFilterDateTo" [labelFor]="idPrefix() + 'To'" [active]="s.isToDateActive()" width="date">
                    <app-date-input [inputId]="idPrefix() + 'To'" type="date" min="1900-01-01" [limit]="dateLimit()" [ngModel]="s.toDateInput" (ngModelChange)="s.toDateInput = $event; s.scheduleApply()" />
                </app-filter-field>
                <app-filter-field [label]="copy.reportsFilterClinic" [labelId]="idPrefix() + 'ClinicLabel'" [active]="s.isClinicActive()" width="select">
                    <p-select
                        [ariaLabelledBy]="idPrefix() + 'ClinicLabel'"
                        [inputId]="idPrefix() + 'Clinic'"
                        [options]="s.clinicOptions()"
                        [ngModel]="s.clinicIdFilter"
                        (ngModelChange)="s.clinicIdFilter = $event; s.scheduleApply()"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.reportsClinicPanelDefault"
                        styleClass="w-full"
                        [showClear]="true" />
                </app-filter-field>
                @if (extraFilter(); as extra) {
                    <app-filter-field [label]="extra.label" [labelId]="idPrefix() + 'ExtraLabel'" [active]="s.isExtraActive()" width="select">
                        <p-select
                            [ariaLabelledBy]="idPrefix() + 'ExtraLabel'"
                            [inputId]="idPrefix() + 'Extra'"
                            [options]="extra.options"
                            [ngModel]="s.extraFilter"
                            (ngModelChange)="s.extraFilter = $event; s.scheduleApply()"
                            optionLabel="label"
                            optionValue="value"
                            [placeholder]="copy.filterPlaceholderAll"
                            styleClass="w-full"
                            [showClear]="true" />
                    </app-filter-field>
                }
                <app-filter-field [label]="copy.labelClient" [labelId]="idPrefix() + 'ClientLabel'" [active]="s.isClientFilterActive()" width="grow">
                    <app-client-search [inputId]="idPrefix() + 'Client'" [ngModel]="s.clientIdFilter" (ngModelChange)="s.onClientFilterChange($event)" />
                </app-filter-field>
                <app-filter-field [label]="copy.labelPet" [labelId]="idPrefix() + 'PetLabel'" [active]="s.isPetFilterActive()" width="grow">
                    <app-pet-search [inputId]="idPrefix() + 'Pet'" [requireClient]="false" [clientId]="s.clientIdFilter" [ngModel]="s.petIdFilter" (ngModelChange)="s.petIdFilter = $event; s.scheduleApply()" />
                </app-filter-field>
                <app-filter-field [label]="copy.reportsFilterSearch" [labelFor]="idPrefix() + 'Search'" [active]="s.isSearchActive()" width="grow">
                    <app-search-input [inputId]="idPrefix() + 'Search'" [placeholder]="searchPlaceholder()" [(value)]="s.searchInput" (search)="s.applyFilters()" />
                </app-filter-field>
                <div class="col-span-12 md:col-span-6 flex flex-wrap gap-2 justify-end">
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="s.resetFilters()" [disabled]="s.loading()" />
                    @if (s.canExport()) {
                        <p-button
                            [label]="copy.reportsExportXlsx"
                            icon="pi pi-file-excel"
                            severity="success"
                            (onClick)="s.exportXlsx()"
                            [loading]="s.isExporting('xlsx')"
                            [disabled]="s.loading() || s.exporting()"
                        />
                        <p-button
                            [label]="copy.reportsExportCsv"
                            icon="pi pi-download"
                            severity="help"
                            (onClick)="s.exportCsv()"
                            [loading]="s.isExporting('csv')"
                            [disabled]="s.loading() || s.exporting()"
                        />
                    }
                </div>
            </div>
        </div>
    `
})
export class ReportFilterBarComponent {
    readonly copy = PANEL_COPY;
    readonly state = input.required<AnyReportListState>();
    /** Alan kimliklerinin öneki (`apptRep` → `apptRepFrom`, `apptRepClinic`…). */
    readonly idPrefix = input.required<string>();
    readonly periodHint = input.required<string>();
    readonly searchPlaceholder = input.required<string>();
    /** Tarih seçicinin üst sınırı: geçmiş kayıtlar (`past`) veya planlanan kayıtlar (`planned`). */
    readonly dateLimit = input.required<DateInputLimit>();
    readonly extraFilter = input<ReportExtraFilter | null>(null);
}
