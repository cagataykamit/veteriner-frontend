import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { SALES_CORRECT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SaleReceiptComponent } from '@/app/features/sales/components/sale-receipt.component';
import { SaleVoidDialogComponent } from '@/app/features/sales/components/sale-void-dialog.component';
import type { SaleDetailVm } from '@/app/features/sales/models/sale-vm.model';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { printSaleReceipt } from '@/app/features/sales/utils/sale-receipt-print.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

@Component({
    selector: 'app-sale-detail-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        SaleReceiptComponent,
        SaleVoidDialogComponent
    ],
    template: `
        @if (loading()) {
            <app-loading-state message="Satış yükleniyor…" />
        } @else if (error()) {
            <div class="card"><app-error-state [detail]="error()!" (retry)="load()" /></div>
        } @else if (sale(); as s) {
            <app-page-header categoryLink="/panel/sales" categoryLinkLabel="Satış listesine dön" />

            <!-- Kimlik kartı: toplam tutar + durum rozeti, satış zamanı, müşteri, iptal bilgisi; sağda Fişi yazdır; gösterge şeridi (toplam, ödenen, kalan). -->
            <app-detail-identity-card icon="pi pi-shopping-cart" [title]="s.totalText" [subtitle]="soldAt(s)" [meta]="s.isWalkIn ? 'Kayıtsız (walk-in) müşteri' : ''" ariaLabel="Satış kimliği" testId="sale-identity-card">
                <app-status-tag badges [label]="s.statusLabel" [severity]="s.statusSeverity" />
                <app-detail-subject-line [clientId]="s.isWalkIn ? null : s.clientId" [clientName]="s.clientName" />
                @if (s.isVoided) {
                    <p class="m-0 mt-3 inline-flex items-start gap-2 rounded-border border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="status" data-testid="sale-void-info">
                        <i class="pi pi-ban text-xs mt-1" aria-hidden="true"></i>
                        <span>
                            <span class="font-medium">İptal edildi</span> · {{ voidedAt(s) }}
                            <span class="block">Gerekçe: {{ s.voidReason }}</span>
                            <span class="block">Stok: {{ s.voidStockOutcomeLabel }}</span>
                        </span>
                    </p>
                }
                <ng-container actions>
                    <button pButton type="button" class="p-button-outlined p-button-secondary" (click)="print()"><i class="p-button-icon pi pi-print"></i>Fişi yazdır</button>
                </ng-container>
                <div stat>
                    <dt>Toplam</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ s.totalText }}</dd>
                </div>
                <div stat>
                    <dt>Ödenen</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ s.paidText }}</dd>
                </div>
                <div stat>
                    <dt>Kalan borç</dt>
                    <dd>
                        @if (s.hasOutstanding) {
                            <span class="font-semibold text-red-600 dark:text-red-400 tabular-nums">{{ s.outstandingText }}</span>
                        } @else {
                            <span class="field-empty">Yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>

            <!-- Eylem şeridi: gerekçeli iptal (salt okunurda gösterilmez; mevcut davranış). -->
            @if (canVoid && !s.isVoided && !ro.mutationBlocked()) {
                <app-detail-action-bar ariaLabel="Satış eylemleri">
                    <button pButton type="button" severity="danger" [outlined]="true" (click)="voidVisible.set(true)"><i class="p-button-icon pi pi-ban"></i>İptal et</button>
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: fiş | not (8/4, eşit yükseklik). -->
            <div class="@container">
                <div class="grid grid-cols-12 gap-4">
                    <div class="min-w-0 col-span-12 [&>.card]:mb-0 [&>.card]:h-full" [class.@4xl:col-span-8]="!!s.notes">
                        <app-sale-receipt [sale]="s" />
                    </div>
                    @if (s.notes) {
                        <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4">
                            <h5 class="mt-0 mb-3">Not</h5>
                            <p class="m-0 whitespace-pre-wrap">{{ s.notes }}</p>
                        </div>
                    }
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

    readonly canVoid = inject(AuthService).hasOperationClaim(SALES_CORRECT_CLAIM);

    private readonly loader = new RouteEntityLoader<SaleDetailVm>({
        fetch: (id) => this.salesService.getSaleById(id),
        invalidIdMessage: 'Geçersiz satış.',
        errorMessage: (e) => panelHttpFailureMessage(e, 'Satış yüklenemedi.'),
        onRouteChange: () => this.voidVisible.set(false)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly sale = this.loader.value;
    readonly voidVisible = signal(false);

    ngOnInit(): void {
        this.loader.init();
    }

    load(): void {
        this.loader.reload();
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
