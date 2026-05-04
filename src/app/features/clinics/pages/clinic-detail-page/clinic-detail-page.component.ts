import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { ClinicUpsertFormValue } from '@/app/features/clinics/models/clinic-upsert.model';
import type { ClinicDetailVm } from '@/app/features/clinics/models/clinic-vm.model';
import {
    CLINIC_ADDRESS_MAX,
    CLINIC_DESCRIPTION_MAX,
    CLINIC_EMAIL_MAX,
    CLINIC_PHONE_MAX,
    clinicOptionalEmailValidator
} from '@/app/features/clinics/utils/clinic-profile-form.validators';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { clinicAppointmentSettingsFormToPutBody } from '@/app/features/clinics/data/clinic-appointment-settings.mapper';
import { clinicWorkingHoursFormToPutBody, normalizeTimeForInput } from '@/app/features/clinics/data/clinic-working-hours.mapper';
import type { ClinicAppointmentSettingsFormValue, ClinicAppointmentSettingsVm } from '@/app/features/clinics/models/clinic-appointment-settings-vm.model';
import type { ClinicWorkingHourFormValue, ClinicWorkingHourVm } from '@/app/features/clinics/models/clinic-working-hours-vm.model';
import { clinicAppointmentSettingsMutationMessage } from '@/app/features/clinics/utils/clinic-appointment-settings-mutation.utils';
import {
    clinicWorkingDayErrorMessage,
    clinicWorkingDayGroupValidator
} from '@/app/features/clinics/utils/clinic-working-hours-day.validator';
import { clinicWorkingHoursMutationMessage } from '@/app/features/clinics/utils/clinic-working-hours-mutation.utils';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import {
    clinicSettingsMutationMessage,
    isClinicActivateAlreadyActive,
    isClinicDeactivateAlreadyInactive
} from '@/app/features/clinics/utils/clinic-settings-mutation.utils';
import {
    parseClinicUpsertHttpError,
    type ClinicUpsertFieldErrors
} from '@/app/features/clinics/utils/clinic-upsert-validation-parse.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    formatClinicPhoneForDisplay,
    formatClinicPhoneForInput
} from '@/app/features/clinics/utils/clinic-phone-format.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

