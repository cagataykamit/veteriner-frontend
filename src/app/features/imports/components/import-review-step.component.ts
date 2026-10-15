import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { map, Observable } from 'rxjs';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import type {
    ImportBatchDto,
    ImportFileFormat,
    ImportPreviewDto,
    ImportRowDto,
    ImportRowsQuery,
    ImportTable,
    ImportUnmappedValueDto,
    ImportValueKind
} from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import {
    IMPORT_SEVERITY_LABELS,
    IMPORT_VALUE_KIND_LABELS,
    importErrorCode,
    importErrorMessage,
    importIssueLabel,
    importSeverityTag
} from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_TABLE_LABELS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { IMPORT_VALUE_SKIP, type ImportValueChoices, valueChoiceKey } from '@/app/features/imports/utils/import-value-mapping.utils';
import { PetColorsService } from '@/app/features/pets/services/pet-colors.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/features/vaccine-definitions/services/vaccine-definitions.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

const ROW_PAGE_SIZE = 25;

/** Adım 3: kuru çalıştırma sonucu. Hiçbir kayıt oluşmamıştır; sayılar, sorunlar ve eşlenemeyen değerler burada görülür. */
@Component({
    selector: 'app-import-review-step',
    standalone: true,
    imports: [FormsModule, ButtonModule, MessageModule, Paginator, SelectModule, AppEmptyStateComponent, AppStatusTagComponent],
    template: `
        @if (preview(); as p) {
            @if (p.status === 'ValidationFailed' && p.blockers.length === 0) {
                <p-message severity="error" styleClass="w-full mb-4" role="alert">Doğrulama beklenmeyen bir sorun nedeniyle tamamlanamadı; hiçbir kayıt oluşturulmadı. Yeniden doğrulayın; sorun sürerse destek ekibiyle iletişime geçin.</p-message>
            } @else if (p.status === 'ValidationFailed') {
                <p-message severity="error" styleClass="w-full mb-4" role="alert">Doğrulama tamamlanamadı. Aşağıdaki nedenleri giderip yeniden doğrulayın.</p-message>
            } @else if (p.canCommit) {
                <p-message severity="success" styleClass="w-full mb-4">Doğrulama tamamlandı. Henüz hiçbir kayıt oluşturulmadı; aşağıdaki sonucu inceleyip onay adımına geçebilirsiniz.</p-message>
            } @else {
                <p-message severity="warn" styleClass="w-full mb-4">Doğrulama tamamlandı ancak aktarmaya geçmeden önce çözülmesi gereken konular var.</p-message>
            }

            @if (p.blockers.length) {
                <section class="mb-4">
                    <h6 class="mt-0 mb-2">Aktarmayı engelleyen nedenler</h6>
                    <ul class="m-0 pl-5">
                        @for (b of p.blockers; track b) {
                            <li>{{ issueLabel(b) }}</li>
                        }
                    </ul>
                </section>
            }

            <section class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                @for (t of summaryTables(p); track t.key) {
                    <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4">
                        <div class="font-medium mb-2">{{ t.label }} <span class="text-muted-color font-normal">({{ t.s.total }} satır)</span></div>
                        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 m-0 text-sm">
                            <dt class="text-muted-color">Oluşturulacak</dt><dd class="m-0 text-right">{{ t.s.willCreate }}</dd>
                            <dt class="text-muted-color">Mevcutla eşleşecek</dt><dd class="m-0 text-right">{{ t.s.willMatch }}</dd>
                            <dt class="text-muted-color">Atlanacak</dt><dd class="m-0 text-right">{{ t.s.willSkip }}</dd>
                            <dt class="text-muted-color">Uyarılı</dt><dd class="m-0 text-right">{{ t.s.warning }}</dd>
                            <dt class="text-muted-color">Hatalı</dt><dd class="m-0 text-right" [class.text-red-500]="t.s.error > 0">{{ t.s.error }}</dd>
                        </dl>
                    </div>
                }
            </section>

            @if (p.unmappedValues.length) {
                <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mb-4">
                    <h6 class="mt-0 mb-1">Eşlenemeyen değerler</h6>
                    <p class="text-sm text-muted-color mt-0">
                        Bu değerler sistemde bulunamadı. Mevcut bir tanıma eşleyin veya bu değerli satırları atlayın. Yeni tür ya da aşı tanımı oluşturmak için önce Ayarlar > Tanımlar bölümünü kullanın.
                    </p>
                    <div class="flex flex-col gap-3">
                        @for (u of p.unmappedValues; track u.kind + '|' + u.source) {
                            <div class="grid grid-cols-12 gap-2 items-center">
                                <div class="col-span-12 md:col-span-5 min-w-0">
                                    <app-status-tag [label]="kindLabels[u.kind]" [severity]="u.blocking ? 'danger' : 'secondary'" />
                                    <span class="font-medium break-words ml-2">{{ u.source }}</span>
                                    <span class="block text-xs text-muted-color">{{ u.rowCount }} satırda{{ u.blocking ? ' · aktarmayı engeller' : ' · eşlenmezse metin olarak aktarılır' }}</span>
                                </div>
                                <div class="col-span-12 md:col-span-7">
                                    <p-select
                                        [options]="catalogOptions(u)"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Karşılık seçin"
                                        [filter]="true"
                                        filterBy="label"
                                        [showClear]="true"
                                        [disabled]="!canManage()"
                                        [loading]="catalogLoading()[u.kind]"
                                        [ngModel]="choices()[choiceKey(u)] || null"
                                        (ngModelChange)="setChoice(u, $event)"
                                        styleClass="w-full"
                                        [ariaLabel]="u.source + ' için karşılık'"
                                    />
                                </div>
                            </div>
                        }
                    </div>
                    @if (canManage()) {
                        <div class="mt-4 flex flex-wrap items-center gap-2">
                            <p-button icon="pi pi-refresh" label="Eşlemeleri uygula ve yeniden doğrula" [disabled]="!hasChoices()" [loading]="busy()" (onClick)="applyValues.emit()" />
                            <small class="text-muted-color">Seçimler sayfa yenilenirse sıfırlanabilir; kaydedince yeniden doğrulanır.</small>
                        </div>
                    }
                </section>
            }

            @if (p.summary.vaccinations.total > 0) {
                <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mb-4">
                    <h6 class="mt-0 mb-2"><i class="pi pi-bell mr-2"></i>Aşı hatırlatmaları</h6>
                    <p class="m-0">
                        Bu aktarmadan <strong>{{ p.reminderImpact.vaccinationsWithFutureDueDate }}</strong> ileri tarihli sonraki aşı için hatırlatma e-postası üretilecekti
                        (toplam {{ p.reminderImpact.vaccinationsWithDueDate }} aşıda sonraki tarih var, {{ p.reminderImpact.vaccinationsWithPastDueDate }} tanesi geçmişte kaldığı için hatırlatma üretmez).
                        <strong>İçe aktarılan aşılar için hatırlatma varsayılan olarak KAPALIDIR;</strong> hiçbir e-posta kendiliğinden gitmez.
                    </p>
                    <p class="text-sm text-muted-color mb-0 mt-2">
                        Hatırlatmayı, aktarım bittikten sonra sayıyı görerek siz açabilirsiniz. Şu an {{ p.reminderImpact.reminderWindowDays }} gün içinde vadesi gelen ve e-postalı müşteriye ait
                        {{ p.reminderImpact.emailsWithinReminderWindow }} aşı var.
                        @if (!p.reminderImpact.tenantRemindersEnabled) {
                            Kurumunuzda aşı hatırlatması kapalı olduğundan açılsa bile e-posta gitmez.
                        }
                    </p>
                </section>
            }

            @if (p.issueCounts.length) {
                <section class="mb-4">
                    <h6 class="mt-0 mb-2">Sorun özeti</h6>
                    <div class="flex flex-wrap gap-2">
                        @for (i of p.issueCounts; track i.code + i.severity) {
                            <button
                                type="button"
                                class="rounded-border border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm bg-transparent text-color cursor-pointer text-left flex items-center gap-2"
                                [class.border-primary]="codeFilter() === i.code"
                                (click)="filterByCode(i.code)"
                                [attr.aria-pressed]="codeFilter() === i.code"
                            >
                                <app-status-tag [label]="severityLabels[i.severity]" [severity]="severityTag(i.severity)" />
                                {{ issueLabel(i.code) }} · {{ i.rowCount }} satır
                            </button>
                        }
                    </div>
                </section>
            }

            @if (!p.payloadPurged) {
                <section class="mb-4">
                    <div class="flex flex-wrap items-end justify-between gap-3 mb-3">
                        <h6 class="m-0">Satırlar</h6>
                        <div class="flex flex-wrap gap-2 items-end">
                            <p-select [options]="tableOptions" [ngModel]="tableFilter()" (ngModelChange)="setTable($event)" optionLabel="label" optionValue="value" placeholder="Tüm tablolar" [showClear]="true" styleClass="w-44" ariaLabel="Tablo süzgeci" />
                            <p-select [options]="statusOptions" [ngModel]="statusFilter()" (ngModelChange)="setStatus($event)" optionLabel="label" optionValue="value" placeholder="Tüm durumlar" [showClear]="true" styleClass="w-40" ariaLabel="Durum süzgeci" />
                            @if (codeFilter()) {
                                <p-button size="small" severity="secondary" icon="pi pi-times" [label]="issueLabel(codeFilter()!)" (onClick)="filterByCode(null)" />
                            }
                            @if (hasErrors(p)) {
                                <p-button size="small" severity="secondary" icon="pi pi-download" label="Hata raporu (Excel)" [loading]="reportBusy() === 'xlsx'" (onClick)="downloadReport('xlsx')" />
                                <p-button size="small" severity="secondary" icon="pi pi-download" label="CSV" [loading]="reportBusy() === 'csv'" (onClick)="downloadReport('csv')" />
                            }
                        </div>
                    </div>

                    @if (rowsError()) {
                        <p-message severity="error" styleClass="w-full" role="alert">{{ rowsError() }}</p-message>
                    } @else if (rowsLoading()) {
                        <p class="text-muted-color">Satırlar yükleniyor…</p>
                    } @else if (rows().length === 0) {
                        <app-empty-state message="Bu süzgece uyan satır yok." />
                    } @else {
                        <ul class="list-none p-0 m-0 flex flex-col gap-2">
                            @for (r of rows(); track r.table + r.rowNumber) {
                                <li class="rounded-border border border-surface-200 dark:border-surface-700 p-3">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-medium">{{ tableLabels[r.table] }} · satır {{ r.rowNumber }}</span>
                                        <app-status-tag [label]="rowStatusLabel(r)" [severity]="rowStatusSeverity(r)" />
                                        @if (actionLabel(r); as a) {
                                            <span class="text-sm text-muted-color">{{ a }}</span>
                                        }
                                    </div>
                                    @if (r.issues.length) {
                                        <ul class="m-0 mt-2 pl-5 text-sm">
                                            @for (i of r.issues; track i.code + i.field) {
                                                <li><span class="font-medium">{{ issueLabel(i.code, i.message) }}</span>@if (i.field) {<span class="text-muted-color"> ({{ i.field }})</span>}</li>
                                            }
                                        </ul>
                                    }
                                    <details class="mt-2 text-sm">
                                        <summary class="cursor-pointer text-muted-color">Dosyadaki satır</summary>
                                        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 mb-0">
                                            @for (kv of sourceEntries(r); track kv[0]) {
                                                <div class="min-w-0"><dt class="inline text-muted-color">{{ kv[0] }}: </dt><dd class="inline m-0 break-words">{{ kv[1] }}</dd></div>
                                            }
                                        </dl>
                                    </details>
                                </li>
                            }
                        </ul>
                        <p-paginator [rows]="pageSize" [first]="(page() - 1) * pageSize" [totalRecords]="totalRows()" (onPageChange)="onPage($event)" />
                    }
                </section>
            } @else {
                <p-message severity="info" styleClass="w-full mb-4">Satır verisi saklama süresi sonunda silindi; yalnızca sayılar görüntülenebilir.</p-message>
            }
        }
    `
})
export class ImportReviewStepComponent {
    private readonly imports = inject(ImportsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly vaccineService = inject(VaccineDefinitionsService);
    private readonly breedsService = inject(BreedsService);
    private readonly colorsService = inject(PetColorsService);

    readonly batch = input.required<ImportBatchDto>();
    readonly preview = input.required<ImportPreviewDto | null>();
    readonly canManage = input(false);
    readonly busy = input(false);
    readonly choices = model.required<ImportValueChoices>();
    readonly applyValues = output<void>();

    protected readonly pageSize = ROW_PAGE_SIZE;
    protected readonly tableLabels = IMPORT_TABLE_LABELS;
    protected readonly kindLabels = IMPORT_VALUE_KIND_LABELS;
    protected readonly severityLabels = IMPORT_SEVERITY_LABELS;
    protected readonly severityTag = importSeverityTag;
    protected readonly tableOptions = IMPORT_TABLES.map((t) => ({ value: t, label: IMPORT_TABLE_LABELS[t] }));
    protected readonly statusOptions = [
        { value: 'Error', label: 'Hatalı' },
        { value: 'Warning', label: 'Uyarılı' },
        { value: 'Valid', label: 'Geçerli' }
    ];

    protected readonly tableFilter = signal<ImportTable | null>(null);
    protected readonly statusFilter = signal<'Valid' | 'Warning' | 'Error' | null>(null);
    protected readonly codeFilter = signal<string | null>(null);
    protected readonly page = signal(1);
    protected readonly rows = signal<ImportRowDto[]>([]);
    protected readonly totalRows = signal(0);
    protected readonly rowsLoading = signal(false);
    protected readonly rowsError = signal<string | null>(null);
    protected readonly reportBusy = signal<ImportFileFormat | null>(null);

    protected readonly catalogs = signal<Partial<Record<ImportValueKind, SelectOption[]>>>({});
    protected readonly catalogLoading = signal<Partial<Record<ImportValueKind, boolean>>>({});
    protected readonly hasChoices = computed(() => Object.keys(this.choices()).length > 0);

    constructor() {
        // Önizleme yenilenince (ilk yükleme ve yeniden doğrulama) satırlar ve katalog seçenekleri de yenilenir.
        effect(() => {
            if (this.preview()) {
                untracked(() => {
                    this.page.set(1);
                    this.loadRows();
                    this.loadCatalogs();
                });
            }
        });
    }

    protected issueLabel = importIssueLabel;

    protected summaryTables(p: ImportPreviewDto) {
        return IMPORT_TABLES.filter((t) => p.summary[t].total > 0).map((t) => ({ key: t, label: IMPORT_TABLE_LABELS[t], s: p.summary[t] }));
    }

    protected hasErrors(p: ImportPreviewDto): boolean {
        return IMPORT_TABLES.some((t) => p.summary[t].error > 0);
    }

    protected choiceKey(u: ImportUnmappedValueDto): string {
        return valueChoiceKey(u.kind, u.source);
    }

    protected catalogOptions(u: ImportUnmappedValueDto): SelectOption[] {
        return [{ label: 'Bu değeri atla', value: IMPORT_VALUE_SKIP }, ...(this.catalogs()[u.kind] ?? [])];
    }

    protected setChoice(u: ImportUnmappedValueDto, target: string | null): void {
        const key = this.choiceKey(u);

        this.choices.update((cur) => {
            const next = { ...cur };

            if (target) {
                next[key] = target;
            } else {
                delete next[key];
            }

            return next;
        });
    }

    protected setTable(v: ImportTable | null): void {
        this.tableFilter.set(v);
        this.resetPage();
    }

    protected setStatus(v: 'Valid' | 'Warning' | 'Error' | null): void {
        this.statusFilter.set(v);
        this.resetPage();
    }

    protected filterByCode(code: string | null): void {
        this.codeFilter.set(this.codeFilter() === code ? null : code);
        this.resetPage();
    }

    protected onPage(e: PaginatorState): void {
        this.page.set((e.page ?? 0) + 1);
        this.loadRows();
    }

    protected rowStatusLabel(r: ImportRowDto): string {
        return r.validation.status === 'Error' ? 'Hatalı' : r.validation.status === 'Warning' ? 'Uyarılı' : r.validation.status === 'Valid' ? 'Geçerli' : 'Bekliyor';
    }

    protected rowStatusSeverity(r: ImportRowDto) {
        return r.validation.status === 'Error' ? 'danger' : r.validation.status === 'Warning' ? 'warn' : ('success' as const);
    }

    protected actionLabel(r: ImportRowDto): string | null {
        switch (r.validation.action) {
            case 'Create':
                return 'Oluşturulacak';
            case 'Match':
                return 'Mevcut kayıtla eşleşecek';
            case 'Skip':
                return 'Atlanacak';
            default:
                return null;
        }
    }

    protected sourceEntries(r: ImportRowDto): [string, string][] {
        return Object.entries(r.source ?? {}).map(([k, v]) => [k, v ?? ''] as [string, string]);
    }

    protected downloadReport(format: ImportFileFormat): void {
        this.reportBusy.set(format);
        this.imports.downloadErrorReport(this.batch().id, format).subscribe({
            next: (res) => {
                this.reportBusy.set(null);
                saveDownload(res, `vetinity-iceaktar-hatalar.${format}`);
            },
            error: (e: unknown) => {
                this.reportBusy.set(null);
                this.rowsError.set(importErrorMessage(e, 'Hata raporu indirilemedi.'));
            }
        });
    }

    private resetPage(): void {
        this.page.set(1);
        this.loadRows();
    }

    private loadRows(): void {
        const query: ImportRowsQuery = {
            page: this.page(),
            pageSize: ROW_PAGE_SIZE,
            table: this.tableFilter() ?? undefined,
            status: this.statusFilter() ?? undefined,
            code: this.codeFilter() ?? undefined
        };

        this.rowsLoading.set(true);
        this.rowsError.set(null);
        this.imports.getRows(this.batch().id, query).subscribe({
            next: (res) => {
                this.rows.set(res.items);
                this.totalRows.set(res.totalItems);
                this.rowsLoading.set(false);
            },
            error: (e: unknown) => {
                this.rows.set([]);
                this.rowsLoading.set(false);
                this.rowsError.set(
                    importErrorCode(e) === 'Imports.PayloadPurged' ? 'Satır verisi saklama süresi sonunda silindi.' : importErrorMessage(e, 'Satırlar yüklenemedi.')
                );
            }
        });
    }

    /** Eşlenemeyen değerlerin türlerine ait katalog listeleri bir kez yüklenir. */
    private loadCatalogs(): void {
        const kinds = new Set((this.preview()?.unmappedValues ?? []).map((u) => u.kind));

        for (const kind of kinds) {
            if (this.catalogs()[kind] || this.catalogLoading()[kind]) {
                continue;
            }

            this.catalogLoading.update((cur) => ({ ...cur, [kind]: true }));
            this.catalogSource(kind).subscribe({
                next: (options) => {
                    this.catalogs.update((cur) => ({ ...cur, [kind]: options }));
                    this.catalogLoading.update((cur) => ({ ...cur, [kind]: false }));
                },
                error: () => this.catalogLoading.update((cur) => ({ ...cur, [kind]: false }))
            });
        }
    }

    private catalogSource(kind: ImportValueKind): Observable<SelectOption[]> {
        switch (kind) {
            case 'species':
                return this.speciesService.getSpeciesList({ activeOnly: true }).pipe(map((list) => list.map((s) => ({ label: s.name, value: s.id }))));
            case 'vaccine':
                return this.vaccineService.getVaccineDefinitions().pipe(map((res) => res.items.map((v) => ({ label: v.name, value: v.id }))));
            case 'breed':
                return this.breedsService.getBreedList({ activeOnly: true }).pipe(map((list) => list.map((b) => ({ label: `${b.speciesName} · ${b.name}`, value: b.id }))));
            case 'color':
                return this.colorsService.getPetColors();
        }
    }
}
