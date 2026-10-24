import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppointmentNoShowDialogComponent } from '@/app/features/appointments/components/appointment-no-show-dialog.component';
import type { AppointmentDetailVm } from '@/app/features/appointments/models/appointment-vm.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { appointmentStatusLabel, appointmentStatusSeverity, canMarkAppointmentNoShow, canRevertAppointmentNoShow, isAppointmentNoShowStatus, isAppointmentCancelledStatus } from '@/app/features/appointments/utils/appointment-status.utils';
import { appointmentTypeDisplayLabel, appointmentTypeDisplaySeverity } from '@/app/features/appointments/utils/appointment-type.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { EMPTY, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_NOSHOW_CLAIM, APPOINTMENTS_RESCHEDULE_CLAIM, EXAMINATIONS_CREATE_CLAIM, VISITS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-appointment-detail-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent, AppLoadingStateComponent, AppEmptyStateComponent, AppErrorStateComponent, AppStatusTagComponent, AppointmentNoShowDialogComponent, TrDateTimePipe],
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
        } @else if (appt()) {
            <app-page-header
                [categoryLink]="backLink()"
                [categoryLinkLabel]="backLabel()"
                title="Randevu"
                [description]="(appt()!.scheduledAtUtc | trDateTime) + ' · ' + statusLabel(appt()!.status) + ' · ' + typeDisplay(appt()!.appointmentType, appt()!.appointmentTypeName)"
            >
                <div actions class="flex flex-wrap gap-2">
                    @if (canRescheduleAppointment && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/appointments', appt()!.id, 'edit']" [queryParams]="returnContextQueryParams() ?? undefined" pButton type="button" label="Düzenle" icon="pi pi-pencil" class="p-button-secondary"></a>
                    } @else if (canRescheduleAppointment && ro.mutationBlocked()) {
                        <button pButton type="button" label="Düzenle (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                    }
                    @if (canNoShow && !ro.mutationBlocked()) {
                        @if (canMarkNoShow(appt()!.status, appt()!.scheduledAtUtc, now())) {
                            <button pButton type="button" label="Gelmedi işaretle" icon="pi pi-user-minus" class="p-button-secondary" (click)="openNoShow('mark')"></button>
                        } @else if (canRevertNoShow(appt()!.status)) {
                            <button pButton type="button" label="Gelmedi işaretini geri al" icon="pi pi-undo" class="p-button-secondary" (click)="openNoShow('revert')"></button>
                        }
                    }
                    @if (canCreateExamination && appt()!.clientId?.trim() && appt()!.petId?.trim()) {
                        @if (isCancelledForExam(appt()!.status) || isNoShow(appt()!.status)) {
                            <button pButton type="button" label="Muayene Oluştur" icon="pi pi-ban" [disabled]="true" class="p-button-secondary"></button>
                        } @else if (ro.mutationBlocked()) {
                            <button pButton type="button" label="Muayene Oluştur (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                        } @else if (canOpenVisit) {
                            <button pButton type="button" label="Muayene Oluştur" icon="pi pi-plus" class="p-button-secondary" [loading]="startingExam()" [disabled]="startingExam()" (click)="startExamination()"></button>
                        } @else {
                            <a
                                [routerLink]="['/panel/examinations/new']"
                                [queryParams]="{
                                    clientId: appt()!.clientId,
                                    petId: appt()!.petId,
                                    appointmentId: appt()!.id
                                }"
                                pButton
                                type="button"
                                label="Muayene Oluştur"
                                icon="pi pi-plus"
                                class="p-button-secondary"
                            ></a>
                        }
                    }
                </div>
                @if (isCancelledForExam(appt()!.status) || isNoShow(appt()!.status)) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm m-0 mt-2" role="status">
                        {{ isNoShow(appt()!.status) ? copy.noShowAppointmentExamCreateBlocked : copy.cancelledAppointmentExamCreateBlocked }}
                    </p>
                }
            </app-page-header>
            @if (startExamError(); as startError) {
                <p class="text-red-500 text-sm mt-0 mb-4" role="alert">{{ startError }}</p>
            }
            @if (canNoShow) {
                <app-appointment-no-show-dialog [(visible)]="noShowOpen" [appointmentId]="appt()!.id" [mode]="noShowMode()" [subject]="noShowSubject()" (done)="onNoShowDone()" />
            }

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(appt()!.status)" [severity]="statusSeverity(appt()!.status)" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Randevu Türü</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="typeDisplay(appt()!.appointmentType, appt()!.appointmentTypeName)" [severity]="typeSeverity(appt()!.appointmentType)" />
                            </dd>
                            @if (appt()!.speciesName) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan Türü</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.speciesName }}</dd>
                            }
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Başlangıç</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.scheduledAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Bitiş saati</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.scheduledEndUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Randevu süresi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.durationLabel }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hasta bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (appt()!.clientId) {
                                    <a [routerLink]="['/panel/clients', appt()!.clientId]" class="text-primary font-medium no-underline">{{ appt()!.clientName }}</a>
                                } @else {
                                    {{ appt()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hasta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (appt()!.petId) {
                                    <a [routerLink]="['/panel/pets', appt()!.petId]" class="text-primary font-medium no-underline">{{ appt()!.petName }}</a>
                                } @else {
                                    {{ appt()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
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
                                    <li class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm">
                                        <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ row.examinedAtUtc | trDateTime }}</div>
                                        <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ row.examinedAtUtc | trDateTime }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Muayene detayı →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ row.visitReason }}</div>
                                        <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm py-1">Muayene detayı →</a>
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (appt()!.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ appt()!.notes }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Kayıt bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.createdAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.updatedAtUtc | trDateTime }}</dd>
                        </dl>
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

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly appt = signal<AppointmentDetailVm | null>(null);

    readonly linkedExamLoading = signal(false);
    readonly linkedExamError = signal<string | null>(null);
    readonly linkedExams = signal<ExaminationListItemVm[]>([]);
    readonly linkedExamsView = computed(() => sliceDetailRelatedList(this.linkedExams()));
    readonly returnUrl = signal<string | null>(null);
    readonly backLabel = signal('Randevu listesine dön');
    readonly backLink = computed(() => this.router.parseUrl(this.returnUrl() ?? '/panel/appointments'));

    private lastId: string | null = null;

    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;
    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly typeSeverity = appointmentTypeDisplaySeverity;
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

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');

                    if (!id) {
                        this.error.set('Geçersiz randevu.');
                        this.loading.set(false);

                        return EMPTY;
                    }

                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);

                    return this.appointmentsService.getAppointmentById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.appt.set(x);
                    this.loading.set(false);
                    this.loadLinkedExaminations(x);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
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
        if (!this.lastId) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.appointmentsService.getAppointmentById(this.lastId).subscribe({
            next: (x) => {
                this.appt.set(x);
                this.now.set(new Date());
                this.loading.set(false);
                this.loadLinkedExaminations(x);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
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
                this.linkedExamError.set(e.message ?? 'Bağlı muayeneler yüklenemedi.');
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
