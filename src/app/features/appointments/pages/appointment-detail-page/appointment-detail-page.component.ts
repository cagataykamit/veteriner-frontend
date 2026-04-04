import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentDetailVm } from '@/app/features/appointments/models/appointment-vm.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import {
    appointmentTypeDisplayLabel,
    appointmentTypeDisplaySeverity
} from '@/app/features/appointments/utils/appointment-type.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-appointment-detail-page',
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
        <a routerLink="/panel/appointments" class="text-primary font-medium no-underline inline-block mb-4">← Randevu listesine dön</a>

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
                title="Randevu"
                subtitle="Operasyon"
                [description]="
                    formatDateTime(appt()!.scheduledAtUtc) + ' · ' + statusLabel(appt()!.status) + ' · ' + typeDisplay(appt()!.appointmentType, appt()!.appointmentTypeName)
                "
            >
                <div actions class="flex flex-wrap gap-2">
                    <a
                        [routerLink]="['/panel/appointments', appt()!.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                    @if (appt()!.clientId?.trim() && appt()!.petId?.trim()) {
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
                </div>
            </app-page-header>

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
                                <app-status-tag
                                    [label]="typeDisplay(appt()!.appointmentType, appt()!.appointmentTypeName)"
                                    [severity]="typeSeverity(appt()!.appointmentType)"
                                />
                            </dd>
                            @if (appt()!.speciesName) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan Türü</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.speciesName }}</dd>
                            }
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tarih / saat</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(appt()!.scheduledAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan bilgileri</h5>
                        @if (appt()!.clientId) {
                            <p class="mt-0 mb-2">
                                <a [routerLink]="['/panel/clients', appt()!.clientId]" class="text-primary font-medium no-underline">Müşteri detayı →</a>
                            </p>
                        }
                        @if (appt()!.petId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/pets', appt()!.petId]" class="text-primary font-medium no-underline">Hayvan detayı →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.clientName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ appt()!.petName }}</dd>
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
                        } @else if (linkedExams().length === 0) {
                            <app-empty-state message="Bu randevuya bağlı muayene kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of linkedExams(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDateTime(row.examinedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Muayene detayı →</a>
                                        </div>
                                        <div class="font-medium">{{ row.visitReason }}</div>
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
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(appt()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(appt()!.updatedAtUtc) }}</dd>
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

    readonly copy = PANEL_COPY;
    readonly emptyMark = '—';
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly appt = signal<AppointmentDetailVm | null>(null);

    readonly linkedExamLoading = signal(false);
    readonly linkedExamError = signal<string | null>(null);
    readonly linkedExams = signal<ExaminationListItemVm[]>([]);

    private lastId: string | null = null;

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;
    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly typeSeverity = appointmentTypeDisplaySeverity;

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

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.appointmentsService.getAppointmentById(this.lastId).subscribe({
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
}
