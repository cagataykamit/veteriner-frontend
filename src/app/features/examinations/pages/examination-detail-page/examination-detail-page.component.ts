import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { appointmentTypeDisplayLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { ExaminationDetailVm, ExaminationFinalizeResultVm, ExaminationRelatedSummaryVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationAddendaSectionComponent } from '@/app/features/examinations/components/examination-addenda-section.component';
import { AdministrationsSectionComponent } from '@/app/entities/administration/components/administrations-section.component';
import { ExaminationPatientHeaderComponent } from '@/app/features/examinations/components/examination-patient-header.component';
import { ExaminationPatientContextComponent } from '@/app/features/examinations/components/examination-patient-context.component';
import { ExaminationProceduresSectionComponent } from '@/app/features/examinations/components/examination-procedures-section.component';
import { finalizeChecklist, finalizeWarnings } from '@/app/features/examinations/utils/examination-procedures.utils';
import { ExaminationFinalizeChecklistComponent } from '@/app/features/examinations/components/examination-finalize-checklist.component';
import { ExaminationFinalizeDialogComponent } from '@/app/features/examinations/components/examination-finalize-dialog.component';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { examinationStatusLabel, examinationStatusSeverity, isExaminationEditable } from '@/app/entities/examination/utils/examination-status.utils';
import { paymentMethodLabel } from '@/app/entities/payment/utils/payment-method.utils';
import { DetailRelatedSummariesService } from '@/app/entities/patient/services/detail-related-summaries.service';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    ADMINISTRATIONS_CREATE_CLAIM,
    CHARGES_CREATE_CLAIM,
    EXAMINATION_TEMPLATES_APPLY_CLAIM,
    EXAMINATION_TEMPLATES_READ_CLAIM,
    EXAMINATIONS_ADDENDUM_CLAIM,
    EXAMINATIONS_FINALIZE_CLAIM,
    EXAMINATIONS_UPDATE_CLAIM,
    PAYMENTS_CREATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ExaminationTemplateApplyDialogComponent } from '@/app/entities/examination-template/components/examination-template-apply-dialog.component';
import type { ExaminationTemplateApplyResultDto, ExaminationTemplateDto } from '@/app/entities/examination-template/models/examination-template.model';
import { templateApplySummary } from '@/app/entities/examination-template/utils/examination-template.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateDisplay } from '@/app/shared/utils/date.utils';
import { RecentlyViewedService, recentlyViewedSubtitle } from '@/app/entities/patient/services/recently-viewed.service';
import { AppDetailSeeAllLinkComponent } from '@/app/shared/ui/detail-see-all-link/app-detail-see-all-link.component';
import { AppDetailRowLinkComponent } from '@/app/shared/ui/detail-row-link/app-detail-row-link.component';

/** Kayıt metin bölümleri sırası; vital satırı `findings` ile `assessment` arasına girer. */
const RECORD_TEXT_SECTIONS: readonly {
    field: 'visitReason' | 'anamnesis' | 'findings' | 'assessment' | 'plan' | 'notes';
    label: string;
    afterVitals: boolean;
}[] = [
    { field: 'visitReason', label: 'Şikâyet / ziyaret sebebi', afterVitals: false },
    { field: 'anamnesis', label: 'Anamnez', afterVitals: false },
    { field: 'findings', label: 'Klinik bulgular', afterVitals: false },
    { field: 'assessment', label: 'Değerlendirme / tanı', afterVitals: true },
    { field: 'plan', label: 'Plan / tedavi planı', afterVitals: true },
    { field: 'notes', label: 'Ek notlar', afterVitals: true }
];

