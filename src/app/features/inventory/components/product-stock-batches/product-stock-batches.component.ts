import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { TableModule } from 'primeng/table';
import type { ProductStockBatchesVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Bir ürünün tek klinikteki parti bakiyesi: seri/lot, SKT (yaklaşan / geçmiş rozeti), kalan, firma + partisiz (devir) bakiye.
 * Okuma izni (`StockMovements.Read`) denetimi çağıran sayfadadır.
 */
@Component({
    selector: 'app-product-stock-batches',
    standalone: true,
    imports: [TableModule, AppStatusTagComponent, AppLoadingStateComponent, AppErrorStateComponent, AppEmptyStateComponent],
    template: `
        <section class="mb-6 last:mb-0" [attr.aria-label]="'Partiler: ' + clinicName()" data-testid="product-stock-batches">
            <h6 class="mt-0 mb-2 text-base font-semibold">{{ clinicName() }}</h6>
            @if (loading() && !data()) {
                <app-loading-state message="Partiler yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (data(); as d) {
                <dl class="m-0 mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div class="flex gap-1"><dt class="text-muted-color">Kullanılabilir:</dt><dd class="m-0 tabular-nums font-medium" data-testid="available-quantity">{{ d.availableText }} {{ d.unit }}</dd></div>
                    <div class="flex gap-1">
                        <dt class="text-muted-color">Süresi geçmiş:</dt>
                        <dd class="m-0 tabular-nums" [class.text-red-600]="d.expiredQuantity > 0" data-testid="expired-quantity">{{ d.expiredText }} {{ d.unit }}</dd>
                    </div>
                    <div class="flex gap-1"><dt class="text-muted-color">Toplam:</dt><dd class="m-0 tabular-nums">{{ d.quantityOnHandText }} {{ d.unit }}</dd></div>
                    <div class="flex gap-1"><dt class="text-muted-color">Partili:</dt><dd class="m-0 tabular-nums">{{ d.batchedQuantityText }} {{ d.unit }}</dd></div>
                    <div class="flex gap-1">
                        <dt class="text-muted-color">Partisiz / devir bakiye:</dt>
                        <dd class="m-0 tabular-nums" data-testid="unbatched-quantity">{{ d.unbatchedQuantityText }} {{ d.unit }}</dd>
                    </div>
                </dl>
                @if (d.unbatchedQuantity > 0) {
                    <p class="text-sm text-muted-color mt-0 mb-3" role="note">
                        Partisiz bakiye, parti bilgisi girilmeden önce veya parti bilgisi olmadan eklenmiş stoktur; seri no ve SKT'si yoktur.
                    </p>
                }
                @if (d.batches.length === 0) {
                    <app-empty-state message="Kalanı olan parti yok." />
                } @else {
                    <div class="overflow-x-auto" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                        <p-table [value]="d.batches" [tableStyle]="{ 'min-width': '40rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>Seri / lot no</th>
                                    <th>SKT</th>
                                    <th class="text-right">Kalan</th>
                                    <th>Firma</th>
                                    <th>Fatura</th>
                                    <th>Geliş</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-b>
                                <tr [class.opacity-70]="b.isExpired">
                                    <td class="break-words">{{ b.lotNumber }}</td>
                                    <td class="whitespace-nowrap">
                                        {{ b.expiryText }}
                                        @if (b.expiryBadgeLabel) {
                                            <app-status-tag [label]="b.expiryBadgeLabel" [severity]="b.expiryBadgeSeverity" />
                                        }
                                    </td>
                                    <td class="text-right whitespace-nowrap tabular-nums">{{ b.remainingText }} {{ b.unit }}</td>
                                    <td class="break-words">{{ b.supplierName }}</td>
                                    <td class="break-words">{{ b.invoiceText }}</td>
                                    <td class="whitespace-nowrap">{{ b.receivedText }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            }
        </section>
    `
})
export class ProductStockBatchesComponent {
    readonly productId = input.required<string>();
    readonly clinicId = input.required<string>();
    readonly clinicName = input('');
    /** Değişince yeniden yükler (ör. stok işlemi sonrası). */
    readonly reloadKey = input(0);

    private readonly batches = inject(StockBatchService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly data = signal<ProductStockBatchesVm | null>(null);

    constructor() {
        effect(() => {
            this.productId();
            this.clinicId();
            this.reloadKey();
            untracked(() => this.load());
        });
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.batches.getByProduct(this.productId(), this.clinicId()).subscribe({
            next: (vm) => {
                this.data.set(vm);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Parti bilgileri yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
