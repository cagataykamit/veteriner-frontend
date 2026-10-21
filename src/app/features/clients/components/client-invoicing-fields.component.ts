import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { ClientPersonType } from '@/app/features/clients/models/client-api.model';
import type { ClientInvoicingFieldKey, ClientInvoicingFormGroup } from '@/app/features/clients/forms/client-invoicing-form.factory';
import { CLIENT_PERSON_TYPE_OPTIONS, clientInvoicingFieldErrorMessage } from '@/app/features/clients/utils/client-invoicing.utils';

/**
 * Müşteri yeni/düzenle formunun açılır "Fatura bilgileri" bölümü (ADR-036 Dilim 1). Tüm alanlar isteğe bağlıdır;
 * kişi türüne göre TCKN ya da VKN, vergi dairesi ve unvan gösterilir. Gizlenen alanlar gövdeye girmez (form eşlemesi).
 */
@Component({
    selector: 'app-client-invoicing-fields',
    standalone: true,
    imports: [ReactiveFormsModule, InputTextModule, SelectModule],
    template: `
        <details class="rounded-lg border border-surface-200 dark:border-surface-700 px-4 py-3" [open]="open()" data-testid="client-invoicing-section">
            <summary class="cursor-pointer font-medium">
                Fatura bilgileri <span class="text-sm font-normal text-muted-color">(isteğe bağlı)</span>
            </summary>
            <p class="text-sm text-muted-color mt-2 mb-4">Yalnız fatura veya e-belge kesilirken gerekir. Kimlik ve vergi numarası kayıtta maskeli gösterilir.</p>
            <div class="grid grid-cols-12 gap-4" [formGroup]="form()">
                <div class="col-span-12 md:col-span-6">
                    <label for="invoicingPersonType" class="block text-sm font-medium text-muted-color mb-2">Kişi türü</label>
                    <p-select
                        inputId="invoicingPersonType"
                        formControlName="personType"
                        [options]="personTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        styleClass="w-full"
                    />
                </div>
                @if (personType() === 'Individual') {
                    <div class="col-span-12 md:col-span-6">
                        <label for="invoicingNationalId" class="block text-sm font-medium text-muted-color mb-2">T.C. kimlik no (TCKN)</label>
                        <input id="invoicingNationalId" pInputText class="w-full" formControlName="nationalId" inputmode="numeric" maxlength="11" autocomplete="off" />
                        @if (fieldMessage('nationalId'); as msg) {
                            <small class="text-red-500" data-testid="invoicing-error-nationalId">{{ msg }}</small>
                        }
                    </div>
                }
                @if (personType() === 'Corporate') {
                    <div class="col-span-12 md:col-span-6">
                        <label for="invoicingTaxNumber" class="block text-sm font-medium text-muted-color mb-2">Vergi kimlik no (VKN)</label>
                        <input id="invoicingTaxNumber" pInputText class="w-full" formControlName="taxNumber" inputmode="numeric" maxlength="10" autocomplete="off" />
                        @if (fieldMessage('taxNumber'); as msg) {
                            <small class="text-red-500" data-testid="invoicing-error-taxNumber">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="invoicingTaxOffice" class="block text-sm font-medium text-muted-color mb-2">Vergi dairesi</label>
                        <input id="invoicingTaxOffice" pInputText class="w-full" formControlName="taxOffice" />
                        @if (fieldMessage('taxOffice'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="invoicingLegalName" class="block text-sm font-medium text-muted-color mb-2">Unvan</label>
                        <input id="invoicingLegalName" pInputText class="w-full" formControlName="legalName" autocomplete="organization" />
                        @if (fieldMessage('legalName'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                }
                <div class="col-span-12 md:col-span-6">
                    <label for="invoicingProvince" class="block text-sm font-medium text-muted-color mb-2">İl</label>
                    <input id="invoicingProvince" pInputText class="w-full" formControlName="billingProvince" autocomplete="address-level1" />
                    @if (fieldMessage('billingProvince'); as msg) {
                        <small class="text-red-500">{{ msg }}</small>
                    }
                </div>
                <div class="col-span-12 md:col-span-6">
                    <label for="invoicingDistrict" class="block text-sm font-medium text-muted-color mb-2">İlçe</label>
                    <input id="invoicingDistrict" pInputText class="w-full" formControlName="billingDistrict" autocomplete="address-level2" />
                    @if (fieldMessage('billingDistrict'); as msg) {
                        <small class="text-red-500">{{ msg }}</small>
                    }
                </div>
                <div class="col-span-12">
                    <label for="invoicingAddressLine" class="block text-sm font-medium text-muted-color mb-2">Fatura adresi</label>
                    <input id="invoicingAddressLine" pInputText class="w-full" formControlName="billingAddressLine" autocomplete="street-address" />
                    @if (fieldMessage('billingAddressLine'); as msg) {
                        <small class="text-red-500">{{ msg }}</small>
                    }
                </div>
            </div>
        </details>
    `
})
export class ClientInvoicingFieldsComponent {
    readonly form = input.required<ClientInvoicingFormGroup>();
    /** Kayıtta bilgi varsa açık başlar. */
    readonly open = input(false);
    /** Sunucunun `InvoicingIdentity.*` alan hataları. */
    readonly apiErrors = input<Partial<Record<ClientInvoicingFieldKey, string>>>({});

    protected readonly personTypeOptions = [...CLIENT_PERSON_TYPE_OPTIONS];

    personType(): ClientPersonType | null {
        return this.form().controls.personType.value;
    }

    fieldMessage(field: ClientInvoicingFieldKey): string | null {
        const api = this.apiErrors()[field];

        if (api) {
            return api;
        }

        const control = this.form().controls[field];

        return control.invalid && (control.touched || control.dirty) ? clientInvoicingFieldErrorMessage(field, control.errors) : null;
    }
}
