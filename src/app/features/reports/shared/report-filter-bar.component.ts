import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { type Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import type { AnyReportListState } from '@/app/features/reports/shared/report-list-state';
import { ReportSavedFiltersComponent } from '@/app/entities/report-preference/components/report-saved-filters.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { DateInputLimit } from '@/app/shared/forms/date-input/date-input-limits.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppListFilterToggleComponent } from '@/app/shared/ui/list-filters/app-list-filter-toggle.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppTrialLimitNoticeComponent } from '@/app/shared/ui/trial-limit-notice/app-trial-limit-notice.component';

/** Rapora özgü filtre: `options` varsa açılır liste, yoksa tutar alanı. */
export interface ReportExtraFilter {
    readonly label: string;
    readonly options?: { label: string; value: string }[];
}

/**
 * Rapor sayfalarının ortak filtre kartı, tek desen (G-10): arama, tarih aralığı, klinik, rapora özgü filtre, altında kayıtlı
 * filtreler; eylem satırında solda birincil "Filtrele" ve metin "Temizle", sağda tek "Dışa aktar ▾" (PDF, Excel, CSV, varsa Yazdır).
 * Seçim anında uygulanır (yalnız tarih aralığı olan raporlar "Filtrele"yi bekler). Anlık görüntü raporlarında tarih yoktur.
 * Telefonda (G-02) filtre alanları "Filtre (n)" düğmesinin arkasındaki panelde, kapalıyken tek satır özet.
 * Müşteri/hasta seçicisi yoktur: arama müşteri ve hasta adında da arar, sonuç tablosu müşteriyi gösterir.
 */
