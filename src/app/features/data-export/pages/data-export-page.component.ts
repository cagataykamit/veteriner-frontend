import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { DATA_EXPORT_STATUS_LABELS, type DataExportJobDto, type DataExportOverviewDto } from '@/app/entities/data-export/models/data-export.model';
import { DataExportsService } from '@/app/entities/data-export/services/data-exports.service';
import { formatFileSize } from '@/app/shared/files/stored-file.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Açık iş varken liste bu aralıkla yenilenir (iş hazır olunca bildirim de düşer). */
const OPEN_JOB_REFRESH_MS = 10_000;

/**
 * Ayarlar > Verimi dışa aktar (`DATA_EXPORT_API_CONTRACT.md`): kurumun tüm verisi tek ZIP pakette (her tablo bir CSV). Paket
 * arka planda hazırlanır, hazır olunca bildirim merkezine düşer ve burada indirilir. Talep salt okunur abonelikte de açıktır
 * (veri taşınabilirliği kilitlenmez); sınır ve saklama süresi sunucudan gelir.
 */
@Component({
    selector: 'app-data-export-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, MessageModule, TableModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent],
    template: `
        <app-page-header
            [categoryLink]="settingsRoute"
            categoryLinkLabel="Ayarlar"
            title="Verimi dışa aktar"
            description="Kurumunuzun tüm kayıtları tek pakette: ZIP içinde her tablo ayrı bir CSV dosyası. Kliniği başka bir sisteme taşımak ya da arşivlemek için."
        />

        @if (loading()) {
            <app-loading-state message="Dışa aktarmalar yükleniyor…" />
        } @else if (error(); as err) {
            <app-error-state [detail]="err" (retry)="reload()" />
        } @else if (data(); as d) {
            <div class="grid grid-cols-12 gap-4">
                <section class="card col-span-12 lg:col-span-7 mb-0" aria-labelledby="scopeTitle">
                    <h5 id="scopeTitle" class="mt-0">Pakette neler var</h5>
                    <ul class="m-0 pl-5 text-sm flex flex-col gap-1" data-testid="data-export-scope">
                        <li>Klinikler, kullanıcı adları, müşteriler ve hastalar (uyarılar ve notlar dahil).</li>
                        <li>Randevular, gelişler, muayeneler (tüm metinler, kesinleştirme ve ek notlar), tedaviler, reçeteler ve satırları, aşılar, uygulamalar, lab sonuçları, görüntüleme kayıtları, yatışlar ve bakım talimatları.</li>
                        <li>Ücretler, ödemeler, dağıtımlar, krediler ve iadeler; ürünler, stok, partiler, stok hareketleri ve satışlar.</li>
                        <li>Hatırlatma gönderim günlüğü (ileti içeriği olmadan) ve hasta sahibi portalı bağlarının durumu.</li>
                    </ul>
                    <h6 class="mt-4 mb-2">Pakette olmayanlar</h6>
                    <ul class="m-0 pl-5 text-sm flex flex-col gap-1 text-muted-color">
                        <li>Parolalar, oturum bilgileri, API anahtarları ve portal hesaplarının giriş bilgileri.</li>
                        <li>Gönderilen e-posta ve bildirim içerikleri.</li>
                        <li>Yüklenen dosyaların kendisi (görüntü, lab ekleri); yalnız kaydı ve dosya adı.</li>
                    </ul>
                    <p class="m-0 mt-4 text-sm text-muted-color">
                        Dosyalar UTF-8 ve noktalı virgüllüdür; her dosyanın ilk sütunu kayıt kimliğidir. Zamanlar UTC ve İstanbul saatiyle, tutarlar ondalık noktayla yazılır. Pakette sütunları açıklayan BENIOKU.txt vardır.
                    </p>
                </section>

                <section class="card col-span-12 lg:col-span-5 mb-0" aria-labelledby="requestTitle">
                    <h5 id="requestTitle" class="mt-0">Yeni dışa aktarma</h5>
                    <ul class="m-0 pl-5 mb-4 text-sm flex flex-col gap-1">
                        <li>Paket arka planda hazırlanır; büyük kurumlarda birkaç dakika sürebilir. Hazır olunca bildirim gelir.</li>
                        <li>Hazır paket {{ d.retentionDays }} gün saklanır, sonra silinir.</li>
                        <li data-testid="data-export-limit">Son {{ d.windowHours }} saatte en çok {{ d.maxRequestsPerWindow }} dışa aktarma; kalan {{ d.remainingRequests }}.</li>
                        <li>Abonelik salt okunurken de kullanılabilir.</li>
                    </ul>
                    @if (blockedReason(); as reason) {
                        <p class="m-0 mb-3 text-sm text-muted-color" role="status" data-testid="data-export-blocked">{{ reason }}</p>
                    }
                    @if (requestMessage(); as m) {
                        <p-message [severity]="m.severity" class="w-full mb-3" role="status">{{ m.text }}</p-message>
                    }
                    <button pButton type="button" [disabled]="!canRequest()" (click)="request()" data-testid="data-export-request">
                        <i class="pi pi-download"></i>Tüm verimi dışa aktar
                    </button>
                </section>

                <section class="card col-span-12 mb-0" aria-labelledby="jobsTitle">
                    <h5 id="jobsTitle" class="mt-0">Son dışa aktarmalar</h5>
                    @if (downloadError(); as m) {
                        <p-message severity="error" class="w-full mb-3" role="alert">{{ m }}</p-message>
                    }
                    @if (d.items.length === 0) {
                        <p class="m-0 text-sm text-muted-color" data-testid="data-export-empty">Henüz dışa aktarma yok.</p>
                    } @else {
                        <div class="overflow-x-auto table-stack-phone">
                            <p-table [value]="items()" [tableStyle]="{ 'min-width': '40rem' }" data-testid="data-export-table">
                                <ng-template #header>
                                    <tr>
                                        <th>Talep</th>
                                        <th>Durum</th>
                                        <th>Hazır / son gün</th>
                                        <th>Boyut</th>
                                        <th><span class="sr-only">İşlem</span></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-j>
                                    <tr data-testid="data-export-row">
                                        <td data-label="Talep">
                                            <div>{{ fmt(j.requestedAtUtc) }}</div>
                                            @if (j.requestedByName) {
                                                <small class="text-muted-color">{{ j.requestedByName }}</small>
                                            }
                                        </td>
                                        <td data-label="Durum"><app-status-tag [label]="statusLabel(j).label" [severity]="statusLabel(j).severity" /></td>
                                        <td data-label="Hazır / son gün">
                                            @if (j.completedAtUtc && j.status !== 'Failed') {
                                                <div>{{ fmt(j.completedAtUtc) }}</div>
                                            }
                                            @if (j.expiresAtUtc) {
                                                <small class="text-muted-color">{{ j.status === 'Expired' ? 'Silindi' : 'Son gün' }} {{ fmt(j.expiresAtUtc) }}</small>
                                            }
                                        </td>
                                        <td data-label="Boyut">{{ j.fileSizeBytes ? size(j.fileSizeBytes) : '—' }}</td>
                                        <td>
                                            @if (j.canDownload) {
                                                <button pButton type="button" class="p-button-sm" [disabled]="downloadingId() === j.id" (click)="download(j)" data-testid="data-export-download">
                                                    <i class="pi pi-download"></i>İndir
                                                </button>
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </section>
            </div>
        }
    `
})
export class DataExportPageComponent implements OnInit {
    readonly settingsRoute = SETTINGS_ROUTE;

