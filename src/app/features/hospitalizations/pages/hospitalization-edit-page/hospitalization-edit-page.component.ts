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
import { mapHospitalizationUpsertFormToCreateRequest } from '@/app/features/hospitalizations/data/hospitalization.mapper';
import type { HospitalizationEditVm } from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import {
    type HospitalizationUpsertFieldErrors,
    type HospitalizationUpsertFormFieldKey,
    parseHospitalizationUpsertHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';
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
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import {
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';
import {
    DATETIME_LOCAL_INPUT_MIN,
    dateTimeYearRangeValidator,
    effectiveDateTimeLocalInputMin
} from '@/app/shared/utils/date-input-validation.utils';
import {
    HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE,
    hospitalizationDateNotTooFarPastValidator,
    hospitalizationDateTimeLocalMinAllowed
} from '@/app/features/hospitalizations/utils/hospitalization-date-validation.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-hospitalization-edit-page',
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
        <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        @if (loading()) {
            <app-loading-state message="Düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else if (editBlocked()) {
            <div class="card">
                <p class="mt-0 mb-4">Taburcu edilmiş kayıtlar düzenlenemez.</p>
                <a [routerLink]="['/panel/hospitalizations', hospitalizationId]" class="text-primary font-medium no-underline">Detaya git →</a>
            </div>
        } @else {
            <app-page-header title="Yatışı düzenle" subtitle="Klinik" description="Kaydı güncelleyin." />

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
                            <label for="admittedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Yatış tarihi / saati *</label>
                            <app-date-input inputId="admittedAtLocal" type="datetime-local" formControlName="admittedAtLocal" [min]="hospitalizationDateMinAllowed()" limit="past" />
                            @if (form.controls.admittedAtLocal.hasError('dateYearInvalid') && form.controls.admittedAtLocal.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                            } @else if (form.controls.admittedAtLocal.hasError('hospitalizationDateTooFarPast') && form.controls.admittedAtLocal.touched) {
                                <small class="text-red-500 block">{{ hospitalizationDateTooFarPastMessage }}</small>
                            } @else if (apiFieldErrors().admittedAtLocal) {
                                <small class="text-red-500 block">{{ apiFieldErrors().admittedAtLocal }}</small>
                            } @else if (form.controls.admittedAtLocal.invalid && form.controls.admittedAtLocal.touched) {
                                <small class="text-red-500 block">Zorunlu.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="plannedDischargeAtLocal" class="block text-sm font-medium text-muted-color mb-2">Planlı taburcu</label>
                            <app-date-input inputId="plannedDischargeAtLocal" type="datetime-local" formControlName="plannedDischargeAtLocal" [min]="datetimeLocalInputMin" limit="planned" />
                            @if (form.controls.plannedDischargeAtLocal.hasError('dateYearInvalid') && form.controls.plannedDischargeAtLocal.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
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
                            <label for="reason" class="block text-sm font-medium text-muted-color mb-2">Yatış nedeni *</label>
                            <textarea id="reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                            @if (apiFieldErrors().reason) {
                                <small class="text-red-500">{{ apiFieldErrors().reason }}</small>
                            } @else if (form.controls.reason.invalid && form.controls.reason.touched) {
                                <small class="text-red-500">Zorunlu.</small>
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
export class HospitalizationEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly datetimeLocalInputMin = DATETIME_LOCAL_INPUT_MIN;
    protected readonly hospitalizationDateTooFarPastMessage = HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    hospitalizationId = '';

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly editBlocked = signal(false);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private relationLoadSeq = 0;
    private initialRelationHydratePending = false;
    readonly apiFieldErrors = signal<HospitalizationUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private editVmCache: HospitalizationEditVm | null = null;

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        admittedAtLocal: ['', [Validators.required, dateTimeYearRangeValidator(), hospitalizationDateNotTooFarPastValidator()]],
        plannedDischargeAtLocal: ['', dateTimeYearRangeValidator()],
        examinationId: [''],
        reason: ['', Validators.required],
        notes: ['']
    });

    constructor() {
        const fields: HospitalizationUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'admittedAtLocal',
            'plannedDischargeAtLocal',
            'examinationId',
            'reason',
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
        this.hospitalizationId = id;

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
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
        this.editBlocked.set(false);
        this.hospitalizationsService.getHospitalizationForEditById(this.hospitalizationId).subscribe({
            next: (x) => {
                if (!x.isActive) {
                    this.editBlocked.set(true);
                    this.loading.set(false);
                    return;
                }
                this.editVmCache = x;
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        admittedAtLocal: toIstanbulDateTimeLocalInputValue(x.admittedAtUtc),
                        plannedDischargeAtLocal: toIstanbulDateTimeLocalInputValue(x.plannedDischargeAtUtc),
                        reason: x.reason,
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
                this.loadError.set(panelHttpFailureMessage(e, 'Kayıt bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    hospitalizationDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(hospitalizationDateTimeLocalMinAllowed());
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
            examinationId: v.examinationId
        });

        this.submitting.set(true);
        this.hospitalizationsService.updateHospitalization(this.hospitalizationId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/hospitalizations', this.hospitalizationId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseHospitalizationUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/hospitalizations', this.hospitalizationId]);
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

    private async loadExaminationsForPetHydrate(petId: string, vm: HospitalizationEditVm): Promise<void> {
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
