import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { PetSearchComponent } from '@/app/shared/forms/pet-search/pet-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { mapPaymentUpsertFormToWriteRequest } from '@/app/features/payments/data/payment.mapper';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { PAYMENT_WRITE_METHOD_OPTIONS } from '@/app/features/payments/utils/payment-method.utils';
import {
    type PaymentUpsertFieldErrors,
    parsePaymentUpsertHttpError
} from '@/app/features/payments/utils/payment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { amountToFormString, parseAmountFormValue } from '@/app/shared/utils/decimal-form.utils';
import {
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';
import {
    dateTimeYearRangeValidator,
    effectiveDateTimeLocalInputMin
} from '@/app/shared/utils/date-input-validation.utils';
import {
    PAYMENT_DATE_TOO_FAR_PAST_MESSAGE,
    paymentDateNotTooFarPastValidator,
    paymentDateTimeLocalMinAllowed
} from '@/app/features/payments/utils/payment-date-validation.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-payment-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent, ClientSearchComponent, PetSearchComponent, DateInputComponent
    ],
    template: `
        <a routerLink="/panel/payments" class="text-primary font-medium no-underline inline-block mb-4">← Ödeme listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Ödeme düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="paymentLoadRetryEnabled()" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Ödemeyi Düzenle" description="Ödeme kaydını güncelleyin." />

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
                            <app-client-search inputId="clientId" formControlName="clientId" />
                            @if (apiFieldErrors().clientId) {
                                <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                            } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Müşteri seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan</label>
                            <app-pet-search inputId="petId" formControlName="petId" [clientId]="form.controls.clientId.value" />
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="amount" class="block text-sm font-medium text-muted-color mb-2">Tutar *</label>
                            <input id="amount" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="amount" />
                            @if (apiFieldErrors().amount) {
                                <small class="text-red-500">{{ apiFieldErrors().amount }}</small>
                            } @else if (form.controls.amount.invalid && form.controls.amount.touched) {
                                <small class="text-red-500">Geçerli tutar girin.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="currency" class="block text-sm font-medium text-muted-color mb-2">Para birimi *</label>
                            <p-select
                                inputId="currency"
                                [options]="currencyOptions"
                                formControlName="currency"
                                optionLabel="label"
                                optionValue="value"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().currency) {
                                <small class="text-red-500">{{ apiFieldErrors().currency }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="method" class="block text-sm font-medium text-muted-color mb-2">Yöntem *</label>
                            <p-select
                                inputId="method"
                                [options]="methodOptions"
                                formControlName="method"
                                optionLabel="label"
                                optionValue="value"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().method) {
                                <small class="text-red-500">{{ apiFieldErrors().method }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="paidAtLocal" class="block text-sm font-medium text-muted-color mb-2">Ödeme tarihi / saati *</label>
                            <app-date-input inputId="paidAtLocal" type="datetime-local" formControlName="paidAtLocal" [min]="paymentDateMinAllowed()" limit="past" />
                            @if (form.controls.paidAtLocal.hasError('dateYearInvalid') && form.controls.paidAtLocal.touched) {
                                <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                            } @else if (form.controls.paidAtLocal.hasError('paymentDateTooFarPast') && form.controls.paidAtLocal.touched) {
                                <small class="text-red-500 block">{{ paymentDateTooFarPastMessage }}</small>
                            } @else if (apiFieldErrors().paidAtLocal) {
                                <small class="text-red-500 block">{{ apiFieldErrors().paidAtLocal }}</small>
                            } @else if (form.controls.paidAtLocal.invalid && form.controls.paidAtLocal.touched) {
                                <small class="text-red-500 block">Zorunlu alan.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="note" class="block text-sm font-medium text-muted-color mb-2">Not</label>
                            <textarea id="note" rows="3" class="w-full p-inputtext p-component" formControlName="note"></textarea>
                            @if (apiFieldErrors().note) {
                                <small class="text-red-500">{{ apiFieldErrors().note }}</small>
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
                            [disabled]="form.invalid || submitting() || ro.mutationBlocked()"
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

        }
    `
})
export class PaymentEditPageComponent implements OnInit {
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
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<PaymentUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private paymentId = '';
    private appointmentId: string | null = null;
    private examinationId: string | null = null;

    readonly currencyOptions = [
        { label: 'TRY', value: 'TRY' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' }
    ];

    readonly methodOptions = [...PAYMENT_WRITE_METHOD_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }],
        amount: ['', Validators.required],
        currency: ['TRY', Validators.required],
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
                    currency: x.currency || 'TRY',
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

    paymentDateMinAllowed(): string {
        return effectiveDateTimeLocalInputMin(paymentDateTimeLocalMinAllowed());
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
