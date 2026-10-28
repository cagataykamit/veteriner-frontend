import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { STOCK_MOVEMENTS_CREATE_CLAIM, STOCK_MOVEMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import { ProductStockBatchesComponent } from '@/app/features/inventory/components/product-stock-batches/product-stock-batches.component';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Ürün detayı stok bölümü: klinik stokları tablosu (masaüstü ızgara, mobil kart) ve klinik başına parti kartı.
 * Sayfa ızgarasına doğrudan yerleşir; stok işlemi diyaloğunu sayfa açar (`operate`).
 */
@Component({
    selector: 'app-product-clinic-stocks',
    standalone: true,
    imports: [RouterLink, ButtonModule, AppLoadingStateComponent, AppErrorStateComponent, AppEmptyStateComponent, AppStatusTagComponent, ProductStockBatchesComponent],
    host: { class: 'contents' },
    styles: [
        `
            /* Klinik stokları: 6 eşit kolon, dikey çizgi yok */
            .product-stock-desktop-grid {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                column-gap: 1rem;
                align-items: center;
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="col-span-12">
            <div class="card">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h5 class="mt-0 mb-0 text-base font-semibold text-surface-900 dark:text-surface-0">Klinik stokları</h5>
                    <div class="flex flex-wrap gap-3 items-center text-sm">
                        @if (canReadStockMovements) {
                            <a [routerLink]="['/panel/products', productId(), 'stock-movements']" class="text-primary font-medium no-underline whitespace-nowrap">Stok hareketleri →</a>
                        }
                        @if (canCreateStockMovement && !ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/products', productId(), 'stock-movements']" class="text-primary font-medium no-underline whitespace-nowrap">Stok hareketi ekle →</a>
                        }
                    </div>
                </div>
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3 m-0" role="status">Salt okunur modda stok girişi, stok çıkışı ve minimum stok güncellenemez; stok bilgileri görüntülenebilir.</p>
                }
                @if (loading() && rows().length === 0) {
                    <app-loading-state message="Stok bilgileri yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="retry.emit()" />
                } @else if (rowsView().total === 0) {
                    <app-empty-state message="Bu ürün için henüz stok kaydı yok." />
                } @else {
                    <!-- Masaüstü: çizgisiz kolon hizası; yalnızca satır ayırıcıları -->
                    <div class="hidden md:block overflow-x-auto w-full" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                        <div class="w-full min-w-0">
                            <div role="row" class="product-stock-desktop-grid px-2 py-2.5 border-b border-surface-200 dark:border-surface-700">
                                <span class="text-sm font-semibold text-muted-color text-center block">Klinik</span>
                                <span class="text-sm font-semibold text-muted-color text-center block">Kullanılabilir</span>
                                <span class="text-sm font-semibold text-muted-color text-center block">Süresi geçmiş</span>
                                <span class="text-sm font-semibold text-muted-color text-center block">Minimum stok</span>
                                <span class="text-sm font-semibold text-muted-color text-center block">Durum</span>
                                <span class="text-sm font-semibold text-muted-color text-center block px-1">Son güncelleme</span>
                                <span class="text-sm font-semibold text-muted-color text-center block">İşlem</span>
                            </div>
                            @for (row of rowsView().displayed; track row.id) {
                                <div
                                    role="row"
                                    class="product-stock-desktop-grid px-2 py-2.5 border-b border-surface-200 dark:border-surface-700 last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors duration-150"
                                >
                                    <span class="font-semibold text-base text-surface-900 dark:text-surface-0 min-w-0 break-words leading-snug text-center block">{{ row.clinicName }}</span>
                                    <span class="tabular-nums text-base font-medium text-surface-900 dark:text-surface-0 text-center block">{{ row.availableText }}</span>
                                    <span class="tabular-nums text-base text-center block">
                                        @if (row.hasExpired) {
                                            <span class="font-medium text-red-600 dark:text-red-400" data-testid="expired-qty">{{ row.expiredText }}</span>
                                        } @else {
                                            <span class="text-muted-color">—</span>
                                        }
                                    </span>
                                    <span class="tabular-nums text-base text-surface-900 dark:text-surface-0 text-center block">{{ row.minimumStockLevelText }}</span>
                                    <span class="flex justify-center items-center min-w-0 px-1">
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </span>
                                    <span class="text-muted-color text-base min-w-0 text-center block px-1 break-words leading-snug" [title]="row.updatedAtText">{{ row.updatedAtText }}</span>
                                    <span class="flex justify-center items-center min-h-[2.5rem] max-w-full">
                                        @if (canOperate()) {
                                            <button
                                                pButton
                                                type="button"
                                                size="small"
                                                severity="primary"
                                                class="!py-2 !px-3 !text-sm !font-semibold whitespace-nowrap shadow-sm"
                                                title="Stok girişi, çıkışı veya minimum stok"
                                                (click)="operate.emit(row)"
                                            ><i class="p-button-icon pi pi-sync"></i>Stok işlemi</button>
                                        }
                                    </span>
                                </div>
                            }
                        </div>
                    </div>
                    <div class="md:hidden space-y-2.5" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                        @for (row of rowsView().displayed; track row.id) {
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-3 py-2.5 shadow-sm">
                                <div class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-2 leading-snug">
                                    {{ row.clinicName }}
                                </div>
                                <dl class="m-0 grid grid-cols-12 gap-x-2 gap-y-2">
                                    <dt class="col-span-5 text-muted-color text-sm">Kullanılabilir</dt>
                                    <dd class="col-span-7 m-0 text-right tabular-nums text-base font-medium text-surface-900 dark:text-surface-0">
                                        {{ row.availableText }}
                                    </dd>
                                    <dt class="col-span-5 text-muted-color text-sm">Süresi geçmiş</dt>
                                    <dd class="col-span-7 m-0 text-right tabular-nums text-base">
                                        @if (row.hasExpired) {
                                            <span class="font-medium text-red-600 dark:text-red-400" data-testid="expired-qty">{{ row.expiredText }}</span>
                                        } @else {
                                            <span class="text-muted-color">—</span>
                                        }
                                    </dd>
                                    <dt class="col-span-5 text-muted-color text-sm">Minimum stok</dt>
                                    <dd class="col-span-7 m-0 text-right tabular-nums text-base text-surface-900 dark:text-surface-0">
                                        {{ row.minimumStockLevelText }}
                                    </dd>
                                    <dt class="col-span-5 text-muted-color text-sm self-center">Durum</dt>
                                    <dd class="col-span-7 m-0 flex justify-end items-center">
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </dd>
                                    <dt class="col-span-12 text-muted-color text-sm pt-0.5">Son güncelleme</dt>
                                    <dd class="col-span-12 m-0 text-muted-color text-base">{{ row.updatedAtText }}</dd>
                                </dl>
                                @if (canOperate()) {
                                    <div class="flex flex-wrap justify-end gap-2 mt-2.5 pt-2 border-t border-surface-200 dark:border-surface-700">
                                        <button
                                            pButton
                                            type="button"
                                            size="small"
                                            severity="primary"
                                            class="!py-2 !px-3 !text-sm !font-semibold shadow-sm"
                                            title="Stok girişi, çıkışı veya minimum stok"
                                            (click)="operate.emit(row)"
                                        ><i class="p-button-icon pi pi-sync"></i>Stok işlemi</button>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
        </div>

        @if (canReadStockMovements && rows().length > 0) {
            <div class="col-span-12">
                <div class="card" data-testid="product-batches-card">
                    <h5 class="mt-0 mb-4 text-base font-semibold text-surface-900 dark:text-surface-0">Partiler</h5>
                    @for (row of rows(); track row.id) {
                        <app-product-stock-batches [productId]="productId()" [clinicId]="row.clinicId" [clinicName]="row.clinicName" [reloadKey]="reloadKey()" />
                    }
                </div>
            </div>
        }
    `
})
export class ProductClinicStocksComponent {
    readonly productId = input.required<string>();
    readonly rows = input<readonly ProductStockVm[]>([]);
    readonly loading = input(false);
    readonly error = input<string | null>(null);
    /** Stok yeniden yüklenince parti listeleri de yenilensin. */
    readonly reloadKey = input(0);
    /** Satırdaki Stok işlemi düğmesi (salt okunur değil ve işlem hakkı var). */
    readonly canOperate = input(false);

    readonly retry = output<void>();
    readonly operate = output<ProductStockVm>();

    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    readonly canReadStockMovements = this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM);
    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly rowsView = computed(() => sliceDetailRelatedList(this.rows()));
}
