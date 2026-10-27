import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, chargeNumberValidator } from '@/app/features/charges/utils/charge-amount.utils';
import {
    EXAMINATION_TEMPLATE_LINES_MAX,
    EXAMINATION_TEMPLATE_NAME_MAX,
    EXAMINATION_TEMPLATE_TEXT_MAX,
    EXAMINATION_TEMPLATE_VISIT_REASON_MAX,
    type ExaminationTemplateDto,
    type ExaminationTemplateUpsertRequest
} from '@/app/features/examination-templates/models/examination-template.model';
import { ExaminationTemplateError, ExaminationTemplatesService, TEMPLATE_CONCURRENCY_CONFLICT_CODE } from '@/app/features/examination-templates/services/examination-templates.service';
import { templateHasText } from '@/app/features/examination-templates/utils/examination-template.utils';
import type { ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { isStockTrackedKind } from '@/app/features/inventory/utils/product-classification.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

export type ExaminationTemplateEditorMode = 'create' | 'edit' | 'copy';

type LineGroup = FormGroup<{ productId: FormControl<string>; quantity: FormControl<number | null> }>;

/** Şablonda en az bir metin veya satır olmalı; aynı ürün bir kez yer alır (sözleşme §1; sunucu da denetler). */
function templateContentValidator(g: AbstractControl): ValidationErrors | null {
    const v = g.value as { visitReason: string; findings: string; plan: string; lines: { productId: string }[] };
    const ids = v.lines.map((l) => l.productId).filter(Boolean);
    const errors: ValidationErrors = {};

    if (!templateHasText(v) && v.lines.length === 0) {
        errors['contentRequired'] = true;
    }

    if (new Set(ids).size !== ids.length) {
        errors['duplicateProduct'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
}

const MODE_HEADER: Record<ExaminationTemplateEditorMode, string> = {
    create: 'Yeni muayene şablonu',
    edit: 'Şablonu düzenle',
    copy: 'Kopyala ve düzenle'
};

/**
 * Muayene şablonu ekle / düzenle / kopyala (ADR-020 S4). Satır = katalog ürünü veya hizmet + miktar (stok birimi);
 * aşı ürünü satır olamaz (seçicide yok, sunucu da reddeder). Fiyat şablonda tutulmaz. Kopyalamada içerik yeni adla POST edilir.
 * Yetki ve sistem şablonu denetimi çağıran sayfadadır. Sürüm çakışmasında `conflict` ile pencere kapanır, sayfa listeyi yeniler.
 */
@Component({
    selector: 'app-examination-template-editor-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, MessageModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog [header]="header()" [modal]="true" [visible]="visible()" (visibleChange)="visible.set($event)" [closable]="!submitting()" [style]="{ width: 'min(48rem, 95vw)' }" [draggable]="false">
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (submitError()) {
                    <p-message severity="error" class="w-full" role="alert">{{ submitError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="tplName" class="block text-sm font-medium text-muted-color">Ad *</label>
                    <input id="tplName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" [maxlength]="nameMax" />
                    @if (form.controls.name.invalid && form.controls.name.touched) {
                        <small class="text-red-500">Ad zorunludur.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="tplVisitReason" class="block text-sm font-medium text-muted-color">Şikâyet</label>
                    <input id="tplVisitReason" pInputText class="w-full" type="text" formControlName="visitReason" [maxlength]="visitReasonMax" placeholder="Örn. Kulak kaşıntısı" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="tplFindings" class="block text-sm font-medium text-muted-color">Bulgu</label>
                    <textarea id="tplFindings" rows="4" class="w-full p-inputtext p-component" formControlName="findings" [attr.maxlength]="textMax" placeholder="Örn. Otoskopi: "></textarea>
                    <small class="text-muted-color">Sonuç yazmayan boş başlıklar önerilir; hekim muayenede doldurur.</small>
                </div>
                <div class="flex flex-col gap-1">
                    <label for="tplPlan" class="block text-sm font-medium text-muted-color">Plan</label>
                    <textarea id="tplPlan" rows="3" class="w-full p-inputtext p-component" formControlName="plan" [attr.maxlength]="textMax"></textarea>
                </div>

                <div data-testid="template-lines-editor">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span class="block text-sm font-medium text-muted-color">İşlem / ürün satırları</span>
                        @if (canPickProduct) {
                            <button pButton type="button" size="small" severity="secondary" data-testid="template-line-add" [disabled]="lines.length >= linesMax" (click)="addLine()"><i class="p-button-icon pi pi-plus"></i>Satır ekle</button>
                        }
                    </div>
                    <p class="text-sm text-muted-color mt-0 mb-3">Uygulanınca stoklu ürün stoktan düşer, hizmet ücret bekleyen kalem olur; fiyat o günkü ürün kartından gelir. Aşı, aşı kaydı ekranından girilir.</p>
                    @if (!canPickProduct) {
                        <p class="text-sm text-muted-color m-0">Ürün listesini görme yetkiniz olmadığı için satır eklenemez.</p>
                    } @else if (productsError()) {
                        <p class="text-sm text-red-500 m-0">{{ productsError() }}</p>
                    }
                    @for (g of lines.controls; track g; let i = $index) {
                        <div
                            class="grid grid-cols-12 gap-3 items-start rounded-border border p-3 mb-2"
                            [class.border-red-400]="g.controls.productId.value === errorProductId()"
                            [class.border-surface-200]="g.controls.productId.value !== errorProductId()"
                            data-testid="template-line-row"
                        >
                            <div class="col-span-12 md:col-span-7">
                                <label [attr.for]="'tpl-product-' + i" class="block text-xs font-medium text-muted-color mb-1">Ürün veya hizmet *</label>
                                <p-select
                                    [inputId]="'tpl-product-' + i"
                                    [formControl]="g.controls.productId"
                                    [options]="optionsFor(g)"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seçin"
                                    [filter]="true"
                                    filterBy="label"
                                    [loading]="loadingProducts()"
                                    appendTo="body"
                                    class="w-full"
                                />
                                @if (inactiveNote(g); as note) {
                                    <small class="text-amber-700 dark:text-amber-300 block">{{ note }}</small>
                                }
                            </div>
                            <div class="col-span-8 md:col-span-3">
                                <label [attr.for]="'tpl-qty-' + i" class="block text-xs font-medium text-muted-color mb-1">
                                    Miktar *
                                    @if (unitFor(g)) {
                                        <span> ({{ unitFor(g) }})</span>
                                    }
                                </label>
                                <input [id]="'tpl-qty-' + i" type="number" step="any" min="0" class="w-full p-inputtext p-component" [formControl]="g.controls.quantity" />
                                @if (g.controls.quantity.invalid && g.controls.quantity.touched) {
                                    <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı, en çok {{ quantityMax }}.</small>
                                }
                            </div>
                            <div class="col-span-4 md:col-span-2 flex md:pt-5 justify-end">
                                <button pButton type="button" iconOnly severity="danger" [text]="true" aria-label="Satırı sil" data-testid="template-line-remove" (click)="removeLine(i)"><i class="p-button-icon pi pi-trash"></i></button>
                            </div>
                        </div>
                    }
                    @if (lines.length >= linesMax) {
                        <small class="text-muted-color">En fazla {{ linesMax }} satır eklenebilir.</small>
                    }
                    @if (form.hasError('duplicateProduct')) {
                        <small class="text-red-500 block" role="alert">Aynı ürün bir kez yer alır; miktarı artırın.</small>
                    }
                </div>
                @if (form.hasError('contentRequired') && form.touched) {
                    <small class="text-red-500" role="alert">Şikâyet, bulgu, plan veya en az bir satır girin.</small>
                }

                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="form.invalid || submitting()" data-testid="template-save"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>
    `
})
export class ExaminationTemplateEditorDialogComponent {
    readonly visible = model(false);
    readonly mode = input<ExaminationTemplateEditorMode>('create');
    /** Düzenlenen veya kopyalanan şablon; yeni şablonda `null`. */
    readonly source = input<ExaminationTemplateDto | null>(null);
    readonly saved = output<ExaminationTemplateDto>();
    /** Şablon bu arada değişti (409): pencere kapanır, sayfa mesajı gösterip listeyi yeniler. */
    readonly conflict = output<string>();

    private readonly fb = inject(FormBuilder);
    private readonly templates = inject(ExaminationTemplatesService);
    private readonly productService = inject(ProductService);
    private readonly auth = inject(AuthService);

    readonly copy = PANEL_COPY;
    protected readonly nameMax = EXAMINATION_TEMPLATE_NAME_MAX;
    protected readonly visitReasonMax = EXAMINATION_TEMPLATE_VISIT_REASON_MAX;
    protected readonly textMax = EXAMINATION_TEMPLATE_TEXT_MAX;
    protected readonly linesMax = EXAMINATION_TEMPLATE_LINES_MAX;
    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;

    readonly canPickProduct = this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM);
    readonly header = computed(() => MODE_HEADER[this.mode()]);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Sunucunun reddettiği satırın ürünü (çerçeve kırmızı). */
    readonly errorProductId = signal<string | null>(null);
    readonly loadingProducts = signal(false);
    readonly productsError = signal<string | null>(null);
    private readonly products = signal<ProductListItemVm[]>([]);
    private productsLoaded = false;

    readonly form = this.fb.nonNullable.group(
        {
            name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(EXAMINATION_TEMPLATE_NAME_MAX)]],
            visitReason: ['', Validators.maxLength(EXAMINATION_TEMPLATE_VISIT_REASON_MAX)],
            findings: ['', Validators.maxLength(EXAMINATION_TEMPLATE_TEXT_MAX)],
            plan: ['', Validators.maxLength(EXAMINATION_TEMPLATE_TEXT_MAX)],
            lines: this.fb.array<LineGroup>([])
        },
        { validators: templateContentValidator }
    );
    readonly lines = this.form.controls.lines as FormArray<LineGroup>;

    /** Seçim değişince satır birimi/notu yeniden hesaplansın. */
    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

    /** Aktif ürün ve hizmetler; aşı satır olamaz. */
    private readonly catalogOptions = computed(() =>
        this.products()
            .filter((p) => p.kind !== 'Vaccine')
            .map((p) => {
                const sku = p.sku && p.sku !== '—' ? ` (${p.sku})` : '';

                return { value: p.id, label: `${p.name}${sku}${isStockTrackedKind(p.kind) ? '' : ' · Hizmet'}` };
            })
    );

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.reset());
            }
        });
        // Sunucu hatası (ör. pasif ürün satırı) içerik değişince eskimiş olur.
        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            this.submitError.set(null);
            this.errorProductId.set(null);
        });
    }

    private createLine(productId = '', quantity: number | null = null): LineGroup {
        return this.fb.group({
            productId: this.fb.nonNullable.control(productId, Validators.required),
            quantity: this.fb.control<number | null>(quantity, [Validators.required, chargeNumberValidator(CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS)])
        });
    }

    addLine(): void {
        if (this.lines.length < EXAMINATION_TEMPLATE_LINES_MAX) {
            this.lines.push(this.createLine());
        }
    }

    removeLine(index: number): void {
        this.lines.removeAt(index);
    }

    /** Katalogdaki aktif seçenekler; satır kataloğda olmayan (pasif) ürüne bağlıysa o ürün şablondaki adıyla seçili kalır. */
    optionsFor(g: LineGroup): { value: string; label: string }[] {
        const id = g.controls.productId.value;
        const options = this.catalogOptions();

        return id && !options.some((o) => o.value === id) ? [{ value: id, label: this.sourceLine(id)?.productName ?? id }, ...options] : options;
    }

    unitFor(g: LineGroup): string {
        this.formValue();
        const id = g.controls.productId.value;

        return id ? (this.products().find((p) => p.id === id)?.unit ?? this.sourceLine(id)?.unit ?? '') : '';
    }

    inactiveNote(g: LineGroup): string | null {
        const id = g.controls.productId.value;

        return id && this.sourceLine(id)?.productIsActive === false ? 'Ürün pasif; bu satırla şablon uygulanamaz. Satırı çıkarın veya ürünü etkinleştirin.' : null;
    }

    submit(): void {
        if (this.form.invalid || this.submitting()) {
            this.form.markAllAsTouched();

            return;
        }

        const source = this.source();
        const request = this.toRequest();

        this.submitting.set(true);
        this.submitError.set(null);
        const call = this.mode() === 'edit' && source ? this.templates.update(source.id, request, source.rowVersion) : this.templates.create(request);

        call.subscribe({
            next: (dto) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.saved.emit(dto);
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof ExaminationTemplateError && e.code === TEMPLATE_CONCURRENCY_CONFLICT_CODE) {
                    this.visible.set(false);
                    this.conflict.emit(e.message);

                    return;
                }

                if (e instanceof ExaminationTemplateError) {
                    this.submitError.set(e.withProductName((id) => this.productName(id)));
                    this.errorProductId.set(e.productId);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }

    private toRequest(): ExaminationTemplateUpsertRequest {
        const v = this.form.getRawValue();
        const text = (s: string) => s.trim() || null;

        return {
            name: v.name.trim(),
            visitReason: text(v.visitReason),
            findings: text(v.findings),
            plan: text(v.plan),
            lines: v.lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }))
        };
    }

    private reset(): void {
        const source = this.source();
        const mode = this.mode();

        this.submitError.set(null);
        this.errorProductId.set(null);
        this.lines.clear({ emitEvent: false });

        for (const l of source?.lines ?? []) {
            this.lines.push(this.createLine(l.productId, l.quantity), { emitEvent: false });
        }

        this.form.reset({
            name: source ? (mode === 'copy' ? `${source.name} (kopya)` : source.name) : '',
            visitReason: source?.visitReason ?? '',
            findings: source?.findings ?? '',
            plan: source?.plan ?? '',
            lines: (source?.lines ?? []).map((l) => ({ productId: l.productId, quantity: l.quantity }))
        });
        this.loadProducts();
    }

    private sourceLine(productId: string) {
        return this.source()?.lines.find((l) => l.productId === productId);
    }

    private productName(productId: string): string | null {
        return this.products().find((p) => p.id === productId)?.name ?? this.sourceLine(productId)?.productName ?? null;
    }

    private loadProducts(): void {
        if (!this.canPickProduct || this.productsLoaded || this.loadingProducts()) {
            return;
        }

        this.loadingProducts.set(true);
        this.productsError.set(null);
        this.productService.getProducts({ page: 1, pageSize: 200, isActive: true }).subscribe({
            next: (r) => {
                this.products.set(r.items);
                this.productsLoaded = true;
                this.loadingProducts.set(false);
            },
            error: (e: unknown) => {
                this.productsError.set(e instanceof Error ? e.message : 'Ürün listesi yüklenemedi.');
                this.loadingProducts.set(false);
            }
        });
    }
}
