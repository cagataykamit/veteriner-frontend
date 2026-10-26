import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CANCEL_CLAIM, IMAGING_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ImagingCancelDialogComponent } from '@/app/features/imaging/components/imaging-cancel-dialog.component';
import type { ImagingRecordDetailVm } from '@/app/features/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { IMAGING_ADDED_AFTER_FINALIZATION_LABEL, imagingAltText, imagingModalityLabel, imagingStatusLabel, imagingStatusSeverity } from '@/app/features/imaging/utils/imaging.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { StoredFileGalleryComponent } from '@/app/shared/files/stored-file-gallery.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { PetAlertBannerComponent } from '@/app/features/pets/components/pet-alert-banner.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

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
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        StoredFileGalleryComponent,
        StoredFileUploadComponent,
        ImagingCancelDialogComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
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
            <app-page-header categoryLink="/panel/imaging" categoryLinkLabel="Listeye dön" [title]="modalityLabel(r.modality)" [description]="r.description ?? ''">
                <div actions class="flex flex-wrap gap-2">
                    @if (r.status === 'Active' && canCancel) {
                        @if (ro.mutationBlocked()) {
                            <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>İptal et (salt okunur)</button>
                        } @else {
                            <button pButton type="button" class="p-button-danger p-button-outlined" (click)="cancelVisible = true" data-testid="imaging-cancel"><i class="pi pi-ban"></i>İptal et</button>
                        }
                    }
                </div>
            </app-page-header>
            <app-pet-alert-banner [petId]="r.petId" />

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0 flex flex-wrap gap-1">
                                <app-status-tag [label]="statusLabel(r.status)" [severity]="statusSeverity(r.status)" />
                                @if (r.addedAfterExaminationFinalization) {
                                    <app-status-tag [label]="lateLabel" severity="info" />
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tarih</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ r.performedAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tür</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ modalityLabel(r.modality) }}</dd>
                            @if (r.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/examinations', r.examinationId]" class="text-primary font-medium no-underline">Muayene kaydına git →</a>
                                </dd>
                            }
                            @if (r.status === 'Cancelled') {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal tarihi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ r.cancelledAtUtc | trDateTime }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal gerekçesi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0 whitespace-pre-wrap">{{ r.cancelReason ?? '—' }}</dd>
                            }
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ r.createdAtUtc | trDateTime }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hasta</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <a [routerLink]="['/panel/clients', r.clientId]" class="text-primary font-medium no-underline">{{ r.clientName }}</a>
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hasta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <a [routerLink]="['/panel/pets', r.petId]" class="text-primary font-medium no-underline">{{ r.petName }}</a>
                            </dd>
                        </dl>
                        @if (r.clinicalNote) {
                            <h6 class="mt-4 mb-2 text-muted-color text-sm">Klinik not</h6>
                            <p class="m-0 whitespace-pre-wrap">{{ r.clinicalNote }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <section class="card" aria-labelledby="imaging-files-title">
                        <h5 id="imaging-files-title" class="mt-0 mb-4">Dosyalar</h5>
                        <app-stored-file-gallery [ownerPath]="ownerPath()" [files]="r.files" [altBase]="altBase()" [emptyText]="r.status === 'Cancelled' ? 'Kayıt iptal edildi; dosyalara erişim kapalı.' : 'Henüz dosya yok.'" />
                        @if (canAddFiles()) {
                            <div class="mt-4">
                                <app-stored-file-upload [ownerPath]="ownerPath()" [autoUpload]="true" (uploaded)="onUploaded($event)" />
                            </div>
                        }
                    </section>
                </div>
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

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<ImagingRecordDetailVm | null>(null);
    readonly savedMessage = signal<string | null>(null);
    cancelVisible = false;

    readonly canCancel = this.auth.hasOperationClaim(IMAGING_CANCEL_CLAIM);
    readonly canUpload = this.auth.hasOperationClaim(IMAGING_CREATE_CLAIM);
    readonly lateLabel = IMAGING_ADDED_AFTER_FINALIZATION_LABEL;
    readonly modalityLabel = imagingModalityLabel;
    readonly statusLabel = imagingStatusLabel;
    readonly statusSeverity = imagingStatusSeverity;

    readonly ownerPath = computed(() => this.imagingService.filesOwner(this.row()?.id ?? this.recordId));
    readonly altBase = computed(() => {
        const r = this.row();

        return r ? imagingAltText(r.modality, r.performedAtUtc) : 'Görüntü';
    });
    readonly canAddFiles = computed(() => this.row()?.status === 'Active' && this.canUpload && !this.ro.mutationBlocked());

    private recordId = '';

    ngOnInit(): void {
        this.recordId = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        if (!this.recordId) {
            this.error.set('Geçersiz kayıt.');
            this.loading.set(false);

            return;
        }

        this.savedMessage.set(SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null);
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.imagingService.getById(this.recordId).subscribe({
            next: (r) => {
                this.row.set(r);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Kayıt yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    /** Yeni dosya galeriye eklenir; sayfa yeniden yüklenmez (kuyruktaki diğer yüklemeler sürer). */
    onUploaded(file: StoredFileVm): void {
        this.row.update((r) => (r ? { ...r, files: [...r.files, file] } : r));
    }
}
