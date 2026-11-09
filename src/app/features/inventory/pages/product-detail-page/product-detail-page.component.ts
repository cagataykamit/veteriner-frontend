import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { DETAIL_TILE_GRID_CLASS } from '@/app/shared/ui/detail.classes';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
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
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        ProductClinicStocksComponent,
        ProductStockOperationDialogComponent
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (loading()) {
            <app-loading-state message="Ürün yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (product(); as p) {
            <app-page-header categoryLink="/panel/products" categoryLinkLabel="Ürün listesine dön" />

            <!-- Kimlik kartı: ürün adı + durum rozeti, SKU, kategori/üretici satırı; sağda Düzenle; gösterge şeridi (fiyat, birim, tür, kontrollü sınıf). -->
            <app-detail-identity-card icon="pi pi-box" [title]="p.name" [subtitle]="'SKU: ' + p.sku" [meta]="'Kategori: ' + p.categoryName + ' · Üretici: ' + p.manufacturer + ' · Barkod: ' + p.barcode" ariaLabel="Ürün kimliği" testId="product-identity-card">
                <app-status-tag badges [label]="p.statusLabel" [severity]="p.statusSeverity" />
                <ng-container actions>
                    @if (canUpdateProduct && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/products', p.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdateProduct && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                </ng-container>
                <div stat>
                    <dt>Birim fiyat</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ p.unitPriceText }} <span class="text-muted-color text-sm font-normal">{{ p.currency }}</span></dd>
                </div>
                <div stat>
                    <dt>Birim</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ p.unit }}</dd>
                </div>
                <div stat>
                    <dt>Ürün türü</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ p.kindLabel }}</dd>
                </div>
                <div stat>
                    <dt>Kontrollü sınıf</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ p.controlledClassLabel }}</dd>
                </div>
            </app-detail-identity-card>

            @if (mutationError()) {
                <p class="text-danger text-sm mb-4 m-0" role="alert">{{ mutationError() }}</p>
            }

            <!-- Eylem şeridi: stok işlemi, pasifleştir/aktifleştir (salt okunurda gösterilmez; mevcut davranış). -->
            @if ((canOpenStockOperation() && isStockTracked(p)) || (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) || (canUpdateProduct && !ro.mutationBlocked() && !p.isActive)) {
                <app-detail-action-bar ariaLabel="Ürün eylemleri">
                    @if (canOpenStockOperation() && isStockTracked(p)) {
                        <button pButton type="button" severity="primary" class="whitespace-nowrap" [disabled]="isHeaderStockOperationDisabled()" [title]="headerStockOperationTitle()" (click)="openStockOperationFromHeader()"><i class="pi pi-sync"></i>Stok işlemi</button>
                    }
                    @if (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) {
                        <button pButton type="button" severity="danger" [outlined]="true" [disabled]="mutationBusy()" (click)="onDeactivateClick()"><i [class]="mutationBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-ban'"></i>Pasifleştir</button>
                    }
                    @if (canUpdateProduct && !ro.mutationBlocked() && !p.isActive) {
                        <button pButton type="button" class="p-button-outlined p-button-secondary" [disabled]="mutationBusy()" (click)="onActivateClick()"><i [class]="mutationBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Aktifleştir</button>
                    }
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: ürün bilgileri kutucukları | açıklama (8/4, eşit yükseklik); klinik stokları tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8 @container">
                        <h5 class="mt-0 mb-3">Ürün bilgileri</h5>
                        <dl [class]="tileGridClass">
                            <div>
                                <dt>Farmakolojik şekil</dt>
                                <dd [class]="p.pharmacologicalForm === emptyMark ? 'field-empty' : 'font-medium'">{{ p.pharmacologicalForm }}</dd>
                            </div>
                            <div>
                                <dt>Takdim şekli</dt>
                                <dd [class]="p.presentationForm === emptyMark ? 'field-empty' : 'font-medium'">{{ p.presentationForm }}</dd>
                            </div>
                            <div>
                                <dt>Ambalaj</dt>
                                <dd [class]="p.packaging === emptyMark ? 'field-empty' : 'font-medium'">{{ p.packaging }}</dd>
                            </div>
                            <div>
                                <dt>Üretici</dt>
                                <dd [class]="p.manufacturer === emptyMark ? 'field-empty' : 'font-medium'">{{ p.manufacturer }}</dd>
                            </div>
                            <div>
                                <dt>Barkod</dt>
                                <dd [class]="p.barcode === emptyMark ? 'field-empty' : 'font-medium tabular-nums'">{{ p.barcode }}</dd>
                            </div>
                            <div>
                                <dt>Kategori</dt>
                                <dd [class]="p.categoryName === emptyMark ? 'field-empty' : 'font-medium'">{{ p.categoryName }}</dd>
                            </div>
                        </dl>
                    </div>
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4">
                        <h5 class="mt-0 mb-3">Açıklama</h5>
                        @if (p.description === emptyMark) {
                            <p class="m-0 field-empty">Açıklama yok</p>
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
    private readonly productService = inject(ProductService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    readonly canDeactivateProduct = this.auth.hasOperationClaim(PRODUCTS_DEACTIVATE_CLAIM);
    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly emptyMark = '—';
    protected readonly tileGridClass = DETAIL_TILE_GRID_CLASS;
    /** Hizmetin stoğu, partisi ve stok işlemi yoktur (ADR-018). */
    readonly isStockTracked = (p: Pick<ProductDetailVm, 'kind'>) => isStockTrackedKind(p.kind);

    private readonly loader = new RouteEntityLoader<ProductDetailVm>({
        fetch: (id) => this.productService.getById(id),
        invalidIdMessage: 'Geçersiz ürün.',
        errorMessage: (e) => panelHttpFailureMessage(e, 'Ürün yüklenemedi.'),
        onRouteChange: (id) => {
            if (id) {
                this.mutationError.set(null);
                this.stocksRows.set([]);
                this.stocksError.set(null);
            }
        },
        onLoaded: (_, id) => this.loadStocks(id)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly product = this.loader.value;

    readonly mutationBusy = signal(false);
    readonly mutationError = signal<string | null>(null);

    readonly stocksLoading = signal(false);
    readonly stocksError = signal<string | null>(null);
    readonly stocksRows = signal<ProductStockVm[]>([]);
    /** Stok yeniden yüklenince parti listeleri de yenilensin. */
    readonly batchesReloadKey = signal(0);

    private readonly stockOperationDialog = viewChild.required(ProductStockOperationDialogComponent);

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
        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }

    reloadStocks(): void {
        if (this.loader.id) {
            this.loadStocks(this.loader.id);
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
                this.stocksError.set(panelHttpFailureMessage(e, 'Stok bilgileri yüklenemedi.'));
                this.stocksLoading.set(false);
            }
        });
    }

    onDeactivateClick(): void {
        const id = this.loader.id;
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
                        this.mutationError.set(panelHttpFailureMessage(e, 'Pasifleştirme başarısız.'));
                    }
                });
            }
        });
    }

    onActivateClick(): void {
        const id = this.loader.id;
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
                        this.mutationError.set(panelHttpFailureMessage(e, 'Aktifleştirme başarısız.'));
                    }
                });
            }
        });
    }
}
