import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SUBSCRIPTION_BILLING_PERIOD_LABELS, subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';
import { REFUND_STATUS_LABELS, REFUND_STATUS_SEVERITIES, type DuplicatePaymentDto } from '@/app/features/duplicate-payments/models/duplicate-payment.model';
import { DuplicatePaymentsService } from '@/app/features/duplicate-payments/services/duplicate-payments.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Platform yöneticisi: aynı ödeme denemesinde gelen ikinci ödemeler. İlk işlenen ödeme paketi açar, sonraki otomatik iptal/iade edilir;
 * otomatik iade başarısızsa satır "Elle iade gerekli" olur ve iyzico panelinden iade yapıldıktan sonra burada işaretlenir.
 */
@Component({
    selector: 'app-duplicate-payments-page',
    standalone: true,
    imports: [
        ButtonModule,
        ConfirmDialogModule,
        TableModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
        <app-page-header
            title="Çift ödemeler"
            description="Aynı kurumdan aynı ödeme denemesinde ikinci bir ödeme gelirse otomatik iptal/iade edilir. Otomatik iade başarısız olursa burada “Elle iade gerekli” görünür. Yalnız Vetinity platform yöneticisi görür."
        />

        @if (loading() && rows().length === 0) {
            <div class="card"><app-loading-state message="Çift ödemeler yükleniyor…" /></div>
        } @else if (error()) {
            <div class="card"><app-error-state [detail]="error()!" (retry)="load()" /></div>
        } @else {
            <div class="card">
                @if (actionError()) {
                    <p class="text-red-500 text-sm mt-0 mb-3" role="alert" data-testid="dp-action-error">{{ actionError() }}</p>
                }
                @if (rows().length === 0) {
                    <app-empty-state message="Çift ödeme yok." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="rows()" dataKey="checkoutSessionId">
                            <ng-template #header>
                                <tr>
                                    <th>Kurum</th>
                                    <th>Paket ve dönem</th>
                                    <th class="text-right">Tutar</th>
                                    <th>Tespit zamanı</th>
                                    <th>Durum</th>
                                    <th class="text-right">Deneme</th>
                                    <th>Neden</th>
                                    <th></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr data-testid="dp-row">
                                    <td>{{ row.tenantName || row.tenantId }}</td>
                                    <td>{{ planText(row) }}</td>
                                    <td class="text-right whitespace-nowrap">{{ amountText(row) }}</td>
                                    <td class="whitespace-nowrap">{{ dateTime(row.detectedAtUtc) }}</td>
                                    <td><app-status-tag [label]="statusLabel(row)" [severity]="statusSeverity(row)" /></td>
                                    <td class="text-right">{{ row.refundAttemptCount }}</td>
                                    <td>{{ row.refundFailureReason || '—' }}</td>
                                    <td class="text-right whitespace-nowrap">
                                        @if (row.refundStatus === 'ManualRequired') {
                                            <button
                                                pButton
                                                type="button"
                                                size="small"
                                                severity="secondary"
                                                [disabled]="markingId() !== null"
                                                (click)="confirmMarkRefunded(row)"
                                                data-testid="dp-mark-refunded"
                                            ><i class="p-button-icon" [class]="markingId() === row.checkoutSessionId ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>İade edildi olarak işaretle</button>
                                        }
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </div>
        }
    `
})
export class DuplicatePaymentsPageComponent implements OnInit {
    private readonly service = inject(DuplicatePaymentsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly messages = inject(MessageService);

    readonly rows = signal<DuplicatePaymentDto[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly markingId = signal<string | null>(null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);

        this.service.list().subscribe({
            next: (rows) => {
                this.rows.set(rows);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Çift ödemeler yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    confirmMarkRefunded(row: DuplicatePaymentDto): void {
        this.confirmation.confirm({
            header: 'İade edildi olarak işaretle',
            message: `${row.tenantName || row.tenantId} için ${this.amountText(row)} tutarındaki ödemeyi iyzico panelinden iade ettikten sonra işaretleyin. İşaretleme para iadesi yapmaz, yalnız kaydı kapatır.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'İade edildi',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.markRefunded(row)
        });
    }

    planText(row: DuplicatePaymentDto): string {
        return `${subscriptionPlanLabel(row.targetPlanCode, null)} · ${SUBSCRIPTION_BILLING_PERIOD_LABELS[row.billingPeriod] ?? row.billingPeriod}`;
    }

    statusLabel(row: DuplicatePaymentDto): string {
        return REFUND_STATUS_LABELS[row.refundStatus] ?? row.refundStatus;
    }

    statusSeverity(row: DuplicatePaymentDto): StatusTagSeverity {
        return REFUND_STATUS_SEVERITIES[row.refundStatus] ?? 'secondary';
    }

    amountText(row: DuplicatePaymentDto): string {
        return row.amountMinor === null ? '—' : formatMoney(row.amountMinor / 100, row.currencyCode || 'TRY');
    }

    dateTime(value: string): string {
        return formatDateTimeDisplay(value);
    }

    private markRefunded(row: DuplicatePaymentDto): void {
        this.markingId.set(row.checkoutSessionId);
        this.actionError.set(null);

        this.service.markRefunded(row.checkoutSessionId).subscribe({
            next: () => {
                this.markingId.set(null);
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Ödeme iade edildi olarak işaretlendi.' });
                this.load();
            },
            error: (e: unknown) => {
                this.markingId.set(null);
                this.actionError.set(e instanceof Error ? e.message : 'İade edildi olarak işaretlenemedi.');
            }
        });
    }
}
