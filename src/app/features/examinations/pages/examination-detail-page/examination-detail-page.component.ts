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
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
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
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
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
                <app-examination-template-apply-dialog [examinationId]="e.id" [rowVersion]="e.rowVersion" [(visible)]="templateDialogVisible" (applied)="onTemplateApplied($event)" (stale)="onTemplateStale($event)" />
            }
        }
        @if (loading()) {
            <app-loading-state message="Muayene yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (exam()) {
            <app-page-header categoryLink="/panel/examinations" categoryLinkLabel="Muayene listesine dön" title="Muayene" [description]="exam()!.examinedAtUtc | trDateTime">
                <div actions class="flex flex-wrap gap-2">
                    @if (canApplyTemplateNow()) {
                        <button pButton type="button" class="p-button-secondary" data-testid="template-apply-open" (click)="templateDialogVisible.set(true)"><i class="pi pi-clone"></i>Şablon uygula</button>
                    }
                    @if (canUpdateExamination && isEditable(exam()!.status)) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/examinations', exam()!.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        }
                    }
                    @if (exam()!.clientId?.trim() && exam()!.petId?.trim()) {
                        @let moneyContext = { clientId: exam()!.clientId, petId: exam()!.petId, examinationId: exam()!.id };
                        @if (canCreateCharge) {
                            @if (!ro.mutationBlocked()) {
                                <a [routerLink]="['/panel/charges/new']" [queryParams]="moneyContext" pButton type="button" class="p-button-secondary" data-testid="charge-new-link"><i class="pi pi-plus"></i>Ücret ekle</a>
                            } @else {
                                <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Ücret ekle (salt okunur)</button>
                            }
                        }
                        @if (canCreatePayment) {
                            @if (!ro.mutationBlocked()) {
                                <a [routerLink]="['/panel/payments/new']" [queryParams]="moneyContext" pButton type="button" class="p-button-secondary"><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                            } @else {
                                <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Ödeme (salt okunur)</button>
                            }
                        }
                    }
                </div>
            </app-page-header>

            <app-examination-patient-header [petId]="exam()!.petId" [clientId]="exam()!.clientId" />

            <div class="grid grid-cols-12 gap-4 items-start" data-testid="exam-workspace">
                <aside class="col-span-12 xl:col-span-3">
                    <app-examination-patient-context [petId]="exam()!.petId" [excludeExaminationId]="exam()!.id" />
                </aside>

                <div class="col-span-12 xl:col-span-6 min-w-0">
                    <div class="card" data-testid="exam-record">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                            <h4 class="m-0 text-xl font-semibold mr-auto">Muayene kaydı</h4>
                            <span data-testid="exam-status">
                                <app-status-tag [label]="statusLabel(exam()!.status)" [severity]="statusSeverity(exam()!.status)" />
                                @if (exam()!.status === 'Finalized') {
                                    <span class="text-muted-color text-sm ml-2" data-testid="finalized-info">
                                        {{ exam()!.finalizedAtUtc | trDateTime }}
                                        @if (exam()!.finalizedByName) {
                                            · {{ exam()!.finalizedByName }}
                                        }
                                    </span>
                                }
                            </span>
                        </div>
                        @for (s of recordSectionsBeforeVitals(); track s.label) {
                            <div class="mb-4">
                                <h5 class="mt-0 mb-1">{{ s.label }}</h5>
                                <p class="m-0 whitespace-pre-wrap">{{ s.text }}</p>
                            </div>
                        }
                        <div class="mb-4" data-testid="vital-row">
                            <h5 class="mt-0 mb-1">Vital</h5>
                            @if (vitals().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Ölçülmemiş.</p>
                            } @else {
                                <div class="flex flex-wrap gap-x-5 gap-y-1">
                                    @for (v of vitals(); track v.label) {
                                        <span data-testid="vital"
                                            ><span class="text-muted-color text-sm mr-1">{{ v.label }}</span
                                            ><span class="font-medium">{{ v.value }}</span></span
                                        >
                                    }
                                    @if (exam()!.vitalsMeasuredAtUtc) {
                                        <span class="text-muted-color text-sm self-center">Ölçüm: {{ exam()!.vitalsMeasuredAtUtc | trDateTime }}</span>
                                    }
                                </div>
                            }
                        </div>
                        @for (s of recordSectionsAfterVitals(); track s.label) {
                            <div class="mb-4">
                                <h5 class="mt-0 mb-1">{{ s.label }}</h5>
                                <p class="m-0 whitespace-pre-wrap">{{ s.text }}</p>
                            </div>
                        }
                        @if (emptySectionLabels().length > 0) {
                            <p class="text-sm text-muted-color m-0" data-testid="record-empty-sections">Girilmemiş: {{ emptySectionLabels().join(', ') }}</p>
                        }
                        <p class="text-xs text-muted-color mt-3 mb-0">Oluşturulma {{ exam()!.createdAtUtc | trDateTime }} · Güncellenme {{ exam()!.updatedAtUtc | trDateTime }}</p>
                    </div>

                    @if (exam()!.status === 'Finalized') {
                        <app-examination-addenda-section [examinationId]="exam()!.id" [canAdd]="canAddAddendum()" />
                    }

                    <app-examination-procedures-section [exam]="exam()!" [summary]="relatedSummary()" [loading]="relatedSummaryLoading()" [error]="relatedSummaryError()" (changed)="onProcedureAdded()" (retry)="retryRelatedSummary()" />

                    @if (exam()!.petId?.trim()) {
                        <app-administrations-section [petId]="exam()!.petId!" [petName]="exam()!.petName" [examinationId]="exam()!.id" [locked]="exam()!.status === 'Finalized'" />
                    }
                </div>

                <!-- Geniş ekranda sabit: üst çubuk (4rem) + 1rem, soldaki menünün üst hizası (_menu.scss top: 5rem). -->
                <aside class="col-span-12 xl:col-span-3 xl:sticky xl:top-20" data-testid="finalize-aside">
                    <app-examination-finalize-checklist [exam]="exam()!" [items]="finalizeChecklist()" [canFinalize]="canFinalizeNow()" (finalizeRequested)="finalizeDialogVisible.set(true)" />
                </aside>
            </div>

            <div class="grid grid-cols-12 gap-4 mt-8">
                <div class="col-span-12">
                    <h4 class="mt-0 mb-4 text-xl font-semibold">İlgili kayıtlar</h4>
                </div>
                @if (relatedSummaryLoading()) {
                    <div class="col-span-12">
                        <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                    </div>
                } @else if (relatedSummaryError()) {
                    <div class="col-span-12">
                        <div class="card">
                            <app-error-state [detail]="relatedSummaryError()!" (retry)="retryRelatedSummary()" />
                        </div>
                    </div>
                } @else if (relatedSummary()) {
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı ödemeler</h5>
                                <a routerLink="/panel/payments" [queryParams]="{ petId: exam()!.petId }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedPaymentsView().total === 0) {
                                <p class="text-muted-color text-sm m-0">{{ copy.listEmptyMessage }}</p>
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedPaymentsView().displayed; track row.id) {
                                        <li class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm">
                                            <div class="lg:hidden space-y-2 min-w-0">
                                                <div class="text-muted-color text-sm">{{ row.paidAtUtc | trDateTime }}</div>
                                                <div class="font-semibold text-base tabular-nums text-surface-900 dark:text-surface-0 min-w-0 break-words">
                                                    {{ money(row.amount, row.currency) }}
                                                </div>
                                                <div class="text-sm text-muted-color min-w-0 break-words">{{ payMethodLabel(row.method) }}</div>
                                                @if (row.clinicName) {
                                                    <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                                }
                                                <div class="flex justify-end pt-2 mt-1 border-t border-surface-200 dark:border-surface-700">
                                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                                </div>
                                            </div>
                                            <div class="hidden lg:block space-y-1 min-w-0">
                                                <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                                    <span class="text-muted-color text-sm min-w-0">{{ row.paidAtUtc | trDateTime }}</span>
                                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                                </div>
                                                <div class="font-medium min-w-0 break-words">{{ money(row.amount, row.currency) }} · {{ payMethodLabel(row.method) }}</div>
                                                @if (row.clinicName) {
                                                    <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                                }
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                }
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Randevular (aynı hasta)</h5>
                            <a routerLink="/panel/appointments" [queryParams]="{ petId: exam()!.petId }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!exam()!.petId) {
                            <p class="text-muted-color text-sm m-0">Hasta bilgisi yok; liste gösterilemiyor.</p>
                        } @else if (apptLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apptError()) {
                            <p class="text-muted-color m-0">{{ apptError() }}</p>
                        } @else if (apptItemsView().total === 0) {
                            <p class="text-muted-color text-sm m-0">Kayıt bulunamadı.</p>
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apptItemsView().displayed; track row.id) {
                                    <li class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm">
                                        <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ row.scheduledAtUtc | trDateTime }}</div>
                                        <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ row.scheduledAtUtc | trDateTime }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                        <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
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
