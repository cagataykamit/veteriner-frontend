import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { petGenderLabel, petStatusLabel, petStatusSeverity } from '@/app/features/pets/utils/pet-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-pet-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Pet listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Pet yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (pet()) {
            <app-page-header
                [title]="pet()!.name"
                subtitle="Pet"
                [description]="'Doğum: ' + formatDateOnly(pet()!.birthDateUtc) + ' · ' + pet()!.species"
            />

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
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.species }}</dd>
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
                                <a [routerLink]="['/panel/clients', pet()!.ownerId]" class="text-primary font-medium no-underline">Client detayına git →</a>
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
                        <h5 class="mt-0 mb-4">Aşı özeti</h5>
                        @if (pet()!.vaccinationsSummary.totalCount === 0 && pet()!.vaccinationsSummary.items.length === 0) {
                            <app-empty-state message="Aşı özeti yok veya henüz kayıt yok." />
                        } @else {
                            <p class="text-muted-color mt-0 mb-3">Toplam: {{ pet()!.vaccinationsSummary.totalCount }}</p>
                            @if (pet()!.vaccinationsSummary.items.length > 0) {
                                <p-table [value]="pet()!.vaccinationsSummary.items" [paginator]="false" [tableStyle]="{ 'min-width': '100%' }">
                                    <ng-template #header>
                                        <tr>
                                            <th>Kayıt</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-row>
                                        <tr>
                                            <td>{{ row.name }}</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            }
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Muayene özeti</h5>
                        @if (pet()!.examinationsSummary.totalCount === 0 && pet()!.examinationsSummary.lastExaminedAtUtc == null) {
                            <app-empty-state message="Muayene özeti yok veya henüz kayıt yok." />
                        } @else {
                            <dl class="m-0 grid grid-cols-12 gap-3">
                                <dt class="col-span-12 text-muted-color">Toplam</dt>
                                <dd class="col-span-12 m-0">{{ pet()!.examinationsSummary.totalCount }}</dd>
                                @if (pet()!.examinationsSummary.lastExaminedAtUtc) {
                                    <dt class="col-span-12 text-muted-color">Son muayene</dt>
                                    <dd class="col-span-12 m-0">{{ formatDt(pet()!.examinationsSummary.lastExaminedAtUtc) }}</dd>
                                }
                            </dl>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Randevu özeti</h5>
                        @if (pet()!.appointmentsSummary.totalCount === 0 && pet()!.appointmentsSummary.upcomingCount == null) {
                            <app-empty-state message="Randevu özeti yok veya henüz kayıt yok." />
                        } @else {
                            <dl class="m-0 grid grid-cols-12 gap-3">
                                <dt class="col-span-12 sm:col-span-6 text-muted-color">Toplam</dt>
                                <dd class="col-span-12 sm:col-span-6 m-0">{{ pet()!.appointmentsSummary.totalCount }}</dd>
                                @if (pet()!.appointmentsSummary.upcomingCount != null) {
                                    <dt class="col-span-12 sm:col-span-6 text-muted-color">Yaklaşan</dt>
                                    <dd class="col-span-12 sm:col-span-6 m-0">{{ pet()!.appointmentsSummary.upcomingCount }}</dd>
                                }
                            </dl>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class PetDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly petsService = inject(PetsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pet = signal<PetDetailVm | null>(null);

    private lastId: string | null = null;

    readonly formatDateOnly = (v: string | null) => formatDateDisplay(v);
    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = petStatusLabel;
    readonly statusSeverity = petStatusSeverity;
    readonly genderLabel = petGenderLabel;

    ngOnInit(): void {
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
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
