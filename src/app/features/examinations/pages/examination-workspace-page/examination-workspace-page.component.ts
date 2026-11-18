import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy, type TemplateRef, viewChild } from '@angular/core';
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
import { ClinicalSnippetTriggerDirective } from '@/app/entities/clinical-snippet/components/clinical-snippet-trigger.directive';
import { ClinicalTermPickerComponent } from '@/app/entities/clinical-term/components/clinical-term-picker.component';
import { DoseCalculatorComponent } from '@/app/entities/procedure/components/dose-calculator.component';
import { ExaminationPatientContextComponent } from '@/app/features/examinations/components/examination-patient-context.component';
import { ExaminationPatientHeaderComponent } from '@/app/features/examinations/components/examination-patient-header.component';
import { mapExaminationFormToCreateRequest, isPartialVitalClear, mapExaminationFormToUpdateRequest } from '@/app/entities/examination/data/examination.mapper';
import type { ExaminationWorkspaceFormValue } from '@/app/entities/examination/models/examination-form.model';
import type { ExaminationEditVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { defaultExaminationDateTimeParts, EXAMINATION_TIME_SELECT_OPTIONS, examinationTimeSelectOptionsWithLegacy } from '@/app/features/examinations/utils/examination-time-options.utils';
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
import { formatUtcIsoAsLocalDateTimeDisplay, toIstanbulDateTimeInputParts, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { readSessionDraft, removeSessionDraft, sessionDraftKey, writeSessionDraft } from '@/app/shared/utils/session-draft.storage';
import { debounceTime, merge } from 'rxjs';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { FormFieldComponent } from '@/app/shared/forms/form-field/form-field.component';
import { AiDraftFlowComponent } from '@/app/entities/ai/components/ai-draft-flow.component';
import { AiEntryButtonComponent } from '@/app/entities/ai/components/ai-entry-button.component';
import { AiProvenanceChipComponent } from '@/app/entities/ai/components/ai-provenance-chip.component';
import { ExamNoteDraftComponent } from '@/app/entities/ai/components/exam-note-draft.component';
import { AI_FEATURE_EXAM_NOTE } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { injectAiDraftFlow } from '@/app/entities/ai/services/ai-draft-flow';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { examNoteAcceptSummary, type ExamNoteFieldKey, type ExamNoteFormValues, parseExamNoteDraftContent } from '@/app/entities/ai/utils/exam-note-draft.utils';

/** Tarayıcı taslağı (B3): muayene formu, serbest oluşturmada hasta seçimi ve düzenlemede taslağın alındığı kayıt sürümü. */
interface ExaminationDraftData {
    form: ExaminationWorkspaceFormValue;
    selection: { clientId: string; petId: string } | null;
    rowVersion: string | null;
}

const DRAFT_SAVE_DEBOUNCE_MS = 400;

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
        ClinicalTermPickerComponent,
        ClinicalSnippetTriggerDirective,
        DoseCalculatorComponent,
        FormFieldComponent, FormSubmitDirective,
        FormErrorSummaryComponent,
        AiEntryButtonComponent,
        AiDraftFlowComponent,
        ExamNoteDraftComponent,
        AiProvenanceChipComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './examination-workspace-page.component.html'
})
export class ExaminationWorkspacePageComponent implements OnInit, HasUnsavedChanges {
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
    private readonly ai = inject(AiService);
    private readonly aiPanel = inject(AiPanelService);

