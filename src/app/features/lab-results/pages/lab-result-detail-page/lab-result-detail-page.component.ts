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
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { StoredFileGalleryComponent } from '@/app/shared/files/stored-file-gallery.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

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
        AppDetailIdentityCardComponent,
        AppDetailSubjectLineComponent,
        RecordHistoryButtonComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        LabResultStatusBadgesComponent,
        LabResultCancelDialogComponent,
        StoredFileGalleryComponent,
        StoredFileUploadComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
        } @else if (row(); as r) {
            <app-page-header categoryLink="/panel/lab-results" categoryLinkLabel="Listeye dön" />

            <!-- Kimlik kartı: test adı + durum rozetleri, sonuç tarihi, kayıt satırı, hasta/sahip, iptal notu; sağda Düzenle/Sonuç gir, geçmiş ve İptal et (tek eylem şeridi gerekmez); gösterge şeridi. -->
            <app-detail-identity-card icon="pi pi-chart-bar" [title]="r.testName" [subtitle]="r.resultDateUtc ? (r.resultDateUtc | trDateTime) : ''" [meta]="'Oluşturulma: ' + (r.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (r.updatedAtUtc | trDateTime)" ariaLabel="Lab sonucu kimliği" testId="lab-result-identity-card">
                <app-lab-result-status-badges badges [status]="r.status" [awaitingInterpretation]="r.awaitingInterpretation" />
                <app-detail-subject-line [petId]="r.petId" [petName]="r.petName" [clientId]="r.clientId" [clientName]="r.clientName" />
                @if (r.status === 'Cancelled') {
                    <p class="m-0 mt-3 inline-flex items-start gap-2 rounded-border border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" role="status">
                        <i class="pi pi-ban text-xs mt-1" aria-hidden="true"></i>
                        <span><span class="font-medium">İptal edildi</span> · {{ r.cancelledAtUtc | trDateTime }}<span class="block whitespace-pre-wrap">Gerekçe: {{ r.cancelReason ?? '—' }}</span></span>
                    </p>
                }
                <ng-container actions>
                    @if (canUpdateLabResult && isEditable(r.status)) {
                        @if (ro.mutationBlocked()) {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        } @else {
                            <a [routerLink]="['/panel/lab-results', r.id, 'edit']" pButton type="button" [class]="r.status === 'Requested' ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"
                                ><i [class]="r.status === 'Requested' ? 'pi pi-check-square' : 'pi pi-pencil'"></i>{{ editLabel(r.status) }}</a
                            >
                        }
                    }
                    <app-record-history-button resource="lab-results" [recordId]="r.id" />
                    @if (canUpdateLabResult && isEditable(r.status) && !ro.mutationBlocked()) {
                        <button pButton type="button" class="p-button-danger p-button-outlined" (click)="cancelVisible.set(true)"><i class="pi pi-ban"></i>İptal et</button>
                    }
                </ng-container>
                <div stat>
                    <dt>İstem tarihi</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.requestedAtUtc | trDateTime }}</dd>
                </div>
                <div stat>
                    <dt>Sonuç tarihi</dt>
                    <dd>
                        @if (r.resultDateUtc) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.resultDateUtc | trDateTime }}</span>
                        } @else {
                            <span class="field-empty">Sonuç bekleniyor</span>
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


            <!-- Satır ızgarası: sonuç + yorum | notlar (8/4, eşit yükseklik); dosyalar tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-8">
                        <h5 class="mt-0 mb-3">Sonuç</h5>
                        <h6 class="m-0 mb-1 field-label">Sonuç metni</h6>
                        @if (r.resultText) {
                            <p class="mt-0 mb-4 whitespace-pre-wrap">{{ r.resultText }}</p>
                        } @else {
                            <p class="mt-0 mb-4 field-empty">Sonuç henüz girilmedi.</p>
                        }
                        <h6 class="m-0 mb-1 field-label">Yorum</h6>
                        @if (r.interpretation === emptyMark) {
                            <p class="m-0 field-empty">Yorum yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ r.interpretation }}</p>
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
                <section class="card mb-0" aria-labelledby="lab-files-title" data-testid="lab-files">
                    <h5 id="lab-files-title" class="mt-0 mb-3">Dosyalar</h5>
                    @if (filesError()) {
                        <p class="text-danger text-sm m-0" role="alert">{{ filesError() }}</p>
                    } @else {
                        <app-stored-file-gallery
                            [ownerPath]="filesOwner()"
                            [files]="files()"
                            [altBase]="'Lab sonucu: ' + r.testName"
                            [emptyText]="r.status === 'Cancelled' ? 'Kayıt iptal edildi; dosyalara erişim kapalı.' : 'Henüz dosya yok (sonuç PDF’i veya fotoğrafı eklenebilir).'"
                        />
                    }
                    @if (canAddFiles()) {
                        <div class="mt-4">
                            <app-stored-file-upload [ownerPath]="filesOwner()" [autoUpload]="true" (uploaded)="onFileUploaded($event)" />
                        </div>
                    }
                </section>
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

    private readonly loader = new RouteEntityLoader<LabResultDetailVm>({
        fetch: (id) => this.labResultsService.getLabResultById(id),
        invalidIdMessage: 'Geçersiz kayıt.',
        errorMessage: (e) => (e instanceof Error ? e.message : 'Kayıt yüklenemedi.'),
        onRouteChange: (id) => this.resetForRoute(id),
        onLoaded: () => this.loadFiles()
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly row = this.loader.value;
    readonly savedMessage = signal<string | null>(null);
    readonly cancelVisible = signal(false);
    readonly canUpdateLabResult = this.auth.hasOperationClaim(LAB_RESULTS_UPDATE_CLAIM);
    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';
    private readonly filesService = inject(StoredFilesService);
    readonly files = signal<StoredFileVm[]>([]);
    readonly filesError = signal<string | null>(null);
    readonly filesOwner = computed(() => ApiEndpoints.labResults.filesOwner(this.row()?.id ?? this.loader.id ?? ''));
    /** Dosya ekleme `LabResults.Update` ister; iptal edilmiş kayda eklenmez (kesinleşmiş muayene engel değildir). */
    readonly canAddFiles = computed(() => this.canUpdateLabResult && this.row()?.status !== 'Cancelled' && !this.ro.mutationBlocked());

    readonly isEditable = isLabResultEditable;
    readonly editLabel = labResultEditLabel;

    ngOnInit(): void {
        this.loader.init();
    }

    reload(): void {
        this.loader.reload();
    }

    onFileUploaded(file: StoredFileVm): void {
        this.files.update((list) => [...list, file]);
    }

    /** Aynı bileşende başka kayda geçişte önceki kaydın dosyaları, iptal diyaloğu ve onay mesajı kalmaz. */
    private resetForRoute(id: string | null): void {
        this.savedMessage.set(id ? (SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null) : null);
        this.cancelVisible.set(false);
        this.files.set([]);
        this.filesError.set(null);
    }

    /** Lab dosyaları ayrı uçtan (sözleşme §5); lab detay gövdesi değişmez. Geç gelen önceki kaydın listesi yazılmaz. */
    private loadFiles(): void {
        const id = this.loader.id;

        this.filesError.set(null);
        this.filesService.list(this.filesOwner()).subscribe({
            next: (files) => {
                if (id === this.loader.id) {
                    this.files.set(files);
                }
            },
            error: (e: Error) => {
                if (id === this.loader.id) {
                    this.filesError.set(e.message);
                }
            }
        });
    }
}
