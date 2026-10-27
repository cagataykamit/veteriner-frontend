import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { ExaminationTemplateApplyResultDto, ExaminationTemplateDto, ExaminationTemplateLineDto } from '@/app/features/examination-templates/models/examination-template.model';
import { EXAMINATION_CONCURRENCY_CONFLICT_CODE, EXAMINATION_FINALIZED_CODE, ExaminationTemplateError, ExaminationTemplatesService } from '@/app/features/examination-templates/services/examination-templates.service';
import { templateContentSummary, templateInactiveLineNames } from '@/app/features/examination-templates/utils/examination-template.utils';
import { isStockTrackedKind } from '@/app/entities/inventory/utils/product-classification.utils';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

const PICKER_PAGE_SIZE = 20;

/** Ön izlemede metin bölümleri; sıra muayene formuyla aynı. */
const TEXT_PREVIEW: readonly { field: 'visitReason' | 'findings' | 'plan'; label: string }[] = [
    { field: 'visitReason', label: 'Şikâyete eklenecek' },
    { field: 'findings', label: 'Bulguya eklenecek' },
    { field: 'plan', label: 'Plana eklenecek' }
];

/**
 * Muayeneye şablon uygulama (ADR-020 S4): aramalı liste → ön izleme (eklenecek metin + işlem/ürün satırları) → onay.
 * Metin sunucuda birleşir (mevcut içerik silinmez, zaten varsa tekrar eklenmez); satırlar her uygulamada yeniden yazılır.
 * Yetki ve durum (taslak, salt okunur kiracı) denetimi çağıran sayfadadır. Muayene sürümü çakışırsa veya muayene
 * kesinleşmişse `stale` ile sayfa muayeneyi yeniden okur; yeni `rowVersion` girdi olarak geri gelir.
 */