    private readonly service = inject(DataExportsService);
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;

    readonly data = signal<DataExportOverviewDto | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly requesting = signal(false);
    readonly requestMessage = signal<{ text: string; severity: 'success' | 'error' } | null>(null);
    readonly downloadingId = signal<string | null>(null);
    readonly downloadError = signal<string | null>(null);

    readonly items = computed(() => [...(this.data()?.items ?? [])]);
    readonly blockedReason = computed(() => {
        const d = this.data();

        if (!d) {
            return null;
        }

        if (d.hasOpenJob) {
            return 'Hazırlanan bir dışa aktarma var; bitince yenisini isteyebilirsiniz.';
        }

        return d.remainingRequests === 0 ? `Son ${d.windowHours} saatteki dışa aktarma hakkı doldu; daha sonra tekrar deneyin.` : null;
    });
    readonly canRequest = computed(() => !this.requesting() && this.data() !== null && this.blockedReason() === null);

    fmt = (utc: string) => formatDateTimeDisplay(utc);
    size = (bytes: number) => formatFileSize(bytes);
    statusLabel = (j: DataExportJobDto) => DATA_EXPORT_STATUS_LABELS[j.status];

    constructor() {
        inject(DestroyRef).onDestroy(() => this.clearRefresh());
    }

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(this.data() === null);
        this.error.set(null);
        this.service.overview().subscribe({
            next: (d) => {
                this.data.set(d);
                this.loading.set(false);
                this.scheduleRefresh(d);
            },
            error: (err: unknown) => {
                this.error.set(panelHttpFailureMessage(err, 'Dışa aktarmalar yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    request(): void {
        if (!this.canRequest()) {
            return;
        }

        this.requesting.set(true);
        this.requestMessage.set(null);
        this.service.request().subscribe({
            next: () => {
                this.requesting.set(false);
                this.requestMessage.set({ text: 'Dışa aktarma sıraya alındı. Hazır olunca bildirim gelecek.', severity: 'success' });
                this.reload();
            },
            error: (err: unknown) => {
                this.requesting.set(false);
                this.requestMessage.set({ text: panelHttpFailureMessage(err, 'Dışa aktarma başlatılamadı.'), severity: 'error' });
                this.reload();
            }
        });
    }

    download(job: DataExportJobDto): void {
        this.downloadingId.set(job.id);
        this.downloadError.set(null);
        this.service.download(job.id).subscribe({
            next: (res) => {
                this.downloadingId.set(null);

                if (res.body) {
                    triggerBlobDownload(res.body, fileNameFromContentDisposition(res.headers.get('Content-Disposition')) ?? 'vetinity-veri.zip');
                }
            },
            error: (err: unknown) => {
                this.downloadingId.set(null);
                this.downloadError.set(panelHttpFailureMessage(err, 'Paket indirilemedi; süresi dolmuş olabilir.'));
                this.reload();
            }
        });
    }

    private scheduleRefresh(d: DataExportOverviewDto): void {
        this.clearRefresh();

        if (d.hasOpenJob) {
            this.refreshTimer = setTimeout(() => this.reload(), OPEN_JOB_REFRESH_MS);
        }
    }

    private clearRefresh(): void {
        if (this.refreshTimer !== null) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}
