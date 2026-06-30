import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import {
    mapOrganizationBillingProfileFormValueToUpdateRequest,
    mapOrganizationBillingProfileToFormValue
} from '@/app/features/organization/data/organization-billing-profile.mapper';
import {
    createOrganizationBillingProfileUpsertFormGroup,
    getOrganizationBillingProfileUpsertFormValue,
    type OrganizationBillingProfileUpsertFormGroup
} from '@/app/features/organization/forms/organization-billing-profile-upsert-form.factory';
import type { OrganizationBillingProfileFormFieldKey } from '@/app/features/organization/forms/organization-billing-profile-upsert-form.model';
import { OrganizationBillingProfileService } from '@/app/features/organization/services/organization-billing-profile.service';
import {
    billingProfileFieldErrorMessage,
    ORG_BILLING_PROFILE_FIELD_MAP
} from '@/app/features/organization/utils/organization-billing-profile.validation.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const BILLING_PROFILE_SAVE_FALLBACK = 'Firma / fatura bilgileri kaydedilemedi.';
const BILLING_PROFILE_LOAD_FALLBACK = 'Firma / fatura bilgileri alınamadı.';
const BILLING_PROFILE_FORBIDDEN_MESSAGE = 'Bu ayarları görüntüleme veya düzenleme yetkiniz yok.';
const BILLING_PROFILE_SAVE_SUCCESS = 'Firma / fatura bilgileri kaydedildi.';
const BILLING_PROFILE_HIDDEN_UI_FIELDS = new Set<OrganizationBillingProfileFormFieldKey>(['companyName']);

