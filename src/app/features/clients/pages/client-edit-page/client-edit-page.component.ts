import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ClientContactPreferenceFieldsComponent } from '@/app/features/clients/components/client-contact-preference-fields.component';
import { ClientInvoicingFieldsComponent } from '@/app/features/clients/components/client-invoicing-fields.component';
import { mapClientUpsertFormValueToCreateRequest } from '@/app/features/clients/data/client.mapper';
import {
    type ClientInvoicingFieldKey,
    createClientInvoicingFormGroup,
    isClientInvoicingDtoEmpty,
    mapClientInvoicingDtoToFormValue,
    mapClientInvoicingFormToDto
} from '@/app/features/clients/forms/client-invoicing-form.factory';
import { parseClientInvoicingFieldErrors } from '@/app/features/clients/utils/client-invoicing.utils';
import {
    createClientUpsertFormGroup,
    getClientUpsertFormValue
} from '@/app/features/clients/forms/client-upsert-form.factory';
import { CLIENT_UPSERT_FORM_FIELDS } from '@/app/features/clients/forms/client-upsert-form.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import {
    type ClientCreateFieldErrors,
    type ClientCreateFormFieldKey,
    parseClientCreateHttpError
} from '@/app/features/clients/utils/client-create-validation-parse.utils';
import { clientUpsertFieldErrorMessage } from '@/app/features/clients/utils/client-upsert.validation.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

@Component({
    selector: 'app-client-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        ClientContactPreferenceFieldsComponent,
        ClientInvoicingFieldsComponent,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        @if (loading()) {
            <app-loading-state message="Müşteri bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="!!currentId()" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header categoryLink="/panel/clients" categoryLinkLabel="Müşteri listesine dön" title="Müşteri Düzenle" description="Müşteri kaydını güncelleyin." />

            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        İşletme salt okunur moddadır; müşteri kaydı güncellenemez.
                    </p>
                }
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="fullName" class="block text-sm font-medium text-muted-color mb-2">Ad soyad *</label>
                            <input id="fullName" pInputText class="w-full" formControlName="fullName" />
                            @if (fieldMessage('fullName'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="phone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                            <input id="phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                            @if (fieldMessage('phone'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                            <input id="email" type="email" pInputText class="w-full" formControlName="email" />
                            @if (fieldMessage('email'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                            <textarea id="address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                            @if (fieldMessage('address'); as msg) {
                                <small class="text-red-500">{{ msg }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <app-client-contact-preference-fields [form]="form" />
                        </div>
                        @if (invoicingLoaded()) {
                            <div class="col-span-12">
                                <app-client-invoicing-fields [form]="invoicingForm" [open]="invoicingOpen()" [apiErrors]="invoicingApiErrors()" />
                            </div>
                        }
                    </div>

                    @if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <p-button
                            type="submit"
                            label="Güncelle"
                            icon="pi pi-check"
                            [loading]="submitting()"
                            [disabled]="form.invalid || invoicingForm.invalid || submitting() || ro.mutationBlocked()"
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
export class ClientEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});
    readonly currentId = signal<string | null>(null);

    readonly form = createClientUpsertFormGroup(this.fb);
    readonly invoicingForm = createClientInvoicingFormGroup(this.fb);
    /** Tam değerler (`Clients.Update`) yüklendiyse bölüm gösterilir ve gövdeye girer; yüklenmezse sunucudaki değere dokunulmaz. */
    readonly invoicingLoaded = signal(false);
    readonly invoicingOpen = signal(false);
    readonly invoicingApiErrors = signal<Partial<Record<ClientInvoicingFieldKey, string>>>({});

    constructor() {
        for (const f of CLIENT_UPSERT_FORM_FIELDS) {
            this.form.controls[f].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();

                if (cur[f]) {
                    const next = { ...cur };

                    delete next[f];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            this.loadError.set('Geçersiz müşteri.');

            return;
        }

        this.currentId.set(id);
        this.reload();
    }

    fieldMessage(field: ClientCreateFormFieldKey): string | null {
        const api = this.apiFieldErrors()[field];

        if (api) {
            return api;
        }

        const control = this.form.controls[field];

        if (!control.invalid || !control.touched) {
            return null;
        }

        return clientUpsertFieldErrorMessage(field, control.errors);
    }

    reload(): void {
        const id = this.currentId();

        if (!id) {
            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.clientsService.getClientById(id).subscribe({
            next: (client) => {
                this.form.patchValue({
                    fullName: client.fullName === '—' ? '' : client.fullName,
                    phone: client.phone === '—' ? '' : client.phone,
                    email: client.email === '—' ? '' : client.email,
                    address: client.address === '—' ? '' : client.address,
                    preferredContactChannel: client.preferredContactChannel,
                    remindersOptedOut: client.remindersOptedOut
                });
                this.loading.set(false);
                this.loadInvoicing(id);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Müşteri bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    private loadInvoicing(id: string): void {
        this.invoicingLoaded.set(false);
        this.clientsService.getInvoicingIdentity(id).subscribe({
            next: (dto) => {
                this.invoicingForm.reset(mapClientInvoicingDtoToFormValue(dto), { emitEvent: false });
                this.invoicingOpen.set(!isClientInvoicingDtoEmpty(dto));
                this.invoicingLoaded.set(true);
            },
            error: () => this.invoicingLoaded.set(false)
        });
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }

        this.submitError.set(null);
        this.apiFieldErrors.set({});
        this.invoicingApiErrors.set({});

        if (this.form.invalid || this.invoicingForm.invalid || !this.currentId()) {
            this.form.markAllAsTouched();
            this.invoicingForm.markAllAsTouched();

            return;
        }

        const payload = {
            ...mapClientUpsertFormValueToCreateRequest(getClientUpsertFormValue(this.form)),
            ...(this.invoicingLoaded() ? { invoicingIdentity: mapClientInvoicingFormToDto(this.invoicingForm.getRawValue()) } : {})
        };

        this.submitting.set(true);
        this.clientsService.updateClient(this.currentId()!, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/clients', this.currentId()!], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    const parsed = parseClientCreateHttpError(e);
                    const invoicingErrors = parseClientInvoicingFieldErrors(e);

                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.invoicingApiErrors.set(invoicingErrors);
                    this.invoicingOpen.set(this.invoicingOpen() || Object.keys(invoicingErrors).length > 0);
                    this.submitError.set(parsed.summaryMessage);

                    return;
                }

                this.submitError.set(panelHttpFailureMessage(e, 'Kayıt sırasında hata oluştu.'));
            }
        });
    }

    goDetail(): void {
        if (!this.currentId()) {
            return;
        }

        void this.router.navigate(['/panel/clients', this.currentId()!]);
    }
}
