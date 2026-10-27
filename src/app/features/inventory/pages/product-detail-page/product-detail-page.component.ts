import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProductClinicStocksComponent } from '@/app/features/inventory/components/product-clinic-stocks/product-clinic-stocks.component';
import { ProductStockOperationDialogComponent } from '@/app/features/inventory/components/product-stock-operation-dialog/product-stock-operation-dialog.component';
import type { ProductDetailVm } from '@/app/entities/inventory/models/product-vm.model';
import { isStockTrackedKind } from '@/app/entities/inventory/utils/product-classification.utils';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_DEACTIVATE_CLAIM, PRODUCTS_UPDATE_CLAIM, STOCK_MOVEMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { EMPTY, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';

@Component({
    selector: 'app-product-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        ConfirmDialogModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        ProductClinicStocksComponent,
        ProductStockOperationDialogComponent
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading()) {
            <app-loading-state message="Ürün yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (product(); as p) {
            <app-page-header categoryLink="/panel/products" categoryLinkLabel="Ürün listesine dön" title="Ürün detayı" [description]="p.name + ' · ' + p.sku">
                <div actions class="flex flex-wrap items-center gap-2 justify-end">
                    @if (canUpdateProduct && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/products', p.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdateProduct && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                    @if (canOpenStockOperation() && isStockTracked(p)) {
                        <button
                            pButton
                            type="button"
                           
                           
                            severity="primary"
                            class="whitespace-nowrap"
                            [disabled]="isHeaderStockOperationDisabled()"
                            [title]="headerStockOperationTitle()"
                            (click)="openStockOperationFromHeader()"
                        ><i class="pi pi-sync"></i>Stok işlemi</button>
                    }
                    @if (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) {
                        <button pButton type="button" severity="danger" class="p-button-secondary" [disabled]="mutationBusy()" (click)="onDeactivateClick()"><i [class]="mutationBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-ban'"></i>Pasifleştir</button>
                    }
                    @if (canUpdateProduct && !ro.mutationBlocked() && !p.isActive) {
                        <button pButton type="button" class="p-button-secondary" [disabled]="mutationBusy()" (click)="onActivateClick()"><i [class]="mutationBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Aktifleştir</button>
                    }
                </div>
            </app-page-header>

            @if (mutationError()) {
                <p class="text-red-500 text-sm mb-4 m-0" role="alert">{{ mutationError() }}</p>
            }

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün adı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.name }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">SKU</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.sku }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Barkod</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.barcode }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Kategori</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.categoryName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün türü</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.kindLabel }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Kontrollü sınıf</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.controlledClassLabel }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Farmakolojik şekil</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.pharmacologicalForm }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Takdim şekli</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.presentationForm }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ambalaj</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.packaging }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.unit }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim fiyat</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.unitPriceText }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Para birimi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.currency }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="p.statusLabel" [severity]="p.statusSeverity" />
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Açıklama</h5>
                        @if (p.description === emptyMark) {
                            <app-empty-state message="Açıklama yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ p.description }}</p>
                        }
                    </div>
                </div>

                @if (isStockTracked(p)) {
                    <app-product-clinic-stocks
                        [productId]="p.id"
                        [rows]="stocksRows()"
                        [loading]="stocksLoading()"
                        [error]="stocksError()"
                        [reloadKey]="batchesReloadKey()"
                        [canOperate]="canOpenStockOperation()"
                        (retry)="reloadStocks()"
                        (operate)="openStockOperationDialog($event)"
                    />
                }
            </div>
        }

        <app-product-stock-operation-dialog [product]="product()" [stocks]="stocksRows()" (saved)="reloadStocks()" />

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ProductDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly productService = inject(ProductService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    readonly canDeactivateProduct = this.auth.hasOperationClaim(PRODUCTS_DEACTIVATE_CLAIM);
    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly emptyMark = '—';
    /** Hizmetin stoğu, partisi ve stok işlemi yoktur (ADR-018). */
    readonly isStockTracked = (p: Pick<ProductDetailVm, 'kind'>) => isStockTrackedKind(p.kind);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly product = signal<ProductDetailVm | null>(null);

    readonly mutationBusy = signal(false);
    readonly mutationError = signal<string | null>(null);

    readonly stocksLoading = signal(false);
    readonly stocksError = signal<string | null>(null);
    readonly stocksRows = signal<ProductStockVm[]>([]);
    /** Stok yeniden yüklenince parti listeleri de yenilensin. */
    readonly batchesReloadKey = signal(0);

    private readonly stockOperationDialog = viewChild.required(ProductStockOperationDialogComponent);

    private lastId: string | null = null;

    /** Salt okunur değil ve en az bir işlem hakkı (stok hareketi veya ürün güncelleme). */
    canOpenStockOperation(): boolean {
        return !this.ro.mutationBlocked() && (this.canCreateStockMovement || this.canUpdateProduct);
    }

    /** Üst başlık Stok işlemi — stok listesi ve aktif klinik durumuna göre */
    isHeaderStockOperationDisabled(): boolean {
        if (!this.canOpenStockOperation()) {
            return true;
        }

        if (this.stocksLoading()) {
            return true;
        }

        const rows = this.stocksRows();

        if (rows.length === 0) {
            if (!this.auth.getClinicId()?.trim()) {
                return true;
            }

            if (!this.canCreateStockMovement) {
                return true;
            }
        }

        return false;
    }

    headerStockOperationTitle(): string {
        if (this.isHeaderStockOperationDisabled() && this.stocksRows().length === 0 && !this.auth.getClinicId()?.trim()) {
            return 'Bu ürün için henüz klinik stok kaydı yok. İlk stok kaydı oluşturmak için klinik bilgisi gereklidir.';
        }

        if (this.isHeaderStockOperationDisabled() && this.stocksRows().length === 0 && !this.canCreateStockMovement) {
            return 'Stok girişi/çıkışı için yetki veya klinik bağlamı gerekli.';
        }

        return 'Stok girişi, çıkışı veya minimum stok';
    }

    openStockOperationFromHeader(): void {
        if (!this.canOpenStockOperation() || this.isHeaderStockOperationDisabled()) {
            return;
        }

        this.stockOperationDialog().openFromHeader();
    }

    openStockOperationDialog(row: ProductStockVm): void {
        if (!this.canOpenStockOperation()) {
            return;
        }

        this.stockOperationDialog().openForRow(row);
    }

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');

                    if (!id) {
                        this.error.set('Geçersiz ürün.');
                        this.loading.set(false);

                        return EMPTY;
                    }

                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    this.mutationError.set(null);
                    this.stocksRows.set([]);
                    this.stocksError.set(null);

                    return this.productService.getById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.product.set(x);
                    this.loading.set(false);

                    if (this.lastId) {
                        this.loadStocks(this.lastId);
                    }
                },
                error: (e: unknown) => {
                    this.error.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.productService.getById(this.lastId).subscribe({
            next: (x) => {
                this.product.set(x);
                this.loading.set(false);
                this.loadStocks(this.lastId!);
            },
            error: (e: unknown) => {
                this.error.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    reloadStocks(): void {
        if (this.lastId) {
            this.loadStocks(this.lastId);
        }
    }

    private loadStocks(productId: string): void {
        this.stocksLoading.set(true);
        this.stocksError.set(null);
        this.productService.getStocksByProductId(productId).subscribe({
            next: (rows) => {
                this.stocksRows.set(rows);
                this.batchesReloadKey.update((k) => k + 1);
                this.stocksLoading.set(false);
            },
            error: (e: Error) => {
                this.stocksError.set(e.message ?? 'Stok bilgileri yüklenemedi.');
                this.stocksLoading.set(false);
            }
        });
    }

    onDeactivateClick(): void {
        const id = this.lastId;
        const p = this.product();

        if (!id || !p?.isActive || this.ro.mutationBlocked() || !this.canDeactivateProduct) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Ürünü pasifleştir',
            message: 'Bu ürünü pasifleştirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.mutationBusy.set(true);
                this.mutationError.set(null);
                this.productService.deactivate(id).subscribe({
                    next: () => {
                        this.mutationBusy.set(false);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.mutationBusy.set(false);
                        this.mutationError.set(e.message ?? 'Pasifleştirme başarısız.');
                    }
                });
            }
        });
    }

    onActivateClick(): void {
        const id = this.lastId;
        const p = this.product();

        if (!id || !p || p.isActive || this.ro.mutationBlocked() || !this.canUpdateProduct) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Ürünü aktifleştir',
            message: 'Bu ürünü tekrar aktif hale getirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Aktifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.mutationBusy.set(true);
                this.mutationError.set(null);
                this.productService.activate(id).subscribe({
                    next: () => {
                        this.mutationBusy.set(false);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.mutationBusy.set(false);
                        this.mutationError.set(e.message ?? 'Aktifleştirme başarısız.');
                    }
                });
            }
        });
    }
}
