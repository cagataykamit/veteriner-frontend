import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AdministrationsSectionComponent } from '@/app/entities/administration/components/administrations-section.component';
import type { TreatmentDetailVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { TREATMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

@Component({
    selector: 'app-treatment-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AdministrationsSectionComponent,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        RecordHistoryButtonComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        TrDatePipe,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        } @else if (row(); as r) {
            <app-page-header categoryLink="/panel/treatments" categoryLinkLabel="Tedavi listesine dön" />

            <!-- Kimlik kartı (müşteri/hasta kartıyla aynı dil): başlık, tedavi tarihi, kayıt satırı, hasta/sahip; sağda Düzenle ve geçmiş; gösterge şeridi. -->
            <app-detail-identity-card icon="pi pi-heart" [title]="r.title" [subtitle]="r.treatmentDateUtc | trDateTime" [meta]="'Oluşturulma: ' + (r.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (r.updatedAtUtc | trDateTime)" ariaLabel="Tedavi kimliği" testId="treatment-identity-card">
                <app-detail-subject-line [petId]="r.petId" [petName]="r.petName" [clientId]="r.clientId" [clientName]="r.clientName" />
                <ng-container actions>
                    @if (canUpdateTreatment && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/treatments', r.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdateTreatment && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                    <app-record-history-button resource="treatments" [recordId]="r.id" />
                </ng-container>
                <div stat>
                    <dt>Tedavi tarihi</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.treatmentDateUtc | trDateTime }}</dd>
                </div>
                <div stat>
                    <dt>Takip tarihi</dt>
                    <dd>
                        @if (r.followUpDateUtc) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.followUpDateUtc | trDate }}</span>
                        } @else {
                            <span class="field-empty">Yok</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Muayene</dt>
                    <dd>
                        @if (r.examinationId) {
                            <a [routerLink]="['/panel/examinations', r.examinationId]" class="text-primary font-semibold no-underline">Muayene kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı muayene yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>
            <app-pet-alert-banner [petId]="r.petId" />

            <!-- Eylem şeridi: reçete ve ödeme; salt okunurda kilitli. -->
            @if (canUpdateTreatment && r.clientId?.trim() && r.petId?.trim()) {
                <app-detail-action-bar ariaLabel="Tedavi eylemleri">
                    @if (!ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/prescriptions/new']" [queryParams]="prescriptionCreateQueryParams()" pButton type="button" class="p-button-primary"><i class="pi pi-file-edit"></i>Reçete Oluştur</a>
                        @if (r.examinationId?.trim()) {
                            <a [routerLink]="['/panel/payments/new']" [queryParams]="{ clientId: r.clientId, petId: r.petId, examinationId: r.examinationId }" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                        }
                    } @else {
                        <button pButton type="button" [disabled]="true" class="p-button-primary"><i class="pi pi-lock"></i>Reçete Oluştur (salt okunur)</button>
                        @if (r.examinationId?.trim()) {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
                        }
                    }
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: açıklama | notlar (8/4, eşit yükseklik); uygulamalar tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8">
                        <h5 class="mt-0 mb-3">Açıklama</h5>
                        @if (r.description === emptyMark) {
                            <p class="m-0 field-empty">Açıklama yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ r.description }}</p>
                        }
                    </div>
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4">
                        <h5 class="mt-0 mb-3">Notlar</h5>
                        @if (r.notes === emptyMark) {
                            <p class="m-0 field-empty">Not yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ r.notes }}</p>
                        }
                    </div>
                </div>
                @if (r.petId?.trim()) {
                    <app-administrations-section [petId]="r.petId!" [petName]="r.petName" [examinationId]="r.examinationId" [treatmentId]="r.id" />
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
    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

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
