import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { clinicAppointmentSettingsFormToPutBody } from '@/app/entities/clinic/data/clinic-appointment-settings.mapper';
import type { ClinicAppointmentSettingsFormValue, ClinicAppointmentSettingsVm } from '@/app/entities/clinic/models/clinic-appointment-settings-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { clinicAppointmentSettingsMutationMessage } from '@/app/features/clinics/utils/clinic-appointment-settings-mutation.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Klinik ayarlarındaki "Randevu Varsayılanları" kartı: varsayılan süre, başlangıç aralığı ve çakışma izni. Yalnız
 * `Clinics.Update` olan kullanıcıya gösterilir (sayfa koşulu). `reloadKey` değişince yeniden yüklenir.
 */
@Component({
    selector: 'app-clinic-appointment-settings-section',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, CheckboxModule, AppLoadingStateComponent, AppErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card mb-4" [formGroup]="apSettingsForm">
            <h5 class="mt-0 mb-2">Randevu Varsayılanları</h5>
            <p class="text-sm text-muted-color mt-0 mb-4">Randevu oluşturma ekranlarında kullanılacak varsayılan süre ve randevu başlangıç aralığını yönetin.</p>

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
                        <label class="block text-sm font-medium text-muted-color mb-2" for="defaultAppointmentDurationMinutes"> Varsayılan randevu süresi (dakika) </label>
                        <input id="defaultAppointmentDurationMinutes" type="number" class="w-full p-inputtext p-component" formControlName="defaultAppointmentDurationMinutes" min="5" max="240" step="1" />
                        @if (apSettingsForm.controls.defaultAppointmentDurationMinutes.invalid && apSettingsForm.controls.defaultAppointmentDurationMinutes.touched) {
                            <small class="text-red-500">Varsayılan randevu süresi 5 ile 240 dakika arasında olmalıdır.</small>
                        }
                    </div>

                    <div class="col-span-12 md:col-span-4">
                        <label class="block text-sm font-medium text-muted-color mb-2" for="slotIntervalMinutes">Randevu başlangıç aralığı (dakika)</label>
                        <input id="slotIntervalMinutes" type="number" class="w-full p-inputtext p-component" formControlName="slotIntervalMinutes" min="5" max="120" step="1" />
                        @if (apSettingsForm.controls.slotIntervalMinutes.invalid && apSettingsForm.controls.slotIntervalMinutes.touched) {
                            <small class="text-red-500">Randevu başlangıç aralığı 5 ile 120 dakika arasında olmalıdır.</small>
                        } @else {
                            <small class="text-muted-color">Randevuların kaç dakikada bir başlatılabileceğini belirler.</small>
                            <small class="block text-muted-color mt-1">Örneğin 15 dakika seçilirse randevular 09:00, 09:15, 09:30 gibi saatlerde başlatılır.</small>
                        }
                    </div>

                    <div class="col-span-12 md:col-span-4 flex items-center">
                        <div class="flex items-center gap-2 mt-5">
                            <p-checkbox formControlName="allowOverlappingAppointments" [binary]="true" inputId="allowOverlappingAppointments" />
                            <label class="text-sm cursor-pointer" for="allowOverlappingAppointments"> Aynı saate birden fazla randevuya izin ver </label>
                        </div>
                    </div>
                </div>

                <div class="mt-4 flex justify-end">
                    <button pButton type="button" severity="secondary" [disabled]="!canSaveAppointmentSettings() || apSettingsSaving()" (click)="onSaveAppointmentSettings()"><i class="p-button-icon" [class]="apSettingsSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Randevu varsayılanlarını kaydet</button>
                </div>
            }
        </div>
    `
})
export class ClinicAppointmentSettingsSectionComponent {
    readonly clinicId = input.required<string>();
    readonly reloadKey = input(0);

    private readonly router = inject(Router);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly apSettingsLoading = signal(false);
    readonly apSettingsError = signal<string | null>(null);
    readonly apSettingsSaving = signal(false);
    readonly apSettingsFormError = signal<string | null>(null);

    readonly apSettingsForm = this.fb.nonNullable.group({
        defaultAppointmentDurationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240), Validators.pattern(/^\d+$/)]],
        slotIntervalMinutes: [15, [Validators.required, Validators.min(5), Validators.max(120), Validators.pattern(/^\d+$/)]],
        allowOverlappingAppointments: [false]
    });

    private readonly apSettingsFormLockEffect = effect(() => {
        const lock = this.ro.mutationBlocked() || !this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) || this.apSettingsSaving();

        if (lock) {
            if (this.apSettingsForm.enabled) {
                this.apSettingsForm.disable({ emitEvent: false });
            }
        } else if (this.apSettingsForm.disabled) {
            this.apSettingsForm.enable({ emitEvent: false });
        }
    });

    constructor() {
        effect(() => {
            const clinicId = this.clinicId();

            this.reloadKey();
            untracked(() => this.loadAppointmentSettings(clinicId));
        });
    }

    canSaveAppointmentSettings(): boolean {
        return this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) && !this.ro.mutationBlocked() && !this.apSettingsSaving() && this.apSettingsForm.valid && !this.apSettingsLoading() && this.apSettingsError() === null;
    }

    retryAppointmentSettingsLoad(): void {
        this.loadAppointmentSettings(this.clinicId());
    }

    onSaveAppointmentSettings(): void {
        if (!this.canSaveAppointmentSettings()) {
            return;
        }

        const id = this.clinicId();

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
                this.apSettingsFormError.set('Randevu başlangıç aralığı 5 ile 120 dakika arasında olmalıdır.');

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
                    this.apSettingsFormError.set(clinicAppointmentSettingsMutationMessage(e, 'Randevu varsayılanları güncellenemedi.'));

                    return;
                }

                this.apSettingsFormError.set('Randevu varsayılanları güncellenemedi.');
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
}
