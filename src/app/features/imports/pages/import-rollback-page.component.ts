import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { Subscription } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_COMMIT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { ImportJobProgressComponent } from '@/app/features/imports/components/import-job-progress.component';
import type { ImportBatchDto, ImportBlockedPolicy, ImportCommitProgressDto, ImportRollbackBlockedItemDto, ImportRollbackCountsDto, ImportRollbackPreviewDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import {
    IMPORT_TABLE_LABELS,
    ROLLBACK_ENTITY_LABELS,
    importErrorCode,
    importErrorExtension,
    importErrorMessage,
    importStatusLabel,
    importStatusSeverity,
    isRollbackable,
    isRollbackScreenAvailable,
    rollbackBlockedItems,
    rollbackReasonLabel,
    rollbackWarningLabel
} from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_POLL_CONNECTION_MESSAGE, pollImportProgress } from '@/app/features/imports/utils/import-progress-poll.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

export const ROLLBACK_REASON_MAX_LENGTH = 500;

/**
 * Aktarılan kayıtları geri alma ekranı (ADR-019 K7). Önizleme silinebilir ve engelli kayıtları gösterir;
 * onay için gerekçe, politika ve "geri alınamaz" onayı gerekir. Kişisel veri gösterilmez: engelli kayıtlar kimlik ve satır numarasıyla anılır.
 */