@Component({
    selector: 'app-examination-template-apply-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule, SearchInputComponent, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog header="Şablon uygula" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(44rem, 95vw)' }" [(visible)]="visible">
            @if (selected(); as t) {
                <div data-testid="template-preview">
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="submitting()" data-testid="template-back" (click)="clearSelection()">
                            ← Başka şablon
                        </button>
                        <span class="font-semibold text-lg mr-auto">{{ t.name }}</span>
                        @if (t.isSystem) {
                            <app-status-tag label="Sistem" severity="secondary" />
                        }
                    </div>

                    @if (textPreview().length > 0) {
                        @for (s of textPreview(); track s.label) {
                            <div class="mb-3">
                                <h6 class="mt-0 mb-1 text-sm text-muted-color">{{ s.label }}</h6>
                                <p class="m-0 whitespace-pre-wrap rounded-border border border-surface-200 dark:border-surface-700 p-2">{{ s.text }}</p>
                            </div>
                        }
                        <p class="text-xs text-muted-color mt-0 mb-3">Mevcut metin silinmez; şablon metni sona eklenir, muayenede zaten varsa tekrar eklenmez.</p>
                    }

                    @if (t.lines.length > 0) {
                        <h6 class="mt-0 mb-1 text-sm text-muted-color">Yazılacak işlem / ürün satırları</h6>
                        <ul class="list-none m-0 p-0 mb-3" data-testid="template-preview-lines">
                            @for (line of t.lines; track line.productId) {
                                <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0" data-testid="template-preview-line">
                                    <span class="font-medium flex-1 min-w-0 break-words" [class.text-muted-color]="!line.productIsActive">{{ line.productName }}</span>
                                    <span class="text-sm tabular-nums">{{ line.quantity }} {{ line.unit }}</span>
                                    <span class="text-sm text-muted-color">{{ lineEffect(line) }}</span>
                                    <span class="text-sm tabular-nums">{{ lineTotal(line) }}</span>
                                    @if (!line.productIsActive) {
                                        <app-status-tag label="Pasif ürün" severity="warn" />
                                    }
                                </li>
                            }
                        </ul>
                        <p class="text-xs text-muted-color mt-0 mb-3">Fiyatlar ürün kartının bugünkü fiyatıdır; ücret bekleyen kalem olarak eklenir.</p>
                    }

                    @if (inactiveLineNames().length > 0) {
                        <p class="text-red-500 text-sm mt-0 mb-3" role="alert" data-testid="template-inactive-lines">Pasif ürün içerdiği için uygulanamaz: {{ inactiveLineNames().join(', ') }}. Satırı şablondan çıkarın veya ürünü etkinleştirin.</p>
                    }
                    @if (reapplyWarning()) {
                        <div class="rounded-border border border-amber-400 p-3 mb-3" role="status" data-testid="template-reapply-warning">
                            <p class="m-0 text-sm"><strong>Bu şablon bu muayeneye az önce uygulandı.</strong> Tekrar uygularsanız metin çoğalmaz ama satırlar yeniden yazılır: ürünler stoktan yeniden düşer, yeni ücret bekleyen kalemler doğar.</p>
                        </div>
                    }
                </div>
            } @else {
                <div class="mb-3">
                    <app-search-input inputId="templateSearch" placeholder="Şablon adı…" ariaLabel="Şablon ara" [(value)]="searchInput" (searchRequested)="load()" />
                </div>
                @if (listError()) {
                    <p class="text-red-500 text-sm m-0" role="alert">{{ listError() }}</p>
                } @else if (loading() && templates().length === 0) {
                    <p class="text-muted-color text-sm m-0">Şablonlar yükleniyor…</p>
                } @else if (templates().length === 0) {
                    <p class="text-muted-color text-sm m-0" data-testid="template-empty">
                        {{ searchInput.trim() ? 'Aramaya uyan şablon yok.' : 'Tanımlı şablon yok. Ayarlar → Tanımlar → Muayene şablonları altından ekleyebilirsiniz.' }}
                    </p>
                } @else {
                    <ul class="list-none m-0 p-0" data-testid="template-list">
                        @for (t of templates(); track t.id) {
                            <li>
                                <button type="button" class="w-full text-left flex flex-wrap items-center gap-2 p-2 rounded-border border-none bg-transparent cursor-pointer hover:bg-emphasis" data-testid="template-option" (click)="select(t)">
                                    <span class="font-medium mr-auto">{{ t.name }}</span>
                                    <span class="text-sm text-muted-color">{{ contentSummary(t) }}</span>
                                    @if (t.isSystem) {
                                        <app-status-tag label="Sistem" severity="secondary" />
                                    }
                                </button>
                            </li>
                        }
                    </ul>
                    @if (totalItems() > templates().length) {
                        <p class="text-xs text-muted-color mt-2 mb-0">İlk {{ templates().length }} şablon gösteriliyor; aramayı daraltın.</p>
                    }
                }
            }

            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert" data-testid="template-apply-error">{{ submitError() }}</p>
            }

            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="close()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="!canSubmit() || submitting()" data-testid="template-apply-confirm" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Uygula</button>
            </ng-template>
        </p-dialog>
    `
})
export class ExaminationTemplateApplyDialogComponent {
    readonly visible = model(false);
    readonly examinationId = input.required<string>();
    /** Muayenenin güncel sürümü (`GET /examinations/{id}`); yoksa uygulanamaz. */
    readonly rowVersion = input<string | null>(null);
    readonly applied = output<{ template: ExaminationTemplateDto; result: ExaminationTemplateApplyResultDto }>();
    /** Muayene sürümü eskidi veya muayene kesinleşti: sayfa muayeneyi yeniden okumalı. */
    readonly stale = output<string>();

    private readonly templatesService = inject(ExaminationTemplatesService);

    searchInput = '';
    readonly templates = signal<ExaminationTemplateDto[]>([]);
    readonly totalItems = signal(0);
    readonly loading = signal(false);
    readonly listError = signal<string | null>(null);
    readonly selected = signal<ExaminationTemplateDto | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Bu sayfa oturumunda bu muayeneye uygulanan şablonlar (sunucuda muayeneye iz yok; sözleşme §10). */
    private readonly appliedTemplateIds = signal<ReadonlySet<string>>(new Set());

    readonly textPreview = computed(() => {
        const t = this.selected();

        return t ? TEXT_PREVIEW.map((s) => ({ label: s.label, text: t[s.field]?.trim() ?? '' })).filter((s) => !!s.text) : [];
    });
    readonly inactiveLineNames = computed(() => {
        const t = this.selected();

        return t ? templateInactiveLineNames(t) : [];
    });
    readonly reapplyWarning = computed(() => {
        const t = this.selected();

        return !!t && t.lines.length > 0 && this.appliedTemplateIds().has(t.id);
    });
    readonly canSubmit = computed(() => !!this.selected() && !!this.rowVersion() && !this.submitting() && this.inactiveLineNames().length === 0);

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.selected.set(null);
                    this.submitError.set(null);
                    this.searchInput = '';
                    this.load();
                });
            }
        });
        // Başka muayeneye geçilirse oturum izi o muayeneye ait değildir.
        effect(() => {
            this.examinationId();
            untracked(() => this.appliedTemplateIds.set(new Set()));
        });
    }

    load(): void {
        this.loading.set(true);
        this.listError.set(null);
        this.templatesService.list({ search: this.searchInput, page: 1, pageSize: PICKER_PAGE_SIZE }).subscribe({
            next: (r) => {
                this.templates.set(r.items);
                this.totalItems.set(r.totalItems);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.listError.set(e instanceof Error ? e.message : 'Şablonlar yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    select(t: ExaminationTemplateDto): void {
        this.submitError.set(null);
        this.selected.set(t);
    }

    clearSelection(): void {
        this.submitError.set(null);
        this.selected.set(null);
    }

    close(): void {
        this.visible.set(false);
    }

    readonly contentSummary = templateContentSummary;

    lineEffect(line: ExaminationTemplateLineDto): string {
        return isStockTrackedKind(line.productKind) ? 'Stoktan düşer' : 'Hizmet';
    }

    lineTotal(line: ExaminationTemplateLineDto): string {
        return line.currentUnitPrice > 0 ? formatMoney(line.currentUnitPrice * line.quantity, line.currency || 'TRY') : 'Bedelsiz';
    }

    onSubmit(): void {
        const template = this.selected();
        const rowVersion = this.rowVersion();

        if (!template || !rowVersion || !this.canSubmit()) {
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);
        this.templatesService.apply(this.examinationId(), template.id, rowVersion).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.appliedTemplateIds.update((ids) => new Set([...ids, template.id]));
                this.visible.set(false);
                this.applied.emit({ template, result });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (!(e instanceof ExaminationTemplateError)) {
                    this.submitError.set(e instanceof Error ? e.message : 'Şablon uygulanamadı.');

                    return;
                }

                const message = e.withProductName((id) => template.lines.find((l) => l.productId === id)?.productName);

                if (e.code === EXAMINATION_FINALIZED_CODE) {
                    this.visible.set(false);
                    this.stale.emit(message);

                    return;
                }

                this.submitError.set(message);

                if (e.code === EXAMINATION_CONCURRENCY_CONFLICT_CODE) {
                    this.stale.emit(message);
                } else if (e.code === 'ExaminationTemplates.Inactive' || e.code === 'ExaminationTemplates.NotFound') {
                    this.selected.set(null);
                    this.load();
                }
            }
        });
    }
}
