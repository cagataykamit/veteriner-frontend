import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/features/clients/components/client-search.component';
import { PetSearchComponent } from '@/app/features/pets/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { mapAppointmentUpsertFormToUpdateRequest } from '@/app/features/appointments/data/appointment.mapper';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { type AppointmentUpsertFieldErrors, type AppointmentUpsertFormFieldKey, parseAppointmentUpsertHttpError } from '@/app/features/appointments/utils/appointment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromClinicResolutionHttpError } from '@/app/features/appointments/utils/clinic-resolution-error.utils';
import { APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/features/appointments/utils/appointment-type.utils';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import { APPOINTMENT_NOTES_MAX_LENGTH, appointmentLatestDateYmd } from '@/app/features/appointments/utils/appointment-schedule-validation.utils';
import type { ClinicWorkingHourVm } from '@/app/features/clinics/models/clinic-working-hours-vm.model';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { fromIstanbulDateAndTimeToUtcIso, toIstanbulDateInputValue, toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';
import { DATE_INPUT_MAX, DATE_INPUT_MIN, dateYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-appointment-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        ClientSearchComponent,
        PetSearchComponent,
        DateInputComponent,
        AppStatusTagComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading()) {
            <app-loading-state message="Randevu düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header [categoryLink]="backLink()" [categoryLinkLabel]="backLabel()" title="Randevuyu Düzenle" description="Randevu kaydını güncelleyin." />

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
                            <label for="scheduledDate" class="block text-sm font-medium text-muted-color mb-2">Randevu tarihi *</label>
                            <app-date-input inputId="scheduledDate" type="date" formControlName="scheduledDate" [min]="dateInputMin" [max]="maxScheduledDate()" />
                            @if (form.controls.scheduledDate.hasError('dateYearInvalid') && form.controls.scheduledDate.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                            } @else if (apiFieldErrors().scheduledAtLocal) {
                                <small class="text-red-500">{{ apiFieldErrors().scheduledAtLocal }}</small>
                            } @else if (form.controls.scheduledDate.invalid && form.controls.scheduledDate.touched) {
                                <small class="text-red-500">Randevu tarihi seçilmelidir.</small>
                            }
                        </div>
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
                                [disabled]="timeOptions().length === 0 || !!workingHoursLoadError()"
                            />
                            @if (form.controls.scheduledTime.invalid && form.controls.scheduledTime.touched) {
                                <small class="text-red-500">Randevu saati seçilmelidir.</small>
                            } @else if (workingHoursLoadError(); as whErr) {
                                <small class="text-red-500">{{ whErr }}</small>
                            } @else if (form.controls.scheduledDate.value && timeOptions().length === 0) {
                                <small class="text-amber-600">Seçilen gün için uygun randevu saati bulunmuyor.</small>
                            }
                            @if (clinicSlotIntervalMinutes(); as startIntervalMinutes) {
                                <small class="block text-muted-color mt-1">Bu klinikte randevular {{ startIntervalMinutes }} dakikalık aralıklarla başlatılır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="durationMinutes" class="block text-sm font-medium text-muted-color mb-2">Randevu süresi (dakika) *</label>
                            <input id="durationMinutes" type="number" class="w-full p-inputtext p-component" formControlName="durationMinutes" min="5" max="240" step="1" />
                            @if (apiFieldErrors().durationMinutes) {
                                <small class="text-red-500">{{ apiFieldErrors().durationMinutes }}</small>
                            } @else if (form.controls.durationMinutes.invalid && form.controls.durationMinutes.touched) {
                                <small class="text-red-500">Randevu süresi 5 ile 240 dakika arasında olmalıdır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="appointmentType" class="block text-sm font-medium text-muted-color mb-2">Randevu Türü *</label>
                            <p-select inputId="appointmentType" formControlName="appointmentType" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Randevu Türü seçin" [showClear]="true" class="w-full" />
                            @if (apiFieldErrors().appointmentType) {
                                <small class="text-red-500">{{ apiFieldErrors().appointmentType }}</small>
                            } @else if (form.controls.appointmentType.invalid && form.controls.appointmentType.touched) {
                                <small class="text-red-500">Randevu Türü seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <span id="statusLabel" class="block text-sm font-medium text-muted-color mb-2">Durum</span>
                            <div class="flex min-h-10 items-center" role="group" aria-labelledby="statusLabel" data-testid="appointment-status">
                                <app-status-tag [label]="statusLabel(form.controls.status.value)" [severity]="statusSeverity(form.controls.status.value)" />
                            </div>
                            <small class="block text-muted-color mt-1">Durum bu formdan değiştirilmez; iptal randevu listesinden, tamamlama muayeneyle yapılır.</small>
                            @if (apiFieldErrors().status) {
                                <small class="block text-red-500">{{ apiFieldErrors().status }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                            <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                            @if (apiFieldErrors().notes) {
                                <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                            } @else if (form.controls.notes.invalid && form.controls.notes.touched) {
                                <small class="text-red-500">Notlar en fazla {{ notesMaxLength }} karakter olabilir.</small>
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
export class AppointmentEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;
    protected readonly dateInputMax = DATE_INPUT_MAX;

    maxScheduledDate(): string {
        return appointmentLatestDateYmd();
    }

    private readonly fb = inject(FormBuilder);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<AppointmentUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');
    readonly clinicSlotIntervalMinutes = signal<number | null>(null);
    readonly timeOptions = signal<SelectOption[]>([]);
    readonly workingHoursLoadError = signal<string | null>(null);
    readonly returnUrl = signal<string | null>(null);
    readonly backLabel = signal('Randevu listesine dön');
    readonly backLink = computed(() => this.router.parseUrl(this.returnUrl() ?? '/panel/appointments'));

    private appointmentId = '';
    private workingHours: ClinicWorkingHourVm[] = [];
    private legacyInitialTime: string | null = null;

    readonly typeOptions = [...APPOINTMENT_TYPE_WRITE_OPTIONS];
    readonly notesMaxLength = APPOINTMENT_NOTES_MAX_LENGTH;

    /** Durum salt okunur rozet: `PUT` her durum değişimini reddeder (`Appointments.InvalidStatusTransition`); iptal/gelmedi kendi uçlarıyla, tamamlama muayeneyle. */
    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;

    readonly form = this.fb.group({
        clientId: this.fb.nonNullable.control('', Validators.required),
        petId: this.fb.nonNullable.control({ value: '', disabled: true }, Validators.required),
        scheduledDate: this.fb.nonNullable.control('', [Validators.required, dateYearRangeValidator()]),
        scheduledTime: this.fb.nonNullable.control('', Validators.required),
        durationMinutes: this.fb.nonNullable.control<number | string>(30, [Validators.required, Validators.min(5), Validators.max(240), Validators.pattern(/^[0-9]+$/)]),
        appointmentType: this.fb.control<number | null>(null, Validators.required),
        /** Yüklenen mevcut durum; `PUT` gövdesinde aynen geri gönderilir. */
        status: this.fb.control<number | null>(null, Validators.required),
        notes: this.fb.nonNullable.control('', Validators.maxLength(APPOINTMENT_NOTES_MAX_LENGTH))
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
        this.form.controls.durationMinutes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('durationMinutes'));
        this.form.controls.appointmentType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('appointmentType'));
        this.form.controls.notes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('notes'));
    }

    ngOnInit(): void {
        this.readReturnContext();
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.loadSlotIntervalHint();
        this.loadWorkingHours();
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        if (!id) {
            this.loadError.set('Geçersiz randevu.');
            this.loading.set(false);

            return;
        }

        this.appointmentId = id;

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
        this.form.controls.scheduledDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());
        this.form.controls.durationMinutes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());

        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.appointmentsService.getAppointmentForEditById(this.appointmentId).subscribe({
            next: (x) => {
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        scheduledDate: toIstanbulDateInputValue(x.scheduledAtUtc),
                        scheduledTime: toIstanbulTimeInputValue(x.scheduledAtUtc),
                        durationMinutes: x.durationMinutes,
                        appointmentType: x.appointmentType,
                        status: x.status,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );

                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.form.controls.petId.setValue(x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                }

                this.legacyInitialTime = this.form.controls.scheduledTime.value.trim() || null;
                this.rebuildTimeOptions();
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Randevu bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
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

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const appointmentType = v.appointmentType;

        if (appointmentType === null || appointmentType === undefined) {
            this.form.markAllAsTouched();
            this.submitError.set('Randevu Türü seçin.');

            return;
        }

        const statusNum = v.status;

        if (statusNum === null || statusNum === undefined || ![0, 1, 2, 3].includes(statusNum)) {
            this.submitError.set('Randevu durumu okunamadı; sayfayı yenileyin.');

            return;
        }

        const durationMinutes = Math.trunc(Number(v.durationMinutes));

        if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
            this.form.markAllAsTouched();
            this.submitError.set('Randevu süresi 5 ile 240 dakika arasında olmalıdır.');

            return;
        }

        const payload = mapAppointmentUpsertFormToUpdateRequest(this.appointmentId, {
            clinicId,
            petId: v.petId,
            scheduledAtUtc,
            durationMinutes,
            appointmentType,
            status: statusNum,
            notes: v.notes
        });

        this.submitting.set(true);
        this.appointmentsService.updateAppointment(this.appointmentId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/appointments', this.appointmentId], {
                    queryParams: {
                        saved: '1',
                        ...(this.returnContextQueryParams() ?? {})
                    }
                });
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

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        const safeUrl = this.returnUrl();

        if (safeUrl) {
            void this.router.navigateByUrl(safeUrl);

            return;
        }

        void this.router.navigate(['/panel/appointments', this.appointmentId], {
            queryParams: this.returnContextQueryParams() ?? undefined
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }

    private loadSlotIntervalHint(): void {
        const clinicId = this.auth.getClinicId()?.trim();

        if (!clinicId) {
            this.clinicSlotIntervalMinutes.set(null);
            this.rebuildTimeOptions();

            return;
        }

        this.clinicsApi.getAppointmentSettings(clinicId).subscribe({
            next: (settings) => {
                this.clinicSlotIntervalMinutes.set(settings.slotIntervalMinutes);
                this.rebuildTimeOptions();
            },
            error: () => {
                this.clinicSlotIntervalMinutes.set(null);
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
                this.rebuildTimeOptions();
            },
            error: () => {
                this.workingHours = [];
                this.workingHoursLoadError.set('Çalışma saatleri alınamadı.');
                this.rebuildTimeOptions();
            }
        });
    }

    private rebuildTimeOptions(): void {
        const date = this.form.controls.scheduledDate.value.trim();
        const duration = Math.trunc(Number(this.form.controls.durationMinutes.value));
        const interval = this.clinicSlotIntervalMinutes() ?? 15;
        const legacy = this.legacyInitialTime?.trim() || null;

        if (!date || !Number.isFinite(duration) || duration < 5 || duration > 240 || interval <= 0) {
            this.timeOptions.set(legacy ? [{ value: legacy, label: `Mevcut saat: ${legacy}` }] : []);

            if (!legacy) {
                this.form.controls.scheduledTime.setValue('', { emitEvent: false });
            }

            return;
        }

        if (this.workingHours.length === 0) {
            this.timeOptions.set(legacy ? [{ value: legacy, label: `Mevcut saat: ${legacy}` }] : []);

            return;
        }

        const day = this.resolveWorkingDay(date);

        if (!day || day.isClosed) {
            this.timeOptions.set(legacy ? [{ value: legacy, label: `Mevcut saat: ${legacy}` }] : []);

            if (!legacy) {
                this.form.controls.scheduledTime.setValue('', { emitEvent: false });
            }

            return;
        }

        const options = this.buildTimeOptions(day, duration, interval);
        let selected = this.form.controls.scheduledTime.value.trim();

        if (!selected && legacy) {
            selected = legacy;
            this.form.controls.scheduledTime.setValue(legacy, { emitEvent: false });
        }

        if (selected && !options.some((o) => o.value === selected)) {
            options.unshift({ value: selected, label: `Mevcut saat: ${selected}` });
        }

        this.timeOptions.set(options);

        if (selected && !options.some((o) => o.value === selected)) {
            this.form.controls.scheduledTime.setValue('', { emitEvent: false });
            this.legacyInitialTime = null;
        }
    }

    private resolveWorkingDay(dateYmd: string): ClinicWorkingHourVm | null {
        const date = new Date(`${dateYmd}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        const dow = date.getDay();

        return this.workingHours.find((x) => x.dayOfWeek === dow) ?? null;
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

    private returnContextQueryParams(): Record<string, string> | null {
        const url = this.returnUrl();

        if (!url) {
            return null;
        }

        return { returnUrl: url, returnLabel: this.backLabel() };
    }

    private readReturnContext(): void {
        const query = this.route.snapshot.queryParamMap;
        const safeUrl = this.normalizeSafeReturnUrl(query.get('returnUrl'));

        this.returnUrl.set(safeUrl);

        if (safeUrl) {
            const label = query.get('returnLabel')?.trim();

            this.backLabel.set(label || 'Randevu takvimine dön');

            return;
        }

        this.backLabel.set('Randevu listesine dön');
    }

    private normalizeSafeReturnUrl(raw: string | null): string | null {
        const value = raw?.trim();

        if (!value) {
            return null;
        }

        if (!value.startsWith('/panel/')) {
            return null;
        }

        return value;
    }
}
