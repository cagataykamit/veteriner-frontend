import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '@/app/core/auth/auth.service';
import { CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE, MIGRATION_SUPPORT_ROUTE } from '@/app/core/routing/panel-navigation';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { ImportDropZoneComponent } from '@/app/features/imports/components/import-drop-zone.component';
import type { ImportBatchDto, ImportFileFormat, ImportSourceProfileCode, ImportSourceProfileDto, ImportTable } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import { duplicateBatchId, importErrorMessage, importStatusLabel, isDiscardable } from '@/app/features/imports/utils/import-labels.utils';
import { EVET_UPLOAD_FILES, type EVetUploadSlot, IMPORT_CSV_FIELD, IMPORT_CSV_TEMPLATE_FILE, IMPORT_TABLE_LABELS, IMPORT_TABLES, needsClinic } from '@/app/features/imports/utils/import-schema.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppTrialLimitNoticeComponent } from '@/app/shared/ui/trial-limit-notice/app-trial-limit-notice.component';
import { isTrialLimitError } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

type UploadMode = 'xlsx' | 'csv';

/** Parti adı sınırı (sunucu `ImportBatch.MaxNameLength`). */
const MAX_BATCH_NAME_LENGTH = 100;

const NO_CSV_FILES: Readonly<Record<ImportTable, File | null>> = { customers: null, pets: null, vaccinations: null, clinicalRecords: null, accountEntries: null, appointments: null, products: null };
const NO_EVET_FILES: Readonly<Record<EVetUploadSlot, File | null>> = { backup: null, patientReport: null, vaccineReport: null, products: null };

