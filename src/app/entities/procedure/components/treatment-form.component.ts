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
import { followUpBeforeTreatmentMessage, mapTreatmentUpsertFormToCreateRequest } from '@/app/entities/treatment/data/treatment.mapper';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { type TreatmentUpsertFieldErrors, parseTreatmentUpsertHttpError } from '@/app/entities/treatment/utils/treatment-upsert-validation-parse.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { parseExaminationCreateRouteContext } from '@/app/shared/panel/examination-create-route-context.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { dateOnlyInputToIstanbulStartUtcIso, fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';
import { DATE_INPUT_MIN, dateTimeYearRangeValidator, dateYearRangeValidator, effectiveDateTimeLocalInputMin } from '@/app/shared/utils/date-input-validation.utils';
import { TREATMENT_DATE_TOO_FAR_PAST_MESSAGE, treatmentDateNotTooFarPastValidator, treatmentDateTimeLocalMinAllowed } from '@/app/entities/treatment/utils/treatment-date-validation.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-treatment-form',
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
                        <label for="treatmentDateLocal" class="block text-sm font-medium text-muted-color mb-2">Tedavi tarihi / saati *</label>
                        <app-date-input inputId="treatmentDateLocal" type="datetime-local" formControlName="treatmentDateLocal" [min]="treatmentDateMinAllowed()" limit="past" />
                        @if (form.controls.treatmentDateLocal.hasError('dateYearInvalid') && form.controls.treatmentDateLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (form.controls.treatmentDateLocal.hasError('treatmentDateTooFarPast') && form.controls.treatmentDateLocal.touched) {
                            <small class="text-red-500 block">{{ treatmentDateTooFarPastMessage }}</small>
                        } @else if (apiFieldErrors().treatmentDateLocal) {
                            <small class="text-red-500 block">{{ apiFieldErrors().treatmentDateLocal }}</small>
                        } @else if (form.controls.treatmentDateLocal.invalid && form.controls.treatmentDateLocal.touched) {
                            <small class="text-red-500 block">Zorunlu alan.</small>
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
                        <label for="title" class="block text-sm font-medium text-muted-color mb-2">Başlık *</label>
                        <input id="title" type="text" class="w-full p-inputtext p-component" formControlName="title" />
                        @if (form.controls.title.invalid && form.controls.title.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().title) {
                            <small class="text-red-500">{{ apiFieldErrors().title }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="description" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                        <textarea id="description" rows="4" class="w-full p-inputtext p-component" formControlName="description"></textarea>
                        @if (form.controls.description.invalid && form.controls.description.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().description) {
                            <small class="text-red-500">{{ apiFieldErrors().description }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (apiFieldErrors().notes) {
                            <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="followUpDate" class="block text-sm font-medium text-muted-color mb-2">Takip tarihi</label>
                        <app-date-input inputId="followUpDate" type="date" formControlName="followUpDate" [min]="dateInputMin" limit="planned" />
                        @if (form.controls.followUpDate.hasError('dateYearInvalid') && form.controls.followUpDate.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (apiFieldErrors().followUpDate) {
                            <small class="text-red-500">{{ apiFieldErrors().followUpDate }}</small>
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
export class TreatmentFormComponent implements OnInit {
    /** Bağlam (müşteri, hayvan, muayene...) query biçiminde; sayfada adres çubuğundan, yan panelde muayeneden gelir. */
    readonly contextParams = input<ParamMap>(convertToParamMap({}));
    /** Yan panelde kart çerçevesi çizilmez. */
    readonly embedded = input(false);
    readonly saved = output<string>();
    readonly cancelled = output<void>();

    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;
    protected readonly treatmentDateTooFarPastMessage = TREATMENT_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly treatmentsService = inject(TreatmentsService);
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
    readonly apiFieldErrors = signal<TreatmentUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        treatmentDateLocal: ['', [Validators.required, dateTimeYearRangeValidator(), treatmentDateNotTooFarPastValidator()]],
        examinationId: [''],
        followUpDate: ['', dateYearRangeValidator()],
        title: ['', Validators.required],
        description: ['', Validators.required],
        notes: ['']
    });

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

    cancel(): void {
        this.cancelled.emit();
    }

    treatmentDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(treatmentDateTimeLocalMinAllowed());
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const treatmentDateUtc = fromIstanbulDateTimeLocalInputToUtcIso(v.treatmentDateLocal);

        if (!treatmentDateUtc) {
            this.apiFieldErrors.set({ treatmentDateLocal: 'Geçerli bir tedavi tarihi ve saati seçin.' });
            this.form.controls.treatmentDateLocal.markAsTouched();

            return;
        }

        const followUpDateUtc = v.followUpDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(v.followUpDate.trim()) : null;

        if (v.followUpDate?.trim() && !followUpDateUtc) {
            this.submitError.set('Takip tarihi geçersiz.');

            return;
        }

        const orderMsg = followUpBeforeTreatmentMessage(treatmentDateUtc, followUpDateUtc);

        if (orderMsg) {
            this.submitError.set(orderMsg);

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const payload = mapTreatmentUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            treatmentDateUtc,
            title: v.title,
            description: v.description,
            notes: v.notes,
            followUpDateUtc,
            examinationId: v.examinationId
        });

        this.submitting.set(true);
        this.treatmentsService.createTreatment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.saved.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseTreatmentUpsertHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
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

                if (ex.status === 'Finalized') {
                    this.selectionError.set('Bu muayene kesinleştirilmiş; tedavi eklenemez. Gerekirse muayeneye ek not ekleyin.');
                }

                this.loadingExaminations.set(false);
                this.applyingRouteContext.set(false);
            },
            error: () => {
                this.selectionError.set('Muayene bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingRouteContext.set(false);
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

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            const parsed = parseTreatmentUpsertHttpError(e);

            return parsed.summaryMessage ?? fallback;
        }

        return e instanceof Error ? e.message : fallback;
    }
}
