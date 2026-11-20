import { Component, computed, effect, inject, input, signal, untracked, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ReportPreferencesService, reportKeyFromRoute, type ReportSavedFilterDto } from '@/app/entities/report-preference/services/report-preferences.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';

/** Kayıtlı filtre adı üst sınırı (sözleşme §3; `ReportSavedFilter.MaxNameLength`). */
const MAX_NAME_LENGTH = 100;

/** İki filtre seti aynı mı (boş değerler yok sayılır, anahtar sırası önemsiz). */
function sameFilterValues(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
    const entries = (v: Readonly<Record<string, string>>) =>
        Object.entries(v)
            .filter(([, value]) => !!value)
            .sort(([x], [y]) => x.localeCompare(y));
    const left = entries(a);
    const right = entries(b);

    return left.length === right.length && left.every(([key, value], i) => key === right[i][0] && value === right[i][1]);
}

/** Kaydedilecek filtre setini veren ve kayıtlı seti ekrana uygulayan taraf (rapor liste durumu ya da ekran). */
export interface SavedFilterSource {
    savedFilterValues(): Record<string, string>;
    applySavedFilterValues(values: Readonly<Record<string, string>>): void;
}

/**
 * Kayıtlı filtreler (REPORT-004): seçilen kayıt uygulanır, ekrandaki filtre seti adla kaydedilir, seçili kayıt silinir.
 * Kayıtlar kullanıcıya özeldir; rapor anahtarı sayfa adresinden türer. Tarih aralığı kaydedilmez (`savedFilterValues`).
 * Rapor dışı ekranlar (takvim, talep listesi; APPT-026) aynı depoyu `filterKey` ile kullanır: `screens.<ekran>`.
 */
@Component({
    selector: 'app-report-saved-filters',
    standalone: true,
    imports: [FormsModule, ButtonModule, SelectModule, DialogModule, DialogFocusReturnDirective, InputTextModule, ConfirmDialogModule, FilterFieldComponent, ReadOnlyReasonDirective],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (reportKey()) {
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
                <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="busy() || ro.mutationBlocked()" appReadOnlyReason (click)="openSave()" data-testid="saved-filter-open-save">
                    <i class="p-button-icon pi pi-bookmark"></i>{{ copy.reportsSavedFilterSave }}
                </button>
            </div>
            @if (error(); as message) {
                <p class="text-danger text-sm mt-2 mb-0" role="alert">{{ message }}</p>
            }

            <p-dialog [header]="copy.reportsSavedFilterSave" [modal]="true" [dismissableMask]="!busy() && !nameChanged()" [style]="{ width: 'min(440px, 95vw)' }" [(visible)]="dialogVisible">
                <label for="reportSavedFilterName" class="block text-sm font-medium text-muted-color mb-2">{{ copy.reportsSavedFilterNameLabel }}</label>
                <input
                    id="reportSavedFilterName"
                    pInputText
                    class="w-full"
                    [maxlength]="maxNameLength"
                    [placeholder]="namePlaceholder()"
                    [ngModel]="nameInput()"
                    (ngModelChange)="nameInput.set($event)"
                    (keydown.enter)="save()"
                />
                <p class="text-sm text-muted-color mt-3 mb-0">{{ dialogHint() }}</p>
                @if (pendingIsEmpty()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-2 mb-0" role="status">{{ emptySetText() }}</p>
                }
                @if (dialogError(); as message) {
                    <p class="text-danger text-sm mt-2 mb-0" role="alert">{{ message }}</p>
                }
                <ng-template #footer>
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="busy()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
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
    readonly state = input.required<SavedFilterSource>();
    /** Rapor dışı ekranın kayıt anahtarı (`screens.…`); verilmezse rapor anahtarı sayfa adresinden türer. */
    readonly filterKey = input<string | null>(null);
    readonly namePlaceholder = input<string>(PANEL_COPY.reportsSavedFilterNamePlaceholder);
    /** Diyalogda neyin kaydedildiği (tarih/dönem kaydedilmez). */
    readonly dialogHint = input<string>(PANEL_COPY.reportsSavedFilterDialogHint);
    readonly emptySetText = input<string>(PANEL_COPY.reportsSavedFilterEmptySet);

    private readonly routeKey = reportKeyFromRoute(inject(Router).url);
    /** Kayıt anahtarı; ekran anahtarı yoksa ve Rapor Merkezi dışındaysa `null` (bileşen görünmez). */
    readonly reportKey = computed(() => this.filterKey() ?? this.routeKey);

    readonly savedFilters = signal<ReportSavedFilterDto[]>([]);
    readonly selectedId = signal<string | null>(null);
    readonly selected = computed(() => this.savedFilters().find((f) => f.id === this.selectedId()) ?? null);
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly nameInput = signal('');
    /** Açılıştaki ad; ad değiştiyse dışarı tıklama diyaloğu kapatmaz. */
    private readonly openedName = signal('');
    readonly nameChanged = computed(() => this.nameInput() !== this.openedName());
    readonly dialogError = signal<string | null>(null);
    /** Kaydedilecek filtre seti, diyalog açılırken alınır. */
    private readonly pending = signal<Record<string, string>>({});
    readonly pendingIsEmpty = computed(() => Object.keys(this.pending()).length === 0);
    readonly canSave = computed(() => !this.busy() && !this.pendingIsEmpty() && !!this.nameInput().trim() && !this.ro.mutationBlocked());

    /** Seçili kayıt ekranda uygulanmış görüldü; ancak bundan sonra ekran filtresinin ayrılması seçimi bırakır (uygulama adres üzerinden gecikebilir). */
    private appliedSeen = false;

    constructor() {
        // Ekrandaki filtreler seçili kayıttan ayrılınca (ör. "Filtreleri temizle") seçim bırakılır: seçili seçeneğe tıklamak
        // değişiklik yaymadığı için aynı kayıt aksi hâlde yeniden uygulanamaz.
        effect(() => {
            const saved = this.selected();

            if (!saved) {
                return;
            }

            if (sameFilterValues(this.state().savedFilterValues(), saved.filters)) {
                this.appliedSeen = true;
            } else if (this.appliedSeen) {
                untracked(() => this.selectedId.set(null));
            }
        });
    }

    ngOnInit(): void {
        const key = this.reportKey();

        if (!key) {
            return;
        }

        this.preferences.listSavedFilters(key).subscribe({
            next: (rows) => this.savedFilters.set(rows),
            error: () => this.savedFilters.set([])
        });
    }

    apply(id: string | null): void {
        this.appliedSeen = false;
        this.selectedId.set(id);
        const saved = this.selected();

        if (saved) {
            this.state().applySavedFilterValues(saved.filters);
        }
    }

    openSave(): void {
        this.pending.set(this.state().savedFilterValues());
        this.nameInput.set(this.selected()?.name ?? '');
        this.openedName.set(this.nameInput());
        this.dialogError.set(null);
        this.dialogVisible.set(true);
    }

    save(): void {
        const key = this.reportKey();

        if (!key || !this.canSave()) {
            return;
        }

        this.busy.set(true);
        this.dialogError.set(null);
        this.preferences.createSavedFilter(key, this.nameInput().trim(), this.pending()).subscribe({
            next: (created) => {
                this.busy.set(false);
                this.savedFilters.set(
                    [...this.savedFilters(), created].sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }))
                );
                this.appliedSeen = false;
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
