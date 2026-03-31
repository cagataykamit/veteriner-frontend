import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { CreateClientRequest } from '@/app/features/clients/models/client-create.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import {
    type ClientCreateFieldErrors,
    type ClientCreateFormFieldKey,
    parseClientCreateHttpError
} from '@/app/features/clients/utils/client-create-validation-parse.utils';
import { CLIENT_CREATE_PHONE_MSG_INVALID, turkishMobilePhoneValidator } from '@/app/features/clients/utils/client-create-phone.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-client-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/clients" class="text-primary font-medium no-underline inline-block mb-4">← Müşteri listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Müşteri bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="!!currentId()" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Müşteri Düzenle" subtitle="Hasta yönetimi" description="Müşteri kaydını güncelleyin." />

            <div class="card">
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="fullName" class="block text-sm font-medium text-muted-color mb-2">Ad soyad *</label>
                            <input id="fullName" pInputText class="w-full" formControlName="fullName" />
                            @if (apiFieldErrors().fullName) {
                                <small class="text-red-500">{{ apiFieldErrors().fullName }}</small>
                            } @else if (form.controls.fullName.invalid && form.controls.fullName.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="phone" class="block text-sm font-medium text-muted-color mb-2">Telefon</label>
                            <input id="phone" pInputText class="w-full" formControlName="phone" inputmode="tel" autocomplete="tel" />
                            @if (apiFieldErrors().phone) {
                                <small class="text-red-500">{{ apiFieldErrors().phone }}</small>
                            } @else if (form.controls.phone.invalid && form.controls.phone.touched) {
                                @if (form.controls.phone.hasError('phoneInvalidChars') || form.controls.phone.hasError('phoneInvalidFormat')) {
                                    <small class="text-red-500">{{ phoneMsgInvalid }}</small>
                                }
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="email" class="block text-sm font-medium text-muted-color mb-2">E-posta</label>
                            <input id="email" type="email" pInputText class="w-full" formControlName="email" />
                            @if (apiFieldErrors().email) {
                                <small class="text-red-500">{{ apiFieldErrors().email }}</small>
                            } @else if (form.controls.email.invalid && form.controls.email.touched) {
                                <small class="text-red-500">Geçerli e-posta girin.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="address" class="block text-sm font-medium text-muted-color mb-2">Adres</label>
                            <textarea id="address" rows="2" class="w-full p-inputtext p-component" formControlName="address"></textarea>
                            @if (apiFieldErrors().address) {
                                <small class="text-red-500">{{ apiFieldErrors().address }}</small>
                            }
                        </div>
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
                            [disabled]="form.invalid || submitting()"
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
    readonly phoneMsgInvalid = CLIENT_CREATE_PHONE_MSG_INVALID;

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClientCreateFieldErrors>({});
    readonly currentId = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        fullName: ['', Validators.required],
        phone: ['', turkishMobilePhoneValidator()],
        email: ['', Validators.email],
        address: ['']
    });

    constructor() {
        const fields: ClientCreateFormFieldKey[] = ['fullName', 'phone', 'email', 'address'];
        for (const f of fields) {
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
                    address: client.address === '—' ? '' : client.address
                });
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Müşteri bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid || !this.currentId()) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const payload: CreateClientRequest = {
            fullName: v.fullName.trim(),
            phone: v.phone.trim() || undefined,
            email: v.email.trim() || undefined,
            address: v.address.trim() || undefined
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
                    this.apiFieldErrors.set(parsed.fieldErrors);
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
