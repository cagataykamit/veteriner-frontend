import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PrescriptionDetailVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
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
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        RecordHistoryButtonComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        HbsSectionComponent,
        AppStatusTagComponent,
        ReasonConfirmDialogComponent,
        TrDatePipe,
        TrDateTimePipe
    ],
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
        } @else if (row(); as r) {
            <app-page-header categoryLink="/panel/prescriptions" categoryLinkLabel="Reçete listesine dön" />

            <!-- Kimlik kartı: başlık + iptal/geç kayıt rozetleri, reçete tarihi, kayıt satırı, hasta/sahip, iptal notu; sağda Düzenle ve geçmiş; gösterge şeridi. -->
            <app-detail-identity-card icon="pi pi-file-edit" [title]="r.title" [subtitle]="r.prescribedAtUtc | trDateTime" [meta]="'Oluşturulma: ' + (r.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (r.updatedAtUtc | trDateTime)" ariaLabel="Reçete kimliği" testId="prescription-identity-card">
                <ng-container badges>
                    @if (r.isCancelled) {
                        <span data-testid="prescription-cancelled"><app-status-tag label="İptal" severity="danger" /></span>
                    }
                    @if (r.addedAfterFinalization) {
                        <span data-testid="prescription-late-entry" [title]="r.lateEntryReason ? 'Gerekçe: ' + r.lateEntryReason : null"><app-status-tag [label]="lateEntryLabel" severity="warn" /></span>
                    }
                </ng-container>
                <app-detail-subject-line [petId]="r.petId" [petName]="r.petName" [clientId]="r.clientId" [clientName]="r.clientName" />
                @if (r.isCancelled) {
                    <p class="m-0 mt-3 inline-flex items-start gap-2 rounded-border border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="status">
                        <i class="pi pi-ban text-xs mt-1" aria-hidden="true"></i>
                        <span><span class="font-medium">İptal edildi</span> · {{ r.cancelledAtUtc | trDateTime }}@if (r.cancelledByName) { · {{ r.cancelledByName }} }<span class="block whitespace-pre-wrap">Gerekçe: {{ r.cancelReason ?? '—' }}</span></span>
                    </p>
                }
                @if (r.addedAfterFinalization && r.lateEntryReason) {
                    <p class="m-0 mt-2 text-sm text-muted-color">Geç kayıt gerekçesi: {{ r.lateEntryReason }}</p>
                }
                <ng-container actions>
                    @if (canUpdatePrescription && !r.isCancelled) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/prescriptions', r.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        }
                    }
                    <app-record-history-button resource="prescriptions" [recordId]="r.id" />
                </ng-container>
                <div stat>
                    <dt>Reçete tarihi</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.prescribedAtUtc | trDateTime }}</dd>
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
                <div stat>
                    <dt>Tedavi</dt>
                    <dd>
                        @if (r.treatmentId) {
                            <a [routerLink]="['/panel/treatments', r.treatmentId]" class="text-primary font-semibold no-underline">Tedavi kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı tedavi yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>
            <app-pet-alert-banner [petId]="r.petId" />

            <!-- Eylem şeridi: ödeme ve iptal; salt okunurda kilitli. -->
            @if (canUpdatePrescription && !r.isCancelled) {
                <app-detail-action-bar ariaLabel="Reçete eylemleri">
                    @if (!ro.mutationBlocked()) {
                        @if (r.examinationId?.trim() && r.clientId?.trim() && r.petId?.trim()) {
                            <a [routerLink]="['/panel/payments/new']" [queryParams]="{ clientId: r.clientId, petId: r.petId, examinationId: r.examinationId }" pButton type="button" class="p-button-primary"><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                        }
                        <button pButton type="button" class="p-button-danger p-button-outlined" data-testid="prescription-cancel-open" (click)="cancelVisible.set(true)"><i class="pi pi-ban"></i>İptal et</button>
                    } @else if (r.examinationId?.trim() && r.clientId?.trim() && r.petId?.trim()) {
                        <button pButton type="button" [disabled]="true" class="p-button-primary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
                    }
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: içerik | notlar (8/4, eşit yükseklik); ilaç satırları ve HBS tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8">
                        <h5 class="mt-0 mb-3">İçerik</h5>
                        @if (r.content === emptyMark) {
                            <p class="m-0 field-empty">İçerik yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ r.content }}</p>
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
                @if (r.items.length > 0) {
                    <div class="card mb-0" data-testid="prescription-items">
                        <div class="flex items-center gap-2 mb-3">
                            <h5 class="m-0">İlaç / ürün satırları</h5>
                            <span class="text-sm font-medium text-muted-color">({{ r.items.length }})</span>
                        </div>
                        <ul class="list-none m-0 p-0">
                            @for (item of r.items; track item.id) {
                                <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0">
                                    <div class="font-semibold text-surface-900 dark:text-surface-0 break-words">
                                        {{ item.name }}
                                        @if (item.quantity !== null) {
                                            <span class="text-muted-color font-normal text-sm"> · Miktar: {{ item.quantity }} {{ item.unit }}</span>
                                        }
                                        @if (item.dose) {
                                            <span class="text-muted-color font-normal text-sm"> · Doz: {{ item.dose }}</span>
                                        }
                                    </div>
                                    @if (item.instructions) {
                                        <div class="text-sm break-words">{{ item.instructions }}</div>
                                    }
                                    @if (item.lotNumber) {
                                        <div class="text-sm text-muted-color break-words">Parti/seri no: {{ item.lotNumber }}</div>
                                    }
                                </li>
                            }
                        </ul>
                    </div>
                }
                <app-hbs-section kind="prescription" [recordId]="r.id" [entry]="r.hbs" [canEdit]="canUpdatePrescription && !ro.mutationBlocked()" (entryChange)="onHbsChange($event)" />
            </div>
            <app-reason-confirm-dialog
                [(visible)]="cancelVisible"
                header="Reçeteyi iptal et"
                [summary]="r.title"
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
    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

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
