import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '@/app/core/auth/auth.service';
import { SALES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ProductStockBatchesVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { SaleReceiptComponent } from '@/app/features/sales/components/sale-receipt.component';
import type { SalePaymentMethodApi } from '@/app/features/sales/models/sale-api.model';
import type { CreateSaleResultVm, SaleProductVm } from '@/app/features/sales/models/sale-vm.model';
import { SaleProductSearchService } from '@/app/features/sales/services/sale-product-search.service';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { saleBatchGuide, saleBatchOptions } from '@/app/features/sales/utils/sale-batch-guide.utils';
import {
    type CartLine,
    type CartPaymentInput,
    cartLineAmount,
    cartLineError,
    cartRequestError,
    cartTotal,
    effectivePaymentAmount,
    newCartLine,
    paymentError,
    pickScannedProduct,
    SALE_MAX_LINES,
    type SalePaymentMode,
    toCreateSaleRequest
} from '@/app/features/sales/utils/sale-cart.utils';
import { printSaleReceipt } from '@/app/features/sales/utils/sale-receipt-print.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';

type BatchState = { status: 'loading' } | { status: 'ready'; info: ProductStockBatchesVm } | { status: 'error'; message: string };

const METHOD_OPTIONS: { label: string; value: SalePaymentMethodApi }[] = [
    { label: 'Nakit', value: 'Cash' },
    { label: 'Kart', value: 'Card' },
    { label: 'Havale / EFT', value: 'Transfer' }
];

const MODE_OPTIONS: { label: string; value: SalePaymentMode }[] = [
    { label: 'Tam ödeme', value: 'full' },
    { label: 'Kısmi ödeme', value: 'partial' },
    { label: 'Veresiye', value: 'credit' }
];

function numberFromInput(event: Event): number | null {
    const v = (event.target as HTMLInputElement).valueAsNumber;

    return Number.isFinite(v) ? v : null;
}

/**
 * Hızlı satış (`Sales.Create`, ADR-016/017): arama/okuyucu odaklı sepet. Enter barkod/SKU eşleşmesini doğrudan sepete ekler,
 * Ctrl+Enter satışı tamamlar. Müşteri seçilmezse Peşin müşteri (tam ödeme zorunlu). `requestId` sepet başına bir kez üretilir;
 * hata sonrası aynı kimlikle yeniden gönderim iki satış oluşturmaz.
 */
@Component({
    selector: 'app-sale-new-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, ButtonModule, SelectModule, SelectButtonModule, ClientSearchComponent, AppPageHeaderComponent, SaleReceiptComponent, MoneyPipe],
    host: { '(keydown.control.enter)': 'submit()' },
    template: `
        <app-page-header title="Hızlı satış" description="Ürünü okutun ya da arayın; Enter ile sepete ekleyin, Ctrl+Enter ile tamamlayın." />

        @if (done(); as result) {
            <div class="card" data-testid="sale-done">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h5 class="m-0">Satış tamamlandı</h5>
                        @if (!result.created) {
                            <small class="text-muted-color" role="status">Bu sepet daha önce kaydedilmişti; mevcut satış gösteriliyor.</small>
                        }
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <p-button type="button" label="Fişi yazdır" icon="pi pi-print" severity="secondary" (onClick)="print()" />
                        @if (canReadSales) {
                            <a [routerLink]="['/panel/sales', result.sale.id]" pButton type="button" label="Satış detayı" icon="pi pi-external-link" class="p-button-secondary"></a>
                        }
                        <p-button type="button" label="Yeni satış" icon="pi pi-plus" (onClick)="startNew()" data-testid="sale-new" />
                    </div>
                </div>
                @if (lowStockNames().length > 0) {
                    <p class="mt-0 mb-4 text-sm" role="status" data-testid="sale-low-stock">Stok minimumun altına indi: {{ lowStockNames().join(', ') }}.</p>
                }
                <app-sale-receipt [sale]="result.sale" />
            </div>
        } @else {
            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 lg:col-span-8">
                    <div class="card">
                        <label for="sale-search" class="block text-sm font-medium text-muted-color mb-2">Ürün ara (barkod, ad veya SKU)</label>
                        <input
                            #searchInput
                            id="sale-search"
                            type="text"
                            autocomplete="off"
                            autofocus
                            class="w-full p-inputtext p-component"
                            placeholder="Barkodu okutun veya yazın"
                            [value]="term()"
                            (input)="onTermInput($event)"
                            (keydown.enter)="onEnter($event)"
                            (keydown.arrowdown)="moveActive(1, $event)"
                            (keydown.arrowup)="moveActive(-1, $event)"
                            (keydown.escape)="clearSearch()"
                            role="combobox"
                            aria-controls="sale-results"
                            [attr.aria-expanded]="results().length > 0"
                        />
                        @if (searchError()) {
                            <small class="text-red-500 block mt-1" role="alert">{{ searchError() }}</small>
                        } @else if (cartNotice()) {
                            <small class="text-red-500 block mt-1" role="alert">{{ cartNotice() }}</small>
                        }
                        @if (results().length > 0) {
                            <ul id="sale-results" role="listbox" class="list-none m-0 mt-2 p-0 border border-surface rounded-border overflow-hidden" data-testid="sale-results">
                                @for (p of results(); track p.id; let i = $index) {
                                    <li role="option" [attr.aria-selected]="i === activeIndex()">
                                        <button type="button" class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-0 cursor-pointer bg-transparent" [class.bg-emphasis]="i === activeIndex()" (click)="addProduct(p)">
                                            <span class="min-w-0">
                                                <span class="font-medium">{{ p.name }}</span>
                                                <span class="block text-xs text-muted-color">{{ productMeta(p) }}</span>
                                            </span>
                                            <span class="whitespace-nowrap">{{ p.unitPrice | money: p.currency }}</span>
                                        </button>
                                    </li>
                                }
                            </ul>
                        } @else if (term().trim() && !searching() && !searchError()) {
                            <small class="text-muted-color block mt-1">Satılabilir ürün bulunamadı. Aşı ve kontrollü ürünler satışta yer almaz.</small>
                        }
                    </div>

                    <div class="card" data-testid="sale-cart">
                        <h5 class="mt-0 mb-4">Sepet</h5>
                        @if (lineViews().length === 0) {
                            <p class="m-0 text-muted-color">Sepet boş. Ürün aramasından ekleyin.</p>
                        }
                        <div class="flex flex-col gap-4">
                            @for (v of lineViews(); track v.line.key) {
                                <div class="rounded-border border border-surface p-3" data-testid="sale-line">
                                    <div class="flex items-start justify-between gap-3 mb-3">
                                        <div class="min-w-0">
                                            <div class="font-medium">{{ v.line.product.name }}</div>
                                            <div class="text-xs text-muted-color">{{ productMeta(v.line.product) }}</div>
                                        </div>
                                        <p-button type="button" icon="pi pi-trash" severity="danger" [text]="true" size="small" [attr.aria-label]="'Satırı kaldır: ' + v.line.product.name" (onClick)="removeLine(v.line.key)" />
                                    </div>
                                    <div class="grid grid-cols-12 gap-3 items-end">
                                        <div class="col-span-6 sm:col-span-3">
                                            <label [attr.for]="'q-' + v.line.key" class="block text-xs font-medium text-muted-color mb-1">Miktar{{ v.line.product.unit ? ' (' + v.line.product.unit + ')' : '' }}</label>
                                            <input [id]="'q-' + v.line.key" type="number" step="any" min="0" class="w-full p-inputtext p-component" [value]="v.line.quantity" (input)="setQuantity(v.line.key, $event)" />
                                        </div>
                                        <div class="col-span-6 sm:col-span-3">
                                            <label [attr.for]="'p-' + v.line.key" class="block text-xs font-medium text-muted-color mb-1">Birim fiyat</label>
                                            <input [id]="'p-' + v.line.key" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" [value]="v.line.unitPrice" (input)="setUnitPrice(v.line.key, $event)" />
                                        </div>
                                        <div class="col-span-12 sm:col-span-6 text-right sm:pb-2">
                                            <span class="text-xs text-muted-color mr-2">Tutar</span>
                                            <span class="font-semibold">{{ v.amount | money }}</span>
                                        </div>
                                    </div>
                                    @if (v.error) {
                                        <small class="text-red-500 block mt-2" role="alert">{{ v.error }}</small>
                                    }
                                    @if (v.batch; as b) {
                                        <div class="mt-3" data-testid="sale-batch">
                                            @if (b.options) {
                                                <label [attr.for]="'b-' + v.line.key" class="block text-xs font-medium text-muted-color mb-1">Parti (seri no / SKT)</label>
                                                <p-select
                                                    [inputId]="'b-' + v.line.key"
                                                    [options]="b.options"
                                                    [ngModel]="v.line.batchId"
                                                    (ngModelChange)="setBatch(v.line.key, $event)"
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    optionDisabled="disabled"
                                                    appendTo="body"
                                                    styleClass="w-full"
                                                />
                                            }
                                            <small class="block mt-1 text-muted-color">{{ b.stockText }}</small>
                                            @if (b.hintText) {
                                                <small class="block mt-1" [class.text-muted-color]="!b.warn" [class.text-red-500]="b.warn" role="status">{{ b.hintText }}</small>
                                            }
                                        </div>
                                    } @else if (v.batchNote) {
                                        <small class="block mt-3 text-muted-color" role="status">{{ v.batchNote }}</small>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <div class="card lg:sticky lg:top-4">
                        <label for="sale-client" class="block text-sm font-medium text-muted-color mb-2">Müşteri</label>
                        <app-client-search inputId="sale-client" placeholder="Boş bırakılırsa Peşin müşteri" [ngModel]="clientId()" (ngModelChange)="onClientChange($event)" />
                        @if (isWalkIn()) {
                            <small class="block mt-1 text-muted-color" data-testid="sale-walk-in">Peşin müşteri: ödeme tam tutar ve zorunludur.</small>
                        }

                        <div class="mt-5">
                            <span id="sale-method-label" class="block text-sm font-medium text-muted-color mb-2">Ödeme yöntemi</span>
                            <p-selectbutton [options]="methodOptions" [ngModel]="method()" (ngModelChange)="method.set($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="sale-method-label" />
                        </div>

                        @if (!isWalkIn()) {
                            <div class="mt-4" data-testid="sale-mode">
                                <span id="sale-mode-label" class="block text-sm font-medium text-muted-color mb-2">Ödeme</span>
                                <p-selectbutton [options]="modeOptions" [ngModel]="mode()" (ngModelChange)="mode.set($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="sale-mode-label" />
                            </div>
                            @if (mode() === 'partial') {
                                <div class="mt-3">
                                    <label for="sale-partial" class="block text-xs font-medium text-muted-color mb-1">Alınan tutar</label>
                                    <input id="sale-partial" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" [value]="partialAmount()" (input)="partialAmount.set(numberFrom($event))" />
                                    @if (paymentErr()) {
                                        <small class="text-red-500 block mt-1" role="alert">{{ paymentErr() }}</small>
                                    }
                                </div>
                            }
                        }

                        <div class="mt-4">
                            <label for="sale-notes" class="block text-xs font-medium text-muted-color mb-1">Not</label>
                            <textarea id="sale-notes" rows="2" maxlength="500" class="w-full p-inputtext p-component" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
                        </div>

                        <dl class="m-0 mt-5 pt-3 border-t border-surface grid grid-cols-2 gap-y-1" data-testid="sale-totals">
                            <dt class="text-lg font-semibold">Toplam</dt>
                            <dd class="m-0 text-right text-lg font-semibold">{{ total() | money }}</dd>
                            <dt class="text-muted-color">Alınacak</dt>
                            <dd class="m-0 text-right">{{ payable() ?? 0 | money }}</dd>
                            @if (outstanding() > 0) {
                                <dt class="text-muted-color">Veresiye (kalan borç)</dt>
                                <dd class="m-0 text-right">{{ outstanding() | money }}</dd>
                            }
                        </dl>

                        @if (submitError()) {
                            <p class="text-red-500 mt-3 mb-1" role="alert" data-testid="sale-error">{{ submitError() }}</p>
                            <small class="text-muted-color block">Aynı sepeti yeniden göndermek güvenlidir; satış iki kez kaydedilmez.</small>
                        }
                        <p-button class="block mt-4" styleClass="w-full" type="button" label="Satışı tamamla" icon="pi pi-check" [loading]="submitting()" [disabled]="!canSubmit()" (onClick)="submit()" data-testid="sale-submit" />
                        @if (ro.mutationBlocked()) {
                            <small class="block mt-2 text-muted-color">Kurum aboneliği salt okunur; satış kaydedilemez.</small>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class SaleNewPageComponent {
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    private readonly salesService = inject(SalesService);
    private readonly productSearch = inject(SaleProductSearchService);
    private readonly stockBatches = inject(StockBatchService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    protected readonly methodOptions = METHOD_OPTIONS;
    protected readonly modeOptions = MODE_OPTIONS;
    protected readonly canReadSales = this.auth.hasOperationClaim(SALES_READ_CLAIM);
    protected readonly numberFrom = numberFromInput;

    protected readonly term = signal('');
    protected readonly results = signal<SaleProductVm[]>([]);
    protected readonly activeIndex = signal(0);
    protected readonly searching = signal(false);
    protected readonly searchError = signal<string | null>(null);
    protected readonly cartNotice = signal<string | null>(null);

    protected readonly lines = signal<CartLine[]>([]);
    private readonly batchStates = signal<Record<string, BatchState>>({});

    protected readonly clientId = signal('');
    protected readonly method = signal<SalePaymentMethodApi>('Cash');
    protected readonly mode = signal<SalePaymentMode>('full');
    protected readonly partialAmount = signal<number | null>(null);
    protected readonly notes = signal('');

    protected readonly submitting = signal(false);
    protected readonly submitError = signal<string | null>(null);
    protected readonly done = signal<CreateSaleResultVm | null>(null);

    /** Sepet başına bir kez üretilir; hata sonrası yeniden denemede aynı kalır, başarıdan sonra yenilenir. */
    private requestId = crypto.randomUUID();
    private readonly term$ = new Subject<string>();
    private arrowNavigated = false;
    private lineSeq = 0;

    protected readonly isWalkIn = computed(() => !this.clientId());
    protected readonly total = computed(() => cartTotal(this.lines()));
    private readonly paymentInput = computed<CartPaymentInput>(() => ({ mode: this.mode(), method: this.method(), amount: this.partialAmount() }));
    protected readonly payable = computed(() => effectivePaymentAmount(this.total(), this.isWalkIn(), this.paymentInput()));
    protected readonly outstanding = computed(() => Math.max(0, Math.round((this.total() - (this.payable() ?? 0)) * 100) / 100));
    protected readonly paymentErr = computed(() => paymentError(this.total(), this.isWalkIn(), this.paymentInput()));
    private readonly requestErr = computed(() => cartRequestError(this.lines(), this.total(), this.isWalkIn(), this.paymentInput()));
    protected readonly canSubmit = computed(() => !this.submitting() && !this.ro.mutationBlocked() && this.requestErr() == null);

    protected readonly lineViews = computed(() =>
        this.lines().map((line) => {
            const state = this.batchStates()[line.product.id];
            const info = state?.status === 'ready' ? state.info : null;
            const guide = info ? saleBatchGuide(info, line.batchId, line.quantity) : null;

            return {
                line,
                amount: cartLineAmount(line),
                error: line.quantity == null && line.unitPrice == null ? null : cartLineError(line),
                batch: info && guide ? { ...guide, options: info.batches.length > 0 ? saleBatchOptions(info) : null } : null,
                batchNote: state?.status === 'loading' ? 'Stok bilgisi yükleniyor…' : state?.status === 'error' ? `${state.message} Satış, SKT'si en yakın uygun partiden otomatik düşülür.` : ''
            };
        })
    );

    protected readonly lowStockNames = computed(() => {
        const result = this.done();

        if (!result) {
            return [];
        }

        const names = new Map(result.sale.lines.map((l) => [l.productId, l.productName]));

        return result.stocks
            .filter((s) => s.isBelowMinimum)
            .map((s) => names.get(s.productId) ?? '')
            .filter(Boolean);
    });

    constructor() {
        afterNextRender(() => this.searchInput()?.nativeElement.focus());
        this.term$
            .pipe(
                debounceTime(250),
                switchMap((term) => {
                    if (!term.trim()) {
                        return of([] as SaleProductVm[]);
                    }

                    this.searching.set(true);

                    return this.productSearch.search(term).pipe(
                        catchError((e: Error) => {
                            this.searchError.set(e.message || 'Ürünler aranamadı.');

                            return of([] as SaleProductVm[]);
                        })
                    );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((r) => {
                this.results.set(r);
                this.activeIndex.set(0);
                this.searching.set(false);
            });
    }

    protected onTermInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;

        this.term.set(value);
        this.arrowNavigated = false;
        this.searchError.set(null);
        this.cartNotice.set(null);
        this.term$.next(value);

        if (!value.trim()) {
            this.results.set([]);
        }
    }

    protected moveActive(delta: number, event: Event): void {
        const count = this.results().length;

        if (count === 0) {
            return;
        }

        event.preventDefault();
        this.arrowNavigated = true;
        this.activeIndex.update((i) => (i + delta + count) % count);
    }

    /** Enter: okla seçilen satırı ekler; aksi halde hemen arar (okuyucu bekleme süresini beklemez) ve belirgin eşleşmeyi ekler. */
    protected onEnter(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        const term = this.term().trim();

        if (!term) {
            return;
        }

        const highlighted = this.results()[this.activeIndex()];

        if (this.arrowNavigated && highlighted) {
            this.addProduct(highlighted);

            return;
        }

        this.searching.set(true);
        this.productSearch.search(term).subscribe({
            next: (r) => {
                this.searching.set(false);
                const picked = pickScannedProduct(term, r);

                if (picked) {
                    this.addProduct(picked);
                } else {
                    this.results.set(r);
                    this.activeIndex.set(0);
                }
            },
            error: (e: Error) => {
                this.searching.set(false);
                this.searchError.set(e.message || 'Ürünler aranamadı.');
            }
        });
    }

    protected clearSearch(): void {
        this.term.set('');
        // Girdi çizilmeden önce temizlenirse bağlama değişmemiş görünür; kutuyu doğrudan boşaltırız.
        const input = this.searchInput()?.nativeElement;

        if (input) {
            input.value = '';
        }

        this.results.set([]);
        this.arrowNavigated = false;
        // Bekleyen debounce aramasının eski yanıtı kutu boşaldıktan sonra listeyi geri getirmesin.
        this.term$.next('');
    }

    protected productMeta(p: SaleProductVm): string {
        return [p.barcode || p.sku, p.unit].filter(Boolean).join(' · ');
    }

    protected addProduct(product: SaleProductVm): void {
        const current = this.lines();
        const same = current.find((l) => l.product.id === product.id && !l.batchId);

        if (!same && current.length >= SALE_MAX_LINES) {
            this.cartNotice.set(`Sepette en çok ${SALE_MAX_LINES} satır olabilir.`);

            return;
        }

        this.cartNotice.set(null);
        this.lines.set(same ? current.map((l) => (l === same ? { ...l, quantity: (l.quantity ?? 0) + 1 } : l)) : [...current, newCartLine(product, `l${++this.lineSeq}`)]);
        this.loadBatches(product.id);
        this.clearSearch();
        this.searchInput()?.nativeElement.focus();
    }

    protected removeLine(key: string): void {
        this.lines.update((ls) => ls.filter((l) => l.key !== key));
    }

    protected setQuantity(key: string, event: Event): void {
        this.patchLine(key, { quantity: numberFromInput(event) });
    }

    protected setUnitPrice(key: string, event: Event): void {
        this.patchLine(key, { unitPrice: numberFromInput(event) });
    }

    protected setBatch(key: string, batchId: string): void {
        this.patchLine(key, { batchId });
    }

    protected onClientChange(id: string): void {
        this.clientId.set(id ?? '');

        if (!id) {
            this.mode.set('full');
        }
    }

    protected submit(): void {
        if (!this.canSubmit()) {
            return;
        }

        this.submitError.set(null);
        this.submitting.set(true);
        const request = toCreateSaleRequest({
            lines: this.lines(),
            clientId: this.clientId(),
            clinicId: this.auth.getClinicId()?.trim() ?? '',
            notes: this.notes(),
            requestId: this.requestId,
            payment: this.paymentInput()
        });

        this.salesService.createSale(request).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.done.set(result);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Satış kaydedilemedi.'));
            }
        });
    }

    protected print(): void {
        printSaleReceipt();
    }

    protected startNew(): void {
        this.requestId = crypto.randomUUID();
        this.done.set(null);
        this.lines.set([]);
        this.batchStates.set({});
        this.clientId.set('');
        this.mode.set('full');
        this.partialAmount.set(null);
        this.notes.set('');
        this.submitError.set(null);
        this.clearSearch();
        // Arama kutusu sepet görünümüyle yeniden oluşur; odak bir sonraki çizimden sonra verilir.
        queueMicrotask(() => setTimeout(() => this.searchInput()?.nativeElement.focus()));
    }

    private patchLine(key: string, patch: Partial<CartLine>): void {
        this.submitError.set(null);
        this.lines.update((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    }

    /** Ürünün aktif kliniktaki parti bakiyesi; okunamazsa (ör. stok okuma yetkisi yok) otomatik FEFO'ya düşülür. */
    private loadBatches(productId: string): void {
        const clinicId = this.auth.getClinicId()?.trim();

        if (!clinicId || this.batchStates()[productId]) {
            return;
        }

        this.batchStates.update((s) => ({ ...s, [productId]: { status: 'loading' } }));
        this.stockBatches.getByProduct(productId, clinicId).subscribe({
            next: (info) => this.batchStates.update((s) => ({ ...s, [productId]: { status: 'ready', info } })),
            error: (e: Error) => this.batchStates.update((s) => ({ ...s, [productId]: { status: 'error', message: e.message || 'Parti bilgisi yüklenemedi.' } }))
        });
    }
}