/** Adım 1: şablonu indir, dosyayı yükle. Dosya yalnızca bu istekle sunucuya gider; adreste veya günlükte yer almaz. */
@Component({
    selector: 'app-import-upload-page',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, ProgressBarModule, SelectModule, SelectButtonModule, ImportDropZoneComponent, AppPageHeaderComponent, AppTrialLimitNoticeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Yeni içe aktarma" [description]="isEVet ? evetDescription : genericDescription">
            <div actions>
                <a pButton size="small" severity="secondary" [routerLink]="listRoute"><i class="p-button-icon pi pi-arrow-left"></i>Geçmişe dön</a>
            </div>
        </app-page-header>

        @if (openDrafts().length > 0) {
            <p-message severity="info" class="w-full mb-4" data-testid="import-open-drafts">
                <div class="flex flex-col gap-1">
                    <span>Yarım kalmış içe aktarma var; aynı dosyayı yeniden yüklemek yerine kaldığınız yerden devam edebilirsiniz:</span>
                    <ul class="m-0 pl-5">
                        @for (d of openDrafts(); track d.id) {
                            <li>
                                <a [routerLink]="[listRoute, d.id]" class="text-primary font-medium">{{ d.name || 'Adsız içe aktarma' }}</a>
                                <span class="text-muted-color"> · {{ formatDate(d.createdAtUtc) }} · {{ statusLabel(d.status) }}</span>
                            </li>
                        }
                    </ul>
                </div>
            </p-message>
        }

        <div class="card flex flex-col gap-5">
            <section class="flex flex-col gap-2">
                @if (profiles().length > 0) {
                    <h6 class="m-0">Hangi programdan geliyorsunuz?</h6>
                    <p-select
                        inputId="importSourceProfile"
                        [options]="profileOptions()"
                        [(ngModel)]="sourceProfile"
                        optionLabel="label"
                        optionValue="value"
                        (ngModelChange)="onProfileChange()"
                        class="w-full md:w-96"
                        ariaLabel="Kaynak program"
                        data-testid="import-source-profile"
                    />
                    @if (selectedProfile(); as p) {
                        <small class="text-muted-color" data-testid="import-source-profile-note">{{ p.note }}</small>
                        @if (!p.verified && p.mappings.length > 0) {
                            <small class="text-amber-700 dark:text-amber-300">Bu programın hazır eşlemesi gerçek dosyayla henüz doğrulanmadı; eşleme adımında kontrol edin.</small>
                        }
                    }
                }
                @if (canRequestSupport) {
                    <small class="text-muted-color">Yardım isterseniz <a [routerLink]="migrationSupportRoute" class="text-primary font-medium" data-testid="import-migration-support-link">geçiş desteği isteyin</a>; dosyanızı e-postayla göndermeyin, buradan kendiniz yükleyin.</small>
                }
            </section>

            @if (isEVet) {
                <section class="flex flex-col gap-3" data-testid="import-evet-guide">
                    <h6 class="m-0">E-vet'ten aktarma</h6>
                    <p class="text-muted-color m-0">E-vet'te aşağıdaki dosyaları indirin ve buraya yükleyin.</p>
                    <ol class="m-0 pl-5 flex flex-col gap-2">
                        @for (f of evetFileDefs; track f.slot) {
                            <li>
                                <span class="font-semibold">{{ f.label }}</span> · <span class="font-medium">{{ f.menu }}</span> <span class="text-muted-color">({{ f.requirement }})</span>: {{ f.instruction }}
                                @if (f.caution) {
                                    <strong>{{ f.caution }}</strong>
                                }
                            </li>
                        }
                    </ol>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        @for (f of evetFileDefs; track f.slot) {
                            <app-import-drop-zone [label]="f.label + ' · ' + f.requirement" [description]="f.contents" [extension]="f.extension" [file]="evetFiles()[f.slot]" (fileChange)="setEVet(f.slot, $event)" />
                        }
                    </div>
                    <p class="text-sm text-muted-color m-0">Aktarılacak ve atlanacak kayıtlar nedenleriyle sonraki adımda listelenir; onayınız olmadan hiçbir kayıt oluşmaz.</p>
                </section>
            } @else {
                <section class="flex flex-col gap-2">
                    <h6 class="m-0">1. Şablonu indirin</h6>
                    <p class="text-muted-color m-0">
                        Şablon müşteri, hasta, aşı, klinik geçmiş, hesap hareketi, randevu ve ürün sayfalarını içerir; yalnız elinizde olan sayfaları doldurun. Kendi dosyanızı da yükleyebilirsiniz; sütunları sonraki adımda eşlersiniz.
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <button pButton type="button" size="small" severity="secondary" [disabled]="templateBusy() === 'xlsx'" (click)="template('xlsx')"><i class="p-button-icon" [class]="templateBusy() === 'xlsx' ? 'pi pi-spin pi-spinner' : 'pi pi-file-excel'"></i>Excel şablonu</button>
                        @for (t of tables; track t) {
                            <button pButton type="button" size="small" severity="secondary" [disabled]="templateBusy() === t" (click)="template('csv', t)"><i class="p-button-icon" [class]="templateBusy() === t ? 'pi pi-spin pi-spinner' : 'pi pi-file'"></i>{{ 'CSV: ' + tableLabels[t] }}</button>
                        }
                    </div>
                </section>

                <section class="flex flex-col gap-3">
                    <h6 class="m-0">2. Dosyayı yükleyin</h6>
                    <p-selectbutton [options]="modeOptions" [(ngModel)]="mode" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabel="Dosya türü" (ngModelChange)="onModeChange()" />

                    @if (mode === 'xlsx') {
                        <app-import-drop-zone label="Excel dosyası (.xlsx)" extension=".xlsx" [file]="xlsxFile()" (fileChange)="setXlsx($event)" />
                    } @else {
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            @for (t of tables; track t) {
                                <app-import-drop-zone [label]="tableLabels[t] + ' (.csv)'" extension=".csv" [file]="csvFiles()[t]" (fileChange)="setCsv(t, $event)" />
                            }
                        </div>
                        <p class="text-sm text-muted-color m-0">
                            En az bir dosya seçin. Hastalar ve hesap hareketleri müşterilere; aşılar, klinik geçmiş ve randevular hastalara dosyalar arasında bağlanır. Ürünler bağımsızdır.
                        </p>
                    }
                </section>
            }

            <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                    <label for="importClinic" class="text-sm font-medium">Klinik {{ clinicRequired ? '(zorunlu)' : '' }}</label>
                    <p-select
                        inputId="importClinic"
                        [options]="clinicOptions()"
                        [(ngModel)]="clinicId"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Klinik seçin"
                        [showClear]="!clinicRequired && mode === 'xlsx'"
                        [loading]="clinicsLoading()"
                        class="w-full"
                    />
                    @if (isEVet) {
                        <small class="text-muted-color">Yedekteki aşı, muayene, randevu ve açık bakiye bu kliniğe yazılır.</small>
                    } @else {
                        <small class="text-muted-color">Aşı, klinik geçmiş, hesap hareketi, randevu ve açık bakiye bu kliniğe yazılır. Bu sayfalardan biri varsa klinik gereklidir.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="importName" class="text-sm font-medium">Ad (isteğe bağlı)</label>
                    <input pInputText id="importName" maxlength="100" [(ngModel)]="name" placeholder="Örn. Eski sistem 1. parti" />
                    <small class="text-muted-color">Listede görünür; boş bırakırsanız dosyanın adı kullanılır. Kişisel veri yazmayın.</small>
                </div>
                @if (!isEVet && mode === 'csv') {
                    <div class="flex flex-col gap-1">
                        <label for="importEncoding" class="text-sm font-medium">Karakter kodlaması</label>
                        <p-select inputId="importEncoding" [options]="encodingOptions" [(ngModel)]="encoding" optionLabel="label" optionValue="value" class="w-full" />
                        <small class="text-muted-color">Türkçe harfler bozuk görünürse Windows-1254 deneyin.</small>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="importDelimiter" class="text-sm font-medium">Ayırıcı</label>
                        <p-select inputId="importDelimiter" [options]="delimiterOptions" [(ngModel)]="delimiter" optionLabel="label" optionValue="value" class="w-full" />
                    </div>
                }
            </section>

            @if (error(); as error) {
                @if (trialLimited()) {
                    <app-trial-limit-notice [message]="error" />
                } @else {
                    <p-message severity="error" class="w-full" role="alert">{{ error }}</p-message>
                }
            }
            @if (duplicateId()) {
                <p-message severity="info" class="w-full" data-testid="import-duplicate">
                    Bu dosya zaten yüklendi; yeniden yüklemenize gerek yok. <a [routerLink]="[listRoute, duplicateId()]" class="text-primary font-medium">Yüklenen içe aktarmaya git</a>
                </p-message>
            }

            @if (submitting()) {
                <section class="flex flex-col gap-2" role="status" aria-live="polite" data-testid="import-upload-progress">
                    @if (uploadPercent() < 100) {
                        <span class="font-medium">Dosyalar gönderiliyor… %{{ uploadPercent() }}</span>
                        <p-progressbar [value]="uploadPercent()" [showValue]="false" styleClass="h-2" />
                        <small class="text-muted-color">Gönderim bitene kadar bu sayfada kalın.</small>
                    } @else {
                        <span class="font-medium"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i>Dosyalar sunucuda okunuyor ve dönüştürülüyor…</span>
                        <p-progressbar mode="indeterminate" styleClass="h-2" />
                        <small class="text-muted-color">
                            Büyük bir E-vet yedeğinde bu adım bir dakikaya kadar sürebilir. Sayfayı kapatsanız da işlem sürer; içe aktarma <a [routerLink]="listRoute" class="text-primary">Veri içe aktarma</a> listesinde görünür, oradan kaldığınız yerden devam edebilirsiniz.
                        </small>
                    }
                </section>
            }

            <div class="flex flex-wrap gap-2">
                <button pButton type="button" [disabled]="!canSubmit || submitting()" (click)="submit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-upload'"></i>Yükle ve eşlemeye geç</button>
            </div>
        </div>
    `
})
export class ImportUploadPageComponent implements OnInit {
    private readonly imports = inject(ImportsService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly listRoute = IMPORTS_ROUTE;
    readonly tables = IMPORT_TABLES;
    readonly tableLabels = IMPORT_TABLE_LABELS;
    readonly evetFileDefs = EVET_UPLOAD_FILES;
    readonly genericDescription = 'Adım 1 / 4 · Şablonu indirin, kayıtlarınızı doldurun ve dosyayı yükleyin. Bu adımda hiçbir kayıt oluşmaz.';
    readonly evetDescription = "Adım 1 / 4 · E-vet'ten indirdiğiniz dosyaları yükleyin. Bu adımda hiçbir kayıt oluşmaz.";
    readonly modeOptions = [
        { label: 'Excel (.xlsx)', value: 'xlsx' },
        { label: 'CSV (.csv)', value: 'csv' }
    ];
    readonly encodingOptions = [
        { label: 'Otomatik', value: '' },
        { label: 'UTF-8', value: 'utf-8' },
        { label: 'Windows-1254 (Türkçe)', value: 'windows-1254' }
    ];
    readonly delimiterOptions = [
        { label: 'Otomatik', value: '' },
        { label: 'Noktalı virgül (;)', value: ';' },
        { label: 'Virgül (,)', value: ',' },
        { label: 'Sekme', value: '\t' }
    ];

    /** TIER-021: sütun önerisini seçer; profiller sunucudan gelir, varsayılan genel liste. */
    sourceProfile: ImportSourceProfileCode = 'Generic';
    mode: UploadMode = 'xlsx';
    clinicId: string | null = null;
    name = '';
    encoding = '';
    delimiter = '';

    readonly xlsxFile = signal<File | null>(null);
    readonly csvFiles = signal<Record<ImportTable, File | null>>(NO_CSV_FILES);
    /** E-vet yolu: yedek zorunlu, raporlar isteğe bağlı (`EVET_UPLOAD_FILES`). */
    readonly evetFiles = signal<Record<EVetUploadSlot, File | null>>(NO_EVET_FILES);
    readonly clinicOptions = signal<{ label: string; value: string }[]>([]);
    readonly clinicsLoading = signal(false);
    readonly templateBusy = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);
    /** Hata deneme kısıtı (`Trial.ImportLimitExceeded`, sözleşme §3.2): mesajın yanında "Aboneliğe geç" eylemi gösterilir. */
    readonly trialLimited = signal(false);
    readonly duplicateId = signal<string | null>(null);
    /** Gönderim yüzdesi; 100 olunca sunucu dosyayı okuyup dönüştürüyordur. */
    readonly uploadPercent = signal(0);
    /** Yarım kalmış (taslak ya da doğrulanan) içe aktarmalar: sayfa yenilenince ya da tekrar gelince kaldığı yerden devam için. */
    readonly openDrafts = signal<ImportBatchDto[]>([]);
    readonly profiles = signal<ImportSourceProfileDto[]>([]);
    readonly profileOptions = computed(() => this.profiles().map((p) => ({ label: p.displayName, value: p.code })));
    readonly canRequestSupport = this.auth.hasOperationClaim(CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM);
    readonly migrationSupportRoute = MIGRATION_SUPPORT_ROUTE;

    /** Aynı yükleme tekrarında aynı parti dönsün diye dosya değişene kadar sabit. */
    private requestId = crypto.randomUUID();

    protected selectedProfile(): ImportSourceProfileDto | undefined {
        return this.profiles().find((p) => p.code === this.sourceProfile);
    }

    /** E-vet yedeği aşı, muayene, randevu ve bakiye içerir; ayrı yükleme alanları ve zorunlu klinikle gider. */
    protected get isEVet(): boolean {
        return this.sourceProfile === 'EVet';
    }

    private get hasFile(): boolean {
        if (this.isEVet) {
            return !!this.evetFiles().backup;
        }

        return this.mode === 'xlsx' ? !!this.xlsxFile() : Object.values(this.csvFiles()).some(Boolean);
    }

    protected get clinicRequired(): boolean {
        const files = this.csvFiles();

        return this.isEVet || (this.mode === 'csv' && needsClinic(IMPORT_TABLES.filter((t) => !!files[t])));
    }

    protected get canSubmit(): boolean {
        return this.hasFile && (!this.clinicRequired || !!this.clinicId) && !this.submitting();
    }

    ngOnInit(): void {
        // Liste gelmezse seçim gizli kalır; yükleme genel eş anlamlılarla sürer (içe aktarma kilitlenmez).
        this.imports.getSourceProfiles().subscribe({ next: (list) => this.profiles.set(list), error: () => this.profiles.set([]) });
        // Liste okunamazsa ipucu gösterilmez; yükleme etkilenmez.
        this.imports.listBatches(1, 20).subscribe({
            next: (page) => this.openDrafts.set((page.items ?? []).filter((b) => isDiscardable(b.status) || b.status === 'Validating')),
            error: () => this.openDrafts.set([])
        });
        this.clinicId = this.auth.getClinicId();
        this.clinicsLoading.set(true);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                this.clinicOptions.set(list.filter((c) => c.isActive !== false).map((c) => ({ label: c.name, value: c.id })));
                this.clinicsLoading.set(false);
            },
            error: () => this.clinicsLoading.set(false)
        });
    }

    onModeChange(): void {
        this.resetAttempt();
    }

    /** Önceki profilin dosyaları yeni profille gönderilmesin diye tüm seçimler temizlenir. */
    onProfileChange(): void {
        this.xlsxFile.set(null);
        this.csvFiles.set(NO_CSV_FILES);
        this.evetFiles.set(NO_EVET_FILES);
        this.resetAttempt();
    }

    setEVet(slot: EVetUploadSlot, file: File | null): void {
        this.evetFiles.update((cur) => ({ ...cur, [slot]: file }));
        this.resetAttempt();
    }

    setXlsx(file: File | null): void {
        this.xlsxFile.set(file);
        this.resetAttempt();
    }

    setCsv(table: ImportTable, file: File | null): void {
        this.csvFiles.update((cur) => ({ ...cur, [table]: file }));
        this.resetAttempt();
    }

    template(format: ImportFileFormat, table?: ImportTable): void {
        this.templateBusy.set(table ?? format);
        this.imports.downloadTemplate(format, table).subscribe({
            next: (res) => {
                this.templateBusy.set(null);
                saveDownload(res, format === 'xlsx' || !table ? 'vetinity-iceaktar-sablon.xlsx' : IMPORT_CSV_TEMPLATE_FILE[table]);
            },
            error: (e: unknown) => {
                this.templateBusy.set(null);
                this.error.set(importErrorMessage(e, 'Şablon indirilemedi.'));
            }
        });
    }

    submit(): void {
        if (!this.canSubmit) {
            return;
        }

        const form = new FormData();

        form.append('requestId', this.requestId);

        if (this.isEVet) {
            const files = this.evetFiles();

            for (const f of EVET_UPLOAD_FILES) {
                const file = files[f.slot];

                if (file) form.append(f.field, file);
            }
        } else if (this.mode === 'xlsx') {
            form.append('file', this.xlsxFile()!);
        } else {
            const files = this.csvFiles();

            for (const t of IMPORT_TABLES) {
                const file = files[t];

                if (file) form.append(IMPORT_CSV_FIELD[t], file);
            }

            if (this.encoding) form.append('encoding', this.encoding);
            if (this.delimiter) form.append('delimiter', this.delimiter);
        }

        if (this.clinicId) form.append('clinicId', this.clinicId);
        // Ad verilmezse listede hangi dosyayla oluştuğu anlaşılsın diye ana dosyanın adı kullanılır.
        const name = (this.name.trim() || this.primaryFileName()).slice(0, MAX_BATCH_NAME_LENGTH);

        if (name) form.append('name', name);
        if (this.sourceProfile !== 'Generic') form.append('sourceProfile', this.sourceProfile);

        this.error.set(null);
        this.trialLimited.set(false);
        this.duplicateId.set(null);
        this.uploadPercent.set(0);
        this.submitting.set(true);
        this.imports.createBatch(form).subscribe({
            next: (event) => {
                if (event.type === 'progress') {
                    this.uploadPercent.set(event.percent);

                    return;
                }

                this.submitting.set(false);
                void this.router.navigate([IMPORTS_ROUTE, event.batch.id], { state: { warnings: event.batch.warnings ?? [] } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.duplicateId.set(duplicateBatchId(e));
                this.trialLimited.set(isTrialLimitError(e));
                this.error.set(importErrorMessage(e, 'Dosya yüklenemedi. Tekrar deneyin.'));
            }
        });
    }

    protected statusLabel = importStatusLabel;

    protected formatDate(utc: string): string {
        return formatUtcIsoAsLocalDateTimeDisplay(utc);
    }

    /** Ana dosyanın adı: E-vet yedeği, Excel dosyası ya da ilk CSV. */
    private primaryFileName(): string {
        if (this.isEVet) {
            return this.evetFiles().backup?.name ?? '';
        }

        return this.mode === 'xlsx' ? (this.xlsxFile()?.name ?? '') : (Object.values(this.csvFiles()).find(Boolean)?.name ?? '');
    }

    resetAttempt(): void {
        this.requestId = crypto.randomUUID();
        this.error.set(null);
        this.trialLimited.set(false);
        this.duplicateId.set(null);
    }
}
