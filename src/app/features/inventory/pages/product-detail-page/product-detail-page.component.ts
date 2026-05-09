import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { ProductDetailVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_DEACTIVATE_CLAIM, PRODUCTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
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
        ButtonModule,
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
        } @else if (product(); as p) {
            <app-page-header title="Ürün detayı" subtitle="Ürün ve Stok" [description]="p.name + ' · ' + p.sku">
                @if (canUpdateProduct && !ro.mutationBlocked()) {
                    <a
                        actions
                        [routerLink]="['/panel/products', p.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                } @else if (canUpdateProduct && ro.mutationBlocked()) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Düzenle (salt okunur)"
                        icon="pi pi-lock"
                        [disabled]="true"
                        class="p-button-secondary"
                    ></button>
                }
                @if (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Pasifleştir"
                        icon="pi pi-ban"
                        severity="danger"
                        class="p-button-secondary"
                        [loading]="mutationBusy()"
                        [disabled]="mutationBusy()"
                        (onClick)="onDeactivateClick()"
                    ></button>
                }
                @if (canUpdateProduct && !ro.mutationBlocked() && !p.isActive) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Aktifleştir"
                        icon="pi pi-check"
                        class="p-button-secondary"
                        [loading]="mutationBusy()"
                        [disabled]="mutationBusy()"
                        (onClick)="onActivateClick()"
                    ></button>
                }
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
            </div>
        }
    `
})
export class ProductDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly productService = inject(ProductService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    readonly canDeactivateProduct = this.auth.hasOperationClaim(PRODUCTS_DEACTIVATE_CLAIM);

    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly product = signal<ProductDetailVm | null>(null);

    readonly mutationBusy = signal(false);
    readonly mutationError = signal<string | null>(null);

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
                    this.mutationError.set(null);
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

    onDeactivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p?.isActive || this.ro.mutationBlocked() || !this.canDeactivateProduct) {
            return;
        }
        if (!window.confirm('Bu ürünü pasifleştirmek istediğinize emin misiniz?')) {
            return;
        }
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

    onActivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p || p.isActive || this.ro.mutationBlocked() || !this.canUpdateProduct) {
            return;
        }
        if (!window.confirm('Bu ürünü aktifleştirmek istediğinize emin misiniz?')) {
            return;
        }
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
}
