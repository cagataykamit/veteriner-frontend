import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
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
import {
    hospitalizationExaminationOption,
    hospitalizationVisitOptions,
    type HospitalizationRelationOption
} from '@/app/features/hospitalizations/utils/hospitalization-relation-select.utils';
import type { HospitalizationWardVm } from '@/app/features/hospitalization-wards/models/hospitalization-ward-vm.model';
import { HospitalizationWardsService } from '@/app/features/hospitalization-wards/services/hospitalization-wards.service';
import {
    HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY,
    hospitalizationRoomOptions,
    hospitalizationRoomWriteFields,
    hospitalizationWardIdForRoom,
    hospitalizationWardOptions,
    roomRequiredWhenWardSelectedValidator
} from '@/app/features/hospitalizations/utils/hospitalization-location-select.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { examinationListItemFromDetail } from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
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
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

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
        } @else if (editBlocked()) {
            <div class="card">
                <p class="mt-0 mb-4">Taburcu edilmiş kayıtlar düzenlenemez.</p>
                <a [routerLink]="['/panel/hospitalizations', hospitalizationId]" class="text-primary font-medium no-underline">Detaya git →</a>
            </div>
        } @else {
            <app-page-header categoryLink="/panel/hospitalizations" categoryLinkLabel="Listeye dön" title="Yatışı düzenle" description="Kaydı güncelleyin." />
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
                    <p class="text-sm text-muted-color mt-0 mb-4" role="status" data-testid="finalized-examination-locked">
                        Bağlı muayene kesinleşmiş; yatışın muayene bağı değiştirilemez veya kaldırılamaz. Neden, not, konum, geliş ve planlı taburcu düzenlenebilir.
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
                            <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hasta *</label>
                            <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Hasta seçimi zorunludur.</small>
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
                                [disabled]="examinationSelectDisabled()"
                            />
                            @if (apiFieldErrors().examinationId) {
                                <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                            }
                        </div>
                        @if (canLinkVisit) {
                            <div class="col-span-12 md:col-span-6">
                                <label for="visitId" class="block text-sm font-medium text-muted-color mb-2">Geliş</label>
                                <p-select
                                    inputId="visitId"
                                    formControlName="visitId"
                                    [options]="visitOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="visitOptions().length ? 'Bağlanacak geliş (isteğe bağlı)' : 'Bu hasta için bugün geliş yok'"
                                    styleClass="w-full"
                                />
                                @if (apiFieldErrors().visitId) {
                                    <small class="text-red-500">{{ apiFieldErrors().visitId }}</small>
                                } @else {
                                    <small class="text-muted-color">Geliş bağı değiştirilebilir, kaldırılamaz.</small>
                                }
                            </div>
                        }
                        <div class="col-span-12 md:col-span-6">
                            <label for="wardId" class="block text-sm font-medium text-muted-color mb-2">Bölüm</label>
                            <p-select
                                inputId="wardId"
                                formControlName="wardId"
                                [options]="wardOptions()"
                                optionLabel="label"
                                optionValue="value"
                                styleClass="w-full"
                                [loading]="loadingWards()"
                            />
                            @if (wardsError()) {
                                <small class="text-red-500 block">{{ wardsError() }}</small>
                            } @else if (legacyLocation()) {
                                <small class="text-muted-color" data-testid="legacy-location">Kayıtlı serbest metin konum: “{{ legacyLocation() }}”. Oda seçilince yerini bölüm/oda alır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="roomId" class="block text-sm font-medium text-muted-color mb-2">Oda / kafes</label>
                            <p-select
                                inputId="roomId"
                                formControlName="roomId"
                                [options]="roomOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="form.controls.wardId.value ? 'Oda seçin' : 'Önce bölüm seçin'"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().roomId) {
                                <small class="text-red-500">{{ apiFieldErrors().roomId }}</small>
                            } @else if (form.hasError(roomRequiredKey) && form.controls.roomId.touched) {
                                <small class="text-red-500">Bölüm seçildiyse oda da seçilmelidir.</small>
                            } @else if (form.controls.wardId.value && roomOptions().length === 0) {
                                <small class="text-muted-color">Bu bölümde aktif oda yok.</small>
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
export class HospitalizationEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly datetimeLocalInputMin = DATETIME_LOCAL_INPUT_MIN;
    protected readonly hospitalizationDateTooFarPastMessage = HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE;
    protected readonly plannedBeforeAdmissionKey = HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY;
    protected plannedBeforeAdmissionMessage(): string {
        return hospitalizationPlannedBeforeAdmissionMessage(this.form.controls.admittedAtLocal.value);
    }

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly visitsService = inject(VisitsService);
    private readonly wardsService = inject(HospitalizationWardsService);
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
    readonly examinationOptions = signal<HospitalizationRelationOption[]>([]);
    readonly conflict = signal(false);
    /** Bağlı muayene kesinleşmişse yatışın muayene bağı backend'de kilitlidir (`Examinations.Finalized`); diğer alanlar serbesttir. */
    readonly examinationFinalized = signal(false);
    readonly canLinkVisit = this.auth.hasOperationClaim(VISITS_READ_CLAIM);
    private readonly todayItems = signal<TodayItemVm[]>([]);
    private readonly selectedPetId = signal('');
    private readonly loadedVisitId = signal('');
    readonly visitOptions = computed(() => hospitalizationVisitOptions(this.todayItems(), this.selectedPetId(), this.loadedVisitId()));
    /** Bölüm/oda tanımları (HOSP-002): kayıtlı oda pasifleşmiş olsa da seçicide kalır; değişmediyse PUT'ta gönderilmez. */
    readonly loadingWards = signal(false);
    readonly wardsError = signal<string | null>(null);
    private readonly wards = signal<HospitalizationWardVm[]>([]);
    private readonly selectedWardId = signal('');
    private readonly loadedRoomId = signal('');
    /** Odasız kayıttaki eski serbest metin konum; oda seçilmeden dokunulmaz. */
    readonly legacyLocation = signal('');
    readonly wardOptions = computed(() => hospitalizationWardOptions(this.wards(), this.loadedRoomId()));
    readonly roomOptions = computed(() => hospitalizationRoomOptions(this.wards(), this.selectedWardId(), this.loadedRoomId()));
    protected readonly roomRequiredKey = HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY;
    private rowVersion = '';
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
        visitId: [''],
        wardId: [''],
        roomId: [{ value: '', disabled: true }],
        reason: ['', Validators.required],
        notes: ['']
    }, { validators: [plannedDischargeNotBeforeAdmissionValidator(), roomRequiredWhenWardSelectedValidator()] });

    constructor() {
        const fields: HospitalizationUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'admittedAtLocal',
            'plannedDischargeAtLocal',
            'examinationId',
            'visitId',
            'roomId',
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

        if (this.canLinkVisit) {
            this.visitsService.getToday().subscribe({
                next: (t) => this.todayItems.set(t.items),
                error: () => this.todayItems.set([])
            });
        }

        this.loadWards();
        this.form.controls.wardId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((wardId) => {
            this.selectedWardId.set(wardId);
            this.form.controls.roomId.setValue('', { emitEvent: false });
            this.syncRoomSelectState(wardId);
        });

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

            this.selectedPetId.set(pid);

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

            this.form.patchValue({ examinationId: '', visitId: '' }, { emitEvent: false });
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
        this.editBlocked.set(false);
        this.hospitalizationsService.getHospitalizationForEditById(this.hospitalizationId).subscribe({
            next: (x) => {
                if (!x.isActive) {
                    this.editBlocked.set(true);
                    this.loading.set(false);

                    return;
                }

                this.editVmCache = x;
                this.rowVersion = x.rowVersion;
                this.loadedVisitId.set(x.visitId);
                this.loadedRoomId.set(x.roomId);
                this.legacyLocation.set(x.roomId ? '' : x.location);
                this.examinationFinalized.set(false);
                this.conflict.set(false);
                this.submitError.set(null);
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        admittedAtLocal: toIstanbulDateTimeLocalInputValue(x.admittedAtUtc),
                        plannedDischargeAtLocal: toIstanbulDateTimeLocalInputValue(x.plannedDischargeAtUtc),
                        visitId: x.visitId,
                        reason: x.reason,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                this.applyLoadedRoomSelection();

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

    plannedDischargeMin(): string {
        return hospitalizationPlannedDischargeMin(this.form.controls.admittedAtLocal.value, this.datetimeLocalInputMin);
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
            examinationId: v.examinationId,
            // Değişmediyse gönderme: sunucu mevcut bağı korur veya yeni muayenenin gelişini miras alır (sözleşme §2).
            visitId: v.visitId !== this.loadedVisitId() ? v.visitId : null,
            // Oda değişmediyse dokunulmaz; yeni oda `roomId`, "Konum yok" `clearRoom` + konum metni temizlenir (sözleşme §10.4).
            // Tanımlar yüklenemediyse seçici kayıtlı odayı gösteremez; boş seçim oda bağını kaldırmasın diye alanlar gönderilmez.
            ...(this.roomSelectionHydrated() ? hospitalizationRoomWriteFields(v.roomId, this.loadedRoomId()) : {}),
            rowVersion: this.rowVersion
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
                    this.conflict.set(parsed.isConcurrencyConflict);
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

    private loadWards(): void {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            return;
        }

        this.loadingWards.set(true);
        this.wardsError.set(null);
        this.wardsService.listWards(clinicId).subscribe({
            next: (wards) => {
                this.wards.set(wards);
                this.loadingWards.set(false);
                this.applyLoadedRoomSelection();
            },
            error: (e: unknown) => {
                this.wardsError.set(this.mapLoadError(e, 'Yatış konumları yüklenemedi.'));
                this.loadingWards.set(false);
            }
        });
    }

    /** Kayıtlı oda seçicide gösterilebiliyor mu (odasız kayıt her zaman hazır). */
    private roomSelectionHydrated(): boolean {
        return !this.loadedRoomId() || !!hospitalizationWardIdForRoom(this.wards(), this.loadedRoomId());
    }

    /** Kayıt ve tanımlar ayrı yüklenir; ikisi de geldiğinde kayıtlı oda (ve bölümü) seçiciye yazılır. */
    private applyLoadedRoomSelection(): void {
        if (!this.roomSelectionHydrated()) {
            // Tanımlar henüz gelmedi ya da oda listede yok; mevcut bağ korunur, seçici boş kalır.
            return;
        }

        const roomId = this.loadedRoomId();
        const wardId = hospitalizationWardIdForRoom(this.wards(), roomId);

        this.selectedWardId.set(wardId);
        this.form.patchValue({ wardId, roomId }, { emitEvent: false });
        this.syncRoomSelectState(wardId);
    }

    private syncRoomSelectState(wardId: string): void {
        if (wardId) {
            this.form.controls.roomId.enable({ emitEvent: false });
        } else {
            this.form.controls.roomId.disable({ emitEvent: false });
        }
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

                this.examinationOptions.set(ex.items.map(hospitalizationExaminationOption));
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

            this.examinationOptions.set(items.map(hospitalizationExaminationOption));
            this.form.controls.examinationId.setValue(exW, { emitEvent: false });
            this.examinationFinalized.set(!!exW && items.some((e) => e.id === exW && e.status === 'Finalized'));
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
