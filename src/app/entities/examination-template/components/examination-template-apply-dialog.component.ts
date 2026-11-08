import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import type { ExaminationTemplateApplyResultDto, ExaminationTemplateDto, ExaminationTemplateLineDto } from '@/app/entities/examination-template/models/examination-template.model';
import { EXAMINATION_CONCURRENCY_CONFLICT_CODE, EXAMINATION_FINALIZED_CODE, ExaminationTemplateError, ExaminationTemplatesService } from '@/app/entities/examination-template/services/examination-templates.service';
import {
    templateApplyInitialChoices,
    templateApplyQuantityValid,
    templateApplyRequestLines,
    templateChargePreview,
    templateContentSummary,
    templateHasText,
    templateIncludedLines,
    templateInactiveLineNames,
    templateLineAmount,
    type TemplateApplyLineChoice
} from '@/app/entities/examination-template/utils/examination-template.utils';
import { CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS } from '@/app/entities/charge/utils/charge-amount.utils';
import { isStockTrackedKind } from '@/app/entities/inventory/utils/product-classification.utils';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

const PICKER_PAGE_SIZE = 20;

/** Ön izlemede uzun metin bölümleri; sıra muayene formuyla aynı. Şikâyet ayrı ele alınır (boşsa yazılır, doluysa eklenmez). */
const LINE_PREVIEW: readonly { field: 'findings' | 'plan'; label: string }[] = [
    { field: 'findings', label: 'Bulguya eklenecek' },
    { field: 'plan', label: 'Plana eklenecek' }
];

interface TextPreviewSection {
    label: string;
    text: string;
    /** Muayenenin şikâyeti dolu: şablonun şikâyeti gösterilir ama eklenmeyecek (sözleşme §7). */
    skipped: boolean;
}

/**
 * Muayeneye şablon uygulama (ADR-020 S4): aramalı liste → ön izleme (eklenecek metin + işlem/ürün satırları) → onay.
 * Metin sunucuda birleşir: şikâyet yalnız boşsa yazılır; bulgu ve plan satır satır sona eklenir, muayenede zaten olan satır
 * tekrar eklenmez. Satırlar her uygulamada yeniden yazılır. Satır bu uygulama için hariç tutulabilir, miktarı değiştirilebilir (EXAM-013;
 * şablon değişmez); fiyatlı pakette paket fiyatı sabit kalır.
 * Yetki ve durum (taslak, salt okunur kiracı) denetimi çağıran sayfadadır. Muayene sürümü çakışırsa veya muayene
 * kesinleşmişse `stale` ile sayfa muayeneyi yeniden okur; yeni `rowVersion` girdi olarak geri gelir.
 */
