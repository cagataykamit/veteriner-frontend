import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { clinicSettingsMutationMessage } from '@/app/features/clinics/utils/clinic-settings-mutation.utils';
import {
    parseClinicUpsertHttpError,
    type ClinicUpsertFieldErrors
} from '@/app/features/clinics/utils/clinic-upsert-validation-parse.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

@Component({
    selector: 'app-clinic-create-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        ToastModule,
        AppPageHeaderComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <a routerLink="/panel/settings/clinics" class="text-primary font-medium no-underline inline-block mb-4">← Klinik listesine dön</a>

        <app-page-header
            title="Yeni Klinik"
            subtitle="Hesap"
            description="Kurumunuza yeni bir klinik kaydı oluşturun. Yalnızca ad ve şehir bilgisi gerekir."
        />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    Bu işletme salt okunur moddadır; yeni klinik oluşturulamaz.
                </p>
            }
            @if (formError()) {
                <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ formError() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="newClinicName" class="block text-sm font-medium text-muted-color mb-2">Klinik adı *</label>
                        <input
                            id="newClinicName"
                            pInputText
                            class="w-full"
                            formControlName="name"
                            autocomplete="organization"
                            [disabled]="ro.mutationBlocked()"
                        />
                        @if (apiFieldErrors().name) {
                            <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                        } @else if (form.controls.name.invalid && form.controls.name.touched) {
                            <small class="text-red-500">Klinik adı zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="newClinicCity" class="block text-sm font-medium text-muted-color mb-2">Şehir *</label>
                        <input
                            id="newClinicCity"
                            pInputText
                            class="w-full"
                            formControlName="city"
                            autocomplete="address-level2"
                            [disabled]="ro.mutationBlocked()"
                        />
                        @if (apiFieldErrors().city) {
                            <small class="text-red-500">{{ apiFieldErrors().city }}</small>
                        } @else if (form.controls.city.invalid && form.controls.city.touched) {
                            <small class="text-red-500">Şehir zorunludur.</small>
                        }
                    </div>
                </div>
                <div class="mt-4 mb-0 flex flex-wrap gap-2">
                    <p-button
                        type="submit"
                        label="Kaydet"
                        icon="pi pi-save"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || ro.mutationBlocked()"
                    />
                    <p-button
                        type="button"
                        label="İptal"
                        icon="pi pi-times"
                        severity="secondary"
                        [disabled]="submitting()"
                        (onClick)="onCancel()"
                    />
                </div>
            </form>
        </div>
    `
})
export class ClinicCreatePageComponent {
    private readonly clinicsApi = inject(ClinicsService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly submitting = signal(false);
    readonly formError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClinicUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        city: ['', [Validators.required, Validators.maxLength(128)]]
    });

    onCancel(): void {
        void this.router.navigate(['/panel/settings/clinics']);
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.formError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        this.submitting.set(true);
        this.clinicsApi.createClinic(v.name, v.city).subscribe({
            next: ({ createdId }) => {
                this.submitting.set(false);
                addTracedToast(this.messages, 'ClinicCreatePage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: createdId ? 'Klinik oluşturuldu.' : 'Klinik oluşturuldu. Listeden açabilirsiniz.'
                });
                if (createdId) {
                    void this.router.navigate(['/panel/settings/clinics', createdId]);
                } else {
                    void this.router.navigate(['/panel/settings/clinics']);
                }
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.handlePostError(e);
            }
        });
    }

    private handlePostError(e: unknown): void {
        if (!(e instanceof HttpErrorResponse)) {
            this.formError.set('Klinik oluşturulamadı.');
            return;
        }
        const parsed = parseClinicUpsertHttpError(e, 'Klinik oluşturulamadı.');
        if (Object.keys(parsed.fieldErrors).length > 0) {
            this.apiFieldErrors.set(parsed.fieldErrors);
            if (parsed.summaryMessage) {
                this.formError.set(parsed.summaryMessage);
            }
            return;
        }
        this.formError.set(clinicSettingsMutationMessage(e, 'Klinik oluşturulamadı.'));
    }
}
