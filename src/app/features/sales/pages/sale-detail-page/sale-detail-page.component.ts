import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { SALES_CORRECT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SaleReceiptComponent } from '@/app/features/sales/components/sale-receipt.component';
import { SaleVoidDialogComponent } from '@/app/features/sales/components/sale-void-dialog.component';
import type { SaleDetailVm } from '@/app/features/sales/models/sale-vm.model';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { printSaleReceipt } from '@/app/features/sales/utils/sale-receipt-print.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-sale-detail-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        SaleReceiptComponent,
        SaleVoidDialogComponent
    ],
    template: `
        <a routerLink="/panel/sales" class="text-primary font-medium no-underline inline-block mb-4">← Satış listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Satış yükleniyor…" />
        } @else if (error()) {
            <div class="card"><app-error-state [detail]="error()!" (retry)="load()" /></div>
        } @else if (sale(); as s) {
            <app-page-header title="Satış" [description]="soldAt(s)">
                <div actions class="flex flex-wrap gap-2">
                    <p-button type="button" label="Fişi yazdır" icon="pi pi-print" severity="secondary" (onClick)="print()" />
                    @if (canVoid && !s.isVoided && !ro.mutationBlocked()) {
                        <p-button type="button" label="İptal et" icon="pi pi-ban" severity="danger" [outlined]="true" (onClick)="voidVisible.set(true)" />
                    }
                </div>
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Özet</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (s.isWalkIn) {
                                    {{ s.clientName }}
                                } @else {
                                    <a [routerLink]="['/panel/clients', s.clientId]" class="text-primary font-medium no-underline">{{ s.clientName }}</a>
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0"><app-status-tag [label]="s.statusLabel" [severity]="s.statusSeverity" /></dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Toplam</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0 font-medium">{{ s.totalText }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ödenen</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ s.paidText }}</dd>
                            @if (s.hasOutstanding) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Kalan borç</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ s.outstandingText }}</dd>
                            }
                            @if (s.notes) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Not</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ s.notes }}</dd>
                            }
                        </dl>
                    </div>
                    @if (s.isVoided) {
                        <div class="card" data-testid="sale-void-info">
                            <h5 class="mt-0 mb-4">İptal bilgisi</h5>
                            <dl class="m-0 grid grid-cols-12 gap-3">
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Gerekçe</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ s.voidReason }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Stok</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ s.voidStockOutcomeLabel }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal zamanı</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ voidedAt(s) }}</dd>
                            </dl>
                        </div>
                    }
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <app-sale-receipt [sale]="s" />
                </div>
            </div>

            @if (canVoid) {
                <app-sale-void-dialog [(visible)]="voidVisible" [sale]="s" (voided)="sale.set($event)" />
            }
        }
    `
})
export class SaleDetailPageComponent implements OnInit {
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly salesService = inject(SalesService);
    private readonly route = inject(ActivatedRoute);

    readonly canVoid = inject(AuthService).hasOperationClaim(SALES_CORRECT_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly sale = signal<SaleDetailVm | null>(null);
    readonly voidVisible = signal(false);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.loading.set(true);
        this.error.set(null);
        this.salesService.getSaleById(id).subscribe({
            next: (s) => {
                this.sale.set(s);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message || 'Satış yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    print(): void {
        printSaleReceipt();
    }

    soldAt(s: SaleDetailVm): string {
        return formatUtcIsoAsLocalDateTimeDisplay(s.soldAtUtc);
    }

    voidedAt(s: SaleDetailVm): string {
        return formatUtcIsoAsLocalDateTimeDisplay(s.voidedAtUtc);
    }
}
