import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { mapPaymentUpsertFormToCreateRequest } from '@/app/features/payments/data/payment.mapper';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { PAYMENT_WRITE_METHOD_OPTIONS } from '@/app/features/payments/utils/payment-method.utils';
import {
    type PaymentUpsertFieldErrors,
    parsePaymentUpsertHttpError
} from '@/app/features/payments/utils/payment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { parseAmountFormValue } from '@/app/shared/utils/decimal-form.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';

@Component({
    selector: 'app-payment-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        QuickClientDialogComponent,
        QuickPetDialogComponent
    ],
    template: `
        <a routerLink="/panel/payments" class="text-primary font-medium no-underline inline-block mb-4">← Ödeme listesine dön</a>

        <app-page-header title="Yeni Ödeme" subtitle="Finans" description="Ödeme kaydı oluşturun." />

        <div class="card">
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
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        <div class="flex flex-wrap gap-2 align-items-center mt-2">
                            <p-button
                                type="button"
                                label="Yeni müşteri"
                                icon="pi pi-user-plus"
                                [text]="true"
                                styleClass="p-0"
                                (onClick)="quickClientOpen.set(true)"
                            />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan</label>
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
                    <div class="col-span-12 md:col-span-4">
                        <label for="amount" class="block text-sm font-medium text-muted-color mb-2">Tutar *</label>
                        <input id="amount" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="amount" />
                        @if (form.controls.amount.invalid && form.controls.amount.touched) {
                            <small class="text-red-500">Geçerli tutar girin.</small>
                        } @else if (apiFieldErrors().amount) {
                            <small class="text-red-500">{{ apiFieldErrors().amount }}</small>
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
                        <input id="paidAtLocal" type="datetime-local" class="w-full p-inputtext p-component" formControlName="paidAtLocal" />
                        @if (form.controls.paidAtLocal.invalid && form.controls.paidAtLocal.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().paidAtLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().paidAtLocal }}</small>
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
                        [disabled]="form.invalid || submitting() || loadingClients()"
                    />
                    <p-button type="button" [label]="copy.buttonCancel" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
                </div>
            </form>
        </div>

        <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onQuickClientCreated($event)" />
        <app-quick-pet-dialog
            [(visible)]="quickPetOpen"
            [ownerClientId]="quickPetOwnerClientId()"
            (petCreated)="onQuickPetCreated($event)"
        />
    `
})
export class PaymentNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly paymentsService = inject(PaymentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly activeClinicLabel = signal<string>('Belirlenmedi');
    readonly apiFieldErrors = signal<PaymentUpsertFieldErrors>({});

    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    readonly currencyOptions = [
        { label: 'TRY', value: 'TRY' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' }
    ];

    readonly methodOptions = [...PAYMENT_WRITE_METHOD_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }],
        amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
        currency: ['TRY', Validators.required],
        method: ['cash', Validators.required],
        paidAtLocal: ['', Validators.required],
        note: ['']
    });

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }
            const id = trimClientIdControlValue(this.form.controls.clientId.value);
            if (!id) {
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(id);
        });
    }

    petQuickAddDisabled(): boolean {
        return !trimClientIdControlValue(this.form.getRawValue().clientId) || this.form.controls.petId.disabled;
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

    goList(): void {
        void this.router.navigate(['/panel/payments']);
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
        const paidAtUtc = dateTimeLocalInputToIsoUtc(paidAtLocal);
        if (!paidAtUtc) {
            this.submitError.set('Geçerli bir ödeme tarihi / saati seçin.');
            return;
        }

        const payload = mapPaymentUpsertFormToCreateRequest({
            clinicId,
            clientId: v.clientId,
            petId: v.petId,
            amount,
            currency: v.currency,
            method: v.method,
            paidAtUtc,
            note: v.note
        });

        this.submitting.set(true);
        this.paymentsService.createPayment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/payments', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parsePaymentUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
            }
        });
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
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
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
                this.form.controls.clientId.setValue(clientId, { emitEvent: true });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetsForClient(clientId: string, selectPetId?: string): void {
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId }).subscribe({
            next: (r) => {
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
                const want = selectPetId?.trim();
                if (want) {
                    const exists = items.some((p) => p.id === want);
                    if (exists) {
                        this.form.controls.petId.setValue(want, { emitEvent: true });
                    }
                }
                this.loadingPets.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
            }
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            const parsed = parsePaymentUpsertHttpError(e);
            if (parsed.summaryMessage) {
                return parsed.summaryMessage;
            }
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
    }
}
