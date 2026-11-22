import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, type ParamMap, Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { injectReturnTarget } from '@/app/shared/utils/return-target.utils';
import { prefillPetFromRoute } from '@/app/shared/panel/examination-create-route-context.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { mapAppointmentUpsertFormToCreateRequest } from '@/app/entities/appointment/data/appointment.mapper';
import { panelBookingHours } from '@/app/entities/clinic/data/clinic-working-hours.mapper';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { type AppointmentUpsertFieldErrors, type AppointmentUpsertFormFieldKey, parseAppointmentUpsertHttpError } from '@/app/features/appointments/utils/appointment-upsert-validation-parse.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import {
    APPOINTMENT_NOTES_MAX_LENGTH,
    APPOINTMENT_TOO_FAR_PAST_MESSAGE,
    APPOINTMENT_TOO_FAR_FUTURE_MESSAGE,
    appointmentCreateScheduleDateValidator,
    appointmentEarliestDateYmd,
    appointmentLatestDateYmd,
    filterAllowedIstanbulTimeOptions,
    isIstanbulDateTimeTooFarInFuture,
    isIstanbulDateTimeTooFarInPast,
    istanbulTodayYmd
} from '@/app/features/appointments/utils/appointment-schedule-validation.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { addGregorianDaysToYmd, formatDateDisplay, fromIstanbulDateAndTimeToUtcIso } from '@/app/shared/utils/date.utils';
import { DATE_INPUT_MAX, dateYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { messageFromClinicResolutionHttpError } from '@/app/features/appointments/utils/clinic-resolution-error.utils';
import { APPOINTMENT_TYPE_DEFAULT, APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/entities/appointment/utils/appointment-type.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentReasonVetFieldsComponent } from '@/app/features/appointments/components/appointment-reason-vet-fields.component';
import { AppointmentResourceFieldsComponent } from '@/app/features/appointments/components/appointment-resource-fields.component';
import { FocusFirstFieldDirective } from '@/app/shared/ui/focus-first-field/focus-first-field.directive';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { FormFieldComponent } from '@/app/shared/forms/form-field/form-field.component';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import type { StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentSlotPickerComponent, toSlotPickerDays, type SlotPick } from '@/app/features/appointments/components/appointment-slot-picker.component';

/** İlk uygun randevu günü en fazla bu kadar gün ileride aranır; boş saat şeridi de bu kadar günü gösterir (sunucu üst sınırı). */
const APPOINTMENT_PREFILL_LOOKAHEAD_DAYS = 14;

interface AppointmentSlot {
    date: string;
    time: string;
    label: string;
}

@Component({
    selector: 'app-appointment-new-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, AppPageHeaderComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent, AppointmentReasonVetFieldsComponent, AppointmentResourceFieldsComponent, FocusFirstFieldDirective, FormFieldComponent, FormSubmitDirective, FormErrorSummaryComponent, ReadOnlyReasonDirective, AppointmentSlotPickerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/appointments" categoryLinkLabel="Randevu listesine dön" title="Yeni randevu" description="Randevu kaydı oluşturun." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; randevu oluşturulamaz.</p>
            }
            @if (selectionError()) {
                <p class="text-danger mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
            <form appFormSubmit appFocusFirstField [formGroup]="form" (ngSubmit)="onSubmit()">
                <app-form-error-summary />
                <div class="grid grid-cols-12 gap-4">
                    <app-form-field class="col-span-12 md:col-span-6" label="Müşteri" fieldId="clientId" [error]="apiFieldErrors().clientId ? apiFieldErrors().clientId : form.controls.clientId.invalid && form.controls.clientId.touched ? 'Müşteri seçimi zorunludur.' : null" [required]="true">
                        <app-client-search inputId="clientId" formControlName="clientId" />
                    </app-form-field>
                    <app-form-field class="col-span-12 md:col-span-6" label="Hasta" fieldId="petId" [error]="apiFieldErrors().petId ? apiFieldErrors().petId : form.controls.petId.invalid && form.controls.petId.touched ? 'Hasta seçimi zorunludur.' : null" [required]="true">
                        <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" [activeOnly]="true" />
                    </app-form-field>
                    <app-form-field class="col-span-12 md:col-span-6" label="Randevu tarihi" fieldId="scheduledDate" [error]="form.controls.scheduledDate.hasError('dateYearInvalid') && form.controls.scheduledDate.touched ? 'Yıl 4 haneli olmalıdır.' : apiFieldErrors().scheduledAtLocal ? apiFieldErrors().scheduledAtLocal : form.controls.scheduledDate.hasError('tooFarPast') && form.controls.scheduledDate.touched ? 'En fazla 7 gün öncesine kadar randevu açılabilir.' : form.controls.scheduledDate.hasError('tooFarFuture') && form.controls.scheduledDate.touched ? 'En fazla 2 yıl ileriye randevu açılabilir.' : form.controls.scheduledDate.hasError('required') && form.controls.scheduledDate.touched ? 'Randevu tarihi seçilmelidir.' : null" [required]="true">
                        <app-date-input inputId="scheduledDate" type="date" formControlName="scheduledDate" [min]="minScheduledDate()" [max]="maxScheduledDate()" />
                    </app-form-field>
                    <div class="col-span-12 md:col-span-6">
                        <label for="scheduledTime" class="block text-sm font-medium text-muted-color mb-2">Randevu saati *</label>
                        <p-select
                            inputId="scheduledTime"
                            formControlName="scheduledTime"
                            [options]="timeOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Randevu saati seçin"
                            [showClear]="true"
                            class="w-full vet-time-select"
                            panelStyleClass="vet-time-select-panel"
                        />
                        @if (form.controls.scheduledTime.invalid && form.controls.scheduledTime.touched) {
                            <small class="text-danger">Randevu saati seçilmelidir.</small>
                        } @else if (workingHoursLoadError(); as whErr) {
                            <small class="text-danger">{{ whErr }}</small>
                        } @else if (form.controls.scheduledDate.value && timeOptions().length === 0) {
                            <small class="text-amber-600">Seçilen gün için uygun randevu saati bulunmuyor.</small>
                            @if (nextAvailableSlot(); as next) {
                                <button pButton type="button" size="small" [text]="true" class="p-0 mt-1" data-testid="appointment-next-slot" (click)="selectSlot(next)">
                                    <i class="p-button-icon pi pi-calendar-plus"></i>İlk uygun gün: {{ next.label }}
                                </button>
                            }
                        }
                        @if (clinicSlotIntervalMinutes(); as startIntervalMinutes) {
                            <small class="block text-muted-color mt-1">Bu klinikte randevular {{ startIntervalMinutes }} dakikalık aralıklarla başlatılır.</small>
                        }
                    </div>
                    @if (availability() !== null) {
                        <app-appointment-slot-picker
                            class="col-span-12"
                            [days]="slotDays()"
                            [date]="form.controls.scheduledDate.value"
                            [time]="form.controls.scheduledTime.value"
                            [disabled]="ro.mutationBlocked()"
                            (dateChange)="pickSlotDay($event)"
                            (timePick)="pickSlot($event)"
                        />
                    }
                    <app-form-field class="col-span-12 md:col-span-6" label="Randevu süresi (dakika)" fieldId="durationMinutes" [error]="apiFieldErrors().durationMinutes ? apiFieldErrors().durationMinutes : form.controls.durationMinutes.invalid && form.controls.durationMinutes.touched ? 'Randevu süresi 5 ile 240 dakika arasında olmalıdır.' : null" [required]="true">
                        <input id="durationMinutes" type="number" class="w-full p-inputtext p-component" formControlName="durationMinutes" min="5" max="240" step="1" />
                    </app-form-field>
                    <app-form-field class="col-span-12 md:col-span-6" label="Randevu türü" fieldId="appointmentType" [error]="apiFieldErrors().appointmentType ? apiFieldErrors().appointmentType : form.controls.appointmentType.invalid && form.controls.appointmentType.touched ? 'Randevu türü seçimi zorunludur.' : null" [required]="true">
                        <p-select inputId="appointmentType" formControlName="appointmentType" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Randevu türü seçin" [showClear]="true" class="w-full" />
                    </app-form-field>
                    <div class="col-span-12">
                        <app-appointment-reason-vet-fields [clinicId]="activeClinicId" [preselectSelf]="true" [reasonControl]="form.controls.reasonId" [vetControl]="form.controls.veterinarianUserId" (durationSuggested)="form.controls.durationMinutes.setValue($event)" />
                    </div>
                    <div class="col-span-12">
                        <app-appointment-resource-fields [clinicId]="activeClinicId" [roomControl]="form.controls.roomResourceId" [equipmentControl]="form.controls.equipmentResourceId" />
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (apiFieldErrors().notes) {
                            <small class="text-danger">{{ apiFieldErrors().notes }}</small>
                        } @else if (form.controls.notes.invalid && form.controls.notes.touched) {
                            <small class="text-danger">Notlar en fazla {{ notesMaxLength }} karakter olabilir.</small>
                        }
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-danger mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <button pButton type="submit" [disabled]="submitting() || ro.mutationBlocked() || timeOptions().length === 0 || !!workingHoursLoadError()" appReadOnlyReason><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
                    <button pButton type="button" severity="secondary" (click)="goBack()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                </div>
            </form>
        </div>
    `
})
export class AppointmentNewPageComponent implements OnInit, HasUnsavedChanges {
    protected readonly dateInputMax = DATE_INPUT_MAX;

    private readonly fb = inject(FormBuilder);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly bookingApi = inject(OnlineBookingService);
    private readonly router = inject(Router);
    /** İptal: geldiği yer (`returnUrl`, önceki sayfa, bağlamdaki kart), yoksa liste. */
    private readonly returnTarget = injectReturnTarget('/panel/appointments');
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<AppointmentUpsertFieldErrors>({});

    readonly activeClinicLabel = signal<string>('Belirlenmedi');
    readonly clinicSlotIntervalMinutes = signal<number | null>(null);
    readonly timeOptions = signal<SelectOption[]>([]);
    /** Seçilen günde uygun saat yoksa önerilecek ilk uygun gün (seçilen günden itibaren). */
    readonly nextAvailableSlot = signal<AppointmentSlot | null>(null);
    readonly workingHoursLoadError = signal<string | null>(null);
    private workingHours: ClinicWorkingHourVm[] = [];
    /** Klinik çalışma saati kısıtı (randevu ayarı); kapalıysa günün her saati seçilebilir. */
    private enforceWorkingHours = true;
    /** İlk uygun gün/saat önden seçimi için çalışma saatleri ve randevu ayarı yüklendi mi; seçim bir kez yapılır. */
    private workingHoursLoaded = false;
    private appointmentSettingsLoaded = false;
    private schedulePrefillDone = false;

    /**
     * Boş saatler (O9): seçili nedenin süresiyle sunucunun müsaitlik hesabı (çalışma saati, mola, hekim çakışması). `null`:
     * henüz yüklenmedi ya da alınamadı; o zaman yalnız çalışma saatine göre saat listesi kalır.
     */
    readonly availability = signal<StaffAvailabilityDayVm[] | null>(null);
    private availabilitySettled = false;
    /** Neden hızlı değişirse önceki yanıt sonrakini ezmesin. */
    private availabilitySub?: Subscription;
    private readonly selectedVetId = signal<string | null>(null);
    readonly slotDays = computed(() => toSlotPickerDays(this.availability() ?? [], this.selectedVetId()));
    /** Önden seçilen gün/saat; kullanıcı değiştirmediyse hekim ya da neden değişince ilk boş saate kaydırılır. */
    private autoSlot: SlotPick | null = null;

    readonly typeOptions = [...APPOINTMENT_TYPE_WRITE_OPTIONS];
    readonly notesMaxLength = APPOINTMENT_NOTES_MAX_LENGTH;

    /** Neden ve hekim seçenekleri aktif klinikten. */
    readonly activeClinicId = this.auth.getClinicId()?.trim() ?? '';

    readonly form = this.fb.group({
        clientId: this.fb.nonNullable.control('', Validators.required),
        petId: this.fb.nonNullable.control({ value: '', disabled: true }, Validators.required),
        scheduledDate: this.fb.nonNullable.control('', [Validators.required, appointmentCreateScheduleDateValidator(), dateYearRangeValidator()]),
        scheduledTime: this.fb.nonNullable.control('', Validators.required),
        durationMinutes: this.fb.nonNullable.control<number | string>(30, [Validators.required, Validators.min(5), Validators.max(240), Validators.pattern(/^[0-9]+$/)]),
        appointmentType: this.fb.control<number | null>(APPOINTMENT_TYPE_DEFAULT, Validators.required),
        notes: this.fb.nonNullable.control('', Validators.maxLength(APPOINTMENT_NOTES_MAX_LENGTH)),
        reasonId: this.fb.control<string | null>(null),
        veterinarianUserId: this.fb.control<string | null>(null),
        roomResourceId: this.fb.control<string | null>(null),
        equipmentResourceId: this.fb.control<string | null>(null)
    });

    constructor() {
        const clearApiError = (f: AppointmentUpsertFormFieldKey): void => {
            const cur = this.apiFieldErrors();

            if (cur[f]) {
                const next = { ...cur };

                delete next[f];
                this.apiFieldErrors.set(next);
            }
        };

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('clientId'));
        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('petId'));
        this.form.controls.scheduledDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('scheduledAtLocal'));
        this.form.controls.scheduledTime.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('scheduledAtLocal'));
        this.form.controls.appointmentType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('appointmentType'));
        this.form.controls.durationMinutes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('durationMinutes'));
        this.form.controls.notes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('notes'));
        this.form.controls.veterinarianUserId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((vet) => {
            this.selectedVetId.set(vet?.trim() || null);
            this.followAutoSlot();
        });
        this.form.controls.reasonId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadAvailability());

        effect(() => {
            this.timeOptions();
            this.ro.mutationBlocked();
            this.syncScheduledTimeDisabledState();
        });
    }

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.loadDefaultDurationFromClinic();
        this.loadWorkingHours();
        this.loadAvailability();
        this.form.controls.scheduledDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());
        this.form.controls.durationMinutes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);

            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }

            const id = trimClientIdControlValue(this.form.controls.clientId.value);

            if (!id) {
                this.form.controls.petId.disable({ emitEvent: false });

                return;
            }

            this.form.controls.petId.enable({ emitEvent: false });
        });

        const query = this.route.snapshot.queryParamMap;

        if (!prefillPetFromRoute(query, this.form.controls.clientId, this.form.controls.petId)) {
            // Müşteri kartındaki "Randevu al": yalnız müşteri gelir, hayvan formda seçilir.
            const clientId = query.get('clientId')?.trim();

            if (clientId) {
                this.form.controls.clientId.setValue(clientId);
            }
        }

        this.prefillScheduleFromRoute(query);
        this.syncScheduledTimeDisabledState();
    }

    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

    goBack(): void {
        void this.router.navigateByUrl(this.returnTarget.url);
    }

    maxScheduledDate(): string {
        return appointmentLatestDateYmd();
    }

    minScheduledDate(): string {
        return appointmentEarliestDateYmd();
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const scheduledAtUtc = fromIstanbulDateAndTimeToUtcIso(v.scheduledDate, v.scheduledTime);

        if (!scheduledAtUtc) {
            this.submitError.set('Geçerli bir tarih ve saat seçin.');

            return;
        }

        if (isIstanbulDateTimeTooFarInPast(v.scheduledDate, v.scheduledTime)) {
            this.form.markAllAsTouched();
            this.submitError.set(APPOINTMENT_TOO_FAR_PAST_MESSAGE);

            return;
        }

        if (isIstanbulDateTimeTooFarInFuture(v.scheduledDate, v.scheduledTime)) {
            this.form.markAllAsTouched();
            this.submitError.set(APPOINTMENT_TOO_FAR_FUTURE_MESSAGE);

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const appointmentType = v.appointmentType;

        if (appointmentType === null || appointmentType === undefined) {
            this.form.markAllAsTouched();
            this.submitError.set('Randevu türü seçin.');

            return;
        }

        const durationMinutes = Math.trunc(Number(v.durationMinutes));

        if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
            this.form.markAllAsTouched();
            this.submitError.set('Randevu süresi 5 ile 240 dakika arasında olmalıdır.');

            return;
        }

        const payload = mapAppointmentUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            scheduledAtUtc,
            durationMinutes,
            appointmentType,
            notes: v.notes,
            reasonId: v.reasonId,
            veterinarianUserId: v.veterinarianUserId,
            roomResourceId: v.roomResourceId,
            equipmentResourceId: v.equipmentResourceId
        });

        this.submitting.set(true);
        this.appointmentsService.createAppointment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.form.markAsPristine();
                void this.router.navigate(['/panel/appointments', id], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const clinicMsg = messageFromClinicResolutionHttpError(e);

                    if (clinicMsg) {
                        this.submitError.set(clinicMsg);

                        return;
                    }

                    const parsed = parseAppointmentUpsertHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
            }
        });
    }

    private loadDefaultDurationFromClinic(): void {
        const clinicId = this.auth.getClinicId()?.trim();

        if (!clinicId) {
            this.form.patchValue({ durationMinutes: 30 });
            this.clinicSlotIntervalMinutes.set(null);

            return;
        }

        this.clinicsApi.getAppointmentSettings(clinicId).subscribe({
            next: (s) => {
                this.form.patchValue({ durationMinutes: s.defaultAppointmentDurationMinutes });
                this.clinicSlotIntervalMinutes.set(s.slotIntervalMinutes);
                this.enforceWorkingHours = s.enforceWorkingHours;
                this.appointmentSettingsLoaded = true;
                this.rebuildTimeOptions();
            },
            error: () => {
                this.form.patchValue({ durationMinutes: 30 });
                this.clinicSlotIntervalMinutes.set(null);
                this.appointmentSettingsLoaded = true;
                this.rebuildTimeOptions();
            }
        });
    }

    private loadWorkingHours(): void {
        const clinicId = this.auth.getClinicId()?.trim();

        if (!clinicId) {
            this.workingHours = [];
            this.workingHoursLoadError.set('Çalışma saatleri alınamadı.');
            this.rebuildTimeOptions();

            return;
        }

        this.workingHoursLoadError.set(null);
        this.clinicsApi.getWorkingHours(clinicId).subscribe({
            next: (items) => {
                this.workingHours = items;
                this.workingHoursLoadError.set(null);
                this.workingHoursLoaded = true;
                this.rebuildTimeOptions();
            },
            error: () => {
                this.workingHours = [];
                this.workingHoursLoadError.set('Çalışma saatleri alınamadı.');
                this.rebuildTimeOptions();
            }
        });
    }

    private syncScheduledTimeDisabledState(): void {
        const control = this.form.controls.scheduledTime;
        const shouldDisable = this.timeOptions().length === 0 || this.ro.mutationBlocked();

        if (shouldDisable) {
            control.disable({ emitEvent: false });

            return;
        }

        control.enable({ emitEvent: false });
    }

    /**
     * Takvimde boş hücre / boş saat: `date` (yyyy-MM-dd), `time` (HH:mm) ve `vet` (hekim kimliği) formu doldurur. Tarih geldiyse "ilk
     * uygun saat" önerisi yapılmaz; saat, o günün seçeneklerinde yoksa saat seçimi boş kalır. Takvimdeki aşıdan "Randevu ver":
     * `type` (randevu türü sayısı) ve `notes` da gelir. Kaynak sütunundan `room` ya da `equipment` (kaynak kimliği).
     */
    private prefillScheduleFromRoute(query: ParamMap): void {
        const date = query.get('date')?.trim() ?? '';
        const time = query.get('time')?.trim() ?? '';
        const vet = query.get('vet')?.trim() ?? '';
        const type = Number(query.get('type'));
        const notes = query.get('notes')?.trim() ?? '';

        if (query.has('type') && this.typeOptions.some((o) => o.value === type)) {
            this.form.controls.appointmentType.setValue(type);
        }

        if (notes) {
            this.form.controls.notes.setValue(notes.slice(0, this.notesMaxLength));
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            this.form.controls.scheduledDate.setValue(date);

            if (/^\d{2}:\d{2}$/.test(time)) {
                this.form.controls.scheduledTime.setValue(time);
            }
        }

        if (vet) {
            this.form.controls.veterinarianUserId.setValue(vet);
        }

        // Takvimin "Oda ve cihaz" görünümünde boş hücre: sütunun kaynağı (ADR-053 K8).
        const room = query.get('room')?.trim();
        const equipment = query.get('equipment')?.trim();

        if (room) {
            this.form.controls.roomResourceId.setValue(room);
        }

        if (equipment) {
            this.form.controls.equipmentResourceId.setValue(equipment);
        }
    }

    /** Seçilen gün uygun değilse önerilen ilk uygun gün ve saat. */
    selectSlot(slot: SlotPick): void {
        this.form.controls.scheduledDate.setValue(slot.date);
        this.form.controls.scheduledTime.setValue(slot.time);
    }

    /** Boş saat düğmesi: tarih ve saat tek dokunuşla dolar. */
    pickSlot(slot: SlotPick): void {
        this.selectSlot(slot);
        this.form.markAsDirty();
    }

    /** Gün şeridi: gün değişir, o günün ilk boş saati seçilir (saat listesinden yine değiştirilebilir). */
    pickSlotDay(date: string): void {
        const first = this.slotDays().find((d) => d.date === date)?.times[0];

        this.form.controls.scheduledDate.setValue(date);

        if (first) {
            this.form.controls.scheduledTime.setValue(first);
        }

        this.form.markAsDirty();
    }

    /**
     * Tarih boşsa ilk boş saat önden seçilir (H1, O9): müsaitlik alındıysa ondan (dolu saat atlanır), alınamadıysa bugünden
     * başlayarak çalışma saatine göre ilk açık gün ve o günün ilk uygun saati; bugün saat geçtiyse sonraki gün.
     */
    private prefillFirstAvailableSlot(): void {
        if (this.schedulePrefillDone || !this.workingHoursLoaded || !this.appointmentSettingsLoaded || !this.availabilitySettled) {
            return;
        }

        this.schedulePrefillDone = true;

        if (this.form.controls.scheduledDate.value.trim()) {
            return;
        }

        const slot = this.firstFreeSlot() ?? this.findFirstAvailableSlot(istanbulTodayYmd());

        if (slot) {
            this.selectSlot(slot);
            this.autoSlot = { date: slot.date, time: slot.time };
        }
    }

    private firstFreeSlot(): SlotPick | null {
        const day = this.slotDays()[0];

        return day ? { date: day.date, time: day.times[0] } : null;
    }

    /** Önden seçilen saat kullanıcı dokunmadan duruyorsa ve artık boş değilse (hekim ya da neden değişti) ilk boş saate geçilir. */
    private followAutoSlot(): void {
        const auto = this.autoSlot;
        const v = this.form.getRawValue();

        if (!auto || v.scheduledDate !== auto.date || v.scheduledTime !== auto.time || this.availability() === null) {
            return;
        }

        if (this.slotDays().some((d) => d.date === auto.date && d.times.includes(auto.time))) {
            return;
        }

        const next = this.firstFreeSlot();

        if (next) {
            this.selectSlot(next);
            this.autoSlot = next;
        }
    }

    /** Neden süreyi belirler; neden değişince boş saatler yeniden hesaplanır. Hata formu durdurmaz (saat listesi kalır). */
    private loadAvailability(): void {
        const clinicId = this.activeClinicId;

        if (!clinicId) {
            this.availabilitySettled = true;

            return;
        }

        this.availabilitySub?.unsubscribe();
        this.availabilitySub = this.bookingApi.availability(clinicId, this.form.controls.reasonId.value?.trim() || null, istanbulTodayYmd(), APPOINTMENT_PREFILL_LOOKAHEAD_DAYS).subscribe({
            next: (days) => this.settleAvailability(days),
            error: () => this.settleAvailability(null)
        });
    }

    private settleAvailability(days: StaffAvailabilityDayVm[] | null): void {
        this.availability.set(days);

        if (!this.availabilitySettled) {
            this.availabilitySettled = true;
            this.rebuildTimeOptions();

            return;
        }

        this.followAutoSlot();
    }

    /**
     * `fromYmd` gününden başlayıp en fazla `APPOINTMENT_PREFILL_LOOKAHEAD_DAYS` gün ileride ilk açık gün ve şimdiden sonraki ilk saat.
     * Dolu saatleri bilmez (müsaitlik ucu yok); çalışma saatine ve şimdiye göre bakar.
     */
    private findFirstAvailableSlot(fromYmd: string): AppointmentSlot | null {
        const duration = Math.trunc(Number(this.form.controls.durationMinutes.value));
        const interval = this.clinicSlotIntervalMinutes() ?? 15;

        if (!Number.isFinite(duration) || duration < 5 || duration > 240 || interval <= 0) {
            return null;
        }

        const now = Date.now();

        for (let offset = 0; offset < APPOINTMENT_PREFILL_LOOKAHEAD_DAYS; offset++) {
            const ymd = addGregorianDaysToYmd(fromYmd, offset);
            const hours = ymd ? this.resolveWorkingDay(ymd) : null;

            if (!ymd || !hours || hours.isClosed) {
                continue;
            }

            // Bugünün geçmiş saatleri geriye dönük kayıt için seçilebilir; öneri yalnız gelecekteki ilk saati alır.
            const first = this.buildTimeOptions(hours, duration, interval).find((o) => new Date(fromIstanbulDateAndTimeToUtcIso(ymd, o.value) ?? 0).getTime() >= now);

            if (first) {
                return { date: ymd, time: first.value, label: `${formatDateDisplay(`${ymd}T00:00:00`)} ${first.value}` };
            }
        }

        return null;
    }

    private rebuildTimeOptions(): void {
        this.prefillFirstAvailableSlot();
        const date = this.form.controls.scheduledDate.value.trim();
        const duration = Math.trunc(Number(this.form.controls.durationMinutes.value));
        const interval = this.clinicSlotIntervalMinutes() ?? 15;

        if (!date || !Number.isFinite(duration) || duration < 5 || duration > 240 || interval <= 0) {
            this.timeOptions.set([]);
            this.nextAvailableSlot.set(null);
            this.form.controls.scheduledTime.setValue('', { emitEvent: false });

            return;
        }

        const day = this.resolveWorkingDay(date);

        if (!day || day.isClosed) {
            this.timeOptions.set([]);
            this.nextAvailableSlot.set(this.findFirstAvailableSlot(date < istanbulTodayYmd() ? istanbulTodayYmd() : date));
            const selected = this.form.controls.scheduledTime.value.trim();

            if (selected) {
                this.form.controls.scheduledTime.setValue('', { emitEvent: false });
            }

            return;
        }

        const options = filterAllowedIstanbulTimeOptions(date, this.buildTimeOptions(day, duration, interval));

        this.timeOptions.set(options);
        this.nextAvailableSlot.set(options.length === 0 ? this.findFirstAvailableSlot(date < istanbulTodayYmd() ? istanbulTodayYmd() : date) : null);
        const selected = this.form.controls.scheduledTime.value.trim();

        if (selected && !options.some((o) => o.value === selected)) {
            this.form.controls.scheduledTime.setValue('', { emitEvent: false });
        }
    }

    private resolveWorkingDay(dateYmd: string): ClinicWorkingHourVm | null {
        const date = new Date(`${dateYmd}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        const dow = date.getDay();

        return panelBookingHours(this.workingHours, this.enforceWorkingHours).find((x) => x.dayOfWeek === dow) ?? null;
    }

    private buildTimeOptions(day: ClinicWorkingHourVm, durationMinutes: number, intervalMinutes: number): SelectOption[] {
        const open = this.timeToMinutes(day.opensAt);
        const close = this.timeToMinutes(day.closesAt);

        if (open === null || close === null || open >= close) {
            return [];
        }

        const breakStart = this.timeToMinutes(day.breakStartsAt);
        const breakEnd = this.timeToMinutes(day.breakEndsAt);
        const opts: SelectOption[] = [];

        for (let start = open; start < close; start += intervalMinutes) {
            const end = start + durationMinutes;

            if (end > close) {
                continue;
            }

            if (breakStart !== null && breakEnd !== null && start < breakEnd && end > breakStart) {
                continue;
            }

            const hh = String(Math.floor(start / 60)).padStart(2, '0');
            const mm = String(start % 60).padStart(2, '0');
            const hm = `${hh}:${mm}`;

            opts.push({ value: hm, label: hm });
        }

        return opts;
    }

    private timeToMinutes(value: string | null): number | null {
        if (!value?.trim()) {
            return null;
        }

        const m = value.trim().match(/^(\d{1,2}):(\d{2})/);

        if (!m) {
            return null;
        }

        const h = Number(m[1]);
        const mm = Number(m[2]);

        if (!Number.isFinite(h) || !Number.isFinite(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) {
            return null;
        }

        return h * 60 + mm;
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}
