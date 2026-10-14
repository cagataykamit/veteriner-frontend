import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { mapLabResultUpsertFormToCreateRequest } from '@/app/features/lab-results/data/lab-result.mapper';
import type { LabResultEditVm, LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import {
    type LabResultUpsertFieldErrors,
    type LabResultUpsertFormFieldKey,
    parseLabResultUpsertHttpError
} from '@/app/features/lab-results/utils/lab-result-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import {
    examinationListItemFromDetail,
    prescriptionExaminationSelectOption
} from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/shared/pet-alerts/pet-alert-banner.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import {
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';
import {
    dateTimeYearRangeValidator,
    effectiveDateTimeLocalInputMin
} from '@/app/shared/utils/date-input-validation.utils';
import {
    LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE,
    labResultDateNotTooFarPastValidator,
    labResultDateTimeLocalMinAllowed
} from '@/app/features/lab-results/utils/lab-result-date-validation.utils';
import {
    LAB_RESULT_INCOMPLETE_MESSAGE,
    LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE,
    labResultResultFieldsValidator
} from '@/app/features/lab-results/utils/lab-result-form.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-lab-result-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent
    ],
    template: `
        @if (loading()) {
            <app-loading-state message="Düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header
                categoryLink="/panel/lab-results"
                categoryLinkLabel="Listeye dön"
                [title]="status() === 'Requested' ? 'Lab sonucu gir' : 'Lab sonucunu düzenle'"
                [description]="status() === 'Requested' ? 'Sonuç tarihi ve metnini girince kayıt Sonuçlandı olur.' : 'Kaydı güncelleyin.'"
            />
            <app-pet-alert-banner [petId]="form.controls.petId.value" />

            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        İşletme salt okunur moddadır; değişiklik kaydedilemez.
                    </p>
                }
                @if (selectionError()) {
                    <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
                }
                <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
                @if (examinationFinalized()) {
                    <p class="text-sm text-muted-color mt-0 mb-4" role="status" data-testid="finalized-identity-locked">
                        Bağlı muayene kesinleşmiş; müşteri, hayvan, bağlı muayene ve test adı değiştirilemez. Sonuç, yorum ve notlar düzenlenebilir.
                    </p>
                }
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                            <app-client-search inputId="clientId" formControlName="clientId" />
                            @if (apiFieldErrors().clientId) {
                                <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                            } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Müşteri seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan *</label>
                            <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Hayvan seçimi zorunludur.</small>
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
                                styleClass="w-full"
                                [loading]="loadingExaminations()"
                                [disabled]="examinationSelectDisabled()"
                            />
                            @if (apiFieldErrors().examinationId) {
                                <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="testName" class="block text-sm font-medium text-muted-color mb-2">Test adı *</label>
                            <input id="testName" type="text" class="w-full p-inputtext p-component" formControlName="testName" />
                            @if (apiFieldErrors().testName) {
                                <small class="text-red-500">{{ apiFieldErrors().testName }}</small>
                            } @else if (form.controls.testName.invalid && form.controls.testName.touched) {
                                <small class="text-red-500">Test adı zorunludur.</small>
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

                    @if (conflict()) {
                        <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mt-4" role="alert">
                            <p class="text-amber-800 dark:text-amber-200 m-0 font-medium">{{ submitError() }}</p>
                            <div class="mt-3">
                                <p-button
                                    type="button"
                                    label="Yazdıklarımı atıp güncel kaydı yükle"
                                    icon="pi pi-refresh"
                                    severity="secondary"
                                    size="small"
                                    (onClick)="reload()"
                                />
                            </div>
                        </div>
                    } @else if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <p-button
                            type="submit"
                            [label]="copy.buttonSave"
                            icon="pi pi-check"
                            [loading]="submitting()"
                            [disabled]="form.invalid || submitting() || ro.mutationBlocked()"
                        />
                        <p-button
                            type="button"
                            [label]="copy.buttonCancel"
                            icon="pi pi-times"
                            severity="secondary"
                            (onClick)="goDetail()"
                            [disabled]="submitting()"
                        />
                    </div>
                </form>
            </div>

        }
    `
})
export class LabResultEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly labResultDateTooFarPastMessage = LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE;
    protected readonly resultIncompleteMessage = LAB_RESULT_INCOMPLETE_MESSAGE;
    protected readonly interpretationWithoutResultMessage = LAB_RESULT_INTERPRETATION_WITHOUT_RESULT_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly labResultsService = inject(LabResultsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly conflict = signal(false);
    readonly selectionError = signal<string | null>(null);
    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private relationLoadSeq = 0;
    private initialRelationHydratePending = false;
    readonly apiFieldErrors = signal<LabResultUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');


    private labResultId = '';
    private editVmCache: LabResultEditVm | null = null;
    private rowVersion = '';
    /** Sonuçlanmış kayıtta sonuç geri silinemez (PUT 400). */
    readonly status = signal<LabResultStatus | null>(null);
    /** Bağlı muayene kesinleşmişse kimlik alanları (test, hayvan, muayene) backend'de kilitlidir. */
    readonly examinationFinalized = signal(false);

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        resultDateLocal: ['', [dateTimeYearRangeValidator(), labResultDateNotTooFarPastValidator()]],
        examinationId: [''],
        testName: ['', Validators.required],
        resultText: [''],
        interpretation: [''],
        notes: ['']
    }, { validators: labResultResultFieldsValidator(() => this.status() === 'Resulted') });

    constructor() {
        const fields: LabResultUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'resultDateLocal',
            'examinationId',
            'testName',
            'resultText',
            'interpretation',
            'notes'
        ];
        for (const f of fields) {
            this.form.controls[f].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();
                if (cur[f]) {
                    const next = { ...cur };
                    delete next[f];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.loadError.set('Geçersiz kayıt.');
            this.loading.set(false);
            return;
        }
        this.labResultId = id;

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }
            const cid = trimClientIdControlValue(this.form.controls.clientId.value);
            if (!cid) {
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const pid = trimClientIdControlValue(this.form.controls.petId.value);
            if (!pid) {
                this.relationLoadSeq += 1;
                this.form.patchValue({ examinationId: '' }, { emitEvent: false });
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
                return;
            }
            if (this.initialRelationHydratePending) {
                this.initialRelationHydratePending = false;
                const vm = this.editVmCache;
                if (vm) {
                    void this.loadExaminationsForPetHydrate(pid, vm);
                }
                return;
            }
            this.form.patchValue({ examinationId: '' }, { emitEvent: false });
            this.loadExaminationsForPetFresh(pid);
        });

        this.reload();
    }

    examinationSelectDisabled(): boolean {
        return this.examinationFinalized() || this.form.controls.petId.disabled || !trimClientIdControlValue(this.form.controls.petId.value);
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.labResultsService.getLabResultForEditById(this.labResultId).subscribe({
            next: (x) => {
                if (x.status === 'Cancelled') {
                    this.loadError.set('İptal edilmiş lab kaydı düzenlenemez.');
                    this.loading.set(false);
                    return;
                }
                this.editVmCache = x;
                this.status.set(x.status);
                this.examinationFinalized.set(false);
                for (const c of [this.form.controls.clientId, this.form.controls.testName, this.form.controls.examinationId]) {
                    c.enable({ emitEvent: false });
                }
                this.rowVersion = x.rowVersion;
                this.conflict.set(false);
                this.submitError.set(null);
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        resultDateLocal: toIstanbulDateTimeLocalInputValue(x.resultDateUtc),
                        testName: x.testName,
                        resultText: x.resultText,
                        interpretation: x.interpretation,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.initialRelationHydratePending = true;
                    this.form.controls.petId.setValue(x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                }
                this.loading.set(false);
                this.lockIdentityWhenExaminationFinalized(x.examinationId);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Kayıt bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    /** Kesinleşmiş muayenede test adı, hayvan ve muayene değişimi backend'de `Examinations.Finalized` ile reddedilir; baştan pasif yapılır. */
    private lockIdentityWhenExaminationFinalized(examinationId: string): void {
        if (!examinationId) {
            return;
        }
        this.examinationsService.getExaminationById(examinationId).subscribe({
            next: (ex) => {
                if (ex.status !== 'Finalized') {
                    return;
                }
                this.examinationFinalized.set(true);
                for (const c of [this.form.controls.clientId, this.form.controls.petId, this.form.controls.examinationId, this.form.controls.testName]) {
                    c.disable({ emitEvent: false });
                }
            },
            error: () => {
                /* Kilit bilinemezse backend Examinations.Finalized döner ve mesaj gösterilir. */
            }
        });
    }

    labResultDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(labResultDateTimeLocalMinAllowed());
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
            examinationId: v.examinationId,
            rowVersion: this.rowVersion
        });

        this.submitting.set(true);
        this.labResultsService.updateLabResult(this.labResultId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/lab-results', this.labResultId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseLabResultUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.conflict.set(parsed.isConcurrencyConflict);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/lab-results', this.labResultId]);
    }





    private loadExaminationsForPetFresh(petId: string): void {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();
        this.loadingExaminations.set(true);
        this.selectionError.set(null);
        this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }).subscribe({
            next: (ex) => {
                if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                    return;
                }
                this.examinationOptions.set(ex.items.map(prescriptionExaminationSelectOption));
                this.loadingExaminations.set(false);
            },
            error: (e: unknown) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }
                this.selectionError.set(this.mapLoadError(e, 'Muayene listesi yüklenemedi.'));
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
            }
        });
    }

    private async loadExaminationsForPetHydrate(petId: string, vm: LabResultEditVm): Promise<void> {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();
        this.loadingExaminations.set(true);
        this.selectionError.set(null);
        try {
            const ex = await firstValueFrom(
                this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid })
            );
            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }
            let items = [...ex.items];
            const exW = vm.examinationId?.trim() ?? '';
            if (exW && !items.some((e) => e.id === exW)) {
                try {
                    const d = await firstValueFrom(this.examinationsService.getExaminationById(exW));
                    items = [examinationListItemFromDetail(d), ...items];
                } catch {
                    /* liste dışı muayene yüklenemezse atlanır */
                }
            }
            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }
            this.examinationOptions.set(items.map(prescriptionExaminationSelectOption));
            this.form.controls.examinationId.setValue(exW, { emitEvent: false });
        } catch (e: unknown) {
            if (seq !== this.relationLoadSeq) {
                return;
            }
            this.selectionError.set(this.mapLoadError(e, 'Muayene listesi yüklenemedi.'));
            this.examinationOptions.set([]);
        } finally {
            if (seq === this.relationLoadSeq) {
                this.loadingExaminations.set(false);
            }
        }
    }




    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
    }
}
