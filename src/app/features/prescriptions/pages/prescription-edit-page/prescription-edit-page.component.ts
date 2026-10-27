import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { forkJoin, firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { followUpBeforePrescribedMessage, mapPrescriptionUpsertFormToCreateRequest } from '@/app/features/prescriptions/data/prescription.mapper';
import type { PrescriptionEditVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import { PrescriptionItemsEditorComponent } from '@/app/features/prescriptions/components/prescription-items-editor.component';
import { PrescriptionsService } from '@/app/features/prescriptions/services/prescriptions.service';
import { createPrescriptionItemGroup, createPrescriptionItemsArray, prescriptionItemsFormToInputs } from '@/app/features/prescriptions/utils/prescription-items-form.utils';
import { type PrescriptionUpsertFieldErrors, type PrescriptionUpsertFormFieldKey, parsePrescriptionUpsertHttpError } from '@/app/features/prescriptions/utils/prescription-upsert-validation-parse.utils';
import { examinationListItemFromDetail, filterTreatmentsByExamination, prescriptionExaminationSelectOption, prescriptionTreatmentSelectOption, treatmentListItemFromDetail } from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { dateOnlyInputToIstanbulStartUtcIso, fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { DATE_INPUT_MIN, dateTimeYearRangeValidator, dateYearRangeValidator, effectiveDateTimeLocalInputMin } from '@/app/shared/utils/date-input-validation.utils';
import { PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE, prescriptionDateNotTooFarPastValidator, prescriptionDateTimeLocalMinAllowed } from '@/app/features/prescriptions/utils/prescription-date-validation.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-prescription-edit-page',
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
        AppErrorStateComponent,
        ClientSearchComponent,
        PetSearchComponent,
        DateInputComponent,
        PrescriptionItemsEditorComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading()) {
            <app-loading-state message="Reçete düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header categoryLink="/panel/prescriptions" categoryLinkLabel="Reçete listesine dön" title="Reçeteyi Düzenle" description="Reçete kaydını güncelleyin." />
            <app-pet-alert-banner [petId]="form.controls.petId.value" />

            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; değişiklik kaydedilemez.</p>
                }
                @if (selectionError()) {
                    <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
                }
                <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
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
                            <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hasta *</label>
                            <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Hasta seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="prescribedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Reçete tarihi / saati *</label>
                            <app-date-input inputId="prescribedAtLocal" type="datetime-local" formControlName="prescribedAtLocal" [min]="prescriptionDateMinAllowed()" limit="past" />
                            @if (form.controls.prescribedAtLocal.hasError('dateYearInvalid') && form.controls.prescribedAtLocal.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                            } @else if (form.controls.prescribedAtLocal.hasError('prescriptionDateTooFarPast') && form.controls.prescribedAtLocal.touched) {
                                <small class="text-red-500 block">{{ prescriptionDateTooFarPastMessage }}</small>
                            } @else if (apiFieldErrors().prescribedAtLocal) {
                                <small class="text-red-500 block">{{ apiFieldErrors().prescribedAtLocal }}</small>
                            } @else if (form.controls.prescribedAtLocal.invalid && form.controls.prescribedAtLocal.touched) {
                                <small class="text-red-500 block">Reçete tarihi zorunludur.</small>
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
                                [disabled]="relationSelectsDisabled()"
                            />
                            @if (apiFieldErrors().examinationId) {
                                <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="treatmentId" class="block text-sm font-medium text-muted-color mb-2">Bağlı tedavi</label>
                            <p-select
                                inputId="treatmentId"
                                formControlName="treatmentId"
                                [options]="treatmentOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tedavi seçin"
                                [filter]="true"
                                filterPlaceholder="Ara…"
                                filterBy="label"
                                [showClear]="true"
                                class="w-full"
                                [loading]="loadingTreatments()"
                                [disabled]="relationSelectsDisabled()"
                            />
                            @if (apiFieldErrors().treatmentId) {
                                <small class="text-red-500">{{ apiFieldErrors().treatmentId }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="title" class="block text-sm font-medium text-muted-color mb-2">Başlık *</label>
                            <input id="title" type="text" class="w-full p-inputtext p-component" formControlName="title" />
                            @if (apiFieldErrors().title) {
                                <small class="text-red-500">{{ apiFieldErrors().title }}</small>
                            } @else if (form.controls.title.invalid && form.controls.title.touched) {
                                <small class="text-red-500">Başlık zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="content" class="block text-sm font-medium text-muted-color mb-2">İçerik *</label>
                            <textarea id="content" rows="4" class="w-full p-inputtext p-component" formControlName="content"></textarea>
                            @if (apiFieldErrors().content) {
                                <small class="text-red-500">{{ apiFieldErrors().content }}</small>
                            } @else if (form.controls.content.invalid && form.controls.content.touched) {
                                <small class="text-red-500">İçerik zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <app-prescription-items-editor [items]="form.controls.items" />
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
                        <button pButton type="submit" [disabled]="form.invalid || submitting() || ro.mutationBlocked()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                        <button pButton type="button" severity="secondary" (click)="goDetail()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                    </div>
                </form>
            </div>
        }
    `
})
export class PrescriptionEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;
    protected readonly prescriptionDateTooFarPastMessage = PRESCRIPTION_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly prescriptionsService = inject(PrescriptionsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly treatmentsService = inject(TreatmentsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingExaminations = signal(false);
    readonly loadingTreatments = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    readonly treatmentOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<PrescriptionUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private prescriptionId = '';
    private editVmCache: PrescriptionEditVm | null = null;
    private initialRelationHydratePending = false;
    private allExaminationsForPet: ExaminationListItemVm[] = [];
    private allTreatmentsForPet: TreatmentListItemVm[] = [];
    private relationLoadSeq = 0;

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        prescribedAtLocal: ['', [Validators.required, dateTimeYearRangeValidator(), prescriptionDateNotTooFarPastValidator()]],
        followUpDate: ['', dateYearRangeValidator()],
        examinationId: [''],
        treatmentId: [''],
        title: ['', Validators.required],
        content: ['', Validators.required],
        notes: [''],
        items: createPrescriptionItemsArray()
    });

    constructor() {
        const fields: PrescriptionUpsertFormFieldKey[] = ['clientId', 'petId', 'prescribedAtLocal', 'followUpDate', 'examinationId', 'treatmentId', 'title', 'content', 'notes'];

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
            this.loadError.set('Geçersiz reçete.');
            this.loading.set(false);

            return;
        }

        this.prescriptionId = id;

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
                this.form.patchValue({ examinationId: '', treatmentId: '' }, { emitEvent: false });
                this.allExaminationsForPet = [];
                this.allTreatmentsForPet = [];
                this.examinationOptions.set([]);
                this.treatmentOptions.set([]);
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);

                return;
            }

            if (this.initialRelationHydratePending) {
                this.initialRelationHydratePending = false;
                const vm = this.editVmCache;

                if (vm) {
                    void this.loadRelationsForPetHydrate(pid, vm);
                }

                return;
            }

            this.form.patchValue({ examinationId: '', treatmentId: '' }, { emitEvent: false });
            this.loadRelationsForPetFresh(pid);
        });

        this.form.controls.examinationId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.applyTreatmentFilter();
        });

        this.form.controls.treatmentId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tid) => {
            const id = String(tid ?? '').trim();

            if (!id) {
                return;
            }

            const t = this.allTreatmentsForPet.find((x) => x.id === id);
            const ex = t?.examinationId?.trim();

            if (ex && this.form.controls.examinationId.value?.trim() !== ex) {
                this.form.controls.examinationId.setValue(ex, { emitEvent: true });
            }
        });

        this.reload();
    }

    relationSelectsDisabled(): boolean {
        return this.form.controls.petId.disabled || !trimClientIdControlValue(this.form.controls.petId.value);
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.prescriptionsService.getPrescriptionForEditById(this.prescriptionId).subscribe({
            next: (x) => {
                this.editVmCache = x;
                this.form.controls.items.clear({ emitEvent: false });

                for (const item of x.items) {
                    this.form.controls.items.push(createPrescriptionItemGroup(item), { emitEvent: false });
                }

                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        prescribedAtLocal: toIstanbulDateTimeLocalInputValue(x.prescribedAtUtc),
                        followUpDate: x.followUpDateInput ?? '',
                        title: x.title,
                        content: x.content,
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
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Reçete bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    prescriptionDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(prescriptionDateTimeLocalMinAllowed());
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const prescribedAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(v.prescribedAtLocal);

        if (!prescribedAtUtc) {
            this.submitError.set('Geçerli bir reçete tarihi ve saati seçin.');

            return;
        }

        const followUpDateUtc = v.followUpDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(v.followUpDate.trim()) : null;

        if (v.followUpDate?.trim() && !followUpDateUtc) {
            this.submitError.set('Takip tarihi geçersiz.');

            return;
        }

        const orderMsg = followUpBeforePrescribedMessage(prescribedAtUtc, followUpDateUtc);

        if (orderMsg) {
            this.submitError.set(orderMsg);

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const payload = mapPrescriptionUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            examinationId: v.examinationId,
            treatmentId: v.treatmentId,
            prescribedAtUtc,
            title: v.title,
            content: v.content,
            notes: v.notes,
            items: prescriptionItemsFormToInputs(this.form.controls.items),
            followUpDateUtc
        });

        this.submitting.set(true);
        this.prescriptionsService.updatePrescription(this.prescriptionId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/prescriptions', this.prescriptionId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parsePrescriptionUpsertHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/prescriptions', this.prescriptionId]);
    }

    private loadRelationsForPetFresh(petId: string): void {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();

        this.loadingExaminations.set(true);
        this.loadingTreatments.set(true);
        this.selectionError.set(null);
        forkJoin({
            ex: this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }),
            tr: this.treatmentsService.getTreatments({ page: 1, pageSize: 200, petId: pid })
        }).subscribe({
            next: ({ ex, tr }) => {
                if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                    return;
                }

                this.allExaminationsForPet = ex.items;
                this.examinationOptions.set(ex.items.map(prescriptionExaminationSelectOption));
                this.allTreatmentsForPet = tr.items;
                this.applyTreatmentFilter();
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            },
            error: (e: unknown) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }

                this.selectionError.set(this.mapLoadError(e, 'Muayene veya tedavi listesi yüklenemedi.'));
                this.allExaminationsForPet = [];
                this.allTreatmentsForPet = [];
                this.examinationOptions.set([]);
                this.treatmentOptions.set([]);
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            }
        });
    }

    private async loadRelationsForPetHydrate(petId: string, vm: PrescriptionEditVm): Promise<void> {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();

        this.loadingExaminations.set(true);
        this.loadingTreatments.set(true);
        this.selectionError.set(null);

        try {
            const { ex, tr } = await firstValueFrom(
                forkJoin({
                    ex: this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }),
                    tr: this.treatmentsService.getTreatments({ page: 1, pageSize: 200, petId: pid })
                })
            );

            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }

            let exams = [...ex.items];
            let treats = [...tr.items];
            const exW = vm.examinationId?.trim() ?? '';
            const trW = vm.treatmentId?.trim() ?? '';

            if (exW && !exams.some((e) => e.id === exW)) {
                try {
                    const d = await firstValueFrom(this.examinationsService.getExaminationById(exW));

                    exams = [examinationListItemFromDetail(d), ...exams];
                } catch {
                    /* liste dışı muayene yüklenemezse atlanır */
                }
            }

            if (trW && !treats.some((t) => t.id === trW)) {
                try {
                    const d = await firstValueFrom(this.treatmentsService.getTreatmentById(trW));

                    treats = [treatmentListItemFromDetail(d), ...treats];
                } catch {
                    /* liste dışı tedavi yüklenemezse atlanır */
                }
            }

            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }

            this.allExaminationsForPet = exams;
            this.examinationOptions.set(exams.map(prescriptionExaminationSelectOption));
            this.allTreatmentsForPet = treats;
            let examToSet = exW;

            if (trW) {
                const t = treats.find((x) => x.id === trW);

                if (t?.examinationId?.trim()) {
                    examToSet = t.examinationId.trim();
                }
            }

            this.form.patchValue({ examinationId: examToSet, treatmentId: '' }, { emitEvent: false });
            this.applyTreatmentFilter();
            const trOk =
                !!trW &&
                treats.some((t) => {
                    if (t.id !== trW) {
                        return false;
                    }

                    if (!examToSet) {
                        return true;
                    }

                    return (t.examinationId?.trim() ?? '') === examToSet;
                });

            if (trOk) {
                this.form.controls.treatmentId.setValue(trW, { emitEvent: false });
            }
        } catch (e: unknown) {
            if (seq !== this.relationLoadSeq) {
                return;
            }

            this.selectionError.set(this.mapLoadError(e, 'Muayene veya tedavi listesi yüklenemedi.'));
            this.allExaminationsForPet = [];
            this.allTreatmentsForPet = [];
            this.examinationOptions.set([]);
            this.treatmentOptions.set([]);
        } finally {
            if (seq === this.relationLoadSeq) {
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            }
        }
    }

    private applyTreatmentFilter(): void {
        const examId = this.form.controls.examinationId.value?.trim() ?? '';
        const filtered = filterTreatmentsByExamination(this.allTreatmentsForPet, examId || null);

        this.treatmentOptions.set(filtered.map(prescriptionTreatmentSelectOption));
        const cur = this.form.controls.treatmentId.value?.trim() ?? '';

        if (cur && !filtered.some((t) => t.id === cur)) {
            this.form.controls.treatmentId.setValue('', { emitEvent: false });
        }
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}
