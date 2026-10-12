import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    examinationListItemFromDetail,
    prescriptionExaminationSelectOption
} from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import {
    followUpBeforeTreatmentMessage,
    mapTreatmentUpsertFormToCreateRequest
} from '@/app/features/treatments/data/treatment.mapper';
import type { TreatmentEditVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import {
    type TreatmentUpsertFieldErrors,
    type TreatmentUpsertFormFieldKey,
    parseTreatmentUpsertHttpError
} from '@/app/features/treatments/utils/treatment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import {
    dateOnlyInputToIstanbulStartUtcIso,
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';
import {
    DATE_INPUT_MIN,
    dateTimeYearRangeValidator,
    dateYearRangeValidator,
    effectiveDateTimeLocalInputMin
} from '@/app/shared/utils/date-input-validation.utils';
import {
    TREATMENT_DATE_TOO_FAR_PAST_MESSAGE,
    treatmentDateNotTooFarPastValidator,
    treatmentDateTimeLocalMinAllowed
} from '@/app/features/treatments/utils/treatment-date-validation.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-treatment-edit-page',
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
        AppErrorStateComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent
    ],
    template: `
        <a routerLink="/panel/treatments" class="text-primary font-medium no-underline inline-block mb-4">← Tedavi listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Tedavi düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Tedaviyi Düzenle" subtitle="Klinik" description="Tedavi kaydını güncelleyin." />

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
                            <label for="treatmentDateLocal" class="block text-sm font-medium text-muted-color mb-2">Tedavi tarihi / saati *</label>
                            <app-date-input inputId="treatmentDateLocal" type="datetime-local" formControlName="treatmentDateLocal" [min]="treatmentDateMinAllowed()" limit="past" />
                            @if (form.controls.treatmentDateLocal.hasError('dateYearInvalid') && form.controls.treatmentDateLocal.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                            } @else if (form.controls.treatmentDateLocal.hasError('treatmentDateTooFarPast') && form.controls.treatmentDateLocal.touched) {
                                <small class="text-red-500 block">{{ treatmentDateTooFarPastMessage }}</small>
                            } @else if (apiFieldErrors().treatmentDateLocal) {
                                <small class="text-red-500 block">{{ apiFieldErrors().treatmentDateLocal }}</small>
                            } @else if (form.controls.treatmentDateLocal.invalid && form.controls.treatmentDateLocal.touched) {
                                <small class="text-red-500 block">Tedavi tarihi zorunludur.</small>
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
                            <label for="title" class="block text-sm font-medium text-muted-color mb-2">Başlık *</label>
                            <input id="title" type="text" class="w-full p-inputtext p-component" formControlName="title" />
                            @if (apiFieldErrors().title) {
                                <small class="text-red-500">{{ apiFieldErrors().title }}</small>
                            } @else if (form.controls.title.invalid && form.controls.title.touched) {
                                <small class="text-red-500">Başlık zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="description" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                            <textarea id="description" rows="4" class="w-full p-inputtext p-component" formControlName="description"></textarea>
                            @if (apiFieldErrors().description) {
                                <small class="text-red-500">{{ apiFieldErrors().description }}</small>
                            } @else if (form.controls.description.invalid && form.controls.description.touched) {
                                <small class="text-red-500">Açıklama zorunludur.</small>
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
export class TreatmentEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;
    protected readonly treatmentDateTooFarPastMessage = TREATMENT_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly treatmentsService = inject(TreatmentsService);
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
    readonly selectionError = signal<string | null>(null);
    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private relationLoadSeq = 0;
    private initialRelationHydratePending = false;
    readonly apiFieldErrors = signal<TreatmentUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');


    private treatmentId = '';
    private editVmCache: TreatmentEditVm | null = null;

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

    constructor() {
        const fields: TreatmentUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'treatmentDateLocal',
            'examinationId',
            'followUpDate',
            'title',
            'description',
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
            this.loadError.set('Geçersiz tedavi.');
            this.loading.set(false);
            return;
        }
        this.treatmentId = id;

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
        return this.form.controls.petId.disabled || !trimClientIdControlValue(this.form.controls.petId.value);
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.treatmentsService.getTreatmentForEditById(this.treatmentId).subscribe({
            next: (x) => {
                this.editVmCache = x;
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        treatmentDateLocal: toIstanbulDateTimeLocalInputValue(x.treatmentDateUtc),
                        followUpDate: x.followUpDateInput ?? '',
                        title: x.title,
                        description: x.description,
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
                this.loadError.set(panelHttpFailureMessage(e, 'Tedavi bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
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
        this.treatmentsService.updateTreatment(this.treatmentId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/treatments', this.treatmentId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseTreatmentUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/treatments', this.treatmentId]);
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

    private async loadExaminationsForPetHydrate(petId: string, vm: TreatmentEditVm): Promise<void> {
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