@Component({
    selector: 'app-organization-billing-profile-section',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <div class="card mb-0">
            <h5 class="mt-0 mb-2">Firma / Fatura Bilgileri</h5>
            <p class="text-sm text-muted-color mt-0 mb-4 max-w-2xl">
                Kurum adı Vetinity içinde görünen addır. Aşağıdaki bilgiler fatura ve e-belge süreçleri için kullanılacaktır.
            </p>

            @if (loading()) {
                <app-loading-state message="Firma / fatura bilgileri yükleniyor…" />
            } @else if (forbidden()) {
                <p class="text-sm text-muted-color m-0" role="status">{{ forbiddenMessage }}</p>
            } @else if (loadError(); as err) {
                <app-error-state title="Firma / fatura bilgileri alınamadı" [detail]="err" (retry)="reload()" />
            } @else {
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3" role="status">
                        Bu kurum salt okunur moddadır; firma / fatura bilgileri güncellenemez.
                    </p>
                }
                @if (!canManageTenantAccess()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3" role="status">
                        Bu bilgileri düzenleme yetkiniz yok.
                    </p>
                }

                <form [formGroup]="form" (ngSubmit)="onSave()" class="max-w-3xl">
                    <h6 class="mt-0 mb-3 text-sm font-semibold text-surface-900 dark:text-surface-0">Firma Bilgileri</h6>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                        <div>
                            <label for="billingLegalCompanyName" class="block text-sm font-medium text-muted-color mb-2">Resmi firma adı</label>
                            <input id="billingLegalCompanyName" pInputText class="w-full" formControlName="legalCompanyName" autocomplete="organization" />
                            @if (fieldMessage('legalCompanyName'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingTaxOffice" class="block text-sm font-medium text-muted-color mb-2">Vergi dairesi</label>
                            <input id="billingTaxOffice" pInputText class="w-full" formControlName="taxOffice" autocomplete="off" />
                            @if (fieldMessage('taxOffice'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingTaxNumber" class="block text-sm font-medium text-muted-color mb-2">Vergi numarası</label>
                            <input
                                id="billingTaxNumber"
                                pInputText
                                class="w-full"
                                formControlName="taxNumber"
                                inputmode="numeric"
                                autocomplete="off"
                            />
                            @if (fieldMessage('taxNumber'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingCompanyPhone" class="block text-sm font-medium text-muted-color mb-2">Firma telefon numarası</label>
                            <input id="billingCompanyPhone" pInputText class="w-full" formControlName="companyPhone" autocomplete="tel" />
                            @if (fieldMessage('companyPhone'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                    </div>

                    <h6 class="mt-5 mb-3 text-sm font-semibold text-surface-900 dark:text-surface-0">Fatura Adresi</h6>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                        <div>
                            <label for="billingInvoiceProvince" class="block text-sm font-medium text-muted-color mb-2">İl</label>
                            <input id="billingInvoiceProvince" pInputText class="w-full" formControlName="invoiceProvince" autocomplete="address-level1" />
                            @if (fieldMessage('invoiceProvince'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceDistrict" class="block text-sm font-medium text-muted-color mb-2">İlçe</label>
                            <input id="billingInvoiceDistrict" pInputText class="w-full" formControlName="invoiceDistrict" autocomplete="address-level2" />
                            @if (fieldMessage('invoiceDistrict'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceNeighborhood" class="block text-sm font-medium text-muted-color mb-2">Mahalle / Semt</label>
                            <input id="billingInvoiceNeighborhood" pInputText class="w-full" formControlName="invoiceNeighborhood" autocomplete="off" />
                            @if (fieldMessage('invoiceNeighborhood'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceStreet" class="block text-sm font-medium text-muted-color mb-2">Sokak / Cadde</label>
                            <input id="billingInvoiceStreet" pInputText class="w-full" formControlName="invoiceStreet" autocomplete="street-address" />
                            @if (fieldMessage('invoiceStreet'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceBuildingName" class="block text-sm font-medium text-muted-color mb-2">Bina adı</label>
                            <input id="billingInvoiceBuildingName" pInputText class="w-full" formControlName="invoiceBuildingName" autocomplete="off" />
                            @if (fieldMessage('invoiceBuildingName'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceBuildingNo" class="block text-sm font-medium text-muted-color mb-2">Bina no</label>
                            <input id="billingInvoiceBuildingNo" pInputText class="w-full" formControlName="invoiceBuildingNo" autocomplete="off" />
                            @if (fieldMessage('invoiceBuildingNo'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div>
                            <label for="billingInvoiceDoorNo" class="block text-sm font-medium text-muted-color mb-2">Kapı no</label>
                            <input id="billingInvoiceDoorNo" pInputText class="w-full" formControlName="invoiceDoorNo" autocomplete="off" />
                            @if (fieldMessage('invoiceDoorNo'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                    </div>

                    <div class="flex justify-end mt-5 pt-4 mb-0 border-t border-surface-200 dark:border-surface-700">
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-save"
                            [loading]="saving()"
                            [disabled]="form.invalid || saving() || !canManageTenantAccess() || !form.dirty"
                        />
                    </div>
                </form>
            }
        </div>
    `
})
export class OrganizationBillingProfileSectionComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly fb = inject(FormBuilder);
    private readonly billingProfile = inject(OrganizationBillingProfileService);
    private readonly messages = inject(MessageService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManageTenantAccess = computed(
        () => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked()
    );

    readonly loading = signal(true);
    readonly forbidden = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly forbiddenMessage = BILLING_PROFILE_FORBIDDEN_MESSAGE;

    readonly form: OrganizationBillingProfileUpsertFormGroup = createOrganizationBillingProfileUpsertFormGroup(this.fb);

    private readonly syncFormDisabledWithAccess = effect(() => {
        const editable = this.canManageTenantAccess();
        if (editable) {
            if (this.form.disabled) {
                this.form.enable({ emitEvent: false });
            }
        } else if (this.form.enabled) {
            this.form.disable({ emitEvent: false });
        }
    });

    ngOnInit(): void {
        this.load();
    }

    reload(): void {
        this.load();
    }

    fieldMessage(field: OrganizationBillingProfileFormFieldKey): string | null {
        const control = this.form.controls[field];
        if (!control.invalid || !control.touched) {
            return null;
        }
        return billingProfileFieldErrorMessage(field, control.errors);
    }

    onSave(): void {
        if (!this.canManageTenantAccess()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.clearServerErrors();
        const payload = mapOrganizationBillingProfileFormValueToUpdateRequest(
            getOrganizationBillingProfileUpsertFormValue(this.form)
        );
        this.saving.set(true);
        this.billingProfile
            .updateBillingProfile(payload)
            .pipe(
                finalize(() => this.saving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (profile) => {
                    this.form.patchValue(mapOrganizationBillingProfileToFormValue(profile));
                    this.form.markAsPristine();
                    this.messages.add({
                        severity: 'success',
                        summary: 'Kaydedildi',
                        detail: BILLING_PROFILE_SAVE_SUCCESS
                    });
                },
                error: (err: unknown) => {
                    const toastDetail = this.applySaveError(err);
                    this.messages.add({
                        severity: 'error',
                        summary: 'Hata',
                        detail: toastDetail
                    });
                }
            });
    }

    private load(): void {
        this.loading.set(true);
        this.forbidden.set(false);
        this.loadError.set(null);
        this.billingProfile.getBillingProfile().subscribe({
            next: (profile) => {
                this.form.patchValue(mapOrganizationBillingProfileToFormValue(profile));
                this.form.markAsPristine();
                this.loading.set(false);
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 403) {
                    this.forbidden.set(true);
                    this.loading.set(false);
                    return;
                }
                this.loadError.set(
                    err instanceof HttpErrorResponse
                        ? messageFromHttpError(err, BILLING_PROFILE_LOAD_FALLBACK)
                        : err instanceof Error
                          ? err.message
                          : BILLING_PROFILE_LOAD_FALLBACK
                );
                this.loading.set(false);
            }
        });
    }

    private applySaveError(err: unknown): string {
        if (!(err instanceof HttpErrorResponse)) {
            return err instanceof Error && err.message.trim()
                ? err.message.trim()
                : BILLING_PROFILE_SAVE_FALLBACK;
        }
        const { fieldErrors, summaryMessage } = parseValidationHttpError(err, {
            fieldMap: ORG_BILLING_PROFILE_FIELD_MAP,
            nonFieldMessage: (e) => messageFromHttpError(e, BILLING_PROFILE_SAVE_FALLBACK)
        });
        for (const [key, message] of Object.entries(fieldErrors) as Array<
            [OrganizationBillingProfileFormFieldKey, string]
        >) {
            if (BILLING_PROFILE_HIDDEN_UI_FIELDS.has(key)) {
                continue;
            }
            const control = this.form.controls[key];
            if (control) {
                control.setErrors({ ...(control.errors ?? {}), server: message });
                control.markAsTouched();
            }
        }
        return summaryMessage ?? BILLING_PROFILE_SAVE_FALLBACK;
    }

    private clearServerErrors(): void {
        for (const key of Object.keys(this.form.controls) as OrganizationBillingProfileFormFieldKey[]) {
            const control = this.form.controls[key];
            const errors = control.errors;
            if (!errors?.['server']) {
                continue;
            }
            const { server: _server, ...rest } = errors;
            control.setErrors(Object.keys(rest).length ? rest : null);
        }
    }
}
