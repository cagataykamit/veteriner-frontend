import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentTypeLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { petGenderLabel, petStatusLabel, petStatusSeverity } from '@/app/features/pets/utils/pet-status.utils';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-pet-detail-page',
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
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Hayvan kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Hayvan yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (pet()) {
            <app-page-header
                [title]="pet()!.name"
                subtitle="Hayvan"
                [description]="'Doğum: ' + formatDateOnly(pet()!.birthDateUtc) + ' · ' + pet()!.speciesName"
            >
                <a
                    actions
                    [routerLink]="['/panel/pets', pet()!.id, 'edit']"
                    pButton
                    type="button"
                    label="Düzenle"
                    icon="pi pi-pencil"
                    class="p-button-secondary"
                ></a>
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(pet()!.status)" [severity]="statusSeverity(pet()!.status)" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tür</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.speciesName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Cins</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.breed }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Cinsiyet</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ genderLabel(pet()!.gender) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Renk</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.color }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ağırlık</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.weight }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Sahip bilgileri</h5>
                        @if (pet()!.ownerId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/clients', pet()!.ownerId]" class="text-primary font-medium no-underline">Müşteri detayına git →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ad</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.ownerName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Telefon</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.ownerPhone }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        <p class="m-0 whitespace-pre-wrap">{{ pet()!.notes }}</p>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Son aşılar</h5>
                            <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (vacLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (vacError()) {
                            <p class="text-muted-color m-0">{{ vacError() }}</p>
                        } @else if (vacItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of vacItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDateOnly(row.appliedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="font-medium">{{ row.vaccineName }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Son muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (exLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (exError()) {
                            <p class="text-muted-color m-0">{{ exError() }}</p>
                        } @else if (exItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of exItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.examinationDateUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="font-medium">{{ row.complaint }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Yaklaşan randevular</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (apLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apError()) {
                            <p class="text-muted-color m-0">{{ apError() }}</p>
                        } @else if (apItems().length === 0) {
                            <app-empty-state message="Yaklaşan randevu yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.scheduledAtUtc) }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="font-medium">{{ typeLabel(row.type) }}</div>
                                        @if (row.reason !== emptyReason) {
                                            <div class="text-sm text-muted-color mt-1">{{ row.reason }}</div>
                                        }
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
export class PetDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly petsService = inject(PetsService);
    private readonly related = inject(DetailRelatedSummariesService);

    readonly copy = PANEL_COPY;

    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pet = signal<PetDetailVm | null>(null);

    readonly vacLoading = signal(false);
    readonly vacError = signal<string | null>(null);
    readonly vacItems = signal<VaccinationListItemVm[]>([]);

    readonly exLoading = signal(false);
    readonly exError = signal<string | null>(null);
    readonly exItems = signal<ExaminationListItemVm[]>([]);

    readonly apLoading = signal(false);
    readonly apError = signal<string | null>(null);
    readonly apItems = signal<AppointmentListItemVm[]>([]);

    private lastId: string | null = null;

    readonly emptyReason = '—';

    readonly formatDateOnly = (v: string | null) => formatDateDisplay(v);
    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = petStatusLabel;
    readonly statusSeverity = petStatusSeverity;
    readonly genderLabel = petGenderLabel;
    readonly typeLabel = appointmentTypeLabel;

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
                        this.error.set('Geçersiz pet.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.petsService.getPetById(id);
                })
            )
            .subscribe({
                next: (p) => {
                    this.pet.set(p);
                    this.loading.set(false);
                    this.loadRelatedBlocks(p.id);
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
        this.petsService.getPetById(this.lastId).subscribe({
            next: (p) => {
                this.pet.set(p);
                this.loading.set(false);
                this.loadRelatedBlocks(p.id);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    private loadRelatedBlocks(petId: string): void {
        this.vacLoading.set(true);
        this.vacError.set(null);
        this.related.loadRecentVaccinationsForPet(petId).subscribe({
            next: (items) => {
                this.vacItems.set(items);
                this.vacLoading.set(false);
            },
            error: (e: Error) => {
                this.vacError.set(e.message ?? 'Aşı özeti yüklenemedi.');
                this.vacLoading.set(false);
            }
        });

        this.exLoading.set(true);
        this.exError.set(null);
        this.related.loadRecentExaminationsForPet(petId).subscribe({
            next: (items) => {
                this.exItems.set(items);
                this.exLoading.set(false);
            },
            error: (e: Error) => {
                this.exError.set(e.message ?? 'Muayene özeti yüklenemedi.');
                this.exLoading.set(false);
            }
        });

        this.apLoading.set(true);
        this.apError.set(null);
        this.related.loadUpcomingAppointmentsForPet(petId).subscribe({
            next: (items) => {
                this.apItems.set(items);
                this.apLoading.set(false);
            },
            error: (e: Error) => {
                this.apError.set(e.message ?? 'Randevu özeti yüklenemedi.');
                this.apLoading.set(false);
            }
        });
    }
}
