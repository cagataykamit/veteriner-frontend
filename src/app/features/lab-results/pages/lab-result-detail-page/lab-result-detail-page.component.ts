import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { LabResultDetailVm } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { LabResultStatusBadgesComponent } from '@/app/features/lab-results/components/lab-result-status-badges.component';
import { isLabResultEditable, labResultEditLabel } from '@/app/entities/lab-result/utils/lab-result-status.utils';
import { LabResultCancelDialogComponent } from '@/app/features/lab-results/components/lab-result-cancel-dialog.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/features/pets/components/pet-alert-banner.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { StoredFileGalleryComponent } from '@/app/shared/files/stored-file-gallery.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Düzenleme/oluşturma sonrası dönülen sayfada gösterilen kısa onay (query `saved`). */
const SAVED_MESSAGES: Record<string, string> = { '1': 'Kayıt güncellendi.', created: 'Kayıt oluşturuldu.' };

@Component({
    selector: 'app-lab-result-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        LabResultStatusBadgesComponent,
        LabResultCancelDialogComponent,
        StoredFileGalleryComponent,
        StoredFileUploadComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (savedMessage(); as message) {
            <p class="mb-4 m-0 text-sm font-medium">{{ message }}</p>
        }

        @if (loading()) {
            <app-loading-state message="Kayıt yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row()) {
            <app-page-header categoryLink="/panel/lab-results" categoryLinkLabel="Listeye dön" title="Lab sonucu" [description]="row()!.testName">
                <div actions class="flex flex-wrap gap-2">
                    @if (canUpdateLabResult && isEditable(row()!.status)) {
                        @if (ro.mutationBlocked()) {
                            <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        } @else {
                            <a
                                [routerLink]="['/panel/lab-results', row()!.id, 'edit']"
                                pButton
                                type="button"
                               
                               
                                [class]="row()!.status === 'Requested' ? 'p-button-primary' : 'p-button-secondary'"
                            ><i [class]="row()!.status === 'Requested' ? 'pi pi-check-square' : 'pi pi-pencil'"></i>{{ editLabel(row()!.status) }}</a>
                            <button pButton type="button" class="p-button-danger p-button-outlined" (click)="cancelVisible = true"><i class="pi pi-ban"></i>İptal et</button>
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
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-lab-result-status-badges [status]="row()!.status" [awaitingInterpretation]="row()!.awaitingInterpretation" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">İstem tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.requestedAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Sonuç tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.resultDateUtc | trDateTime }}</dd>
                            @if (row()!.status === 'Cancelled') {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal tarihi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.cancelledAtUtc | trDateTime }}</dd>
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">İptal gerekçesi</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0 whitespace-pre-wrap">{{ row()!.cancelReason ?? '—' }}</dd>
                            }
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
                        <h5 class="mt-0 mb-4">Sonuç</h5>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Sonuç metni</h6>
                        @if (row()!.resultText) {
                            <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.resultText }}</p>
                        } @else {
                            <p class="mt-0 mb-4 text-muted-color">Sonuç henüz girilmedi.</p>
                        }
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Yorum</h6>
                        <p class="mt-0 mb-4 whitespace-pre-wrap">{{ row()!.interpretation }}</p>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Notlar</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                    </div>
                </div>
                <div class="col-span-12">
                    <section class="card" aria-labelledby="lab-files-title" data-testid="lab-files">
                        <h5 id="lab-files-title" class="mt-0 mb-4">Dosyalar</h5>
                        @if (filesError()) {
                            <p class="text-red-500 text-sm m-0" role="alert">{{ filesError() }}</p>
                        } @else {
                            <app-stored-file-gallery
                                [ownerPath]="filesOwner()"
                                [files]="files()"
                                [altBase]="'Lab sonucu: ' + row()!.testName"
                                [emptyText]="row()!.status === 'Cancelled' ? 'Kayıt iptal edildi; dosyalara erişim kapalı.' : 'Henüz dosya yok (sonuç PDF’i veya fotoğrafı eklenebilir).'"
                            />
                        }
                        @if (canAddFiles()) {
                            <div class="mt-4">
                                <app-stored-file-upload [ownerPath]="filesOwner()" [autoUpload]="true" (uploaded)="onFileUploaded($event)" />
                            </div>
                        }
                    </section>
                </div>
            </div>
        }

        <app-lab-result-cancel-dialog [(visible)]="cancelVisible" [target]="row()" (cancelled)="reload()" />
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
    readonly savedMessage = signal<string | null>(null);
    cancelVisible = false;
    readonly canUpdateLabResult = this.auth.hasOperationClaim(LAB_RESULTS_UPDATE_CLAIM);
    private readonly filesService = inject(StoredFilesService);
    readonly files = signal<StoredFileVm[]>([]);
    readonly filesError = signal<string | null>(null);
    readonly filesOwner = computed(() => ApiEndpoints.labResults.filesOwner(this.row()?.id ?? this.labResultId));
    /** Dosya ekleme `LabResults.Update` ister; iptal edilmiş kayda eklenmez (kesinleşmiş muayene engel değildir). */
    readonly canAddFiles = computed(() => this.canUpdateLabResult && this.row()?.status !== 'Cancelled' && !this.ro.mutationBlocked());

    readonly isEditable = isLabResultEditable;
    readonly editLabel = labResultEditLabel;

    private labResultId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        if (!id) {
            this.error.set('Geçersiz kayıt.');
            this.loading.set(false);

            return;
        }

        this.labResultId = id;
        this.savedMessage.set(SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null);
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.labResultsService.getLabResultById(this.labResultId).subscribe({
            next: (x) => {
                this.row.set(x);
                this.loading.set(false);
                this.loadFiles();
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Kayıt yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    onFileUploaded(file: StoredFileVm): void {
        this.files.update((list) => [...list, file]);
    }

    /** Lab dosyaları ayrı uçtan (sözleşme §5); lab detay gövdesi değişmez. */
    private loadFiles(): void {
        this.filesError.set(null);
        this.filesService.list(this.filesOwner()).subscribe({
            next: (files) => this.files.set(files),
            error: (e: Error) => this.filesError.set(e.message)
        });
    }
}
