import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { LabResultDetailVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

@Component({
    selector: 'app-lab-result-detail-page',
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
        <a routerLink="/panel/lab-results" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Kayıt güncellendi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Kayıt yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row()) {
            <app-page-header title="Lab sonucu" subtitle="Klinik" [description]="row()!.testName">
                @if (canUpdateLabResult && !ro.mutationBlocked()) {
                    <a
                        actions
                        [routerLink]="['/panel/lab-results', row()!.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                } @else if (canUpdateLabResult && ro.mutationBlocked()) {
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
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Sonuç tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.resultDateUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.updatedAtUtc) }}</dd>
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
                        <h5 class="mt-0 mb-4">Sonuç</h5>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Sonuç metni</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.resultText }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Yorum</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.interpretation }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Notlar</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                    </div>
                </div>
            </div>
        }
    `
})
export class LabResultDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly labResultsService = inject(LabResultsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<LabResultDetailVm | null>(null);
    readonly showSavedBanner = signal(false);
    readonly canUpdateLabResult = this.auth.hasOperationClaim(LAB_RESULTS_UPDATE_CLAIM);

    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    private labResultId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.error.set('Geçersiz kayıt.');
            this.loading.set(false);
            return;
        }
        this.labResultId = id;
        this.showSavedBanner.set(this.route.snapshot.queryParamMap.get('saved') === '1');
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.labResultsService.getLabResultById(this.labResultId).subscribe({
            next: (x) => {
                this.row.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Kayıt yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
