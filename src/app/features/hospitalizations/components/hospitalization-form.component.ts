import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { convertToParamMap, type ParamMap } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    mapHospitalizationUpsertFormToCreateRequest
} from '@/app/features/hospitalizations/data/hospitalization.mapper';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import {
    type HospitalizationUpsertFieldErrors,
    parseHospitalizationUpsertHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';
import {
    FINALIZED_EXAMINATION_OPTION_HINT,
    hospitalizationExaminationOption,
    hospitalizationVisitOptions,
    type HospitalizationRelationOption
} from '@/app/features/hospitalizations/utils/hospitalization-relation-select.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { examinationListItemFromDetail } from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { PetAlertBannerComponent } from '@/app/shared/pet-alerts/pet-alert-banner.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';
import {
    DATETIME_LOCAL_INPUT_MIN,
    dateTimeYearRangeValidator,
    effectiveDateTimeLocalInputMin
} from '@/app/shared/utils/date-input-validation.utils';
import {
    HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE,
    HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY,
    hospitalizationPlannedBeforeAdmissionMessage,
    hospitalizationDateNotTooFarPastValidator,
    hospitalizationDateTimeLocalMinAllowed,
    hospitalizationPlannedDischargeMin,
    plannedDischargeNotBeforeAdmissionValidator
} from '@/app/features/hospitalizations/utils/hospitalization-date-validation.utils';
import {
    parseExaminationCreateRouteContext,
    parseVisitExaminationRouteContext,
    prefillPetFromRoute
} from '@/app/shared/panel/examination-create-route-context.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-hospitalization-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        PetAlertBannerComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent
    ],
    template: `
        <app-pet-alert-banner [petId]="form.controls.petId.value" />

        <div [class.card]="!embedded()">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; kayıt oluşturulamaz.
                </p>
            }
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
            @if (contextFromExamination()) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    Bu muayene kaydından bağlam taşındı; müşteri, hasta ve bağlı muayene alanları kilitlidir.
                </p>
            }
            @if (contextFromVisit()) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    Bu geliş kaydından bağlam taşındı; müşteri, hasta ve geliş alanları kilitlidir.
                </p>
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
                        <label for="admittedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Yatış tarihi / saati *</label>
                        <app-date-input inputId="admittedAtLocal" type="datetime-local" formControlName="admittedAtLocal" [min]="hospitalizationDateMinAllowed()" limit="past" />
                        @if (form.controls.admittedAtLocal.hasError('dateYearInvalid') && form.controls.admittedAtLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (form.controls.admittedAtLocal.hasError('hospitalizationDateTooFarPast') && form.controls.admittedAtLocal.touched) {
                            <small class="text-red-500 block">{{ hospitalizationDateTooFarPastMessage }}</small>
                        } @else if (apiFieldErrors().admittedAtLocal) {
                            <small class="text-red-500 block">{{ apiFieldErrors().admittedAtLocal }}</small>
                        } @else if (form.controls.admittedAtLocal.invalid && form.controls.admittedAtLocal.touched) {
                            <small class="text-red-500 block">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="plannedDischargeAtLocal" class="block text-sm font-medium text-muted-color mb-2">Planlı taburcu</label>
                        <app-date-input inputId="plannedDischargeAtLocal" type="datetime-local" formControlName="plannedDischargeAtLocal" [min]="plannedDischargeMin()" limit="planned" />
                        @if (form.controls.plannedDischargeAtLocal.hasError('dateYearInvalid') && form.controls.plannedDischargeAtLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (form.hasError(plannedBeforeAdmissionKey) && !form.controls.plannedDischargeAtLocal.hasError('dateOutOfRange') && form.controls.plannedDischargeAtLocal.touched) {
                            <small class="text-red-500 block">{{ plannedBeforeAdmissionMessage() }}</small>
                        } @else if (apiFieldErrors().plannedDischargeAtLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().plannedDischargeAtLocal }}</small>
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
                            optionDisabled="disabled"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="loadingExaminations()"
                        />
                        @if (apiFieldErrors().examinationId) {
                            <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                        } @else {
                            <small class="text-muted-color">Kesinleşmiş muayeneye yatış bağlanamaz; bu muayeneler pasif listelenir ({{ finalizedHint }}).</small>
                        }
                    </div>
                    @if (canLinkVisit) {
                        <div class="col-span-12 md:col-span-6">
                            <label for="visitId" class="block text-sm font-medium text-muted-color mb-2">Geliş (bugün)</label>
                            <p-select
                                inputId="visitId"
                                formControlName="visitId"
                                [options]="visitOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="visitOptions().length ? 'Bağlanacak geliş (isteğe bağlı)' : 'Bu hasta için bugün geliş yok'"
                                [showClear]="true"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().visitId) {
                                <small class="text-red-500">{{ apiFieldErrors().visitId }}</small>
                            } @else {
                                <small class="text-muted-color">Boş bırakılırsa bağlı muayenenin gelişi (varsa) kullanılır.</small>
                            }
                        </div>
                    }
                    <div class="col-span-12 md:col-span-6">
                        <label for="location" class="block text-sm font-medium text-muted-color mb-2">Konum</label>
                        <input id="location" type="text" maxlength="200" class="w-full p-inputtext p-component" placeholder="Ör. Kafes 3" formControlName="location" />
                        @if (apiFieldErrors().location) {
                            <small class="text-red-500">{{ apiFieldErrors().location }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="reason" class="block text-sm font-medium text-muted-color mb-2">Yatış nedeni *</label>
                        <textarea id="reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                        @if (form.controls.reason.invalid && form.controls.reason.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().reason) {
                            <small class="text-red-500">{{ apiFieldErrors().reason }}</small>
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
                    <p-button
                        type="submit"
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || applyingRouteContext() || ro.mutationBlocked()"
                    />
                    <p-button type="button" [label]="copy.buttonCancel" icon="pi pi-times" severity="secondary" (onClick)="cancel()" [disabled]="submitting()" />
                </div>
            </form>
        </div>

    `
})
export class HospitalizationFormComponent implements OnInit {
    /** Bağlam (müşteri, hayvan, muayene...) query biçiminde; sayfada adres çubuğundan, yan panelde muayeneden gelir. */
    readonly contextParams = input<ParamMap>(convertToParamMap({}));
    /** Yan panelde kart çerçevesi çizilmez. */
    readonly embedded = input(false);
    readonly saved = output<string>();
    readonly cancelled = output<void>();

