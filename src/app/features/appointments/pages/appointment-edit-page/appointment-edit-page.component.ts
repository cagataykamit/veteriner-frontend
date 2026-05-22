import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { mapAppointmentUpsertFormToUpdateRequest } from '@/app/features/appointments/data/appointment.mapper';
import type { AppointmentEditVm } from '@/app/features/appointments/models/appointment-vm.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import {
    type AppointmentUpsertFieldErrors,
    type AppointmentUpsertFormFieldKey,
    parseAppointmentUpsertHttpError
} from '@/app/features/appointments/utils/appointment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromClinicResolutionHttpError } from '@/app/features/appointments/utils/clinic-resolution-error.utils';
import { APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/features/appointments/utils/appointment-type.utils';
import { APPOINTMENT_WRITE_STATUS_OPTIONS } from '@/app/features/appointments/utils/appointment-status.utils';
import type { ClinicWorkingHourVm } from '@/app/features/clinics/models/clinic-working-hours-vm.model';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    isStalePetListResponse,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import {
    fromIstanbulDateAndTimeToUtcIso,
    toIstanbulDateInputValue,
    toIstanbulTimeInputValue
} from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_CANCEL_CLAIM,
    APPOINTMENTS_COMPLETE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';

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
        QuickClientDialogComponent,
        QuickPetDialogComponent
    ],
    template: `
        <a href="" (click)="goBack($event)" class="text-primary font-medium no-underline inline-block mb-4">← {{ backLabel() }}</a>

        @if (loading()) {
            <app-loading-state message="Randevu düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Randevuyu Düzenle" subtitle="Operasyon" description="Randevu kaydını güncelleyin." />

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
                            <p-select
                                inputId="clientId"
                                formControlName="clientId"
                                [options]="clientOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Müşteri seçin"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                                [loading]="loadingClients()"
                            />
                            @if (apiFieldErrors().clientId) {
                                <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                            } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Müşteri seçimi zorunludur.</small>
                            }
                            <div class="flex flex-wrap gap-2 align-items-center mt-2">
                                <p-button
                                    type="button"
                                    label="Yeni müşteri"
                                    icon="pi pi-user-plus"
                                    [text]="true"
                                    styleClass="p-0"
                                    [disabled]="ro.mutationBlocked()"
                                    (onClick)="quickClientOpen.set(true)"
                                />
                            </div>
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan *</label>
                            <p-select
                                inputId="petId"
                                formControlName="petId"
                                [options]="petOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="form.controls.petId.disabled ? 'Önce müşteri seçin' : 'Hayvan seçin'"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                                [loading]="loadingPets()"
                            />
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Hayvan seçimi zorunludur.</small>
                            }
                            <div class="flex flex-wrap gap-2 align-items-center mt-2">
                                <p-button
                                    type="button"
                                    label="Bu müşteri için yeni hayvan"
                                    icon="pi pi-plus"
                                    [text]="true"
                                    styleClass="p-0"
                                    [disabled]="petQuickAddDisabled()"
                                    (onClick)="quickPetOpen.set(true)"
                                />
                            </div>
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="scheduledDate" class="block text-sm font-medium text-muted-color mb-2">Randevu tarihi *</label>
                            <input id="scheduledDate" type="date" class="w-full p-inputtext p-component" formControlName="scheduledDate" />
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
                                styleClass="w-full"
                                [disabled]="timeOptions().length === 0 || !!workingHoursLoadError()"
                            />
                            @if (apiFieldErrors().scheduledAtLocal) {
                                <small class="text-red-500">{{ apiFieldErrors().scheduledAtLocal }}</small>
                            } @else if (form.controls.scheduledDate.invalid && form.controls.scheduledDate.touched) {
                                <small class="text-red-500">Randevu tarihi seçilmelidir.</small>
                            } @else if (form.controls.scheduledTime.invalid && form.controls.scheduledTime.touched) {
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
                            <input
                                id="durationMinutes"
                                type="number"
                                class="w-full p-inputtext p-component"
                                formControlName="durationMinutes"
                                min="5"
                                max="240"
                                step="1"
                            />
                            @if (apiFieldErrors().durationMinutes) {
                                <small class="text-red-500">{{ apiFieldErrors().durationMinutes }}</small>
                            } @else if (form.controls.durationMinutes.invalid && form.controls.durationMinutes.touched) {
                                <small class="text-red-500">Randevu süresi 5 ile 240 dakika arasında olmalıdır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="appointmentType" class="block text-sm font-medium text-muted-color mb-2">Randevu Türü *</label>
                            <p-select
                                inputId="appointmentType"
                                formControlName="appointmentType"
                                [options]="typeOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Randevu Türü seçin"
                                [showClear]="true"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().appointmentType) {
                                <small class="text-red-500">{{ apiFieldErrors().appointmentType }}</small>
                            } @else if (form.controls.appointmentType.invalid && form.controls.appointmentType.touched) {
                                <small class="text-red-500">Randevu Türü seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="status" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                            <p-select
                                inputId="status"
                                formControlName="status"
                                [options]="statusOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Durum seçin"
                                [showClear]="false"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().status) {
                                <small class="text-red-500">{{ apiFieldErrors().status }}</small>
                            } @else if (form.controls.status.invalid && form.controls.status.touched) {
                                <small class="text-red-500">Durum seçimi zorunludur.</small>
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
                            [disabled]="form.invalid || submitting() || loadingClients() || loadingPets() || ro.mutationBlocked()"
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

            <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onQuickClientCreated($event)" />
            <app-quick-pet-dialog
                [(visible)]="quickPetOpen"
                [ownerClientId]="quickPetOwnerClientId()"
                (petCreated)="onQuickPetCreated($event)"
            />
        }
    `
})
export class AppointmentEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

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
    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<AppointmentUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');
    readonly clinicSlotIntervalMinutes = signal<number | null>(null);
    readonly timeOptions = signal<SelectOption[]>([]);
    readonly workingHoursLoadError = signal<string | null>(null);
    readonly returnUrl = signal<string | null>(null);
    readonly backLabel = signal('Randevu listesine dön');

    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    private appointmentId = '';
    private isInitializingClient = false;
    private editVmCache: AppointmentEditVm | null = null;
    private workingHours: ClinicWorkingHourVm[] = [];
    private legacyInitialTime: string | null = null;

    readonly typeOptions = [...APPOINTMENT_TYPE_WRITE_OPTIONS];

    readonly canCancelAppointment = this.auth.hasOperationClaim(APPOINTMENTS_CANCEL_CLAIM);
    readonly canCompleteAppointment = this.auth.hasOperationClaim(APPOINTMENTS_COMPLETE_CLAIM);
    readonly statusOptions = APPOINTMENT_WRITE_STATUS_OPTIONS.filter((x) => {
        const v = String(x.value);
        if (v === '2') {
            return this.canCancelAppointment;
        }
        if (v === '1') {
            return this.canCompleteAppointment;
        }
        return true;
    });

    readonly form = this.fb.group({
        clientId: this.fb.nonNullable.control('', Validators.required),
        petId: this.fb.nonNullable.control({ value: '', disabled: true }, Validators.required),
        scheduledDate: this.fb.nonNullable.control('', Validators.required),
        scheduledTime: this.fb.nonNullable.control('', Validators.required),
        durationMinutes: this.fb.nonNullable.control<number | string>(30, [
            Validators.required,
            Validators.min(5),
            Validators.max(240),
            Validators.pattern(/^[0-9]+$/)
        ]),
        appointmentType: this.fb.control<number | null>(null, Validators.required),
        status: this.fb.control<number | null>(null, Validators.required),
        notes: this.fb.nonNullable.control('')
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
        this.form.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('status'));
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
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(cid);
        });
        this.form.controls.scheduledDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());
        this.form.controls.durationMinutes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildTimeOptions());

        this.loadClients();
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.appointmentsService.getAppointmentForEditById(this.appointmentId).subscribe({
            next: (x) => {
                this.editVmCache = x;
                this.isInitializingClient = true;
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
                this.mergeClientOptionFromCache();
                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.loadPetsForClient(x.clientId, x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                    this.isInitializingClient = false;
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
        if (statusNum === null || statusNum === undefined || ![0, 1, 2].includes(statusNum)) {
            this.form.markAllAsTouched();
            this.submitError.set('Durum seçin.');
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

    goBack(event: Event): void {
        event.preventDefault();
        const safeUrl = this.returnUrl();
        if (safeUrl) {
            void this.router.navigateByUrl(safeUrl);
            return;
        }
        void this.router.navigate(['/panel/appointments']);
    }

    petQuickAddDisabled(): boolean {
        return (
            this.ro.mutationBlocked() ||
            !trimClientIdControlValue(this.form.getRawValue().clientId) ||
            this.form.controls.petId.disabled
        );
    }

    quickPetOwnerClientId(): string {
        return trimClientIdControlValue(this.form.getRawValue().clientId);
    }

    onQuickClientCreated(clientId: string): void {
        const id = clientId.trim();
        if (!id) {
            return;
        }
        this.reloadClientsAndSelectClient(id);
    }

    onQuickPetCreated(petId: string): void {
        const cid = trimClientIdControlValue(this.form.getRawValue().clientId);
        const pid = petId.trim();
        if (!cid || !pid) {
            return;
        }
        this.loadPetsForClient(cid, pid);
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 200 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.mergeClientOptionFromCache();
                this.loadingClients.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private reloadClientsAndSelectClient(clientId: string): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 200 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.mergeClientOptionFromCache();
                this.loadingClients.set(false);
                this.form.controls.clientId.setValue(clientId, { emitEvent: true });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetsForClient(clientId: string, selectedPetId = ''): void {
        const cid = clientId.trim();
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId: cid }).subscribe({
            next: (r) => {
                if (isStalePetListResponse(this.form.controls.clientId.value, cid)) {
                    return;
                }
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, cid);
                }
                this.petOptions.set(petOptionsFromList(items));
                this.mergePetOptionFromCache(cid);
                const vmClient = this.editVmCache?.clientId?.trim() ?? '';
                if (selectedPetId) {
                    const exists = items.some((x) => x.id === selectedPetId);
                    const allowFromDetail =
                        cid === vmClient &&
                        !!this.editVmCache?.petName?.trim() &&
                        (this.editVmCache?.petId ?? '').trim() === selectedPetId;
                    this.form.controls.petId.setValue(exists || allowFromDetail ? selectedPetId : '');
                } else if (!this.isInitializingClient) {
                    this.form.controls.petId.setValue('');
                }
                this.loadingPets.set(false);
                this.isInitializingClient = false;
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
                this.isInitializingClient = false;
            }
        });
    }

    private mergeClientOptionFromCache(): void {
        const vm = this.editVmCache;
        const cid = vm?.clientId?.trim();
        const label = vm?.clientName?.trim();
        if (!cid || !label) {
            return;
        }
        const opts = this.clientOptions();
        if (opts.some((o) => o.value === cid)) {
            return;
        }
        this.clientOptions.set([{ value: cid, label }, ...opts]);
    }

    /** Yalnızca istek, kaydın orijinal müşterisine aitken: başka müşteriye geçildiyse eski hayvanı listeye ekleme. */
    private mergePetOptionFromCache(forRequestClientId: string): void {
        const vm = this.editVmCache;
        const vmClient = vm?.clientId?.trim();
        if (!vmClient || forRequestClientId.trim() !== vmClient) {
            return;
        }
        const pid = vm?.petId?.trim();
        const label = vm?.petName?.trim();
        if (!pid || !label) {
            return;
        }
        const opts = this.petOptions();
        if (opts.some((o) => o.value === pid)) {
            return;
        }
        this.petOptions.set([{ value: pid, label }, ...opts]);
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
