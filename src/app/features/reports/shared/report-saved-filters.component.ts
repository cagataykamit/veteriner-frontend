import { Component, computed, inject, input, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { AnyReportListState } from '@/app/features/reports/shared/report-list-state';
import { ReportPreferencesService, reportKeyFromRoute, type ReportSavedFilterDto } from '@/app/features/reports/shared/report-preferences.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/** Kayıtlı filtre adı üst sınırı (sözleşme §3; `ReportSavedFilter.MaxNameLength`). */
const MAX_NAME_LENGTH = 100;

/**
 * Kayıtlı filtreler (REPORT-004): seçilen kayıt uygulanır, ekrandaki filtre seti adla kaydedilir, seçili kayıt silinir.
 * Kayıtlar kullanıcıya özeldir; rapor anahtarı sayfa adresinden türer. Tarih aralığı kaydedilmez (`savedFilterValues`).
 */
@Component({
    selector: 'app-report-saved-filters',
    standalone: true,
    imports: [FormsModule, ButtonModule, SelectModule, DialogModule, InputTextModule, ConfirmDialogModule, FilterFieldComponent],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (reportKey) {
            <div class="flex flex-wrap items-end gap-2" data-testid="report-saved-filters">
                <app-filter-field [label]="copy.reportsSavedFilters" labelId="reportSavedFiltersLabel" width="select">
                    <p-select
                        ariaLabelledBy="reportSavedFiltersLabel"
                        inputId="reportSavedFilters"
                        [options]="savedFilters()"
                        optionLabel="name"
                        optionValue="id"
                        [ngModel]="selectedId()"
                        (ngModelChange)="apply($event)"
                        [placeholder]="copy.reportsSavedFiltersPlaceholder"
                        [disabled]="savedFilters().length === 0"
                        [showClear]="true"
                        class="w-full"
                    />
                </app-filter-field>
                @if (selected(); as current) {
                    <button
                        pButton
                        type="button"
                        severity="danger"
                        [text]="true"
                        [attr.aria-label]="copy.reportsSavedFilterDelete + ': ' + current.name"
                        [title]="copy.reportsSavedFilterDelete"
                        [disabled]="busy() || ro.mutationBlocked()"
                        (click)="confirmDelete(current)"
                        data-testid="saved-filter-delete"
                    >
                        <i class="p-button-icon pi pi-trash"></i>
                    </button>
                }
                <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busy() || ro.mutationBlocked()" (click)="openSave()" data-testid="saved-filter-open-save">
                    <i class="p-button-icon pi pi-bookmark"></i>{{ copy.reportsSavedFilterSave }}
                </button>
            </div>
            @if (error(); as message) {
                <p class="text-red-500 text-sm mt-2 mb-0" role="alert">{{ message }}</p>
            }

            <p-dialog [header]="copy.reportsSavedFilterSave" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(440px, 95vw)' }" [(visible)]="dialogVisible">
                <label for="reportSavedFilterName" class="block text-sm font-medium text-muted-color mb-2">{{ copy.reportsSavedFilterNameLabel }}</label>
                <input
                    id="reportSavedFilterName"
                    pInputText
                    class="w-full"
                    [maxlength]="maxNameLength"
                    [placeholder]="copy.reportsSavedFilterNamePlaceholder"
                    [ngModel]="nameInput()"
                    (ngModelChange)="nameInput.set($event)"
                    (keydown.enter)="save()"
                />
                <p class="text-sm text-muted-color mt-3 mb-0">{{ copy.reportsSavedFilterDialogHint }}</p>
                @if (pendingIsEmpty()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-2 mb-0" role="status">{{ copy.reportsSavedFilterEmptySet }}</p>
                }
                @if (dialogError(); as message) {
                    <p class="text-red-500 text-sm mt-2 mb-0" role="alert">{{ message }}</p>
                }
                <ng-template #footer>
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="busy()"><i class="p-button-icon pi pi-times"></i>İptal</button>
                    <button pButton type="button" [disabled]="!canSave()" (click)="save()" data-testid="saved-filter-save">
                        <i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet
                    </button>
                </ng-template>
            </p-dialog>
            <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
        }
    `
})
export class ReportSavedFiltersComponent implements OnInit {
    private readonly preferences = inject(ReportPreferencesService);
    private readonly confirmation = inject(ConfirmationService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly maxNameLength = MAX_NAME_LENGTH;
    readonly state = input.required<AnyReportListState>();

    /** Sayfa adresinden türeyen rapor anahtarı; Rapor Merkezi dışında `null` (bileşen görünmez). */
    readonly reportKey = reportKeyFromRoute(inject(Router).url);

    readonly savedFilters = signal<readonly ReportSavedFilterDto[]>([]);
    readonly selectedId = signal<string | null>(null);
    readonly selected = computed(() => this.savedFilters().find((f) => f.id === this.selectedId()) ?? null);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly nameInput = signal('');
    readonly dialogError = signal<string | null>(null);
    /** Kaydedilecek filtre seti, diyalog açılırken alınır. */
    private readonly pending = signal<Record<string, string>>({});
    readonly pendingIsEmpty = computed(() => Object.keys(this.pending()).length === 0);
    readonly canSave = computed(() => !this.busy() && !this.pendingIsEmpty() && !!this.nameInput().trim() && !this.ro.mutationBlocked());

    ngOnInit(): void {
        if (!this.reportKey) {
            return;
        }

        this.preferences.listSavedFilters(this.reportKey).subscribe({
            next: (rows) => this.savedFilters.set(rows),
            error: () => this.savedFilters.set([])
        });
    }

    apply(id: string | null): void {
        this.selectedId.set(id);
        const saved = this.selected();

        if (saved) {
            this.state().applySavedFilterValues(saved.filters);
        }
    }

    openSave(): void {
        this.pending.set(this.state().savedFilterValues());
        this.nameInput.set(this.selected()?.name ?? '');
        this.dialogError.set(null);
        this.dialogVisible.set(true);
    }

    save(): void {
        if (!this.reportKey || !this.canSave()) {
            return;
        }

        this.busy.set(true);
        this.dialogError.set(null);
        this.preferences.createSavedFilter(this.reportKey, this.nameInput().trim(), this.pending()).subscribe({
            next: (created) => {
                this.busy.set(false);
                this.savedFilters.set(
                    [...this.savedFilters(), created].sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }))
                );
                this.selectedId.set(created.id);
                this.dialogVisible.set(false);
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.dialogError.set(panelHttpFailureMessage(err, PANEL_COPY.reportsSavedFilterFailed));
            }
        });
    }

    confirmDelete(saved: ReportSavedFilterDto): void {
        this.confirmation.confirm({
            header: PANEL_COPY.reportsSavedFilterDelete,
            message: `"${saved.name}" ${PANEL_COPY.reportsSavedFilterDeleteConfirm}`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sil',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.delete(saved)
        });
    }

    delete(saved: ReportSavedFilterDto): void {
        this.busy.set(true);
        this.error.set(null);
        this.preferences.deleteSavedFilter(saved.id).subscribe({
            next: () => {
                this.busy.set(false);
                this.savedFilters.set(this.savedFilters().filter((f) => f.id !== saved.id));
                this.selectedId.set(null);
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(panelHttpFailureMessage(err, PANEL_COPY.reportsSavedFilterFailed));
            }
        });
    }
}
