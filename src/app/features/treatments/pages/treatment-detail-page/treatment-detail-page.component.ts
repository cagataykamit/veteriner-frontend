import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AdministrationsSectionComponent } from '@/app/entities/administration/components/administrations-section.component';
import type { TreatmentDetailVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { TREATMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

@Component({
    selector: 'app-treatment-detail-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AdministrationsSectionComponent, AppPageHeaderComponent, PetAlertBannerComponent, AppLoadingStateComponent, AppErrorStateComponent, TrDatePipe, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
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
            <app-page-header categoryLink="/panel/treatments" categoryLinkLabel="Tedavi listesine dön" title="Tedavi" [description]="row()!.title">
                <div actions class="flex flex-wrap gap-2">
                    @if (canUpdateTreatment && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/treatments', row()!.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        @if (row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <a [routerLink]="['/panel/prescriptions/new']" [queryParams]="prescriptionCreateQueryParams()" pButton type="button" class="p-button-secondary"><i class="pi pi-file-edit"></i>Reçete Oluştur</a>
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
                                   
                                   
                                    class="p-button-secondary"
                                ><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                            }
                        }
                    } @else if (canUpdateTreatment && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        @if (row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Reçete Oluştur (salt okunur)</button>
                            @if (row()!.examinationId?.trim()) {
                                <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
                            }
                        }
                    }
                </div>
            </app-page-header>
            <app-pet-alert-banner [petId]="row()!.petId" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tedavi tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.treatmentDateUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Takip tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.followUpDateUtc | trDate }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.createdAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.updatedAtUtc | trDateTime }}</dd>
                            @if (row()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/examinations', row()!.examinationId]" class="text-primary font-medium no-underline">Muayene kaydına git →</a>
                                </dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hasta</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.clientId) {
                                    <a [routerLink]="['/panel/clients', row()!.clientId]" class="text-primary font-medium no-underline">{{ row()!.clientName }}</a>
                                } @else {
                                    {{ row()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hasta</dt>
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
                @if (row()!.petId?.trim()) {
                    <div class="col-span-12">
                        <app-administrations-section [petId]="row()!.petId!" [petName]="row()!.petName" [examinationId]="row()!.examinationId" [treatmentId]="row()!.id" />
                    </div>
                }
            </div>
        }
    `
})
export class TreatmentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly treatmentsService = inject(TreatmentsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly loader = new RouteEntityLoader<TreatmentDetailVm>({
        fetch: (id) => this.treatmentsService.getTreatmentById(id),
        invalidIdMessage: 'Geçersiz tedavi.',
        errorMessage: (e) => (e instanceof Error ? e.message : 'Tedavi yüklenemedi.'),
        onRouteChange: (id) => this.showSavedBanner.set(!!id && this.route.snapshot.queryParamMap.get('saved') === '1')
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly row = this.loader.value;
    readonly showSavedBanner = signal(false);
    readonly canUpdateTreatment = this.auth.hasOperationClaim(TREATMENTS_UPDATE_CLAIM);

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

    ngOnInit(): void {
        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }
}
