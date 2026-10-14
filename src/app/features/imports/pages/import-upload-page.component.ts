import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { ImportDropZoneComponent } from '@/app/features/imports/components/import-drop-zone.component';
import type { ImportFileFormat, ImportTable } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { saveDownload } from '@/app/features/imports/utils/import-download.utils';
import { duplicateBatchId, importErrorMessage } from '@/app/features/imports/utils/import-labels.utils';
import { IMPORT_TABLE_LABELS, IMPORT_TABLES } from '@/app/features/imports/utils/import-schema.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

type UploadMode = 'xlsx' | 'csv';

/** Adım 1: şablonu indir, dosyayı yükle. Dosya yalnızca bu istekle sunucuya gider; adreste veya günlükte yer almaz. */
@Component({
    selector: 'app-import-upload-page',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        SelectButtonModule,
        ImportDropZoneComponent,
        AppPageHeaderComponent
    ],
    template: `
        <app-page-header title="Yeni içe aktarma" description="Adım 1 / 4 · Şablonu indirin, kayıtlarınızı doldurun ve dosyayı yükleyin. Bu adımda hiçbir kayıt oluşmaz.">
            <div actions>
                <p-button size="small" severity="secondary" icon="pi pi-arrow-left" label="Geçmişe dön" [routerLink]="listRoute" />
            </div>
        </app-page-header>

        <div class="card flex flex-col gap-5">
            <section class="flex flex-col gap-2">
                <h6 class="m-0">1. Şablonu indirin</h6>
                <p class="text-muted-color m-0">
                    Şablon müşteri, hasta ve aşı sayfalarını içerir. Kendi dosyanızı da yükleyebilirsiniz; sütunları sonraki adımda eşlersiniz.
                </p>
                <div class="flex flex-wrap gap-2">
                    <p-button size="small" severity="secondary" icon="pi pi-file-excel" label="Excel şablonu" [loading]="templateBusy() === 'xlsx'" (onClick)="template('xlsx')" />
                    @for (t of tables; track t) {
                        <p-button size="small" severity="secondary" icon="pi pi-file" [label]="'CSV: ' + tableLabels[t]" [loading]="templateBusy() === t" (onClick)="template('csv', t)" />
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
                        <app-import-drop-zone label="Müşteriler (.csv)" extension=".csv" [file]="csvFiles().customers" (fileChange)="setCsv('customers', $event)" />
                        <app-import-drop-zone label="Hastalar (.csv)" extension=".csv" [file]="csvFiles().pets" (fileChange)="setCsv('pets', $event)" />
                        <app-import-drop-zone label="Aşılar (.csv)" extension=".csv" [file]="csvFiles().vaccinations" (fileChange)="setCsv('vaccinations', $event)" />
                    </div>
                    <p class="text-sm text-muted-color m-0">En az bir dosya seçin. Hastalar müşterilere, aşılar hastalara dosyalar arasında bağlanır.</p>
                }
            </section>

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
                        [showClear]="mode === 'xlsx'"
                        [loading]="clinicsLoading()"
                        styleClass="w-full"
                    />
                    <small class="text-muted-color">Aşı kayıtları bu kliniğe yazılır. Aşı sayfası/dosyası varsa klinik gereklidir.</small>
                </div>
                <div class="flex flex-col gap-1">
                    <label for="importName" class="text-sm font-medium">Ad (isteğe bağlı)</label>
                    <input pInputText id="importName" maxlength="100" [(ngModel)]="name" placeholder="Örn. Eski sistem 1. parti" />
                    <small class="text-muted-color">Listede görünür; kişisel veri yazmayın.</small>
                </div>
                @if (mode === 'csv') {
                    <div class="flex flex-col gap-1">
                        <label for="importEncoding" class="text-sm font-medium">Karakter kodlaması</label>
                        <p-select inputId="importEncoding" [options]="encodingOptions" [(ngModel)]="encoding" optionLabel="label" optionValue="value" styleClass="w-full" />
                        <small class="text-muted-color">Türkçe harfler bozuk görünürse Windows-1254 deneyin.</small>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="importDelimiter" class="text-sm font-medium">Ayırıcı</label>
                        <p-select inputId="importDelimiter" [options]="delimiterOptions" [(ngModel)]="delimiter" optionLabel="label" optionValue="value" styleClass="w-full" />
                    </div>
                }
            </section>

            @if (error()) {
                <p-message severity="error" styleClass="w-full" role="alert">{{ error() }}</p-message>
            }
            @if (duplicateId()) {
                <p-message severity="info" styleClass="w-full">
                    Bu dosya zaten yüklenmiş. <a [routerLink]="[listRoute, duplicateId()]" class="text-primary font-medium">Mevcut içe aktarmaya git</a>
                </p-message>
            }

            <div class="flex flex-wrap gap-2">
                <p-button icon="pi pi-upload" label="Yükle ve eşlemeye geç" [disabled]="!canSubmit" [loading]="submitting()" (onClick)="submit()" />
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

    mode: UploadMode = 'xlsx';
    clinicId: string | null = null;
    name = '';
    encoding = '';
    delimiter = '';

    readonly xlsxFile = signal<File | null>(null);
    readonly csvFiles = signal<Record<ImportTable, File | null>>({ customers: null, pets: null, vaccinations: null });
    readonly clinicOptions = signal<{ label: string; value: string }[]>([]);
    readonly clinicsLoading = signal(false);
    readonly templateBusy = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);
    readonly duplicateId = signal<string | null>(null);

    /** Aynı yükleme tekrarında aynı parti dönsün diye dosya değişene kadar sabit. */
    private requestId = crypto.randomUUID();

    private get hasFile(): boolean {
        return this.mode === 'xlsx' ? !!this.xlsxFile() : Object.values(this.csvFiles()).some(Boolean);
    }

    protected get clinicRequired(): boolean {
        return this.mode === 'csv' && !!this.csvFiles().vaccinations;
    }

    protected get canSubmit(): boolean {
        return this.hasFile && (!this.clinicRequired || !!this.clinicId) && !this.submitting();
    }

    ngOnInit(): void {
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
                saveDownload(res, format === 'xlsx' ? 'vetinity-iceaktar-sablon.xlsx' : `vetinity-iceaktar-${table}.csv`);
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
        if (this.mode === 'xlsx') {
            form.append('file', this.xlsxFile()!);
        } else {
            const files = this.csvFiles();
            if (files.customers) form.append('customersFile', files.customers);
            if (files.pets) form.append('petsFile', files.pets);
            if (files.vaccinations) form.append('vaccinationsFile', files.vaccinations);
            if (this.encoding) form.append('encoding', this.encoding);
            if (this.delimiter) form.append('delimiter', this.delimiter);
        }
        if (this.clinicId) form.append('clinicId', this.clinicId);
        if (this.name.trim()) form.append('name', this.name.trim());

        this.error.set(null);
        this.duplicateId.set(null);
        this.submitting.set(true);
        this.imports.createBatch(form).subscribe({
            next: (batch) => {
                this.submitting.set(false);
                void this.router.navigate([IMPORTS_ROUTE, batch.id], { state: { warnings: batch.warnings ?? [] } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.duplicateId.set(duplicateBatchId(e));
                this.error.set(importErrorMessage(e, 'Dosya yüklenemedi. Tekrar deneyin.'));
            }
        });
    }

    private resetAttempt(): void {
        this.requestId = crypto.randomUUID();
        this.error.set(null);
        this.duplicateId.set(null);
    }
}