@Component({
    selector: 'app-examination-detail-page',
    standalone: true,
    imports: [
        AppDetailRowLinkComponent, AppDetailSeeAllLinkComponent, CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        RecordHistoryButtonComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        ExaminationAddendaSectionComponent,
        AdministrationsSectionComponent,
        ExaminationFinalizeChecklistComponent,
        ExaminationFinalizeDialogComponent,
        ExaminationPatientContextComponent,
        ExaminationPatientHeaderComponent,
        ExaminationProceduresSectionComponent,
        ExaminationTemplateApplyDialogComponent,
        ToastModule,
        TrDateTimePipe
    ],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />
        @if (exam(); as e) {
            <app-examination-finalize-dialog [examinationId]="e.id" [rowVersion]="e.rowVersion" [warnings]="finalizeWarnings()" [(visible)]="finalizeDialogVisible" (finalized)="onFinalized($event)" />
            @if (canApplyTemplate) {
                <app-examination-template-apply-dialog [examinationId]="e.id" [rowVersion]="e.rowVersion" [examinationVisitReason]="e.visitReason" [(visible)]="templateDialogVisible" (applied)="onTemplateApplied($event)" (stale)="onTemplateStale($event)" />
            }
        }
        @if (loading()) {
            <app-loading-state message="Muayene yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (exam(); as e) {
            <app-page-header categoryLink="/panel/examinations" categoryLinkLabel="Muayene listesine dön" />

            <!-- Kimlik kartı (müşteri/hasta kartıyla aynı dil): durum rozeti, muayene tarihi (alt başlık), kayıt satırı, hasta/sahip satırı; sağda Düzenle, şablon, geçmiş. Tarih ve durum tek yerde; gösterge şeridi tekrar etmez. -->
            <app-detail-identity-card icon="pi pi-clipboard" title="Muayene" [subtitle]="e.examinedAtUtc | trDateTime" [meta]="'Oluşturulma: ' + (e.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (e.updatedAtUtc | trDateTime)" ariaLabel="Muayene kimliği" testId="exam-identity-card">
                <span badges data-testid="exam-status">
                    <app-status-tag [label]="statusLabel(e.status)" [severity]="statusSeverity(e.status)" />
                </span>
                <app-examination-patient-header [petId]="e.petId" [clientId]="e.clientId" />
                <ng-container actions>
                    @if (canApplyTemplateNow()) {
                        <button pButton type="button" class="p-button-text p-button-secondary" data-testid="template-apply-open" (click)="templateDialogVisible.set(true)"><i class="pi pi-clone"></i>Şablon uygula</button>
                    }
                    @if (canUpdateExamination && isEditable(e.status)) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/examinations', e.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        }
                    }
                    <app-record-history-button resource="examinations" [recordId]="e.id" />
                </ng-container>
                <div stat>
                    <dt>Kesinleştirme</dt>
                    <dd>
                        @if (e.status === 'Finalized') {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums" data-testid="finalized-info">
                                {{ e.finalizedAtUtc | trDateTime }}
                                @if (e.finalizedByName) {
                                    <span class="text-muted-color text-sm font-normal"> · {{ e.finalizedByName }}</span>
                                }
                            </span>
                        } @else {
                            <span class="field-empty">Kesinleştirilmedi</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Klinik</dt>
                    <dd>
                        @if (e.clinicName?.trim()) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 break-words">{{ e.clinicName }}</span>
                        } @else {
                            <span class="field-empty">Belirtilmemiş</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Randevu</dt>
                    <dd>
                        @if (e.appointmentId?.trim()) {
                            <a [routerLink]="['/panel/appointments', e.appointmentId]" class="font-semibold text-primary no-underline" data-testid="appointment-link">Bağlı randevu →</a>
                        } @else {
                            <span class="field-empty">Bağlı randevu yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>

            <!-- Eylem şeridi: para işlemleri; kesinleştirme sağdaki kontrol listesinde kalır. -->
            @if (e.clientId?.trim() && e.petId?.trim() && (canCreateCharge || canCreatePayment)) {
                @let moneyContext = { clientId: e.clientId, petId: e.petId, examinationId: e.id };
                <app-detail-action-bar ariaLabel="Muayene eylemleri">
                    @if (canCreateCharge) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/charges/new']" [queryParams]="moneyContext" pButton type="button" class="p-button-primary" data-testid="charge-new-link"><i class="pi pi-plus"></i>Ücret ekle</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-primary"><i class="pi pi-lock"></i>Ücret ekle (salt okunur)</button>
                        }
                    }
                    @if (canCreatePayment) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/payments/new']" [queryParams]="moneyContext" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Ödeme (salt okunur)</button>
                        }
                    }
                </app-detail-action-bar>
            }

            <!-- Çalışma alanı: ana sütun (kayıt, ek notlar, işlemler, uygulamalar) | yan sütun (kesinleştirme kontrolü, hasta bağlamı); kırılım içerik alanına göre (≥56rem iki sütun). -->
            <div class="@container">
                <div class="grid grid-cols-12 gap-4 items-start" data-testid="exam-workspace">
                    <div class="col-span-12 @4xl:col-span-8 min-w-0 flex flex-col gap-4">
                        <div class="card mb-0" data-testid="exam-record">
                            <h5 class="mt-0 mb-4">Muayene kaydı</h5>
                            @for (s of recordSectionsBeforeVitals(); track s.label) {
                                <div class="mb-4">
                                    <h6 class="m-0 mb-1 field-label">{{ s.label }}</h6>
                                    <p class="m-0 whitespace-pre-wrap">{{ s.text }}</p>
                                </div>
                            }
                            <div class="mb-4" data-testid="vital-row">
                                <h6 class="m-0 mb-1 field-label">Vital</h6>
                                @if (vitals().length === 0) {
                                    <p class="m-0 field-empty">Ölçülmemiş.</p>
                                } @else {
                                    <div class="flex flex-wrap gap-x-5 gap-y-1">
                                        @for (v of vitals(); track v.label) {
                                            <span data-testid="vital"
                                                ><span class="text-muted-color text-sm mr-1">{{ v.label }}</span
                                                ><span class="font-medium">{{ v.value }}</span></span
                                            >
                                        }
                                        @if (e.vitalsMeasuredAtUtc) {
                                            <span class="text-muted-color text-sm self-center">Ölçüm: {{ e.vitalsMeasuredAtUtc | trDateTime }}</span>
                                        }
                                    </div>
                                }
                            </div>
                            @for (s of recordSectionsAfterVitals(); track s.label) {
                                <div class="mb-4">
                                    <h6 class="m-0 mb-1 field-label">{{ s.label }}</h6>
                                    <p class="m-0 whitespace-pre-wrap">{{ s.text }}</p>
                                </div>
                            }
                            @if (emptySectionLabels().length > 0) {
                                <p class="field-empty m-0" data-testid="record-empty-sections">Girilmemiş: {{ emptySectionLabels().join(', ') }}</p>
                            }
                        </div>

                        @if (e.status === 'Finalized') {
                            <app-examination-addenda-section [examinationId]="e.id" [canAdd]="canAddAddendum()" />
                        }

                        <app-examination-procedures-section [exam]="e" [summary]="relatedSummary()" [loading]="relatedSummaryLoading()" [error]="relatedSummaryError()" (changed)="onProcedureAdded()" (retry)="retryRelatedSummary()" />

                        @if (e.petId?.trim()) {
                            <app-administrations-section [petId]="e.petId!" [petName]="e.petName" [examinationId]="e.id" [locked]="e.status === 'Finalized'" />
                        }
                    </div>

                    <!-- Geniş alanda sabit: üst çubuk (4rem) + 1rem, soldaki menünün üst hizası (_menu.scss top: 5rem). -->
                    <aside class="col-span-12 @4xl:col-span-4 @4xl:sticky @4xl:top-20 min-w-0 flex flex-col gap-4" data-testid="finalize-aside">
                        <app-examination-finalize-checklist [exam]="e" [items]="finalizeChecklist()" [canFinalize]="canFinalizeNow()" (finalizeRequested)="finalizeDialogVisible.set(true)" />
                        <app-examination-patient-context [petId]="e.petId" [excludeExaminationId]="e.id" />
                    </aside>
                </div>

                <!-- İlgili kayıtlar: tek kart, iki sütun (bağlı ödemeler | aynı hastanın randevuları); boşken yalnız birer satır. -->
                <section class="card mt-4 mb-0" aria-labelledby="exam-related-title" data-testid="exam-related">
                    <h5 id="exam-related-title" class="mt-0 mb-3">İlgili kayıtlar</h5>
                    <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-x-8 gap-y-4">
                        <div class="min-w-0" data-testid="related-payments">
                            <h6 class="m-0 mb-1 field-label">Bağlı ödemeler</h6>
                            @if (relatedSummaryLoading()) {
                                <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                            } @else if (relatedSummaryError()) {
                                <app-error-state [detail]="relatedSummaryError()!" (retry)="retryRelatedSummary()" />
                            } @else if (relatedPaymentsView().total === 0) {
                                <p class="field-empty m-0">{{ copy.listEmptyMessage }}</p>
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedPaymentsView().displayed; track row.id) {
                                        <li class="flex gap-3 items-baseline justify-between py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0 text-sm">
                                            <div class="min-w-0 break-words">
                                                <span class="text-muted-color">{{ row.paidAtUtc | trDateTime }}</span>
                                                <span> · {{ payMethodLabel(row.method) }}</span>
                                                @if (row.clinicName) {
                                                    <span class="text-muted-color"> · {{ row.clinicName }}</span>
                                                }
                                            </div>
                                            <a [routerLink]="['/panel/payments', row.id]" class="shrink-0 font-semibold tabular-nums no-underline text-surface-900 dark:text-surface-0 hover:text-primary" [attr.aria-label]="'Ödeme detayı: ' + money(row.amount, row.currency)">{{ money(row.amount, row.currency) }}</a>
                                        </li>
                                    }
                                </ul>
                                <app-detail-see-all-link link="/panel/payments" [queryParams]="{ petId: e.petId }" [itemCount]="relatedPaymentsView().displayed.length" />
                            }
                        </div>
                        <div class="min-w-0" data-testid="related-appointments">
                            <h6 class="m-0 mb-1 field-label">Randevular (aynı hasta)</h6>
                            @if (!e.petId) {
                                <p class="field-empty m-0">Hasta bilgisi yok; liste gösterilemiyor.</p>
                            } @else if (apptLoading()) {
                                <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                            } @else if (apptError()) {
                                <p class="text-muted-color m-0">{{ apptError() }}</p>
                            } @else if (apptItemsView().total === 0) {
                                <p class="field-empty m-0">Kayıt bulunamadı.</p>
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of apptItemsView().displayed; track row.id) {
                                        <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0 text-sm">
                                            <div class="flex flex-wrap gap-2 justify-between items-center">
                                                <span class="text-muted-color min-w-0">{{ row.scheduledAtUtc | trDateTime }}</span>
                                                <app-detail-row-link [link]="['/panel/appointments', row.id]" [ariaLabel]="'Randevu detayı: ' + (row.scheduledAtUtc | trDateTime)" />
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                        </li>
                                    }
                                </ul>
                                <app-detail-see-all-link link="/panel/appointments" [queryParams]="{ petId: e.petId }" [itemCount]="apptItemsView().displayed.length" />
                            }
                        </div>
                    </div>
                </section>
            </div>
        }
    `
})
export class ExaminationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly related = inject(DetailRelatedSummariesService);
    private readonly auth = inject(AuthService);
    private readonly recentlyViewed = inject(RecentlyViewedService);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;

    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

    private readonly loader = new RouteEntityLoader<ExaminationDetailVm>({
        fetch: (id) => this.examinationsService.getExaminationById(id),
        invalidIdMessage: 'Geçersiz muayene.',
        onRouteChange: () => this.resetRelatedSummary(),
        onReload: () => this.resetRelatedSummary(),
        onLoaded: (x) => this.loadRelatedBlocks(x),
        onError: () => this.resetRelatedSummary()
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly exam = this.loader.value;

    readonly relatedSummaryLoading = signal(false);
    readonly relatedSummaryError = signal<string | null>(null);
    readonly relatedSummary = signal<ExaminationRelatedSummaryVm | null>(null);
    readonly canUpdateExamination = this.auth.hasOperationClaim(EXAMINATIONS_UPDATE_CLAIM);
    readonly isEditable = isExaminationEditable;
    readonly canFinalizeExamination = this.auth.hasOperationClaim(EXAMINATIONS_FINALIZE_CLAIM);
    readonly canCreatePayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    /** Ücret ekle / Ödeme Oluştur: muayene düzenleme izninden bağımsız, yalnız ilgili finans izniyle (resepsiyon akışı). */
    readonly canCreateCharge = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);
    readonly canAddendumExamination = this.auth.hasOperationClaim(EXAMINATIONS_ADDENDUM_CLAIM);
    readonly statusLabel = examinationStatusLabel;
    readonly statusSeverity = examinationStatusSeverity;
    readonly finalizeDialogVisible = signal(false);
    /** Şablon uygulama metin + uygulama kaydı + ücret kalemi yazar: üç yazma izni (ve listeyi okuma) birlikte gerekir. */
    readonly canApplyTemplate = [EXAMINATION_TEMPLATES_READ_CLAIM, EXAMINATION_TEMPLATES_APPLY_CLAIM, EXAMINATIONS_UPDATE_CLAIM, ADMINISTRATIONS_CREATE_CLAIM].every((c) => this.auth.hasOperationClaim(c));
    readonly templateDialogVisible = signal(false);

    private readonly procedures = viewChild(ExaminationProceduresSectionComponent);
    private readonly administrations = viewChild(AdministrationsSectionComponent);

    /** Kesinleştirme kontrol listesi (sağ panel) ve onaydaki uyarılar aynı kuraldan türer (engel değil). */
    readonly finalizeChecklist = computed(() => {
        const e = this.exam();

        return e ? finalizeChecklist(e, this.relatedSummary()) : [];
    });
    readonly finalizeWarnings = computed(() => {
        const e = this.exam();

        return e ? finalizeWarnings(e, this.relatedSummary()) : [];
    });
    readonly relatedPaymentsView = computed(() => sliceDetailRelatedList(this.relatedSummary()?.payments));
    readonly apptItemsView = computed(() => sliceDetailRelatedList(this.apptItems()));

    /** Kayıt metin bölümleri: dolu olanlar başlıklı gösterilir, boşlar tek satırda "Girilmemiş" altında toplanır. */
    private readonly textSections = computed(() => {
        const e = this.exam();

        if (!e) {
            return [];
        }

        return RECORD_TEXT_SECTIONS.map((s) => ({ ...s, text: e[s.field] }));
    });
    readonly recordSectionsBeforeVitals = computed(() => this.textSections().filter((s) => !s.afterVitals && s.text !== this.emptyMark));
    readonly recordSectionsAfterVitals = computed(() => this.textSections().filter((s) => s.afterVitals && s.text !== this.emptyMark));
    readonly emptySectionLabels = computed(() =>
        this.textSections()
            .filter((s) => s.text === this.emptyMark)
            .map((s) => s.label)
    );
    /** Vital satırı: yalnız ölçülmüş değerler; hiçbiri yoksa satır "Ölçülmemiş" der. */
    readonly vitals = computed(() => {
        const e = this.exam();

        if (!e) {
            return [];
        }

        return [
            { label: 'Kilo', value: e.weightKg, unit: 'kg' },
            { label: 'Sıcaklık', value: e.temperatureC, unit: '°C' },
            { label: 'Kalp', value: e.heartRateBpm, unit: 'atım/dk' },
            { label: 'Solunum', value: e.respiratoryRatePerMin, unit: 'soluk/dk' }
        ]
            .filter((v) => v.value !== null)
            .map((v) => ({ label: v.label, value: `${v.value} ${v.unit}` }));
    });

    readonly apptLoading = signal(false);
    readonly apptError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);

    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly money = (amount: number | null, currency: string | null | undefined) => formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    readonly payMethodLabel = paymentMethodLabel;

    /** Kesinleştir yalnız taslakta, yetkiliyse ve kurum yazmaya açıkken görünür. */
    canFinalizeNow(): boolean {
        return this.canFinalizeExamination && this.exam()?.status === 'Draft' && !this.ro.mutationBlocked();
    }

    /** Şablon yalnız taslağa, yetkiliyse ve kurum yazmaya açıkken uygulanır (kesinleşmişte eylem görünmez). */
    canApplyTemplateNow(): boolean {
        return this.canApplyTemplate && this.exam()?.status === 'Draft' && !this.ro.mutationBlocked();
    }

    onTemplateApplied(event: { template: ExaminationTemplateDto; result: ExaminationTemplateApplyResultDto }): void {
        addTracedToast(this.messages, 'ExaminationDetailPage', this.router.url, {
            severity: 'success',
            summary: 'Tamam',
            detail: templateApplySummary(event.template, event.result)
        });
        this.refreshAfterTemplate();
    }

    /** Sürüm çakışması veya kesinleşme: kayıt sessizce yenilenir (yeni `rowVersion` diyaloğa geri gider). */
    onTemplateStale(message: string): void {
        if (!this.templateDialogVisible()) {
            addTracedToast(this.messages, 'ExaminationDetailPage', this.router.url, { severity: 'warn', summary: 'Uyarı', detail: message });
        }

        this.refreshAfterTemplate();
    }

    canAddAddendum(): boolean {
        return this.canAddendumExamination && !this.ro.mutationBlocked();
    }

    /** Yeni sürüm ve durum yerel kaydedilir; kesinleştiren adı için kaydı sessizce yeniler. */
    onFinalized(result: ExaminationFinalizeResultVm): void {
        const current = this.exam();

        if (current) {
            this.exam.set({ ...current, status: result.status, finalizedAtUtc: result.finalizedAtUtc, rowVersion: result.rowVersion });
        }

        addTracedToast(this.messages, 'ExaminationDetailPage', this.router.url, {
            severity: 'success',
            summary: 'Tamam',
            detail: 'Muayene kesinleştirildi.'
        });
        this.examinationsService.getExaminationById(result.id).subscribe({ next: (x) => this.exam.set(x), error: () => undefined });
    }

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            addTracedToast(this.messages, 'ExaminationDetailPage', this.router.url, {
                severity: 'success',
                summary: 'Tamam',
                detail: 'Muayene kaydedildi.'
            });
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }

    /** İşlem yan panelinden kayıt eklendi: aynı muayenede kalınır, yalnız ilgili kayıt özeti yenilenir. */
    onProcedureAdded(): void {
        if (this.loader.id) {
            this.loadRelatedSummary(this.loader.id);
        }
    }

    retryRelatedSummary(): void {
        if (!this.loader.id) {
            return;
        }

        this.loadRelatedSummary(this.loader.id);
    }

    /** Şablon sonrası: muayene metni/sürümü, ilgili kayıt özeti ve uygulama listesi yeniden okunur (sayfa yükleme durumuna girmeden). */
    private refreshAfterTemplate(): void {
        if (!this.loader.id) {
            return;
        }

        const id = this.loader.id;

        this.examinationsService.getExaminationById(id).subscribe({ next: (x) => this.exam.set(x), error: () => undefined });
        this.loadRelatedSummary(id);
        this.administrations()?.reload();
    }

    private resetRelatedSummary(): void {
        this.relatedSummary.set(null);
        this.relatedSummaryLoading.set(false);
        this.relatedSummaryError.set(null);
    }

    private loadRelatedSummary(examinationId: string): void {
        this.relatedSummaryLoading.set(true);
        this.relatedSummaryError.set(null);
        this.examinationsService.getExaminationRelatedSummary(examinationId).subscribe({
            next: (s) => {
                this.relatedSummary.set(s);
                this.relatedSummaryLoading.set(false);
            },
            error: (e: Error) => {
                this.relatedSummaryError.set(panelHttpFailureMessage(e, 'İlgili kayıtlar yüklenemedi.'));
                this.relatedSummaryLoading.set(false);
            }
        });
    }

    private loadRelatedBlocks(x: ExaminationDetailVm): void {
        this.recentlyViewed.record({ kind: 'examination', id: x.id, title: x.petName, subtitle: recentlyViewedSubtitle(x.visitReason, formatUtcIsoAsLocalDateDisplay(x.examinedAtUtc)) });
        this.loadRelatedSummary(x.id);

        if (!x.petId?.trim()) {
            this.apptItems.set([]);
            this.apptLoading.set(false);
            this.apptError.set(null);

            return;
        }

        const petId = x.petId.trim();

        this.apptLoading.set(true);
        this.apptError.set(null);
        this.related.loadRecentAppointmentsForPetChronological(petId).subscribe({
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
