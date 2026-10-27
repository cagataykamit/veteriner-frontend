import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { ClinicUpsertFormValue } from '@/app/entities/clinic/models/clinic-upsert.model';
import type { ClinicDetailVm } from '@/app/entities/clinic/models/clinic-vm.model';
import { CLINIC_ADDRESS_MAX, CLINIC_DESCRIPTION_MAX, CLINIC_EMAIL_MAX, CLINIC_PHONE_MAX, clinicOptionalEmailValidator } from '@/app/entities/clinic/utils/clinic-profile-form.validators';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ClinicAppointmentSettingsSectionComponent } from '@/app/features/clinics/components/clinic-appointment-settings-section.component';
import { ClinicTaxpayerSettingsSectionComponent } from '@/app/features/clinics/components/clinic-taxpayer-settings-section.component';
import { ClinicWorkingHoursSectionComponent } from '@/app/features/clinics/components/clinic-working-hours-section.component';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { clinicSettingsMutationMessage, isClinicActivateAlreadyActive, isClinicDeactivateAlreadyInactive } from '@/app/features/clinics/utils/clinic-settings-mutation.utils';
import { parseClinicUpsertHttpError, type ClinicUpsertFieldErrors } from '@/app/features/clinics/utils/clinic-upsert-validation-parse.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatClinicPhoneForDisplay, formatClinicPhoneForInput } from '@/app/entities/clinic/utils/clinic-phone-format.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-clinic-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        ClinicWorkingHoursSectionComponent,
        ClinicAppointmentSettingsSectionComponent,
        ClinicTaxpayerSettingsSectionComponent
    ],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-toast position="bottom-right" />
        @if (loading()) {
            <app-loading-state message="Klinik bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else if (detail(); as d) {
            <app-page-header
                categoryLink="/panel/settings/clinics"
                categoryLinkLabel="Klinik listesine dön"
                title="Klinik ayarları"
                description="Klinik bilgileri, iletişim ve profil alanlarını güncelleyebilir; kliniği pasife alabilir veya yeniden aktifleştirebilirsiniz."
            />

            @if (canUpdateClinic) {
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
            }

            <div class="card mb-4">
                <h5 class="mt-0 mb-4">Düzenle</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">Bu işletme salt okunur moddadır; klinik bilgileri güncellenemez.</p>
                }
                @if (formError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ formError() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSave()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicName" class="block text-sm font-medium text-muted-color mb-2">Klinik adı *</label>
                            <input id="clinicName" pInputText class="w-full" formControlName="name" autocomplete="organization" />
                            @if (apiFieldErrors().name) {
                                <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                            } @else if (form.controls.name.invalid && form.controls.name.touched) {
                                <small class="text-red-500">Klinik adı zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicCity" class="block text-sm font-medium text-muted-color mb-2">Şehir *</label>
                            <input id="clinicCity" pInputText class="w-full" formControlName="city" autocomplete="address-level2" />
                            @if (apiFieldErrors().city) {
                                <small class="text-red-500">{{ apiFieldErrors().city }}</small>
                            } @else if (form.controls.city.invalid && form.controls.city.touched) {
                                <small class="text-red-500">Şehir zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicPhone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                            <input id="clinicPhone" pInputText class="w-full" formControlName="phone" autocomplete="tel" (blur)="onClinicPhoneBlur()" />
                            @if (apiFieldErrors().phone) {
                                <small class="text-red-500">{{ apiFieldErrors().phone }}</small>
                            } @else if (form.controls.phone.invalid && form.controls.phone.touched) {
                                <small class="text-red-500">En fazla {{ phoneMax }} karakter.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicEmail" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                            <input id="clinicEmail" pInputText class="w-full" formControlName="email" type="email" autocomplete="email" />
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
                            <textarea id="clinicAddress" pTextarea class="w-full" formControlName="address" rows="3"></textarea>
                            @if (apiFieldErrors().address) {
                                <small class="text-red-500">{{ apiFieldErrors().address }}</small>
                            } @else if (form.controls.address.invalid && form.controls.address.touched) {
                                <small class="text-red-500">En fazla {{ addressMax }} karakter.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="clinicDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                            <textarea id="clinicDescription" pTextarea class="w-full" formControlName="description" rows="4"></textarea>
                            @if (apiFieldErrors().description) {
                                <small class="text-red-500">{{ apiFieldErrors().description }}</small>
                            } @else if (form.controls.description.invalid && form.controls.description.touched) {
                                <small class="text-red-500">En fazla {{ descriptionMax }} karakter.</small>
                            }
                        </div>
                    </div>
                    <div class="mt-4 mb-0">
                        <button pButton type="submit" [disabled]="form.invalid || saving() || ro.mutationBlocked() || busyDeactivate() || busyActivate()"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Kaydet</button>
                    </div>
                </form>
            </div>

            @if (canUpdateClinic) {
                <app-clinic-working-hours-section [clinicId]="d.id" [reloadKey]="sectionsReloadKey()" />
            }

            @if (canUpdateClinic) {
                <app-clinic-appointment-settings-section [clinicId]="d.id" [reloadKey]="sectionsReloadKey()" />
            }

            @if (canUpdateClinic) {
                <app-clinic-taxpayer-settings-section [clinicId]="d.id" />
            }

            @if (canUpdateClinic) {
                <div class="card">
                    <h5 class="mt-0 mb-3">Durum</h5>
                    @if (ro.mutationBlocked()) {
                        <p class="text-sm text-muted-color m-0">Salt okunur modda pasif/aktif işlemi yapılamaz.</p>
                    } @else {
                        <div class="flex flex-wrap gap-2">
                            @if (d.isActive === true) {
                                <button pButton type="button" severity="danger" [disabled]="busyActivate() || saving() || busyDeactivate()" (click)="onDeactivate()"><i class="p-button-icon" [class]="busyDeactivate() ? 'pi pi-spin pi-spinner' : 'pi pi-ban'"></i>Pasife al</button>
                            } @else {
                                <button pButton type="button" [disabled]="busyDeactivate() || saving() || busyActivate()" (click)="onActivate()"><i class="p-button-icon" [class]="busyActivate() ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'"></i>Aktifleştir</button>
                            }
                        </div>
                    }
                </div>
            }
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
        const lock = !this.canUpdateClinic || this.ro.mutationBlocked() || this.saving() || this.busyDeactivate() || this.busyActivate();

        if (lock) {
            if (this.form.enabled) {
                this.form.disable({ emitEvent: false });
            }
        } else if (this.form.disabled) {
            this.form.enable({ emitEvent: false });
        }
    });

    private readonly auth = inject(AuthService);
    readonly canUpdateClinic = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);

    /** Pasife alma/aktifleştirme sonrası çalışma saatleri ve randevu varsayılanları kartları yeniden yüklensin. */
    readonly sectionsReloadKey = signal(0);

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
        this.clinicsApi.getClinicById(id).subscribe({
            next: (vm) => {
                this.detail.set(vm);
                this.patchFormFromVm(vm);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Yükleme hatası'));
                this.loading.set(false);
            }
        });
    }

    onSave(): void {
        if (this.ro.mutationBlocked() || !this.canUpdateClinic) {
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
        if (this.ro.mutationBlocked() || !this.canUpdateClinic) {
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

        this.formError.set(e instanceof HttpErrorResponse ? clinicSettingsMutationMessage(e, 'Klinik pasife alınamadı.') : 'Klinik pasife alınamadı.');
    }

    onActivate(): void {
        if (this.ro.mutationBlocked() || !this.canUpdateClinic) {
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

        this.formError.set(e instanceof HttpErrorResponse ? clinicSettingsMutationMessage(e, 'Klinik aktifleştirilemedi.') : 'Klinik aktifleştirilemedi.');
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
                this.sectionsReloadKey.update((k) => k + 1);
            },
            error: (err: Error) => {
                this.formError.set(panelHttpFailureMessage(err, 'Liste yenilenemedi.'));
            }
        });
    }
}