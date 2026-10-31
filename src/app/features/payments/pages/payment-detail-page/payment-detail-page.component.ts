import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { appointmentTypeDisplayLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import type { PaymentDetailVm } from '@/app/entities/payment/models/payment-vm.model';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { paymentMethodLabel } from '@/app/entities/payment/utils/payment-method.utils';
import { DetailRelatedSummariesService } from '@/app/entities/patient/services/detail-related-summaries.service';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_CORRECT_CLAIM, PAYMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-payment-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        ReasonConfirmDialogComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Ödeme kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Ödeme yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (payment(); as p) {
            <app-page-header categoryLink="/panel/payments" categoryLinkLabel="Ödeme listesine dön" />

            <!-- Kimlik kartı: tutar başlık, ödeme zamanı, kanal, müşteri/hasta; sağda Düzenle; gösterge şeridi (tutar, kanal, zaman, randevu, muayene). -->
            <app-detail-identity-card icon="pi pi-wallet" [title]="moneyLine(p)" [subtitle]="formatPaidAtUtc(p.paidAtUtc)" [meta]="'Kanal: ' + methodLabel(p.method) + ' · Para birimi: ' + p.currency" ariaLabel="Ödeme kimliği" testId="payment-identity-card">
                <app-detail-subject-line [petId]="p.petId" [petName]="p.petName" [clientId]="p.clientId" [clientName]="p.clientName" />
                <ng-container actions>
                    @if (canUpdatePayment && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/payments', p.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdatePayment && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                </ng-container>
                <div stat>
                    <dt>Tutar</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ moneyLine(p) }}</dd>
                </div>
                <div stat>
                    <dt>Kanal</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ methodLabel(p.method) }}</dd>
                </div>
                <div stat>
                    <dt>Ödeme zamanı</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ formatPaidAtUtc(p.paidAtUtc) }}</dd>
                </div>
                <div stat>
                    <dt>Randevu</dt>
                    <dd>
                        @if (p.appointmentId) {
                            <a [routerLink]="['/panel/appointments', p.appointmentId]" class="text-primary font-semibold no-underline">Randevu kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı randevu yok</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Muayene</dt>
                    <dd>
                        @if (p.examinationId) {
                            <a [routerLink]="['/panel/examinations', p.examinationId]" class="text-primary font-semibold no-underline">Muayene kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı muayene yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>

            <!-- Eylem şeridi: gerekçeli iptal (salt okunurda gösterilmez; mevcut davranış). -->
            @if (canVoidPayment && !ro.mutationBlocked()) {
                <app-detail-action-bar ariaLabel="Ödeme eylemleri">
                    <button pButton type="button" class="p-button-danger p-button-outlined" (click)="voidVisible = true"><i class="pi pi-ban"></i>İptal et</button>
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: ilgili muayeneler | son randevular (6/6, eşit yükseklik); notlar tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-6">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-3">
                            <h5 class="mt-0 mb-0">İlgili muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (exLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (exError()) {
                            <p class="text-muted-color m-0">{{ exError() }}</p>
                        } @else if (exItemsView().total === 0) {
                            <app-empty-state message="Bağlamsal muayene bulunamadı." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of exItemsView().displayed; track row.id) {
                                    <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ row.examinedAtUtc | trDateTime }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium break-words">{{ row.visitReason }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-6">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-3">
                            <h5 class="mt-0 mb-0">Son randevular (hasta)</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!p.petId) {
                            <app-empty-state [message]="p.hasMultiplePets ? 'Ödeme birden fazla hastaya ait; randevu özeti gösterilemiyor.' : 'Hasta bilgisi yok; randevu özeti gösterilemiyor.'" />
                        } @else if (apptLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apptError()) {
                            <p class="text-muted-color m-0">{{ apptError() }}</p>
                        } @else if (apptItemsView().total === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apptItemsView().displayed; track row.id) {
                                    <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ row.scheduledAtUtc | trDateTime }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium break-words">{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="card mb-0">
                    <h5 class="mt-0 mb-3">Notlar</h5>
                    @if (p.note === emptyMark) {
                        <p class="m-0 field-empty">Not bulunmuyor</p>
                    } @else {
                        <p class="m-0 whitespace-pre-wrap">{{ p.note }}</p>
                    }
                </div>
            </div>
        }

        <app-reason-confirm-dialog
            [(visible)]="voidVisible"
            header="Ödemeyi iptal et"
            [summary]="payment() ? payment()!.clientName + ' · ' + headerDescription(payment()!) : null"
            description="Ödeme hiç alınmamış sayılır: bağlı olduğu ücretlerin açık tutarı artar, listelerden ve bakiyeden düşer. Geri alınamaz; yanlışsa doğrusu yeni ödeme olarak girilir."
            confirmLabel="Ödemeyi iptal et"
            failureFallback="Ödeme iptal edilemedi."
            [execute]="voidPayment"
            (confirmed)="afterVoid()"
        />
    `
})
export class PaymentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly paymentsService = inject(PaymentsService);
    private readonly related = inject(DetailRelatedSummariesService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly showSavedBanner = signal(false);
    readonly canUpdatePayment = this.auth.hasOperationClaim(PAYMENTS_UPDATE_CLAIM);
    readonly canVoidPayment = this.auth.hasOperationClaim(PAYMENTS_CORRECT_CLAIM);
    voidVisible = false;
    readonly voidPayment = (reason: string) => this.paymentsService.voidPayment(this.payment()!.id, reason);

    readonly emptyMark = '—';

    private readonly loader = new RouteEntityLoader<PaymentDetailVm>({
        fetch: (id) => this.paymentsService.getPaymentById(id),
        invalidIdMessage: 'Geçersiz ödeme.',
        onLoaded: (x) => this.loadRelatedBlocks(x)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly payment = this.loader.value;

    readonly exLoading = signal(false);
    readonly exError = signal<string | null>(null);
    readonly exItems = signal<ExaminationListItemVm[]>([]);

    readonly apptLoading = signal(false);
    readonly apptError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);

    readonly exItemsView = computed(() => sliceDetailRelatedList(this.exItems()));
    readonly apptItemsView = computed(() => sliceDetailRelatedList(this.apptItems()));

    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly methodLabel = paymentMethodLabel;
    readonly typeDisplay = appointmentTypeDisplayLabel;

    moneyLine(p: PaymentDetailVm): string {
        return formatMoney(p.amount, p.currency || 'TRY');
    }

    headerDescription(p: PaymentDetailVm): string {
        const parts: string[] = [this.moneyLine(p), this.methodLabel(p.method)];
        const paid = p.paidAtUtc?.trim();

        if (paid) {
            parts.push('Ödeme: ' + this.formatPaidAtUtc(paid));
        }

        return parts.join(' · ');
    }

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.loader.init();
    }

    /** İptal edilen ödeme artık okunamaz (404); listeye dönülür. */
    afterVoid(): void {
        void this.router.navigate(['/panel/payments']);
    }

    reload(): void {
        this.loader.reload();
    }

    private loadRelatedBlocks(p: PaymentDetailVm): void {
        this.exLoading.set(true);
        this.exError.set(null);
        this.related.loadRelatedExaminationsForPaymentContext(p.petId, p.clientId).subscribe({
            next: (items) => {
                this.exItems.set(items);
                this.exLoading.set(false);
            },
            error: (e: Error) => {
                this.exError.set(panelHttpFailureMessage(e, 'Muayeneler yüklenemedi.'));
                this.exLoading.set(false);
            }
        });

        this.apptLoading.set(true);
        this.apptError.set(null);
        this.related.loadRecentAppointmentsForPaymentPetContext(p.petId).subscribe({
            next: (items) => {
                this.apptItems.set(items);
                this.apptLoading.set(false);
            },
            error: (e: Error) => {
                this.apptError.set(panelHttpFailureMessage(e, 'Randevular yüklenemedi.'));
                this.apptLoading.set(false);
            }
        });
    }
}
