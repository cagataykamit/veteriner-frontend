import { Component, DestroyRef, OnInit, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CLINIC_TAXPAYER_MAX, CLINIC_TAXPAYER_TYPE_OPTIONS, mapClinicTaxpayerFormToPutBody, mapClinicTaxpayerSettingsToFormValue } from '@/app/features/clinics/data/clinic-taxpayer-settings.mapper';
import type { ClinicTaxpayerType } from '@/app/features/clinics/models/clinic-taxpayer-settings.model';
import { ClinicTaxpayerSettingsService } from '@/app/features/clinics/services/clinic-taxpayer-settings.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TAX_IDENTITY_MSG_TAXPAYER, TAX_RATE_MSG_INVALID, taxpayerIdentityValidator, taxRateValidator } from '@/app/shared/utils/turkish-tax-identity.utils';

/**
 * Klinik ayarlarındaki "Mükellef bilgileri" kartı (ADR-036 Dilim 1): fatura/e-belgeyi düzenleyen kimlik, adres ve varsayılan
 * KDV/stopaj oranları. Yalnız `Clinics.Update` olan kullanıcıya gösterilir (sayfa koşulu). Entegratör ayarı burada değildir.
 */
@Component({
    selector: 'app-clinic-taxpayer-settings-section',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, AppLoadingStateComponent, AppErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card mb-4" [formGroup]="form" data-testid="clinic-taxpayer-settings">
            <h5 class="mt-0 mb-2">Mükellef bilgileri</h5>
            <p class="text-sm text-muted-color mt-0 mb-4">Fatura ve e-belge düzenlenirken kliniğin vergi kimliği, adresi ve varsayılan oranlar olarak kullanılır. Tüm alanlar isteğe bağlıdır; KDV oranı boş bırakılan ücret satırlarına uygulanır.</p>

            @if (loading()) {
                <app-loading-state message="Mükellef bilgileri yükleniyor…" />
            } @else if (loadError(); as err) {
                <app-error-state [detail]="err" (retry)="load()" />
            } @else {
                @if (saveError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ saveError() }}</p>
                }
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxpayerType" class="block text-sm font-medium text-muted-color mb-2">Mükellef türü</label>
                        <p-select inputId="taxpayerType" formControlName="taxpayerType" [options]="typeOptions" optionLabel="label" optionValue="value" class="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxIdentityNumber" class="block text-sm font-medium text-muted-color mb-2">VKN / TCKN</label>
                        <input id="taxIdentityNumber" pInputText class="w-full" formControlName="taxIdentityNumber" inputmode="numeric" maxlength="11" autocomplete="off" />
                        @if (showError('taxIdentityNumber')) {
                            <small class="text-red-500" data-testid="taxpayer-error-identity">{{ identityMessage }}</small>
                        } @else {
                            <small class="text-muted-color">Şirkette 10 haneli VKN, serbest meslekte VKN veya 11 haneli TCKN.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxOffice" class="block text-sm font-medium text-muted-color mb-2">Vergi dairesi</label>
                        <input id="taxOffice" pInputText class="w-full" formControlName="taxOffice" [attr.maxlength]="max.taxOffice" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxpayerName" class="block text-sm font-medium text-muted-color mb-2">Unvan / ad soyad</label>
                        <input id="taxpayerName" pInputText class="w-full" formControlName="taxpayerName" [attr.maxlength]="max.taxpayerName" autocomplete="organization" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxpayerProvince" class="block text-sm font-medium text-muted-color mb-2">İl</label>
                        <input id="taxpayerProvince" pInputText class="w-full" formControlName="province" [attr.maxlength]="max.province" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="taxpayerDistrict" class="block text-sm font-medium text-muted-color mb-2">İlçe</label>
                        <input id="taxpayerDistrict" pInputText class="w-full" formControlName="district" [attr.maxlength]="max.district" />
                    </div>
                    <div class="col-span-12">
                        <label for="taxpayerAddressLine" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                        <input id="taxpayerAddressLine" pInputText class="w-full" formControlName="addressLine" [attr.maxlength]="max.addressLine" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="defaultVatRate" class="block text-sm font-medium text-muted-color mb-2">Varsayılan KDV oranı (%) *</label>
                        <input id="defaultVatRate" type="number" class="w-full p-inputtext p-component" formControlName="defaultVatRate" min="0" max="100" step="1" />
                        @if (showError('defaultVatRate')) {
                            <small class="text-red-500" data-testid="taxpayer-error-vat">{{ form.controls.defaultVatRate.errors?.['required'] ? 'Varsayılan KDV oranı zorunludur.' : rateMessage }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="withholdingRate" class="block text-sm font-medium text-muted-color mb-2">Stopaj oranı (%)</label>
                        <input id="withholdingRate" type="number" class="w-full p-inputtext p-component" formControlName="withholdingRate" min="0" max="100" step="1" />
                        @if (showError('withholdingRate')) {
                            <small class="text-red-500">{{ rateMessage }}</small>
                        } @else {
                            <small class="text-muted-color">Serbest meslek için; uygulanmıyorsa boş bırakın.</small>
                        }
                    </div>
                </div>

                <div class="mt-4 flex justify-end">
                    <p-button type="button" label="Mükellef bilgilerini kaydet" icon="pi pi-save" severity="secondary" [loading]="saving()" [disabled]="form.invalid || saving() || ro.mutationBlocked()" (onClick)="save()" />
                </div>
            }
        </div>
    `
})
export class ClinicTaxpayerSettingsSectionComponent implements OnInit {
    readonly clinicId = input.required<string>();

    private readonly fb = inject(FormBuilder);
    private readonly service = inject(ClinicTaxpayerSettingsService);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    protected readonly typeOptions = [...CLINIC_TAXPAYER_TYPE_OPTIONS];
    protected readonly max = CLINIC_TAXPAYER_MAX;
    protected readonly identityMessage = TAX_IDENTITY_MSG_TAXPAYER;
    protected readonly rateMessage = TAX_RATE_MSG_INVALID;

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);

    readonly form = this.fb.group({
        taxpayerType: this.fb.control<ClinicTaxpayerType | null>(null),
        taxIdentityNumber: this.fb.nonNullable.control('', [taxpayerIdentityValidator()]),
        taxOffice: this.fb.nonNullable.control('', [Validators.maxLength(CLINIC_TAXPAYER_MAX.taxOffice)]),
        taxpayerName: this.fb.nonNullable.control('', [Validators.maxLength(CLINIC_TAXPAYER_MAX.taxpayerName)]),
        province: this.fb.nonNullable.control('', [Validators.maxLength(CLINIC_TAXPAYER_MAX.province)]),
        district: this.fb.nonNullable.control('', [Validators.maxLength(CLINIC_TAXPAYER_MAX.district)]),
        addressLine: this.fb.nonNullable.control('', [Validators.maxLength(CLINIC_TAXPAYER_MAX.addressLine)]),
        defaultVatRate: this.fb.control<number | null>(null, [Validators.required, taxRateValidator()]),
        withholdingRate: this.fb.control<number | null>(null, [taxRateValidator()])
    });

    ngOnInit(): void {
        this.load();
    }

    showError(field: 'taxIdentityNumber' | 'defaultVatRate' | 'withholdingRate'): boolean {
        const control = this.form.controls[field];

        return control.invalid && (control.touched || control.dirty);
    }

    load(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.service
            .get(this.clinicId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (dto) => {
                    this.form.reset(mapClinicTaxpayerSettingsToFormValue(dto));
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.loadError.set(panelHttpFailureMessage(e, 'Mükellef bilgileri yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    save(): void {
        if (this.form.invalid || this.ro.mutationBlocked()) {
            this.form.markAllAsTouched();

            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.service
            .update(this.clinicId(), mapClinicTaxpayerFormToPutBody(this.form.getRawValue()))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (dto) => {
                    this.saving.set(false);
                    this.form.reset(mapClinicTaxpayerSettingsToFormValue(dto));
                    this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Mükellef bilgileri kaydedildi.' });
                },
                error: (e: unknown) => {
                    this.saving.set(false);
                    this.saveError.set(panelHttpFailureMessage(e, 'Mükellef bilgileri kaydedilemedi.'));
                }
            });
    }
}
