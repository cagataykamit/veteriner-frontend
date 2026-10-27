import { Component, computed, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ImportJobProgressComponent } from '@/app/features/imports/components/import-job-progress.component';
import type { ImportBatchDto, ImportCommitProgressDto, ImportFileFormat, ImportOnErrors, ImportPreviewDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import { importCommitBlockers, importErrorCode, importErrorMessage, importIssueLabel, importStatusLabel, isEndpointUnavailable, reminderImpactCurrentCount } from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_TABLE_LABELS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Adım 4: onay, ilerleme ve sonuç (B4 uçları). "Henüz etkin değil" yedeği yalnız uç gerçekten dağıtılmamışsa
 * (gövdesiz 404 / 405 / 501) gösterilir; başarı hiçbir koşulda varsayılmaz, durum yalnız sunucu yanıtından gelir.
 */
@Component({
    selector: 'app-import-commit-step',
    standalone: true,
    imports: [NgTemplateOutlet, FormsModule, ButtonModule, CheckboxModule, MessageModule, SelectModule, ImportJobProgressComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @switch (batch().status) {
            @case ('Validated') {
                <p class="mt-0">Onayladığınızda yukarıdaki doğrulama sonucuna göre kayıtlar oluşturulur. İşlem arka planda sürer; sekmeyi kapatsanız da devam eder.</p>

                <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 m-0 mb-4 text-sm">
                    <div>
                        <dt class="text-muted-color">Oluşturulacak</dt>
                        <dd class="m-0 text-xl font-medium">{{ totals().willCreate }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color">Mevcutla eşleşecek</dt>
                        <dd class="m-0 text-xl font-medium">{{ totals().willMatch }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color">Atlanacak</dt>
                        <dd class="m-0 text-xl font-medium">{{ totals().willSkip }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color">Hatalı satır</dt>
                        <dd class="m-0 text-xl font-medium" [class.text-red-500]="totals().error > 0">{{ totals().error }}</dd>
                    </div>
                </dl>

                @if (totals().error > 0) {
                    <div class="flex flex-col gap-1 mb-4">
                        <label for="importOnErrors" class="text-sm font-medium">Hatalı satırlar</label>
                        <p-select inputId="importOnErrors" [options]="onErrorsOptions" optionLabel="label" optionValue="value" [(ngModel)]="onErrors" class="w-full md:w-[28rem]" />
                        <small class="text-muted-color">Hatalı satırlar hata raporunda kalır; düzeltilmiş dosyayı sonradan yeni içe aktarma olarak yükleyebilirsiniz.</small>
                    </div>
                }

                <p-message severity="info" class="w-full mb-4"> İçe aktarılan aşılar için hatırlatma e-postası gönderilmez. Hatırlatmaları aktarım bittikten sonra, sayıyı görerek siz açarsınız. </p-message>

                @if (unavailable()) {
                    <p-message severity="warn" class="w-full mb-4" role="status"> Uygulama henüz etkin değil. Doğrulama sonucunuz korunuyor ve hiçbir kayıt oluşturulmadı. Özellik açıldığında bu sayfadan devam edebilirsiniz. </p-message>
                }
                @if (error()) {
                    <p-message severity="error" class="w-full mb-4" role="alert">
                        {{ error() }}
                        @if (blockers().length) {
                            <ul class="mt-2 mb-0 pl-4">
                                @for (b of blockers(); track b) {
                                    <li>{{ issueLabel(b) }}</li>
                                }
                            </ul>
                        }
                    </p-message>
                }

                @if (!canCommitClaim()) {
                    <p-message severity="info" class="w-full">Aktarmayı başlatmak için aktarma yetkisi gerekir.</p-message>
                } @else {
                    <div class="flex items-start gap-2 mb-4">
                        <p-checkbox inputId="importConfirm" [binary]="true" [(ngModel)]="confirmed" />
                        <label for="importConfirm" class="cursor-pointer">Özeti inceledim; kayıtların yukarıdaki gibi oluşturulmasını onaylıyorum.</label>
                    </div>
                    <button pButton type="button" [disabled]="!confirmed || !preview()?.canCommit || busy()" (click)="commit()"><i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-play'"></i>Aktarmayı başlat</button>
                }
            }
            @case ('Committing') {
                <p class="mt-0">Kayıtlar oluşturuluyor. Bu sayfayı kapatabilirsiniz; işlem arka planda sürer.</p>
                <app-import-job-progress [progress]="progress() ?? batch().progress ?? null" [stalled]="stalled()" />
            }
            @case ('CommitFailed') {
                <p-message severity="error" class="w-full mb-4" role="alert"
                    >Aktarma sırasında beklenmeyen bir sorun oluştu ve işlem durdu. Şimdiye dek oluşan kayıtlar korunur; aşağıdaki sayılar nelerin aktarıldığını gösterir. Lütfen destek ekibiyle iletişime geçin.</p-message
                >
                <ng-container *ngTemplateOutlet="result" />
            }
            @case ('Committed') {
                <p-message severity="success" class="w-full mb-4">Aktarma tamamlandı{{ batch().committedAtUtc ? ' · ' + date(batch().committedAtUtc!) : '' }}.</p-message>
                <ng-container *ngTemplateOutlet="result" />

                @if (preview(); as p) {
                    @if (p.summary.vaccinations.total > 0) {
                        <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mt-4">
                            <h6 class="mt-0 mb-2"><i class="pi pi-bell mr-2"></i>Aşı hatırlatmaları</h6>
                            @if (batch().remindersReleasedAtUtc) {
                                <p class="m-0">Hatırlatmalar {{ date(batch().remindersReleasedAtUtc!) }} tarihinde açıldı. Bu işlem geri alınamaz.</p>
                                @if (releaseNote()) {
                                    <p-message severity="info" class="w-full mt-2" role="status">{{ releaseNote() }}</p-message>
                                }
                            } @else {
                                <p class="mt-0">
                                    Şu an hatırlatmalar <strong>kapalıdır</strong>; hiçbir e-posta gitmedi. Açarsanız, {{ p.reminderImpact.reminderWindowDays }} gün içinde vadesi gelen <strong>{{ releaseCount(p) }}</strong> aşı için müşterilere
                                    e-posta gidebilir; sonraki aşı tarihi yaklaştıkça yenileri de oluşur. Gönderilen e-postalar geri alınamaz; hatırlatmaları açmak da geri alınamaz.
                                </p>
                                @if (!p.reminderImpact.tenantRemindersEnabled) {
                                    <p-message severity="info" class="w-full mb-2" role="status">Kliniğinizin aşı hatırlatma ayarı kapalı; açsanız da ayar açılana kadar e-posta gitmez.</p-message>
                                }
                                @if (releaseUnavailable()) {
                                    <p-message severity="warn" class="w-full" role="status">Hatırlatmaları açma özelliği henüz etkin değil.</p-message>
                                } @else if (!canCommitClaim()) {
                                    <small class="text-muted-color">Hatırlatmaları açmak için aktarma yetkisi gerekir.</small>
                                } @else if (!confirmingRelease()) {
                                    <button pButton type="button" size="small" severity="secondary" (click)="confirmingRelease.set(true)"><i class="p-button-icon pi pi-bell"></i>Hatırlatmaları aç…</button>
                                } @else {
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-sm">{{ releaseCount(p) }} aşı için hatırlatma açılsın mı? Bu işlem geri alınamaz.</span>
                                        <button pButton type="button" size="small" [disabled]="releaseBusy()" (click)="release(p)">@if (releaseBusy()) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Evet, aç</button>
                                        <button pButton type="button" size="small" severity="secondary" (click)="confirmingRelease.set(false)">Vazgeç</button>
                                    </div>
                                }
                                @if (releaseError()) {
                                    <p-message severity="error" class="w-full mt-2" role="alert">{{ releaseError() }}</p-message>
                                }
                            }
                        </section>
                    }
                }
            }
            @default {
                <p-message severity="info" class="w-full mb-4">Bu içe aktarmanın durumu: {{ statusLabel(batch().status) }}.</p-message>
                <ng-container *ngTemplateOutlet="result" />
            }
        }

        <ng-template #result>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                @for (t of resultTables(); track t.key) {
                    <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4">
                        <div class="font-medium mb-2">{{ t.label }}</div>
                        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 m-0 text-sm">
                            <dt class="text-muted-color">Oluşturuldu</dt>
                            <dd class="m-0 text-right">{{ t.s.created }}</dd>
                            <dt class="text-muted-color">Mevcutla eşleşti</dt>
                            <dd class="m-0 text-right">{{ t.s.matched }}</dd>
                            <dt class="text-muted-color">Atlandı</dt>
                            <dd class="m-0 text-right">{{ t.s.skipped }}</dd>
                            <dt class="text-muted-color">Başarısız</dt>
                            <dd class="m-0 text-right" [class.text-red-500]="t.s.failed > 0">{{ t.s.failed }}</dd>
                        </dl>
                    </div>
                }
            </div>

            @if (applyIssues().length) {
                <ul class="mt-3 mb-0 pl-4 text-sm">
                    @for (i of applyIssues(); track i.code) {
                        <li>{{ issueLabel(i.code) }} · {{ i.rowCount }} satır</li>
                    }
                </ul>
            }

            @if (hasProblemRows()) {
                <div class="flex flex-wrap items-center gap-2 mt-3">
                    <span class="text-sm text-muted-color">Aktarılamayan satırların nedenleri hata raporunda:</span>
                    <button pButton type="button" size="small" severity="secondary" [disabled]="reportBusy() === 'xlsx'" (click)="downloadReport('xlsx')"><i class="p-button-icon" [class]="reportBusy() === 'xlsx' ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>Hata raporu (Excel)</button>
                    <button pButton type="button" size="small" severity="secondary" [disabled]="reportBusy() === 'csv'" (click)="downloadReport('csv')"><i class="p-button-icon" [class]="reportBusy() === 'csv' ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>CSV</button>
                </div>
                @if (reportError()) {
                    <p-message severity="error" class="w-full mt-2" role="alert">{{ reportError() }}</p-message>
                }
            }
        </ng-template>
    `
})
export class ImportCommitStepComponent {
    private readonly imports = inject(ImportsService);

    readonly batch = input.required<ImportBatchDto>();
    readonly preview = input<ImportPreviewDto | null>(null);
    readonly canCommitClaim = input(false);
    /** Sayfanın yoklama yanıtı (`Committing` iken); yoksa partinin kendi `progress` alanı kullanılır. */
    readonly progress = input<ImportCommitProgressDto | null>(null);
    /** Yoklama: iş uzun süredir işçi bekliyor. */
    readonly stalled = input(false);
    readonly batchChange = output<ImportBatchDto>();
    /** Onaylanan e-posta sayısı eskidiyse önizlemenin yeniden okunması istenir. */
    readonly previewStale = output<void>();

    protected readonly onErrorsOptions: { label: string; value: ImportOnErrors }[] = [
        { label: 'Hatalı satırları atla, kalanını aktar (önerilen)', value: 'SkipErrorRows' },
        { label: 'Hatalı satır varsa hiçbir şey aktarma', value: 'FailIfAny' }
    ];
    protected onErrors: ImportOnErrors = 'SkipErrorRows';
    protected confirmed = false;

    protected readonly busy = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly unavailable = signal(false);
    protected readonly confirmingRelease = signal(false);
    protected readonly releaseBusy = signal(false);
    protected readonly releaseError = signal<string | null>(null);
    protected readonly releaseUnavailable = signal(false);
    protected readonly releaseNote = signal<string | null>(null);
    /** 409 sonrası sunucunun verdiği güncel sayı; kullanıcı bunu görüp yeniden onaylar. */
    private readonly releaseCountOverride = signal<number | null>(null);
    protected readonly blockers = signal<string[]>([]);
    protected readonly reportBusy = signal<ImportFileFormat | null>(null);
    protected readonly reportError = signal<string | null>(null);

    protected readonly totals = computed(() => {
        const s = this.batch().summary;

        return IMPORT_TABLES.reduce(
            (acc, t) => ({
                willCreate: acc.willCreate + s[t].willCreate,
                willMatch: acc.willMatch + s[t].willMatch,
                willSkip: acc.willSkip + s[t].willSkip,
                error: acc.error + s[t].error
            }),
            { willCreate: 0, willMatch: 0, willSkip: 0, error: 0 }
        );
    });

    protected readonly resultTables = computed(() => IMPORT_TABLES.filter((t) => this.batch().summary[t].total > 0).map((t) => ({ key: t, label: IMPORT_TABLE_LABELS[t], s: this.batch().summary[t] })));

    /** Uygulama anında doğan satır sorunları (önizleme sayımlarından). */
    protected readonly applyIssues = computed(() => (this.preview()?.issueCounts ?? []).filter((i) => ['Imports.OwnerUnitFailed', 'Imports.MatchedAtCommit', 'Imports.ApplyFailed'].includes(i.code)));

    /** Hata raporu: doğrulamada hatalı veya uygulamada başarısız satır varsa anlamlıdır. */
    protected readonly hasProblemRows = computed(() => IMPORT_TABLES.some((t) => this.batch().summary[t].failed > 0 || this.batch().summary[t].error > 0));

    protected statusLabel = importStatusLabel;
    protected issueLabel = importIssueLabel;
    protected date = formatUtcIsoAsLocalDateTimeDisplay;

    protected commit(): void {
        const validationId = this.batch().validationId ?? this.preview()?.validationId;

        if (!validationId || !this.confirmed) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        this.blockers.set([]);
        this.unavailable.set(false);
        this.imports.commit(this.batch().id, { validationId, onErrors: this.onErrors }).subscribe({
            next: (batch) => {
                this.busy.set(false);
                this.batchChange.emit(batch);
            },
            error: (e: unknown) => {
                this.busy.set(false);

                if (isEndpointUnavailable(e)) {
                    this.unavailable.set(true);
                } else {
                    this.error.set(importErrorMessage(e, 'Aktarma başlatılamadı.'));
                    const code = importErrorCode(e);

                    if (code === 'Imports.CommitBlocked') {
                        this.blockers.set(importCommitBlockers(e));
                        this.previewStale.emit();
                    } else if (code === 'Imports.ValidationStale') {
                        this.previewStale.emit();
                    }
                }
            }
        });
    }

    protected releaseCount(p: ImportPreviewDto): number {
        return this.releaseCountOverride() ?? p.reminderImpact.emailsWithinReminderWindow;
    }

    protected release(p: ImportPreviewDto): void {
        this.releaseBusy.set(true);
        this.releaseError.set(null);
        this.imports.releaseReminders(this.batch().id, this.releaseCount(p)).subscribe({
            next: (res) => {
                this.releaseBusy.set(false);
                this.confirmingRelease.set(false);
                this.releaseCountOverride.set(null);
                this.releaseNote.set(res.note);
                this.batchChange.emit(res.batch);
            },
            error: (e: unknown) => {
                this.releaseBusy.set(false);

                if (isEndpointUnavailable(e)) {
                    this.releaseUnavailable.set(true);

                    return;
                }

                this.releaseError.set(importErrorMessage(e, 'Hatırlatmalar açılamadı.'));

                if (importErrorCode(e) === 'Imports.ReminderImpactChanged') {
                    // Onay açık kalır; güncel sayı görünür ve kullanıcı yeniden onaylar.
                    const current = reminderImpactCurrentCount(e);

                    if (current !== null) {
                        this.releaseCountOverride.set(current);
                    } else {
                        this.confirmingRelease.set(false);
                    }

                    this.previewStale.emit();
                }
            }
        });
    }

    protected downloadReport(format: ImportFileFormat): void {
        this.reportBusy.set(format);
        this.reportError.set(null);
        this.imports.downloadErrorReport(this.batch().id, format).subscribe({
            next: (res) => {
                this.reportBusy.set(null);
                saveDownload(res, `vetinity-iceaktar-hatalar.${format}`);
            },
            error: (e: unknown) => {
                this.reportBusy.set(null);
                this.reportError.set(importErrorMessage(e, 'Hata raporu indirilemedi.'));
            }
        });
    }
}
