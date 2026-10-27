import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { isAppointmentCancelledStatus } from '@/app/entities/appointment/utils/appointment-status.utils';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ClinicalTermPickerComponent } from '@/app/entities/clinical-term/components/clinical-term-picker.component';
import { ExaminationPatientContextComponent } from '@/app/features/examinations/components/examination-patient-context.component';
import { ExaminationPatientHeaderComponent } from '@/app/features/examinations/components/examination-patient-header.component';
import { mapExaminationFormToCreateRequest, isPartialVitalClear, mapExaminationFormToUpdateRequest } from '@/app/entities/examination/data/examination.mapper';
import type { ExaminationWorkspaceFormValue } from '@/app/entities/examination/models/examination-form.model';
import type { ExaminationEditVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { EXAMINATION_TIME_SELECT_OPTIONS, examinationTimeSelectOptionsWithLegacy } from '@/app/features/examinations/utils/examination-time-options.utils';
import { type ExaminationUpsertFieldErrors, type ExaminationUpsertFormFieldKey, parseExaminationUpsertHttpError } from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { parseAppointmentExaminationRouteContext, parseVisitExaminationRouteContext, prefillPetFromRoute, type VisitExaminationRouteContext } from '@/app/shared/panel/examination-create-route-context.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { DATE_INPUT_MIN, dateYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { toIstanbulDateTimeInputParts, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

function requiredTrimmed(c: AbstractControl): ValidationErrors | null {
    return typeof c.value === 'string' && c.value.trim() ? null : { required: true };
}

/** Vital değerler opsiyonel; girildiyse `> 0` (üst sınır/uyarı eşiği yok). */
function positiveWhenPresent(c: AbstractControl): ValidationErrors | null {
    const v = c.value as number | null;

    if (v === null || v === undefined) {
        return null;
    }

    return typeof v === 'number' && v > 0 ? null : { positive: true };
}

function integerWhenPresent(c: AbstractControl): ValidationErrors | null {
    const v = c.value as number | null;

    if (v === null || v === undefined) {
        return null;
    }

    return Number.isInteger(v) ? null : { integer: true };
}

type VitalKey = 'weightKg' | 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin';

/**
 * Muayene çalışma alanı: `new` ve `:id/edit` rotaları aynı bileşeni kullanır.
 * Hata ve çakışmada form değerlerine dokunulmaz; yeni `rowVersion` yalnızca başarılı yazma yanıtından alınır.
 */
@Component({
    selector: 'app-examination-workspace-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        ExaminationPatientContextComponent,
        ExaminationPatientHeaderComponent,
        ClientSearchComponent,
        PetSearchComponent,
        DateInputComponent,
        ClinicalTermPickerComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './examination-workspace-page.component.html'
})
export class ExaminationWorkspacePageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly visitsService = inject(VisitsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** `:id/edit` rotası → düzenleme; `new` → oluşturma. */
    examinationId = '';
    isEdit = false;
    /** Düzenlemede son bilinen sunucu kaydı (bağlam + rowVersion). Form girdisi değildir. */
    current: ExaminationEditVm | null = null;

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly conflict = signal(false);
    /** Kesinleşmiş muayene salt okunur: form kilitlenir, kayıt engellenir. */
    readonly finalized = signal(false);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ExaminationUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    readonly selectedClientId = signal<string | null>(null);
    readonly selectedPetId = signal<string | null>(null);

    readonly contextFromAppointment = signal(false);
    readonly applyingRouteContext = signal(false);
    readonly appointmentContextId = signal<string | null>(null);
    /** Bugün'den açıldıysa doğrulanmış geliş kimliği; doluyken hasta seçimi gösterilmez. */
    readonly visitContextId = signal<string | null>(null);
    readonly cancelledAppointmentBlocked = signal(false);
    readonly blockedAppointmentId = signal<string | null>(null);

    readonly timeOptions = signal<SelectOption[]>(EXAMINATION_TIME_SELECT_OPTIONS);

    readonly selectionForm = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required]
    });

    /** Kayıttaki tek bir vital silinemez (sözleşme: yalnızca tümü `clearVitals` ile). */
    private readonly partialVitalClearValidator: ValidatorFn = (g) => (this.current && isPartialVitalClear(g.value, this.current) ? { partialVitalClear: true } : null);

    readonly form = this.fb.group(
        {
            examinationDate: this.fb.nonNullable.control('', [Validators.required, dateYearRangeValidator()]),
            examinationTime: this.fb.nonNullable.control('', Validators.required),
            visitReason: this.fb.nonNullable.control('', [requiredTrimmed, Validators.maxLength(2000)]),
            anamnesis: this.fb.nonNullable.control(''),
            findings: this.fb.nonNullable.control(''),
            weightKg: this.fb.control<number | null>(null, positiveWhenPresent),
            temperatureC: this.fb.control<number | null>(null, positiveWhenPresent),
            heartRateBpm: this.fb.control<number | null>(null, [positiveWhenPresent, integerWhenPresent]),
            respiratoryRatePerMin: this.fb.control<number | null>(null, [positiveWhenPresent, integerWhenPresent]),
            vitalsMeasuredAtLocal: this.fb.nonNullable.control(''),
            assessment: this.fb.nonNullable.control(''),
            plan: this.fb.nonNullable.control(''),
            notes: this.fb.nonNullable.control('')
        },
        { validators: this.partialVitalClearValidator }
    );

    constructor() {
        const fieldMap: Array<[ExaminationUpsertFormFieldKey, keyof typeof this.form.controls]> = [
            ['examinationDate', 'examinationDate'],
            ['examinationTime', 'examinationTime'],
            ['visitReason', 'visitReason'],
            ['anamnesis', 'anamnesis'],
            ['findings', 'findings'],
            ['weightKg', 'weightKg'],
            ['temperatureC', 'temperatureC'],
            ['heartRateBpm', 'heartRateBpm'],
            ['respiratoryRatePerMin', 'respiratoryRatePerMin'],
            ['vitalsMeasuredAt', 'vitalsMeasuredAtLocal'],
            ['assessment', 'assessment'],
            ['plan', 'plan'],
            ['notes', 'notes']
        ];

        for (const [errKey, controlKey] of fieldMap) {
            (this.form.controls[controlKey] as AbstractControl).valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();

                if (cur[errKey]) {
                    const next = { ...cur };

                    delete next[errKey];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        this.isEdit = this.route.snapshot.routeConfig?.path?.includes(':id') === true;

        if (this.isEdit) {
            if (!id) {
                this.loadError.set('Geçersiz muayene.');

                return;
            }

            this.examinationId = id;
            this.reload();

            return;
        }

        this.initCreateMode();
    }

    saveDisabled(): boolean {
        return this.form.invalid || (!this.isEdit && (this.selectionForm.invalid || this.applyingRouteContext())) || this.finalized() || this.submitting() || this.ro.mutationBlocked();
    }

    /** Yan paneldeki hasta bağlamı için hayvan: düzenlemede kayıttan, oluşturmada seçimden (seçilmeden panel yok). */
    contextPetId(): string | null {
        return (this.isEdit ? this.current?.petId : this.selectedPetId())?.trim() || null;
    }

    vitalError(key: VitalKey): string | null {
        const c = this.form.controls[key];

        if (c.touched || c.dirty) {
            if (c.hasError('positive')) {
                return 'Değer 0’dan büyük olmalıdır.';
            }

            if (c.hasError('integer')) {
                return 'Tam sayı giriniz.';
            }
        }

        return this.apiFieldErrors()[key] ?? null;
    }

    /** Sunucudan (yeniden) yükler; formu kayıttaki değerlerle doldurur. */
    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.examinationsService.getExaminationForEditById(this.examinationId).subscribe({
            next: (x) => {
                this.current = x;
                const { date, time } = toIstanbulDateTimeInputParts(x.examinedAtUtc);

                this.timeOptions.set(examinationTimeSelectOptionsWithLegacy(time));
                this.form.reset(
                    {
                        examinationDate: date,
                        examinationTime: time,
                        visitReason: x.visitReason,
                        anamnesis: x.anamnesis,
                        findings: x.findings,
                        weightKg: x.weightKg,
                        temperatureC: x.temperatureC,
                        heartRateBpm: x.heartRateBpm,
                        respiratoryRatePerMin: x.respiratoryRatePerMin,
                        vitalsMeasuredAtLocal: x.vitalsMeasuredAtUtc ? toIstanbulDateTimeLocalInputValue(x.vitalsMeasuredAtUtc) : '',
                        assessment: x.assessment,
                        plan: x.plan,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                this.finalized.set(x.status === 'Finalized');

                if (this.finalized()) {
                    this.form.disable({ emitEvent: false });
                } else {
                    this.form.enable({ emitEvent: false });
                }

                this.apiFieldErrors.set({});
                this.submitError.set(null);
                this.conflict.set(false);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Muayene bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    /** Çakışma sonrası kullanıcının açık tercihi: yazdıkları atılır, güncel kayıt yüklenir. */
    discardAndReload(): void {
        this.reload();
    }

    onSubmit(): void {
        if (this.submitting() || this.finalized()) {
            return;
        }

        this.submitError.set(null);
        this.conflict.set(false);
        this.apiFieldErrors.set({});

        if (this.cancelledAppointmentBlocked()) {
            this.submitError.set(this.copy.cancelledAppointmentExamCreateBlocked);

            return;
        }

        if (this.form.invalid || (!this.isEdit && this.selectionForm.invalid)) {
            this.form.markAllAsTouched();
            this.selectionForm.markAllAsTouched();

            return;
        }

        const v: ExaminationWorkspaceFormValue = this.form.getRawValue();

        if (this.isEdit) {
            this.submitUpdate(v);
        } else {
            this.submitCreate(v);
        }
    }

    private submitCreate(v: ExaminationWorkspaceFormValue): void {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const payload = mapExaminationFormToCreateRequest(v, {
            clinicId,
            petId: this.selectionForm.getRawValue().petId,
            appointmentId: this.appointmentContextId(),
            visitId: this.visitContextId()
        });

        if (!payload) {
            this.submitError.set('Geçerli bir muayene tarihi ve saati seçin.');

            return;
        }

        this.submitting.set(true);
        this.examinationsService.createExamination(payload).subscribe({
            next: ({ id }) => this.goToSavedDetail(id),
            error: (e: unknown) => this.handleSubmitError(e, 'Kayıt oluşturulamadı.')
        });
    }

    private submitUpdate(v: ExaminationWorkspaceFormValue): void {
        const current = this.current;

        if (!current) {
            return;
        }

        const payload = mapExaminationFormToUpdateRequest(v, current);

        if (!payload) {
            this.submitError.set('Geçerli bir muayene tarihi ve saati seçin.');

            return;
        }

        this.submitting.set(true);
        this.examinationsService.updateExamination(this.examinationId, payload).subscribe({
            next: () => this.goToSavedDetail(this.examinationId),
            error: (e: unknown) => this.handleSubmitError(e, 'Kayıt sırasında hata oluştu.')
        });
    }

    /**
     * Başarılı yazmadan sonra muayene detayına döner; "Muayene kaydedildi." toast'ı detay sayfasında `?saved=1` ile gösterilir.
     * `submitting` bilerek açık bırakılır: gezinme bitene kadar ikinci gönderim (eski `rowVersion` ile 409) engellenir.
     */
    private goToSavedDetail(id: string): void {
        void this.router.navigate(['/panel/examinations', id], { queryParams: { saved: '1' } });
    }

    /** Hata durumunda form değerlerine dokunulmaz; yalnızca mesaj ve alan hataları işlenir. */
    private handleSubmitError(e: unknown, fallback: string): void {
        this.submitting.set(false);

        if (e instanceof HttpErrorResponse) {
            const parsed = parseExaminationUpsertHttpError(e);

            this.apiFieldErrors.set(parsed.fieldErrors);
            this.submitError.set(parsed.summaryMessage);
            this.conflict.set(parsed.isConcurrencyConflict);

            return;
        }

        this.submitError.set(e instanceof Error ? e.message : fallback);
    }

    onCancel(): void {
        void this.router.navigate(this.isEdit ? ['/panel/examinations', this.examinationId] : ['/panel/examinations']);
    }

    goAppointmentDetail(): void {
        const id = this.blockedAppointmentId();

        void this.router.navigate(id ? ['/panel/appointments', id] : ['/panel/appointments']);
    }

    goAppointmentsList(): void {
        void this.router.navigate(['/panel/appointments']);
    }

    // ---- Oluşturma: müşteri/hayvan seçimi ve randevu bağlamı ----

    private initCreateMode(): void {
        const visitCtx = parseVisitExaminationRouteContext(this.route.snapshot.queryParamMap);

        if (visitCtx) {
            this.applyVisitRouteContext(visitCtx);
        }

        this.selectionForm.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            if (this.contextFromAppointment()) {
                return;
            }

            this.selectionForm.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);

            if (clientId === null || clientId === undefined) {
                this.selectionForm.controls.clientId.setValue('', { emitEvent: false });
            }

            const id = trimClientIdControlValue(this.selectionForm.controls.clientId.value);

            this.selectedClientId.set(id || null);

            if (!id) {
                this.selectionForm.controls.petId.disable({ emitEvent: false });

                return;
            }

            this.selectionForm.controls.petId.enable({ emitEvent: false });
        });
        this.selectionForm.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((petId) => {
            this.selectedPetId.set(petId?.trim() || null);
        });
        prefillPetFromRoute(this.route.snapshot.queryParamMap, this.selectionForm.controls.clientId, this.selectionForm.controls.petId);
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }

    private tryApplyAppointmentRouteContext(): void {
        const ctx = parseAppointmentExaminationRouteContext(this.route.snapshot.queryParamMap);

        if (!ctx) {
            return;
        }

        this.applyingRouteContext.set(true);
        this.selectionError.set(null);
        this.appointmentsService.getAppointmentById(ctx.appointmentId).subscribe({
            next: (ap) => {
                if (isAppointmentCancelledStatus(ap.status)) {
                    this.cancelledAppointmentBlocked.set(true);
                    this.blockedAppointmentId.set(ctx.appointmentId);
                    this.appointmentContextId.set(ctx.appointmentId);
                    this.contextFromAppointment.set(true);
                    this.form.disable({ emitEvent: false });
                    this.selectionError.set(this.copy.cancelledAppointmentExamCreateBlocked);
                    this.applyingRouteContext.set(false);

                    return;
                }

                const cId = ap.clientId?.trim() ?? '';
                const pId = ap.petId?.trim() ?? '';

                if (cId !== ctx.clientId || pId !== ctx.petId) {
                    this.selectionError.set('Randevu bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');
                    this.applyingRouteContext.set(false);

                    return;
                }

                this.appointmentContextId.set(ctx.appointmentId);
                this.selectionForm.controls.petId.enable({ emitEvent: false });
                this.selectionForm.patchValue({ clientId: cId, petId: pId }, { emitEvent: false });
                this.selectionForm.controls.clientId.disable({ emitEvent: false });
                this.selectionForm.controls.petId.disable({ emitEvent: false });
                this.selectedClientId.set(cId);
                this.selectedPetId.set(pId);
                this.contextFromAppointment.set(true);
                this.applyingRouteContext.set(false);
            },
            error: () => {
                this.selectionError.set('Randevu bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingRouteContext.set(false);
            }
        });
    }

    /**
     * Bugün'den gelen geliş bağlamı: Visit sunucudan doğrulanır (açık ve adresteki hayvana ait olmalı); hasta tekrar seçilmez.
     * Doğrulanamazsa hata gösterilir ve serbest oluşturma formu açılır (randevu bağlamıyla aynı davranış).
     */
    private applyVisitRouteContext(ctx: VisitExaminationRouteContext): void {
        this.applyingRouteContext.set(true);
        this.visitsService.getVisitById(ctx.visitId).subscribe({
            next: (visit) => {
                if (visit.isVoided || visit.careStatus === 'Completed') {
                    this.rejectVisitContext('Bu geliş kaydı tamamlanmış veya yanlış geliş olarak işaretlenmiş; muayene açılamaz.');

                    return;
                }

                if (visit.petId !== ctx.petId) {
                    this.rejectVisitContext('Geliş bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');

                    return;
                }

                this.visitContextId.set(ctx.visitId);
                this.selectedClientId.set(ctx.clientId);
                this.selectedPetId.set(ctx.petId);
                // Seçim formu kullanılmaz; devre dışı kontroller geçerliliği etkilemez.
                this.selectionForm.controls.clientId.disable({ emitEvent: false });
                this.selectionForm.controls.petId.disable({ emitEvent: false });
                this.applyingRouteContext.set(false);
            },
            error: (e: unknown) => this.rejectVisitContext(panelHttpFailureMessage(e, 'Geliş kaydı yüklenemedi.'))
        });
    }

    private rejectVisitContext(message: string): void {
        // `loadClients` hata alanını sıfırlar; mesaj ondan sonra yazılmalı.
        this.selectionError.set(`${message} Serbest oluşturma ile devam edebilirsiniz.`);
        this.applyingRouteContext.set(false);
    }
}
