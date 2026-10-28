import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { convertToParamMap, type ParamMap } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { examinationListItemFromDetail, prescriptionExaminationSelectOption } from '@/app/entities/prescription/utils/prescription-relation-select.utils';
import { mapLabResultUpsertFormToCreateRequest } from '@/app/entities/lab-result/data/lab-result.mapper';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { type LabResultUpsertFieldErrors, parseLabResultUpsertHttpError } from '@/app/entities/lab-result/utils/lab-result-upsert-validation-parse.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { parseExaminationCreateRouteContext, prefillPetFromRoute } from '@/app/shared/panel/examination-create-route-context.utils';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';
import { dateTimeYearRangeValidator, effectiveDateTimeLocalInputMin } from '@/app/shared/utils/date-input-validation.utils';
import { LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE, labResultDateNotTooFarPastValidator, labResultDateTimeLocalMinAllowed } from '@/app/entities/lab-result/utils/lab-result-date-validation.utils';
import { LAB_RESULT_INCOMPLETE_MESSAGE, LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE, labResultResultFieldsValidator } from '@/app/entities/lab-result/utils/lab-result-form.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-lab-result-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, PetAlertBannerComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent],
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
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
            @if (contextFromExamination()) {
                <p class="text-sm text-muted-color mt-0 mb-4">Bu muayene kaydından bağlam taşındı; müşteri, hasta ve bağlı muayene alanları kilitlidir.</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                        <app-client-search inputId="clientId" formControlName="clientId" />
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().clientId) {
                            <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hasta *</label>
                        <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                        @if (form.controls.petId.invalid && form.controls.petId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().petId) {
                            <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="resultDateLocal" class="block text-sm font-medium text-muted-color mb-2">Sonuç tarihi / saati</label>
                        <app-date-input inputId="resultDateLocal" type="datetime-local" formControlName="resultDateLocal" [min]="labResultDateMinAllowed()" limit="past" />
                        @if (form.controls.resultDateLocal.hasError('dateYearInvalid') && form.controls.resultDateLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (form.controls.resultDateLocal.hasError('labResultDateTooFarPast') && form.controls.resultDateLocal.touched) {
                            <small class="text-red-500 block">{{ labResultDateTooFarPastMessage }}</small>
                        } @else if (apiFieldErrors().resultDateLocal) {
                            <small class="text-red-500 block">{{ apiFieldErrors().resultDateLocal }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="examinationId" class="block text-sm font-medium text-muted-color mb-2">Bağlı muayene</label>
                        <p-select
                            inputId="examinationId"
                            formControlName="examinationId"
                            [options]="examinationOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Muayene seçin"
                            [filter]="true"
                            filterPlaceholder="Ara…"
                            filterBy="label"
                            [showClear]="true"
                            class="w-full"
                            [loading]="loadingExaminations()"
                        />
                        @if (apiFieldErrors().examinationId) {
                            <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="testName" class="block text-sm font-medium text-muted-color mb-2">Test adı *</label>
                        <input id="testName" type="text" class="w-full p-inputtext p-component" formControlName="testName" />
                        @if (form.controls.testName.invalid && form.controls.testName.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().testName) {
                            <small class="text-red-500">{{ apiFieldErrors().testName }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="resultText" class="block text-sm font-medium text-muted-color mb-2">Sonuç metni</label>
                        <textarea id="resultText" rows="4" class="w-full p-inputtext p-component" formControlName="resultText"></textarea>
                        @if (form.hasError('labResultResultIncomplete') && (form.controls.resultText.touched || form.controls.resultDateLocal.touched)) {
                            <small class="text-red-500">{{ resultIncompleteMessage }}</small>
                        } @else if (apiFieldErrors().resultText) {
                            <small class="text-red-500">{{ apiFieldErrors().resultText }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="interpretation" class="block text-sm font-medium text-muted-color mb-2">Yorum</label>
                        <textarea id="interpretation" rows="3" class="w-full p-inputtext p-component" formControlName="interpretation"></textarea>
                        @if (form.hasError('labResultInterpretationWithoutResult') && form.controls.interpretation.touched) {
                            <small class="text-red-500">{{ interpretationWithoutResultMessage }}</small>
                        } @else if (apiFieldErrors().interpretation) {
                            <small class="text-red-500">{{ apiFieldErrors().interpretation }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (apiFieldErrors().notes) {
                            <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                        }
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <button pButton type="submit" [disabled]="form.invalid || submitting() || applyingRouteContext() || ro.mutationBlocked()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                    <button pButton type="button" severity="secondary" (click)="cancel()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                </div>
            </form>
        </div>
    `
})
export class LabResultFormComponent implements OnInit {
    /** Bağlam (müşteri, hayvan, muayene...) query biçiminde; sayfada adres çubuğundan, yan panelde muayeneden gelir. */
    readonly contextParams = input<ParamMap>(convertToParamMap({}));
    /** Yan panelde kart çerçevesi çizilmez. */
    readonly embedded = input(false);
    readonly saved = output<string>();
    readonly cancelled = output<void>();

    readonly copy = PANEL_COPY;
    protected readonly labResultDateTooFarPastMessage = LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE;
    protected readonly resultIncompleteMessage = LAB_RESULT_INCOMPLETE_MESSAGE;
    protected readonly interpretationWithoutResultMessage = LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly labResultsService = inject(LabResultsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly contextFromExamination = signal(false);
    readonly applyingRouteContext = signal(false);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);

    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private relationLoadSeq = 0;
    readonly apiFieldErrors = signal<LabResultUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group(
        {
            clientId: ['', Validators.required],
            petId: [{ value: '', disabled: true }, Validators.required],
            resultDateLocal: ['', [dateTimeYearRangeValidator(), labResultDateNotTooFarPastValidator()]],
            examinationId: [''],
            testName: ['', Validators.required],
            resultText: [''],
            interpretation: [''],
            notes: ['']
        },
        { validators: labResultResultFieldsValidator() }
    );

    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.form.controls.examinationId.disable({ emitEvent: false });
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            if (this.contextFromExamination()) {
                return;
            }

            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);

            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }

            const id = trimClientIdControlValue(this.form.controls.clientId.value);

            if (!id) {
                this.form.controls.petId.disable({ emitEvent: false });
                this.syncExaminationSelectState();

                return;
            }

            this.form.controls.petId.enable({ emitEvent: false });
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.contextFromExamination()) {
                return;
            }

            const pid = trimClientIdControlValue(this.form.controls.petId.value);

            this.form.patchValue({ examinationId: '' }, { emitEvent: false });

            if (!pid) {
                this.relationLoadSeq += 1;
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();

                return;
            }

            this.loadExaminationsForPet(pid);
        });
        this.tryApplyExaminationRouteContext();
        prefillPetFromRoute(this.contextParams(), this.form.controls.clientId, this.form.controls.petId);
    }

    private syncExaminationSelectState(): void {
        if (this.contextFromExamination()) {
            return;
        }

        const hasPet = !this.form.controls.petId.disabled && !!trimClientIdControlValue(this.form.controls.petId.value);

        if (!hasPet) {
            this.form.controls.examinationId.disable({ emitEvent: false });
        } else {
            this.form.controls.examinationId.enable({ emitEvent: false });
        }
    }

    labResultDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(labResultDateTimeLocalMinAllowed());
    }

    cancel(): void {
        this.cancelled.emit();
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const resultDateUtc = v.resultDateLocal.trim() ? fromIstanbulDateTimeLocalInputToUtcIso(v.resultDateLocal) : null;

        if (v.resultDateLocal.trim() && !resultDateUtc) {
            this.submitError.set('Geçerli bir sonuç tarihi ve saati seçin.');

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const payload = mapLabResultUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            resultDateUtc,
            testName: v.testName,
            resultText: v.resultText,
            interpretation: v.interpretation,
            notes: v.notes,
            examinationId: v.examinationId
        });

        this.submitting.set(true);
        this.labResultsService.createLabResult(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.saved.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseLabResultUpsertHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
            }
        });
    }

    private loadExaminationsForPet(petId: string): void {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();

        this.loadingExaminations.set(true);
        this.selectionError.set(null);
        this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }).subscribe({
            next: (ex) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }

                if (trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                    return;
                }

                this.examinationOptions.set(ex.items.map(prescriptionExaminationSelectOption));
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();
            },
            error: (e: unknown) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }

                this.selectionError.set(this.mapLoadError(e, 'Muayene listesi yüklenemedi.'));
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();
            }
        });
    }

    private tryApplyExaminationRouteContext(): void {
        const ctx = parseExaminationCreateRouteContext(this.contextParams());

        if (!ctx) {
            return;
        }

        this.applyingRouteContext.set(true);
        this.selectionError.set(null);
        this.examinationsService.getExaminationById(ctx.examinationId).subscribe({
            next: (ex) => {
                const cId = ex.clientId?.trim() ?? '';
                const pId = ex.petId?.trim() ?? '';

                if (cId !== ctx.clientId || pId !== ctx.petId) {
                    this.selectionError.set('Muayene bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');
                    this.applyingRouteContext.set(false);

                    return;
                }

                const listItem = examinationListItemFromDetail(ex);

                this.examinationOptions.set([prescriptionExaminationSelectOption(listItem)]);
                this.relationLoadSeq += 1;
                this.form.patchValue(
                    {
                        clientId: cId,
                        petId: pId,
                        examinationId: ex.id
                    },
                    { emitEvent: false }
                );
                this.form.controls.clientId.disable({ emitEvent: false });
                this.form.controls.petId.disable({ emitEvent: false });
                this.form.controls.examinationId.disable({ emitEvent: false });
                this.contextFromExamination.set(true);
                this.loadingExaminations.set(false);
                this.applyingRouteContext.set(false);
            },
            error: () => {
                this.selectionError.set('Muayene bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingRouteContext.set(false);
            }
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}