@Component({
    selector: 'app-clinic-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        CheckboxModule,
        TextareaModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <a routerLink="/panel/settings/clinics" class="text-primary font-medium no-underline inline-block mb-4">← Klinik listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Klinik bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else if (detail(); as d) {
            <app-page-header
                title="Klinik ayarları"
                subtitle="Hesap"
                description="Klinik bilgileri, iletişim ve profil alanlarını güncelleyebilir; kliniği pasife alabilir veya yeniden aktifleştirebilirsiniz."
            />

            <div class="card mb-4">
                <h5 class="mt-0 mb-3">Özet</h5>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 text-sm">
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Durum</dt>
                        <dd class="m-0">
                            @if (d.isActive === true) {
                                <span class="text-green-700 dark:text-green-400">Aktif</span>
                            } @else if (d.isActive === false) {
                                <span class="text-muted-color">Pasif</span>
                            } @else {
                                <span class="text-muted-color">—</span>
                            }
                        </dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Telefon</dt>
                        <dd class="m-0 break-all">{{ formatClinicPhoneForDisplay(d.phone) }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">E-posta</dt>
                        <dd class="m-0 break-all">{{ d.email || '—' }}</dd>
                    </div>
                    <div class="md:col-span-2">
                        <dt class="text-muted-color font-medium m-0 mb-1">Adres</dt>
                        <dd class="m-0 whitespace-pre-wrap break-words">{{ d.address || '—' }}</dd>
                    </div>
                    <div class="md:col-span-2">
                        <dt class="text-muted-color font-medium m-0 mb-1">Açıklama</dt>
                        <dd class="m-0 whitespace-pre-wrap break-words">{{ d.description || '—' }}</dd>
                    </div>
                </dl>
            </div>

            <div class="card mb-4">
                <h5 class="mt-0 mb-4">Düzenle</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        Bu işletme salt okunur moddadır; klinik bilgileri güncellenemez.
                    </p>
                }
                @if (formError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ formError() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSave()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicName" class="block text-sm font-medium text-muted-color mb-2">Klinik adı *</label>
                            <input
                                id="clinicName"
                                pInputText
                                class="w-full"
                                formControlName="name"
                                autocomplete="organization"
                            />
                            @if (apiFieldErrors().name) {
                                <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                            } @else if (form.controls.name.invalid && form.controls.name.touched) {
                                <small class="text-red-500">Klinik adı zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicCity" class="block text-sm font-medium text-muted-color mb-2">Şehir *</label>
                            <input
                                id="clinicCity"
                                pInputText
                                class="w-full"
                                formControlName="city"
                                autocomplete="address-level2"
                            />
                            @if (apiFieldErrors().city) {
                                <small class="text-red-500">{{ apiFieldErrors().city }}</small>
                            } @else if (form.controls.city.invalid && form.controls.city.touched) {
                                <small class="text-red-500">Şehir zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicPhone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                            <input
                                id="clinicPhone"
                                pInputText
                                class="w-full"
                                formControlName="phone"
                                autocomplete="tel"
                                (blur)="onClinicPhoneBlur()"
                            />
                            @if (apiFieldErrors().phone) {
                                <small class="text-red-500">{{ apiFieldErrors().phone }}</small>
                            } @else if (form.controls.phone.invalid && form.controls.phone.touched) {
                                <small class="text-red-500">En fazla {{ phoneMax }} karakter.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicEmail" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                            <input
                                id="clinicEmail"
                                pInputText
                                class="w-full"
                                formControlName="email"
                                type="email"
                                autocomplete="email"
                            />
                            @if (apiFieldErrors().email) {
                                <small class="text-red-500">{{ apiFieldErrors().email }}</small>
                            } @else if (form.controls.email.hasError('email') && form.controls.email.touched) {
                                <small class="text-red-500">Geçerli bir e-posta girin.</small>
                            } @else if (form.controls.email.invalid && form.controls.email.touched) {
                                <small class="text-red-500">En fazla {{ emailMax }} karakter.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="clinicAddress" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                            <textarea
                                id="clinicAddress"
                                pTextarea
                                class="w-full"
                                formControlName="address"
                                rows="3"
                            ></textarea>
                            @if (apiFieldErrors().address) {
                                <small class="text-red-500">{{ apiFieldErrors().address }}</small>
                            } @else if (form.controls.address.invalid && form.controls.address.touched) {
                                <small class="text-red-500">En fazla {{ addressMax }} karakter.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="clinicDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                            <textarea
                                id="clinicDescription"
                                pTextarea
                                class="w-full"
                                formControlName="description"
                                rows="4"
                            ></textarea>
                            @if (apiFieldErrors().description) {
                                <small class="text-red-500">{{ apiFieldErrors().description }}</small>
                            } @else if (form.controls.description.invalid && form.controls.description.touched) {
                                <small class="text-red-500">En fazla {{ descriptionMax }} karakter.</small>
                            }
                        </div>
                    </div>
                    <div class="mt-4 mb-0">
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-save"
                            [loading]="saving()"
                            [disabled]="form.invalid || saving() || ro.mutationBlocked() || busyDeactivate() || busyActivate()"
                        />
                    </div>
                </form>
            </div>

            <div class="card mb-4" [formGroup]="whForm">
                <h5 class="mt-0 mb-2">Çalışma Saatleri</h5>
                <p class="text-sm text-muted-color mt-0 mb-4">Kliniğin haftalık çalışma günleri ve saatlerini yönetin.</p>
                @if (whLoading()) {
                    <app-loading-state message="Çalışma saatleri yükleniyor…" />
                } @else if (whError(); as whErr) {
                    <app-error-state [detail]="whErr" (retry)="retryWorkingHoursLoad()" />
                } @else {
                    @if (whFormError()) {
                        <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ whFormError() }}</p>
                    }
                    <div formArrayName="days" class="flex flex-col gap-4">
                        @for (row of whDays.controls; track trackWhRow($index, row); let idx = $index) {
                            <div
                                [formGroupName]="idx"
                                class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 md:p-4 grid grid-cols-12 gap-3 gap-y-2"
                            >
                                <div class="col-span-12 md:col-span-2 flex flex-col justify-center">
                                    <span class="font-medium text-surface-900 dark:text-surface-0">{{ row.get('dayLabel')?.value }}</span>
                                </div>
                                <div class="col-span-12 md:col-span-2 flex items-center gap-2">
                                    <p-checkbox formControlName="isClosed" [binary]="true" [inputId]="'whClosed' + idx" />
                                    <label class="text-sm m-0 cursor-pointer" [for]="'whClosed' + idx">Kapalı</label>
                                </div>
                                <div class="col-span-6 md:col-span-2">
                                    <label class="block text-xs text-muted-color mb-1">Açılış</label>
                                    <input type="time" class="w-full p-inputtext p-component" formControlName="opensAt" step="60" />
                                </div>
                                <div class="col-span-6 md:col-span-2">
                                    <label class="block text-xs text-muted-color mb-1">Kapanış</label>
                                    <input type="time" class="w-full p-inputtext p-component" formControlName="closesAt" step="60" />
                                </div>
                                <div class="col-span-6 md:col-span-2">
                                    <label class="block text-xs text-muted-color mb-1">Mola başlangıç</label>
                                    <input type="time" class="w-full p-inputtext p-component" formControlName="breakStartsAt" step="60" />
                                </div>
                                <div class="col-span-6 md:col-span-2">
                                    <label class="block text-xs text-muted-color mb-1">Mola bitiş</label>
                                    <input type="time" class="w-full p-inputtext p-component" formControlName="breakEndsAt" step="60" />
                                </div>
                            </div>
                        }
                    </div>
                    <div class="mt-4 flex justify-end">
                        <p-button
                            type="button"
                            label="Çalışma saatlerini kaydet"
                            icon="pi pi-save"
                            severity="secondary"
                            [loading]="whSaving()"
                            [disabled]="!canSaveWorkingHours()"
                            (onClick)="onSaveWorkingHours()"
                        />
                    </div>
                }
            </div>

            <div class="card mb-4" [formGroup]="apSettingsForm">
                <h5 class="mt-0 mb-2">Randevu Varsayılanları</h5>
                <p class="text-sm text-muted-color mt-0 mb-4">
                    Randevu oluşturma ekranlarında kullanılacak varsayılan süre ve slot aralığını yönetin.
                </p>

                @if (apSettingsLoading()) {
                    <app-loading-state message="Randevu varsayılanları yükleniyor…" />
                } @else if (apSettingsError(); as apErr) {
                    <app-error-state [detail]="apErr" (retry)="retryAppointmentSettingsLoad()" />
                } @else {
                    @if (apSettingsFormError()) {
                        <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ apSettingsFormError() }}</p>
                    }
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-4">
                            <label class="block text-sm font-medium text-muted-color mb-2" for="defaultAppointmentDurationMinutes">
                                Varsayılan randevu süresi (dakika)
                            </label>
                            <input
                                id="defaultAppointmentDurationMinutes"
                                type="number"
                                class="w-full p-inputtext p-component"
                                formControlName="defaultAppointmentDurationMinutes"
                                min="5"
                                max="240"
                                step="1"
                            />
                            @if (
                                apSettingsForm.controls.defaultAppointmentDurationMinutes.invalid &&
                                apSettingsForm.controls.defaultAppointmentDurationMinutes.touched
                            ) {
                                <small class="text-red-500">Varsayılan randevu süresi 5 ile 240 dakika arasında olmalıdır.</small>
                            }
                        </div>

                        <div class="col-span-12 md:col-span-4">
                            <label class="block text-sm font-medium text-muted-color mb-2" for="slotIntervalMinutes">Slot aralığı (dakika)</label>
                            <input
                                id="slotIntervalMinutes"
                                type="number"
                                class="w-full p-inputtext p-component"
                                formControlName="slotIntervalMinutes"
                                min="5"
                                max="120"
                                step="1"
                            />
                            @if (apSettingsForm.controls.slotIntervalMinutes.invalid && apSettingsForm.controls.slotIntervalMinutes.touched) {
                                <small class="text-red-500">Slot aralığı 5 ile 120 dakika arasında olmalıdır.</small>
                            }
                        </div>

                        <div class="col-span-12 md:col-span-4 flex items-center">
                            <div class="flex items-center gap-2 mt-5">
                                <p-checkbox
                                    formControlName="allowOverlappingAppointments"
                                    [binary]="true"
                                    inputId="allowOverlappingAppointments"
                                />
                                <label class="text-sm cursor-pointer" for="allowOverlappingAppointments">
                                    Aynı saate birden fazla randevuya izin ver
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 flex justify-end">
                        <p-button
                            type="button"
                            label="Randevu varsayılanlarını kaydet"
                            icon="pi pi-save"
                            severity="secondary"
                            [loading]="apSettingsSaving()"
                            [disabled]="!canSaveAppointmentSettings()"
                            (onClick)="onSaveAppointmentSettings()"
                        />
                    </div>
                }
            </div>

            <div class="card">
                <h5 class="mt-0 mb-3">Durum</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-sm text-muted-color m-0">Salt okunur modda pasif/aktif işlemi yapılamaz.</p>
                } @else {
                    <div class="flex flex-wrap gap-2">
                        @if (d.isActive === true) {
                            <p-button
                                type="button"
                                label="Pasife al"
                                icon="pi pi-ban"
                                severity="danger"
                                [loading]="busyDeactivate()"
                                [disabled]="busyActivate() || saving()"
                                (onClick)="onDeactivate()"
                            />
                        } @else {
                            <p-button
                                type="button"
                                label="Aktifleştir"
                                icon="pi pi-check-circle"
                                [loading]="busyActivate()"
                                [disabled]="busyDeactivate() || saving()"
                                (onClick)="onActivate()"
                            />
                        }
                    </div>
                }
            </div>
        }
    `
})
export class ClinicDetailPageComponent implements OnInit {
    /** Özet telefon satırı — yalnızca gösterim; form/API değişmez. */
    readonly formatClinicPhoneForDisplay = formatClinicPhoneForDisplay;

    onClinicPhoneBlur(): void {
        const c = this.form.controls.phone;
        c.setValue(formatClinicPhoneForInput(c.value), { emitEvent: false });
    }

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly phoneMax = CLINIC_PHONE_MAX;
    readonly emailMax = CLINIC_EMAIL_MAX;
    readonly addressMax = CLINIC_ADDRESS_MAX;
    readonly descriptionMax = CLINIC_DESCRIPTION_MAX;

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly detail = signal<ClinicDetailVm | null>(null);

    readonly saving = signal(false);
    readonly busyDeactivate = signal(false);
    readonly busyActivate = signal(false);
    readonly formError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClinicUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        city: ['', [Validators.required, Validators.maxLength(128)]],
        phone: ['', [Validators.maxLength(CLINIC_PHONE_MAX)]],
        email: ['', [Validators.maxLength(CLINIC_EMAIL_MAX), clinicOptionalEmailValidator()]],
        address: ['', [Validators.maxLength(CLINIC_ADDRESS_MAX)]],
        description: ['', [Validators.maxLength(CLINIC_DESCRIPTION_MAX)]]
    });

    /** Reactive form uyarısı: disabled yalnızca `FormGroup` üzerinden. */
    private readonly formEditLockEffect = effect(() => {
        const lock =
            this.ro.mutationBlocked() || this.saving() || this.busyDeactivate() || this.busyActivate();
        if (lock) {
            if (this.form.enabled) {
                this.form.disable({ emitEvent: false });
            }
        } else if (this.form.disabled) {
            this.form.enable({ emitEvent: false });
        }
    });

    private readonly auth = inject(AuthService);

    readonly whLoading = signal(false);
    readonly whError = signal<string | null>(null);
    readonly whSaving = signal(false);
    readonly whFormError = signal<string | null>(null);
    readonly apSettingsLoading = signal(false);
    readonly apSettingsError = signal<string | null>(null);
    readonly apSettingsSaving = signal(false);
    readonly apSettingsFormError = signal<string | null>(null);

    readonly whForm = this.fb.group({
        days: this.fb.array<FormGroup>([])
    });
    readonly apSettingsForm = this.fb.nonNullable.group({
        defaultAppointmentDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240), Validators.pattern(/^\d+$/)]],
        slotIntervalMinutes: [15, [Validators.required, Validators.min(5), Validators.max(120), Validators.pattern(/^\d+$/)]],
        allowOverlappingAppointments: [false]
    });

    get whDays(): FormArray<FormGroup> {
        return this.whForm.get('days') as FormArray<FormGroup>;
    }

    private applyWhRowTimeLocks(g: FormGroup): void {
        const closed = g.get('isClosed')?.value === true;
        for (const k of ['opensAt', 'closesAt', 'breakStartsAt', 'breakEndsAt'] as const) {
            const c = g.get(k);
            if (!c) {
                continue;
            }
            if (closed) {
                c.disable({ emitEvent: false });
            } else {
                c.enable({ emitEvent: false });
            }
        }
    }

    private applyWhFormGlobalLock(): void {
        const lock =
            this.ro.mutationBlocked() || !this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) || this.whSaving();
        const arr = this.whDays;
        for (const ctrl of arr.controls) {
            const g = ctrl as FormGroup;
            const closedCtrl = g.get('isClosed');
            if (closedCtrl) {
                if (lock) {
                    closedCtrl.disable({ emitEvent: false });
                } else {
                    closedCtrl.enable({ emitEvent: false });
                }
            }
            if (lock) {
                for (const k of ['opensAt', 'closesAt', 'breakStartsAt', 'breakEndsAt'] as const) {
                    g.get(k)?.disable({ emitEvent: false });
                }
            } else {
                this.applyWhRowTimeLocks(g);
            }
        }
    }

    private readonly whFormLockEffect = effect(() => {
        this.ro.mutationBlocked();
        this.whSaving();
        this.applyWhFormGlobalLock();
    });

    private readonly apSettingsFormLockEffect = effect(() => {
        const lock =
            this.ro.mutationBlocked() || !this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) || this.apSettingsSaving();
        if (lock) {
            if (this.apSettingsForm.enabled) {
                this.apSettingsForm.disable({ emitEvent: false });
            }
        } else if (this.apSettingsForm.disabled) {
            this.apSettingsForm.enable({ emitEvent: false });
        }
    });

    trackWhRow(_i: number, row: AbstractControl): number {
        return (row as FormGroup).get('dayOfWeek')?.value ?? _i;
    }

    canSaveWorkingHours(): boolean {
        return (
            this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) &&
            !this.ro.mutationBlocked() &&
            !this.whSaving() &&
            this.whForm.valid &&
            this.whDays.length > 0 &&
            !this.whLoading() &&
            this.whError() === null
        );
    }

    retryWorkingHoursLoad(): void {
        const id = this.detail()?.id;
        if (id) {
            this.loadWorkingHours(id);
        }
    }

    canSaveAppointmentSettings(): boolean {
        return (
            this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) &&
            !this.ro.mutationBlocked() &&
            !this.apSettingsSaving() &&
            this.apSettingsForm.valid &&
            !this.apSettingsLoading() &&
            this.apSettingsError() === null
        );
    }

    retryAppointmentSettingsLoad(): void {
        const id = this.detail()?.id;
        if (id) {
            this.loadAppointmentSettings(id);
        }
    }

    private loadWorkingHours(clinicId: string): void {
        this.whLoading.set(true);
        this.whError.set(null);
        this.whFormError.set(null);
        this.clinicsApi.getWorkingHours(clinicId).subscribe({
            next: (items) => {
                this.patchWorkingHoursForm(items);
                this.whLoading.set(false);
            },
            error: (e: Error) => {
                this.whError.set(e.message ?? 'Çalışma saatleri yüklenemedi.');
                this.whLoading.set(false);
            }
        });
    }

    private patchAppointmentSettingsForm(vm: ClinicAppointmentSettingsVm): void {
        this.apSettingsForm.patchValue(
            {
                defaultAppointmentDurationMinutes: vm.defaultAppointmentDurationMinutes,
                slotIntervalMinutes: vm.slotIntervalMinutes,
                allowOverlappingAppointments: vm.allowOverlappingAppointments
            },
            { emitEvent: false }
        );
    }

    private loadAppointmentSettings(clinicId: string): void {
        this.apSettingsLoading.set(true);
        this.apSettingsError.set(null);
        this.apSettingsFormError.set(null);
        this.clinicsApi.getAppointmentSettings(clinicId).subscribe({
            next: (vm) => {
                this.patchAppointmentSettingsForm(vm);
                this.apSettingsLoading.set(false);
            },
            error: (e: Error) => {
                this.apSettingsError.set(e.message ?? 'Randevu varsayılanları yüklenemedi.');
                this.apSettingsLoading.set(false);
            }
        });
    }

    private patchWorkingHoursForm(items: ClinicWorkingHourVm[]): void {
        const arr = this.whDays;
        arr.clear();
        for (const vm of [...items].sort((a, b) => a.dayOfWeek - b.dayOfWeek)) {
            const g = this.fb.group(
                {
                    dayOfWeek: [vm.dayOfWeek],
                    dayLabel: [{ value: vm.dayLabel, disabled: true }],
                    isClosed: [vm.isClosed],
                    opensAt: [normalizeTimeForInput(vm.opensAt)],
                    closesAt: [normalizeTimeForInput(vm.closesAt)],
                    breakStartsAt: [normalizeTimeForInput(vm.breakStartsAt)],
                    breakEndsAt: [normalizeTimeForInput(vm.breakEndsAt)]
                },
                { validators: [clinicWorkingDayGroupValidator] }
            );
            arr.push(g);
            g.get('isClosed')!
                .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    if (
                        !this.ro.mutationBlocked() &&
                        this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) &&
                        !this.whSaving()
                    ) {
                        this.applyWhRowTimeLocks(g);
                    }
                });
        }
        this.applyWhFormGlobalLock();
    }

    onSaveWorkingHours(): void {
        if (!this.canSaveWorkingHours()) {
            return;
        }
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim() ?? '';
        if (!id) {
            return;
        }
        this.whFormError.set(null);
        this.whDays.controls.forEach((c) => (c as FormGroup).markAllAsTouched());
        this.whDays.updateValueAndValidity({ emitEvent: false });
        if (this.whForm.invalid) {
            for (const c of this.whDays.controls) {
                const msg = clinicWorkingDayErrorMessage((c as FormGroup).errors);
                if (msg) {
                    this.whFormError.set(msg);
                    return;
                }
            }
            this.whFormError.set('Lütfen çalışma saatlerini kontrol edin.');
            return;
        }
        const days = this.whDays.getRawValue() as ClinicWorkingHourFormValue[];
        const body = clinicWorkingHoursFormToPutBody(days);
        this.whSaving.set(true);
        this.clinicsApi.updateWorkingHours(id, body).subscribe({
            next: (items) => {
                this.whSaving.set(false);
                this.patchWorkingHoursForm(items);
                this.whFormError.set(null);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Çalışma saatleri güncellendi.'
                });
            },
            error: (e: unknown) => {
                this.whSaving.set(false);
                if (e instanceof HttpErrorResponse) {
                    this.whFormError.set(
                        clinicWorkingHoursMutationMessage(e, 'Çalışma saatleri güncellenemedi.')
                    );
                } else {
                    this.whFormError.set('Çalışma saatleri güncellenemedi.');
                }
            }
        });
    }

    onSaveAppointmentSettings(): void {
        if (!this.canSaveAppointmentSettings()) {
            return;
        }
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim() ?? '';
        if (!id) {
            return;
        }
        this.apSettingsFormError.set(null);
        this.apSettingsForm.markAllAsTouched();
        this.apSettingsForm.updateValueAndValidity({ emitEvent: false });
        if (this.apSettingsForm.invalid) {
            if (this.apSettingsForm.controls.defaultAppointmentDurationMinutes.invalid) {
                this.apSettingsFormError.set('Varsayılan randevu süresi 5 ile 240 dakika arasında olmalıdır.');
                return;
            }
            if (this.apSettingsForm.controls.slotIntervalMinutes.invalid) {
                this.apSettingsFormError.set('Slot aralığı 5 ile 120 dakika arasında olmalıdır.');
                return;
            }
            this.apSettingsFormError.set('Lütfen randevu varsayılanlarını kontrol edin.');
            return;
        }
        const value = this.apSettingsForm.getRawValue() as ClinicAppointmentSettingsFormValue;
        const body = clinicAppointmentSettingsFormToPutBody(value);
        this.apSettingsSaving.set(true);
        this.clinicsApi.updateAppointmentSettings(id, body).subscribe({
            next: (vm) => {
                this.apSettingsSaving.set(false);
                this.patchAppointmentSettingsForm(vm);
                this.apSettingsFormError.set(null);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Randevu varsayılanları güncellendi.'
                });
            },
            error: (e: unknown) => {
                this.apSettingsSaving.set(false);
                if (e instanceof HttpErrorResponse) {
                    this.apSettingsFormError.set(
                        clinicAppointmentSettingsMutationMessage(e, 'Randevu varsayılanları güncellenemedi.')
                    );
                    return;
                }
                this.apSettingsFormError.set('Randevu varsayılanları güncellenemedi.');
            }
        });
    }

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
            const id = pm.get('clinicId')?.trim() ?? '';
            if (!id) {
                this.loading.set(false);
                this.loadError.set('Geçersiz klinik.');
                return;
            }
            this.load(id);
        });
    }

    reload(): void {
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim();
        if (id) {
            this.load(id);
        }
    }

    private load(id: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.detail.set(null);
        this.formError.set(null);
        this.apiFieldErrors.set({});
        this.whDays.clear();
        this.whError.set(null);
        this.whFormError.set(null);
        this.apSettingsError.set(null);
        this.apSettingsFormError.set(null);
        this.clinicsApi.getClinicById(id).subscribe({
            next: (vm) => {
                this.detail.set(vm);
                this.patchFormFromVm(vm);
                this.loading.set(false);
                this.loadWorkingHours(vm.id);
                this.loadAppointmentSettings(vm.id);
            },
            error: (e: Error) => {
                this.loadError.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    onSave(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.formError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim() ?? '';
        if (!id) {
            return;
        }
        this.form.controls.phone.setValue(formatClinicPhoneForInput(this.form.controls.phone.value), {
            emitEvent: false
        });
        const v = this.form.getRawValue() as ClinicUpsertFormValue;
        this.saving.set(true);
        this.clinicsApi.updateClinicFromForm(id, v).subscribe({
            next: (vm) => {
                this.saving.set(false);
                this.detail.set(vm);
                this.patchFormFromVm(vm);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Klinik bilgileri güncellendi.'
                });
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.handlePutError(e);
            }
        });
    }

    private handlePutError(e: unknown): void {
        if (!(e instanceof HttpErrorResponse)) {
            this.formError.set('Klinik güncellenemedi.');
            return;
        }
        const parsed = parseClinicUpsertHttpError(e);
        if (Object.keys(parsed.fieldErrors).length > 0) {
            this.apiFieldErrors.set(parsed.fieldErrors);
            if (parsed.summaryMessage) {
                this.formError.set(parsed.summaryMessage);
            }
            return;
        }
        this.formError.set(clinicSettingsMutationMessage(e, 'Klinik güncellenemedi.'));
    }

    onDeactivate(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const id = this.detail()?.id ?? '';
        if (!id) {
            return;
        }
        this.formError.set(null);
        this.busyDeactivate.set(true);
        this.clinicsApi.deactivateClinic(id).subscribe({
            next: () => {
                this.busyDeactivate.set(false);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Klinik pasife alındı.'
                });
                this.refreshAfterMutation(id);
            },
            error: (e: unknown) => {
                this.busyDeactivate.set(false);
                this.handleDeactivateError(e, id);
            }
        });
    }

    private handleDeactivateError(e: unknown, clinicId: string): void {
        if (e instanceof HttpErrorResponse && isClinicDeactivateAlreadyInactive(e)) {
            this.refreshAfterMutation(clinicId);
            addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                severity: 'info',
                summary: 'Bilgi',
                detail: 'Bu klinik zaten pasif; bilgiler güncellendi.'
            });
            return;
        }
        this.formError.set(
            e instanceof HttpErrorResponse
                ? clinicSettingsMutationMessage(e, 'Klinik pasife alınamadı.')
                : 'Klinik pasife alınamadı.'
        );
    }

    onActivate(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const id = this.detail()?.id ?? '';
        if (!id) {
            return;
        }
        this.formError.set(null);
        this.busyActivate.set(true);
        this.clinicsApi.activateClinic(id).subscribe({
            next: () => {
                this.busyActivate.set(false);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Klinik aktifleştirildi.'
                });
                this.refreshAfterMutation(id);
            },
            error: (e: unknown) => {
                this.busyActivate.set(false);
                this.handleActivateError(e, id);
            }
        });
    }

    private handleActivateError(e: unknown, clinicId: string): void {
        if (e instanceof HttpErrorResponse && isClinicActivateAlreadyActive(e)) {
            this.refreshAfterMutation(clinicId);
            addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                severity: 'info',
                summary: 'Bilgi',
                detail: 'Bu klinik zaten aktif; bilgiler güncellendi.'
            });
            return;
        }
        this.formError.set(
            e instanceof HttpErrorResponse
                ? clinicSettingsMutationMessage(e, 'Klinik aktifleştirilemedi.')
                : 'Klinik aktifleştirilemedi.'
        );
    }

    private patchFormFromVm(vm: ClinicDetailVm): void {
        this.form.patchValue({
            name: vm.name,
            city: vm.city,
            phone: formatClinicPhoneForInput(vm.phone),
            email: vm.email,
            address: vm.address,
            description: vm.description
        });
    }

    private refreshAfterMutation(clinicId: string): void {
        this.clinicsApi.getClinicById(clinicId).subscribe({
            next: (vm) => {
                this.detail.set(vm);
                this.patchFormFromVm(vm);
                this.loadWorkingHours(clinicId);
                this.loadAppointmentSettings(clinicId);
            },
            error: (err: Error) => {
                this.formError.set(err.message ?? 'Liste yenilenemedi.');
            }
        });
    }
}
