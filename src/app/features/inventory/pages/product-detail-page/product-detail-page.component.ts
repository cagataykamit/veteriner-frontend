import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ProductDetailVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-product-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a routerLink="/panel/products" class="text-primary font-medium no-underline inline-block mb-4">← Ürün listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Ürün yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (product()) {
            <app-page-header
                title="Ürün detayı"
                subtitle="Ürün ve Stok"
                [description]="product()!.name + ' · ' + product()!.sku"
            ></app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün adı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.name }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">SKU</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.sku }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Barkod</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.barcode }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Kategori</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.categoryName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.unit }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim fiyat</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.unitPriceText }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Para birimi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ product()!.currency }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="product()!.statusLabel" [severity]="product()!.statusSeverity" />
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Açıklama</h5>
                        @if (product()!.description === emptyMark) {
                            <app-empty-state message="Açıklama yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ product()!.description }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class ProductDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly productService = inject(ProductService);

    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly product = signal<ProductDetailVm | null>(null);

    private lastId: string | null = null;

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
                    return this.productService.getById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.product.set(x);
                    this.loading.set(false);
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
            },
            error: (e: unknown) => {
                this.error.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
