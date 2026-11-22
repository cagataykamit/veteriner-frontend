import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { mapPaymentUpsertFormToWriteRequest } from '@/app/entities/payment/data/payment.mapper';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { PAYMENT_WRITE_METHOD_OPTIONS } from '@/app/entities/payment/utils/payment-method.utils';
import { PAYMENT_CURRENCY } from '@/app/features/payments/utils/payment-allocation.utils';
import { type PaymentUpsertFieldErrors, parsePaymentUpsertHttpError } from '@/app/features/payments/utils/payment-upsert-validation-parse.utils';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { amountToFormString, parseAmountFormValue } from '@/app/shared/utils/decimal-form.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { dateTimeYearRangeValidator, effectiveDateTimeLocalInputMin } from '@/app/shared/utils/date-input-validation.utils';
import { PAYMENT_DATE_TOO_FAR_PAST_MESSAGE, paymentDateNotTooFarPastValidator, paymentDateTimeLocalMinAllowed } from '@/app/features/payments/utils/payment-date-validation.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { FormFieldComponent } from '@/app/shared/forms/form-field/form-field.component';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';

@Component({
    selector: 'app-payment-edit-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent, FormFieldComponent, FormSubmitDirective, FormErrorSummaryComponent, ReadOnlyReasonDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (loading()) {
            <app-loading-state message="Ödeme düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="paymentLoadRetryEnabled()" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header categoryLink="/panel/payments" categoryLinkLabel="Ödeme listesine dön" title="Ödemeyi düzenle" description="Ödeme kaydını güncelleyin." />

            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; değişiklik kaydedilemez.</p>
                }
                @if (selectionError()) {
                    <p class="text-danger mt-0 mb-4" role="alert">{{ selectionError() }}</p>
                }
                <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
                <form appFormSubmit [formGroup]="form" (ngSubmit)="onSubmit()">
                    <app-form-error-summary />
                    <div class="grid grid-cols-12 gap-4">
                        <app-form-field class="col-span-12 md:col-span-6" label="Müşteri" fieldId="clientId" [error]="apiFieldErrors().clientId ? apiFieldErrors().clientId : form.controls.clientId.invalid && form.controls.clientId.touched ? 'Müşteri seçimi zorunludur.' : null" [required]="true">
                            <app-client-search inputId="clientId" formControlName="clientId" />
                        </app-form-field>
                        <app-form-field class="col-span-12 md:col-span-6" label="Hasta" fieldId="petId" [error]="apiFieldErrors().petId ? apiFieldErrors().petId : null">
                            <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                        </app-form-field>
                        <app-form-field class="col-span-12 md:col-span-4" label="Tutar" fieldId="amount" [error]="apiFieldErrors().amount ? apiFieldErrors().amount : form.controls.amount.invalid && form.controls.amount.touched ? 'Geçerli tutar girin.' : null" [required]="true">
                            <input id="amount" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="amount" />
                        </app-form-field>
                        <app-form-field class="col-span-12 md:col-span-4" label="Yöntem" fieldId="method" [error]="apiFieldErrors().method ? apiFieldErrors().method : null" [required]="true">
                            <p-select inputId="method" [options]="methodOptions" formControlName="method" optionLabel="label" optionValue="value" class="w-full" />
                        </app-form-field>
                        <app-form-field class="col-span-12 md:col-span-4" label="Ödeme tarihi / saati" fieldId="paidAtLocal" [error]="form.controls.paidAtLocal.hasError('dateYearInvalid') && form.controls.paidAtLocal.touched ? 'Yıl 4 haneli olmalıdır.' : form.controls.paidAtLocal.hasError('paymentDateTooFarPast') && form.controls.paidAtLocal.touched ? paymentDateTooFarPastMessage : apiFieldErrors().paidAtLocal ? apiFieldErrors().paidAtLocal : form.controls.paidAtLocal.hasError('required') && form.controls.paidAtLocal.touched ? 'Zorunlu alan.' : null" [required]="true">
                            <app-date-input inputId="paidAtLocal" type="datetime-local" formControlName="paidAtLocal" [min]="paymentDateMinAllowed" limit="past" />
                        </app-form-field>
                        <app-form-field class="col-span-12" label="Not" fieldId="note" [error]="apiFieldErrors().note ? apiFieldErrors().note : null">
                            <textarea id="note" rows="3" class="w-full p-inputtext p-component" formControlName="note"></textarea>
                        </app-form-field>
                    </div>

                    @if (submitError()) {
                        <p class="text-danger mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <button pButton type="submit" [disabled]="submitting() || ro.mutationBlocked()" appReadOnlyReason><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                        <button pButton type="button" severity="secondary" (click)="goDetail()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                    </div>
                </form>
            </div>
        }
    `
})
export class PaymentEditPageComponent implements OnInit, HasUnsavedChanges {
    readonly copy = PANEL_COPY;
    protected readonly paymentDateTooFarPastMessage = PAYMENT_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly paymentsService = inject(PaymentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly paymentLoadRetryEnabled = signal(false);
    /** Ödeme zamanı alt sınırı sayfa açılışında bir kez hesaplanır: şablonda her değişiklik algılama turunda yeniden hesaplanınca dakika sınırında NG0100 veriyordu. 7 gün kuralını doğrulayıcı (paymentDateNotTooFarPastValidator) her an uygular. */
    readonly paymentDateMinAllowed = effectiveDateTimeLocalInputMin(paymentDateTimeLocalMinAllowed());
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<PaymentUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private paymentId = '';
    private appointmentId: string | null = null;
    private examinationId: string | null = null;

    readonly methodOptions = [...PAYMENT_WRITE_METHOD_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }],
        amount: ['', Validators.required],
        /** Formda gösterilmez (ADR-012); kayıtlı değer korunur, değişirse backend düzeltme sayar. */
        currency: [PAYMENT_CURRENCY, Validators.required],
        method: ['cash', Validators.required],
        paidAtLocal: ['', [Validators.required, dateTimeYearRangeValidator(), paymentDateNotTooFarPastValidator()]],
        note: ['']
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        if (!id) {
            this.loadError.set('Geçersiz ödeme kaydı.');
            this.loading.set(false);
            this.paymentLoadRetryEnabled.set(false);

            return;
        }

        this.paymentId = id;
        this.paymentLoadRetryEnabled.set(true);
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');

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

        this.reload();
    }

    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.appointmentId = null;
        this.examinationId = null;
        this.paymentsService.getPaymentForEditById(this.paymentId).subscribe({
            next: (x) => {
                this.appointmentId = x.appointmentId;
                this.examinationId = x.examinationId;
                this.form.patchValue({
                    clientId: x.clientId,
                    petId: '',
                    amount: amountToFormString(x.amountStr),
                    currency: x.currency || PAYMENT_CURRENCY,
                    method: x.method ?? 'cash',
                    paidAtLocal: toIstanbulDateTimeLocalInputValue(x.paidAtUtc),
                    note: x.note
                });

                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.form.controls.petId.setValue(x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                }

                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Ödeme bilgileri yüklenemedi.'));
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
        const amount = parseAmountFormValue(v.amount);

        if (amount == null || amount < 0.01) {
            this.submitError.set('Geçerli bir tutar girin.');

            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const paidAtLocal = v.paidAtLocal?.trim() ?? '';
        const paidAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(paidAtLocal);

        if (!paidAtUtc) {
            this.submitError.set('Geçerli bir ödeme tarihi / saati seçin.');

            return;
        }

        const payload = mapPaymentUpsertFormToWriteRequest({
            clinicId,
            clientId: v.clientId,
            petId: v.petId,
            appointmentId: this.appointmentId,
            examinationId: this.examinationId,
            amount,
            currency: v.currency,
            method: v.method,
            paidAtUtc,
            note: v.note
        });

        this.submitting.set(true);
        this.paymentsService.updatePayment(this.paymentId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                this.form.markAsPristine();
                void this.router.navigate(['/panel/payments', this.paymentId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parsePaymentUpsertHttpError(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);

                    return;
                }

                this.submitError.set(panelHttpFailureMessage(e, 'Kayıt sırasında hata oluştu.'));
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/payments', this.paymentId]);
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}
