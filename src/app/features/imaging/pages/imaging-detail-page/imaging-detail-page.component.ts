import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CANCEL_CLAIM, IMAGING_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ImagingCancelDialogComponent } from '@/app/features/imaging/components/imaging-cancel-dialog.component';
import type { ImagingRecordDetailVm } from '@/app/entities/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/entities/imaging/services/imaging-records.service';
import { IMAGING_ADDED_AFTER_FINALIZATION_LABEL, imagingAltText, imagingModalityLabel, imagingStatusLabel, imagingStatusSeverity } from '@/app/entities/imaging/utils/imaging.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { StoredFileGalleryComponent } from '@/app/shared/files/stored-file-gallery.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

const SAVED_MESSAGES: Record<string, string> = { created: 'Görüntüleme kaydedildi.' };

/**
 * Görüntüleme detayı (ADR-007): görüntü önizleme ve büyütme, PDF açma, indirme, gerekçeli iptal. Dosya ekleme yalnız etkin kayıtta;
 * kesinleşmiş muayeneye bağlı eski kayıtta sunucu reddeder ve neden gösterilir (ek görüntü yeni kayıt olarak girilir).
 */
@Component({
    selector: 'app-imaging-detail-page',
    standalone: true,
    imports: [
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        StoredFileGalleryComponent,
        StoredFileUploadComponent,
        ImagingCancelDialogComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (savedMessage(); as message) {
            <p class="mb-4 m-0 text-sm font-medium" role="status">{{ message }}</p>
        }

        @if (loading()) {
            <app-loading-state message="Kayıt yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row(); as r) {
            <app-page-header categoryLink="/panel/imaging" categoryLinkLabel="Listeye dön" />

            <!-- Kimlik kartı: tür + durum/geç kayıt rozetleri, açıklama, kayıt satırı, hasta/sahip, iptal notu; gösterge şeridi (tarih, tür, muayene). -->
            <app-detail-identity-card icon="pi pi-image" [title]="modalityLabel(r.modality)" [subtitle]="r.description ?? ''" [meta]="'Oluşturulma: ' + (r.createdAtUtc | trDateTime)" ariaLabel="Görüntüleme kimliği" testId="imaging-identity-card">
                <ng-container badges>
                    <app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" />
                    @if (r.addedAfterExaminationFinalization) {
                        <app-status-tag [label]="lateLabel" severity="info" />
                    }
                </ng-container>
                <app-detail-subject-line [petId]="r.petId" [petName]="r.petName" [clientId]="r.clientId" [clientName]="r.clientName" />
                @if (r.status === 'Cancelled') {
                    <p class="m-0 mt-3 inline-flex items-start gap-2 rounded-border border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="status">
                        <i class="pi pi-ban text-xs mt-1" aria-hidden="true"></i>
                        <span><span class="font-medium">İptal edildi</span> · {{ r.cancelledAtUtc | trDateTime }}<span class="block whitespace-pre-wrap">Gerekçe: {{ r.cancelReason ?? '—' }}</span></span>
                    </p>
                }
                <div stat>
                    <dt>Tarih</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.performedAtUtc | trDateTime }}</dd>
                </div>
                <div stat>
                    <dt>Tür</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ modalityLabel(r.modality) }}</dd>
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

            <!-- Eylem şeridi: gerekçeli iptal; salt okunurda kilitli. -->
            @if (r.status === 'Active' && canCancel) {
                <app-detail-action-bar ariaLabel="Görüntüleme eylemleri">
                    @if (ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>İptal et (salt okunur)</button>
                    } @else {
                        <button pButton type="button" class="p-button-danger p-button-outlined" (click)="cancelVisible.set(true)" data-testid="imaging-cancel"><i class="pi pi-ban"></i>İptal et</button>
                    }
                </app-detail-action-bar>
            }

            <div class="flex flex-col gap-4">
                @if (r.clinicalNote) {
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-3">Klinik not</h5>
                        <p class="m-0 whitespace-pre-wrap">{{ r.clinicalNote }}</p>
                    </div>
                }
                <section class="card mb-0" aria-labelledby="imaging-files-title">
                    <h5 id="imaging-files-title" class="mt-0 mb-3">Dosyalar</h5>
                    <app-stored-file-gallery [ownerPath]="ownerPath()" [files]="r.files" [altBase]="altBase()" [emptyText]="r.status === 'Cancelled' ? 'Kayıt iptal edildi; dosyalara erişim kapalı.' : 'Henüz dosya yok.'" />
                    @if (canAddFiles()) {
                        <div class="mt-4">
                            <app-stored-file-upload [ownerPath]="ownerPath()" [autoUpload]="true" (uploaded)="onUploaded($event)" />
                        </div>
                    }
                </section>
            </div>
        }

        <app-imaging-cancel-dialog [(visible)]="cancelVisible" [target]="row()" (cancelled)="reload()" />
    `
})
export class ImagingDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly imagingService = inject(ImagingRecordsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly loader = new RouteEntityLoader<ImagingRecordDetailVm>({
        fetch: (id) => this.imagingService.getById(id),
        invalidIdMessage: 'Geçersiz kayıt.',
        errorMessage: (e) => (e instanceof Error ? e.message : 'Kayıt yüklenemedi.'),
        onRouteChange: (id) => this.resetForRoute(id)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly row = this.loader.value;
    readonly savedMessage = signal<string | null>(null);
    readonly cancelVisible = signal(false);

    readonly canCancel = this.auth.hasOperationClaim(IMAGING_CANCEL_CLAIM);
    readonly canUpload = this.auth.hasOperationClaim(IMAGING_CREATE_CLAIM);
    readonly lateLabel = IMAGING_ADDED_AFTER_FINALIZATION_LABEL;
    readonly modalityLabel = imagingModalityLabel;
    readonly statusLabel = imagingStatusLabel;
    readonly statusSeverity = imagingStatusSeverity;

    readonly ownerPath = computed(() => this.imagingService.filesOwner(this.row()?.id ?? this.loader.id ?? ''));
    readonly altBase = computed(() => {
        const r = this.row();

        return r ? imagingAltText(r.modality, r.performedAtUtc) : 'Görüntü';
    });
    readonly canAddFiles = computed(() => this.row()?.status === 'Active' && this.canUpload && !this.ro.mutationBlocked());

    ngOnInit(): void {
        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }

    /** Yeni dosya galeriye eklenir; sayfa yeniden yüklenmez (kuyruktaki diğer yüklemeler sürer). */
    onUploaded(file: StoredFileVm): void {
        this.row.update((r) => (r ? { ...r, files: [...r.files, file] } : r));
    }

    /** Aynı bileşende başka kayda geçişte önceki kaydın iptal diyaloğu ve onay mesajı kalmaz. */
    private resetForRoute(id: string | null): void {
        this.savedMessage.set(id ? (SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null) : null);
        this.cancelVisible.set(false);
    }
}
