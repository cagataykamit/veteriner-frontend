import { Component, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import type { ImportBatchDto, ImportOnErrors, ImportPreviewDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { importErrorCode, importErrorMessage, importStatusLabel, isEndpointUnavailable } from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_TABLE_LABELS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Adım 4: onay ve uygulama (B4 uçları). Uç henüz yayında değilse (404 yönlendirme yok / 405 / 501) nazik bir
 * "henüz etkin değil" durumu gösterilir; başarı hiçbir koşulda varsayılmaz, durum yalnız sunucu yanıtından gelir.
 */
@Component({
    selector: 'app-import-commit-step',
    standalone: true,
    imports: [NgTemplateOutlet, FormsModule, ButtonModule, CheckboxModule, MessageModule, ProgressBarModule, SelectModule],
    template: `
        @switch (batch().status) {
            @case ('Validated') {
                <p class="mt-0">
                    Onayladığınızda yukarıdaki doğrulama sonucuna göre kayıtlar oluşturulur. İşlem arka planda sürer; sekmeyi kapatsanız da devam eder.
                   
                </p>

                <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 m-0 mb-4 text-sm">
                    <div><dt class="text-muted-color">Oluşturulacak</dt><dd class="m-0 text-xl font-medium">{{ totals().willCreate }}</dd></div>
                    <div><dt class="text-muted-color">Mevcutla eşleşecek</dt><dd class="m-0 text-xl font-medium">{{ totals().willMatch }}</dd></div>
                    <div><dt class="text-muted-color">Atlanacak</dt><dd class="m-0 text-xl font-medium">{{ totals().willSkip }}</dd></div>
                    <div><dt class="text-muted-color">Hatalı satır</dt><dd class="m-0 text-xl font-medium" [class.text-red-500]="totals().error > 0">{{ totals().error }}</dd></div>
                </dl>

                @if (totals().error > 0) {
                    <div class="flex flex-col gap-1 mb-4">
                        <label for="importOnErrors" class="text-sm font-medium">Hatalı satırlar</label>
                        <p-select inputId="importOnErrors" [options]="onErrorsOptions" optionLabel="label" optionValue="value" [(ngModel)]="onErrors" styleClass="w-full md:w-[28rem]" />
                        <small class="text-muted-color">Hatalı satırlar hata raporunda kalır; düzeltilmiş dosyayı sonradan yeni içe aktarma olarak yükleyebilirsiniz.</small>
                    </div>
                }

                <p-message severity="info" styleClass="w-full mb-4">
                    İçe aktarılan aşılar için hatırlatma e-postası gönderilmez. Hatırlatmaları aktarım bittikten sonra, sayıyı görerek siz açarsınız.
                </p-message>

                @if (unavailable()) {
                    <p-message severity="warn" styleClass="w-full mb-4" role="status">
                        Uygulama henüz etkin değil. Doğrulama sonucunuz korunuyor ve hiçbir kayıt oluşturulmadı. Özellik açıldığında bu sayfadan devam edebilirsiniz.
                    </p-message>
                }
                @if (error()) {
                    <p-message severity="error" styleClass="w-full mb-4" role="alert">{{ error() }}</p-message>
                }

                @if (!canCommitClaim()) {
                    <p-message severity="info" styleClass="w-full">Aktarmayı başlatmak için aktarma yetkisi gerekir.</p-message>
                } @else {
                    <div class="flex items-start gap-2 mb-4">
                        <p-checkbox inputId="importConfirm" [binary]="true" [(ngModel)]="confirmed" />
                        <label for="importConfirm" class="cursor-pointer">Özeti inceledim; kayıtların yukarıdaki gibi oluşturulmasını onaylıyorum.</label>
                    </div>
                    <p-button icon="pi pi-play" label="Aktarmayı başlat" [disabled]="!confirmed || !preview()?.canCommit" [loading]="busy()" (onClick)="commit()" />
                }
            }
            @case ('Committing') {
                <p class="mt-0">Kayıtlar oluşturuluyor. Bu sayfayı kapatabilirsiniz; işlem arka planda sürer.</p>
                <p-progressbar [mode]="progressPercent() === null ? 'indeterminate' : 'determinate'" [value]="progressPercent() ?? 0" />
                @if (batch().progress; as pr) {
                    <small class="text-muted-color">{{ pr.processed }} / {{ pr.total }} işlendi</small>
                }
            }
            @case ('CommitFailed') {
                <p-message severity="error" styleClass="w-full mb-4" role="alert">Aktarma tamamlanamadı. Oluşan kayıtlar korunur; ayrıntı için aşağıdaki sayılara bakın.</p-message>
                <ng-container *ngTemplateOutlet="result" />
            }
            @case ('Committed') {
                <p-message severity="success" styleClass="w-full mb-4">Aktarma tamamlandı{{ batch().committedAtUtc ? ' · ' + date(batch().committedAtUtc!) : '' }}.</p-message>
                <ng-container *ngTemplateOutlet="result" />

                @if (preview(); as p) {
                    @if (p.summary.vaccinations.total > 0) {
                        <section class="rounded-border border border-surface-200 dark:border-surface-700 p-4 mt-4">
                            <h6 class="mt-0 mb-2"><i class="pi pi-bell mr-2"></i>Aşı hatırlatmaları</h6>
                            @if (batch().remindersReleasedAtUtc) {
                                <p class="m-0">Hatırlatmalar {{ date(batch().remindersReleasedAtUtc!) }} tarihinde açıldı. Bu işlem geri alınamaz.</p>
                            } @else {
                                <p class="mt-0">
                                    Şu an hatırlatmalar <strong>kapalıdır</strong>; hiçbir e-posta gitmedi. Açarsanız, {{ p.reminderImpact.reminderWindowDays }} gün içinde vadesi gelen
                                    <strong>{{ p.reminderImpact.emailsWithinReminderWindow }}</strong> aşı için müşterilere e-posta gidebilir; sonraki aşı tarihi yaklaştıkça yenileri de oluşur.
                                    Gönderilen e-postalar geri alınamaz.
                                </p>
                                @if (releaseUnavailable()) {
                                    <p-message severity="warn" styleClass="w-full" role="status">Hatırlatmaları açma özelliği henüz etkin değil.</p-message>
                                } @else if (!canCommitClaim()) {
                                    <small class="text-muted-color">Hatırlatmaları açmak için aktarma yetkisi gerekir.</small>
                                } @else if (!confirmingRelease()) {
                                    <p-button size="small" severity="secondary" icon="pi pi-bell" label="Hatırlatmaları aç…" (onClick)="confirmingRelease.set(true)" />
                                } @else {
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="text-sm">{{ p.reminderImpact.emailsWithinReminderWindow }} aşı için hatırlatma açılsın mı?</span>
                                        <p-button size="small" label="Evet, aç" [loading]="releaseBusy()" (onClick)="release(p)" />
                                        <p-button size="small" severity="secondary" label="Vazgeç" (onClick)="confirmingRelease.set(false)" />
                                    </div>
                                }
                                @if (releaseError()) {
                                    <p-message severity="error" styleClass="w-full mt-2" role="alert">{{ releaseError() }}</p-message>
                                }
                            }
                        </section>
                    }
                }
            }
            @default {
                <p-message severity="info" styleClass="w-full mb-4">Bu içe aktarmanın durumu: {{ statusLabel(batch().status) }}.</p-message>
                <ng-container *ngTemplateOutlet="result" />
            }
        }

        <ng-template #result>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                @for (t of resultTables(); track t.key) {
                    <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4">
                        <div class="font-medium mb-2">{{ t.label }}</div>
                        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 m-0 text-sm">
                            <dt class="text-muted-color">Oluşturuldu</dt><dd class="m-0 text-right">{{ t.s.created }}</dd>
                            <dt class="text-muted-color">Mevcutla eşleşti</dt><dd class="m-0 text-right">{{ t.s.matched }}</dd>
                            <dt class="text-muted-color">Atlandı</dt><dd class="m-0 text-right">{{ t.s.skipped }}</dd>
                            <dt class="text-muted-color">Başarısız</dt><dd class="m-0 text-right" [class.text-red-500]="t.s.failed > 0">{{ t.s.failed }}</dd>
                        </dl>
                    </div>
                }
            </div>
        </ng-template>
    `
})
export class ImportCommitStepComponent {
    private readonly imports = inject(ImportsService);

    readonly batch = input.required<ImportBatchDto>();
    readonly preview = input<ImportPreviewDto | null>(null);
    readonly canCommitClaim = input(false);
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

    protected readonly resultTables = computed(() =>
        IMPORT_TABLES.filter((t) => this.batch().summary[t].total > 0).map((t) => ({ key: t, label: IMPORT_TABLE_LABELS[t], s: this.batch().summary[t] }))
    );

    protected readonly progressPercent = computed(() => {
        const pr = this.batch().progress;
        return pr && pr.total > 0 ? Math.min(100, Math.round((pr.processed / pr.total) * 100)) : null;
    });

    protected statusLabel = importStatusLabel;
    protected date = formatUtcIsoAsLocalDateTimeDisplay;

    protected commit(): void {
        const validationId = this.batch().validationId ?? this.preview()?.validationId;
        if (!validationId || !this.confirmed) {
            return;
        }
        this.busy.set(true);
        this.error.set(null);
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
                }
            }
        });
    }

    protected release(p: ImportPreviewDto): void {
        this.releaseBusy.set(true);
        this.releaseError.set(null);
        this.imports.releaseReminders(this.batch().id, p.reminderImpact.emailsWithinReminderWindow).subscribe({
            next: (batch) => {
                this.releaseBusy.set(false);
                this.confirmingRelease.set(false);
                this.batchChange.emit(batch);
            },
            error: (e: unknown) => {
                this.releaseBusy.set(false);
                if (isEndpointUnavailable(e)) {
                    this.releaseUnavailable.set(true);
                } else {
                    this.releaseError.set(importErrorMessage(e, 'Hatırlatmalar açılamadı.'));
                    if (importErrorCode(e) === 'Imports.ReminderImpactChanged') {
                        this.confirmingRelease.set(false);
                        this.previewStale.emit();
                    }
                }
            }
        });
    }
}