@Component({
    selector: 'app-import-rollback-page',
    standalone: true,
    imports: [
        NgTemplateOutlet,
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        MessageModule,
        RadioButtonModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        ImportJobProgressComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header [title]="'Geri al · ' + (batch()?.name || 'Veri içe aktarma')" description="Bu içe aktarmanın oluşturduğu kayıtları siler. Sistemde önceden var olan ve eşleşen kayıtlara hiçbir zaman dokunulmaz.">
            <div actions class="flex flex-wrap gap-2 items-center">
                @if (batch(); as b) {
                    <app-status-tag [label]="statusLabel(b.status)" [severity]="statusSeverity(b.status)" />
                }
                <a pButton size="small" severity="secondary" [routerLink]="listRoute"><i class="p-button-icon pi pi-arrow-left"></i>Geçmişe dön</a>
            </div>
        </app-page-header>

        <ng-template #items let-list let-truncated="truncated">
            <ul class="list-none p-0 m-0 flex flex-col gap-2" aria-label="Silinemeyen kayıtlar">
                @for (it of list; track it.id + it.rowNumber) {
                    <li class="rounded-border border border-surface-200 dark:border-surface-700 p-3">
                        <div class="font-medium">{{ entityLabel(it) }} · {{ tableLabel(it) }}, {{ it.rowNumber }}. satır</div>
                        <div class="text-sm text-muted-color break-all">Kayıt kimliği: {{ it.id }}</div>
                        <ul class="m-0 mt-1 pl-4 text-sm">
                            @for (r of it.reasons; track r) {
                                <li>{{ reasonLabel(r) }}</li>
                            }
                        </ul>
                    </li>
                }
            </ul>
            @if (truncated) {
                <small class="text-muted-color">Liste kısaltıldı; yalnızca ilk kayıtlar gösteriliyor.</small>
            }
        </ng-template>

        <ng-template #counts let-title="title" let-c="c">
            <div class="rounded-border border border-surface-200 dark:border-surface-700 p-3 flex-1 basis-56">
                <div class="text-sm text-muted-color">{{ title }}</div>
                <div class="mt-1">{{ c.clients }} müşteri · {{ c.pets }} hasta · {{ c.vaccinations }} aşı</div>
            </div>
        </ng-template>

        @if (!canCommit) {
            <p-message severity="info" class="w-full">Geri alma için aktarma yetkisi gerekir.</p-message>
        } @else if (loading()) {
            <app-loading-state message="Geri alma bilgisi yükleniyor…" />
        } @else if (loadError()) {
            <app-error-state title="Geri alma bilgisi yüklenemedi." [detail]="loadError()!" (retry)="load()" />
        } @else if (batch(); as b) {
            <div class="card">
                @if (b.status === 'RollingBack') {
                    <p class="mt-0">Kayıtlar geri alınıyor. Bu sayfayı kapatabilirsiniz; işlem arka planda sürer.</p>
                    <app-import-job-progress [progress]="progress()" [stalled]="stalled()" />
                    @if (pollError()) {
                        <p-message severity="warn" class="w-full mt-2" role="alert">
                            {{ pollError() }}
                            <button pButton type="button" size="small" severity="secondary" class="ml-2" (click)="startPolling(b.id)"><i class="p-button-icon pi pi-refresh"></i>Yeniden dene</button>
                        </p-message>
                    }
                } @else if (!screenAvailable()) {
                    <p-message severity="info" class="w-full">Bu içe aktarma bu durumda geri alınamaz.</p-message>
                }

                @if (error()) {
                    <p-message severity="error" class="w-full mb-4" role="alert">{{ error() }}</p-message>
                }

                @if (b.status === 'RolledBack') {
                    <p-message severity="success" class="w-full mb-4" role="status">Geri alma tamamlandı. Bu içe aktarmanın oluşturduğu tüm kayıtlar silindi; aynı dosyayı yeniden yükleyebilirsiniz.</p-message>
                } @else if (b.status === 'PartiallyRolledBack') {
                    <p-message severity="warn" class="w-full mb-4" role="status">Geri alma kısmen tamamlandı. Bağlı kaydı olan kayıtlar silinmedi; nedenleri aşağıda.</p-message>
                } @else if (b.status === 'RollbackFailed') {
                    <p-message severity="error" class="w-full mb-4" role="alert">Geri alma beklenmeyen bir sorunla durdu. Silinen kayıtlar silinmiş kalır; aşağıdan yeniden deneyebilirsiniz.</p-message>
                } @else if (b.status === 'CommitFailed') {
                    <p-message severity="info" class="w-full mb-4" role="status">Aktarma yarıda kalmıştı. Şimdiye dek oluşan kayıtlar geri alınabilir.</p-message>
                }

                @if (preview(); as p) {
                    <h6 class="mt-0 mb-2">Geri alma özeti</h6>
                    <div class="flex flex-wrap gap-3 mb-3">
                        <ng-container *ngTemplateOutlet="counts; context: { title: 'Silinecek (bağı yok)', c: p.deletable }" />
                        <ng-container *ngTemplateOutlet="counts; context: { title: 'Bağlı kaydı olduğu için silinemeyecek', c: p.blocked }" />
                        @if (hasAny(p.rolledBack)) {
                            <ng-container *ngTemplateOutlet="counts; context: { title: 'Daha önce geri alınan', c: p.rolledBack }" />
                        }
                    </div>
                    @if (p.kept.matchedClients || p.kept.matchedPets) {
                        <p class="text-sm text-muted-color mt-0">Sistemde önceden var olup eşleşen {{ p.kept.matchedClients }} müşteri ve {{ p.kept.matchedPets }} hastaya dokunulmaz.</p>
                    }
                    @for (w of p.warnings; track w) {
                        <p-message severity="warn" class="w-full mb-2">{{ warningLabel(w) }}</p-message>
                    }
                    @if (p.remindersAlreadyReleased && !p.warnings.includes('Imports.RemindersAlreadyReleased')) {
                        <p-message severity="warn" class="w-full mb-2">{{ warningLabel('Imports.RemindersAlreadyReleased') }}</p-message>
                    }

                    @if (p.blockedItems.length > 0) {
                        <h6 class="mb-2">Silinemeyecek kayıtlar</h6>
                        <ng-container *ngTemplateOutlet="items; context: { $implicit: p.blockedItems, truncated: p.blockedItemsTruncated }" />
                    }
                }

                @if (blockedError()) {
                    <h6 class="mb-2">Geri alma durduruldu: şu kayıtlar silinemiyor</h6>
                    @if (blockedError()!.counts) {
                        <p class="mt-0 text-sm">{{ blockedError()!.counts!.clients }} müşteri · {{ blockedError()!.counts!.pets }} hasta · {{ blockedError()!.counts!.vaccinations }} aşı engelli.</p>
                    }
                    <ng-container *ngTemplateOutlet="items; context: { $implicit: blockedError()!.items, truncated: blockedError()!.items.length >= 50 }" />
                }

                @if (formVisible()) {
                    <section class="mt-4">
                        <h6 class="mt-0 mb-2">Geri almayı onayla</h6>

                        <div class="flex flex-col gap-1 mb-4">
                            <label for="rollbackReason" class="font-medium">Gerekçe (zorunlu)</label>
                            <textarea id="rollbackReason" pTextarea rows="3" class="w-full" [maxlength]="reasonMax" [ngModel]="reason()" (ngModelChange)="reason.set($event)" aria-describedby="rollbackReasonHint"></textarea>
                            <small id="rollbackReasonHint" class="text-muted-color">{{ reason().length }} / {{ reasonMax }} · Neden geri aldığınızı yazın (örn. yanlış dosya). Kişisel bilgi yazmayın.</small>
                        </div>

                        <fieldset class="border-0 p-0 m-0 mb-4">
                            <legend class="font-medium mb-2 p-0">Bağlı kaydı olanlar ne olsun?</legend>
                            <div class="flex items-start gap-2 mb-2">
                                <p-radiobutton inputId="policyFail" name="rollbackPolicy" value="Fail" [ngModel]="policy()" (ngModelChange)="policy.set($event)" />
                                <label for="policyFail" class="cursor-pointer">
                                    <strong>Hiçbir şeyi silme, engel varsa listele</strong> (önerilen)
                                    <span class="block text-sm text-muted-color">Bağlı kaydı olan (geliş, ücret, muayene, randevu vb.) bir şey varsa hiçbir kayıt silinmez; engelleri görürsünüz.</span>
                                </label>
                            </div>
                            <div class="flex items-start gap-2">
                                <p-radiobutton inputId="policyDelete" name="rollbackPolicy" value="DeleteUnblockedOnly" [disabled]="!deleteUnblockedAvailable()" [ngModel]="policy()" (ngModelChange)="policy.set($event)" />
                                <label for="policyDelete" [class.cursor-pointer]="deleteUnblockedAvailable()" [class.opacity-60]="!deleteUnblockedAvailable()">
                                    <strong>Bağı olmayanları sil, olanlar kalsın</strong>
                                    <span class="block text-sm text-muted-color"
                                        >Silinebilen kayıtlar silinir; bağlı kaydı olanlar sistemde kalır ve listelenir.
                                        @if (!deleteUnblockedAvailable()) {
                                            Bu seçenek şu an kullanılamıyor: engelli kayıt yok ya da silinebilir kayıt kalmadı.
                                        }
                                    </span>
                                </label>
                            </div>
                        </fieldset>

                        <p-message severity="warn" class="w-full mb-3">Silinen kayıtlar geri getirilemez. Bu işlem geri alınamaz.</p-message>
                        <div class="flex items-start gap-2 mb-4">
                            <p-checkbox inputId="rollbackAck" [binary]="true" [ngModel]="ack()" (ngModelChange)="ack.set($event)" />
                            <label for="rollbackAck" class="cursor-pointer">Silinen kayıtların geri getirilemeyeceğini anlıyorum.</label>
                        </div>
                        <button pButton type="button" severity="danger" [disabled]="!canSubmit() || busy()" data-testid="import-rollback-submit" (click)="submit()"><i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-undo'"></i>{{ isRetry() ? 'Geri almayı yeniden dene' : 'Kayıtları geri al' }}</button>
                    </section>
                }
            </div>
        }
    `
})
export class ImportRollbackPageComponent implements OnInit {
    private readonly imports = inject(ImportsService);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly listRoute = IMPORTS_ROUTE;
    readonly canCommit = this.auth.hasOperationClaim(IMPORTS_COMMIT_CLAIM);
    readonly reasonMax = ROLLBACK_REASON_MAX_LENGTH;

    readonly batch = signal<ImportBatchDto | null>(null);
    readonly preview = signal<ImportRollbackPreviewDto | null>(null);
    readonly progress = signal<ImportCommitProgressDto | null>(null);
    readonly stalled = signal(false);
    readonly pollError = signal<string | null>(null);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly error = signal<string | null>(null);
    readonly busy = signal(false);
    /** 409 `Imports.RollbackBlocked`: sunucunun döndüğü engelli kayıtlar (en çok 50) ve sayılar. */
    readonly blockedError = signal<{ items: ImportRollbackBlockedItemDto[]; counts: ImportRollbackCountsDto | null } | null>(null);

    readonly reason = signal('');
    readonly policy = signal<ImportBlockedPolicy>('Fail');
    readonly ack = signal(false);

    protected readonly screenAvailable = computed(() => isRollbackScreenAvailable(this.batch()?.status ?? ''));
    protected readonly formVisible = computed(() => isRollbackable(this.batch()?.status ?? '') && !!this.preview());
    protected readonly isRetry = computed(() => ['PartiallyRolledBack', 'RollbackFailed'].includes(this.batch()?.status ?? ''));
    protected readonly deleteUnblockedAvailable = computed(() => !!this.preview()?.canDeleteUnblockedOnly);
    protected readonly canSubmit = computed(() => this.reason().trim().length > 0 && this.reason().trim().length <= ROLLBACK_REASON_MAX_LENGTH && this.ack() && !this.busy());

    protected statusLabel = importStatusLabel;
    protected statusSeverity = importStatusSeverity;
    protected reasonLabel = rollbackReasonLabel;
    protected warningLabel = rollbackWarningLabel;
    protected entityLabel = (it: ImportRollbackBlockedItemDto): string => ROLLBACK_ENTITY_LABELS[it.entity] ?? it.entity;
    protected tableLabel = (it: ImportRollbackBlockedItemDto): string => IMPORT_TABLE_LABELS[it.table] ?? it.table;

    /** İstek anahtarı form açılışında bir kez üretilir; her tamamlanan geri alma döngüsünden sonra yenilenir (yeniden deneme yeni anahtarla gider). */
    private requestId = crypto.randomUUID();
    private pollSub: Subscription | null = null;

    ngOnInit(): void {
        this.destroyRef.onDestroy(() => this.pollSub?.unsubscribe());

        if (this.canCommit) {
            this.load();
        }
    }

    load(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';

        this.loading.set(true);
        this.loadError.set(null);
        this.imports.getBatch(id).subscribe({
            next: (b) => {
                this.batch.set(b);
                this.loading.set(false);

                if (b.status === 'RollingBack') {
                    this.startPolling(b.id);
                } else if (isRollbackScreenAvailable(b.status) || b.status === 'RolledBack') {
                    this.loadPreview();
                }
            },
            error: (e: unknown) => {
                this.loadError.set(importErrorMessage(e, 'İçe aktarma yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    protected hasAny(c: ImportRollbackCountsDto): boolean {
        return c.clients + c.pets + c.vaccinations > 0;
    }

    private loadPreview(): void {
        const b = this.batch();

        if (!b) {
            return;
        }

        this.imports.getRollbackPreview(b.id).subscribe({
            next: (p) => {
                this.preview.set(p);

                if (!p.canDeleteUnblockedOnly && this.policy() === 'DeleteUnblockedOnly') {
                    this.policy.set('Fail');
                }
            },
            error: (e: unknown) => this.error.set(importErrorMessage(e, 'Geri alma önizlemesi yüklenemedi.'))
        });
    }

    submit(): void {
        const b = this.batch();

        if (!b || !this.canSubmit()) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        this.blockedError.set(null);
        this.imports.rollback(b.id, { requestId: this.requestId, reason: this.reason().trim(), blockedPolicy: this.policy() }).subscribe({
            next: (res) => {
                this.busy.set(false);
                this.ack.set(false);
                this.batch.update((cur) => (cur ? { ...res, tables: res.tables ?? cur.tables } : res));

                if (res.status === 'RollingBack') {
                    this.startPolling(res.id);
                } else {
                    this.finishCycle();
                }
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.onSubmitError(e);
            }
        });
    }

    private onSubmitError(e: unknown): void {
        const code = importErrorCode(e);

        if (code === 'Imports.RollbackBlocked') {
            const counts = importErrorExtension(e, 'blocked');

            this.blockedError.set({ items: rollbackBlockedItems(e), counts: isCounts(counts) ? counts : null });
            this.error.set(importErrorMessage(e, 'Geri alma yapılamadı.'));
            this.loadPreview();

            return;
        }

        if (code === 'Imports.RequestIdConflict') {
            // Aynı istek anahtarı farklı politikayla gelmiş; yeni anahtarla yeniden gönderilebilir.
            this.requestId = crypto.randomUUID();
            this.error.set('Bu geri alma isteği farklı bir seçimle daha önce gönderilmiş. Sayfayı yenileyip durumu kontrol edin; gerekirse seçiminizi yeniden onaylayın.');

            return;
        }

        if (code === 'Imports.InvalidState' || code === 'Imports.ConcurrencyConflict') {
            this.error.set(importErrorMessage(e, 'Geri alma başlatılamadı.'));
            this.load();

            return;
        }

        this.error.set(importErrorMessage(e, 'Geri alma başlatılamadı.'));
    }

    /** Geri alma bitti (veya hiç sürmedi): yeni istek anahtarı üretir, önizlemeyi yeniler. */
    private finishCycle(): void {
        this.requestId = crypto.randomUUID();
        this.reason.set('');
        this.loadPreview();
    }

    /** Geri alma sürerken `progress` ucunu ortak yoklayıcıyla izler; sayfa yenilenince `load` buradan sürdürür. */
    protected startPolling(id: string): void {
        this.pollSub?.unsubscribe();
        this.pollError.set(null);
        this.pollSub = pollImportProgress(() => this.imports.getProgress(id), 'RollingBack').subscribe({
            next: ({ progress, running, stalled }) => {
                this.progress.set(running ? progress : null);
                this.stalled.set(running && stalled);

                if (running) {
                    return;
                }

                this.imports.getBatch(id).subscribe({
                    next: (b) => {
                        this.batch.update((cur) => (cur ? { ...b, tables: b.tables ?? cur.tables } : b));
                        this.finishCycle();
                    },
                    error: (e: unknown) => this.error.set(importErrorMessage(e, 'Geri alma sonucu yüklenemedi.'))
                });
            },
            error: () => this.pollError.set(IMPORT_POLL_CONNECTION_MESSAGE)
        });
    }
}

function isCounts(v: unknown): v is ImportRollbackCountsDto {
    if (!v || typeof v !== 'object') {
        return false;
    }

    const c = v as Record<string, unknown>;

    return typeof c['clients'] === 'number' && typeof c['pets'] === 'number' && typeof c['vaccinations'] === 'number';
}