    /**
     * AI-001 "Notu alanlara ayır" (yan panel, `AI_DRAFTS_API_CONTRACT.md` §7.1): taslağın hedefi kaydedilmiş muayenedir; kabul
     * muayeneyi backend'de yazar (sona ekle / yerine yaz), sonra form yeniden okunur.
     */
    readonly noteFlow = injectAiDraftFlow({
        feature: AI_FEATURE_EXAM_NOTE,
        target: () => (this.isEdit && this.examinationId ? { type: 'Examination', id: this.examinationId } : null),
        generate: (note) => this.ai.draftExamNote(this.examinationId, note)
    });
    private readonly aiNoteTemplate = viewChild.required<TemplateRef<unknown>>('aiNoteTpl');
    private readonly examNoteDraft = viewChild(ExamNoteDraftComponent);
    protected readonly noteDraftContent = computed(() => parseExamNoteDraftContent(this.noteFlow.draft()?.content));
    /** Taslak açıldığı andaki muayene metinleri: dolu alanda "Sona ekle / Yerine yaz" seçimi sunulur. */
    protected readonly noteFormValues = computed<ExamNoteFormValues>(() => {
        this.noteFlow.draft();
        const v = this.form.getRawValue();

        return { visitReason: v.visitReason, anamnesis: v.anamnesis, findings: v.findings, assessment: v.assessment, plan: v.plan, notes: v.notes, weightKg: v.weightKg, temperatureC: v.temperatureC, heartRateBpm: v.heartRateBpm, respiratoryRatePerMin: v.respiratoryRatePerMin };
    });
    protected readonly notePanelOpen = computed(() => {
        const c = this.aiPanel.content();

        return c?.kind === 'custom' && c.owner === this;
    });
    /** Kabulden sonra formun üstündeki şerit ve alan çipleri; sayfa yenilenene kadar. */
    readonly aiAccepted = signal<{ summary: string; fields: ReadonlyMap<ExamNoteFieldKey, boolean> } | null>(null);
    /** Formda kaydedilmemiş değişiklik (sinyal): kabul kaydedilmiş muayeneye yazar, form önce kaydedilmeli. */
    readonly formDirty = signal(false);

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

    /**
     * Bulunan tarayıcı taslağı (B3): kullanıcı "Sürdür" ya da "Taslağı sil" diyene kadar otomatik kayıt bu taslağın üstüne yazmaz.
     * `stale`: düzenlemede kayıt taslaktan sonra değişmiş.
     */
    readonly pendingDraft = signal<{ savedAtLabel: string; stale: boolean } | null>(null);
    private draftKey: string | null = null;
    private draftChecked = false;
    private pendingDraftData: ExaminationDraftData | null = null;

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