@Component({
    selector: 'app-examination-template-apply-dialog',
    standalone: true,
    imports: [FormsModule, DialogModule, ButtonModule, CheckboxModule, SearchInputComponent, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
                            <div class="mb-3" data-testid="template-preview-text">
                                <h6 class="mt-0 mb-1 text-sm text-muted-color">{{ s.label }}</h6>
                                <p class="m-0 whitespace-pre-wrap rounded-border border border-surface-200 dark:border-surface-700 p-2" [class.text-muted-color]="s.skipped" [class.line-through]="s.skipped">{{ s.text }}</p>
                                @if (s.skipped) {
                                    <p class="text-xs text-muted-color mt-1 mb-0" data-testid="template-preview-visit-reason-skipped">Muayenenin şikâyeti dolu olduğu için eklenmeyecek.</p>
                                }
                            </div>
                        }
                        <p class="text-xs text-muted-color mt-0 mb-3">Mevcut metin silinmez; bulgu ve plan satır satır sona eklenir, muayenede zaten olan satırlar tekrar eklenmez.</p>
                    }

                    @if (t.lines.length > 0) {
                        <h6 class="mt-0 mb-1 text-sm text-muted-color">Yazılacak işlem / ürün satırları</h6>
                        <p class="text-xs text-muted-color mt-0 mb-1">İşaretini kaldırdığınız satır bu uygulamada yazılmaz; miktarı yalnız bu muayene için değiştirebilirsiniz, şablon değişmez.</p>
                        <ul class="list-none m-0 p-0 mb-3" data-testid="template-preview-lines">
                            @for (line of t.lines; track line.productId; let i = $index) {
                                @let c = choice(line.productId);
                                <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0" data-testid="template-preview-line">
                                    <p-checkbox [inputId]="'tpl-apply-line-' + i" [binary]="true" [ngModel]="c.included" [disabled]="submitting()" (ngModelChange)="setIncluded(line.productId, $event)" data-testid="template-line-include" />
                                    <label [for]="'tpl-apply-line-' + i" class="font-medium flex-1 min-w-0 break-words cursor-pointer" [class.text-muted-color]="!line.productIsActive || !c.included" [class.line-through]="!c.included">{{ line.productName }}</label>
                                    <span class="inline-flex items-center gap-1">
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            class="p-inputtext p-component w-24 text-right tabular-nums"
                                            [value]="c.quantity ?? ''"
                                            [disabled]="!c.included || submitting()"
                                            [attr.aria-label]="line.productName + ' miktarı'"
                                            [attr.aria-invalid]="c.included && !quantityValid(c.quantity)"
                                            data-testid="template-line-quantity"
                                            (input)="setQuantity(line.productId, $event)"
                                        />
                                        <span class="text-sm">{{ line.unit }}</span>
                                    </span>
                                    <span class="text-sm text-muted-color">{{ lineEffect(line) }}</span>
                                    <span class="text-sm tabular-nums">{{ c.included ? lineTotal(line, c.quantity) : 'Hariç' }}</span>
                                    @if (!line.productIsActive) {
                                        <app-status-tag label="Pasif ürün" severity="warn" />
                                    }
                                    @if (c.included && !quantityValid(c.quantity)) {
                                        <small class="w-full text-red-500" data-testid="template-line-quantity-error">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı, en çok {{ quantityMax }}.</small>
                                    }
                                </li>
                            }
                        </ul>
                        @if (includedLines().length === 0) {
                            <p class="text-sm text-muted-color mt-0 mb-3" data-testid="template-no-lines-selected">{{ hasText() ? 'Hiç satır seçilmedi; yalnız metin uygulanır.' : 'Uygulanacak satır seçin.' }}</p>
                        }
                        @if (chargePreview(); as p) {
                            <div class="flex flex-wrap items-baseline justify-between gap-2 mb-1" data-testid="template-preview-total">
                                <span class="text-sm font-medium">{{ p.isPackage ? 'Paket fiyatı' : 'Toplam' }}</span>
                                <span class="font-semibold tabular-nums">{{ money(p.total) }}</span>
                            </div>
                            @if (p.isPackage) {
                                <p class="text-xs text-muted-color mt-0 mb-3">Tek ücret bekleyen kalem olarak eklenir; satırlar pakete dahildir (stoklu ürünler stoktan düşer, ayrı ücretlenmez). Satır hariç tutulsa ya da miktar değişse de paket fiyatı aynı kalır; gerekirse ücrete çevirirken düzenlenir. Seçili satırların bugünkü fiyat toplamı: {{ money(p.linesTotal) }}.</p>
                            } @else {
                                <p class="text-xs text-muted-color mt-0 mb-3">Fiyatlar ürün kartının bugünkü fiyatıdır; her fiyatlı satır ayrı ücret bekleyen kalem olarak eklenir.</p>
                            }
                        }
                    }

                    @if (inactiveLineNames().length > 0) {
                        <p class="text-red-500 text-sm mt-0 mb-3" role="alert" data-testid="template-inactive-lines">Pasif ürün içerdiği için uygulanamaz: {{ inactiveLineNames().join(', ') }}. Satırı hariç tutun veya ürünü etkinleştirin.</p>
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
                        {{ searchInput().trim() ? 'Aramaya uyan şablon yok.' : 'Tanımlı şablon yok. Ayarlar → Tanımlar → Muayene şablonları altından ekleyebilirsiniz.' }}
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
    /** Muayenenin mevcut şikâyeti; doluysa şablonun şikâyeti eklenmez ve ön izlemede böyle gösterilir. */
    readonly examinationVisitReason = input<string | null>(null);
    /** Gelişte hazırlanan şablon (CHECKIN-003): diyalog bu şablonun ön izlemesinde açılır; pasif/bulunamazsa liste gösterilir. */
    readonly preselectedTemplateId = input<string | null>(null);
    readonly applied = output<{ template: ExaminationTemplateDto; result: ExaminationTemplateApplyResultDto }>();
    /** Muayene sürümü eskidi veya muayene kesinleşti: sayfa muayeneyi yeniden okumalı. */
    readonly stale = output<string>();

    private readonly templatesService = inject(ExaminationTemplatesService);

    readonly searchInput = signal('');
    readonly templates = signal<ExaminationTemplateDto[]>([]);
    readonly totalItems = signal(0);
    readonly loading = signal(false);
    readonly listError = signal<string | null>(null);
    readonly selected = signal<ExaminationTemplateDto | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Bu sayfa oturumunda bu muayeneye uygulanan şablonlar (sunucuda muayeneye iz yok; sözleşme §10). */
    private readonly appliedTemplateIds = signal<ReadonlySet<string>>(new Set());

    readonly textPreview = computed<TextPreviewSection[]>(() => {
        const t = this.selected();

        if (!t) {
            return [];
        }

        const skipped = !!this.examinationVisitReason()?.trim();
        const visitReason: TextPreviewSection = { label: skipped ? 'Şablonun şikâyeti' : 'Şikâyete yazılacak', text: t.visitReason?.trim() ?? '', skipped };
        const lines = LINE_PREVIEW.map((s) => ({ label: s.label, text: t[s.field]?.trim() ?? '', skipped: false }));

        return [visitReason, ...lines].filter((s) => !!s.text);
    });
    /** Satır seçimi (EXAM-013): ürün kimliği → dahil/hariç ve miktar; şablon seçilince şablondaki hâliyle başlar. */
    readonly lineChoices = signal<Record<string, TemplateApplyLineChoice>>({});
    /** Uygulanacak satırlar (seçilen miktarla); toplam ve pasif ürün denetimi bunlardan yapılır. */
    readonly includedLines = computed(() => {
        const t = this.selected();

        return t ? templateIncludedLines(t, this.lineChoices()) : [];
    });
    readonly hasText = computed(() => {
        const t = this.selected();

        return !!t && templateHasText(t);
    });
    /** Yalnız dahil satırlar: hariç tutulan pasif ürün uygulamayı engellemez. */
    readonly inactiveLineNames = computed(() => {
        const t = this.selected();

        return t ? templateInactiveLineNames({ ...t, lines: this.includedLines() }) : [];
    });
    readonly reapplyWarning = computed(() => {
        const t = this.selected();

        return !!t && this.includedLines().length > 0 && this.appliedTemplateIds().has(t.id);
    });
    readonly canSubmit = computed(
        () =>
            !!this.selected() &&
            !!this.rowVersion() &&
            !this.submitting() &&
            this.inactiveLineNames().length === 0 &&
            this.includedLines().every((l) => templateApplyQuantityValid(l.quantity)) &&
            (this.includedLines().length > 0 || this.hasText())
    );

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.selected.set(null);
                    this.submitError.set(null);
                    this.searchInput.set('');
                    this.load();
                    this.loadPreselected();
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
        this.templatesService.list({ search: this.searchInput(), page: 1, pageSize: PICKER_PAGE_SIZE }).subscribe({
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

    /** Ön seçili şablon ayrıca okunur (listenin ilk sayfasında olmayabilir); kullanıcı bu arada seçim yaptıysa ezilmez. */
    private loadPreselected(): void {
        const id = this.preselectedTemplateId();

        if (!id) {
            return;
        }

        this.templatesService.getById(id).subscribe({
            next: (t) => {
                if (t.isActive && !this.selected() && this.visible()) {
                    this.select(t);
                }
            },
            error: () => undefined
        });
    }

    select(t: ExaminationTemplateDto): void {
        this.submitError.set(null);
        this.lineChoices.set(templateApplyInitialChoices(t));
        this.selected.set(t);
    }

    choice(productId: string): TemplateApplyLineChoice {
        return this.lineChoices()[productId] ?? { included: true, quantity: null };
    }

    setIncluded(productId: string, included: boolean): void {
        this.lineChoices.update((all) => ({ ...all, [productId]: { ...this.choice(productId), included } }));
    }

    setQuantity(productId: string, event: Event): void {
        const raw = (event.target as HTMLInputElement).value.trim();
        const quantity = raw === '' ? null : Number(raw);

        this.lineChoices.update((all) => ({ ...all, [productId]: { ...this.choice(productId), quantity: Number.isFinite(quantity) ? quantity : null } }));
    }

    readonly quantityValid = templateApplyQuantityValid;
    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;

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

    lineTotal(line: ExaminationTemplateLineDto, quantity: number | null): string {
        if (this.selected()?.packagePrice != null) {
            return 'Pakete dahil';
        }

        if (line.currentUnitPrice <= 0) {
            return 'Bedelsiz';
        }

        return quantity != null && templateApplyQuantityValid(quantity) ? formatMoney(templateLineAmount({ ...line, quantity }), line.currency || 'TRY') : '—';
    }

    /** Önizleme toplamı (EXAM-007): paket fiyatı veya seçili satırların toplamı; satır seçilmediyse ücret doğmaz (paket kalemi de). */
    readonly chargePreview = computed(() => {
        const t = this.selected();
        const lines = this.includedLines();

        return t && lines.length > 0 ? templateChargePreview({ ...t, lines }) : null;
    });

    readonly money = (amount: number) => formatMoney(amount);

    onSubmit(): void {
        const template = this.selected();
        const rowVersion = this.rowVersion();

        if (!template || !rowVersion || !this.canSubmit()) {
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);
        this.templatesService.apply(this.examinationId(), template.id, rowVersion, templateApplyRequestLines(template, this.lineChoices())).subscribe({
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
                } else if (e.code === 'ExaminationTemplates.Inactive' || e.code === 'ExaminationTemplates.NotFound' || e.code === 'ExaminationTemplates.LineNotInTemplate') {
                    this.selected.set(null);
                    this.load();
                }
            }
        });
    }
}
