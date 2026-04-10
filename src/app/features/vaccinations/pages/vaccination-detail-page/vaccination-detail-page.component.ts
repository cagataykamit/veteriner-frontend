import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { VaccinationDetailVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-vaccination-detail-page',
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
        <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline inline-block mb-4">← Aşı listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Aşı kaydı kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Aşı kaydı yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (vac()) {
            <app-page-header
                title="Aşı kaydı"
                subtitle="Klinik"
                [description]="formatDateTime(vac()!.appliedAtUtc) + ' · ' + statusLabel(vac()!.status) + ' · ' + vac()!.vaccineName"
            >
                @if (!ro.mutationBlocked()) {
                    <a
                        actions
                        [routerLink]="['/panel/vaccinations', vac()!.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                } @else {
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
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Aşı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ vac()!.vaccineName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(vac()!.status)" [severity]="statusSeverity(vac()!.status)" />
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (vac()!.clientId) {
                                    <a [routerLink]="['/panel/clients', vac()!.clientId]" class="text-primary font-medium no-underline">{{ vac()!.clientName }}</a>
                                } @else {
                                    {{ vac()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (vac()!.petId) {
                                    <a [routerLink]="['/panel/pets', vac()!.petId]" class="text-primary font-medium no-underline">{{ vac()!.petName }}</a>
                                } @else {
                                    {{ vac()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tarihler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Uygulama</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(vac()!.appliedAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Sonraki</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(vac()!.dueAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Kayıt bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(vac()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(vac()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (vac()!.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ vac()!.notes }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class VaccinationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly vaccinationsService = inject(VaccinationsService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly emptyMark = '—';
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly vac = signal<VaccinationDetailVm | null>(null);

    private lastId: string | null = null;

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;

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
                        this.error.set('Geçersiz aşı kaydı.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.vaccinationsService.getVaccinationById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.vac.set(x);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.error.set(panelHttpFailureMessage(e, 'Aşı kaydı yüklenemedi.'));
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
        this.vaccinationsService.getVaccinationById(this.lastId).subscribe({
            next: (x) => {
                this.vac.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(panelHttpFailureMessage(e, 'Aşı kaydı yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
