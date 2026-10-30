import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PrescriptionDetailVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRESCRIPTIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { HbsSectionComponent } from '@/app/entities/hbs/components/hbs-section.component';
import type { HbsEntryVm } from '@/app/entities/hbs/models/hbs.model';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
import { ADMINISTRATION_LATE_ENTRY_LABEL } from '@/app/entities/administration/utils/administration-labels';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

@Component({
    selector: 'app-prescription-detail-page',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppPageHeaderComponent, PetAlertBannerComponent, AppLoadingStateComponent, AppErrorStateComponent, HbsSectionComponent, AppStatusTagComponent, ReasonConfirmDialogComponent, TrDatePipe, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
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
            <app-page-header categoryLink="/panel/prescriptions" categoryLinkLabel="Reçete listesine dön" title="Reçete" [description]="row()!.title">
                <div actions class="flex flex-wrap gap-2">
                    @if (canUpdatePrescription && !ro.mutationBlocked() && !row()!.isCancelled) {
                        <a [routerLink]="['/panel/prescriptions', row()!.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        @if (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim()) {
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
                        <button pButton type="button" class="p-button-danger p-button-outlined" data-testid="prescription-cancel-open" (click)="cancelVisible.set(true)"><i class="pi pi-ban"></i>İptal et</button>
                    } @else if (canUpdatePrescription && ro.mutationBlocked() && !row()!.isCancelled) {
                        <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        @if (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
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
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Reçete tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.prescribedAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Takip tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.followUpDateUtc | trDate }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.createdAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.updatedAtUtc | trDateTime }}</dd>
                            @if (row()!.isCancelled) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0" data-testid="prescription-cancelled"><app-status-tag label="İptal" severity="danger" /></dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.cancelledAtUtc | trDateTime }}@if (row()!.cancelledByName) { · {{ row()!.cancelledByName }} }</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal gerekçesi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0 whitespace-pre-wrap">{{ row()!.cancelReason ?? '—' }}</dd>
                            }
                            @if (row()!.addedAfterFinalization) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Kayıt</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0" data-testid="prescription-late-entry">
                                    <app-status-tag [label]="lateEntryLabel" severity="warn" />
                                    @if (row()!.lateEntryReason) {
                                        <div class="text-sm text-muted-color mt-1">Gerekçe: {{ row()!.lateEntryReason }}</div>
                                    }
                                </dd>
                            }
                            @if (row()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/examinations', row()!.examinationId]" class="text-primary font-medium no-underline">Muayene kaydına git →</a>
                                </dd>
                            }
                            @if (row()!.treatmentId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Tedavi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/treatments', row()!.treatmentId]" class="text-primary font-medium no-underline">Tedavi kaydına git →</a>
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
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">İçerik</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.content }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Notlar</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                    </div>
                </div>
                @if (row()!.items.length > 0) {
                    <div class="col-span-12">
                        <div class="card" data-testid="prescription-items">
                            <h5 class="mt-0 mb-4">İlaç / ürün satırları</h5>
                            <ul class="list-none m-0 p-0">
                                @for (item of row()!.items; track item.id) {
                                    <li class="mb-3 last:mb-0 min-w-0">
                                        <div class="font-medium break-words">
                                            {{ item.name }}
                                            @if (item.quantity !== null) {
                                                <span class="text-muted-color font-normal"> · Miktar: {{ item.quantity }} {{ item.unit }}</span>
                                            }
                                            @if (item.dose) {
                                                <span class="text-muted-color font-normal"> · Doz: {{ item.dose }}</span>
                                            }
                                        </div>
                                        @if (item.instructions) {
                                            <div class="text-sm text-muted-color break-words">{{ item.instructions }}</div>
                                        }
                                        @if (item.lotNumber) {
                                            <div class="text-sm text-muted-color break-words">Parti/seri no: {{ item.lotNumber }}</div>
                                        }
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                }
                <div class="col-span-12">
                    <app-hbs-section kind="prescription" [recordId]="row()!.id" [entry]="row()!.hbs" [canEdit]="canUpdatePrescription && !ro.mutationBlocked()" (entryChange)="onHbsChange($event)" />
                </div>
            </div>
            <app-reason-confirm-dialog
                [(visible)]="cancelVisible"
                header="Reçeteyi iptal et"
                [summary]="row()!.title"
                description="Reçete silinmez; iptal edildi olarak işaretlenir, gerekçe kayda geçer ve geri alınamaz. Düzeltmek için yeni reçete yazın."
                confirmLabel="İptal et"
                failureFallback="Reçete iptal edilemedi."
                [execute]="cancelPrescription"
                (confirmed)="reload()"
            />
        }
    `
})
export class PrescriptionDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly prescriptionsService = inject(PrescriptionsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly loader = new RouteEntityLoader<PrescriptionDetailVm>({
        fetch: (id) => this.prescriptionsService.getPrescriptionById(id),
        invalidIdMessage: 'Geçersiz reçete.',
        errorMessage: (e) => (e instanceof Error ? e.message : 'Reçete yüklenemedi.'),
        onRouteChange: (id) => this.showSavedBanner.set(!!id && this.route.snapshot.queryParamMap.get('saved') === '1')
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly row = this.loader.value;
    readonly showSavedBanner = signal(false);
    readonly canUpdatePrescription = this.auth.hasOperationClaim(PRESCRIPTIONS_UPDATE_CLAIM);
    readonly cancelVisible = signal(false);
    protected readonly lateEntryLabel = ADMINISTRATION_LATE_ENTRY_LABEL;

    /** Gerekçeli iptal (RECORD-008); diyalog her açılışta güncel kaydın kimliğini kullanır. */
    readonly cancelPrescription = (reason: string) => this.prescriptionsService.cancelPrescription(this.row()!.id, reason);

    ngOnInit(): void {
        this.loader.init();
    }

    /** HBS geri kaydı klinik içeriği değiştirmez; yalnız HBS alanı güncellenir (sayfa yeniden yüklenmez). */
    onHbsChange(hbs: HbsEntryVm): void {
        this.row.update((r) => (r ? { ...r, hbs } : r));
    }

    reload(): void {
        this.loader.reload();
    }
}