    readonly copy = PANEL_COPY;
    protected readonly datetimeLocalInputMin = DATETIME_LOCAL_INPUT_MIN;
    protected readonly hospitalizationDateTooFarPastMessage = HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE;
    protected readonly plannedBeforeAdmissionKey = HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY;
    protected plannedBeforeAdmissionMessage(): string {
        return hospitalizationPlannedBeforeAdmissionMessage(this.form.controls.admittedAtLocal.value);
    }

    private readonly fb = inject(FormBuilder);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly visitsService = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly contextFromExamination = signal(false);
    readonly contextFromVisit = signal(false);
    private readonly contextLocked = computed(() => this.contextFromExamination() || this.contextFromVisit());
    readonly applyingRouteContext = signal(false);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);

    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<HospitalizationRelationOption[]>([]);
    protected readonly finalizedHint = FINALIZED_EXAMINATION_OPTION_HINT;
    readonly canLinkVisit = this.auth.hasOperationClaim(VISITS_READ_CLAIM);
    private readonly todayItems = signal<TodayItemVm[]>([]);
    private readonly selectedPetId = signal('');
    private readonly contextVisitId = signal('');
    readonly visitOptions = computed(() => hospitalizationVisitOptions(this.todayItems(), this.selectedPetId(), this.contextVisitId()));
    private relationLoadSeq = 0;
    readonly apiFieldErrors = signal<HospitalizationUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        admittedAtLocal: ['', [Validators.required, dateTimeYearRangeValidator(), hospitalizationDateNotTooFarPastValidator()]],
        plannedDischargeAtLocal: ['', dateTimeYearRangeValidator()],
        examinationId: [''],
        visitId: [''],
        location: ['', Validators.maxLength(200)],
        reason: ['', Validators.required],
        notes: ['']
    }, { validators: [plannedDischargeNotBeforeAdmissionValidator()] });

    readonly activeClinicLabel = signal<string>('Belirlenmedi');




    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.form.controls.examinationId.disable({ emitEvent: false });

        if (this.canLinkVisit) {
            this.visitsService.getToday().subscribe({
                next: (t) => this.todayItems.set(t.items),
                error: () => this.todayItems.set([])
            });
        }

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.contextLocked()) {
                return;
            }

            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            const id = trimClientIdControlValue(this.form.controls.clientId.value);

            if (!id) {
                this.form.controls.petId.disable({ emitEvent: false });
                this.syncExaminationSelectState();

                return;
            }

            this.form.controls.petId.enable({ emitEvent: false });
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.contextLocked()) {
                return;
            }

            const pid = trimClientIdControlValue(this.form.controls.petId.value);

            this.selectedPetId.set(pid);
            this.form.patchValue({ examinationId: '', visitId: '' }, { emitEvent: false });

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
        this.tryApplyVisitRouteContext();
        prefillPetFromRoute(this.contextParams(), this.form.controls.clientId, this.form.controls.petId);
    }

    private syncExaminationSelectState(): void {
        if (this.contextFromExamination()) {
            return;
        }

        const hasPet =
            !this.form.controls.petId.disabled && !!trimClientIdControlValue(this.form.controls.petId.value);

        if (!hasPet) {
            this.form.controls.examinationId.disable({ emitEvent: false });
        } else {
            this.form.controls.examinationId.enable({ emitEvent: false });
        }
    }

    plannedDischargeMin(): string {
        return hospitalizationPlannedDischargeMin(this.form.controls.admittedAtLocal.value, this.datetimeLocalInputMin);
    }

    hospitalizationDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(hospitalizationDateTimeLocalMinAllowed());
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
        const admittedAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(v.admittedAtLocal);

        if (!admittedAtUtc) {
            this.submitError.set('Geçerli bir yatış tarihi ve saati seçin.');

            return;
        }

        const plannedRaw = v.plannedDischargeAtLocal?.trim();
        const plannedDischargeAtUtc = plannedRaw ? fromIstanbulDateTimeLocalInputToUtcIso(plannedRaw) : null;

        if (plannedRaw && !plannedDischargeAtUtc) {
            this.submitError.set('Planlı taburcu tarihi geçersiz.');

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const payload = mapHospitalizationUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            admittedAtUtc,
            plannedDischargeAtUtc,
            reason: v.reason,
            notes: v.notes,
            examinationId: v.examinationId,
            visitId: v.visitId,
            location: v.location.trim() || null
        });

        this.submitting.set(true);
        this.hospitalizationsService.createHospitalization(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.saved.emit(id);
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseHospitalizationUpsertHttpError(e);

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

                this.examinationOptions.set(ex.items.map(hospitalizationExaminationOption));
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

                if (ex.status === 'Finalized') {
                    this.applyFinalizedExaminationContext(cId, pId);

                    return;
                }

                const listItem = examinationListItemFromDetail(ex);

                this.examinationOptions.set([hospitalizationExaminationOption(listItem)]);
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



    /** Kesinleşmiş muayeneye yatış bağlanamaz (`Examinations.Finalized`): müşteri/hayvan taşınır, muayene bağı kurulmaz. */
    private applyFinalizedExaminationContext(clientId: string, petId: string): void {
        this.selectionError.set(
            'Bağlam taşınan muayene kesinleşmiş; yatış kesinleşmiş muayeneye bağlanamaz. Müşteri ve hasta dolduruldu; yatışı geliş kaydıyla veya muayenesiz oluşturabilirsiniz.'
        );
        this.form.controls.clientId.setValue(clientId);
        this.form.controls.petId.setValue(petId);
        this.applyingRouteContext.set(false);
    }

    private tryApplyVisitRouteContext(): void {
        if (parseExaminationCreateRouteContext(this.contextParams())) {
            return;
        }

        const ctx = parseVisitExaminationRouteContext(this.contextParams());

        if (!ctx) {
            return;
        }

        this.form.patchValue({ clientId: ctx.clientId, petId: ctx.petId, visitId: ctx.visitId }, { emitEvent: false });

        for (const c of [this.form.controls.clientId, this.form.controls.petId, this.form.controls.visitId]) {
            c.disable({ emitEvent: false });
        }

        this.selectedPetId.set(ctx.petId);
        this.contextVisitId.set(ctx.visitId);
        this.contextFromVisit.set(true);
        this.loadExaminationsForPet(ctx.petId);
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}
