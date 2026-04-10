import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { TreatmentDetailVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-treatment-detail-page',
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
        <a routerLink="/panel/treatments" class="text-primary font-medium no-underline inline-block mb-4">← Tedavi listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Tedavi kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Tedavi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row()) {
            <app-page-header title="Tedavi" subtitle="Klinik" [description]="row()!.title">
                <div actions class="flex flex-wrap gap-2">
                    @if (!ro.mutationBlocked()) {
                        <a
                            [routerLink]="['/panel/treatments', row()!.id, 'edit']"
                            pButton
                            type="button"
                            label="Düzenle"
                            icon="pi pi-pencil"
                            class="p-button-secondary"
                        ></a>
                        @if (row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <a
                                [routerLink]="['/panel/prescriptions/new']"
                                [queryParams]="prescriptionCreateQueryParams()"
                                pButton
                                type="button"
                                label="Reçete Oluştur"
                                icon="pi pi-file-edit"
                                class="p-button-secondary"
                            ></a>
                            @if (row()!.examinationId?.trim()) {
                                <a
                                    [routerLink]="['/panel/payments/new']"
                                    [queryParams]="{
                                        clientId: row()!.clientId,
                                        petId: row()!.petId,
                                        examinationId: row()!.examinationId
                                    }"
                                    pButton
                                    type="button"
                                    label="Ödeme Oluştur"
                                    icon="pi pi-wallet"
                                    class="p-button-secondary"
                                ></a>
                            }
                        }
                    } @else {
                        <button
                            pButton
                            type="button"
                            label="Düzenle (salt okunur)"
                            icon="pi pi-lock"
                            [disabled]="true"
                            class="p-button-secondary"
                        ></button>
                        @if (row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <button
                                pButton
                                type="button"
                                label="Reçete Oluştur (salt okunur)"
                                icon="pi pi-lock"
                                [disabled]="true"
                                class="p-button-secondary"
                            ></button>
                            @if (row()!.examinationId?.trim()) {
                                <button
                                    pButton
                                    type="button"
                                    label="Ödeme Oluştur (salt okunur)"
                                    icon="pi pi-lock"
                                    [disabled]="true"
                                    class="p-button-secondary"
                                ></button>
                            }
                        }
                    }
                </div>
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tedavi tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.treatmentDateUtc) }}</dd>
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
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.clientId) {
                                    <a [routerLink]="['/panel/clients', row()!.clientId]" class="text-primary font-medium no-underline">{{ row()!.clientName }}</a>
                                } @else {
                                    {{ row()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.petId) {
                                    <a [routerLink]="['/panel/pets', row()!.petId]" class="text-primary font-medium no-underline">{{ row()!.petName }}</a>
                                } @else {
                                    {{ row()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">İçerik</h5>
                        <p class="mt-0 mb-3 font-medium">{{ row()!.title }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Açıklama</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.description }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Notlar</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                    </div>
                </div>
            </div>
        }
    `
})
export class TreatmentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly treatmentsService = inject(TreatmentsService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<TreatmentDetailVm | null>(null);
    readonly showSavedBanner = signal(false);

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);

    /** Reçete oluştur sayfasına taşınan tedavi bağlamı (treatmentId öncelikli parse). */
    prescriptionCreateQueryParams(): Record<string, string> {
        const r = this.row();
        if (!r?.clientId?.trim() || !r?.petId?.trim()) {
            return {};
        }
        const q: Record<string, string> = {
            clientId: r.clientId.trim(),
            petId: r.petId.trim(),
            treatmentId: r.id
        };
        const ex = r.examinationId?.trim();
        if (ex) {
            q['examinationId'] = ex;
        }
        return q;
    }

    private treatmentId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.error.set('Geçersiz tedavi.');
            this.loading.set(false);
            return;
        }
        this.treatmentId = id;
        this.showSavedBanner.set(this.route.snapshot.queryParamMap.get('saved') === '1');
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.treatmentsService.getTreatmentById(this.treatmentId).subscribe({
            next: (x) => {
                this.row.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Tedavi yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
