import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, output, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { convertToParamMap, type ParamMap, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import type { ImagingModality } from '@/app/entities/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/entities/imaging/services/imaging-records.service';
import { IMAGING_MODALITY_OPTIONS } from '@/app/entities/imaging/utils/imaging.utils';
import { examinationListItemFromDetail, prescriptionExaminationSelectOption } from '@/app/entities/prescription/utils/prescription-relation-select.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { type SelectOption, trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { StoredFileUploadComponent } from '@/app/shared/files/stored-file-upload.component';
import { parseExaminationCreateRouteContext, prefillPetFromRoute } from '@/app/shared/panel/examination-create-route-context.utils';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { dateTimeYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';

/**
 * Yeni görüntüleme kaydı (ADR-007; IMAGING_API_CONTRACT.md §4/§5). Sıra (L6): önce kayıt (JSON), sonra dosyalar tek tek yüklenir.
 * Bir dosya yüklenemezse kayıt ve girilen metin korunur, yalnız o dosya "Yeniden dene" ile gönderilir; tekrar "Kaydet" yeni kayıt
 * açmaz. Muayeneden açılınca müşteri, hasta ve muayene kilitlidir; kesinleşmiş muayeneye bağlamak yeni (ek) kayıt sayılır.
 */
@Component({
    selector: 'app-imaging-record-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, SelectModule, PetAlertBannerComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent, StoredFileUploadComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-pet-alert-banner [petId]="form.controls.petId.value" />

        <div [class.card]="!embedded()">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; kayıt oluşturulamaz.</p>
            }
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            @if (contextFromExamination()) {
                <p class="text-sm text-muted-color mt-0 mb-4">Bu muayene kaydından bağlam taşındı; müşteri, hasta ve bağlı muayene alanları kilitlidir.</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="imgClientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                        <app-client-search inputId="imgClientId" formControlName="clientId" />
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="imgPetId" class="block text-sm font-medium text-muted-color mb-2">Hasta *</label>
                        <app-pet-search inputId="imgPetId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                        @if (form.controls.petId.invalid && form.controls.petId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="imgModality" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                        <p-select inputId="imgModality" formControlName="modality" [options]="modalityOptions" optionLabel="label" optionValue="value" placeholder="Görüntüleme türü" class="w-full" />
                        @if (form.controls.modality.invalid && form.controls.modality.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="imgPerformedAt" class="block text-sm font-medium text-muted-color mb-2">Tarih / saat *</label>
                        <app-date-input inputId="imgPerformedAt" type="datetime-local" formControlName="performedAtLocal" min="1900-01-01T00:00" limit="past" />
                        @if ((form.controls.performedAtLocal.hasError('required') || form.controls.performedAtLocal.hasError('dateYearInvalid')) && form.controls.performedAtLocal.touched) {
                            <small class="text-red-500">Geçerli bir tarih ve saat girin.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="imgExamination" class="block text-sm font-medium text-muted-color mb-2">Bağlı muayene</label>
                        <p-select
                            inputId="imgExamination"
                            formControlName="examinationId"
                            [options]="examinationOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Muayene seçin (isteğe bağlı)"
                            [showClear]="true"
                            [filter]="true"
                            filterBy="label"
                            class="w-full"
                            [loading]="loadingExaminations()"
                        />
                    </div>
                    <div class="col-span-12">
                        <label for="imgDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                        <input id="imgDescription" type="text" class="w-full p-inputtext p-component" formControlName="description" maxlength="1000" placeholder="Ör. Toraks latero-lateral" />
                    </div>
                    <div class="col-span-12">
                        <label for="imgNote" class="block text-sm font-medium text-muted-color mb-2">Klinik not</label>
                        <textarea id="imgNote" rows="3" class="w-full p-inputtext p-component" formControlName="clinicalNote" maxlength="4000"></textarea>
                    </div>
                    <div class="col-span-12">
                        <span class="block text-sm font-medium text-muted-color mb-2">Dosyalar *</span>
                        <app-stored-file-upload [ownerPath]="ownerPath()" [disabled]="submitting() || ro.mutationBlocked()" (uploaded)="onFileUploaded()" />
                        @if (filesMissing()) {
                            <small class="text-red-500 block mt-1" role="alert">En az bir dosya ekleyin.</small>
                        }
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert" data-testid="imaging-submit-error">{{ submitError() }}</p>
                }
                @if (recordId(); as id) {
                    <p class="text-sm mt-2 mb-0" role="status">
                        Kayıt oluşturuldu; başarısız dosyaları yeniden deneyin veya
                        <a [routerLink]="['/panel/imaging', id]" class="text-primary font-medium no-underline">kaydı açın</a>.
                    </p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <button pButton type="submit" [disabled]="submitting() || applyingContext() || ro.mutationBlocked()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ recordId() ? 'Dosyaları yükle' : copy.buttonSave }}</button>
                    <button pButton type="button" severity="secondary" (click)="cancelled.emit()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                </div>
            </form>
        </div>
    `
})
export class ImagingRecordFormComponent implements OnInit {
    /** Bağlam (müşteri, hasta, muayene) query biçiminde; sayfada adres çubuğundan, yan panelde muayeneden gelir. */
    readonly contextParams = input<ParamMap>(convertToParamMap({}));
    /** Yan panelde kart çerçevesi çizilmez. */
    readonly embedded = input(false);
    /** Kayıt ve bütün dosyalar tamam. */
    readonly saved = output<string>();
    readonly cancelled = output<void>();

    readonly copy = PANEL_COPY;
    readonly modalityOptions = IMAGING_MODALITY_OPTIONS;
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly imagingService = inject(ImagingRecordsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly uploader = viewChild.required(StoredFileUploadComponent);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly filesMissing = signal(false);
    readonly contextFromExamination = signal(false);
    readonly applyingContext = signal(false);
    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    /** Oluşturulan kayıt; dosya hatasında yeniden gönderim aynı kayda gider. */
    readonly recordId = signal<string | null>(null);
    readonly ownerPath = computed(() => {
        const id = this.recordId();

        return id ? this.imagingService.filesOwner(id) : null;
    });

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        modality: ['' as ImagingModality | '', Validators.required],
        performedAtLocal: [toIstanbulDateTimeLocalInputValue(new Date().toISOString()), [Validators.required, dateTimeYearRangeValidator()]],
        examinationId: [{ value: '', disabled: true }],
        description: [''],
        clinicalNote: ['']
    });

    private examLoadSeq = 0;

    ngOnInit(): void {
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.contextFromExamination()) {
                return;
            }

            this.form.controls.petId.setValue('');
            const hasClient = !!trimClientIdControlValue(this.form.controls.clientId.value);

            if (hasClient) {
                this.form.controls.petId.enable({ emitEvent: false });
            } else {
                this.form.controls.petId.disable({ emitEvent: false });
            }
        });
        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((petId) => {
            if (!this.contextFromExamination()) {
                this.loadExaminations(trimClientIdControlValue(petId));
            }
        });

        const ctx = parseExaminationCreateRouteContext(this.contextParams());

        if (ctx) {
            this.applyExaminationContext(ctx.clientId, ctx.petId, ctx.examinationId);
        } else {
            prefillPetFromRoute(this.contextParams(), this.form.controls.clientId, this.form.controls.petId);
        }
    }

    async onSubmit(): Promise<void> {
        this.submitError.set(null);
        const uploader = this.uploader();
        const hasFiles = uploader.pendingCount() > 0 || uploader.items().some((i) => i.status === 'done');

        this.filesMissing.set(!hasFiles);

        if (this.form.invalid || !hasFiles) {
            this.form.markAllAsTouched();

            return;
        }

        this.submitting.set(true);

        try {
            const id = this.recordId() ?? (await this.createRecord());

            if (!id) {
                return;
            }

            const failed = await uploader.uploadPending(this.imagingService.filesOwner(id));

            if (failed > 0) {
                this.submitError.set(`${failed} dosya yüklenemedi. Girdiğiniz bilgiler korundu; dosyayı yeniden deneyin.`);

                return;
            }

            this.saved.emit(id);
        } finally {
            this.submitting.set(false);
        }
    }

    /** Kuyruktaki "Yeniden dene" ile gönderim formdan geçmez; son dosya da tamamlanınca hata kalkar ve kayıt tamamlanır. */
    onFileUploaded(): void {
        const id = this.recordId();
        const uploader = this.uploader();

        if (!id || this.submitting() || uploader.pendingCount() > 0) {
            return;
        }

        this.submitError.set(null);
        this.saved.emit(id);
    }

    /** Kaydı oluşturur, alanları kilitler (yeniden gönderim yalnız dosyalar içindir). Hata metni formda kalır. */
    private createRecord(): Promise<string | null> {
        const v = this.form.getRawValue();
        const performedAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(v.performedAtLocal);
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!performedAtUtc) {
            this.submitError.set('Geçerli bir tarih ve saat seçin.');

            return Promise.resolve(null);
        }

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            this.imagingService
                .create({
                    clinicId,
                    petId: v.petId,
                    examinationId: v.examinationId || null,
                    performedAtUtc,
                    modality: v.modality as ImagingModality,
                    description: v.description.trim() || null,
                    clinicalNote: v.clinicalNote.trim() || null
                })
                .subscribe({
                    next: (id) => {
                        this.recordId.set(id);
                        this.form.disable({ emitEvent: false });
                        resolve(id);
                    },
                    error: (e: unknown) => {
                        this.submitError.set(e instanceof HttpErrorResponse ? messageFromHttpError(e, 'Kayıt oluşturulamadı.') : 'Kayıt oluşturulamadı.');
                        resolve(null);
                    }
                });
        });
    }

    private loadExaminations(petId: string): void {
        const seq = ++this.examLoadSeq;

        this.form.controls.examinationId.setValue('', { emitEvent: false });
        this.examinationOptions.set([]);

        if (!petId) {
            this.form.controls.examinationId.disable({ emitEvent: false });

            return;
        }

        this.loadingExaminations.set(true);
        this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId }).subscribe({
            next: (r) => {
                if (seq === this.examLoadSeq) {
                    this.examinationOptions.set(r.items.map(prescriptionExaminationSelectOption));
                    this.form.controls.examinationId.enable({ emitEvent: false });
                    this.loadingExaminations.set(false);
                }
            },
            error: () => {
                if (seq === this.examLoadSeq) {
                    this.selectionError.set('Muayene listesi yüklenemedi; muayene bağı olmadan devam edebilirsiniz.');
                    this.loadingExaminations.set(false);
                }
            }
        });
    }

    private applyExaminationContext(clientId: string, petId: string, examinationId: string): void {
        this.applyingContext.set(true);
        this.examinationsService.getExaminationById(examinationId).subscribe({
            next: (ex) => {
                if ((ex.clientId?.trim() ?? '') !== clientId || (ex.petId?.trim() ?? '') !== petId) {
                    this.selectionError.set('Muayene bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');
                    this.applyingContext.set(false);

                    return;
                }

                this.contextFromExamination.set(true);
                this.examinationOptions.set([prescriptionExaminationSelectOption(examinationListItemFromDetail(ex))]);
                this.form.patchValue({ clientId, petId, examinationId: ex.id }, { emitEvent: false });
                this.form.controls.clientId.disable({ emitEvent: false });
                this.form.controls.petId.disable({ emitEvent: false });
                this.form.controls.examinationId.disable({ emitEvent: false });
                this.applyingContext.set(false);
            },
            error: () => {
                this.selectionError.set('Muayene bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingContext.set(false);
            }
        });
    }
}