        merge(this.form.valueChanges, this.selectionForm.valueChanges)
            .pipe(debounceTime(DRAFT_SAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.saveDraft());

        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formDirty.set(this.form.dirty));
        // Panelde bu sayfanın taslak içeriği açıksa sayfayla kapanır (bekleyen taslak sunucuda kalır, dönünce açılır).
        this.destroyRef.onDestroy(() => this.aiPanel.closeFor(this));
    }

    /** AI-001 girişi: yalnız kaydedilmiş, kesinleşmemiş muayenede ve yazılabilir kiracıda (taslağın hedefi muayene kimliği). */
    canDraftNote(): boolean {
        return this.isEdit && !this.loading() && !this.loadError() && !this.finalized() && !this.ro.mutationBlocked();
    }

    openNotePanel(): void {
        this.aiPanel.openCustom({ title: 'Notu alanlara ayır', template: this.aiNoteTemplate(), owner: this });
        this.noteFlow.resumePending();
    }

    /** Kabulden sonra alanın çipi: `null` → bu alan AI taslağından gelmedi; `true` → kabulden önce düzenlendi. */
    aiFieldEdited(key: ExamNoteFieldKey): boolean | null {
        return this.aiAccepted()?.fields.get(key) ?? null;
    }

    /**
     * "Kabul et ve forma aktar": taslak kaydedilmiş muayeneye yazılır (muayenenin kendi kuralları geçerli), sonra form yeniden
     * okunur. Formda kaydedilmemiş değişiklik varsa önce kaydedilmeli; aksi halde ya o değişiklikler ya taslak kaybolurdu.
     */
    acceptNote(): void {
        if (this.formDirty()) {
            this.noteFlow.block({
                code: null,
                title: 'Önce formu kaydedin',
                message: 'Formda kaydedilmemiş değişiklik var. Kaydedin ya da değişiklikleri bırakın; taslak kaydedilmiş muayeneye eklenir.',
                retryable: false,
                retryAfterSeconds: null,
                refreshStatus: false
            });

            return;
        }

        const accept = this.examNoteDraft()?.acceptContent();

        if (!accept?.fields.length) {
            this.noteFlow.block({ code: null, title: 'Aktarılacak alan yok', message: 'Taslaktaki alanların hepsi boş; taslağı atabilir ya da yeniden hazırlayabilirsiniz.', retryable: false, retryAfterSeconds: null, refreshStatus: false });

            return;
        }

        this.noteFlow.accept(accept.content, () => {
            this.aiPanel.closeFor(this);
            this.aiAccepted.set({ summary: examNoteAcceptSummary(accept.fields.length), fields: new Map(accept.fields.map((f) => [f.key, f.edited])) });
            this.aiPanel.notify('Taslak muayeneye eklendi.');
            this.reload();
        });
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
            this.draftKey = this.examinationDraftKey('kayit', id);
            this.reload();

            return;
        }

        this.initCreateMode();
    }

    /** Taslakla devam: form (ve serbest oluşturmada hasta seçimi) taslaktaki değerlerle dolar; değişiklik kaydedilmemiş sayılır. */
    resumeDraft(): void {
        const data = this.pendingDraftData;

        this.pendingDraft.set(null);
        this.pendingDraftData = null;

        if (!data) {
            return;
        }

        if (data.selection && !this.isEdit && this.selectionForm.controls.clientId.enabled && data.selection.clientId) {
            this.selectionForm.controls.clientId.setValue(data.selection.clientId);
            this.selectionForm.controls.petId.setValue(data.selection.petId);
            this.selectionForm.markAsDirty();
        }

        this.timeOptions.set(examinationTimeSelectOptionsWithLegacy(data.form.examinationTime));
        this.form.patchValue(data.form);
        this.form.markAsDirty();
        this.formDirty.set(true);
    }

    /** Taslağı siler; form sunucudaki (ya da boş) hâliyle kalır. */
    discardDraft(): void {
        this.pendingDraft.set(null);
        this.pendingDraftData = null;
        this.removeDraft();
    }

    hasUnsavedChanges(): boolean {
        return this.form.dirty || this.selectionForm.dirty;
    }

    saveDisabled(): boolean {
        // Eksik alan düğmeyi kapatmaz; Kaydet eksikleri gösterir (O3).
        return (!this.isEdit && this.applyingRouteContext()) || this.finalized() || this.submitting() || this.ro.mutationBlocked();
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
                this.formDirty.set(false);
                this.submitError.set(null);
                this.conflict.set(false);
                this.loading.set(false);
                this.offerDraftOnce();
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Muayene bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    /** Çakışma sonrası kullanıcının açık tercihi: yazdıkları (ve taslağı) atılır, güncel kayıt yüklenir. */
    discardAndReload(): void {
        this.removeDraft();
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
        this.removeDraft();
        this.form.markAsPristine();
        this.selectionForm.markAsPristine();
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

    /** Vazgeç: sayfadan çıkılırsa (kaydedilmemiş değişiklik sorusunda "Sayfada kal" denmezse) taslak da silinir. */
    onCancel(): void {
        void this.router.navigate(this.isEdit ? ['/panel/examinations', this.examinationId] : ['/panel/examinations']).then((left) => {
            if (left) {
                this.removeDraft();
            }
        });
    }

    /** Doz hesaplayıcının "Plana ekle"si: hesap planın sonuna yeni satır olarak eklenir; kayıt hekim kaydedince olur. */
    appendToPlan(line: string): void {
        const plan = this.form.controls.plan;
        const current = plan.value.trimEnd();

        plan.setValue(current ? `${current}\n${line}` : line);
        plan.markAsDirty();
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
        // Tarih/saat boş gelmesin: bugün ve şimdi (15 dk dilimine aşağı yuvarlanmış); her oluşturma bağlamında aynı, kullanıcı değiştirebilir.
        const { date, time } = defaultExaminationDateTimeParts();

        this.form.patchValue({ examinationDate: date, examinationTime: time }, { emitEvent: false });

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

        this.draftKey = this.examinationDraftKey('yeni', this.createDraftScope());
        this.offerDraftOnce();
    }

    // ---- Tarayıcı taslağı (B3) ----

    /** Kullanıcı ve kliniğe özel anahtar: başka kullanıcı ya da klinik aynı sekmede taslağı görmez. */
    private examinationDraftKey(kind: 'kayit' | 'yeni', scope: string): string {
        return sessionDraftKey('muayene', this.auth.getUserId(), this.auth.getClinicId(), kind, scope);
    }

    /** Yeni muayenede taslak bağlama göre ayrılır: geliş, randevu, adresteki hasta ya da serbest oluşturma. */
    private createDraftScope(): string {
        const query = this.route.snapshot.queryParamMap;
        const visit = parseVisitExaminationRouteContext(query);
        const appointment = parseAppointmentExaminationRouteContext(query);
        const petId = query.get('petId')?.trim();

        if (visit) {
            return `gelis-${visit.visitId}`;
        }

        if (appointment) {
            return `randevu-${appointment.appointmentId}`;
        }

        return petId ? `hasta-${petId}` : 'serbest';
    }

    /** Sayfa ilk açıldığında bir kez: taslak varsa sorulur; kesinleşmiş muayenede taslak silinir. */
    private offerDraftOnce(): void {
        if (this.draftChecked || !this.draftKey) {
            return;
        }

        this.draftChecked = true;
        const draft = readSessionDraft<ExaminationDraftData>(this.draftKey);

        if (!draft) {
            return;
        }

        if (this.finalized()) {
            this.removeDraft();

            return;
        }

        this.pendingDraftData = draft.data;
        this.pendingDraft.set({
            savedAtLabel: formatUtcIsoAsLocalDateTimeDisplay(draft.savedAtUtc),
            stale: this.isEdit && !!this.current && draft.data.rowVersion !== (this.current.rowVersion ?? null)
        });
    }

    /** Yazdıkça (kısa gecikmeyle) taslağa yazar; soru yanıtlanmadan, kayıt sürerken ya da değişiklik yokken yazmaz. */
    private saveDraft(): void {
        if (!this.draftKey || !this.draftChecked || this.pendingDraft() || this.finalized() || this.submitting() || !this.hasUnsavedChanges()) {
            return;
        }

        const selection = this.selectionForm.getRawValue();

        writeSessionDraft<ExaminationDraftData>(this.draftKey, {
            form: this.form.getRawValue(),
            selection: this.isEdit || this.contextFromAppointment() || this.visitContextId() ? null : { clientId: selection.clientId, petId: selection.petId },
            rowVersion: this.isEdit ? (this.current?.rowVersion ?? null) : null
        });
    }

    private removeDraft(): void {
        if (this.draftKey) {
            removeSessionDraft(this.draftKey);
        }
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
                this.suggestVisitReason(visit.arrivalReason);
                // Seçim formu kullanılmaz; devre dışı kontroller geçerliliği etkilemez.
                this.selectionForm.controls.clientId.disable({ emitEvent: false });
                this.selectionForm.controls.petId.disable({ emitEvent: false });
                this.applyingRouteContext.set(false);
            },
            error: (e: unknown) => this.rejectVisitContext(panelHttpFailureMessage(e, 'Geliş kaydı yüklenemedi.'))
        });
    }

    /** Gelişte yazılan neden, şikâyet alanı boşsa öneri olarak girer; hekim değiştirebilir (sunucu kopyalamaz, sözleşme §4.5). */
    private suggestVisitReason(arrivalReason: string | null): void {
        const control = this.form.controls.visitReason;

        if (arrivalReason && !control.value.trim()) {
            control.setValue(arrivalReason);
        }
    }

    private rejectVisitContext(message: string): void {
        // `loadClients` hata alanını sıfırlar; mesaj ondan sonra yazılmalı.
        this.selectionError.set(`${message} Serbest oluşturma ile devam edebilirsiniz.`);
        this.applyingRouteContext.set(false);
    }
}
