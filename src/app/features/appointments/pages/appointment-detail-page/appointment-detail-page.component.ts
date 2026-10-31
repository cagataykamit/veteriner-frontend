import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppointmentNoShowDialogComponent } from '@/app/entities/appointment/components/appointment-no-show-dialog.component';
import type { AppointmentDetailVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { DetailRelatedSummariesService } from '@/app/entities/patient/services/detail-related-summaries.service';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { appointmentStatusLabel, appointmentStatusSeverity, canMarkAppointmentNoShow, canRevertAppointmentNoShow, isAppointmentNoShowStatus, isAppointmentCancelledStatus } from '@/app/entities/appointment/utils/appointment-status.utils';
import { appointmentTypeDisplayLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import { speciesEmoji } from '@/app/entities/species/utils/species-icon.utils';
import { DETAIL_STATS_GRID_CLASS } from '@/app/shared/ui/detail-stats.classes';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_NOSHOW_CLAIM, APPOINTMENTS_RESCHEDULE_CLAIM, EXAMINATIONS_CREATE_CLAIM, VISITS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

@Component({
    selector: 'app-appointment-detail-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent, AppLoadingStateComponent, AppEmptyStateComponent, AppErrorStateComponent, AppStatusTagComponent, AppointmentNoShowDialogComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Randevu kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Randevu yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (appt(); as a) {
            <app-page-header [categoryLink]="backLink()" [categoryLinkLabel]="backLabel()" />

            <!--
                Kimlik kartı (müşteri/hasta kartıyla aynı dil): tür + durum rozeti, tarih-saat, kayıt satırı, hasta/sahip bağlantıları,
                iptal/gelmedi uyarısı; sağda Düzenle; altta gösterge şeridi (başlangıç, bitiş, süre).
            -->
            <section class="card mb-4 @container" aria-label="Randevu kimliği" data-testid="appointment-card-header">
                <div class="flex flex-wrap items-start gap-x-5 gap-y-3">
                    <div class="shrink-0 flex items-center justify-center w-11 h-11 text-lg @md:w-14 @md:h-14 @md:text-2xl rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200" aria-hidden="true">
                        <i class="pi pi-calendar"></i>
                    </div>
                    <div class="min-w-0 flex-1 basis-56">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h1 class="m-0 text-2xl font-semibold leading-tight text-surface-900 dark:text-surface-0 break-words">{{ typeDisplay(a.appointmentType, a.appointmentTypeName) }}</h1>
                            <app-status-tag [label]="statusLabel(a.status)" [severity]="statusSeverity(a.status)" />
                        </div>
                        <p class="m-0 mt-1 text-base font-medium text-surface-900 dark:text-surface-0 tabular-nums">{{ a.scheduledAtUtc | trDateTime }}</p>
                        <p class="m-0 mt-1 text-sm text-muted-color">Oluşturulma: {{ a.createdAtUtc | trDateTime }} · Güncellenme: {{ a.updatedAtUtc | trDateTime }}</p>

                        <p class="m-0 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Hasta ve sahip">
                            <span>
                                <span class="text-muted-color">Hasta:</span>
                                @if (a.speciesName) {
                                    <span class="ml-1" [title]="a.speciesName" aria-hidden="true">{{ speciesIcon(a.speciesName) }}</span>
                                }
                                @if (a.petId) {
                                    <a [routerLink]="['/panel/pets', a.petId]" class="text-primary font-semibold no-underline ml-1">{{ a.petName }}</a>
                                } @else {
                                    <span class="ml-1 font-medium">{{ a.petName }}</span>
                                }
                                @if (a.speciesName) {
                                    <span class="text-muted-color text-sm"> · {{ a.speciesName }}</span>
                                }
                            </span>
                            <span>
                                <span class="text-muted-color">Sahip:</span>
                                @if (a.clientId) {
                                    <a [routerLink]="['/panel/clients', a.clientId]" class="text-primary font-medium no-underline ml-1">{{ a.clientName }}</a>
                                } @else {
                                    <span class="ml-1">{{ a.clientName }}</span>
                                }
                            </span>
                        </p>

                        @if (isCancelledForExam(a.status) || isNoShow(a.status)) {
                            <p class="m-0 mt-3 inline-flex items-start gap-2 rounded-border border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300" role="status">
                                <i class="pi pi-exclamation-triangle text-xs mt-1" aria-hidden="true"></i>{{ isNoShow(a.status) ? copy.noShowAppointmentExamCreateBlocked : copy.cancelledAppointmentExamCreateBlocked }}
                            </p>
                        }
                    </div>
                    <div class="flex flex-wrap gap-2 items-center w-full @md:w-auto @md:ml-auto">
                        @if (canRescheduleAppointment && !ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/appointments', a.id, 'edit']" [queryParams]="returnContextQueryParams() ?? undefined" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        } @else if (canRescheduleAppointment && ro.mutationBlocked()) {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        }
                    </div>
                </div>

                <dl [class]="statsClass" aria-label="Zaman">
                    <div>
                        <dt>Başlangıç</dt>
                        <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ a.scheduledAtUtc | trDateTime }}</dd>
                    </div>
                    <div>
                        <dt>Bitiş</dt>
                        <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ a.scheduledEndUtc | trDateTime }}</dd>
                    </div>
                    <div>
                        <dt>Süre</dt>
                        <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ a.durationLabel }}</dd>
                    </div>
                </dl>
            </section>

            @if (startExamError(); as startError) {
                <p class="text-red-500 text-sm mt-0 mb-4" role="alert">{{ startError }}</p>
            }
            @if (canNoShow) {
                <app-appointment-no-show-dialog [(visible)]="noShowOpen" [appointmentId]="a.id" [mode]="noShowMode()" [subject]="noShowSubject()" (done)="onNoShowDone()" />
            }

            <!-- Eylem şeridi (müşteri/hasta kartıyla aynı): muayene aç ve gelmedi; kapalı durumda kilitli görünür. -->
            @if (canCreateExamination || canNoShow) {
                <div class="mb-4 py-2 flex flex-wrap gap-2 items-center" role="toolbar" aria-label="Randevu eylemleri" data-testid="appointment-action-bar">
                    @if (canCreateExamination && a.clientId?.trim() && a.petId?.trim()) {
                        @if (isCancelledForExam(a.status) || isNoShow(a.status)) {
                            <button pButton type="button" [disabled]="true" class="p-button-primary"><i class="pi pi-ban"></i>Muayene Oluştur</button>
                        } @else if (ro.mutationBlocked()) {
                            <button pButton type="button" [disabled]="true" class="p-button-primary"><i class="pi pi-lock"></i>Muayene Oluştur (salt okunur)</button>
                        } @else if (canOpenVisit) {
                            <button pButton type="button" class="p-button-primary" [disabled]="startingExam()" (click)="startExamination()"><i [class]="startingExam() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'"></i>Muayene Oluştur</button>
                        } @else {
                            <a [routerLink]="['/panel/examinations/new']" [queryParams]="{ clientId: a.clientId, petId: a.petId, appointmentId: a.id }" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Muayene Oluştur</a>
                        }
                    }
                    @if (canNoShow && !ro.mutationBlocked()) {
                        @if (canMarkNoShow(a.status, a.scheduledAtUtc, now())) {
                            <button pButton type="button" class="p-button-outlined p-button-secondary" (click)="openNoShow('mark')"><i class="pi pi-user-minus"></i>Gelmedi işaretle</button>
                        } @else if (canRevertNoShow(a.status)) {
                            <button pButton type="button" class="p-button-outlined p-button-secondary" (click)="openNoShow('revert')"><i class="pi pi-undo"></i>Gelmedi işaretini geri al</button>
                        }
                    }
                    @if (ro.mutationBlocked()) {
                        <span class="text-amber-700 dark:text-amber-300 text-sm" role="status">İşletme salt okunur moddadır; eylemler kapalı.</span>
                    }
                </div>
            }

            <!-- Satır ızgarası: bağlı muayene | notlar (8/4), eşit yükseklik; kırılım içerik alanına göre. -->
            <div class="@container">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-3">
                            <h5 class="mt-0 mb-0">Bağlı muayene</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Muayene listesi →</a>
                        </div>
                        @if (linkedExamLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (linkedExamError()) {
                            <p class="text-muted-color m-0">{{ linkedExamError() }}</p>
                        } @else if (linkedExamsView().total === 0) {
                            <app-empty-state message="Bu randevuya bağlı muayene kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of linkedExamsView().displayed; track row.id) {
                                    <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ row.examinedAtUtc | trDateTime }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Muayene detayı →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ row.visitReason }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4">
                        <h5 class="mt-0 mb-3">Notlar</h5>
                        @if (a.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ a.notes }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class AppointmentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly related = inject(DetailRelatedSummariesService);
    private readonly auth = inject(AuthService);
    private readonly visitsService = inject(VisitsService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly emptyMark = '—';
    readonly showSavedBanner = signal(false);

    private readonly loader = new RouteEntityLoader<AppointmentDetailVm>({
        fetch: (id) => this.appointmentsService.getAppointmentById(id),
        invalidIdMessage: 'Geçersiz randevu.',
        onLoaded: (x) => {
            this.now.set(new Date());
            this.loadLinkedExaminations(x);
        }
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly appt = this.loader.value;

    readonly linkedExamLoading = signal(false);
    readonly linkedExamError = signal<string | null>(null);
    readonly linkedExams = signal<ExaminationListItemVm[]>([]);
    readonly linkedExamsView = computed(() => sliceDetailRelatedList(this.linkedExams()));
    readonly returnUrl = signal<string | null>(null);
    readonly backLabel = signal('Randevu listesine dön');
    readonly backLink = computed(() => this.router.parseUrl(this.returnUrl() ?? '/panel/appointments'));

    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;
    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly speciesIcon = speciesEmoji;
    readonly statsClass = DETAIL_STATS_GRID_CLASS;
    readonly canRescheduleAppointment = this.auth.hasOperationClaim(APPOINTMENTS_RESCHEDULE_CLAIM);
    readonly canCreateExamination = this.auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM);
    /** Geliş açma yetkisi varsa muayene önce geliş (Visit) üzerinden açılır (ADR-017 K7); yoksa randevu bağlamlı eski yol. */
    readonly canOpenVisit = this.auth.hasOperationClaim(VISITS_CREATE_CLAIM);
    readonly startingExam = signal(false);
    readonly startExamError = signal<string | null>(null);
    readonly isCancelledForExam = isAppointmentCancelledStatus;
    readonly isNoShow = isAppointmentNoShowStatus;
    readonly canMarkNoShow = canMarkAppointmentNoShow;
    readonly canRevertNoShow = canRevertAppointmentNoShow;
    readonly canNoShow = this.auth.hasOperationClaim(APPOINTMENTS_NOSHOW_CLAIM);
    readonly noShowOpen = signal(false);
    readonly noShowMode = signal<'mark' | 'revert'>('mark');
    /** Gelmedi koşulu (saati geçmiş mi) için saat; sayfa yüklenince/yenilenince güncellenir. */
    readonly now = signal(new Date());
    readonly noShowSubject = computed(() => {
        const a = this.appt();

        return a ? `${a.petName} · ${a.clientName} · ${formatUtcIsoAsLocalDateTimeDisplay(a.scheduledAtUtc)}` : '';
    });

    ngOnInit(): void {
        this.readReturnContext();

        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        }

        this.loader.init();
    }

    /** Randevunun gelişini açar (açık geliş varsa o döner) ve muayeneyi `visitId` ile açar; Bugün'ün "Muayene aç" akışıyla aynı yol. */
    startExamination(): void {
        const a = this.appt();

        if (!a || this.startingExam()) {
            return;
        }

        this.startExamError.set(null);
        this.startingExam.set(true);
        this.visitsService
            .getCurrentVeterinarianUserId()
            .pipe(switchMap((vetId) => this.visitsService.createVisit({ appointmentId: a.id, responsibleVeterinarianUserId: vetId })))
            .subscribe({
                next: ({ visit }) => {
                    this.startingExam.set(false);
                    void this.router.navigate(['/panel/examinations/new'], {
                        queryParams: { visitId: visit.id, clientId: a.clientId, petId: a.petId }
                    });
                },
                error: (e: unknown) => {
                    this.startingExam.set(false);
                    this.startExamError.set(panelHttpFailureMessage(e, 'Geliş kaydı açılamadı.'));
                }
            });
    }

    openNoShow(mode: 'mark' | 'revert'): void {
        this.noShowMode.set(mode);
        this.noShowOpen.set(true);
    }

    onNoShowDone(): void {
        this.now.set(new Date());
        this.reload();
    }

    reload(): void {
        this.loader.reload();
    }

    returnContextQueryParams(): Record<string, string> | null {
        const url = this.returnUrl();

        if (!url) {
            return null;
        }

        return { returnUrl: url, returnLabel: this.backLabel() };
    }

    private loadLinkedExaminations(x: AppointmentDetailVm): void {
        this.linkedExamLoading.set(true);
        this.linkedExamError.set(null);
        this.related.loadExaminationsLinkedToAppointment(x.id).subscribe({
            next: (items) => {
                this.linkedExams.set(items);
                this.linkedExamLoading.set(false);
            },
            error: (e: Error) => {
                this.linkedExamError.set(panelHttpFailureMessage(e, 'Bağlı muayeneler yüklenemedi.'));
                this.linkedExamLoading.set(false);
            }
        });
    }

    private readReturnContext(): void {
        const query = this.route.snapshot.queryParamMap;
        const safeUrl = this.normalizeSafeReturnUrl(query.get('returnUrl'));

        this.returnUrl.set(safeUrl);

        if (safeUrl) {
            const label = query.get('returnLabel')?.trim();

            this.backLabel.set(label || 'Randevu takvimine dön');

            return;
        }

        this.backLabel.set('Randevu listesine dön');
    }

    private normalizeSafeReturnUrl(raw: string | null): string | null {
        const value = raw?.trim();

        if (!value) {
            return null;
        }

        if (!value.startsWith('/panel/')) {
            return null;
        }

        return value;
    }
}
