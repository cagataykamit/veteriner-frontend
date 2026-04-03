import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PrescriptionDetailVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/features/prescriptions/services/prescriptions.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-prescription-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline inline-block mb-4">← Reçete listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Reçete kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Reçete yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row()) {
            <app-page-header title="Reçete" subtitle="Klinik" [description]="row()!.title">
                <a
                    actions
                    [routerLink]="['/panel/prescriptions', row()!.id, 'edit']"
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
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Reçete tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.prescribedAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Takip tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(row()!.followUpDateUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(row()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(row()!.updatedAtUtc) }}</dd>
                            @if (row()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a
                                        [routerLink]="['/panel/examinations', row()!.examinationId]"
                                        class="text-primary font-medium no-underline"
                                        >Muayene kaydına git →</a
                                    >
                                </dd>
                            }
                            @if (row()!.treatmentId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Tedavi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a
                                        [routerLink]="['/panel/treatments', row()!.treatmentId]"
                                        class="text-primary font-medium no-underline"
                                        >Tedavi kaydına git →</a
                                    >
                                </dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        @if (row()!.clientId) {
                            <p class="mt-0 mb-2">
                                <a [routerLink]="['/panel/clients', row()!.clientId]" class="text-primary font-medium no-underline">Müşteri detayı →</a>
                            </p>
                        }
                        @if (row()!.petId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/pets', row()!.petId]" class="text-primary font-medium no-underline">Hayvan detayı →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.clientName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.petName }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">İçerik</h5>
                        <p class="mt-0 mb-3 font-medium">{{ row()!.title }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">İçerik</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.content }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Notlar</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                    </div>
                </div>
            </div>
        }
    `
})
export class PrescriptionDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly prescriptionsService = inject(PrescriptionsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<PrescriptionDetailVm | null>(null);
    readonly showSavedBanner = signal(false);

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);

    private prescriptionId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.error.set('Geçersiz reçete.');
            this.loading.set(false);
            return;
        }
        this.prescriptionId = id;
        this.showSavedBanner.set(this.route.snapshot.queryParamMap.get('saved') === '1');
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.prescriptionsService.getPrescriptionById(this.prescriptionId).subscribe({
            next: (x) => {
                this.row.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Reçete yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