@Component({
    selector: 'app-report-filter-bar',
    standalone: true,
    imports: [
        FormsModule,
        ButtonModule,
        MenuModule,
        SelectModule,
        InputNumberModule,
        FilterFieldComponent,
        AppListFiltersComponent,
        AppListFilterToggleComponent,
        DateInputComponent,
        SearchInputComponent,
        AppTrialLimitNoticeComponent,
        ReportSavedFiltersComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let s = state();
        @if (s.exportError(); as exportError) {
            @if (s.exportTrialLimited()) {
                <app-trial-limit-notice [message]="exportError" />
            } @else {
                <div class="card mb-4 border-red-200 dark:border-red-800">
                    <p class="text-danger m-0 text-sm" role="alert">{{ exportError }}</p>
                </div>
            }
        }

        <div class="card mb-4">
            @if (s.dateFilterError()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm m-0 mb-3" role="status">{{ s.dateFilterError() }}</p>
            }
            <p class="text-sm text-muted-color m-0 mb-4">{{ periodHint() }}</p>
            @if (!s.dateRangeOnly) {
                <div class="flex items-end gap-2">
                    <app-filter-field class="flex-1" [label]="copy.reportsFilterSearch" [labelFor]="idPrefix() + 'Search'" [active]="s.isSearchActive()" [badge]="activeBadges()" width="grow">
                        <app-search-input [inputId]="idPrefix() + 'Search'" [hint]="searchPlaceholder()" [(value)]="s.searchInput" (searchRequested)="s.applyFilters()" />
                    </app-filter-field>
                    <app-list-filter-toggle [filters]="filters" />
                </div>
            } @else {
                <div class="sm:hidden flex justify-end"><app-list-filter-toggle [filters]="filters" /></div>
            }
            <app-list-filters #filters [showClear]="false">
                @if (!s.snapshot) {
                    <app-filter-field [label]="copy.reportsFilterDateFrom" [labelFor]="idPrefix() + 'From'" [active]="s.isFromDateActive()" [badge]="activeBadges()" width="date">
                        <app-date-input [inputId]="idPrefix() + 'From'" type="date" min="1900-01-01" [limit]="dateLimit()" [ngModel]="s.fromDateInput" (ngModelChange)="s.fromDateInput = $event; s.scheduleApply()" />
                    </app-filter-field>
                    <app-filter-field [label]="copy.reportsFilterDateTo" [labelFor]="idPrefix() + 'To'" [active]="s.isToDateActive()" [badge]="activeBadges()" width="date">
                        <app-date-input [inputId]="idPrefix() + 'To'" type="date" min="1900-01-01" [limit]="dateLimit()" [ngModel]="s.toDateInput" (ngModelChange)="s.toDateInput = $event; s.scheduleApply()" />
                    </app-filter-field>
                }
                <app-filter-field [label]="copy.reportsFilterClinic" [labelId]="idPrefix() + 'ClinicLabel'" [active]="s.isClinicActive()" [badge]="activeBadges()" width="select">
                    <p-select
                        [ariaLabelledBy]="idPrefix() + 'ClinicLabel'"
                        [inputId]="idPrefix() + 'Clinic'"
                        [options]="s.clinicOptions()"
                        [ngModel]="s.clinicIdFilter"
                        (ngModelChange)="s.clinicIdFilter = $event; s.scheduleApply()"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.reportsClinicPanelDefault"
                        class="w-full"
                        [showClear]="true"
                    />
                </app-filter-field>
                @if (extraFilter(); as extra) {
                    @if (extra.options) {
                        <app-filter-field [label]="extra.label" [labelId]="idPrefix() + 'ExtraLabel'" [active]="s.isExtraActive()" [badge]="activeBadges()" width="select">
                            <p-select
                                [ariaLabelledBy]="idPrefix() + 'ExtraLabel'"
                                [inputId]="idPrefix() + 'Extra'"
                                [options]="extra.options"
                                [ngModel]="s.extraFilter"
                                (ngModelChange)="s.extraFilter = $event; s.scheduleApply()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                            />
                        </app-filter-field>
                    } @else {
                        <app-filter-field [label]="extra.label" [labelFor]="idPrefix() + 'Extra'" [active]="s.isExtraActive()" [badge]="activeBadges()" width="select">
                            <p-inputnumber
                                [inputId]="idPrefix() + 'Extra'"
                                [ngModel]="s.extraFilter === '' ? null : +s.extraFilter"
                                (ngModelChange)="s.extraFilter = $event == null ? '' : '' + $event; s.scheduleApply()"
                                mode="decimal"
                                locale="tr-TR"
                                [min]="0"
                                [maxFractionDigits]="2"
                                class="w-full"
                                inputStyleClass="w-full"
                            />
                        </app-filter-field>
                    }
                }
                <ng-content select="[extraFilters]" />
                <div class="basis-full">
                    <app-report-saved-filters [state]="s" />
                </div>
            </app-list-filters>
            <div class="mt-4 flex flex-wrap items-center gap-2" data-testid="report-filter-actions">
                <button pButton type="button" (click)="s.applyFilters()" [disabled]="s.loading()"><i class="p-button-icon pi pi-filter"></i>{{ copy.reportsApplyFilter }}</button>
                <button pButton type="button" severity="secondary" [text]="true" (click)="s.resetFilters()" [disabled]="s.loading()">{{ copy.buttonClear }}</button>
                @if (s.canExport() || printable()) {
                    <button
                        pButton
                        type="button"
                        severity="secondary"
                        [outlined]="true"
                        class="ml-auto"
                        aria-haspopup="menu"
                        [disabled]="s.exporting()"
                        (click)="openExport($event, exportMenu)"
                        data-testid="report-export"
                    >
                        <i class="p-button-icon" [class]="s.exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>{{ copy.reportsExport }}<i class="pi pi-chevron-down text-xs" aria-hidden="true"></i>
                    </button>
                    <p-menu #exportMenu [popup]="true" [model]="exportItems()" appendTo="body" />
                }
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
    /** Aramanın neye baktığı; kısa "Ara…" yer tutucusunun ipucu olur (R-06). */
    readonly searchPlaceholder = input.required<string>();
    /** Tarih seçicinin üst sınırı: geçmiş kayıtlar (`past`) veya planlanan kayıtlar (`planned`). */
    readonly dateLimit = input.required<DateInputLimit>();
    readonly extraFilter = input<ReportExtraFilter | null>(null);
    /** Etkin filtrelerde "Aktif" rozeti gösterilsin mi (sade ekranlarda kapatılır; telefondaki sayım yine çalışır). */
    readonly activeBadges = input(true);
    /** Sayfa yazdırılabilir: "Dışa aktar" menüsünde "Yazdır" (tarayıcı yazdırması sayfadadır). */
    readonly printable = input(false);
    /** "Yazdır" pasif (ör. yüklenirken ya da satır yokken). */
    readonly printDisabled = input(false);
    readonly print = output<void>();

    readonly exportItems = signal<MenuItem[]>([]);

    /** Menü açılırken o anki duruma göre kurulur: dışa aktarılacak satır yoksa ya da aynı biçim iniyorsa pasif. */
    openExport(event: Event, menu: Menu): void {
        const s = this.state();
        const noRows = !s.hasExportableRows();
        const items: MenuItem[] = s.canExport()
            ? [
                  { label: this.copy.reportsExportPdf, icon: 'pi pi-file-pdf', disabled: noRows || s.isExporting('pdf'), command: () => s.exportPdf() },
                  { label: this.copy.reportsExportXlsx, icon: 'pi pi-file-excel', disabled: noRows || s.isExporting('xlsx'), command: () => s.exportXlsx() },
                  { label: this.copy.reportsExportCsv, icon: 'pi pi-download', disabled: noRows || s.isExporting('csv'), command: () => s.exportCsv() }
              ]
            : [];

        if (this.printable()) {
            items.push({ label: this.copy.registerPrint, icon: 'pi pi-print', disabled: this.printDisabled(), command: () => this.print.emit() });
        }

        this.exportItems.set(items);
        menu.toggle(event);
    }
}
